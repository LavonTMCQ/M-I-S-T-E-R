/**
 * Verify if our script CBOR produces the expected script hash
 */

async function verifyScriptHash() {
  const expectedHash = 'ef687fd29820bf668720713ab756d1dba13c6ef5edcc5e8eeb7cd7fb';
  // CBOR from the ACTUAL deployment file
  const scriptCbor = '5870010100323232323225333002323232323253330073370e900118041baa0011323322533300a3370e900018059baa0011324a2601a60186ea800452898058009805980600098049baa001163009300a0033008002300700230070013004375400229309b2b2b9a5573aaae795d0aba201';
  
  console.log('🔍 SCRIPT HASH VERIFICATION');
  console.log('='.repeat(50));
  console.log(`Expected Hash: ${expectedHash}`);
  console.log(`Script CBOR: ${scriptCbor}`);
  console.log('');
  
  try {
    // Try to calculate script hash using Lucid
    const { Lucid, Blockfrost, SpendingValidator } = await import('@lucid-evolution/lucid');
    
    const provider = new Blockfrost('https://cardano-mainnet.blockfrost.io/api/v0', 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu');
    const lucid = await Lucid(provider, 'Mainnet');
    
    const validator = {
      type: 'PlutusV3',
      script: scriptCbor
    };
    
    // Calculate script hash using Lucid Evolution method
    const { validatorToScriptHash } = await import('@lucid-evolution/lucid');
    const calculatedHash = validatorToScriptHash(validator);
    console.log(`Calculated Hash: ${calculatedHash}`);
    
    if (calculatedHash === expectedHash) {
      console.log('✅ MATCH! Script CBOR is correct');
    } else {
      console.log('❌ MISMATCH! Script CBOR is wrong');
      console.log('');
      console.log('🔄 Trying to find the right script...');
      
      // Try to get script from address
      try {
        const targetAddress = 'addr1w8hksl7jnqst7e58ypcn4d6k68d6z0rw7hkuch5wad7d07c3zn2nj';
        console.log(`🔍 Checking script at address: ${targetAddress}`);
        
        // Query Blockfrost for script details
        const response = await fetch(
          `https://cardano-mainnet.blockfrost.io/api/v0/scripts/${expectedHash}`,
          {
            headers: {
              'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
            }
          }
        );
        
        if (response.ok) {
          const scriptDetails = await response.json();
          console.log('📋 Script found on Blockfrost:', scriptDetails);
          
          // Try to get the actual CBOR
          const cborResponse = await fetch(
            `https://cardano-mainnet.blockfrost.io/api/v0/scripts/${expectedHash}/cbor`,
            {
              headers: {
                'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
              }
            }
          );
          
          if (cborResponse.ok) {
            const cborData = await cborResponse.json();
            console.log('🎯 CORRECT SCRIPT CBOR:', cborData.cbor);
          }
        } else {
          console.log('❌ Script not found on Blockfrost');
        }
      } catch (scriptError) {
        console.log('❌ Error fetching script details:', scriptError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
  }
}

verifyScriptHash();