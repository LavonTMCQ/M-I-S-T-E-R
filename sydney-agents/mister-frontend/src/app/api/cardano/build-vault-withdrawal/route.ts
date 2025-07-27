import { NextRequest, NextResponse } from 'next/server';

/**
 * Build Agent Vault V2 withdrawal transaction with Plutus script witness
 * This handles the complex smart contract interaction properly
 */
export async function POST(request: NextRequest) {
  try {
    const {
      userAddress,
      contractAddress,
      contractUtxos,
      userUtxos,
      withdrawAmount,
      script,
      redeemer,
      includeScriptWitness
    } = await request.json();

    console.log(`🔧 Building Agent Vault V2 withdrawal transaction...`);
    console.log(`   👤 User: ${userAddress}`);
    console.log(`   🏦 Contract: ${contractAddress}`);
    console.log(`   💰 Amount: ${withdrawAmount / 1000000} ADA`);
    console.log(`   📜 Script witness: ${includeScriptWitness ? 'YES' : 'NO'}`);

    // Load Cardano Serialization Library (browser version works better in Next.js)
    const CSL = await import('@emurgo/cardano-serialization-lib-browser');

    // Create transaction builder with proper config
    const txBuilderConfig = CSL.TransactionBuilderConfigBuilder.new()
      .fee_algo(CSL.LinearFee.new(
        CSL.BigNum.from_str('44'),
        CSL.BigNum.from_str('155381')
      ))
      .pool_deposit(CSL.BigNum.from_str('500000000'))
      .key_deposit(CSL.BigNum.from_str('2000000'))
      .max_value_size(5000)
      .max_tx_size(16384)
      .coins_per_utxo_word(CSL.BigNum.from_str('34482'))
      .build();

    const txBuilder = CSL.TransactionBuilder.new(txBuilderConfig);

    // Add user UTxO for fees first
    const userUtxo = userUtxos[0];
    console.log(`🔧 Adding user UTxO for fees: ${userUtxo.tx_hash}#${userUtxo.output_index}`);

    const userTxInput = CSL.TransactionInput.new(
      CSL.TransactionHash.from_hex(userUtxo.tx_hash),
      userUtxo.output_index
    );

    const userAdaAmount = userUtxo.amount.find((a: any) => a.unit === 'lovelace');
    const userValue = CSL.Value.new(CSL.BigNum.from_str(userAdaAmount.quantity));

    txBuilder.add_input(
      CSL.Address.from_bech32(userAddress),
      userTxInput,
      userValue
    );

    // Add contract UTxO as script input
    const contractUtxo = contractUtxos[0];
    console.log(`🔧 Adding contract UTxO: ${contractUtxo.tx_hash}#${contractUtxo.output_index}`);

    const contractTxInput = CSL.TransactionInput.new(
      CSL.TransactionHash.from_hex(contractUtxo.tx_hash),
      contractUtxo.output_index
    );

    // Create Plutus script
    const plutusScript = CSL.PlutusScript.from_hex_with_version(
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
      CSL.BigInt.from_str(withdrawAmount.toString())
    );
    redeemerData.as_constr_plutus_data().data().add(amountData);

    const scriptRedeemer = CSL.Redeemer.new(
      CSL.RedeemerTag.new_spend(),
      CSL.BigNum.from_str('0'), // Input index
      redeemerData,
      CSL.ExUnits.new(
        CSL.BigNum.from_str('7000000'), // Memory
        CSL.BigNum.from_str('3000000000') // Steps
      )
    );

    // Create contract input value
    const contractAdaAmount = contractUtxo.amount.find((a: any) => a.unit === 'lovelace');
    const contractValue = CSL.Value.new(CSL.BigNum.from_str(contractAdaAmount.quantity));

    // Add script input
    const scriptHash = CSL.ScriptHash.from_hex('ef687fd29820bf668720713ab756d1dba13c6ef5edcc5e8eeb7cd7fb');
    
    txBuilder.add_script_input(
      scriptHash,
      contractTxInput,
      contractValue
    );

    // Add output: Send withdrawn ADA to user
    console.log(`🔧 Adding output: ${withdrawAmount / 1000000} ADA to user`);

    const outputValue = CSL.Value.new(CSL.BigNum.from_str(withdrawAmount.toString()));
    const outputAddress = CSL.Address.from_bech32(userAddress);

    txBuilder.add_output(
      CSL.TransactionOutput.new(outputAddress, outputValue)
    );

    // Set TTL
    const currentSlot = Math.floor(Date.now() / 1000) - 1596491091 + 4492800; // Rough slot calculation
    txBuilder.set_ttl(currentSlot + 3600); // 1 hour from now

    // Build transaction body
    const txBody = txBuilder.build();

    // Create witness set with script and redeemer
    const witnessSet = CSL.TransactionWitnessSet.new();
    
    // Add Plutus script
    const plutusScripts = CSL.PlutusScripts.new();
    plutusScripts.add(plutusScript);
    witnessSet.set_plutus_scripts(plutusScripts);

    // Add redeemer
    const redeemers = CSL.Redeemers.new();
    redeemers.add(scriptRedeemer);
    witnessSet.set_redeemers(redeemers);

    // Create transaction with witness set
    const transaction = CSL.Transaction.new(txBody, witnessSet);

    // Get CBOR
    const txCbor = Buffer.from(transaction.to_bytes()).toString('hex');

    console.log(`✅ Agent Vault V2 withdrawal transaction built with script witness`);
    console.log(`📦 CBOR length: ${txCbor.length} characters`);

    return NextResponse.json({
      success: true,
      cborHex: txCbor,
      txSize: txCbor.length / 2,
      method: 'CSL_AGENT_VAULT_V2'
    });

  } catch (error) {
    console.error('❌ Agent Vault V2 withdrawal transaction building failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Transaction building failed' 
      },
      { status: 500 }
    );
  }
}
