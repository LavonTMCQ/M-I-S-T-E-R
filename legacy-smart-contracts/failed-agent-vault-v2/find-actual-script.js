/**
 * Try to find the actual script CBOR that produces the expected hash
 * by reverse-engineering or checking common script patterns
 */

async function findActualScript() {
  const expectedHash = 'ef687fd29820bf668720713ab756d1dba13c6ef5edcc5e8eeb7cd7fb';
  const targetAddress = 'addr1w8hksl7jnqst7e58ypcn4d6k68d6z0rw7hkuch5wad7d07c3zn2nj';
  
  console.log('🔍 SEARCHING FOR ACTUAL SCRIPT CBOR');
  console.log('='.repeat(60));
  console.log(`Expected Hash: ${expectedHash}`);
  console.log(`Target Address: ${targetAddress}`);
  console.log('');
  
  // Try multiple approaches to find the script
  
  // 1. Check if script exists in any transaction that created these UTxOs
  const utxoTxHashes = [
    'a04b455c08ac4cbd620943020acd7a3a179a13018310b7e8a9dc3687b393afd6',
    '24ece60850b5d6e182ea463720c3aa1a9fb5066d8348e5c1383e7851978bfe93'
  ];
  
  for (const txHash of utxoTxHashes) {
    console.log(`🔍 Checking transaction: ${txHash}`);
    
    try {
      const response = await fetch(
        `https://cardano-mainnet.blockfrost.io/api/v0/txs/${txHash}`,
        {
          headers: {
            'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
          }
        }
      );
      
      if (response.ok) {
        const txData = await response.json();
        console.log(`📋 TX Block: ${txData.block_height}, Slot: ${txData.slot}`);
        
        // Check for scripts in this transaction
        const scriptsResponse = await fetch(
          `https://cardano-mainnet.blockfrost.io/api/v0/txs/${txHash}/redeemers`,
          {
            headers: {
              'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
            }
          }
        );
        
        if (scriptsResponse.ok) {
          const redeemers = await scriptsResponse.json();
          console.log(`   📜 Redeemers found: ${redeemers.length}`);
          
          for (const redeemer of redeemers) {
            console.log(`   🎯 Script hash: ${redeemer.script_hash}`);
            if (redeemer.script_hash === expectedHash) {
              console.log('   ✅ FOUND MATCHING SCRIPT HASH!');
              
              // Try to get the actual script CBOR
              const scriptResponse = await fetch(
                `https://cardano-mainnet.blockfrost.io/api/v0/scripts/${redeemer.script_hash}/cbor`,
                {
                  headers: {
                    'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
                  }
                }
              );
              
              if (scriptResponse.ok) {
                const scriptData = await scriptResponse.json();
                console.log(`   🎉 FOUND ACTUAL SCRIPT CBOR: ${scriptData.cbor}`);
                return scriptData.cbor;
              }
            }
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Error checking tx ${txHash}: ${error.message}`);
    }
  }
  
  // 2. Try to derive the script hash from the address directly
  console.log('\n🔍 Trying to extract script hash from address...');
  
  try {
    const { Lucid, Blockfrost, validatorToAddress } = await import('@lucid-evolution/lucid');
    
    // The address format tells us it's a script address
    // addr1w... means it contains a script hash
    // Let's see if we can extract the hash directly
    
    console.log('📋 Address analysis:');
    console.log(`   Format: ${targetAddress.slice(0, 5)}... (script address)`);
    console.log(`   Expected to contain script hash: ${expectedHash}`);
    
    // Try common Agent Vault script patterns
    const commonScriptPatterns = [
      // Original Agent Vault
      '4640010100323232323225333002323232323253330073370e900118041baa00113232323253330083370e900118049baa0011375a601260126ea8008dd6980418041bad001132323232533300b337220120021',
      // Simplified versions
      '590049590046010000323232323232323232323225333573466e1d20000021003133573466e1d2000002100323232323232323232323225333573466e1d20000021003133573466e1d200000210032323232323232323232323225333573466e1d200000210031',
      // Version from our failed attempts
      '5870010100323232323225333002323232323253330073370e900118041baa0011323322533300a3370e900018059baa0011324a2601a60186ea800452898058009805980600098049baa001163009300a0033008002300700230070013004375400229309b2b2b9a5573aaae795d0aba201'
    ];
    
    for (const [index, script] of commonScriptPatterns.entries()) {
      try {
        const provider = new Blockfrost('https://cardano-mainnet.blockfrost.io/api/v0', 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu');
        const lucid = await Lucid(provider, 'Mainnet');
        
        const { validatorToScriptHash } = await import('@lucid-evolution/lucid');
        
        const validator = {
          type: 'PlutusV3',
          script: script
        };
        
        const calculatedHash = validatorToScriptHash(validator);
        const calculatedAddress = validatorToAddress('Mainnet', validator);
        
        console.log(`\n📋 Pattern ${index + 1}:`);
        console.log(`   Script Hash: ${calculatedHash}`);
        console.log(`   Address: ${calculatedAddress}`);
        
        if (calculatedHash === expectedHash) {
          console.log('   🎉 HASH MATCH FOUND!');
          return script;
        }
        
        if (calculatedAddress === targetAddress) {
          console.log('   🎉 ADDRESS MATCH FOUND!');
          return script;
        }
        
      } catch (error) {
        console.log(`   ❌ Pattern ${index + 1} failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Address analysis failed: ${error.message}`);
  }
  
  console.log('\n❌ Could not find the actual script CBOR');
  console.log('🔄 The script might be embedded in the transaction witness set');
  console.log('💡 Alternative: Use Cardano CLI or manual CBOR building');
  
  return null;
}

findActualScript().then(result => {
  if (result) {
    console.log(`\n✅ SUCCESS: Found script CBOR: ${result}`);
  }
});