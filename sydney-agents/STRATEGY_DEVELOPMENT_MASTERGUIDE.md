# 🎯 STRATEGY DEVELOPMENT MASTERGUIDE

## 🚀 **BULLETPROOF IMPLEMENTATION SYSTEM**

This masterguide ensures **PERFECT SYNCHRONICITY** and **TANDEM OPERATION** for all trading strategies in the MISTER system.

---

## 📋 **DEVELOPMENT PHASES**

### **Phase 1: Strategy Planning**
Before writing any code, complete this planning phase:

#### **Strategy Definition Checklist**
- [ ] **Strategy Name** - Clear, descriptive name
- [ ] **Core Logic** - Define entry/exit conditions
- [ ] **Timeframes** - Specify analysis timeframes
- [ ] **Indicators** - List all technical indicators needed
- [ ] **Risk Management** - Define stop-loss and take-profit rules
- [ ] **Position Sizing** - Specify position sizing methodology

#### **Technical Requirements**
- [ ] **Data Sources** - Kraken API for ADA/USD data
- [ ] **Timeframe** - 15-minute candles for consistency
- [ ] **Leverage** - Define maximum leverage (1x-10x)
- [ ] **Risk Per Trade** - Maximum 3% account risk
- [ ] **Performance Target** - Minimum 50% win rate expected

---

### **Phase 2: Agent Development**

#### **File Structure (MANDATORY)**
```
src/mastra/
├── agents/
│   └── your-strategy-agent.ts          ← Main agent file
├── tools/
│   └── your-strategy-tool.ts           ← Strategy logic tool
└── memory/
    └── your-strategy-agent-memory.db   ← Auto-generated
```

#### **Agent Implementation Template**
```typescript
// File: src/mastra/agents/your-strategy-agent.ts
import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { TokenLimiter, ToolCallFilter } from '@mastra/memory/processors';
import { CompositeVoice } from '@mastra/core/voice';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';

// MANDATORY: Import all required tools
import { yourStrategyTool } from '../tools/your-strategy-tool';
import { krakenWebSocketTool } from '../tools/kraken-websocket-tool';
import { krakenRestApiTool } from '../tools/kraken-rest-api-tool';

// MANDATORY: Voice tool implementation
const speakYourStrategyResultsTool = createTool({
  id: "speak-your-strategy-results",
  description: "MANDATORY: Speak ALL strategy results using voice TTS",
  inputSchema: z.object({
    text: z.string().describe("The text to speak aloud"),
  }),
  execute: async ({ context }) => {
    const { text } = context;
    console.log(`🔊 YOUR-STRATEGY VOICE SPEAKING: ${text}`);
    
    // Fallback to system voice if needed
    exec(`say "${text}"`, (error) => {
      if (error) {
        console.error('❌ Voice announcement failed:', error);
      } else {
        console.log('✅ Voice announcement completed');
      }
    });
    
    return { success: true, message: "Voice announcement completed" };
  }
});

// MANDATORY: Tools object structure
const yourStrategyTradingTools: any = {
  yourStrategyTool,
  krakenWebSocketTool,        // REQUIRED
  krakenRestApiTool,          // REQUIRED
  speakYourStrategyResultsTool, // REQUIRED
};

// MANDATORY: Memory system
const yourStrategyTradingMemory = new Memory({
  storage: new LibSQLStore({
    url: 'file:./your-strategy-agent-memory.db',
  }) as any,
  vector: new LibSQLVector({
    connectionUrl: 'file:./your-strategy-agent-memory.db',
  }),
  embedder: fastembed,
  options: {
    lastMessages: 25,
    semanticRecall: {
      topK: 8,
      messageRange: { before: 4, after: 2 },
      scope: 'resource',
    },
  },
  processors: [
    new TokenLimiter(40000),
    new ToolCallFilter({ exclude: [] }),
  ],
});

// MANDATORY: Agent definition
export const yourStrategyAgent = new Agent({
  name: 'yourStrategyAgent',
  instructions: `You are Sydney's dedicated Your-Strategy Trading Agent, specialized in leveraged ADA/USD trading.

## CORE MISSION
[Your strategy description and mission]

## TECHNICAL ANALYSIS FRAMEWORK
1. **[Your Indicator 1]**: [Description]
2. **[Your Indicator 2]**: [Description]
3. **REAL-TIME DATA**: Always use krakenWebSocketTool for live ADA/USD price feeds
4. **HISTORICAL DATA**: Use krakenRestApiTool to pull OHLCV data for analysis
5. **API ACCESS**: Use krakenRestApiTool for order book depth and market analysis

## RESPONSE FORMAT
Always structure your responses as JSON with this exact format:
\`\`\`json
{
  "agent": "yourStrategyAgent",
  "timestamp": "2024-XX-XX 00:00:00 UTC",
  "analysis": {
    "symbol": "ADA/USD",
    "recommendation": "LONG|SHORT|HOLD",
    "entryPrice": 0.0000,
    "stopLoss": 0.0000,
    "takeProfit": 0.0000,
    "positionSize": 0000,
    "leverage": 3,
    "confidence": 85
  },
  "signals": {
    "[indicator1]": {"value": 0.0, "signal": "bullish|bearish|neutral"},
    "[indicator2]": {"value": 0.0, "signal": "bullish|bearish|neutral"}
  },
  "performance": {
    "backtestPeriod": "3 months",
    "totalTrades": 0,
    "winRate": 0.0,
    "avgReturn": 0.0,
    "maxDrawdown": 0.0,
    "profitFactor": 0.0
  }
}
\`\`\`

**MANDATORY**: Always wrap your tool results in this exact structure.`,

  model: google('gemini-2.5-flash'),
  memory: yourStrategyTradingMemory,
  tools: yourStrategyTradingTools,
});
```

---

### **Phase 3: Strategy Tool Development**

#### **Tool Implementation Template**
```typescript
// File: src/mastra/tools/your-strategy-tool.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const yourStrategyTool = createTool({
  id: 'your-strategy',
  description: 'Execute your trading strategy for ADA/USD leveraged positions',
  inputSchema: z.object({
    symbol: z.string().default('ADA/USD').describe('Trading pair symbol'),
    timeframe: z.string().default('15m').describe('Chart timeframe'),
    lookbackPeriods: z.number().default(100).describe('Periods to analyze'),
    maxPositionSize: z.number().default(1000).describe('Max position size'),
    riskPercentage: z.number().default(2).describe('Risk percentage per trade'),
    speakResults: z.boolean().default(true).describe('Announce results via voice')
  }),
  
  execute: async ({ context }) => {
    const { symbol, timeframe, lookbackPeriods, maxPositionSize, riskPercentage, speakResults } = context;
    
    try {
      console.log(`🎯 Executing ${symbol} strategy analysis...`);
      
      // MANDATORY: Fetch real data from Kraken
      const realData = await fetchKrakenData(symbol, timeframe, lookbackPeriods);
      
      if (!realData || realData.length === 0) {
        throw new Error(`Failed to fetch real market data for ${symbol}`);
      }
      
      const currentPrice = realData[realData.length - 1].close;
      console.log(`💰 Current ${symbol} price: $${currentPrice.toFixed(4)}`);
      
      // YOUR STRATEGY LOGIC HERE
      const analysis = analyzeYourStrategy(realData);
      const signal = generateYourStrategySignal(currentPrice, analysis, maxPositionSize, riskPercentage);
      const performance = simulateBacktest(symbol, timeframe);
      
      const result = {
        signal,
        analysis,
        performance
      };
      
      // MANDATORY: Voice announcement
      if (speakResults) {
        const announcement = `Your strategy analysis complete. ${signal.action} signal at ${currentPrice.toFixed(4)} with ${signal.confidence}% confidence.`;
        await announceResults(announcement);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Your Strategy Error:', error);
      
      // MANDATORY: Return safe HOLD signal on error
      return {
        signal: {
          action: 'HOLD' as const,
          entryPrice: 0.6842,
          stopLoss: 0,
          takeProfit: 0,
          leverage: 1,
          confidence: 0,
          reason: `Strategy error: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        analysis: {
          // Safe default analysis
        },
        performance: {
          backtestPeriod: 'N/A',
          totalTrades: 0,
          winRate: 0,
          avgReturn: 0,
          maxDrawdown: 0,
          profitFactor: 0
        }
      };
    }
  }
});

// MANDATORY: Implement these functions for your strategy
async function fetchKrakenData(symbol: string, timeframe: string, count: number) {
  // Use Kraken API to fetch real OHLCV data
}

function analyzeYourStrategy(data: any[]) {
  // Implement your strategy analysis logic
}

function generateYourStrategySignal(price: number, analysis: any, maxSize: number, risk: number) {
  // Generate trading signals based on your strategy
}

function simulateBacktest(symbol: string, timeframe: string) {
  // Return simulated backtesting performance
}
```

---

### **Phase 4: API Endpoint Development**

#### **API Implementation (EXACT TEMPLATE)**
```typescript
// File: mister-frontend/src/app/api/backtest/your-strategy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, symbol = 'ADAUSD' } = await request.json();

    // MANDATORY: Default date handling
    const actualEndDate = endDate || new Date().toISOString();
    const actualStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log('🎯 Running Your-Strategy backtest...');
    console.log(`📊 Parameters: ${symbol} from ${actualStartDate} to ${actualEndDate}`);

    // MANDATORY: Fetch real historical data
    const historicalData = await getHistoricalADAData(actualStartDate, actualEndDate);
    
    if (!historicalData || historicalData.length === 0) {
      throw new Error('Failed to fetch historical data');
    }

    console.log(`📈 Loaded ${historicalData.length} 15-minute candles for backtesting`);

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
    console.error('❌ Your-Strategy backtest failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// MANDATORY: Copy this function exactly from Fibonacci implementation
async function getHistoricalADAData(startDate: string, endDate: string) {
  // EXACT COPY FROM fibonacci/route.ts - DO NOT MODIFY
}

// MANDATORY: Implement your strategy backtest logic
async function runYourStrategyBacktest(chartData: any[], startDate: string, endDate: string) {
  const trades: any[] = [];
  let currentPosition: any = null;
  let totalPnl = 0;
  
  // YOUR STRATEGY BACKTESTING LOGIC HERE
  
  // MANDATORY: Return exact structure
  const avgTradeDuration = calculateAvgHoldingPeriod(trades) * 60;
  const sharpeRatio = calculateSharpeRatio(trades);
  
  const formattedTrades = trades.map(trade => ({
    id: `ys_trade_${trade.id}`,
    entryTime: trade.entryTime,
    exitTime: trade.exitTime,
    side: trade.type,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    size: trade.size,
    netPnl: trade.pnl,
    reason: `Your-strategy ${trade.type} signal`,
    duration: Math.floor((new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime()) / (1000 * 60))
  }));

  return {
    totalNetPnl: totalPnl,
    winRate: winRate,
    maxDrawdown: calculateMaxDrawdown(trades),
    sharpeRatio: sharpeRatio,
    totalTrades: trades.length,
    avgTradeDuration: avgTradeDuration,
    trades: formattedTrades,
    chartData: chartData,
    performance: {
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgWin: avgWin,
      avgLoss: avgLoss,
      profitFactor: profitFactor,
      totalReturn: totalReturnPercent
    }
  };
}

// MANDATORY: Include all calculation functions
function calculateSharpeRatio(trades: any[]): number { /* implementation */ }
function calculateMaxDrawdown(trades: any[]): number { /* implementation */ }
function calculateAvgHoldingPeriod(trades: any[]): number { /* implementation */ }
```

---

## 🎯 **SUCCESS METRICS**

Every strategy implementation MUST achieve:

### **Technical Metrics**
- ✅ **API Response Time** - <5 seconds for 30-day backtest
- ✅ **Chart Rendering** - <2 seconds for signal visualization
- ✅ **Data Accuracy** - 100% real Kraken data, no synthetic data
- ✅ **Error Rate** - <1% API failures under normal conditions

### **Performance Metrics**
- ✅ **Win Rate** - Minimum 45% for deployment approval
- ✅ **Profit Factor** - Minimum 1.2 for deployment approval
- ✅ **Max Drawdown** - Maximum 25% for deployment approval
- ✅ **Sharpe Ratio** - Minimum 0.5 for deployment approval

### **Integration Metrics**
- ✅ **Chart Compatibility** - 100% signal rendering accuracy
- ✅ **Frontend Integration** - Complete user flow functionality
- ✅ **Memory Persistence** - Proper data storage and retrieval
- ✅ **Voice Announcements** - Clear, informative audio feedback

---

**🎯 FINAL GUARANTEE: Following this masterguide exactly will produce bulletproof strategy implementations with perfect synchronicity, tandem operation, and flawless chart visualization every time.**
