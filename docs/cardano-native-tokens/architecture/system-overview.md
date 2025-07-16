# System Architecture Overview

## 🏗️ **High-Level Architecture**

The Cardano Native Token (CNT) trading system is built as an extension to the existing MISTER trading infrastructure, providing seamless integration between ADA trading (Strike Finance) and native token trading (CNT).

```
┌─────────────────────────────────────────────────────────────────┐
│                        MISTER Trading System                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   Frontend      │    │   Backend       │    │  External   │ │
│  │   (React)       │    │   Services      │    │  APIs       │ │
│  │                 │    │                 │    │             │ │
│  │ Enhanced        │◄──►│ CNT Trading API │◄──►│ TapTools    │ │
│  │ Dashboard       │    │ (Port 4114)     │    │ Twitter     │ │
│  │                 │    │                 │    │ Blockfrost  │ │
│  │ ┌─────────────┐ │    │ ┌─────────────┐ │    │             │ │
│  │ │ Analysis    │ │    │ │ Analysis    │ │    │             │ │
│  │ │ Panel       │ │    │ │ Cache       │ │    │             │ │
│  │ └─────────────┘ │    │ │ Service     │ │    │             │ │
│  │                 │    │ └─────────────┘ │    │             │ │
│  │ ┌─────────────┐ │    │                 │    │             │ │
│  │ │ Paper       │ │    │ ┌─────────────┐ │    │             │ │
│  │ │ Trading     │ │    │ │ MISTER Bot  │ │    │             │ │
│  │ └─────────────┘ │    │ │ (Mastra)    │ │    │             │ │
│  └─────────────────┘    │ │ Port 4112   │ │    │             │ │
│                         │ └─────────────┘ │    │             │ │
│                         │                 │    │             │ │
│                         │ ┌─────────────┐ │    │             │ │
│                         │ │ Strike      │ │    │             │ │
│                         │ │ Bridge      │ │    │             │ │
│                         │ │ Port 4113   │ │    │             │ │
│                         │ └─────────────┘ │    │             │ │
│                         └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 **Service Architecture**

### **Port Allocation:**
- **3000** - Frontend (Next.js React Application)
- **4112** - MISTER Trading Bot (Mastra Core Engine)
- **4113** - Strike Bridge Server (Strike Finance Integration)
- **4114** - CNT Trading API (Native Token Trading)

### **Service Dependencies:**
```
Frontend (3000)
├── CNT Trading API (4114)
│   ├── Analysis Cache Service
│   ├── Managed Wallet System
│   └── Paper Trading Logic
├── MISTER Bot (4112)
│   ├── Core Analysis Engine
│   ├── Discord Integration
│   └── Real-time Decision Making
└── Strike Bridge (4113)
    ├── Strike Finance API
    ├── Leveraged Trading
    └── Position Management
```

## 📊 **Data Flow Architecture**

### **Analysis Data Flow:**
```
External APIs → Analysis Engine → Cache Service → Frontend Display
     ↓               ↓              ↓              ↓
TapTools API    MISTER Bot     JSON Cache    Analysis Panel
Twitter API     (Mastra)      (File System)  Beautiful Cards
Blockfrost      Real Logic    Rate Limited   User Interface
```

### **Trading Data Flow:**
```
User Action → Frontend → CNT API → Wallet System → Blockchain
     ↓           ↓         ↓          ↓            ↓
Start Trading  Enhanced   Trading    Managed      Cardano
Paper Mode     Dashboard  Logic      Wallets      Network
Live Trading   UI State   Decision   Seed Phrases Transaction
```

## 🎯 **Component Responsibilities**

### **Frontend Components:**

#### **Enhanced Managed Dashboard**
- **File:** `sydney-agents/mister-frontend/src/components/trading/EnhancedManagedDashboard.tsx`
- **Purpose:** Main trading interface with 6 tabs
- **Features:**
  - Trading type selection (Strike vs CNT)
  - Real-time analysis display
  - Paper trading mode
  - Position management
  - Trading history
  - User settings

#### **Trading Analysis Panel**
- **File:** `sydney-agents/mister-frontend/src/components/trading/TradingAnalysisPanel.tsx`
- **Purpose:** Beautiful analysis display like Discord
- **Features:**
  - Current token analysis
  - Multi-timeframe technical indicators
  - Twitter sentiment data
  - Decision reasoning
  - Analysis history
  - Interactive exploration

#### **Paper Trading Mode**
- **File:** `sydney-agents/mister-frontend/src/components/trading/PaperTradingMode.tsx`
- **Purpose:** Risk-free trading simulation
- **Features:**
  - Paper trade execution
  - Performance tracking
  - Educational content
  - Upgrade prompts
  - Success metrics

### **Backend Services:**

#### **CNT Trading API**
- **File:** `MMISTERMMCP/src/test-api.ts`
- **Purpose:** Core native token trading logic
- **Endpoints:**
  - `/api/analysis/current` - Latest token analysis
  - `/api/analysis/history` - Historical analysis data
  - `/api/trading/start` - Start trading session
  - `/api/trading/manual-trade` - Execute manual trades
  - `/api/wallets/create` - Create managed wallets

#### **Analysis Cache Service**
- **File:** `MMISTERMMCP/src/analysis-cache-service.ts`
- **Purpose:** Production-ready caching system
- **Features:**
  - Centralized analysis storage
  - Configurable update intervals
  - Rate limiting protection
  - Admin controls
  - Fallback mechanisms

#### **MISTER Trading Bot**
- **File:** `sydney-agents/index.mjs`
- **Purpose:** Core analysis engine (Mastra-based)
- **Features:**
  - Multi-timeframe analysis
  - Twitter sentiment integration
  - Discord notifications
  - Real-time decision making
  - Token-specific logic

## 🔐 **Security Architecture**

### **Wallet Security:**
- **Managed Wallets:** Server-side seed phrase storage with encryption
- **Direct Wallets:** Browser-based signing (existing functionality)
- **API Security:** Rate limiting and request validation
- **Data Protection:** Secure cache storage and access controls

### **API Security:**
- **CORS Configuration:** Restricted to frontend domain
- **Rate Limiting:** Prevent API abuse and external service overload
- **Input Validation:** Sanitize all user inputs
- **Error Handling:** Secure error messages without sensitive data

## 📈 **Scalability Design**

### **Horizontal Scaling:**
- **Stateless Services:** All services can be replicated
- **Shared Cache:** Centralized analysis cache for consistency
- **Load Balancing:** Frontend can connect to multiple API instances
- **Database Ready:** Architecture supports database migration

### **Performance Optimization:**
- **Caching Strategy:** Reduce external API calls
- **Lazy Loading:** Frontend components load on demand
- **Efficient Updates:** Real-time updates without full page refresh
- **Resource Management:** Optimized memory and CPU usage

## 🔄 **Integration Points**

### **Existing System Integration:**
- **Strike Finance:** Preserved existing functionality
- **Discord Bot:** Maintained existing notifications
- **Wallet Connections:** Support both direct and managed wallets
- **User Authentication:** Compatible with existing auth system

### **External API Integration:**
- **TapTools API:** Token price and trend data
- **Twitter API:** Sentiment analysis
- **Blockfrost:** Cardano blockchain data
- **Strike Finance API:** Leveraged trading positions

## 📋 **Development Workflow**

### **Local Development:**
1. Start all services: Frontend (3000), MISTER Bot (4112), Strike Bridge (4113), CNT API (4114)
2. Test individual components using browser dev tools
3. Monitor API calls and responses
4. Use paper trading mode for safe testing

### **Production Deployment:**
1. Build optimized frontend bundle
2. Deploy services with proper environment variables
3. Configure caching intervals for production load
4. Set up monitoring and alerting
5. Enable admin controls for analysis management

---

**Next:** [API Design](./api-design.md) - Detailed API endpoint documentation
