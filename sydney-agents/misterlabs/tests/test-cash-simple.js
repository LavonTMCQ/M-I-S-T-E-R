#!/usr/bin/env node

/**
 * Simple CASH Agent Test
 * 
 * Basic test to verify CASH agent is working and can communicate with MRS/MISTER agents
 */

console.log('💰 Testing CASH Agent...\n');

// Test the CASH agent via HTTP API (since it's running on the server)
async function testCashAgent() {
  try {
    console.log('🔗 Testing CASH agent via Mastra API...');
    
    const testMessage = {
      messages: [
        {
          role: 'user',
          content: 'Hello CASH! Can you tell me about your capabilities? What can you help me with regarding financial analysis?'
        }
      ],
      resourceId: 'cash-test-user',
      threadId: `cash-test-${Date.now()}`
    };

    console.log('📤 Sending test message to CASH agent...');
    
    const response = await fetch('http://localhost:4112/api/agents/cashAgent/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testMessage),
      signal: AbortSignal.timeout(30000)
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ CASH agent responded successfully!');
    
    if (data.text) {
      console.log(`💬 Response length: ${data.text.length} characters`);
      console.log(`📝 Response preview: "${data.text.substring(0, 200)}${data.text.length > 200 ? '...' : ''}"`);
    }

    return { success: true, response: data };

  } catch (error) {
    console.error('❌ CASH agent test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test MRS agent connectivity
async function testMRSConnectivity() {
  try {
    console.log('\n📈 Testing MRS agent connectivity...');
    
    const testMessage = {
      messages: [
        {
          role: 'user',
          content: 'Can you check if MRS agent is available? Try to get a quick analysis of SPY ETF.'
        }
      ],
      resourceId: 'cash-mrs-test',
      threadId: `cash-mrs-test-${Date.now()}`
    };

    const response = await fetch('http://localhost:4112/api/agents/cashAgent/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testMessage),
      signal: AbortSignal.timeout(45000) // Longer timeout for external agent call
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ MRS connectivity test completed');
    
    // Check if response mentions MRS or contains financial analysis
    const responseText = data.text?.toLowerCase() || '';
    const hasMRSReference = responseText.includes('mrs') || responseText.includes('stock') || responseText.includes('spy');
    
    console.log(`🔍 MRS reference found: ${hasMRSReference ? 'Yes' : 'No'}`);
    
    return { success: true, mrsWorking: hasMRSReference, response: data };

  } catch (error) {
    console.error('❌ MRS connectivity test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test MISTER agent connectivity
async function testMISTERConnectivity() {
  try {
    console.log('\n₿ Testing MISTER agent connectivity...');
    
    const testMessage = {
      messages: [
        {
          role: 'user',
          content: 'Can you check if MISTER agent is available? Try to get a quick analysis of Cardano (ADA).'
        }
      ],
      resourceId: 'cash-mister-test',
      threadId: `cash-mister-test-${Date.now()}`
    };

    const response = await fetch('http://localhost:4112/api/agents/cashAgent/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testMessage),
      signal: AbortSignal.timeout(45000) // Longer timeout for external agent call
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ MISTER connectivity test completed');
    
    // Check if response mentions MISTER or contains crypto analysis
    const responseText = data.text?.toLowerCase() || '';
    const hasMISTERReference = responseText.includes('mister') || responseText.includes('crypto') || responseText.includes('ada') || responseText.includes('cardano');
    
    console.log(`🔍 MISTER reference found: ${hasMISTERReference ? 'Yes' : 'No'}`);
    
    return { success: true, misterWorking: hasMISTERReference, response: data };

  } catch (error) {
    console.error('❌ MISTER connectivity test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Main test function
async function runTests() {
  console.log('💰 CASH Agent - Financial Analysis AI');
  console.log('🎯 Testing basic functionality and agent connectivity\n');
  
  // Test 1: Basic CASH agent functionality
  const basicTest = await testCashAgent();
  
  if (!basicTest.success) {
    console.log('\n❌ Basic CASH agent test failed. Cannot proceed with connectivity tests.');
    return;
  }
  
  // Test 2: MRS agent connectivity
  const mrsTest = await testMRSConnectivity();
  
  // Test 3: MISTER agent connectivity  
  const misterTest = await testMISTERConnectivity();
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`💰 CASH Agent: ${basicTest.success ? '✅ Working' : '❌ Failed'}`);
  console.log(`📈 MRS Integration: ${mrsTest.success && mrsTest.mrsWorking ? '✅ Working' : '⚠️ Limited/Failed'}`);
  console.log(`₿ MISTER Integration: ${misterTest.success && misterTest.misterWorking ? '✅ Working' : '⚠️ Limited/Failed'}`);
  
  if (basicTest.success) {
    console.log('\n🎉 CASH agent is operational and ready for financial analysis!');
    console.log('💡 You can now use CASH for:');
    console.log('   • Stock analysis via MRS agent');
    console.log('   • Cryptocurrency analysis via MISTER agent');
    console.log('   • Multi-market comparisons');
    console.log('   • Portfolio analysis');
    console.log('   • Financial knowledge management');
    console.log('\n🌐 Access CASH via: http://localhost:4112');
  } else {
    console.log('\n⚠️ CASH agent setup needs attention. Check the server logs.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
