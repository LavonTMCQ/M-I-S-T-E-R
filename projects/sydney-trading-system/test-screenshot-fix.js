#!/usr/bin/env node

/**
 * Quick test to verify the Playwright screenshot fix
 */

import { soneAgent } from './src/mastra/agents/sone-agent.js';

async function testScreenshotFix() {
  console.log('🔧 Testing Playwright Screenshot Fix');
  console.log('====================================\n');

  try {
    // Test 1: Navigate to a simple page
    console.log('Test 1: Navigate to TradingView');
    const navResponse = await soneAgent.generate(
      'Please navigate to https://www.tradingview.com',
      {
        resourceId: 'screenshot-test',
        threadId: 'nav-test'
      }
    );
    console.log('Navigation result:', navResponse.text);
    console.log('---\n');

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 2: Take screenshot
    console.log('Test 2: Take screenshot');
    const screenshotResponse = await soneAgent.generate(
      'Please take a screenshot of the current page.',
      {
        resourceId: 'screenshot-test',
        threadId: 'screenshot-test'
      }
    );
    console.log('Screenshot result:', screenshotResponse.text);
    console.log('---\n');

    // Test 3: Get page info
    console.log('Test 3: Get current page info');
    const pageInfoResponse = await soneAgent.generate(
      'Please get the current page information.',
      {
        resourceId: 'screenshot-test',
        threadId: 'pageinfo-test'
      }
    );
    console.log('Page info result:', pageInfoResponse.text);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testScreenshotFix().then(() => {
  console.log('\n✅ Screenshot fix testing completed!');
}).catch((error) => {
  console.error('❌ Test failed:', error);
});
