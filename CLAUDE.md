# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MRSTRIKE is a comprehensive Mastra-based AI agent system for cryptocurrency trading and analysis, featuring multiple specialized agents for different trading strategies and market analysis. The system integrates with Cardano blockchain, Strike Finance, and various trading platforms.

**CURRENT ARCHITECTURE TRANSITION**: The project is transitioning from a complex smart contract-based Agent Vault system to a simplified signal provider model for better user experience and reliability. All smart contract work is preserved in `/legacy-smart-contracts` for future integration.

**PRIMARY OBJECTIVE**: Build a one-click signal execution system where users receive AI-generated trading signals and can execute them on Strike Finance with a single button click, with Discord notifications for signal alerts and execution confirmations.

## Key Components

### 1. Sydney Agents (`sydney-agents/`)
The main Mastra-based agent system containing:
- **Agents**: Specialized AI agents for trading strategies and analysis (`src/mastra/agents/`)
- **Services**: Core trading and blockchain interaction services (`src/mastra/services/`)
- **Tools**: Custom tools for data analysis and execution (`src/mastra/tools/`)
- **Workflows**: Automated trading and analysis workflows (`src/mastra/workflows/`)
- **MCP Integration**: Sone MCP server for advanced assistant capabilities (`src/mastra/mcp/`)

### 2. MISTER Frontend (`sydney-agents/mister-frontend/`)
Next.js 15 application with React 19 using:
- **App Router**: Modern Next.js routing in `src/app/`
- **API Routes**: Backend endpoints in `src/app/api/` for trading operations
- **Components**: Reusable UI components using shadcn/ui (`src/components/`)
- **Supabase Integration**: User authentication and preferences storage
- **Cardano CSL**: Browser-based Cardano transaction signing
- **Trading Page**: `/trading` - Preserved manual trading interface with wallet signing (for future smart contract integration)
- **Signal Dashboard**: New simplified interface for one-click signal execution

### 3. MMISTERMMCP (`MMISTERMMCP/`)
Legacy MCP (Model Context Protocol) server implementation with:
- Trading bot functionality
- Performance tracking  
- User settings management

## Common Development Commands

### Sydney Agents (Main System)
```bash
cd sydney-agents

# Development
npm run dev          # Start Mastra development server
npm run build        # Build the project
npm run start        # Start production server

# Agent Testing
npm run mister       # Start main MISTER agent server
npm run mister:simple # Start simplified MISTER server
npm run mister:demo  # Run demo mode
npm run mister:bridge # Start bridge server
```

### Frontend Development
```bash
cd sydney-agents/mister-frontend

# Development
npm run dev          # Start Next.js development server (with Turbopack)
npm run build        # Build Next.js application
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Legacy MCP System
```bash
cd MMISTERMMCP

# Development
npm run start        # Start portfolio swap trading
npm run mcp          # Start MCP server
npm run dev          # Start frontend development
```

## Testing Commands

### Agent Testing (Sydney Agents)
```bash
cd sydney-agents

# Core Agent Tests
node misterlabs/tests/test-sone-voice.js           # Test Sone voice capabilities
node misterlabs/tests/test-trading-monitor.js      # Test trading monitoring
node misterlabs/tests/test-enhanced-sone.js        # Test enhanced Sone features
node test-vault-trading-flow.js                    # Test agent vault trading

# Specific Strategy Tests
node test-multi-timeframe.js                       # Test multi-timeframe strategies
tsx test-natural-language-backtesting.ts           # Test backtesting workflows

# Cardano Integration Tests
node test-agent-vault.js                          # Test agent vault functionality
node test-real-transactions.js                    # Test real Cardano transactions
node test-cbor-only.js                            # Test CBOR transaction building
```

### Frontend Testing
Frontend testing is done via built-in test pages accessible in the browser:
- `/trading` - **PRESERVED**: Manual trading interface with wallet signing (keep intact for future smart contract integration)
- `/test-agent-vault` - **LEGACY**: Agent vault functionality testing (moved to legacy folder)
- `/test-clean-vault` - **LEGACY**: Clean vault testing with 5-6 ADA safety limits (moved to legacy folder)
- `/test-strike` - Strike Finance integration testing
- `/backtest-results` - Backtesting results display
- `/test-wasm` - **LEGACY**: WebAssembly Cardano CSL testing (moved to legacy folder)
- `/wallet-debug` - **LEGACY**: Wallet connection and transaction debugging (moved to legacy folder)
- `/managed-dashboard` - **LEGACY**: Managed wallet dashboard testing (moved to legacy folder)
- `/trading-mode` - Trading mode selection interface
- `/signals` - **NEW**: Signal dashboard for one-click execution testing
- `/chart-demo` - Chart demonstration and testing page

## Architecture Overview

### Current Architecture: Production Signal Provider Model ✅ **FULLY OPERATIONAL**
The system has successfully transitioned to a simplified signal provider architecture with all backend services in production:

**Signal Generation → Notification → One-Click Execution → Confirmation**

1. **AI Agents Generate Signals**: Production Mastra Cloud agents create trading signals
2. **Discord Notifications**: Users receive signal alerts via live Discord webhook
3. **One-Click Execution**: Users execute signals on Strike Finance through production bridge server
4. **Execution Tracking**: System tracks performance with real-time dashboard updates

### Production Data Flow
```
Frontend (Local) → Bridge Server (Production) → Mastra Cloud (Production)
                ↓                           ↓
        Strike Finance API          AI Agents & Algorithms
                ↓                           ↓
        Trade Execution            Signal Generation
                ↓                           ↓
        Discord Notifications ← Real-time Updates
```

### Agent System
The system uses Mastra framework with specialized agents:
- **Strike Agent**: Main trading agent for Strike Finance integration
- **Fibonacci Agent**: Fibonacci-based trading strategies
- **Multi-Timeframe Agent**: Multi-timeframe analysis
- **ADA Custom Algorithm Agent**: Custom Cardano trading algorithms (62.5% win rate)
- **Sone Agent**: Personal assistant with voice capabilities
- **Cash Agent**: Cash management and analysis
- **Backtesting Agent**: Strategy backtesting and validation
- **Crypto Backtesting Agent**: Cryptocurrency-focused backtesting
- **Quant Agent**: Pine Script programming and quantitative analysis
- **Tomorrow Labs Network Agent**: Advanced network trading strategies

### Legacy Smart Contract System (Preserved)
All smart contract work is preserved in `/legacy-smart-contracts/` including:
- **Agent Vault Contracts**: Automated trading smart contracts
- **Vespr Wallet Integration**: Complex CBOR transaction building
- **CSL Transaction Building**: Cardano Serialization Library integration
- **Test Pages**: All smart contract testing interfaces

### Services Architecture
Core services handle different aspects of trading:
- **Signal Generation Service**: Creates standardized trading signals from AI algorithms
- **Strike Finance API**: Direct Strike Finance integration for one-click execution
- **Discord Notification Service**: Sends signal alerts and execution confirmations
- **Execution History Service**: Tracks signal performance and user activity
- **Simple Wallet Service**: Basic wallet connection for user identification only
- **Legacy Services** (preserved in `/legacy-smart-contracts/`):
  - **Cardano Balance Service**: Blockchain balance monitoring
  - **Vault Trading Service**: Automated vault trading operations
  - **Unified Execution Service**: Centralized trade execution
  - **Fee Calculator**: Trading fee analysis and optimization

### Frontend Architecture
Next.js application with:
- **API Routes**: Backend endpoints for trading operations (`src/app/api/`)
- **Components**: Reusable UI components (`src/components/`)
- **Pages**: Application pages and routing (`src/app/`)
- **Services**: Client-side API integration (`src/lib/api/`)

## Current Implementation Plan

### Active Task List (Use built-in task management tools)
The project has a comprehensive implementation plan across 7 phases:

1. **🏗️ PHASE 1: Code Preservation & Organization** ✅ **COMPLETED**
   - ✅ Create `/legacy-smart-contracts` directory structure
   - ✅ Move all Vespr wallet integration code
   - ✅ Move Agent Vault smart contract code
   - ✅ Move CBOR transaction building code
   - ✅ Preserve existing trading page functionality (`/trading`)
   - ✅ Create comprehensive legacy documentation

2. **🚀 PHASE 2: Simplified Architecture Foundation** ✅ **COMPLETED**
   - ✅ Create simplified wallet connection service
   - ✅ Design signal data structure (TypeScript interfaces)
   - ✅ Create signal generation service
   - ✅ Build Strike Finance API integration
   - ✅ Implement one-click execution system

3. **🔔 PHASE 3: Notification & User Interface** ⚠️ **PARTIALLY COMPLETED**
   - ✅ Set up Discord bot integration
   - ✅ Build signal dashboard UI
   - ✅ Implement signal notification system
   - [ ] Create execution history tracking
   - [ ] Add user preference management

4. **📊 PHASE 4: Integration & Testing** ⚠️ **PARTIALLY COMPLETED**
   - ✅ Build end-to-end signal flow testing
   - ✅ Test Strike Finance API integration
   - ✅ Validate Discord notification delivery
   - [ ] Performance testing and optimization
   - [ ] User acceptance testing

5. **📝 PHASE 5: Documentation & Deployment** ⚠️ **PARTIALLY COMPLETED**
   - ✅ Document simplified architecture
   - [ ] Create user onboarding guide
   - ✅ Document legacy smart contract integration path
   - ✅ Deploy to production environment
   - [ ] Set up monitoring and analytics

6. **🏗️ PHASE 6: Production Architecture & Deployment** ✅ **COMPLETED**
   - ✅ Deploy Bridge Server to Production
   - ✅ Configure Frontend for Production APIs
   - ✅ Verify Production API Integration

7. **📊 PHASE 7: Backtesting Page Development** 🔄 **CURRENT FOCUS**
   - [ ] Analyze Current Backtesting Page
   - [ ] Connect to Production ADA Backtesting Service
   - [ ] Implement Interactive Backtesting Controls
   - [ ] Build Performance Visualization
   - [ ] Add Strategy Comparison Features

### Key Implementation Notes
- **Preserve All Work**: Nothing gets deleted, everything organized for future use
- **Trading Page Intact**: Keep `/trading` with manual wallet signing for future smart contract integration
- **Sequential Execution**: Each phase builds on the previous
- **Rollback Safety**: Can return to smart contracts anytime

## Key Configuration Files

- `sydney-agents/mastra.config.js`: Mastra framework configuration
- `sydney-agents/src/mastra/index.ts`: Main agent system initialization
- `sydney-agents/mister-frontend/next.config.ts`: Next.js configuration
- `MMISTERMMCP/railway.toml`: Railway deployment configuration
- `/legacy-smart-contracts/README.md`: Documentation for preserved smart contract work

## Development Patterns and Architecture

### Mastra Framework Structure
- **Agents**: Located in `src/mastra/agents/` - Each agent extends Mastra Agent class
- **Tools**: Located in `src/mastra/tools/` - Utility functions for agents to interact with external APIs
- **Services**: Located in `src/mastra/services/` - Business logic and API integrations
- **Workflows**: Located in `src/mastra/workflows/` - Multi-step automated processes

### Key Development Principles
- **Agent Isolation**: Each agent operates independently with its own tools and context
- **Service Layer**: Core business logic separated from agent implementations
- **Tool Pattern**: External integrations wrapped as Mastra tools for agent consumption
- **Memory Management**: SQLite databases for persistent agent memory across sessions

### Configuration Management
- **Environment Variables**: Configured in `mastra.config.js` for deployment (Cloudflare/Mastra Cloud)
- **Database Storage**: Multiple SQLite files for different agent contexts:
  - `mastra.db` - Main Mastra framework storage
  - `sone-memory.db` - Sone agent persistent memory
  - `cash-memory.db` - Cash agent memory
  - `strike-memory.db` - Strike trading agent memory
- **Mastra Configuration**: Uses LibSQL in-memory storage with Cloudflare deployment target

## Database and Storage

The system uses multiple database configurations:
- **Mastra Storage**: LibSQL in-memory database for agent state (configured in `src/mastra/index.ts`)
- **SQLite Files**: Various `.db` files for persistent agent memory storage
- **Supabase**: User preferences and authentication (frontend only)

## External Integrations

- **Strike Finance**: Primary trading platform integration
- **Cardano Blockchain**: Native Cardano operations via CSL (browser and node versions)
- **Blockfrost**: Cardano blockchain data provider (`mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu`)
- **Google AI**: Gemini 2.5 Flash models for agent intelligence
- **TradingView**: Chart data and analysis via TapTools API
- **Railway**: Production deployment platform (auto-deploys from git commits)
- **Discord**: Real-time notifications via webhook integration
- **Supabase**: User authentication and preferences storage

## Important Development Notes

### Requirements and Dependencies
- **Node.js**: Requires 20+ (sydney-agents), 18+ minimum for legacy systems
- **Package Managers**: Both npm and pnpm are used throughout the project
- **TypeScript**: Used throughout with ESM modules (`"type": "module"`)
- **Runtime**: Uses `tsx` for TypeScript execution in development

### Package Structure and Dependencies
- **sydney-agents**: Main Mastra-based system with Cardano CSL, AI integrations, Express APIs
- **mister-frontend**: Next.js 15 with React 19, Radix UI, ApexCharts, Supabase, Cardano CSL browser
- **MMISTERMMCP**: Legacy MCP server with Discord.js, OpenAI, Express APIs

### Critical Development Guidelines
- **Environment Setup**: API keys are included in `.env` files for immediate functionality
- **Database Persistence**: Agent memory persists across sessions via SQLite files
- **Code Preservation**: Never delete smart contract work - move to `/legacy-smart-contracts/`
- **Trading Page Protection**: Keep `/trading` page intact with manual wallet signing
- **Signal Provider Focus**: Prioritize simple, reliable signal execution over complex smart contracts
- **Discord Integration**: All signal notifications must go through Discord bot
- **One-Click Execution**: Core feature - signals must execute with single button click
- **User Isolation**: Frontend implements user-based data filtering and storage
- **Testing First**: Extensive test files available - always run relevant tests before deployment

### Common Debugging Commands
```bash
# Debug specific systems
node debug-blockfrost.js                    # Debug Blockfrost API issues
node debug-transaction-builder.js           # Debug Cardano transaction building
node debug-strike-api.js                   # Debug Strike Finance API
node debug-wallet-address.js               # Debug wallet address issues
```

## Production Architecture & Deployment

### 🏗️ Current Production Setup (FULLY OPERATIONAL)

The system is now fully deployed with all backend services in production and frontend running locally for continued development:

#### **Production Services Overview**

1. **🌐 Mastra Cloud (AI Agents Hub)**
   - **URL**: `https://substantial-scarce-magazin.mastra.cloud`
   - **Purpose**: Hosts all AI agents (Strike Agent, Fibonacci Agent, etc.)
   - **Deployment**: Auto-deploys from git commits to main branch
   - **Status**: ✅ **PRODUCTION ACTIVE**

2. **🌉 Bridge Server (API Gateway)**
   - **URL**: `https://bridge-server-cjs-production.up.railway.app`
   - **Purpose**: Central API gateway bridging frontend ↔ Mastra Cloud ↔ Strike Finance
   - **Deployment**: Railway auto-deploys from git commits
   - **Status**: ✅ **PRODUCTION ACTIVE**
   - **Key Features**: Authentication, wallet management, trading execution, real-time data

3. **📊 ADA Backtesting Service**
   - **URL**: `https://ada-backtesting-service-production.up.railway.app`
   - **Purpose**: Provides ADA algorithm signals and backtesting results
   - **Deployment**: Railway (separate Python service)
   - **Status**: ✅ **PRODUCTION ACTIVE**

4. **🤖 CNT Trading Bot**
   - **URL**: `https://cnt-trading-api-production.up.railway.app`
   - **Purpose**: CNT trading functionality and strategies
   - **Deployment**: Railway (separate service)
   - **Status**: ✅ **PRODUCTION ACTIVE**

5. **💻 Frontend (MISTER UI)**
   - **URL**: `http://localhost:3000` (LOCAL DEVELOPMENT)
   - **Purpose**: User interface connecting to all production services
   - **Status**: ⚠️ **LOCAL ONLY** (ideal for continued development)

#### **Frontend Production Dependencies**
The local frontend connects to these production services via environment variables in `sydney-agents/mister-frontend/.env.local`:

```bash
# Core API Gateway
NEXT_PUBLIC_API_URL=https://bridge-server-cjs-production.up.railway.app

# Service URLs
NEXT_PUBLIC_MASTRA_API_URL=https://substantial-scarce-magazin.mastra.cloud
NEXT_PUBLIC_CNT_API_URL=https://cnt-trading-api-production.up.railway.app
NEXT_PUBLIC_STRIKE_API_URL=https://bridge-server-cjs-production.up.railway.app

# External APIs
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu
NEXT_PUBLIC_TAPTOOLS_API_KEY=WghkJaZlDWYdQFsyt3uiLdTIOYnR5uhO

# Real-time Features
NEXT_PUBLIC_WS_URL=wss://strike-bridge-server-production.up.railway.app

# Live Discord Integration
NEXT_PUBLIC_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1398703610430230548/UKHnlT45pCZWLAYizmSlAJbSZVBg_FJw4r2FMrCzdYyEdFhFN_e77nRja2m7liankAXW
```

### 🚀 Deployment Methods

#### **Method 1: Git-Based Auto-Deployment (RECOMMENDED)**
For all backend services (Bridge Server, Mastra Cloud, etc.):

```bash
cd sydney-agents
git add .
git commit -m "Your changes description"
git push origin main
# Railway automatically detects and deploys in ~2-3 minutes
```

**Benefits:**
- ✅ Automatic deployment on git push
- ✅ Version control integration
- ✅ Rollback capability
- ✅ Build logs and monitoring

#### **Method 2: Railway CLI Direct Deployment**
For immediate deployment without git commit:

```bash
cd sydney-agents
railway up
# Direct deployment to Railway (bypasses git)
```

**Use Cases:**
- Quick testing of changes
- Emergency hotfixes
- Development iterations

### 🔧 Production Configuration Details

#### **Bridge Server Configuration**
- **File**: `sydney-agents/mister-bridge-server.cjs`
- **Port**: 8080 (Railway default)
- **Health Check**: `/health` endpoint
- **Auto-restart**: Enabled with failure recovery
- **CORS**: Configured for frontend domains

#### **Environment Variables Management**
- **Development**: Local `.env` files
- **Production**: Railway dashboard environment variables
- **Mastra Cloud**: Configured via `mastra.config.js`

#### **Database & Storage**
- **Agent Memory**: SQLite files for persistent storage
- **User Data**: Supabase integration (frontend)
- **Real-time Data**: WebSocket connections via bridge server

### 📊 Monitoring & Health Checks

#### **Service Health Endpoints**
- Bridge Server: `https://bridge-server-cjs-production.up.railway.app/health`
- ADA Backtesting: `https://ada-backtesting-service-production.up.railway.app/health`
- CNT Trading: `https://cnt-trading-api-production.up.railway.app/health`

#### **Deployment Verification**
After any deployment, verify:
1. ✅ Health endpoints respond correctly
2. ✅ Frontend can authenticate with backend
3. ✅ Trading functionality works end-to-end
4. ✅ Real-time data updates properly

### 🎯 Development Workflow

#### **Current Optimal Setup**
- **Backend Services**: All in production (auto-deploy from git)
- **Frontend**: Local development (`npm run dev`)
- **Benefits**:
  - Real production data and APIs
  - Fast frontend iteration
  - No local backend complexity
  - Production-grade testing

#### **Making Changes**
1. **Frontend Changes**: Edit locally, see changes immediately
2. **Backend Changes**: Commit and push for auto-deployment
3. **Testing**: Use production APIs with local frontend
4. **Deployment**: Only backend services auto-deploy

### 🔄 Legacy Deployment Commands (Reference)
```bash
# Mastra Cloud Deployment (now auto-deploys)
cd sydney-agents
npm run build                               # Build Mastra agents
npm run start                              # Start production server

# Frontend Local Development (current setup)
cd sydney-agents/mister-frontend
npm run dev                                # Start local development server

# Frontend Production Deployment (future)
cd sydney-agents/mister-frontend
npm run build                              # Build Next.js frontend
npm run start                              # Start production frontend
```