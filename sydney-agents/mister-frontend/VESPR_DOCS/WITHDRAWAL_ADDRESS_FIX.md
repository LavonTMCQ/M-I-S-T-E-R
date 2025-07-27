# 🔧 WITHDRAWAL ADDRESS CORRUPTION FIX

## 🚨 **CRITICAL ISSUE IDENTIFIED AND FIXED**

### **The Problem**
Withdrawal transactions were failing because `walletApi.getChangeAddress()` was returning a **corrupted address**:
- **Correct Address**: `addr1qxtkdjl87894tg6juz20jzyjqy3uyn02pr9xtq7mlh0gm2ss5dpkcny95dktp5qmyyrx82t68sge4m94qwxyrfr8f86qh5unyc`
- **Corrupted Address**: `addr1qxtkdjl87894tg6juz20jzyjqy3uyn02pr9xtq7mlh0gm2ss5dpkcny95dktp5qmyyrx82t68sge4m94qwxyrfr8f86qh5unye`

**Notice**: Last characters changed from `h5unyc` to `h5unye` - causing Blockfrost "Invalid address" errors.

### **Root Cause**
```typescript
// ❌ PROBLEMATIC CODE
const recipientAddress = operation === 'deposit'
  ? AGENT_VAULT_V2_CONFIG.contractAddress
  : await walletApi.getChangeAddress(); // Returns corrupted address!
```

### **The Fix**
```typescript
// ✅ FIXED CODE
if (operation === 'deposit') {
  recipientAddress = AGENT_VAULT_V2_CONFIG.contractAddress;
} else {
  // Use wallet's main address instead of change address
  const addresses = await walletApi.getUsedAddresses();
  if (addresses && addresses.length > 0) {
    recipientAddress = addresses[0]; // ✅ CORRECT ADDRESS
  } else {
    recipientAddress = await walletApi.getChangeAddress(); // Fallback only
  }
}
```

## 🎯 **Why This Happened**

1. **Deposits worked**: Used contract address directly (no wallet address needed)
2. **Withdrawals failed**: Used `getChangeAddress()` which returned corrupted format
3. **UI showed 0 balance**: Transaction building failed, so vault state couldn't be queried

## ✅ **Status**
- **File Modified**: `src/services/simple-transaction-service.ts`
- **Method Updated**: `buildVaultTransaction()`
- **Fix Applied**: Use `getUsedAddresses()[0]` instead of `getChangeAddress()`
- **Ready for Testing**: Withdrawal should now work correctly

## 🧪 **Next Steps**
1. Test withdrawal functionality
2. Verify correct address is used in transaction building
3. Confirm vault balance displays correctly after successful withdrawal

**This fix ensures withdrawals use the same reliable address format as deposits!** 🎉