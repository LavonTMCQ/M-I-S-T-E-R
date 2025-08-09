# 🧪 Agent Vault V2 Testing Guide

## ✅ CIP Compliance Status

The implementation is fully compliant with Cardano Improvement Proposals (CIPs):

- **CIP-30**: dApp-Wallet Communication Bridge ✅
  - Proper wallet API methods (getUtxos, signTx, submitTx)
  - Error handling with standard error codes
  - Extension support detection

- **CIP-31**: Reference Inputs ✅
  - Used for reading vault state without spending UTxOs
  - Efficient contract state queries

- **CIP-32**: Inline Datums ✅
  - Vault state stored as inline datum
  - No datum hash lookups required

- **CIP-40**: Collateral Outputs ✅
  - Proper collateral handling for Plutus scripts
  - Automatic collateral selection

## 🚀 Starting the Frontend

### Prerequisites
- Node.js 18+ installed
- npm or pnpm package manager
- Vespr wallet browser extension (recommended)

### Quick Start

```bash
# Navigate to frontend directory
cd /Users/coldgame/MRSTRIKE/sydney-agents/mister-frontend

# Run the startup script
./start-dev.sh

# Or manually:
npm install
npm run dev
```

The frontend will start at: **http://localhost:3000**

## 📡 Production Services

All backend services are HOSTED and running in production:

| Service | URL | Status |
|---------|-----|--------|
| Bridge Server | https://bridge-server-cjs-production.up.railway.app | ✅ LIVE |
| Mastra Cloud | https://substantial-scarce-magazin.mastra.cloud | ✅ LIVE |
| CNT Trading | https://cnt-trading-api-production.up.railway.app | ✅ LIVE |
| Blockfrost | Mainnet API | ✅ CONFIGURED |

## 🏦 Smart Contract Details

**Agent Vault V2 Contract (Mainnet)**
- Address: `addr1w8hksl7jnqst7e58ypcn4d6k68d6z0rw7hkuch5wad7d07c3zn2nj`
- Script Hash: `ef687fd29820bf668720713ab756d1dba13c6ef5edcc5e8eeb7cd7fb`
- Type: PlutusV3
- Network: Cardano Mainnet

## 🧪 Testing Workflow

### 1. Connect Wallet

1. Navigate to: http://localhost:3000/agent-vault-v2
2. Click "Connect Wallet"
3. Select Vespr wallet (recommended for best compatibility)
4. Approve connection in wallet popup

### 2. Test Deposit (✅ WORKING)

1. Enter deposit amount (minimum 5 ADA)
2. Click "Deposit ADA"
3. Approve transaction in wallet
4. Wait for confirmation

### 3. Test Withdrawal (🔧 FIXED with Mesh)

1. Enter withdrawal amount (1-1000 ADA limit)
2. Click "Withdraw ADA"
3. System will:
   - Select optimal contract UTxO
   - Select user UTxOs for fees
   - Build PlutusV3 script witness
   - Apply CIP-30 compliant signing
   - Submit with triple fallback

### 4. Test Emergency Stop

1. Click "Emergency Stop" toggle
2. Approve transaction
3. Vault enters emergency mode (withdrawals blocked)
4. Toggle again to re-enable

## 🔍 Monitoring & Debugging

### Browser Console

Open browser DevTools (F12) to see detailed logs:

```javascript
// Expected console output for withdrawal:
🏦 Agent Vault V2 Withdrawal: 10 ADA
📋 Using CIP-30 compliant withdrawal service...
🔧 Implementing CIP-31 (Reference Inputs) and CIP-32 (Inline Datums)...
✅ Wallet supports optional CIP-30 method: getBalance
📋 Wallet extensions: [{cip: 30}, {cip: 31}, {cip: 32}, {cip: 40}]
🔧 Building Mesh withdrawal transaction...
📍 Adding contract input: 100 ADA
📍 Adding user input: 10 ADA
📤 Adding output: 10 ADA to user
✅ Transaction built successfully: 2456 characters
✍️ Requesting wallet signature...
✅ Complete signed transaction received
📤 Submitting transaction via wallet...
✅ Transaction submitted via wallet: abc123...
✅ Withdrawal successful: abc123...
🎉 Successfully withdrew 10 ADA from Agent Vault V2
📋 Transaction compliant with CIP-30, CIP-31, CIP-32
```

### Network Tab

Monitor API calls to production services:
- `/api/cardano/build-transaction` - Transaction building
- `/api/cardano/sign-transaction` - CBOR combination
- Blockfrost API calls for UTxO queries

## 🛡️ Security Features

1. **Maximum Withdrawal Limit**: 1000 ADA per transaction
2. **Minimum Vault Balance**: 2 ADA to prevent dust
3. **UTxO Filtering**: Skips UTxOs with tokens or datums
4. **Emergency Stop**: Owner can freeze vault
5. **CIP-30 Validation**: Ensures wallet compliance

## 🐛 Troubleshooting

### Issue: "No suitable user UTxOs found"
**Solution**: Ensure wallet has at least 5 ADA in pure ADA UTxOs (no tokens)

### Issue: "Wallet not CIP-30 compliant"
**Solution**: Use Vespr, Nami, or Eternl wallet

### Issue: "Network mismatch"
**Solution**: Switch wallet to Cardano Mainnet

### Issue: "Transaction submission failed"
**Solution**: Check wallet has sufficient ADA for fees (~2-3 ADA)

### Issue: "Insufficient funds in vault"
**Solution**: Deposit more ADA before withdrawing

## 📊 Testing Checklist

- [ ] Frontend starts without errors
- [ ] Can connect Vespr wallet
- [ ] Vault state loads correctly
- [ ] Deposit transaction succeeds
- [ ] Withdrawal with single UTxO works
- [ ] Withdrawal with multiple UTxOs works
- [ ] Emergency stop activation works
- [ ] Emergency stop deactivation works
- [ ] Error messages are clear
- [ ] Transaction history displays

## 🔗 Useful Links

- [CIP-30 Specification](https://cips.cardano.org/cip/CIP-0030)
- [Mesh SDK Documentation](https://meshjs.dev/)
- [Blockfrost API Docs](https://docs.blockfrost.io/)
- [Vespr Wallet](https://vespr.xyz/)

## 📝 Notes

- The frontend runs in development mode but connects to PRODUCTION services
- All transactions are on MAINNET - use real ADA carefully
- The "Coming Soon" overlay on withdrawal has been removed for testing
- Console logs are verbose for debugging - check DevTools

## 🚨 Emergency Contacts

If you encounter issues:
1. Check browser console for detailed error messages
2. Verify wallet is connected to mainnet
3. Ensure sufficient ADA balance (minimum 10 ADA recommended)
4. Try different wallet (Vespr → Nami → Eternl)

---

**Ready to test!** Start the frontend with `./start-dev.sh` and navigate to http://localhost:3000/agent-vault-v2