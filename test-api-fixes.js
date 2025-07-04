#!/usr/bin/env node

/**
 * Quick test for API fixes
 */

const BASE_URL = "http://localhost:4113";

async function testPositionsAPI() {
  console.log("🧪 Testing fixed positions API...");
  
  try {
    const response = await fetch(`${BASE_URL}/api/strike/positions`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log("✅ Positions API working!");
      console.log(`📋 Found ${result.data.length} positions`);
      console.log(`📋 Message: ${result.message}`);
      return true;
    } else {
      console.log("❌ Positions API failed:", result);
      return false;
    }
  } catch (error) {
    console.error("❌ Positions API error:", error.message);
    return false;
  }
}

async function testTradingAPI() {
  console.log("\n🧪 Testing trading API with better error handling...");
  
  const testAddress = "addr1q82j3cnhky8u0w4wa0ntsgeypraf24jxz5qr6wgwcy97u7t8pvpwk4ker5z2lmfsjlvx0y2tex68ahdwql9xkm9urxks9n2nl8";
  
  try {
    const tradeRequest = {
      userId: "test-user",
      walletAddress: testAddress,
      walletType: "direct",
      action: "open",
      side: "Long",
      pair: "ADA/USD",
      size: 5, // Small test size
      leverage: 1.5
    };

    const response = await fetch(`${BASE_URL}/api/strike/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tradeRequest)
    });

    const result = await response.json();
    
    console.log(`📡 Response status: ${response.status}`);
    console.log(`📋 Result:`, {
      success: result.success,
      error: result.error,
      message: result.message,
      explanation: result.details?.explanation
    });
    
    // Even if trade fails, we want to see improved error messages
    if (result.details?.explanation) {
      console.log("✅ Enhanced error handling working!");
      return true;
    } else if (result.success) {
      console.log("✅ Trade API working!");
      return true;
    } else {
      console.log("⚠️ Trade failed but error handling needs improvement");
      return false;
    }
    
  } catch (error) {
    console.error("❌ Trading API error:", error.message);
    return false;
  }
}

async function runQuickTests() {
  console.log("🚀 Quick API Fixes Test\n");
  
  const results = {
    positions: await testPositionsAPI(),
    trading: await testTradingAPI()
  };
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log("🎉 API fixes working correctly!");
  } else {
    console.log("⚠️ Some issues remain");
  }
}

runQuickTests().catch(console.error);
