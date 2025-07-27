#!/usr/bin/env node

/**
 * Test Deployed Strike Agent Following Official Protocol
 * Tests the actual deployed agent at Mastra Cloud
 */

const https = require('https');

async function testDeployedStrikeAgent() {
  console.log('🧪 Testing Deployed Strike Agent at Mastra Cloud...');
  console.log('📍 URL: https://substantial-scarce-magazin.mastra.cloud');
  
  const testData = JSON.stringify({
    messages: [{
      role: 'user',
      content: `WALLET_CONTEXT:
- Wallet Address: addr1q82j3cnhky8u0w4wa0ntsgeypraf24jxz5qr6wgwcy97u7t8pvpwk4ker5z2lmfsjlvx0y2tex68ahdwql9xkm9urxks9n2nl8
- Stake Address: stake1u9nskqht2mv36p90a5cf0kr8j99undr7mkhq0jntdj7pntgqfpmzy
- Balance: 98.19 ADA
- Wallet Type: vespr
- ADA Handle: $@misterexc6
- Trading Mode: connected

USER_MESSAGE: Go long 45 ADA with 2x leverage`
    }],
    resourceId: 'addr1q82j3cnhky8u0w4wa0ntsgeypraf24jxz5qr6wgwcy97u7t8pvpwk4ker5z2lmfsjlvx0y2tex68ahdwql9xkm9urxks9n2nl8',
    threadId: `testing-${Date.now()}`
  });

  const options = {
    hostname: 'substantial-scarce-magazin.mastra.cloud',
    port: 443,
    path: '/api/agents/strikeAgent/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Strike-Agent-Test/1.0',
      'Content-Length': Buffer.byteLength(testData)
    }
  };

  return new Promise((resolve, reject) => {
    console.log('📡 Sending request to deployed Strike Agent...');
    
    const req = https.request(options, (res) => {
      console.log(`📡 Response status: ${res.statusCode}`);
      console.log(`📋 Response headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const jsonData = JSON.parse(data);
            console.log('✅ Strike Agent responded successfully!');
            console.log('📊 Response structure:', Object.keys(jsonData));
            
            // Check for tool calls and CBOR data
            if (jsonData.text) {
              console.log('📝 Agent response:', jsonData.text.substring(0, 200) + '...');
            }
            
            // Look for tool calls
            if (jsonData.toolCalls && jsonData.toolCalls.length > 0) {
              console.log(`🔧 Found ${jsonData.toolCalls.length} tool calls`);
              jsonData.toolCalls.forEach((toolCall, index) => {
                console.log(`🔧 Tool ${index + 1}: ${toolCall.toolName}`);
                if (toolCall.result && toolCall.result.error) {
                  console.log(`❌ Tool error: ${toolCall.result.error}`);
                }
              });
            }
            
            // Look for messages with tool results
            if (jsonData.messages && Array.isArray(jsonData.messages)) {
              console.log(`📨 Found ${jsonData.messages.length} messages`);
              jsonData.messages.forEach((message, index) => {
                if (message.role === 'tool' && message.content) {
                  console.log(`🔧 Tool message ${index + 1}:`, message.content.length > 0 ? 'Has content' : 'Empty');
                  if (Array.isArray(message.content)) {
                    message.content.forEach((contentItem, contentIndex) => {
                      if (contentItem.type === 'tool-result') {
                        console.log(`🔧 Tool result ${contentIndex + 1}: ${contentItem.toolName}`);
                        if (contentItem.result && contentItem.result.error) {
                          console.log(`❌ Tool result error: ${contentItem.result.error}`);
                        }
                      }
                    });
                  }
                }
              });
            }
            
            resolve(true);
          } else {
            console.log(`❌ Strike Agent returned ${res.statusCode}`);
            console.log('📋 Response body:', data);
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Failed to parse response:', error.message);
          console.log('📋 Raw response:', data.substring(0, 500) + '...');
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request failed:', error.message);
      resolve(false);
    });

    req.setTimeout(30000, () => {
      console.log('❌ Request timed out');
      req.destroy();
      resolve(false);
    });

    req.write(testData);
    req.end();
  });
}

async function testFrontendAPI() {
  console.log('\n🧪 Testing Frontend API Bridge...');
  
  const testData = JSON.stringify({
    message: 'Go long 45 ADA with 2x leverage',
    context: {},
    userWallet: {
      address: 'addr1q82j3cnhky8u0w4wa0ntsgeypraf24jxz5qr6wgwcy97u7t8pvpwk4ker5z2lmfsjlvx0y2tex68ahdwql9xkm9urxks9n2nl8',
      stakeAddress: 'stake1u9nskqht2mv36p90a5cf0kr8j99undr7mkhq0jntdj7pntgqfpmzy',
      balance: 98.19,
      walletType: 'vespr',
      handle: '$@misterexc6'
    }
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/agents/strike/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(testData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = require('http').request(options, (res) => {
      console.log(`📡 Frontend API status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const jsonData = JSON.parse(data);
            console.log('✅ Frontend API responded successfully!');
            if (jsonData.data && jsonData.data.response) {
              console.log('📝 Frontend response:', jsonData.data.response.substring(0, 200) + '...');
            }
            resolve(true);
          } else {
            console.log(`❌ Frontend API returned ${res.statusCode}`);
            console.log('📋 Response body:', data);
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Failed to parse frontend response:', error.message);
          console.log('📋 Raw response:', data.substring(0, 500) + '...');
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Frontend API request failed:', error.message);
      resolve(false);
    });

    req.setTimeout(30000, () => {
      console.log('❌ Frontend API request timed out');
      req.destroy();
      resolve(false);
    });

    req.write(testData);
    req.end();
  });
}

async function main() {
  console.log('🔍 Strike Agent Integration Test Suite');
  console.log('=====================================\n');
  
  const deployedAgentTest = await testDeployedStrikeAgent();
  const frontendAPITest = await testFrontendAPI();
  
  console.log('\n📊 Test Results:');
  console.log(`Deployed Strike Agent: ${deployedAgentTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend API Bridge: ${frontendAPITest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!deployedAgentTest) {
    console.log('\n💡 If deployed agent fails, check Mastra Cloud status and agent deployment.');
  }
  
  if (!frontendAPITest) {
    console.log('\n💡 If frontend API fails, make sure frontend is running on localhost:3000.');
  }
}

main().catch(console.error);
