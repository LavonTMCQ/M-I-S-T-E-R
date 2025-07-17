#!/usr/bin/env node
/**
 * Advanced CBOR Analysis for Strike Finance Contract Discovery
 * Analyzes the CBOR hex data to extract script hashes and contract addresses
 */

const fs = require('fs');

async function analyzeCBOR() {
  console.log('🔬 ADVANCED STRIKE FINANCE CBOR ANALYSIS');
  console.log('=' .repeat(50));
  
  // Read the CBOR file
  let cborHex;
  try {
    cborHex = fs.readFileSync('./strike-cbor-short.hex', 'utf8');
    console.log('📦 CBOR loaded:', cborHex.length, 'bytes');
  } catch (error) {
    console.log('❌ Could not read CBOR file. Run test-strike-api.cjs first.');
    return;
  }
  
  try {
    // Load CSL
    const CSL = await import('@emurgo/cardano-serialization-lib-nodejs');
    console.log('✅ CSL loaded');
    
    // Parse transaction
    const tx = CSL.Transaction.from_bytes(Buffer.from(cborHex, 'hex'));
    const body = tx.body();
    const witnessSet = tx.witness_set();
    
    console.log('');
    console.log('📊 TRANSACTION STRUCTURE:');
    console.log('   Inputs:', body.inputs().len());
    console.log('   Outputs:', body.outputs().len());
    console.log('   Fee:', body.fee().to_str(), 'lovelace');
    
    // Analyze minting
    const mint = body.mint();
    if (mint) {
      console.log('   🏭 MINTING DETECTED!');
      const assets = mint.keys();
      for (let i = 0; i < assets.len(); i++) {
        const policyId = Buffer.from(assets.get(i).to_bytes()).toString('hex');
        console.log('     Policy ID:', policyId);
      }
    }
    
    // Analyze witness set for scripts
    console.log('');
    console.log('🔍 WITNESS SET ANALYSIS:');
    
    const contracts = [];
    
    // Check for Plutus scripts
    const plutusScripts = witnessSet.plutus_scripts();
    if (plutusScripts) {
      console.log('   📜 Plutus Scripts Found:', plutusScripts.len());
      
      for (let i = 0; i < plutusScripts.len(); i++) {
        const script = plutusScripts.get(i);
        const scriptHash = Buffer.from(script.hash().to_bytes()).toString('hex');
        
        console.log(`\n   Script ${i + 1}:`);
        console.log('     Hash:', scriptHash);
        console.log('     Language:', script.language_version().kind());
        console.log('     Size:', script.bytes().length, 'bytes');
        
        // Generate script address
        const scriptAddr = CSL.BaseAddress.new(
          CSL.NetworkInfo.mainnet().network_id(),
          CSL.StakeCredential.from_scripthash(script.hash()),
          CSL.StakeCredential.from_keyhash(CSL.Ed25519KeyHash.from_bytes(Buffer.alloc(28, 0)))
        );
        
        contracts.push({
          name: `strike-plutus-script-${i + 1}`,
          scriptHash,
          address: scriptAddr.to_address().to_bech32(),
          type: 'plutus-script',
          language: script.language_version().kind(),
          size: script.bytes().length
        });
      }
    }
    
    // Check for native scripts
    const nativeScripts = witnessSet.native_scripts();
    if (nativeScripts) {
      console.log('   📋 Native Scripts Found:', nativeScripts.len());
      
      for (let i = 0; i < nativeScripts.len(); i++) {
        const script = nativeScripts.get(i);
        const scriptHash = Buffer.from(script.hash().to_bytes()).toString('hex');
        
        console.log(`\n   Native Script ${i + 1}:`);
        console.log('     Hash:', scriptHash);
        
        contracts.push({
          name: `strike-native-script-${i + 1}`,
          scriptHash,
          type: 'native-script'
        });
      }
    }
    
    // Analyze outputs for script addresses and datum hashes
    console.log('');
    console.log('🎯 OUTPUT ANALYSIS:');
    
    const outputs = body.outputs();
    for (let i = 0; i < outputs.len(); i++) {
      const output = outputs.get(i);
      const address = output.address();
      const amount = output.amount();
      
      console.log(`\n   Output ${i + 1}:`);
      console.log('     Address:', address.to_bech32());
      console.log('     ADA:', (parseInt(amount.coin().to_str()) / 1000000).toFixed(6));
      
      // Check for multi-assets (tokens)
      const multiasset = amount.multiasset();
      if (multiasset) {
        console.log('     🪙 Tokens Found!');
        const policies = multiasset.keys();
        for (let j = 0; j < policies.len(); j++) {
          const policyId = Buffer.from(policies.get(j).to_bytes()).toString('hex');
          const assets = multiasset.get(policies.get(j));
          const assetNames = assets.keys();
          
          for (let k = 0; k < assetNames.len(); k++) {
            const assetName = Buffer.from(assetNames.get(k).name()).toString('hex');
            const quantity = assets.get(assetNames.get(k)).to_str();
            console.log(`       Policy: ${policyId}`);
            console.log(`       Asset: ${assetName}`);
            console.log(`       Quantity: ${quantity}`);
          }
        }
      }
      
      // Check if it's a script address
      if (address.kind() === CSL.AddressKind.Script) {
        const scriptHash = Buffer.from(
          address.as_script().script_hash().to_bytes()
        ).toString('hex');
        
        console.log('     🎯 SCRIPT ADDRESS!');
        console.log('     Script Hash:', scriptHash);
        
        contracts.push({
          name: `strike-output-script-${i + 1}`,
          scriptHash,
          address: address.to_bech32(),
          type: 'output-script',
          value: amount.coin().to_str()
        });
      }
    }
    
    // Generate final report
    console.log('');
    console.log('🎉 STRIKE FINANCE CONTRACT DISCOVERY RESULTS:');
    console.log('=' .repeat(50));
    
    if (contracts.length > 0) {
      console.log(`📊 Total Contracts Found: ${contracts.length}`);
      
      contracts.forEach((contract, index) => {
        console.log(`\n${index + 1}. ${contract.name.toUpperCase()}`);
        console.log(`   Hash: ${contract.scriptHash}`);
        console.log(`   Type: ${contract.type}`);
        if (contract.address) console.log(`   Address: ${contract.address}`);
        if (contract.language !== undefined) console.log(`   Language: Plutus V${contract.language + 1}`);
        if (contract.size) console.log(`   Size: ${contract.size} bytes`);
        if (contract.value) console.log(`   Value: ${contract.value} lovelace`);
      });
      
      // Save results
      const report = {
        timestamp: new Date().toISOString(),
        source: 'strike-finance-cbor-analysis',
        totalContracts: contracts.length,
        contracts: contracts,
        cborLength: cborHex.length,
        transactionInfo: {
          inputs: body.inputs().len(),
          outputs: body.outputs().len(),
          fee: body.fee().to_str(),
          hasMinting: !!mint,
          hasPlutusScripts: !!(plutusScripts && plutusScripts.len() > 0),
          hasNativeScripts: !!(nativeScripts && nativeScripts.len() > 0)
        }
      };
      
      fs.writeFileSync('./strike-contracts-final-report.json', JSON.stringify(report, null, 2));
      console.log('\n💾 Final report saved to: strike-contracts-final-report.json');
      
      // Generate Aiken contract update
      console.log('\n🔧 AIKEN CONTRACT UPDATE:');
      console.log('Copy these script hashes to your agent_vault_strike.ak:');
      console.log('');
      console.log('const STRIKE_CONTRACT_HASHES: List<ByteArray> = [');
      contracts.forEach(contract => {
        console.log(`  "${contract.scriptHash}", // ${contract.name}`);
      });
      console.log(']');
      
    } else {
      console.log('❌ No script contracts found in transaction');
      console.log('💡 This might indicate Strike Finance uses a different architecture');
      console.log('💡 Consider analyzing the minting policies or reference inputs');
    }
    
  } catch (error) {
    console.log('❌ Analysis failed:', error.message);
    console.log('📋 Error details:', error);
  }
}

// Run analysis
analyzeCBOR().catch(console.error);
