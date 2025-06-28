/**
 * Test script for the Quant Agent
 * 
 * This script tests the Pine Script generation capabilities of the Quant agent.
 */

import { mastra } from './src/mastra/index.js';

async function testQuantAgent() {
  console.log('🧪 Testing Quant Agent...');
  
  try {
    // Get the Quant agent
    const quantAgent = mastra.getAgent('quantAgent');
    
    if (!quantAgent) {
      console.error('❌ Quant agent not found. Make sure it\'s properly registered.');
      return;
    }
    
    console.log('✅ Quant agent found');
    
    // Test 1: Simple Moving Average Crossover Strategy
    console.log('\n📊 Test 1: Generating Moving Average Crossover Strategy...');
    
    const maStrategy = await quantAgent.generate(
      'Create a Pine Script strategy that buys when the 10-period SMA crosses above the 20-period SMA and sells when it crosses below. Include alerts and basic risk management.',
      {
        resourceId: 'test-user',
        threadId: 'test-ma-crossover',
      }
    );
    
    console.log('📝 Generated MA Crossover Strategy:');
    console.log(maStrategy.text);
    
    // Test 2: RSI Strategy
    console.log('\n📊 Test 2: Generating RSI Strategy...');
    
    const rsiStrategy = await quantAgent.generate(
      'Generate a Pine Script strategy using RSI indicator. Buy when RSI crosses above 30 (oversold) and sell when RSI crosses below 70 (overbought). Use 14-period RSI.',
      {
        resourceId: 'test-user',
        threadId: 'test-rsi-strategy',
      }
    );
    
    console.log('📝 Generated RSI Strategy:');
    console.log(rsiStrategy.text);
    
    // Test 3: Error Debugging
    console.log('\n🐛 Test 3: Testing Error Debugging...');
    
    const debugTest = await quantAgent.generate(
      'Debug this Pine Script error: "Syntax error at input \'if\'" on line 15. The code is: plot(close) if condition strategy.entry("Long", strategy.long)',
      {
        resourceId: 'test-user',
        threadId: 'test-debug',
      }
    );
    
    console.log('🔧 Debug Response:');
    console.log(debugTest.text);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testQuantAgent().catch(console.error);
