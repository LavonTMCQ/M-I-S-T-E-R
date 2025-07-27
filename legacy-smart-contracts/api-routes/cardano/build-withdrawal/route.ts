import { NextRequest, NextResponse } from 'next/server';

interface WithdrawalRequest {
  fromAddress: string; // User's wallet address (where funds go)
  contractAddress: string; // Smart contract address (where funds come from)
  amount: number; // Amount in lovelace
  network?: 'mainnet' | 'testnet';
}

// EXACT same CSL approach as working deposit - DO NOT CHANGE
export async function POST(request: NextRequest) {
  try {
    const body: WithdrawalRequest = await request.json();
    const { fromAddress, contractAddress, amount, network = 'mainnet' } = body;

    console.log(`🏦 Building Cardano WITHDRAWAL transaction via Blockfrost (${network.toUpperCase()})...`);
    console.log(`💰 From Contract: ${contractAddress.substring(0, 20)}...`);
    console.log(`💰 To User: ${fromAddress.substring(0, 20)}...`);
    console.log(`💰 Amount: ${amount / 1000000} ${network === 'testnet' ? 'tADA' : 'ADA'}`);
    console.log(`🌐 Network: ${network.toUpperCase()}`);

    // Configure Blockfrost (EXACT same as deposit)
    const blockfrostConfig = network === 'testnet'
      ? {
          projectId: process.env.BLOCKFROST_PROJECT_ID_TESTNET || 'testnetYourProjectId',
          baseUrl: 'https://cardano-testnet.blockfrost.io/api/v0'
        }
      : {
          projectId: process.env.BLOCKFROST_PROJECT_ID || 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu',
          baseUrl: 'https://cardano-mainnet.blockfrost.io/api/v0'
        };

    const blockfrostProjectId = blockfrostConfig.projectId;
    const blockfrostBaseUrl = blockfrostConfig.baseUrl;
    
    // Step 1: Get UTxOs from the CONTRACT address (not user address)
    console.log(`🔍 Fetching UTxOs from contract: ${contractAddress}`);
    const utxosResponse = await fetch(`${blockfrostBaseUrl}/addresses/${contractAddress}/utxos`, {
      headers: {
        'project_id': blockfrostProjectId
      }
    });

    if (!utxosResponse.ok) {
      const errorText = await utxosResponse.text();
      throw new Error(`Failed to fetch contract UTxOs: ${utxosResponse.statusText} - ${errorText}`);
    }

    const utxos = await utxosResponse.json();

    if (!utxos || utxos.length === 0) {
      throw new Error('No UTxOs found at contract address - nothing to withdraw');
    }

    console.log(`📊 Found ${utxos.length} UTxOs in contract`);

    // Step 2: Get protocol parameters (EXACT same as deposit)
    const protocolResponse = await fetch(`${blockfrostBaseUrl}/epochs/latest/parameters`, {
      headers: {
        'project_id': blockfrostProjectId
      }
    });

    if (!protocolResponse.ok) {
      throw new Error(`Failed to fetch protocol parameters: ${protocolResponse.statusText}`);
    }

    const protocolParams = await protocolResponse.json();

    // Step 3: Build transaction using PROPER CSL (EXACT same as deposit)
    console.log('🔧 Building transaction using PROPER CSL with correct API...');

    // Import CSL properly (EXACT same as deposit)
    const CSL = await import('@emurgo/cardano-serialization-lib-browser');
    console.log('✅ Successfully loaded CSL browser version');

    // Filter UTxOs to ONLY include pure ADA (EXACT same as deposit)
    const adaOnlyUtxos = utxos.filter((utxo: any) => {
      return utxo.amount.length === 1 && utxo.amount[0].unit === 'lovelace';
    });

    console.log(`🔍 Filtering UTxOs for ADA-only...`);
    console.log(`📊 Found ${adaOnlyUtxos.length} ADA-only UTxOs out of ${utxos.length} total`);

    if (adaOnlyUtxos.length === 0) {
      throw new Error('No ADA-only UTxOs available in contract for withdrawal');
    }

    // Calculate required amount (amount + estimated fee)
    const estimatedFee = network === 'testnet' ? 500000 : 1000000; // 0.5 tADA or 1 ADA fee buffer
    const requiredAmount = amount + estimatedFee;

    console.log(`💰 Need ${requiredAmount} lovelace (${amount} + ${estimatedFee} fee buffer)`);

    // Calculate total available balance
    const totalBalance = adaOnlyUtxos.reduce((sum, utxo) => sum + parseInt(utxo.amount[0].quantity), 0);
    console.log(`💰 Total contract balance: ${totalBalance} lovelace`);

    if (totalBalance < requiredAmount) {
      throw new Error(`Insufficient total funds in contract. Need ${requiredAmount} lovelace, but contract only has ${totalBalance} lovelace.`);
    }

    // Select UTxOs to cover the required amount (can use multiple UTxOs)
    let selectedUtxos = [];
    let accumulatedAmount = 0;

    for (const utxo of adaOnlyUtxos) {
      const utxoAmount = parseInt(utxo.amount[0].quantity);
      selectedUtxos.push(utxo);
      accumulatedAmount += utxoAmount;

      if (accumulatedAmount >= requiredAmount) {
        break;
      }
    }

    console.log(`📥 Selected ${selectedUtxos.length} UTxOs with total: ${accumulatedAmount} lovelace`);

    // Don't calculate change manually - let CSL handle it automatically
    const totalInputAmount = accumulatedAmount;
    console.log(`💰 Total input amount: ${totalInputAmount} lovelace`);

    // CRITICAL: TransactionBuilderConfig with fallback mechanism (EXACT same as deposit)
    console.log('🔧 Creating TransactionBuilderConfig with coin method fallback...');
    let txBuilderConfig;
    
    try {
      // Try coins_per_utxo_byte first (newer API)
      txBuilderConfig = CSL.TransactionBuilderConfigBuilder.new()
        .fee_algo(CSL.LinearFee.new(
          CSL.BigNum.from_str(protocolParams.min_fee_a.toString()),
          CSL.BigNum.from_str(protocolParams.min_fee_b.toString())
        ))
        .pool_deposit(CSL.BigNum.from_str(protocolParams.pool_deposit))
        .key_deposit(CSL.BigNum.from_str(protocolParams.key_deposit))
        .coins_per_utxo_byte(CSL.BigNum.from_str(protocolParams.coins_per_utxo_size))
        .max_value_size(protocolParams.max_val_size)
        .max_tx_size(protocolParams.max_tx_size)
        .build();
      console.log('✅ Used coins_per_utxo_byte method');
    } catch (error1) {
      console.log('⚠️ coins_per_utxo_byte failed, trying coins_per_utxo_word...');
      try {
        txBuilderConfig = CSL.TransactionBuilderConfigBuilder.new()
          .fee_algo(CSL.LinearFee.new(
            CSL.BigNum.from_str(protocolParams.min_fee_a.toString()),
            CSL.BigNum.from_str(protocolParams.min_fee_b.toString())
          ))
          .pool_deposit(CSL.BigNum.from_str(protocolParams.pool_deposit))
          .key_deposit(CSL.BigNum.from_str(protocolParams.key_deposit))
          .coins_per_utxo_word(CSL.BigNum.from_str(protocolParams.coins_per_utxo_size))
          .max_value_size(protocolParams.max_val_size)
          .max_tx_size(protocolParams.max_tx_size)
          .build();
        console.log('✅ Used coins_per_utxo_word method');
      } catch (error2) {
        console.log('❌ Both coin methods failed, using default value...');
        txBuilderConfig = CSL.TransactionBuilderConfigBuilder.new()
          .fee_algo(CSL.LinearFee.new(
            CSL.BigNum.from_str(protocolParams.min_fee_a.toString()),
            CSL.BigNum.from_str(protocolParams.min_fee_b.toString())
          ))
          .pool_deposit(CSL.BigNum.from_str(protocolParams.pool_deposit))
          .key_deposit(CSL.BigNum.from_str(protocolParams.key_deposit))
          .coins_per_utxo_byte(CSL.BigNum.from_str('4310')) // Default Cardano value
          .max_value_size(protocolParams.max_val_size)
          .max_tx_size(protocolParams.max_tx_size)
          .build();
        console.log('✅ Used default coins_per_utxo_byte value');
      }
    }

    const txBuilder = CSL.TransactionBuilder.new(txBuilderConfig);

    // 🔥 CRITICAL DIFFERENCE: For withdrawal, we need to add script inputs (not regular inputs)
    console.log(`🔐 Adding ${selectedUtxos.length} SCRIPT inputs for withdrawal from smart contract...`);

    // For script inputs, we need to provide the script and redeemer
    const scriptHash = "d13b38e27cbe4b54501e3430d26ca3ba59981bc64147c9bd1a5f82a2"; // From contract config
    const scriptCBOR = "5857010100323232323225333002323232323253330073370e900118041baa00113233224a260160026016601800260126ea800458c024c02800cc020008c01c008c01c004c010dd50008a4c26cacae6955ceaab9e5742ae89";

    // Create PlutusScript from CBOR
    const plutusScript = CSL.PlutusScript.from_bytes(Buffer.from(scriptCBOR, 'hex'));

    // Add each selected UTxO as a script input
    for (let i = 0; i < selectedUtxos.length; i++) {
      const utxo = selectedUtxos[i];

      // Create the script input
      const txInput = CSL.TransactionInput.new(
        CSL.TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, 'hex')),
        utxo.output_index
      );

      const inputValue = CSL.Value.new(CSL.BigNum.from_str(utxo.amount[0].quantity));

      // Create UserWithdraw redeemer (constructor 0 for simple contract)
      const redeemerData = CSL.PlutusData.new_integer(CSL.BigInt.from_str('0')); // Simple redeemer
      const redeemer = CSL.Redeemer.new(
        CSL.RedeemerTag.new_spend(),
        CSL.BigNum.from_str(i.toString()), // Input index
        redeemerData,
        CSL.ExUnits.new(CSL.BigNum.from_str('1000000'), CSL.BigNum.from_str('500000')) // Execution units
      );

      // Add the script input
      txBuilder.add_script_input(
        CSL.ScriptHash.from_bytes(Buffer.from(scriptHash, 'hex')),
        txInput,
        inputValue
      );

      console.log(`✅ Script input ${i + 1} added: ${parseInt(utxo.amount[0].quantity)} lovelace`);
    }

    console.log(`✅ All ${selectedUtxos.length} script inputs added successfully`);

    // Add output to user (EXACT same pattern as deposit)
    const outputValue = CSL.Value.new(CSL.BigNum.from_str(amount.toString()));
    const outputAddr = CSL.Address.from_bech32(fromAddress);
    const output = CSL.TransactionOutput.new(outputAddr, outputValue);
    txBuilder.add_output(output);

    // Set TTL (EXACT same as deposit)
    const latestBlockResponse = await fetch(`${blockfrostBaseUrl}/blocks/latest`, {
      headers: { 'project_id': blockfrostProjectId }
    });
    const latestBlock = await latestBlockResponse.json();
    const ttlSlot = latestBlock.slot + 3600; // 1 hour TTL
    txBuilder.set_ttl(ttlSlot);

    // Add change back to user (not contract)
    const changeAddr = CSL.Address.from_bech32(fromAddress);
    txBuilder.add_change_if_needed(changeAddr);

    // Build the transaction (EXACT same as deposit)
    const txBody = txBuilder.build();

    // Create witness set with script and redeemers
    const witnessSet = CSL.TransactionWitnessSet.new();

    // Add plutus script (only need one copy of the script)
    const plutusScripts = CSL.PlutusScripts.new();
    plutusScripts.add(plutusScript);
    witnessSet.set_plutus_scripts(plutusScripts);

    // Add all redeemers (one for each script input)
    const redeemers = CSL.Redeemers.new();
    for (let i = 0; i < selectedUtxos.length; i++) {
      const redeemerData = CSL.PlutusData.new_integer(CSL.BigInt.from_str('0')); // Simple redeemer
      const redeemer = CSL.Redeemer.new(
        CSL.RedeemerTag.new_spend(),
        CSL.BigNum.from_str(i.toString()), // Input index
        redeemerData,
        CSL.ExUnits.new(CSL.BigNum.from_str('1000000'), CSL.BigNum.from_str('500000')) // Execution units
      );
      redeemers.add(redeemer);
    }
    witnessSet.set_redeemers(redeemers);

    const transaction = CSL.Transaction.new(txBody, witnessSet);

    // Convert to CBOR hex (EXACT same as deposit)
    const cborHex = Buffer.from(transaction.to_bytes()).toString('hex');

    console.log('✅ WITHDRAWAL transaction built successfully using PROPER CSL!');
    console.log('📋 CBOR length:', cborHex.length, 'characters');
    console.log('🔥 This is REAL CSL-generated WITHDRAWAL CBOR that should work with Vespr!');

    return NextResponse.json({
      success: true,
      cborHex: cborHex
    });

  } catch (error) {
    console.error('❌ Withdrawal transaction building failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
