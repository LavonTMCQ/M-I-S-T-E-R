/**
 * Try to query the script directly by the exact hash Lucid is expecting
 */

async function queryScriptDirectly() {
  const expectedHash = 'ef687fd29820bf668720713ab756d1dba13c6ef5edcc5e8eeb7cd7fb';
  const blockfrostProjectId = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
  
  console.log('🔍 DIRECT SCRIPT QUERY');
  console.log('='.repeat(40));
  console.log(`Script Hash: ${expectedHash}`);
  console.log('');
  
  try {
    // 1. Get script info
    console.log('📋 Fetching script details...');
    const infoResponse = await fetch(
      `https://cardano-mainnet.blockfrost.io/api/v0/scripts/${expectedHash}`,
      {
        headers: {
          'project_id': blockfrostProjectId
        }
      }
    );
    
    if (infoResponse.ok) {
      const scriptInfo = await infoResponse.json();
      console.log('✅ Script info found:');
      console.log(`   Type: ${scriptInfo.type}`);
      console.log(`   Serialized Size: ${scriptInfo.serialised_size || 'Unknown'}`);
      
      // 2. Get script CBOR
      console.log('\n📦 Fetching script CBOR...');
      const cborResponse = await fetch(
        `https://cardano-mainnet.blockfrost.io/api/v0/scripts/${expectedHash}/cbor`,
        {
          headers: {
            'project_id': blockfrostProjectId
          }
        }
      );
      
      if (cborResponse.ok) {
        const cborData = await cborResponse.json();
        console.log(`✅ SCRIPT CBOR FOUND: ${cborData.cbor}`);
        
        // Verify this CBOR produces the correct hash
        const { Lucid, Blockfrost, validatorToScriptHash } = await import('@lucid-evolution/lucid');
        
        const provider = new Blockfrost('https://cardano-mainnet.blockfrost.io/api/v0', blockfrostProjectId);
        const lucid = await Lucid(provider, 'Mainnet');
        
        const validator = {
          type: scriptInfo.type === 'plutusV3' ? 'PlutusV3' : scriptInfo.type === 'plutusV2' ? 'PlutusV2' : 'PlutusV1',
          script: cborData.cbor
        };
        
        const calculatedHash = validatorToScriptHash(validator);
        console.log(`\n🔍 Verification:`);
        console.log(`   Expected Hash:  ${expectedHash}`);
        console.log(`   Calculated Hash: ${calculatedHash}`);
        
        if (calculatedHash === expectedHash) {
          console.log('✅ PERFECT MATCH! This is the correct script CBOR');
          return {
            cbor: cborData.cbor,
            type: validator.type
          };
        } else {
          console.log('❌ Hash mismatch - something is wrong');
        }
        
      } else {
        console.log(`❌ CBOR fetch failed: ${cborResponse.status}`);
        const errorText = await cborResponse.text();
        console.log(`   Error: ${errorText}`);
      }
      
    } else {
      console.log(`❌ Script info fetch failed: ${infoResponse.status}`);
      const errorText = await infoResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  }
  
  console.log('\n💡 If script not found in Blockfrost, it might be:');
  console.log('   1. A reference script not indexed yet');
  console.log('   2. A script only in witness sets');
  console.log('   3. A malformed address (not actually a script address)');
}

queryScriptDirectly();