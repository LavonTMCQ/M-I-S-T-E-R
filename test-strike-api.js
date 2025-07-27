#!/usr/bin/env node

/**
 * Test Strike Finance API Health
 * Quick test to see if the Strike Finance API is responding
 */

const https = require('https');

async function testStrikeAPI() {
  console.log('🧪 Testing Strike Finance API health...');
  
  const options = {
    hostname: 'app.strikefinance.org',
    port: 443,
    path: '/api/perpetuals/getOverallInfo',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Strike-Test/1.0'
    }
  };

  return new Promise((resolve, reject) => {
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
            console.log('✅ Strike Finance API is healthy!');
            console.log('📊 Market data received:', Object.keys(jsonData));
            resolve(true);
          } else {
            console.log(`❌ Strike Finance API returned ${res.statusCode}`);
            console.log('📋 Response body:', data);
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Failed to parse response:', error.message);
          console.log('📋 Raw response:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request failed:', error.message);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      console.log('❌ Request timed out');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function testOpenPosition() {
  console.log('\n🧪 Testing Strike Finance openPosition endpoint...');
  
  const testData = JSON.stringify({
    request: {
      address: "addr1qy8ac7qqy0vtulyl7wntmsxc6wex80gvcyjy3cxeqxrajnw9fq3k8pzptkrzn57v4d2hfyflkn6z2l9nllls87xs2xvqt9qfu4",
      asset: { policyId: "", assetName: "" },
      assetTicker: "ADA", // NEW REQUIRED FIELD
      collateralAmount: 50,
      leverage: 2,
      position: "Long"
      // Removed enteredPositionTime - not in latest API spec
    }
  });

  const options = {
    hostname: 'app.strikefinance.org',
    port: 443,
    path: '/api/perpetuals/openPosition',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Strike-Test/1.0',
      'Content-Length': Buffer.byteLength(testData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`📡 Response status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📋 Response body:', data);
        if (res.statusCode === 200) {
          console.log('✅ openPosition endpoint is working!');
          resolve(true);
        } else {
          console.log(`❌ openPosition returned ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ openPosition request failed:', error.message);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      console.log('❌ openPosition request timed out');
      req.destroy();
      resolve(false);
    });

    req.write(testData);
    req.end();
  });
}

async function main() {
  console.log('🔍 Strike Finance API Test Suite');
  console.log('================================\n');
  
  const healthCheck = await testStrikeAPI();
  const openPositionCheck = await testOpenPosition();
  
  console.log('\n📊 Test Results:');
  console.log(`Health Check: ${healthCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Open Position: ${openPositionCheck ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!healthCheck || !openPositionCheck) {
    console.log('\n💡 If tests fail, the Strike Finance API might be down or the request format might have changed.');
  }
}

main().catch(console.error);
