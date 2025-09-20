#!/usr/bin/env node

import { ethers } from 'ethers';

console.log("🔍 Checking Main Wallet on HyperEVM Testnet\n");
console.log("=" .repeat(50));

const MAIN_WALLET = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74";

async function checkTestnet() {
  try {
    // Connect to testnet
    const provider = new ethers.JsonRpcProvider('https://rpc.hyperliquid-testnet.xyz/evm');
    
    // Get network info
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    console.log("📡 Connected to HyperEVM Testnet");
    console.log(`   Chain ID: ${network.chainId}`);
    console.log(`   Current Block: ${blockNumber}`);
    console.log("");
    
    // Check balance
    console.log("💰 Main Wallet Balance:");
    console.log(`   Address: ${MAIN_WALLET}`);
    
    const balance = await provider.getBalance(MAIN_WALLET);
    const formattedBalance = ethers.formatEther(balance);
    
    console.log(`   HYPE Balance: ${formattedBalance} HYPE`);
    
    if (parseFloat(formattedBalance) > 0) {
      console.log(`   ✅ HAS TESTNET FUNDS!`);
      console.log(`   You can deploy contracts with this wallet!`);
      
      // Estimate deployment cost
      const estimatedGas = 5000000; // Rough estimate for 3 contracts
      const gasPrice = await provider.getFeeData();
      const estimatedCost = ethers.formatEther(gasPrice.gasPrice * BigInt(estimatedGas));
      
      console.log(`\n   Estimated deployment cost: ~${estimatedCost} HYPE`);
      console.log(`   Your balance is ${parseFloat(formattedBalance) > parseFloat(estimatedCost) ? 'SUFFICIENT ✅' : 'INSUFFICIENT ❌'}`);
      
      console.log("\n📝 Next Steps:");
      console.log("1. Update .env to use your main wallet");
      console.log("2. Run: node scripts/update-to-main-wallet.js");
      console.log("3. Then deploy: npx hardhat run scripts/deploy.js --network hyperevm_testnet");
      
    } else {
      console.log(`   ⚠️  No testnet balance yet`);
      console.log("\n   The faucet might still be processing...");
      console.log("   Try again in a minute or check:");
      console.log("   https://explorer.hyperliquid-testnet.xyz/address/" + MAIN_WALLET);
    }
    
    // Check recent transactions
    console.log("\n📜 Checking recent activity...");
    const latestBlock = await provider.getBlock('latest');
    const txCount = await provider.getTransactionCount(MAIN_WALLET);
    console.log(`   Transaction count: ${txCount}`);
    
    if (txCount > 0) {
      console.log("   This wallet has been active on testnet");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkTestnet().then(() => {
  console.log("\n" + "=" .repeat(50));
  console.log("Check complete!");
  process.exit(0);
}).catch(console.error);