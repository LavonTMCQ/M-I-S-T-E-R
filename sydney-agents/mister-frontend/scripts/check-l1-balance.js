#!/usr/bin/env node

console.log("🔍 Checking Hyperliquid L1 (Trading Layer) Balance\n");
console.log("=" .repeat(50));

const MAIN_WALLET = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74";

async function checkL1Balance() {
  try {
    // Check testnet L1
    console.log("📡 Checking Hyperliquid TESTNET L1...\n");
    
    const testnetResponse = await fetch('https://api.hyperliquid-testnet.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: MAIN_WALLET
      })
    });
    
    if (testnetResponse.ok) {
      const data = await testnetResponse.json();
      
      console.log(`💰 Testnet L1 Balance:`);
      console.log(`   Address: ${MAIN_WALLET}`);
      
      if (data && data.marginSummary) {
        const accountValue = parseFloat(data.marginSummary.accountValue || 0);
        const withdrawable = parseFloat(data.marginSummary.withdrawable || 0);
        
        console.log(`   Account Value: $${accountValue.toFixed(2)} Mock USDC`);
        console.log(`   Withdrawable: $${withdrawable.toFixed(2)} Mock USDC`);
        
        if (accountValue >= 1000) {
          console.log(`   ✅ You have 1000 Mock USDC on testnet!`);
        }
      } else if (data && data.balances) {
        // Alternative structure
        console.log(`   Balances:`, data.balances);
      } else {
        console.log(`   Response:`, JSON.stringify(data, null, 2));
      }
    }
    
    // Also check mainnet for comparison
    console.log("\n📡 Checking Hyperliquid MAINNET L1 (for reference)...\n");
    
    const mainnetResponse = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: MAIN_WALLET
      })
    });
    
    if (mainnetResponse.ok) {
      const data = await mainnetResponse.json();
      
      if (data && data.marginSummary) {
        const accountValue = parseFloat(data.marginSummary.accountValue || 0);
        console.log(`💰 Mainnet L1 Balance:`);
        console.log(`   Account Value: $${accountValue.toFixed(2)} USDC (real)`);
      }
    }
    
    console.log("\n" + "=" .repeat(50));
    console.log("📝 IMPORTANT: Getting HYPE for Gas\n");
    console.log("You have Mock USDC on L1 (trading layer) but need HYPE on EVM for gas.");
    console.log("");
    console.log("Options to get HYPE:");
    console.log("1. FAUCET: Usually gives free HYPE directly");
    console.log("   - Look for 'Faucet' button on testnet");
    console.log("   - Or 'Get Test Tokens' option");
    console.log("");
    console.log("2. SWAP: Some testnets let you swap Mock USDC for HYPE");
    console.log("   - Check if there's a 'Swap' feature");
    console.log("   - Or DEX on the testnet");
    console.log("");
    console.log("3. BRIDGE: Transfer from L1 to EVM");
    console.log("   - Look for 'Bridge' or 'Transfer'");
    console.log("   - Select 'To EVM' or 'To HyperEVM'");
    console.log("");
    console.log("Note: Mock USDC is for trading, HYPE is for gas fees (like ETH on Ethereum)");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkL1Balance().catch(console.error);