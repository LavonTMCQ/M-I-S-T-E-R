#!/usr/bin/env node

/**
 * 💰 FUND YOUR REAL WALLET
 * Create transaction to send tADA from faucet to your real address
 */

import fetch from 'node-fetch';

const WALLET_FUNDING = {
  // Source: Working faucet with 118M+ tADA
  fromAddress: 'addr_test1vzpwq95z3xyum8vqndgdd9mdnmafh3djcxnc6jemlgdmswcve6tkw',
  
  // Destination: Your real Vespr address
  toAddress: 'addr_test1qz9xwnn8vzkgf30n3kn889t4d44z8vru5vn03rxqs3jw3g22kfaqlmfmjpy3f08ehldsr225zvs34xngrvm5wraeydrskg5m3u',
  
  // Amount to send
  amount: 1100, // 1100 tADA (enough for 1000 ADA test + fees)
};

async function createWalletFundingTransaction() {
  console.log('💰 CREATING WALLET FUNDING TRANSACTION');
  console.log('=' .repeat(50));
  console.log(`📍 From: ${WALLET_FUNDING.fromAddress.substring(0, 20)}... (Faucet - 118M+ tADA)`);
  console.log(`📍 To: ${WALLET_FUNDING.toAddress.substring(0, 20)}... (Your Real Address)`);
  console.log(`💰 Amount: ${WALLET_FUNDING.amount.toLocaleString()} tADA`);
  console.log('');
  
  try {
    const response = await fetch('http://localhost:3000/api/cardano/build-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAddress: WALLET_FUNDING.fromAddress,
        toAddress: WALLET_FUNDING.toAddress,
        amount: WALLET_FUNDING.amount,
        network: 'testnet'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }
    
    const result = await response.json();
    console.log('✅ WALLET FUNDING TRANSACTION BUILT!');
    console.log(`🔍 CBOR length: ${result.cborHex.length} characters`);
    console.log(`📋 CBOR preview: ${result.cborHex.substring(0, 100)}...`);
    
    // Save CBOR
    const fs = await import('fs');
    const filename = 'fund-your-wallet-1100-ada.txt';
    fs.writeFileSync(filename, result.cborHex);
    console.log(`💾 CBOR saved to: ${filename}`);
    
    console.log('\n🎯 WHAT THIS TRANSACTION DOES:');
    console.log(`✅ Sends ${WALLET_FUNDING.amount} tADA to your real Vespr address`);
    console.log('✅ Gives you enough funds for 1000 ADA testing');
    console.log('✅ Bypasses faucet rate limits');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Someone with access to the faucet address signs this CBOR');
    console.log('2. Submit to preprod blockchain');
    console.log('3. Wait 5-10 minutes for confirmation');
    console.log('4. Check your Vespr wallet - should show 1100 tADA');
    console.log('5. Use the frontend to create Agent Vault with 1000 ADA');
    
    console.log('\n🚀 FRONTEND TESTING PROCESS:');
    console.log('1. npm run dev (start frontend)');
    console.log('2. Connect Vespr wallet');
    console.log('3. Create Agent Vault (1000 ADA)');
    console.log('4. Test withdrawal (800 ADA)');
    console.log('5. Complete end-to-end validation!');
    
    return {
      success: true,
      cbor: result.cborHex,
      filename: filename,
      amount: WALLET_FUNDING.amount
    };
    
  } catch (error) {
    console.error('❌ Wallet funding transaction failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Check your current balance
async function checkYourBalance() {
  console.log('💰 CHECKING YOUR CURRENT BALANCE...\n');
  
  try {
    const response = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${WALLET_FUNDING.toAddress}`, {
      headers: { 'project_id': 'preprodfHBBQsTsk1g3Lna67Vqb8HqZ0NbcPo1f' }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('💰 Your Balance: 0 tADA (no transactions yet)');
        return 0;
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const lovelace = parseInt(data.amount.find(a => a.unit === 'lovelace')?.quantity || '0');
    const ada = lovelace / 1000000;
    
    console.log(`💰 Your Balance: ${ada.toLocaleString()} tADA`);
    
    if (ada >= 1000) {
      console.log('✅ You have enough for 1000 ADA testing!');
      console.log('🚀 You can skip the funding and go straight to frontend testing');
    } else if (ada > 0) {
      console.log(`⚠️  You have some funds, but need ${1000 - ada} more tADA`);
    } else {
      console.log('❌ No funds yet - need funding transaction');
    }
    
    return ada;
    
  } catch (error) {
    console.error('❌ Balance check failed:', error.message);
    return 0;
  }
}

// Main execution
async function main() {
  console.log('💰 WALLET FUNDING FOR 1000 ADA TESTING');
  console.log('=' .repeat(50));
  
  // Check current balance
  const currentBalance = await checkYourBalance();
  
  if (currentBalance >= 1000) {
    console.log('\n🎉 YOU ALREADY HAVE ENOUGH FUNDS!');
    console.log('🚀 Skip to frontend testing:');
    console.log('1. npm run dev');
    console.log('2. Connect Vespr wallet');
    console.log('3. Create 1000 ADA Agent Vault');
    console.log('4. Test withdrawal');
    return;
  }
  
  // Create funding transaction
  const result = await createWalletFundingTransaction();
  
  if (result.success) {
    console.log('\n✅ FUNDING TRANSACTION READY!');
    console.log('📁 File created:', result.filename);
    console.log('💰 Amount:', result.amount, 'tADA');
  } else {
    console.log('\n❌ FUNDING TRANSACTION FAILED');
    console.log('Error:', result.error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('\n✅ Wallet funding process completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Funding process failed:', error);
      process.exit(1);
    });
}

export { createWalletFundingTransaction };
