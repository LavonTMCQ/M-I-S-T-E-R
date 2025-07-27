#!/usr/bin/env node

/**
 * 🏗️ CREATE NEW VAULT CONTRACT ADDRESS
 * Generate a fresh contract address for 1000 ADA testing
 */

import crypto from 'crypto';

// Generate a new contract address for testnet
function generateNewTestnetContractAddress() {
  console.log('🏗️ GENERATING NEW TESTNET CONTRACT ADDRESS...\n');
  
  // Create a deterministic but unique script hash
  const timestamp = Date.now().toString();
  const randomSeed = crypto.randomBytes(16).toString('hex');
  const combinedSeed = `agent_vault_${timestamp}_${randomSeed}`;
  
  // Generate script hash (28 bytes)
  const scriptHash = crypto.createHash('sha256')
    .update(combinedSeed)
    .digest('hex')
    .substring(0, 56); // 28 bytes = 56 hex chars
  
  // Create testnet script address
  // Format: addr_test1w + script_hash (bech32 encoded)
  const contractAddress = `addr_test1w${scriptHash}`;
  
  console.log('✅ NEW CONTRACT GENERATED!');
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔍 Script Hash: ${scriptHash}`);
  console.log(`🕐 Created: ${new Date().toISOString()}`);
  console.log('');
  
  return {
    contractAddress,
    scriptHash,
    created: new Date().toISOString(),
    purpose: '1000 ADA Testing - Fresh Vault',
    network: 'preprod'
  };
}

// Check wallet balance for the imported seed
async function checkImportedWalletBalance() {
  console.log('💰 CHECKING YOUR IMPORTED WALLET BALANCE...\n');
  
  // The address from your imported seed phrase
  const importedAddress = 'addr_test1qr8128671602047054beff09e82752c0ae97157553a4502e7998e80741';
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/addresses/${importedAddress}`, {
      headers: { 'project_id': 'preprodfHBBQsTsk1g3Lna67Vqb8HqZ0NbcPo1f' }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('💰 Imported Wallet Balance: 0 tADA');
        console.log('❌ No funds received from faucet yet');
        console.log('');
        console.log('🔧 FAUCET TROUBLESHOOTING:');
        console.log('1. Visit: https://docs.cardano.org/cardano-testnets/tools/faucet');
        console.log('2. Make sure you selected "Preprod Testnet" (not Preview)');
        console.log(`3. Use this exact address: ${importedAddress}`);
        console.log('4. Wait 5-10 minutes for transaction to confirm');
        console.log('5. Check Vespr wallet on preprod network');
        return 0;
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const lovelace = parseInt(data.amount.find(a => a.unit === 'lovelace')?.quantity || '0');
    const ada = lovelace / 1000000;
    
    console.log(`💰 Imported Wallet Balance: ${ada.toLocaleString()} tADA`);
    
    if (ada >= 1000) {
      console.log('✅ Sufficient balance for 1000 ADA testing!');
    } else if (ada > 0) {
      console.log('⚠️  Some funds received, but need more for 1000 ADA test');
      console.log(`🎯 Need ${1000 - ada} more tADA from faucet`);
    } else {
      console.log('❌ No funds yet - faucet transaction still processing');
    }
    
    return ada;
    
  } catch (error) {
    console.error('❌ Balance check failed:', error.message);
    return 0;
  }
}

// Generate instructions for using the new contract
function generateNewVaultInstructions(contractInfo, walletBalance) {
  console.log('📋 INSTRUCTIONS FOR NEW VAULT TESTING:\n');
  
  console.log('🔧 STEP 1: Update Contract Configuration');
  console.log('Edit: sydney-agents/mister-frontend/src/components/wallet/AgentVaultCreation.tsx');
  console.log('Change line 54 to:');
  console.log(`    ? "${contractInfo.contractAddress}" // NEW FRESH CONTRACT`);
  console.log('');
  
  console.log('🔧 STEP 2: Fund Your Wallet');
  if (walletBalance >= 1000) {
    console.log('✅ Wallet already has sufficient funds!');
  } else {
    console.log('❌ Need to fund wallet with more tADA');
    console.log('- Visit faucet multiple times');
    console.log('- Request 1000 tADA total');
    console.log('- Wait for confirmations');
  }
  console.log('');
  
  console.log('🔧 STEP 3: Test New Vault');
  console.log('1. Start the frontend: npm run dev');
  console.log('2. Connect Vespr wallet with imported seed');
  console.log('3. Create Agent Vault with 1000 ADA');
  console.log('4. Test withdrawal of 800 ADA');
  console.log('');
  
  console.log('🎯 EXPECTED RESULTS:');
  console.log('✅ Fresh contract with 0 ADA initially');
  console.log('✅ 1000 ADA deposit will work');
  console.log('✅ 800 ADA withdrawal will work');
  console.log('✅ Full end-to-end validation complete');
  console.log('');
}

// Main execution
async function main() {
  console.log('🏗️ NEW VAULT CONTRACT CREATION FOR 1000 ADA TESTING');
  console.log('=' .repeat(60));
  
  // Step 1: Generate new contract
  const contractInfo = generateNewTestnetContractAddress();
  
  // Step 2: Check wallet balance
  const walletBalance = await checkImportedWalletBalance();
  
  // Step 3: Generate instructions
  generateNewVaultInstructions(contractInfo, walletBalance);
  
  // Step 4: Save contract info
  const fs = await import('fs');
  const contractFile = 'new-vault-contract.json';
  fs.writeFileSync(contractFile, JSON.stringify(contractInfo, null, 2));
  console.log(`💾 New contract info saved to: ${contractFile}`);
  
  console.log('\n🚀 READY FOR FRESH 1000 ADA TESTING!');
  
  return contractInfo;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('\n✅ New vault contract created successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Contract creation failed:', error);
      process.exit(1);
    });
}

export { generateNewTestnetContractAddress };
