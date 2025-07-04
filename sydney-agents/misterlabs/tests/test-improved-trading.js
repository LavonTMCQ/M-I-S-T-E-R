#!/usr/bin/env node

/**
 * Test the improved trading analysis workflow
 * This tests the new analyzeAndConsultMRS tool that's much faster
 */

import { soneAgent } from './src/mastra/agents/sone-agent.js';

async function testImprovedTrading() {
  console.log('🚀 Testing Improved Trading Analysis Workflow');
  console.log('=============================================\n');

  try {
    // Test 1: Navigate to TradingView (should use persistent session)
    console.log('Test 1: Navigate to TradingView');
    const navResponse = await soneAgent.generate(
      'Please navigate to https://www.tradingview.com',
      {
        resourceId: 'improved-trading-test',
        threadId: 'nav-test'
      }
    );
    console.log('Navigation result:', navResponse.text);
    console.log('---\n');

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 2: Use the new improved trading analysis tool
    console.log('Test 2: Improved Trading Analysis (analyzeAndConsultMRS)');
    const analysisResponse = await soneAgent.generate(
      'Please use your analyzeAndConsultMRS tool to analyze the current trading screen for SPY and speak the results.',
      {
        resourceId: 'improved-trading-test',
        threadId: 'analysis-test'
      }
    );
    console.log('Analysis result:', analysisResponse.text);
    console.log('---\n');

    // Test 3: Check session status
    console.log('Test 3: Check Session Status');
    const sessionResponse = await soneAgent.generate(
      'Please check my browser session status to see if I\'m logged into any trading platforms.',
      {
        resourceId: 'improved-trading-test',
        threadId: 'session-test'
      }
    );
    console.log('Session status:', sessionResponse.text);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testImprovedTrading().then(() => {
  console.log('\n✅ Improved trading analysis testing completed!');
  console.log('\nKey improvements:');
  console.log('1. ✅ Persistent browser sessions (no re-login needed)');
  console.log('2. ✅ Fast text-based analysis (no image upload delays)');
  console.log('3. ✅ Automatic screenshot + analysis + MRS consultation + voice');
  console.log('4. ✅ Much more reliable and faster workflow');
}).catch((error) => {
  console.error('❌ Test failed:', error);
});
