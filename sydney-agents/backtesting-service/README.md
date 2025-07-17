# 🚀 FreqTrade + VectorBT Backtesting Service

Professional-grade backtesting microservice for Agent Vault trading strategies, optimized for Railway deployment.

## 🎯 **Key Features**

- **FreqTrade Integration**: Industry-standard backtesting framework
- **VectorBT Analysis**: High-performance vectorized calculations
- **Agent Vault Simulation**: Balance constraints and fee calculations
- **Fee-Aware Analysis**: Comprehensive profitability validation
- **Railway Ready**: Optimized for cloud deployment
- **REST API**: Easy integration with TypeScript frontend

## 📊 **Fee Calculator Test Results**

✅ **ALL 8 SCENARIOS PROFITABLE!**

| Scenario | Trade Size | Win Rate | Monthly Profit | Fee Impact | Status |
|----------|------------|----------|----------------|------------|---------|
| Conservative 40 ADA | 40 ADA | 60% | 117.60 ADA | 75.5% | ✅ Profitable |
| Conservative 60 ADA | 60 ADA | 60% | 356.40 ADA | 50.5% | ✅ Profitable |
| Moderate 50 ADA | 50 ADA | 65% | 1,008.00 ADA | 35.1% | ✅ Profitable |
| **Moderate 100 ADA** | **100 ADA** | **65%** | **2,556.00 ADA** | **17.7%** | **✅ Optimal** |
| Aggressive 75 ADA | 75 ADA | 70% | 3,951.00 ADA | 15.6% | ✅ Profitable |
| **Aggressive 150 ADA** | **150 ADA** | **70%** | **8,622.00 ADA** | **7.9%** | **🏆 Best** |
| High Freq 40 ADA | 40 ADA | 75% | 1,430.40 ADA | 50.3% | ✅ Profitable |
| High Freq 100 ADA | 100 ADA | 75% | 5,736.00 ADA | 20.3% | ✅ Profitable |

### **🎯 Optimal Configuration**
- **Trade Size**: 150 ADA
- **Win Rate Target**: 70%+
- **Trading Frequency**: 4 trades/day
- **Expected Monthly Profit**: 8,622 ADA
- **Fee Impact**: Only 7.9% of gross profit

## 🧪 **Testing Recommendations**

### **ADA Requirements**
- **60 ADA**: Basic functionality testing (1-2 trades)
- **200 ADA**: Comprehensive validation (5-10 trades)
- **500 ADA**: Production testing (20+ trades)

### **Profitability Targets**
- **Minimum Win Rate**: 65% for consistent profitability
- **Fee Impact**: Keep below 15% of gross profit
- **Trade Size**: 100+ ADA for optimal fee efficiency
- **Frequency**: 3-4 trades/day maximum

## 🚀 **Railway Deployment**

### **Prerequisites**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login
```

### **Quick Deploy**
```bash
# Clone and navigate
cd sydney-agents/backtesting-service

# Deploy to Railway
./deploy-to-railway.sh
```

### **Manual Deployment**
```bash
# Initialize Railway project
railway init

# Set environment variables
railway variables set FLASK_ENV=production
railway variables set PYTHONPATH=/app
railway variables set LOG_LEVEL=INFO

# Deploy
railway up --detach

# Get deployment URL
railway domain
```

## 📡 **API Endpoints**

### **Health Check**
```bash
GET /health
```

### **List Strategies**
```bash
GET /strategies
```

### **Run Backtest**
```bash
POST /backtest
Content-Type: application/json

{
  "strategy_name": "fibonacci",
  "symbol": "ADA/USD",
  "timeframe": "15m",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "initial_balance": 200.0,
  "max_trade_amount": 100.0,
  "strike_minimum": 40.0,
  "transaction_fee": 3.0,
  "leverage": 10
}
```

### **Fee Analysis**
```bash
POST /fee-analysis
Content-Type: application/json

{
  "trade_amount": 100,
  "trades_per_day": 3,
  "win_rate": 65
}
```

## 🔧 **Local Development**

### **Setup**
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run locally
python app.py
```

### **Test Fee Calculator**
```bash
python test_fee_calculator.py
```

## 📊 **Integration with Frontend**

### **TypeScript Integration**
```typescript
// Call Railway-hosted backtesting service
const response = await fetch('https://your-railway-url.railway.app/backtest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strategy_name: 'fibonacci',
    initial_balance: 200,
    max_trade_amount: 100
  })
});

const results = await response.json();
console.log('Backtest results:', results);
```

### **Environment Variables**
```typescript
// Add to your frontend .env
NEXT_PUBLIC_BACKTESTING_SERVICE_URL=https://your-railway-url.railway.app
```

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │  Railway Cloud   │    │  FreqTrade +    │
│                 │    │                  │    │  VectorBT       │
│ • Backtest UI   │───▶│ • Python Flask   │───▶│                 │
│ • Results View  │    │ • Auto-scaling   │    │ • Strategy Test │
│ • Fee Analysis  │    │ • Load Balancing │    │ • Performance   │
│                 │    │ • Monitoring     │    │ • Risk Metrics  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔍 **Monitoring & Debugging**

### **Railway Commands**
```bash
# View logs
railway logs

# Check status
railway status

# Open dashboard
railway open

# Scale service
railway scale
```

### **Health Monitoring**
```bash
# Check service health
curl https://your-railway-url.railway.app/health

# Test strategies endpoint
curl https://your-railway-url.railway.app/strategies
```

## 📈 **Performance Optimization**

### **Railway Configuration**
- **Memory**: 512MB minimum, 1GB recommended
- **CPU**: 1 vCPU sufficient for most workloads
- **Scaling**: Auto-scaling enabled
- **Health Checks**: 30-second intervals

### **Optimization Tips**
- Use larger trade sizes (100+ ADA) for better fee efficiency
- Limit backtesting to essential timeframes
- Cache frequently used calculations
- Monitor memory usage during large backtests

## 🎯 **Next Steps**

1. **Deploy to Railway** using the provided script
2. **Test all endpoints** with sample data
3. **Integrate with frontend** using the Railway URL
4. **Monitor performance** and optimize as needed
5. **Scale up** for production workloads

## 🔒 **Security**

- Environment variables for sensitive configuration
- CORS enabled for frontend integration
- Input validation on all endpoints
- Rate limiting (implement if needed)
- Health checks for monitoring

---

**🎉 Ready for Railway deployment and production use!**
