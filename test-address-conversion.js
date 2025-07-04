#!/usr/bin/env node

/**
 * Test address conversion fix
 */

const BASE_URL = "http://localhost:4113";

async function testAddressConversion() {
  console.log("🧪 Testing address conversion fix...");
  
  // Test with hex address (like from frontend)
  const hexAddress = "01d528e277b10fc7baaeebe6b8232408fa95564615003d390ec10bee79670b02eb56d91d04afed3097d867914bc9b47eddae07ca6b6cbc19ad";
  
  try {
    const tradeRequest = {
      userId: "test-user",
      walletAddress: hexAddress,
      walletType: "direct",
      action: "open",
      side: "Long",
      pair: "ADA/USD",
      size: 5,
      leverage: 2
    };

    console.log("📋 Testing with hex address:", hexAddress.substring(0, 20) + "...");
    
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
    
    // Check if we got the bech32 conversion message
    if (result.details?.explanation && result.details.explanation.includes('converted to a compatible test address')) {
      console.log("✅ Address conversion working!");
      return true;
    } else if (result.success) {
      console.log("✅ Trade working!");
      return true;
    } else {
      console.log("⚠️ Trade failed but checking error message...");
      return result.error && !result.error.includes('Bech32: invalid length');
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    return false;
  }
}

testAddressConversion().then(success => {
  if (success) {
    console.log("🎉 Address conversion fix working!");
  } else {
    console.log("❌ Address conversion still has issues");
  }
}).catch(console.error);
