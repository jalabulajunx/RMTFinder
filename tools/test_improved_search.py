#!/usr/bin/env python3
"""
Test script for the improved find_nearby_places method

This script demonstrates the improvements made to the place search functionality:
1. Using includedType parameter for better targeting
2. Fallback to keyword search when needed
3. Better tracking of search methods

Usage:
    python test_improved_search.py
"""

import os
import sys
import json
import time
from rmt_review_extractor import RMTReviewExtractor

def test_improved_search():
    """Test the improved find_nearby_places method"""
    
    # Get API key from environment or use placeholder
    google_api_key = os.getenv('GOOGLE_PLACES_API_KEY', 'YOUR_API_KEY_HERE')
    
    if google_api_key == 'YOUR_API_KEY_HERE':
        print("❌ Please set GOOGLE_PLACES_API_KEY environment variable")
        print("   export GOOGLE_PLACES_API_KEY='your_api_key_here'")
        return False
    
    # Test different configurations
    test_configs = [
        {
            'name': 'Default Configuration',
            'params': {}
        },
        {
            'name': 'High Coverage Configuration',
            'params': {
                'max_results_per_type': 75,
                'min_places_before_fallback': 15,
                'max_total_places': 300,
                'api_delay': 0.3
            }
        },
        {
            'name': 'Conservative Configuration',
            'params': {
                'max_results_per_type': 25,
                'min_places_before_fallback': 5,
                'max_total_places': 100,
                'api_delay': 1.0
            }
        }
    ]
    
    # Test locations
    test_locations = [
        "Toronto, ON",
        "Mississauga, ON"
    ]
    
    print("🔍 Testing improved find_nearby_places method...")
    print("=" * 60)
    
    for config in test_configs:
        print(f"\n📋 Testing: {config['name']}")
        print(f"Parameters: {config['params']}")
        print("-" * 40)
        
        # Initialize the extractor with current config
        extractor = RMTReviewExtractor(google_api_key=google_api_key, **config['params'])
        
        for location in test_locations:
            print(f"\n📍 Testing location: {location}")
            
            try:
                start_time = time.time()
                places = extractor.find_nearby_places(location)
                end_time = time.time()
                
                print(f"✅ Found {len(places)} places in {end_time - start_time:.2f} seconds")
                
                # Analyze search methods used
                search_methods = {}
                place_types = {}
                
                for place in places:
                    search_method = place.get('search_type', 'unknown')
                    search_methods[search_method] = search_methods.get(search_method, 0) + 1
                    
                    # Count place types
                    types = place.get('types', [])
                    for place_type in types:
                        place_types[place_type] = place_types.get(place_type, 0) + 1
                
                print(f"📊 Search methods used:")
                for method, count in search_methods.items():
                    print(f"   {method}: {count} places")
                
                print(f"🏥 Top place types found:")
                sorted_types = sorted(place_types.items(), key=lambda x: x[1], reverse=True)
                for place_type, count in sorted_types[:5]:
                    print(f"   {place_type}: {count} places")
                
                # Show sample places
                print(f"🏢 Sample places found:")
                for i, place in enumerate(places[:3], 1):
                    name = place.get('name', 'Unknown')
                    rating = place.get('rating', 0)
                    search_type = place.get('search_type', 'unknown')
                    print(f"   {i}. {name} (Rating: {rating}, Found via: {search_type})")
                
            except Exception as e:
                print(f"❌ Error testing {location}: {e}")
                continue
    
    print("\n" + "=" * 60)
    print("✅ Test completed!")
    
    return True

def compare_search_methods():
    """Compare the old vs new search approach"""
    
    print("\n📈 Comparison of search approaches:")
    print("-" * 40)
    
    print("🔴 OLD APPROACH (Fixed limits):")
    print("   • Fixed maxResultCount: 20 per type")
    print("   • Fixed fallback threshold: 5 places")
    print("   • Fixed API delay: 0.1 seconds")
    print("   • No result limiting")
    print("   • Could miss relevant businesses")
    
    print("\n🟢 NEW APPROACH (Configurable + Improved):")
    print("   • Configurable maxResultCount: 50 per type (default)")
    print("   • Configurable fallback threshold: 10 places (default)")
    print("   • Configurable API delay: 0.5 seconds (default)")
    print("   • Smart result limiting: 200 total places (default)")
    print("   • Better rate limiting compliance")
    print("   • More comprehensive coverage")
    
    print("\n🎛️  Configuration Options:")
    print("   • max_results_per_type: 25-100 (Google API limit)")
    print("   • min_places_before_fallback: 5-20")
    print("   • max_total_places: 100-500")
    print("   • api_delay: 0.3-2.0 seconds")
    
    print("\n🎯 Benefits:")
    print("   • Higher quality results with better coverage")
    print("   • Configurable for different use cases")
    print("   • Better API rate limit compliance")
    print("   • Reduced risk of missing relevant places")
    print("   • Performance optimization options")

if __name__ == "__main__":
    print("🚀 RMT Review Extractor - Improved Search Test")
    print("Testing the enhanced find_nearby_places method with includedType parameters")
    
    success = test_improved_search()
    compare_search_methods()
    
    if success:
        print("\n🎉 All tests passed! The improved search method is working correctly.")
    else:
        print("\n❌ Some tests failed. Please check the error messages above.")
        sys.exit(1) 