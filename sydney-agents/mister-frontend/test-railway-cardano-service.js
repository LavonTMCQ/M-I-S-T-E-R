#!/usr/bin/env node

/**
 * Test script for Railway-deployed Cardano Service
 * Verifies all endpoints are working with production deployment
 */

const RAILWAY_SERVICE_URL = 'https://friendly-reprieve-production.up.railway.app';
const LOCAL_SERVICE_URL = 'http://localhost:3001';

async function testEndpoint(url, endpoint, method = 'GET', body = null) {
  const fullUrl = `${url}${endpoint}`;
  console.log(`\n📍 Testing ${method} ${fullUrl}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(fullUrl);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      console.log('❌ Failed:', response.status, data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing Railway-deployed Cardano Service');
  console.log('='.repeat(50));
  
  // Test Railway deployment
  console.log('\n🌐 TESTING RAILWAY DEPLOYMENT');
  console.log('='.repeat(50));
  
  // 1. Health check
  await testEndpoint(RAILWAY_SERVICE_URL, '/health');
  
  // 2. Script address
  await testEndpoint(RAILWAY_SERVICE_URL, '/script-address');
  
  // 3. Network info (if endpoint exists)
  await testEndpoint(RAILWAY_SERVICE_URL, '/network-info');
  
  console.log('\n✨ Testing Complete!');
  console.log('\n📝 Summary:');
  console.log('- Railway Service URL:', RAILWAY_SERVICE_URL);
  console.log('- Update your .env.local with:');
  console.log(`  CARDANO_SERVICE_URL=${RAILWAY_SERVICE_URL}`);
  console.log(`  NEXT_PUBLIC_CARDANO_SERVICE_URL=${RAILWAY_SERVICE_URL}`);
  
  // Compare with local if running
  console.log('\n💻 Testing local service for comparison (if running)...');
  const localHealth = await testEndpoint(LOCAL_SERVICE_URL, '/health');
  if (localHealth.success) {
    console.log('✅ Local service is also running');
  } else {
    console.log('ℹ️ Local service not running (expected if using Railway)');
  }
}

// Run tests
runTests().catch(console.error);