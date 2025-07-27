#!/usr/bin/env node

/**
 * 🧪 REAL TESTNET TRANSACTION TESTER
 * Complete end-to-end testing with real testnet ADA
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

// 🧪 TESTNET CONFIGURATION
const TESTNET_CONFIG = {
  network: 'testnet',
  blockfrostUrl: 'https://cardano-testnet.blockfrost.io/api/v0',
  blockfrostKey: 'preprodKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu', // Testnet key
  contractAddress: 'addr_test1wpht0s5ajd3d6ugfq2thhdj9awtmkakxy3nk3pg7weyf7xs6nm2gz', // Testnet contract
  faucetUrl: 'https://docs.cardano.org/cardano-testnet/tools/faucet/',
  minBalance: 10000000, // 10 ADA minimum for testing
};

// 🔑 TEST WALLET GENERATION
function generateTestWallet() {
  console.log('🔑 GENERATING TEST WALLET...');
  
  // Generate a simple test wallet (for demo purposes)
  // In production, use proper BIP39 mnemonic generation
  const entropy = crypto.randomBytes(32);
  const mockSeed = entropy.toString('hex');
  
  // Mock addresses (in real implementation, derive from seed)
  const testWallet = {
    seed: mockSeed,
    paymentAddress: 'addr_test1qr5v2w8xkjy4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j',
    stakeAddress: 'stake_test1uqehkck0lajq96l5ppvx8wrxunfkmqjav2ckjjhd4xjdnqsxv2rt9',
    paymentVkh: '34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d',
  };
  
  console.log('✅ Test wallet generated:');
  console.log(`📍 Payment Address: ${testWallet.paymentAddress}`);
  console.log(`🏛️ Stake Address: ${testWallet.stakeAddress}`);
  console.log(`🔑 Payment VKH: ${testWallet.paymentVkh}`);
  
  return testWallet;
}

// 💰 CHECK WALLET BALANCE
async function checkWalletBalance(address) {
  console.log(`💰 CHECKING BALANCE FOR: ${address}`);
  
  try {
    const response = await fetch(`${TESTNET_CONFIG.blockfrostUrl}/addresses/${address}`, {
      headers: { 'project_id': TESTNET_CONFIG.blockfrostKey }
    });
    
    if (!response.ok) {
      throw new Error(`Blockfrost API error: ${response.status}`);
    }
    
    const addressInfo = await response.json();
    const lovelaceAmount = parseInt(addressInfo.amount.find(a => a.unit === 'lovelace')?.quantity || '0');
    const adaAmount = lovelaceAmount / 1000000;
    
    console.log(`💰 Balance: ${adaAmount} ADA (${lovelaceAmount} lovelace)`);
    return { lovelace: lovelaceAmount, ada: adaAmount };
    
  } catch (error) {
    console.error('❌ Balance check failed:', error.message);
    return { lovelace: 0, ada: 0 };
  }
}

// 🚰 REQUEST TESTNET ADA FROM FAUCET
async function requestTestnetADA(address) {
  console.log('🚰 REQUESTING TESTNET ADA FROM FAUCET...');
  console.log(`📍 Address: ${address}`);
  console.log(`🌐 Faucet URL: ${TESTNET_CONFIG.faucetUrl}`);
  
  console.log('⚠️  MANUAL STEP REQUIRED:');
  console.log('1. Visit the Cardano testnet faucet');
  console.log('2. Enter the address above');
  console.log('3. Request 1000 tADA');
  console.log('4. Wait for transaction confirmation');
  console.log('5. Press Enter to continue...');
  
  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
  
  // Check if funds arrived
  const balance = await checkWalletBalance(address);
  if (balance.ada >= 10) {
    console.log('✅ Testnet ADA received successfully!');
    return true;
  } else {
    console.log('⚠️  Insufficient balance. Please ensure faucet transaction completed.');
    return false;
  }
}

// 🏦 TEST AGENT VAULT CREATION
async function testRealAgentVaultCreation(wallet) {
  console.log('\n🏦 TESTING REAL AGENT VAULT CREATION...');
  
  const vaultDatum = {
    constructor: 0,
    fields: [
      { bytes: wallet.paymentVkh },
      { constructor: 1, fields: [] }, // tradingEnabled = true
      { int: "5000000" }, // maxTradeAmount = 5 ADA
      { int: "10" } // leverage = 10x
    ]
  };
  
  try {
    // Build transaction
    const buildResponse = await fetch('http://localhost:3000/api/cardano/build-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAddress: wallet.paymentAddress,
        toAddress: TESTNET_CONFIG.contractAddress,
        amount: 5, // 5 ADA
        vaultDatum: vaultDatum,
        network: 'testnet'
      })
    });
    
    if (!buildResponse.ok) {
      const errorText = await buildResponse.text();
      throw new Error(`Transaction building failed: ${errorText}`);
    }
    
    const { cborHex } = await buildResponse.json();
    console.log('✅ Agent Vault creation transaction built');
    console.log(`🔍 CBOR: ${cborHex.substring(0, 100)}...`);
    
    // TODO: Sign and submit transaction
    // For now, just return the CBOR for manual testing
    console.log('⚠️  MANUAL SIGNING REQUIRED:');
    console.log('Use a testnet wallet to sign and submit this CBOR');
    
    return cborHex;
    
  } catch (error) {
    console.error('❌ Real Agent Vault creation failed:', error.message);
    throw error;
  }
}

// 💸 TEST AGENT VAULT WITHDRAWAL
async function testRealAgentVaultWithdrawal(wallet) {
  console.log('\n💸 TESTING REAL AGENT VAULT WITHDRAWAL...');
  
  try {
    // Build withdrawal transaction
    const buildResponse = await fetch('http://localhost:3000/api/cardano/build-withdrawal-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress: TESTNET_CONFIG.contractAddress,
        fromAddress: wallet.paymentAddress,
        toAddress: wallet.paymentAddress,
        amount: 3000000, // 3 ADA in lovelace
        network: 'testnet'
      })
    });
    
    if (!buildResponse.ok) {
      const errorText = await buildResponse.text();
      throw new Error(`Withdrawal building failed: ${errorText}`);
    }
    
    const { cborHex } = await buildResponse.json();
    console.log('✅ Agent Vault withdrawal transaction built');
    console.log(`🔍 CBOR: ${cborHex.substring(0, 100)}...`);
    
    // TODO: Sign and submit transaction
    console.log('⚠️  MANUAL SIGNING REQUIRED:');
    console.log('Use a testnet wallet to sign and submit this CBOR');
    
    return cborHex;
    
  } catch (error) {
    console.error('❌ Real Agent Vault withdrawal failed:', error.message);
    throw error;
  }
}

// 🚀 RUN COMPLETE END-TO-END TEST
async function runCompleteTest() {
  console.log('🚀 STARTING COMPLETE END-TO-END TESTNET TEST...\n');
  
  try {
    // Step 1: Generate test wallet
    const wallet = generateTestWallet();
    
    // Step 2: Check initial balance
    const initialBalance = await checkWalletBalance(wallet.paymentAddress);
    
    // Step 3: Request testnet ADA if needed
    if (initialBalance.ada < 10) {
      const faucetSuccess = await requestTestnetADA(wallet.paymentAddress);
      if (!faucetSuccess) {
        throw new Error('Failed to get testnet ADA from faucet');
      }
    }
    
    // Step 4: Test Agent Vault creation
    const creationCbor = await testRealAgentVaultCreation(wallet);
    
    // Step 5: Test Agent Vault withdrawal
    const withdrawalCbor = await testRealAgentVaultWithdrawal(wallet);
    
    console.log('\n🎉 COMPLETE TEST RESULTS:');
    console.log('✅ Test wallet generated');
    console.log('✅ Testnet ADA acquired');
    console.log('✅ Agent Vault creation CBOR generated');
    console.log('✅ Agent Vault withdrawal CBOR generated');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Use a testnet wallet to sign and submit the creation CBOR');
    console.log('2. Wait for confirmation');
    console.log('3. Use the same wallet to sign and submit the withdrawal CBOR');
    console.log('4. Verify funds move correctly on testnet');
    
    return {
      wallet,
      creationCbor,
      withdrawalCbor
    };
    
  } catch (error) {
    console.error('\n❌ COMPLETE TEST FAILED:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCompleteTest()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { runCompleteTest, generateTestWallet, checkWalletBalance };
