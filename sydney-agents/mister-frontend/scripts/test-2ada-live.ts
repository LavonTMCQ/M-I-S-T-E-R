#!/usr/bin/env npx tsx

/**
 * Live 2 ADA Capital Allocation Test
 * 
 * Tests real capital allocation with minimal exposure:
 * 1. Generate agent wallet 
 * 2. Allocate 2 ADA from vault to agent
 * 3. Verify balance updates
 * 4. Test return flow with simulated P&L
 * 
 * SAFETY: Maximum 2 ADA exposure on mainnet
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function printStep(step: string, description: string): void {
  console.log(colorize(`\n💰 ${step}: ${description}`, 'blue'));
}

function printSuccess(message: string): void {
  console.log(colorize(`✅ ${message}`, 'green'));
}

function printError(message: string): void {
  console.log(colorize(`❌ ${message}`, 'red'));
}

function printWarning(message: string): void {
  console.log(colorize(`⚠️ ${message}`, 'yellow'));
}

interface LiveTestConfig {
  testUserId: string;
  testAgentId: string;
  vaultAddress: string; // User will provide real vault address
  testAmountADA: number;
  maxSafetyLimit: number;
}

async function run2ADALiveTest(): Promise<boolean> {
  console.log(colorize('\n🚀 LIVE 2 ADA CAPITAL ALLOCATION TEST', 'bright'));
  console.log(colorize('=' .repeat(60), 'cyan'));
  
  const config: LiveTestConfig = {
    testUserId: 'live_user_' + Date.now(),
    testAgentId: 'live_agent_' + Date.now(),
    vaultAddress: '', // Will be set from user input or environment
    testAmountADA: 2, // EXACTLY 2 ADA for safety
    maxSafetyLimit: 2 // HARD LIMIT - never exceed
  };

  console.log(colorize(`💰 Live Test Configuration:`, 'cyan'));
  console.log(`   User ID: ${config.testUserId}`);
  console.log(`   Agent ID: ${config.testAgentId}`);
  console.log(`   Test Amount: ${config.testAmountADA} ADA (MAINNET REAL FUNDS)`);
  console.log(`   Safety Limit: ${config.maxSafetyLimit} ADA (HARD MAXIMUM)`);
  console.log(`   Network: MAINNET (Using real ADA)`);
  
  if (config.testAmountADA > config.maxSafetyLimit) {
    printError('SAFETY VIOLATION: Test amount exceeds safety limit');
    return false;
  }

  // Step 1: System Health Check
  printStep('Step 1/6', 'Pre-flight System Health Check');
  try {
    const { getRailwayDB } = await import('../src/lib/database/railway-db');
    const db = getRailwayDB();
    const dbHealth = await db.healthCheck();
    
    if (!dbHealth.connected) {
      printError('Database not connected - aborting live test');
      return false;
    }
    printSuccess('Railway PostgreSQL connected');

    // Check Cardano service
    const cardanoResponse = await fetch('http://localhost:3001/health');
    if (!cardanoResponse.ok) {
      printError('Cardano service not available - aborting live test');
      return false;
    }
    
    const cardanoHealth = await cardanoResponse.json();
    if (cardanoHealth.network !== 'mainnet') {
      printError('Cardano service not on mainnet - aborting live test');
      return false;
    }
    
    printSuccess(`Cardano service healthy on ${cardanoHealth.network}`);
    printWarning('⚠️  MAINNET MODE - Using REAL ADA!');
    
  } catch (error) {
    printError('Pre-flight check failed: ' + (error as Error).message);
    return false;
  }

  // Step 2: Generate Agent Wallet  
  printStep('Step 2/6', 'Generate Agent Wallet for Live Testing');
  let agentWallet: any;
  try {
    const { createAgentWalletManager } = await import('../src/services/agent-wallets/AgentWalletManager');
    const walletManager = createAgentWalletManager();
    
    const walletResult = await walletManager.generateWallet({
      userId: config.testUserId,
      agentId: config.testAgentId
    });

    if (!walletResult.success || !walletResult.wallet) {
      printError(`Agent wallet generation failed: ${walletResult.error}`);
      return false;
    }

    agentWallet = walletResult.wallet;
    printSuccess('Agent wallet generated for live testing');
    console.log(`   Agent ID: ${agentWallet.agentId}`);
    console.log(`   Address: ${agentWallet.walletAddress}`);
    console.log(`   Initial Balance: ${agentWallet.currentBalanceAda} ADA`);
    
  } catch (error) {
    printError('Agent wallet generation failed: ' + (error as Error).message);
    return false;
  }

  // Step 3: Vault Address Configuration
  printStep('Step 3/6', 'Vault Address Configuration');
  
  // Check if vault address is provided via environment or prompt user
  config.vaultAddress = process.env.LIVE_TEST_VAULT_ADDRESS || '';
  
  if (!config.vaultAddress) {
    printError('Live vault address not configured');
    console.log('Please set LIVE_TEST_VAULT_ADDRESS in .env.local for live testing');
    console.log('Example: LIVE_TEST_VAULT_ADDRESS=addr1your_mainnet_vault_address');
    return false;
  }

  if (!config.vaultAddress.startsWith('addr1')) {
    printError('Invalid vault address format - must start with addr1');
    return false;
  }

  printSuccess('Vault address configured');
  console.log(`   Vault: ${config.vaultAddress.substring(0, 25)}...`);

  // Step 4: Capital Allocation Preparation  
  printStep('Step 4/6', 'Capital Allocation Bridge Preparation');
  try {
    const { createVaultAgentBridge } = await import('../src/services/agent-wallets/VaultAgentBridge');
    const bridge = createVaultAgentBridge();
    
    const bridgeHealth = await bridge.healthCheck();
    if (bridgeHealth.status !== 'healthy') {
      printError(`Bridge not healthy: ${bridgeHealth.status}`);
      return false;
    }
    
    printSuccess('Capital allocation bridge ready');
    console.log(`   Database: ${bridgeHealth.database ? 'Connected' : 'Failed'}`);
    console.log(`   Wallet Manager: ${bridgeHealth.walletManager ? 'Ready' : 'Failed'}`);
    console.log(`   Cardano Service: ${bridgeHealth.cardanoService ? 'Available' : 'Failed'}`);
    
  } catch (error) {
    printError('Bridge preparation failed: ' + (error as Error).message);
    return false;
  }

  // Step 5: LIVE CAPITAL ALLOCATION (2 ADA)
  printStep('Step 5/6', `LIVE CAPITAL ALLOCATION - ${config.testAmountADA} ADA`);
  
  printWarning('🚨 ABOUT TO ALLOCATE REAL ADA ON MAINNET 🚨');
  printWarning(`Transferring ${config.testAmountADA} ADA from vault to agent wallet`);
  
  // For live testing, we need additional confirmation
  if (process.argv.includes('--confirm-live')) {
    console.log(colorize('\n⏳ Executing live capital allocation...', 'yellow'));
    
    try {
      const { createVaultAgentBridge } = await import('../src/services/agent-wallets/VaultAgentBridge');
      const bridge = createVaultAgentBridge();
      
      const allocationResult = await bridge.allocateCapitalToAgent({
        userVaultAddress: config.vaultAddress,
        agentId: config.testAgentId,
        amountADA: config.testAmountADA,
        purpose: 'Live 2 ADA system validation test'
      });

      if (allocationResult.success) {
        printSuccess(`LIVE ALLOCATION SUCCESSFUL!`);
        console.log(`   Allocation ID: ${allocationResult.allocationId}`);
        console.log(`   Transaction Hash: ${allocationResult.txHash}`);
        console.log(`   Amount: ${allocationResult.allocatedAmount} ADA`);
        console.log(`   Agent Wallet: ${allocationResult.agentWalletAddress}`);
      } else {
        printError(`Live allocation failed: ${allocationResult.error}`);
        return false;
      }
      
    } catch (error) {
      printError('Live allocation execution failed: ' + (error as Error).message);
      return false;
    }
  } else {
    printWarning('SIMULATION MODE - Add --confirm-live flag for real execution');
    console.log('This would execute:');
    console.log(`   FROM: ${config.vaultAddress.substring(0, 25)}...`);
    console.log(`   TO: ${agentWallet.walletAddress}`);
    console.log(`   AMOUNT: ${config.testAmountADA} ADA`);
    console.log(`   PURPOSE: Live system validation`);
  }

  // Step 6: Balance Verification
  printStep('Step 6/6', 'Post-Allocation Balance Verification');
  
  try {
    const { createAgentWalletManager } = await import('../src/services/agent-wallets/AgentWalletManager');
    const walletManager = createAgentWalletManager();
    
    const balanceResult = await walletManager.checkBalance(config.testAgentId);
    if (balanceResult.success) {
      printSuccess('Balance verification completed');
      console.log(`   Agent Wallet Balance: ${balanceResult.balanceADA} ADA`);
      console.log(`   Last Updated: ${balanceResult.lastChecked}`);
      
      if (process.argv.includes('--confirm-live') && balanceResult.balanceADA >= config.testAmountADA) {
        printSuccess('🎉 LIVE ALLOCATION CONFIRMED ON-CHAIN!');
      }
    } else {
      printWarning('Balance verification failed - manual check recommended');
    }
    
  } catch (error) {
    printWarning('Balance verification error: ' + (error as Error).message);
  }

  console.log(colorize('\n🎉 LIVE TEST COMPLETED', 'bright'));
  console.log(colorize('=' .repeat(40), 'cyan'));
  
  if (process.argv.includes('--confirm-live')) {
    console.log(colorize('✅ REAL CAPITAL ALLOCATION EXECUTED', 'green'));
    console.log('Next steps:');
    console.log('1. Verify transaction on Cardano explorer');
    console.log('2. Test Strike Finance integration');
    console.log('3. Execute return flow with P&L');
  } else {
    console.log(colorize('⚠️ SIMULATION COMPLETED', 'yellow'));
    console.log('To execute with real funds: npm run test:live -- --confirm-live');
  }

  return true;
}

// CLI Arguments and Execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(colorize('\n💰 Live 2 ADA Capital Allocation Test', 'bright'));
    console.log('\nUsage:');
    console.log('  npm run test:live                  # Simulation mode');
    console.log('  npm run test:live -- --confirm-live # REAL execution with actual ADA');
    console.log('\nPrerequisites:');
    console.log('  - LIVE_TEST_VAULT_ADDRESS set in .env.local');
    console.log('  - Vault must have at least 3 ADA (2 ADA + fees)');
    console.log('  - Cardano service running on mainnet');
    console.log('  - Railway PostgreSQL connected');
    console.log('\nSafety:');
    console.log('  - Maximum 2 ADA exposure');
    console.log('  - Mainnet transactions (REAL ADA)');
    console.log('  - Complete audit trail in database');
    return;
  }

  const success = await run2ADALiveTest();
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(colorize('\n❌ Live test execution failed:', 'red'), error);
    process.exit(1);
  });
}

export { run2ADALiveTest };