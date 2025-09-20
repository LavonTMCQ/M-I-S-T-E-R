#!/usr/bin/env node

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import contract artifacts
import AIAgentVaultArtifact from './artifacts/src/contracts/hyperevm/AIAgentVault.sol/AIAgentVault.json' assert { type: 'json' };
import VaultFactoryArtifact from './artifacts/src/contracts/hyperevm/VaultFactory.sol/VaultFactory.json' assert { type: 'json' };
import L1ReadArtifact from './artifacts/src/contracts/hyperevm/L1Read.sol/L1Read.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Deployment data
const deploymentData = {
  network: 'hyperevm_mainnet',
  chainId: 999,
  timestamp: new Date().toISOString(),
  deployer: null,
  contracts: {},
  gasUsed: {},
  transactionHashes: {},
  blockNumbers: {},
  totalGasUsed: '0',
  totalCostHYPE: '0',
  status: 'pending',
  errors: [],
  logs: []
};

function log(message) {
  console.log(message);
  deploymentData.logs.push({
    timestamp: new Date().toISOString(),
    message
  });
}

async function saveData(final = false) {
  const filename = final ? 'MAINNET_DEPLOYMENT_FINAL.json' : 'deployment_progress.json';
  fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));
  if (final) {
    log(`✅ Final deployment data saved to: ${filename}`);
  }
}

async function main() {
  log("\n" + "=".repeat(60));
  log("🚀 HYPEREVM MAINNET DEPLOYMENT - DIRECT MODE");
  log("=".repeat(60) + "\n");
  
  try {
    // Connect to HyperEVM mainnet
    const provider = new ethers.JsonRpcProvider('https://rpc.hyperliquid.xyz/evm');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    deploymentData.deployer = wallet.address;
    
    log(`📍 Deployer: ${wallet.address}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceHYPE = ethers.formatEther(balance);
    log(`💰 Balance: ${balanceHYPE} HYPE`);
    
    if (parseFloat(balanceHYPE) < 0.01) {
      throw new Error("Insufficient HYPE balance");
    }
    
    // Check network
    const network = await provider.getNetwork();
    log(`🌐 Network: Chain ID ${network.chainId}`);
    
    if (network.chainId !== 999n) {
      throw new Error(`Wrong network! Expected 999, got ${network.chainId}`);
    }
    
    const blockNumber = await provider.getBlockNumber();
    log(`📦 Block: ${blockNumber}`);
    
    // Configuration
    const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x0000000000000000000000000000000000000000";
    
    log(`\n🔧 Config:`);
    log(`   USDC: ${USDC_ADDRESS}`);
    log(`   Keeper: ${wallet.address}`);
    log(`   AI Agent: ${wallet.address}`);
    
    await saveData();
    
    log("\n" + "=".repeat(60));
    log("📦 DEPLOYING CONTRACTS");
    log("=".repeat(60) + "\n");
    
    // Deploy L1Read
    log("1️⃣ Deploying L1Read...");
    const L1ReadFactory = new ethers.ContractFactory(
      L1ReadArtifact.abi,
      L1ReadArtifact.bytecode,
      wallet
    );
    
    const l1Read = await L1ReadFactory.deploy();
    await l1Read.waitForDeployment();
    const l1ReadAddress = await l1Read.getAddress();
    const l1ReadTx = l1Read.deploymentTransaction();
    
    deploymentData.contracts.L1Read = l1ReadAddress;
    deploymentData.transactionHashes.L1Read = l1ReadTx.hash;
    
    log(`   ✅ L1Read: ${l1ReadAddress}`);
    log(`   📝 TX: ${l1ReadTx.hash}`);
    
    const l1ReadReceipt = await l1ReadTx.wait();
    deploymentData.gasUsed.L1Read = l1ReadReceipt.gasUsed.toString();
    deploymentData.blockNumbers.L1Read = l1ReadReceipt.blockNumber;
    
    await saveData();
    
    // Deploy VaultFactory
    log("\n2️⃣ Deploying VaultFactory...");
    const VaultFactoryFactory = new ethers.ContractFactory(
      VaultFactoryArtifact.abi,
      VaultFactoryArtifact.bytecode,
      wallet
    );
    
    const vaultFactory = await VaultFactoryFactory.deploy(USDC_ADDRESS, wallet.address);
    await vaultFactory.waitForDeployment();
    const vaultFactoryAddress = await vaultFactory.getAddress();
    const vaultFactoryTx = vaultFactory.deploymentTransaction();
    
    deploymentData.contracts.VaultFactory = vaultFactoryAddress;
    deploymentData.transactionHashes.VaultFactory = vaultFactoryTx.hash;
    
    log(`   ✅ VaultFactory: ${vaultFactoryAddress}`);
    log(`   📝 TX: ${vaultFactoryTx.hash}`);
    
    const vaultFactoryReceipt = await vaultFactoryTx.wait();
    deploymentData.gasUsed.VaultFactory = vaultFactoryReceipt.gasUsed.toString();
    deploymentData.blockNumbers.VaultFactory = vaultFactoryReceipt.blockNumber;
    
    await saveData();
    
    // Deploy AIAgentVault
    log("\n3️⃣ Deploying AIAgentVault...");
    const AIAgentVaultFactory = new ethers.ContractFactory(
      AIAgentVaultArtifact.abi,
      AIAgentVaultArtifact.bytecode,
      wallet
    );
    
    const aiAgentVault = await AIAgentVaultFactory.deploy(
      USDC_ADDRESS,
      wallet.address, // keeper bot
      wallet.address  // AI agent
    );
    await aiAgentVault.waitForDeployment();
    const aiAgentVaultAddress = await aiAgentVault.getAddress();
    const aiAgentVaultTx = aiAgentVault.deploymentTransaction();
    
    deploymentData.contracts.AIAgentVault = aiAgentVaultAddress;
    deploymentData.transactionHashes.AIAgentVault = aiAgentVaultTx.hash;
    
    log(`   ✅ AIAgentVault: ${aiAgentVaultAddress}`);
    log(`   📝 TX: ${aiAgentVaultTx.hash}`);
    
    const aiAgentVaultReceipt = await aiAgentVault.waitForDeployment();
    deploymentData.gasUsed.AIAgentVault = aiAgentVaultReceipt.gasUsed.toString();
    deploymentData.blockNumbers.AIAgentVault = aiAgentVaultReceipt.blockNumber;
    
    // Calculate totals
    const totalGas = BigInt(deploymentData.gasUsed.L1Read) + 
                    BigInt(deploymentData.gasUsed.VaultFactory) + 
                    BigInt(deploymentData.gasUsed.AIAgentVault);
    deploymentData.totalGasUsed = totalGas.toString();
    
    const gasPrice = (await provider.getFeeData()).gasPrice;
    const totalCost = totalGas * gasPrice;
    deploymentData.totalCostHYPE = ethers.formatEther(totalCost);
    
    deploymentData.status = 'success';
    
    log("\n" + "=".repeat(60));
    log("🎉 DEPLOYMENT SUCCESSFUL!");
    log("=".repeat(60) + "\n");
    
    log("📊 DEPLOYMENT SUMMARY:");
    log(`   Total Gas: ${deploymentData.totalGasUsed}`);
    log(`   Total Cost: ${deploymentData.totalCostHYPE} HYPE`);
    log(`   Remaining Balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} HYPE`);
    
    log("\n📋 CONTRACT ADDRESSES (SAVE THESE!):");
    log(`   L1Read:       ${l1ReadAddress}`);
    log(`   VaultFactory: ${vaultFactoryAddress}`);
    log(`   AIAgentVault: ${aiAgentVaultAddress}`);
    
    await saveData(true);
    
    // Create markdown report
    const report = `# HyperEVM Mainnet Deployment

## ✅ DEPLOYMENT SUCCESSFUL

### 📅 Deployment Details
- **Date**: ${deploymentData.timestamp}
- **Network**: HyperEVM Mainnet (Chain ID 999)
- **Deployer**: ${deploymentData.deployer}

### 📦 Contract Addresses
- **L1Read**: \`${l1ReadAddress}\`
- **VaultFactory**: \`${vaultFactoryAddress}\`
- **AIAgentVault**: \`${aiAgentVaultAddress}\`

### 📝 Transaction Hashes
- **L1Read TX**: \`${deploymentData.transactionHashes.L1Read}\`
- **VaultFactory TX**: \`${deploymentData.transactionHashes.VaultFactory}\`
- **AIAgentVault TX**: \`${deploymentData.transactionHashes.AIAgentVault}\`

### 💰 Deployment Cost
- **Total Gas Used**: ${deploymentData.totalGasUsed}
- **Total Cost**: ${deploymentData.totalCostHYPE} HYPE

### 🔗 Explorer Links
- [L1Read Contract](https://explorer.hyperliquid.xyz/address/${l1ReadAddress})
- [VaultFactory Contract](https://explorer.hyperliquid.xyz/address/${vaultFactoryAddress})
- [AIAgentVault Contract](https://explorer.hyperliquid.xyz/address/${aiAgentVaultAddress})

### 📝 Next Steps
1. Update Python bot with vault address: \`${aiAgentVaultAddress}\`
2. Test deposit/withdrawal functions
3. Connect keeper bot
4. Monitor first trades

---
Generated: ${new Date().toISOString()}
`;
    
    fs.writeFileSync('MAINNET_DEPLOYMENT.md', report);
    log("\n📄 Report saved to: MAINNET_DEPLOYMENT.md");
    
    // Save contract config
    const configDir = path.join(__dirname, 'src', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const config = `// HyperEVM Mainnet Contracts
export const MAINNET_CONTRACTS = {
  L1Read: "${l1ReadAddress}",
  VaultFactory: "${vaultFactoryAddress}",
  AIAgentVault: "${aiAgentVaultAddress}",
  chainId: 999,
  deployer: "${wallet.address}"
};`;
    
    fs.writeFileSync(path.join(configDir, 'mainnet-contracts.js'), config);
    log("✅ Config saved to: src/config/mainnet-contracts.js");
    
  } catch (error) {
    deploymentData.status = 'failed';
    deploymentData.errors.push(error.message);
    log(`\n❌ DEPLOYMENT FAILED: ${error.message}`);
    await saveData(true);
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✅ DEPLOYMENT COMPLETE!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });