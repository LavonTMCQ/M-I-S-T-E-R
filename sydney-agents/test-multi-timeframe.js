#!/usr/bin/env node

/**
 * Test script to verify Multi-Timeframe strategy works like Fibonacci
 */

import fetch from 'node-fetch';

async function testMultiTimeframeStrategy() {
  console.log('🧪 Testing Multi-Timeframe Strategy Implementation...\n');

  try {
    // Test 1: API Endpoint
    console.log('1️⃣ Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/backtest/multi-timeframe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: 'ADAUSD' })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ API endpoint working');

    // Test 2: Data Structure
    console.log('\n2️⃣ Testing data structure...');
    const requiredFields = [
      'success', 'strategy', 'symbol', 'timeframe', 'startDate', 'endDate',
      'totalNetPnl', 'winRate', 'maxDrawdown', 'sharpeRatio', 'totalTrades',
      'trades', 'chartData', 'performance'
    ];

    const missingFields = requiredFields.filter(field => !(field in data));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    console.log('✅ All required fields present');

    // Test 3: Chart Data
    console.log('\n3️⃣ Testing chart data...');
    if (!Array.isArray(data.chartData) || data.chartData.length === 0) {
      throw new Error('Chart data is missing or empty');
    }
    
    const sampleCandle = data.chartData[0];
    const requiredCandleFields = ['time', 'open', 'high', 'low', 'close', 'volume'];
    const missingCandleFields = requiredCandleFields.filter(field => !(field in sampleCandle));
    if (missingCandleFields.length > 0) {
      throw new Error(`Missing candle fields: ${missingCandleFields.join(', ')}`);
    }
    console.log(`✅ Chart data valid (${data.chartData.length} candles)`);

    // Test 4: Trades Data
    console.log('\n4️⃣ Testing trades data...');
    if (!Array.isArray(data.trades)) {
      throw new Error('Trades data is not an array');
    }
    
    if (data.trades.length > 0) {
      const sampleTrade = data.trades[0];
      const requiredTradeFields = ['id', 'entryTime', 'exitTime', 'side', 'entryPrice', 'exitPrice', 'size', 'netPnl', 'reason'];
      const missingTradeFields = requiredTradeFields.filter(field => !(field in sampleTrade));
      if (missingTradeFields.length > 0) {
        throw new Error(`Missing trade fields: ${missingTradeFields.join(', ')}`);
      }
      console.log(`✅ Trades data valid (${data.trades.length} trades)`);
    } else {
      console.log('⚠️ No trades generated (this might be normal for some periods)');
    }

    // Test 5: Performance Metrics
    console.log('\n5️⃣ Testing performance metrics...');
    const { performance } = data;
    const requiredPerfFields = ['winningTrades', 'losingTrades', 'avgWin', 'avgLoss', 'profitFactor', 'totalReturn'];
    const missingPerfFields = requiredPerfFields.filter(field => !(field in performance));
    if (missingPerfFields.length > 0) {
      throw new Error(`Missing performance fields: ${missingPerfFields.join(', ')}`);
    }
    console.log('✅ Performance metrics valid');

    // Summary
    console.log('\n📊 MULTI-TIMEFRAME STRATEGY TEST RESULTS:');
    console.log('==========================================');
    console.log(`Strategy: ${data.strategy}`);
    console.log(`Symbol: ${data.symbol}`);
    console.log(`Timeframe: ${data.timeframe}`);
    console.log(`Period: ${data.startDate} to ${data.endDate}`);
    console.log(`Total Trades: ${data.totalTrades}`);
    console.log(`Win Rate: ${data.winRate.toFixed(1)}%`);
    console.log(`Total P&L: $${data.totalNetPnl.toFixed(2)}`);
    console.log(`Max Drawdown: ${data.maxDrawdown.toFixed(1)}%`);
    console.log(`Sharpe Ratio: ${data.sharpeRatio.toFixed(2)}`);
    console.log(`Chart Data Points: ${data.chartData.length}`);
    console.log(`Profit Factor: ${data.performance.profitFactor.toFixed(2)}`);

    console.log('\n🎯 RESULT: Multi-Timeframe strategy is working correctly!');
    console.log('✅ All tests passed - ready for frontend integration');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

// Run the test
testMultiTimeframeStrategy();
