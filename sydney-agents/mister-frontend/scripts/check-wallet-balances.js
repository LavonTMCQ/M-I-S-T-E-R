#!/usr/bin/env node

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log("💰 Checking Wallet Balances on HyperEVM\n");
console.log("=" .repeat(50));

// Known wallets
const wallets = {
  "Main Wallet (Python Bot)": "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74",
  "New Testnet Wallet": "0xbDEC30120083Fa70451195948477956DCCA33D73"
};

// Check both testnet and mainnet
async function checkBalances() {
  console.log("\n🔍 TESTNET (Chain ID: 998)");
  console.log("─" .repeat(50));
  
  try {
    const testnetProvider = new ethers.JsonRpcProvider('https://rpc.hyperliquid-testnet.xyz/evm');
    const testnetBlock = await testnetProvider.getBlockNumber();
    console.log(`Connected to block: ${testnetBlock}\n`);
    
    for (const [name, address] of Object.entries(wallets)) {
      const balance = await testnetProvider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);
      
      console.log(`${name}:`);
      console.log(`  Address: ${address}`);
      console.log(`  Balance: ${formattedBalance} HYPE`);
      
      if (parseFloat(formattedBalance) > 0) {
        console.log(`  ✅ Has testnet funds!`);
      } else {
        console.log(`  ⚠️  No testnet balance`);
      }
      console.log("");
    }
  } catch (error) {
    console.log("❌ Could not connect to testnet:", error.message);
  }
  
  console.log("\n🔍 MAINNET (Chain ID: 1337)");
  console.log("─" .repeat(50));
  
  try {
    const mainnetProvider = new ethers.JsonRpcProvider('https://api.hyperliquid.xyz/evm');
    const mainnetBlock = await mainnetProvider.getBlockNumber();
    console.log(`Connected to block: ${mainnetBlock}\n`);
    
    for (const [name, address] of Object.entries(wallets)) {
      const balance = await mainnetProvider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);
      
      console.log(`${name}:`);
      console.log(`  Address: ${address}`);
      console.log(`  Balance: ${formattedBalance} HYPE`);
      
      if (parseFloat(formattedBalance) > 0) {
        console.log(`  ✅ Has mainnet funds!`);
      } else {
        console.log(`  ⚠️  No mainnet balance`);
      }
      console.log("");
    }
  } catch (error) {
    console.log("❌ Could not connect to mainnet:", error.message);
  }
  
  // Also check via Hyperliquid API for L1 balances
  console.log("\n🔍 HYPERLIQUID L1 (Trading Layer)");
  console.log("─" .repeat(50));
  
  try {
    for (const [name, address] of Object.entries(wallets)) {
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: address
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        console.log(`${name}:`);
        console.log(`  Address: ${address}`);
        
        if (data && data.marginSummary) {
          const accountValue = parseFloat(data.marginSummary.accountValue);
          const withdrawable = parseFloat(data.marginSummary.withdrawable);
          
          console.log(`  Account Value: $${accountValue.toFixed(2)} USDC`);
          console.log(`  Withdrawable: $${withdrawable.toFixed(2)} USDC`);
          
          if (accountValue > 0) {
            console.log(`  ✅ Has L1 trading funds!`);
          }
        } else {
          console.log(`  No L1 account found`);
        }
      } else {
        console.log(`  Could not fetch L1 data`);
      }
      console.log("");
    }
  } catch (error) {
    console.log("❌ Could not check L1 balances:", error.message);
  }
  
  console.log("=" .repeat(50));
  console.log("\n📝 SUMMARY:");
  
  // Determine which wallet to use for deployment
  console.log("\nFor testnet deployment:");
  console.log("- You need HYPE on testnet for gas fees");
  console.log("- Check which wallet received testnet funds above");
  console.log("- If main wallet has testnet HYPE, we can update .env to use it");
  
  console.log("\n💡 If main wallet has testnet funds:");
  console.log("Run: node scripts/update-to-main-wallet.js");
  console.log("This will update .env to use your main wallet for deployment");
}

checkBalances().catch(console.error);