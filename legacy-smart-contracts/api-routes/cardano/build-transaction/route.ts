import { NextRequest, NextResponse } from 'next/server';

interface TransactionRequest {
  fromAddress: string;
  toAddress: string;
  amount: number; // in ADA
  vaultDatum?: any;
  network?: 'mainnet' | 'testnet';
}

// Using proper CSL instead of manual CBOR creation

export async function POST(request: NextRequest) {
  try {
    const body: TransactionRequest = await request.json();
    const { fromAddress, toAddress, amount, vaultDatum, network = 'testnet' } = body;

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
    console.log('🔍 DEBUG: About to fetch UTxOs with:');
    console.log(`  URL: ${blockfrostBaseUrl}/addresses/${fromAddress}/utxos`);
    console.log(`  Project ID: ${blockfrostProjectId}`);
    console.log(`  Address: ${fromAddress}`);

    const utxosResponse = await fetch(`${blockfrostBaseUrl}/addresses/${fromAddress}/utxos`, {
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

    const utxos = await utxosResponse.json();

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

    // Step 3: Build transaction using PROPER CSL (fixing the API usage)
    console.log('🔧 Building transaction using PROPER CSL with correct API...');

    // Import CSL properly
    const CSL = await import('@emurgo/cardano-serialization-lib-browser');
    console.log('✅ Successfully loaded CSL browser version');

    // Filter UTxOs to ONLY include pure ADA (no native tokens/NFTs)
    console.log('🔍 Filtering UTxOs for ADA-only...');
    const adaOnlyUtxos = utxos.filter((utxo: any) => {
      return utxo.amount.length === 1 && utxo.amount[0].unit === 'lovelace';
    });

    console.log(`📊 Found ${adaOnlyUtxos.length} ADA-only UTxOs out of ${utxos.length} total`);

    if (adaOnlyUtxos.length === 0) {
      throw new Error('No ADA-only UTxOs available for transaction');
    }

    // Calculate required amount (amount + estimated fee) - CONSERVATIVE FEE ESTIMATE
    const estimatedFee = network === 'testnet' ? 500000 : 1000000; // 0.5 tADA or 1 ADA fee buffer
    const requiredAmount = amountLovelace + estimatedFee;
    console.log(`💰 Need ${requiredAmount} lovelace (${amount} ADA + ${estimatedFee / 1000000} ADA fee buffer)`);

    // Select UTxO with enough balance
    let selectedUtxo = null;
    for (const utxo of adaOnlyUtxos) {
      const utxoAmount = parseInt(utxo.amount[0].quantity);
      if (utxoAmount >= requiredAmount) {
        selectedUtxo = utxo;
        console.log(`📥 Selected UTxO: ${utxoAmount} lovelace`);
        break;
      }
    }

    if (!selectedUtxo) {
      throw new Error(`Insufficient funds. Need ${requiredAmount} lovelace, but no single UTxO has enough.`);
    }

    // Use simplified transaction building approach
    const inputAmount = parseInt(selectedUtxo.amount[0].quantity);
    console.log(`💰 Input amount: ${inputAmount} lovelace`);

    // Build transaction using PROPER CSL with correct TransactionBuilderConfig
    console.log('🔧 Building transaction with proper CSL TransactionBuilderConfig...');

    // Create TransactionBuilderConfig (try different coin methods)
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

    // Add input using the correct method
    const txInput = CSL.TransactionInput.new(
      CSL.TransactionHash.from_bytes(Buffer.from(selectedUtxo.tx_hash, 'hex')),
      selectedUtxo.output_index
    );

    const inputValue = CSL.Value.new(CSL.BigNum.from_str(selectedUtxo.amount[0].quantity));

    // Create TransactionUnspentOutput for the input
    const inputAddr = CSL.Address.from_bech32(fromAddress);
    const inputOutput = CSL.TransactionOutput.new(inputAddr, inputValue);
    const utxo = CSL.TransactionUnspentOutput.new(txInput, inputOutput);

    // Create UTxO set and add our input
    const txUnspentOutputs = CSL.TransactionUnspentOutputs.new();
    txUnspentOutputs.add(utxo);

    // Add inputs using the UTxO selection algorithm
    txBuilder.add_inputs_from(txUnspentOutputs, 1); // 1 = RandomImprove algorithm

    // Add output
    const outputValue = CSL.Value.new(CSL.BigNum.from_str(amountLovelace.toString()));
    const outputAddr = CSL.Address.from_bech32(toAddress);
    const output = CSL.TransactionOutput.new(outputAddr, outputValue);
    txBuilder.add_output(output);

    // Set TTL
    const latestBlockResponse = await fetch(`${blockfrostBaseUrl}/blocks/latest`, {
      headers: { 'project_id': blockfrostProjectId }
    });
    const latestBlock = await latestBlockResponse.json();
    const ttlSlot = latestBlock.slot + 3600; // 1 hour TTL
    txBuilder.set_ttl(ttlSlot);

    // Add change
    const changeAddr = CSL.Address.from_bech32(fromAddress);
    txBuilder.add_change_if_needed(changeAddr);

    // Build the complete transaction (CIP-30 requires complete transaction)
    const txBody = txBuilder.build();

    // Create empty witness set (wallet will populate this after signing)
    const witnessSet = CSL.TransactionWitnessSet.new();

    // Create complete transaction as required by CIP-30
    const transaction = CSL.Transaction.new(txBody, witnessSet);

    // Convert to CBOR hex
    const cborHex = Buffer.from(transaction.to_bytes()).toString('hex');

    console.log('✅ Complete transaction built successfully using PROPER CSL!');
    console.log('📋 Complete transaction CBOR length:', cborHex.length, 'characters');
    console.log('🔥 This is the COMPLETE TRANSACTION that Vespr will sign!');

    return NextResponse.json({
      success: true,
      cborHex: cborHex
    });

  } catch (error) {
    console.error('❌ Transaction building failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
