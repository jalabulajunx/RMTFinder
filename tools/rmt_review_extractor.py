#!/usr/bin/env python3
"""
RMT Review Data Extractor

This script extracts reviews that mention RMTs by matching names and business locations
using fuzzy matching, regex, and other techniques. The output JSON is designed to be
processed by Google Gemini AI for semantic analysis.

Requirements:
    pip install requests fuzzywuzzy python-levenshtein googlemaps

Usage:
    python rmt_review_extractor.py
"""

import requests
import json
import time
import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from fuzzywuzzy import fuzz, process
import googlemaps
from urllib.parse import quote
import logging
import urllib3
import hashlib

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class RMTData:
    """Data structure for RMT information from CMTO API"""
    profile_id: str
    first_name: str
    last_name: str
    common_first_name: str
    common_last_name: str
    practice_locations: List[Dict[str, Any]]
    cmto_endpoint: str
    registration_status: str
    authorized_to_practice: bool

@dataclass
class ReviewExtraction:
    """Data structure for extracted review data"""
    extraction_id: str
    rmt_data: Dict[str, Any]  # Serialized RMTData
    matched_text_segments: List[str]
    confidence_scores: List[int]
    review_data: Dict[str, Any]
    place_data: Dict[str, Any]
    extraction_metadata: Dict[str, Any]

class RMTReviewExtractor:
    def __init__(self, google_api_key: str, cmto_base_url: str = "https://cmto.ca.thentiacloud.net",
                 max_results_per_type: int = 50, min_places_before_fallback: int = 10, 
                 max_total_places: int = 200, api_delay: float = 0.5):
        """
        Initialize the RMT Review Extractor
        
        Args:
            google_api_key: Google Places API key
            cmto_base_url: Base URL for CMTO API
            max_results_per_type: Maximum results to fetch per place type (default: 50)
            min_places_before_fallback: Minimum places before triggering fallback (default: 10)
            max_total_places: Maximum total places to return (default: 200)
            api_delay: Delay between API calls in seconds (default: 0.5)
        """
        self.google_api_key = google_api_key
        self.cmto_base_url = cmto_base_url
        self.gmaps = googlemaps.Client(key=google_api_key)
        
        # Configure session with SSL handling (matching original Android app)
        self.session = requests.Session()
        
        # Disable SSL verification for CMTO API (matches original Android app behavior)
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        self.session.verify = False
        
        # Set headers to match original app
        self.session.headers.update({
            'User-Agent': 'RMT-Finder-Python/1.0',
            'Accept': 'application/json',
            'Connection': 'keep-alive'
        })
        
        # Matching configuration
        self.fuzzy_threshold = 70  # Lower threshold for initial extraction
        self.name_confidence_threshold = 75
        self.location_confidence_threshold = 60
        
        # Rate limiting - increased delay for better API compliance
        self.request_delay = api_delay
        
        # Place search configuration
        self.max_results_per_type = max_results_per_type
        self.min_places_before_fallback = min_places_before_fallback
        self.max_total_places = max_total_places
        
    def get_cmto_profile(self, profile_id: str) -> Optional[RMTData]:
        """Fetch RMT profile data from CMTO API"""
        try:
            url = f"{self.cmto_base_url}/rest/public/profile/get/"
            params = {'id': profile_id}
            
            logger.debug(f"Fetching CMTO profile: {profile_id}")
            response = self.session.get(url, params=params, timeout=30)
            
            # Check if response is successful
            if response.status_code != 200:
                logger.error(f"CMTO API returned status {response.status_code} for profile {profile_id}")
                logger.error(f"Response content: {response.text[:500]}")
                return None
            
            # Check if response is JSON
            try:
                data = response.json()
            except ValueError as e:
                logger.error(f"Invalid JSON response for profile {profile_id}: {e}")
                logger.error(f"Response content: {response.text[:500]}")
                return None
            
            # Check if profile data exists
            if not data or 'firstName' not in data:
                logger.warning(f"Empty or invalid profile data for {profile_id}")
                return None
            
            # Extract practice locations
            practice_locations = []
            location_fields = ['primaryPlacesOfPractice', 'placesOfPractice', 'currentPlacesOfPractice']
            for field in location_fields:
                if data.get(field):
                    if isinstance(data[field], list):
                        practice_locations.extend(data[field])
                    else:
                        practice_locations.append(data[field])
            
            # Remove duplicates
            unique_locations = []
            seen = set()
            for loc in practice_locations:
                if not isinstance(loc, dict):
                    continue
                key = (loc.get('employerName', ''), loc.get('businessAddress', ''))
                if key not in seen:
                    seen.add(key)
                    unique_locations.append(loc)
            
            return RMTData(
                profile_id=profile_id,
                first_name=data.get('firstName', ''),
                last_name=data.get('lastName', ''),
                common_first_name=data.get('commonFirstName', '') or data.get('firstName', ''),
                common_last_name=data.get('commonLastName', '') or data.get('lastName', ''),
                practice_locations=unique_locations,
                cmto_endpoint=url,
                registration_status=data.get('registrationStatus', ''),
                authorized_to_practice=str(data.get('authorizedToPractice', '')).lower() in ['1', 'true', 'yes', 'active']
            )
            
        except requests.exceptions.SSLError as e:
            logger.error(f"SSL error fetching CMTO profile {profile_id}: {e}")
            logger.error("Try running with SSL verification disabled")
            return None
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error fetching CMTO profile {profile_id}: {e}")
            return None
        except requests.exceptions.Timeout as e:
            logger.error(f"Timeout fetching CMTO profile {profile_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching CMTO profile {profile_id}: {e}")
            return None
    
    def search_cmto_profiles(self, keyword: str, limit: int = 50, get_all_pages: bool = True) -> List[RMTData]:
        """
        Search for RMT profiles using CMTO search API with full pagination
        
        Args:
            keyword: Search keyword
            limit: Maximum profiles to return (0 = no limit)
            get_all_pages: If True, retrieves ALL available results regardless of limit
        """
        profiles = []
        skip = 0
        take = 10  # CMTO API maximum per request (confirmed by testing)
        total_available = None
        
        logger.info(f"Starting CMTO search for '{keyword}' (limit: {limit if limit > 0 else 'unlimited'})")
        
        try:
            while True:
                # API Call 1: Search API
                url = f"{self.cmto_base_url}/rest/public/profile/search/"
                params = {
                    'keyword': keyword,
                    'skip': skip,
                    'take': 10,  # Match browser behavior
                    'authorizedToPractice': 0,  # Include all RMTs
                    'acupunctureAuthorized': 0,  # Include all
                    'gender': 'all',
                    'registrationStatus': 'all',
                    'city': 'all',
                    'language': 'all',
                    'sortOrder': 'asc',
                    'sortField': 'lastname',
                    '_': str(int(time.time() * 1000)),  # Add timestamp param to match browser
                }
                
                logger.info(f"Fetching page: skip={skip}, take={take}")
                response = self.session.get(url, params=params, timeout=30)
                
                # Check response status
                if response.status_code != 200:
                    logger.error(f"CMTO search API returned status {response.status_code}")
                    logger.error(f"URL: {response.url}")
                    logger.error(f"Response: {response.text[:500]}")
                    continue  # Skip to next iteration
                
                # Parse JSON response
                try:
                    data = response.json()
                except ValueError as e:
                    logger.error(f"Invalid JSON response from CMTO search API: {e}")
                    logger.error(f"Response content: {response.text[:500]}")
                    continue  # Skip to next iteration
                
                # Debug logging to see response structure
                logger.debug(f"API Response keys: {list(data.keys())}")
                logger.debug(f"resultCount: {data.get('resultCount')}")
                logger.debug(f"result array length: {len(data.get('result', []))}")
                
                results = data.get('result', [])
                
                # Log total available on first page
                if total_available is None:
                    total_available = data.get('resultCount', len(results))
                    logger.info(f"Total RMTs available for '{keyword}': {total_available}")
                
                if not results:
                    logger.warning(f"No results in response despite total count of {total_available}")
                    logger.warning(f"Response keys: {list(data.keys())}")
                    logger.warning(f"First few characters of response: {response.text[:200]}")
                    logger.info("No more results available")
                    break
                
                logger.info(f"Retrieved {len(results)} profiles from search API")
                
                # API Call 2: Profile Details API for each result
                page_profiles = []
                for i, result in enumerate(results, 1):
                    # Check limit before processing
                    if limit > 0 and len(profiles) >= limit:
                        logger.info(f"Reached limit of {limit} profiles")
                        break
                    
                    profile_id = result.get('profileId')
                    if not profile_id:
                        logger.warning(f"No profileId found in result {i}")
                        continue
                    
                    logger.debug(f"Fetching detailed profile {i}/{len(results)}: {profile_id}")
                    
                    profile_data = self.get_cmto_profile(profile_id)
                    if profile_data:
                        page_profiles.append(profile_data)
                        logger.debug(f"Successfully retrieved: {profile_data.first_name} {profile_data.last_name}")
                    else:
                        logger.warning(f"Failed to retrieve profile details for {profile_id}")
                    
                    time.sleep(self.request_delay)  # Rate limiting
                
                profiles.extend(page_profiles)
                logger.info(f"Page complete: {len(page_profiles)} profiles added (total: {len(profiles)})")
                
                # Pagination logic
                skip += take
                
                # Debug logging for pagination
                logger.debug(f"Pagination: results={len(results)}, take={take}, total_available={total_available}, skip={skip}, profiles_so_far={len(profiles)}")
                logger.debug(f"Pagination conditions: len(results) < take = {len(results) < take}, limit check = {limit > 0 and len(profiles) >= limit}, get_all_pages = {get_all_pages}")
                logger.debug(f"Exact comparison: {len(results)} < {take} = {len(results) < take}")
                
                # Stop conditions
                if len(results) < take:
                    logger.info(f"Reached end of available results (got {len(results)} results, expected {take})")
                    break
                    
                if limit > 0 and len(profiles) >= limit:
                    logger.info(f"Reached specified limit of {limit} profiles")
                    break
                
                if not get_all_pages:
                    logger.info("Single page requested, stopping")
                    break
                    
        except requests.exceptions.SSLError as e:
            logger.error(f"SSL error searching CMTO profiles for '{keyword}': {e}")
            logger.error("💡 Try running: python rmt_review_extractor.py --test-cmto")
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error searching CMTO profiles for '{keyword}': {e}")
            logger.error("💡 Check internet connection and try: python rmt_review_extractor.py --test-cmto")
        except Exception as e:
            logger.error(f"Failed to search CMTO profiles for '{keyword}': {e}")
            logger.error(f"Retrieved {len(profiles)} profiles before error")
        
        logger.info(f"CMTO search complete: {len(profiles)} total profiles retrieved for '{keyword}'")
        return profiles
    
    def find_nearby_places(self, location: str, radius: int = 10000) -> List[Dict[str, Any]]:
        """Find massage therapy related places near a location using the new Google Places API Text Search (New)"""
        try:
            # Define specific Health and Wellness types for better targeting
            health_wellness_types = [
                'massage',           # Massage therapy clinics
                'physiotherapist',   # Physiotherapy clinics
                'wellness_center',   # Wellness centers
                'spa',              # Spas (often have massage services)
                'chiropractor',     # Chiropractic clinics
                'dental_clinic',    # Dental clinics (some offer massage)
                'doctor',           # Medical clinics
                'hospital',         # Hospitals (may have massage therapy)
                'medical_lab',      # Medical facilities
                'skin_care_clinic', # Skin care clinics
                'sauna',            # Saunas (wellness facilities)
                'yoga_studio'       # Yoga studios (wellness focus)
            ]
            
            places = []
            api_key = self.google_api_key
            
            # Primary search: Use includedType for targeted results
            for place_type in health_wellness_types:
                try:
                    # Use the new Text Search (New) API endpoint with includedType
                    url = "https://places.googleapis.com/v1/places:searchText"
                    
                    # Request body for the new API with includedType parameter
                    request_body = {
                        "textQuery": f"near {location}, Ontario",
                        "includedType": place_type,
                        "maxResultCount": self.max_results_per_type,
                        "rankPreference": "RANK_PREFERENCE_UNSPECIFIED"
                    }
                    
                    # Headers for the new API
                    headers = {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': api_key,
                        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.websiteUri,places.id'
                    }
                    
                    logger.debug(f"Searching for {place_type} near {location}")
                    response = requests.post(url, json=request_body, headers=headers, timeout=30)
                    data = response.json()
                    
                    if 'places' in data and data['places']:
                        logger.debug(f"Found {len(data['places'])} {place_type} places")
                        # Convert new API response format to match expected format
                        for place in data['places']:
                            # Convert to the format expected by the rest of the code
                            converted_place = {
                                'place_id': place.get('id', ''),
                                'name': place.get('displayName', {}).get('text', ''),
                                'formatted_address': place.get('formattedAddress', ''),
                                'rating': place.get('rating', 0),
                                'user_ratings_total': place.get('userRatingCount', 0),
                                'types': place.get('types', []),
                                'website': place.get('websiteUri', ''),
                                'search_type': place_type  # Track which type found this place
                            }
                            places.append(converted_place)
                    else:
                        error_msg = data.get('error', {}).get('message', 'Unknown error') if 'error' in data else 'No results'
                        logger.debug(f"No results for {place_type} near {location}: {error_msg}")
                    
                    time.sleep(self.request_delay)
                    
                except Exception as e:
                    logger.warning(f"Failed to search for {place_type} near {location}: {e}")
                    continue
            
            # Remove duplicates based on place_id
            unique_places = []
            seen_ids = set()
            for place in places:
                place_id = place.get('place_id')
                if place_id and place_id not in seen_ids:
                    seen_ids.add(place_id)
                    unique_places.append(place)
            
            # Fallback: If we found very few places, try keyword-based search
            if len(unique_places) < self.min_places_before_fallback:
                logger.info(f"Only found {len(unique_places)} places with includedType, trying keyword fallback")
                fallback_places = self._find_nearby_places_keyword_fallback(location, api_key)
                
                # Add fallback places that aren't duplicates
                for place in fallback_places:
                    place_id = place.get('place_id')
                    if place_id and place_id not in seen_ids:
                        seen_ids.add(place_id)
                        place['search_type'] = 'keyword_fallback'
                        unique_places.append(place)
                        
                        # Prevent excessive results
                        if len(unique_places) >= self.max_total_places:
                            logger.info(f"Reached maximum places limit ({self.max_total_places}), stopping fallback")
                            break
            
            # Limit total results if we have too many
            if len(unique_places) > self.max_total_places:
                logger.info(f"Limiting results from {len(unique_places)} to {self.max_total_places} places")
                unique_places = unique_places[:self.max_total_places]
            
            logger.info(f"Found {len(unique_places)} unique health and wellness places near {location}")
            return unique_places
            
        except Exception as e:
            logger.error(f"Failed to find places near {location}: {e}")
            return []
    
    def _find_nearby_places_keyword_fallback(self, location: str, api_key: str) -> List[Dict[str, Any]]:
        """Fallback method using keyword-based search for broader coverage"""
        try:
            # Keywords that might catch places not covered by includedType
            fallback_keywords = [
                'massage therapy', 'massage clinic', 'physiotherapy clinic',
                'rehabilitation clinic', 'health clinic', 'registered massage therapist',
                'osteopathy', 'acupuncture clinic', 'wellness clinic',
                'therapeutic massage', 'sports massage', 'deep tissue massage'
            ]
            
            places = []
            
            for keyword in fallback_keywords:
                try:
                    # Build the query string as 'keyword near location, Ontario'
                    search_query = f"{keyword} near {location}, Ontario"
                    
                    # Use the new Text Search (New) API endpoint
                    url = "https://places.googleapis.com/v1/places:searchText"
                    
                    # Request body for the new API
                    request_body = {
                        "textQuery": search_query,
                        "maxResultCount": 20,  # Higher for fallback since we need more results
                        "rankPreference": "RANK_PREFERENCE_UNSPECIFIED"
                    }
                    
                    # Headers for the new API
                    headers = {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': api_key,
                        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.websiteUri,places.id'
                    }
                    
                    logger.debug(f"Fallback search for '{keyword}' near {location}")
                    response = requests.post(url, json=request_body, headers=headers, timeout=30)
                    data = response.json()
                    
                    if 'places' in data and data['places']:
                        logger.debug(f"Fallback found {len(data['places'])} places for '{keyword}'")
                        # Convert new API response format to match expected format
                        for place in data['places']:
                            # Convert to the format expected by the rest of the code
                            converted_place = {
                                'place_id': place.get('id', ''),
                                'name': place.get('displayName', {}).get('text', ''),
                                'formatted_address': place.get('formattedAddress', ''),
                                'rating': place.get('rating', 0),
                                'user_ratings_total': place.get('userRatingCount', 0),
                                'types': place.get('types', []),
                                'website': place.get('websiteUri', '')
                            }
                            places.append(converted_place)
                    
                    time.sleep(self.request_delay)
                    
                except Exception as e:
                    logger.debug(f"Fallback search failed for '{keyword}' near {location}: {e}")
                    continue
            
            return places
            
        except Exception as e:
            logger.error(f"Fallback search failed for {location}: {e}")
            return []
    
    def get_place_reviews(self, place_id: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Get reviews and place details for a specific place using the new Google Places API (New)"""
        try:
            import requests
            
            # Use the new Places API (New) endpoint
            url = f"https://places.googleapis.com/v1/places/{place_id}"
            
            # Headers for the new API
            headers = {
                'X-Goog-Api-Key': self.google_api_key,
                'X-Goog-FieldMask': 'displayName,formattedAddress,rating,userRatingCount,types,websiteUri,reviews'
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            data = response.json()
            
            # Add delay for rate limiting
            time.sleep(self.request_delay)
            
            if 'error' in data:
                logger.error(f"Error getting place details for {place_id}: {data['error']}")
                return [], {}
            
            # Extract reviews from the new API response format
            reviews = []
            if 'reviews' in data:
                for review in data['reviews']:
                    converted_review = {
                        'text': review.get('text', {}).get('text', ''),
                        'rating': review.get('rating', 0),
                        'time': review.get('relativePublishTimeDescription', ''),
                        'author_name': review.get('authorAttribution', {}).get('displayName', ''),
                        'relative_time_description': review.get('relativePublishTimeDescription', '')
                    }
                    reviews.append(converted_review)
            
            # Clean place data
            place_info = {
                'place_id': place_id,
                'name': data.get('displayName', {}).get('text', ''),
                'address': data.get('formattedAddress', ''),
                'rating': data.get('rating', 0),
                'user_ratings_total': data.get('userRatingCount', 0),
                'types': data.get('types', []),
                'website': data.get('websiteUri', '')
            }
            
            return reviews, place_info
            
        except Exception as e:
            logger.error(f"Failed to get reviews for place {place_id}: {e}")
            return [], {}
    
    def generate_name_variations(self, rmt_data: RMTData) -> List[str]:
        """Generate comprehensive name variations for matching"""
        variations = []
        
        # Get all name components
        first_names = [rmt_data.first_name, rmt_data.common_first_name]
        last_names = [rmt_data.last_name, rmt_data.common_last_name]
        
        # Remove empty strings and duplicates
        first_names = list(set(filter(None, first_names)))
        last_names = list(set(filter(None, last_names)))
        
        # Generate combinations
        for first in first_names:
            for last in last_names:
                # Full name variations
                variations.extend([
                    f"{first} {last}",
                    f"{last}, {first}",
                    f"{last} {first}",
                    f"Dr. {first} {last}",
                    f"Dr {first} {last}",
                    f"{first} {last}, RMT",
                    f"{first} {last} RMT",
                ])
                
                # Initial variations
                if first and last:
                    variations.extend([
                        f"{first[0]}. {last}",
                        f"{first} {last[0]}.",
                        f"{first[0]} {last}",
                        f"{first} {last[0]}",
                    ])
                
                # Individual names
                variations.extend([first, last])
        
        # Remove None and duplicates, filter short names
        variations = list(set(filter(lambda x: x and len(x) >= 2, variations)))
        
        return variations
    
    def generate_location_variations(self, practice_locations: List[Dict[str, Any]]) -> List[str]:
        """Generate location variations for business name matching"""
        variations = []
        
        for location in practice_locations:
            # Business name variations
            employer_name = location.get('employerName', '')
            if employer_name:
                variations.extend([
                    employer_name,
                    employer_name.replace(' Clinic', ''),
                    employer_name.replace(' Centre', ''),
                    employer_name.replace(' Center', ''),
                    employer_name.replace(' Health', ''),
                    employer_name.replace(' Wellness', ''),
                ])
            
            # Address components
            city = location.get('businessCity', '') or location.get('city', '')
            address = location.get('businessAddress', '')
            
            if city:
                variations.append(city)
            if address:
                # Extract street name
                street_match = re.search(r'(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd))', address, re.IGNORECASE)
                if street_match:
                    variations.append(street_match.group(1))
        
        return list(set(filter(None, variations)))
    
    def find_text_matches(self, text: str, search_terms: List[str], match_type: str = "name") -> List[Tuple[str, int, str]]:
        """
        Find matches in text using multiple techniques
        
        Returns:
            List of (matched_term, confidence_score, matched_text_segment)
        """
        if not text or not search_terms:
            return []
        
        matches = []
        clean_text = re.sub(r'[^\w\s]', ' ', text.lower())
        words = clean_text.split()
        
        for search_term in search_terms:
            term_lower = search_term.lower()
            
            # Method 1: Exact substring match (highest confidence)
            if term_lower in clean_text:
                # Find the actual matched segment in original text
                pattern = re.escape(search_term).replace(r'\ ', r'\s+')
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    matches.append((search_term, 95, match.group()))
                continue
            
            # Method 2: Word boundary matching
            pattern = r'\b' + re.escape(term_lower).replace(r'\ ', r'\s+') + r'\b'
            if re.search(pattern, clean_text):
                match = re.search(pattern.replace(re.escape(term_lower), search_term, 1), text, re.IGNORECASE)
                if match:
                    matches.append((search_term, 90, match.group()))
                continue
            
            # Method 3: Fuzzy matching against text segments
            threshold = self.name_confidence_threshold if match_type == "name" else self.location_confidence_threshold
            
            # Check full text
            full_score = fuzz.partial_ratio(term_lower, clean_text)
            if full_score >= threshold:
                matches.append((search_term, full_score, f"[Fuzzy match in full text]"))
                continue
            
            # Check word combinations (up to 4 words)
            for i in range(len(words)):
                for j in range(i + 1, min(i + 5, len(words) + 1)):
                    word_combo = ' '.join(words[i:j])
                    score = fuzz.ratio(term_lower, word_combo)
                    if score >= threshold:
                        # Find original casing in text
                        original_match = re.search(re.escape(word_combo).replace(r'\ ', r'\s+'), text, re.IGNORECASE)
                        matched_segment = original_match.group() if original_match else word_combo
                        matches.append((search_term, score, matched_segment))
                        break
        
        # Remove duplicates and sort by confidence
        unique_matches = []
        seen = set()
        for match in sorted(matches, key=lambda x: x[1], reverse=True):
            if match[0] not in seen:
                seen.add(match[0])
                unique_matches.append(match)
        
        return unique_matches
    
    def extract_review_data(self, rmt_data: RMTData) -> List[ReviewExtraction]:
        """Extract review data for a specific RMT"""
        extractions = []
        name_variations = self.generate_name_variations(rmt_data)
        location_variations = self.generate_location_variations(rmt_data.practice_locations)
        
        logger.info(f"Processing RMT: {rmt_data.first_name} {rmt_data.last_name}")
        logger.debug(f"Name variations: {name_variations[:5]}...")  # Show first 5
        logger.debug(f"Location variations: {location_variations[:3]}...")  # Show first 3
        
        # Search near each practice location
        for location in rmt_data.practice_locations:
            try:
                location_parts = [
                    location.get('employerName', ''),
                    location.get('businessAddress', ''),
                    location.get('businessCity', ''),
                    location.get('province', '')
                ]
                location_str = ', '.join(filter(None, location_parts))
                
                if not location_str:
                    continue
                
                logger.info(f"Searching near: {location_str}")
                places = self.find_nearby_places(location_str)
                
                for place in places:
                    place_id = place.get('place_id')
                    if not place_id:
                        continue
                    
                    reviews, place_info = self.get_place_reviews(place_id)
                    
                    for review in reviews:
                        review_text = review.get('text', '')
                        if not review_text or len(review_text.strip()) < 10:
                            continue
                        
                        # Find name matches
                        name_matches = self.find_text_matches(review_text, name_variations, "name")
                        
                        # Find location matches (optional - adds context)
                        location_matches = self.find_text_matches(review_text, location_variations, "location")
                        
                        # If we have name matches, create extraction
                        if name_matches:
                            # Combine all matches
                            all_matches = name_matches + location_matches
                            matched_segments = [match[2] for match in all_matches]
                            confidence_scores = [match[1] for match in all_matches]
                            
                            # Create a more unique extraction_id using review text hash
                            review_hash = hashlib.md5(review_text.encode()).hexdigest()[:8]
                            extraction_id = f"{rmt_data.profile_id}_{place_id}_{review_hash}"
                            
                            extraction = ReviewExtraction(
                                extraction_id=extraction_id,
                                rmt_data=asdict(rmt_data),
                                matched_text_segments=matched_segments,
                                confidence_scores=confidence_scores,
                                review_data={
                                    'text': review_text,
                                    'rating': review.get('rating', 0),
                                    'time': review.get('time', 0),
                                    'author_name': review.get('author_name', ''),
                                    'relative_time_description': review.get('relative_time_description', ''),
                                    'text_length': len(review_text)
                                },
                                place_data=place_info,
                                extraction_metadata={
                                    'extraction_timestamp': time.time(),
                                    'search_location': location_str,
                                    'name_match_count': len(name_matches),
                                    'location_match_count': len(location_matches),
                                    'max_name_confidence': max([m[1] for m in name_matches]) if name_matches else 0,
                                    'max_location_confidence': max([m[1] for m in location_matches]) if location_matches else 0,
                                    'fuzzy_threshold_used': self.fuzzy_threshold,
                                    'place_search_method': place.get('search_type', 'unknown'),  # Track search method
                                    'place_types': place.get('types', [])  # Include place types for analysis
                                }
                            )
                            
                            extractions.append(extraction)
                            logger.info(f"Extracted review: {len(matched_segments)} matches, max confidence: {max(confidence_scores)}")
                    
                    time.sleep(self.request_delay)
                    
            except Exception as e:
                logger.error(f"Error processing location {location}: {e}")
                continue
        
        return extractions
    
    def build_extraction_json(self, extractions: List[ReviewExtraction]) -> Dict[str, Any]:
        """Build JSON output optimized for Gemini AI analysis"""
        
        extraction_data = {
            "metadata": {
                "extraction_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "total_extractions": len(extractions),
                "unique_rmts": len(set(ext.rmt_data['profile_id'] for ext in extractions)),
                "unique_places": len(set(ext.place_data.get('place_id', '') for ext in extractions)),
                "extraction_parameters": {
                    "fuzzy_threshold": self.fuzzy_threshold,
                    "name_confidence_threshold": self.name_confidence_threshold,
                    "location_confidence_threshold": self.location_confidence_threshold
                },
                "gemini_processing_ready": True
            },
            "extractions": []
        }
        
        for extraction in extractions:
            extraction_entry = {
                "extraction_id": extraction.extraction_id,
                "rmt_information": {
                    "profile_id": extraction.rmt_data['profile_id'],
                    "full_name": f"{extraction.rmt_data['first_name']} {extraction.rmt_data['last_name']}".strip(),
                    "common_name": f"{extraction.rmt_data['common_first_name']} {extraction.rmt_data['common_last_name']}".strip(),
                    "registration_status": extraction.rmt_data['registration_status'],
                    "authorized_to_practice": extraction.rmt_data['authorized_to_practice'],
                    "cmto_profile_url": extraction.rmt_data['cmto_endpoint'],
                    "practice_locations": extraction.rmt_data['practice_locations']
                },
                "review_content": {
                    "full_text": extraction.review_data['text'],
                    "rating": extraction.review_data['rating'],
                    "author": extraction.review_data['author_name'],
                    "time_description": extraction.review_data['relative_time_description'],
                    "text_length": extraction.review_data['text_length']
                },
                "business_context": {
                    "place_id": extraction.place_data.get('place_id', ''),
                    "business_name": extraction.place_data.get('name', ''),
                    "address": extraction.place_data.get('address', ''),
                    "business_rating": extraction.place_data.get('rating', 0),
                    "total_reviews": extraction.place_data.get('user_ratings_total', 0),
                    "business_types": extraction.place_data.get('types', []),
                    "website": extraction.place_data.get('website', ''),
                    "search_method": extraction.extraction_metadata.get('place_search_method', 'unknown'),
                    "google_place_types": extraction.extraction_metadata.get('place_types', [])
                },
                "matching_analysis": {
                    "matched_text_segments": extraction.matched_text_segments,
                    "confidence_scores": extraction.confidence_scores,
                    "max_confidence": max(extraction.confidence_scores) if extraction.confidence_scores else 0,
                    "match_count": len(extraction.matched_text_segments),
                    "extraction_metadata": extraction.extraction_metadata
                }
            }
            
            extraction_data["extractions"].append(extraction_entry)
        
        # Sort by confidence for easier analysis
        extraction_data["extractions"].sort(
            key=lambda x: x["matching_analysis"]["max_confidence"], 
            reverse=True
        )
        
        return extraction_data
    
    def run_extraction(self, search_keywords: List[str], max_rmts_per_keyword: int = 15) -> Dict[str, Any]:
        """Run the complete extraction workflow"""
        logger.info("Starting RMT review extraction")
        
        all_extractions = []
        processed_rmts = set()
        
        for keyword in search_keywords:
            logger.info(f"Processing keyword: {keyword}")
            
            rmt_profiles = self.search_cmto_profiles(keyword, max_rmts_per_keyword)
            
            for rmt_data in rmt_profiles:
                if rmt_data.profile_id in processed_rmts:
                    continue
                
                processed_rmts.add(rmt_data.profile_id)
                
                extractions = self.extract_review_data(rmt_data)
                all_extractions.extend(extractions)
                
                logger.info(f"Extracted {len(extractions)} reviews for {rmt_data.first_name} {rmt_data.last_name}")
                
                time.sleep(self.request_delay)
        
        result = self.build_extraction_json(all_extractions)
        
        logger.info(f"Extraction complete. Found {len(all_extractions)} total extractions for {len(processed_rmts)} RMTs")
        
        return result

def test_cmto_api() -> bool:
    """
    Test CMTO API connectivity without requiring Google API keys.
    Returns True if the API is accessible, False otherwise.
    """
    import requests
    import time
    
    # Disable SSL warnings for testing
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    print("🔍 Testing CMTO API connectivity...")
    
    # Test configuration
    cmto_base_url = "https://cmto.ca.thentiacloud.net"
    test_profile_id = "12345"  # Use a test profile ID
    
    # Create session with reasonable timeout and SSL verification disabled
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'RMT-Finder-Test/1.0'
    })
    session.verify = False  # Disable SSL verification for testing
    
    try:
        # Test 1: Basic connectivity to CMTO domain
        print("  📡 Testing basic connectivity...")
        response = session.get(cmto_base_url, timeout=10)
        if response.status_code != 200:
            print(f"    ❌ Failed to connect to CMTO domain (status: {response.status_code})")
            return False
        print("    ✅ CMTO domain is accessible")
        
        # Test 2: Search API endpoint
        print("  🔍 Testing search API...")
        search_url = f"{cmto_base_url}/rest/public/profile/search/"
        search_params = {
            'keyword': 'test',
            'skip': 0,
            'take': 5,
            'authorizedToPractice': 0,
            'acupunctureAuthorized': 0,
            'gender': 'all',
            'registrationStatus': 'all',
            'city': 'all',
            'language': 'all',
            'sortOrder': 'asc',
            'sortField': 'lastname'
        }
        
        response = session.get(search_url, params=search_params, timeout=30)
        if response.status_code != 200:
            print(f"    ❌ Search API failed (status: {response.status_code})")
            print(f"    Response: {response.text[:200]}...")
            return False
        
        try:
            data = response.json()
            if 'result' not in data:
                print("    ❌ Search API returned invalid response format")
                return False
            print(f"    ✅ Search API working (found {len(data.get('result', []))} test results)")
        except ValueError as e:
            print(f"    ❌ Search API returned invalid JSON: {e}")
            return False
        
        # Test 3: Profile API endpoint (with a real profile ID if available)
        print("  👤 Testing profile API...")
        profile_url = f"{cmto_base_url}/rest/public/profile/get/"
        
        # First, try to get a real profile ID from the search results
        real_profile_id = None
        if data.get('result') and len(data['result']) > 0:
            real_profile_id = data['result'][0].get('profileId')
        
        if real_profile_id:
            profile_params = {'id': real_profile_id}
            response = session.get(profile_url, params=profile_params, timeout=30)
            
            if response.status_code == 200:
                try:
                    profile_data = response.json()
                    if 'firstName' in profile_data:
                        print(f"    ✅ Profile API working (tested with profile {real_profile_id})")
                    else:
                        print("    ⚠️  Profile API returned empty profile data")
                except ValueError:
                    print("    ⚠️  Profile API returned invalid JSON")
            else:
                print(f"    ⚠️  Profile API returned status {response.status_code}")
        else:
            print("    ⚠️  Could not test profile API (no test profile available)")
        
        print("  ✅ CMTO API connectivity test completed successfully!")
        print("  💡 Note: SSL verification was disabled for testing. In production, ensure proper SSL certificates.")
        return True
        
    except requests.exceptions.SSLError as e:
        print(f"    ❌ SSL Error: {e}")
        print("    💡 SSL verification disabled for testing")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"    ❌ Connection Error: {e}")
        print("    💡 Check your internet connection")
        return False
    except requests.exceptions.Timeout as e:
        print(f"    ❌ Timeout Error: {e}")
        print("    💡 The CMTO API might be slow or unavailable")
        return False
    except Exception as e:
        print(f"    ❌ Unexpected Error: {e}")
        return False

def main():
    """Main execution function"""
    # Configuration
    GOOGLE_API_KEY = "YOUR_GOOGLE_PLACES_API_KEY_HERE"  # Replace with your actual API key
    
    # Search parameters
    search_keywords = [
        "Toronto massage therapy",
        "Mississauga RMT", 
        "Vaughan wellness",
        "Markham physiotherapy"
    ]
    
    # Initialize the extractor
    extractor = RMTReviewExtractor(google_api_key=GOOGLE_API_KEY)
    
    try:
        # Run the extraction
        results = extractor.run_extraction(
            search_keywords=search_keywords,
            max_rmts_per_keyword=10
        )
        
        # Save results
        output_filename = f"rmt_review_extractions_{int(time.time())}.json"
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"\nExtraction complete! Results saved to: {output_filename}")
        print(f"Total extractions: {results['metadata']['total_extractions']}")
        print(f"Unique RMTs: {results['metadata']['unique_rmts']}")
        print(f"Unique businesses: {results['metadata']['unique_places']}")
        
        # Print top 5 extractions by confidence
        print("\nTop 5 extractions by confidence:")
        for i, extraction in enumerate(results['extractions'][:5], 1):
            name = extraction['rmt_information']['full_name']
            confidence = extraction['matching_analysis']['max_confidence']
            business = extraction['business_context']['business_name']
            print(f"{i}. {name} at {business}: {confidence}% confidence")
            
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        raise

if __name__ == "__main__":
    import sys
    
    # Handle test mode completely separately
    if len(sys.argv) > 1 and sys.argv[1] == '--test-cmto':
        print("🔍 Testing CMTO API connectivity (no Google API keys required)...")
        success = test_cmto_api()
        if success:
            print("\n✅ CMTO API test successful! You can now run the full system.")
            sys.exit(0)
        else:
            print("\n❌ CMTO API test failed. Please check the error messages above.")
            sys.exit(1)
    else:
        # Only run main() if not in test mode
        main()
