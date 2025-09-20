#!/usr/bin/env node

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Load contract artifacts
const AIAgentVaultArtifact = JSON.parse(fs.readFileSync('./artifacts/src/contracts/hyperevm/AIAgentVault.sol/AIAgentVault.json', 'utf8'));
const VaultFactoryArtifact = JSON.parse(fs.readFileSync('./artifacts/src/contracts/hyperevm/VaultFactory.sol/VaultFactory.json', 'utf8'));
const L1ReadArtifact = JSON.parse(fs.readFileSync('./artifacts/src/contracts/hyperevm/L1Read.sol/L1Read.json', 'utf8'));

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
  log("🚀 HYPEREVM MAINNET DEPLOYMENT");
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
    log(`📦 Current Block: ${blockNumber}`);
    
    // Configuration
    const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x0000000000000000000000000000000000000000";
    
    log(`\n🔧 Configuration:`);
    log(`   USDC: ${USDC_ADDRESS}`);
    log(`   Keeper: ${wallet.address}`);
    log(`   AI Agent: ${wallet.address}`);
    
    await saveData();
    
    log("\n" + "=".repeat(60));
    log("📦 DEPLOYING CONTRACTS");
    log("=".repeat(60) + "\n");
    
    // Deploy L1Read
    log("1️⃣ Deploying L1Read Oracle...");
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
    
    log(`   ✅ Deployed: ${l1ReadAddress}`);
    log(`   📝 TX Hash: ${l1ReadTx.hash}`);
    
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
    
    log(`   ✅ Deployed: ${vaultFactoryAddress}`);
    log(`   📝 TX Hash: ${vaultFactoryTx.hash}`);
    
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
    
    log(`   ✅ Deployed: ${aiAgentVaultAddress}`);
    log(`   📝 TX Hash: ${aiAgentVaultTx.hash}`);
    
    const aiAgentVaultReceipt = await aiAgentVaultTx.wait();
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
    log(`   Total Gas Used: ${deploymentData.totalGasUsed}`);
    log(`   Total Cost: ${deploymentData.totalCostHYPE} HYPE`);
    log(`   Remaining Balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} HYPE`);
    
    log("\n📋 CONTRACT ADDRESSES (CRITICAL - SAVE THESE!):");
    log(`   L1Read:       ${l1ReadAddress}`);
    log(`   VaultFactory: ${vaultFactoryAddress}`);
    log(`   AIAgentVault: ${aiAgentVaultAddress}`);
    
    await saveData(true);
    
    // Create comprehensive markdown report
    const report = `# 🚀 HyperEVM Mainnet Deployment Report

## ✅ DEPLOYMENT SUCCESSFUL

### 📅 Deployment Information
- **Date**: ${deploymentData.timestamp}
- **Network**: HyperEVM Mainnet
- **Chain ID**: 999
- **Deployer**: ${deploymentData.deployer}
- **Status**: SUCCESS

### 📦 Deployed Contract Addresses

#### L1Read Oracle Contract
- **Address**: \`${l1ReadAddress}\`
- **Transaction**: \`${deploymentData.transactionHashes.L1Read}\`
- **Block**: ${deploymentData.blockNumbers.L1Read}
- **Gas Used**: ${deploymentData.gasUsed.L1Read}
- **Explorer**: https://explorer.hyperliquid.xyz/address/${l1ReadAddress}

#### VaultFactory Contract
- **Address**: \`${vaultFactoryAddress}\`
- **Transaction**: \`${deploymentData.transactionHashes.VaultFactory}\`
- **Block**: ${deploymentData.blockNumbers.VaultFactory}
- **Gas Used**: ${deploymentData.gasUsed.VaultFactory}
- **Explorer**: https://explorer.hyperliquid.xyz/address/${vaultFactoryAddress}

#### AIAgentVault Contract
- **Address**: \`${aiAgentVaultAddress}\`
- **Transaction**: \`${deploymentData.transactionHashes.AIAgentVault}\`
- **Block**: ${deploymentData.blockNumbers.AIAgentVault}
- **Gas Used**: ${deploymentData.gasUsed.AIAgentVault}
- **Explorer**: https://explorer.hyperliquid.xyz/address/${aiAgentVaultAddress}

### 💰 Deployment Costs
- **Total Gas Used**: ${deploymentData.totalGasUsed}
- **Total Cost**: ${deploymentData.totalCostHYPE} HYPE
- **Gas Price**: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei

### 🔗 Important Configuration

#### For Python Trading Bot
\`\`\`python
VAULT_ADDRESS = "${aiAgentVaultAddress}"
KEEPER_BOT = "${wallet.address}"
AI_AGENT = "${wallet.address}"
CHAIN_ID = 999
RPC_URL = "https://rpc.hyperliquid.xyz/evm"
\`\`\`

#### For Frontend Integration
\`\`\`javascript
export const MAINNET_CONTRACTS = {
  L1Read: "${l1ReadAddress}",
  VaultFactory: "${vaultFactoryAddress}",
  AIAgentVault: "${aiAgentVaultAddress}",
  chainId: 999,
  deployer: "${wallet.address}"
};
\`\`\`

### 📝 Next Steps

1. **Update Python Bot**
   - Add vault address: \`${aiAgentVaultAddress}\`
   - Configure authorization system

2. **Test Vault Functions**
   - Deposit small amount (1-5 USDC)
   - Test authorization
   - Verify withdrawal

3. **Connect Keeper Bot**
   - Monitor authorization events
   - Execute trades on L1

4. **Production Testing**
   - Use your $40 USDC first
   - Monitor performance
   - Check fee collection

5. **Beta Launch**
   - Open to 10 users
   - Monitor closely
   - Scale gradually

### 🔒 Security Notes
- Keeper Bot: Currently set to deployer address
- AI Agent: Currently set to deployer address
- Update these addresses after testing

### 📊 Contract Verification
To verify on explorer:
1. Visit each contract address link above
2. Click "Verify and Publish"
3. Submit source code

---
Generated: ${new Date().toISOString()}
Deployment ID: ${deploymentData.timestamp}
`;
    
    fs.writeFileSync('MAINNET_DEPLOYMENT_REPORT.md', report);
    log("\n📄 Detailed report saved to: MAINNET_DEPLOYMENT_REPORT.md");
    
    // Save contract config for frontend
    const configDir = path.join(__dirname, 'src', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const config = `// HyperEVM Mainnet Contract Configuration
// Generated: ${deploymentData.timestamp}
// DO NOT MODIFY - This is the official mainnet deployment

export const MAINNET_CONTRACTS = {
  L1Read: "${l1ReadAddress}",
  VaultFactory: "${vaultFactoryAddress}",
  AIAgentVault: "${aiAgentVaultAddress}",
  chainId: 999,
  deployer: "${wallet.address}",
  deploymentTx: {
    L1Read: "${deploymentData.transactionHashes.L1Read}",
    VaultFactory: "${deploymentData.transactionHashes.VaultFactory}",
    AIAgentVault: "${deploymentData.transactionHashes.AIAgentVault}"
  }
};

export default MAINNET_CONTRACTS;`;
    
    fs.writeFileSync(path.join(configDir, 'mainnet-contracts.js'), config);
    log("✅ Frontend config saved to: src/config/mainnet-contracts.js");
    
    log("\n🎯 CRITICAL ADDRESSES TO SAVE:");
    log("─".repeat(60));
    log(`AIAgentVault: ${aiAgentVaultAddress}`);
    log("─".repeat(60));
    log("This is the main contract your Python bot needs!");
    
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
    console.log("\n✅ DEPLOYMENT COMPLETE - CHECK FILES FOR ADDRESSES!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment error:", error);
    process.exit(1);
  });