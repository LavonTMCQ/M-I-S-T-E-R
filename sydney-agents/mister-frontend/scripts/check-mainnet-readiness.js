#!/usr/bin/env node

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log("🚀 HyperEVM Mainnet Deployment Check\n");
console.log("=" .repeat(50));

const MAIN_WALLET = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74";

async function checkMainnet() {
  console.log("📊 YOUR CURRENT SITUATION:");
  console.log("─" .repeat(50));
  console.log("• You have $60.47 USDC on Hyperliquid mainnet (L1)");
  console.log("• You have $950 Mock USDC on testnet");
  console.log("• You can buy HYPE on mainnet spot market");
  console.log("");
  
  console.log("💡 TWO OPTIONS:\n");
  
  console.log("OPTION 1: Deploy to MAINNET (Recommended)");
  console.log("─" .repeat(50));
  console.log("✅ Pros:");
  console.log("  • Real deployment, real users can use immediately");
  console.log("  • You already have $60 USDC there");
  console.log("  • Buy small amount of HYPE (0.1-1 HYPE ~$3-30)");
  console.log("  • Start earning real fees from users");
  console.log("❌ Cons:");
  console.log("  • Costs real money for gas");
  console.log("  • Need to be careful with security");
  console.log("");
  
  console.log("OPTION 2: Stay on TESTNET");
  console.log("─" .repeat(50));
  console.log("✅ Pros:");
  console.log("  • Free to test");
  console.log("  • No risk");
  console.log("❌ Cons:");
  console.log("  • Can't bridge mainnet HYPE to testnet");
  console.log("  • Still need to find testnet faucet");
  console.log("  • Have to deploy again later for mainnet");
  console.log("");
  
  // Check mainnet connection
  console.log("🌐 Checking HyperEVM Mainnet...");
  console.log("─" .repeat(50));
  
  try {
    // Try different mainnet RPC endpoints
    const endpoints = [
      'https://api.hyperliquid.xyz/evm',
      'https://rpc.hyperliquid.xyz/evm',
      'https://evm.hyperliquid.xyz'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying: ${endpoint}`);
        const provider = new ethers.JsonRpcProvider(endpoint);
        const network = await Promise.race([
          provider.getNetwork(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        console.log(`✅ Connected! Chain ID: ${network.chainId}`);
        
        // Check balance
        const balance = await provider.getBalance(MAIN_WALLET);
        console.log(`HYPE Balance: ${ethers.formatEther(balance)} HYPE`);
        
        if (parseFloat(ethers.formatEther(balance)) > 0) {
          console.log("✅ You already have HYPE on mainnet!");
        }
        
        break;
      } catch (err) {
        console.log(`  ❌ Failed: ${err.message}`);
      }
    }
  } catch (error) {
    console.log("Note: Mainnet EVM might use different RPC endpoint");
  }
  
  console.log("\n" + "=" .repeat(50));
  console.log("📝 RECOMMENDATION:\n");
  console.log("Since you have real funds ($60 USDC) and a working trading bot:");
  console.log("");
  console.log("1. Buy 0.5-1 HYPE on Hyperliquid spot (~$15-30)");
  console.log("2. Deploy directly to MAINNET");
  console.log("3. Start with your own funds as first user");
  console.log("4. Test everything with small amounts");
  console.log("5. Then onboard beta users");
  console.log("");
  console.log("💰 TO BUY HYPE:");
  console.log("1. Go to Hyperliquid spot trading");
  console.log("2. Trade HYPE/USDC pair");
  console.log("3. Buy 0.5-1 HYPE");
  console.log("4. Withdraw to your wallet on HyperEVM");
  console.log("");
  console.log("🚀 TO DEPLOY ON MAINNET:");
  console.log("npx hardhat run scripts/deploy.js --network hyperevm_mainnet");
}

checkMainnet().catch(console.error);