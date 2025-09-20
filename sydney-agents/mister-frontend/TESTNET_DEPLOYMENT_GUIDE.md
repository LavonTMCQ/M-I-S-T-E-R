# 🚀 HyperEVM Testnet Deployment Guide

## ✅ Phase 1 Complete: Smart Contract Compilation

All smart contracts have been successfully compiled and are ready for deployment:

- **AIAgentVault.sol** - Main trading vault contract
- **VaultFactory.sol** - Factory for vault creation and management  
- **L1Read.sol** - Oracle integration for price feeds

## 🌐 Network Configuration

**HyperEVM Testnet Details:**
- **Chain ID**: 998
- **RPC URL**: https://rpc.hyperliquid-testnet.xyz/evm
- **Explorer**: https://testnet.purrsec.com/
- **Status**: ✅ Network connection verified

## 💰 Getting Testnet Funds

### Option 1: Official Hyperliquid Faucet (Requires Mainnet Deposit)
1. Visit: https://app.hyperliquid-testnet.xyz/drip
2. Connect wallet that has deposited on Hyperliquid mainnet
3. Claim 1,000 mock USDC

### Option 2: Third-Party Faucets
1. **Community Faucets**: Search for "HyperEVM testnet faucet" for community-run faucets
2. **Discord/Telegram**: Join Hyperliquid community channels for testnet token requests
3. **Bridge from other testnets**: Some users bridge testnet ETH from other networks

### Option 3: Alternative Approaches
- Join Hyperliquid Discord and request testnet tokens in developer channels
- Connect with other developers who can send small amounts for testing
- Use testnet bridging services if available

## 🔐 Wallet Setup

### MetaMask Configuration
1. **Add Network Manually**:
   - Network Name: HyperEVM Testnet
   - RPC URL: https://rpc.hyperliquid-testnet.xyz/evm
   - Chain ID: 998
   - Currency Symbol: ETH
   - Block Explorer: https://testnet.purrsec.com/

2. **Or Add via ChainList**:
   - Visit https://chainlist.org/chain/998
   - Connect MetaMask and add network

## 🚀 Deployment Process

### Step 1: Configure Environment
```bash
# Copy environment template
cp .env.deployment .env.local

# Edit .env.local with your private key
PRIVATE_KEY=your_private_key_here
USDC_ADDRESS=0x0000000000000000000000000000000000000000  # Will update with actual testnet USDC
```

### Step 2: Verify Network Connection
```bash
# Test network connectivity
node scripts/deploy-simple.js
```

### Step 3: Deploy Contracts
```bash
# Deploy all contracts to testnet
npx hardhat run scripts/deploy.js --network hyperevm_testnet
```

### Step 4: Verify Deployment
```bash
# Test deployed contracts
npx hardhat run scripts/test-deployment.js --network hyperevm_testnet
```

## 📋 Deployment Checklist

### Pre-Deployment ✅
- [x] Smart contracts compiled successfully
- [x] Network configuration verified
- [x] RPC connection tested
- [x] Deployment scripts ready

### Pending Testnet Funds 🔄
- [ ] Obtain testnet ETH for gas fees
- [ ] Get testnet USDC address for vault deposits
- [ ] Configure wallet with sufficient balance

### Ready for Deployment ⏳
- [ ] Set PRIVATE_KEY in .env.local
- [ ] Update USDC_ADDRESS with testnet token
- [ ] Execute deployment script
- [ ] Verify contracts on explorer

## 🎯 Expected Deployment Results

Once deployment is complete, you'll have:

1. **AIAgentVault Contract**: Core vault for AI-managed trading
2. **VaultFactory Contract**: Factory for creating multiple vaults
3. **L1Read Contract**: Oracle for price feed integration

## 📊 Post-Deployment Testing

1. **Basic Functionality**:
   - Create test vault via VaultFactory
   - Test deposit functionality with mock USDC
   - Verify authorization events are emitted

2. **Integration Testing**:
   - Connect keeper bot to monitor events
   - Test trade authorization flow
   - Verify performance tracking updates

## 🔗 Resources

- **HyperEVM Documentation**: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm
- **Testnet Explorer**: https://testnet.purrsec.com/
- **Official Faucet**: https://app.hyperliquid-testnet.xyz/drip
- **ChainList Entry**: https://chainlist.org/chain/998

## 🚨 Important Notes

- **Gas Costs**: HyperEVM testnet has minimal gas costs
- **Rate Limits**: Official RPC limited to 100 requests/minute
- **Testnet Reset**: Testnet may reset periodically, requiring redeployment
- **Mainnet Readiness**: Code is production-ready for mainnet deployment

---

**Status**: Ready for testnet deployment once funds are obtained! 🚀

*Last Updated: August 14, 2025*