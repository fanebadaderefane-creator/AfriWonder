#!/usr/bin/env python3
"""
AfriChat Enhanced API Testing
Tests the NEW AfriChat Enhanced API endpoints for AfriWonder
"""

import os
import requests
import json
import uuid
from datetime import datetime

# Configuration — définir AFRIWONDER_API_BASE (ex. http://127.0.0.1:8000 ou URL de déploiement)
BASE_URL = os.environ.get("AFRIWONDER_API_BASE", "http://127.0.0.1:8000").rstrip("/")

def authenticate():
    """Authenticate and get JWT token"""
    print("🔐 Authenticating with AfriWonder backend...")
    
    auth_data = {
        "identifier": "abdoulayefane813@gmail.com",
        "password": "Mali@2025"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/proxy/auth/login", json=auth_data)
        print(f"   Auth Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Authentication failed: {response.text}")
            return None
            
        auth_response = response.json()
        print(f"   Auth Response: {json.dumps(auth_response, indent=2)}")
        
        # Try different token paths
        token = None
        if "data" in auth_response:
            if "accessToken" in auth_response["data"]:
                token = auth_response["data"]["accessToken"]
            elif "access_token" in auth_response["data"]:
                token = auth_response["data"]["access_token"]
            elif "data" in auth_response["data"] and "access_token" in auth_response["data"]["data"]:
                token = auth_response["data"]["data"]["access_token"]
        
        if token:
            print(f"✅ Authentication successful! Token: {token[:50]}...")
            return token
        else:
            print(f"❌ No access token found in response")
            return None
            
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None

def test_api(method, endpoint, data=None, expected_status=200, description="", headers=None):
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
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
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
                    print(f"   Data preview: {str(json_response['data'])[:100]}...")
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
    print("🚀 Starting AfriChat Enhanced API Tests")
    print(f"   Base URL: {BASE_URL}")
    
    # Step 1: Authenticate
    token = authenticate()
    if not token:
        print("❌ Cannot proceed without authentication")
        return False
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    results = {}
    test_data = {}
    
    print("\n" + "="*80)
    print("STEP 1: CREATE CONVERSATION AND MESSAGE FOR TESTING")
    print("="*80)
    
    # Create a conversation first
    conv_data = {
        "target_user_id": "test-user-123",
        "target_name": "Test User",
        "target_avatar": "https://i.pravatar.cc/150?img=1"
    }
    
    results["start_conversation"], conv_response = test_api(
        "POST", "/api/mobile/conversations/start",
        data=conv_data,
        headers=headers,
        description="Create conversation for testing"
    )
    
    if not results["start_conversation"] or not conv_response:
        print("❌ Cannot proceed without conversation")
        return False
    
    conv_id = conv_response["data"]["id"]
    test_data["conversation_id"] = conv_id
    print(f"📝 Stored conversation ID: {conv_id}")
    
    # Send a message in the conversation
    msg_data = {
        "content": "Hello test message",
        "type": "text"
    }
    
    results["send_message"], msg_response = test_api(
        "POST", f"/api/mobile/conversations/{conv_id}/messages",
        data=msg_data,
        headers=headers,
        description="Send message for testing"
    )
    
    if not results["send_message"] or not msg_response:
        print("❌ Cannot proceed without message")
        return False
    
    msg_id = msg_response["data"]["id"]
    test_data["message_id"] = msg_id
    print(f"📝 Stored message ID: {msg_id}")
    
    print("\n" + "="*80)
    print("STEP 2: TEST ALL NEW AFRICHAT ENHANCED APIs")
    print("="*80)
    
    # 1. React to message
    reaction_data = {"emoji": "👍"}
    results["react_to_message"], _ = test_api(
        "POST", f"/api/mobile/conversations/{conv_id}/messages/{msg_id}/react",
        data=reaction_data,
        headers=headers,
        description="1. React to message with emoji"
    )
    
    # 2. Get reactions
    results["get_reactions"], _ = test_api(
        "GET", f"/api/mobile/conversations/{conv_id}/messages/{msg_id}/reactions",
        headers=headers,
        description="2. Get message reactions"
    )
    
    # 3. Pin message
    results["pin_message"], _ = test_api(
        "POST", f"/api/mobile/conversations/{conv_id}/messages/{msg_id}/pin",
        headers=headers,
        description="3. Pin message"
    )
    
    # 4. Star message
    results["star_message"], _ = test_api(
        "POST", f"/api/mobile/conversations/{conv_id}/messages/{msg_id}/star",
        headers=headers,
        description="4. Star message"
    )
    
    # 5. Forward message (to same conversation for testing)
    forward_data = {"target_conversation_id": conv_id}
    results["forward_message"], _ = test_api(
        "POST", f"/api/mobile/conversations/{conv_id}/messages/{msg_id}/forward",
        data=forward_data,
        headers=headers,
        description="5. Forward message to same conversation"
    )
    
    # 6. Edit message
    edit_data = {"content": "Edited message content"}
    results["edit_message"], _ = test_api(
        "PUT", f"/api/mobile/conversations/{conv_id}/messages/{msg_id}",
        data=edit_data,
        headers=headers,
        description="6. Edit message content"
    )
    
    # 7. Get pinned messages
    results["get_pinned"], _ = test_api(
        "GET", f"/api/mobile/conversations/{conv_id}/pinned",
        headers=headers,
        description="7. Get pinned messages"
    )
    
    # 8. Get starred messages
    results["get_starred"], _ = test_api(
        "GET", "/api/mobile/starred-messages",
        headers=headers,
        description="8. Get all starred messages"
    )
    
    # 9. Delete message for me
    results["delete_message"], _ = test_api(
        "DELETE", f"/api/mobile/conversations/{conv_id}/messages/{msg_id}?delete_for=me",
        headers=headers,
        description="9. Delete message for me"
    )
    
    # 10. Test duplicate conversation detection
    results["duplicate_conversation"], dup_response = test_api(
        "POST", "/api/mobile/conversations/start",
        data=conv_data,
        headers=headers,
        description="10. Test duplicate conversation detection"
    )
    
    # Verify it returns the same conversation
    if results["duplicate_conversation"] and dup_response:
        returned_conv_id = dup_response["data"]["id"]
        if returned_conv_id == conv_id:
            print("   ✅ Duplicate detection working - returned existing conversation")
        else:
            print("   ❌ Duplicate detection failed - created new conversation")
            results["duplicate_conversation"] = False
    
    # ==================== SUMMARY ====================
    print("\n" + "="*80)
    print("AFRICHAT ENHANCED API TEST RESULTS")
    print("="*80)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    print(f"\n📊 Overall Results: {passed}/{total} tests passed")
    
    # Categorize results
    setup_apis = ["start_conversation", "send_message"]
    chat_apis = ["react_to_message", "get_reactions", "pin_message", "star_message", 
                "forward_message", "edit_message", "get_pinned", "get_starred", 
                "delete_message", "duplicate_conversation"]
    
    print(f"\n📈 Results by Category:")
    
    setup_passed = sum(1 for api in setup_apis if results.get(api, False))
    print(f"   Setup APIs (2): {setup_passed}/{len(setup_apis)} passed")
    
    chat_passed = sum(1 for api in chat_apis if results.get(api, False))
    print(f"   Chat Enhancement APIs (10): {chat_passed}/{len(chat_apis)} passed")
    
    print(f"\n📋 Detailed Results:")
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
    
    # Check for critical failures
    failed_tests = [name for name, result in results.items() if not result]
    if failed_tests:
        print(f"\n⚠️  {total - passed} test(s) failed: {', '.join(failed_tests)}")
        
        # Check for critical API failures
        critical_apis = ["start_conversation", "send_message"]
        failed_critical = [api for api in critical_apis if not results.get(api, False)]
        if failed_critical:
            print(f"🚨 CRITICAL: Setup APIs failed: {', '.join(failed_critical)}")
    
    if passed == total:
        print(f"\n🎉 All {total} AfriChat Enhanced API tests passed! The chat features are fully functional.")
        return True
    else:
        print(f"\n⚠️  AfriChat testing completed with {total - passed} failures out of {total} total tests.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)