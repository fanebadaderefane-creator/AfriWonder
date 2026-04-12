import requests
import sys
from datetime import datetime

class DetailedAuditTester:
    def __init__(self, base_url="https://afriwonder-audit.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def test_updated_score_and_data(self):
        """Test specific updated values mentioned in review request"""
        print("🔍 Testing Updated Score and Data Values...")
        
        try:
            # Test /api/audit endpoint for updated score and implementations_done
            audit_response = requests.get(f"{self.api_url}/audit", timeout=10)
            if audit_response.status_code != 200:
                self.failed_tests.append(f"Audit endpoint failed: {audit_response.status_code}")
                return False
            
            audit_data = audit_response.json()['data']
            summary = audit_data['summary']
            
            # Check updated score (should be 72, not 58)
            actual_score = summary['overall_score']
            if actual_score != 72:
                self.failed_tests.append(f"Score should be 72, got {actual_score}")
                print(f"❌ Score check failed: Expected 72, got {actual_score}")
                return False
            else:
                print(f"✅ Score correctly updated to 72")
            
            # Check updated production readiness (should be 65%)
            actual_readiness = summary['production_readiness']
            if actual_readiness != 65:
                self.failed_tests.append(f"Production readiness should be 65, got {actual_readiness}")
                print(f"❌ Production readiness check failed: Expected 65, got {actual_readiness}")
                return False
            else:
                print(f"✅ Production readiness correctly updated to 65%")
            
            # Check updated mobile screens (should be 112, not 108)
            actual_screens = summary['total_mobile_screens']
            if actual_screens != 112:
                self.failed_tests.append(f"Mobile screens should be 112, got {actual_screens}")
                print(f"❌ Mobile screens check failed: Expected 112, got {actual_screens}")
                return False
            else:
                print(f"✅ Mobile screens correctly updated to 112")
            
            # Check implementations_done array (should have 8 items)
            implementations = summary['implementations_done']
            if len(implementations) != 8:
                self.failed_tests.append(f"implementations_done should have 8 items, got {len(implementations)}")
                print(f"❌ Implementations array check failed: Expected 8 items, got {len(implementations)}")
                return False
            else:
                print(f"✅ implementations_done array has correct 8 items")
            
            self.tests_passed += 1
            return True
            
        except Exception as e:
            self.failed_tests.append(f"Updated data test error: {str(e)}")
            print(f"❌ Error testing updated data: {str(e)}")
            return False
        finally:
            self.tests_run += 1

    def test_summary_endpoint_specific_values(self):
        """Test /api/audit/summary endpoint for specific values"""
        print("\n🔍 Testing Summary Endpoint Specific Values...")
        
        try:
            response = requests.get(f"{self.api_url}/audit/summary", timeout=10)
            if response.status_code != 200:
                self.failed_tests.append(f"Summary endpoint failed: {response.status_code}")
                return False
            
            summary_data = response.json()['data']
            
            # Check production_readiness in summary endpoint
            actual_readiness = summary_data['production_readiness']
            if actual_readiness != 65:
                self.failed_tests.append(f"Summary endpoint production_readiness should be 65, got {actual_readiness}")
                print(f"❌ Summary production readiness check failed: Expected 65, got {actual_readiness}")
                return False
            else:
                print(f"✅ Summary endpoint production readiness correctly shows 65%")
            
            # Check overall_score in summary endpoint
            actual_score = summary_data['overall_score']
            if actual_score != 72:
                self.failed_tests.append(f"Summary endpoint overall_score should be 72, got {actual_score}")
                print(f"❌ Summary score check failed: Expected 72, got {actual_score}")
                return False
            else:
                print(f"✅ Summary endpoint score correctly shows 72")
            
            self.tests_passed += 1
            return True
            
        except Exception as e:
            self.failed_tests.append(f"Summary endpoint test error: {str(e)}")
            print(f"❌ Error testing summary endpoint: {str(e)}")
            return False
        finally:
            self.tests_run += 1

def main():
    print("🚀 Starting Detailed AfriWonder Audit Tests for Updated Data")
    print("=" * 60)
    
    tester = DetailedAuditTester()
    
    # Run specific tests for updated data
    tester.test_updated_score_and_data()
    tester.test_summary_endpoint_specific_values()
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Detailed Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure}")
    else:
        print("\n✅ All detailed tests passed!")
    
    print(f"\nTest completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())