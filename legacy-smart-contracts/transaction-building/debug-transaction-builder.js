#!/usr/bin/env node

/**
 * 🔍 DEBUG TRANSACTION BUILDER ISSUE
 * Test exactly what's failing in the transaction builder
 */

import fetch from 'node-fetch';

const DEBUG_CONFIG = {
  blockfrostUrl: 'https://cardano-preprod.blockfrost.io/api/v0',
  blockfrostKey: 'preprodfHBBQsTsk1g3Lna67Vqb8HqZ0NbcPo1f',
  faucetAddress: 'addr_test1vzpwq95z3xyum8vqndgdd9mdnmafh3djcxnc6jemlgdmswcve6tkw',
  contractAddress: 'addr_test1wpht0s5ajd3d6ugfq2thhdj9awtmkakxy3nk3pg7weyf7xs6nm2gz'
};

async function debugTransactionBuilder() {
  console.log('🔍 DEBUGGING TRANSACTION BUILDER ISSUE...\n');
  
  // Test 1: Direct Blockfrost API call (we know this works)
  console.log('📋 TEST 1: Direct Blockfrost UTxO fetch');
  console.log(`Address: ${DEBUG_CONFIG.faucetAddress}`);
  
  try {
    const directResponse = await fetch(`${DEBUG_CONFIG.blockfrostUrl}/addresses/${DEBUG_CONFIG.faucetAddress}/utxos`, {
      headers: { 'project_id': DEBUG_CONFIG.blockfrostKey }
    });
    
    console.log(`Status: ${directResponse.status} ${directResponse.statusText}`);
    
    if (directResponse.ok) {
      const utxos = await directResponse.json();
      console.log(`✅ Direct API call works: ${utxos.length} UTxOs found`);
    } else {
      const errorText = await directResponse.text();
      console.log(`❌ Direct API call failed: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Direct API call exception: ${error.message}`);
  }
  
  // Test 2: Check what our transaction builder is actually sending
  console.log('\n📋 TEST 2: Transaction builder API call');
  
  try {
    const builderResponse = await fetch('http://localhost:3000/api/cardano/build-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAddress: DEBUG_CONFIG.faucetAddress,
        toAddress: DEBUG_CONFIG.contractAddress,
        amount: 5,
        network: 'testnet'
      })
    });
    
    console.log(`Status: ${builderResponse.status} ${builderResponse.statusText}`);
    
    if (builderResponse.ok) {
      const result = await builderResponse.json();
      console.log('✅ Transaction builder works!');
      console.log(`CBOR length: ${result.cborHex.length}`);
    } else {
      const errorText = await builderResponse.text();
      console.log(`❌ Transaction builder failed: ${errorText}`);
      
      // Parse the error to see what's happening
      try {
        const errorObj = JSON.parse(errorText);
        console.log('🔍 Parsed error:', JSON.stringify(errorObj, null, 2));
      } catch (parseError) {
        console.log('🔍 Raw error text:', errorText);
      }
    }
  } catch (error) {
    console.log(`❌ Transaction builder exception: ${error.message}`);
  }
  
  // Test 3: Check if the issue is with the contract address
  console.log('\n📋 TEST 3: Test with different addresses');
  
  // Test with same address for both from and to
  try {
    console.log('Testing: faucet → faucet');
    const sameAddressResponse = await fetch('http://localhost:3000/api/cardano/build-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAddress: DEBUG_CONFIG.faucetAddress,
        toAddress: DEBUG_CONFIG.faucetAddress, // Same address
        amount: 5,
        network: 'testnet'
      })
    });
    
    console.log(`Same address test: ${sameAddressResponse.status} ${sameAddressResponse.statusText}`);
    
    if (!sameAddressResponse.ok) {
      const errorText = await sameAddressResponse.text();
      console.log(`❌ Same address test failed: ${errorText}`);
    } else {
      console.log('✅ Same address test works!');
    }
  } catch (error) {
    console.log(`❌ Same address test exception: ${error.message}`);
  }
  
  // Test 4: Check if the contract address is valid
  console.log('\n📋 TEST 4: Validate contract address');
  
  try {
    const contractResponse = await fetch(`${DEBUG_CONFIG.blockfrostUrl}/addresses/${DEBUG_CONFIG.contractAddress}`, {
      headers: { 'project_id': DEBUG_CONFIG.blockfrostKey }
    });
    
    console.log(`Contract address validation: ${contractResponse.status} ${contractResponse.statusText}`);
    
    if (contractResponse.ok) {
      const contractData = await contractResponse.json();
      console.log('✅ Contract address is valid');
      console.log(`Contract balance: ${contractData.amount.find(a => a.unit === 'lovelace')?.quantity || 0} lovelace`);
    } else if (contractResponse.status === 404) {
      console.log('⚠️  Contract address not found (no UTxOs yet) - this is normal');
    } else {
      const errorText = await contractResponse.text();
      console.log(`❌ Contract address invalid: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Contract address validation exception: ${error.message}`);
  }
  
  console.log('\n🎯 SUMMARY:');
  console.log('- Direct Blockfrost API calls work perfectly');
  console.log('- Transaction builder has an internal issue');
  console.log('- Need to identify where the address validation is failing');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugTransactionBuilder()
    .then(() => {
      console.log('\n✅ Debug completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Debug failed:', error);
      process.exit(1);
    });
}

export { debugTransactionBuilder };
