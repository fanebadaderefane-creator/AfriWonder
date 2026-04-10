#!/usr/bin/env python3
"""
AfriWonder Mobile Backend API Testing
Tests the new complementary APIs added to the backend
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
    print("TESTING EXISTING APIs")
    print("="*60)
    
    results["health_check"] = test_api(
        "GET", "/api/health", 
        description="Health check endpoint (no auth required)"
    )
    
    # Test 2: Mobile Conversations (existing)
    results["mobile_conversations"] = test_api(
        "GET", "/api/mobile/conversations",
        description="Get user conversations (existing API)"
    )
    
    # Test 3: Mobile Wallet (existing)
    results["mobile_wallet"] = test_api(
        "GET", "/api/mobile/wallet",
        description="Get user wallet (existing API)"
    )
    
    # NEW APIs Testing
    print("\n" + "="*60)
    print("TESTING NEW PROFILE APIs")
    print("="*60)
    
    # Test 4: Get Profile (new)
    results["get_profile"] = test_api(
        "GET", "/api/mobile/profile",
        description="Get user extended profile (NEW API)"
    )
    
    # Test 5: Update Profile (new)
    profile_data = {
        "full_name": "Test User AfriWonder",
        "bio": "Testing the new profile API from automated tests",
        "city": "Bamako",
        "country": "Mali",
        "phone": "+223 70 12 34 56"
    }
    results["update_profile"] = test_api(
        "PUT", "/api/mobile/profile",
        data=profile_data,
        description="Update user profile (NEW API)"
    )
    
    print("\n" + "="*60)
    print("TESTING NEW STORIES APIs")
    print("="*60)
    
    # Test 6: Get Stories (new)
    results["get_stories"] = test_api(
        "GET", "/api/mobile/stories",
        description="Get active stories with auto-seeding (NEW API)"
    )
    
    # Test 7: Create Story (new)
    story_data = {
        "media_url": "https://picsum.photos/400/700?random=999",
        "type": "image",
        "caption": "Test story from automated testing",
        "duration": 7
    }
    results["create_story"] = test_api(
        "POST", "/api/mobile/stories",
        data=story_data,
        description="Create new story (NEW API)"
    )
    
    print("\n" + "="*60)
    print("TESTING NEW CROWDFUNDING APIs")
    print("="*60)
    
    # Test 8: Get Crowdfunding Projects (new)
    results["get_crowdfunding"] = test_api(
        "GET", "/api/mobile/crowdfunding",
        description="List crowdfunding projects with auto-seeding (NEW API)"
    )
    
    # Test 9: Create Crowdfunding Project (new)
    project_data = {
        "title": "Test Project - Automated Testing",
        "description": "This is a test project created by automated testing to verify the crowdfunding API functionality.",
        "goal_amount": 100000,
        "category": "education",
        "currency": "XOF",
        "image_url": "https://picsum.photos/600/400?random=888"
    }
    results["create_crowdfunding"] = test_api(
        "POST", "/api/mobile/crowdfunding",
        data=project_data,
        description="Create crowdfunding project (NEW API)"
    )
    
    # Test 10: Get My Crowdfunding Projects (new)
    results["get_my_crowdfunding"] = test_api(
        "GET", "/api/mobile/crowdfunding/my/projects",
        description="Get user's own crowdfunding projects (NEW API)"
    )
    
    # Test 11: Get Project Details (new) - We'll use a demo project ID
    # First, let's get the projects to find a valid project ID
    print("\n🔍 Getting project ID for detailed testing...")
    try:
        response = requests.get(f"{BASE_URL}/api/mobile/crowdfunding", headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("data", {}).get("projects"):
                project_id = data["data"]["projects"][0]["id"]
                print(f"   Found project ID: {project_id}")
                
                # Test project details
                results["get_project_details"] = test_api(
                    "GET", f"/api/mobile/crowdfunding/{project_id}",
                    description=f"Get project details for ID: {project_id} (NEW API)"
                )
                
                # Test contribution
                contribution_data = {
                    "amount": 5000,
                    "payment_method": "orange-money",
                    "anonymous": False
                }
                results["contribute_to_project"] = test_api(
                    "POST", f"/api/mobile/crowdfunding/{project_id}/contribute",
                    data=contribution_data,
                    description=f"Contribute to project {project_id} (NEW API)"
                )
            else:
                print("❌ No projects found for detailed testing")
                results["get_project_details"] = False
                results["contribute_to_project"] = False
        else:
            print(f"❌ Failed to get projects: {response.status_code}")
            results["get_project_details"] = False
            results["contribute_to_project"] = False
    except Exception as e:
        print(f"❌ Error getting project details: {e}")
        results["get_project_details"] = False
        results["contribute_to_project"] = False
    
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
        print(f"   {test_name}: {status}")
    
    # Categorize results
    existing_apis = ["health_check", "mobile_conversations", "mobile_wallet"]
    profile_apis = ["get_profile", "update_profile"]
    stories_apis = ["get_stories", "create_story"]
    crowdfunding_apis = ["get_crowdfunding", "create_crowdfunding", "get_my_crowdfunding", 
                        "get_project_details", "contribute_to_project"]
    
    print(f"\n📈 Results by Category:")
    
    existing_passed = sum(1 for api in existing_apis if results.get(api, False))
    print(f"   Existing APIs: {existing_passed}/{len(existing_apis)} passed")
    
    profile_passed = sum(1 for api in profile_apis if results.get(api, False))
    print(f"   Profile APIs: {profile_passed}/{len(profile_apis)} passed")
    
    stories_passed = sum(1 for api in stories_apis if results.get(api, False))
    print(f"   Stories APIs: {stories_passed}/{len(stories_apis)} passed")
    
    crowdfunding_passed = sum(1 for api in crowdfunding_apis if results.get(api, False))
    print(f"   Crowdfunding APIs: {crowdfunding_passed}/{len(crowdfunding_apis)} passed")
    
    if passed == total:
        print(f"\n🎉 All tests passed! The AfriWonder Mobile backend is working correctly.")
        return True
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please check the failed endpoints.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)