import requests
import sys
from datetime import datetime

class AfriWonderAuditTester:
    def __init__(self, base_url="https://afriwonder-audit.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, endpoint, expected_keys=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Check if response has expected structure
                    if expected_keys:
                        missing_keys = []
                        for key in expected_keys:
                            if key not in data.get('data', {}):
                                missing_keys.append(key)
                        
                        if missing_keys:
                            print(f"❌ Failed - Missing keys: {missing_keys}")
                            self.failed_tests.append(f"{name}: Missing keys {missing_keys}")
                            return False
                    
                    self.tests_passed += 1
                    print(f"✅ Passed - Status: {response.status_code}")
                    print(f"   Response size: {len(str(data))} characters")
                    return True
                    
                except Exception as json_error:
                    print(f"❌ Failed - JSON parsing error: {str(json_error)}")
                    self.failed_tests.append(f"{name}: JSON parsing error")
                    return False
            else:
                print(f"❌ Failed - Status: {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append(f"{name}: HTTP {response.status_code}")
                return False

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "")

    def test_full_audit(self):
        """Test full audit data endpoint"""
        expected_keys = ["project_name", "audit_date", "summary", "architecture", 
                        "features_audit", "revenue_model", "testing_audit", 
                        "security_audit", "performance_audit", "priority_actions"]
        return self.run_test("Full Audit Data", "audit", expected_keys)

    def test_summary(self):
        """Test audit summary endpoint"""
        expected_keys = ["total_mobile_screens", "total_backend_routes", "overall_score"]
        return self.run_test("Audit Summary", "audit/summary", expected_keys)

    def test_architecture(self):
        """Test architecture audit endpoint"""
        expected_keys = ["score", "backend", "mobile_expo"]
        return self.run_test("Architecture Audit", "audit/architecture", expected_keys)

    def test_features(self):
        """Test features audit endpoint"""
        return self.run_test("Features Audit", "audit/features")

    def test_revenue(self):
        """Test revenue model endpoint"""
        expected_keys = ["title", "target_market", "sources", "projection"]
        return self.run_test("Revenue Model", "audit/revenue", expected_keys)

    def test_testing_audit(self):
        """Test testing audit endpoint"""
        expected_keys = ["score", "mobile_tests", "backend_tests"]
        return self.run_test("Testing Audit", "audit/testing", expected_keys)

    def test_security_audit(self):
        """Test security audit endpoint"""
        expected_keys = ["score", "strengths", "vulnerabilities"]
        return self.run_test("Security Audit", "audit/security", expected_keys)

    def test_performance_audit(self):
        """Test performance audit endpoint"""
        expected_keys = ["score", "strengths", "issues"]
        return self.run_test("Performance Audit", "audit/performance", expected_keys)

    def test_priority_actions(self):
        """Test priority actions endpoint"""
        return self.run_test("Priority Actions", "audit/priority")

def main():
    print("🚀 Starting AfriWonder Audit API Tests")
    print("=" * 50)
    
    tester = AfriWonderAuditTester()
    
    # Run all tests
    test_methods = [
        tester.test_root_endpoint,
        tester.test_full_audit,
        tester.test_summary,
        tester.test_architecture,
        tester.test_features,
        tester.test_revenue,
        tester.test_testing_audit,
        tester.test_security_audit,
        tester.test_performance_audit,
        tester.test_priority_actions
    ]
    
    for test_method in test_methods:
        test_method()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure}")
    else:
        print("\n✅ All tests passed!")
    
    print(f"\nTest completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())