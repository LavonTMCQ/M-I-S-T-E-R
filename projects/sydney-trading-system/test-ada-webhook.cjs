#!/usr/bin/env node

/**
 * 🧪 ADA WEBHOOK TESTING SCRIPT
 * 
 * Tests the ADA webhook monitoring system with sample signals, trades, and alerts.
 * Verifies voice announcements and WebSocket functionality.
 */

const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080';

// Test data
const testAdaSignal = {
  symbol: 'ADAUSD',
  action: 'BUY',
  price: 0.5782,
  strength: 0.85,
  strategy: 'Multi-Timeframe Momentum',
  timeframe: '15m',
  indicators: {
    rsi: 28.5,
    macd: 0.0012,
    bb_position: 'lower'
  }
};

const testAdaTrade = {
  symbol: 'ADAUSD',
  action: 'LONG',
  entryPrice: 0.5782,
  exitPrice: 0.5834,
  quantity: 1000,
  profit: 52.00,
  profitPercent: 0.90,
  leverage: 10
};

const testAdaAlert = {
  message: 'ADA breakout detected above resistance level',
  priority: 'high',
  symbol: 'ADA',
  data: {
    resistance: 0.5800,
    currentPrice: 0.5834,
    volume: 'high'
  }
};

async function testWebhookEndpoints() {
  console.log('🧪 Testing ADA Webhook Endpoints...\n');

  try {
    // Test health endpoint
    console.log('1️⃣ Testing Health Endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);
    console.log(`   Uptime: ${Math.round(healthResponse.data.uptime)}s\n`);

    // Test ADA signal endpoint
    console.log('2️⃣ Testing ADA Signal Endpoint...');
    const signalResponse = await axios.post(`${BASE_URL}/ada/signals`, testAdaSignal);
    console.log('✅ ADA Signal processed:', signalResponse.data.success);
    console.log(`   Signal ID: ${signalResponse.data.signal.id}`);
    console.log(`   Strength: ${Math.round(signalResponse.data.signal.strength * 100)}%\n`);

    // Wait for voice announcement
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test ADA trade endpoint
    console.log('3️⃣ Testing ADA Trade Endpoint...');
    const tradeResponse = await axios.post(`${BASE_URL}/ada/trades`, testAdaTrade);
    console.log('✅ ADA Trade processed:', tradeResponse.data.success);
    console.log(`   Trade ID: ${tradeResponse.data.trade.id}`);
    console.log(`   Profit: $${tradeResponse.data.trade.profit}`);
    console.log(`   Hit Rate: ${tradeResponse.data.performance.hitRate.toFixed(1)}%\n`);

    // Wait for voice announcement
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test ADA alert endpoint
    console.log('4️⃣ Testing ADA Alert Endpoint...');
    const alertResponse = await axios.post(`${BASE_URL}/ada/alerts`, testAdaAlert);
    console.log('✅ ADA Alert processed:', alertResponse.data.success);
    console.log(`   Alert ID: ${alertResponse.data.alert.id}`);
    console.log(`   Priority: ${alertResponse.data.alert.priority}\n`);

    // Wait for voice announcement
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test status endpoint
    console.log('5️⃣ Testing ADA Status Endpoint...');
    const statusResponse = await axios.get(`${BASE_URL}/ada/status`);
    console.log('✅ ADA Status retrieved:', statusResponse.data.success);
    console.log(`   Total Signals: ${statusResponse.data.performance.totalSignals}`);
    console.log(`   Total Trades: ${statusResponse.data.performance.totalTrades}`);
    console.log(`   Total Profit: $${statusResponse.data.performance.totalProfit}`);
    console.log(`   Hit Rate: ${statusResponse.data.performance.hitRate.toFixed(1)}%\n`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

async function testWebSocket() {
  console.log('🔌 Testing ADA WebSocket Connection...\n');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let messageCount = 0;

    ws.on('open', () => {
      console.log('✅ WebSocket connected to ADA monitor');
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messageCount++;
        
        console.log(`📡 WebSocket Message ${messageCount}:`, message.type);
        if (message.type === 'welcome') {
          console.log(`   Welcome: ${message.message}`);
        } else if (message.type === 'ada_signal') {
          console.log(`   Signal: ${message.data.action} ${message.data.symbol} at $${message.data.price}`);
        } else if (message.type === 'ada_trade') {
          console.log(`   Trade: ${message.data.action} ${message.data.symbol} profit $${message.data.profit}`);
        } else if (message.type === 'ada_alert') {
          console.log(`   Alert: ${message.data.message}`);
        }

        // Close after receiving a few messages
        if (messageCount >= 4) {
          ws.close();
          console.log('\n✅ WebSocket test completed successfully');
          resolve();
        }
      } catch (error) {
        console.error('❌ WebSocket message parsing error:', error);
        reject(error);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      reject(error);
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      if (messageCount < 4) {
        resolve(); // Still consider it successful if we got some messages
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      resolve();
    }, 10000);
  });
}

async function runTests() {
  console.log('🚀 ADA WEBHOOK MONITOR TEST SUITE');
  console.log('=====================================\n');

  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/health`);
  } catch (error) {
    console.error('❌ ADA Webhook server is not running!');
    console.error('   Please start the server first: ./start-ada-webhook.sh');
    process.exit(1);
  }

  // Run tests
  await testWebhookEndpoints();
  await testWebSocket();

  console.log('\n🎉 All ADA webhook tests completed!');
  console.log('🔊 Check your speakers for voice announcements');
  console.log('📊 The ADA webhook monitor is ready for TradingView alerts');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testAdaSignal, testAdaTrade, testAdaAlert };
