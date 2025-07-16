# Fibonacci 15-Minute Trading System Documentation

## 🎯 **System Overview**

The Fibonacci Trading System is a professional-grade algorithmic trading solution that combines real-time price monitoring with 15-minute timeframe analysis for high-quality trading signals.

### **Key Architecture Principles**
- **Dual Timeframe**: Monitor every 3 minutes, analyze on 15-minute charts
- **Real Market Data**: Uses Kraken API for actual OHLC and price data
- **Dynamic Fibonacci Levels**: Calculated from real swing highs/lows
- **Professional UI**: Smooth transitions and real-time updates

## 🏗️ **System Architecture**

### **Frontend Components**
```
sydney-agents/mister-frontend/src/components/trading/
├── AIThinkingTerminal.tsx     # Main analysis display component
└── TradingInterface.tsx       # Trading page integration
```

### **Backend API**
```
sydney-agents/mister-frontend/src/app/api/agents/fibonacci/
└── route.ts                   # Fibonacci analysis API endpoint
```

### **Data Flow**
1. **Real-time Price**: Kraken API → getCurrentADAPrice() → Every 3 minutes
2. **15-min OHLC**: Kraken API → get15MinOHLCData() → Every 15 minutes
3. **Swing Points**: calculateSwingPoints() → From 15-min candles
4. **Fibonacci Levels**: calculateFibonacciLevels() → Dynamic calculation
5. **UI Display**: AIThinkingTerminal → Real-time updates with transitions

## 🔧 **Core Functions**

### **1. Real-Time Price Monitoring**
```javascript
const getCurrentADAPrice = async () => {
  // Fetches live ADA/USD price from Kraken
  // Updates every 3 minutes for real-time awareness
  // Returns: { price, volume }
}
```

### **2. 15-Minute Chart Analysis**
```javascript
const get15MinOHLCData = async () => {
  // Fetches 100 15-minute candles from Kraken
  // Used for swing point detection and Fibonacci calculation
  // Returns: Array of OHLC data with timestamps
}
```

### **3. Swing Point Detection**
```javascript
const calculateSwingPoints = (ohlcData) => {
  // Identifies swing highs and lows from 15-min candles
  // Uses 2-candle confirmation on each side
  // Returns: { swingHigh, swingLow }
}
```

### **4. Dynamic Fibonacci Calculation**
```javascript
const calculateFibonacciLevels = (swingHigh, swingLow) => {
  // Calculates 7 Fibonacci retracement levels
  // Ratios: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0]
  // Returns: Array of levels with prices
}
```

## 📊 **Analysis Display System**

### **Performance Stats Header**
- **Win Rate**: 71% (from backtesting)
- **Total Trades**: 31 trades
- **Profit Factor**: 2.1
- **Average Return**: 4.8%
- **Max Drawdown**: 5.2%

### **Analysis Entries (Staggered Display)**
1. **ANALYSIS**: Current price, RSI, trend, volume (15-min timeframe)
2. **INFO**: Key Fibonacci levels with distances and support/resistance
3. **DECISION**: Trading strategy, next key level, signal status
4. **EXECUTION**: Active signals with entry/exit points (when applicable)

### **Support/Resistance Logic**
```javascript
// Correctly identifies levels based on current price
isSupport: level.price < currentPrice     // Below = Support 🟢
isResistance: level.price > currentPrice  // Above = Resistance 🔴
```

## 🎨 **UI Features**

### **Smooth Transitions**
- **Performance Cards**: Hover effects with color transitions
- **Analysis Entries**: Staggered fade-in animations
- **Real-time Updates**: Seamless content updates without jarring changes

### **Professional Styling**
- **15-minute timeframe labeling**: Clear distinction from live price
- **Live price indicators**: Shows "(live)" for real-time data
- **Color-coded levels**: Green support, red resistance
- **Responsive design**: Works on all screen sizes

## 🔄 **Update Cycles**

### **3-Minute Cycle (Price Monitoring)**
- Fetch current ADA price from Kraken
- Update live price display
- Maintain real-time awareness

### **15-Minute Cycle (Analysis Update)**
- Fetch new 15-minute OHLC data
- Recalculate swing points
- Update Fibonacci levels
- Generate new trading signals

## 🚨 **Critical Implementation Details**

### **Fixed Issues (DO NOT BREAK)**
1. **61.8% Level Visibility**: Display shows 5 levels (`slice(0, 5)`) not 4
2. **Support/Resistance Logic**: Calculated dynamically based on current price
3. **Decision Logic Consistency**: Uses real calculated levels, not hardcoded values
4. **Timeframe Separation**: 3-min monitoring vs 15-min analysis clearly labeled

### **API Integration Points**
- **Kraken Ticker**: `https://api.kraken.com/0/public/Ticker?pair=ADAUSD`
- **Kraken OHLC**: `https://api.kraken.com/0/public/OHLC?pair=ADAUSD&interval=15`
- **Update Frequency**: Respects API rate limits with proper caching

### **Error Handling**
- **Fallback Data**: Uses cached levels if API fails
- **Graceful Degradation**: System continues with last known good data
- **Console Logging**: Comprehensive logging for debugging

## 🎯 **Next Steps (Current Tasks)**
1. **Backtest Statistics**: Update to reflect actual 15-minute performance
2. **Backtesting Page**: Redesign for professional appearance
3. **Signal Visualization**: Add real-time signal display on charts
4. **Strategy Integration**: Add Fibonacci strategy to backtesting page

## ⚠️ **DO NOT MODIFY WITHOUT DOCUMENTATION**
This system represents significant development work with multiple integrated components. Any changes should be thoroughly documented and tested to prevent breaking the carefully balanced architecture.
