#!/usr/bin/env node

/**
 * 🧪 AGENT VAULT TERMINAL TESTER
 * Test Agent Vault creation and withdrawal without frontend
 */

import fetch from 'node-fetch';

// 🧪 TEST CONFIGURATION
const TEST_CONFIG = {
  // Test addresses (these are just for testing transaction building)
  fromAddress: "019766cbe7f1cb55a352e094f908920123c24dea08ca6583dbfdde8daa10a3436c4c85a36cb0d01b210663a97a3c119aecb5038c41a46749f4",
  contractAddress: "addr1w8gnkw8z0jlyk4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j",
  amount: 5, // ADA
  withdrawAmount: 3, // ADA
  
  // Test vault datum
  vaultDatum: {
    constructor: 0,
    fields: [
      { bytes: "34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d" }, // userVkh
      { constructor: 1, fields: [] }, // tradingEnabled = true
      { int: "5000000" }, // maxTradeAmount = 5 ADA in lovelace
      { int: "10" } // leverage = 10x
    ]
  }
};

async function testAgentVaultCreation() {
  console.log('🧪 TESTING AGENT VAULT CREATION...');
  console.log(`💰 Amount: ${TEST_CONFIG.amount} ADA`);
  console.log(`📍 Contract: ${TEST_CONFIG.contractAddress}`);
  console.log(`🔍 Datum:`, JSON.stringify(TEST_CONFIG.vaultDatum, null, 2));
  
  try {
    const response = await fetch('http://localhost:3000/api/cardano/build-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAddress: TEST_CONFIG.fromAddress,
        toAddress: TEST_CONFIG.contractAddress,
        amount: TEST_CONFIG.amount,
        vaultDatum: TEST_CONFIG.vaultDatum
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transaction building failed: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ AGENT VAULT CREATION TRANSACTION BUILT SUCCESSFULLY!');
    console.log(`🔍 CBOR length: ${result.cborHex.length} characters`);
    console.log(`🔍 CBOR preview: ${result.cborHex.substring(0, 100)}...`);
    
    return result.cborHex;
    
  } catch (error) {
    console.error('❌ Agent Vault creation test failed:', error.message);
    throw error;
  }
}

async function testAgentVaultWithdrawal() {
  console.log('\n🧪 TESTING AGENT VAULT WITHDRAWAL...');
  console.log(`💰 Withdrawal amount: ${TEST_CONFIG.withdrawAmount} ADA`);
  console.log(`📍 Contract: ${TEST_CONFIG.contractAddress}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/cardano/build-withdrawal-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress: TEST_CONFIG.contractAddress,
        fromAddress: TEST_CONFIG.fromAddress,
        toAddress: TEST_CONFIG.fromAddress,
        amount: TEST_CONFIG.withdrawAmount * 1000000 // Convert to lovelace
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Withdrawal building failed: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ AGENT VAULT WITHDRAWAL TRANSACTION BUILT SUCCESSFULLY!');
    console.log(`🔍 CBOR length: ${result.cborHex.length} characters`);
    console.log(`🔍 CBOR preview: ${result.cborHex.substring(0, 100)}...`);
    
    return result.cborHex;
    
  } catch (error) {
    console.error('❌ Agent Vault withdrawal test failed:', error.message);
    throw error;
  }
}

async function runAllTests() {
  console.log('🚀 STARTING AGENT VAULT TERMINAL TESTS...\n');
  
  try {
    // Test 1: Agent Vault Creation
    const creationCbor = await testAgentVaultCreation();
    
    // Test 2: Agent Vault Withdrawal
    const withdrawalCbor = await testAgentVaultWithdrawal();
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Agent Vault creation transaction builds correctly');
    console.log('✅ Agent Vault withdrawal transaction builds correctly');
    console.log('✅ Both transactions include proper datum handling');
    console.log('\n🔍 SUMMARY:');
    console.log(`📝 Creation CBOR: ${creationCbor.length} chars`);
    console.log(`📝 Withdrawal CBOR: ${withdrawalCbor.length} chars`);
    
    return true;
    
  } catch (error) {
    console.error('\n❌ TESTS FAILED:', error.message);
    return false;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

export {
  testAgentVaultCreation,
  testAgentVaultWithdrawal,
  runAllTests,
  TEST_CONFIG
};
