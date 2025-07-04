#!/usr/bin/env node

/**
 * Test Managed Wallet Lookup
 */

const BASE_URL = "http://localhost:4113";

async function testManagedWalletLookup() {
  console.log("🧪 Testing managed wallet lookup...\n");

  // Test with your actual main wallet address
  const mainWalletAddress = "01d528e277b10fc7baaeebe6b8232408fa95564615003d390ec10bee79670b02eb56d91d04afed3097d867914bc9b47eddae07ca6b6cbc19ad";

  try {
    console.log("🔍 Looking up managed wallets for main wallet:", mainWalletAddress.substring(0, 20) + "...");
    
    const response = await fetch(`${BASE_URL}/api/wallets/managed/${mainWalletAddress}`);
    const data = await response.json();
    
    console.log(`📡 Response status: ${response.status}`);
    console.log(`📋 Success: ${data.success}`);
    
    if (data.success) {
      console.log(`📋 Managed wallets found: ${data.data.managedWallets.length}`);
      
      data.data.managedWallets.forEach((wallet, index) => {
        console.log(`\n📱 Managed Wallet ${index + 1}:`);
        console.log(`   Address: ${wallet.address.substring(0, 20)}...`);
        console.log(`   Balance: ${wallet.balance} ADA`);
        console.log(`   Status: ${wallet.agentStatus}`);
        console.log(`   P&L: $${wallet.pnl}`);
      });
      
      if (data.data.managedWallets.length > 0) {
        console.log("\n✅ User has existing managed wallets - should go to selection page");
      } else {
        console.log("\n📝 No managed wallets found - should go to onboarding");
      }
    } else {
      console.log(`❌ Error: ${data.error}`);
    }
    
    return data.success;

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    return false;
  }
}

async function runManagedWalletLookupTest() {
  console.log("=" .repeat(80));
  console.log("🧪 MISTER Managed Wallet Lookup Test");
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

  // Run test
  const success = await testManagedWalletLookup();

  // Summary
  console.log("\n" + "=" .repeat(80));
  console.log("📊 MANAGED WALLET LOOKUP TEST RESULTS");
  console.log("=" .repeat(80));

  if (success) {
    console.log("✅ PASS - Managed wallet lookup working");
    console.log("\n🎉 NEW ROUTING FLOW READY!");
    console.log("📋 How it works now:");
    console.log("1. User connects main wallet");
    console.log("2. User selects 'Managed Trading'");
    console.log("3. System checks for existing managed wallets");
    console.log("4. If found: Goes to managed wallet selection page");
    console.log("5. If not found: Goes to onboarding to create first one");
    console.log("6. User can create multiple managed wallets");
    console.log("7. Each managed wallet has independent agent control");
  } else {
    console.log("❌ FAIL - Managed wallet lookup not working");
  }

  console.log("\n📋 Next Steps:");
  console.log("1. Test the new routing flow in the frontend");
  console.log("2. Connect your main wallet and select 'Managed Trading'");
  console.log("3. Should see managed wallet selection or onboarding");
}

// Run test if executed directly
if (require.main === module) {
  runManagedWalletLookupTest().catch(console.error);
}

module.exports = {
  testManagedWalletLookup,
  runManagedWalletLookupTest
};
