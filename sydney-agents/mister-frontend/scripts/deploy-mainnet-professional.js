#!/usr/bin/env node

import hre from "hardhat";
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Deployment tracking
const deploymentData = {
  network: 'hyperevm_mainnet',
  chainId: 999,
  timestamp: new Date().toISOString(),
  deployer: null,
  contracts: {},
  gasUsed: {},
  transactionHashes: {},
  blockNumbers: {},
  totalGasUsed: 0n,
  totalCostHYPE: '0',
  status: 'pending',
  errors: [],
  logs: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(message);
  deploymentData.logs.push({ timestamp, message, type });
}

async function saveDeploymentData(final = false) {
  const filename = final ? 'mainnet-deployment-final.json' : 'mainnet-deployment-progress.json';
  const filepath = path.join(__dirname, '..', filename);
  
  // Convert BigInt to string for JSON
  const dataToSave = JSON.parse(JSON.stringify(deploymentData, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  
  fs.writeFileSync(filepath, JSON.stringify(dataToSave, null, 2));
  
  if (final) {
    log(`\n✅ Deployment data saved to: ${filename}`);
    
    // Also create a markdown report
    createDeploymentReport(dataToSave);
  }
}

function createDeploymentReport(data) {
  const report = `# HyperEVM Mainnet Deployment Report

## 📅 Deployment Information
- **Date**: ${data.timestamp}
- **Network**: HyperEVM Mainnet
- **Chain ID**: ${data.chainId}
- **Deployer**: ${data.deployer}
- **Status**: ${data.status}

## 📦 Deployed Contracts

### L1Read Oracle
- **Address**: \`${data.contracts.L1Read || 'Not deployed'}\`
- **Transaction**: \`${data.transactionHashes.L1Read || 'N/A'}\`
- **Block**: ${data.blockNumbers.L1Read || 'N/A'}
- **Gas Used**: ${data.gasUsed.L1Read || 'N/A'}

### VaultFactory
- **Address**: \`${data.contracts.VaultFactory || 'Not deployed'}\`
- **Transaction**: \`${data.transactionHashes.VaultFactory || 'N/A'}\`
- **Block**: ${data.blockNumbers.VaultFactory || 'N/A'}
- **Gas Used**: ${data.gasUsed.VaultFactory || 'N/A'}

### AIAgentVault (Sample)
- **Address**: \`${data.contracts.AIAgentVault || 'Not deployed'}\`
- **Transaction**: \`${data.transactionHashes.AIAgentVault || 'N/A'}\`
- **Block**: ${data.blockNumbers.AIAgentVault || 'N/A'}
- **Gas Used**: ${data.gasUsed.AIAgentVault || 'N/A'}

## 💰 Deployment Costs
- **Total Gas Used**: ${data.totalGasUsed}
- **Total Cost**: ${data.totalCostHYPE} HYPE

## 🔗 Important Links
- **Explorer**: https://explorer.hyperliquid.xyz/address/${data.deployer}
- **L1Read**: https://explorer.hyperliquid.xyz/address/${data.contracts.L1Read}
- **VaultFactory**: https://explorer.hyperliquid.xyz/address/${data.contracts.VaultFactory}
- **AIAgentVault**: https://explorer.hyperliquid.xyz/address/${data.contracts.AIAgentVault}

## 📝 Next Steps
1. Verify contracts on explorer
2. Update frontend with contract addresses
3. Connect Python trading bot to vault
4. Test with small deposit
5. Monitor initial operations

## 📋 Configuration for Frontend
\`\`\`javascript
export const CONTRACTS = {
  L1Read: "${data.contracts.L1Read}",
  VaultFactory: "${data.contracts.VaultFactory}",
  AIAgentVault: "${data.contracts.AIAgentVault}"
};
\`\`\`

---
Generated: ${new Date().toISOString()}
`;
  
  const reportPath = path.join(__dirname, '..', 'MAINNET_DEPLOYMENT_REPORT.md');
  fs.writeFileSync(reportPath, report);
  log(`📄 Deployment report saved to: MAINNET_DEPLOYMENT_REPORT.md`);
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 HYPEREVM MAINNET DEPLOYMENT - PROFESSIONAL MODE");
  console.log("=".repeat(60) + "\n");
  
  try {
    // Pre-deployment checks
    log("📋 Running pre-deployment checks...\n");
    
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    deploymentData.deployer = deployer.address;
    
    log(`📍 Deployer Address: ${deployer.address}`);
    
    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    const balanceInHYPE = ethers.formatEther(balance);
    log(`💰 HYPE Balance: ${balanceInHYPE} HYPE`);
    
    if (parseFloat(balanceInHYPE) < 0.01) {
      throw new Error("Insufficient HYPE balance for deployment");
    }
    
    // Network verification
    const network = await ethers.provider.getNetwork();
    log(`🌐 Network: Chain ID ${network.chainId}`);
    
    if (network.chainId !== 999n) {
      throw new Error(`Wrong network! Expected Chain ID 999, got ${network.chainId}`);
    }
    
    const blockNumber = await ethers.provider.getBlockNumber();
    log(`📦 Current Block: ${blockNumber}`);
    
    // USDC configuration
    const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x0000000000000000000000000000000000000000";
    const KEEPER_BOT_ADDRESS = deployer.address; // Start with deployer as keeper
    const AI_AGENT_ADDRESS = deployer.address; // Start with deployer as AI agent
    
    log(`\n🔧 Configuration:`);
    log(`   USDC Token: ${USDC_ADDRESS}`);
    log(`   Keeper Bot: ${KEEPER_BOT_ADDRESS}`);
    log(`   AI Agent: ${AI_AGENT_ADDRESS}`);
    
    // Save initial state
    await saveDeploymentData();
    
    log("\n" + "=".repeat(60));
    log("📦 STARTING CONTRACT DEPLOYMENT");
    log("=".repeat(60) + "\n");
    
    // Deploy L1Read
    log("1️⃣ Deploying L1Read Oracle Contract...");
    const L1Read = await ethers.getContractFactory("L1Read");
    const l1Read = await L1Read.deploy();
    await l1Read.waitForDeployment();
    
    const l1ReadAddress = await l1Read.getAddress();
    const l1ReadTx = l1Read.deploymentTransaction();
    
    deploymentData.contracts.L1Read = l1ReadAddress;
    deploymentData.transactionHashes.L1Read = l1ReadTx.hash;
    deploymentData.blockNumbers.L1Read = l1ReadTx.blockNumber;
    
    const l1ReadReceipt = await l1ReadTx.wait();
    deploymentData.gasUsed.L1Read = l1ReadReceipt.gasUsed.toString();
    deploymentData.totalGasUsed += l1ReadReceipt.gasUsed;
    
    log(`   ✅ L1Read deployed to: ${l1ReadAddress}`);
    log(`   📝 Transaction: ${l1ReadTx.hash}`);
    log(`   ⛽ Gas used: ${l1ReadReceipt.gasUsed}`);
    
    await saveDeploymentData();
    
    // Deploy VaultFactory
    log("\n2️⃣ Deploying VaultFactory Contract...");
    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    const vaultFactory = await VaultFactory.deploy(USDC_ADDRESS, deployer.address);
    await vaultFactory.waitForDeployment();
    
    const vaultFactoryAddress = await vaultFactory.getAddress();
    const vaultFactoryTx = vaultFactory.deploymentTransaction();
    
    deploymentData.contracts.VaultFactory = vaultFactoryAddress;
    deploymentData.transactionHashes.VaultFactory = vaultFactoryTx.hash;
    deploymentData.blockNumbers.VaultFactory = vaultFactoryTx.blockNumber;
    
    const vaultFactoryReceipt = await vaultFactoryTx.wait();
    deploymentData.gasUsed.VaultFactory = vaultFactoryReceipt.gasUsed.toString();
    deploymentData.totalGasUsed += vaultFactoryReceipt.gasUsed;
    
    log(`   ✅ VaultFactory deployed to: ${vaultFactoryAddress}`);
    log(`   📝 Transaction: ${vaultFactoryTx.hash}`);
    log(`   ⛽ Gas used: ${vaultFactoryReceipt.gasUsed}`);
    
    await saveDeploymentData();
    
    // Deploy AIAgentVault
    log("\n3️⃣ Deploying AIAgentVault (Sample)...");
    const AIAgentVault = await ethers.getContractFactory("AIAgentVault");
    const aiAgentVault = await AIAgentVault.deploy(
      USDC_ADDRESS,
      KEEPER_BOT_ADDRESS,
      AI_AGENT_ADDRESS
    );
    await aiAgentVault.waitForDeployment();
    
    const aiAgentVaultAddress = await aiAgentVault.getAddress();
    const aiAgentVaultTx = aiAgentVault.deploymentTransaction();
    
    deploymentData.contracts.AIAgentVault = aiAgentVaultAddress;
    deploymentData.transactionHashes.AIAgentVault = aiAgentVaultTx.hash;
    deploymentData.blockNumbers.AIAgentVault = aiAgentVaultTx.blockNumber;
    
    const aiAgentVaultReceipt = await aiAgentVaultTx.wait();
    deploymentData.gasUsed.AIAgentVault = aiAgentVaultReceipt.gasUsed.toString();
    deploymentData.totalGasUsed += aiAgentVaultReceipt.gasUsed;
    
    log(`   ✅ AIAgentVault deployed to: ${aiAgentVaultAddress}`);
    log(`   📝 Transaction: ${aiAgentVaultTx.hash}`);
    log(`   ⛽ Gas used: ${aiAgentVaultReceipt.gasUsed}`);
    
    // Calculate total cost
    const gasPrice = await ethers.provider.getFeeData();
    const totalCostWei = deploymentData.totalGasUsed * gasPrice.gasPrice;
    deploymentData.totalCostHYPE = ethers.formatEther(totalCostWei);
    
    deploymentData.status = 'success';
    
    log("\n" + "=".repeat(60));
    log("🎉 DEPLOYMENT SUCCESSFUL!");
    log("=".repeat(60) + "\n");
    
    log("📊 DEPLOYMENT SUMMARY:");
    log(`   Total Gas Used: ${deploymentData.totalGasUsed}`);
    log(`   Total Cost: ${deploymentData.totalCostHYPE} HYPE`);
    log(`   Remaining Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} HYPE`);
    
    log("\n📋 CONTRACT ADDRESSES (SAVE THESE!):");
    log(`   L1Read:       ${l1ReadAddress}`);
    log(`   VaultFactory: ${vaultFactoryAddress}`);
    log(`   AIAgentVault: ${aiAgentVaultAddress}`);
    
    // Save final deployment data
    await saveDeploymentData(true);
    
    // Create contract config file for frontend
    const contractConfig = `// HyperEVM Mainnet Contract Addresses
// Deployed: ${deploymentData.timestamp}

export const MAINNET_CONTRACTS = {
  L1Read: "${l1ReadAddress}",
  VaultFactory: "${vaultFactoryAddress}",
  AIAgentVault: "${aiAgentVaultAddress}",
  chainId: 999,
  deployer: "${deployer.address}"
};

export const MAINNET_DEPLOYMENT = ${JSON.stringify(deploymentData, null, 2)};
`;
    
    fs.writeFileSync(
      path.join(__dirname, '..', 'src', 'config', 'mainnet-contracts.js'),
      contractConfig
    );
    
    log("\n✅ Contract config saved to: src/config/mainnet-contracts.js");
    
    log("\n📝 NEXT STEPS:");
    log("1. Verify contracts on explorer (optional but recommended)");
    log("2. Update Python bot with vault address");
    log("3. Test with small deposit (1-5 USDC)");
    log("4. Monitor first trades");
    log("5. Open to beta users once confirmed working");
    
    return deploymentData;
    
  } catch (error) {
    deploymentData.status = 'failed';
    deploymentData.errors.push(error.message);
    
    log(`\n❌ DEPLOYMENT FAILED: ${error.message}`, 'error');
    
    await saveDeploymentData(true);
    
    throw error;
  }
}

// Execute deployment
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log("\n✅ Deployment completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Deployment failed:", error);
      process.exit(1);
    });
}

export default main;