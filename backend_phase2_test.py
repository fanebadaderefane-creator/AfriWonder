import requests
import sys
from datetime import datetime

class AfriWonderPhase2Tester:
    def __init__(self, base_url="https://afriwonder-audit.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, test_func):
        """Run a single test"""
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            result = test_func()
            if result:
                self.tests_passed += 1
                print(f"✅ Passed")
                return True
            else:
                print(f"❌ Failed")
                self.failed_tests.append(name)
                return False
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False

    def test_summary_score_82(self):
        """Test that summary returns overall_score of 82"""
        response = requests.get(f"{self.api_url}/audit/summary", timeout=10)
        if response.status_code != 200:
            print(f"   HTTP Error: {response.status_code}")
            return False
        
        data = response.json()
        score = data.get('data', {}).get('overall_score')
        print(f"   Overall Score: {score}")
        
        if score == 82:
            return True
        else:
            print(f"   Expected: 82, Got: {score}")
            return False

    def test_summary_readiness_78(self):
        """Test that summary returns production_readiness of 78"""
        response = requests.get(f"{self.api_url}/audit/summary", timeout=10)
        if response.status_code != 200:
            print(f"   HTTP Error: {response.status_code}")
            return False
        
        data = response.json()
        readiness = data.get('data', {}).get('production_readiness')
        print(f"   Production Readiness: {readiness}%")
        
        if readiness == 78:
            return True
        else:
            print(f"   Expected: 78, Got: {readiness}")
            return False

    def test_summary_screens_114(self):
        """Test that summary returns total_mobile_screens of 114"""
        response = requests.get(f"{self.api_url}/audit/summary", timeout=10)
        if response.status_code != 200:
            print(f"   HTTP Error: {response.status_code}")
            return False
        
        data = response.json()
        screens = data.get('data', {}).get('total_mobile_screens')
        print(f"   Total Mobile Screens: {screens}")
        
        if screens == 114:
            return True
        else:
            print(f"   Expected: 114, Got: {screens}")
            return False

    def test_implementations_count_13(self):
        """Test that implementations_done array has 13 items"""
        response = requests.get(f"{self.api_url}/audit/summary", timeout=10)
        if response.status_code != 200:
            print(f"   HTTP Error: {response.status_code}")
            return False
        
        data = response.json()
        implementations = data.get('data', {}).get('implementations_done', [])
        count = len(implementations)
        print(f"   Implementations Done: {count}")
        
        if count == 13:
            return True
        else:
            print(f"   Expected: 13, Got: {count}")
            return False

    def test_phase2_implementations_present(self):
        """Test that Phase 2 implementations are present in the list"""
        response = requests.get(f"{self.api_url}/audit/summary", timeout=10)
        if response.status_code != 200:
            print(f"   HTTP Error: {response.status_code}")
            return False
        
        data = response.json()
        implementations = data.get('data', {}).get('implementations_done', [])
        
        # Check for Phase 2 specific implementations
        phase2_features = [
            "Push notifications complet",
            "Abonnements AfriWonder+ Premium", 
            "Integration Agora SDK",
            "E2EE messagerie"
        ]
        
        found_features = []
        for feature in phase2_features:
            for impl in implementations:
                if feature in impl:
                    found_features.append(feature)
                    break
        
        print(f"   Found Phase 2 features: {len(found_features)}/{len(phase2_features)}")
        for feature in found_features:
            print(f"     ✓ {feature}")
        
        missing = [f for f in phase2_features if f not in found_features]
        if missing:
            print(f"   Missing features:")
            for feature in missing:
                print(f"     ✗ {feature}")
            return False
        
        return len(found_features) == len(phase2_features)

    def test_all_endpoints_accessible(self):
        """Test that all audit endpoints are accessible"""
        endpoints = [
            "audit",
            "audit/summary", 
            "audit/architecture",
            "audit/features",
            "audit/revenue",
            "audit/testing",
            "audit/security", 
            "audit/performance",
            "audit/priority"
        ]
        
        failed_endpoints = []
        for endpoint in endpoints:
            response = requests.get(f"{self.api_url}/{endpoint}", timeout=10)
            if response.status_code != 200:
                failed_endpoints.append(f"{endpoint} ({response.status_code})")
        
        if failed_endpoints:
            print(f"   Failed endpoints: {failed_endpoints}")
            return False
        else:
            print(f"   All {len(endpoints)} endpoints accessible")
            return True

def main():
    print("🚀 Starting AfriWonder Phase 2 Specific Tests")
    print("=" * 60)
    
    tester = AfriWonderPhase2Tester()
    
    # Run Phase 2 specific tests
    tests = [
        ("Score is 82/100", tester.test_summary_score_82),
        ("Production Readiness is 78%", tester.test_summary_readiness_78),
        ("Mobile Screens is 114", tester.test_summary_screens_114),
        ("Implementations count is 13", tester.test_implementations_count_13),
        ("Phase 2 features present", tester.test_phase2_implementations_present),
        ("All endpoints accessible", tester.test_all_endpoints_accessible)
    ]
    
    for test_name, test_func in tests:
        tester.run_test(test_name, test_func)
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Phase 2 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure}")
    else:
        print("\n✅ All Phase 2 tests passed!")
    
    print(f"\nTest completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())