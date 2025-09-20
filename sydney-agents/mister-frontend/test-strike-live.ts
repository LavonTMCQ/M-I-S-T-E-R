/**
 * LIVE Strike Finance Trading Test
 * 
 * This script tests real trading on Strike Finance with your funded wallet.
 * 
 * IMPORTANT: This will execute REAL trades with REAL ADA!
 * Make sure you understand the risks before running.
 * 
 * Usage:
 * 1. Set your wallet address in the WALLET_ADDRESS variable
 * 2. Set your seed phrase in WALLET_SEED environment variable
 * 3. Run: npx tsx test-strike-live.ts
 */

import { strikeTrader } from './src/services/strike-finance/StrikeAutonomousTrader';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Configuration - can be set via environment variables or directly here
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || ''; // Set via env or add here
const COLLATERAL_AMOUNT = parseInt(process.env.COLLATERAL || '40'); // ADA to use for position
const LEVERAGE = parseInt(process.env.LEVERAGE || '2'); // Conservative 2x leverage
const WALLET_SEED = process.env.WALLET_SEED || ''; // Required for signing

async function testStrikeTrading() {
  console.log('🚀 Strike Finance LIVE Trading Test');
  console.log('⚠️  WARNING: This will execute REAL trades!');
  console.log('====================================\n');

  if (!WALLET_ADDRESS) {
    console.error('❌ Please set WALLET_ADDRESS in the script');
    process.exit(1);
  }

  try {
    // Step 1: Initialize trader
    console.log('1️⃣ Initializing Strike Finance trader...');
    const initialized = await strikeTrader.initialize(WALLET_ADDRESS, WALLET_SEED);
    
    if (!initialized) {
      throw new Error('Failed to initialize Strike trader');
    }
    
    console.log('✅ Trader initialized successfully\n');

    // Step 2: Get current ADA price
    console.log('2️⃣ Fetching current ADA price...');
    const currentPrice = await strikeTrader.getCurrentPrice();
    console.log(`💰 Current ADA price: $${currentPrice}\n`);

    // Step 3: Check existing positions
    console.log('3️⃣ Checking existing positions...');
    const { positions: existingPositions, totalPnL } = await strikeTrader.monitorPositions();
    
    if (existingPositions.length > 0) {
      console.log(`📊 Found ${existingPositions.length} existing positions`);
      console.log(`💵 Total P&L: ${totalPnL} ADA`);
      
      console.log('\n⚠️  You have open positions. Close them first? (y/n)');
      // In automated mode, we'd handle this programmatically
      
    } else {
      console.log('✅ No existing positions found\n');
    }

    // Step 4: Generate trading signal (for testing, we'll create a simple one)
    console.log('4️⃣ Generating trading signal...');
    
    const signal = {
      action: 'open' as const,
      side: 'Long' as const, // Betting ADA will go up
      collateral: COLLATERAL_AMOUNT,
      leverage: LEVERAGE,
      stopLoss: currentPrice * 0.95, // 5% stop loss
      takeProfit: currentPrice * 1.10, // 10% take profit
      confidence: 0.75,
      reasoning: 'Test trade - Conservative long position with tight risk management'
    };
    
    console.log('📈 Signal generated:', {
      side: signal.side,
      collateral: `${signal.collateral} ADA`,
      leverage: `${signal.leverage}x`,
      stopLoss: `$${signal.stopLoss?.toFixed(4)}`,
      takeProfit: `$${signal.takeProfit?.toFixed(4)}`
    });
    console.log('\n');

    // Step 5: Execute trade
    console.log('5️⃣ Executing trade on Strike Finance...');
    console.log('⏳ This may take 10-30 seconds...\n');
    
    const result = await strikeTrader.executeTradingSignal(signal);
    
    if (result.success) {
      console.log('🎉 TRADE EXECUTED SUCCESSFULLY!');
      console.log('📊 Position ID:', result.positionId);
      console.log('🔗 Transaction Hash:', result.txHash);
      console.log('\n✅ Your position is now open on Strike Finance!');
      console.log('📱 View at: https://app.strikefinance.org/positions');
      
      // Step 6: Monitor position
      console.log('\n6️⃣ Monitoring position P&L...');
      
      // Wait a bit for position to settle
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const { positions, totalPnL: newPnL } = await strikeTrader.monitorPositions();
      
      if (positions.length > 0) {
        console.log('\n📊 Position Status:');
        positions.forEach(pos => {
          console.log(`  Asset: ${pos.assetTicker}`);
          console.log(`  Side: ${pos.side}`);
          console.log(`  Collateral: ${pos.collateralAmount} ADA`);
          console.log(`  Leverage: ${pos.leverage}x`);
          console.log(`  Unrealized P&L: ${pos.unrealizedPnL || 0} ADA`);
        });
      }
      
    } else {
      console.error('❌ Trade execution failed:', result.error);
      console.log('\n🔍 Troubleshooting tips:');
      console.log('1. Make sure your wallet has 40+ ADA');
      console.log('2. Check that Strike Finance is accessible');
      console.log('3. Verify your wallet address is correct');
      console.log('4. Check Railway service is running');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\n📝 Error details:');
    if (error instanceof Error) {
      console.log(error.stack);
    }
  }

  console.log('\n====================================');
  console.log('📊 Test completed');
  process.exit(0);
}

// Add signal handlers for clean exit
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

// Run the test
console.log('Starting in 3 seconds...\n');
setTimeout(() => {
  testStrikeTrading();
}, 3000);