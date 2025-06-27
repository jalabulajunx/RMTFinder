#!/usr/bin/env python3
"""
Test script to debug pagination issue with CMTO search
"""

import requests
import json
import urllib3
import time

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def test_cmto_pagination():
    """Test CMTO pagination to see what's happening"""
    cmto_base_url = "https://cmto.ca.thentiacloud.net"
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'RMT-Finder-Test/1.0'
    })
    session.verify = False
    
    keyword = "Stouffville"
    take = 10
    skip = 0
    
    print(f"🔍 Testing CMTO pagination for '{keyword}'")
    print(f"Take: {take}, Skip: {skip}")
    
    # First page
    url = f"{cmto_base_url}/rest/public/profile/search/"
    params = {
        'keyword': keyword,
        'skip': skip,
        'take': take,
        'authorizedToPractice': 0,
        'acupunctureAuthorized': 0,
        'gender': 'all',
        'registrationStatus': 'all',
        'city': 'all',
        'language': 'all',
        'sortOrder': 'asc',
        'sortField': 'lastname',
        '_': str(int(time.time() * 1000)),
    }
    
    print(f"\n📄 Page 1 (skip={skip}):")
    response = session.get(url, params=params, timeout=30)
    data = response.json()
    
    print(f"Status: {response.status_code}")
    print(f"resultCount: {data.get('resultCount')}")
    print(f"results length: {len(data.get('result', []))}")
    
    if data.get('result'):
        print(f"First result: {data['result'][0].get('firstName', '')} {data['result'][0].get('lastName', '')}")
        print(f"Last result: {data['result'][-1].get('firstName', '')} {data['result'][-1].get('lastName', '')}")
    
    # Second page
    skip += take
    params['skip'] = skip
    params['_'] = str(int(time.time() * 1000))
    
    print(f"\n📄 Page 2 (skip={skip}):")
    response = session.get(url, params=params, timeout=30)
    data = response.json()
    
    print(f"Status: {response.status_code}")
    print(f"resultCount: {data.get('resultCount')}")
    print(f"results length: {len(data.get('result', []))}")
    
    if data.get('result'):
        print(f"First result: {data['result'][0].get('firstName', '')} {data['result'][0].get('lastName', '')}")
        print(f"Last result: {data['result'][-1].get('firstName', '')} {data['result'][-1].get('lastName', '')}")
    else:
        print("❌ No results in second page!")
    
    # Third page
    skip += take
    params['skip'] = skip
    params['_'] = str(int(time.time() * 1000))
    
    print(f"\n📄 Page 3 (skip={skip}):")
    response = session.get(url, params=params, timeout=30)
    data = response.json()
    
    print(f"Status: {response.status_code}")
    print(f"resultCount: {data.get('resultCount')}")
    print(f"results length: {len(data.get('result', []))}")
    
    if data.get('result'):
        print(f"First result: {data['result'][0].get('firstName', '')} {data['result'][0].get('lastName', '')}")
        print(f"Last result: {data['result'][-1].get('firstName', '')} {data['result'][-1].get('lastName', '')}")
    else:
        print("❌ No results in third page!")

if __name__ == "__main__":
    test_cmto_pagination() 