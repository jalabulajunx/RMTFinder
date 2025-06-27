#!/usr/bin/env python3
"""
Standalone script to run AI analysis on existing reviews in the database.
This script only performs the analysis step, skipping extraction.
"""

import argparse
import json
import logging
import sqlite3
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

from gemini_review_analyzer import GeminiReviewAnalyzer, ComprehensiveRMTAnalysis

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AnalysisOnlyRunner:
    def __init__(self, gemini_api_key: str, db_path: str = "rmt_monitoring.db"):
        self.analyzer = GeminiReviewAnalyzer(gemini_api_key)
        self.db_path = db_path
        
    def get_unanalyzed_reviews(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get reviews that haven't been analyzed yet"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            
            query = """
                SELECT 
                    rp.profile_id,
                    rp.first_name,
                    rp.last_name,
                    rp.registration_status,
                    rp.authorized_to_practice,
                    rp.practice_locations,
                    rp.reviews_data,
                    aa.analysis_id
                FROM rmt_profiles rp
                LEFT JOIN ai_analyses aa ON rp.profile_id = aa.profile_id
                WHERE rp.reviews_data IS NOT NULL 
                AND rp.reviews_data != '[]'
                AND rp.reviews_data != 'null'
            """
            
            if limit:
                query += f" LIMIT {limit}"
                
            rows = conn.execute(query).fetchall()
            
            unanalyzed_reviews = []
            
            for row in rows:
                profile_data = dict(row)
                reviews_data = json.loads(profile_data['reviews_data'])
                
                # Check which reviews haven't been analyzed
                for review in reviews_data:
                    review_hash = review.get('review_hash', '')
                    
                    # Check if this review has been analyzed
                    existing_analysis = conn.execute(
                        "SELECT analysis_id FROM ai_analyses WHERE profile_id = ? AND review_hash = ?",
                        (profile_data['profile_id'], review_hash)
                    ).fetchone()
                    
                    if not existing_analysis:
                        # Ensure extraction_id is well-formed
                        extraction_id = review.get('extraction_id')
                        if not extraction_id or not isinstance(extraction_id, str) or extraction_id.strip() == '' or any(x in extraction_id for x in ['N/A', 'id', 'review', 'unknown', 'placeholder', 'prompt', 'not', 'provided']):
                            extraction_id = f"{profile_data['profile_id']}_{review.get('place_id', 'unknown')}_{review_hash or review.get('review_timestamp', 'unknown')}"
                        
                        analysis_data = {
                            'extraction_id': extraction_id,
                            'rmt_information': {
                                'profile_id': profile_data['profile_id'],
                                'full_name': f"{profile_data['first_name']} {profile_data['last_name']}",
                                'first_name': profile_data['first_name'],
                                'last_name': profile_data['last_name'],
                                'registration_status': profile_data['registration_status'],
                                'authorized_to_practice': profile_data['authorized_to_practice'],
                                'practice_locations': profile_data['practice_locations']
                            },
                            'review_content': {
                                'full_text': review.get('review_text', ''),
                                'rating': review.get('review_rating', 0),
                                'author': review.get('review_author', ''),
                                'time_description': review.get('review_time_description', ''),
                                'text_length': len(review.get('review_text', ''))
                            },
                            'business_context': {
                                'place_id': review.get('place_id', ''),
                                'business_name': review.get('place_name', ''),
                                'address': '',  # Not stored in current schema
                                'business_rating': 0,  # Not stored in current schema
                                'total_reviews': 0,  # Not stored in current schema
                                'business_types': []  # Not stored in current schema
                            },
                            'matching_analysis': {
                                'matched_text_segments': review.get('matched_text_segments', []),
                                'confidence_scores': review.get('confidence_scores', []),
                                'max_confidence': review.get('max_confidence', 0)
                            }
                        }
                        
                        unanalyzed_reviews.append(analysis_data)
            
            return unanalyzed_reviews
    
    def save_analysis(self, analysis: ComprehensiveRMTAnalysis, run_id: str):
        """Save analysis results to database"""
        # Check extraction_id validity
        extraction_id = analysis.extraction_id
        if not extraction_id or not isinstance(extraction_id, str) or extraction_id.strip() == '' or any(x in extraction_id for x in ['N/A', 'id', 'review', 'unknown', 'placeholder', 'prompt', 'not', 'provided']):
            logger.error(f"Skipping analysis with bad extraction_id: {extraction_id}")
            return
        profile_id = extraction_id.split('_')[0]
        review_hash = extraction_id.split('_')[-1]
        logger.debug(f"Saving analysis: profile_id={profile_id}, extraction_id={extraction_id}, review_hash={review_hash}")
        with sqlite3.connect(self.db_path) as conn:
            # Generate analysis_id
            analysis_id = f"analysis_{profile_id}_{int(time.time())}"
            
            conn.execute("""
                INSERT INTO ai_analyses (
                    analysis_id, profile_id, analysis_run_id, review_hash, sentiment_overall, 
                    sentiment_confidence, technical_skill_rating, communication_rating,
                    professionalism_rating, review_authenticity, potential_false_positive,
                    overall_analysis_confidence, analysis_json, analyzed_at, gemini_model_used
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                analysis_id,
                profile_id,
                run_id,
                review_hash,
                analysis.sentiment_analysis.overall_sentiment,
                analysis.sentiment_analysis.confidence_score,
                analysis.service_quality_metrics.technical_skill_rating,
                analysis.service_quality_metrics.communication_rating,
                analysis.service_quality_metrics.professionalism_rating,
                analysis.review_classification.review_authenticity,
                analysis.potential_false_positive,
                analysis.overall_analysis_confidence,
                analysis.model_dump_json(),
                datetime.now(),
                "gemini-2.5-flash-preview-04-17"
            ))
    
    def create_monitoring_run(self, run_id: str):
        """Create a monitoring run record for the analysis session"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO monitoring_runs (
                    run_id, run_type, started_at, completed_at, search_keywords,
                    rmts_processed, reviews_extracted, reviews_analyzed, status, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                run_id,
                'analysis_only',
                datetime.now(),
                None,  # Will be updated when complete
                json.dumps(['analysis_only']),
                0,  # No new RMTs processed
                0,  # No new reviews extracted
                0,  # Will be updated during analysis
                'running',
                None
            ))
    
    def update_monitoring_run(self, run_id: str, reviews_analyzed: int, successful: int, failed: int):
        """Update the monitoring run with final statistics"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE monitoring_runs 
                SET completed_at = ?, reviews_analyzed = ?, status = ?, error_message = ?
                WHERE run_id = ?
            """, (
                datetime.now(),
                reviews_analyzed,
                'completed' if failed == 0 else 'completed_with_errors',
                f"Analysis complete: {successful} successful, {failed} failed" if failed > 0 else None,
                run_id
            ))
    
    def run_analysis(self, limit: Optional[int] = None, delay: float = 1.0):
        """Run analysis on unanalyzed reviews"""
        logger.info("Starting analysis of unanalyzed reviews...")
        
        # Get unanalyzed reviews
        unanalyzed = self.get_unanalyzed_reviews(limit)
        logger.info(f"Found {len(unanalyzed)} unanalyzed reviews")
        
        if not unanalyzed:
            logger.info("No unanalyzed reviews found!")
            return
        
        # Create run ID
        run_id = f"analysis_only_{int(time.time())}"
        
        # Create monitoring run record
        self.create_monitoring_run(run_id)
        
        # Process reviews
        successful = 0
        failed = 0
        
        for i, review_data in enumerate(unanalyzed, 1):
            try:
                logger.info(f"Analyzing review {i}/{len(unanalyzed)}: {review_data['extraction_id']}")
                
                # Run analysis
                analysis = self.analyzer.analyze_single_review(review_data)
                
                if analysis:
                    # Save to database
                    self.save_analysis(analysis, run_id)
                    successful += 1
                    logger.info(f"✅ Analysis completed for {review_data['rmt_information']['full_name']}")
                else:
                    failed += 1
                    logger.error(f"❌ Analysis failed for {review_data['extraction_id']}")
                
                # Rate limiting
                if i < len(unanalyzed):
                    time.sleep(delay)
                    
            except Exception as e:
                failed += 1
                logger.error(f"❌ Error analyzing review {review_data['extraction_id']}: {e}")
                continue
        
        # Update monitoring run with final stats
        self.update_monitoring_run(run_id, len(unanalyzed), successful, failed)
        
        logger.info(f"Analysis complete: {successful} successful, {failed} failed")
        return run_id

def main():
    parser = argparse.ArgumentParser(description='Run AI analysis on existing reviews')
    parser.add_argument('--gemini-api-key', required=True, help='Gemini AI API key')
    parser.add_argument('--db-path', default='rmt_monitoring.db', help='Database file path')
    parser.add_argument('--limit', type=int, help='Limit number of reviews to analyze')
    parser.add_argument('--delay', type=float, default=1.0, help='Delay between API calls (seconds)')
    
    args = parser.parse_args()
    
    # Initialize runner
    runner = AnalysisOnlyRunner(args.gemini_api_key, args.db_path)
    
    try:
        # Run analysis
        run_id = runner.run_analysis(args.limit, args.delay)
        
        if run_id:
            print(f"\n✅ Analysis complete! Run ID: {run_id}")
        else:
            print("\nℹ️ No analysis was performed (no unanalyzed reviews found)")
            
    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}")
        exit(1)

if __name__ == "__main__":
    main() 