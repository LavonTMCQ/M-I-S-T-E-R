#!/usr/bin/env node

/**
 * 🧪 SIMPLE TESTNET TESTING
 * Test with a known testnet address and manual wallet interaction
 */

import fetch from 'node-fetch';

// 🧪 TESTNET CONFIGURATION
const TESTNET_CONFIG = {
  // Known testnet addresses for testing (you can generate your own)
  testAddress: 'addr_test1qr5v2w8xkjy4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j',
  contractAddress: 'addr_test1wpht0s5ajd3d6ugfq2thhdj9awtmkakxy3nk3pg7weyf7xs6nm2gz',
  blockfrostUrl: 'https://cardano-testnet.blockfrost.io/api/v0',
  blockfrostKey: 'preprodKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu',
  faucetUrl: 'https://docs.cardano.org/cardano-testnet/tools/faucet/'
};

// 💰 CHECK TESTNET BALANCE
async function checkBalance(address) {
  console.log(`💰 CHECKING BALANCE: ${address}`);
  
  try {
    const response = await fetch(`${TESTNET_CONFIG.blockfrostUrl}/addresses/${address}`, {
      headers: { 'project_id': TESTNET_CONFIG.blockfrostKey }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('💰 Balance: 0 ADA (address not on blockchain yet)');
        return { lovelace: 0, ada: 0 };
      }
      throw new Error(`Blockfrost error: ${response.status}`);
    }
    
    const data = await response.json();
    const lovelace = parseInt(data.amount.find(a => a.unit === 'lovelace')?.quantity || '0');
    const ada = lovelace / 1000000;
    
    console.log(`💰 Balance: ${ada} ADA`);
    return { lovelace, ada };
    
  } catch (error) {
    console.error('❌ Balance check failed:', error.message);
    return { lovelace: 0, ada: 0 };
  }
}

// 🏦 TEST AGENT VAULT CREATION CBOR
async function testVaultCreationCBOR() {
  console.log('\n🏦 TESTING AGENT VAULT CREATION CBOR...');
  
  const vaultDatum = {
    constructor: 0,
    fields: [
      { bytes: "34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d" },
      { constructor: 1, fields: [] },
      { int: "5000000" },
      { int: "10" }
    ]
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/cardano/build-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAddress: TESTNET_CONFIG.testAddress,
        toAddress: TESTNET_CONFIG.contractAddress,
        amount: 5,
        vaultDatum: vaultDatum
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Build failed: ${error}`);
    }
    
    const { cborHex } = await response.json();
    console.log('✅ Agent Vault creation CBOR built successfully');
    console.log(`🔍 CBOR length: ${cborHex.length} characters`);
    console.log(`📋 CBOR: ${cborHex}`);
    
    return cborHex;
    
  } catch (error) {
    console.error('❌ Vault creation CBOR failed:', error.message);
    throw error;
  }
}

// 💸 TEST WITHDRAWAL CBOR
async function testWithdrawalCBOR() {
  console.log('\n💸 TESTING WITHDRAWAL CBOR...');
  
  try {
    const response = await fetch('http://localhost:3000/api/cardano/build-withdrawal-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress: TESTNET_CONFIG.contractAddress,
        fromAddress: TESTNET_CONFIG.testAddress,
        toAddress: TESTNET_CONFIG.testAddress,
        amount: 3000000
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Build failed: ${error}`);
    }
    
    const { cborHex } = await response.json();
    console.log('✅ Withdrawal CBOR built successfully');
    console.log(`🔍 CBOR length: ${cborHex.length} characters`);
    console.log(`📋 CBOR: ${cborHex}`);
    
    return cborHex;
    
  } catch (error) {
    console.error('❌ Withdrawal CBOR failed:', error.message);
    throw error;
  }
}

// 🔍 CHECK CONTRACT BALANCE
async function checkContractBalance() {
  console.log('\n🔍 CHECKING CONTRACT BALANCE...');
  return await checkBalance(TESTNET_CONFIG.contractAddress);
}

// 🚀 RUN COMPLETE TEST
async function runCompleteTest() {
  console.log('🚀 STARTING SIMPLE TESTNET TEST...\n');
  
  try {
    console.log('📍 TEST CONFIGURATION:');
    console.log(`Test Address: ${TESTNET_CONFIG.testAddress}`);
    console.log(`Contract Address: ${TESTNET_CONFIG.contractAddress}`);
    console.log(`Faucet URL: ${TESTNET_CONFIG.faucetUrl}\n`);
    
    // Step 1: Check test address balance
    console.log('📋 STEP 1: Check test address balance');
    const testBalance = await checkBalance(TESTNET_CONFIG.testAddress);
    
    // Step 2: Check contract balance
    console.log('\n📋 STEP 2: Check contract balance');
    const contractBalance = await checkContractBalance();
    
    // Step 3: Test vault creation CBOR
    console.log('\n📋 STEP 3: Test vault creation CBOR');
    const creationCbor = await testVaultCreationCBOR();
    
    // Step 4: Test withdrawal CBOR
    console.log('\n📋 STEP 4: Test withdrawal CBOR');
    const withdrawalCbor = await testWithdrawalCBOR();
    
    console.log('\n🎉 ALL TESTS COMPLETED!');
    console.log('\n📊 RESULTS:');
    console.log(`✅ Test address balance: ${testBalance.ada} ADA`);
    console.log(`✅ Contract balance: ${contractBalance.ada} ADA`);
    console.log(`✅ Creation CBOR: ${creationCbor.length} chars`);
    console.log(`✅ Withdrawal CBOR: ${withdrawalCbor.length} chars`);
    
    console.log('\n📋 MANUAL TESTING STEPS:');
    console.log('1. Get testnet ADA from faucet for test address');
    console.log('2. Import test address into a testnet wallet (Eternl, Nami, etc.)');
    console.log('3. Sign and submit the creation CBOR');
    console.log('4. Wait for confirmation');
    console.log('5. Sign and submit the withdrawal CBOR');
    console.log('6. Verify funds moved correctly');
    
    return {
      testBalance,
      contractBalance,
      creationCbor,
      withdrawalCbor
    };
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    throw error;
  }
}

// 🎯 GUIDED TESTING FLOW
async function guidedTest() {
  console.log('🎯 GUIDED TESTNET TESTING FLOW\n');
  
  console.log('This will guide you through complete testnet testing:');
  console.log('1. Generate transaction CBORs');
  console.log('2. Provide manual signing instructions');
  console.log('3. Verify results on testnet\n');
  
  console.log('Press Enter to continue...');
  await waitForEnter();
  
  const results = await runCompleteTest();
  
  console.log('\n🎯 NEXT STEPS FOR MANUAL TESTING:');
  console.log('\n1. GET TESTNET ADA:');
  console.log(`   Visit: ${TESTNET_CONFIG.faucetUrl}`);
  console.log(`   Address: ${TESTNET_CONFIG.testAddress}`);
  console.log('   Amount: 1000 tADA');
  
  console.log('\n2. IMPORT TO WALLET:');
  console.log('   - Use Eternl, Nami, or Typhon wallet');
  console.log('   - Switch to testnet mode');
  console.log('   - Import using private key or mnemonic');
  
  console.log('\n3. SIGN CREATION TRANSACTION:');
  console.log(`   CBOR: ${results.creationCbor}`);
  
  console.log('\n4. SIGN WITHDRAWAL TRANSACTION:');
  console.log(`   CBOR: ${results.withdrawalCbor}`);
  
  console.log('\n5. VERIFY ON BLOCKCHAIN:');
  console.log('   Check balances changed correctly');
  console.log('   Confirm transactions on testnet explorer');
  
  return results;
}

// Helper function
function waitForEnter() {
  return new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'guided';
  
  if (mode === 'guided') {
    guidedTest()
      .then(() => {
        console.log('\n✅ Guided test completed');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Guided test failed:', error);
        process.exit(1);
      });
  } else {
    runCompleteTest()
      .then(() => {
        console.log('\n✅ Test completed');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
      });
  }
}

export { runCompleteTest, guidedTest, checkBalance };
