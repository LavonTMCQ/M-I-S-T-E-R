#!/usr/bin/env node

import hre from "hardhat";
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log("🚀 Quick Testnet Deployment Check\n");
console.log("=" .repeat(50));

async function quickCheck() {
  const provider = new ethers.JsonRpcProvider('https://rpc.hyperliquid-testnet.xyz/evm');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log("📍 Deployer:", wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const hypeBalance = ethers.formatEther(balance);
  
  console.log("💰 HYPE Balance:", hypeBalance, "HYPE");
  
  if (parseFloat(hypeBalance) < 0.01) {
    console.log("\n❌ Insufficient HYPE for deployment");
    console.log("   You need at least 0.01 HYPE for gas fees");
    console.log("\n   To get testnet HYPE:");
    console.log("   1. Go to Hyperliquid testnet frontend");
    console.log("   2. Look for 'Faucet' or 'Bridge to EVM' option");
    console.log("   3. Or deposit from L1 to HyperEVM");
    return false;
  }
  
  console.log("✅ Sufficient HYPE for deployment!");
  
  // Check USDC address
  const usdcAddress = process.env.USDC_ADDRESS;
  if (usdcAddress === "0x0000000000000000000000000000000000000000") {
    console.log("\n⚠️  USDC_ADDRESS not set");
    console.log("   For testing, we can deploy with a placeholder");
    console.log("   Or update USDC_ADDRESS in .env with the Mock USDC address");
    
    const proceed = true; // Can proceed with placeholder for testing
    if (proceed) {
      console.log("\n   Using placeholder USDC for initial deployment");
      console.log("   You can update it later in the contracts");
    }
  }
  
  return true;
}

async function deploy() {
  console.log("\n" + "=" .repeat(50));
  console.log("📦 Starting Deployment...\n");
  
  try {
    // Run the actual deployment
    await import('./deploy.js');
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
  }
}

// Main execution
quickCheck().then(async (ready) => {
  if (ready) {
    console.log("\n🎯 Ready to deploy!");
    console.log("Run: npx hardhat run scripts/deploy.js --network hyperevm_testnet");
    console.log("\nOr press Enter to deploy now...");
    
    // For non-interactive mode, just show the command
    console.log("\n💡 To deploy immediately:");
    console.log("   npx hardhat run scripts/deploy.js --network hyperevm_testnet");
  } else {
    console.log("\n⏳ Waiting for testnet HYPE...");
    console.log("   Run this script again after getting HYPE from faucet");
  }
}).catch(console.error);