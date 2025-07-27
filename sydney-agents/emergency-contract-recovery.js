#!/usr/bin/env node

/**
 * EMERGENCY AGENT VAULT RECOVERY TOOL
 *
 * This tool attempts to recover the 20 ADA stuck in Agent Vault contracts
 * by finding the correct script hashes that match the deployed contract addresses.
 *
 * STUCK CONTRACTS:
 * - addr1wxwx5rmqrwm4mpeg5ky6rt6lq76errkjjs490pewl9rqvrcqzrec7 (10 ADA)
 * - addr1wyq32c96u0u04s54clgeqtjk6ffd56pcxnrmu4jzn57zj3sy9gwyk (10 ADA)
 */

import CSL from '@emurgo/cardano-serialization-lib-nodejs';
import fs from 'fs';
import path from 'path';

// Stuck contract addresses that need recovery
const STUCK_CONTRACTS = [
  {
    address: 'addr1wxwx5rmqrwm4mpeg5ky6rt6lq76errkjjs490pewl9rqvrcqzrec7',
    expectedScriptHash: '9c6a0f601bb75d8728a589a1af5f07b5918ed2942a57872ef946060f',
    amount: '10 ADA',
    status: 'No matching script found'
  },
  {
    address: 'addr1wyq32c96u0u04s54clgeqtjk6ffd56pcxnrmu4jzn57zj3sy9gwyk', 
    expectedScriptHash: '011560bae3f8fac295c7d1902e56d252da683834c7be56429d3c2946',
    amount: '10 ADA',
    status: 'Script hash mismatch'
  }
];

// Known script CBOR variations to test
const SCRIPT_CBOR_VARIATIONS = [
  // Current hardcoded CBOR from withdrawal transaction builder
  '5857010100323232323225333002323232323253330073370e900118041baa00113233224a260160026016601800260126ea800458c024c02800cc020008c01c008c01c004c010dd50008a4c26cacae6955ceaab9e5742ae89',
  
  // Production agent vault CBOR
  '5870010100323232323225333002323232323253330073370e900118041baa0011323322533300a3370e900018059baa0011324a2601a60186ea800452818058009805980600098049baa001163009300a0033008002300700230070013004375400229309b2b2b9a5573aaae795d0aba201',
  
  // We'll add more variations as we discover them
];

// Blockfrost configuration
const BLOCKFROST_PROJECT_ID = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
const BLOCKFROST_BASE_URL = 'https://cardano-mainnet.blockfrost.io/api/v0';

console.log('🚨 EMERGENCY AGENT VAULT RECOVERY TOOL');
console.log('=====================================');
console.log('');
console.log('🎯 MISSION: Recover 20 ADA stuck in Agent Vault contracts');
console.log('');

// Function to calculate script hash for different Plutus versions
function calculateScriptHashes(cborHex) {
  const scriptBytes = Buffer.from(cborHex, 'hex');
  const results = {};
  
  try {
    // Try PlutusV1
    const plutusV1 = CSL.PlutusScript.new_v1(scriptBytes);
    results.v1 = Buffer.from(plutusV1.hash().to_bytes()).toString('hex');
  } catch (e) {
    results.v1 = `Error: ${e.message}`;
  }
  
  try {
    // Try PlutusV2  
    const plutusV2 = CSL.PlutusScript.new_v2(scriptBytes);
    results.v2 = Buffer.from(plutusV2.hash().to_bytes()).toString('hex');
  } catch (e) {
    results.v2 = `Error: ${e.message}`;
  }
  
  try {
    // Try PlutusV3
    const plutusV3 = CSL.PlutusScript.from_bytes(scriptBytes);
    results.v3 = Buffer.from(plutusV3.hash().to_bytes()).toString('hex');
  } catch (e) {
    results.v3 = `Error: ${e.message}`;
  }
  
  return results;
}

// Function to derive contract address from script hash
function deriveContractAddress(scriptHash) {
  try {
    const scriptHashBytes = Buffer.from(scriptHash, 'hex');
    const scriptCredential = CSL.StakeCredential.from_scripthash(
      CSL.ScriptHash.from_bytes(scriptHashBytes)
    );
    const baseAddress = CSL.BaseAddress.new(
      1, // mainnet
      CSL.Credential.from_scripthash(CSL.ScriptHash.from_bytes(scriptHashBytes)),
      scriptCredential
    );
    return baseAddress.to_address().to_bech32();
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

// Function to query actual script from Blockfrost
async function queryScriptFromBlockfrost(scriptHash) {
  try {
    console.log(`🔍 Querying script ${scriptHash} from Blockfrost...`);

    const { default: fetch } = await import('node-fetch');
    const response = await fetch(`${BLOCKFROST_BASE_URL}/scripts/${scriptHash}`, {
      headers: { 'project_id': BLOCKFROST_PROJECT_ID }
    });
    
    if (response.ok) {
      const scriptData = await response.json();
      console.log(`✅ Found script on blockchain:`);
      console.log(`   Type: ${scriptData.type}`);
      console.log(`   Size: ${scriptData.size} bytes`);
      
      if (scriptData.script) {
        console.log(`   CBOR: ${scriptData.script.substring(0, 60)}...`);
        return scriptData.script;
      }
    } else {
      console.log(`❌ Script not found on blockchain: ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ Error querying script: ${error.message}`);
  }
  
  return null;
}

// Main recovery analysis function
async function analyzeStuckContracts() {
  console.log('📊 ANALYZING STUCK CONTRACTS');
  console.log('============================');
  console.log('');
  
  for (const contract of STUCK_CONTRACTS) {
    console.log(`🔍 Analyzing: ${contract.address}`);
    console.log(`💰 Amount stuck: ${contract.amount}`);
    console.log(`🎯 Expected script hash: ${contract.expectedScriptHash}`);
    console.log('');
    
    // Try to query the actual script from Blockfrost
    const actualScript = await queryScriptFromBlockfrost(contract.expectedScriptHash);
    
    if (actualScript) {
      console.log('🔥 FOUND ACTUAL SCRIPT FROM BLOCKCHAIN!');
      console.log('Testing if this script matches the contract address...');
      
      const hashes = calculateScriptHashes(actualScript);
      console.log('Script hash calculations:');
      console.log(`  PlutusV1: ${hashes.v1}`);
      console.log(`  PlutusV2: ${hashes.v2}`);
      console.log(`  PlutusV3: ${hashes.v3}`);
      
      // Check if any version matches
      const matchingVersion = Object.entries(hashes).find(([version, hash]) => 
        hash === contract.expectedScriptHash
      );
      
      if (matchingVersion) {
        console.log(`✅ MATCH FOUND! Plutus${matchingVersion[0].toUpperCase()} produces correct hash`);
        console.log(`🔑 Recovery script CBOR: ${actualScript}`);
        
        // Save recovery information
        const recoveryInfo = {
          contractAddress: contract.address,
          scriptHash: contract.expectedScriptHash,
          plutusVersion: matchingVersion[0].toUpperCase(),
          scriptCBOR: actualScript,
          status: 'RECOVERABLE',
          timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(
          `recovery-${contract.address.substring(0, 20)}.json`,
          JSON.stringify(recoveryInfo, null, 2)
        );
        
        console.log(`💾 Recovery info saved to recovery-${contract.address.substring(0, 20)}.json`);
      } else {
        console.log('❌ No matching Plutus version found');
      }
    }
    
    console.log('');
    console.log('---');
    console.log('');
  }
}

// Function to test known CBOR variations
function testKnownVariations() {
  console.log('🧪 TESTING KNOWN SCRIPT VARIATIONS');
  console.log('==================================');
  console.log('');
  
  SCRIPT_CBOR_VARIATIONS.forEach((cbor, index) => {
    console.log(`Testing variation ${index + 1}:`);
    console.log(`CBOR: ${cbor.substring(0, 60)}...`);
    
    const hashes = calculateScriptHashes(cbor);
    console.log('Generated hashes:');
    console.log(`  PlutusV1: ${hashes.v1}`);
    console.log(`  PlutusV2: ${hashes.v2}`);
    console.log(`  PlutusV3: ${hashes.v3}`);
    
    // Check against stuck contracts
    STUCK_CONTRACTS.forEach(contract => {
      Object.entries(hashes).forEach(([version, hash]) => {
        if (hash === contract.expectedScriptHash) {
          console.log(`🎯 MATCH! This CBOR with Plutus${version.toUpperCase()} matches ${contract.address}`);
        }
      });
    });
    
    console.log('');
  });
}

// Main execution
async function main() {
  try {
    // Test known variations first
    testKnownVariations();
    
    // Query actual scripts from blockchain
    await analyzeStuckContracts();
    
    console.log('🏁 RECOVERY ANALYSIS COMPLETE');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Check generated recovery-*.json files for working scripts');
    console.log('2. Test withdrawal with small amount (1 ADA) first');
    console.log('3. If successful, withdraw remaining funds');
    console.log('4. Deploy new contract with proper tracking');
    
  } catch (error) {
    console.error('❌ Recovery analysis failed:', error);
  }
}

// Run the recovery tool
main();
