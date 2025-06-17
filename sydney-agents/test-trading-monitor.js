#!/usr/bin/env node

/**
 * Test script for Sone's Trading Monitor functionality
 * This script tests the complete workflow: navigation, screenshots, MRS analysis, and voice
 */

import { soneAgent } from './src/mastra/agents/sone-agent.js';

async function testTradingMonitor() {
  console.log('🎯 Testing Sone Trading Monitor Workflow');
  console.log('========================================\n');

  try {
    // Test 1: Navigate to TradingView
    console.log('Test 1: Navigate to TradingView');
    const navResponse = await soneAgent.generate(
      'Please navigate to https://www.tradingview.com and let me know when you arrive.',
      {
        resourceId: 'trading-test',
        threadId: 'nav-test'
      }
    );
    console.log('Navigation response:', navResponse.text);
    console.log('---\n');

    // Wait a moment for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 2: Take a screenshot
    console.log('Test 2: Take screenshot');
    const screenshotResponse = await soneAgent.generate(
      'Please take a screenshot of the current page.',
      {
        resourceId: 'trading-test',
        threadId: 'screenshot-test'
      }
    );
    console.log('Screenshot response:', screenshotResponse.text);
    console.log('---\n');

    // Test 3: Call MRS for analysis
    console.log('Test 3: Call MRS for market analysis');
    const mrsResponse = await soneAgent.generate(
      'Please call MRS agent to analyze the current market conditions for SPY.',
      {
        resourceId: 'trading-test',
        threadId: 'mrs-test'
      }
    );
    console.log('MRS analysis response:', mrsResponse.text);
    console.log('---\n');

    // Test 4: Voice output
    console.log('Test 4: Voice output test');
    const voiceResponse = await soneAgent.generate(
      'Please use your speakResponse tool to say: "Trading monitor test completed successfully. All systems are working properly."',
      {
        resourceId: 'trading-test',
        threadId: 'voice-test'
      }
    );
    console.log('Voice response:', voiceResponse.text);
    console.log('---\n');

    // Test 5: Complete workflow simulation
    console.log('Test 5: Complete trading analysis workflow');
    const workflowResponse = await soneAgent.generate(
      'Please perform a complete trading analysis: take a screenshot, send it to MRS agent for analysis, and then speak the results using your voice.',
      {
        resourceId: 'trading-test',
        threadId: 'workflow-test'
      }
    );
    console.log('Complete workflow response:', workflowResponse.text);

  } catch (error) {
    console.error('❌ Trading monitor test failed:', error);
  }
}

// Run the test
testTradingMonitor().then(() => {
  console.log('\n✅ Trading monitor testing completed!');
  console.log('\nNext steps:');
  console.log('1. Verify screenshots are being taken correctly');
  console.log('2. Confirm MRS agent responses are detailed and useful');
  console.log('3. Test voice output is clear and audible');
  console.log('4. Try the automated 3-minute monitoring loop');
}).catch((error) => {
  console.error('❌ Trading monitor testing failed:', error);
});
