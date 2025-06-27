#!/usr/bin/env python3
"""
Test script to debug Stouffville search issue
"""

import requests
import json
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def test_stouffville_search():
    """Test the exact search that's failing"""
    cmto_base_url = "https://cmto.ca.thentiacloud.net"
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'RMT-Finder-Test/1.0'
    })
    session.verify = False
    
    url = f"{cmto_base_url}/rest/public/profile/search/"
    params = {
        'keyword': 'Stouffville',
        'skip': 0,
        'take': 10,
        'authorizedToPractice': 0,
        'acupunctureAuthorized': 0,
        'gender': 'all',
        'registrationStatus': 'all',
        'city': 'all',
        'language': 'all',
        'sortOrder': 'asc',
        'sortField': 'lastname',
        '_': '1750898315439'
    }
    
    print("🔍 Testing Stouffville search...")
    print(f"URL: {url}")
    print(f"Params: {params}")
    
    try:
        response = session.get(url, params=params, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"\n📊 Response Analysis:")
            print(f"Response keys: {list(data.keys())}")
            print(f"resultCount: {data.get('resultCount')}")
            print(f"result array length: {len(data.get('result', []))}")
            print(f"errorCode: {data.get('errorCode')}")
            print(f"errorMessage: {data.get('errorMessage')}")
            
            results = data.get('result', [])
            
            if results:
                print(f"\n✅ Found {len(results)} results")
                print("📋 First 3 results:")
                for i, result in enumerate(results[:3], 1):
                    profile_id = result.get('profileId', 'N/A')
                    name = f"{result.get('firstName', '')} {result.get('lastName', '')}".strip()
                    city = result.get('city', 'N/A')
                    print(f"  {i}. {name} (ID: {profile_id}, City: {city})")
            else:
                print(f"\n❌ No results found despite resultCount: {data.get('resultCount')}")
                print(f"Raw response (first 500 chars): {response.text[:500]}")
            
            # Save full response for inspection
            with open('stouffville_response.json', 'w') as f:
                json.dump(data, f, indent=2, default=str)
            print(f"\n📄 Full response saved to: stouffville_response.json")
            
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text[:500]}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_stouffville_search() 