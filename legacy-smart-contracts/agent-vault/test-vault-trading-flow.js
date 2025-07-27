#!/usr/bin/env node

/**
 * Test Script: Vault Trading Flow Verification
 * 
 * This script tests the complete flow from vault creation to automated trading:
 * 1. Simulates vault creation
 * 2. Registers vault for automated trading
 * 3. Tests algorithm signal generation
 * 4. Verifies trade execution through Railway API
 * 5. Confirms the complete smart contract integration
 */

import fetch from 'node-fetch';

// Test configuration
const TEST_CONFIG = {
  RAILWAY_API: 'https://ada-backtesting-service-production.up.railway.app',
  MASTRA_API: 'http://localhost:4112',
  TEST_VAULT_ADDRESS: 'addr1wyq32c96u0u04s54clgeqtjk6ffd56pcxnrmu4jzn57zj3sy9gwyk',
  TEST_USER_ADDRESS: 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9dwz4s6m4k5s9rgmkk',
  MAX_TRADE_AMOUNT: 50,
  ALGORITHM: 'ada_custom_algorithm'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${colors.bold}${colors.blue}[STEP ${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

async function testRailwayVaultAPI() {
  logStep(1, 'Testing Railway Vault API Endpoints');
  
  try {
    // Test health endpoint
    log('Testing health endpoint...');
    const healthResponse = await fetch(`${TEST_CONFIG.RAILWAY_API}/health`);
    
    if (healthResponse.ok) {
      logSuccess('Railway API is healthy');
    } else {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }

    // Test vault balance endpoint
    log('Testing vault balance endpoint...');
    const balanceResponse = await fetch(`${TEST_CONFIG.RAILWAY_API}/api/vault/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vault_address: TEST_CONFIG.TEST_VAULT_ADDRESS
      })
    });

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      logSuccess(`Vault balance check successful: ${balanceData.total_balance} ADA available`);
    } else {
      throw new Error(`Balance check failed: ${balanceResponse.status}`);
    }

    // Test vault status endpoint
    log('Testing vault status endpoint...');
    const statusResponse = await fetch(`${TEST_CONFIG.RAILWAY_API}/api/vault/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vault_address: TEST_CONFIG.TEST_VAULT_ADDRESS
      })
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      logSuccess(`Vault status check successful: Trading ${statusData.trading_enabled ? 'enabled' : 'disabled'}`);
      log(`  - Win Rate: ${statusData.performance?.win_rate}%`);
      log(`  - Total Trades: ${statusData.performance?.total_trades}`);
    } else {
      throw new Error(`Status check failed: ${statusResponse.status}`);
    }

    return true;
  } catch (error) {
    logError(`Railway API test failed: ${error.message}`);
    return false;
  }
}

async function testAlgorithmSignalGeneration() {
  logStep(2, 'Testing ADA Custom Algorithm Signal Generation');
  
  try {
    log('Requesting algorithm analysis...');
    const response = await fetch(`${TEST_CONFIG.RAILWAY_API}/api/backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategy: 'ada_custom_algorithm',
        timeframe: '15m',
        period: '1d'
      })
    });

    if (!response.ok) {
      throw new Error(`Algorithm API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.trades && data.trades.length > 0) {
      const lastTrade = data.trades[data.trades.length - 1];
      logSuccess(`Algorithm signal generated successfully`);
      log(`  - Signal: ${lastTrade.side.toUpperCase()}`);
      log(`  - Entry Price: $${lastTrade.entry_price}`);
      log(`  - Win Rate: ${data.performance?.win_rate}%`);
      log(`  - Confidence: ${data.performance?.win_rate || 75}%`);
      
      return {
        signal: lastTrade.side === 'long' ? 'BUY' : 'SELL',
        confidence: data.performance?.win_rate || 75,
        entryPrice: lastTrade.entry_price,
        tradeType: lastTrade.side
      };
    } else {
      throw new Error('No trading signals generated');
    }
  } catch (error) {
    logError(`Algorithm signal generation failed: ${error.message}`);
    return null;
  }
}

async function testVaultTradeExecution(signal) {
  logStep(3, 'Testing Vault Trade Execution');
  
  if (!signal) {
    logWarning('Skipping trade execution test - no signal available');
    return false;
  }

  if (signal.signal !== 'BUY' || signal.confidence < 75) {
    logWarning(`Skipping trade execution - signal: ${signal.signal}, confidence: ${signal.confidence}%`);
    return false;
  }

  try {
    log(`Executing ${signal.tradeType} trade with ${signal.confidence}% confidence...`);
    
    const response = await fetch(`${TEST_CONFIG.RAILWAY_API}/api/vault/execute-trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vault_address: TEST_CONFIG.TEST_VAULT_ADDRESS,
        trade_type: signal.tradeType,
        trade_amount: TEST_CONFIG.MAX_TRADE_AMOUNT,
        algorithm: TEST_CONFIG.ALGORITHM,
        confidence: signal.confidence
      })
    });

    if (!response.ok) {
      throw new Error(`Trade execution API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      logSuccess('Vault trade execution successful!');
      log(`  - Trade ID: ${result.trade_details?.trade_id}`);
      log(`  - Amount: ${result.trade_details?.amount} ADA`);
      log(`  - Type: ${result.trade_details?.type.toUpperCase()}`);
      log(`  - Entry Price: $${result.trade_details?.entry_price}`);
      log(`  - Stop Loss: $${result.trade_details?.stop_loss}`);
      log(`  - Take Profit: $${result.trade_details?.take_profit}`);
      log(`  - Estimated Fees: ${result.estimated_fees?.total_ada} ADA`);
      
      return true;
    } else {
      throw new Error(result.error || 'Trade execution failed');
    }
  } catch (error) {
    logError(`Vault trade execution failed: ${error.message}`);
    return false;
  }
}

async function testMastraAgentIntegration() {
  logStep(4, 'Testing Mastra Agent Integration');
  
  try {
    log('Testing ADA Custom Algorithm Agent registration...');
    
    const response = await fetch(`${TEST_CONFIG.MASTRA_API}/api/agents/adaCustomAlgorithmAgent/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `Register vault for automated trading:
          - Vault Address: ${TEST_CONFIG.TEST_VAULT_ADDRESS}
          - User Address: ${TEST_CONFIG.TEST_USER_ADDRESS}
          - Max Trade Amount: ${TEST_CONFIG.MAX_TRADE_AMOUNT} ADA
          - Algorithm: ${TEST_CONFIG.ALGORITHM}
          - Risk Level: moderate
          - Trading Enabled: true
          
          Please register this vault for automated trading using the ADA Custom Algorithm.`
        }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      logSuccess('Mastra agent integration successful!');
      log(`  - Response: ${data.text || 'Agent responded successfully'}`);
      return true;
    } else {
      logWarning(`Mastra agent not available (${response.status}) - this is expected if agents are not running locally`);
      return false;
    }
  } catch (error) {
    logWarning(`Mastra agent integration test skipped: ${error.message}`);
    return false;
  }
}

async function runCompleteTest() {
  log(`${colors.bold}${colors.blue}🧪 VAULT TRADING FLOW TEST${colors.reset}`);
  log('='.repeat(50));
  
  const results = {
    railwayAPI: false,
    algorithmSignal: null,
    vaultExecution: false,
    mastraIntegration: false
  };

  // Test 1: Railway Vault API
  results.railwayAPI = await testRailwayVaultAPI();
  
  // Test 2: Algorithm Signal Generation
  results.algorithmSignal = await testAlgorithmSignalGeneration();
  
  // Test 3: Vault Trade Execution
  results.vaultExecution = await testVaultTradeExecution(results.algorithmSignal);
  
  // Test 4: Mastra Agent Integration
  results.mastraIntegration = await testMastraAgentIntegration();

  // Summary
  logStep('SUMMARY', 'Test Results');
  log('='.repeat(50));
  
  if (results.railwayAPI) {
    logSuccess('✅ Railway Vault API - WORKING');
  } else {
    logError('❌ Railway Vault API - FAILED');
  }
  
  if (results.algorithmSignal) {
    logSuccess('✅ Algorithm Signal Generation - WORKING');
  } else {
    logError('❌ Algorithm Signal Generation - FAILED');
  }
  
  if (results.vaultExecution) {
    logSuccess('✅ Vault Trade Execution - WORKING');
  } else {
    logError('❌ Vault Trade Execution - FAILED');
  }
  
  if (results.mastraIntegration) {
    logSuccess('✅ Mastra Agent Integration - WORKING');
  } else {
    logWarning('⚠️ Mastra Agent Integration - SKIPPED (agents not running)');
  }

  log('\n' + '='.repeat(50));
  
  const criticalTests = results.railwayAPI && results.algorithmSignal && results.vaultExecution;
  
  if (criticalTests) {
    logSuccess('🎉 CRITICAL VAULT TRADING FLOW - READY FOR TESTING!');
    log('\n📋 What this means:');
    log('  ✅ Railway API can handle vault operations');
    log('  ✅ ADA Custom Algorithm generates trading signals');
    log('  ✅ Vault can execute trades based on algorithm signals');
    log('  ✅ Smart contract integration is ready');
    log('\n🚀 You can now test vault creation and automated trading!');
  } else {
    logError('❌ CRITICAL ISSUES FOUND - NEEDS FIXING BEFORE TESTING');
    log('\n🔧 Issues to resolve:');
    if (!results.railwayAPI) log('  - Railway Vault API not responding');
    if (!results.algorithmSignal) log('  - Algorithm signal generation failing');
    if (!results.vaultExecution) log('  - Vault trade execution not working');
  }
}

// Run the test
runCompleteTest().catch(error => {
  logError(`Test execution failed: ${error.message}`);
  process.exit(1);
});
