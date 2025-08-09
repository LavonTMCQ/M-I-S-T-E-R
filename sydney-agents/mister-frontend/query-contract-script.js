/**
 * Query the actual contract UTxOs to find the correct script
 */

async function queryContractScript() {
  const contractAddress = 'addr1w8hksl7jnqst7e58ypcn4d6k68d6z0rw7hkuch5wad7d07c3zn2nj';
  const blockfrostProjectId = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
  
  console.log('🔍 Querying contract UTxOs to find the actual script...\n');
  
  try {
    // Query UTxOs at the contract address
    const utxosResponse = await fetch(
      `https://cardano-mainnet.blockfrost.io/api/v0/addresses/${contractAddress}/utxos`,
      {
        headers: {
          'project_id': blockfrostProjectId
        }
      }
    );
    
    if (!utxosResponse.ok) {
      throw new Error(`Blockfrost UTxO query failed: ${utxosResponse.status}`);
    }
    
    const utxos = await utxosResponse.json();
    console.log(`📍 Found ${utxos.length} UTxOs at contract address`);
    
    if (utxos.length === 0) {
      console.log('❌ No UTxOs found at contract address');
      return;
    }
    
    // Look for UTxOs with scripts
    for (const utxo of utxos) {
      console.log(`\n🔍 UTxO: ${utxo.tx_hash}#${utxo.output_index}`);
      console.log(`   Amount: ${Number(utxo.amount.find(a => a.unit === 'lovelace')?.quantity || 0) / 1_000_000} ADA`);
      
      if (utxo.script_hash) {
        console.log(`   ✅ Has script hash: ${utxo.script_hash}`);
        
        // Query the script details
        try {
          const scriptResponse = await fetch(
            `https://cardano-mainnet.blockfrost.io/api/v0/scripts/${utxo.script_hash}`,
            {
              headers: {
                'project_id': blockfrostProjectId
              }
            }
          );
          
          if (scriptResponse.ok) {
            const scriptData = await scriptResponse.json();
            console.log(`   📜 Script type: ${scriptData.type}`);
            console.log(`   📜 Script size: ${scriptData.size} bytes`);
            
            // Get the CBOR
            const cborResponse = await fetch(
              `https://cardano-mainnet.blockfrost.io/api/v0/scripts/${utxo.script_hash}/cbor`,
              {
                headers: {
                  'project_id': blockfrostProjectId
                }
              }
            );
            
            if (cborResponse.ok) {
              const cborData = await cborResponse.json();
              console.log(`   📜 Script CBOR: ${cborData.cbor}`);
              
              // Test address calculation with this CBOR
              await testScriptCbor(cborData.cbor, utxo.script_hash);
            }
          }
        } catch (scriptError) {
          console.log(`   ❌ Error querying script: ${scriptError.message}`);
        }
      }
      
      if (utxo.reference_script_hash) {
        console.log(`   🔗 Has reference script: ${utxo.reference_script_hash}`);
        
        // This is likely our script!
        try {
          const refScriptResponse = await fetch(
            `https://cardano-mainnet.blockfrost.io/api/v0/scripts/${utxo.reference_script_hash}/cbor`,
            {
              headers: {
                'project_id': blockfrostProjectId
              }
            }
          );
          
          if (refScriptResponse.ok) {
            const refCborData = await refScriptResponse.json();
            console.log(`   🎯 REFERENCE SCRIPT CBOR: ${refCborData.cbor}`);
            
            // Test address calculation with this CBOR
            await testScriptCbor(refCborData.cbor, utxo.reference_script_hash);
          }
        } catch (refError) {
          console.log(`   ❌ Error querying reference script: ${refError.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error querying contract:', error.message);
  }
}

async function testScriptCbor(cbor, expectedHash) {
  try {
    const { validatorToAddress, SpendingValidator } = await import('@lucid-evolution/lucid');
    
    const spendingValidator = {
      type: 'PlutusV3',
      script: cbor
    };
    
    const calculatedAddress = validatorToAddress('Mainnet', spendingValidator);
    const contractAddress = 'addr1w8hksl7jnqst7e58ypcn4d6k68d6z0rw7hkuch5wad7d07c3zn2nj';
    
    console.log(`   🧮 Calculated address: ${calculatedAddress}`);
    console.log(`   🎯 Expected address: ${contractAddress}`);
    console.log(`   ✅ Address match: ${calculatedAddress === contractAddress ? 'YES! 🎉' : 'No'}`);
    
    if (calculatedAddress === contractAddress) {
      console.log(`\n🎯 FOUND THE CORRECT SCRIPT CBOR!`);
      console.log(`📋 Script Hash: ${expectedHash}`);
      console.log(`📋 Script CBOR: ${cbor}`);
      console.log(`📋 CBOR Length: ${cbor.length} characters`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error testing CBOR: ${error.message}`);
  }
}

// Execute
queryContractScript().catch(console.error);