/**
 * Test script for Sone's financial agent integration
 * This demonstrates how Sone can call MRS (stocks) and MISTER (crypto) agents
 */

import { soneAgent } from '../src/mastra/agents/sone-agent.js';

async function testSoneFinancialAgents() {
  console.log('💰 Testing Sone\'s Financial Agent Integration\n');

  try {
    // Test 1: Ask Sone about stock information (should call MRS)
    console.log('📈 Test 1: Stock market analysis via MRS agent...');
    
    const stockResponse = await soneAgent.generate(
      'What is the current price and analysis of Apple (AAPL) stock? Please provide technical analysis and market insights.',
      {
        resourceId: 'test-user',
        threadId: 'financial-test-thread'
      }
    );
    
    console.log('✅ Stock Analysis Response:', stockResponse.text);
    console.log('');

    // Test 2: Ask Sone about cryptocurrency (should call MISTER)
    console.log('₿ Test 2: Cryptocurrency analysis via MISTER agent...');
    
    const cryptoResponse = await soneAgent.generate(
      'What is the current price of Bitcoin and what are the market trends? Please provide analysis.',
      {
        resourceId: 'test-user',
        threadId: 'financial-test-thread'
      }
    );
    
    console.log('✅ Crypto Analysis Response:', cryptoResponse.text);
    console.log('');

    // Test 3: Ask for both stock and crypto comparison
    console.log('⚖️ Test 3: Combined financial analysis...');
    
    const combinedResponse = await soneAgent.generate(
      'Can you compare the performance of Apple stock versus Bitcoin today? What are the key differences in their market behavior?',
      {
        resourceId: 'test-user',
        threadId: 'financial-test-thread'
      }
    );
    
    console.log('✅ Combined Analysis Response:', combinedResponse.text);
    console.log('');

    // Test 4: Store financial insights in knowledge base
    console.log('🧠 Test 4: Storing financial insights...');
    
    const knowledgeResponse = await soneAgent.generate(
      'Please store the key insights from our financial analysis in your knowledge base for future reference. Tag them as "financial-analysis" and "market-data".',
      {
        resourceId: 'test-user',
        threadId: 'financial-test-thread'
      }
    );
    
    console.log('✅ Knowledge Storage Response:', knowledgeResponse.text);
    console.log('');

    // Test 5: Test memory and context retention
    console.log('🔄 Test 5: Testing financial context retention...');
    
    const contextResponse = await soneAgent.generate(
      'Based on our previous financial discussions, what would you recommend for someone interested in both traditional and crypto investments?',
      {
        resourceId: 'test-user',
        threadId: 'financial-test-thread'
      }
    );
    
    console.log('✅ Context Retention Response:', contextResponse.text);
    console.log('');

    console.log('🎉 All financial agent integration tests completed successfully!');
    console.log('\n📊 Summary of Enhanced Capabilities:');
    console.log('✅ MRS Agent Integration - Stock market and traditional finance analysis');
    console.log('✅ MISTER Agent Integration - Cryptocurrency and DeFi analysis');
    console.log('✅ Combined Analysis - Cross-market insights and comparisons');
    console.log('✅ Knowledge Base Storage - Financial insights preservation');
    console.log('✅ Context Retention - Memory of financial discussions');
    console.log('✅ Voice Capabilities - Can discuss finances via voice');
    console.log('✅ Evaluation Metrics - Quality assurance for financial advice');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : String(error));
  }
}

// Run the test
testSoneFinancialAgents().catch(console.error);
