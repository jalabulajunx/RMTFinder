# RMT Finder Web - Comprehensive Review Analysis System

## 📋 Table of Contents
- [Overview](#overview)
- [Motivation](#motivation)
- [Uniqueness & Market Context](#uniqueness-&-market-context)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Meta-Analysis Leaderboard (Gemini)](#meta-analysis-leaderboard-gemini)
- [Database Schema](#database-schema)
- [API Integration](#api-integration)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Project Status](#project-status)

## 🎯 Overview

RMT Finder Web is an intelligent system that automatically discovers Registered Massage Therapists (RMTs) from the College of Massage Therapists of Ontario (CMTO) database and analyzes their online reviews to provide comprehensive reputation insights.

---

## 🚀 Motivation

**Why RMT Finder Web?**

The reputation of Registered Massage Therapists (RMTs) is critical for both clients seeking quality care and for practitioners building their careers. However, online reviews are scattered, unstructured, and often mixed with business reviews, making it hard to get a true picture of an individual RMT's reputation.

This project aims to:
- Aggregate and analyze RMT reviews from multiple sources.
- Use AI to provide fair, nuanced, and multi-dimensional reputation scores.
- Empower clients to make informed choices and help RMTs understand their strengths and areas for growth.

**The Role of the CMTO API**

The College of Massage Therapists of Ontario (CMTO) provides a public API that allows programmatic access to its registry of all licensed RMTs in Ontario. This is rare among professional regulatory bodies and enables:
- Automated, up-to-date discovery of all practicing RMTs.
- Direct linkage between online reviews and official registry data.
- High accuracy in matching reviews to the correct professional.

Without the CMTO API, this level of automation and accuracy would not be possible.

---

## 🏆 Uniqueness & Market Context

**Uniqueness**

To our knowledge, there is currently no other open-source or commercial solution that provides comprehensive, AI-powered analysis of Registered Massage Therapist (RMT) reputations, directly linked to the official CMTO registry. Existing platforms (like RateMDs, Google Reviews, etc.) do not offer RMT-specific, multi-dimensional, or AI-driven insights, nor do they ensure accurate linkage to licensed professionals.

**Market Size and Industry Context**

- Ontario's RMT industry is the largest in Canada, generating **$2.0–2.1 billion in annual revenue** and representing **70% of the national market** ([Ontario RMT Market Analysis (Claude).md](Ontario%20RMT%20Market%20Analysis%20%28Claude%29.md)).
- There are over **13,000 Registered Massage Therapists (RMTs)** in Ontario alone, with 86% self-employed and 80% working part-time or seasonally.
- The sector has shown **remarkable resilience post-COVID**, with new registrations rebounding to 1,006 in 2023 and a 30% workforce increase from 2013–2023.
- **Demand is at an all-time high:** 44% of Canadians have tried massage therapy (up from 23% in 1997), and the profession is increasingly integrated into mainstream healthcare.
- **Business models are diverse:** 34% work in private offices, 34% in spas, 24% in franchises, with rapid growth in integrated healthcare, mobile/home-visit, and corporate wellness services.
- **Technology adoption is accelerating:** Practice management software, digital health integration, and telehealth are becoming standard, especially post-pandemic.
- **Average RMT income:** $62,715–$63,715 annually for employed practitioners, with higher potential for established self-employed RMTs. Toronto rates average $42.56/hour.
- **Insurance coverage:** Most extended health plans include massage therapy, with annual limits of $400–$1,000, giving RMTs a competitive edge over unregulated practitioners.

**Why Now? (Industry Trends & Drivers)**

- **Strong growth outlook:** Employment for Ontario RMTs is rated as "very good" through 2025, and the global massage therapy market is projected to reach $126.8B by 2035 (5.8% CAGR).
- **Digital transformation:** The profession is rapidly adopting digital tools for practice management, client engagement, and integration with broader healthcare systems.
- **Regulatory changes:** New accreditation requirements and evolving professional standards are reshaping the education and compliance landscape.
- **Workforce challenges:** The industry faces moderate risk of labour shortage, with education pipeline constraints and high self-employment rates requiring new business and tech skills.
- **Consumer demand shift:** 54% of clients now seek massage for health/wellness rather than luxury, strengthening the profession's healthcare positioning.

**Why This Project?**

The RMT profession's unique structure—high self-employment, part-time work, and dual healthcare/wellness positioning—creates both opportunities and challenges. There is a critical need for transparent, data-driven, and AI-powered reputation analysis to help clients find quality care and practitioners build successful, compliant businesses. No other solution offers this level of insight, accuracy, and integration with the official CMTO registry.

*Source: [Ontario RMT Market Analysis (Claude).md](Ontario%20RMT%20Market%20Analysis%20%28Claude%29.md)*

---

### What It Does
1. **Discovers RMTs** - Searches CMTO database for registered massage therapists
2. **Finds Reviews** - Locates and extracts reviews mentioning specific RMTs
3. **AI Analysis** - Uses Google Gemini AI to analyze sentiment and service quality
4. **Reputation Scoring** - Generates composite reputation scores
5. **Leaderboard** - Creates ranked lists of RMTs based on review analysis

### Current Project Status
- ✅ **CMTO API Integration** - Fully functional with pagination
- ✅ **Google Places API (New)** - Updated to latest API version with includedType targeting
- ✅ **Review Matching** - Fuzzy name matching with confidence scoring
- ✅ **AI Analysis** - Gemini AI integration for sentiment analysis
- ✅ **Database Schema** - Optimized with embedded reviews
- ✅ **Pagination Support** - Handles large result sets
- ✅ **Error Handling** - Comprehensive error recovery
- ✅ **Enhanced Place Search** - Uses includedType for better targeting
- 🔄 **Performance Optimization** - Ongoing improvements

## 🚀 Quick Start

### 1. Analyze Reviews with Gemini
```bash
python run_analysis_only.py --gemini-api-key="YOUR_GEMINI_API_KEY"
```
- This analyzes all unanalyzed reviews and stores the results in the database (`ai_analyses` table).

### 2. Run Meta-Analysis Leaderboard
```bash
python run_meta_leaderboard.py --gemini-api-key="YOUR_GEMINI_API_KEY"
```
- Aggregates all review analyses per RMT.
- Sends them to Gemini for meta-analysis and leaderboard synthesis.
- Stores the leaderboard in the `rmt_leaderboard` table and saves input/output JSON files.

## 🏆 Meta-Analysis Leaderboard (Gemini)

### What is it?
- The meta-analysis leaderboard uses Gemini to synthesize all per-review analyses for each RMT and generate a comprehensive, multi-dimensional leaderboard.
- Gemini is prompted with all review analyses and asked to score, rank, and summarize each RMT across multiple facets (sentiment, service quality, professionalism, authenticity, etc.).

### How it Works
1. **Per-review analysis:** Each review is analyzed by Gemini and stored in `ai_analyses`.
2. **Meta-analysis aggregation:** All review analyses for all RMTs are aggregated into a single JSON object.
3. **Gemini meta-analysis:** The aggregated JSON and a detailed prompt (with example output) are sent to Gemini, which returns a leaderboard with scores, ranks, and summaries for each RMT.
4. **Storage:**
   - The leaderboard is stored in the `rmt_leaderboard` table (per RMT, per run).
   - The full input and output JSON for each meta-analysis run are stored in `meta_leaderboard_runs`.
   - Input/output JSON files are also saved to disk for audit and reproducibility.

### Example Output JSON
```json
{
  "leaderboard": [
    {
      "profile_id": "123",
      "name": "Jane Doe",
      "scores": {
        "sentiment": 92,
        "service_quality": 88,
        "communication": 85,
        "professionalism": 90,
        "authenticity": 95,
        "recommendation_rate": 80,
        "repeat_client_rate": 70,
        "composite": 90
      },
      "rank": 1,
      "summary": "Jane Doe is highly rated for professionalism and authenticity, with strong client recommendations."
    },
    ...
  ]
}
```

### How to Use
1. **Run per-review analysis:**
   ```bash
   python run_analysis_only.py --gemini-api-key="YOUR_GEMINI_API_KEY"
   ```
2. **Run meta-analysis leaderboard:**
   ```bash
   python run_meta_leaderboard.py --gemini-api-key="YOUR_GEMINI_API_KEY"
   ```
3. **View leaderboard:**
   - Query the `rmt_leaderboard` table for the latest leaderboard stats per RMT.
   - Open the output JSON file created by the meta-analysis script.

### Database Tables
- **`rmt_leaderboard`**: Stores per-RMT leaderboard stats for each meta-analysis run.
- **`meta_leaderboard_runs`**: Stores the full input/output JSON for each meta-analysis run (for audit/history).

#### Table Schemas
```sql
CREATE TABLE IF NOT EXISTS rmt_leaderboard (
    profile_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    meta_leaderboard_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    PRIMARY KEY (profile_id, run_id),
    FOREIGN KEY (profile_id) REFERENCES rmt_profiles(profile_id)
);

CREATE TABLE IF NOT EXISTS meta_leaderboard_runs (
    run_id TEXT PRIMARY KEY,
    input_json TEXT NOT NULL,
    output_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);
```

## 🏗️ Architecture

### Core Components

```
RMT Finder Web/
├── rmt_review_extractor.py      # CMTO API integration & review extraction
├── incremental_rmt_system.py    # Main orchestrator & database management
├── gemini_review_analyzer.py    # AI analysis using Google Gemini
├── run_analysis_only.py         # Standalone per-review Gemini analysis
├── run_meta_leaderboard.py      # Meta-analysis leaderboard synthesis (Gemini)
├── rmt_monitoring.db           # SQLite database
├── test_*.py                    # Test and validation scripts
├── debug_*.py                   # Debug utilities
└── rmt_export_*/               # Export directories with results
```

### Data Flow
1. **CMTO Search** → Find RMT profiles by location/keyword
2. **Google Places** → Find businesses where RMTs practice
3. **Review Extraction** → Extract and match reviews to RMTs
4. **AI Analysis** → Analyze sentiment and service quality
5. **Database Storage** → Store results with timestamps
6. **Leaderboard Generation** → Create reputation rankings

## ✨ Features

### 🔍 Intelligent RMT Discovery
- **CMTO API Integration** - Direct access to official RMT registry
- **Location-based Search** - Find RMTs by city, region, or practice area
- **Pagination Support** - Handles large result sets efficiently (10 results per page)
- **Duplicate Prevention** - Smart deduplication of RMT profiles
- **Cache Busting** - Timestamp parameters for fresh results

### 📝 Advanced Review Matching
- **Fuzzy Name Matching** - Handles name variations and typos using Levenshtein distance
- **Location Context** - Matches RMTs to their practice locations
- **Confidence Scoring** - Quantifies match accuracy (0-100%)
- **Multi-source Reviews** - Aggregates reviews from multiple platforms
- **Review Deduplication** - Prevents duplicate reviews using hash-based IDs

### 🤖 AI-Powered Analysis
- **Sentiment Analysis** - Positive/negative review classification
- **Service Quality Metrics** - Technical skills, communication, professionalism (1-10 scale)
- **Review Authenticity** - Detects potential fake reviews
- **False Positive Detection** - Identifies incorrect RMT mentions
- **Confidence Scoring** - AI analysis confidence levels

### 📊 Comprehensive Reporting
- **Reputation Scoring** - Composite scores based on multiple factors
- **Leaderboard Rankings** - Sortable by various metrics
- **Historical Tracking** - Monitor reputation changes over time
- **Export Capabilities** - JSON exports for further analysis
- **Run Statistics** - Detailed processing metrics

## 📋 Prerequisites

### Required APIs
1. **Google Places API (New)** - For business and review discovery
   - Cost: ~$0.017 per 1000 requests
   - Quota: 100,000 requests/day (free tier)
2. **Google Gemini AI API** - For review analysis
   - Cost: ~$0.0005 per 1K characters
   - Quota: 15 requests/minute (free tier)

### System Requirements
- Python 3.8+
- 4GB+ RAM (for large datasets)
- Stable internet connection
- SQLite support
- ~500MB disk space per 1000 RMTs

### Python Dependencies
```
requests>=2.25.0
fuzzywuzzy>=0.18.0
python-levenshtein>=0.12.0
googlemaps>=4.0.0
urllib3>=1.26.0
```

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd RMT\ Finder\ Web/tools
```

### 2. Install Dependencies
```bash
pip install requests fuzzywuzzy python-levenshtein googlemaps urllib3
```

### 3. Set Up API Keys
Create a `.env` file or set environment variables:
```bash
export GOOGLE_PLACES_API_KEY="your_google_places_api_key"
export GEMINI_API_KEY="your_gemini_api_key"
```

### 4. Initialize Database
The database will be automatically created on first run.

## ⚙️ Configuration

### API Key Setup

#### Google Places API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Places API (New)** (not the legacy Places API)
4. Create API key with appropriate restrictions
5. Set billing account (required for Places API)
6. **Important**: Use the new API endpoints, not legacy ones

#### Google Gemini AI
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Note the key for configuration

### Search Configuration
Modify search parameters in `incremental_rmt_system.py`:
```python
self.max_rmts_per_keyword = 50  # Max RMTs per search term
self.incremental_lookback_days = 30  # Days to look back for updates
self.min_confidence_score = 70  # Minimum confidence for review matching
```

## 🎮 Usage

### Basic Workflow
1. **Extract reviews and profiles** (if not already done)
2. **Analyze reviews with Gemini**
   ```bash
   python run_analysis_only.py --gemini-api-key="YOUR_GEMINI_API_KEY"
   ```
3. **Run meta-analysis leaderboard**
   ```bash
   python run_meta_leaderboard.py --gemini-api-key="YOUR_GEMINI_API_KEY"
   ```
4. **View/export leaderboard**
   - Query `rmt_leaderboard` or open the output JSON file.

## 🗄️ Database Schema

### Core Tables

#### `rmt_profiles`
Stores RMT information with embedded reviews:
```sql
CREATE TABLE rmt_profiles (
    profile_id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    registration_status TEXT,
    authorized_to_practice BOOLEAN,
    practice_locations TEXT,  -- JSON array
    reviews_data TEXT,        -- JSON array of all reviews
    total_reviews INTEGER,
    last_review_date TEXT,
    first_seen_run_id TEXT,
    last_updated_run_id TEXT,
    last_updated_at TIMESTAMP
);
```

#### `ai_analyses`
Stores AI analysis results:
```sql
CREATE TABLE ai_analyses (
    analysis_id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    review_hash TEXT NOT NULL,
    sentiment_overall TEXT,
    sentiment_confidence REAL,
    technical_skill_rating INTEGER,
    communication_rating INTEGER,
    professionalism_rating INTEGER,
    review_authenticity TEXT,
    potential_false_positive BOOLEAN,
    overall_analysis_confidence REAL,
    analysis_json TEXT,
    analyzed_at TIMESTAMP
);
```

#### `monitoring_runs`
Tracks analysis execution:
```sql
CREATE TABLE monitoring_runs (
    run_id TEXT PRIMARY KEY,
    run_type TEXT NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    search_keywords TEXT,
    rmts_processed INTEGER,
    reviews_extracted INTEGER,
    reviews_analyzed INTEGER,
    status TEXT,
    error_message TEXT
);
```

### Review Data Structure
Each review in `reviews_data` JSON array:
```json
{
  "review_hash": "abc123...",
  "extraction_id": "profile_id_place_id_hash",
  "place_id": "ChIJ...",
  "place_name": "Wellness Clinic",
  "review_text": "Great massage therapy...",
  "review_rating": 5,
  "review_author": "John D.",
  "review_timestamp": 1234567890,
  "review_time_description": "2 years ago",
  "matched_text_segments": ["Dr. Smith", "massage"],
  "confidence_scores": [95, 88],
  "max_confidence": 95,
  "extracted_at": "2025-06-25T21:30:00",
  "extraction_run_id": "full_1234567890"
}
```

## 🔌 API Integration

### CMTO API
- **Base URL**: `https://cmto.ca.thentiacloud.net`
- **Search Endpoint**: `/rest/public/profile/search/`
- **Profile Endpoint**: `/rest/public/profile/get/`
- **Authentication**: None required (public API)
- **Rate Limiting**: Built-in delays to respect API limits
- **Pagination**: 10 results per request, automatic handling
- **Cache Busting**: `_` timestamp parameter required

### Google Places API (New)
- **Text Search**: `https://places.googleapis.com/v1/places:searchText`
- **Place Details**: `https://places.googleapis.com/v1/places/{place_id}`
- **Authentication**: API key in `X-Goog-Api-Key` header
- **Field Masks**: Optimized for cost and performance
- **Method**: POST requests with JSON payload
- **Headers**: `Content-Type: application/json`

### Google Gemini AI
- **Model**: `gemini-1.5-flash`
- **Analysis**: Sentiment, quality metrics, authenticity
- **Rate Limiting**: Configurable delays between requests
- **Input Format**: Structured JSON with review data
- **Output Format**: Structured analysis results

## 🔧 Troubleshooting

### Common Issues

#### CMTO API Connection Errors
```bash
# Test CMTO connectivity
python rmt_review_extractor.py --test-cmto
```
**Solutions:**
- Check internet connection
- Verify SSL certificates (disabled in test mode)
- Ensure proper User-Agent headers
- Check if CMTO website is accessible

#### Google Places API Errors
```
REQUEST_DENIED (You're calling a legacy API...)
```
**Solutions:**
- Enable Places API (New) in Google Cloud Console
- Update API key restrictions
- Verify billing is enabled
- Use new API endpoints, not legacy ones

#### Database Constraint Errors
```
UNIQUE constraint failed: review_extractions.extraction_id
```
**Solutions:**
- Review extraction_id generation logic
- Check for duplicate reviews
- Verify review hash uniqueness
- Database uses hash-based IDs for uniqueness

#### Pagination Issues
```
Reached end of available results (got 10 results, expected 20)
```
**Solutions:**
- CMTO API returns max 10 results per request
- Pagination automatically handles this
- Check `take` parameter in search logic
- This is normal behavior, not an error

#### Zero Results from CMTO
```
No results found for keyword: Stouffville
```
**Solutions:**
- Add cache-busting `_` parameter
- Check keyword spelling
- Try different search terms
- Verify API response format

### Debug Mode
Enable detailed logging:
```python
# In rmt_review_extractor.py
logging.basicConfig(level=logging.DEBUG)
```

### Performance Optimization
- **Batch Processing**: Process RMTs in smaller batches
- **Rate Limiting**: Respect API rate limits
- **Database Indexing**: Automatic index creation for performance
- **Memory Management**: Large datasets may require more RAM
- **API Quota Management**: Monitor usage to avoid overages

### Error Recovery
- **Automatic Retries**: Failed requests are retried
- **Graceful Degradation**: System continues with partial results
- **Error Logging**: All errors are logged for debugging
- **State Persistence**: Progress is saved between runs

## 🛠️ Development

### Project Structure
```
tools/
├── rmt_review_extractor.py      # Core extraction logic
├── incremental_rmt_system.py    # Main application
├── gemini_review_analyzer.py    # AI analysis
├── run_analysis_only.py         # Standalone per-review Gemini analysis
├── run_meta_leaderboard.py      # Meta-analysis leaderboard synthesis (Gemini)
├── rmt_monitoring.db           # SQLite database
├── test_*.py                    # Test scripts
├── debug_*.py                   # Debug utilities
└── rmt_export_*/               # Export directories
```

### Adding New Features

#### Custom Search Keywords
Modify the keywords list in main execution:
```python
search_keywords = [
    "Toronto massage therapy",
    "Mississauga RMT", 
    "Vaughan wellness",
    "Markham physiotherapy"
]
```

#### Custom Analysis Metrics
Extend `ComprehensiveRMTAnalysis` in `gemini_review_analyzer.py`:
```python
@dataclass
class CustomMetrics:
    accessibility_rating: int = Field(description="Accessibility score 1-10")
    parking_availability: str = Field(description="Parking availability")
```

#### Database Schema Changes
1. Modify `init_database()` method
2. Update related save/query methods
3. Test with existing data
4. Consider migration scripts for existing databases

### Testing
```bash
# Test CMTO API
python test_pagination.py

# Test Google Places API
python test_stouffville_search.py

# Test full system
python incremental_rmt_system.py --mode=test

# Debug CMTO search
python debug_cmto_search.py
```

### Contributing
1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

## 📈 Performance Metrics

### Typical Performance
- **RMT Discovery**: ~50 RMTs/minute
- **Review Extraction**: ~100 reviews/minute
- **AI Analysis**: ~20 reviews/minute
- **Database Operations**: ~1000 operations/minute

### Scalability Considerations
- **Memory Usage**: ~100MB per 1000 RMTs
- **Database Size**: ~10MB per 1000 reviews
- **API Quotas**: Monitor Google API usage
- **Processing Time**: ~2-3 hours for 1000 RMTs

### Cost Estimation
- **Google Places API**: ~$0.017 per 1000 requests
- **Google Gemini AI**: ~$0.0005 per 1K characters
- **Typical Run**: ~$5-10 for 1000 RMTs

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section
2. Review debug logs
3. Test individual components
4. Create detailed issue reports

### Getting Help
- **Check Logs**: Look for error messages in console output
- **Test Components**: Use individual test scripts
- **Verify API Keys**: Ensure keys are valid and have proper permissions
- **Check Quotas**: Monitor API usage limits

---

**RMT Finder Web** - Intelligent RMT reputation analysis powered by AI 

## 🎯 Enhanced Place Search

### Improved Business Discovery

The system now uses Google Places API's `includedType` parameter for more targeted and relevant business discovery:

#### Health & Wellness Types Used
- `massage` - Massage therapy clinics
- `physiotherapist` - Physiotherapy clinics  
- `wellness_center` - Wellness centers
- `spa` - Spas (often have massage services)
- `chiropractor` - Chiropractic clinics
- `dental_clinic` - Dental clinics (some offer massage)
- `doctor` - Medical clinics
- `hospital` - Hospitals (may have massage therapy)
- `medical_lab` - Medical facilities
- `skin_care_clinic` - Skin care clinics
- `sauna` - Saunas (wellness facilities)
- `yoga_studio` - Yoga studios (wellness focus)

#### Benefits
- **Higher Relevance** - Only returns health and wellness businesses
- **Better Coverage** - Comprehensive search across relevant business types
- **Reduced Noise** - Avoids irrelevant businesses (restaurants, retail, etc.)
- **Fallback Support** - Uses keyword search if includedType returns too few results
- **Search Tracking** - Tracks which search method found each place for analysis

#### Testing the Improvements
```bash
# Test the enhanced search functionality
python test_improved_search.py
```

This will test the improved search method across multiple locations and show:
- Number of places found per location
- Search methods used (includedType vs keyword fallback)
- Place types discovered
- Sample results with ratings and search method tracking 