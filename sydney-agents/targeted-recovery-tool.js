#!/usr/bin/env node

/**
 * TARGETED RECOVERY TOOL FOR SECOND STUCK CONTRACT
 * 
 * Based on analysis, we found that our current script compilation produces
 * hash d13b38e27cbe4b54501e3430d26ca3ba59981bc64147c9bd1a5f82a2 (PlutusV2)
 * which matches what the withdrawal system expects for the second contract.
 * 
 * This suggests the issue is with the expected hash, not the script itself.
 */

import CSL from '@emurgo/cardano-serialization-lib-nodejs';
import fs from 'fs';

const BLOCKFROST_PROJECT_ID = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
const BLOCKFROST_BASE_URL = 'https://cardano-mainnet.blockfrost.io/api/v0';

// Contract that might be recoverable
const TARGET_CONTRACT = {
  address: 'addr1wyq32c96u0u04s54clgeqtjk6ffd56pcxnrmu4jzn57zj3sy9gwyk',
  currentExpectedHash: '011560bae3f8fac295c7d1902e56d252da683834c7be56429d3c2946',
  ourCalculatedHash: 'd13b38e27cbe4b54501e3430d26ca3ba59981bc64147c9bd1a5f82a2',
  scriptCBOR: '5857010100323232323225333002323232323253330073370e900118041baa00113233224a260160026016601800260126ea800458c024c02800cc020008c01c008c01c004c010dd50008a4c26cacae6955ceaab9e5742ae89'
};

console.log('🎯 TARGETED RECOVERY TOOL');
console.log('========================');
console.log('');
console.log(`🔍 Target contract: ${TARGET_CONTRACT.address}`);
console.log(`❌ Current expected hash: ${TARGET_CONTRACT.currentExpectedHash}`);
console.log(`✅ Our calculated hash: ${TARGET_CONTRACT.ourCalculatedHash}`);
console.log('');

// Function to verify contract address from script hash
function verifyContractAddress(scriptHash) {
  try {
    const scriptHashBytes = Buffer.from(scriptHash, 'hex');
    const scriptCredential = CSL.Credential.from_scripthash(
      CSL.ScriptHash.from_bytes(scriptHashBytes)
    );
    
    // Create enterprise address (script-only, no staking)
    const enterpriseAddress = CSL.EnterpriseAddress.new(
      1, // mainnet
      scriptCredential
    );
    
    return enterpriseAddress.to_address().to_bech32();
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

// Function to query UTxOs from the contract
async function queryContractUtxos(contractAddress) {
  try {
    console.log(`🔍 Querying UTxOs from ${contractAddress}...`);
    
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(`${BLOCKFROST_BASE_URL}/addresses/${contractAddress}/utxos`, {
      headers: { 'project_id': BLOCKFROST_PROJECT_ID }
    });
    
    if (response.ok) {
      const utxos = await response.json();
      console.log(`✅ Found ${utxos.length} UTxOs in contract`);
      
      let totalBalance = 0;
      utxos.forEach((utxo, index) => {
        const adaAmount = parseInt(utxo.amount.find(a => a.unit === 'lovelace')?.quantity || '0');
        totalBalance += adaAmount;
        console.log(`  UTxO ${index + 1}: ${utxo.tx_hash}#${utxo.output_index} (${adaAmount / 1000000} ADA)`);
      });
      
      console.log(`💰 Total balance: ${totalBalance / 1000000} ADA`);
      return { utxos, totalBalance };
    } else {
      console.log(`❌ Failed to query UTxOs: ${response.statusText}`);
      return { utxos: [], totalBalance: 0 };
    }
  } catch (error) {
    console.log(`❌ Error querying UTxOs: ${error.message}`);
    return { utxos: [], totalBalance: 0 };
  }
}

// Function to create a test withdrawal transaction
function createTestWithdrawalTransaction(utxo, recipientAddress, amount) {
  try {
    console.log('🔨 Creating test withdrawal transaction...');
    
    // Create transaction inputs
    const inputs = CSL.TransactionInputs.new();
    const scriptInput = CSL.TransactionInput.new(
      CSL.TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, 'hex')),
      utxo.output_index
    );
    inputs.add(scriptInput);
    
    // Create transaction outputs
    const outputs = CSL.TransactionOutputs.new();
    
    // Convert recipient address
    const recipientAddr = CSL.Address.from_bech32(recipientAddress);
    const withdrawalOutput = CSL.TransactionOutput.new(
      recipientAddr,
      CSL.Value.new(CSL.BigNum.from_str(amount.toString()))
    );
    outputs.add(withdrawalOutput);
    
    // Calculate change
    const inputAmount = parseInt(utxo.amount.find(a => a.unit === 'lovelace')?.quantity || '0');
    const fee = 1500000; // 1.5 ADA
    const changeAmount = inputAmount - amount - fee;
    
    if (changeAmount > 1000000) { // If change > 1 ADA
      const contractAddr = CSL.Address.from_bech32(TARGET_CONTRACT.address);
      const changeOutput = CSL.TransactionOutput.new(
        contractAddr,
        CSL.Value.new(CSL.BigNum.from_str(changeAmount.toString()))
      );
      outputs.add(changeOutput);
    }
    
    // Create transaction body
    const txBody = CSL.TransactionBody.new(
      inputs,
      outputs,
      CSL.BigNum.from_str(fee.toString()),
      CSL.BigNum.from_str('999999999') // TTL placeholder
    );
    
    // Create redeemer for UserWithdraw
    const userWithdrawConstructor = CSL.PlutusData.new_integer(CSL.BigInt.from_str('0'));
    const withdrawRedeemer = CSL.Redeemer.new(
      CSL.RedeemerTag.new_spend(),
      CSL.BigNum.from_str('0'), // Input index
      userWithdrawConstructor,
      CSL.ExUnits.new(CSL.BigNum.from_str('3000000'), CSL.BigNum.from_str('8000000'))
    );
    
    const redeemers = CSL.Redeemers.new();
    redeemers.add(withdrawRedeemer);
    
    // Create witness set with script
    const witnessSet = CSL.TransactionWitnessSet.new();
    witnessSet.set_redeemers(redeemers);
    
    // Add Plutus script
    const plutusScripts = CSL.PlutusScripts.new();
    const scriptBytes = Buffer.from(TARGET_CONTRACT.scriptCBOR, 'hex');
    const plutusScript = CSL.PlutusScript.new_v2(scriptBytes); // Use V2 since that's what matches
    plutusScripts.add(plutusScript);
    witnessSet.set_plutus_scripts(plutusScripts);
    
    // Calculate script data hash
    const costModels = CSL.Costmdls.new();
    const scriptDataHash = CSL.hash_script_data(redeemers, costModels, null);
    txBody.set_script_data_hash(scriptDataHash);
    
    // Create final transaction
    const transaction = CSL.Transaction.new(txBody, witnessSet, null);
    const cborHex = Buffer.from(transaction.to_bytes()).toString('hex');
    
    console.log('✅ Test withdrawal transaction created');
    console.log(`🔍 CBOR length: ${cborHex.length} characters`);
    
    return {
      cborHex,
      details: {
        inputAmount: inputAmount / 1000000,
        withdrawalAmount: amount / 1000000,
        changeAmount: changeAmount > 0 ? changeAmount / 1000000 : 0,
        fee: fee / 1000000
      }
    };
    
  } catch (error) {
    console.log(`❌ Error creating withdrawal transaction: ${error.message}`);
    return null;
  }
}

// Main recovery function
async function attemptRecovery() {
  console.log('🚀 ATTEMPTING TARGETED RECOVERY');
  console.log('===============================');
  console.log('');
  
  // Step 1: Verify our script hash produces the correct contract address
  console.log('Step 1: Verifying script hash to address mapping...');
  const calculatedAddress = verifyContractAddress(TARGET_CONTRACT.ourCalculatedHash);
  console.log(`🔍 Address from our hash: ${calculatedAddress}`);
  console.log(`🎯 Target address: ${TARGET_CONTRACT.address}`);
  console.log(`✅ Match: ${calculatedAddress === TARGET_CONTRACT.address}`);
  console.log('');
  
  if (calculatedAddress !== TARGET_CONTRACT.address) {
    console.log('❌ Our script hash does not produce the target address');
    console.log('This means the contract was created with a different script');
    return;
  }
  
  // Step 2: Query contract UTxOs
  console.log('Step 2: Querying contract UTxOs...');
  const { utxos, totalBalance } = await queryContractUtxos(TARGET_CONTRACT.address);
  
  if (utxos.length === 0) {
    console.log('❌ No UTxOs found in contract - nothing to recover');
    return;
  }
  
  // Step 3: Create test withdrawal transaction
  console.log('Step 3: Creating test withdrawal transaction...');
  const testUtxo = utxos[0]; // Use first UTxO
  const testAmount = 1000000; // 1 ADA test withdrawal
  const recipientAddress = 'addr1qy8ac7qqy0vtulyl7wntmsxc6wex80gvcyjy33qffrhm7sh927ysx5sftw0dlpzwjncgegl8yswvmpdwwzajzccmuj5qmsf5r94'; // Example address
  
  const withdrawalTx = createTestWithdrawalTransaction(testUtxo, recipientAddress, testAmount);
  
  if (withdrawalTx) {
    console.log('✅ Test withdrawal transaction created successfully!');
    console.log('');
    console.log('📋 TRANSACTION DETAILS:');
    console.log(`   Input: ${withdrawalTx.details.inputAmount} ADA`);
    console.log(`   Withdrawal: ${withdrawalTx.details.withdrawalAmount} ADA`);
    console.log(`   Fee: ${withdrawalTx.details.fee} ADA`);
    console.log(`   Change: ${withdrawalTx.details.changeAmount} ADA`);
    console.log('');
    
    // Save the transaction for testing
    const recoveryData = {
      contractAddress: TARGET_CONTRACT.address,
      scriptHash: TARGET_CONTRACT.ourCalculatedHash,
      scriptCBOR: TARGET_CONTRACT.scriptCBOR,
      plutusVersion: 'V2',
      testTransactionCBOR: withdrawalTx.cborHex,
      transactionDetails: withdrawalTx.details,
      status: 'READY_FOR_TESTING',
      timestamp: new Date().toISOString(),
      instructions: [
        '1. Test this transaction with Vespr wallet first',
        '2. If successful, create full withdrawal transaction',
        '3. Update frontend to use correct script hash'
      ]
    };
    
    fs.writeFileSync('recovery-second-contract.json', JSON.stringify(recoveryData, null, 2));
    console.log('💾 Recovery data saved to recovery-second-contract.json');
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('1. Test the generated transaction with Vespr wallet');
    console.log('2. If successful, this proves the script works');
    console.log('3. Update withdrawal system to use correct hash');
    console.log(`4. Change expected hash from ${TARGET_CONTRACT.currentExpectedHash}`);
    console.log(`   to ${TARGET_CONTRACT.ourCalculatedHash}`);
  }
}

// Run the targeted recovery
attemptRecovery();
