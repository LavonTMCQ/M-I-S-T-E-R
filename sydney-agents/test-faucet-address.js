#!/usr/bin/env node

/**
 * 🧪 TEST FAUCET ADDRESS DIRECTLY
 * Test if we can get UTxOs from the faucet address
 */

import fetch from 'node-fetch';

const FAUCET_CONFIG = {
  blockfrostUrl: 'https://cardano-preprod.blockfrost.io/api/v0',
  blockfrostKey: 'preprodfHBBQsTsk1g3Lna67Vqb8HqZ0NbcPo1f',
  faucetAddress: 'addr_test1vzpwq95z3xyum8vqndgdd9mdnmafh3djcxnc6jemlgdmswcve6tkw'
};

async function testFaucetAddress() {
  console.log('🧪 TESTING FAUCET ADDRESS DIRECTLY...');
  console.log(`📍 Address: ${FAUCET_CONFIG.faucetAddress}`);
  
  try {
    // Test 1: Get address info
    console.log('\n📋 TEST 1: Address Info');
    const addressResponse = await fetch(`${FAUCET_CONFIG.blockfrostUrl}/addresses/${FAUCET_CONFIG.faucetAddress}`, {
      headers: { 'project_id': FAUCET_CONFIG.blockfrostKey }
    });
    
    console.log(`Status: ${addressResponse.status} ${addressResponse.statusText}`);
    
    if (addressResponse.ok) {
      const addressData = await addressResponse.json();
      console.log('✅ Address Info:', JSON.stringify(addressData, null, 2));
    } else {
      const errorText = await addressResponse.text();
      console.log('❌ Address Error:', errorText);
    }
    
    // Test 2: Get UTxOs
    console.log('\n📋 TEST 2: UTxOs');
    const utxosResponse = await fetch(`${FAUCET_CONFIG.blockfrostUrl}/addresses/${FAUCET_CONFIG.faucetAddress}/utxos`, {
      headers: { 'project_id': FAUCET_CONFIG.blockfrostKey }
    });
    
    console.log(`Status: ${utxosResponse.status} ${utxosResponse.statusText}`);
    
    if (utxosResponse.ok) {
      const utxosData = await utxosResponse.json();
      console.log('✅ UTxOs Count:', utxosData.length);
      console.log('✅ First few UTxOs:', JSON.stringify(utxosData.slice(0, 3), null, 2));
      
      // Analyze UTxOs
      const adaUtxos = utxosData.filter(utxo => 
        utxo.amount.length === 1 && utxo.amount[0].unit === 'lovelace'
      );
      
      console.log(`💰 ADA-only UTxOs: ${adaUtxos.length} out of ${utxosData.length}`);
      
      if (adaUtxos.length > 0) {
        const totalAda = adaUtxos.reduce((sum, utxo) => 
          sum + parseInt(utxo.amount[0].quantity), 0
        ) / 1000000;
        console.log(`💰 Total ADA in ADA-only UTxOs: ${totalAda} tADA`);
      }
      
    } else {
      const errorText = await utxosResponse.text();
      console.log('❌ UTxOs Error:', errorText);
    }
    
    // Test 3: Try to build a simple transaction
    console.log('\n📋 TEST 3: Transaction Building');
    const txResponse = await fetch('http://localhost:3000/api/cardano/build-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAddress: FAUCET_CONFIG.faucetAddress,
        toAddress: 'addr_test1wpht0s5ajd3d6ugfq2thhdj9awtmkakxy3nk3pg7weyf7xs6nm2gz',
        amount: 5,
        network: 'testnet'
      })
    });
    
    console.log(`Transaction Status: ${txResponse.status} ${txResponse.statusText}`);
    
    if (txResponse.ok) {
      const txData = await txResponse.json();
      console.log('✅ Transaction built successfully!');
      console.log(`🔍 CBOR length: ${txData.cborHex.length} characters`);
    } else {
      const errorText = await txResponse.text();
      console.log('❌ Transaction Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testFaucetAddress()
    .then(() => {
      console.log('\n✅ Faucet address test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testFaucetAddress };
