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

// Load minimal vault contract
const MinimalVaultArtifact = JSON.parse(
  fs.readFileSync('./artifacts/src/contracts/hyperevm/MinimalVault.sol/MinimalVault.json', 'utf8')
);

// Deployment tracking
const deploymentData = {
  network: 'hyperevm_mainnet',
  chainId: 999,
  timestamp: new Date().toISOString(),
  deployer: null,
  vaultAddress: null,
  txHash: null,
  blockNumber: null,
  gasUsed: null,
  status: 'pending',
  pythonBotConfig: null
};

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 HYPEREVM MINIMAL VAULT DEPLOYMENT");
  console.log("=".repeat(60) + "\n");
  
  try {
    // Connect to HyperEVM mainnet
    const provider = new ethers.JsonRpcProvider('https://rpc.hyperliquid.xyz/evm');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    deploymentData.deployer = wallet.address;
    
    console.log(`📍 Deployer: ${wallet.address}`);
    console.log(`🤖 AI Agent: ${wallet.address} (same as deployer for now)`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceHYPE = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceHYPE} HYPE`);
    
    if (parseFloat(balanceHYPE) < 0.01) {
      throw new Error("Insufficient HYPE balance");
    }
    
    // Check network
    const network = await provider.getNetwork();
    console.log(`🌐 Network: Chain ID ${network.chainId}`);
    
    if (network.chainId !== 999n) {
      throw new Error(`Wrong network! Expected 999, got ${network.chainId}`);
    }
    
    // Get gas info
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    const gasPrice = (await provider.getFeeData()).gasPrice;
    
    console.log(`📦 Current Block: ${blockNumber}`);
    console.log(`⛽ Block Gas Limit: ${block.gasLimit.toString()} (${(block.gasLimit / 1000000n).toString()}M)`);
    console.log(`💸 Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    
    // Check bytecode size
    const bytecodeSize = MinimalVaultArtifact.bytecode.length / 2 - 1;
    console.log(`📏 MinimalVault bytecode size: ${bytecodeSize} bytes`);
    
    console.log("\n" + "=".repeat(60));
    console.log("📦 DEPLOYING MINIMAL VAULT CONTRACT");
    console.log("=".repeat(60) + "\n");
    
    // Deploy MinimalVault
    const MinimalVaultFactory = new ethers.ContractFactory(
      MinimalVaultArtifact.abi,
      MinimalVaultArtifact.bytecode,
      wallet
    );
    
    // Estimate gas first
    console.log("⛽ Estimating gas...");
    const deployTx = await MinimalVaultFactory.getDeployTransaction(wallet.address);
    const gasEstimate = await wallet.estimateGas(deployTx);
    console.log(`   Estimated gas: ${gasEstimate.toString()}`);
    console.log(`   Block limit: ${block.gasLimit.toString()}`);
    console.log(`   Usage: ${(gasEstimate * 100n / block.gasLimit).toString()}% of block`);
    
    if (gasEstimate > block.gasLimit) {
      throw new Error(`Contract requires ${gasEstimate} gas, but block limit is ${block.gasLimit}`);
    }
    
    // Deploy with gas buffer
    console.log("\n🚀 Deploying contract...");
    const vault = await MinimalVaultFactory.deploy(wallet.address, {
      gasLimit: gasEstimate * 120n / 100n, // 20% buffer
      gasPrice: gasPrice
    });
    
    console.log("⏳ Waiting for deployment...");
    await vault.waitForDeployment();
    
    const vaultAddress = await vault.getAddress();
    const tx = vault.deploymentTransaction();
    const receipt = await tx.wait();
    
    deploymentData.vaultAddress = vaultAddress;
    deploymentData.txHash = tx.hash;
    deploymentData.blockNumber = receipt.blockNumber;
    deploymentData.gasUsed = receipt.gasUsed.toString();
    deploymentData.status = 'success';
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(60) + "\n");
    
    console.log(`✅ Vault Address: ${vaultAddress}`);
    console.log(`📝 Transaction: ${tx.hash}`);
    console.log(`📦 Block: ${receipt.blockNumber}`);
    console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`💰 Cost: ${ethers.formatEther(receipt.gasUsed * gasPrice)} HYPE`);
    
    // Create Python bot configuration
    deploymentData.pythonBotConfig = {
      vault_address: vaultAddress,
      ai_agent: wallet.address,
      owner: wallet.address,
      chain_id: 999,
      rpc_url: "https://rpc.hyperliquid.xyz/evm",
      private_key: "YOUR_PRIVATE_KEY_HERE"
    };
    
    // Save deployment data
    const deploymentFile = 'HYPEREVM_VAULT_DEPLOYMENT.json';
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log(`\n📄 Deployment data saved to: ${deploymentFile}`);
    
    // Create markdown report
    const report = `# 🚀 HyperEVM Minimal Vault Deployment

## ✅ DEPLOYMENT SUCCESSFUL

### 📅 Deployment Information
- **Date**: ${deploymentData.timestamp}
- **Network**: HyperEVM Mainnet
- **Chain ID**: 999
- **Deployer**: ${deploymentData.deployer}
- **Status**: SUCCESS

### 📦 Deployed Contract
- **Vault Address**: \`${vaultAddress}\`
- **Transaction Hash**: \`${tx.hash}\`
- **Block Number**: ${receipt.blockNumber}
- **Gas Used**: ${receipt.gasUsed.toString()}
- **Deployment Cost**: ${ethers.formatEther(receipt.gasUsed * gasPrice)} HYPE
- **Explorer**: https://explorer.hyperliquid.xyz/address/${vaultAddress}

### 🐍 Python Trading Bot Configuration
\`\`\`python
# Add to your Python trading bot
VAULT_ADDRESS = "${vaultAddress}"
AI_AGENT = "${wallet.address}"
OWNER = "${wallet.address}"
CHAIN_ID = 999
RPC_URL = "https://rpc.hyperliquid.xyz/evm"

# Web3 connection
from web3 import Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))
vault_contract = w3.eth.contract(address=VAULT_ADDRESS, abi=vault_abi)
\`\`\`

### 🔧 Contract Functions
- \`deposit()\` - Deposit HYPE (send value with transaction)
- \`withdraw(amount)\` - Withdraw your HYPE
- \`authorizeTrade(amount)\` - AI authorizes a trade
- \`executeTrade(target, data)\` - Execute authorized trade
- \`balances(address)\` - Check user balance
- \`totalDeposits()\` - Check total vault deposits

### 📝 Next Steps
1. **Test Deposit**: Send small amount of HYPE to test
2. **Connect Python Bot**: Update bot with vault address
3. **Test Authorization**: Have AI authorize a trade
4. **Execute Trade**: Test trade execution
5. **Monitor Performance**: Track trades and returns

### 🔒 Security Notes
- Owner: ${wallet.address}
- AI Agent: ${wallet.address}
- Both are currently the same address (update after testing)

### 💡 Integration Example
\`\`\`javascript
// Frontend integration
const vaultAddress = "${vaultAddress}";
const vaultABI = ${JSON.stringify(MinimalVaultArtifact.abi, null, 2)};

// Deposit HYPE
await vaultContract.deposit({ value: ethers.parseEther("0.1") });

// Check balance
const balance = await vaultContract.balances(userAddress);
\`\`\`

---
Generated: ${new Date().toISOString()}
`;
    
    fs.writeFileSync('HYPEREVM_VAULT_DEPLOYMENT.md', report);
    console.log(`📄 Report saved to: HYPEREVM_VAULT_DEPLOYMENT.md`);
    
    // Save frontend config
    const configDir = path.join(__dirname, 'src', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const config = `// HyperEVM Minimal Vault Configuration
// Generated: ${deploymentData.timestamp}
// THIS IS THE LIVE MAINNET DEPLOYMENT

export const HYPEREVM_VAULT = {
  address: "${vaultAddress}",
  chainId: 999,
  deployer: "${wallet.address}",
  aiAgent: "${wallet.address}",
  txHash: "${tx.hash}",
  blockNumber: ${receipt.blockNumber},
  abi: ${JSON.stringify(MinimalVaultArtifact.abi, null, 2)}
};

export default HYPEREVM_VAULT;`;
    
    fs.writeFileSync(path.join(configDir, 'hyperevm-vault.js'), config);
    console.log(`✅ Frontend config saved to: src/config/hyperevm-vault.js`);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎯 CRITICAL INFORMATION");
    console.log("=".repeat(60));
    console.log(`VAULT ADDRESS: ${vaultAddress}`);
    console.log("This is your HyperEVM vault for the trading bot!");
    console.log("=".repeat(60));
    
  } catch (error) {
    deploymentData.status = 'failed';
    deploymentData.error = error.message;
    
    console.error(`\n❌ Deployment failed: ${error.message}`);
    
    // Save error data
    fs.writeFileSync('deployment-error.json', JSON.stringify(deploymentData, null, 2));
    
    if (error.message.includes('exceeds block gas limit')) {
      console.log("\n💡 The contract is still too large. Options:");
      console.log("1. Remove more functions from MinimalVault.sol");
      console.log("2. Use CREATE2 proxy pattern");
      console.log("3. Deploy implementation separately");
      console.log("4. Use minimal proxy (EIP-1167) pattern");
    }
    
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });