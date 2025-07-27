#!/usr/bin/env node

/**
 * Debug Strike Finance Positions API
 * Tests different approaches to get positions data
 */

const testWalletAddress = 'addr1qxtkdjl87894tg6juz20jzyjqy3uyn02pr9xtq7mlh0gm2ss5dpkcny95dktp5qmyyrx82t68sge4m94qwxyrfr8f86qh5unyc';

async function testStrikeFinanceAPI() {
  console.log('🔍 Testing Strike Finance API for positions...');
  console.log('📍 Wallet:', testWalletAddress.substring(0, 20) + '...');
  console.log('=' .repeat(80));

  // Test 1: Original endpoint
  await testEndpoint(
    'Test 1: Original getPositions endpoint',
    `https://app.strikefinance.org/api/perpetuals/getPositions?address=${testWalletAddress}`,
    {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'MISTER-Trading-Platform/1.0',
      'Origin': 'https://app.strikefinance.org',
      'Referer': 'https://app.strikefinance.org/',
    }
  );

  // Test 2: Try without query parameter (POST instead)
  await testEndpoint(
    'Test 2: POST to getPositions',
    'https://app.strikefinance.org/api/perpetuals/getPositions',
    {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'MISTER-Trading-Platform/1.0',
      'Origin': 'https://app.strikefinance.org',
      'Referer': 'https://app.strikefinance.org/',
    },
    'POST',
    { address: testWalletAddress }
  );

  // Test 3: Try different endpoint path
  await testEndpoint(
    'Test 3: Alternative positions endpoint',
    `https://app.strikefinance.org/api/positions?address=${testWalletAddress}`,
    {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'MISTER-Trading-Platform/1.0',
    }
  );

  // Test 4: Try with minimal headers
  await testEndpoint(
    'Test 4: Minimal headers',
    `https://app.strikefinance.org/api/perpetuals/getPositions?address=${testWalletAddress}`,
    {
      'User-Agent': 'Mozilla/5.0 (compatible; MISTER/1.0)',
    }
  );

  // Test 5: Try the health endpoint to see if API is accessible
  await testEndpoint(
    'Test 5: Health endpoint',
    'https://app.strikefinance.org/api/health',
    {
      'Accept': 'application/json',
    }
  );

  // Test 6: Try root API endpoint
  await testEndpoint(
    'Test 6: Root API endpoint',
    'https://app.strikefinance.org/api',
    {
      'Accept': 'application/json',
    }
  );
}

async function testEndpoint(testName, url, headers, method = 'GET', body = null) {
  console.log(`\n🧪 ${testName}`);
  console.log(`📡 ${method} ${url}`);
  console.log(`📋 Headers:`, JSON.stringify(headers, null, 2));
  
  if (body) {
    console.log(`📦 Body:`, JSON.stringify(body, null, 2));
  }

  try {
    const options = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));

    const contentType = response.headers.get('content-type');
    console.log(`📄 Content-Type: ${contentType}`);

    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await response.json();
        console.log(`✅ JSON Response:`, JSON.stringify(data, null, 2));
      } catch (jsonError) {
        console.log(`❌ JSON Parse Error:`, jsonError.message);
        const text = await response.text();
        console.log(`📄 Raw Response (first 500 chars):`, text.substring(0, 500));
      }
    } else {
      const text = await response.text();
      console.log(`📄 Text Response (first 500 chars):`, text.substring(0, 500));
      
      // Check if it's HTML
      if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
        console.log(`🌐 Response is HTML - likely an error page or redirect`);
      }
    }

  } catch (error) {
    console.log(`❌ Request Error:`, error.message);
  }

  console.log('-' .repeat(80));
}

// Run the tests
testStrikeFinanceAPI()
  .then(() => {
    console.log('\n🎯 Strike Finance API Testing Complete!');
    console.log('📊 Check the results above to identify the correct API usage.');
  })
  .catch((error) => {
    console.error('❌ Testing failed:', error);
  });
