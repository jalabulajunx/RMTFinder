#!/usr/bin/env python3
"""
Debug script to test CMTO search functionality with different keywords
"""

import requests
import json
import urllib3
from typing import List, Dict, Any

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def test_cmto_search(keyword: str) -> Dict[str, Any]:
    """Test CMTO search with a specific keyword"""
    cmto_base_url = "https://cmto.ca.thentiacloud.net"
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'RMT-Finder-Debug/1.0'
    })
    session.verify = False
    
    url = f"{cmto_base_url}/rest/public/profile/search/"
    params = {
        'keyword': keyword,
        'skip': 0,
        'take': 20,
        'authorizedToPractice': 0,
        'acupunctureAuthorized': 0,
        'gender': 'all',
        'registrationStatus': 'all',
        'city': 'all',
        'language': 'all',
        'sortOrder': 'asc',
        'sortField': 'lastname'
    }
    
    print(f"\n🔍 Testing search for: '{keyword}'")
    print(f"URL: {url}")
    print(f"Params: {params}")
    
    try:
        response = session.get(url, params=params, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            total_count = data.get('totalCount', 0)
            results = data.get('result', [])
            
            print(f"✅ Total results: {total_count}")
            print(f"✅ Results in this page: {len(results)}")
            
            if results:
                print("📋 Sample results:")
                for i, result in enumerate(results[:3], 1):
                    profile_id = result.get('profileId', 'N/A')
                    name = f"{result.get('firstName', '')} {result.get('lastName', '')}".strip()
                    print(f"  {i}. {name} (ID: {profile_id})")
            
            return {
                'success': True,
                'total_count': total_count,
                'results_count': len(results),
                'sample_results': results[:3] if results else []
            }
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return {
                'success': False,
                'status_code': response.status_code,
                'error': response.text[:500]
            }
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Test various search keywords"""
    test_keywords = [
        "Stouffville",
        "Toronto",
        "Mississauga", 
        "massage",
        "therapy",
        "RMT",
        "registered massage therapist",
        "physiotherapy",
        "wellness",
        "clinic"
    ]
    
    print("🧪 CMTO Search Debug Tool")
    print("=" * 50)
    
    results = {}
    
    for keyword in test_keywords:
        result = test_cmto_search(keyword)
        results[keyword] = result
        
        if result['success'] and result['total_count'] > 0:
            print(f"✅ '{keyword}' - Found {result['total_count']} results")
        elif result['success']:
            print(f"⚠️  '{keyword}' - No results found")
        else:
            print(f"❌ '{keyword}' - Search failed")
    
    print("\n" + "=" * 50)
    print("📊 Summary:")
    
    successful_searches = [k for k, v in results.items() if v['success'] and v['total_count'] > 0]
    empty_searches = [k for k, v in results.items() if v['success'] and v['total_count'] == 0]
    failed_searches = [k for k, v in results.items() if not v['success']]
    
    print(f"✅ Successful searches with results: {len(successful_searches)}")
    if successful_searches:
        print(f"   Keywords: {', '.join(successful_searches)}")
    
    print(f"⚠️  Empty searches: {len(empty_searches)}")
    if empty_searches:
        print(f"   Keywords: {', '.join(empty_searches)}")
    
    print(f"❌ Failed searches: {len(failed_searches)}")
    if failed_searches:
        print(f"   Keywords: {', '.join(failed_searches)}")
    
    # Save detailed results
    with open('cmto_search_debug.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: cmto_search_debug.json")

if __name__ == "__main__":
    main() 