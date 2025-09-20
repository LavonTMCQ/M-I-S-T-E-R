#!/usr/bin/env node

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log("💰 Checking HYPE Balance on HyperEVM\n");
console.log("=" .repeat(50));

const MAIN_WALLET = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74";

async function checkBalance() {
  // Check mainnet (Chain 999)
  console.log("🌐 HyperEVM MAINNET (Chain 999):");
  console.log("─" .repeat(50));
  
  try {
    const mainnetProvider = new ethers.JsonRpcProvider('https://rpc.hyperliquid.xyz/evm');
    const network = await mainnetProvider.getNetwork();
    const blockNumber = await mainnetProvider.getBlockNumber();
    
    console.log(`✅ Connected to Chain ID: ${network.chainId}`);
    console.log(`📦 Current Block: ${blockNumber}`);
    console.log("");
    
    const balance = await mainnetProvider.getBalance(MAIN_WALLET);
    const formattedBalance = ethers.formatEther(balance);
    
    console.log(`💰 Wallet: ${MAIN_WALLET}`);
    console.log(`   HYPE Balance: ${formattedBalance} HYPE`);
    
    if (parseFloat(formattedBalance) > 0) {
      console.log(`   ✅ YOU HAVE HYPE! Ready to deploy!`);
      
      // Estimate deployment cost
      const gasPrice = await mainnetProvider.getFeeData();
      const estimatedGas = 5000000; // Rough estimate for 3 contracts
      const estimatedCost = ethers.formatEther(gasPrice.gasPrice * BigInt(estimatedGas));
      
      console.log(`\n📊 Deployment Estimate:`);
      console.log(`   Estimated gas needed: ~${estimatedCost} HYPE`);
      console.log(`   Your balance: ${formattedBalance} HYPE`);
      
      if (parseFloat(formattedBalance) >= parseFloat(estimatedCost)) {
        console.log(`   ✅ SUFFICIENT balance for deployment!`);
      } else if (parseFloat(formattedBalance) >= parseFloat(estimatedCost) * 0.5) {
        console.log(`   ⚠️  Might be tight, but should work`);
      } else {
        console.log(`   ❌ May need more HYPE`);
      }
    } else {
      console.log(`   ⚠️  No HYPE balance yet`);
      console.log(`\n   If you just bought/withdrew, it might take a minute to show`);
    }
  } catch (error) {
    console.log(`❌ Error connecting to mainnet:`, error.message);
  }
  
  // Also check testnet for comparison
  console.log("\n🌐 HyperEVM TESTNET (Chain 998):");
  console.log("─" .repeat(50));
  
  try {
    const testnetProvider = new ethers.JsonRpcProvider('https://rpc.hyperliquid-testnet.xyz/evm');
    const balance = await testnetProvider.getBalance(MAIN_WALLET);
    const formattedBalance = ethers.formatEther(balance);
    
    console.log(`💰 HYPE Balance: ${formattedBalance} HYPE`);
    
    if (parseFloat(formattedBalance) > 0) {
      console.log(`   ✅ Has testnet HYPE`);
    } else {
      console.log(`   ⚠️  No testnet HYPE`);
    }
  } catch (error) {
    console.log(`❌ Error:`, error.message);
  }
  
  // Check L1 balances too
  console.log("\n📊 Hyperliquid L1 Balances:");
  console.log("─" .repeat(50));
  
  try {
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: MAIN_WALLET
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data && data.marginSummary) {
        const accountValue = parseFloat(data.marginSummary.accountValue || 0);
        console.log(`💰 L1 Trading Account: $${accountValue.toFixed(2)} USDC`);
      }
    }
  } catch (error) {
    console.log(`Error checking L1:`, error.message);
  }
  
  console.log("\n" + "=" .repeat(50));
  
  // Deployment readiness
  const provider = new ethers.JsonRpcProvider('https://rpc.hyperliquid.xyz/evm');
  const balance = await provider.getBalance(MAIN_WALLET);
  
  if (parseFloat(ethers.formatEther(balance)) > 0.001) {
    console.log("🚀 READY TO DEPLOY TO MAINNET!");
    console.log("\nRun this command:");
    console.log("npx hardhat run scripts/deploy.js --network hyperevm_mainnet");
    console.log("\n✅ You're all set! Let's deploy those contracts!");
  } else {
    console.log("⏳ Waiting for HYPE to arrive...");
    console.log("If you just withdrew, wait 1-2 minutes and check again.");
  }
}

checkBalance().catch(console.error);