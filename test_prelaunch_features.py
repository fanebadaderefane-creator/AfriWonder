#!/usr/bin/env python3
"""
AfriWonder Mobile Backend - Pre-Launch Features Testing
Tests the NEW 7 pre-launch feature API endpoints as specified in the review request
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration - Using localhost:8001 as requested in review
BASE_URL = "http://localhost:8001"

def get_jwt_token():
    """Get JWT token using provided credentials"""
    login_url = f"{BASE_URL}/api/proxy/auth/login"
    login_data = {
        "identifier": "abdoulayefane813@gmail.com",
        "password": "Mali@2025"
    }
    
    print("🔐 Getting JWT token...")
    try:
        response = requests.post(login_url, json=login_data)
        print(f"   Login status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("data", {}).get("accessToken"):
                token = data["data"]["accessToken"]
                print(f"   ✅ Token obtained: {token[:50]}...")
                return token
            else:
                print(f"   ❌ No accessToken in response: {data}")
                return None
        else:
            print(f"   ❌ Login failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"   ❌ Login error: {e}")
        return None

def test_api(method, endpoint, data=None, params=None, expected_status=200, description=""):
    """Helper function to test API endpoints"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n🧪 Testing {method} {endpoint}")
    print(f"   Description: {description}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, params=params)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        else:
            print(f"❌ Unsupported method: {method}")
            return False, None
            
        print(f"   Status: {response.status_code}")
        
        if response.status_code != expected_status:
            print(f"❌ Expected {expected_status}, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False, None
            
        try:
            json_response = response.json()
            print(f"   Response format: {'✅ Valid JSON' if json_response else '❌ Invalid JSON'}")
            
            # Check if response has expected format {'success': true, 'data': {...}}
            if "success" in json_response and "data" in json_response:
                print(f"   Format check: ✅ Has success/data structure")
                if json_response.get("success"):
                    print(f"   Success: ✅ {json_response['success']}")
                    print(f"   Data keys: {list(json_response.get('data', {}).keys())}")
                    return True, json_response
                else:
                    print(f"   Success: ❌ {json_response['success']}")
                    return False, json_response
            else:
                print(f"   Format check: ❌ Missing success/data structure")
                print(f"   Response keys: {list(json_response.keys())}")
                return False, json_response
                
        except json.JSONDecodeError:
            print(f"❌ Invalid JSON response: {response.text}")
            return False, None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False, None

def main():
    global headers
    
    print("🚀 Starting AfriWonder Mobile Backend PRE-LAUNCH FEATURES Tests")
    print(f"   Base URL: {BASE_URL}")
    
    # Get JWT token first
    jwt_token = get_jwt_token()
    if not jwt_token:
        print("❌ Cannot proceed without JWT token")
        return False
    
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    
    results = {}
    
    print("\n" + "="*80)
    print("TESTING NEW PRE-LAUNCH FEATURE APIs (7 endpoints)")
    print("="*80)
    
    # 1. Global Search - Test with different types
    search_types = ["all", "users", "videos", "products", "posts"]
    for search_type in search_types:
        results[f"search_{search_type}"], _ = test_api(
            "GET", "/api/mobile/search",
            params={"q": "test", "type": search_type},
            description=f"1.{search_types.index(search_type)+1} Global search - type: {search_type}"
        )
    
    # 2. Get Notifications
    results["get_notifications"], _ = test_api(
        "GET", "/api/mobile/notifications",
        description="2. Get user notifications"
    )
    
    # 3. Mark All Notifications as Read
    results["read_all_notifications"], _ = test_api(
        "POST", "/api/mobile/notifications/read",
        description="3. Mark all notifications as read"
    )
    
    # 4. Report Content
    report_data = {
        "target_type": "video",
        "target_id": "test123",
        "reason": "spam",
        "details": "Test report"
    }
    results["report_content"], _ = test_api(
        "POST", "/api/mobile/report",
        data=report_data,
        description="4. Report content"
    )
    
    # 5. Block User
    block_data = {
        "blocked_user_id": "user123"
    }
    results["block_user"], _ = test_api(
        "POST", "/api/mobile/block",
        data=block_data,
        description="5. Block a user"
    )
    
    # 6. Save User Interests
    interests_data = {
        "interests": ["music", "dance", "cuisine"]
    }
    results["save_interests"], _ = test_api(
        "POST", "/api/mobile/interests",
        data=interests_data,
        description="6. Save user interests"
    )
    
    # 7. Get User Interests
    results["get_interests"], _ = test_api(
        "GET", "/api/mobile/interests",
        description="7. Get user interests"
    )
    
    # ==================== SUMMARY ====================
    print("\n" + "="*80)
    print("PRE-LAUNCH FEATURES TEST RESULTS SUMMARY")
    print("="*80)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    print(f"\n📊 Overall Results: {passed}/{total} tests passed")
    
    print(f"\n📋 Detailed Results:")
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
    
    # Check for failures
    failed_tests = [name for name, result in results.items() if not result]
    if failed_tests:
        print(f"\n⚠️  {total - passed} test(s) failed: {', '.join(failed_tests)}")
    
    if passed == total:
        print(f"\n🎉 All {total} pre-launch feature tests passed!")
        return True
    else:
        print(f"\n⚠️  Pre-launch feature testing completed with {total - passed} failures out of {total} total tests.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)