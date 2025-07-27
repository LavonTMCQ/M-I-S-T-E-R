#!/usr/bin/env node

/**
 * 🔑 CARDANO TESTNET WALLET GENERATOR
 * Generate a real Cardano wallet for testnet testing
 */

import * as bip39 from 'bip39';
import CSL from '@emurgo/cardano-serialization-lib-nodejs';
import fetch from 'node-fetch';

// 🧪 TESTNET NETWORK CONFIGURATION
const TESTNET_NETWORK_ID = 0; // 0 = testnet, 1 = mainnet

function generateTestnetWallet() {
  console.log('🔑 GENERATING REAL CARDANO TESTNET WALLET...\n');
  
  try {
    // Step 1: Generate BIP39 mnemonic
    const mnemonic = bip39.generateMnemonic(256); // 24 words
    console.log('📝 MNEMONIC (24 words):');
    console.log(`"${mnemonic}"`);
    console.log('⚠️  SAVE THIS MNEMONIC SECURELY!\n');
    
    // Step 2: Convert mnemonic to entropy
    const entropy = bip39.mnemonicToEntropy(mnemonic);
    const rootKey = CSL.Bip32PrivateKey.from_bip39_entropy(
      Buffer.from(entropy, 'hex'),
      Buffer.from('') // No passphrase
    );
    
    // Step 3: Derive payment key (m/1852'/1815'/0'/0/0)
    const accountKey = rootKey
      .derive(harden(1852)) // Purpose: BIP44
      .derive(harden(1815)) // Coin type: ADA
      .derive(harden(0));   // Account: 0
    
    const paymentKey = accountKey
      .derive(0) // External chain
      .derive(0); // Address index 0
    
    // Step 4: Derive stake key (m/1852'/1815'/0'/2/0)
    const stakeKey = accountKey
      .derive(2) // Staking chain
      .derive(0); // Address index 0
    
    // Step 5: Create payment and stake credentials
    const paymentPubKey = paymentKey.to_public();
    const stakePubKey = stakeKey.to_public();
    
    const paymentKeyHash = paymentPubKey.hash();
    const stakeKeyHash = stakePubKey.hash();
    
    const paymentCredential = CSL.StakeCredential.from_keyhash(paymentKeyHash);
    const stakeCredential = CSL.StakeCredential.from_keyhash(stakeKeyHash);
    
    // Step 6: Create testnet addresses
    const baseAddress = CSL.BaseAddress.new(
      TESTNET_NETWORK_ID,
      paymentCredential,
      stakeCredential
    );
    
    const enterpriseAddress = CSL.EnterpriseAddress.new(
      TESTNET_NETWORK_ID,
      paymentCredential
    );
    
    const rewardAddress = CSL.RewardAddress.new(
      TESTNET_NETWORK_ID,
      stakeCredential
    );
    
    // Step 7: Convert to bech32 addresses
    const paymentAddress = baseAddress.to_address().to_bech32();
    const enterpriseAddr = enterpriseAddress.to_address().to_bech32();
    const stakeAddress = rewardAddress.to_address().to_bech32();
    
    // Step 8: Get verification key hashes
    const paymentVkh = paymentKeyHash.to_hex();
    const stakeVkh = stakeKeyHash.to_hex();
    
    const wallet = {
      mnemonic,
      network: 'testnet',
      addresses: {
        payment: paymentAddress,
        enterprise: enterpriseAddr,
        stake: stakeAddress
      },
      keyHashes: {
        payment: paymentVkh,
        stake: stakeVkh
      },
      keys: {
        paymentPrivateKey: paymentKey.to_hex(),
        stakePrivateKey: stakeKey.to_hex(),
        paymentPublicKey: paymentPubKey.to_hex(),
        stakePublicKey: stakePubKey.to_hex()
      }
    };
    
    console.log('✅ TESTNET WALLET GENERATED SUCCESSFULLY!\n');
    console.log('📍 ADDRESSES:');
    console.log(`Payment (Base):      ${wallet.addresses.payment}`);
    console.log(`Payment (Enterprise): ${wallet.addresses.enterprise}`);
    console.log(`Stake:               ${wallet.addresses.stake}\n`);
    
    console.log('🔑 KEY HASHES:');
    console.log(`Payment VKH: ${wallet.keyHashes.payment}`);
    console.log(`Stake VKH:   ${wallet.keyHashes.stake}\n`);
    
    console.log('🚰 GET TESTNET ADA:');
    console.log('Visit: https://docs.cardano.org/cardano-testnet/tools/faucet/');
    console.log(`Use address: ${wallet.addresses.payment}`);
    console.log('Request: 1000 tADA\n');
    
    return wallet;
    
  } catch (error) {
    console.error('❌ Wallet generation failed:', error);
    throw error;
  }
}

// Helper function for BIP32 hardened derivation
function harden(num) {
  return 0x80000000 + num;
}

// 💰 CHECK TESTNET BALANCE
async function checkTestnetBalance(address) {
  console.log(`💰 CHECKING TESTNET BALANCE FOR: ${address}`);
  
  try {
    const response = await fetch(`https://cardano-testnet.blockfrost.io/api/v0/addresses/${address}`, {
      headers: { 'project_id': 'preprodKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu' }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('💰 Balance: 0 ADA (address not found on blockchain)');
        return { lovelace: 0, ada: 0 };
      }
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

// 🧪 COMPLETE WALLET SETUP
async function setupTestWallet() {
  console.log('🧪 SETTING UP COMPLETE TEST WALLET...\n');
  
  try {
    // Generate wallet
    const wallet = generateTestnetWallet();
    
    // Check initial balance
    await checkTestnetBalance(wallet.addresses.payment);
    
    console.log('📋 NEXT STEPS:');
    console.log('1. Save the mnemonic securely');
    console.log('2. Get testnet ADA from faucet');
    console.log('3. Run transaction tests');
    
    return wallet;
    
  } catch (error) {
    console.error('❌ Wallet setup failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupTestWallet()
    .then(() => {
      console.log('\n✅ Wallet setup completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export { generateTestnetWallet, checkTestnetBalance, setupTestWallet };
