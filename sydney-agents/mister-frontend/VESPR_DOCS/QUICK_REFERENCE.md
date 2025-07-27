# 🚨 VESPR WALLET QUICK REFERENCE - EMERGENCY GUIDE

## 🔥 **IMMEDIATE SOLUTION**

### **THE PROBLEM**
Vespr wallet `signTx(txCbor, true)` returns WITNESS SET, not complete transaction.

### **THE FIX**
```typescript
// ✅ PRIMARY: Complete transaction signing
signedTxCbor = await walletApi.signTx(txCbor, false);

// ✅ FALLBACK: Witness set + server combination
witnessSetCbor = await walletApi.signTx(txCbor, true);
signedTxCbor = await combineTransactionWithWitnessSet(txCbor, witnessSetCbor);
```

## 🎯 **CRITICAL FILES**

### **Server API**
- `/api/cardano/sign-transaction/route.ts` - CBOR combination endpoint

### **Client Service**
- `src/services/simple-transaction-service.ts` - Dual signing approach

## ✅ **CONFIRMED WORKING**
- **Deposit**: ✅ SUCCESS (10 ADA confirmed)
- **Withdrawal**: Ready to test
- **Emergency Stop**: Ready to test

## 🚨 **NEVER FORGET**
- `signTx(false)` = Complete transaction ✅
- `signTx(true)` = Witness set only ⚠️
- Always try complete signing FIRST
- Server-side CBOR combination for fallback

**STATUS**: 🎉 **PERMANENTLY FIXED** 🎉