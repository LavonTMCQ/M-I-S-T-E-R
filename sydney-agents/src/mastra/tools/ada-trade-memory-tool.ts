import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * ADA Trade Memory Tool
 * Stores and retrieves ADA trading results in the agent's memory system
 * Maintains persistent records for strategy optimization and performance tracking
 */
export const adaTradeMemoryTool = createTool({
  id: "ada-trade-memory",
  description: "Store and retrieve ADA trading results in memory for performance tracking and strategy optimization",
  inputSchema: z.object({
    action: z.enum(['store', 'retrieve', 'analyze', 'clear']).describe("Memory action to perform"),
    tradeData: z.object({
      timestamp: z.string().optional(),
      symbol: z.string().optional(),
      type: z.enum(['LONG', 'SHORT']).optional(),
      entryPrice: z.number().optional(),
      exitPrice: z.number().optional(),
      quantity: z.number().optional(),
      leverage: z.number().optional(),
      profit: z.number().optional(),
      profitPercent: z.number().optional(),
      holdingPeriod: z.number().optional(),
      strategy: z.string().optional(),
      timeframes: z.array(z.string()).optional(),
      confidence: z.number().optional(),
      isWinning: z.boolean().optional(),
      exitReason: z.string().optional(),
    }).optional().describe("Trade data to store"),
    filters: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      strategy: z.string().optional(),
      minProfit: z.number().optional(),
      maxProfit: z.number().optional(),
      isWinning: z.boolean().optional(),
    }).optional().describe("Filters for retrieving trades"),
    limit: z.number().optional().describe("Maximum number of trades to retrieve"),
  }),
  execute: async ({ context }) => {
    const { action, tradeData, filters, limit = 100 } = context;

    try {
      console.log(`💾 ADA Trade Memory: ${action.toUpperCase()}`);

      switch (action) {
        case 'store':
          return await storeTrade(tradeData);
        
        case 'retrieve':
          return await retrieveTrades(filters, limit);
        
        case 'analyze':
          return await analyzePerformance(filters);
        
        case 'clear':
          return await clearTradeHistory();
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }

    } catch (error) {
      console.error('❌ ADA Trade Memory error:', error);
      return {
        success: false,
        error: `ADA Trade Memory failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
});

// In-memory storage for trades (in production, this would use the agent's memory system)
const tradeStorage: any[] = [];

async function storeTrade(tradeData: any) {
  if (!tradeData) {
    throw new Error('Trade data is required for storing');
  }

  const trade = {
    id: generateTradeId(),
    timestamp: tradeData.timestamp || new Date().toISOString(),
    symbol: tradeData.symbol || 'ADAUSD',
    type: tradeData.type,
    entryPrice: tradeData.entryPrice,
    exitPrice: tradeData.exitPrice,
    quantity: tradeData.quantity,
    leverage: tradeData.leverage || 10,
    profit: tradeData.profit,
    profitPercent: tradeData.profitPercent,
    holdingPeriod: tradeData.holdingPeriod,
    strategy: tradeData.strategy || 'multi-timeframe-ada',
    timeframes: tradeData.timeframes || ['15m', '1h', '1d'],
    confidence: tradeData.confidence,
    isWinning: tradeData.isWinning,
    exitReason: tradeData.exitReason,
    storedAt: new Date().toISOString()
  };

  tradeStorage.push(trade);

  console.log(`📝 Stored ADA trade: ${trade.type} ${trade.symbol} | P&L: $${trade.profit?.toFixed(2) || 'N/A'}`);

  return {
    success: true,
    message: "Trade stored successfully",
    tradeId: trade.id,
    totalTrades: tradeStorage.length
  };
}

async function retrieveTrades(filters: any = {}, limit: number) {
  let filteredTrades = [...tradeStorage];

  // Apply filters
  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    filteredTrades = filteredTrades.filter(trade => 
      new Date(trade.timestamp) >= startDate
    );
  }

  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    filteredTrades = filteredTrades.filter(trade => 
      new Date(trade.timestamp) <= endDate
    );
  }

  if (filters.strategy) {
    filteredTrades = filteredTrades.filter(trade => 
      trade.strategy === filters.strategy
    );
  }

  if (filters.minProfit !== undefined) {
    filteredTrades = filteredTrades.filter(trade => 
      (trade.profit || 0) >= filters.minProfit
    );
  }

  if (filters.maxProfit !== undefined) {
    filteredTrades = filteredTrades.filter(trade => 
      (trade.profit || 0) <= filters.maxProfit
    );
  }

  if (filters.isWinning !== undefined) {
    filteredTrades = filteredTrades.filter(trade => 
      trade.isWinning === filters.isWinning
    );
  }

  // Sort by timestamp (newest first) and limit
  const sortedTrades = filteredTrades
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  console.log(`📊 Retrieved ${sortedTrades.length} ADA trades (${filteredTrades.length} total after filters)`);

  return {
    success: true,
    trades: sortedTrades,
    totalMatching: filteredTrades.length,
    totalStored: tradeStorage.length,
    filters: filters
  };
}

async function analyzePerformance(filters: any = {}) {
  const { trades } = await retrieveTrades(filters, 10000); // Get all matching trades

  if (trades.length === 0) {
    return {
      success: true,
      message: "No trades found for analysis",
      analysis: null
    };
  }

  const winningTrades = trades.filter((trade: any) => trade.isWinning);
  const losingTrades = trades.filter((trade: any) => !trade.isWinning);
  
  const totalProfit = trades.reduce((sum: number, trade: any) => sum + (trade.profit || 0), 0);
  const totalProfitPercent = trades.reduce((sum: number, trade: any) => sum + (trade.profitPercent || 0), 0);
  
  const winningProfit = winningTrades.reduce((sum: number, trade: any) => sum + (trade.profit || 0), 0);
  const losingProfit = Math.abs(losingTrades.reduce((sum: number, trade: any) => sum + (trade.profit || 0), 0));
  
  const avgHoldingPeriod = trades.reduce((sum: number, trade: any) => sum + (trade.holdingPeriod || 0), 0) / trades.length;
  
  const analysis = {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    hitRate: (winningTrades.length / trades.length * 100).toFixed(2),
    totalProfit: totalProfit.toFixed(2),
    totalProfitPercent: totalProfitPercent.toFixed(2),
    avgProfitPerTrade: (totalProfit / trades.length).toFixed(2),
    profitFactor: losingProfit > 0 ? (winningProfit / losingProfit).toFixed(2) : 'N/A',
    avgWin: winningTrades.length > 0 ? (winningProfit / winningTrades.length).toFixed(2) : '0.00',
    avgLoss: losingTrades.length > 0 ? (losingProfit / losingTrades.length).toFixed(2) : '0.00',
    avgHoldingPeriod: avgHoldingPeriod.toFixed(2),
    bestTrade: trades.reduce((best: any, trade: any) => 
      (trade.profit || 0) > (best?.profit || -Infinity) ? trade : best, null),
    worstTrade: trades.reduce((worst: any, trade: any) => 
      (trade.profit || 0) < (worst?.profit || Infinity) ? trade : worst, null),
    timeRange: {
      start: trades[trades.length - 1]?.timestamp,
      end: trades[0]?.timestamp
    },
    strategies: [...new Set(trades.map((trade: any) => trade.strategy))],
    symbols: [...new Set(trades.map((trade: any) => trade.symbol))]
  };

  console.log(`📈 ADA Performance Analysis:`);
  console.log(`   Hit Rate: ${analysis.hitRate}%`);
  console.log(`   Total Profit: $${analysis.totalProfit}`);
  console.log(`   Profit Factor: ${analysis.profitFactor}`);
  console.log(`   Avg Holding: ${analysis.avgHoldingPeriod}h`);

  return {
    success: true,
    analysis,
    summary: `Analyzed ${analysis.totalTrades} ADA trades with ${analysis.hitRate}% hit rate and $${analysis.totalProfit} total profit`
  };
}

async function clearTradeHistory() {
  const clearedCount = tradeStorage.length;
  tradeStorage.length = 0; // Clear the array

  console.log(`🗑️ Cleared ${clearedCount} ADA trades from memory`);

  return {
    success: true,
    message: `Cleared ${clearedCount} trades from memory`,
    clearedCount
  };
}

function generateTradeId(): string {
  return `ada_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Export trade storage for external access if needed
export { tradeStorage };