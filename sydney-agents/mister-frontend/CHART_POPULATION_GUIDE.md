# 📊 Chart Population Guide - PRESERVE THIS FUNCTIONALITY

## 🎯 Overview
This document explains how the backtesting charts get populated with data. **NEVER DELETE OR MODIFY** this core functionality when tweaking algorithms for better hit rates.

## 🔄 Data Flow Architecture

### 1. **Strategy Selection Trigger**
```typescript
// Location: /src/app/backtest-results/page.tsx
const handleStrategySelect = async (strategy: TradingStrategy) => {
  setSelectedStrategy(strategy);
  setBacktestResults(null);
  
  // Auto-run backtest when strategy is selected
  if (strategy.status !== 'coming-soon') {
    await runBacktestForStrategy(strategy);
  }
};
```

### 2. **Backtest Execution**
```typescript
// Location: /src/app/backtest-results/page.tsx
const runBacktestForStrategy = async (strategy: TradingStrategy) => {
  setIsRunningBacktest(true);
  
  if (strategy.id === 'ada_custom_algorithm') {
    // CRITICAL: Real API call to ADA algorithm
    await runRealADACustomAlgorithmBacktest(strategy);
  } else {
    // Sample data for other strategies
    await runSampleBacktest(strategy);
  }
  
  setIsRunningBacktest(false);
};
```

### 3. **Real ADA Algorithm Integration** ⚠️ **CRITICAL - DO NOT MODIFY**
```typescript
// Location: /src/app/backtest-results/page.tsx
const runRealADACustomAlgorithmBacktest = async (strategy: TradingStrategy) => {
  try {
    console.log('📊 Running real ADA Custom Algorithm backtest...');
    
    // API call to Railway backend
    const response = await fetch('https://bridge-server-cjs-production.up.railway.app/api/backtest/ada-custom-algorithm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategy: 'ADA Custom Algorithm',
        timeframe: '15m',
        symbol: 'ADAUSD'
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const realResults = await response.json();
    
    // CRITICAL: Data transformation for chart compatibility
    const transformedResults = {
      // ... transformation logic
    };
    
    setBacktestResults(transformedResults);
    
  } catch (error) {
    console.warn('⚠️ ADA Custom Algorithm backtest failed, using sample data');
    // Fallback to sample data
  }
};
```

## 📈 Chart Component Integration

### 4. **ApexTradingChart Data Processing** ⚠️ **PRESERVE THIS**
```typescript
// Location: /src/components/backtesting/ApexTradingChart.tsx

// Trade annotations with enhanced visualization
const annotations = useMemo(() => {
  if (!trades || trades.length === 0) {
    return { points: [], shapes: [] };
  }

  const points: any[] = [];
  const shapes: any[] = [];
  
  trades.forEach((trade, index) => {
    // CRITICAL: Handle both Railway API format and existing format
    const entryTime = trade.entry_timestamp || trade.entryTime;
    const exitTime = trade.exit_timestamp || trade.exitTime;
    const entryPrice = trade.entry_price || trade.entryPrice;
    const exitPrice = trade.exit_price || trade.exitPrice;
    const tradeSide = trade.type === 'long' ? 'LONG' : (trade.type === 'short' ? 'SHORT' : trade.side);
    
    // Entry point with LONG/SHORT labels
    points.push({
      x: new Date(entryTime).getTime(),
      y: entryPrice,
      label: { text: `${index + 1}${tradeSide.charAt(0)}` }
      // ... marker configuration
    });
    
    // Exit point and connecting line
    if (exitTime && exitPrice) {
      // ... exit point and line creation
    }
  });
  
  return { points, shapes };
}, [trades]);
```

## 🔧 Data Format Requirements

### 5. **Expected Trade Data Structure**
```typescript
interface TradeData {
  // Railway API format (preferred)
  entry_timestamp?: string;
  exit_timestamp?: string;
  entry_price?: number;
  exit_price?: number;
  type?: 'long' | 'short';
  pnl?: number;
  
  // Legacy format (fallback)
  entryTime?: string;
  exitTime?: string;
  entryPrice?: number;
  exitPrice?: number;
  side?: 'LONG' | 'SHORT';
  netPnl?: number;
}
```

### 6. **Chart Data Structure**
```typescript
interface ChartData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
}
```

## ⚠️ **CRITICAL PRESERVATION RULES**

### DO NOT MODIFY:
1. **API endpoint**: `https://bridge-server-cjs-production.up.railway.app/api/backtest/ada-custom-algorithm`
2. **Data transformation logic** in `runRealADACustomAlgorithmBacktest`
3. **Trade annotation creation** in `ApexTradingChart.tsx`
4. **Dual format handling** (Railway API + legacy format)
5. **Chart component props** and data flow

### SAFE TO MODIFY:
1. **Algorithm parameters** sent to the API
2. **Visual styling** of chart elements
3. **Performance calculations** and display
4. **Additional chart features** (as long as core data flow is preserved)

## 🚀 Future Algorithm Improvements

When tweaking algorithms for better hit rates:

1. **Keep the same API endpoint structure**
2. **Maintain the same response format**
3. **Preserve the data transformation logic**
4. **Test with existing chart components**
5. **Ensure backward compatibility**

## 📋 Testing Checklist

Before deploying algorithm changes:
- [ ] Charts still populate with real data
- [ ] Trade markers show correctly (numbered with L/S)
- [ ] Connecting lines appear between entry/exit
- [ ] Performance stats calculate properly
- [ ] Fallback to sample data works if API fails
- [ ] Chart interactions (zoom/pan) still work

---
**🔒 This functionality is CRITICAL for the user experience. Always preserve the chart population method!**
