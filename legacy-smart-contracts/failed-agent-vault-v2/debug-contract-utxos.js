/**
 * Debug the actual contract UTxOs to understand what we're dealing with
 */

async function debugContractUtxos() {
  const contractAddress = 'addr1w8hksl7jnqst7e58ypcn4d6k68d6z0rw7hkuch5wad7d07c3zn2nj';
  const blockfrostProjectId = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
  
  console.log('🔍 DEBUGGING CONTRACT UTXOS');
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log('='.repeat(60));
  
  try {
    // Query UTxOs at the contract address
    const response = await fetch(
      `https://cardano-mainnet.blockfrost.io/api/v0/addresses/${contractAddress}/utxos`,
      {
        headers: {
          'project_id': blockfrostProjectId
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Blockfrost error: ${response.status}`);
    }
    
    const utxos = await response.json();
    console.log(`📦 Found ${utxos.length} UTxOs:\n`);
    
    let totalAda = 0;
    
    for (const [index, utxo] of utxos.entries()) {
      const adaAmount = Number(utxo.amount.find(a => a.unit === 'lovelace')?.quantity || 0) / 1_000_000;
      totalAda += adaAmount;
      
      console.log(`UTxO ${index + 1}:`);
      console.log(`   TX: ${utxo.tx_hash}#${utxo.output_index}`);
      console.log(`   ADA: ${adaAmount}`);
      console.log(`   Datum Hash: ${utxo.data_hash || 'None'}`);
      console.log(`   Inline Datum: ${utxo.inline_datum ? 'Yes' : 'No'}`);
      console.log(`   Script Hash: ${utxo.script_hash || 'None'}`);
      console.log(`   Reference Script: ${utxo.reference_script_hash || 'None'}`);
      
      // If there's inline datum, show it
      if (utxo.inline_datum) {
        console.log(`   Inline Datum CBOR: ${utxo.inline_datum}`);
      }
      
      console.log('');
    }
    
    console.log(`💰 TOTAL ADA IN CONTRACT: ${totalAda}`);
    
    // Check if UTxOs have the expected script hash
    const expectedScriptHash = 'ef687fd29820bf668720713ab756d1dba13c6ef5edcc5e8eeb7cd7fb';
    
    console.log('\n🔍 SCRIPT ANALYSIS:');
    console.log(`   Expected Script Hash: ${expectedScriptHash}`);
    
    const utxosWithScript = utxos.filter(u => u.script_hash === expectedScriptHash);
    const utxosWithRefScript = utxos.filter(u => u.reference_script_hash);
    
    console.log(`   UTxOs with expected script: ${utxosWithScript.length}`);
    console.log(`   UTxOs with reference script: ${utxosWithRefScript.length}`);
    
    if (utxosWithRefScript.length > 0) {
      console.log(`   Reference script hashes found:`);
      utxosWithRefScript.forEach((u, i) => {
        console.log(`     ${i + 1}. ${u.reference_script_hash}`);
      });
    }
    
    // The issue might be that the UTxOs don't have the script hash we expect
    if (utxosWithScript.length === 0 && utxosWithRefScript.length === 0) {
      console.log('\n❌ PROBLEM IDENTIFIED:');
      console.log('   No UTxOs have the expected script hash!');
      console.log('   This means our script CBOR is wrong.');
      console.log('   We need to find the actual script that controls these UTxOs.');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

// Run the debug
debugContractUtxos();