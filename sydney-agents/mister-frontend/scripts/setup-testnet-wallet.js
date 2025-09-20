#!/usr/bin/env node

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log("🚀 HyperEVM Testnet Wallet Setup\n");
console.log("=" .repeat(50));

async function main() {
  console.log("\n📋 Options:");
  console.log("1. Generate NEW testnet wallet");
  console.log("2. Use EXISTING wallet");
  console.log("3. Display network configuration for MetaMask");
  
  const choice = await question("\nSelect option (1-3): ");
  
  if (choice === "1") {
    await generateNewWallet();
  } else if (choice === "2") {
    await useExistingWallet();
  } else if (choice === "3") {
    displayNetworkConfig();
  } else {
    console.log("Invalid choice");
  }
  
  rl.close();
}

async function generateNewWallet() {
  console.log("\n🔑 Generating new testnet wallet...\n");
  
  // Generate new wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log("✅ New wallet generated!\n");
  console.log("📍 Address:", wallet.address);
  console.log("🔐 Private Key:", wallet.privateKey);
  console.log("📝 Mnemonic:", wallet.mnemonic.phrase);
  
  console.log("\n⚠️  IMPORTANT: Save these credentials securely!");
  console.log("    This is for TESTNET ONLY - never use on mainnet!");
  
  // Save to .env file
  const save = await question("\nSave to .env file? (y/n): ");
  if (save.toLowerCase() === 'y') {
    await saveToEnv(wallet.privateKey, wallet.address);
  }
  
  // Check balances
  await checkBalances(wallet.address, wallet.privateKey);
  
  // Provide faucet instructions
  console.log("\n💧 Getting Testnet Funds:");
  console.log("1. HyperEVM Testnet Faucet:");
  console.log("   - Visit: https://app.hyperliquid.xyz (connect wallet)");
  console.log("   - Switch to testnet mode");
  console.log("   - Use faucet to get test HYPE");
  console.log("\n2. Bridge Testnet USDC:");
  console.log("   - Get testnet USDC from Arbitrum Sepolia faucet");
  console.log("   - Bridge to HyperEVM testnet");
  console.log("\n3. Your testnet address to fund:");
  console.log(`   ${wallet.address}`);
}

async function useExistingWallet() {
  console.log("\n🔑 Using existing wallet...\n");
  
  const privateKey = await question("Enter private key (with or without 0x): ");
  
  try {
    const wallet = new ethers.Wallet(privateKey.startsWith('0x') ? privateKey : '0x' + privateKey);
    
    console.log("\n✅ Wallet loaded!");
    console.log("📍 Address:", wallet.address);
    
    // Save to .env file
    const save = await question("\nSave to .env file? (y/n): ");
    if (save.toLowerCase() === 'y') {
      await saveToEnv(wallet.privateKey, wallet.address);
    }
    
    // Check balances
    await checkBalances(wallet.address, wallet.privateKey);
    
  } catch (error) {
    console.log("❌ Invalid private key:", error.message);
  }
}

async function saveToEnv(privateKey, address) {
  const envPath = path.join(__dirname, '..', '.env');
  
  let envContent = '';
  
  // Read existing .env if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Remove existing PRIVATE_KEY and DEPLOYER_ADDRESS if present
    envContent = envContent.split('\n')
      .filter(line => !line.startsWith('PRIVATE_KEY=') && !line.startsWith('DEPLOYER_ADDRESS='))
      .join('\n');
    
    if (envContent && !envContent.endsWith('\n')) {
      envContent += '\n';
    }
  }
  
  // Add new values
  envContent += `# HyperEVM Testnet Deployment Wallet\n`;
  envContent += `PRIVATE_KEY=${privateKey.replace('0x', '')}\n`;
  envContent += `DEPLOYER_ADDRESS=${address}\n`;
  
  // Default USDC address (will be updated when known)
  if (!envContent.includes('USDC_ADDRESS=')) {
    envContent += `\n# Testnet USDC address (update when available)\n`;
    envContent += `USDC_ADDRESS=0x0000000000000000000000000000000000000000\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log("\n✅ Saved to .env file");
}

async function checkBalances(address, privateKey) {
  console.log("\n💰 Checking balances...\n");
  
  try {
    // Connect to testnet
    const provider = new ethers.JsonRpcProvider('https://rpc.hyperliquid-testnet.xyz/evm');
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Get HYPE balance
    const balance = await provider.getBalance(address);
    console.log("HYPE Balance:", ethers.formatEther(balance), "HYPE");
    
    // Check if we need funds
    if (balance === 0n) {
      console.log("⚠️  No HYPE balance - you'll need testnet funds to deploy contracts");
    } else {
      console.log("✅ Has HYPE for gas fees");
    }
    
    // Try to check USDC balance (if we know the address)
    // This would require the actual USDC contract address on testnet
    
  } catch (error) {
    console.log("⚠️  Could not connect to testnet:", error.message);
    console.log("    Network might be temporarily unavailable");
  }
}

function displayNetworkConfig() {
  console.log("\n🌐 HyperEVM Network Configuration for MetaMask:\n");
  console.log("=" .repeat(50));
  
  console.log("\n📋 TESTNET Configuration:");
  console.log("Network Name:     HyperEVM Testnet");
  console.log("RPC URL:         https://rpc.hyperliquid-testnet.xyz/evm");
  console.log("Chain ID:        998");
  console.log("Currency Symbol: HYPE");
  console.log("Block Explorer:  https://explorer.hyperliquid-testnet.xyz");
  
  console.log("\n📋 MAINNET Configuration:");
  console.log("Network Name:     HyperEVM");
  console.log("RPC URL:         https://api.hyperliquid.xyz/evm");
  console.log("Chain ID:        1337");
  console.log("Currency Symbol: HYPE");
  console.log("Block Explorer:  https://explorer.hyperliquid.xyz");
  
  console.log("\n📝 To add to MetaMask:");
  console.log("1. Open MetaMask");
  console.log("2. Click network dropdown → 'Add Network'");
  console.log("3. Enter the above details");
  console.log("4. Click 'Save'");
  
  console.log("\n💡 Alternative: Use website auto-add");
  console.log("Visit https://app.hyperliquid.xyz and it may prompt to add the network automatically");
}

// Run the script
main().catch(console.error);