# 🔧 VESPR WALLET - TECHNICAL REFERENCE

## 📋 Complete Working API Route

**File**: `src/app/api/cardano/build-transaction/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

interface TransactionRequest {
  fromAddress: string;
  toAddress: string;
  amount: number; // in ADA
  vaultDatum?: any;
  network?: 'mainnet' | 'testnet';
}

export async function POST(request: NextRequest) {
  try {
    const body: TransactionRequest = await request.json();
    const { fromAddress, toAddress, amount, vaultDatum, network = 'testnet' } = body;

    const amountLovelace = Math.round(amount * 1000000);

    // Configure Blockfrost
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
    
    // Step 1: Get UTxOs from the sender address
    const utxosResponse = await fetch(`${blockfrostBaseUrl}/addresses/${fromAddress}/utxos`, {
      headers: {
        'project_id': blockfrostProjectId
      }
    });

    if (!utxosResponse.ok) {
      const errorText = await utxosResponse.text();
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

    // Step 3: Build transaction using PROPER CSL
    const CSL = await import('@emurgo/cardano-serialization-lib-browser');

    // Filter UTxOs to ONLY include pure ADA (no native tokens/NFTs)
    const adaOnlyUtxos = utxos.filter((utxo: any) => {
      return utxo.amount.length === 1 && utxo.amount[0].unit === 'lovelace';
    });

    if (adaOnlyUtxos.length === 0) {
      throw new Error('No ADA-only UTxOs available for transaction');
    }

    // Calculate required amount (amount + estimated fee)
    const estimatedFee = network === 'testnet' ? 500000 : 1000000; // 0.5 tADA or 1 ADA fee buffer
    const requiredAmount = amountLovelace + estimatedFee;

    // Select UTxO with enough balance
    let selectedUtxo = null;
    for (const utxo of adaOnlyUtxos) {
      const utxoAmount = parseInt(utxo.amount[0].quantity);
      if (utxoAmount >= requiredAmount) {
        selectedUtxo = utxo;
        break;
      }
    }

    if (!selectedUtxo) {
      throw new Error(`Insufficient funds. Need ${requiredAmount} lovelace, but no single UTxO has enough.`);
    }

    // CRITICAL: TransactionBuilderConfig with fallback mechanism
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
    } catch (error1) {
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
      } catch (error2) {
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
      }
    }

    const txBuilder = CSL.TransactionBuilder.new(txBuilderConfig);

    // Add input using the correct method
    const txInput = CSL.TransactionInput.new(
      CSL.TransactionHash.from_bytes(Buffer.from(selectedUtxo.tx_hash, 'hex')),
      selectedUtxo.output_index
    );

    const inputValue = CSL.Value.new(CSL.BigNum.from_str(selectedUtxo.amount[0].quantity));
    const inputAddr = CSL.Address.from_bech32(fromAddress);
    const inputOutput = CSL.TransactionOutput.new(inputAddr, inputValue);
    const utxo = CSL.TransactionUnspentOutput.new(txInput, inputOutput);
    
    // CRITICAL: Use different variable name to avoid conflict
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

    // Build the transaction
    const txBody = txBuilder.build();
    const witnessSet = CSL.TransactionWitnessSet.new();
    const transaction = CSL.Transaction.new(txBody, witnessSet);

    // Convert to CBOR hex
    const cborHex = Buffer.from(transaction.to_bytes()).toString('hex');

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
```

## 🎯 Frontend Integration

```typescript
// Get fresh wallet API connection
if (!window.cardano || !window.cardano.vespr) {
  throw new Error('Vespr wallet not found');
}

const walletApi = await window.cardano.vespr.enable();

// Sign the transaction
const signedTx = await walletApi.signTx(cborHex, true);

// Submit transaction to Cardano network
const txHash = await walletApi.submitTx(signedTx);
```

## 🔍 Debugging Checklist

1. **CSL Import**: ✅ `@emurgo/cardano-serialization-lib-browser`
2. **Variable Names**: ✅ No `utxos` conflicts
3. **Config Builder**: ✅ Fallback mechanism for coin methods
4. **Transaction Structure**: ✅ Complete transaction with witness set
5. **CBOR Generation**: ✅ Using CSL, not manual creation

---

**🚨 SAVE THIS FILE - IT CONTAINS THE EXACT WORKING SOLUTION**
