# ✅ Trading Strategy Implementation Checklist

## 🚀 **QUICK IMPLEMENTATION GUIDE**

Use this checklist to implement any new trading strategy following the proven Fibonacci pattern.

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Phase 1: API Endpoint Creation**
- [ ] Create `/app/api/backtest/[strategy-name]/route.ts`
- [ ] Implement `POST` handler with proper error handling
- [ ] Add `getHistoricalADAData()` function (copy from Fibonacci)
- [ ] Implement `runStrategyBacktest()` function
- [ ] Test API endpoint with Postman/curl

### **Phase 2: Strategy Logic**
- [ ] Define strategy-specific parameters (lookback periods, thresholds, etc.)
- [ ] Implement entry signal detection logic
- [ ] Implement exit signal detection logic
- [ ] Add stop-loss and take-profit logic
- [ ] Calculate position sizing ($50k standard)

### **Phase 3: Data Structure Compliance**
- [ ] Return `totalNetPnl` (number)
- [ ] Return `winRate` (percentage)
- [ ] Return `maxDrawdown` (percentage)
- [ ] Return `sharpeRatio` (number)
- [ ] Return `totalTrades` (number)
- [ ] Return `trades` array with correct interface
- [ ] Return `chartData` array (CRITICAL for chart rendering)
- [ ] Return `performance` object with detailed metrics

### **Phase 4: Frontend Integration**
- [ ] Add strategy to `StrategySelector` component
- [ ] Add strategy handling in `handleRunBacktest()` function
- [ ] Test strategy selection UI
- [ ] Verify "Run Backtest" button functionality

### **Phase 5: Chart Verification**
- [ ] Verify candlestick chart renders
- [ ] Verify entry signals show as L/S markers
- [ ] Verify exit signals show as ✓/✗ markers
- [ ] Verify trade statistics display correctly
- [ ] Test chart zoom and pan functionality

### **Phase 6: Testing & Validation**
- [ ] Test with real Kraken data (not mock)
- [ ] Verify 30-day backtest period works
- [ ] Check all performance metrics calculate correctly
- [ ] Test error handling (API failures, no data, etc.)
- [ ] Verify mobile responsiveness

---

## 🔧 **REQUIRED CODE TEMPLATES**

### **API Route Template**
```typescript
// /app/api/backtest/[strategy]/route.ts
export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, symbol = 'ADAUSD' } = await request.json();
    const historicalData = await getHistoricalADAData(startDate, endDate);
    const backtestResults = await runYourStrategyBacktest(historicalData, startDate, endDate);
    
    return NextResponse.json({
      success: true,
      strategy: 'Your Strategy Name',
      symbol, timeframe: '15m', startDate, endDate,
      ...backtestResults
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

### **Trade Object Template**
```typescript
const trade = {
  id: `trade_${trades.length + 1}`,
  side: 'LONG', // or 'SHORT'
  entryTime: currentCandle.time,
  entryPrice: currentPrice,
  exitTime: exitCandle.time,
  exitPrice: exitPrice,
  size: 50000 / currentPrice,
  netPnl: calculatePnL(position, exitPrice),
  reason: 'Your entry/exit reason',
  duration: calculateDuration(entryTime, exitTime)
};
```

### **Frontend Integration Template**
```typescript
// In handleRunBacktest() function
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

## 🎯 **CRITICAL SUCCESS FACTORS**

### **Data Requirements**
- ✅ Use Kraken API for real ADA/USD data
- ✅ 15-minute timeframe consistency
- ✅ ISO timestamp format for all dates
- ✅ Include both `chartData` and `trades` in response

### **Performance Metrics**
- ✅ Win rate as percentage (0-100)
- ✅ P&L in USD dollars
- ✅ Sharpe ratio calculation
- ✅ Max drawdown as percentage

### **Chart Integration**
- ✅ Entry signals: L (green circle), S (red square)
- ✅ Exit signals: ✓ (green), ✗ (red)
- ✅ Proper timestamp alignment
- ✅ Price level accuracy

---

## 🚨 **TESTING VERIFICATION**

### **Manual Testing Steps**
1. Navigate to http://localhost:3000/backtest-results
2. Select your new strategy
3. Click "Run Backtest"
4. Verify loading state shows
5. Check results display correctly
6. Click "Chart Analysis" tab
7. Verify chart renders with signals
8. Check trade statistics accuracy

### **API Testing**
```bash
curl -X POST http://localhost:3000/api/backtest/your-strategy \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2024-06-01T00:00:00Z","endDate":"2024-07-01T00:00:00Z","symbol":"ADAUSD"}'
```

---

## 📊 **PERFORMANCE BENCHMARKS**

### **Fibonacci Strategy Benchmarks**
- **Win Rate:** ~60-70%
- **Total Trades:** 50-100 per month
- **Avg Duration:** 1-3 hours
- **Max Drawdown:** <20%
- **Profit Factor:** >1.0

### **Your Strategy Should Achieve**
- [ ] Win rate >50%
- [ ] Reasonable trade frequency
- [ ] Controlled drawdown
- [ ] Positive profit factor
- [ ] Consistent performance

---

## 🔄 **DEPLOYMENT CHECKLIST**

### **Pre-Deployment**
- [ ] All tests pass
- [ ] Chart renders correctly
- [ ] Real data integration works
- [ ] Error handling implemented
- [ ] Mobile responsive

### **Post-Deployment**
- [ ] Strategy appears in selector
- [ ] Backtest runs successfully
- [ ] Results display correctly
- [ ] Chart signals accurate
- [ ] Performance metrics valid

---

## 📚 **REFERENCE IMPLEMENTATION**

**Working Example:** Fibonacci Retracement Strategy
- **File:** `sydney-agents/mister-frontend/src/app/api/backtest/fibonacci/route.ts`
- **Test URL:** http://localhost:3000/backtest-results
- **Status:** ✅ Fully functional with real data and chart visualization

**🎯 Follow this checklist exactly to replicate the Fibonacci strategy's success with any new trading strategy.**
