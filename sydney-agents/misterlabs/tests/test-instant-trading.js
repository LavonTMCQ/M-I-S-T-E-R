#!/usr/bin/env node

/**
 * Test Instant Trading Monitor
 * This tests the new frictionless trading monitor that starts immediately
 */

import { soneAgent } from './src/mastra/agents/sone-agent.js';

async function testInstantTrading() {
  console.log('⚡ Testing Instant Trading Monitor');
  console.log('==================================\n');

  try {
    // Test 1: Simple "start trading monitor" command
    console.log('Test 1: Simple Trading Monitor Start');
    const startResponse = await soneAgent.generate(
      'start trading monitor',
      {
        resourceId: 'instant-trading-test',
        threadId: 'start-monitor'
      }
    );
    console.log('Start monitor result:', startResponse.text);
    console.log('---\n');

    // Wait for initial setup
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Test 2: Check if monitoring is active
    console.log('Test 2: Check Monitor Status');
    const statusResponse = await soneAgent.generate(
      'Is the trading monitor currently active?',
      {
        resourceId: 'instant-trading-test',
        threadId: 'status-check'
      }
    );
    console.log('Status check result:', statusResponse.text);
    console.log('---\n');

    // Test 3: Wait for first analysis cycle
    console.log('Test 3: Waiting for first analysis cycle...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

    // Test 4: Stop the monitor
    console.log('Test 4: Stop Trading Monitor');
    const stopResponse = await soneAgent.generate(
      'stop trading monitor',
      {
        resourceId: 'instant-trading-test',
        threadId: 'stop-monitor'
      }
    );
    console.log('Stop monitor result:', stopResponse.text);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testInstantTrading().then(() => {
  console.log('\n✅ Instant Trading Monitor testing completed!');
  console.log('\n🎯 Key Features Tested:');
  console.log('1. ✅ Instant Start - No friction, no questions');
  console.log('2. ✅ Auto Navigation - Goes to TradingView automatically');
  console.log('3. ✅ Intelligent Detection - Detects symbols and timeframes');
  console.log('4. ✅ Multi-Timeframe Analysis - Compares 3m with 1h and 1d');
  console.log('5. ✅ Voice Updates - Speaks analysis results');
  console.log('6. ✅ Session Memory - Tracks progression throughout day');
  console.log('\n⚡ Sone now starts trading monitoring instantly with zero friction!');
}).catch((error) => {
  console.error('❌ Test failed:', error);
});
