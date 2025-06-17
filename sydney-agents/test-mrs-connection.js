#!/usr/bin/env node

/**
 * Test script to verify MRS and MISTER agent connections
 * This script tests the API endpoints directly and through Sone
 */

import { soneAgent } from './src/mastra/agents/sone-agent.js';

async function testDirectMRSConnection() {
  console.log('🔍 Testing direct MRS agent connection...\n');

  try {
    const requestBody = {
      messages: [
        {
          role: 'user',
          content: 'Hello MRS, please provide a brief analysis of the current stock market conditions.',
        },
      ],
      resourceId: 'test-connection',
      threadId: `test-${Date.now()}`,
    };

    console.log('📤 Sending direct request to MRS agent...');
    
    const response = await fetch('https://misterexc6.ngrok.io/api/agents/MRSAgent/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Sone-Test/1.0',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error('❌ Direct MRS connection failed:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      return false;
    }

    const data = await response.json();
    console.log('✅ Direct MRS connection successful!');
    console.log('Response keys:', Object.keys(data));
    console.log('Response text length:', data.text?.length || 0);
    console.log('Response preview:', data.text?.substring(0, 200) + '...' || 'No text found');
    
    return true;

  } catch (error) {
    console.error('❌ Direct MRS connection error:', error);
    return false;
  }
}

async function testSoneMRSIntegration() {
  console.log('\n🤖 Testing Sone -> MRS agent integration...\n');

  try {
    const response = await soneAgent.generate(
      'Please use your callMRSAgent tool to ask for a brief analysis of current market conditions. Test the connection.',
      {
        resourceId: 'sone-mrs-test',
        threadId: 'integration-test'
      }
    );

    console.log('✅ Sone MRS integration test completed');
    console.log('Sone response:', response.text);
    
    return true;

  } catch (error) {
    console.error('❌ Sone MRS integration failed:', error);
    return false;
  }
}

async function testMISTERConnection() {
  console.log('\n🔍 Testing MISTER agent connection...\n');

  try {
    const response = await soneAgent.generate(
      'Please use your callMISTERAgent tool to ask for a brief analysis of Bitcoin or the crypto market. Test the connection.',
      {
        resourceId: 'sone-mister-test',
        threadId: 'mister-test'
      }
    );

    console.log('✅ MISTER agent test completed');
    console.log('Sone response:', response.text);
    
    return true;

  } catch (error) {
    console.error('❌ MISTER agent test failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 MRS/MISTER Agent Connection Tests');
  console.log('=====================================\n');

  const results = {
    directMRS: false,
    soneMRS: false,
    soneMISTER: false
  };

  // Test 1: Direct MRS connection
  results.directMRS = await testDirectMRSConnection();

  // Test 2: Sone -> MRS integration
  results.soneMRS = await testSoneMRSIntegration();

  // Test 3: Sone -> MISTER integration
  results.soneMISTER = await testMISTERConnection();

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Direct MRS Connection: ${results.directMRS ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Sone -> MRS Integration: ${results.soneMRS ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Sone -> MISTER Integration: ${results.soneMISTER ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(result => result);
  console.log(`\nOverall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  if (!allPassed) {
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('- Check if the ngrok tunnel is running: https://misterexc6.ngrok.io');
    console.log('- Verify MRS and MISTER agents are running on the server');
    console.log('- Check network connectivity and firewall settings');
    console.log('- Review the error messages above for specific issues');
  }

  return allPassed;
}

// Run the tests
runAllTests().then((success) => {
  console.log(`\n${success ? '🎉' : '💥'} Testing completed!`);
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
