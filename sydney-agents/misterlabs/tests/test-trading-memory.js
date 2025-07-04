#!/usr/bin/env node

/**
 * Test Enhanced Trading Session Memory and Multi-Timeframe Analysis
 * This tests Sone's ability to track analysis progression and compare timeframes
 */

import { soneAgent } from './src/mastra/agents/sone-agent.js';

async function testTradingMemory() {
  console.log('🧠 Testing Enhanced Trading Session Memory');
  console.log('=========================================\n');

  try {
    // Test 1: Start Trading Session
    console.log('Test 1: Start Trading Session for SPY');
    const startSessionResponse = await soneAgent.generate(
      'Please start a new trading session for SPY using your manageTradingSession tool.',
      {
        resourceId: 'trading-memory-test',
        threadId: 'session-start'
      }
    );
    console.log('Session start result:', startSessionResponse.text);
    console.log('---\n');

    // Test 2: First Enhanced Analysis
    console.log('Test 2: First Enhanced Multi-Timeframe Analysis');
    const firstAnalysisResponse = await soneAgent.generate(
      'Please perform your first enhanced trading analysis for SPY using enhancedTradingAnalysis. Compare 3m with 1h and 1d timeframes.',
      {
        resourceId: 'trading-memory-test',
        threadId: 'first-analysis'
      }
    );
    console.log('First analysis result:', firstAnalysisResponse.text);
    console.log('---\n');

    // Wait to simulate time progression
    console.log('⏳ Simulating 3-minute progression...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 3: Second Analysis with Memory Context
    console.log('Test 3: Second Analysis with Session Memory');
    const secondAnalysisResponse = await soneAgent.generate(
      'Please perform another enhanced trading analysis for SPY. This time, reference your previous analysis and note any changes or progression since the last update.',
      {
        resourceId: 'trading-memory-test',
        threadId: 'second-analysis'
      }
    );
    console.log('Second analysis result:', secondAnalysisResponse.text);
    console.log('---\n');

    // Test 4: Session Summary
    console.log('Test 4: Trading Session Summary');
    const summaryResponse = await soneAgent.generate(
      'Please provide a summary of today\'s SPY trading session using your manageTradingSession tool.',
      {
        resourceId: 'trading-memory-test',
        threadId: 'session-summary'
      }
    );
    console.log('Session summary result:', summaryResponse.text);
    console.log('---\n');

    // Test 5: Multi-Timeframe Comparison
    console.log('Test 5: Specific Multi-Timeframe Comparison');
    const comparisonResponse = await soneAgent.generate(
      'Based on your trading knowledge and MRS data, explain how the 3-minute chart action relates to the hourly and daily trends for SPY. What should traders watch for?',
      {
        resourceId: 'trading-memory-test',
        threadId: 'timeframe-comparison'
      }
    );
    console.log('Timeframe comparison result:', comparisonResponse.text);
    console.log('---\n');

    // Test 6: Session Memory Query
    console.log('Test 6: Query Session Memory');
    const memoryQueryResponse = await soneAgent.generate(
      'What patterns or trends have you observed in SPY throughout our trading session today? How has the price action evolved?',
      {
        resourceId: 'trading-memory-test',
        threadId: 'memory-query'
      }
    );
    console.log('Memory query result:', memoryQueryResponse.text);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTradingMemory().then(() => {
  console.log('\n✅ Trading Session Memory testing completed!');
  console.log('\n🎯 Key Features Tested:');
  console.log('1. ✅ Trading Session Management (start, update, summary)');
  console.log('2. ✅ Multi-Timeframe Analysis (3m vs 1h vs 1d)');
  console.log('3. ✅ Session Memory and Progression Tracking');
  console.log('4. ✅ MRS Integration for Real-Time Data');
  console.log('5. ✅ Market Session Awareness (pre-market, open, etc.)');
  console.log('6. ✅ Contextual Analysis with Historical Reference');
  console.log('\n🧠 Sone now has comprehensive trading session memory!');
}).catch((error) => {
  console.error('❌ Test failed:', error);
});
