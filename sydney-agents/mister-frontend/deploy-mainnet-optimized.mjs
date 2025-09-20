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

// Deployment data structure
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
  logs: [],
  gasPrice: null,
  blockGasLimit: null
};

function log(message, type = 'info') {
  console.log(message);
  deploymentData.logs.push({
    timestamp: new Date().toISOString(),
    message,
    type
  });
}

async function saveData(final = false) {
  const filename = final ? 'MAINNET_DEPLOYMENT_FINAL.json' : 'deployment_progress.json';
  fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));
  if (final) {
    log(`✅ Final deployment data saved to: ${filename}`);
  }
}

async function estimateGas(factory, ...args) {
  try {
    const deployTx = await factory.getDeployTransaction(...args);
    const gasEstimate = await factory.signer.estimateGas(deployTx);
    return gasEstimate;
  } catch (error) {
    log(`⚠️ Gas estimation failed: ${error.message}`, 'warning');
    return null;
  }
}

async function deployContract(name, factory, args = [], maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`\n📦 Deploying ${name} (Attempt ${attempt}/${maxRetries})...`);
      
      // Estimate gas first
      const gasEstimate = await estimateGas(factory, ...args);
      if (gasEstimate) {
        const gasLimit = gasEstimate.mul(120).div(100); // Add 20% buffer
        log(`   ⛽ Estimated gas: ${gasEstimate.toString()}`);
        log(`   ⛽ Gas limit set: ${gasLimit.toString()}`);
      }
      
      // Deploy with explicit gas settings
      const contract = await factory.deploy(...args, {
        gasLimit: gasEstimate ? gasEstimate.mul(120).div(100) : undefined,
        gasPrice: deploymentData.gasPrice
      });
      
      await contract.waitForDeployment();
      const address = await contract.getAddress();
      const tx = contract.deploymentTransaction();
      
      log(`   ✅ ${name} deployed to: ${address}`);
      log(`   📝 TX Hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      deploymentData.contracts[name] = address;
      deploymentData.transactionHashes[name] = tx.hash;
      deploymentData.blockNumbers[name] = receipt.blockNumber;
      deploymentData.gasUsed[name] = receipt.gasUsed.toString();
      
      await saveData();
      return { contract, address, receipt };
      
    } catch (error) {
      log(`   ❌ Attempt ${attempt} failed: ${error.message}`, 'error');
      deploymentData.errors.push({
        contract: name,
        attempt,
        error: error.message
      });
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      log(`   ⏳ Waiting 5 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function main() {
  log("\n" + "=".repeat(60));
  log("🚀 HYPEREVM MAINNET DEPLOYMENT - OPTIMIZED");
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
    
    if (parseFloat(balanceHYPE) < 0.1) {
      throw new Error("Insufficient HYPE balance (need at least 0.1 HYPE)");
    }
    
    // Check network
    const network = await provider.getNetwork();
    log(`🌐 Network: Chain ID ${network.chainId}`);
    
    if (network.chainId !== 999n) {
      throw new Error(`Wrong network! Expected 999, got ${network.chainId}`);
    }
    
    // Get network info
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    const gasPrice = (await provider.getFeeData()).gasPrice;
    
    deploymentData.gasPrice = gasPrice.toString();
    deploymentData.blockGasLimit = block.gasLimit.toString();
    
    log(`📦 Current Block: ${blockNumber}`);
    log(`⛽ Block Gas Limit: ${ethers.formatUnits(block.gasLimit, 'gwei')} Gwei`);
    log(`💸 Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    
    // Configuration
    const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x0000000000000000000000000000000000000000";
    
    log(`\n🔧 Configuration:`);
    log(`   USDC: ${USDC_ADDRESS}`);
    log(`   Keeper: ${wallet.address}`);
    log(`   AI Agent: ${wallet.address}`);
    
    await saveData();
    
    log("\n" + "=".repeat(60));
    log("📦 STARTING OPTIMIZED DEPLOYMENT");
    log("=".repeat(60));
    
    // Deploy contracts one by one with better error handling
    
    // 1. Deploy L1Read (smallest contract first)
    log("\n1️⃣ Deploying L1Read Oracle Contract...");
    const L1ReadFactory = new ethers.ContractFactory(
      L1ReadArtifact.abi,
      L1ReadArtifact.bytecode,
      wallet
    );
    
    const l1ReadResult = await deployContract('L1Read', L1ReadFactory);
    log(`   ⛽ Gas used: ${deploymentData.gasUsed.L1Read}`);
    
    // Wait between deployments
    log("\n⏳ Waiting 3 seconds before next deployment...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 2. Deploy AIAgentVault (medium size)
    log("\n2️⃣ Deploying AIAgentVault Contract...");
    const AIAgentVaultFactory = new ethers.ContractFactory(
      AIAgentVaultArtifact.abi,
      AIAgentVaultArtifact.bytecode,
      wallet
    );
    
    const aiAgentVaultResult = await deployContract(
      'AIAgentVault',
      AIAgentVaultFactory,
      [USDC_ADDRESS, wallet.address, wallet.address]
    );
    log(`   ⛽ Gas used: ${deploymentData.gasUsed.AIAgentVault}`);
    
    // Wait between deployments
    log("\n⏳ Waiting 3 seconds before next deployment...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Deploy VaultFactory (largest contract - may need special handling)
    log("\n3️⃣ Deploying VaultFactory Contract...");
    log("   ⚠️ Note: This is the largest contract and may require multiple attempts");
    
    const VaultFactoryFactory = new ethers.ContractFactory(
      VaultFactoryArtifact.abi,
      VaultFactoryArtifact.bytecode,
      wallet
    );
    
    const vaultFactoryResult = await deployContract(
      'VaultFactory',
      VaultFactoryFactory,
      [USDC_ADDRESS, wallet.address]
    );
    log(`   ⛽ Gas used: ${deploymentData.gasUsed.VaultFactory}`);
    
    // Calculate totals
    const totalGas = BigInt(deploymentData.gasUsed.L1Read || 0) + 
                    BigInt(deploymentData.gasUsed.AIAgentVault || 0) + 
                    BigInt(deploymentData.gasUsed.VaultFactory || 0);
    deploymentData.totalGasUsed = totalGas.toString();
    
    const totalCost = totalGas * BigInt(deploymentData.gasPrice);
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
    log(`   L1Read:       ${deploymentData.contracts.L1Read}`);
    log(`   VaultFactory: ${deploymentData.contracts.VaultFactory}`);
    log(`   AIAgentVault: ${deploymentData.contracts.AIAgentVault}`);
    
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
- **Address**: \`${deploymentData.contracts.L1Read}\`
- **Transaction**: \`${deploymentData.transactionHashes.L1Read}\`
- **Block**: ${deploymentData.blockNumbers.L1Read}
- **Gas Used**: ${deploymentData.gasUsed.L1Read}
- **Explorer**: https://explorer.hyperliquid.xyz/address/${deploymentData.contracts.L1Read}

#### AIAgentVault Contract
- **Address**: \`${deploymentData.contracts.AIAgentVault}\`
- **Transaction**: \`${deploymentData.transactionHashes.AIAgentVault}\`
- **Block**: ${deploymentData.blockNumbers.AIAgentVault}
- **Gas Used**: ${deploymentData.gasUsed.AIAgentVault}
- **Explorer**: https://explorer.hyperliquid.xyz/address/${deploymentData.contracts.AIAgentVault}

#### VaultFactory Contract
- **Address**: \`${deploymentData.contracts.VaultFactory}\`
- **Transaction**: \`${deploymentData.transactionHashes.VaultFactory}\`
- **Block**: ${deploymentData.blockNumbers.VaultFactory}
- **Gas Used**: ${deploymentData.gasUsed.VaultFactory}
- **Explorer**: https://explorer.hyperliquid.xyz/address/${deploymentData.contracts.VaultFactory}

### 💰 Deployment Costs
- **Total Gas Used**: ${deploymentData.totalGasUsed}
- **Total Cost**: ${deploymentData.totalCostHYPE} HYPE
- **Gas Price**: ${ethers.formatUnits(BigInt(deploymentData.gasPrice), 'gwei')} Gwei

### 🔗 Important Configuration

#### For Python Trading Bot
\`\`\`python
VAULT_ADDRESS = "${deploymentData.contracts.AIAgentVault}"
KEEPER_BOT = "${wallet.address}"
AI_AGENT = "${wallet.address}"
CHAIN_ID = 999
RPC_URL = "https://rpc.hyperliquid.xyz/evm"
\`\`\`

#### For Frontend Integration
\`\`\`javascript
export const MAINNET_CONTRACTS = {
  L1Read: "${deploymentData.contracts.L1Read}",
  VaultFactory: "${deploymentData.contracts.VaultFactory}",
  AIAgentVault: "${deploymentData.contracts.AIAgentVault}",
  chainId: 999,
  deployer: "${wallet.address}"
};
\`\`\`

### 📝 Next Steps

1. **Update Python Bot**
   - Add vault address: \`${deploymentData.contracts.AIAgentVault}\`
   - Configure authorization system

2. **Test Vault Functions**
   - Deposit small amount (1-5 USDC)
   - Test authorization
   - Verify withdrawal

3. **Connect Keeper Bot**
   - Monitor authorization events
   - Execute trades on L1

4. **Production Testing**
   - Use your $60 USDC first
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
  L1Read: "${deploymentData.contracts.L1Read}",
  VaultFactory: "${deploymentData.contracts.VaultFactory}",
  AIAgentVault: "${deploymentData.contracts.AIAgentVault}",
  chainId: 999,
  deployer: "${wallet.address}",
  deploymentTx: {
    L1Read: "${deploymentData.transactionHashes.L1Read}",
    VaultFactory: "${deploymentData.transactionHashes.VaultFactory}",
    AIAgentVault: "${deploymentData.transactionHashes.AIAgentVault}"
  },
  deploymentBlock: {
    L1Read: ${deploymentData.blockNumbers.L1Read},
    VaultFactory: ${deploymentData.blockNumbers.VaultFactory},
    AIAgentVault: ${deploymentData.blockNumbers.AIAgentVault}
  }
};

export default MAINNET_CONTRACTS;`;
    
    fs.writeFileSync(path.join(configDir, 'mainnet-contracts.js'), config);
    log("✅ Frontend config saved to: src/config/mainnet-contracts.js");
    
    log("\n🎯 CRITICAL ADDRESSES TO SAVE:");
    log("─".repeat(60));
    log(`AIAgentVault: ${deploymentData.contracts.AIAgentVault}`);
    log("─".repeat(60));
    log("This is the main contract your Python bot needs!");
    
  } catch (error) {
    deploymentData.status = 'failed';
    deploymentData.errors.push({
      critical: true,
      error: error.message,
      stack: error.stack
    });
    log(`\n❌ DEPLOYMENT FAILED: ${error.message}`, 'error');
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