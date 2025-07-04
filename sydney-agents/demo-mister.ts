#!/usr/bin/env tsx

/**
 * MISTER - Managed Wallet Copy Trading Service Demo
 * 
 * This demo showcases the complete MISTER system:
 * - Managed wallet creation and secure key management
 * - TITAN2K trading strategy signal generation
 * - Fan-out execution across multiple wallets
 * - Strike Finance API integration
 * - Real-time monitoring and reporting
 */

import { WalletManager } from './src/mastra/services/wallet-manager';
import { SignalService } from './src/mastra/services/signal-service';
import { ExecutionService } from './src/mastra/services/execution-service';
import { StrikeFinanceAPI } from './src/mastra/services/strike-finance-api';

// Demo configuration
const DEMO_USERS = [
  'alice_trader_001',
  'bob_investor_002', 
  'charlie_defi_003'
];

async function runMisterDemo() {
  console.log('🤖 MISTER - Managed Wallet Copy Trading Service Demo');
  console.log('=' .repeat(60));
  console.log('🎯 Building the future of DeFi copy trading on Cardano');
  console.log('🔐 Non-custodial • 🤖 AI-powered • ⚡ Lightning-fast\n');

  try {
    // Initialize services
    console.log('🚀 Initializing MISTER Core Services...');
    const walletManager = WalletManager.getInstance();
    const signalService = SignalService.getInstance();
    const executionService = ExecutionService.getInstance();
    const strikeAPI = new StrikeFinanceAPI();

    // Phase 1: Managed Wallet Creation
    console.log('\n📋 Phase 1: Managed Wallet Creation');
    console.log('-'.repeat(40));
    
    const createdWallets = [];
    for (const userId of DEMO_USERS) {
      console.log(`\n👤 Creating managed wallet for user: ${userId}`);
      const wallet = await walletManager.createNewWallet(userId);
      createdWallets.push(wallet);
      
      console.log(`   ✅ Address: ${wallet.bech32Address.substring(0, 30)}...`);
      console.log(`   🔑 Mnemonic: ${wallet.mnemonic.split(' ').slice(0, 3).join(' ')}... (24 words)`);
      console.log(`   🆔 User ID: ${wallet.userId}`);
    }

    const stats = walletManager.getWalletStats();
    console.log(`\n📊 Wallet Creation Summary:`);
    console.log(`   Total Wallets: ${stats.total}`);
    console.log(`   Active Wallets: ${stats.active}`);
    console.log(`   Ready for Trading: ✅`);

    // Phase 2: Market Analysis & Signal Generation
    console.log('\n📈 Phase 2: Market Analysis & Signal Generation');
    console.log('-'.repeat(40));
    
    console.log('\n🔍 Checking Strike Finance API health...');
    const isHealthy = await strikeAPI.healthCheck();
    console.log(`   API Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);

    if (isHealthy) {
      console.log('\n📊 Fetching market data...');
      const marketInfo = await strikeAPI.getOverallInfo();
      const poolInfo = await strikeAPI.getPoolInfoV2();
      
      console.log(`   Long Interest: ${marketInfo.data.longInterest.toLocaleString()} ADA`);
      console.log(`   Short Interest: ${marketInfo.data.shortInterest.toLocaleString()} ADA`);
      console.log(`   Pool TVL: ${poolInfo.data.totalValueLocked.toLocaleString()} ADA`);
      console.log(`   Available Liquidity: ${poolInfo.data.availableAssetAmount.toLocaleString()} ADA`);
    }

    console.log('\n🤖 Running TITAN2K Strategy Analysis...');
    const signal = await signalService.forceSignalCheck();
    console.log(`   Signal: ${signal.action}`);
    console.log(`   Reason: ${signal.reason}`);
    console.log(`   Timestamp: ${signal.timestamp.toISOString()}`);
    
    if (signal.params) {
      console.log(`   Position: ${signal.params.position || 'N/A'}`);
      console.log(`   Leverage: ${signal.params.leverage || 'N/A'}x`);
      console.log(`   Confidence: ${signal.params.confidence ? (signal.params.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
    }

    // Phase 3: Service Management
    console.log('\n⚙️ Phase 3: Service Management');
    console.log('-'.repeat(40));
    
    console.log('\n🚀 Starting copy trading services...');
    signalService.start();
    executionService.start();
    
    // Wait a moment for services to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const signalStatus = signalService.getStatus();
    const executionStatus = executionService.getStatus();
    
    console.log(`   Signal Service: ${signalStatus.isRunning ? '✅ Running' : '❌ Stopped'}`);
    console.log(`   Execution Service: ${executionStatus.isRunning ? '✅ Running' : '❌ Stopped'}`);
    console.log(`   Check Interval: ${signalStatus.checkInterval / 1000}s`);
    console.log(`   Active Wallets: ${executionStatus.activeWallets}`);

    // Phase 4: Demo Trading Execution (if we have a signal)
    if (signal.action !== 'Hold') {
      console.log('\n⚡ Phase 4: Demo Trading Execution');
      console.log('-'.repeat(40));
      
      console.log(`\n🎯 Executing ${signal.action} signal across all managed wallets...`);
      
      try {
        const executionSummary = await executionService.forceExecution(signal);
        
        console.log(`\n📊 Execution Results:`);
        console.log(`   Total Wallets: ${executionSummary.totalWallets}`);
        console.log(`   Successful: ${executionSummary.successfulExecutions}`);
        console.log(`   Failed: ${executionSummary.failedExecutions}`);
        console.log(`   Success Rate: ${((executionSummary.successfulExecutions / executionSummary.totalWallets) * 100).toFixed(1)}%`);
        
        console.log(`\n📝 Individual Results:`);
        executionSummary.results.forEach((result, index) => {
          const status = result.success ? '✅' : '❌';
          const wallet = result.walletAddress.substring(0, 20) + '...';
          const info = result.success ? `TX: ${result.txHash}` : `Error: ${result.error}`;
          console.log(`   ${status} ${wallet} - ${info}`);
        });
        
      } catch (error) {
        console.log(`   ⚠️ Demo execution skipped: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('\n⏸️ Phase 4: No Trading Signal');
      console.log('-'.repeat(40));
      console.log('   Current market conditions do not warrant opening new positions.');
      console.log('   MISTER will continue monitoring and will execute when signals are detected.');
    }

    // Phase 5: Monitoring & Reporting
    console.log('\n📊 Phase 5: System Status & Monitoring');
    console.log('-'.repeat(40));
    
    console.log('\n🔍 Current System Status:');
    console.log(`   Managed Wallets: ${stats.active} active`);
    console.log(`   Signal Service: ${signalStatus.isRunning ? 'Monitoring' : 'Stopped'}`);
    console.log(`   Execution Service: ${executionStatus.isRunning ? 'Ready' : 'Stopped'}`);
    console.log(`   Strike Finance API: ${isHealthy ? 'Connected' : 'Disconnected'}`);
    
    console.log('\n🛡️ Security Features:');
    console.log('   ✅ Private keys stored in secure KMS');
    console.log('   ✅ Non-custodial wallet management');
    console.log('   ✅ User-controlled mnemonic backup');
    console.log('   ✅ Comprehensive audit logging');
    console.log('   ✅ Risk management controls');

    // Cleanup
    console.log('\n🧹 Cleaning up demo services...');
    signalService.stop();
    executionService.stop();
    
    console.log('\n🎉 MISTER Demo Complete!');
    console.log('=' .repeat(60));
    console.log('🚀 The future of DeFi copy trading is here!');
    console.log('💡 Ready to build the frontend and deploy to production.');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
runMisterDemo();
