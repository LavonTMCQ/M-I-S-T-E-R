#!/usr/bin/env node

/**
 * Security Test Script for MISTER API Endpoints
 * Tests authentication middleware and user filtering
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4113/api';

// Test data
const testWalletUser = {
  walletAddress: 'addr1qy267ne8rajf6qdx4r9y2ue6rd9fzn4af8thekjf5w92csqtjnzjg7j355nndjvaefaw5u98zcrx0kt2euvwer9asx5stz0t90',
  stakeAddress: 'stake1u9nskqht2mv36p90a5cf5kr8j99undr7mkhq0jntdj7pntgqfpmzy',
  walletType: 'eternl',
  balance: 1000,
  handle: '$testuser'
};

const testEmailUser = {
  email: 'test@example.com',
  userId: 'temp_user_1234567890_test'
};

let walletToken = null;
let emailToken = null;

/**
 * Test authentication for wallet user
 */
async function testWalletAuth() {
  console.log('\n🔐 Testing Wallet Authentication...');

  try {
    const response = await fetch(`${API_BASE}/auth/wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testWalletUser)
    });

    const data = await response.json();

    if (data.success && data.data.token) {
      walletToken = data.data.token;
      console.log('✅ Wallet authentication successful');
      console.log(`   Token: ${walletToken.substring(0, 20)}...`);
      console.log(`   User ID: ${data.data.userId}`);
      return true;
    } else {
      console.log('❌ Wallet authentication failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Wallet authentication error:', error.message);
    return false;
  }
}

/**
 * Test email authentication (mock)
 */
async function testEmailAuth() {
  console.log('\n📧 Testing Email Authentication...');

  // For email users, we simulate the token creation
  emailToken = `mock_token_${testEmailUser.userId}`;
  console.log('✅ Email authentication simulated');
  console.log(`   Token: ${emailToken.substring(0, 20)}...`);
  console.log(`   User ID: ${testEmailUser.userId}`);
  return true;
}

/**
 * Test secured endpoint access
 */
async function testSecuredEndpoint(endpoint, token, userType, shouldSucceed = true) {
  console.log(`\n🔍 Testing ${endpoint} with ${userType} token...`);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (shouldSucceed) {
      if (response.status === 200 && data.success) {
        console.log(`✅ ${userType} access successful`);
        return true;
      } else {
        console.log(`❌ ${userType} access failed:`, data.error);
        return false;
      }
    } else {
      if (response.status === 401 || response.status === 403) {
        console.log(`✅ ${userType} access correctly denied`);
        return true;
      } else {
        console.log(`❌ ${userType} access should have been denied but wasn't`);
        return false;
      }
    }
  } catch (error) {
    console.log(`❌ ${userType} endpoint test error:`, error.message);
    return false;
  }
}

/**
 * Test unauthorized access
 */
async function testUnauthorizedAccess(endpoint) {
  console.log(`\n🚫 Testing unauthorized access to ${endpoint}...`);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 401) {
      console.log('✅ Unauthorized access correctly denied');
      return true;
    } else {
      console.log('❌ Unauthorized access should have been denied');
      return false;
    }
  } catch (error) {
    console.log('❌ Unauthorized access test error:', error.message);
    return false;
  }
}

/**
 * Test cross-user access prevention
 */
async function testCrossUserAccess() {
  console.log('\n🔒 Testing cross-user access prevention...');

  if (!walletToken || !emailToken) {
    console.log('❌ Cannot test cross-user access - missing tokens');
    return false;
  }

  // Try to access wallet user's data with email token
  const walletEndpoint = `/wallets/managed/${testWalletUser.walletAddress}`;

  const result1 = await testSecuredEndpoint(walletEndpoint, emailToken, 'email', false);
  const result2 = await testSecuredEndpoint(walletEndpoint, walletToken, 'wallet', true);

  return result1 && result2;
}

/**
 * Main test runner
 */
async function runSecurityTests() {
  console.log('🧪 MISTER API Security Tests');
  console.log('=' .repeat(50));

  const results = [];

  // Test authentication
  results.push(await testWalletAuth());
  results.push(await testEmailAuth());

  if (!walletToken) {
    console.log('\n❌ Cannot continue tests without wallet token');
    return;
  }

  // Test secured endpoints
  results.push(await testSecuredEndpoint('/wallet/info', walletToken, 'wallet'));
  results.push(await testSecuredEndpoint('/wallet/managed', walletToken, 'wallet'));

  // Test unauthorized access
  results.push(await testUnauthorizedAccess('/wallet/info'));
  results.push(await testUnauthorizedAccess('/wallet/managed'));

  // Test cross-user access prevention
  results.push(await testCrossUserAccess());

  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log('\n📊 Test Results');
  console.log('=' .repeat(30));
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 All security tests passed!');
  } else {
    console.log('\n⚠️ Some security tests failed. Please review the implementation.');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runSecurityTests().catch(console.error);
}

module.exports = { runSecurityTests };