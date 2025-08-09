/**
 * Search for the actual script CBOR by analyzing the contract address derivation
 */

async function findCorrectScript() {
  const contractAddress = 'addr1w8hksl7jnqst7e58ypcn4d6k68d6z0rw7hkuch5wad7d07c3zn2nj';
  const expectedScriptHash = 'ef687fd29820bf668720713ab756d1dba13c6ef5edcc5e8eeb7cd7fb';
  
  console.log('🔍 Attempting to derive the correct script CBOR...\n');
  
  // The script hash can be extracted from the address
  // Cardano address format: addr1 + script_hash (28 bytes)
  // Let's decode the address to get the script hash directly
  
  try {
    const { validatorToAddress, SpendingValidator } = await import('@lucid-evolution/lucid');
    
    console.log('📍 Address analysis:');
    console.log(`   Contract address: ${contractAddress}`);
    console.log(`   Expected script hash: ${expectedScriptHash}`);
    
    // The issue might be that we're using the wrong PlutusV3 structure
    // Let's try different script structures
    
    const testCbors = [
      // Current CBOR from deployment.json
      '5870010100323232323225333002323232323253330073370e900118041baa0011323322533300a3370e900118059baa0011324a2601a60186ea800452898058009805980600098049baa001163009300a0033008002300700230070013004375400229309b2b2b9a5573aaae795d0aba201',
      
      // Try with PlutusV2 instead of V3
      '590134010100323232323225333002323232323253330073370e900118041baa0011323322533300a3370e900118059baa0011324a2601a60186ea800452898058009805980600098049baa001163009300a0033008002300700230070013004375400229309b2b2b9a5573aaae795d0aba201',
      
      // Try a different format
      '590137590134010100323232323225333002323232323253330073370e900118041baa0011323322533300a3370e900118059baa0011324a2601a60186ea800452898058009805980600098049baa001163009300a0033008002300700230070013004375400229309b2b2b9a5573aaae795d0aba201'
    ];
    
    const plutusVersions = ['PlutusV1', 'PlutusV2', 'PlutusV3'];
    
    for (let i = 0; i < testCbors.length; i++) {
      console.log(`\n🧪 Testing CBOR ${i + 1} with different Plutus versions:`);
      
      for (const version of plutusVersions) {
        try {
          const spendingValidator = {
            type: version,
            script: testCbors[i]
          };
          
          const calculatedAddress = validatorToAddress('Mainnet', spendingValidator);
          console.log(`   ${version}: ${calculatedAddress}`);
          
          if (calculatedAddress === contractAddress) {
            console.log(`\n🎯 FOUND MATCH! 🎉`);
            console.log(`   Plutus Version: ${version}`);
            console.log(`   Script CBOR: ${testCbors[i]}`);
            console.log(`   CBOR Length: ${testCbors[i].length}`);
            return { version, cbor: testCbors[i] };
          }
        } catch (error) {
          console.log(`   ${version}: Error - ${error.message}`);
        }
      }
    }
    
    // If no match found, let's try to query Blockfrost for the script hash directly
    console.log('\n🔍 Querying Blockfrost for script hash information...');
    
    const blockfrostProjectId = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
    
    try {
      const scriptResponse = await fetch(
        `https://cardano-mainnet.blockfrost.io/api/v0/scripts/${expectedScriptHash}`,
        {
          headers: {
            'project_id': blockfrostProjectId
          }
        }
      );
      
      if (scriptResponse.ok) {
        const scriptData = await scriptResponse.json();
        console.log(`📜 Script found on Blockfrost:`);
        console.log(`   Type: ${scriptData.type}`);
        console.log(`   Size: ${scriptData.size} bytes`);
        
        // Get CBOR
        const cborResponse = await fetch(
          `https://cardano-mainnet.blockfrost.io/api/v0/scripts/${expectedScriptHash}/cbor`,
          {
            headers: {
              'project_id': blockfrostProjectId
            }
          }
        );
        
        if (cborResponse.ok) {
          const cborData = await cborResponse.json();
          console.log(`   CBOR: ${cborData.cbor}`);
          
          // Test this CBOR
          for (const version of plutusVersions) {
            try {
              const spendingValidator = {
                type: version,
                script: cborData.cbor
              };
              
              const calculatedAddress = validatorToAddress('Mainnet', spendingValidator);
              console.log(`   Testing with ${version}: ${calculatedAddress}`);
              
              if (calculatedAddress === contractAddress) {
                console.log(`\n🎯 BLOCKFROST CBOR MATCHES! 🎉`);
                console.log(`   Plutus Version: ${version}`);
                console.log(`   Script CBOR: ${cborData.cbor}`);
                return { version, cbor: cborData.cbor };
              }
            } catch (error) {
              console.log(`   ${version} error: ${error.message}`);
            }
          }
        }
      } else {
        console.log(`❌ Script not found on Blockfrost: ${scriptResponse.status}`);
      }
    } catch (blockfrostError) {
      console.log(`❌ Blockfrost query error: ${blockfrostError.message}`);
    }
    
    console.log('\n❌ Could not find matching script CBOR');
    console.log('🔧 Recommendation: Use reference script approach instead');
    
  } catch (error) {
    console.error('❌ Script search error:', error.message);
  }
}

// Alternative approach: Use reference scripts
async function suggestReferenceScriptApproach() {
  console.log('\n🔧 ALTERNATIVE APPROACH: Reference Scripts');
  console.log('='.repeat(50));
  console.log('Instead of attaching the script CBOR directly, we can:');
  console.log('1. Find a UTxO with a reference script');
  console.log('2. Use that UTxO as a reference input');
  console.log('3. This avoids the script hash calculation issue');
  console.log('\nThis is more efficient and avoids the CBOR mismatch problem.');
}

// Execute
async function main() {
  const result = await findCorrectScript();
  
  if (!result) {
    await suggestReferenceScriptApproach();
  }
}

main().catch(console.error);