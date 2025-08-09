# WORKING CARDANO VAULT SERVICE

🎉 **BREAKTHROUGH SUCCESS** - First working Cardano vault integration for AI agent capital management.

## 🚀 PRODUCTION READY - NEVER BREAK THIS

This service successfully locks and unlocks ADA on Cardano mainnet using real funds.

### ✅ Proven Success (January 2025)
- **Lock TX**: `755a4dc90368a1c43c608df2e8118f2c97c8db0d17019e1c7605100ed06ace24`
- **Unlock TX**: `7494e1e5ad09dd1207826e67f178fb8e10b8021aa75f934535381dab84be5ff8`
- **Script Address**: `addr1w9amamp0dl4m0dkf9hmwnzgux36eueptvm5z7fmfedyc2pqhlafmz`

## 📁 File Structure (DO NOT MODIFY)
```
cardano-service/
├── server.js              # Express server with vault endpoints
├── vault-operations.js    # Core Cardano operations (Aiken pattern)
├── vault/
│   ├── validators/hello_world.ak  # Real Aiken validator
│   └── plutus.json               # Compiled validator blueprint  
├── package.json           # MeshJS v1.8.4 dependencies
├── .env                   # Mainnet configuration
└── debug/                 # Debugging scripts (archived)
```

## 🚀 Quick Start
```bash
npm install
npm start    # Runs on http://localhost:3001
```

## 🔒 Working API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Lock 1 ADA
curl -X POST http://localhost:3001/lock \
  -H "Content-Type: application/json" \
  -d '{"seed":"WALLET_SEED","amount":"1000000"}'

# Unlock funds  
curl -X POST http://localhost:3001/unlock \
  -H "Content-Type: application/json" \
  -d '{"seed":"WALLET_SEED","txHash":"LOCK_TX_HASH"}'
```

## ⚠️ CRITICAL: Environment Setup
```bash
CARDANO_NETWORK=mainnet
BLOCKFROST_MAINNET_PROJECT_ID=mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu
CARDANO_SERVICE_PORT=3001
```

## 🎯 Next Phase: AI Agent Integration
Ready for Vault Manager service that will:
1. Allocate capital to AI agents 
2. Convert ADA ↔ USDC for Strike Finance trading
3. Manage risk limits and performance tracking
4. Enable multi-agent capital management

**Foundation is solid - time to build the agent capital management layer!** 🚀