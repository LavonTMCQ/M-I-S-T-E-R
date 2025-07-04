#!/usr/bin/env node

/**
 * Test Script for Corrected Strike Finance Integration
 * 
 * This script tests the updated MISTER integration with the corrected
 * Strike Finance API format that we just implemented.
 */

const BASE_URL = "http://localhost:4113"; // Bridge server URL

/**
 * Test the corrected Strike Finance integration via bridge server
 */
async function testCorrectedIntegration() {
  console.log("🚀 Testing Corrected Strike Finance Integration...\n");

  // Test wallet address that worked in our previous tests
  const testAddress = "addr1q82j3cnhky8u0w4wa0ntsgeypraf24jxz5qr6wgwcy97u7t8pvpwk4ker5z2lmfsjlvx0y2tex68ahdwql9xkm9urxks9n2nl8";

  try {
    // Test 1: Execute a trade via the bridge server
    console.log("🧪 Test 1: Execute trade via bridge server...");
    
    const tradeRequest = {
      userId: "test-user",
      walletAddress: testAddress,
      walletType: "direct", // Direct trading mode
      action: "open",
      side: "Long",
      pair: "ADA/USD",
      size: 25, // 25 ADA position
      leverage: 2,
      stopLoss: 0.40,
      takeProfit: 0.60
    };

    console.log("📋 Trade Request:", JSON.stringify(tradeRequest, null, 2));

    const response = await fetch(`${BASE_URL}/api/strike/trade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tradeRequest)
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log("✅ SUCCESS! Trade executed successfully:");
      console.log(JSON.stringify(result, null, 2));
      
      if (result.data && result.data.cbor) {
        console.log("\n🎉 CBOR transaction received - ready for wallet signing!");
        console.log(`📋 CBOR length: ${result.data.cbor.length} characters`);
      }
      
      return result;
    } else {
      const errorText = await response.text();
      console.error("❌ Trade failed:", errorText);
      return null;
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    return null;
  }
}

/**
 * Test wallet registration for direct trading
 */
async function testWalletRegistration() {
  console.log("\n🧪 Test 2: Wallet registration for direct trading...");

  const testAddress = "addr1q82j3cnhky8u0w4wa0ntsgeypraf24jxz5qr6wgwcy97u7t8pvpwk4ker5z2lmfsjlvx0y2tex68ahdwql9xkm9urxks9n2nl8";
  const testStakeAddress = "stake1u8rphunzxm9lr4m688peqmnthmap35yt38rgvaqgsk5jcrqdr2vuc";

  try {
    const registrationRequest = {
      walletAddress: testAddress,
      stakeAddress: testStakeAddress,
      walletType: "direct",
      balance: 1000000000, // 1000 ADA in lovelace
      handle: "$testuser"
    };

    console.log("📋 Registration Request:", JSON.stringify(registrationRequest, null, 2));

    const response = await fetch(`${BASE_URL}/api/wallet/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationRequest)
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log("✅ SUCCESS! Wallet registered successfully:");
      console.log(JSON.stringify(result, null, 2));
      return result;
    } else {
      const errorText = await response.text();
      console.error("❌ Registration failed:", errorText);
      return null;
    }

  } catch (error) {
    console.error("❌ Registration test failed:", error.message);
    return null;
  }
}

/**
 * Test Strike Finance API health check
 */
async function testAPIHealth() {
  console.log("\n🧪 Test 3: Strike Finance API health check...");

  try {
    const response = await fetch(`${BASE_URL}/api/strike/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log("✅ SUCCESS! API health check passed:");
      console.log(JSON.stringify(result, null, 2));
      return result;
    } else {
      const errorText = await response.text();
      console.error("❌ Health check failed:", errorText);
      return null;
    }

  } catch (error) {
    console.error("❌ Health check test failed:", error.message);
    return null;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log("=" .repeat(80));
  console.log("🧪 MISTER Strike Finance Integration Tests");
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
    walletRegistration: await testWalletRegistration(),
    apiHealth: await testAPIHealth(),
    tradeExecution: await testCorrectedIntegration()
  };

  // Summary
  console.log("\n" + "=" .repeat(80));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=" .repeat(80));

  const passed = Object.values(results).filter(r => r !== null).length;
  const total = Object.keys(results).length;

  console.log(`✅ Tests Passed: ${passed}/${total}`);
  console.log(`❌ Tests Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log("\n🎉 ALL TESTS PASSED! Strike Finance integration is working correctly.");
    console.log("🚀 Ready for direct trading implementation!");
  } else {
    console.log("\n⚠️  Some tests failed. Check the logs above for details.");
  }

  console.log("\n📋 Next Steps:");
  console.log("1. ✅ Strike Finance API format corrected");
  console.log("2. ✅ Bridge server updated");
  console.log("3. ✅ Integration tested");
  console.log("4. 🔄 Ready to implement frontend direct trading");
  console.log("5. 🔄 Ready to test with Mastra Strike Agent");
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testCorrectedIntegration,
  testWalletRegistration,
  testAPIHealth,
  runTests
};
