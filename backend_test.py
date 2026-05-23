#!/usr/bin/env python3
"""
AfriWonder Mobile Backend API Comprehensive Testing
Tests ALL 24 mobile API endpoints including new monetization, ads, live streaming, and posts APIs
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration - Using localhost:8001 as requested
BASE_URL = "http://localhost:8001"
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdC11c2VyLTQ1NiIsImV4cCI6MTc3NTkyMDQ0MH0.6Qzr4lHbmpfS7KWFvfYG03pWP9cUsQQINginXQgpfPE"

headers = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Content-Type": "application/json"
}

def test_api(method, endpoint, data=None, expected_status=200, description=""):
    """Helper function to test API endpoints"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n🧪 Testing {method} {endpoint}")
    print(f"   Description: {description}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data)
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
            
            # Check if response has expected format
            if "success" in json_response and "data" in json_response:
                print(f"   Format check: ✅ Has success/data structure")
                if json_response.get("success"):
                    print(f"   Success: ✅ {json_response['success']}")
                    return True, json_response
                else:
                    print(f"   Success: ❌ {json_response['success']}")
                    return False, json_response
            else:
                # Health check endpoint doesn't follow success/data format
                if endpoint == "/api/health" and "status" in json_response:
                    print(f"   Health check: ✅ Valid health response")
                    return True, json_response
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
    print("🚀 Starting AfriWonder Mobile Backend COMPREHENSIVE API Tests")
    print(f"   Base URL: {BASE_URL}")
    print(f"   JWT Token: {JWT_TOKEN[:50]}...")
    
    results = {}
    test_data = {}  # Store data from tests for later use
    
    # ==================== EXISTING APIs ====================
    print("\n" + "="*80)
    print("TESTING EXISTING APIs (6 endpoints)")
    print("="*80)
    
    # 1. Health Check (no auth required)
    results["health_check"], _ = test_api(
        "GET", "/api/health", 
        description="1. Health check endpoint (no auth required)"
    )
    
    # 2. Mobile Conversations (with auth)
    results["mobile_conversations"], conv_data = test_api(
        "GET", "/api/mobile/conversations",
        description="2. Get user conversations (requires JWT auth)"
    )
    
    # Store conversation ID for later use
    if conv_data and conv_data.get("success") and conv_data.get("data", {}).get("conversations"):
        test_data["conversation_id"] = conv_data["data"]["conversations"][0]["id"]
        print(f"   📝 Stored conversation ID: {test_data['conversation_id']}")
    
    # 3. Mobile Wallet (with auth)
    results["mobile_wallet"], _ = test_api(
        "GET", "/api/mobile/wallet",
        description="3. Get user wallet (requires JWT auth)"
    )
    
    # 4. Mobile Stories (with auth)
    results["mobile_stories"], _ = test_api(
        "GET", "/api/mobile/stories",
        description="4. Get user stories (requires JWT auth)"
    )
    
    # 5. Mobile Crowdfunding (with auth)
    results["mobile_crowdfunding"], _ = test_api(
        "GET", "/api/mobile/crowdfunding",
        description="5. Get crowdfunding projects (requires JWT auth)"
    )
    
    # 6. Mobile Profile (with auth)
    results["mobile_profile"], _ = test_api(
        "GET", "/api/mobile/profile",
        description="6. Get user profile (requires JWT auth)"
    )
    
    # ==================== NEW MONETIZATION APIs ====================
    print("\n" + "="*80)
    print("TESTING NEW MONETIZATION APIs (4 endpoints)")
    print("="*80)
    
    # 7. Send Tips
    tip_data = {
        "creator_id": "test-creator",
        "amount": 500,
        "payment_method": "orange-money",
        "message": "Bravo!"
    }
    results["send_tips"], _ = test_api(
        "POST", "/api/mobile/tips",
        data=tip_data,
        description="7. Send tip to creator"
    )
    
    # 8. Creator Earnings
    results["creator_earnings"], _ = test_api(
        "GET", "/api/mobile/creator/earnings",
        description="8. Get creator earnings dashboard"
    )
    
    # 9. Creator Withdraw
    withdraw_data = {
        "amount": 1000,
        "payment_method": "orange-money",
        "phone": "70123456"
    }
    results["creator_withdraw"], _ = test_api(
        "POST", "/api/mobile/creator/withdraw",
        data=withdraw_data,
        description="9. Creator withdraw to mobile money"
    )
    
    # 10. Creator Transactions
    results["creator_transactions"], _ = test_api(
        "GET", "/api/mobile/creator/transactions",
        description="10. Get creator transaction history"
    )
    
    # ==================== NEW ADS APIs ====================
    print("\n" + "="*80)
    print("TESTING NEW ADS APIs (3 endpoints)")
    print("="*80)
    
    # 11. Create Ad
    ad_data = {
        "title": "Test Ad",
        "description": "Test",
        "budget": 5000,
        "duration_days": 7
    }
    results["create_ad"], _ = test_api(
        "POST", "/api/mobile/ads/create",
        data=ad_data,
        description="11. Create advertisement"
    )
    
    # 12. My Ads
    results["my_ads"], _ = test_api(
        "GET", "/api/mobile/ads/my",
        description="12. Get my advertisements"
    )
    
    # 13. Feed Ads
    results["feed_ads"], _ = test_api(
        "GET", "/api/mobile/ads/feed",
        description="13. Get feed advertisements"
    )
    
    # ==================== NEW LIVE STREAMING APIs ====================
    print("\n" + "="*80)
    print("TESTING NEW LIVE STREAMING APIs (6 endpoints)")
    print("="*80)
    
    # 14. Start Live
    live_data = {
        "title": "Test Live",
        "category": "musique"
    }
    results["start_live"], live_response = test_api(
        "POST", "/api/mobile/live/start",
        data=live_data,
        description="14. Start live streaming"
    )
    
    # Store live ID for later use
    live_id = None
    if live_response and live_response.get("success") and live_response.get("data", {}).get("live_id"):
        live_id = live_response["data"]["live_id"]
        test_data["live_id"] = live_id
        print(f"   📝 Stored live ID: {live_id}")
    
    # 15. Active Lives
    results["active_lives"], _ = test_api(
        "GET", "/api/mobile/live/active",
        description="15. Get active live streams"
    )
    
    # 16. Live Replays
    results["live_replays"], _ = test_api(
        "GET", "/api/mobile/live/replays",
        description="16. Get live stream replays"
    )
    
    # 17. End Live (use live_id from step 14)
    if live_id:
        results["end_live"], _ = test_api(
            "POST", f"/api/mobile/live/{live_id}/end",
            description="17. End live streaming"
        )
    else:
        print("❌ Cannot test end live - no live_id available")
        results["end_live"] = False
    
    # 18. Create Highlight (use live_id from step 14)
    if live_id:
        highlight_data = {
            "live_id": live_id,
            "start_time": 10,
            "end_time": 60,
            "title": "Best moment"
        }
        results["create_highlight"], _ = test_api(
            "POST", f"/api/mobile/live/{live_id}/highlight",
            data=highlight_data,
            description="18. Create live highlight clip"
        )
    else:
        print("❌ Cannot test create highlight - no live_id available")
        results["create_highlight"] = False
    
    # 19. Republish Live (use live_id from step 14)
    if live_id:
        results["republish_live"], _ = test_api(
            "POST", f"/api/mobile/live/{live_id}/republish",
            description="19. Republish live as post"
        )
    else:
        print("❌ Cannot test republish live - no live_id available")
        results["republish_live"] = False
    
    # ==================== NEW POSTS APIs ====================
    print("\n" + "="*80)
    print("TESTING NEW POSTS APIs (4 endpoints)")
    print("="*80)
    
    # 20. Create Text Post
    text_post_data = {
        "content_type": "text",
        "text": "Hello AfriWonder!"
    }
    results["create_text_post"], _ = test_api(
        "POST", "/api/mobile/posts",
        data=text_post_data,
        description="20. Create text post"
    )
    
    # 21. Create Article Post
    article_post_data = {
        "content_type": "article",
        "title": "Mon Article",
        "text": "Contenu de l'article"
    }
    results["create_article_post"], _ = test_api(
        "POST", "/api/mobile/posts",
        data=article_post_data,
        description="21. Create article post"
    )
    
    # 22. Get Posts
    results["get_posts"], _ = test_api(
        "GET", "/api/mobile/posts",
        description="22. Get all posts"
    )
    
    # 23. Get My Posts
    results["get_my_posts"], _ = test_api(
        "GET", "/api/mobile/posts/my",
        description="23. Get my posts"
    )
    
    # ==================== CHUNKED UPLOAD ====================
    print("\n" + "="*80)
    print("TESTING CHUNKED UPLOAD API (1 endpoint)")
    print("="*80)
    
    # 24. Upload Status
    test_upload_id = str(uuid.uuid4())
    results["upload_status"], _ = test_api(
        "GET", f"/api/mobile/upload/{test_upload_id}/status",
        description="24. Get upload status"
    )
    
    # ==================== SUMMARY ====================
    print("\n" + "="*80)
    print("COMPREHENSIVE TEST RESULTS SUMMARY")
    print("="*80)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    print(f"\n📊 Overall Results: {passed}/{total} tests passed")
    
    # Categorize results
    existing_apis = ["health_check", "mobile_conversations", "mobile_wallet", "mobile_stories", "mobile_crowdfunding", "mobile_profile"]
    monetization_apis = ["send_tips", "creator_earnings", "creator_withdraw", "creator_transactions"]
    ads_apis = ["create_ad", "my_ads", "feed_ads"]
    live_apis = ["start_live", "active_lives", "live_replays", "end_live", "create_highlight", "republish_live"]
    posts_apis = ["create_text_post", "create_article_post", "get_posts", "get_my_posts"]
    upload_apis = ["upload_status"]
    
    print(f"\n📈 Results by Category:")
    
    existing_passed = sum(1 for api in existing_apis if results.get(api, False))
    print(f"   Existing APIs (6): {existing_passed}/{len(existing_apis)} passed")
    
    monetization_passed = sum(1 for api in monetization_apis if results.get(api, False))
    print(f"   Monetization APIs (4): {monetization_passed}/{len(monetization_apis)} passed")
    
    ads_passed = sum(1 for api in ads_apis if results.get(api, False))
    print(f"   Ads APIs (3): {ads_passed}/{len(ads_apis)} passed")
    
    live_passed = sum(1 for api in live_apis if results.get(api, False))
    print(f"   Live Streaming APIs (6): {live_passed}/{len(live_apis)} passed")
    
    posts_passed = sum(1 for api in posts_apis if results.get(api, False))
    print(f"   Posts APIs (4): {posts_passed}/{len(posts_apis)} passed")
    
    upload_passed = sum(1 for api in upload_apis if results.get(api, False))
    print(f"   Upload APIs (1): {upload_passed}/{len(upload_apis)} passed")
    
    print(f"\n📋 Detailed Results:")
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
    
    # Check for critical failures
    failed_tests = [name for name, result in results.items() if not result]
    if failed_tests:
        print(f"\n⚠️  {total - passed} test(s) failed: {', '.join(failed_tests)}")
        
        # Check for critical API failures
        critical_apis = ["health_check", "mobile_conversations", "mobile_wallet"]
        failed_critical = [api for api in critical_apis if not results.get(api, False)]
        if failed_critical:
            print(f"🚨 CRITICAL: Core APIs failed: {', '.join(failed_critical)}")
    
    if passed == total:
        print(f"\n🎉 All 24 tests passed! The AfriWonder Mobile backend is fully functional.")
        return True
    else:
        print(f"\n⚠️  Backend testing completed with {total - passed} failures out of {total} total tests.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)