# 🚀 HyperEVM Vault Deployment Guide

## Overview
This guide walks through deploying the MisterLabs AI Trading Vaults to HyperEVM, enabling community members to benefit from the proven 287.5% annual return algorithm.

## Prerequisites

### 1. Wallet Setup
- [ ] MetaMask or compatible wallet installed
- [ ] HyperEVM Testnet added to wallet:
  - **Network Name**: HyperEVM Testnet
  - **RPC URL**: `https://rpc.hyperliquid-testnet.xyz/evm`
  - **Chain ID**: 998
  - **Currency Symbol**: HYPE
  - **Explorer**: `https://explorer.hyperliquid-testnet.xyz`

### 2. Testnet Resources
- [ ] Testnet HYPE for gas fees
- [ ] Testnet USDC for testing deposits
  - Get from faucet: [Link TBD]
  - Or bridge from testnet Arbitrum

### 3. Environment Setup
Create `.env` file in `/sydney-agents/mister-frontend/`:
```bash
# Deployer wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Testnet USDC address (will be provided by faucet/bridge)
USDC_ADDRESS=0x0000000000000000000000000000000000000000

# Optional: Infura/Alchemy for fallback
INFURA_KEY=your_infura_key_if_needed
```

## Step-by-Step Deployment

### Step 1: Install Dependencies
```bash
cd /Users/coldgame/MRSTRIKE/sydney-agents/mister-frontend
npm install
```

### Step 2: Compile Contracts
```bash
npx hardhat compile
```

Expected output:
```
Compiled 3 Solidity files successfully:
- AIAgentVault.sol
- VaultFactory.sol
- L1Read.sol
```

### Step 3: Check Deployment Readiness
```bash
node scripts/check-deployment-readiness.js
```

This will verify:
- Environment variables are set
- Contracts are compiled
- Network connectivity is working
- All required files exist

### Step 4: Deploy to Testnet
```bash
npx hardhat run scripts/deploy.js --network hyperevm_testnet
```

Expected output:
```
🚀 Starting HyperEVM Smart Contract Deployment...

📍 Deploying with account: 0x...
💰 Account balance: X.XX ETH

📦 Deploying L1Read...
✅ L1Read deployed to: 0x...

📦 Deploying VaultFactory...
✅ VaultFactory deployed to: 0x...

📦 Deploying Sample AIAgentVault...
✅ AIAgentVault deployed to: 0x...

🎉 Deployment Complete!
```

### Step 5: Verify Contracts
```bash
npx hardhat verify --network hyperevm_testnet CONTRACT_ADDRESS
```

Or manually verify on explorer:
1. Go to https://explorer.hyperliquid-testnet.xyz
2. Search for contract address
3. Click "Verify and Publish"
4. Submit source code

### Step 6: Test Basic Functionality
```bash
node scripts/test-deployment.js
```

This will:
- Check contract deployment
- Test deposit functionality
- Verify vault operations
- Confirm keeper bot can connect

## Integration with Python Trading Bot

### Current Setup
- Python bot running with $60 USDC on Hyperliquid
- Wallet: `0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74`

### Integration Steps

1. **Install Web3 Python Library**:
```python
pip install web3
```

2. **Create Bridge Script** (`vault_bridge.py`):
```python
from web3 import Web3
import json

# Connect to HyperEVM
w3 = Web3(Web3.HTTPProvider('https://rpc.hyperliquid-testnet.xyz/evm'))

# Load contract ABI
with open('artifacts/src/contracts/hyperevm/AIAgentVault.sol/AIAgentVault.json') as f:
    vault_abi = json.load(f)['abi']

# Contract instance
vault_address = "0x..."  # From deployment
vault = w3.eth.contract(address=vault_address, abi=vault_abi)

# Authorize trade function
def authorize_trade(perp_index, is_long, size, leverage):
    # Build transaction
    tx = vault.functions.authorizeTrade(
        perp_index,
        is_long,
        size,
        leverage,
        100,  # max slippage (1%)
        0,    # stop loss (0 for none)
        0     # take profit (0 for none)
    ).build_transaction({
        'from': ai_agent_address,
        'nonce': w3.eth.get_transaction_count(ai_agent_address),
        'gas': 200000,
        'gasPrice': w3.eth.gas_price
    })
    
    # Sign and send
    signed = w3.eth.account.sign_transaction(tx, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    
    return tx_hash.hex()
```

3. **Modify Trading Bot**:
Add vault authorization before executing trades:
```python
# When signal generated
if should_open_position:
    # Authorize via vault first
    auth_tx = authorize_trade(
        perp_index=get_perp_index("SOL"),
        is_long=True,
        size=position_size_usdc,
        leverage=2
    )
    print(f"Trade authorized: {auth_tx}")
    
    # Keeper bot will detect and execute
```

## Keeper Bot Setup

### Start Keeper Bot Service
```bash
cd /Users/coldgame/MRSTRIKE/sydney-agents/mister-frontend
npm run keeper-bot:start
```

### Configuration
Edit `keeper-bot.config.json`:
```json
{
  "hyperEvmRpc": "https://rpc.hyperliquid-testnet.xyz/evm",
  "vaultAddresses": ["0x..."],  // Your deployed vault
  "hyperliquidApiUrl": "https://api.hyperliquid.xyz",
  "pollIntervalMs": 5000,
  "maxGasPrice": "1000000000"
}
```

## Testing Checklist

### Phase 1: Contract Testing
- [ ] Deploy all contracts successfully
- [ ] Verify on explorer
- [ ] Deposit 10 USDC to vault
- [ ] Check share calculation
- [ ] Withdraw 5 USDC
- [ ] Verify fees deducted correctly

### Phase 2: Integration Testing
- [ ] Python bot connects to vault
- [ ] Bot authorizes test trade
- [ ] Keeper bot detects authorization
- [ ] Trade executes on Hyperliquid L1
- [ ] Performance updates in vault

### Phase 3: End-to-End Testing
- [ ] User deposits via frontend
- [ ] Multiple trades execute
- [ ] Performance metrics update
- [ ] User withdraws with profit
- [ ] Fees collected correctly

## Mainnet Deployment

When ready for production:

1. **Update Configuration**:
```javascript
// hardhat.config.js
hyperevm_mainnet: {
  url: "https://api.hyperliquid.xyz/evm",
  chainId: 1337,
  accounts: [process.env.PRIVATE_KEY]
}
```

2. **Deploy to Mainnet**:
```bash
npx hardhat run scripts/deploy.js --network hyperevm_mainnet
```

3. **Update Python Bot**:
- Switch to mainnet RPC
- Update vault addresses
- Test with small amount first

## Troubleshooting

### Common Issues

**Issue**: "Insufficient funds for gas"
**Solution**: Get more testnet HYPE from faucet

**Issue**: "Contract deployment failed"
**Solution**: Check gas price, increase gas limit in deploy script

**Issue**: "Keeper bot not detecting events"
**Solution**: Verify RPC connection, check event filters

**Issue**: "Python bot authorization fails"
**Solution**: Ensure AI agent address is set correctly in vault

## Support Resources

- **HyperEVM Docs**: https://hyperliquid.gitbook.io/hyperliquid-docs
- **Discord**: [Your Discord for beta users]
- **GitHub Issues**: [Your repo for bug reports]

## Next Steps

After successful testnet deployment:
1. Run for 1 week on testnet
2. Monitor performance metrics
3. Fix any issues found
4. Deploy to mainnet
5. Start with personal funds
6. Gradually onboard beta users
7. Scale to 100+ users

---

**Remember**: This is handling real money. Test thoroughly on testnet before mainnet deployment!