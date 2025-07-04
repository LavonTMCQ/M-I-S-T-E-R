#!/usr/bin/env node

/**
 * Basic CASH Agent Test
 * 
 * Simple test to verify CASH agent is responding
 */

console.log('💰 Basic CASH Agent Test...\n');

async function testCashBasic() {
  try {
    console.log('🔗 Testing CASH agent basic response...');
    
    const testMessage = {
      messages: [
        {
          role: 'user',
          content: 'Hello CASH! Just say hello back.'
        }
      ],
      resourceId: 'cash-basic-test',
      threadId: `cash-basic-${Date.now()}`
    };

    console.log('📤 Sending basic test message...');
    
    const response = await fetch('http://localhost:4112/api/agents/cashAgent/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testMessage),
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ CASH agent responded successfully!');
    
    if (data.text) {
      console.log(`💬 Response: "${data.text.substring(0, 100)}${data.text.length > 100 ? '...' : ''}"`);
    }

    return { success: true, response: data };

  } catch (error) {
    console.error('❌ CASH agent basic test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
testCashBasic().then(result => {
  console.log('\n📊 Test Result:');
  console.log('================');
  console.log(`💰 CASH Agent: ${result.success ? '✅ Working' : '❌ Failed'}`);
  
  if (result.success) {
    console.log('\n🎉 CASH agent is operational!');
    console.log('💡 You can now use CASH for financial analysis via:');
    console.log('   • Mastra Playground: http://localhost:4112');
    console.log('   • API endpoint: http://localhost:4112/api/agents/cashAgent/generate');
    console.log('\n🔧 CASH capabilities:');
    console.log('   • Stock analysis via MRS agent');
    console.log('   • Cryptocurrency analysis via MISTER agent');
    console.log('   • Multi-market comparisons');
    console.log('   • Portfolio analysis');
    console.log('   • Financial knowledge management');
  } else {
    console.log('\n⚠️ CASH agent needs attention. Check the server logs.');
  }
  
  console.log('\n💰 Basic test completed.');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
