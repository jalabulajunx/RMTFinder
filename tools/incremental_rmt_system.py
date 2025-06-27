#!/usr/bin/env python3
"""
Incremental RMT Monitoring System

This system handles regular monitoring and incremental updates for RMT review analysis.
It uses SQLite to track processed data and implements smart merging strategies.

Features:
- Tracks last run timestamps
- Detects new reviews by comparing timestamps
- Merges new analyses with historical data
- Supports both incremental and full rebuild modes
- Maintains data lineage and audit trails

Requirements:
    pip install requests fuzzywuzzy python-levenshtein googlemaps google-genai pydantic

Usage:
    # First run (full analysis)
    python incremental_rmt_system.py --mode=full

    # Regular updates (incremental)
    python incremental_rmt_system.py --mode=incremental

    # Force full rebuild
    python incremental_rmt_system.py --mode=rebuild
"""

import sqlite3
import json
import time
import argparse
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import logging
import os

# Import our existing modules
try:
    from rmt_review_extractor import RMTReviewExtractor, RMTData, ReviewExtraction
    from gemini_review_analyzer import GeminiReviewAnalyzer, ComprehensiveRMTAnalysis
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Please ensure the extractor and analyzer modules are available")
    exit(1)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class MonitoringRun:
    """Track monitoring run metadata"""
    run_id: str
    run_type: str  # 'full', 'incremental', 'rebuild'
    started_at: datetime
    completed_at: Optional[datetime]
    search_keywords: List[str]
    rmts_processed: int
    reviews_extracted: int
    reviews_analyzed: int
    status: str  # 'running', 'completed', 'failed'
    error_message: Optional[str] = None

class RMTMonitoringDatabase:
    """SQLite database for tracking RMT monitoring data"""
    
    def __init__(self, db_path: str = "rmt_monitoring.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the database schema"""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                -- Monitoring runs table
                CREATE TABLE IF NOT EXISTS monitoring_runs (
                    run_id TEXT PRIMARY KEY,
                    run_type TEXT NOT NULL,
                    started_at TIMESTAMP NOT NULL,
                    completed_at TIMESTAMP,
                    search_keywords TEXT NOT NULL,
                    rmts_processed INTEGER DEFAULT 0,
                    reviews_extracted INTEGER DEFAULT 0,
                    reviews_analyzed INTEGER DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'running',
                    error_message TEXT
                );

                -- RMT profiles table with embedded reviews
                CREATE TABLE IF NOT EXISTS rmt_profiles (
                    profile_id TEXT PRIMARY KEY,
                    first_name TEXT,
                    last_name TEXT,
                    common_first_name TEXT,
                    common_last_name TEXT,
                    registration_status TEXT,
                    authorized_to_practice BOOLEAN,
                    practice_locations TEXT,  -- JSON
                    cmto_endpoint TEXT,
                    reviews_data TEXT,  -- JSON array of all reviews with timestamps
                    total_reviews INTEGER DEFAULT 0,
                    last_review_date TEXT,
                    first_seen_run_id TEXT,
                    last_updated_run_id TEXT,
                    last_updated_at TIMESTAMP,
                    FOREIGN KEY (first_seen_run_id) REFERENCES monitoring_runs(run_id),
                    FOREIGN KEY (last_updated_run_id) REFERENCES monitoring_runs(run_id)
                );

                -- AI analyses table (simplified)
                CREATE TABLE IF NOT EXISTS ai_analyses (
                    analysis_id TEXT PRIMARY KEY,
                    profile_id TEXT NOT NULL,
                    analysis_run_id TEXT NOT NULL,
                    review_hash TEXT NOT NULL,  -- To link to specific review
                    sentiment_overall TEXT,
                    sentiment_confidence REAL,
                    mention_confidence REAL,
                    technical_skill_rating INTEGER,
                    communication_rating INTEGER,
                    professionalism_rating INTEGER,
                    review_authenticity TEXT,
                    potential_false_positive BOOLEAN,
                    overall_analysis_confidence REAL,
                    analysis_json TEXT,  -- Full analysis JSON
                    analyzed_at TIMESTAMP NOT NULL,
                    gemini_model_used TEXT,
                    FOREIGN KEY (profile_id) REFERENCES rmt_profiles(profile_id),
                    FOREIGN KEY (analysis_run_id) REFERENCES monitoring_runs(run_id)
                );

                -- Leaderboard snapshots table
                CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
                    snapshot_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    profile_id TEXT NOT NULL,
                    rmt_name TEXT NOT NULL,
                    total_reviews_analyzed INTEGER,
                    positive_sentiment_count INTEGER,
                    negative_sentiment_count INTEGER,
                    average_sentiment_score REAL,
                    composite_reputation_score REAL,
                    recommendation_rate REAL,
                    repeat_client_rate REAL,
                    potential_false_positives INTEGER,
                    snapshot_at TIMESTAMP NOT NULL,
                    FOREIGN KEY (run_id) REFERENCES monitoring_runs(run_id),
                    FOREIGN KEY (profile_id) REFERENCES rmt_profiles(profile_id)
                );

                -- Create indexes for performance
                CREATE INDEX IF NOT EXISTS idx_ai_analyses_profile_id ON ai_analyses(profile_id);
                CREATE INDEX IF NOT EXISTS idx_ai_analyses_review_hash ON ai_analyses(review_hash);
                CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_run_id ON leaderboard_snapshots(run_id);
            """)
        logger.info(f"Database initialized: {self.db_path}")
    
    def start_monitoring_run(self, run_type: str, search_keywords: List[str]) -> str:
        """Start a new monitoring run"""
        run_id = f"{run_type}_{int(time.time())}"
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO monitoring_runs 
                (run_id, run_type, started_at, search_keywords, status)
                VALUES (?, ?, ?, ?, 'running')
            """, (run_id, run_type, datetime.now(), json.dumps(search_keywords)))
        
        logger.info(f"Started monitoring run: {run_id}")
        return run_id
    
    def complete_monitoring_run(self, run_id: str, stats: Dict[str, int], error: Optional[str] = None):
        """Complete a monitoring run"""
        status = 'failed' if error else 'completed'
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE monitoring_runs 
                SET completed_at = ?, rmts_processed = ?, reviews_extracted = ?, 
                    reviews_analyzed = ?, status = ?, error_message = ?
                WHERE run_id = ?
            """, (
                datetime.now(),
                stats.get('rmts_processed', 0),
                stats.get('reviews_extracted', 0), 
                stats.get('reviews_analyzed', 0),
                status,
                error,
                run_id
            ))
        
        logger.info(f"Completed monitoring run: {run_id} ({status})")
    
    def get_last_successful_run(self, run_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get the last successful monitoring run"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            
            query = """
                SELECT * FROM monitoring_runs 
                WHERE status = 'completed'
            """
            params = []
            
            if run_type:
                query += " AND run_type = ?"
                params.append(run_type)
            
            query += " ORDER BY completed_at DESC LIMIT 1"
            
            result = conn.execute(query, params).fetchone()
            return dict(result) if result else None
    
    def save_rmt_profile(self, rmt_data: RMTData, run_id: str):
        """Save or update RMT profile"""
        with sqlite3.connect(self.db_path) as conn:
            # Check if profile exists
            existing = conn.execute(
                "SELECT profile_id FROM rmt_profiles WHERE profile_id = ?",
                (rmt_data.profile_id,)
            ).fetchone()
            
            if existing:
                # Update existing
                conn.execute("""
                    UPDATE rmt_profiles 
                    SET first_name = ?, last_name = ?, common_first_name = ?, 
                        common_last_name = ?, registration_status = ?, 
                        authorized_to_practice = ?, practice_locations = ?,
                        cmto_endpoint = ?, last_updated_run_id = ?, last_updated_at = ?
                    WHERE profile_id = ?
                """, (
                    rmt_data.first_name, rmt_data.last_name,
                    rmt_data.common_first_name, rmt_data.common_last_name,
                    rmt_data.registration_status, rmt_data.authorized_to_practice,
                    json.dumps(rmt_data.practice_locations), rmt_data.cmto_endpoint,
                    run_id, datetime.now(), rmt_data.profile_id
                ))
            else:
                # Insert new
                conn.execute("""
                    INSERT INTO rmt_profiles 
                    (profile_id, first_name, last_name, common_first_name, 
                     common_last_name, registration_status, authorized_to_practice,
                     practice_locations, cmto_endpoint, first_seen_run_id, 
                     last_updated_run_id, last_updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    rmt_data.profile_id, rmt_data.first_name, rmt_data.last_name,
                    rmt_data.common_first_name, rmt_data.common_last_name,
                    rmt_data.registration_status, rmt_data.authorized_to_practice,
                    json.dumps(rmt_data.practice_locations), rmt_data.cmto_endpoint,
                    run_id, run_id, datetime.now()
                ))
    
    def save_review_extraction(self, extraction: ReviewExtraction, run_id: str) -> bool:
        """Save review extraction by appending to RMT's reviews_data JSON array, return True if new/updated"""
        # Create review hash for deduplication
        review_content = f"{extraction.review_data['text']}|{extraction.review_data.get('author_name', '')}|{extraction.review_data.get('time', 0)}"
        review_hash = hashlib.md5(review_content.encode()).hexdigest()
        
        with sqlite3.connect(self.db_path) as conn:
            # Get existing reviews data
            existing_data = conn.execute(
                "SELECT reviews_data, total_reviews FROM rmt_profiles WHERE profile_id = ?",
                (extraction.rmt_data['profile_id'],)
            ).fetchone()
            
            if existing_data:
                reviews_data = json.loads(existing_data[0] or '[]')
                total_reviews = existing_data[1] or 0
            else:
                reviews_data = []
                total_reviews = 0
            
            # Check if this review already exists (by hash)
            existing_review_hashes = [review.get('review_hash') for review in reviews_data]
            if review_hash in existing_review_hashes:
                logger.debug(f"Review already exists for profile {extraction.rmt_data['profile_id']}")
                return False
            
            # Create new review entry with timestamp
            new_review = {
                'review_hash': review_hash,
                'extraction_id': extraction.extraction_id,
                'place_id': extraction.place_data.get('place_id', ''),
                'place_name': extraction.place_data.get('name', ''),
                'place_address': extraction.place_data.get('address', ''),
                'review_text': extraction.review_data['text'],
                'review_rating': extraction.review_data.get('rating', 0),
                'review_author': extraction.review_data.get('author_name', ''),
                'review_timestamp': extraction.review_data.get('time', 0),
                'review_time_description': extraction.review_data.get('relative_time_description', ''),
                'matched_text_segments': extraction.matched_text_segments,
                'confidence_scores': extraction.confidence_scores,
                'max_confidence': max(extraction.confidence_scores) if extraction.confidence_scores else 0,
                'extracted_at': datetime.now().isoformat(),
                'extraction_run_id': run_id
            }
            
            # Add to reviews array
            reviews_data.append(new_review)
            total_reviews += 1
            
            # Update the RMT profile with new reviews data
            conn.execute("""
                UPDATE rmt_profiles 
                SET reviews_data = ?, total_reviews = ?, last_review_date = ?, 
                    last_updated_run_id = ?, last_updated_at = ?
                WHERE profile_id = ?
            """, (
                json.dumps(reviews_data),
                total_reviews,
                new_review['extracted_at'],
                run_id,
                datetime.now(),
                extraction.rmt_data['profile_id']
            ))
            
            logger.debug(f"Added new review to profile {extraction.rmt_data['profile_id']}: {extraction.extraction_id}")
            return True
    
    def save_ai_analysis(self, analysis: ComprehensiveRMTAnalysis, run_id: str, model_used: str):
        """Save AI analysis results"""
        # Extract profile_id and review_hash from the extraction_id
        # Format: {profile_id}_{place_id}_{review_hash}
        parts = analysis.extraction_id.split('_')
        if len(parts) >= 3:
            profile_id = parts[0]
            review_hash = parts[-1]  # Last part is the review hash
        else:
            logger.error(f"Invalid extraction_id format: {analysis.extraction_id}")
            return
        
        analysis_id = f"analysis_{analysis.extraction_id}_{int(time.time())}"
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO ai_analyses 
                (analysis_id, profile_id, analysis_run_id, review_hash, sentiment_overall,
                 sentiment_confidence, mention_confidence, technical_skill_rating,
                 communication_rating, professionalism_rating, review_authenticity,
                 potential_false_positive, overall_analysis_confidence, analysis_json,
                 analyzed_at, gemini_model_used)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                analysis_id,
                profile_id,
                run_id,
                review_hash,
                analysis.sentiment_analysis.overall_sentiment,
                analysis.sentiment_analysis.confidence_score,
                analysis.rmt_mention_analysis.mention_confidence,
                analysis.service_quality_metrics.technical_skill_rating,
                analysis.service_quality_metrics.communication_rating,
                analysis.service_quality_metrics.professionalism_rating,
                analysis.review_classification.review_authenticity,
                analysis.potential_false_positive,
                analysis.overall_analysis_confidence,
                json.dumps(analysis.dict()),
                datetime.now(),
                model_used
            ))
    
    def get_unanalyzed_extractions(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get review extractions that haven't been analyzed yet"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            
            query = """
                SELECT rp.profile_id, rp.reviews_data, rp.first_name, rp.last_name
                FROM rmt_profiles rp
                WHERE rp.reviews_data IS NOT NULL AND rp.reviews_data != '[]'
            """
            
            if limit:
                query += f" LIMIT {limit}"
            
            results = conn.execute(query).fetchall()
            unanalyzed_extractions = []
            
            for row in results:
                profile_data = dict(row)
                reviews_data = json.loads(profile_data['reviews_data'])
                
                # Get analyzed review hashes for this profile
                analyzed_hashes = conn.execute("""
                    SELECT review_hash FROM ai_analyses 
                    WHERE profile_id = ?
                """, (profile_data['profile_id'],)).fetchall()
                analyzed_hashes = [h[0] for h in analyzed_hashes]
                
                # Find unanalyzed reviews
                for review in reviews_data:
                    if review.get('review_hash') not in analyzed_hashes:
                        # Convert to the format expected by the analyzer
                        extraction_data = {
                            'extraction_id': review['extraction_id'],
                            'profile_id': profile_data['profile_id'],
                            'review_text': review['review_text'],
                            'review_rating': review['review_rating'],
                            'review_author': review['review_author'],
                            'review_time_description': review['review_time_description'],
                            'place_id': review['place_id'],
                            'place_name': review['place_name'],
                            'place_address': review['place_address'],
                            'matched_text_segments': review['matched_text_segments'],
                            'confidence_scores': review['confidence_scores'],
                            'max_confidence': review['max_confidence']
                        }
                        unanalyzed_extractions.append(extraction_data)
            
            return unanalyzed_extractions
    
    def get_latest_leaderboard(self, run_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get the latest leaderboard data"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            
            if run_id:
                query = """
                    SELECT * FROM leaderboard_snapshots 
                    WHERE run_id = ?
                    ORDER BY composite_reputation_score DESC
                """
                results = conn.execute(query, (run_id,)).fetchall()
            else:
                # Get the most recent leaderboard
                query = """
                    SELECT ls.* FROM leaderboard_snapshots ls
                    INNER JOIN (
                        SELECT profile_id, MAX(snapshot_at) as latest_snapshot
                        FROM leaderboard_snapshots
                        GROUP BY profile_id
                    ) latest ON ls.profile_id = latest.profile_id 
                                AND ls.snapshot_at = latest.latest_snapshot
                    ORDER BY ls.composite_reputation_score DESC
                """
                results = conn.execute(query).fetchall()
            
            return [dict(row) for row in results]

class IncrementalRMTMonitor:
    """Main class for incremental RMT monitoring"""
    
    def __init__(self, google_api_key: str, gemini_api_key: str, db_path: str = "rmt_monitoring.db"):
        self.db = RMTMonitoringDatabase(db_path)
        
        # Initialize extractor with SSL handling
        self.extractor = RMTReviewExtractor(google_api_key=google_api_key)
        self.analyzer = GeminiReviewAnalyzer(api_key=gemini_api_key)
        
        # Monitoring configuration
        self.incremental_lookback_days = 30  # How far back to look for changes
        self.max_rmts_per_keyword = 50
        
    def run_full_analysis(self, search_keywords: List[str]) -> str:
        """Run complete analysis (first time or full rebuild)"""
        logger.info("Starting FULL analysis")
        
        run_id = self.db.start_monitoring_run('full', search_keywords)
        stats = {'rmts_processed': 0, 'reviews_extracted': 0, 'reviews_analyzed': 0}
        
        try:
            # Extract all data
            all_extractions = []
            processed_rmts = set()
            
            for keyword in search_keywords:
                logger.info(f"Processing keyword: {keyword}")
                
                # Get RMT profiles
                rmt_profiles = self.extractor.search_cmto_profiles(
                    keyword, 
                    limit=self.max_rmts_per_keyword,
                    get_all_pages=True
                )
                
                for rmt_data in rmt_profiles:
                    if rmt_data.profile_id in processed_rmts:
                        continue
                    
                    processed_rmts.add(rmt_data.profile_id)
                    
                    # Save RMT profile
                    self.db.save_rmt_profile(rmt_data, run_id)
                    stats['rmts_processed'] += 1
                    
                    # Extract reviews
                    extractions = self.extractor.extract_review_data(rmt_data)
                    
                    for extraction in extractions:
                        if self.db.save_review_extraction(extraction, run_id):
                            all_extractions.append(extraction)
                            stats['reviews_extracted'] += 1
            
            logger.info(f"Extraction complete: {stats['reviews_extracted']} new reviews")
            
            # Analyze with AI
            for extraction in all_extractions:
                analysis = self.analyzer.analyze_single_review(self._extraction_to_dict(extraction))
                if analysis:
                    self.db.save_ai_analysis(analysis, run_id, self.analyzer.model_name)
                    stats['reviews_analyzed'] += 1
                
                time.sleep(self.analyzer.request_delay)
            
            # Generate leaderboard
            self._generate_leaderboard_snapshot(run_id)
            
            self.db.complete_monitoring_run(run_id, stats)
            logger.info(f"Full analysis complete: {run_id}")
            
            return run_id
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Full analysis failed: {error_msg}")
            self.db.complete_monitoring_run(run_id, stats, error_msg)
            raise
    
    def run_incremental_update(self, search_keywords: List[str]) -> str:
        """Run incremental update (look for new reviews)"""
        logger.info("Starting INCREMENTAL update")
        
        # Check when we last ran
        last_run = self.db.get_last_successful_run()
        if not last_run:
            logger.warning("No previous successful run found, running full analysis instead")
            return self.run_full_analysis(search_keywords)
        
        # Calculate lookback period
        lookback_date = datetime.now() - timedelta(days=self.incremental_lookback_days)
        logger.info(f"Looking for changes since: {lookback_date}")
        
        run_id = self.db.start_monitoring_run('incremental', search_keywords)
        stats = {'rmts_processed': 0, 'reviews_extracted': 0, 'reviews_analyzed': 0}
        
        try:
            # Get existing RMT profiles to check for updates
            new_extractions = []
            
            for keyword in search_keywords:
                logger.info(f"Checking keyword for updates: {keyword}")
                
                # Get current RMT profiles (limited search for incremental)
                rmt_profiles = self.extractor.search_cmto_profiles(
                    keyword, 
                    limit=min(self.max_rmts_per_keyword, 20),  # Smaller limit for incremental
                    get_all_pages=False  # Just first few pages
                )
                
                for rmt_data in rmt_profiles:
                    # Always update RMT profile (in case of changes)
                    self.db.save_rmt_profile(rmt_data, run_id)
                    stats['rmts_processed'] += 1
                    
                    # Extract reviews (Google API limitation: always same 5 reviews)
                    extractions = self.extractor.extract_review_data(rmt_data)
                    
                    for extraction in extractions:
                        # save_review_extraction returns True only if it's new
                        if self.db.save_review_extraction(extraction, run_id):
                            new_extractions.append(extraction)
                            stats['reviews_extracted'] += 1
                            logger.info(f"Found new review for {rmt_data.first_name} {rmt_data.last_name}")
            
            logger.info(f"Incremental extraction: {stats['reviews_extracted']} new reviews")
            
            # Analyze only new extractions
            for extraction in new_extractions:
                analysis = self.analyzer.analyze_single_review(self._extraction_to_dict(extraction))
                if analysis:
                    self.db.save_ai_analysis(analysis, run_id, self.analyzer.model_name)
                    stats['reviews_analyzed'] += 1
                
                time.sleep(self.analyzer.request_delay)
            
            # Also analyze any previously unanalyzed extractions
            unanalyzed = self.db.get_unanalyzed_extractions(limit=50)
            logger.info(f"Found {len(unanalyzed)} previously unanalyzed extractions")
            
            for extraction_data in unanalyzed:
                # Convert database row to extraction format
                analysis = self.analyzer.analyze_single_review(self._db_extraction_to_dict(extraction_data))
                if analysis:
                    self.db.save_ai_analysis(analysis, run_id, self.analyzer.model_name)
                    stats['reviews_analyzed'] += 1
                
                time.sleep(self.analyzer.request_delay)
            
            # Generate updated leaderboard
            self._generate_leaderboard_snapshot(run_id)
            
            self.db.complete_monitoring_run(run_id, stats)
            logger.info(f"Incremental update complete: {run_id}")
            
            return run_id
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Incremental update failed: {error_msg}")
            self.db.complete_monitoring_run(run_id, stats, error_msg)
            raise
    
    def _extraction_to_dict(self, extraction: ReviewExtraction) -> Dict[str, Any]:
        """Convert ReviewExtraction to dictionary for analysis"""
        return {
            'extraction_id': extraction.extraction_id,
            'rmt_information': extraction.rmt_data,
            'review_content': extraction.review_data,
            'business_context': extraction.place_data,
            'matching_analysis': {
                'matched_text_segments': extraction.matched_text_segments,
                'confidence_scores': extraction.confidence_scores,
                'max_confidence': max(extraction.confidence_scores) if extraction.confidence_scores else 0
            }
        }
    
    def _db_extraction_to_dict(self, extraction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert database extraction row to analysis format"""
        return {
            'extraction_id': extraction_data['extraction_id'],
            'rmt_information': {
                'profile_id': extraction_data['profile_id'],
                'full_name': f"Profile {extraction_data['profile_id']}"  # Simplified for unanalyzed
            },
            'review_content': {
                'text': extraction_data['review_text'],
                'rating': extraction_data['review_rating'],
                'author_name': extraction_data['review_author'],
                'time_description': extraction_data['review_time_description']
            },
            'business_context': {
                'place_id': extraction_data['place_id'],
                'business_name': extraction_data['place_name'],
                'address': extraction_data['place_address']
            },
            'matching_analysis': {
                'matched_text_segments': json.loads(extraction_data['matched_text_segments'] or '[]'),
                'confidence_scores': json.loads(extraction_data['confidence_scores'] or '[]'),
                'max_confidence': extraction_data['max_confidence'] or 0
            }
        }
    
    def _generate_leaderboard_snapshot(self, run_id: str):
        """Generate leaderboard snapshot from current data"""
        logger.info("Generating leaderboard snapshot")
        
        with sqlite3.connect(self.db.db_path) as conn:
            # Get aggregated metrics per RMT
            results = conn.execute("""
                SELECT 
                    rp.profile_id,
                    rp.first_name || ' ' || rp.last_name as rmt_name,
                    COUNT(aa.analysis_id) as total_reviews,
                    SUM(CASE WHEN aa.sentiment_overall IN ('positive', 'very_positive') THEN 1 ELSE 0 END) as positive_count,
                    SUM(CASE WHEN aa.sentiment_overall IN ('negative', 'very_negative') THEN 1 ELSE 0 END) as negative_count,
                    AVG(aa.sentiment_confidence) as avg_sentiment,
                    AVG(aa.overall_analysis_confidence) as avg_confidence,
                    SUM(CASE WHEN aa.potential_false_positive = 1 THEN 1 ELSE 0 END) as false_positives
                FROM rmt_profiles rp
                LEFT JOIN ai_analyses aa ON rp.profile_id = aa.profile_id
                WHERE aa.analysis_id IS NOT NULL
                GROUP BY rp.profile_id, rp.first_name, rp.last_name
                HAVING total_reviews > 0
            """).fetchall()
            
            # Save leaderboard snapshots
            for row in results:
                profile_id, rmt_name, total_reviews, positive_count, negative_count, avg_sentiment, avg_confidence, false_positives = row
                
                # Calculate composite score (simplified)
                sentiment_score = ((positive_count - negative_count) / total_reviews) * 50 + 50 if total_reviews > 0 else 50
                confidence_penalty = max(0, (1 - avg_confidence) * 20) if avg_confidence else 0
                false_positive_penalty = min(20, false_positives * 5)
                
                composite_score = max(0, min(100, sentiment_score - confidence_penalty - false_positive_penalty))
                
                snapshot_id = f"snapshot_{profile_id}_{int(time.time())}"
                
                conn.execute("""
                    INSERT INTO leaderboard_snapshots 
                    (snapshot_id, run_id, profile_id, rmt_name, total_reviews_analyzed,
                     positive_sentiment_count, negative_sentiment_count, average_sentiment_score,
                     composite_reputation_score, recommendation_rate, repeat_client_rate,
                     potential_false_positives, snapshot_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    snapshot_id, run_id, profile_id, rmt_name, total_reviews,
                    positive_count, negative_count, avg_sentiment or 0,
                    composite_score, 0.0, 0.0,  # Placeholder rates
                    false_positives, datetime.now()
                ))
        
        logger.info("Leaderboard snapshot generated")
    
    def export_latest_results(self, output_dir: str = None) -> Dict[str, str]:
        """Export latest results to JSON files"""
        if not output_dir:
            output_dir = f"rmt_export_{int(time.time())}"
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Export leaderboard
        leaderboard = self.db.get_latest_leaderboard()
        leaderboard_file = os.path.join(output_dir, "current_leaderboard.json")
        with open(leaderboard_file, 'w') as f:
            json.dump(leaderboard, f, indent=2, default=str)
        
        # Export monitoring runs history
        with sqlite3.connect(self.db.db_path) as conn:
            conn.row_factory = sqlite3.Row
            runs = [dict(row) for row in conn.execute("""
                SELECT * FROM monitoring_runs 
                ORDER BY started_at DESC LIMIT 10
            """).fetchall()]
        
        runs_file = os.path.join(output_dir, "monitoring_history.json")
        with open(runs_file, 'w') as f:
            json.dump(runs, f, indent=2, default=str)
        
        logger.info(f"Results exported to: {output_dir}")
        
        return {
            'leaderboard': leaderboard_file,
            'monitoring_history': runs_file,
            'output_directory': output_dir
        }

def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description='Incremental RMT Monitoring System')
    parser.add_argument('--mode', choices=['full', 'incremental', 'rebuild', 'export', 'test'], 
                       default='incremental', help='Monitoring mode')
    parser.add_argument('--google-api-key', help='Google Places API key')
    parser.add_argument('--gemini-api-key', help='Gemini AI API key')
    parser.add_argument('--db-path', default='rmt_monitoring.db', help='Database file path')
    parser.add_argument('--keywords', nargs='+', 
                       default=['Toronto massage therapy', 'Mississauga RMT'],
                       help='Search keywords')
    
    args = parser.parse_args()
    
    # Handle test mode
    if args.mode == 'test':
        from rmt_review_extractor import test_cmto_api
        success = test_cmto_api()
        if success:
            print("\n✅ CMTO API test successful! You can now run the full system.")
        else:
            print("\n❌ CMTO API test failed. Please check the error messages above.")
        exit(0 if success else 1)
    
    # Validate API keys for other modes
    if not args.google_api_key or not args.gemini_api_key:
        print("❌ Error: --google-api-key and --gemini-api-key are required for this mode")
        print("💡 To test CMTO API only, run: --mode=test")
        exit(1)
    
    # Initialize monitor
    monitor = IncrementalRMTMonitor(
        google_api_key=args.google_api_key,
        gemini_api_key=args.gemini_api_key,
        db_path=args.db_path
    )
    
    try:
        if args.mode == 'full':
            run_id = monitor.run_full_analysis(args.keywords)
            print(f"✅ Full analysis complete: {run_id}")
            
        elif args.mode == 'incremental':
            run_id = monitor.run_incremental_update(args.keywords)
            print(f"✅ Incremental update complete: {run_id}")
            
        elif args.mode == 'rebuild':
            run_id = monitor.run_full_analysis(args.keywords)
            print(f"✅ Full rebuild complete: {run_id}")
            
        elif args.mode == 'export':
            files = monitor.export_latest_results()
            print(f"✅ Export complete:")
            for file_type, file_path in files.items():
                print(f"   📄 {file_type}: {file_path}")
        
        # Always export latest results
        if args.mode != 'export':
            files = monitor.export_latest_results()
            print(f"\n📊 Latest results exported to: {files['output_directory']}")
        
    except Exception as e:
        logger.error(f"❌ Operation failed: {e}")
        exit(1)

if __name__ == "__main__":
    main()
