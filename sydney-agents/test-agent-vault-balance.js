#!/usr/bin/env node

/**
 * Agent Vault Balance Checker
 * Tests the Agent Vault smart contract balance and functionality
 */

import https from 'https';

// Agent Vault Configuration
const AGENT_VAULT_CONFIG = {
  contractAddress: "addr1wyq32c96u0u04s54clgeqtjk6ffd56pcxnrmu4jzn57zj3sy9gwyk",
  scriptHash: "011560bae3f8fac295c7d1902e56d252da683834c7be56429d3c2946",
  agentVkh: "34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d",
  strikeContract: "be7544ca7d42c903268caecae465f3f8b5a7e7607d09165e471ac8b5"
};

// Blockfrost API configuration
const BLOCKFROST_PROJECT_ID = "mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu";
const BLOCKFROST_BASE_URL = "https://cardano-mainnet.blockfrost.io/api/v0";

/**
 * Make HTTP request to Blockfrost API
 */
function makeBlockfrostRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'cardano-mainnet.blockfrost.io',
      port: 443,
      path: `/api/v0${endpoint}`,
      method: 'GET',
      headers: {
        'project_id': BLOCKFROST_PROJECT_ID,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(jsonData);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${jsonData.message || data}`));
          }
        } catch (error) {
          reject(new Error(`Parse Error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Check Agent Vault contract balance
 */
async function checkAgentVaultBalance() {
  console.log('🔍 AGENT VAULT BALANCE CHECK');
  console.log('=' .repeat(50));
  console.log(`📍 Contract Address: ${AGENT_VAULT_CONFIG.contractAddress}`);
  console.log(`🔑 Script Hash: ${AGENT_VAULT_CONFIG.scriptHash}`);
  console.log(`🤖 Agent VKH: ${AGENT_VAULT_CONFIG.agentVkh}`);
  console.log('');

  try {
    // Get address information
    console.log('📊 Fetching address information...');
    const addressInfo = await makeBlockfrostRequest(`/addresses/${AGENT_VAULT_CONFIG.contractAddress}`);
    
    console.log('✅ Address Info:');
    console.log(`   💰 Balance: ${(addressInfo.amount[0].quantity / 1000000).toFixed(6)} ADA`);
    console.log(`   📦 UTXOs: ${addressInfo.amount.length} assets`);
    console.log(`   📝 TX Count: ${addressInfo.tx_count} transactions`);
    console.log('');

    // Get UTXOs
    console.log('📦 Fetching UTXOs...');
    const utxos = await makeBlockfrostRequest(`/addresses/${AGENT_VAULT_CONFIG.contractAddress}/utxos`);
    
    console.log(`✅ Found ${utxos.length} UTXOs:`);
    let totalAda = 0;
    
    utxos.forEach((utxo, index) => {
      const adaAmount = utxo.amount.find(asset => asset.unit === 'lovelace');
      const ada = adaAmount ? (parseInt(adaAmount.quantity) / 1000000) : 0;
      totalAda += ada;
      
      console.log(`   UTXO ${index + 1}: ${ada.toFixed(6)} ADA (${utxo.tx_hash.substring(0, 16)}...)`);
      
      // Check for datum
      if (utxo.data_hash) {
        console.log(`     📝 Datum Hash: ${utxo.data_hash}`);
      }
    });
    
    console.log(`   💰 Total: ${totalAda.toFixed(6)} ADA`);
    console.log('');

    // Get recent transactions
    console.log('📋 Fetching recent transactions...');
    const transactions = await makeBlockfrostRequest(`/addresses/${AGENT_VAULT_CONFIG.contractAddress}/transactions?count=5`);
    
    console.log(`✅ Recent ${transactions.length} transactions:`);
    for (const tx of transactions.slice(0, 3)) {
      try {
        const txDetails = await makeBlockfrostRequest(`/txs/${tx.tx_hash}`);
        const date = new Date(txDetails.block_time * 1000).toLocaleString();
        console.log(`   📝 ${tx.tx_hash.substring(0, 16)}... (${date})`);
        console.log(`      💰 Fees: ${(txDetails.fees / 1000000).toFixed(6)} ADA`);
      } catch (error) {
        console.log(`   📝 ${tx.tx_hash.substring(0, 16)}... (details unavailable)`);
      }
    }

    console.log('');
    console.log('🎯 AGENT VAULT STATUS:');
    console.log(`   ${totalAda >= 60 ? '✅' : '❌'} Sufficient balance for testing (${totalAda.toFixed(6)} ADA)`);
    console.log(`   ${utxos.length > 0 ? '✅' : '❌'} UTXOs available for trading`);
    console.log(`   ${addressInfo.tx_count > 0 ? '✅' : '❌'} Contract has transaction history`);
    
    if (totalAda >= 60) {
      console.log('');
      console.log('🚀 READY FOR TESTING:');
      console.log('   • Agent Vault has sufficient funds');
      console.log('   • Can test automated Strike Finance trading');
      console.log('   • Minimum 40 ADA per trade requirement met');
    } else {
      console.log('');
      console.log('⚠️  FUNDING NEEDED:');
      console.log('   • Send at least 60-100 ADA to the Agent Vault');
      console.log('   • This will enable automated trading tests');
      console.log('   • Use the frontend to create/fund the vault');
    }

  } catch (error) {
    console.error('❌ Error checking Agent Vault:', error.message);
    
    if (error.message.includes('404')) {
      console.log('');
      console.log('💡 This might mean:');
      console.log('   • Agent Vault contract not yet created');
      console.log('   • No transactions sent to this address yet');
      console.log('   • Use the frontend to create the vault first');
    }
  }
}

// Run the balance check
checkAgentVaultBalance().catch(console.error);
