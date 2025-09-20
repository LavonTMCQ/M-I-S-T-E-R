#!/usr/bin/env node

import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Vault configuration
const VAULT_ADDRESS = "0xdF07eed27B805cceFcd0cD00C184B91336588d86";
const VAULT_ABI = [
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function balances(address) external view returns (uint256)",
  "function totalDeposits() external view returns (uint256)",
  "function owner() external view returns (address)",
  "function aiAgent() external view returns (address)",
  "function authorizeTrade(uint256 amount) external",
  "function executeTrade(address target, bytes calldata data) external",
  "function emergencyWithdraw() external",
  "function updateAI(address newAI) external"
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

class VaultManager {
  constructor() {
    this.provider = new ethers.JsonRpcProvider('https://rpc.hyperliquid.xyz/evm');
    this.vaultContract = null;
    this.wallet = null;
    this.testWalletData = null;
  }

  async createTestWallet() {
    console.log("\n📝 Creating new test wallet...");
    
    // Generate new wallet
    const testWallet = ethers.Wallet.createRandom();
    const connectedWallet = testWallet.connect(this.provider);
    
    this.testWalletData = {
      address: testWallet.address,
      privateKey: testWallet.privateKey,
      mnemonic: testWallet.mnemonic.phrase,
      created: new Date().toISOString()
    };
    
    // Save test wallet credentials
    const walletFile = 'TEST_WALLET_CREDENTIALS.json';
    fs.writeFileSync(walletFile, JSON.stringify(this.testWalletData, null, 2));
    
    console.log("✅ Test wallet created!");
    console.log(`📍 Address: ${testWallet.address}`);
    console.log(`🔑 Private Key: ${testWallet.privateKey}`);
    console.log(`📝 Saved to: ${walletFile}`);
    console.log("\n⚠️  IMPORTANT: Send HYPE to this address before testing deposits!");
    
    return connectedWallet;
  }

  async loadWallet(privateKey) {
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.vaultContract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, this.wallet);
    console.log(`✅ Loaded wallet: ${this.wallet.address}`);
    return this.wallet;
  }

  async checkBalances() {
    console.log("\n💰 Checking balances...");
    
    // Check HYPE balance
    const hypeBalance = await this.provider.getBalance(this.wallet.address);
    console.log(`HYPE in wallet: ${ethers.formatEther(hypeBalance)} HYPE`);
    
    // Check vault balance
    const vaultBalance = await this.vaultContract.balances(this.wallet.address);
    console.log(`HYPE in vault: ${ethers.formatEther(vaultBalance)} HYPE`);
    
    // Check total vault deposits
    const totalDeposits = await this.vaultContract.totalDeposits();
    console.log(`Total vault deposits: ${ethers.formatEther(totalDeposits)} HYPE`);
    
    return {
      wallet: ethers.formatEther(hypeBalance),
      vault: ethers.formatEther(vaultBalance),
      total: ethers.formatEther(totalDeposits)
    };
  }

  async deposit(amountInHype) {
    console.log(`\n💸 Depositing ${amountInHype} HYPE to vault...`);
    
    try {
      // Estimate gas
      const value = ethers.parseEther(amountInHype.toString());
      const gasEstimate = await this.vaultContract.deposit.estimateGas({ value });
      console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
      
      // Send transaction
      const tx = await this.vaultContract.deposit({ 
        value,
        gasLimit: gasEstimate * 120n / 100n // 20% buffer
      });
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      console.log("⏳ Waiting for confirmation...");
      
      const receipt = await tx.wait();
      console.log(`✅ Deposit successful!`);
      console.log(`📦 Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      // Check new balance
      await this.checkBalances();
      
      return receipt;
    } catch (error) {
      console.error(`❌ Deposit failed: ${error.message}`);
      throw error;
    }
  }

  async withdraw(amountInHype) {
    console.log(`\n💸 Withdrawing ${amountInHype} HYPE from vault...`);
    
    try {
      const amount = ethers.parseEther(amountInHype.toString());
      
      // Check vault balance first
      const vaultBalance = await this.vaultContract.balances(this.wallet.address);
      if (vaultBalance < amount) {
        throw new Error(`Insufficient vault balance. You have ${ethers.formatEther(vaultBalance)} HYPE`);
      }
      
      // Estimate gas
      const gasEstimate = await this.vaultContract.withdraw.estimateGas(amount);
      console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
      
      // Send transaction
      const tx = await this.vaultContract.withdraw(amount, {
        gasLimit: gasEstimate * 120n / 100n // 20% buffer
      });
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      console.log("⏳ Waiting for confirmation...");
      
      const receipt = await tx.wait();
      console.log(`✅ Withdrawal successful!`);
      console.log(`📦 Block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      // Check new balance
      await this.checkBalances();
      
      return receipt;
    } catch (error) {
      console.error(`❌ Withdrawal failed: ${error.message}`);
      throw error;
    }
  }

  async sendHypeToTestWallet(toAddress, amountInHype) {
    console.log(`\n💸 Sending ${amountInHype} HYPE to ${toAddress}...`);
    
    try {
      const mainWallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      const value = ethers.parseEther(amountInHype.toString());
      
      const tx = await mainWallet.sendTransaction({
        to: toAddress,
        value: value
      });
      
      console.log(`📝 Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Transfer successful!`);
      
      return receipt;
    } catch (error) {
      console.error(`❌ Transfer failed: ${error.message}`);
      throw error;
    }
  }

  async getVaultInfo() {
    console.log("\n📊 Vault Information:");
    console.log(`📍 Vault Address: ${VAULT_ADDRESS}`);
    console.log(`🔗 Explorer: https://explorer.hyperliquid.xyz/address/${VAULT_ADDRESS}`);
    
    const owner = await this.vaultContract.owner();
    const aiAgent = await this.vaultContract.aiAgent();
    const totalDeposits = await this.vaultContract.totalDeposits();
    
    console.log(`👤 Owner: ${owner}`);
    console.log(`🤖 AI Agent: ${aiAgent}`);
    console.log(`💰 Total Deposits: ${ethers.formatEther(totalDeposits)} HYPE`);
    
    return { owner, aiAgent, totalDeposits: ethers.formatEther(totalDeposits) };
  }
}

async function interactiveMenu() {
  const manager = new VaultManager();
  
  console.log("\n" + "=".repeat(60));
  console.log("🏦 HYPEREVM VAULT INTERACTION TOOL");
  console.log("=".repeat(60));
  console.log(`Vault Address: ${VAULT_ADDRESS}`);
  
  let running = true;
  while (running) {
    console.log("\n📋 Menu:");
    console.log("1. Create new test wallet");
    console.log("2. Load existing wallet");
    console.log("3. Check balances");
    console.log("4. Deposit HYPE to vault");
    console.log("5. Withdraw HYPE from vault");
    console.log("6. Send HYPE to test wallet (from main wallet)");
    console.log("7. Get vault info");
    console.log("8. Exit");
    
    const choice = await question("\nEnter choice (1-8): ");
    
    try {
      switch(choice) {
        case '1':
          const testWallet = await manager.createTestWallet();
          const fund = await question("\nFund this wallet with HYPE now? (y/n): ");
          if (fund.toLowerCase() === 'y') {
            const amount = await question("Amount of HYPE to send: ");
            await manager.sendHypeToTestWallet(testWallet.address, amount);
          }
          await manager.loadWallet(testWallet.privateKey);
          break;
          
        case '2':
          const privateKey = await question("Enter private key: ");
          await manager.loadWallet(privateKey);
          await manager.checkBalances();
          break;
          
        case '3':
          if (!manager.wallet) {
            console.log("❌ Please load a wallet first!");
          } else {
            await manager.checkBalances();
          }
          break;
          
        case '4':
          if (!manager.wallet) {
            console.log("❌ Please load a wallet first!");
          } else {
            const depositAmount = await question("Amount of HYPE to deposit: ");
            await manager.deposit(depositAmount);
          }
          break;
          
        case '5':
          if (!manager.wallet) {
            console.log("❌ Please load a wallet first!");
          } else {
            const withdrawAmount = await question("Amount of HYPE to withdraw: ");
            await manager.withdraw(withdrawAmount);
          }
          break;
          
        case '6':
          const toAddress = await question("Recipient address: ");
          const sendAmount = await question("Amount of HYPE to send: ");
          await manager.sendHypeToTestWallet(toAddress, sendAmount);
          break;
          
        case '7':
          await manager.getVaultInfo();
          break;
          
        case '8':
          running = false;
          console.log("\n👋 Goodbye!");
          break;
          
        default:
          console.log("❌ Invalid choice!");
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
    }
  }
  
  rl.close();
}

// Quick actions via command line arguments
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Interactive mode
    await interactiveMenu();
  } else {
    // Command line mode
    const manager = new VaultManager();
    const [action, ...params] = args;
    
    switch(action) {
      case 'create-wallet':
        await manager.createTestWallet();
        break;
        
      case 'deposit':
        if (params.length < 2) {
          console.log("Usage: node vault-interaction-scripts.mjs deposit <privateKey> <amount>");
          break;
        }
        await manager.loadWallet(params[0]);
        await manager.deposit(params[1]);
        break;
        
      case 'withdraw':
        if (params.length < 2) {
          console.log("Usage: node vault-interaction-scripts.mjs withdraw <privateKey> <amount>");
          break;
        }
        await manager.loadWallet(params[0]);
        await manager.withdraw(params[1]);
        break;
        
      case 'balance':
        if (params.length < 1) {
          console.log("Usage: node vault-interaction-scripts.mjs balance <privateKey>");
          break;
        }
        await manager.loadWallet(params[0]);
        await manager.checkBalances();
        break;
        
      case 'info':
        await manager.getVaultInfo();
        break;
        
      default:
        console.log("Available commands:");
        console.log("  create-wallet                          - Create new test wallet");
        console.log("  deposit <privateKey> <amount>          - Deposit HYPE to vault");
        console.log("  withdraw <privateKey> <amount>         - Withdraw HYPE from vault");
        console.log("  balance <privateKey>                   - Check balances");
        console.log("  info                                   - Get vault information");
        console.log("\nOr run without arguments for interactive mode.");
    }
  }
  
  process.exit(0);
}

main().catch(console.error);