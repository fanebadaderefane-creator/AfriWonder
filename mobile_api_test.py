#!/usr/bin/env python3
"""
AfriWonder Mobile API Testing Suite
Tests the new messaging and wallet APIs with MongoDB integration
"""

import requests
import json
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
BACKEND_URL = "https://afriwonder-preview.preview.emergentagent.com"
JWT_SECRET = "afriwonder-secret-key-change-in-production"

def create_test_token(user_id="test-user-123"):
    """Create a test JWT token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def make_request(method, endpoint, headers=None, json_data=None, params=None):
    """Make HTTP request with error handling"""
    url = f"{BACKEND_URL}{endpoint}"
    try:
        response = requests.request(method, url, headers=headers, json=json_data, params=params, timeout=30)
        return response
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed for {method} {endpoint}: {e}")
        return None

def test_health_check():
    """Test health check endpoint"""
    print("\n🔍 Testing Health Check...")
    response = make_request("GET", "/api/health")
    
    if response is None:
        return False
        
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Health check passed: {data}")
        return True
    else:
        print(f"❌ Health check failed: {response.status_code} - {response.text}")
        return False

def test_conversations_api():
    """Test messaging/conversations API"""
    print("\n🔍 Testing Conversations API...")
    token = create_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    results = []
    
    # Test 1: Get conversations (should seed demo data for new user)
    print("  Testing GET /api/mobile/conversations...")
    response = make_request("GET", "/api/mobile/conversations", headers=headers)
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success") and "conversations" in data.get("data", {}):
            print(f"  ✅ Get conversations passed: Found {len(data['data']['conversations'])} conversations")
            results.append(True)
        else:
            print(f"  ❌ Get conversations failed: Invalid response format")
            results.append(False)
    else:
        print(f"  ❌ Get conversations failed: {response.status_code if response else 'No response'}")
        results.append(False)
    
    # Test 2: Create new conversation
    print("  Testing POST /api/mobile/conversations...")
    conv_data = {
        "participant_ids": ["user-abc"],
        "name": "Test Conversation",
        "is_group": False
    }
    response = make_request("POST", "/api/mobile/conversations", headers=headers, json_data=conv_data)
    conversation_id = None
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success") and "id" in data.get("data", {}):
            conversation_id = data["data"]["id"]
            print(f"  ✅ Create conversation passed: ID {conversation_id}")
            results.append(True)
        else:
            print(f"  ❌ Create conversation failed: Invalid response format")
            results.append(False)
    else:
        print(f"  ❌ Create conversation failed: {response.status_code if response else 'No response'}")
        results.append(False)
    
    # Test 3: Get messages for conversation (use created conversation or demo one)
    if not conversation_id:
        # Try to get a conversation ID from the first test
        response = make_request("GET", "/api/mobile/conversations", headers=headers)
        if response and response.status_code == 200:
            data = response.json()
            conversations = data.get("data", {}).get("conversations", [])
            if conversations:
                conversation_id = conversations[0].get("id")
    
    if conversation_id:
        print(f"  Testing GET /api/mobile/conversations/{conversation_id}/messages...")
        response = make_request("GET", f"/api/mobile/conversations/{conversation_id}/messages", headers=headers)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success") and "messages" in data.get("data", {}):
                print(f"  ✅ Get messages passed: Found {len(data['data']['messages'])} messages")
                results.append(True)
            else:
                print(f"  ❌ Get messages failed: Invalid response format")
                results.append(False)
        else:
            print(f"  ❌ Get messages failed: {response.status_code if response else 'No response'}")
            results.append(False)
        
        # Test 4: Send message
        print(f"  Testing POST /api/mobile/conversations/{conversation_id}/messages...")
        message_data = {"content": "Hello from test!", "type": "text"}
        response = make_request("POST", f"/api/mobile/conversations/{conversation_id}/messages", headers=headers, json_data=message_data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success") and "id" in data.get("data", {}):
                print(f"  ✅ Send message passed: Message ID {data['data']['id']}")
                results.append(True)
            else:
                print(f"  ❌ Send message failed: Invalid response format")
                results.append(False)
        else:
            print(f"  ❌ Send message failed: {response.status_code if response else 'No response'}")
            results.append(False)
    else:
        print("  ⚠️ Skipping message tests - no conversation ID available")
        results.extend([False, False])
    
    return all(results)

def test_wallet_api():
    """Test wallet API"""
    print("\n🔍 Testing Wallet API...")
    token = create_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    results = []
    
    # Test 1: Get wallet (should auto-create with 25000 FCFA)
    print("  Testing GET /api/mobile/wallet...")
    response = make_request("GET", "/api/mobile/wallet", headers=headers)
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success") and "wallet" in data.get("data", {}):
            wallet = data["data"]["wallet"]
            balance = wallet.get("balance", 0)
            print(f"  ✅ Get wallet passed: Balance {balance} {wallet.get('currency', 'FCFA')}")
            results.append(True)
        else:
            print(f"  ❌ Get wallet failed: Invalid response format")
            results.append(False)
    else:
        print(f"  ❌ Get wallet failed: {response.status_code if response else 'No response'}")
        results.append(False)
    
    # Test 2: Top up wallet
    print("  Testing POST /api/mobile/wallet/topup...")
    topup_data = {
        "amount": 5000,
        "phone": "+22370123456",
        "provider": "orange-money"
    }
    response = make_request("POST", "/api/mobile/wallet/topup", headers=headers, json_data=topup_data)
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success") and "balance" in data.get("data", {}):
            new_balance = data["data"]["balance"]
            print(f"  ✅ Wallet topup passed: New balance {new_balance}")
            results.append(True)
        else:
            print(f"  ❌ Wallet topup failed: Invalid response format")
            results.append(False)
    else:
        print(f"  ❌ Wallet topup failed: {response.status_code if response else 'No response'}")
        results.append(False)
    
    # Test 3: Transfer money
    print("  Testing POST /api/mobile/wallet/transfer...")
    transfer_data = {
        "recipient_phone": "+22370654321",
        "amount": 1000,
        "description": "Test transfer"
    }
    response = make_request("POST", "/api/mobile/wallet/transfer", headers=headers, json_data=transfer_data)
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success") and "balance" in data.get("data", {}):
            new_balance = data["data"]["balance"]
            print(f"  ✅ Money transfer passed: New balance {new_balance}")
            results.append(True)
        else:
            print(f"  ❌ Money transfer failed: Invalid response format")
            results.append(False)
    else:
        print(f"  ❌ Money transfer failed: {response.status_code if response else 'No response'}")
        results.append(False)
    
    # Test 4: Get transaction history
    print("  Testing GET /api/mobile/wallet/transactions...")
    response = make_request("GET", "/api/mobile/wallet/transactions", headers=headers)
    if response and response.status_code == 200:
        data = response.json()
        if data.get("success") and "transactions" in data.get("data", {}):
            transactions = data["data"]["transactions"]
            print(f"  ✅ Get transactions passed: Found {len(transactions)} transactions")
            results.append(True)
        else:
            print(f"  ❌ Get transactions failed: Invalid response format")
            results.append(False)
    else:
        print(f"  ❌ Get transactions failed: {response.status_code if response else 'No response'}")
        results.append(False)
    
    return all(results)

def test_authentication():
    """Test authentication requirements"""
    print("\n🔍 Testing Authentication...")
    
    # Test without token
    print("  Testing endpoint without token...")
    response = make_request("GET", "/api/mobile/conversations")
    if response is not None and response.status_code == 401:
        print("  ✅ Authentication required: Correctly rejected request without token")
        return True
    else:
        status_code = response.status_code if response else 'No response'
        print(f"  ❌ Authentication failed: Expected 401, got {status_code}")
        if response:
            print(f"      Response text: {response.text}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting AfriWonder Mobile API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    
    test_results = {}
    
    # Run all tests
    test_results["health_check"] = test_health_check()
    test_results["authentication"] = test_authentication()
    test_results["conversations"] = test_conversations_api()
    test_results["wallet"] = test_wallet_api()
    
    # Summary
    print("\n" + "="*50)
    print("📊 TEST SUMMARY")
    print("="*50)
    
    passed = sum(test_results.values())
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Mobile APIs are working correctly.")
        return True
    else:
        print("⚠️ Some tests failed. Check the details above.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)