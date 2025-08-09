/**
 * Analyze the address structure to see if it's actually a script address
 */

async function analyzeAddress() {
  const targetAddress = 'addr1w8hksl7jnqst7e58ypcn4d6k68d6z0rw7hkuch5wad7d07c3zn2nj';
  
  console.log('🔍 ADDRESS STRUCTURE ANALYSIS');
  console.log('='.repeat(50));
  console.log(`Address: ${targetAddress}`);
  console.log('');
  
  try {
    // Try to use Lucid to decode the address
    const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');
    
    const provider = new Blockfrost('https://cardano-mainnet.blockfrost.io/api/v0', 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu');
    const lucid = await Lucid(provider, 'Mainnet');
    
    // Analyze address prefix
    console.log('📋 Address Format Analysis:');
    console.log(`   Prefix: ${targetAddress.slice(0, 5)} (${targetAddress.slice(0, 5) === 'addr1' ? 'Mainnet' : 'Unknown'})`);
    console.log(`   Type indicator: ${targetAddress.slice(5, 6)} (${targetAddress.slice(5, 6) === 'w' ? 'Script address' : targetAddress.slice(5, 6) === 'q' ? 'Payment address' : 'Unknown'})`);
    
    if (targetAddress.slice(5, 6) === 'w') {
      console.log('✅ Confirmed: This IS a script address format');
      console.log('');
      
      // Try to extract the script hash manually
      console.log('🔍 Attempting manual script hash extraction...');
      
      try {
        // For testing - let's try to build a transaction with a dummy script
        // to see if we can bypass Lucid's validation
        
        console.log('🧪 Testing if we can override Lucid validation...');
        
        // Create a dummy always-succeed script with PlutusV3
        const dummyScript = '590049590046010000323232323232323232323225333573466e1d20000021003133573466e1d2000002100323232323232323232323225333573466e1d20000021003133573466e1d200000210032323232323232323232323225333573466e1d200000210031';
        
        const { SpendingValidator, validatorToScriptHash, validatorToAddress } = await import('@lucid-evolution/lucid');
        
        const validator = {
          type: 'PlutusV3',
          script: dummyScript
        };
        
        const scriptHash = validatorToScriptHash(validator);
        const scriptAddress = validatorToAddress('Mainnet', validator);
        
        console.log(`   Dummy script hash: ${scriptHash}`);
        console.log(`   Dummy script address: ${scriptAddress}`);
        
        // Now the key question: can we build a different validator that produces our target address?
        console.log('\n🎯 Key Question: What script produces our target address?');
        
        // The fact that the script hash doesn't exist in Blockfrost suggests:
        // 1. The address was generated incorrectly
        // 2. The script was never actually deployed
        // 3. There's a fundamental mismatch between the address and the actual UTxOs
        
        console.log('\n💡 HYPOTHESIS: These UTxOs might be from a failed deployment');
        console.log('   - Address was calculated but script never deployed');
        console.log('   - UTxOs were sent to the address anyway');
        console.log('   - Now they\'re "stuck" because the script doesn\'t exist');
        
      } catch (buildError) {
        console.log(`❌ Build test failed: ${buildError.message}`);
      }
      
    } else {
      console.log('❌ This is NOT a script address - it\'s a regular payment address!');
      console.log('🎉 This means we should be able to spend the UTxOs normally!');
    }
    
  } catch (error) {
    console.error('❌ Address analysis failed:', error.message);
  }
  
  // Final attempt: Check what Blockfrost thinks about this address
  console.log('\n🔍 Blockfrost Address Analysis:');
  try {
    const response = await fetch(
      `https://cardano-mainnet.blockfrost.io/api/v0/addresses/${targetAddress}`,
      {
        headers: {
          'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
        }
      }
    );
    
    if (response.ok) {
      const addressInfo = await response.json();
      console.log('📋 Blockfrost says:');
      console.log(`   Address type: ${addressInfo.type || 'Unknown'}`);
      console.log(`   Script: ${addressInfo.script ? 'Yes' : 'No'}`);
      console.log(`   Total received: ${Number(addressInfo.received_sum.find(a => a.unit === 'lovelace')?.quantity || 0) / 1_000_000} ADA`);
    } else {
      console.log(`❌ Blockfrost address query failed: ${response.status}`);
    }
  } catch (addressError) {
    console.log(`❌ Address query error: ${addressError.message}`);
  }
}

analyzeAddress();