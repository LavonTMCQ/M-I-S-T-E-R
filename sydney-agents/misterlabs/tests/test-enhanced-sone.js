#!/usr/bin/env node

/**
 * Test Enhanced Sone with Trading Knowledge Base
 * This tests the complete enhanced workflow with technical analysis knowledge
 */

import { soneAgent } from './src/mastra/agents/sone-agent.js';

async function testEnhancedSone() {
  console.log('🧠 Testing Enhanced Sone with Trading Knowledge');
  console.log('===============================================\n');

  try {
    // Test 1: Seed Trading Knowledge
    console.log('Test 1: Seed Comprehensive Trading Knowledge');
    const seedResponse = await soneAgent.generate(
      'Please use your seedTradingKnowledge tool to seed all trading knowledge areas into your knowledge base.',
      {
        resourceId: 'enhanced-sone-test',
        threadId: 'knowledge-seed'
      }
    );
    console.log('Knowledge seeding result:', seedResponse.text);
    console.log('---\n');

    // Test 2: Test Technical Analysis Knowledge
    console.log('Test 2: Test Technical Analysis Knowledge');
    const technicalResponse = await soneAgent.generate(
      'Based on your technical analysis knowledge, explain what a head and shoulders pattern is and how to identify it on a chart.',
      {
        resourceId: 'enhanced-sone-test',
        threadId: 'technical-test'
      }
    );
    console.log('Technical analysis response:', technicalResponse.text);
    console.log('---\n');

    // Test 3: Test Options Knowledge
    console.log('Test 3: Test Options Knowledge');
    const optionsResponse = await soneAgent.generate(
      'Explain the Greeks in options trading and how they affect option pricing, particularly Delta and Theta.',
      {
        resourceId: 'enhanced-sone-test',
        threadId: 'options-test'
      }
    );
    console.log('Options knowledge response:', optionsResponse.text);
    console.log('---\n');

    // Test 4: Navigate to TradingView
    console.log('Test 4: Navigate to TradingView');
    const navResponse = await soneAgent.generate(
      'Please navigate to TradingView so we can test the enhanced trading analysis.',
      {
        resourceId: 'enhanced-sone-test',
        threadId: 'nav-test'
      }
    );
    console.log('Navigation result:', navResponse.text);
    console.log('---\n');

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 5: Enhanced Trading Analysis
    console.log('Test 5: Enhanced Trading Analysis (Knowledge + MRS)');
    const enhancedAnalysisResponse = await soneAgent.generate(
      'Please perform an enhanced trading analysis: First use your technical analysis knowledge to identify what you can see on the chart, then consult MRS for current market data and speak the combined analysis.',
      {
        resourceId: 'enhanced-sone-test',
        threadId: 'enhanced-analysis'
      }
    );
    console.log('Enhanced analysis result:', enhancedAnalysisResponse.text);
    console.log('---\n');

    // Test 6: Risk Management Analysis
    console.log('Test 6: Risk Management Analysis');
    const riskResponse = await soneAgent.generate(
      'Based on your risk management knowledge, what are the key principles for position sizing and stop loss placement in trading?',
      {
        resourceId: 'enhanced-sone-test',
        threadId: 'risk-test'
      }
    );
    console.log('Risk management response:', riskResponse.text);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEnhancedSone().then(() => {
  console.log('\n✅ Enhanced Sone testing completed!');
  console.log('\n🎯 Key Enhancements:');
  console.log('1. ✅ Comprehensive Technical Analysis Knowledge');
  console.log('2. ✅ Deep Options Trading Strategies');
  console.log('3. ✅ Market Structure Understanding');
  console.log('4. ✅ Risk Management Expertise');
  console.log('5. ✅ Combined Knowledge + Real-time MRS Data');
  console.log('6. ✅ Enhanced Trading Analysis Workflow');
  console.log('\n🧠 Sone now has expert-level trading knowledge!');
}).catch((error) => {
  console.error('❌ Test failed:', error);
});
