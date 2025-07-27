# 🔥 VESPR WALLET INTEGRATION - WORKING SOLUTION

**⚠️ CRITICAL: This document contains the EXACT working solution for Vespr wallet integration. DO NOT DEVIATE from this approach.**

## 🎯 Problem Solved
- **Vespr wallet showing greyed out popup** ✅ FIXED
- **Invalid CBOR transaction format** ✅ FIXED  
- **CSL API compatibility issues** ✅ FIXED
- **Transaction building failures** ✅ FIXED

## 🔧 Working Solution Overview

### 1. **CSL Library Setup**
```typescript
// EXACT import that works
const CSL = await import('@emurgo/cardano-serialization-lib-browser');
```

### 2. **TransactionBuilderConfig (CRITICAL)**
```typescript
// This is the EXACT configuration that works with Vespr
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
    // Fallback to coins_per_utxo_word
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
    // Final fallback with default value
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
```

### 3. **Transaction Building (EXACT PATTERN)**
```typescript
const txBuilder = CSL.TransactionBuilder.new(txBuilderConfig);

// Add input using UTxO set approach
const txInput = CSL.TransactionInput.new(
  CSL.TransactionHash.from_bytes(Buffer.from(selectedUtxo.tx_hash, 'hex')),
  selectedUtxo.output_index
);

const inputValue = CSL.Value.new(CSL.BigNum.from_str(selectedUtxo.amount[0].quantity));
const inputAddr = CSL.Address.from_bech32(fromAddress);
const inputOutput = CSL.TransactionOutput.new(inputAddr, inputValue);
const utxo = CSL.TransactionUnspentOutput.new(txInput, inputOutput);

// CRITICAL: Use TransactionUnspentOutputs, NOT utxos (naming conflict!)
const txUnspentOutputs = CSL.TransactionUnspentOutputs.new();
txUnspentOutputs.add(utxo);

// Add inputs using UTxO selection algorithm
txBuilder.add_inputs_from(txUnspentOutputs, 1); // 1 = RandomImprove algorithm

// Add output
const outputValue = CSL.Value.new(CSL.BigNum.from_str(amountLovelace.toString()));
const outputAddr = CSL.Address.from_bech32(toAddress);
const output = CSL.TransactionOutput.new(outputAddr, outputValue);
txBuilder.add_output(output);

// Set TTL
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
```

## 🚨 CRITICAL GOTCHAS

### 1. **Variable Naming Conflict**
```typescript
// ❌ WRONG - causes "utxos defined multiple times" error
const utxos = await utxosResponse.json(); // From Blockfrost
const utxos = CSL.TransactionUnspentOutputs.new(); // CSL object

// ✅ CORRECT - use different names
const utxos = await utxosResponse.json(); // From Blockfrost  
const txUnspentOutputs = CSL.TransactionUnspentOutputs.new(); // CSL object
```

### 2. **CSL API Method Variations**
- `coins_per_utxo_byte` (newer)
- `coins_per_utxo_word` (older)
- **MUST have one of these or CSL throws "uninitialized field" error**

### 3. **Transaction Structure**
- **MUST** create complete transaction: `[transaction_body, transaction_witness_set]`
- **MUST** use empty witness set initially: `CSL.TransactionWitnessSet.new()`
- **MUST** use proper CSL objects, not manual CBOR creation

## 📁 Working File Location
- **API Route**: `sydney-agents/mister-frontend/src/app/api/cardano/build-transaction/route.ts`
- **Test Page**: `sydney-agents/mister-frontend/src/app/test-clean-vault/page.tsx`

## 🧪 Testing Process
1. Navigate to: `http://localhost:3000/test-clean-vault`
2. Click "Test Deposit (5 ADA)" button
3. Vespr wallet should popup with transaction details (NOT greyed out)
4. Transaction should show correct amounts and allow signing

## 💡 Key Success Factors
1. **Proper CSL import and usage**
2. **Fallback mechanism for CSL API variations**
3. **Correct variable naming (avoid conflicts)**
4. **Complete transaction structure**
5. **Real protocol parameters from Blockfrost**

---

**🔥 THIS SOLUTION WORKS - DO NOT CHANGE UNLESS ABSOLUTELY NECESSARY**
