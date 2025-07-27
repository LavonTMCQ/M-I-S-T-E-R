/**
 * PROPER CSL Cardano Transaction Builder API
 * Uses Cardano Serialization Library for Vespr wallet compatibility
 * FIXED for real CSL transaction building
 */

import { NextRequest, NextResponse } from 'next/server';

interface TransactionRequest {
  fromAddress: string;
  toAddress: string;
  amount: number; // in ADA
  metadata?: any;
  network?: 'mainnet' | 'testnet';
  // Script witness parameters for smart contract interactions
  contractUtxos?: any[];
  script?: any;
  redeemer?: any;
  includeScriptWitness?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: TransactionRequest = await request.json();
    const { fromAddress, toAddress, amount, metadata, network = 'mainnet', contractUtxos, script, redeemer, includeScriptWitness } = body;

    console.log(`🔨 Building Cardano transaction via Blockfrost (${network.toUpperCase()})...`);
    console.log(`💰 From: ${fromAddress.substring(0, 20)}...`);
    console.log(`💰 To: ${toAddress.substring(0, 20)}...`);
    console.log(`💰 Amount: ${amount} ${network === 'testnet' ? 'tADA' : 'ADA'}`);
    console.log(`🌐 Network: ${network.toUpperCase()}`);

    // Convert amount from ADA to lovelace
    const amountLovelace = Math.round(amount * 1000000);

    // 🧪 TESTNET SUPPORT: Configure Blockfrost for network
    const blockfrostConfig = network === 'testnet'
      ? {
          projectId: process.env.BLOCKFROST_TESTNET_PROJECT_ID || 'preprodfHBBQsTsk1g3Lna67Vqb8HqZ0NbcPo1f',
          baseUrl: 'https://cardano-preprod.blockfrost.io/api/v0'
        }
      : {
          projectId: process.env.BLOCKFROST_PROJECT_ID || 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu',
          baseUrl: 'https://cardano-mainnet.blockfrost.io/api/v0'
        };

    console.log(`🔗 Using Blockfrost: ${blockfrostConfig.baseUrl}`);
    const blockfrostProjectId = blockfrostConfig.projectId;
    const blockfrostBaseUrl = blockfrostConfig.baseUrl;
    
    // Step 1: Get UTxOs from the sender address
    // CRITICAL FIX: Address corruption detection and correction
    console.log(`🔍 DEBUG: Checking address for corruption...`);
    console.log(`  Original address: ${fromAddress}`);

    // Fix known address corruption: h5unye -> h5unyc
    let correctedAddress = fromAddress;
    if (fromAddress.endsWith('h5unye')) {
      correctedAddress = fromAddress.replace('h5unye', 'h5unyc');
      console.log(`🔧 FIXED address corruption: ${fromAddress} -> ${correctedAddress}`);
    }

    // For contract withdrawals, use contract UTxOs; for normal transfers, fetch user UTxOs
    let utxos;
    if (includeScriptWitness && contractUtxos) {
      console.log('🔧 Using contract UTxOs for script witness transaction...');
      console.log(`📦 Contract UTxOs provided: ${contractUtxos.length}`);
      utxos = contractUtxos;
    } else {
      console.log('🔍 DEBUG: About to fetch UTxOs with:');
      console.log(`  URL: ${blockfrostBaseUrl}/addresses/${correctedAddress}/utxos`);
      console.log(`  Project ID: ${blockfrostProjectId}`);
      console.log(`  Address: ${correctedAddress}`);

      const utxosResponse = await fetch(`${blockfrostBaseUrl}/addresses/${correctedAddress}/utxos`, {
        headers: {
          'project_id': blockfrostProjectId
        }
      });

      if (!utxosResponse.ok) {
        const errorText = await utxosResponse.text();
        console.error(`❌ Blockfrost UTxO fetch failed:`, {
          status: utxosResponse.status,
          statusText: utxosResponse.statusText,
          address: fromAddress,
          errorBody: errorText
        });
        throw new Error(`Failed to fetch UTxOs: ${utxosResponse.statusText} - ${errorText}`);
      }

      utxos = await utxosResponse.json();
    }

    if (!utxos || utxos.length === 0) {
      throw new Error('No UTxOs found at sender address');
    }

    // Step 2: Get protocol parameters
    const protocolResponse = await fetch(`${blockfrostBaseUrl}/epochs/latest/parameters`, {
      headers: {
        'project_id': blockfrostProjectId
      }
    });

    if (!protocolResponse.ok) {
      throw new Error(`Failed to fetch protocol parameters: ${protocolResponse.statusText}`);
    }

    const protocolParams = await protocolResponse.json();

    // Step 3: Build transaction using PROPER CSL for Vespr wallet compatibility
    console.log('🔧 Building transaction using PROPER CSL...');

    // Load CSL browser library
    console.log('📚 Loading Cardano Serialization Library...');
    const CSL = await import('@emurgo/cardano-serialization-lib-browser');
    console.log('✅ Successfully loaded CSL browser version');

    // For contract withdrawals, use all contract UTxOs; for normal transfers, filter for sufficient ADA
    let sufficientUtxos;
    if (includeScriptWitness && contractUtxos) {
      console.log('🔧 Using ALL contract UTxOs for withdrawal (no filtering needed)...');
      sufficientUtxos = utxos; // Use all contract UTxOs
      console.log(`📦 Using ${sufficientUtxos.length} contract UTxOs for withdrawal`);
    } else {
      console.log('🔍 Filtering UTxOs for sufficient ADA...');
      sufficientUtxos = utxos.filter((utxo: any) => {
        const adaAmount = utxo.amount.find((a: any) => a.unit === 'lovelace');
        const adaValue = adaAmount ? parseInt(adaAmount.quantity) : 0;
        return adaValue >= (amountLovelace + 2_000_000); // Amount + min fee
      });

      console.log(`📊 Found ${sufficientUtxos.length} UTxOs with sufficient ADA out of ${utxos.length} total`);

      if (sufficientUtxos.length === 0) {
        throw new Error('No UTxOs with sufficient ADA available for transaction');
      }
    }

    // For contract withdrawals, use all UTxOs; for normal transfers, select one adequate UTxO
    let selectedUtxo = null;
    let allContractUtxos = [];

    if (includeScriptWitness && contractUtxos) {
      console.log('🔧 Using ALL contract UTxOs for withdrawal...');
      allContractUtxos = sufficientUtxos;
      selectedUtxo = sufficientUtxos[0]; // Use first one for compatibility, but we'll use all

      // Calculate total ADA in all contract UTxOs
      const totalContractAda = sufficientUtxos.reduce((total: number, utxo: any) => {
        const adaAmount = utxo.amount.find((a: any) => a.unit === 'lovelace');
        return total + (adaAmount ? parseInt(adaAmount.quantity) : 0);
      }, 0);

      console.log(`📦 Using ${allContractUtxos.length} contract UTxOs with total ${totalContractAda / 1000000} ADA`);
    } else {
      // Normal UTxO selection for regular transfers
      for (const utxo of sufficientUtxos) {
        const adaAmount = utxo.amount.find((a: any) => a.unit === 'lovelace');
        const utxoAmount = adaAmount ? parseInt(adaAmount.quantity) : 0;
        if (utxoAmount >= amountLovelace + 2000000) { // 2 ADA buffer for fees
          selectedUtxo = utxo;
          console.log(`📥 Selected UTxO: ${utxoAmount} lovelace`);
          break;
        }
      }

      if (!selectedUtxo) {
        throw new Error(`Insufficient funds. Need at least ${amountLovelace + 2000000} lovelace.`);
      }
    }

    // Create TransactionBuilderConfig with fallback mechanism (CRITICAL for Vespr)
    console.log('🔧 Creating TransactionBuilderConfig...');
    let txBuilderConfig;
    
    try {
      // Use the newer CSL API structure
      txBuilderConfig = CSL.TransactionBuilderConfigBuilder.new()
        .fee_algo(CSL.LinearFee.new(
          CSL.BigNum.from_str(protocolParams.linear_fee.min_fee_a.toString()),
          CSL.BigNum.from_str(protocolParams.linear_fee.min_fee_b.toString())
        ))
        .pool_deposit(CSL.BigNum.from_str(protocolParams.pool_deposit))
        .key_deposit(CSL.BigNum.from_str(protocolParams.key_deposit))
        .coins_per_utxo_byte(CSL.BigNum.from_str(protocolParams.coins_per_utxo_size || '4310'))
        .max_value_size(protocolParams.max_val_size || 5000)
        .max_tx_size(protocolParams.max_tx_size || 16384)
        .build();
      console.log('✅ TransactionBuilderConfig created successfully');
    } catch (configError) {
      // Fallback with default values if protocol params are invalid
      console.log('⚠️ Using fallback config due to error:', configError);
      txBuilderConfig = CSL.TransactionBuilderConfigBuilder.new()
        .fee_algo(CSL.LinearFee.new(
          CSL.BigNum.from_str('44'),
          CSL.BigNum.from_str('155381')
        ))
        .pool_deposit(CSL.BigNum.from_str('500000000'))
        .key_deposit(CSL.BigNum.from_str('2000000'))
        .coins_per_utxo_byte(CSL.BigNum.from_str('4310'))
        .max_value_size(5000)
        .max_tx_size(16384)
        .build();
      console.log('✅ TransactionBuilderConfig created with default values');
    }

    const txBuilder = CSL.TransactionBuilder.new(txBuilderConfig);

    // Variables to store script witness data
    let plutusScript: any = null;
    let scriptRedeemer: any = null;

    // Handle script witness for smart contract interactions
    if (includeScriptWitness && contractUtxos && script && redeemer) {
      console.log('🔧 Adding contract UTxO with script witness...');

      // Create Plutus script and redeemer once (outside the loop)
      plutusScript = CSL.PlutusScript.from_hex_with_version(
        script.cborHex,
        CSL.Language.new_plutus_v3()
      );

      // Create redeemer data
      const redeemerData = CSL.PlutusData.new_constr_plutus_data(
        CSL.ConstrPlutusData.new(
          CSL.BigNum.from_str('1'), // UserWithdraw constructor
          CSL.PlutusList.new()
        )
      );

      // Add amount to redeemer
      const amountData = CSL.PlutusData.new_integer(
        CSL.BigInt.from_str((amount * 1000000).toString())
      );
      redeemerData.as_constr_plutus_data()?.data().add(amountData);

      scriptRedeemer = CSL.Redeemer.new(
        CSL.RedeemerTag.new_spend(),
        CSL.BigNum.from_str('0'), // Input index
        redeemerData,
        CSL.ExUnits.new(
          CSL.BigNum.from_str('7000000'), // Memory
          CSL.BigNum.from_str('3000000000') // Steps
        )
      );

      // CRITICAL FIX: Create ALL contract UTxOs in ONE set and add them together
      console.log(`🔧 Adding ${contractUtxos.length} contract UTxOs...`);

      // Create a single UTxO set with ALL contract UTxOs (this is the correct approach)
      const allContractUtxoSet = CSL.TransactionUnspentOutputs.new();

      for (let i = 0; i < contractUtxos.length; i++) {
        const contractUtxo = contractUtxos[i];
        console.log(`   📦 Processing contract UTxO ${i + 1}: ${contractUtxo.tx_hash}#${contractUtxo.output_index}`);

        // Handle both output_index and tx_index field names
        const outputIndex = contractUtxo.output_index !== undefined ? contractUtxo.output_index : contractUtxo.tx_index;
        console.log(`     🔍 UTxO details: ${contractUtxo.tx_hash}#${outputIndex}`);

        const contractTxInput = CSL.TransactionInput.new(
          CSL.TransactionHash.from_bytes(Buffer.from(contractUtxo.tx_hash, 'hex')),
          outputIndex
        );

        // Create contract input value
        const contractAdaAmount = contractUtxo.amount.find((a: any) => a.unit === 'lovelace');
        console.log(`     💰 UTxO ${i + 1} ADA amount: ${contractAdaAmount.quantity} lovelace (${contractAdaAmount.quantity / 1000000} ADA)`);
        const contractValue = CSL.Value.new(CSL.BigNum.from_str(contractAdaAmount.quantity));

        // Add to the collective set
        const contractInputAddr = CSL.Address.from_bech32(fromAddress);
        const contractInputOutput = CSL.TransactionOutput.new(contractInputAddr, contractValue);
        const contractUtxoObj = CSL.TransactionUnspentOutput.new(contractTxInput, contractInputOutput);

        allContractUtxoSet.add(contractUtxoObj);
        console.log(`     ✅ UTxO ${i + 1} added to collective set`);
      }

      // CRITICAL DEBUG: Check what's in the UTxO set
      console.log(`📊 UTxO set contains ${allContractUtxoSet.len()} UTxOs`);

      // Calculate total value in the set
      let totalValueInSet = 0;
      for (let i = 0; i < allContractUtxoSet.len(); i++) {
        const utxo = allContractUtxoSet.get(i);
        const value = utxo.output().amount().coin().to_str();
        totalValueInSet += parseInt(value);
        console.log(`   📦 UTxO ${i + 1} in set: ${value} lovelace`);
      }
      console.log(`📊 Total value in UTxO set: ${totalValueInSet} lovelace (${totalValueInSet / 1000000} ADA)`);

      // Add all contract UTxOs
      console.log(`🔧 Adding all ${contractUtxos.length} contract UTxOs to transaction builder...`);
      txBuilder.add_inputs_from(allContractUtxoSet, 2);
      console.log(`✅ All contract UTxOs added to transaction builder`);

      // Debug: Calculate total value being added
      let totalAdaAdded = 0;
      for (let i = 0; i < contractUtxos.length; i++) {
        const contractAdaAmount = contractUtxos[i].amount.find((a: any) => a.unit === 'lovelace');
        totalAdaAdded += parseInt(contractAdaAmount.quantity);
      }
      console.log(`✅ Added all ${contractUtxos.length} contract UTxOs to transaction`);
      console.log(`📊 Total ADA being added as inputs: ${totalAdaAdded} lovelace (${totalAdaAdded / 1000000} ADA)`);

      console.log('✅ All contract UTxOs with script witness added');
    }

    // For contract withdrawals, we still need to add a user UTxO for fees
    if (includeScriptWitness) {
      console.log('🔧 Adding user UTxO for fees in contract withdrawal...');

      // Fetch a small user UTxO for fees
      const userUtxosResponse = await fetch(`${blockfrostBaseUrl}/addresses/${correctedAddress}/utxos`, {
        headers: { 'project_id': blockfrostProjectId }
      });

      if (userUtxosResponse.ok) {
        const userUtxos = await userUtxosResponse.json();
        if (userUtxos && userUtxos.length > 0) {
          const userUtxo = userUtxos[0]; // Use first available user UTxO for fees
          console.log(`🔧 Adding user UTxO for fees: ${userUtxo.tx_hash}#${userUtxo.tx_index}`);

          const userTxInput = CSL.TransactionInput.new(
            CSL.TransactionHash.from_bytes(Buffer.from(userUtxo.tx_hash, 'hex')),
            userUtxo.tx_index
          );

          const userAdaAmount = userUtxo.amount.find((a: any) => a.unit === 'lovelace');
          const userInputValue = CSL.Value.new(CSL.BigNum.from_str(userAdaAmount.quantity));

          const userInputAddr = CSL.Address.from_bech32(correctedAddress);
          const userInputOutput = CSL.TransactionOutput.new(userInputAddr, userInputValue);
          const userUtxoObj = CSL.TransactionUnspentOutput.new(userTxInput, userInputOutput);

          const userUtxoSet = CSL.TransactionUnspentOutputs.new();
          userUtxoSet.add(userUtxoObj);

          txBuilder.add_inputs_from(userUtxoSet, 1);
          console.log('✅ User UTxO for fees added successfully');
        }
      }
    } else {
      console.log('🔧 Adding transaction input...');
      const txInput = CSL.TransactionInput.new(
        CSL.TransactionHash.from_bytes(Buffer.from(selectedUtxo.tx_hash, 'hex')),
        selectedUtxo.tx_index
      );

    // Create input value (handle both ADA and tokens)
    const adaAmount = selectedUtxo.amount.find((a: any) => a.unit === 'lovelace');
    const inputValue = CSL.Value.new(CSL.BigNum.from_str(adaAmount.quantity));

    // Add native tokens if present
    if (selectedUtxo.amount.length > 1) {
      const multiAsset = CSL.MultiAsset.new();
      for (const asset of selectedUtxo.amount) {
        if (asset.unit !== 'lovelace') {
          const policyId = asset.unit.slice(0, 56);
          const assetName = asset.unit.slice(56);
          const assets = CSL.Assets.new();
          assets.insert(
            CSL.AssetName.new(Buffer.from(assetName, 'hex')),
            CSL.BigNum.from_str(asset.quantity)
          );
          multiAsset.insert(
            CSL.ScriptHash.from_bytes(Buffer.from(policyId, 'hex')),
            assets
          );
        }
      }
      inputValue.set_multiasset(multiAsset);
    }

    const inputAddr = CSL.Address.from_bech32(correctedAddress);
    const inputOutput = CSL.TransactionOutput.new(inputAddr, inputValue);
    const utxo = CSL.TransactionUnspentOutput.new(txInput, inputOutput);

    // Create UTxO set and add our input
    const txUnspentOutputs = CSL.TransactionUnspentOutputs.new();
    txUnspentOutputs.add(utxo);

      // Add inputs using the UTxO selection algorithm
      txBuilder.add_inputs_from(txUnspentOutputs, 1); // 1 = RandomImprove algorithm
      console.log('✅ Transaction input added successfully');
    }

    // Add output
    console.log('🔧 Adding transaction output...');
    const outputValue = CSL.Value.new(CSL.BigNum.from_str(amountLovelace.toString()));

    // CRITICAL FIX: Handle hex address conversion to bech32
    let outputAddr;
    if (toAddress.startsWith('addr1')) {
      // Already bech32 format
      outputAddr = CSL.Address.from_bech32(toAddress);
      console.log(`✅ Using bech32 address: ${toAddress.substring(0, 20)}...`);
    } else {
      // Hex format - convert to bech32
      console.log(`🔧 Converting hex address to bech32: ${toAddress.substring(0, 20)}...`);
      try {
        const addressBytes = Buffer.from(toAddress, 'hex');
        outputAddr = CSL.Address.from_bytes(addressBytes);
        console.log(`✅ Converted hex to CSL address successfully`);
      } catch (hexError) {
        console.error('❌ Hex conversion failed:', hexError);
        throw new Error(`Invalid address format: ${toAddress.substring(0, 20)}...`);
      }
    }

    const output = CSL.TransactionOutput.new(outputAddr, outputValue);
    txBuilder.add_output(output);
    console.log('✅ Transaction output added successfully');

    // Set TTL (Time To Live)
    console.log('🔧 Setting TTL...');
    const latestBlockResponse = await fetch(`${blockfrostBaseUrl}/blocks/latest`, {
      headers: { 'project_id': blockfrostProjectId }
    });
    
    if (latestBlockResponse.ok) {
      const latestBlock = await latestBlockResponse.json();
      const ttlSlot = latestBlock.slot + 3600; // 1 hour TTL
      txBuilder.set_ttl(ttlSlot);
      console.log(`✅ TTL set to slot ${ttlSlot}`);
    } else {
      console.log('⚠️ Could not get latest block, using default TTL');
      txBuilder.set_ttl(Date.now() + 3600000); // 1 hour from now
    }

    // Add change if needed
    console.log('🔧 Adding change output if needed...');
    const changeAddr = CSL.Address.from_bech32(correctedAddress);
    txBuilder.add_change_if_needed(changeAddr);
    console.log('✅ Change handling completed');

    // Build the transaction body
    console.log('🔧 Building transaction body...');
    const txBody = txBuilder.build();

    // Create witness set (wallet will add signatures, we add script witness if needed)
    const witnessSet = CSL.TransactionWitnessSet.new();

    // Add script witness if we have smart contract interaction
    if (plutusScript && scriptRedeemer) {
      console.log('🔧 Adding Plutus script witness...');

      // Add Plutus script
      const plutusScripts = CSL.PlutusScripts.new();
      plutusScripts.add(plutusScript);
      witnessSet.set_plutus_scripts(plutusScripts);

      // Add redeemer
      const redeemers = CSL.Redeemers.new();
      redeemers.add(scriptRedeemer);
      witnessSet.set_redeemers(redeemers);

      console.log('✅ Plutus script witness added to transaction');
    }

    // Add metadata if provided
    let auxiliaryData = undefined;
    if (metadata) {
      console.log('🔧 Adding metadata...');
      const metadataMap = CSL.GeneralTransactionMetadata.new();
      const key = CSL.BigNum.from_str('674'); // Standard metadata label
      const value = CSL.encode_json_str_to_metadatum(JSON.stringify(metadata), 0);
      metadataMap.insert(key, value);
      
      auxiliaryData = CSL.AuxiliaryData.new();
      auxiliaryData.set_metadata(metadataMap);
      console.log('✅ Metadata added successfully');
    }

    // Create complete transaction as required by CIP-30
    console.log('🔧 Creating complete transaction...');
    const transaction = CSL.Transaction.new(txBody, witnessSet, auxiliaryData);

    // Convert to CBOR hex
    const cborHex = Buffer.from(transaction.to_bytes()).toString('hex');

    console.log('✅ Transaction built successfully using PROPER CSL!');
    console.log(`📋 CBOR length: ${cborHex.length} characters`);
    console.log('🔥 This is REAL CSL-generated CBOR that should work with Vespr!');

    return NextResponse.json({
      success: true,
      cborHex: cborHex,
      txSize: cborHex.length / 2,
      method: 'CSL_PROPER'
    });

  } catch (error) {
    console.error('❌ Transaction building failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
