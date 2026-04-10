#!/usr/bin/env python3
"""
AfriWonder Backend API Test Suite
Tests all backend endpoints as specified in the review request
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://afriwonder-preview.preview.emergentagent.com/api"

class AfriWonderAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.access_token = None
        self.refresh_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, params: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        
        # Add auth header if token available
        if self.access_token and headers is None:
            headers = {}
        if self.access_token:
            headers = headers or {}
            headers["Authorization"] = f"Bearer {self.access_token}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers, params=params, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers, params=params, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, params=params, timeout=30)
            else:
                return False, f"Unsupported method: {method}", 0
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, str(e), 0
    
    def test_health_check(self):
        """Test health check endpoint"""
        success, data, status = self.make_request("GET", "/health")
        
        if success and isinstance(data, dict) and data.get("status") == "ok":
            self.log_test("Health Check", True, f"Status: {status}, Service: {data.get('service', 'Unknown')}")
        else:
            self.log_test("Health Check", False, f"Status: {status}", data)
    
    def test_register(self):
        """Test user registration"""
        register_data = {
            "firstName": "Test",
            "lastName": "User",
            "email": "test@afriwonder.com",
            "phone": "+22370000000",
            "password": "test123456",
            "country": "ML"
        }
        
        success, data, status = self.make_request("POST", "/auth/register", register_data)
        
        if success and isinstance(data, dict) and "user" in data and "accessToken" in data:
            self.log_test("User Registration", True, f"Status: {status}, User ID: {data['user'].get('id', 'Unknown')}")
            # Store tokens for later tests
            self.access_token = data.get("accessToken")
            self.refresh_token = data.get("refreshToken")
        else:
            self.log_test("User Registration", False, f"Status: {status}", data)
    
    def test_login(self):
        """Test user login with mock user"""
        login_data = {
            "email": "aminata@afriwonder.com",
            "password": "password123"
        }
        
        success, data, status = self.make_request("POST", "/auth/login", login_data)
        
        if success and isinstance(data, dict) and "user" in data and "accessToken" in data:
            self.log_test("User Login", True, f"Status: {status}, User: {data['user'].get('firstName', 'Unknown')}")
            # Store tokens for authenticated tests
            self.access_token = data.get("accessToken")
            self.refresh_token = data.get("refreshToken")
        else:
            self.log_test("User Login", False, f"Status: {status}", data)
    
    def test_get_me(self):
        """Test get current user endpoint"""
        if not self.access_token:
            self.log_test("Get Current User", False, "No access token available")
            return
        
        success, data, status = self.make_request("GET", "/auth/me")
        
        if success and isinstance(data, dict) and "id" in data:
            self.log_test("Get Current User", True, f"Status: {status}, User: {data.get('firstName', 'Unknown')} {data.get('lastName', '')}")
        else:
            self.log_test("Get Current User", False, f"Status: {status}", data)
    
    def test_refresh_token(self):
        """Test token refresh"""
        if not self.refresh_token:
            self.log_test("Refresh Token", False, "No refresh token available")
            return
        
        refresh_data = {
            "refreshToken": self.refresh_token
        }
        
        success, data, status = self.make_request("POST", "/auth/refresh", refresh_data)
        
        if success and isinstance(data, dict) and "accessToken" in data:
            self.log_test("Refresh Token", True, f"Status: {status}, New token received")
            self.access_token = data.get("accessToken")
            self.refresh_token = data.get("refreshToken", self.refresh_token)
        else:
            self.log_test("Refresh Token", False, f"Status: {status}", data)
    
    def test_video_feed(self):
        """Test video feed endpoint"""
        success, data, status = self.make_request("GET", "/videos/feed", params={"page": 1, "limit": 10})
        
        if success and isinstance(data, dict) and "videos" in data:
            videos_count = len(data["videos"])
            self.log_test("Video Feed", True, f"Status: {status}, Videos: {videos_count}")
        else:
            self.log_test("Video Feed", False, f"Status: {status}", data)
    
    def test_get_video(self):
        """Test get specific video"""
        video_id = "v1"  # From mock data
        success, data, status = self.make_request("GET", f"/videos/{video_id}")
        
        if success and isinstance(data, dict) and "id" in data:
            self.log_test("Get Video", True, f"Status: {status}, Video: {data.get('title', 'Unknown')}")
        else:
            self.log_test("Get Video", False, f"Status: {status}", data)
    
    def test_like_video(self):
        """Test like video endpoint (requires auth)"""
        if not self.access_token:
            self.log_test("Like Video", False, "No access token available")
            return
        
        video_id = "v1"
        success, data, status = self.make_request("POST", f"/videos/{video_id}/like")
        
        if success and isinstance(data, dict) and "liked" in data:
            self.log_test("Like Video", True, f"Status: {status}, Likes: {data.get('likes', 0)}")
        else:
            self.log_test("Like Video", False, f"Status: {status}", data)
    
    def test_get_comments(self):
        """Test get video comments"""
        video_id = "v1"
        success, data, status = self.make_request("GET", f"/videos/{video_id}/comments")
        
        if success and isinstance(data, dict) and "comments" in data:
            comments_count = len(data["comments"])
            self.log_test("Get Comments", True, f"Status: {status}, Comments: {comments_count}")
        else:
            self.log_test("Get Comments", False, f"Status: {status}", data)
    
    def test_add_comment(self):
        """Test add comment endpoint (requires auth)"""
        if not self.access_token:
            self.log_test("Add Comment", False, "No access token available")
            return
        
        video_id = "v1"
        comment_data = {
            "text": "Super vidéo!"
        }
        
        success, data, status = self.make_request("POST", f"/videos/{video_id}/comment", comment_data)
        
        if success and isinstance(data, dict) and "text" in data:
            self.log_test("Add Comment", True, f"Status: {status}, Comment: {data.get('text', '')}")
        else:
            self.log_test("Add Comment", False, f"Status: {status}", data)
    
    def test_trending_videos(self):
        """Test trending videos endpoint"""
        success, data, status = self.make_request("GET", "/videos/trending")
        
        if success and isinstance(data, dict) and "hashtags" in data and "videos" in data:
            hashtags_count = len(data["hashtags"])
            videos_count = len(data["videos"])
            self.log_test("Trending Videos", True, f"Status: {status}, Hashtags: {hashtags_count}, Videos: {videos_count}")
        else:
            self.log_test("Trending Videos", False, f"Status: {status}", data)
    
    def test_search_videos(self):
        """Test search videos"""
        success, data, status = self.make_request("GET", "/search", params={"q": "mali", "type": "videos"})
        
        if success and isinstance(data, dict) and "results" in data:
            results_count = len(data["results"])
            self.log_test("Search Videos", True, f"Status: {status}, Results: {results_count}")
        else:
            self.log_test("Search Videos", False, f"Status: {status}", data)
    
    def test_search_users(self):
        """Test search users"""
        success, data, status = self.make_request("GET", "/search", params={"q": "aminata", "type": "users"})
        
        if success and isinstance(data, dict) and "results" in data:
            results_count = len(data["results"])
            self.log_test("Search Users", True, f"Status: {status}, Results: {results_count}")
        else:
            self.log_test("Search Users", False, f"Status: {status}", data)
    
    def test_marketplace_products(self):
        """Test get marketplace products"""
        success, data, status = self.make_request("GET", "/marketplace/products")
        
        if success and isinstance(data, dict) and "products" in data:
            products_count = len(data["products"])
            self.log_test("Marketplace Products", True, f"Status: {status}, Products: {products_count}")
        else:
            self.log_test("Marketplace Products", False, f"Status: {status}", data)
    
    def test_get_product(self):
        """Test get specific product"""
        product_id = "p1"  # From mock data
        success, data, status = self.make_request("GET", f"/marketplace/products/{product_id}")
        
        if success and isinstance(data, dict) and "id" in data:
            self.log_test("Get Product", True, f"Status: {status}, Product: {data.get('name', 'Unknown')}")
        else:
            self.log_test("Get Product", False, f"Status: {status}", data)
    
    def test_get_cart(self):
        """Test get cart (requires auth)"""
        if not self.access_token:
            self.log_test("Get Cart", False, "No access token available")
            return
        
        success, data, status = self.make_request("GET", "/marketplace/cart")
        
        if success and isinstance(data, dict):
            items_count = len(data.get("items", []))
            self.log_test("Get Cart", True, f"Status: {status}, Items: {items_count}")
        else:
            self.log_test("Get Cart", False, f"Status: {status}", data)
    
    def test_add_to_cart(self):
        """Test add to cart (requires auth)"""
        if not self.access_token:
            self.log_test("Add to Cart", False, "No access token available")
            return
        
        cart_data = {
            "productId": "p1",
            "quantity": 2
        }
        
        success, data, status = self.make_request("POST", "/marketplace/cart/add", cart_data)
        
        if success and isinstance(data, dict) and "items" in data:
            items_count = len(data["items"])
            total = data.get("total", 0)
            self.log_test("Add to Cart", True, f"Status: {status}, Items: {items_count}, Total: {total}")
        else:
            self.log_test("Add to Cart", False, f"Status: {status}", data)
    
    def test_orange_money_payment(self):
        """Test Orange Money payment initiation (requires auth)"""
        if not self.access_token:
            self.log_test("Orange Money Payment", False, "No access token available")
            return
        
        # Note: The endpoint expects individual parameters, not a JSON body
        payment_data = {
            "phone": "+22370123456",
            "amount": 25000,
            "order_id": "TEST001"
        }
        
        success, data, status = self.make_request("POST", "/payments/orange-money/initiate", params=payment_data)
        
        if success and isinstance(data, dict) and "transactionId" in data:
            self.log_test("Orange Money Payment", True, f"Status: {status}, Transaction ID: {data.get('transactionId', 'Unknown')}")
        else:
            self.log_test("Orange Money Payment", False, f"Status: {status}", data)
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AfriWonder Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Health check
        self.test_health_check()
        
        # Authentication tests
        print("🔐 Authentication Tests")
        print("-" * 30)
        self.test_register()
        self.test_login()  # This will set tokens for subsequent tests
        self.test_get_me()
        self.test_refresh_token()
        
        # Video tests
        print("🎥 Video Tests")
        print("-" * 30)
        self.test_video_feed()
        self.test_get_video()
        self.test_like_video()
        self.test_get_comments()
        self.test_add_comment()
        self.test_trending_videos()
        
        # Search tests
        print("🔍 Search Tests")
        print("-" * 30)
        self.test_search_videos()
        self.test_search_users()
        
        # Marketplace tests
        print("🛒 Marketplace Tests")
        print("-" * 30)
        self.test_marketplace_products()
        self.test_get_product()
        self.test_get_cart()
        self.test_add_to_cart()
        
        # Payment tests
        print("💳 Payment Tests")
        print("-" * 30)
        self.test_orange_money_payment()
        
        # Summary
        print("=" * 60)
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"📊 Test Summary")
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   - {result['test']}: {result['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = AfriWonderAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)