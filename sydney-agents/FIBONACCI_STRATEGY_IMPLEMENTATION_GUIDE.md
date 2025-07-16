# 🔢 Fibonacci Strategy Implementation Guide

## 📋 **COMPLETE IMPLEMENTATION PATTERN**

This document provides the **EXACT BLUEPRINT** for implementing any trading strategy with backtesting and chart visualization, based on the working Fibonacci strategy implementation.

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **1. Core Components Structure**
```
/app/api/backtest/[strategy]/route.ts     ← Backend API endpoint
/app/backtest-results/page.tsx           ← Main backtesting page
/components/backtesting/
  ├── ImprovedBacktestResults.tsx        ← Results display component
  ├── ApexTradingChart.tsx               ← Chart with signals
  └── StrategySelector.tsx               ← Strategy selection UI
```

### **2. Data Flow Pattern**
```
User Selects Strategy → Run Backtest → API Fetches Real Data → 
Strategy Logic Processes → Returns Results + Chart Data + Trades → 
Frontend Renders Chart with Signals
```

---

## 🔧 **STEP-BY-STEP IMPLEMENTATION**

### **STEP 1: Create API Endpoint**
**File:** `/app/api/backtest/[strategy-name]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, symbol = 'ADAUSD' } = await request.json();
    
    // 1. Get real historical data from Kraken
    const historicalData = await getHistoricalADAData(startDate, endDate);
    
    // 2. Run strategy simulation
    const backtestResults = await runStrategyBacktest(historicalData, startDate, endDate);
    
    return NextResponse.json({
      success: true,
      strategy: 'Your Strategy Name',
      symbol,
      timeframe: '15m',
      startDate,
      endDate,
      ...backtestResults
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// CRITICAL: Real data fetching function
async function getHistoricalADAData(startDate: string, endDate: string) {
  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
  
  const response = await fetch(
    `https://api.kraken.com/0/public/OHLC?pair=ADAUSD&interval=15&since=${startTimestamp}`
  );
  
  const data = await response.json();
  const ohlcData = data.result.ADAUSD;
  
  // Convert to standard format
  return ohlcData.map((candle: any[]) => ({
    timestamp: candle[0] * 1000,
    time: new Date(candle[0] * 1000).toISOString(),
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[6])
  }));
}
```

### **STEP 2: Strategy Logic Implementation**
**Pattern:** Process each candle and generate trades

```typescript
async function runStrategyBacktest(chartData: any[], startDate: string, endDate: string) {
  const trades: any[] = [];
  let currentPosition: any = null;
  let totalPnl = 0;
  let maxDrawdown = 0;
  
  // Strategy-specific parameters
  const lookbackPeriod = 50; // Adjust per strategy
  
  for (let i = lookbackPeriod; i < chartData.length - 1; i++) {
    const currentCandle = chartData[i];
    const currentPrice = currentCandle.close;
    
    // YOUR STRATEGY LOGIC HERE
    if (!currentPosition) {
      // Entry logic - check for signals
      if (/* YOUR ENTRY CONDITION */) {
        currentPosition = {
          id: `trade_${trades.length + 1}`,
          side: 'LONG', // or 'SHORT'
          entryTime: currentCandle.time,
          entryPrice: currentPrice,
          size: 50000 / currentPrice, // $50k position
          reason: 'Your entry reason'
        };
      }
    } else {
      // Exit logic - check for exit conditions
      if (/* YOUR EXIT CONDITION */) {
        const pnl = calculatePnL(currentPosition, currentPrice);
        
        trades.push({
          ...currentPosition,
          exitTime: currentCandle.time,
          exitPrice: currentPrice,
          netPnl: pnl,
          duration: calculateDuration(currentPosition.entryTime, currentCandle.time)
        });
        
        totalPnl += pnl;
        currentPosition = null;
      }
    }
  }
  
  // Calculate performance metrics
  return {
    totalNetPnl: totalPnl,
    winRate: calculateWinRate(trades),
    maxDrawdown: maxDrawdown,
    sharpeRatio: calculateSharpeRatio(trades),
    totalTrades: trades.length,
    trades: trades,
    chartData: chartData, // CRITICAL: Include for chart rendering
    performance: {
      // Additional metrics
    }
  };
}
```

### **STEP 3: Frontend Integration**
**File:** `/app/backtest-results/page.tsx`

Add your strategy to the `handleRunBacktest` function:

```typescript
if (selectedStrategy.id === 'your-strategy-id') {
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const response = await fetch('/api/backtest/your-strategy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate, symbol: 'ADAUSD' })
  });
  
  if (response.ok) {
    const realResults = await response.json();
    setBacktestResults(realResults);
  }
}
```

---

## 📊 **CHART VISUALIZATION PATTERN**

### **Signal Rendering Logic**
**File:** `/components/backtesting/ApexTradingChart.tsx`

The chart automatically renders:
- **Candlestick data** from `chartData`
- **Entry signals** as colored markers (L/S)
- **Exit signals** as checkmarks/X marks (✓/✗)
- **Trade statistics** overlay

**Key Pattern:**
```typescript
// Entry points
points.push({
  x: new Date(trade.entryTime).getTime(),
  y: trade.entryPrice,
  marker: {
    fillColor: trade.side === 'LONG' ? '#22c55e' : '#ef4444',
    shape: trade.side === 'LONG' ? 'circle' : 'square'
  },
  label: { text: trade.side.charAt(0) } // 'L' or 'S'
});

// Exit points
points.push({
  x: new Date(trade.exitTime).getTime(),
  y: trade.exitPrice,
  marker: {
    fillColor: isProfitable ? '#22c55e' : '#ef4444'
  },
  label: { text: isProfitable ? '✓' : '✗' }
});
```

---

## 🎯 **CRITICAL SUCCESS FACTORS**

### **1. Real Data Integration**
- ✅ **ALWAYS** use Kraken API for real ADA data
- ✅ **NEVER** use mock/synthetic data
- ✅ Use 15-minute timeframe for consistency
- ✅ Handle API errors gracefully

### **2. Trade Object Structure**
**EXACT FORMAT REQUIRED:**
```typescript
interface BacktestTrade {
  id: string;
  entryTime: string;        // ISO timestamp
  exitTime: string;         // ISO timestamp
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  size: number;
  netPnl: number;
  reason: string;
  duration?: number;        // minutes
}
```

### **3. Return Data Structure**
**EXACT FORMAT REQUIRED:**
```typescript
{
  totalNetPnl: number,
  winRate: number,          // percentage
  maxDrawdown: number,      // percentage
  sharpeRatio: number,
  totalTrades: number,
  trades: BacktestTrade[],  // CRITICAL for chart
  chartData: CandleData[],  // CRITICAL for chart
  performance: {
    winningTrades: number,
    losingTrades: number,
    avgWin: number,
    avgLoss: number,
    profitFactor: number
  }
}
```

---

## 🔄 **REPLICATION CHECKLIST**

### **For Each New Strategy:**

1. **✅ Create API endpoint** `/app/api/backtest/[strategy]/route.ts`
2. **✅ Implement strategy logic** with real data processing
3. **✅ Add to frontend** `handleRunBacktest` function
4. **✅ Test with real data** (not mock data)
5. **✅ Verify chart rendering** with signals
6. **✅ Validate trade statistics** accuracy

### **Testing Verification:**
- Chart displays candlesticks ✅
- Entry signals show as L/S markers ✅
- Exit signals show as ✓/✗ markers ✅
- Statistics match trade data ✅
- Real-time data loads correctly ✅

---

## 🚀 **DEPLOYMENT PATTERN**

1. **Local Development:** Test with localhost:3000/backtest-results
2. **Real Data Validation:** Ensure Kraken API integration works
3. **Chart Verification:** Confirm signals render correctly
4. **Performance Testing:** Validate with 30-day data periods

---

**🎯 RESULT:** Following this exact pattern will create a fully functional trading strategy with professional backtesting and chart visualization, identical to the working Fibonacci implementation.

---

## 📝 **FIBONACCI STRATEGY SPECIFICS**

### **Fibonacci Logic Implementation**
```typescript
// Fibonacci calculation parameters
const lookbackPeriod = 50;
const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];

// Find swing points
const lookbackData = chartData.slice(i - lookbackPeriod, i);
const swingHigh = Math.max(...lookbackData.map(c => c.high));
const swingLow = Math.min(...lookbackData.map(c => c.low));

// Calculate Fibonacci levels
const range = swingHigh - swingLow;
const fibPrices = fibLevels.map(ratio => swingHigh - (range * ratio));

// Entry signals
const fib618 = fibPrices[4]; // 61.8% support
const fib50 = fibPrices[3];  // 50% support
const fib236 = fibPrices[1]; // 23.6% resistance

// LONG at support levels
if (currentPrice <= fib618 * 1.005 && currentPrice >= fib618 * 0.995) {
  // Enter LONG at 61.8% Fibonacci support
}

// SHORT at resistance levels
if (currentPrice >= fib236 * 0.995 && currentPrice <= fib236 * 1.005) {
  // Enter SHORT at 23.6% Fibonacci resistance
}
```

### **Performance Metrics Calculation**
```typescript
function calculateWinRate(trades: any[]): number {
  const completedTrades = trades.filter(t => t.exitTime);
  const profitableTrades = completedTrades.filter(t => t.netPnl > 0);
  return completedTrades.length > 0 ? (profitableTrades.length / completedTrades.length) * 100 : 0;
}

function calculateSharpeRatio(trades: any[]): number {
  const returns = trades.map(t => (t.netPnl / 50000) * 100); // % returns
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
  return stdDev > 0 ? avgReturn / stdDev : 0;
}

function calculatePnL(position: any, exitPrice: number): number {
  if (position.side === 'LONG') {
    return (exitPrice - position.entryPrice) * position.size;
  } else {
    return (position.entryPrice - exitPrice) * position.size;
  }
}
```

---

## 🔧 **COMPONENT INTEGRATION DETAILS**

### **Strategy Selector Integration**
**File:** `/components/backtesting/StrategySelector.tsx`

Add your strategy to the strategies array:
```typescript
{
  id: 'your-strategy-id',
  name: 'Your Strategy Name',
  description: 'Strategy description',
  icon: YourIcon, // from lucide-react
  category: 'TECHNICAL', // or 'AI-DRIVEN', 'HYBRID'
  riskLevel: 'Medium', // 'Low', 'Medium', 'High'
  leverage: 3,
  minBalance: 100,
  isActive: true,
  timeframe: '15m',
  features: ['Feature 1', 'Feature 2', 'Feature 3']
}
```

### **Results Display Integration**
The `ImprovedBacktestResults` component automatically handles:
- **Overview tab:** Performance metrics and recent trades
- **Chart Analysis tab:** Candlestick chart with trade signals
- **Trade Log tab:** Detailed trade history (placeholder)
- **Performance tab:** Advanced analytics

**No additional code needed** - just ensure your API returns the correct data structure.

---

## 🎨 **CHART STYLING SPECIFICATIONS**

### **Signal Colors & Shapes**
- **LONG Entry:** Green circle (🟢) with "L" label
- **SHORT Entry:** Red square (🟥) with "S" label
- **Profitable Exit:** Green checkmark (✅)
- **Loss Exit:** Red X mark (❌)

### **Chart Configuration**
```typescript
// ApexCharts candlestick colors
colors: {
  upward: '#22c55e',   // Green for bullish candles
  downward: '#ef4444'  // Red for bearish candles
}

// Grid styling
grid: {
  borderColor: '#e0e0e0',
  strokeDashArray: 3
}
```

---

## 🚨 **COMMON PITFALLS TO AVOID**

1. **❌ Using Mock Data:** Always use real Kraken API data
2. **❌ Wrong Date Format:** Use ISO timestamps for trade times
3. **❌ Missing chartData:** Chart won't render without this
4. **❌ Incorrect Trade Structure:** Follow exact interface format
5. **❌ No Error Handling:** API calls can fail, handle gracefully
6. **❌ Wrong Timeframe:** Stick to 15-minute intervals
7. **❌ Missing Performance Metrics:** Calculate all required metrics

---

## 📚 **REFERENCE FILES**

### **Working Implementation Files:**
- `sydney-agents/mister-frontend/src/app/api/backtest/fibonacci/route.ts`
- `sydney-agents/mister-frontend/src/components/backtesting/ApexTradingChart.tsx`
- `sydney-agents/mister-frontend/src/components/backtesting/ImprovedBacktestResults.tsx`
- `sydney-agents/mister-frontend/src/app/backtest-results/page.tsx`

### **Test URL:**
- http://localhost:3000/backtest-results

**🎯 FINAL NOTE:** This guide provides the EXACT blueprint used for the working Fibonacci strategy. Copy this pattern precisely for guaranteed success with any new trading strategy implementation.
