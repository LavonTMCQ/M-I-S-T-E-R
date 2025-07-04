#!/usr/bin/env node

/**
 * Strike Finance API Client - CORRECTED VERSION
 * 
 * Based on the new documentation from Strike team.
 * Key fixes:
 * 1. NO enteredPrice field
 * 2. address instead of bech32Address  
 * 3. collateralAmount in ADA, not lovelace
 * 4. enteredPositionTime is REQUIRED
 * 5. No positionSize or positionType fields
 */

const BASE_URL = "https://app.strikefinance.org/api/perpetuals";

/**
 * Asset class
 */
class Asset {
  constructor() {
    this.policyId = "";
    this.assetName = "";
  }
}

/**
 * CreatePerpetualRequest - CORRECTED based on new docs
 */
class CreatePerpetualRequest {
  constructor(address, collateralAmount, leverage, position, stopLossPrice = null, takeProfitPrice = null) {
    this.address = address; // Changed from bech32Address
    this.asset = new Asset();
    this.collateralAmount = collateralAmount; // In ADA, not lovelace!
    this.leverage = leverage;
    this.position = position;
    this.enteredPositionTime = Date.now(); // REQUIRED - current timestamp
    
    // Optional fields
    if (stopLossPrice !== null) {
      this.stopLossPrice = stopLossPrice;
    }
    if (takeProfitPrice !== null) {
      this.takeProfitPrice = takeProfitPrice;
    }
  }
}

/**
 * Opens a new perpetual position - CORRECTED
 */
async function openPosition(address, collateralAmountADA, leverage, position, stopLoss = null, takeProfit = null) {
  const endpoint = `${BASE_URL}/openPosition`;
  
  // Create the corrected request structure
  const requestPayload = {
    request: new CreatePerpetualRequest(address, collateralAmountADA, leverage, position, stopLoss, takeProfit)
  };
  
  const jsonPayload = JSON.stringify(requestPayload, null, 2);

  console.log("--- Opening Position (CORRECTED) ---");
  console.log("Sending request to:", endpoint);
  console.log("Payload:\n", jsonPayload);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log("Raw Response:", responseText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    console.log("✅ SUCCESS! Position is being opened.");
    console.log("Response JSON:\n", responseText);
    return JSON.parse(responseText);

  } catch (error) {
    console.error("❌ Error opening position:", error.message);
    throw error;
  }
}

/**
 * Test the corrected API implementation
 */
async function testCorrectedAPI() {
  console.log("🚀 Testing Strike Finance API with CORRECTED implementation...\n");

  // Test addresses
  const addresses = [
    "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf", // Documentation example
    "addr1q82j3cnhky8u0w4wa0ntsgeypraf24jxz5qr6wgwcy97u7t8pvpwk4ker5z2lmfsjlvx0y2tex68ahdwql9xkm9urxks9n2nl8", // Java example
  ];

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Testing with address ${i + 1}: ${address.substring(0, 20)}...`);
    console.log(`${'='.repeat(80)}`);

    try {
      // Test 1: Basic position with corrected parameters
      console.log("🧪 Test 1: Basic Long position (corrected format)...");
      const result1 = await openPosition(
        address,
        50, // 50 ADA collateral (in ADA, not lovelace!)
        2,  // 2x leverage
        "Long"
      );
      
      if (result1) {
        console.log("🎉 SUCCESS! API is working with corrected format!");
        return result1;
      }

    } catch (error) {
      console.error("❌ Test 1 failed:", error.message);
      
      try {
        // Test 2: Smaller position
        console.log("\n🧪 Test 2: Smaller position...");
        const result2 = await openPosition(
          address,
          10, // 10 ADA collateral
          1.5, // 1.5x leverage
          "Long"
        );
        
        if (result2) {
          console.log("🎉 SUCCESS! API is working with smaller position!");
          return result2;
        }

      } catch (error2) {
        console.error("❌ Test 2 failed:", error2.message);
        
        try {
          // Test 3: With stop loss and take profit
          console.log("\n🧪 Test 3: With stop loss and take profit...");
          const result3 = await openPosition(
            address,
            25, // 25 ADA collateral
            2,  // 2x leverage
            "Long",
            0.40, // Stop loss at $0.40
            0.60  // Take profit at $0.60
          );
          
          if (result3) {
            console.log("🎉 SUCCESS! API is working with stop/take profit!");
            return result3;
          }

        } catch (error3) {
          console.error("❌ Test 3 failed:", error3.message);
          console.log(`❌ All tests failed for address ${i + 1}`);
        }
      }
    }
  }

  console.log("\n❌ All tests failed with all addresses");
  return null;
}

/**
 * Compare old vs new request format
 */
function compareFormats() {
  console.log("\n📋 COMPARISON: Old vs New Request Format");
  console.log("=" .repeat(60));
  
  console.log("\n❌ OLD (INCORRECT) Format:");
  const oldFormat = {
    request: {
      bech32Address: "addr1q...",
      leverage: 2,
      position: "Long",
      asset: { policyId: "", assetName: "" },
      collateralAmount: 50000000, // In lovelace
      positionSize: 100000000,    // In lovelace
      enteredPrice: 4500,         // Scaled price
      positionType: "Long"
    }
  };
  console.log(JSON.stringify(oldFormat, null, 2));
  
  console.log("\n✅ NEW (CORRECT) Format:");
  const newFormat = {
    request: {
      address: "addr1q...",
      asset: { policyId: "", assetName: "" },
      collateralAmount: 50,       // In ADA
      leverage: 2,
      position: "Long",
      enteredPositionTime: Date.now() // POSIX timestamp
    }
  };
  console.log(JSON.stringify(newFormat, null, 2));
  
  console.log("\n🔍 Key Differences:");
  console.log("1. ❌ Removed: enteredPrice (doesn't exist!)");
  console.log("2. ❌ Removed: positionSize (not in new API)");
  console.log("3. ❌ Removed: positionType (redundant)");
  console.log("4. ✅ Changed: bech32Address → address");
  console.log("5. ✅ Changed: collateralAmount now in ADA, not lovelace");
  console.log("6. ✅ Added: enteredPositionTime (REQUIRED)");
}

// Export functions
module.exports = {
  openPosition,
  testCorrectedAPI,
  compareFormats
};

// Run tests if executed directly
if (require.main === module) {
  compareFormats();
  testCorrectedAPI().catch(console.error);
}
