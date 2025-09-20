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

// Load only L1Read contract
const L1ReadArtifact = JSON.parse(fs.readFileSync('./artifacts/src/contracts/hyperevm/L1Read.sol/L1Read.json', 'utf8'));

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 DEPLOYING L1READ ONLY - TESTING GAS LIMITS");
  console.log("=".repeat(60) + "\n");
  
  try {
    // Connect to HyperEVM mainnet
    const provider = new ethers.JsonRpcProvider('https://rpc.hyperliquid.xyz/evm');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`📍 Deployer: ${wallet.address}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} HYPE`);
    
    // Get network info
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    const gasPrice = (await provider.getFeeData()).gasPrice;
    
    console.log(`📦 Block: ${blockNumber}`);
    console.log(`⛽ Block Gas Limit: ${block.gasLimit.toString()}`);
    console.log(`💸 Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    
    // Check bytecode size
    const bytecodeSize = L1ReadArtifact.bytecode.length / 2 - 1; // Hex to bytes
    console.log(`📏 L1Read bytecode size: ${bytecodeSize} bytes`);
    
    // Deploy L1Read with minimal gas
    console.log("\n📦 Deploying L1Read...");
    const L1ReadFactory = new ethers.ContractFactory(
      L1ReadArtifact.abi,
      L1ReadArtifact.bytecode,
      wallet
    );
    
    // Try to estimate gas first
    try {
      const deployTx = await L1ReadFactory.getDeployTransaction();
      const gasEstimate = await wallet.estimateGas(deployTx);
      console.log(`   ⛽ Estimated gas: ${gasEstimate.toString()}`);
      console.log(`   ⛽ Block limit: ${block.gasLimit.toString()}`);
      console.log(`   ⛽ Usage: ${(BigInt(gasEstimate) * 100n / block.gasLimit).toString()}% of block`);
    } catch (error) {
      console.log(`   ⚠️ Gas estimation failed: ${error.message}`);
    }
    
    // Try deployment with explicit gas limit
    const l1Read = await L1ReadFactory.deploy({
      gasLimit: 5000000, // Try with 5M gas
      gasPrice: gasPrice
    });
    
    await l1Read.waitForDeployment();
    const address = await l1Read.getAddress();
    
    console.log(`   ✅ L1Read deployed to: ${address}`);
    console.log(`   📝 TX: ${l1Read.deploymentTransaction().hash}`);
    
    // Save the address
    const deployment = {
      network: 'hyperevm_mainnet',
      timestamp: new Date().toISOString(),
      L1Read: address,
      txHash: l1Read.deploymentTransaction().hash,
      deployer: wallet.address
    };
    
    fs.writeFileSync('l1read-deployment.json', JSON.stringify(deployment, null, 2));
    console.log("\n✅ L1Read deployment successful!");
    console.log(`📄 Saved to: l1read-deployment.json`);
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    
    // Check if it's a gas limit issue
    if (error.message.includes('exceeds block gas limit')) {
      console.log("\n⚠️ The contract is too large for HyperEVM's block gas limit.");
      console.log("Options:");
      console.log("1. Use a proxy pattern to reduce deployment size");
      console.log("2. Split contracts into smaller pieces");
      console.log("3. Deploy to testnet first to verify");
      console.log("4. Contact HyperEVM team about gas limits");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });