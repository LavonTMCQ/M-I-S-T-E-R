#!/usr/bin/env node

/**
 * Debug script hash calculation to match vault UTxOs
 */

console.log('🔧 DEBUGGING SCRIPT HASH MISMATCH');
console.log('=' .repeat(50));

async function debugScriptHash() {
  try {
    console.log('\n📦 Importing Lucid Evolution...');
    const { validatorToScriptHash } = await import('@lucid-evolution/lucid');
    
    // The script hash that the UTxOs are expecting
    const expectedScriptHash = 'c7fe4fb3a20f80a0d2cda36747a0a1cfbc8211185bad00b7566feb7c';
    console.log(`🎯 Expected script hash: ${expectedScriptHash}`);
    
    // Test different scripts to find the match
    const testScripts = [
      { 
        name: 'Working Simple Vault', 
        cbor: '590049590046010000323232323232323232323225333573466e1d20000021003133573466e1d2000002100323232323232323232323225333573466e1d20000021003133573466e1d200000210032323232323232323232323225333573466e1d200000210031'
      },
      {
        name: 'Ultra Simple', 
        cbor: '4740010000222601'
      },
      {
        name: 'Minimal Script', 
        cbor: '47400100002201'
      },
      {
        name: 'Test Script 1',
        cbor: '5870010100323232323225333002323232323253330073370e900118041baa0011323322533300a3370e900018059baa0011324a2601a60186ea800452898058009805980600098049baa001163009300a0033008002300700230070013004375400229309b2b2b9a5573aaae795d0aba201'
      }
    ];
    
    console.log('\n🔍 Testing script hash calculations...');
    
    for (const script of testScripts) {
      try {
        const validator = {
          type: 'PlutusV3',
          script: script.cbor
        };
        
        const scriptHash = validatorToScriptHash(validator);
        const matches = scriptHash === expectedScriptHash;
        
        console.log(`\n${script.name}:`);
        console.log(`  CBOR: ${script.cbor.substring(0, 20)}...`);
        console.log(`  Hash: ${scriptHash}`);
        console.log(`  Match: ${matches ? '✅ YES!' : '❌ No'}`);
        
        if (matches) {
          console.log(`\n🎉 FOUND MATCHING SCRIPT!`);
          console.log(`Script: ${script.name}`);
          console.log(`CBOR: ${script.cbor}`);
          return script.cbor;
        }
        
      } catch (error) {
        console.log(`${script.name}: ❌ Error - ${error.message}`);
      }
    }
    
    console.log('\n❌ No matching script found in test set');
    console.log('💡 The UTxOs might be from a different deployment');
    
    // Try to reverse engineer the script
    console.log('\n🔍 Analyzing expected script hash...');
    console.log(`Expected: ${expectedScriptHash}`);
    console.log(`Length: ${expectedScriptHash.length} chars`);
    console.log(`Bytes: ${expectedScriptHash.length / 2}`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugScriptHash().catch(console.error);