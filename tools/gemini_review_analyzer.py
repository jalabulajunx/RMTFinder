#!/usr/bin/env python3
"""
Gemini AI Review Analyzer

This script processes extracted RMT review data using Google Gemini AI to perform
semantic analysis, sentiment analysis, and generate confidence scores and metrics.

Requirements:
    pip install google-genai pydantic

Usage:
    python gemini_review_analyzer.py extracted_reviews.json
"""

import json
import sys
import time
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SentimentAnalysis(BaseModel):
    """Sentiment analysis results"""
    overall_sentiment: Literal["very_positive", "positive", "neutral", "negative", "very_negative"] = Field(
        description="Overall sentiment of the review toward the RMT"
    )
    confidence_score: float = Field(
        ge=0.0, le=1.0, description="Confidence in sentiment analysis (0.0 to 1.0)"
    )
    emotional_tone: str = Field(
        description="Emotional tone (e.g., grateful, frustrated, satisfied, disappointed)"
    )

class RMTMentionAnalysis(BaseModel):
    """Analysis of how the RMT is mentioned in the review"""
    mention_type: Literal["direct_name", "title_only", "description", "unclear"] = Field(
        description="How the RMT is referenced in the review"
    )
    mention_confidence: float = Field(
        ge=0.0, le=1.0, description="Confidence that this review actually refers to the specific RMT"
    )
    mention_context: str = Field(
        description="Context in which the RMT is mentioned (e.g., 'primary therapist', 'one of several staff')"
    )
    name_variations_detected: List[str] = Field(
        description="All variations of the RMT's name found in the review"
    )

class ServiceQualityMetrics(BaseModel):
    """Metrics about service quality mentioned in the review"""
    technical_skill_rating: Optional[int] = Field(
        default=None, ge=1, le=5, description="Rating of technical massage skill (1-5) if mentioned"
    )
    communication_rating: Optional[int] = Field(
        default=None, ge=1, le=5, description="Rating of communication skills (1-5) if mentioned"
    )
    professionalism_rating: Optional[int] = Field(
        default=None, ge=1, le=5, description="Rating of professionalism (1-5) if mentioned"
    )
    pain_relief_effectiveness: Optional[str] = Field(
        default=None, description="Comments about pain relief effectiveness if mentioned"
    )
    treatment_approach: Optional[str] = Field(
        default=None, description="Description of treatment approach if mentioned"
    )

class BusinessContextAnalysis(BaseModel):
    """Analysis of business context"""
    business_name_confidence: float = Field(
        ge=0.0, le=1.0, description="Confidence that the review is about the correct business location"
    )
    staff_context: Literal["solo_practice", "multiple_therapists", "part_of_team", "unclear"] = Field(
        description="Whether the RMT appears to work alone or as part of a team"
    )
    appointment_booking_mentioned: bool = Field(
        description="Whether appointment booking process is mentioned"
    )
    facility_quality_mentioned: bool = Field(
        description="Whether facility quality/cleanliness is mentioned"
    )

class ReviewClassification(BaseModel):
    """Classification of the review type and quality"""
    review_authenticity: Literal["authentic", "suspicious", "unclear"] = Field(
        description="Assessment of review authenticity based on language patterns"
    )
    review_detail_level: Literal["very_detailed", "detailed", "moderate", "brief", "minimal"] = Field(
        description="Level of detail in the review"
    )
    specific_treatment_mentioned: bool = Field(
        description="Whether specific treatments or techniques are mentioned"
    )
    repeat_client_indicated: bool = Field(
        description="Whether the reviewer indicates being a repeat client"
    )
    recommendation_given: bool = Field(
        description="Whether the reviewer explicitly recommends the RMT"
    )

class ComprehensiveRMTAnalysis(BaseModel):
    """Complete analysis of an RMT review"""
    extraction_id: str = Field(description="ID of the original extraction")
    
    # Core Analysis
    sentiment_analysis: SentimentAnalysis
    rmt_mention_analysis: RMTMentionAnalysis
    service_quality_metrics: ServiceQualityMetrics
    business_context_analysis: BusinessContextAnalysis
    review_classification: ReviewClassification
    
    # Key Insights
    key_positive_points: List[str] = Field(
        description="List of specific positive points mentioned about the RMT"
    )
    key_negative_points: List[str] = Field(
        description="List of specific negative points or concerns mentioned"
    )
    notable_quotes: List[str] = Field(
        description="Notable direct quotes from the review (max 3)"
    )
    
    # Confidence Metrics
    overall_analysis_confidence: float = Field(
        ge=0.0, le=1.0, description="Overall confidence in the analysis accuracy"
    )
    potential_false_positive: bool = Field(
        description="Whether this might be a false positive match"
    )
    analysis_notes: str = Field(
        description="Additional notes or caveats about the analysis"
    )

class RMTLeaderboardMetrics(BaseModel):
    """Aggregated metrics for leaderboard generation"""
    profile_id: str
    rmt_name: str
    
    # Review Volume Metrics
    total_reviews_analyzed: int
    high_confidence_reviews: int = Field(description="Reviews with >0.8 mention confidence")
    authentic_reviews: int = Field(description="Reviews classified as authentic")
    
    # Sentiment Metrics
    positive_sentiment_count: int
    negative_sentiment_count: int
    average_sentiment_score: float = Field(ge=-1.0, le=1.0, description="Average sentiment (-1 to 1)")
    
    # Quality Metrics
    average_technical_skill: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    average_communication: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    average_professionalism: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    
    # Business Metrics
    recommendation_rate: float = Field(ge=0.0, le=1.0, description="Percentage of reviews with recommendations")
    repeat_client_rate: float = Field(ge=0.0, le=1.0, description="Percentage indicating repeat clients")
    
    # Risk Indicators
    potential_false_positives: int
    low_confidence_matches: int
    
    # Overall Score
    composite_reputation_score: float = Field(
        ge=0.0, le=100.0, description="Composite reputation score (0-100)"
    )

class GeminiReviewAnalyzer:
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash-preview-04-17"):
        """
        Initialize the Gemini AI Review Analyzer
        
        Args:
            api_key: Gemini API key
            model_name: Gemini model to use
        """
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name
        
        # Analysis configuration
        self.analysis_config = types.GenerateContentConfig(
            temperature=0.1,  # Low temperature for consistent analysis
            max_output_tokens=2048,
            response_mime_type="application/json",
            response_schema=ComprehensiveRMTAnalysis
        )
        
        # Rate limiting
        self.request_delay = 1.0  # seconds between API calls
        
    def analyze_single_review(self, extraction_data: Dict[str, Any]) -> Optional[ComprehensiveRMTAnalysis]:
        """
        Analyze a single review extraction using Gemini AI
        
        Args:
            extraction_data: Single extraction from the extractor output
            
        Returns:
            ComprehensiveRMTAnalysis object or None if analysis failed
        """
        try:
            # Build comprehensive prompt
            prompt = self._build_analysis_prompt(extraction_data)
            
            # Make API call with structured output
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=self.analysis_config
            )
            
            # Parse structured response
            analysis_dict = json.loads(response.text)
            analysis = ComprehensiveRMTAnalysis(**analysis_dict)
            
            logger.info(f"Analyzed review for {extraction_data['rmt_information'].get('full_name', extraction_data['rmt_information'].get('profile_id', 'Unknown'))}")
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze review {extraction_data.get('extraction_id', 'unknown')}: {e}")
            return None
    
    def _build_analysis_prompt(self, extraction_data: Dict[str, Any]) -> str:
        """Build a comprehensive analysis prompt for Gemini"""
        
        rmt_info = extraction_data['rmt_information']
        review_content = extraction_data['review_content']
        business_context = extraction_data['business_context']
        matching_analysis = extraction_data['matching_analysis']
        
        # Handle missing full_name by constructing it from first_name and last_name
        full_name = rmt_info.get('full_name')
        if not full_name:
            first_name = rmt_info.get('first_name', '')
            last_name = rmt_info.get('last_name', '')
            full_name = f"{first_name} {last_name}".strip()
            if not full_name:
                full_name = f"RMT {rmt_info.get('profile_id', 'Unknown')}"
        
        prompt = f"""
You are an expert analyst specializing in healthcare professional reputation analysis. Please perform a comprehensive analysis of this Google review that potentially mentions a Registered Massage Therapist (RMT).

## RMT INFORMATION:
- Name: {full_name}
- Common Name: {rmt_info.get('common_name', 'N/A')}
- Registration Status: {rmt_info.get('registration_status', 'Unknown')}
- Authorized to Practice: {rmt_info.get('authorized_to_practice', 'Unknown')}
- Profile ID: {rmt_info.get('profile_id', 'Unknown')}

## BUSINESS CONTEXT:
- Business Name: {business_context.get('business_name', 'Unknown')}
- Address: {business_context.get('address', 'N/A')}
- Business Rating: {business_context.get('business_rating', 'N/A')}/5
- Total Business Reviews: {business_context.get('total_reviews', 'N/A')}
- Business Types: {', '.join(business_context.get('business_types', []))}

## REVIEW CONTENT:
- Full Text: "{review_content.get('full_text', '')}"
- Rating Given: {review_content.get('rating', 0)}/5
- Author: {review_content.get('author', 'Anonymous')}
- Time: {review_content.get('time_description', 'Unknown')}
- Text Length: {review_content.get('text_length', 0)} characters

## MATCHING ANALYSIS:
- Matched Text Segments: {matching_analysis.get('matched_text_segments', [])}
- Confidence Scores: {matching_analysis.get('confidence_scores', [])}
- Maximum Confidence: {matching_analysis.get('max_confidence', 0)}%

## ANALYSIS INSTRUCTIONS:

1. **RMT Mention Analysis**: Carefully determine if this review actually refers to the specific RMT mentioned. Consider:
   - Are the matched text segments actually referring to a person vs. a business name?
   - Is there clear evidence this is about the specific RMT vs. someone with a similar name?
   - What is the context of the mention?

2. **Sentiment Analysis**: Analyze the sentiment specifically toward the healthcare professional, not just the business.

3. **Service Quality Assessment**: Extract specific mentions of:
   - Technical massage skills
   - Communication abilities
   - Professionalism
   - Treatment effectiveness
   - Pain relief outcomes

4. **Authenticity Assessment**: Evaluate if the review seems authentic based on:
   - Language patterns
   - Specificity of details
   - Balance of positive/negative points
   - Length and depth

5. **Business Context**: Understand whether the RMT works alone or as part of a team, and how this affects attribution.

6. **Specialization**: Call out or categorize them as "Pre-natal", "Post-natal", "Sports", "Geriatric", "Rehabilitation", "Pain Management", "Stress Relief", "Relaxation", "Other".

7. **False Positive Detection**: Be especially vigilant about whether this might be a false positive match.

Please provide a thorough, objective analysis following the structured format. Be conservative in your confidence scores and explicit about any uncertainties.
"""
        
        return prompt.strip()
    
    def calculate_leaderboard_metrics(self, analyses: List[ComprehensiveRMTAnalysis]) -> List[RMTLeaderboardMetrics]:
        """
        Calculate aggregated metrics for leaderboard generation
        
        Args:
            analyses: List of analysis results
            
        Returns:
            List of leaderboard metrics by RMT
        """
        # Group analyses by RMT
        rmt_groups = {}
        for analysis in analyses:
            # We need to reconstruct the RMT info from the analysis
            # This would typically come from the original extraction data
            profile_id = analysis.extraction_id.split('_')[0]  # Extract from ID
            
            if profile_id not in rmt_groups:
                rmt_groups[profile_id] = []
            rmt_groups[profile_id].append(analysis)
        
        leaderboard_metrics = []
        
        for profile_id, group_analyses in rmt_groups.items():
            # Calculate metrics for this RMT
            total_reviews = len(group_analyses)
            
            # Filter high-confidence reviews
            high_confidence = [a for a in group_analyses if a.rmt_mention_analysis.mention_confidence > 0.8]
            authentic_reviews = [a for a in group_analyses if a.review_classification.review_authenticity == "authentic"]
            
            # Sentiment metrics
            sentiment_scores = []
            positive_count = 0
            negative_count = 0
            
            for analysis in group_analyses:
                sentiment = analysis.sentiment_analysis.overall_sentiment
                if sentiment in ["very_positive", "positive"]:
                    positive_count += 1
                    sentiment_scores.append(1.0 if sentiment == "very_positive" else 0.5)
                elif sentiment in ["very_negative", "negative"]:
                    negative_count += 1
                    sentiment_scores.append(-1.0 if sentiment == "very_negative" else -0.5)
                else:
                    sentiment_scores.append(0.0)
            
            avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0.0
            
            # Quality metrics
            technical_scores = [a.service_quality_metrics.technical_skill_rating for a in group_analyses 
                             if a.service_quality_metrics.technical_skill_rating is not None]
            communication_scores = [a.service_quality_metrics.communication_rating for a in group_analyses 
                                  if a.service_quality_metrics.communication_rating is not None]
            professionalism_scores = [a.service_quality_metrics.professionalism_rating for a in group_analyses 
                                    if a.service_quality_metrics.professionalism_rating is not None]
            
            # Business metrics
            recommendations = sum(1 for a in group_analyses if a.review_classification.recommendation_given)
            repeat_clients = sum(1 for a in group_analyses if a.review_classification.repeat_client_indicated)
            
            # Risk indicators
            false_positives = sum(1 for a in group_analyses if a.potential_false_positive)
            low_confidence = sum(1 for a in group_analyses if a.rmt_mention_analysis.mention_confidence < 0.6)
            
            # Calculate composite score (0-100)
            composite_score = self._calculate_composite_score(
                total_reviews, len(high_confidence), len(authentic_reviews),
                positive_count, negative_count, avg_sentiment,
                technical_scores, communication_scores, professionalism_scores,
                recommendations, repeat_clients, false_positives
            )
            
            metrics = RMTLeaderboardMetrics(
                profile_id=profile_id,
                rmt_name=f"RMT_{profile_id}",  # Would normally come from original data
                total_reviews_analyzed=total_reviews,
                high_confidence_reviews=len(high_confidence),
                authentic_reviews=len(authentic_reviews),
                positive_sentiment_count=positive_count,
                negative_sentiment_count=negative_count,
                average_sentiment_score=round(avg_sentiment, 3),
                average_technical_skill=round(sum(technical_scores) / len(technical_scores), 2) if technical_scores else None,
                average_communication=round(sum(communication_scores) / len(communication_scores), 2) if communication_scores else None,
                average_professionalism=round(sum(professionalism_scores) / len(professionalism_scores), 2) if professionalism_scores else None,
                recommendation_rate=round(recommendations / total_reviews, 3) if total_reviews > 0 else 0.0,
                repeat_client_rate=round(repeat_clients / total_reviews, 3) if total_reviews > 0 else 0.0,
                potential_false_positives=false_positives,
                low_confidence_matches=low_confidence,
                composite_reputation_score=round(composite_score, 2)
            )
            
            leaderboard_metrics.append(metrics)
        
        # Sort by composite score
        leaderboard_metrics.sort(key=lambda x: x.composite_reputation_score, reverse=True)
        
        return leaderboard_metrics
    
    def _calculate_composite_score(self, total_reviews: int, high_confidence: int, authentic: int,
                                 positive: int, negative: int, avg_sentiment: float,
                                 technical: List[float], communication: List[float], professionalism: List[float],
                                 recommendations: int, repeat_clients: int, false_positives: int) -> float:
        """Calculate a composite reputation score (0-100)"""
        
        if total_reviews == 0:
            return 0.0
        
        # Base score from sentiment (0-40 points)
        sentiment_score = max(0, min(40, (avg_sentiment + 1) * 20))  # Convert -1,1 to 0,40
        
        # Quality scores (0-30 points)
        quality_scores = technical + communication + professionalism
        quality_score = (sum(quality_scores) / len(quality_scores) - 1) * 7.5 if quality_scores else 15  # Convert 1-5 to 0-30
        
        # Volume and confidence bonus (0-20 points)
        confidence_ratio = high_confidence / total_reviews if total_reviews > 0 else 0
        volume_bonus = min(10, total_reviews)  # Up to 10 points for volume
        confidence_bonus = confidence_ratio * 10  # Up to 10 points for confidence
        
        # Engagement bonus (0-10 points)
        recommendation_bonus = (recommendations / total_reviews) * 5 if total_reviews > 0 else 0
        repeat_client_bonus = (repeat_clients / total_reviews) * 5 if total_reviews > 0 else 0
        
        # Penalties
        false_positive_penalty = min(20, false_positives * 5)  # Up to 20 point penalty
        
        composite = sentiment_score + quality_score + volume_bonus + confidence_bonus + recommendation_bonus + repeat_client_bonus - false_positive_penalty
        
        return max(0, min(100, composite))
    
    def process_extractions(self, extraction_file: str) -> Dict[str, Any]:
        """
        Process all extractions from a file and generate complete analysis
        
        Args:
            extraction_file: Path to JSON file from the extractor
            
        Returns:
            Complete analysis results with leaderboard metrics
        """
        logger.info(f"Loading extractions from {extraction_file}")
        
        with open(extraction_file, 'r', encoding='utf-8') as f:
            extraction_data = json.load(f)
        
        extractions = extraction_data.get('extractions', [])
        logger.info(f"Found {len(extractions)} extractions to analyze")
        
        analyses = []
        
        # Process each extraction
        for i, extraction in enumerate(extractions, 1):
            logger.info(f"Analyzing extraction {i}/{len(extractions)}")
            
            analysis = self.analyze_single_review(extraction)
            if analysis:
                analyses.append(analysis)
            
            # Rate limiting
            time.sleep(self.request_delay)
        
        logger.info(f"Completed analysis of {len(analyses)} reviews")
        
        # Calculate leaderboard metrics
        leaderboard_metrics = self.calculate_leaderboard_metrics(analyses)
        
        # Build final results
        results = {
            "analysis_metadata": {
                "analysis_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "model_used": self.model_name,
                "total_extractions_processed": len(extractions),
                "successful_analyses": len(analyses),
                "analysis_success_rate": round(len(analyses) / len(extractions), 3) if extractions else 0,
                "original_extraction_metadata": extraction_data.get('metadata', {})
            },
            "individual_analyses": [analysis.dict() for analysis in analyses],
            "leaderboard_metrics": [metrics.dict() for metrics in leaderboard_metrics],
            "summary_statistics": self._generate_summary_stats(analyses, leaderboard_metrics)
        }
        
        return results
    
    def _generate_summary_stats(self, analyses: List[ComprehensiveRMTAnalysis], 
                               leaderboard: List[RMTLeaderboardMetrics]) -> Dict[str, Any]:
        """Generate summary statistics from analyses"""
        
        if not analyses:
            return {}
        
        # Overall sentiment distribution
        sentiment_dist = {}
        for analysis in analyses:
            sentiment = analysis.sentiment_analysis.overall_sentiment
            sentiment_dist[sentiment] = sentiment_dist.get(sentiment, 0) + 1
        
        # Confidence distribution
        high_confidence = sum(1 for a in analyses if a.rmt_mention_analysis.mention_confidence > 0.8)
        medium_confidence = sum(1 for a in analyses if 0.5 <= a.rmt_mention_analysis.mention_confidence <= 0.8)
        low_confidence = sum(1 for a in analyses if a.rmt_mention_analysis.mention_confidence < 0.5)
        
        # Top performers
        top_rmts = leaderboard[:5] if leaderboard else []
        
        return {
            "total_rmts_analyzed": len(leaderboard),
            "sentiment_distribution": sentiment_dist,
            "confidence_distribution": {
                "high_confidence": high_confidence,
                "medium_confidence": medium_confidence,
                "low_confidence": low_confidence
            },
            "authenticity_stats": {
                "authentic": sum(1 for a in analyses if a.review_classification.review_authenticity == "authentic"),
                "suspicious": sum(1 for a in analyses if a.review_classification.review_authenticity == "suspicious"),
                "unclear": sum(1 for a in analyses if a.review_classification.review_authenticity == "unclear")
            },
            "potential_false_positives": sum(1 for a in analyses if a.potential_false_positive),
            "top_performers": [{"profile_id": rmt.profile_id, "score": rmt.composite_reputation_score} for rmt in top_rmts]
        }

def main():
    """Main execution function"""
    if len(sys.argv) != 2:
        print("Usage: python gemini_review_analyzer.py <extraction_file.json>")
        sys.exit(1)
    
    # Configuration
    GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"  # Replace with your actual API key
    extraction_file = sys.argv[1]
    
    # Initialize the analyzer
    analyzer = GeminiReviewAnalyzer(api_key=GEMINI_API_KEY)
    
    try:
        # Process extractions
        results = analyzer.process_extractions(extraction_file)
        
        # Save results
        output_filename = f"rmt_analysis_results_{int(time.time())}.json"
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"\nAnalysis complete! Results saved to: {output_filename}")
        print(f"Successful analyses: {results['analysis_metadata']['successful_analyses']}")
        print(f"RMTs analyzed: {results['summary_statistics']['total_rmts_analyzed']}")
        
        # Print top performers
        print("\nTop 5 RMTs by reputation score:")
        for i, rmt in enumerate(results['summary_statistics']['top_performers'], 1):
            print(f"{i}. Profile {rmt['profile_id']}: {rmt['score']:.1f}/100")
            
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise

if __name__ == "__main__":
    main()
