# 🚀 **MISTER CNT Trading - Production Deployment Plan**

## 📋 **Overview**

This document outlines the comprehensive strategy for deploying the MISTER CNT trading system to production using Railway for backend services while maintaining localhost development capabilities.

## 🏗️ **Current Architecture**

### **Development Environment:**
```
Frontend (localhost:3000) ←→ CNT API (localhost:4114) ←→ External APIs
                          ←→ Strike Bridge (localhost:4113)
                          ←→ MISTER Bot (localhost:4112)
```

### **Target Production Architecture:**
```
Frontend (localhost:3000) ←→ CNT API (Railway) ←→ External APIs
                          ←→ Strike Bridge (Railway)
                          ←→ MISTER Bot (Railway)
                          ←→ Production Database (Railway)
```

## 🎯 **Phase 1: API Deployment Strategy**

### **1.1 CNT Trading API (Port 4114) → Railway**

#### **Service Configuration:**
```yaml
# railway.toml for CNT API
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node src/test-api.js"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"

[env]
NODE_ENV = "production"
PORT = "4114"
```

#### **Environment Variables Required:**
```bash
# External API Keys
TAPTOOLS_API_KEY=WghkJaZlDWYdQFsyt3uiLdTIOYnR5uhO
BLOCKFROST_PROJECT_ID=mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu
TWITTER_API_URL=https://twitscap-production.up.railway.app

# Database Configuration
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://user:pass@host:port

# Security
JWT_SECRET=your-jwt-secret-here
CORS_ORIGIN=http://localhost:3000

# Analysis Configuration
ANALYSIS_UPDATE_INTERVAL=3600000  # 1 hour in milliseconds
CACHE_DURATION=1800000           # 30 minutes in milliseconds
```

#### **Required Dependencies:**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.7.0",
    "node-fetch": "^3.3.1",
    "jsonwebtoken": "^9.0.0",
    "pg": "^8.11.0",
    "redis": "^4.6.7",
    "winston": "^3.8.2"
  }
}
```

### **1.2 Strike Bridge Server (Port 4113) → Railway**

#### **Service Configuration:**
```yaml
# railway.toml for Strike Bridge
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node mister-bridge-server.cjs"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"

[env]
NODE_ENV = "production"
PORT = "4113"
```

#### **Environment Variables Required:**
```bash
# Strike Finance API
STRIKE_API_URL=your-strike-api-url
STRIKE_API_KEY=your-strike-api-key

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Security
CORS_ORIGIN=http://localhost:3000
```

### **1.3 MISTER Bot (Port 4112) → Railway**

#### **Service Configuration:**
```yaml
# railway.toml for MISTER Bot
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node index.mjs"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"

[env]
NODE_ENV = "production"
PORT = "4112"
```

## 🗄️ **Phase 2: Database Setup & Migration**

### **2.1 Database Requirements**

#### **PostgreSQL Tables Needed:**
```sql
-- User Management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Managed Wallets
CREATE TABLE managed_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    wallet_id VARCHAR(255) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    encrypted_seed TEXT NOT NULL,
    balance DECIMAL(20,6) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trading Sessions
CREATE TABLE trading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES managed_wallets(id),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'cnt' or 'strike'
    is_active BOOLEAN DEFAULT true,
    settings JSONB,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Analysis Cache
CREATE TABLE analysis_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(20) NOT NULL,
    analysis_data JSONB NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trading History
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES trading_sessions(id),
    ticker VARCHAR(20) NOT NULL,
    action VARCHAR(10) NOT NULL, -- 'BUY', 'SELL', 'HOLD'
    amount DECIMAL(20,6),
    price DECIMAL(20,8),
    confidence INTEGER,
    reasoning TEXT[],
    executed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Paper Trades
CREATE TABLE paper_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES managed_wallets(id),
    ticker VARCHAR(20) NOT NULL,
    action VARCHAR(10) NOT NULL,
    amount DECIMAL(20,6),
    price DECIMAL(20,8),
    confidence INTEGER,
    reasoning TEXT,
    would_execute BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **Indexes for Performance:**
```sql
CREATE INDEX idx_managed_wallets_user_id ON managed_wallets(user_id);
CREATE INDEX idx_trading_sessions_wallet_id ON trading_sessions(wallet_id);
CREATE INDEX idx_analysis_cache_ticker ON analysis_cache(ticker);
CREATE INDEX idx_analysis_cache_timestamp ON analysis_cache(timestamp);
CREATE INDEX idx_trades_session_id ON trades(session_id);
CREATE INDEX idx_paper_trades_wallet_id ON paper_trades(wallet_id);
```

### **2.2 Data Migration Strategy**

#### **Current Data Sources:**
- **localStorage**: Managed wallet data
- **JSON Files**: Analysis cache in `MMISTERMMCP/src/cache/`
- **Memory**: Trading sessions and paper trades

#### **Migration Steps:**
1. **Export Current Data**: Create migration scripts to export existing data
2. **Database Seeding**: Populate production database with current data
3. **Data Validation**: Verify data integrity after migration
4. **Rollback Plan**: Maintain backup of current data structure

## ⚙️ **Phase 3: Environment Configuration**

### **3.1 Frontend Configuration**

#### **Environment Variables:**
```bash
# .env.local (Development)
NEXT_PUBLIC_CNT_API_URL=http://localhost:4114
NEXT_PUBLIC_STRIKE_API_URL=http://localhost:4113
NEXT_PUBLIC_MISTER_API_URL=http://localhost:4112

# .env.production (Production)
NEXT_PUBLIC_CNT_API_URL=https://cnt-api.railway.app
NEXT_PUBLIC_STRIKE_API_URL=https://strike-bridge.railway.app
NEXT_PUBLIC_MISTER_API_URL=https://mister-bot.railway.app
```

#### **API Client Configuration:**
```typescript
// lib/api-config.ts
const API_CONFIG = {
  CNT_API_URL: process.env.NEXT_PUBLIC_CNT_API_URL || 'http://localhost:4114',
  STRIKE_API_URL: process.env.NEXT_PUBLIC_STRIKE_API_URL || 'http://localhost:4113',
  MISTER_API_URL: process.env.NEXT_PUBLIC_MISTER_API_URL || 'http://localhost:4112',
};

export default API_CONFIG;
```

### **3.2 Backend Configuration**

#### **Environment Detection:**
```javascript
// config/environment.js
const config = {
  development: {
    database: {
      host: 'localhost',
      port: 5432,
      database: 'mister_dev'
    },
    cors: {
      origin: 'http://localhost:3000'
    }
  },
  production: {
    database: {
      url: process.env.DATABASE_URL
    },
    cors: {
      origin: process.env.CORS_ORIGIN
    }
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

## 📋 **Phase 4: Production Deployment Checklist**

### **4.1 Pre-Deployment Tasks**

#### **Code Preparation:**
- [ ] Update all hardcoded localhost URLs to use environment variables
- [ ] Add health check endpoints to all services
- [ ] Implement proper error handling and logging
- [ ] Add rate limiting and security headers
- [ ] Create database migration scripts
- [ ] Set up monitoring and alerting

#### **Security Checklist:**
- [ ] Secure API keys and secrets in Railway environment variables
- [ ] Enable CORS with specific origins
- [ ] Implement JWT authentication for sensitive endpoints
- [ ] Add request validation and sanitization
- [ ] Enable HTTPS for all services
- [ ] Set up proper error handling (no sensitive data in errors)

#### **Performance Optimization:**
- [ ] Implement Redis caching for analysis data
- [ ] Add database connection pooling
- [ ] Optimize API response times
- [ ] Set up CDN for static assets
- [ ] Enable gzip compression

### **4.2 Deployment Steps**

#### **Railway Deployment:**
1. **Create Railway Projects:**
   ```bash
   railway login
   railway new cnt-trading-api
   railway new strike-bridge-server
   railway new mister-bot
   ```

2. **Deploy Services:**
   ```bash
   # CNT Trading API
   cd MMISTERMMCP
   railway link cnt-trading-api
   railway up

   # Strike Bridge Server
   cd sydney-agents
   railway link strike-bridge-server
   railway up

   # MISTER Bot
   cd sydney-agents
   railway link mister-bot
   railway up
   ```

3. **Configure Environment Variables:**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set DATABASE_URL=$DATABASE_URL
   railway variables set TAPTOOLS_API_KEY=$TAPTOOLS_API_KEY
   # ... add all required variables
   ```

4. **Set Up Database:**
   ```bash
   railway add postgresql
   railway run psql $DATABASE_URL < migrations/001_initial_schema.sql
   ```

### **4.3 Testing Strategy**

#### **Pre-Production Testing:**
- [ ] Unit tests for all API endpoints
- [ ] Integration tests for database operations
- [ ] End-to-end tests for complete user flows
- [ ] Load testing for concurrent users
- [ ] Security testing for vulnerabilities

#### **Production Validation:**
- [ ] Health check endpoints responding
- [ ] Database connections working
- [ ] External API integrations functional
- [ ] Frontend connecting to production APIs
- [ ] Real-time analysis updates working
- [ ] Paper trading functionality operational

### **4.4 Monitoring & Maintenance**

#### **Monitoring Setup:**
- [ ] Railway service monitoring
- [ ] Database performance monitoring
- [ ] API response time tracking
- [ ] Error rate monitoring
- [ ] External API usage tracking

#### **Backup Strategy:**
- [ ] Automated database backups
- [ ] Analysis cache backup
- [ ] Configuration backup
- [ ] Disaster recovery plan

---

**Next Steps:** Begin with Phase 1 API deployment, followed by database setup, then environment configuration, and finally comprehensive testing before going live.
