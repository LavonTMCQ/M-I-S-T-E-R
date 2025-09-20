# 🔑 HyperEVM Testnet Deployment Wallet

**Generated**: August 14, 2025  
**Purpose**: HyperEVM smart contract deployment  
**Status**: Awaiting testnet funds

## 🏦 Wallet Details

### **Address**
```
0x5f85319C777f953f02E85c0e13bA59de1CE57332
```

### **Private Key** 
```
0xe4d6fb5754c279c7e80780d593ecc40238649ff0c4ea46e7fc0243171f737405
```

### **Mnemonic Phrase**
```
plastic matrix grape hint brown cloud yard chest square unlock crazy term
```

## 🎯 Faucet Strategy

### **Primary Faucets to Try**

1. **Gas.zip Faucet** (First Priority)
   - **URL**: https://gas.zip/faucet/hyperevm
   - **Amount**: 0.0025 HYPE tokens
   - **Frequency**: Every 12 hours
   - **Address to use**: `0x5f85319C777f953f02E85c0e13bA59de1CE57332`

2. **Hyperliquid Discord** (Community Support)
   - **URL**: https://discord.com/invite/hyperliquid
   - **Strategy**: Ask in developer channels
   - **Message**: "Building AI trading vaults on HyperEVM, need testnet tokens for contract deployment"
   - **Address to share**: `0x5f85319C777f953f02E85c0e13bA59de1CE57332`

3. **Community Faucet** (If available)
   - **URL**: https://hyperliquid-faucet.vercel.app/
   - **Amount**: 0.1 testnet HYPE
   - **Requirement**: Need 0.1 HYPE on mainnet

## 🚀 Deployment Process

### **Environment Configuration**
```bash
# Add to .env.local:
PRIVATE_KEY=0xe4d6fb5754c279c7e80780d593ecc40238649ff0c4ea46e7fc0243171f737405
USDC_ADDRESS=0x0000000000000000000000000000000000000000
```

### **Check Balance Command**
```bash
node scripts/deploy-simple.js
```

### **Deploy Command** 
```bash
npx hardhat run scripts/deploy.js --network hyperevm_testnet
```

### **Network Configuration**
- **Network**: HyperEVM Testnet
- **Chain ID**: 998
- **RPC URL**: https://rpc.hyperliquid-testnet.xyz/evm
- **Explorer**: https://testnet.purrsec.com/

## 📋 Action Checklist

### **For User** ✅
- [ ] Try Gas.zip faucet with wallet address
- [ ] Join Hyperliquid Discord and request tokens
- [ ] Try alternative faucets if needed
- [ ] Confirm when tokens received

### **For Deployment** ⏳
- [ ] Configure .env.local with private key
- [ ] Verify balance after funding
- [ ] Deploy all 3 smart contracts
- [ ] Verify contracts on explorer
- [ ] Test basic functionality

## 🔒 Security Notes

### **Important Reminders**
- ⚠️ **TESTNET ONLY** - Never use for mainnet funds
- ⚠️ **Temporary Wallet** - Generated specifically for this deployment
- ⚠️ **No Real Value** - Testnet tokens have no monetary value
- ⚠️ **Safe to Share** - Address is safe to share publicly for faucets

### **Private Key Handling**
- Store securely in `.env.local` file
- Never commit to git repository
- Only use for testnet deployment
- Can be regenerated if needed

## 📊 Expected Deployment Results

### **Contracts to Deploy**
1. **AIAgentVault.sol** - Main trading vault contract
2. **VaultFactory.sol** - Factory for vault creation
3. **L1Read.sol** - Oracle integration contract

### **Gas Requirements**
- **Deployment Gas**: ~0.01 HYPE estimated
- **Testing Gas**: ~0.005 HYPE additional
- **Total Needed**: ~0.015 HYPE for complete deployment

### **Success Metrics**
- All 3 contracts deployed successfully
- Contract verification on HyperEVM explorer
- Basic functionality testing passed
- Integration with keeper bot confirmed

## 🔗 Related Files

- **Deployment Script**: `scripts/deploy.js`
- **Test Script**: `scripts/deploy-simple.js`
- **Network Config**: `hardhat.config.js`
- **Environment Template**: `.env.deployment`

## 📞 Next Steps

1. **Immediate**: Try faucets with the wallet address
2. **Once Funded**: Deploy contracts immediately  
3. **Post-Deployment**: Test and verify all functionality
4. **Documentation**: Update with deployment addresses

---

**Generated Wallet Hash**: `0x5f85319C777f953f02E85c0e13bA59de1CE57332`  
**Ready for Deployment**: Pending testnet funds acquisition

*This wallet was generated specifically for HyperEVM testnet deployment and should only be used for testing purposes.*