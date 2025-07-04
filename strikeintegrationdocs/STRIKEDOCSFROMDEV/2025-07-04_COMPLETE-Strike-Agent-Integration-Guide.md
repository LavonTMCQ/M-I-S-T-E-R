# COMPLETE Strike Agent Integration Guide
## The First Perpetual DEX on Cardano - AI Agent Integration

**Date:** January 4, 2025  
**Status:** ✅ FULLY OPERATIONAL  
**Significance:** First perpetual DEX on Cardano integrated with AI agent trading

---

## 🎯 CRITICAL SUCCESS FACTORS

This document preserves the **EXACT WORKING IMPLEMENTATION** of the Strike Finance AI Agent integration. This is the foundation for all future trading features.

### ⚠️ DO NOT MODIFY WITHOUT TESTING
- Every component listed here is **CRITICAL** and **TESTED**
- Changes to any part require full end-to-end testing
- This is the reference implementation for all future trading agents

---

## 🏗️ ARCHITECTURE OVERVIEW

### Core Components
1. **Mastra Strike Agent** (`sydney-agents/src/mastra/agents/strike-agent.ts`)
2. **Frontend Chat Interface** (`sydney-agents/mister-frontend/src/components/trading/AITradingChat.tsx`)
3. **API Bridge** (`sydney-agents/mister-frontend/src/app/api/agents/strike/chat/route.ts`)
4. **CSL Transaction Signing** (`sydney-agents/mister-frontend/src/app/api/cardano/sign-transaction/route.ts`)
5. **Unified Execution Service** (`sydney-agents/src/mastra/services/unified-execution-service.ts`)

### Data Flow
```
User Input → Frontend Chat → API Bridge → Mastra Agent → Strike Finance API → CBOR Generation → Wallet Signing → CSL Processing → Transaction Submission → Success Response
```

---

## 🔧 MASTRA STRIKE AGENT CONFIGURATION

### Agent Definition
**File:** `sydney-agents/src/mastra/agents/strike-agent.ts`

**Critical Requirements:**
- Must use `({ context })` parameter pattern (NOT `(params)`)
- Must include user wallet context in system prompt
- Must handle tool results properly

### System Prompt Structure
```typescript
const systemPrompt = `
User Context:
- Wallet Address: ${context.walletAddress}
- Stake Address: ${context.stakeAddress}
- Balance: ${context.balance} ADA
- Wallet Type: ${context.walletType}
- ADA Handle: ${context.handle}

[Rest of prompt...]
`;
```

### Tool Integration
**executeManualTrade Tool:**
- Returns `requiresFrontendSigning: true` for connected wallets
- Returns `cbor: string` with transaction CBOR
- Uses Unified Execution Service for Strike Finance API calls

---

## 🎨 FRONTEND CHAT INTERFACE

### Component: AITradingChat.tsx
**File:** `sydney-agents/mister-frontend/src/components/trading/AITradingChat.tsx`

**Critical Functions:**
1. **handleWalletSigning()** - Processes CBOR and triggers wallet
2. **CBOR Detection Logic** - Parses complex Mastra responses
3. **CSL Transaction Flow** - Uses proper Cardano Serialization Library

### CBOR Extraction Logic
```typescript
// Method 1: Check in result.messages for tool results
// Method 2: Check in result.steps (Mastra step-by-step execution)  
// Method 3: Deep search in the entire response object
// Method 4: Fallback to result.toolCalls (legacy format)
```

### Wallet Signing Flow
```typescript
// Step 1: Sign with wallet (partial signing)
const witnessSetCbor = await walletApi.signTx(transactionCbor, true);

// Step 2: Send to server for CSL combination
const signingResponse = await fetch('/api/cardano/sign-transaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ txCbor: transactionCbor, witnessSetCbor })
});

// Step 3: Submit to Cardano network
const txHash = await walletApi.submitTx(signedTxCbor);
```

---

## 🌉 API BRIDGE CONFIGURATION

### Route: /api/agents/strike/chat
**File:** `sydney-agents/mister-frontend/src/app/api/agents/strike/chat/route.ts`

**Critical Features:**
1. **User Context Injection** - Adds wallet details to every request
2. **Complex Response Parsing** - Handles massive Mastra API responses
3. **CBOR Detection** - Multiple methods to find transaction data
4. **Error Handling** - Graceful fallbacks and debugging

### Request Format
```typescript
const requestBody = {
  messages: [
    {
      role: 'user',
      content: `User Context:\n- Wallet Address: ${walletAddress}\n- Stake Address: ${stakeAddress}\n- Balance: ${balance} ADA\n- Wallet Type: ${walletType}\n- ADA Handle: ${handle}\n\nUser Message: ${userMessage}`
    }
  ]
};
```

### Response Processing
```typescript
// Search for CBOR in multiple locations:
// 1. result.messages[].content[].result.data
// 2. result.steps[].toolResults[].result.data  
// 3. Deep recursive search for requiresFrontendSigning + cbor
// 4. Fallback to result.toolCalls
```

---

## 🔐 CSL TRANSACTION SIGNING

### Route: /api/cardano/sign-transaction
**File:** `sydney-agents/mister-frontend/src/app/api/cardano/sign-transaction/route.ts`

**Purpose:** Properly combine Strike Finance CBOR with wallet signatures using Cardano Serialization Library

### Critical Implementation
```typescript
// Import CSL browser version
const CSL = await import('@emurgo/cardano-serialization-lib-browser');

// Parse original transaction from Strike Finance
const originalTx = CSL.Transaction.from_bytes(Buffer.from(txCbor, 'hex'));

// Parse wallet witness set
const walletWitnessSet = CSL.TransactionWitnessSet.from_bytes(Buffer.from(witnessSetCbor, 'hex'));

// Combine witness sets properly
const combinedWitnessSet = CSL.TransactionWitnessSet.new();
// [Detailed combination logic...]

// Create final signed transaction
const signedTx = CSL.Transaction.new(txBody, combinedWitnessSet, auxiliaryData);
```

---

## ⚙️ UNIFIED EXECUTION SERVICE

### Service: UnifiedExecutionService
**File:** `sydney-agents/src/mastra/services/unified-execution-service.ts`

**Critical Functions:**
1. **executeConnectedWalletTrade()** - Handles connected wallet trades
2. **Strike Finance API Integration** - Proper request formatting
3. **CBOR Response Handling** - Returns `FRONTEND_SIGNING_REQUIRED:${cbor}`

### Strike Finance API Format
```typescript
const requestData = {
  address: walletAddress, // NOT bech32Address
  asset: { policyId: "", assetName: "" }, // ADA
  collateralAmount: collateralInAda, // NOT lovelace
  leverage: leverage,
  position: side, // "Long" or "Short"
  enteredPositionTime: Date.now()
};
```

---

## 📋 DEPENDENCIES & CONFIGURATION

### Required Packages
```json
{
  "@emurgo/cardano-serialization-lib-browser": "^12.1.1",
  "@emurgo/cardano-serialization-lib-nodejs": "^12.1.1"
}
```

### Next.js Configuration
```typescript
// next.config.ts
const nextConfig = {
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  }
};
```

---

## 🧪 TESTING PROTOCOL

### End-to-End Test Sequence
1. **Agent Response Test**
   ```
   Input: "Go long 45 ADA with 2x leverage"
   Expected: Agent responds with trade preparation message
   ```

2. **CBOR Generation Test**
   ```
   Check terminal logs for: "📋 CBOR length: XXXX characters"
   Expected: 8000+ character CBOR string
   ```

3. **Wallet Signing Test**
   ```
   Expected: Vespr wallet popup appears
   Action: Sign transaction
   ```

4. **Transaction Submission Test**
   ```
   Expected: Success message with transaction hash
   Verify: Transaction appears on Cardanoscan
   ```

### Critical Test Requirements
- **Minimum Trade Amount:** 40+ ADA (Strike Finance requirement)
- **Wallet Connection:** Must be connected with sufficient balance
- **Network:** Mainnet Cardano network

---

## 🚨 TROUBLESHOOTING GUIDE

### Common Issues & Solutions

**Issue:** "Cannot read properties of undefined (reading 'toUpperCase')"
**Solution:** Check AITradingChat.tsx line 357 - ensure tradeAction.action exists

**Issue:** "Size mismatch when decoding Record RecD"
**Solution:** Use CSL transaction signing, not direct Blockfrost submission

**Issue:** Wallet popup doesn't appear
**Solution:** Check CBOR extraction logic in API bridge

**Issue:** Strike Finance API 500 error
**Solution:** Verify minimum 40 ADA trade amount

---

## 📈 SUCCESS METRICS

### Confirmed Working Features
- ✅ AI Agent trade execution
- ✅ Wallet signing popup
- ✅ CSL transaction processing  
- ✅ Strike Finance API integration
- ✅ Transaction submission to Cardano
- ✅ Complete user feedback loop

### Transaction Example
**Hash:** `f05aff53d16e68c9934730e32db9bd4bcd181aa1cd22c6c8266593d0ed1466c9`
**Details:** 45 ADA, 2x leverage, Long position
**Status:** Successfully executed and confirmed

---

## 🔮 FUTURE ENHANCEMENTS

This foundation enables:
1. **Managed Wallet Trading** - Server-side signing for algorithmic trades
2. **Cardano Native Token Trading** - Multi-asset perpetual positions
3. **Advanced AI Strategies** - Complex trading algorithms
4. **Copy Trading Networks** - Social trading features

---

---

## 📁 FILE LOCATIONS & CRITICAL CODE

### Core Files (DO NOT MODIFY WITHOUT TESTING)
```
sydney-agents/src/mastra/agents/strike-agent.ts
sydney-agents/mister-frontend/src/components/trading/AITradingChat.tsx
sydney-agents/mister-frontend/src/app/api/agents/strike/chat/route.ts
sydney-agents/mister-frontend/src/app/api/cardano/sign-transaction/route.ts
sydney-agents/src/mastra/services/unified-execution-service.ts
```

### Configuration Files
```
sydney-agents/mister-frontend/next.config.ts
sydney-agents/mister-frontend/package.json
sydney-agents/src/mastra/index.ts
```

---

## 🔍 DEBUGGING COMMANDS

### Check Mastra Agent Status
```bash
cd sydney-agents
pnpm dev
# Check http://localhost:4112/api/agents/strikeAgent/generate
```

### Check Frontend Status
```bash
cd sydney-agents/mister-frontend
pnpm dev
# Check http://localhost:3000/trading
```

### Monitor Logs
```bash
# Terminal 1: Mastra logs
cd sydney-agents && pnpm dev

# Terminal 2: Frontend logs
cd sydney-agents/mister-frontend && pnpm dev

# Browser: Check console for CBOR extraction logs
```

---

**⚠️ PRESERVATION NOTICE:**
This document represents the first successful integration of a perpetual DEX on Cardano with AI agent trading. Every component listed here is battle-tested and operational. Preserve this implementation as the foundation for all future trading features.
