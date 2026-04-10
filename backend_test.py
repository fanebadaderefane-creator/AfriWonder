#!/usr/bin/env python3
"""
AfriWonder Mobile Backend API Testing
Tests all mobile API endpoints with focus on Send Message, Wallet TopUp, and Wallet Transfer
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://afriwonder-preview.preview.emergentagent.com"
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
            return False
            
        print(f"   Status: {response.status_code}")
        
        if response.status_code != expected_status:
            print(f"❌ Expected {expected_status}, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
        try:
            json_response = response.json()
            print(f"   Response format: {'✅ Valid JSON' if json_response else '❌ Invalid JSON'}")
            
            # Check if response has expected format
            if "success" in json_response and "data" in json_response:
                print(f"   Format check: ✅ Has success/data structure")
                if json_response.get("success"):
                    print(f"   Success: ✅ {json_response['success']}")
                else:
                    print(f"   Success: ❌ {json_response['success']}")
                    return False
            else:
                print(f"   Format check: ❌ Missing success/data structure")
                print(f"   Response keys: {list(json_response.keys())}")
                
            return True
            
        except json.JSONDecodeError:
            print(f"❌ Invalid JSON response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def main():
    print("🚀 Starting AfriWonder Mobile Backend API Tests")
    print(f"   Base URL: {BASE_URL}")
    print(f"   JWT Token: {JWT_TOKEN[:50]}...")
    
    results = {}
    
    # Test 1: Health Check (no auth required)
    print("\n" + "="*60)
    print("TESTING CORE APIs")
    print("="*60)
    
    results["health_check"] = test_api(
        "GET", "/api/health", 
        description="Health check endpoint (no auth required)"
    )
    
    # Test 2: Mobile Conversations (with auth)
    results["mobile_conversations"] = test_api(
        "GET", "/api/mobile/conversations",
        description="Get user conversations (requires JWT auth)"
    )
    
    # Test 3: Mobile Wallet (with auth)
    results["mobile_wallet"] = test_api(
        "GET", "/api/mobile/wallet",
        description="Get user wallet (requires JWT auth)"
    )
    
    # Test 4: Mobile Stories (with auth)
    results["mobile_stories"] = test_api(
        "GET", "/api/mobile/stories",
        description="Get user stories (requires JWT auth)"
    )
    
    # Test 5: Mobile Crowdfunding (with auth)
    results["mobile_crowdfunding"] = test_api(
        "GET", "/api/mobile/crowdfunding",
        description="Get crowdfunding projects (requires JWT auth)"
    )
    
    # Test 6: Mobile Profile (with auth)
    results["mobile_profile"] = test_api(
        "GET", "/api/mobile/profile",
        description="Get user profile (requires JWT auth)"
    )
    
    # PRIORITY TESTS - Focus on the three specific APIs mentioned
    print("\n" + "="*60)
    print("TESTING PRIORITY APIs (Send Message, Wallet TopUp, Wallet Transfer)")
    print("="*60)
    
    # Get conversation ID for message testing
    conv_id = None
    print("\n🔍 Getting conversation ID for message testing...")
    try:
        response = requests.get(f"{BASE_URL}/api/mobile/conversations", headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("data", {}).get("conversations"):
                conv_id = data["data"]["conversations"][0]["id"]
                print(f"   Found conversation ID: {conv_id}")
            else:
                print("❌ No conversations found")
        else:
            print(f"❌ Failed to get conversations: {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting conversations: {e}")
    
    # PRIORITY TEST 1: Send Message API
    if conv_id:
        message_data = {
            "content": "test message",
            "type": "text"
        }
        results["send_message"] = test_api(
            "POST", f"/api/mobile/conversations/{conv_id}/messages",
            data=message_data,
            description="🎯 PRIORITY: Send message to conversation"
        )
    else:
        print("❌ Cannot test send message - no conversation ID available")
        results["send_message"] = False
    
    # PRIORITY TEST 2: Wallet TopUp API
    topup_data = {
        "amount": 5000,
        "phone": "70123456",
        "provider": "orange-money"
    }
    results["wallet_topup"] = test_api(
        "POST", "/api/mobile/wallet/topup",
        data=topup_data,
        description="🎯 PRIORITY: Wallet top-up via Orange Money"
    )
    
    # PRIORITY TEST 3: Wallet Transfer API
    transfer_data = {
        "recipient_phone": "+22370123456",
        "amount": 1000,
        "description": "Test transfer",
        "payment_method": "orange-money"
    }
    results["wallet_transfer"] = test_api(
        "POST", "/api/mobile/wallet/transfer",
        data=transfer_data,
        description="🎯 PRIORITY: Money transfer to another user"
    )
    
    # Summary
    print("\n" + "="*60)
    print("TEST RESULTS SUMMARY")
    print("="*60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    print(f"\n📊 Overall Results: {passed}/{total} tests passed")
    
    print("\n📋 Detailed Results:")
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        priority_marker = "🎯 " if test_name in ["send_message", "wallet_topup", "wallet_transfer"] else "   "
        print(f"{priority_marker}{test_name}: {status}")
    
    # Categorize results
    core_apis = ["health_check", "mobile_conversations", "mobile_wallet", "mobile_stories", "mobile_crowdfunding", "mobile_profile"]
    priority_apis = ["send_message", "wallet_topup", "wallet_transfer"]
    
    print(f"\n📈 Results by Category:")
    
    core_passed = sum(1 for api in core_apis if results.get(api, False))
    print(f"   Core APIs: {core_passed}/{len(core_apis)} passed")
    
    priority_passed = sum(1 for api in priority_apis if results.get(api, False))
    print(f"   🎯 Priority APIs: {priority_passed}/{len(priority_apis)} passed")
    
    # Special focus on priority APIs
    print(f"\n🎯 PRIORITY API STATUS:")
    priority_status = {
        "send_message": "Send Message API (POST /api/mobile/conversations/{conv_id}/messages)",
        "wallet_topup": "Wallet TopUp API (POST /api/mobile/wallet/topup)",
        "wallet_transfer": "Wallet Transfer API (POST /api/mobile/wallet/transfer)"
    }
    
    for api_key, description in priority_status.items():
        status = "✅ WORKING" if results.get(api_key, False) else "❌ FAILED"
        print(f"   {description}: {status}")
    
    if passed == total:
        print(f"\n🎉 All tests passed! The AfriWonder Mobile backend is working correctly.")
        return True
    else:
        failed_tests = [name for name, result in results.items() if not result]
        print(f"\n⚠️  {total - passed} test(s) failed: {', '.join(failed_tests)}")
        
        # Check if any priority APIs failed
        failed_priority = [api for api in priority_apis if not results.get(api, False)]
        if failed_priority:
            print(f"🚨 CRITICAL: Priority APIs failed: {', '.join(failed_priority)}")
        
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)