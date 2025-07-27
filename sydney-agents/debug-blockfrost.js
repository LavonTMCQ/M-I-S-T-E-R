#!/usr/bin/env node

/**
 * 🔍 DEBUG BLOCKFROST API RESPONSES
 * Check what Blockfrost actually returns for testnet
 */

import fetch from 'node-fetch';

const TESTNET_CONFIG = {
  blockfrostUrl: 'https://cardano-testnet.blockfrost.io/api/v0',
  blockfrostKey: 'preprodKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu',
  testAddress: 'addr_test1qr5v2w8xkjy4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j',
  contractAddress: 'addr_test1wpht0s5ajd3d6ugfq2thhdj9awtmkakxy3nk3pg7weyf7xs6nm2gz'
};

async function debugBlockfrostAPI() {
  console.log('🔍 DEBUGGING BLOCKFROST TESTNET API...\n');
  
  // Test 1: Check address info
  console.log('📋 TEST 1: Address Info');
  console.log(`Address: ${TESTNET_CONFIG.testAddress}`);
  
  try {
    const response = await fetch(`${TESTNET_CONFIG.blockfrostUrl}/addresses/${TESTNET_CONFIG.testAddress}`, {
      headers: { 'project_id': TESTNET_CONFIG.blockfrostKey }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }
  
  // Test 2: Check UTxOs
  console.log('\n📋 TEST 2: Address UTxOs');
  console.log(`Address: ${TESTNET_CONFIG.testAddress}`);
  
  try {
    const response = await fetch(`${TESTNET_CONFIG.blockfrostUrl}/addresses/${TESTNET_CONFIG.testAddress}/utxos`, {
      headers: { 'project_id': TESTNET_CONFIG.blockfrostKey }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ UTxOs Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }
  
  // Test 3: Check contract address
  console.log('\n📋 TEST 3: Contract Address');
  console.log(`Contract: ${TESTNET_CONFIG.contractAddress}`);
  
  try {
    const response = await fetch(`${TESTNET_CONFIG.blockfrostUrl}/addresses/${TESTNET_CONFIG.contractAddress}`, {
      headers: { 'project_id': TESTNET_CONFIG.blockfrostKey }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Contract Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }
  
  // Test 4: Check a known testnet address with funds
  console.log('\n📋 TEST 4: Known Testnet Address (Faucet)');
  const faucetAddress = 'addr_test1vzpwq95z3xyum8vqndgdd9mdnmafh3djcxnc6jemlgdmswcve6tkw';
  console.log(`Faucet: ${faucetAddress}`);
  
  try {
    const response = await fetch(`${TESTNET_CONFIG.blockfrostUrl}/addresses/${faucetAddress}`, {
      headers: { 'project_id': TESTNET_CONFIG.blockfrostKey }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Faucet Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }
  
  console.log('\n🎯 SUMMARY:');
  console.log('- Testing Blockfrost testnet API responses');
  console.log('- Checking address and UTxO formats');
  console.log('- This will help fix transaction building');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugBlockfrostAPI()
    .then(() => {
      console.log('\n✅ Debug completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Debug failed:', error);
      process.exit(1);
    });
}

export { debugBlockfrostAPI };
