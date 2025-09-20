#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔄 Updating to Main Wallet for Testnet Deployment\n");
console.log("=" .repeat(50));

// Main wallet details
const MAIN_WALLET_ADDRESS = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74";
const MAIN_WALLET_PRIVATE_KEY = "b51f849e6551e2c8e627a663f2ee2439b1e17760d7a4de340c913bbfbd572f73"; // From your docs

// Mock USDC on HyperEVM Testnet
// This is typically a standard address for testnet USDC
const MOCK_USDC_ADDRESS = "0x0000000000000000000000000000000000000000"; // Will be updated

console.log("📍 Main Wallet Configuration:");
console.log(`   Address: ${MAIN_WALLET_ADDRESS}`);
console.log(`   Private Key: ${MAIN_WALLET_PRIVATE_KEY.substring(0, 10)}...`);
console.log("");

// Update .env file
const envPath = path.join(__dirname, '..', '.env');

let envContent = fs.readFileSync(envPath, 'utf8');

// Backup current .env
fs.writeFileSync(envPath + '.backup', envContent);
console.log("✅ Created .env.backup");

// Update with main wallet
envContent = envContent.split('\n').map(line => {
  if (line.startsWith('PRIVATE_KEY=')) {
    return `PRIVATE_KEY=${MAIN_WALLET_PRIVATE_KEY}`;
  }
  if (line.startsWith('DEPLOYER_ADDRESS=')) {
    return `DEPLOYER_ADDRESS=${MAIN_WALLET_ADDRESS}`;
  }
  if (line.startsWith('USDC_ADDRESS=') && line.includes('0x0000000000000000000000000000000000000000')) {
    // Update with Mock USDC address when known
    return `USDC_ADDRESS=${MOCK_USDC_ADDRESS}`;
  }
  return line;
}).join('\n');

// Add comment about using main wallet
if (!envContent.includes('# Using Main Wallet')) {
  envContent = `# Using Main Wallet for Testnet Deployment\n` + envContent;
}

fs.writeFileSync(envPath, envContent);

console.log("✅ Updated .env to use main wallet");
console.log("");

console.log("📝 IMPORTANT - Mock USDC Address:");
console.log("─" .repeat(50));
console.log("Since you have Mock USDC on Hyperliquid testnet:");
console.log("");
console.log("1. The Mock USDC might be on the L1 (Hyperliquid trading layer)");
console.log("2. For HyperEVM deployment, we need the ERC20 USDC address");
console.log("3. Check if there's a bridge to move USDC to HyperEVM");
console.log("");
console.log("Common testnet USDC addresses to try:");
console.log("  • 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
console.log("  • 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
console.log("  • Or check: https://docs.hyperliquid.xyz/testnet");
console.log("");

console.log("📋 Next Steps:");
console.log("─" .repeat(50));
console.log("1. Find the Mock USDC contract address on HyperEVM testnet");
console.log("2. Update USDC_ADDRESS in .env with the correct address");
console.log("3. Get some testnet HYPE for gas (if not already done)");
console.log("4. Run deployment:");
console.log("   npx hardhat run scripts/deploy.js --network hyperevm_testnet");
console.log("");

console.log("💡 To check if you have HYPE for gas:");
console.log("   node scripts/check-main-wallet-testnet.js");
console.log("");

console.log("🔍 Your wallet addresses:");
console.log(`   Main Wallet: ${MAIN_WALLET_ADDRESS}`);
console.log(`   (This has your Mock USDC on Hyperliquid testnet)`);

// Create deployment config
const deployConfig = {
  network: "hyperevm_testnet",
  deployer: MAIN_WALLET_ADDRESS,
  contracts: {
    AIAgentVault: "To be deployed",
    VaultFactory: "To be deployed",
    L1Read: "To be deployed"
  },
  status: "Ready for deployment",
  notes: "Using main wallet with Mock USDC on testnet"
};

fs.writeFileSync(
  path.join(__dirname, '..', 'deployment-config.json'),
  JSON.stringify(deployConfig, null, 2)
);

console.log("\n✅ Deployment config saved to deployment-config.json");