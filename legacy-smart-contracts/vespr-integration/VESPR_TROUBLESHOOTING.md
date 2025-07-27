# 🚨 VESPR WALLET TROUBLESHOOTING GUIDE

## 🔥 Common Issues & Solutions

### 1. **Vespr Wallet Shows Greyed Out**
**Symptoms**: Wallet popup appears but is greyed out, can't see transaction details

**Root Cause**: Invalid CBOR transaction format

**Solution**: 
- ✅ Use proper CSL library (not manual CBOR creation)
- ✅ Create complete transaction structure: `[transaction_body, transaction_witness_set]`
- ✅ Use empty witness set initially: `CSL.TransactionWitnessSet.new()`

### 2. **"coins_per_utxo_word is not a function"**
**Symptoms**: CSL API error during TransactionBuilderConfig creation

**Root Cause**: CSL API method variations between versions

**Solution**: Use fallback mechanism
```typescript
try {
  // Try coins_per_utxo_byte first
  .coins_per_utxo_byte(CSL.BigNum.from_str(protocolParams.coins_per_utxo_size))
} catch (error1) {
  try {
    // Fallback to coins_per_utxo_word
    .coins_per_utxo_word(CSL.BigNum.from_str(protocolParams.coins_per_utxo_size))
  } catch (error2) {
    // Final fallback with default value
    .coins_per_utxo_byte(CSL.BigNum.from_str('4310'))
  }
}
```

### 3. **"uninitialized field: coins_per_utxo_byte or coins_per_utxo_word"**
**Symptoms**: CSL throws error about missing required field

**Root Cause**: TransactionBuilderConfig missing required coin parameter

**Solution**: MUST include one of the coin methods (see solution #2)

### 4. **"utxos defined multiple times"**
**Symptoms**: TypeScript/JavaScript error about variable redefinition

**Root Cause**: Variable naming conflict between Blockfrost response and CSL object

**Solution**: Use different variable names
```typescript
// ✅ CORRECT
const utxos = await utxosResponse.json(); // From Blockfrost
const txUnspentOutputs = CSL.TransactionUnspentOutputs.new(); // CSL object
```

### 5. **"txBuilder.add_input is not a function"**
**Symptoms**: CSL method not found error

**Root Cause**: Using wrong CSL method for adding inputs

**Solution**: Use `add_inputs_from` with UTxO set
```typescript
const txUnspentOutputs = CSL.TransactionUnspentOutputs.new();
txUnspentOutputs.add(utxo);
txBuilder.add_inputs_from(txUnspentOutputs, 1);
```

### 6. **Transaction Building Timeout**
**Symptoms**: API request takes too long or times out

**Root Cause**: CSL library loading or computation issues

**Solution**: 
- ✅ Use proper CSL import: `@emurgo/cardano-serialization-lib-browser`
- ✅ Add timeout handling in API route
- ✅ Optimize UTxO selection (filter ADA-only first)

### 7. **"Failed to fetch UTxOs"**
**Symptoms**: Blockfrost API error

**Root Cause**: Invalid address format or API key issues

**Solution**:
- ✅ Verify address format (bech32)
- ✅ Check Blockfrost API key
- ✅ Ensure correct network (mainnet/testnet)

## 🔧 Debug Process

### Step 1: Check Server Logs
```bash
# Look for these success messages:
✅ Successfully loaded CSL browser version
✅ TransactionBuilderConfig created successfully  
✅ Transaction built successfully using PROPER CSL!
```

### Step 2: Verify CBOR Output
```bash
# Should see:
📋 CBOR length: [some number] characters
🔥 This is REAL CSL-generated CBOR that should work with Vespr!
```

### Step 3: Test Vespr Popup
- Wallet should show transaction details clearly
- Should display correct ADA amounts
- Sign button should be enabled (not greyed out)

## 🚀 Quick Fix Checklist

When Vespr wallet fails:

1. ✅ Check CSL import path
2. ✅ Verify TransactionBuilderConfig fallback mechanism  
3. ✅ Ensure no variable name conflicts
4. ✅ Confirm complete transaction structure
5. ✅ Test with fresh server restart
6. ✅ Verify Blockfrost API connectivity

## 📁 Key Files to Check

- `src/app/api/cardano/build-transaction/route.ts` - Main transaction building logic
- `src/app/test-clean-vault/page.tsx` - Test interface
- `package.json` - CSL dependency version

## 🎯 Success Indicators

- ✅ Vespr wallet popup shows transaction details (not greyed out)
- ✅ Correct ADA amounts displayed
- ✅ Sign button enabled
- ✅ Transaction can be signed and submitted
- ✅ Server logs show successful CBOR generation

---

**💡 Remember: This solution took 10+ hours to figure out. Save this documentation!**
