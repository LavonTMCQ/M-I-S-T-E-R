# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Project Overview

MRSTRIKE is a comprehensive Mastra-based AI agent system for cryptocurrency trading on Cardano blockchain, featuring Strike Finance integration for leveraged perpetual trading.

**PRIMARY OBJECTIVE**: Build a personal AI trading platform where users get individual AI agents that can execute leveraged trades on Strike Finance using capital from secure Cardano vaults.

## 🌐 Production Services (All Deployed to Railway)

### Cardano Smart Contract Service
- **URL**: `https://friendly-reprieve-production.up.railway.app`
- **Repository**: `https://github.com/LavonTMCQ/MISTERsmartcontracts.git`
- **Status**: ✅ OPERATIONAL on Cardano Mainnet
- **Script Address**: `addr1w9amamp0dl4m0dkf9hmwnzgux36eueptvm5z7fmfedyc2pqhlafmz`

### Other Hosted Services
- **Mastra API**: `https://substantial-scarce-magazin.mastra.cloud`
- **CNT Trading API**: `https://cnt-trading-api-production.up.railway.app`
- **Strike Bridge**: `https://bridge-server-cjs-production.up.railway.app`

## 🏗️ Current System Architecture

```
┌─────────────────────────┐    REST API    ┌─────────────────────────────┐
│     Next.js Frontend    │◄──────────────►│  Railway Cardano Service    │
│   (Port 3000 - local)   │                │  (Production - Railway)     │
│   NEVER add MeshJS here │                │   ✅ MeshJS v1.8.4         │
└─────────────────────────┘                └─────────────────────────────┘
             │                                           │
             ▼                                           ▼
┌─────────────────────────┐                ┌─────────────────────────────┐
│   Railway PostgreSQL    │                │     Cardano Mainnet         │
│   (Agent Database)      │                │    Smart Contracts          │
└─────────────────────────┘                └─────────────────────────────┘
```

## 📋 API Endpoints

### Cardano Service (Railway Deployed)
```bash
# Base URL: https://friendly-reprieve-production.up.railway.app

GET  /health                    # Service health check
GET  /script-address            # Get vault script address  
GET  /network-info              # Network capabilities
POST /generate-credentials      # Generate new wallet
POST /check-balance            # Check wallet balance
POST /check-utxos              # Debug UTXOs
POST /lock                     # Lock ADA to vault
POST /unlock                   # Unlock ADA from vault
POST /vault-to-agent-transfer  # Capital allocation
POST /agent-to-vault-transfer  # Profit/loss returns
```

## 🔧 Environment Configuration

### Required Environment Variables (.env.local)
```bash
# Cardano Service (Railway Deployed)
CARDANO_SERVICE_URL=https://friendly-reprieve-production.up.railway.app
NEXT_PUBLIC_CARDANO_SERVICE_URL=https://friendly-reprieve-production.up.railway.app

# Other Services
NEXT_PUBLIC_API_URL=https://bridge-server-cjs-production.up.railway.app
NEXT_PUBLIC_MASTRA_API_URL=https://substantial-scarce-magazin.mastra.cloud
NEXT_PUBLIC_CNT_API_URL=https://cnt-trading-api-production.up.railway.app
NEXT_PUBLIC_STRIKE_API_URL=https://bridge-server-cjs-production.up.railway.app

# Blockfrost (Cardano API)
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu
```

## ✅ Working Components

### 1. Cardano Vault System
- **Status**: Production-ready on mainnet
- **Proven Transactions**: Multiple successful lock/unlock operations
- **Script**: Aiken validator deployed and tested

### 2. Agent Wallet Infrastructure
- **Wallet Generation**: Creates real mainnet addresses
- **Encryption**: AES-256-GCM military-grade security
- **Database**: Railway PostgreSQL with 4 core tables
- **Capital Bridge**: Bidirectional vault ↔ agent transfers

### 3. Frontend Integration
- **Working Page**: `/src/app/working-aiken-vault/`
- **Service Calls**: All operations via REST API (no WASM)
- **Environment-based**: Uses Railway URLs in production

## 🚫 Critical Rules - NEVER CHANGE

### Architecture Rules
1. **NEVER** import MeshJS directly in Next.js (causes WASM conflicts)
2. **ALWAYS** use cardano-service REST API for all Cardano operations
3. **ONLY** use MeshJS v1.8.4 in cardano-service (other versions fail)
4. **MAINTAIN** separate service architecture (Next.js ↔ Node.js service)

### Technical Constraints
- Script address generation requires exact pattern with `serializePlutusScript`
- Database schema must maintain indexes for performance
- Encryption uses deterministic passwords (user+agent specific)
- Test with 1-2 ADA maximum to minimize risk

## 🎯 Current Development Focus

### Waiting For
- **Strike Finance API Access**: Pending approval for trading integration
- **Frontend Deployment**: Ready to deploy once Strike integration complete

### Ready Now
- Agent wallet system with encryption
- Capital allocation infrastructure  
- Database schema and migrations
- Cardano vault operations
- All backend services deployed

### Next Steps
1. Test frontend with deployed services
2. Integrate Strike Finance when access granted
3. Implement Discord notifications
4. Deploy frontend to production

## 📁 Project Structure

```
/MRSTRIKE/
├── sydney-agents/mister-frontend/    # Next.js frontend
│   ├── src/
│   │   ├── app/                     # Next.js pages
│   │   ├── services/agent-wallets/  # Agent wallet services
│   │   ├── lib/encryption/          # Encryption utilities
│   │   └── types/agent-wallets/     # TypeScript types
│   └── cardano-service/             # Local development only
│
├── MISTERsmartcontracts/            # Deployed to Railway
│   ├── server.js                    # Express API server
│   ├── vault-operations.js          # Cardano operations
│   └── vault/                       # Aiken smart contracts
│
└── legacy-smart-contracts/          # Archived approaches
```

## 🔒 Security Notes

- Private keys are NEVER stored unencrypted
- All wallet credentials use AES-256-GCM encryption
- Deterministic password generation per user+agent
- Railway PostgreSQL for secure data storage
- No sensitive data in environment variables

## 📊 Database Schema

### Core Tables
- `agent_wallets` - Encrypted wallet storage
- `vault_agent_allocations` - Capital tracking
- `agent_positions` - Strike Finance positions
- `agent_wallet_transactions` - Audit trail

### Features
- Generated columns for ADA/Lovelace conversion
- Comprehensive indexes for performance
- Audit views for reporting
- Automatic timestamp updates

## 🚀 Quick Start

### Local Development
```bash
# Frontend (uses Railway services)
cd sydney-agents/mister-frontend
npm install
npm run dev  # http://localhost:3000

# Database setup (if needed)
npm run db:migrate
```

### Testing Railway Services
```bash
# Test deployed Cardano service
curl https://friendly-reprieve-production.up.railway.app/health

# Run verification script
node test-railway-cardano-service.js
```

## 📝 Development Reminders

### Always
- Use Railway PostgreSQL (not Supabase)
- Test with small amounts (1-2 ADA max)
- Update CLAUDE.md with major changes
- Follow CIPs for Cardano standards
- Use Serena MCP for codebase search

### Never
- Import MeshJS in Next.js
- Modify working cardano-service without testing
- Store unencrypted private keys
- Change database schema indexes
- Use beta/alpha package versions

## 🎉 Major Achievements

### January 2025
- ✅ First working Cardano vault on mainnet
- ✅ Agent wallet infrastructure complete
- ✅ Live capital allocation successful
- ✅ Railway deployment operational
- ✅ Frontend updated for production URLs

### Proven Mainnet Transactions
- Lock TX: `755a4dc90368a1c43c608df2e8118f2c97c8db0d17019e1c7605100ed06ace24`
- Unlock TX: `7494e1e5ad09dd1207826e67f178fb8e10b8021aa75f934535381dab84be5ff8`
- Capital Allocation: `a248da65fe4fb712e63197dd122d9355877227821654809a5e1f0569ff4eff75`

## 🤝 Strike Finance Integration (Pending)

### API Details
- **Base URL**: `https://app.strikefinance.org/api/perpetuals/`
- **Authentication**: Wallet address-based
- **Products**: ADA/USD perpetuals
- **Leverage**: 1.1x to 10x
- **Integration**: CBOR transaction signing

### Implementation Plan
1. Agent receives trading signal
2. Agent wallet signs Strike transaction
3. Execute leveraged position
4. Monitor P&L in real-time
5. Return profits to user vault

---

**This is a living document. Update it when making significant architectural changes.**