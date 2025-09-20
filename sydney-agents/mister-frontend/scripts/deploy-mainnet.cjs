const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

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
  totalGasUsed: '0',
  totalCostHYPE: '0',
  status: 'pending',
  errors: [],
  logs: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  console.log(message);
  deploymentData.logs.push({ timestamp, message, type });
}

async function saveDeploymentData(final = false) {
  const filename = final ? 'mainnet-deployment-final.json' : 'mainnet-deployment-progress.json';
  const filepath = path.join(__dirname, '..', filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
  
  if (final) {
    log(`\n✅ Deployment data saved to: ${filename}`);
    createDeploymentReport();
  }
}

function createDeploymentReport() {
  const report = `# HyperEVM Mainnet Deployment Report

## 📅 Deployment Information
- **Date**: ${deploymentData.timestamp}
- **Network**: HyperEVM Mainnet
- **Chain ID**: ${deploymentData.chainId}
- **Deployer**: ${deploymentData.deployer}
- **Status**: ${deploymentData.status}

## 📦 Deployed Contracts

### L1Read Oracle
- **Address**: \`${deploymentData.contracts.L1Read || 'Not deployed'}\`
- **Transaction**: \`${deploymentData.transactionHashes.L1Read || 'N/A'}\`
- **Block**: ${deploymentData.blockNumbers.L1Read || 'N/A'}
- **Gas Used**: ${deploymentData.gasUsed.L1Read || 'N/A'}

### VaultFactory
- **Address**: \`${deploymentData.contracts.VaultFactory || 'Not deployed'}\`
- **Transaction**: \`${deploymentData.transactionHashes.VaultFactory || 'N/A'}\`
- **Block**: ${deploymentData.blockNumbers.VaultFactory || 'N/A'}
- **Gas Used**: ${deploymentData.gasUsed.VaultFactory || 'N/A'}

### AIAgentVault (Sample)
- **Address**: \`${deploymentData.contracts.AIAgentVault || 'Not deployed'}\`
- **Transaction**: \`${deploymentData.transactionHashes.AIAgentVault || 'N/A'}\`
- **Block**: ${deploymentData.blockNumbers.AIAgentVault || 'N/A'}
- **Gas Used**: ${deploymentData.gasUsed.AIAgentVault || 'N/A'}

## 💰 Deployment Costs
- **Total Gas Used**: ${deploymentData.totalGasUsed}
- **Total Cost**: ${deploymentData.totalCostHYPE} HYPE

## 🔗 Explorer Links
- **L1Read**: https://explorer.hyperliquid.xyz/address/${deploymentData.contracts.L1Read}
- **VaultFactory**: https://explorer.hyperliquid.xyz/address/${deploymentData.contracts.VaultFactory}
- **AIAgentVault**: https://explorer.hyperliquid.xyz/address/${deploymentData.contracts.AIAgentVault}

## 📝 Next Steps
1. Verify contracts on explorer
2. Update frontend with contract addresses
3. Connect Python trading bot to vault
4. Test with small deposit
5. Monitor initial operations

---
Generated: ${new Date().toISOString()}
`;
  
  const reportPath = path.join(__dirname, '..', 'MAINNET_DEPLOYMENT_REPORT.md');
  fs.writeFileSync(reportPath, report);
  log(`📄 Deployment report saved to: MAINNET_DEPLOYMENT_REPORT.md`);
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 HYPEREVM MAINNET DEPLOYMENT");
  console.log("=".repeat(60) + "\n");
  
  try {
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
    
    const blockNumber = await ethers.provider.getBlockNumber();
    log(`📦 Current Block: ${blockNumber}`);
    
    // Configuration
    const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x0000000000000000000000000000000000000000";
    const KEEPER_BOT_ADDRESS = deployer.address;
    const AI_AGENT_ADDRESS = deployer.address;
    
    log(`\n🔧 Configuration:`);
    log(`   USDC Token: ${USDC_ADDRESS}`);
    log(`   Keeper Bot: ${KEEPER_BOT_ADDRESS}`);
    log(`   AI Agent: ${AI_AGENT_ADDRESS}`);
    
    await saveDeploymentData();
    
    log("\n" + "=".repeat(60));
    log("📦 DEPLOYING CONTRACTS");
    log("=".repeat(60) + "\n");
    
    // Deploy L1Read
    log("1️⃣ Deploying L1Read...");
    const L1Read = await ethers.getContractFactory("L1Read");
    const l1Read = await L1Read.deploy();
    await l1Read.waitForDeployment();
    
    const l1ReadAddress = await l1Read.getAddress();
    const l1ReadTx = l1Read.deploymentTransaction();
    
    deploymentData.contracts.L1Read = l1ReadAddress;
    deploymentData.transactionHashes.L1Read = l1ReadTx.hash;
    
    const l1ReadReceipt = await l1ReadTx.wait();
    deploymentData.gasUsed.L1Read = l1ReadReceipt.gasUsed.toString();
    deploymentData.blockNumbers.L1Read = l1ReadReceipt.blockNumber;
    
    log(`   ✅ L1Read deployed to: ${l1ReadAddress}`);
    log(`   📝 TX: ${l1ReadTx.hash}`);
    
    await saveDeploymentData();
    
    // Deploy VaultFactory
    log("\n2️⃣ Deploying VaultFactory...");
    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    const vaultFactory = await VaultFactory.deploy(USDC_ADDRESS, deployer.address);
    await vaultFactory.waitForDeployment();
    
    const vaultFactoryAddress = await vaultFactory.getAddress();
    const vaultFactoryTx = vaultFactory.deploymentTransaction();
    
    deploymentData.contracts.VaultFactory = vaultFactoryAddress;
    deploymentData.transactionHashes.VaultFactory = vaultFactoryTx.hash;
    
    const vaultFactoryReceipt = await vaultFactoryTx.wait();
    deploymentData.gasUsed.VaultFactory = vaultFactoryReceipt.gasUsed.toString();
    deploymentData.blockNumbers.VaultFactory = vaultFactoryReceipt.blockNumber;
    
    log(`   ✅ VaultFactory deployed to: ${vaultFactoryAddress}`);
    log(`   📝 TX: ${vaultFactoryTx.hash}`);
    
    await saveDeploymentData();
    
    // Deploy AIAgentVault
    log("\n3️⃣ Deploying AIAgentVault...");
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
    
    const aiAgentVaultReceipt = await aiAgentVaultTx.wait();
    deploymentData.gasUsed.AIAgentVault = aiAgentVaultReceipt.gasUsed.toString();
    deploymentData.blockNumbers.AIAgentVault = aiAgentVaultReceipt.blockNumber;
    
    log(`   ✅ AIAgentVault deployed to: ${aiAgentVaultAddress}`);
    log(`   📝 TX: ${aiAgentVaultTx.hash}`);
    
    // Calculate totals
    const totalGasUsed = BigInt(deploymentData.gasUsed.L1Read) + 
                        BigInt(deploymentData.gasUsed.VaultFactory) + 
                        BigInt(deploymentData.gasUsed.AIAgentVault);
    deploymentData.totalGasUsed = totalGasUsed.toString();
    
    const gasPrice = await ethers.provider.getFeeData();
    const totalCostWei = totalGasUsed * gasPrice.gasPrice;
    deploymentData.totalCostHYPE = ethers.formatEther(totalCostWei);
    
    deploymentData.status = 'success';
    
    log("\n" + "=".repeat(60));
    log("🎉 DEPLOYMENT SUCCESSFUL!");
    log("=".repeat(60) + "\n");
    
    log("📊 SUMMARY:");
    log(`   Total Gas: ${deploymentData.totalGasUsed}`);
    log(`   Total Cost: ${deploymentData.totalCostHYPE} HYPE`);
    
    log("\n📋 CONTRACT ADDRESSES:");
    log(`   L1Read:       ${l1ReadAddress}`);
    log(`   VaultFactory: ${vaultFactoryAddress}`);
    log(`   AIAgentVault: ${aiAgentVaultAddress}`);
    
    await saveDeploymentData(true);
    
    // Create config directory if it doesn't exist
    const configDir = path.join(__dirname, '..', 'src', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Save contract config
    const contractConfig = `// HyperEVM Mainnet Contract Addresses
// Deployed: ${deploymentData.timestamp}

export const MAINNET_CONTRACTS = {
  L1Read: "${l1ReadAddress}",
  VaultFactory: "${vaultFactoryAddress}",
  AIAgentVault: "${aiAgentVaultAddress}",
  chainId: 999,
  deployer: "${deployer.address}"
};
`;
    
    fs.writeFileSync(
      path.join(configDir, 'mainnet-contracts.js'),
      contractConfig
    );
    
    log("\n✅ Contract config saved to: src/config/mainnet-contracts.js");
    
    return deploymentData;
    
  } catch (error) {
    deploymentData.status = 'failed';
    deploymentData.errors.push(error.message);
    
    log(`\n❌ DEPLOYMENT FAILED: ${error.message}`, 'error');
    
    await saveDeploymentData(true);
    
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✅ Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });