#!/usr/bin/env node

import { ethers } from 'ethers';
import open from 'open';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("💧 HyperEVM Testnet Funding Helper\n");
console.log("=" .repeat(50));

async function main() {
  // Load wallet from .env
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log("❌ No .env file found. Run setup-testnet-wallet.js first!");
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const privateKeyMatch = envContent.match(/PRIVATE_KEY=([a-fA-F0-9]+)/);
  
  if (!privateKeyMatch) {
    console.log("❌ No PRIVATE_KEY found in .env file");
    process.exit(1);
  }
  
  const privateKey = privateKeyMatch[1];
  const wallet = new ethers.Wallet('0x' + privateKey);
  
  console.log("\n📍 Your Testnet Wallet:");
  console.log("Address:", wallet.address);
  
  // Check current balance
  try {
    const provider = new ethers.JsonRpcProvider('https://rpc.hyperliquid-testnet.xyz/evm');
    const balance = await provider.getBalance(wallet.address);
    console.log("Current HYPE Balance:", ethers.formatEther(balance), "HYPE");
    
    if (balance > 0n) {
      console.log("✅ You have HYPE for gas!");
    } else {
      console.log("⚠️  No HYPE balance - you need testnet funds");
    }
  } catch (error) {
    console.log("⚠️  Could not check balance:", error.message);
  }
  
  console.log("\n" + "=" .repeat(50));
  console.log("📋 FUNDING OPTIONS:\n");
  
  console.log("Option 1: Hyperliquid Testnet Faucet");
  console.log("────────────────────────────────────");
  console.log("1. Visit: https://app.hyperliquid.xyz");
  console.log("2. Connect your wallet (MetaMask)");
  console.log("3. Switch to TESTNET mode (top right)");
  console.log("4. Look for faucet option");
  console.log(`5. Use address: ${wallet.address}`);
  
  console.log("\nOption 2: Bridge from Arbitrum Sepolia");
  console.log("────────────────────────────────────────");
  console.log("1. Get Arbitrum Sepolia ETH:");
  console.log("   https://www.alchemy.com/faucets/arbitrum-sepolia");
  console.log("2. Get Sepolia USDC from Circle faucet:");
  console.log("   https://faucet.circle.com/");
  console.log("3. Bridge to HyperEVM testnet");
  
  console.log("\nOption 3: Direct Testnet USDC");
  console.log("──────────────────────────────");
  console.log("Check if there's a direct USDC faucet:");
  console.log("https://docs.hyperliquid.xyz/testnet");
  
  console.log("\n" + "=" .repeat(50));
  console.log("📝 IMPORTANT ADDRESSES TO SAVE:\n");
  console.log("Your Wallet:", wallet.address);
  console.log("Copy this address to get funds from faucets!");
  
  console.log("\n💡 Next Steps:");
  console.log("1. Get testnet HYPE (for gas fees)");
  console.log("2. Get testnet USDC (for testing deposits)");
  console.log("3. Update USDC_ADDRESS in .env when you know it");
  console.log("4. Run: node scripts/check-deployment-readiness.js");
  
  // Optional: Open browser
  console.log("\n🌐 Open Hyperliquid in browser? (requires 'open' package)");
  console.log("Run: npm install open");
  console.log("Then uncomment the line below in this script");
  
  // Uncomment to auto-open browser:
  // await open('https://app.hyperliquid.xyz');
}

main().catch(console.error);