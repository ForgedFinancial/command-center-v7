#!/usr/bin/env python3
"""
Openclaw Integration Test Script
Tests all webhook endpoints to verify integration is working
"""

import requests
import json
import time
from datetime import datetime

# Configuration
API_URL = "https://76.13.126.53"
API_KEY = "107077d472faf7fa8fe4ca31fb34483b89c7712a75d484a3c2575c4a6115e630"

# Disable SSL warnings for self-signed cert
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def print_test(name):
    """Print test header"""
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"{'='*60}")

def print_result(response):
    """Print response"""
    print(f"Status: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")
    print()

def test_health():
    """Test health endpoint (no auth required)"""
    print_test("Health Check")
    response = requests.get(f"{API_URL}/api/health", verify=False)
    print_result(response)
    return response.status_code == 200

def test_progress():
    """Test progress update endpoint"""
    print_test("Progress Update")

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "taskId": "test_task_001",
        "status": "working",
        "message": "Analyzing carrier rates - 3 of 5 complete",
        "progress": 60
    }

    response = requests.post(
        f"{API_URL}/api/openclaw/progress",
        headers=headers,
        json=payload,
        verify=False
    )

    print_result(response)
    return response.status_code == 200

def test_completion():
    """Test task completion endpoint"""
    print_test("Task Completion")

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "taskId": "test_task_001",
        "result": "Research completed successfully. Found 5 IUL carriers with competitive rates.",
        "documents": [
            {
                "title": "IUL Carrier Research - Test Report",
                "content": """# IUL Carrier Research

## Executive Summary
Completed analysis of 5 major IUL carriers for 65yo male client profile.

## Top Carriers
1. **Pacific Life** - Best overall value
   - Premium: $8,400/year
   - Assumed rate: 6.5%

2. **AIG** - Strong guarantees
   - Premium: $8,650/year
   - Assumed rate: 6.2%

3. **Nationwide** - Most affordable
   - Premium: $8,200/year
   - Assumed rate: 6.0%

## Recommendation
Pacific Life offers the optimal combination of competitive pricing and growth potential.

*Test report generated: {}*
""".format(datetime.now().isoformat()),
                "type": "report"
            }
        ],
        "confidence": 95,
        "timeSpent": 180,
        "aiModel": "openclaw-v2",
        "nextActions": [
            "Request formal illustration from Pacific Life",
            "Draft client presentation email",
            "Schedule follow-up call"
        ]
    }

    response = requests.post(
        f"{API_URL}/api/openclaw/complete",
        headers=headers,
        json=payload,
        verify=False
    )

    print_result(response)
    return response.status_code == 200

def test_email_draft():
    """Test email draft completion"""
    print_test("Email Draft Completion")

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "taskId": "test_task_002",
        "result": "Email draft created for client follow-up regarding IUL policy options.",
        "documents": [
            {
                "title": "Client Follow-Up Email - Test",
                "content": """Subject: Your IUL Policy Options - Next Steps

Dear John,

Thank you for your interest in Index Universal Life insurance. Based on our conversation, I've researched several carriers and found excellent options that align with your retirement income goals.

Pacific Life emerged as the top choice, offering a competitive premium of $8,400/year with strong guarantees and a 6.5% assumed growth rate. I've prepared a detailed comparison of the top 5 carriers for your review.

Would you be available for a 30-minute call this week to discuss these options? I'd like to walk you through the features and help you make the best decision for your family's future.

Best regards,
Danny
Forged Financial
(555) 123-4567 | danny@forgedfinancial.com""",
                "type": "email_draft"
            }
        ],
        "confidence": 88,
        "timeSpent": 120,
        "aiModel": "claude-opus-4",
        "nextActions": [
            "Schedule call with client",
            "Prepare Pacific Life formal illustration"
        ]
    }

    response = requests.post(
        f"{API_URL}/api/openclaw/complete",
        headers=headers,
        json=payload,
        verify=False
    )

    print_result(response)
    return response.status_code == 200

def test_error_recoverable():
    """Test recoverable error reporting"""
    print_test("Recoverable Error")

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "taskId": "test_task_003",
        "error": "API rate limit exceeded",
        "details": "Carrier comparison API returned 429. Will retry in 60 seconds.",
        "recoverable": True,
        "suggestedAction": "Wait 60 seconds and reassign task"
    }

    response = requests.post(
        f"{API_URL}/api/openclaw/error",
        headers=headers,
        json=payload,
        verify=False
    )

    print_result(response)
    return response.status_code == 200

def test_error_nonrecoverable():
    """Test non-recoverable error reporting"""
    print_test("Non-Recoverable Error")

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "taskId": "test_task_004",
        "error": "Insufficient information to complete task",
        "details": "Client date of birth is required for IUL quote but not provided in task description.",
        "recoverable": True,
        "suggestedAction": "Add client DOB to task description and reassign"
    }

    response = requests.post(
        f"{API_URL}/api/openclaw/error",
        headers=headers,
        json=payload,
        verify=False
    )

    print_result(response)
    return response.status_code == 200

def test_poll():
    """Test polling for events"""
    print_test("Poll for Events")

    since = datetime.utcnow().isoformat() + 'Z'
    response = requests.get(
        f"{API_URL}/api/poll?since=2026-02-12T00:00:00Z",
        verify=False
    )

    print_result(response)

    if response.status_code == 200:
        data = response.json()
        print(f"📊 Events in queue: {data.get('count', 0)}")
        if data.get('updates'):
            print(f"Recent events:")
            for event in data['updates'][:3]:
                print(f"  - {event.get('type')}: {event.get('action')}")

    return response.status_code == 200

def test_invalid_auth():
    """Test invalid authentication"""
    print_test("Invalid Authentication (should fail)")

    headers = {
        "Authorization": "Bearer INVALID_KEY",
        "Content-Type": "application/json"
    }

    payload = {
        "taskId": "test_task_999",
        "result": "This should fail"
    }

    response = requests.post(
        f"{API_URL}/api/openclaw/complete",
        headers=headers,
        json=payload,
        verify=False
    )

    print_result(response)
    return response.status_code == 401  # Should be unauthorized

def run_all_tests():
    """Run all integration tests"""
    print("\n" + "🤖 " * 30)
    print("OPENCLAW INTEGRATION TEST SUITE")
    print("🤖 " * 30)

    tests = [
        ("Health Check", test_health),
        ("Progress Update", test_progress),
        ("Task Completion (Report)", test_completion),
        ("Task Completion (Email Draft)", test_email_draft),
        ("Recoverable Error", test_error_recoverable),
        ("Non-Recoverable Error", test_error_nonrecoverable),
        ("Poll Events", test_poll),
        ("Invalid Auth (Security)", test_invalid_auth)
    ]

    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
            time.sleep(1)  # Brief pause between tests
        except Exception as e:
            print(f"❌ Error in {name}: {e}")
            results.append((name, False))

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")

    print(f"\nResults: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Integration is working correctly.")
        print("\n📋 Next steps:")
        print("1. Review the test events in Command Center")
        print("2. Check that tasks appear in Review column")
        print("3. Verify browser notifications are working")
        print("4. Begin processing real tasks!")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
        print("Common issues:")
        print("- Incorrect API key")
        print("- Server not running (check: systemctl status cc-api)")
        print("- Network connectivity")

    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
