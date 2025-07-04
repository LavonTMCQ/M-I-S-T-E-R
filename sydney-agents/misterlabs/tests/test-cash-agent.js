#!/usr/bin/env node

/**
 * CASH Agent Test Script
 * 
 * Tests the CASH agent's financial analysis capabilities including:
 * - MRS agent integration (stocks/options)
 * - MISTER agent integration (crypto/Cardano)
 * - Multi-market analysis
 * - Portfolio analysis
 * - Financial knowledge base
 */

import { cashAgent } from '../../src/mastra/agents/cash-agent.js';

console.log('💰 Starting CASH Agent Test Suite...\n');

// Test configuration
const testConfig = {
  resourceId: 'cash-test-user',
  threadId: `cash-test-${Date.now()}`,
  timeout: 30000
};

// Test cases
const testCases = [
  {
    name: 'Stock Analysis via MRS',
    message: 'Analyze Apple (AAPL) stock. Provide current market outlook, technical analysis, and investment recommendation.',
    expectedTools: ['call-mrs-agent']
  },
  {
    name: 'Crypto Analysis via MISTER',
    message: 'Analyze Cardano (ADA) cryptocurrency. Focus on recent price action, ecosystem developments, and trading outlook.',
    expectedTools: ['call-mister-agent']
  },
  {
    name: 'Multi-Market Comparison',
    message: 'Compare Tesla (TSLA) stock performance with Bitcoin (BTC). Which looks better for the next month?',
    expectedTools: ['compare-markets', 'call-mrs-agent', 'call-mister-agent']
  },
  {
    name: 'Portfolio Analysis',
    message: 'Analyze a portfolio containing AAPL, MSFT, SPY for stocks and ADA, BTC, ETH for crypto. Provide diversification assessment.',
    expectedTools: ['analyze-portfolio', 'call-mrs-agent', 'call-mister-agent']
  },
  {
    name: 'Financial Knowledge Storage',
    message: 'Remember this analysis: Tesla Q4 earnings showed strong growth in EV deliveries, beating estimates by 15%. Store this for future reference.',
    expectedTools: ['add-financial-knowledge']
  },
  {
    name: 'Knowledge Retrieval',
    message: 'What do you know about Tesla earnings from our previous conversations?',
    expectedTools: ['search-financial-knowledge']
  }
];

// Helper function to run a single test
async function runTest(testCase, index) {
  console.log(`\n🧪 Test ${index + 1}: ${testCase.name}`);
  console.log(`📝 Message: "${testCase.message}"`);
  
  try {
    const startTime = Date.now();
    
    // Generate response from CASH agent
    const response = await cashAgent.generate(
      [{ role: 'user', content: testCase.message }],
      {
        resourceId: testConfig.resourceId,
        threadId: `${testConfig.threadId}-test-${index}`,
      }
    );
    
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Response length: ${response.text?.length || 0} characters`);
    
    if (response.text) {
      // Show first 200 characters of response
      const preview = response.text.length > 200 
        ? response.text.substring(0, 200) + '...'
        : response.text;
      console.log(`💬 Response preview: "${preview}"`);
    }
    
    // Check if expected tools were mentioned or used
    if (testCase.expectedTools) {
      const responseText = response.text?.toLowerCase() || '';
      const toolsFound = testCase.expectedTools.filter(tool => 
        responseText.includes(tool.toLowerCase()) || 
        responseText.includes(tool.replace('-', ' '))
      );
      
      console.log(`🔧 Expected tools: ${testCase.expectedTools.join(', ')}`);
      console.log(`✅ Tools detected: ${toolsFound.length}/${testCase.expectedTools.length}`);
    }
    
    console.log(`✅ Test ${index + 1} completed successfully`);
    return { success: true, duration, response };
    
  } catch (error) {
    console.error(`❌ Test ${index + 1} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// Helper function to test agent tools directly
async function testAgentTools() {
  console.log('\n🔧 Testing CASH Agent Tools Directly...\n');
  
  try {
    // Test MRS agent call
    console.log('📈 Testing MRS Agent Integration...');
    const mrsTest = await cashAgent.tools.callMRSAgent.execute({
      context: {
        query: 'What is the current outlook for SPY ETF?',
        retryCount: 1
      }
    });
    
    console.log(`MRS Test Result: ${mrsTest.success ? '✅ Success' : '❌ Failed'}`);
    if (mrsTest.success) {
      console.log(`MRS Response: ${mrsTest.response?.substring(0, 100)}...`);
    } else {
      console.log(`MRS Error: ${mrsTest.error}`);
    }
    
    // Test MISTER agent call
    console.log('\n₿ Testing MISTER Agent Integration...');
    const misterTest = await cashAgent.tools.callMISTERAgent.execute({
      context: {
        query: 'What is the current outlook for Cardano (ADA)?',
        retryCount: 1
      }
    });
    
    console.log(`MISTER Test Result: ${misterTest.success ? '✅ Success' : '❌ Failed'}`);
    if (misterTest.success) {
      console.log(`MISTER Response: ${misterTest.response?.substring(0, 100)}...`);
    } else {
      console.log(`MISTER Error: ${misterTest.error}`);
    }
    
    // Test knowledge base
    console.log('\n📚 Testing Financial Knowledge Base...');
    const knowledgeTest = await cashAgent.tools.addFinancialKnowledge.execute({
      context: {
        title: 'Test Market Analysis',
        content: 'This is a test analysis for CASH agent knowledge base functionality.',
        category: 'analysis',
        symbols: ['TEST'],
        source: 'test-script'
      }
    });
    
    console.log(`Knowledge Test Result: ${knowledgeTest.success ? '✅ Success' : '❌ Failed'}`);
    
    return {
      mrsWorking: mrsTest.success,
      misterWorking: misterTest.success,
      knowledgeWorking: knowledgeTest.success
    };
    
  } catch (error) {
    console.error('❌ Tool testing failed:', error);
    return {
      mrsWorking: false,
      misterWorking: false,
      knowledgeWorking: false
    };
  }
}

// Main test execution
async function runAllTests() {
  console.log('💰 CASH Agent - Financial Analysis AI');
  console.log('🎯 Specialized in stocks (MRS) and crypto (MISTER) analysis\n');
  
  // Test tools first
  const toolResults = await testAgentTools();
  
  // Run conversation tests
  console.log('\n💬 Running Conversation Tests...\n');
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const result = await runTest(testCases[i], i);
    results.push(result);
    
    // Wait between tests to avoid overwhelming the agents
    if (i < testCases.length - 1) {
      console.log('⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful tests: ${successful}/${results.length}`);
  console.log(`❌ Failed tests: ${failed}/${results.length}`);
  
  console.log('\n🔧 Tool Integration Status:');
  console.log(`📈 MRS Agent (Stocks): ${toolResults.mrsWorking ? '✅ Working' : '❌ Failed'}`);
  console.log(`₿ MISTER Agent (Crypto): ${toolResults.misterWorking ? '✅ Working' : '❌ Failed'}`);
  console.log(`📚 Knowledge Base: ${toolResults.knowledgeWorking ? '✅ Working' : '❌ Failed'}`);
  
  if (successful === results.length && toolResults.mrsWorking && toolResults.misterWorking) {
    console.log('\n🎉 All tests passed! CASH agent is ready for financial analysis.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
  
  console.log('\n💰 CASH Agent testing completed.');
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
