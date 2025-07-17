#!/usr/bin/env node
/**
 * Strike Finance API Test with Blockfrost Integration
 * Tests the Strike Finance API using a real funded wallet address from Blockfrost
 */

const https = require('https');

async function testStrikeAPI() {
  console.log('🔍 STRIKE FINANCE CONTRACT DISCOVERY WITH BLOCKFROST');
  console.log('=' .repeat(60));
  console.log('📅 Started:', new Date().toISOString());
  console.log('');

  // Try multiple known funded addresses
  const testAddresses = [
    'addr1qyzvhj32j0az5hvun734kdm9h537eqr7t0cye5jhvadgryc48y340k9sas7y9493jd0eznjc4337sjrz29v2xx9x0aaq4vwyxh', // Our test wallet
    'addr1qxtkdjl87894tg6juz20jzyjqy3uyn02pr9xtq7mlh0gm2ss5dpkcny95dktp5qmyyrx82t68sge4m94qwxyrfr8f86qh5unyc', // Another test wallet
    'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf'  // Documentation example
  ];

  let testAddress = null;
  
  // First, let's find an address with UTxOs using Blockfrost
  console.log('🔍 Step 1: Finding funded address with Blockfrost...');

  const blockfrostProjectId = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';

  for (const address of testAddresses) {
    console.log('📍 Checking address:', address.substring(0, 20) + '...');

    try {
      const utxoResponse = await fetch(`https://cardano-mainnet.blockfrost.io/api/v0/addresses/${address}/utxos`, {
        headers: {
          'project_id': blockfrostProjectId
        }
      });

      if (utxoResponse.ok) {
        const utxos = await utxoResponse.json();
        console.log('   UTxOs found:', utxos.length);

        if (utxos.length > 0) {
          const totalAda = utxos.reduce((sum, utxo) => {
            const lovelace = utxo.amount.find(a => a.unit === 'lovelace');
            return sum + (lovelace ? parseInt(lovelace.quantity) : 0);
          }, 0);
          console.log('   💰 Balance:', (totalAda / 1000000).toFixed(2), 'ADA');

          if (totalAda >= 50000000) { // At least 50 ADA
            testAddress = address;
            console.log('✅ Selected address with sufficient balance');
            break;
          }
        }
      } else {
        console.log('   ❌ Blockfrost error:', utxoResponse.status);
      }
    } catch (error) {
      console.log('   ❌ Check failed:', error.message);
    }
  }

  if (!testAddress) {
    console.log('⚠️  No funded address found, using first address anyway...');
    testAddress = testAddresses[0];
  }

  // Try both Long and Short positions to get CBOR data
  const testScenarios = [
    {
      name: 'Short Position (Market Balance Friendly)',
      position: 'Short',
      collateralAmount: 50,
      leverage: 2
    },
    {
      name: 'Long Position (Backup)',
      position: 'Long',
      collateralAmount: 25,
      leverage: 1.5
    }
  ];

  console.log('');
  console.log('📊 Step 2: Testing Strike Finance API with multiple scenarios...');

  let successfulCbor = null;

  for (const scenario of testScenarios) {
    const requestData = {
      request: {
        address: testAddress,
        asset: { policyId: '', assetName: '' },
        collateralAmount: scenario.collateralAmount,
        leverage: scenario.leverage,
        position: scenario.position,
        enteredPositionTime: Date.now()
      }
    };

    console.log('');
    console.log('🎯 Testing:', scenario.name);
    console.log('📋 Request:', JSON.stringify(requestData, null, 2));

    try {
      const response = await fetch('https://app.strikefinance.org/api/perpetuals/openPosition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Strike-Contract-Discovery/1.0'
        },
        body: JSON.stringify(requestData)
      });

      console.log('📋 Response Status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response received successfully');

        if (data.cbor) {
          console.log('📦 CBOR Data Found:');
          console.log('   Length:', data.cbor.length, 'bytes');
          console.log('   Starts with:', data.cbor.substring(0, 20));
          console.log('   Ends with:', data.cbor.substring(data.cbor.length - 20));

          successfulCbor = data.cbor;

          // Save CBOR for further analysis
          const fs = require('fs');
          fs.writeFileSync(`./strike-cbor-${scenario.position.toLowerCase()}.hex`, data.cbor);
          console.log('💾 CBOR saved to:', `strike-cbor-${scenario.position.toLowerCase()}.hex`);

          break; // Success! Exit the loop

        } else {
          console.log('❌ No CBOR data in response');
          console.log('📋 Response:', JSON.stringify(data, null, 2));
        }
      } else {
        const errorText = await response.text();
        console.log('❌ API Error:', errorText);
      }

    } catch (error) {
      console.log('❌ Request failed:', error.message);
    }
  }

  // Analyze the successful CBOR if we got one
  if (successfulCbor) {
    console.log('');
    console.log('🔬 Step 3: Analyzing CBOR for Strike Finance contracts...');
    await analyzeCBOR(successfulCbor);
  } else {
    console.log('');
    console.log('❌ No successful CBOR data obtained from any scenario');
  }
  
  console.log('');
  console.log('='.repeat(50));
}

async function analyzeCBOR(cborHex) {
  console.log('🔬 CBOR ANALYSIS:');
  
  try {
    // Try to load CSL
    const CSL = await import('@emurgo/cardano-serialization-lib-nodejs');
    console.log('✅ Cardano Serialization Library loaded');
    
    // Parse transaction
    const tx = CSL.Transaction.from_bytes(Buffer.from(cborHex, 'hex'));
    const body = tx.body();
    const outputs = body.outputs();
    
    console.log('📊 Transaction Analysis:');
    console.log('   Inputs:', body.inputs().len());
    console.log('   Outputs:', outputs.len());
    console.log('   Fee:', body.fee().to_str());

    // Check for minting/burning
    const mint = body.mint();
    if (mint) {
      console.log('   Mint/Burn: Found minting policies');
    }

    // Check for scripts in witness set
    const witnessSet = tx.witness_set();
    if (witnessSet.native_scripts()) {
      console.log('   Native Scripts:', witnessSet.native_scripts().len());
    }
    if (witnessSet.plutus_scripts()) {
      console.log('   Plutus Scripts:', witnessSet.plutus_scripts().len());
    }

    console.log('');
    console.log('🎯 INPUT ANALYSIS (looking for script references):');

    const inputs = body.inputs();
    for (let i = 0; i < inputs.len(); i++) {
      const input = inputs.get(i);
      const txHash = Buffer.from(input.transaction_id().to_bytes()).toString('hex');
      const outputIndex = input.index();
      console.log(`\n   Input ${i + 1}:`);
      console.log('     Tx Hash:', txHash);
      console.log('     Output Index:', outputIndex);
    }

    console.log('');
    console.log('🎯 OUTPUT ANALYSIS:');

    const contracts = [];
    
    for (let i = 0; i < outputs.len(); i++) {
      const output = outputs.get(i);
      const address = output.address();
      const value = output.amount();
      
      console.log(`\n   Output ${i + 1}:`);
      console.log('     Address:', address.to_bech32());
      console.log('     Value:', value.coin().to_str(), 'lovelace');

      // Check if this is a script address
      if (address.kind() === CSL.AddressKind.Script) {
        const scriptHash = Buffer.from(
          address.as_script().script_hash().to_bytes()
        ).toString('hex');

        console.log('     🎯 SCRIPT ADDRESS FOUND!');
        console.log('     Script Hash:', scriptHash);

        contracts.push({
          name: `strike-contract-${i + 1}`,
          scriptHash,
          address: address.to_bech32(),
          outputIndex: i,
          value: value.coin().to_str()
        });
      }

      // Check for datum hash (indicates script interaction)
      const datumHash = output.datum();
      if (datumHash && datumHash.kind() === 0) { // DataHash
        console.log('     📋 Datum Hash Found:', Buffer.from(datumHash.as_data_hash().to_bytes()).toString('hex'));
      }

      // Check for inline datum
      if (datumHash && datumHash.kind() === 1) { // Data
        console.log('     📋 Inline Datum Found');
      }

      // Check for script reference
      const scriptRef = output.script_ref();
      if (scriptRef) {
        console.log('     📜 Script Reference Found!');
        if (scriptRef.kind() === 0) { // Native script
          console.log('     Type: Native Script');
        } else { // Plutus script
          console.log('     Type: Plutus Script');
          const plutusScript = scriptRef.as_plutus_script();
          const scriptHash = Buffer.from(plutusScript.hash().to_bytes()).toString('hex');
          console.log('     Script Hash:', scriptHash);

          contracts.push({
            name: `strike-reference-script-${i + 1}`,
            scriptHash,
            address: address.to_bech32(),
            outputIndex: i,
            value: value.coin().to_str(),
            type: 'reference-script'
          });
        }
      }
    }
    
    if (contracts.length > 0) {
      console.log('');
      console.log('🎉 DISCOVERED STRIKE FINANCE CONTRACTS:');
      contracts.forEach((contract, index) => {
        console.log(`\n${index + 1}. ${contract.name.toUpperCase()}`);
        console.log(`   Hash: ${contract.scriptHash}`);
        console.log(`   Address: ${contract.address}`);
        console.log(`   Output: ${contract.outputIndex}`);
        console.log(`   Value: ${contract.value} lovelace`);
      });
      
      // Save contracts to file
      const fs = require('fs');
      const report = {
        timestamp: new Date().toISOString(),
        totalContracts: contracts.length,
        contracts: contracts,
        source: 'strike-api-cbor-analysis'
      };
      
      fs.writeFileSync('./strike-contracts-discovered.json', JSON.stringify(report, null, 2));
      console.log('\n💾 Contract discovery saved to: strike-contracts-discovered.json');
      
    } else {
      console.log('\n⚠️  No script addresses found in transaction outputs');
    }
    
  } catch (error) {
    console.log('❌ CBOR analysis failed:', error.message);
    console.log('📋 Raw CBOR (first 200 chars):', cborHex.substring(0, 200));
  }
}

// Run the test
testStrikeAPI().catch(console.error);
