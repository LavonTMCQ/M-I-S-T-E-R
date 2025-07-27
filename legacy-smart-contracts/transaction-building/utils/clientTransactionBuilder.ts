// Client-side transaction builder using browser CSL
// This avoids the server-side WebAssembly loading issues

export interface TransactionStructure {
  inputs: Array<{
    txHash: string;
    outputIndex: number;
    address: string;
    amount: string;
  }>;
  outputs: Array<{
    address: string;
    amount: string;
    datum: string | null;
  }>;
  fee: string;
  ttl: number;
  protocolParameters: any;
}

export async function buildCBORFromStructure(
  transactionStructure: TransactionStructure
): Promise<string> {
  console.log('🔧 Building CBOR using browser CSL...');
  
  // Import browser CSL
  const CSL = await import('@emurgo/cardano-serialization-lib-browser');
  
  // Create transaction builder with protocol parameters
  const protocolParams = transactionStructure.protocolParameters;
  const txBuilder = CSL.TransactionBuilder.new(
    CSL.TransactionBuilderConfigBuilder.new()
      .fee_algo(CSL.LinearFee.new(
        CSL.BigNum.from_str(protocolParams.min_fee_a.toString()),
        CSL.BigNum.from_str(protocolParams.min_fee_b.toString())
      ))
      .pool_deposit(CSL.BigNum.from_str(protocolParams.pool_deposit))
      .key_deposit(CSL.BigNum.from_str(protocolParams.key_deposit))
      .coins_per_utxo_word(CSL.BigNum.from_str(protocolParams.coins_per_utxo_size))
      .max_value_size(protocolParams.max_val_size)
      .max_tx_size(protocolParams.max_tx_size)
      .build()
  );

  // Add inputs
  for (const input of transactionStructure.inputs) {
    const txInput = CSL.TransactionInput.new(
      CSL.TransactionHash.from_bytes(Buffer.from(input.txHash, 'hex')),
      input.outputIndex
    );

    const inputValue = CSL.Value.new(CSL.BigNum.from_str(input.amount));
    txBuilder.add_input(
      CSL.Address.from_bech32(input.address),
      txInput,
      inputValue
    );
  }

  // Add outputs
  for (const output of transactionStructure.outputs) {
    const outputAddr = CSL.Address.from_bech32(output.address);
    const outputValue = CSL.Value.new(CSL.BigNum.from_str(output.amount));
    
    let txOutput;
    if (output.datum) {
      // Parse datum and add to output
      const datumJson = JSON.parse(output.datum);
      const plutusData = CSL.PlutusData.from_json(
        JSON.stringify(datumJson), 
        CSL.PlutusDatumSchema.DetailedSchema
      );
      
      const outputBuilder = CSL.TransactionOutputBuilder.new()
        .with_address(outputAddr)
        .next()
        .with_value(outputValue)
        .next()
        .with_plutus_data(plutusData);
        
      txOutput = outputBuilder.build();
    } else {
      txOutput = CSL.TransactionOutput.new(outputAddr, outputValue);
    }

    txBuilder.add_output(txOutput);
  }

  // Set TTL
  txBuilder.set_ttl(transactionStructure.ttl);

  // Add change automatically
  const changeAddr = CSL.Address.from_bech32(transactionStructure.inputs[0].address);
  txBuilder.add_change_if_needed(changeAddr);

  // Build the transaction
  const finalTxBody = txBuilder.build();
  const witnessSet = CSL.TransactionWitnessSet.new();
  const tx = CSL.Transaction.new(finalTxBody, witnessSet);

  // Convert to CBOR hex
  const cborHex = Buffer.from(tx.to_bytes()).toString('hex');

  console.log('✅ CBOR transaction built successfully on client side!');
  console.log('📋 CBOR length:', cborHex.length, 'characters');

  return cborHex;
}