#!/usr/bin/env node

/**
 * Strike Finance API Client - Java Equivalent
 * 
 * This implements the exact same logic as the Java client,
 * including the critical price scaling by 10,000 for precision.
 */

const BASE_URL = "https://app.strikefinance.org/api/perpetuals";

/**
 * Asset class equivalent
 */
class Asset {
  constructor() {
    this.policyId = "";
    this.assetName = "";
  }
}

/**
 * OutRef class equivalent
 */
class OutRef {
  constructor(txHash, outputIndex) {
    this.txHash = txHash;
    this.outputIndex = outputIndex;
  }
}

/**
 * OpenPositionRequest class equivalent
 */
class OpenPositionRequest {
  constructor(bech32Address, leverage, position, collateralAmount, positionSize, price) {
    this.request = {
      bech32Address: bech32Address,
      leverage: leverage,
      position: position,
      asset: new Asset(),
      collateralAmount: collateralAmount,
      positionSize: positionSize,
      // CRITICAL: Price scaling by 10,000 for precision (from Java docs)
      enteredPrice: Math.floor(price * 10000),
      positionType: position
    };
  }
}

/**
 * ClosePositionRequest class equivalent
 */
class ClosePositionRequest {
  constructor(address, txHash, outputIndex, positionSize, collateralAmount, positionSide) {
    this.request = {
      address: address,
      asset: new Asset(),
      outRef: new OutRef(txHash, outputIndex),
      positionSize: positionSize,
      positionType: positionSide,
      collateralAmount: collateralAmount,
      position: positionSide
    };
  }
}

/**
 * UpdatePositionRequest class equivalent
 */
class UpdatePositionRequest {
  constructor(address, txHash, outputIndex, stopLoss, takeProfit) {
    this.request = {
      address: address,
      asset: new Asset(),
      outRef: new OutRef(txHash, outputIndex),
      // Prices for stop-loss and take-profit also need to be scaled
      stopLossPrice: Math.floor(stopLoss * 10000),
      takeProfitPrice: Math.floor(takeProfit * 10000)
    };
  }
}

/**
 * Opens a new long or short perpetual position
 */
async function openPosition(address, leverage, positionSide, collateral, positionSize, price) {
  const endpoint = `${BASE_URL}/openPosition`;
  const requestPayload = new OpenPositionRequest(address, leverage, positionSide, collateral, positionSize, price);
  const jsonPayload = JSON.stringify(requestPayload, null, 2);

  console.log("--- Opening Position ---");
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

    console.log("✅ Success! Position is being opened.");
    console.log("Response JSON:\n", responseText);
    return JSON.parse(responseText);

  } catch (error) {
    console.error("❌ Error opening position:", error.message);
    throw error;
  }
}

/**
 * Closes an existing perpetual position
 */
async function closePosition(address, txHash, outputIndex, positionSize, collateral, positionSide) {
  const endpoint = `${BASE_URL}/closePosition`;
  const requestPayload = new ClosePositionRequest(address, txHash, outputIndex, positionSize, collateral, positionSide);
  const jsonPayload = JSON.stringify(requestPayload, null, 2);

  console.log("\n--- Closing Position ---");
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
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    console.log("✅ Success! Position is being closed.");
    console.log("Response JSON:\n", responseText);
    return JSON.parse(responseText);

  } catch (error) {
    console.error("❌ Error closing position:", error.message);
    throw error;
  }
}

/**
 * Updates the Stop Loss and Take Profit for an existing position
 */
async function updatePosition(address, txHash, outputIndex, stopLoss, takeProfit) {
  const endpoint = `${BASE_URL}/updatePosition`;
  const requestPayload = new UpdatePositionRequest(address, txHash, outputIndex, stopLoss, takeProfit);
  const jsonPayload = JSON.stringify(requestPayload, null, 2);

  console.log("\n--- Updating Position ---");
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
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    console.log("✅ Success! Position is being updated.");
    console.log("Response JSON:\n", responseText);
    return JSON.parse(responseText);

  } catch (error) {
    console.error("❌ Error updating position:", error.message);
    throw error;
  }
}

/**
 * Test the API with the Java equivalent implementation
 */
async function testStrikeAPI() {
  console.log("🚀 Testing Strike Finance API with Java-equivalent implementation...\n");

  // Test with multiple addresses
  const addresses = [
    "addr1q82j3cnhky8u0w4wa0ntsgeypraf24jxz5qr6wgwcy97u7t8pvpwk4ker5z2lmfsjlvx0y2tex68ahdwql9xkm9urxks9n2nl8", // Java example
    "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf", // Documentation example
  ];

  for (let i = 0; i < addresses.length; i++) {
    const myAddress = addresses[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Testing with address ${i + 1}: ${myAddress.substring(0, 20)}...`);
    console.log(`${'='.repeat(80)}`);

    try {
      // Test 1: Open a Position (same as Java example)
      // 3x Long on ADA with 33.33 ADA collateral and 100 ADA position size
      // Price is 0.559 (will be scaled to 5590)
      console.log("🧪 Test 1: Opening position with Java-equivalent parameters...");
      const result1 = await openPosition(myAddress, 3, "Long", 33333333, 100000000, 0.559);

      if (result1) {
        console.log("🎉 SUCCESS! Found working configuration!");
        break; // Exit if we find a working address
      }

    } catch (error) {
      console.error("❌ Test 1 failed:", error.message);

      try {
        // Test 2: Try with smaller amounts
        console.log("\n🧪 Test 2: Opening smaller position...");
        const result2 = await openPosition(myAddress, 2, "Long", 500000, 1000000, 0.45);

        if (result2) {
          console.log("🎉 SUCCESS! Found working configuration!");
          break;
        }

      } catch (error2) {
        console.error("❌ Test 2 failed:", error2.message);

        try {
          // Test 3: Try with different price scaling
          console.log("\n🧪 Test 3: Testing price scaling variations...");
          const result3 = await openPosition(myAddress, 2, "Long", 500000, 1000000, 0.4500);

          if (result3) {
            console.log("🎉 SUCCESS! Found working configuration!");
            break;
          }

        } catch (error3) {
          console.error("❌ Test 3 failed:", error3.message);
          console.log(`❌ All tests failed for address ${i + 1}`);
        }
      }
    }
  }

  console.log("\n🏁 Testing complete");
}

// Export functions for use in other modules
module.exports = {
  openPosition,
  closePosition,
  updatePosition,
  testStrikeAPI
};

// Run tests if this file is executed directly
if (require.main === module) {
  testStrikeAPI().catch(console.error);
}
