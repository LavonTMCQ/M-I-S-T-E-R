# Strike Finance Integration - Quick Reference
## Developer Cheat Sheet

**Version:** 1.0  
**Date:** January 3, 2025  
**Status:** ✅ PRODUCTION READY

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm add @emurgo/cardano-serialization-lib-browser @emurgo/cardano-serialization-lib-nodejs
```

### 2. Configure Next.js
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };
    return config;
  },
  transpilePackages: ['@emurgo/cardano-serialization-lib-browser'],
};
```

### 3. Create API Route
```typescript
// /src/app/api/cardano/sign-transaction/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { txCbor, witnessSetCbor } = await request.json();
  
  // Use browser version for better Next.js compatibility
  const CSL = await import('@emurgo/cardano-serialization-lib-browser');
  
  // Parse transaction and witness set
  const originalTx = CSL.Transaction.from_bytes(Buffer.from(txCbor, 'hex'));
  const walletWitnessSet = CSL.TransactionWitnessSet.from_bytes(Buffer.from(witnessSetCbor, 'hex'));
  
  // Combine witness sets
  const combinedWitnessSet = CSL.TransactionWitnessSet.new();
  const walletVkeys = walletWitnessSet.vkeys();
  if (walletVkeys) {
    combinedWitnessSet.set_vkeys(walletVkeys);
  }
  
  // Rebuild transaction
  const signedTx = CSL.Transaction.new(
    originalTx.body(),
    combinedWitnessSet,
    originalTx.auxiliary_data()
  );
  
  return NextResponse.json({
    success: true,
    signedTxCbor: Buffer.from(signedTx.to_bytes()).toString('hex')
  });
}
```

### 4. Frontend Integration
```typescript
// Frontend wallet signing
const handleTrade = async () => {
  // 1. Get CBOR from Strike Finance
  const { cbor } = await fetch('/api/strike/trade', { ... });
  
  // 2. Sign with wallet (partial signing)
  const witnessSet = await walletApi.signTx(cbor, true);
  
  // 3. Combine on server
  const { signedTxCbor } = await fetch('/api/cardano/sign-transaction', {
    method: 'POST',
    body: JSON.stringify({ txCbor: cbor, witnessSetCbor: witnessSet })
  });
  
  // 4. Submit to network
  const txHash = await walletApi.submitTx(signedTxCbor);
};
```

---

## ⚠️ Critical Fixes

### ❌ DON'T: String Manipulation
```typescript
// BROKEN - Don't do this
combinedTx = txCbor.replace('f5f6', witnessSetCbor + 'f6');
```

### ✅ DO: Proper CSL
```typescript
// CORRECT - Use Cardano Serialization Library
const originalTx = CSL.Transaction.from_bytes(Buffer.from(txCbor, 'hex'));
const signedTx = CSL.Transaction.new(txBody, combinedWitnessSet, auxiliaryData);
```

### ❌ DON'T: Node.js Version in API Routes
```typescript
// PROBLEMATIC - WASM loading issues
const CSL = await import('@emurgo/cardano-serialization-lib-nodejs');
```

### ✅ DO: Browser Version
```typescript
// WORKING - Better Next.js compatibility
const CSL = await import('@emurgo/cardano-serialization-lib-browser');
```

---

## 🔍 Debugging

### Common Error Messages
| Error | Cause | Solution |
|-------|-------|----------|
| `Size mismatch when decoding Record RecD` | CBOR structure corruption | Use proper CSL parsing |
| `ENOENT: ...wasm file not found` | WASM loading issue | Use browser version of CSL |
| `Cannot read properties of null` | Invalid CBOR data | Validate CBOR before processing |

### Debug Logging
```typescript
console.log('📋 Strike Finance CBOR:', txCbor.length, 'bytes');
console.log('📋 Wallet witness set:', witnessSetCbor.length, 'bytes');
console.log('📋 Final transaction:', signedTxCbor.length, 'bytes');
console.log('🔍 CBOR structure:', txCbor.substring(0, 20), '...', txCbor.slice(-20));
```

---

## 📊 Expected Values

### Transaction Sizes
- **Strike Finance CBOR**: ~8,400 bytes (ends with `f5f6`)
- **Wallet Witness Set**: ~200 bytes (starts with `a100818258`)
- **Final Transaction**: ~8,600 bytes (properly combined)

### CBOR Patterns
- **Strike Finance**: `84ac00d9...f5f6` (4-element array, null witnesses)
- **Wallet Witness**: `a100818258...` (map with vkey witnesses)
- **Final Result**: `84ac00d9...a100818258...f6` (combined structure)

---

## 🚨 Production Checklist

### Before Deployment
- [ ] WASM configuration in `next.config.ts`
- [ ] Proper CSL import (browser version)
- [ ] Error handling for all failure modes
- [ ] Logging for transaction attempts
- [ ] Health check endpoint
- [ ] Rate limiting on API routes

### Testing Verification
- [ ] Strike Finance API returns valid CBOR
- [ ] Wallet signing produces valid witness set
- [ ] Server-side combination works correctly
- [ ] Transaction submits to Cardano network
- [ ] Transaction hash appears on blockchain

---

## 🔗 Quick Links

### Documentation
- [Full Implementation Guide](./2025-01-03_NextJS-CardanoCSL-StrikeFinance_Integration-Guide.md)
- [Cardano Serialization Library](https://github.com/Emurgo/cardano-serialization-lib)
- [CIP-30 Wallet Standard](https://cips.cardano.org/cips/cip30/)

### Successful Transaction
- **Hash**: `14f025be82f53f6b7a1725bf64a2fc415536ea8c9474bb9fe46a4b879020989d`
- **Network**: Cardano Mainnet
- **Status**: ✅ Confirmed

---

## 🆘 Emergency Contacts

### If Things Break
1. **Check WASM loading**: Verify Next.js configuration
2. **Validate CBOR**: Ensure proper CSL parsing
3. **Review logs**: Look for specific error patterns
4. **Rollback**: Revert to previous working version
5. **Contact**: Development team for urgent issues

---

**Quick Reference Status**: ✅ Ready for Development  
**Last Updated**: January 3, 2025  
**Implementation**: Proven in Production
