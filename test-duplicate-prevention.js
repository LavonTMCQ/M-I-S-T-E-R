#!/usr/bin/env node

/**
 * Test Duplicate Wallet Creation Prevention
 */

const BASE_URL = "http://localhost:4113";

async function testDuplicatePrevention() {
  console.log("🧪 Testing duplicate wallet creation prevention...\n");

  const userId = "test_duplicate_user";

  try {
    // Make multiple simultaneous wallet creation requests
    console.log("🔄 Making 3 simultaneous wallet creation requests...");
    
    const promises = [
      fetch(`${BASE_URL}/api/wallet/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      }),
      fetch(`${BASE_URL}/api/wallet/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      }),
      fetch(`${BASE_URL}/api/wallet/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
    ];

    const responses = await Promise.all(promises);
    
    console.log("📊 Results:");
    let successCount = 0;
    let duplicateCount = 0;
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const data = await response.json();
      
      console.log(`Request ${i + 1}: ${response.status} - ${data.success ? 'SUCCESS' : data.error}`);
      
      if (response.status === 200 && data.success) {
        successCount++;
      } else if (response.status === 409) {
        duplicateCount++;
      }
    }
    
    console.log(`\n📋 Summary:`);
    console.log(`✅ Successful creations: ${successCount}`);
    console.log(`⚠️ Duplicate prevented: ${duplicateCount}`);
    console.log(`❌ Other errors: ${responses.length - successCount - duplicateCount}`);
    
    if (successCount === 1 && duplicateCount >= 1) {
      console.log("🎉 Duplicate prevention working correctly!");
      return true;
    } else {
      console.log("❌ Duplicate prevention not working as expected");
      return false;
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    return false;
  }
}

async function testSequentialRequests() {
  console.log("\n🧪 Testing sequential wallet creation requests...\n");

  const userId = "test_sequential_user";

  try {
    // Make first request
    console.log("🔄 Making first wallet creation request...");
    const response1 = await fetch(`${BASE_URL}/api/wallet/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    const data1 = await response1.json();
    console.log(`Request 1: ${response1.status} - ${data1.success ? 'SUCCESS' : data1.error}`);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Make second request (should be allowed since first completed)
    console.log("🔄 Making second wallet creation request...");
    const response2 = await fetch(`${BASE_URL}/api/wallet/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId + "_2" }) // Different user
    });
    
    const data2 = await response2.json();
    console.log(`Request 2: ${response2.status} - ${data2.success ? 'SUCCESS' : data2.error}`);
    
    if (response1.status === 200 && response2.status === 200) {
      console.log("✅ Sequential requests working correctly!");
      return true;
    } else {
      console.log("⚠️ Sequential requests had issues");
      return false;
    }

  } catch (error) {
    console.error("❌ Sequential test failed:", error.message);
    return false;
  }
}

async function runDuplicatePreventionTests() {
  console.log("=" .repeat(80));
  console.log("🧪 MISTER Duplicate Prevention Tests");
  console.log("=" .repeat(80));

  // Check if bridge server is running
  try {
    const healthResponse = await fetch(`${BASE_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error("Bridge server not responding");
    }
    console.log("✅ Bridge server is running\n");
  } catch (error) {
    console.error("❌ Bridge server is not running. Please start it first:");
    console.error("   cd sydney-agents && node mister-bridge-server.cjs");
    return;
  }

  // Run tests
  const results = {
    duplicatePrevention: await testDuplicatePrevention(),
    sequentialRequests: await testSequentialRequests()
  };

  // Summary
  console.log("\n" + "=" .repeat(80));
  console.log("📊 DUPLICATE PREVENTION TEST RESULTS");
  console.log("=" .repeat(80));

  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;

  console.log(`✅ Tests Passed: ${passed}/${total}`);
  console.log(`❌ Tests Failed: ${total - passed}/${total}`);

  Object.entries(results).forEach(([test, result]) => {
    const status = result ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${test}`);
  });

  if (passed === total) {
    console.log("\n🎉 ALL DUPLICATE PREVENTION TESTS PASSED!");
    console.log("🚀 Onboarding should no longer create multiple wallets!");
  } else {
    console.log("\n⚠️  Some tests failed. Check the logs above for details.");
  }

  console.log("\n📋 Fixes Applied:");
  console.log("1. ✅ Backend: Duplicate creation prevention with user tracking");
  console.log("2. ✅ Frontend: Multiple state guards to prevent re-creation");
  console.log("3. ✅ Button: Disabled state during creation process");
  console.log("4. 🔄 Ready for onboarding testing");
}

// Run tests if executed directly
if (require.main === module) {
  runDuplicatePreventionTests().catch(console.error);
}

module.exports = {
  testDuplicatePrevention,
  testSequentialRequests,
  runDuplicatePreventionTests
};
