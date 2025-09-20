#!/usr/bin/env node

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 HyperEVM Testnet Wallet Generator\n");
console.log("=" .repeat(50));

async function main() {
  console.log("\n🔑 Generating new testnet wallet...\n");
  
  // Generate new wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log("✅ New testnet wallet generated!\n");
  console.log("=" .repeat(50));
  console.log("📍 Address:     ", wallet.address);
  console.log("🔐 Private Key: ", wallet.privateKey);
  console.log("📝 Mnemonic:    ", wallet.mnemonic.phrase);
  console.log("=" .repeat(50));
  
  // Save to .env file
  const envPath = path.join(__dirname, '..', '.env');
  
  let envContent = '';
  
  // Read existing .env if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Remove existing keys if present
    envContent = envContent.split('\n')
      .filter(line => !line.startsWith('PRIVATE_KEY=') && 
                     !line.startsWith('DEPLOYER_ADDRESS=') &&
                     !line.startsWith('MNEMONIC='))
      .join('\n');
    
    if (envContent && !envContent.endsWith('\n')) {
      envContent += '\n';
    }
  }
  
  // Add new values
  envContent += `\n# HyperEVM Testnet Deployment Wallet (Generated: ${new Date().toISOString()})\n`;
  envContent += `PRIVATE_KEY=${wallet.privateKey.replace('0x', '')}\n`;
  envContent += `DEPLOYER_ADDRESS=${wallet.address}\n`;
  envContent += `MNEMONIC="${wallet.mnemonic.phrase}"\n`;
  
  // Default USDC address (will be updated when known)
  if (!envContent.includes('USDC_ADDRESS=')) {
    envContent += `\n# Testnet USDC address (update when available)\n`;
    envContent += `USDC_ADDRESS=0x0000000000000000000000000000000000000000\n`;
  }
  
  // Add network RPCs
  if (!envContent.includes('HYPEREVM_TESTNET_RPC=')) {
    envContent += `\n# Network Configuration\n`;
    envContent += `HYPEREVM_TESTNET_RPC=https://rpc.hyperliquid-testnet.xyz/evm\n`;
    envContent += `HYPEREVM_MAINNET_RPC=https://api.hyperliquid.xyz/evm\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log("\n✅ Saved to .env file");
  
  // Check testnet connectivity
  console.log("\n🌐 Checking testnet connection...");
  try {
    const provider = new ethers.JsonRpcProvider('https://rpc.hyperliquid-testnet.xyz/evm');
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected to HyperEVM Testnet (Chain ID: ${network.chainId})`);
    console.log(`   Current block: ${blockNumber}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} HYPE`);
    
    if (balance === 0n) {
      console.log("   ⚠️  No balance - you need testnet funds");
    }
  } catch (error) {
    console.log("⚠️  Could not connect to testnet:", error.message);
  }
  
  // MetaMask instructions
  console.log("\n" + "=" .repeat(50));
  console.log("📱 METAMASK SETUP INSTRUCTIONS:\n");
  
  console.log("1. Add HyperEVM Testnet Network:");
  console.log("   • Network Name: HyperEVM Testnet");
  console.log("   • RPC URL: https://rpc.hyperliquid-testnet.xyz/evm");
  console.log("   • Chain ID: 998");
  console.log("   • Symbol: HYPE");
  console.log("   • Explorer: https://explorer.hyperliquid-testnet.xyz");
  
  console.log("\n2. Import Wallet (choose one method):");
  console.log("   Option A - Import with Private Key:");
  console.log(`   • ${wallet.privateKey}`);
  console.log("\n   Option B - Import with Seed Phrase:");
  console.log(`   • ${wallet.mnemonic.phrase}`);
  
  // Funding instructions
  console.log("\n" + "=" .repeat(50));
  console.log("💧 GET TESTNET FUNDS:\n");
  
  console.log("Your testnet address:");
  console.log(`${wallet.address}`);
  console.log("\n1. Visit https://app.hyperliquid.xyz");
  console.log("2. Connect wallet and switch to TESTNET");
  console.log("3. Look for faucet option");
  console.log("4. Get test HYPE and USDC");
  
  console.log("\n" + "=" .repeat(50));
  console.log("⚠️  SECURITY REMINDER:");
  console.log("• This wallet is for TESTNET ONLY");
  console.log("• Never use these keys on mainnet");
  console.log("• Never share private keys publicly");
  console.log("• The .env file is gitignored for safety");
  
  console.log("\n✅ NEXT STEPS:");
  console.log("1. Import wallet to MetaMask");
  console.log("2. Get testnet HYPE from faucet");
  console.log("3. Get testnet USDC");
  console.log("4. Update USDC_ADDRESS in .env when known");
  console.log("5. Run: npm run deploy:testnet");
  
  // Create a wallet info file for reference
  const walletInfo = {
    network: "HyperEVM Testnet",
    chainId: 998,
    address: wallet.address,
    createdAt: new Date().toISOString(),
    purpose: "Contract deployment and testing",
    warning: "TESTNET ONLY - Do not use on mainnet"
  };
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'testnet-wallet-info.json'),
    JSON.stringify(walletInfo, null, 2)
  );
  
  console.log("\n📄 Wallet info saved to testnet-wallet-info.json");
}

main().catch(console.error);