#!/usr/bin/env node

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log("🔍 HyperEVM Deployment Readiness Check\n");
console.log("=" .repeat(50));

// Check environment variables
console.log("\n📋 Environment Variables:");
const requiredEnvVars = ['PRIVATE_KEY', 'USDC_ADDRESS'];
const envStatus = {};

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName === 'PRIVATE_KEY') {
      console.log(`✅ ${varName}: ${value.substring(0, 6)}...${value.substring(value.length - 4)}`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
    envStatus[varName] = true;
  } else {
    console.log(`❌ ${varName}: Not set`);
    envStatus[varName] = false;
  }
});

// Check contract files
console.log("\n📦 Smart Contracts:");
const contractsDir = path.join(__dirname, '../src/contracts/hyperevm');
const requiredContracts = ['AIAgentVault.sol', 'VaultFactory.sol', 'L1Read.sol'];

requiredContracts.forEach(contractName => {
  const contractPath = path.join(contractsDir, contractName);
  if (fs.existsSync(contractPath)) {
    const stats = fs.statSync(contractPath);
    console.log(`✅ ${contractName}: ${stats.size} bytes`);
  } else {
    console.log(`❌ ${contractName}: Not found`);
  }
});

// Check compiled artifacts
console.log("\n🔨 Compiled Artifacts:");
const artifactsDir = path.join(__dirname, '../artifacts/src/contracts/hyperevm');
const compiledContracts = ['AIAgentVault.sol', 'VaultFactory.sol', 'L1Read.sol'];

let artifactsExist = true;
compiledContracts.forEach(contractName => {
  const artifactPath = path.join(artifactsDir, contractName);
  if (fs.existsSync(artifactPath)) {
    const jsonFiles = fs.readdirSync(artifactPath).filter(f => f.endsWith('.json'));
    console.log(`✅ ${contractName}: ${jsonFiles.length} artifact(s)`);
  } else {
    console.log(`❌ ${contractName}: Not compiled`);
    artifactsExist = false;
  }
});

// Check network connectivity
console.log("\n🌐 Network Connectivity:");
const networks = {
  'HyperEVM Testnet': 'https://rpc.hyperliquid-testnet.xyz/evm',
  'HyperEVM Mainnet': 'https://api.hyperliquid.xyz/evm'
};

for (const [name, url] of Object.entries(networks)) {
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const chainId = await provider.getNetwork().then(n => n.chainId);
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ ${name}: Chain ID ${chainId}, Block ${blockNumber}`);
  } catch (error) {
    console.log(`❌ ${name}: Connection failed`);
  }
}

// Check deployment scripts
console.log("\n📜 Deployment Scripts:");
const scriptsDir = path.join(__dirname);
const requiredScripts = ['deploy.js', 'test-deployment.js'];

requiredScripts.forEach(scriptName => {
  const scriptPath = path.join(scriptsDir, scriptName);
  if (fs.existsSync(scriptPath)) {
    console.log(`✅ ${scriptName}: Found`);
  } else {
    console.log(`❌ ${scriptName}: Not found`);
  }
});

// Summary and recommendations
console.log("\n" + "=" .repeat(50));
console.log("📊 DEPLOYMENT READINESS SUMMARY\n");

const issues = [];

if (!envStatus.PRIVATE_KEY) {
  issues.push("Set PRIVATE_KEY environment variable with deployer wallet private key");
}

if (!envStatus.USDC_ADDRESS) {
  issues.push("Set USDC_ADDRESS environment variable (use testnet USDC address)");
}

if (!artifactsExist) {
  issues.push("Run 'npx hardhat compile' to compile smart contracts");
}

if (issues.length === 0) {
  console.log("✅ All checks passed! Ready to deploy.\n");
  console.log("Next steps:");
  console.log("1. Ensure you have testnet HYPE for gas fees");
  console.log("2. Run: npx hardhat run scripts/deploy.js --network hyperevm_testnet");
} else {
  console.log("⚠️  Issues found:\n");
  issues.forEach((issue, i) => {
    console.log(`${i + 1}. ${issue}`);
  });
  console.log("\nResolve these issues before deployment.");
}

console.log("\n💡 TIP: Create a .env file with:");
console.log("PRIVATE_KEY=your_private_key_here");
console.log("USDC_ADDRESS=0x... (testnet USDC address)");