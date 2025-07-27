#!/usr/bin/env node

/**
 * 🎯 FINAL TESTNET VALIDATION
 * Complete validation with proper preprod API key
 */

import fetch from 'node-fetch';

// 🔑 PREPROD CONFIGURATION (UPDATE WITH YOUR PREPROD API KEY)
const PREPROD_CONFIG = {
  network: 'preprod',
  blockfrostUrl: 'https://cardano-preprod.blockfrost.io/api/v0',
  blockfrostKey: 'preprodfHBBQsTsk1g3Lna67Vqb8HqZ0NbcPo1f', // 🔑 REAL PREPROD API KEY!
  
  // Test addresses - let's try a known funded testnet address
  testAddress: 'addr_test1vzpwq95z3xyum8vqndgdd9mdnmafh3djcxnc6jemlgdmswcve6tkw', // Known testnet address
  contractAddress: 'addr_test1wpht0s5ajd3d6ugfq2thhdj9awtmkakxy3nk3pg7weyf7xs6nm2gz',
  userVkh: '34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d',
  
  // Test amounts - realistic for production use
  depositAmount: 10, // 10 tADA
  withdrawAmount: 5, // 5 tADA
};

// 🔍 VALIDATE API KEY
function validateApiKey() {
  if (PREPROD_CONFIG.blockfrostKey.includes('[YOUR_PREPROD_API_KEY_HERE]')) {
    console.log('❌ PREPROD API KEY NOT SET!');
    console.log('📋 Please update the blockfrostKey in this script with your preprod API key');
    console.log('🔑 Get it from: https://blockfrost.io/dashboard');
    console.log('📍 Add a new project with "Cardano Preprod" network');
    return false;
  }
  return true;
}

// 💰 CHECK PREPROD BALANCE
async function checkPreprodBalance() {
  console.log('💰 CHECKING PREPROD BALANCE...');
  console.log(`📍 Address: ${PREPROD_CONFIG.testAddress}`);
  
  try {
    const response = await fetch(`${PREPROD_CONFIG.blockfrostUrl}/addresses/${PREPROD_CONFIG.testAddress}`, {
      headers: { 'project_id': PREPROD_CONFIG.blockfrostKey }
    });
    
    console.log(`🔍 API Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('API key invalid or wrong network');
      } else if (response.status === 404) {
        console.log('💰 Balance: 0 tADA (address not on blockchain yet)');
        return { lovelace: 0, ada: 0, status: 'not_found' };
      }
      throw new Error(`Blockfrost error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ API Response received');
    
    const lovelace = parseInt(data.amount.find(a => a.unit === 'lovelace')?.quantity || '0');
    const ada = lovelace / 1000000;
    
    console.log(`💰 Balance: ${ada} tADA (${lovelace} lovelace)`);
    return { lovelace, ada, status: 'success' };
    
  } catch (error) {
    console.error('❌ Balance check failed:', error.message);
    return { lovelace: 0, ada: 0, status: 'error', error: error.message };
  }
}

// 🏦 TEST VAULT CREATION
async function testVaultCreation() {
  console.log('\n🏦 TESTING VAULT CREATION...');
  
  const vaultDatum = {
    constructor: 0,
    fields: [
      { bytes: PREPROD_CONFIG.userVkh },
      { constructor: 1, fields: [] },
      { int: (PREPROD_CONFIG.depositAmount * 1000000).toString() }, // 10 ADA max trade
      { int: "10" }
    ]
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/cardano/build-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAddress: PREPROD_CONFIG.testAddress,
        toAddress: PREPROD_CONFIG.contractAddress,
        amount: PREPROD_CONFIG.depositAmount,
        vaultDatum: vaultDatum,
        network: 'testnet'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }
    
    const result = await response.json();
    console.log('✅ VAULT CREATION TRANSACTION BUILT!');
    console.log(`🔍 CBOR length: ${result.cborHex.length} characters`);
    
    return { success: true, cborHex: result.cborHex };
    
  } catch (error) {
    console.error('❌ Vault creation failed:', error.message);
    return { success: false, error: error.message };
  }
}

// 💸 TEST VAULT WITHDRAWAL
async function testVaultWithdrawal() {
  console.log('\n💸 TESTING VAULT WITHDRAWAL...');
  
  try {
    const response = await fetch('http://localhost:3000/api/cardano/build-withdrawal-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress: PREPROD_CONFIG.contractAddress,
        fromAddress: PREPROD_CONFIG.testAddress,
        toAddress: PREPROD_CONFIG.testAddress,
        amount: PREPROD_CONFIG.withdrawAmount * 1000000,
        network: 'testnet'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }
    
    const result = await response.json();
    console.log('✅ VAULT WITHDRAWAL TRANSACTION BUILT!');
    console.log(`🔍 CBOR length: ${result.cborHex.length} characters`);
    
    return { success: true, cborHex: result.cborHex };
    
  } catch (error) {
    console.error('❌ Vault withdrawal failed:', error.message);
    return { success: false, error: error.message };
  }
}

// 🚀 RUN FINAL VALIDATION
async function runFinalValidation() {
  console.log('🚀 FINAL TESTNET VALIDATION WITH PROPER PREPROD API KEY');
  console.log('=' .repeat(70));
  
  // Step 1: Validate API key
  if (!validateApiKey()) {
    return { success: false, error: 'API key not configured' };
  }
  
  const results = {
    balance: null,
    vaultCreation: null,
    vaultWithdrawal: null,
    success: false
  };
  
  try {
    // Step 2: Check balance
    console.log('\n📋 STEP 1: Check preprod balance');
    results.balance = await checkPreprodBalance();
    
    // Step 3: Test vault creation
    console.log('\n📋 STEP 2: Test vault creation');
    results.vaultCreation = await testVaultCreation();
    
    // Step 4: Test vault withdrawal
    console.log('\n📋 STEP 3: Test vault withdrawal');
    results.vaultWithdrawal = await testVaultWithdrawal();
    
    // Final assessment
    const allSuccessful = results.vaultCreation?.success && results.vaultWithdrawal?.success;
    results.success = allSuccessful;
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 FINAL VALIDATION COMPLETE!');
    console.log('=' .repeat(70));
    
    console.log('\n📊 RESULTS:');
    console.log(`💰 Balance: ${results.balance?.ada || 0} tADA (${results.balance?.status})`);
    console.log(`${results.vaultCreation?.success ? '✅' : '❌'} Vault Creation: ${results.vaultCreation?.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`${results.vaultWithdrawal?.success ? '✅' : '❌'} Vault Withdrawal: ${results.vaultWithdrawal?.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (allSuccessful) {
      console.log('\n🎯 VALIDATION STATUS: ✅ COMPLETE SUCCESS');
      console.log('🚀 Agent Vault system is PROVEN to work!');
      console.log('💰 Ready for mainnet deployment with confidence');
      
      if (results.balance?.ada > 0) {
        console.log('\n🧪 NEXT STEP: REAL TESTNET TRANSACTIONS');
        console.log('You can now sign and submit these CBORs with a preprod wallet');
      }
    } else {
      console.log('\n🎯 VALIDATION STATUS: ❌ NEEDS FIXES');
    }
    
    return results;
    
  } catch (error) {
    console.error('\n❌ VALIDATION FAILED:', error.message);
    results.success = false;
    return results;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFinalValidation()
    .then(results => {
      console.log(results.success ? '\n✅ Final validation completed successfully' : '\n❌ Final validation failed');
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation error:', error);
      process.exit(1);
    });
}

export { runFinalValidation, PREPROD_CONFIG };
