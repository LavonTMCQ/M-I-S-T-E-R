# 🚨 MANDATORY STRATEGY IMPLEMENTATION PROTOCOL

## ⚠️ **CRITICAL NOTICE**
**This document is MANDATORY for ALL trading strategy implementations. Deviation from this protocol will result in broken chart rendering, missing signals, and system failures.**

---

## 🎯 **PROTOCOL OVERVIEW**

Every trading strategy MUST follow this exact implementation pattern to ensure:
- ✅ **Synchronicity** - All strategies work together seamlessly
- ✅ **Tandem Operation** - Backend and frontend operate in perfect harmony
- ✅ **Chart Visualization** - Professional charts with trade signals render correctly
- ✅ **Performance Consistency** - All metrics calculate and display uniformly

---

## 📋 **MANDATORY IMPLEMENTATION CHECKLIST**

### **Phase 1: Agent Setup (REQUIRED)**
- [ ] **Import Kraken Tools** - MUST include `krakenWebSocketTool` and `krakenRestApiTool`
- [ ] **Voice Integration** - MUST include strategy-specific voice announcement tool
- [ ] **Memory System** - MUST use LibSQL storage with vector embeddings
- [ ] **Tool Configuration** - MUST follow exact tool object structure

### **Phase 2: API Endpoint (REQUIRED)**
- [ ] **File Location** - MUST be at `/app/api/backtest/[strategy-name]/route.ts`
- [ ] **POST Handler** - MUST implement POST method with error handling
- [ ] **Date Handling** - MUST support both provided dates and default 30-day period
- [ ] **Data Fetching** - MUST use `getHistoricalADAData()` function
- [ ] **Return Structure** - MUST match exact format specification

### **Phase 3: Strategy Logic (REQUIRED)**
- [ ] **Real Data Processing** - MUST use actual Kraken OHLCV data
- [ ] **Trade Generation** - MUST create trades with exact interface structure
- [ ] **Performance Calculation** - MUST calculate all required metrics
- [ ] **Chart Data Preparation** - MUST format data for ApexCharts rendering

### **Phase 4: Frontend Integration (REQUIRED)**
- [ ] **Strategy Selector** - MUST add strategy to selector with correct ID
- [ ] **Backtest Handler** - MUST add strategy handling in `handleRunBacktest()`
- [ ] **ID Consistency** - MUST ensure strategy IDs match across all components
- [ ] **Error Handling** - MUST implement fallback to sample data

### **Phase 5: Testing & Validation (REQUIRED)**
- [ ] **API Testing** - MUST pass all endpoint tests
- [ ] **Data Structure** - MUST validate all required fields
- [ ] **Chart Rendering** - MUST verify signals display correctly
- [ ] **Performance Metrics** - MUST validate all calculations
- [ ] **Frontend Integration** - MUST test complete user flow

---

## 🔧 **MANDATORY CODE TEMPLATES**

### **1. Agent Tool Configuration (EXACT FORMAT REQUIRED)**
```typescript
// MANDATORY: Import all required tools
import { yourStrategyTool } from '../tools/your-strategy-tool';
import { krakenWebSocketTool } from '../tools/kraken-websocket-tool';
import { krakenRestApiTool } from '../tools/kraken-rest-api-tool';

// MANDATORY: Tool object structure
const yourStrategyTradingTools: any = {
  yourStrategyTool,
  krakenWebSocketTool,        // REQUIRED
  krakenRestApiTool,          // REQUIRED
  speakYourStrategyResultsTool, // REQUIRED
};

// MANDATORY: Agent instructions must include Kraken tools
## TECHNICAL ANALYSIS FRAMEWORK
6. **REAL-TIME DATA**: Always use krakenWebSocketTool for live ADA/USD price feeds
7. **HISTORICAL DATA**: Use krakenRestApiTool to pull OHLCV data for analysis
8. **API ACCESS**: Use krakenRestApiTool for order book depth, recent trades, and market analysis
```

### **2. API Endpoint Structure (EXACT FORMAT REQUIRED)**
```typescript
// File: /app/api/backtest/[strategy-name]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, symbol = 'ADAUSD' } = await request.json();

    // MANDATORY: Default date handling
    const actualEndDate = endDate || new Date().toISOString();
    const actualStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`📊 Running ${STRATEGY_NAME} backtest...`);
    console.log(`📊 Parameters: ${symbol} from ${actualStartDate} to ${actualEndDate}`);

    // MANDATORY: Use exact data fetching function
    const historicalData = await getHistoricalADAData(actualStartDate, actualEndDate);
    
    if (!historicalData || historicalData.length === 0) {
      throw new Error('Failed to fetch historical data');
    }

    // MANDATORY: Run strategy simulation
    const backtestResults = await runYourStrategyBacktest(historicalData, actualStartDate, actualEndDate);

    // MANDATORY: Return exact structure
    return NextResponse.json({
      success: true,
      strategy: 'Your Strategy Name',
      symbol,
      timeframe: '15m',
      startDate: actualStartDate,
      endDate: actualEndDate,
      ...backtestResults
    });

  } catch (error) {
    console.error(`❌ ${STRATEGY_NAME} backtest failed:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// MANDATORY: Include exact data fetching function (copy from Fibonacci)
async function getHistoricalADAData(startDate: string, endDate: string) {
  // EXACT IMPLEMENTATION FROM FIBONACCI - DO NOT MODIFY
}
```

### **3. Strategy Return Structure (EXACT FORMAT REQUIRED)**
```typescript
// MANDATORY: Return this exact structure
return {
  totalNetPnl: totalPnl,                    // REQUIRED: Total P&L in USD
  winRate: winRate,                         // REQUIRED: Win rate as percentage (0-100)
  maxDrawdown: calculateMaxDrawdown(trades), // REQUIRED: Max drawdown as percentage
  sharpeRatio: calculateSharpeRatio(trades), // REQUIRED: Sharpe ratio calculation
  totalTrades: trades.length,               // REQUIRED: Total number of trades
  avgTradeDuration: avgTradeDuration,       // REQUIRED: Average duration in minutes
  trades: formattedTrades,                  // REQUIRED: Formatted for chart rendering
  chartData: chartData,                     // REQUIRED: OHLCV data for chart
  performance: {                            // REQUIRED: Detailed performance metrics
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    avgWin: avgWin,
    avgLoss: avgLoss,
    profitFactor: profitFactor,
    totalReturn: totalReturnPercent
  }
};
```

### **4. Trade Object Structure (EXACT FORMAT REQUIRED)**
```typescript
// MANDATORY: Each trade must have this exact structure
const trade = {
  id: `${strategyPrefix}_trade_${trades.length + 1}`,  // REQUIRED: Unique ID
  entryTime: currentCandle.time,                       // REQUIRED: ISO timestamp
  exitTime: exitCandle.time,                          // REQUIRED: ISO timestamp
  side: 'LONG' | 'SHORT',                             // REQUIRED: Trade direction
  entryPrice: entryPrice,                             // REQUIRED: Entry price
  exitPrice: exitPrice,                               // REQUIRED: Exit price
  size: positionSize,                                 // REQUIRED: Position size
  netPnl: calculatePnL(position, exitPrice),         // REQUIRED: P&L in USD
  reason: 'Your strategy entry/exit reason',          // REQUIRED: Trade reason
  duration: durationInMinutes                         // REQUIRED: Duration in minutes
};
```

### **5. Frontend Integration (EXACT FORMAT REQUIRED)**
```typescript
// File: /app/backtest-results/page.tsx
// MANDATORY: Add your strategy handler
} else if (selectedStrategy.id === 'your-strategy-id') {
  console.log('📊 Running real Your-Strategy backtest...');

  const response = await fetch('/api/backtest/your-strategy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol: 'ADAUSD' })
  });

  if (response.ok) {
    const realResults = await response.json();
    console.log('✅ Real Your-Strategy backtest completed:', realResults);
    setBacktestResults(realResults);
  } else {
    console.warn('⚠️ Real backtest failed, using sample data');
    const results = strategyResults[selectedStrategy.id as keyof typeof strategyResults];
    setBacktestResults(results);
  }
}

// File: /components/backtesting/StrategySelector.tsx
// MANDATORY: Add strategy to selector
{
  id: 'your-strategy-id',                    // MUST match handler ID exactly
  name: 'Your Strategy Name',
  description: 'Strategy description',
  timeframe: '15m',                          // REQUIRED
  type: 'technical',                         // REQUIRED
  status: 'active',                          // REQUIRED
  performance: {                             // REQUIRED: Sample performance data
    winRate: 65.0,
    totalTrades: 42,
    profitFactor: 1.85,
    avgReturn: 5.2,
    maxDrawdown: 8.5
  },
  features: ['Feature 1', 'Feature 2', 'Feature 3'], // REQUIRED
  icon: <YourIcon className="w-5 h-5" />    // REQUIRED
}
```

---

## 🚨 **CRITICAL REQUIREMENTS**

### **Data Integrity (NON-NEGOTIABLE)**
- ✅ **ONLY REAL DATA** - Never use mock/synthetic data
- ✅ **Kraken API ONLY** - Use Kraken for all ADA/USD data
- ✅ **15-minute timeframe** - Maintain consistency across strategies
- ✅ **ISO timestamps** - All dates must be ISO format

### **Chart Compatibility (NON-NEGOTIABLE)**
- ✅ **ApexCharts format** - Chart data must be ApexCharts compatible
- ✅ **Signal markers** - L/S for entries, ✓/✗ for exits
- ✅ **Color coding** - Green for LONG/profit, Red for SHORT/loss
- ✅ **Timestamp alignment** - Perfect alignment between trades and chart

### **Performance Metrics (NON-NEGOTIABLE)**
- ✅ **Standard calculations** - Use provided calculation functions
- ✅ **Consistent units** - P&L in USD, percentages as 0-100
- ✅ **Complete metrics** - All required fields must be present
- ✅ **Validation** - All metrics must pass validation tests

---

## 🧪 **MANDATORY TESTING PROTOCOL**

### **Pre-Deployment Testing (REQUIRED)**
```bash
# 1. API Endpoint Test
curl -X POST http://localhost:3000/api/backtest/your-strategy \
  -H "Content-Type: application/json" \
  -d '{"symbol":"ADAUSD"}' | jq '.success'

# 2. Data Structure Validation
curl -X POST http://localhost:3000/api/backtest/your-strategy \
  -H "Content-Type: application/json" \
  -d '{"symbol":"ADAUSD"}' | jq 'keys'

# 3. Chart Data Validation
curl -X POST http://localhost:3000/api/backtest/your-strategy \
  -H "Content-Type: application/json" \
  -d '{"symbol":"ADAUSD"}' | jq '.chartData | length'
```

### **Frontend Integration Test (REQUIRED)**
1. Navigate to http://localhost:3000/backtest-results
2. Select your strategy from the list
3. Click "Run Backtest"
4. Verify loading state displays
5. Verify results display correctly
6. Click "Chart Analysis" tab
7. Verify chart renders with signals
8. Verify all performance metrics display

---

## ⚡ **FAILURE PREVENTION**

### **Common Mistakes That WILL Break The System:**
- ❌ Missing Kraken tools in agent
- ❌ Wrong return data structure
- ❌ Mismatched strategy IDs
- ❌ Missing chart data
- ❌ Wrong trade object format
- ❌ Missing performance metrics
- ❌ Using mock data instead of real data

### **System Dependencies:**
- 🔗 **ApexTradingChart** - Requires exact trade and chart data format
- 🔗 **ImprovedBacktestResults** - Requires complete performance metrics
- 🔗 **StrategySelector** - Requires consistent strategy metadata
- 🔗 **Kraken API** - Requires proper error handling and rate limiting

---

## 🎯 **SUCCESS GUARANTEE**

**Following this protocol EXACTLY will guarantee:**
- ✅ Perfect chart rendering with trade signals
- ✅ Accurate performance metrics display
- ✅ Seamless frontend integration
- ✅ Consistent user experience across all strategies
- ✅ Bulletproof system reliability

**🚨 REMEMBER: This is not optional. Every strategy MUST follow this protocol exactly to ensure system-wide synchronicity and tandem operation.**

---

## 📊 **VALIDATION FRAMEWORK**

### **Automated Validation Script (MANDATORY)**
Every strategy MUST pass this validation before deployment:

```javascript
// File: validate-strategy.js
import fetch from 'node-fetch';

const REQUIRED_FIELDS = [
  'success', 'strategy', 'symbol', 'timeframe', 'startDate', 'endDate',
  'totalNetPnl', 'winRate', 'maxDrawdown', 'sharpeRatio', 'totalTrades',
  'avgTradeDuration', 'trades', 'chartData', 'performance'
];

const REQUIRED_TRADE_FIELDS = [
  'id', 'entryTime', 'exitTime', 'side', 'entryPrice', 'exitPrice',
  'size', 'netPnl', 'reason', 'duration'
];

const REQUIRED_CANDLE_FIELDS = [
  'time', 'open', 'high', 'low', 'close', 'volume'
];

async function validateStrategy(strategyName) {
  console.log(`🧪 Validating ${strategyName} strategy...`);

  const response = await fetch(`http://localhost:3000/api/backtest/${strategyName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol: 'ADAUSD' })
  });

  const data = await response.json();

  // Validate all required fields
  const missingFields = REQUIRED_FIELDS.filter(field => !(field in data));
  if (missingFields.length > 0) {
    throw new Error(`❌ Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate trade structure
  if (data.trades.length > 0) {
    const sampleTrade = data.trades[0];
    const missingTradeFields = REQUIRED_TRADE_FIELDS.filter(field => !(field in sampleTrade));
    if (missingTradeFields.length > 0) {
      throw new Error(`❌ Missing trade fields: ${missingTradeFields.join(', ')}`);
    }
  }

  // Validate chart data
  if (data.chartData.length > 0) {
    const sampleCandle = data.chartData[0];
    const missingCandleFields = REQUIRED_CANDLE_FIELDS.filter(field => !(field in sampleCandle));
    if (missingCandleFields.length > 0) {
      throw new Error(`❌ Missing candle fields: ${missingCandleFields.join(', ')}`);
    }
  }

  console.log(`✅ ${strategyName} strategy validation passed!`);
  return true;
}
```

### **Performance Benchmarks (MANDATORY)**
Every strategy MUST meet these minimum requirements:

| Metric | Minimum Requirement | Validation |
|--------|-------------------|------------|
| **Chart Data** | >100 candles | `data.chartData.length > 100` |
| **Data Timeframe** | 15-minute intervals | Verify timestamp intervals |
| **Win Rate** | 0-100% range | `data.winRate >= 0 && data.winRate <= 100` |
| **P&L Format** | USD dollars | `typeof data.totalNetPnl === 'number'` |
| **Trade Count** | ≥0 trades | `data.totalTrades >= 0` |
| **Sharpe Ratio** | Valid number | `!isNaN(data.sharpeRatio)` |

---

## 🔄 **DEPLOYMENT WORKFLOW**

### **Step-by-Step Deployment (MANDATORY)**
```bash
# 1. Create strategy files
mkdir -p src/mastra/tools
mkdir -p src/mastra/agents
mkdir -p mister-frontend/src/app/api/backtest/your-strategy

# 2. Implement strategy following templates
# - Agent with Kraken tools
# - API endpoint with exact structure
# - Frontend integration

# 3. Run validation
node validate-strategy.js your-strategy

# 4. Test frontend integration
npm run dev
# Navigate to http://localhost:3000/backtest-results
# Test complete user flow

# 5. Deploy to production
git add .
git commit -m "Add your-strategy implementation"
git push origin main
```

### **Quality Gates (MANDATORY)**
- [ ] **Code Review** - All code must be reviewed against this protocol
- [ ] **Validation Tests** - All validation tests must pass
- [ ] **Frontend Testing** - Complete user flow must work
- [ ] **Performance Testing** - Strategy must handle 30-day data periods
- [ ] **Documentation** - Strategy must be documented in this system

---

## 📚 **REFERENCE IMPLEMENTATIONS**

### **Working Examples (COPY THESE EXACTLY)**
1. **Fibonacci Strategy** - `sydney-agents/src/mastra/agents/fibonacci-agent.ts`
2. **Multi-Timeframe Strategy** - `sydney-agents/src/mastra/agents/multi-timeframe-agent.ts`

### **Key Files to Reference**
- **Agent Pattern** - Copy tool structure and instructions format
- **API Pattern** - Copy endpoint structure and return format
- **Frontend Pattern** - Copy integration and error handling
- **Chart Pattern** - Copy signal rendering and data formatting

---

## 🎯 **FINAL CHECKLIST**

Before marking any strategy as "complete", verify:

### **Backend Verification**
- [ ] Agent has all required Kraken tools
- [ ] API endpoint returns exact data structure
- [ ] All performance metrics calculate correctly
- [ ] Real Kraken data integration works
- [ ] Error handling implemented properly

### **Frontend Verification**
- [ ] Strategy appears in selector with correct metadata
- [ ] "Run Backtest" button triggers API call
- [ ] Loading state displays during processing
- [ ] Results display in all tabs (Overview, Chart, Trade Log, Performance)
- [ ] Chart renders with proper L/S and ✓/✗ signals
- [ ] All performance metrics display correctly

### **System Integration Verification**
- [ ] Strategy works alongside existing strategies
- [ ] No conflicts with other strategy IDs
- [ ] Memory system operates independently
- [ ] Voice announcements work properly
- [ ] Real-time data feeds function correctly

**🎯 FINAL RESULT: Following this protocol guarantees bulletproof strategy implementation with perfect synchronicity and tandem operation across the entire system.**
