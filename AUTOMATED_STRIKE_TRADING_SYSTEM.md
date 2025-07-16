# Automated Strike Finance Trading System

## 🎯 Overview

This document describes the comprehensive automated trading system that eliminates manual wallet signing for Strike Finance perpetual trades. The system provides dual-mode operation supporting both traditional browser wallet signing and fully automated seed phrase-based signing.

## 🏗️ Architecture

### Core Components

1. **Automated Strike Trading Service** (`automated-strike-trading-service.ts`)
   - Manages automated Strike Finance trades using seed phrases
   - Handles transaction signing without user interaction
   - Provides Discord notifications and comprehensive logging

2. **Backend Transaction Signing** (`backendTransactionSigning.ts`)
   - Extended with real CSL (Cardano Serialization Library) implementation
   - Signs Strike Finance CBOR transactions using seed phrases
   - Submits transactions to Cardano network via Blockfrost

3. **Automated Signing API** (`/api/cardano/automated-strike-signing`)
   - REST endpoint for server-side transaction signing
   - Accepts CBOR and seed phrase, returns signed transaction hash
   - Secure server-side only execution

4. **Enhanced Strike Agent** (`strike-agent.ts`)
   - Dual-mode detection based on wallet type
   - Routes to appropriate signing method (manual vs automated)
   - Maintains backward compatibility with existing flows

5. **Unified Execution Service** (`unified-execution-service.ts`)
   - Integrates with automated Strike trading service
   - Handles both connected and managed wallet execution
   - Provides consistent interface for both modes

6. **Unified Managed Wallet Service** (`unified-managed-wallet-service.ts`)
   - Connects CNT bot managed wallets with Strike Finance
   - Supports both DEX trades and perpetual trades
   - Uses same encrypted seed phrase storage for both

## 🔄 Trading Flows

### Manual Trading Flow (Connected Wallets)

```
User Request → Strike Agent → Unified Execution Service → Strike Finance API
     ↓
CBOR Generated → Frontend → Browser Wallet Popup → User Signs → Transaction Submitted
```

**Key Characteristics:**
- User must sign each transaction manually
- Browser wallet popup appears
- CBOR data prepared for frontend signing
- Compatible with Eternl, Vespr, Nami, etc.

### Automated Trading Flow (Managed Wallets)

```
User Request → Strike Agent → Unified Execution Service → Automated Strike Service
     ↓
Strike Finance API → CBOR Generated → Automated Signing API → Seed Phrase Signing
     ↓
Transaction Submitted → Discord Notification → Transaction Hash Returned
```

**Key Characteristics:**
- No user interaction required
- Automatic seed phrase signing
- Immediate transaction hash response
- Discord notifications for trade completion

## 🔐 Security Model

### Seed Phrase Management
- Encrypted storage using managed wallet system
- Server-side only decryption and signing
- Never exposed to frontend or browser
- Proper key derivation using CIP-1852 standard

### Transaction Signing
- Uses official Cardano Serialization Library (CSL)
- Preserves Strike Finance transaction structure
- Combines user signatures with existing witnesses
- Submits via Blockfrost for network reliability

### Access Control
- Managed wallet registration required
- User consent for automated trading
- Trading limits and risk management
- Comprehensive audit logging

## 🛠️ Implementation Details

### Strike Agent Dual-Mode Detection

```typescript
// Detect wallet type from context
const isConnectedWallet = context?.walletType && !['managed'].includes(context.walletType);
const isManagedWallet = context?.walletType === 'managed' || context?.tradingMode === 'managed';

// Route to appropriate execution method
if (isManagedWallet) {
  // Automated signing flow
  return await executeAutomatedTrade(request);
} else {
  // Manual signing flow  
  return await executeConnectedWalletTrade(request);
}
```

### Automated Transaction Signing

```typescript
// Real CSL implementation for Strike Finance
const CSL = await import('@emurgo/cardano-serialization-lib-nodejs');
const transaction = CSL.Transaction.from_bytes(Buffer.from(txCbor, 'hex'));

// Derive private key from seed phrase
const entropy = mnemonicToEntropy(seedPhrase);
const rootKey = CSL.Bip32PrivateKey.from_bip39_entropy(Buffer.from(entropy, 'hex'));
const paymentKey = rootKey.derive(1852 | 0x80000000).derive(1815 | 0x80000000).derive(0 | 0x80000000).derive(0).derive(0).to_raw_key();

// Sign and submit transaction
const vkeyWitness = CSL.make_vkey_witness(txHash, paymentKey);
const signedTx = CSL.Transaction.new(txBody, witnessSet, auxiliaryData);
```

### Integration with CNT Bot

The system integrates with the existing CNT bot managed wallet infrastructure:

- **Shared Wallet System**: Same encrypted seed phrase storage
- **Unified Interface**: Both DEX and perpetual trades use same wallet
- **Risk Management**: Consistent trading limits across both systems
- **Discord Notifications**: Unified notification system

## 📊 Testing & Validation

### Test Suite (`test-automated-strike-trading.js`)

1. **Service Health Check**: Validates all components are operational
2. **Managed Wallet Creation**: Tests wallet creation and registration
3. **Dual-Mode Detection**: Verifies Strike agent routing logic
4. **Automated Execution**: Simulates end-to-end trade execution
5. **Mode Compatibility**: Ensures both modes work with same interface

### Running Tests

```bash
cd sydney-agents
node test-automated-strike-trading.js
```

## 🚀 Deployment

### Prerequisites

1. **Environment Variables**:
   ```
   BLOCKFROST_PROJECT_ID=mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu
   DISCORD_BOT_TOKEN=your_discord_token
   ```

2. **Dependencies**:
   ```bash
   pnpm install @emurgo/cardano-serialization-lib-nodejs
   pnpm install @emurgo/cardano-serialization-lib-browser
   pnpm install bip39
   ```

### Mastra Cloud Compatibility

The system is designed for Mastra Cloud deployment:
- Server-side signing ensures security
- API endpoints work with cloud infrastructure
- Memory and storage optimized for cloud environments
- Compatible with existing Mastra agent framework

## 🔧 Configuration

### Automated Trading Service

```typescript
const automatedStrikeTradingService = new AutomatedStrikeTradingService(
  'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu', // Blockfrost project ID
  '/api/cardano/automated-strike-signing'      // Signing endpoint
);
```

### Strike Agent Context

```typescript
// Connected wallet context
{
  walletAddress: 'addr1...',
  walletType: 'eternl',
  tradingMode: 'connected'
}

// Managed wallet context  
{
  walletAddress: 'addr1...',
  walletType: 'managed',
  tradingMode: 'managed'
}
```

## 📈 Benefits

### For Users
- **No Manual Signing**: Trades execute automatically
- **24/7 Trading**: Automated execution without user presence
- **Consistent Experience**: Same interface for both modes
- **Risk Management**: Built-in trading limits and controls

### For Platform
- **Competitive Advantage**: First automated perpetual trading on Cardano
- **User Retention**: Seamless trading experience
- **Scalability**: Handles high-frequency automated trading
- **Security**: Enterprise-grade seed phrase management

## 🔮 Future Enhancements

1. **Multi-Asset Support**: Extend beyond ADA perpetuals
2. **Advanced Strategies**: Implement complex trading algorithms
3. **Copy Trading**: Social trading features with managed wallets
4. **Mobile Integration**: Mobile app with automated trading
5. **Institutional Features**: API access for institutional traders

## 🛡️ Security Considerations

### Production Deployment
- Use hardware security modules (HSM) for seed phrase storage
- Implement rate limiting on automated signing endpoints
- Add multi-signature requirements for large trades
- Regular security audits of signing infrastructure

### Monitoring
- Real-time transaction monitoring
- Automated alerts for failed trades
- Performance metrics and analytics
- Comprehensive audit trails

---

**Status**: ✅ Implementation Complete  
**Testing**: ✅ Comprehensive Test Suite Available  
**Documentation**: ✅ Complete Implementation Guide  
**Deployment**: 🚀 Ready for Mastra Cloud

This automated trading system represents a significant advancement in DeFi user experience, eliminating the friction of manual transaction signing while maintaining the highest security standards.
