# 🚂 **Railway Deployment Guide - Step by Step**

## 🎯 **Quick Start Deployment**

### **Prerequisites**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login
```

## 🔧 **Service 1: CNT Trading API**

### **Step 1: Prepare CNT API for Production**

#### **Create Production Configuration:**
```javascript
// MMISTERMMCP/src/config/production.js
export const productionConfig = {
  port: process.env.PORT || 4114,
  database: {
    url: process.env.DATABASE_URL
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  cache: {
    redis: process.env.REDIS_URL,
    ttl: 1800 // 30 minutes
  }
};
```

#### **Add Health Check Endpoint:**
```javascript
// MMISTERMMCP/src/test-api.ts - Add this endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'cnt-trading-api',
    version: '1.0.0'
  });
});
```

#### **Create Railway Configuration:**
```toml
# MMISTERMMCP/railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node src/test-api.js"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[env]
NODE_ENV = "production"
```

### **Step 2: Deploy CNT API to Railway**

```bash
# Navigate to CNT API directory
cd MMISTERMMCP

# Create new Railway project
railway new cnt-trading-api

# Link to project
railway link cnt-trading-api

# Add PostgreSQL database
railway add postgresql

# Set environment variables
railway variables set NODE_ENV=production
railway variables set TAPTOOLS_API_KEY=WghkJaZlDWYdQFsyt3uiLdTIOYnR5uhO
railway variables set BLOCKFROST_PROJECT_ID=mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu
railway variables set TWITTER_API_URL=https://twitscap-production.up.railway.app
railway variables set CORS_ORIGIN=http://localhost:3000

# Deploy
railway up

# Get the deployment URL
railway status
```

## 🔧 **Service 2: Strike Bridge Server**

### **Step 1: Prepare Strike Bridge for Production**

#### **Add Health Check:**
```javascript
// sydney-agents/mister-bridge-server.cjs - Add this endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'strike-bridge-server',
    version: '1.0.0'
  });
});
```

#### **Create Railway Configuration:**
```toml
# sydney-agents/railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node mister-bridge-server.cjs"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"

[env]
NODE_ENV = "production"
```

### **Step 2: Deploy Strike Bridge to Railway**

```bash
# Navigate to Strike Bridge directory
cd sydney-agents

# Create new Railway project
railway new strike-bridge-server

# Link to project
railway link strike-bridge-server

# Set environment variables
railway variables set NODE_ENV=production
railway variables set CORS_ORIGIN=http://localhost:3000

# Deploy
railway up

# Get the deployment URL
railway status
```

## 🔧 **Service 3: MISTER Bot**

### **Step 1: Prepare MISTER Bot for Production**

#### **Add Health Check:**
```javascript
// sydney-agents/index.mjs - Add this endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'mister-bot',
    version: '1.0.0'
  });
});
```

#### **Create Railway Configuration:**
```toml
# sydney-agents/railway-bot.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node index.mjs"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"

[env]
NODE_ENV = "production"
```

### **Step 2: Deploy MISTER Bot to Railway**

```bash
# Navigate to MISTER Bot directory
cd sydney-agents

# Create new Railway project
railway new mister-bot

# Link to project
railway link mister-bot

# Set environment variables
railway variables set NODE_ENV=production
railway variables set CORS_ORIGIN=http://localhost:3000

# Deploy
railway up

# Get the deployment URL
railway status
```

## 🗄️ **Database Setup**

### **Step 1: Create Database Schema**

```sql
-- migrations/001_initial_schema.sql
-- Copy the schema from DEPLOYMENT_PLAN.md
```

### **Step 2: Run Migrations**

```bash
# Connect to CNT API project database
railway link cnt-trading-api
railway run psql $DATABASE_URL < migrations/001_initial_schema.sql

# Verify tables created
railway run psql $DATABASE_URL -c "\dt"
```

## 🔄 **Frontend Configuration Update**

### **Step 1: Update API URLs**

```typescript
// sydney-agents/mister-frontend/lib/api-config.ts
const API_CONFIG = {
  development: {
    CNT_API_URL: 'http://localhost:4114',
    STRIKE_API_URL: 'http://localhost:4113',
    MISTER_API_URL: 'http://localhost:4112',
  },
  production: {
    CNT_API_URL: 'https://cnt-trading-api-production.up.railway.app',
    STRIKE_API_URL: 'https://bridge-server-cjs-production.up.railway.app',
    MISTER_API_URL: 'https://mister-bot-production.up.railway.app',
  }
};

const env = process.env.NODE_ENV || 'development';
export default API_CONFIG[env];
```

### **Step 2: Update Frontend API Calls**

```typescript
// sydney-agents/mister-frontend/src/components/trading/EnhancedManagedDashboard.tsx
import API_CONFIG from '@/lib/api-config';

// Replace hardcoded URLs:
// OLD: const response = await fetch('http://localhost:4114/api/analysis/current');
// NEW: const response = await fetch(`${API_CONFIG.CNT_API_URL}/api/analysis/current`);
```

## 🧪 **Testing Production Deployment**

### **Step 1: Health Check Tests**

```bash
# Test all services are healthy
curl https://cnt-trading-api-production.up.railway.app/health
curl https://bridge-server-cjs-production.up.railway.app/health
curl https://mister-bot-production.up.railway.app/health
```

### **Step 2: API Functionality Tests**

```bash
# Test CNT API endpoints
curl https://cnt-trading-api-production.up.railway.app/api/analysis/current
curl https://cnt-trading-api-production.up.railway.app/api/analysis/history

# Test database connection
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

### **Step 3: Frontend Integration Test**

```bash
# Start frontend with production API URLs
cd sydney-agents/mister-frontend
npm run dev

# Navigate to http://localhost:3000/managed-dashboard
# Verify analysis data loads from production APIs
```

## 🔍 **Monitoring & Troubleshooting**

### **View Logs:**
```bash
# CNT API logs
railway link cnt-trading-api
railway logs

# Strike Bridge logs
railway link strike-bridge-server
railway logs

# MISTER Bot logs
railway link mister-bot
railway logs
```

### **Database Monitoring:**
```bash
# Check database connections
railway run psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Monitor table sizes
railway run psql $DATABASE_URL -c "SELECT schemaname,tablename,attname,n_distinct,correlation FROM pg_stats;"
```

### **Performance Monitoring:**
```bash
# Check service metrics
railway metrics

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s https://cnt-trading-api-production.up.railway.app/health
```

## 🚀 **Go Live Checklist**

### **Pre-Launch:**
- [ ] All services deployed and healthy
- [ ] Database schema created and populated
- [ ] Environment variables configured
- [ ] CORS settings updated for production
- [ ] SSL certificates active
- [ ] Monitoring setup complete

### **Launch:**
- [ ] Update frontend to use production APIs
- [ ] Test complete user flow
- [ ] Monitor error rates and response times
- [ ] Verify analysis updates working
- [ ] Confirm paper trading functionality

### **Post-Launch:**
- [ ] Monitor service health for 24 hours
- [ ] Check database performance
- [ ] Verify external API integrations
- [ ] Monitor user feedback
- [ ] Plan scaling if needed

---

**🎉 Your MISTER CNT Trading system is now live on Railway!**
