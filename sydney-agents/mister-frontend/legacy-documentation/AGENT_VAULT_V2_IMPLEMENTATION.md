# Agent Vault V2 - Working Implementation Guide

## Overview

This is a **working implementation** of Agent Vault V2 based on the proven Aiken vesting contract pattern. It includes an emergency admin withdrawal mechanism for fund recovery, ensuring your funds are never permanently locked.

## Key Features

✅ **Based on Aiken's Official Vesting Example** - Following proven patterns  
✅ **CIP-32 Inline Datums** - Proper datum attachment to outputs  
✅ **Emergency Admin Withdrawal** - Safety mechanism for fund recovery  
✅ **Owner-based Fund Isolation** - Each user's funds are separate  
✅ **Clean Transaction Building** - Following Lucid Evolution best practices  

## Implementation Structure

### 1. Smart Contract (Aiken)
**File:** `/validators/agent_vault_v2.ak`

```aiken
validator agent_vault_v2 {
  spend(datum_opt, redeemer, own_ref, tx) {
    // Three withdrawal methods:
    // 1. UserWithdraw - Owner signature required
    // 2. AdminWithdraw - Admin signature required (emergency)
    // 3. AgentTrade - Future implementation with oracle feeds
  }
}
```

**Key Components:**
- `VaultDatum`: Stores owner and admin public key hashes
- `VaultRedeemer`: Three variants for different operations
- Emergency recovery built into the contract logic

### 2. Off-Chain Service (TypeScript)
**File:** `/src/services/agent-vault-v2-proper.ts`

**Core Methods:**
- `deposit()` - Deposits funds with inline datum (CIP-32)
- `withdraw()` - Normal user withdrawal
- `adminWithdraw()` - Emergency admin withdrawal
- `getBalance()` - Check vault balance for an owner
- `listVaultUtxos()` - View all UTXOs in the vault

### 3. Test Interface
**File:** `/src/app/agent-vault-v2-test/page.tsx`

A complete UI for testing all vault operations.

## How to Build and Deploy

### Step 1: Build the Aiken Contract

```bash
cd sydney-agents/mister-frontend
aiken build
```

This generates:
- `/plutus.json` - Contract blueprint with CBOR
- Contract hash: `8f1e4ac2d79fe8fc5e1c58ce54853ebf894f3cd4518327343c2d0cac`

### Step 2: Note the Contract CBOR

The compiled CBOR is in `plutus.json`:
```
5901850101003232323232322533300232323232325332330083001300937540042646644646464a66601c60060022a66602260206ea80240085854ccc038c01c00454ccc044c040dd50048010b0a99980719b87480100044c8c94ccc04cc05400854ccc040c014c044dd5000899191919299980b980c8010040b1bad30170013017002375c602a00260246ea80045858c04c004c040dd50048b18071baa0081533300c3001300d375400426464646464a666022600c0022660040086eb8c00cc04cdd50028a99980898050008998010021bae301530163013375400a2646600600a6eb8c010c050dd5003180a98099baa00c3011375401644646600200200644a66602c00229404cc894ccc054cdc78010028a51133004004001375c602e0026030002460260026eb0c044c048c048c048c048c048c048c048c048c03cdd5004980818071baa00216370e900018068009806980700098051baa002370e90010b1805180580198048011804001180400098021baa00114984d9595cd2ab9d5573caae7d5d0aba201
```

### Step 3: Configure the Service

In `/src/services/agent-vault-v2-proper.ts`:
1. The CBOR is already hardcoded
2. Set your admin public key hash (line 47)
3. Configure Blockfrost API key

### Step 4: Test the Implementation

1. Start the development server:
```bash
npm run dev
```

2. Navigate to: `http://localhost:3000/agent-vault-v2-test`

3. Connect your Vespr wallet

4. Test operations:
   - **Deposit** - Locks funds in the vault
   - **Normal Withdrawal** - Owner withdraws their funds
   - **Admin Withdrawal** - Emergency recovery (requires admin wallet)

## Transaction Building Pattern

### Deposit (Following Vesting Example)
```typescript
const tx = await lucid.newTx()
  .pay.ToAddressWithData(
    scriptAddress,
    { kind: 'inline', value: datumCbor },  // CIP-32 inline datum
    { lovelace: amount }
  )
  .complete();
```

### Withdrawal (With Redeemer)
```typescript
const tx = await lucid.newTx()
  .collectFrom(utxos, redeemerCbor)
  .attach.SpendingValidator(script)
  .addSigner(walletAddress)
  .complete();
```

## CIP Implementations

### CIP-32 (Inline Datums) ✅
Datums are attached directly to outputs using Lucid's `ToAddressWithData`:
```typescript
.pay.ToAddressWithData(address, { kind: 'inline', value: datum }, assets)
```

### CIP-31 (Reference Inputs) - Future
The `AgentTrade` redeemer is prepared for oracle integration:
```aiken
AgentTrade { oracle_ref: OutputReference }
```

### CIP-40 (Collateral Outputs) - Future
Will be added to protect against large losses from failed transactions.

## Emergency Recovery Process

If funds get stuck:

1. **Use Admin Withdrawal**
   - Switch to admin wallet
   - Call `adminWithdraw()`
   - All funds returned to admin

2. **Direct UTXO Recovery**
   - Target specific UTXOs
   - Pass UTXO to `adminWithdraw(targetUtxo)`

3. **Fallback Recovery Services**
   - Use existing recovery services in `/src/services/`
   - These bypass script validation entirely

## Common Issues and Solutions

### "UTxO not found"
- **Cause:** Wrong datum structure or address calculation
- **Solution:** Use the provided implementation exactly

### "Invalid witness"
- **Cause:** Missing signer or wrong redeemer
- **Solution:** Ensure wallet address is added as signer

### "Funds stuck"
- **Cause:** Logic error in withdrawal
- **Solution:** Use admin withdrawal for recovery

## Testing Checklist

- [ ] Connect wallet (Vespr recommended)
- [ ] Deposit 10 ADA
- [ ] Check balance shows correctly
- [ ] Withdraw funds normally
- [ ] Test admin withdrawal
- [ ] Verify on Cardano explorer

## Network Configuration

**Preview Testnet (Default)**
- Blockfrost: `https://cardano-preview.blockfrost.io/api/v0`
- Explorer: `https://preview.cardanoscan.io`

**Preprod Testnet**
- Blockfrost: `https://cardano-preprod.blockfrost.io/api/v0`
- Explorer: `https://preprod.cardanoscan.io`

**Mainnet**
- Blockfrost: `https://cardano-mainnet.blockfrost.io/api/v0`
- Explorer: `https://cardanoscan.io`

## Key Differences from Failed Attempts

1. **Single, consistent CBOR** - No multiple versions
2. **Proper datum structure** - Matching Aiken types exactly
3. **Clean redeemer variants** - Using Data.Enum pattern
4. **Emergency recovery** - Built into the contract
5. **Following proven patterns** - Based on Aiken vesting example

## Next Steps

1. **Test thoroughly on Preview testnet**
2. **Add oracle integration (CIP-31)**
3. **Implement collateral protection (CIP-40)**
4. **Deploy to mainnet when ready**

## Support

If you encounter issues:
1. Check the transaction on Cardano explorer
2. Use admin withdrawal for recovery
3. Review this documentation
4. Check Aiken documentation: https://aiken-lang.org

---

**Remember:** Your funds are never truly "lost" - they're just locked by the smart contract rules. The admin withdrawal ensures you can always recover them in an emergency.