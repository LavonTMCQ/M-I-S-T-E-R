# 🏦 Phemex Portfolio Management Agent Setup Guide

## 📋 Your Information
- **IP Address**: `173.49.85.151`
- **Agent**: PhemexPortfolioAgent
- **Purpose**: Professional portfolio management and risk analysis

## 🔧 Phemex API Setup Steps

### 1. **Login to Phemex**
- Go to [Phemex.com](https://phemex.com)
- Login to your account

### 2. **Create API Key**
- Navigate to **Account** → **API Management**
- Click **Create New API Key**
- **Name**: `Portfolio Management Agent`
- **IP Whitelist**: Add `173.49.85.151`

### 3. **API Permissions Required**
✅ **Read Account Information**
✅ **Read Position Information** 
✅ **Read Order History**
✅ **Read Market Data**
❌ **Trading** (NOT needed - agent only provides advice)
❌ **Withdrawal** (NOT needed for safety)

### 4. **Copy API Credentials**
After creating the API key, you'll get:
- **API Key**: `your-api-key-here`
- **Secret Key**: `your-secret-key-here`

### 5. **Update Agent Configuration**
Edit the file: `src/mastra/tools/phemex-account-tool.ts`

Replace these lines:
```typescript
const PHEMEX_API_KEY = 'your-phemex-api-key'; // Replace with your actual API key
const PHEMEX_SECRET = 'your-phemex-secret'; // Replace with your actual secret
```

With your actual credentials:
```typescript
const PHEMEX_API_KEY = 'your-actual-api-key-from-phemex';
const PHEMEX_SECRET = 'your-actual-secret-from-phemex';
```

## 🎯 Agent Capabilities

### **📊 Portfolio Analysis**
- Real-time account balance and equity
- Current open positions with P&L
- Margin usage and liquidation risk
- Risk exposure analysis

### **🔍 Professional Advice**
- Position sizing recommendations
- Risk management suggestions
- Market condition analysis
- Entry/exit strategy advice

### **🚨 Risk Monitoring**
- Liquidation distance alerts
- Margin utilization warnings
- Portfolio risk assessment
- Position correlation analysis

### **🔊 Voice Announcements**
- Critical risk alerts
- Portfolio recommendations
- Market condition updates
- Professional trading advice

## 🧪 Testing the Agent

### **1. Test Account Access**
```bash
curl -X POST http://localhost:4111/api/agents/phemexPortfolioAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user", 
        "content": "Show me my current account balance and positions"
      }
    ],
    "resourceId": "sydney",
    "threadId": "portfolio-check"
  }'
```

### **2. Test Risk Analysis**
```bash
curl -X POST http://localhost:4111/api/agents/phemexPortfolioAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user", 
        "content": "Analyze my current risk exposure and provide professional recommendations"
      }
    ],
    "resourceId": "sydney",
    "threadId": "risk-analysis"
  }'
```

### **3. Test Position Advice**
```bash
curl -X POST http://localhost:4111/api/agents/phemexPortfolioAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user", 
        "content": "Should I adjust my ADA position based on current market conditions?"
      }
    ],
    "resourceId": "sydney",
    "threadId": "position-advice"
  }'
```

## 🛡️ Security Features

### **✅ Safe Design**
- **READ-ONLY** access to your account
- **NO TRADING** permissions required
- **NO WITHDRAWAL** capabilities
- **IP WHITELISTED** to your address only

### **🔒 Risk Management**
- Never suggests closing ALL positions
- Provides gradual adjustment recommendations
- Considers your existing strategy
- Focuses on risk reduction, not elimination

## 🎯 Professional Features

### **📈 Market Analysis**
- Real-time price data
- Trend analysis
- Volatility assessment
- Volume confirmation

### **💼 Portfolio Management**
- Position correlation analysis
- Risk-adjusted returns
- Sharpe ratio calculations
- Value at Risk (VaR) metrics

### **🎓 Educational Insights**
- Explains reasoning behind recommendations
- Provides market context
- Teaches risk management principles
- Offers professional trading insights

## 🚀 Next Steps

1. **Setup API credentials** in the configuration file
2. **Test the agent** with the provided curl commands
3. **Verify voice announcements** are working
4. **Start receiving professional portfolio advice**

The agent will help you manage your positions professionally while respecting your trading style and never suggesting to close everything you have open!
