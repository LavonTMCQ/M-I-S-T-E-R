# Cardano Vault Unlock Requirements - January 2025

## ✅ Lock Functionality: WORKING
- Successfully locked 1 ADA to vault on mainnet
- Transaction: 5ec9fe010ceecc57d7977b31a8793a2092edb7887a84e378beeb7352e9c99e5d
- Script address: addr1w8qmxkacjdffxah0l3qg8hq2pmvs58q8lcy42zy9kda2ylc6dy5r4

## 🔧 Unlock Functionality: Issues Identified

### Current Error
```
"Plutus inputs are present, but no collateral inputs are added"
```

### Root Cause
The wallet used all its UTXOs in the lock transaction and has no remaining funds for:
1. **Collateral UTXO** - Required for Plutus script execution (5 ADA minimum)
2. **Regular UTXOs** - For transaction fees and change

### Solution Requirements
1. **Fund the wallet** with additional ADA (at least 5-6 ADA for collateral + fees)
2. **Wait for confirmation** before attempting unlock
3. **Test unlock** with proper collateral available

## 🏗️ Working Architecture Summary

### Lock Process (WORKING)
```javascript
// 1. Create wallet from mnemonic
const wallet = new MeshWallet({ networkId: 1, fetcher: provider, submitter: provider, key: { type: 'mnemonic', words: mnemonicWords } });

// 2. Fetch UTXOs explicitly
let utxos = await wallet.getUtxos();
if (!utxos || utxos.length === 0) {
  utxos = await provider.fetchAddressUTxOs(walletAddress);
}

// 3. Build transaction with explicit inputs
for (const utxo of utxos) {
  txBuilder.txIn(utxo.input.txHash, utxo.input.outputIndex, utxo.output.amount, utxo.output.address);
}

// 4. Send to script with datum
await txBuilder
  .txOut(scriptAddr, assets)
  .txOutDatumHashValue(mConStr0([signerHash]))
  .changeAddress(walletAddress)
  .setNetwork(NETWORK)
  .complete();
```

### Unlock Process (NEEDS COLLATERAL)
```javascript
// 1. Fetch script UTXO from lock transaction
const scriptUtxos = await provider.fetchUTxOs(depositTxHash);
const scriptUtxo = scriptUtxos.find(utxo => utxo.output.address === scriptAddr);

// 2. Build Plutus transaction (requires collateral)
await txBuilder
  .spendingPlutusScript("V3")
  .txIn(scriptUtxo.input.txHash, scriptUtxo.input.outputIndex, scriptUtxo.output.amount, scriptUtxo.output.address)
  .txInScript(scriptCbor)
  .txInRedeemerValue(mConStr0([stringToHex("Hello, World!")]))
  .txInDatumValue(mConStr0([signerHash]))
  .requiredSignerHash(signerHash)
  .changeAddress(walletAddress)
  .txInCollateral(/* NEEDS 5+ ADA UTXO */)
  .selectUtxosFrom(utxos)
  .setNetwork(NETWORK)
  .complete();
```

## 🔐 Security Analysis

### Current Implementation Security
- ✅ Uses proper Aiken hello_world validator pattern
- ✅ Requires correct signer hash in datum
- ✅ Uses "Hello, World!" redeemer validation
- ✅ Hardcoded script address prevents unauthorized access

### Security Concerns for Agent Operations
1. **Script Address**: Currently using placeholder - needs real compiled address
2. **Redeemer Validation**: Simple string check - needs robust validation for agent operations
3. **Multi-sig Requirements**: Should require both user + agent signatures for withdrawals
4. **Amount Validation**: Should validate withdrawal amounts against vault balance
5. **Emergency Stop**: Should have emergency stop mechanism

## 📋 Next Steps

### Immediate (Testing Phase)
1. **Fund wallet** with 6+ ADA for collateral and fees
2. **Test unlock** functionality with proper funds
3. **Verify round-trip** (lock → unlock → funds returned)

### Before Agent Operations
1. **Compile real script address** from actual Aiken validator
2. **Implement multi-signature** validation (user + agent keys)
3. **Add amount validation** and balance checks
4. **Implement emergency stop** mechanism
5. **Security audit** of all validator logic
6. **Test on testnet** extensively before mainnet agent operations

### Agent Integration
1. **Strike API integration** for perpetual trading
2. **Position management** within vault constraints
3. **Automated trading signals** execution
4. **Risk management** and stop-loss mechanisms
5. **Monitoring and alerts** for vault activity