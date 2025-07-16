# 🔢 Fibonacci Strategy - Code Reference

## 📁 **EXACT FILE STRUCTURE**

```
sydney-agents/mister-frontend/src/
├── app/
│   ├── api/backtest/fibonacci/route.ts          ← Backend API endpoint
│   └── backtest-results/page.tsx               ← Main backtesting page
├── components/backtesting/
│   ├── ImprovedBacktestResults.tsx             ← Results display
│   ├── ApexTradingChart.tsx                    ← Chart with signals
│   └── StrategySelector.tsx                    ← Strategy selection
└── hooks/
    └── useStrategyStats.ts                     ← Strategy data hook
```

---

## 🔧 **KEY CODE SNIPPETS**

### **1. API Endpoint Structure**
**File:** `app/api/backtest/fibonacci/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, symbol = 'ADAUSD' } = await request.json();
    
    // Get real historical data from Kraken
    const historicalData = await getHistoricalADAData(startDate, endDate);
    
    // Run the Fibonacci strategy simulation
    const backtestResults = await runFibonacciBacktest(historicalData, startDate, endDate);

    return NextResponse.json({
      success: true,
      strategy: 'Fibonacci Retracement Strategy',
      symbol,
      timeframe: '15m',
      startDate,
      endDate,
      ...backtestResults
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
```

### **2. Kraken Data Fetching**
```typescript
async function getHistoricalADAData(startDate: string, endDate: string) {
  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  
  const response = await fetch(
    `https://api.kraken.com/0/public/OHLC?pair=ADAUSD&interval=15&since=${startTimestamp}`
  );
  
  const data = await response.json();
  const ohlcData = data.result.ADAUSD;
  
  // Convert to our format
  const chartData = ohlcData
    .map((candle: any[]) => ({
      timestamp: candle[0] * 1000,
      time: new Date(candle[0] * 1000).toISOString(),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[6])
    }))
    .filter((candle: any) => {
      const candleTime = new Date(candle.time).getTime();
      return candleTime >= new Date(startDate).getTime() && 
             candleTime <= new Date(endDate).getTime();
    });
  
  return chartData;
}
```

### **3. Fibonacci Strategy Logic**
```typescript
async function runFibonacciBacktest(chartData: any[], startDate: string, endDate: string) {
  const trades: any[] = [];
  let currentPosition: any = null;
  let totalPnl = 0;
  
  // Fibonacci calculation parameters
  const lookbackPeriod = 50;
  const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
  
  for (let i = lookbackPeriod; i < chartData.length - 1; i++) {
    const currentCandle = chartData[i];
    const currentPrice = currentCandle.close;
    
    // Find swing high and low in lookback period
    const lookbackData = chartData.slice(i - lookbackPeriod, i);
    const swingHigh = Math.max(...lookbackData.map(c => c.high));
    const swingLow = Math.min(...lookbackData.map(c => c.low));
    
    // Calculate Fibonacci levels
    const range = swingHigh - swingLow;
    const fibPrices = fibLevels.map(ratio => swingHigh - (range * ratio));
    
    // Trading logic
    if (!currentPosition) {
      // LONG signal: Price bounces from 61.8% or 50% support
      const fib618 = fibPrices[4]; // 61.8%
      const fib50 = fibPrices[3];  // 50%
      
      if (currentPrice <= fib618 * 1.005 && currentPrice >= fib618 * 0.995) {
        currentPosition = {
          id: `fib_trade_${trades.length + 1}`,
          side: 'LONG',
          entryTime: currentCandle.time,
          entryPrice: currentPrice,
          size: 50000 / currentPrice, // $50k position
          reason: 'Bounce from 61.8% Fibonacci support'
        };
      }
      
      // SHORT signal: Price rejects from 23.6% resistance
      const fib236 = fibPrices[1]; // 23.6%
      if (currentPrice >= fib236 * 0.995 && currentPrice <= fib236 * 1.005) {
        currentPosition = {
          id: `fib_trade_${trades.length + 1}`,
          side: 'SHORT',
          entryTime: currentCandle.time,
          entryPrice: currentPrice,
          size: 50000 / currentPrice,
          reason: 'Rejection at 23.6% Fibonacci resistance'
        };
      }
    } else {
      // Exit logic
      let shouldExit = false;
      let exitReason = '';
      
      if (currentPosition.side === 'LONG') {
        const fib236 = fibPrices[1];
        const stopLoss = currentPosition.entryPrice * 0.97; // 3% stop loss
        
        if (currentPrice >= fib236 * 0.995) {
          shouldExit = true;
          exitReason = 'Take profit at 23.6% Fibonacci resistance';
        } else if (currentPrice <= stopLoss) {
          shouldExit = true;
          exitReason = 'Stop loss triggered';
        }
      }
      
      if (shouldExit) {
        const pnl = currentPosition.side === 'LONG' 
          ? (currentPrice - currentPosition.entryPrice) * currentPosition.size
          : (currentPosition.entryPrice - currentPrice) * currentPosition.size;
        
        trades.push({
          ...currentPosition,
          exitTime: currentCandle.time,
          exitPrice: currentPrice,
          netPnl: pnl,
          duration: Math.floor((new Date(currentCandle.time).getTime() - 
                               new Date(currentPosition.entryTime).getTime()) / (1000 * 60))
        });
        
        totalPnl += pnl;
        currentPosition = null;
      }
    }
  }
  
  // Calculate performance metrics
  const completedTrades = trades.filter(t => t.exitTime);
  const winningTrades = completedTrades.filter(t => t.netPnl > 0);
  const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0;
  
  return {
    totalNetPnl: totalPnl,
    winRate: winRate,
    maxDrawdown: calculateMaxDrawdown(trades),
    sharpeRatio: calculateSharpeRatio(trades),
    totalTrades: trades.length,
    trades: trades,
    chartData: chartData, // CRITICAL for chart rendering
    performance: {
      winningTrades: winningTrades.length,
      losingTrades: completedTrades.length - winningTrades.length,
      avgWin: winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.netPnl, 0) / winningTrades.length : 0,
      avgLoss: (completedTrades.length - winningTrades.length) > 0 ? 
        completedTrades.filter(t => t.netPnl <= 0).reduce((sum, t) => sum + Math.abs(t.netPnl), 0) / 
        (completedTrades.length - winningTrades.length) : 0,
      profitFactor: calculateProfitFactor(trades),
      totalReturn: (totalPnl / 50000) * 100
    }
  };
}
```

### **4. Frontend Integration**
**File:** `app/backtest-results/page.tsx`

```typescript
const handleRunBacktest = async () => {
  if (!selectedStrategy) return;
  setIsRunningBacktest(true);

  try {
    if (selectedStrategy.id === 'fibonacci-retracement') {
      // Use REAL-TIME dates like Fibonacci agent
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch('/api/backtest/fibonacci', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, symbol: 'ADAUSD' })
      });

      if (response.ok) {
        const realResults = await response.json();
        setBacktestResults(realResults);
      }
    }
  } catch (error) {
    console.error('❌ Backtest error:', error);
  }
  
  setIsRunningBacktest(false);
};
```

### **5. Chart Signal Rendering**
**File:** `components/backtesting/ApexTradingChart.tsx`

```typescript
// Format trade annotations
const annotations = useMemo(() => {
  if (!trades || trades.length === 0) return { points: [] };
  
  const points: any[] = [];
  
  trades.forEach((trade) => {
    // Entry point
    points.push({
      x: new Date(trade.entryTime).getTime(),
      y: trade.entryPrice,
      marker: {
        size: 8,
        fillColor: trade.side === 'LONG' ? '#22c55e' : '#ef4444',
        strokeColor: '#ffffff',
        strokeWidth: 2,
        shape: trade.side === 'LONG' ? 'circle' : 'square'
      },
      label: {
        text: `${trade.side.charAt(0)}`,
        style: {
          color: '#ffffff',
          background: trade.side === 'LONG' ? '#22c55e' : '#ef4444',
          fontSize: '10px',
          fontWeight: 'bold'
        }
      }
    });

    // Exit point (if trade is closed)
    if (trade.exitTime && trade.exitPrice) {
      const isProfitable = trade.netPnl >= 0;
      points.push({
        x: new Date(trade.exitTime).getTime(),
        y: trade.exitPrice,
        marker: {
          size: 6,
          fillColor: isProfitable ? '#22c55e' : '#ef4444',
          strokeColor: '#ffffff',
          strokeWidth: 1,
          shape: 'circle'
        },
        label: {
          text: isProfitable ? '✓' : '✗',
          style: {
            color: '#ffffff',
            background: isProfitable ? '#22c55e' : '#ef4444',
            fontSize: '8px'
          }
        }
      });
    }
  });

  return { points };
}, [trades]);
```

---

## 🎯 **CRITICAL DATA STRUCTURES**

### **Trade Interface**
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

### **Chart Data Interface**
```typescript
interface CandleData {
  timestamp: number;        // Unix timestamp in milliseconds
  time: string;            // ISO timestamp string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

---

## 🚀 **TESTING COMMANDS**

### **API Test**
```bash
curl -X POST http://localhost:3000/api/backtest/fibonacci \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2024-06-01T00:00:00Z","endDate":"2024-07-01T00:00:00Z","symbol":"ADAUSD"}'
```

### **Frontend Test**
1. Navigate to: http://localhost:3000/backtest-results
2. Select "Fibonacci Retracement Strategy"
3. Click "Run Backtest"
4. Verify chart renders with L/S and ✓/✗ signals

---

**🎯 This reference contains the EXACT working code from the Fibonacci strategy. Copy these patterns precisely for guaranteed success.**
