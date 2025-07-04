#!/usr/bin/env node

/**
 * Strike Finance API Debug Tool
 * 
 * This script investigates the Strike Finance API to identify authentication
 * requirements, correct request formats, and potential issues.
 */

// Using built-in fetch API (Node.js 18+)

// Test wallet addresses (from documentation examples)
const TEST_ADDRESSES = [
  'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf', // From docs
  'addr1q8rphunzxm9lr4m688peqmnthmap35yt38rgvaqgsk5jcrqdr2vuc8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf', // Variation
];

const STRIKE_BASE_URL = 'https://app.strikefinance.org';

/**
 * Test the getPositions endpoint (known to work)
 */
async function testGetPositions(address) {
  console.log(`\n🔍 Testing getPositions for address: ${address.substring(0, 20)}...`);
  
  try {
    const response = await fetch(`${STRIKE_BASE_URL}/api/perpetuals/getPositions?address=${address}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MISTER-Debug-Tool/1.0',
      }
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📡 Response Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ getPositions Success:`, JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.log(`❌ getPositions Error:`, errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error(`❌ getPositions Exception:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Test the openPosition endpoint with various configurations
 */
async function testOpenPosition(address, config = {}) {
  const {
    leverage = 2,
    side = 'Long',
    collateralAmount = 1000000, // 1 ADA in lovelace
    positionSize = 2000000, // 2 ADA in lovelace
    enteredPrice = 0.45,
    headers = {}
  } = config;

  console.log(`\n🔍 Testing openPosition for address: ${address.substring(0, 20)}...`);
  console.log(`📋 Config:`, { leverage, side, collateralAmount, positionSize, enteredPrice });

  const requestBody = {
    request: {
      bech32Address: address,
      leverage: leverage,
      position: side,
      asset: {
        policyId: "",
        assetName: ""
      },
      collateralAmount: collateralAmount,
      positionSize: positionSize,
      enteredPrice: enteredPrice,
      positionType: side
    }
  };

  console.log(`📋 Request Body:`, JSON.stringify(requestBody, null, 2));

  try {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'MISTER-Debug-Tool/1.0',
    };

    const response = await fetch(`${STRIKE_BASE_URL}/api/perpetuals/openPosition`, {
      method: 'POST',
      headers: { ...defaultHeaders, ...headers },
      body: JSON.stringify(requestBody)
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📡 Response Headers:`, Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log(`📋 Raw Response:`, responseText);

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log(`✅ openPosition Success:`, JSON.stringify(data, null, 2));
        return { success: true, data };
      } catch (parseError) {
        console.log(`⚠️ Response not JSON:`, parseError.message);
        return { success: true, data: responseText };
      }
    } else {
      console.log(`❌ openPosition Error:`, responseText);
      return { success: false, error: responseText, status: response.status };
    }
  } catch (error) {
    console.error(`❌ openPosition Exception:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Test with different header configurations
 */
async function testWithDifferentHeaders(address) {
  console.log(`\n🔧 Testing different header configurations...`);

  const headerConfigs = [
    {
      name: 'Basic',
      headers: {}
    },
    {
      name: 'With Origin/Referer',
      headers: {
        'Origin': 'https://app.strikefinance.org',
        'Referer': 'https://app.strikefinance.org/',
      }
    },
    {
      name: 'With CORS Headers',
      headers: {
        'Origin': 'https://app.strikefinance.org',
        'Referer': 'https://app.strikefinance.org/',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      }
    },
    {
      name: 'Browser-like',
      headers: {
        'Origin': 'https://app.strikefinance.org',
        'Referer': 'https://app.strikefinance.org/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      }
    }
  ];

  for (const config of headerConfigs) {
    console.log(`\n🧪 Testing with ${config.name} headers...`);
    const result = await testOpenPosition(address, { 
      headers: config.headers,
      collateralAmount: 500000, // Smaller amount for testing
      positionSize: 1000000
    });
    
    if (result.success) {
      console.log(`✅ ${config.name} headers worked!`);
      return result;
    } else {
      console.log(`❌ ${config.name} headers failed:`, result.error);
    }
  }
}

/**
 * Test different request field variations to identify the missing field
 */
async function testFieldVariations(address) {
  console.log(`\n🧪 Testing field variations to identify missing field...`);

  const baseRequest = {
    bech32Address: address,
    leverage: 2,
    position: "Long",
    asset: {
      policyId: "",
      assetName: ""
    },
    collateralAmount: 500000,
    positionSize: 1000000,
    enteredPrice: 0.45,
    positionType: "Long"
  };

  // Test variations with additional fields that might be required
  const variations = [
    {
      name: "Base Request",
      request: { request: baseRequest }
    },
    {
      name: "With stopLoss/takeProfit",
      request: {
        request: {
          ...baseRequest,
          stopLoss: 0.4,
          takeProfit: 0.6
        }
      }
    },
    {
      name: "With outRef",
      request: {
        request: {
          ...baseRequest,
          outRef: {
            txHash: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
            outputIndex: 0
          }
        }
      }
    },
    {
      name: "With additional fields",
      request: {
        request: {
          ...baseRequest,
          timestamp: Date.now(),
          userId: "test-user",
          sessionId: "test-session"
        }
      }
    },
    {
      name: "Minimal required fields only",
      request: {
        request: {
          bech32Address: address,
          leverage: 2,
          position: "Long",
          asset: {
            policyId: "",
            assetName: ""
          },
          collateralAmount: 500000,
          positionSize: 1000000,
          enteredPrice: 0.45
        }
      }
    }
  ];

  for (const variation of variations) {
    console.log(`\n🔬 Testing: ${variation.name}`);
    console.log(`📋 Request:`, JSON.stringify(variation.request, null, 2));

    try {
      const response = await fetch(`${STRIKE_BASE_URL}/api/perpetuals/openPosition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(variation.request)
      });

      const responseText = await response.text();
      console.log(`📡 Status: ${response.status}`);
      console.log(`📋 Response: ${responseText}`);

      if (response.ok) {
        console.log(`✅ ${variation.name} WORKED!`);
        return variation;
      }
    } catch (error) {
      console.error(`❌ ${variation.name} failed:`, error.message);
    }
  }

  return null;
}

/**
 * Main debug function
 */
async function debugStrikeAPI() {
  console.log('🚀 Strike Finance API Debug Tool Starting...\n');
  console.log('📋 Base URL:', STRIKE_BASE_URL);
  console.log('📋 Test Addresses:', TEST_ADDRESSES.map(addr => addr.substring(0, 20) + '...'));

  for (const address of TEST_ADDRESSES) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Testing with address: ${address}`);
    console.log(`${'='.repeat(80)}`);

    // First test getPositions (should work)
    const positionsResult = await testGetPositions(address);
    
    if (positionsResult.success) {
      console.log(`✅ getPositions works for this address`);

      // Test field variations to identify missing field
      const workingVariation = await testFieldVariations(address);

      if (workingVariation) {
        console.log(`🎉 Found working configuration: ${workingVariation.name}`);
        break; // Exit the loop if we find a working configuration
      }

      // If no variation worked, test headers as fallback
      console.log(`\n🔧 No field variation worked, testing headers...`);
      await testWithDifferentHeaders(address);

    } else {
      console.log(`❌ getPositions failed for this address, skipping openPosition tests`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('🏁 Debug session complete');
  console.log(`${'='.repeat(80)}`);
}

// Run the debug tool
if (require.main === module) {
  debugStrikeAPI().catch(console.error);
}

module.exports = {
  testGetPositions,
  testOpenPosition,
  testWithDifferentHeaders,
  debugStrikeAPI
};
