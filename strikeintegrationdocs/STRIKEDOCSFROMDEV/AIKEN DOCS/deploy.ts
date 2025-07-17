#!/usr/bin/env tsx
/**
 * Strike Finance Agent Vault Deployment Script
 * 
 * This TypeScript script handles the complete deployment process for the
 * Agent Vault smart contract, including compilation, address generation,
 * and network deployment.
 * 
 * Usage:
 *   npm run deploy:testnet
 *   npm run deploy:mainnet
 * 
 * Requirements:
 *   - Aiken CLI installed
 *   - Cardano CLI installed
 *   - Node.js with TypeScript support
 *   - Proper environment variables set
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Configuration
interface DeployConfig {
  network: 'testnet' | 'mainnet';
  agentWalletPath: string;
  contractOutputDir: string;
  deploymentOutputFile: string;
}

interface ContractAddresses {
  scriptAddress: string;
  scriptHash: string;
  policyId: string;
}

interface DeploymentResult {
  network: string;
  timestamp: string;
  contractAddresses: ContractAddresses;
  agentVkh: string;
  strikeContractHashes: string[];
  transactionHash?: string;
}

class AgentVaultDeployer {
  private config: DeployConfig;
  
  constructor(network: 'testnet' | 'mainnet') {
    this.config = {
      network,
      agentWalletPath: process.env.AGENT_WALLET_PATH || './keys/agent-wallet',
      contractOutputDir: './plutus',
      deploymentOutputFile: `./deployments/${network}-deployment.json`
    };
  }

  /**
   * Main deployment process
   */
  async deploy(): Promise<DeploymentResult> {
    console.log(`🚀 Starting Agent Vault deployment to ${this.config.network}...`);
    
    try {
      // Step 1: Validate environment
      this.validateEnvironment();
      
      // Step 2: Compile Aiken contract
      await this.compileContract();
      
      // Step 3: Generate contract addresses
      const contractAddresses = await this.generateContractAddresses();
      
      // Step 4: Get agent wallet VKH
      const agentVkh = await this.getAgentVkh();
      
      // Step 5: Update contract with real addresses
      await this.updateContractAddresses(agentVkh);
      
      // Step 6: Recompile with updated addresses
      await this.compileContract();
      
      // Step 7: Deploy to network (optional - for reference UTxO)
      const txHash = await this.deployReferenceScript(contractAddresses);
      
      // Step 8: Save deployment info
      const deployment: DeploymentResult = {
        network: this.config.network,
        timestamp: new Date().toISOString(),
        contractAddresses,
        agentVkh,
        strikeContractHashes: await this.getStrikeContractHashes(),
        transactionHash: txHash
      };
      
      this.saveDeployment(deployment);
      
      console.log('✅ Deployment completed successfully!');
      console.log(`📄 Contract Address: ${contractAddresses.scriptAddress}`);
      console.log(`🔑 Script Hash: ${contractAddresses.scriptHash}`);
      console.log(`🏷️  Policy ID: ${contractAddresses.policyId}`);
      
      return deployment;
      
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw error;
    }
  }

  /**
   * Validate deployment environment
   */
  private validateEnvironment(): void {
    console.log('🔍 Validating environment...');
    
    // Check Aiken CLI
    try {
      execSync('aiken --version', { stdio: 'pipe' });
    } catch {
      throw new Error('Aiken CLI not found. Please install Aiken.');
    }
    
    // Check Cardano CLI
    try {
      execSync('cardano-cli --version', { stdio: 'pipe' });
    } catch {
      throw new Error('Cardano CLI not found. Please install cardano-cli.');
    }
    
    // Check agent wallet
    if (!existsSync(`${this.config.agentWalletPath}.skey`)) {
      throw new Error(`Agent wallet not found at ${this.config.agentWalletPath}.skey`);
    }
    
    console.log('✅ Environment validation passed');
  }

  /**
   * Compile the Aiken smart contract
   */
  private async compileContract(): Promise<void> {
    console.log('🔨 Compiling Aiken contract...');
    
    try {
      execSync('aiken build', { stdio: 'inherit' });
      console.log('✅ Contract compilation successful');
    } catch (error) {
      throw new Error(`Contract compilation failed: ${error}`);
    }
  }

  /**
   * Generate contract addresses from compiled Plutus script
   */
  private async generateContractAddresses(): Promise<ContractAddresses> {
    console.log('📍 Generating contract addresses...');
    
    const plutusFile = join(this.config.contractOutputDir, 'agent_vault_strike.plutus');
    
    if (!existsSync(plutusFile)) {
      throw new Error(`Compiled contract not found: ${plutusFile}`);
    }
    
    // Generate script address
    const scriptAddress = execSync(
      `cardano-cli address build --payment-script-file ${plutusFile} --${this.config.network}`,
      { encoding: 'utf8' }
    ).trim();
    
    // Generate script hash
    const scriptHash = execSync(
      `cardano-cli transaction policyid --script-file ${plutusFile}`,
      { encoding: 'utf8' }
    ).trim();
    
    return {
      scriptAddress,
      scriptHash,
      policyId: scriptHash // For Plutus V3, policy ID equals script hash
    };
  }

  /**
   * Get agent wallet verification key hash
   */
  private async getAgentVkh(): Promise<string> {
    console.log('🔑 Getting agent wallet VKH...');
    
    const vkeyFile = `${this.config.agentWalletPath}.vkey`;
    
    if (!existsSync(vkeyFile)) {
      throw new Error(`Agent verification key not found: ${vkeyFile}`);
    }
    
    const vkh = execSync(
      `cardano-cli address key-hash --payment-verification-key-file ${vkeyFile}`,
      { encoding: 'utf8' }
    ).trim();
    
    console.log(`✅ Agent VKH: ${vkh}`);
    return vkh;
  }

  /**
   * Update contract with real agent VKH and Strike contract addresses
   */
  private async updateContractAddresses(agentVkh: string): Promise<void> {
    console.log('📝 Updating contract with real addresses...');
    
    const contractFile = './agent_vault_strike.ak';
    let contractContent = readFileSync(contractFile, 'utf8');
    
    // Update agent VKH
    contractContent = contractContent.replace(
      /const AGENT_VKH: ByteArray =\s*"[^"]*"/,
      `const AGENT_VKH: ByteArray = "${agentVkh}"`
    );
    
    // Get real Strike Finance contract hashes
    const strikeHashes = await this.getStrikeContractHashes();
    const strikeHashesArray = strikeHashes.map(hash => `  "${hash}"`).join(',\n');
    
    contractContent = contractContent.replace(
      /const STRIKE_CONTRACT_HASHES: List<ByteArray> = \[[^\]]*\]/s,
      `const STRIKE_CONTRACT_HASHES: List<ByteArray> = [\n${strikeHashesArray}\n]`
    );
    
    writeFileSync(contractFile, contractContent);
    console.log('✅ Contract addresses updated');
  }

  /**
   * Get Strike Finance contract hashes (placeholder - needs real implementation)
   */
  private async getStrikeContractHashes(): Promise<string[]> {
    console.log('🎯 Getting Strike Finance contract hashes...');
    
    // TODO: Implement actual Strike Finance contract hash discovery
    // This could involve:
    // 1. Querying Strike Finance API for contract addresses
    // 2. Analyzing successful Strike Finance transactions
    // 3. Using Cardano explorer APIs
    
    // For now, return placeholder values
    const placeholderHashes = [
      "e58541289ab794860a0333a64d1f5843284a772626b9a2b534af914b", // Position opening
      "f733a30f3a6081e35a42ea1f66e857738325f05359c82c332213a1a4", // Position closing
      "a1b2c3d4e5f6789012345678901234567890123456789012345678901234", // Liquidation
      "b2c3d4e5f6789012345678901234567890123456789012345678901234a1"  // Collateral
    ];
    
    console.log('⚠️  Using placeholder Strike Finance contract hashes');
    console.log('🔧 TODO: Implement real contract hash discovery');
    
    return placeholderHashes;
  }

  /**
   * Deploy reference script to network (optional)
   */
  private async deployReferenceScript(addresses: ContractAddresses): Promise<string | undefined> {
    console.log('📤 Deploying reference script...');
    
    try {
      // This is optional - creates a reference UTxO for the script
      // Useful for reducing transaction sizes when using the contract
      
      const plutusFile = join(this.config.contractOutputDir, 'agent_vault_strike.plutus');
      const txFile = './tmp/deploy-tx.raw';
      const signedTxFile = './tmp/deploy-tx.signed';
      
      // Build transaction
      execSync(`
        cardano-cli transaction build \\
          --${this.config.network} \\
          --tx-in $(cardano-cli query utxo --address $(cat ${this.config.agentWalletPath}.addr) --${this.config.network} --out-file /dev/stdout | jq -r 'keys[0]') \\
          --tx-out ${addresses.scriptAddress}+2000000 \\
          --tx-out-reference-script-file ${plutusFile} \\
          --change-address $(cat ${this.config.agentWalletPath}.addr) \\
          --out-file ${txFile}
      `, { stdio: 'inherit' });
      
      // Sign transaction
      execSync(`
        cardano-cli transaction sign \\
          --tx-body-file ${txFile} \\
          --signing-key-file ${this.config.agentWalletPath}.skey \\
          --${this.config.network} \\
          --out-file ${signedTxFile}
      `, { stdio: 'inherit' });
      
      // Submit transaction
      const txHash = execSync(`
        cardano-cli transaction submit \\
          --${this.config.network} \\
          --tx-file ${signedTxFile}
      `, { encoding: 'utf8' }).trim();
      
      console.log(`✅ Reference script deployed: ${txHash}`);
      return txHash;
      
    } catch (error) {
      console.log('⚠️  Reference script deployment skipped:', error);
      return undefined;
    }
  }

  /**
   * Save deployment information
   */
  private saveDeployment(deployment: DeploymentResult): void {
    console.log('💾 Saving deployment information...');
    
    const deployDir = './deployments';
    if (!existsSync(deployDir)) {
      execSync(`mkdir -p ${deployDir}`);
    }
    
    writeFileSync(
      this.config.deploymentOutputFile,
      JSON.stringify(deployment, null, 2)
    );
    
    console.log(`✅ Deployment info saved to ${this.config.deploymentOutputFile}`);
  }
}

// CLI interface
async function main() {
  const network = process.argv[2] as 'testnet' | 'mainnet';
  
  if (!network || !['testnet', 'mainnet'].includes(network)) {
    console.error('❌ Usage: tsx deploy.ts <testnet|mainnet>');
    process.exit(1);
  }
  
  const deployer = new AgentVaultDeployer(network);
  
  try {
    await deployer.deploy();
    console.log('🎉 Deployment completed successfully!');
  } catch (error) {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { AgentVaultDeployer, DeploymentResult };
