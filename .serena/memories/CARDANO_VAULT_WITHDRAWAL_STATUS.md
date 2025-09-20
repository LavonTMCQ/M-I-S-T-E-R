# CARDANO VAULT WITHDRAWAL STATUS - January 17, 2025

## 🚨 CRITICAL ISSUE: 5 ADA STUCK IN VAULT

### Current Situation
- **5 ADA is locked in the vault** at address: `addr1w9amamp0dl4m0dkf9hmwnzgux36eueptvm5z7fmfedyc2pqhlafmz`
- **Transaction hash**: `1ffc705e7e278a63302c04b05e8ac50297ed4e100f96e92b87655147b08730ae`
- **Problem**: The funds were deposited **WITHOUT A DATUM HASH**
- **Consequence**: The Aiken validator REQUIRES a datum to unlock funds, but the UTXO has `data_hash: null`
- **Result**: These 5 ADA CANNOT be withdrawn with the current validator

### Root Cause Analysis
1. **Deposit Method**: The 5 ADA was deposited via Railway service using a simple transfer
2. **Missing Datum**: The deposit transaction did NOT include the required datum hash
3. **Validator Requirement**: The Aiken hello_world validator expects:
   ```aiken
   pub type Datum {
     owner: VerificationKeyHash,
   }
   ```
4. **Validation Failure**: When trying to withdraw, validator crashes with:
   ```
   "failed script execution Spend[0] the validator crashed / exited prematurely"
   ```

## 🔧 ATTEMPTED SOLUTIONS (ALL FAILED)

### 1. Lucid Evolution Library Issues
- **Problem**: Incompatible API with how funds were deposited
- **Tried**: Multiple Lucid Evolution methods
- **Issues Found**:
  - `payToContract` - function doesn't exist
  - `pay.ToContractWithData` - function doesn't exist
  - Need correct Lucid Evolution API documentation

### 2. Library Mismatch
- **Deposit**: Used Mesh.js v1.8.4 in Railway service
- **Withdrawal Attempt**: Using Lucid Evolution in frontend
- **Issue**: Different libraries handle datum/redeemer differently

### 3. Datum Format Attempts
- Tried providing datum inline during withdrawal - FAILED
- Tried adding datum to UTXO object - FAILED
- Tried both PlutusV2 and PlutusV3 - FAILED

## 📋 WHAT WE KNOW WORKS

### Railway Service (Mesh.js) - DEPOSIT WORKS
```javascript
// From vault-operations.js
await txBuilder
  .txOut(scriptAddr, assets)
  .txOutDatumHashValue(mConStr0([signerHash])) // THIS IS THE KEY
  .changeAddress(walletAddress)
  .setNetwork(NETWORK)
  .complete();
```

### Railway Service (Mesh.js) - WITHDRAWAL WORKS (with proper datum)
```javascript
await txBuilder
  .spendingPlutusScript("V3")
  .txIn(scriptUtxo.input.txHash, scriptUtxo.input.outputIndex, ...)
  .txInScript(scriptCbor)
  .txInRedeemerValue(mConStr0([stringToHex(message)]))
  .txInDatumValue(mConStr0([signerHash]))
  .requiredSignerHash(signerHash)
  .changeAddress(walletAddress)
  .complete();
```

## ❌ WHAT DOESN'T WORK

### Frontend (Lucid Evolution) - CANNOT DEPOSIT WITH DATUM
```javascript
// These don't exist in Lucid Evolution:
.payToContract()  // NOT A FUNCTION
.pay.ToContractWithData()  // NOT A FUNCTION
```

### Frontend (Lucid Evolution) - CANNOT WITHDRAW WITHOUT DATUM
- Cannot withdraw the 5 ADA because it has no datum
- Validator crashes when UTXO has no datum

## 🎯 SOLUTION OPTIONS

### Option 1: Use Railway Service for Everything (RECOMMENDED)
1. Call Railway service endpoints for both deposit and withdrawal
2. Railway service uses Mesh.js which we KNOW works
3. Already deployed and operational

### Option 2: Fix Lucid Evolution Implementation
1. Find correct Lucid Evolution API for depositing with datum
2. Need documentation for:
   - How to send to contract with datum
   - Proper datum format for Lucid
   - Correct withdrawal pattern

### Option 3: Deploy Recovery Validator
1. Deploy a new validator that doesn't require datum
2. Move the stuck 5 ADA to new validator
3. Not recommended - requires new smart contract deployment

## 📚 DOCUMENTATION NEEDED

### Lucid Evolution
- How to deposit to smart contract WITH datum
- Correct API method names
- Datum format specification
- Complete withdrawal example

### Mesh.js to Lucid Migration
- How to handle UTXOs created by Mesh in Lucid
- Datum format compatibility
- Transaction building differences

## 🔍 FILES TO REVIEW

### Working Implementation (Mesh.js)
- `/Users/coldgame/MRSTRIKE/MISTERsmartcontracts/vault-operations.js`
- Lines 95-176: `lockFunds()` function (DEPOSIT)
- Lines 179-277: `unlockFunds()` function (WITHDRAWAL)

### Current Frontend (Broken)
- `/Users/coldgame/MRSTRIKE/sydney-agents/mister-frontend/src/app/agent-vault-v2/page.tsx`
- Lines 1315-1393: Deposit attempt (API doesn't exist)
- Lines 1397-1490: Withdrawal attempt (fails on missing datum)

### Aiken Validator
- `/Users/coldgame/MRSTRIKE/MISTERsmartcontracts/vault/validators/hello_world.ak`
- Requires datum with owner's VerificationKeyHash
- Requires redeemer with msg = "Hello, World!"

## 🚀 IMMEDIATE NEXT STEPS

1. **GET LUCID EVOLUTION DOCS**
   - Find correct method to deposit with datum
   - Find examples of smart contract interactions

2. **OR USE RAILWAY SERVICE**
   - Already works perfectly
   - Just need to call the endpoints from frontend
   - `/lock` endpoint for deposit (WITH datum)
   - `/unlock` endpoint for withdrawal

3. **TEST WITH NEW FUNDS**
   - Once deposit is fixed, use NEW funds (not the stuck 5 ADA)
   - Deposit 2 ADA with proper datum
   - Test withdrawal on correctly deposited funds

## ⚠️ IMPORTANT NOTES

- **DO NOT** try to withdraw the existing 5 ADA - it's impossible without datum
- **DO NOT** use Lucid Evolution until we have proper documentation
- **CONSIDER** using Railway service endpoints instead of frontend libraries
- **TEST** with small amounts (1-2 ADA) until proven working

## 🔗 USEFUL COMMANDS

### Check UTXO Status
```bash
curl -H "project_id: mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu" \
  https://cardano-mainnet.blockfrost.io/api/v0/addresses/addr1w9amamp0dl4m0dkf9hmwnzgux36eueptvm5z7fmfedyc2pqhlafmz/utxos
```

### Railway Service Health Check
```bash
curl https://friendly-reprieve-production.up.railway.app/health
```

---

**STATUS**: BLOCKED - Need Lucid Evolution documentation or switch to Railway service calls
**STUCK FUNDS**: 5 ADA (unrecoverable without new validator)
**LAST UPDATED**: January 17, 2025 @ 5:58 PM