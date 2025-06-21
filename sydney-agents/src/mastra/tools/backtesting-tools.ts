import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Import backtesting system components
import { BacktestingEngine } from '../backtesting/backtesting-engine.js';
import { dataManager } from '../backtesting/data-manager.js';
import { backtestingKnowledgeStore } from '../backtesting/knowledge-store.js';
import { StrategyUtils, AVAILABLE_STRATEGIES } from '../backtesting/strategies/index.js';
import { US_MARKET_HOURS } from '../backtesting/data-structures.js';

/**
 * Backtesting Tools for Mastra
 * 
 * These tools provide comprehensive backtesting capabilities including:
 * - Running backtests with real Alpha Vantage data
 * - Managing strategies and parameters
 * - Data management and quality assurance
 */

// Run Backtest Tool
export const runBacktestTool = createTool({
  id: "runBacktest",
  description: "Execute a comprehensive backtest for a specific strategy and symbol with detailed performance analysis",
  inputSchema: z.object({
    strategyName: z.string().describe("Name of the strategy to test"),
    symbol: z.string().describe("Stock symbol to backtest"),
    startDate: z.string().describe("Start date for backtest (YYYY-MM-DD)"),
    endDate: z.string().describe("End date for backtest (YYYY-MM-DD)"),
    initialCapital: z.number().default(100000).describe("Initial capital for backtest"),
    parameters: z.record(z.any()).optional().describe("Custom strategy parameters"),
    speakResults: z.boolean().default(true).describe("Speak the results summary"),
    saveResults: z.boolean().default(true).describe("Save results to knowledge store")
  }),
  execute: async ({ context }) => {
    const { 
      strategyName, 
      symbol, 
      startDate, 
      endDate, 
      initialCapital, 
      parameters = {}, 
      speakResults, 
      saveResults 
    } = context;

    try {
      console.log(`🚀 Starting backtest: ${strategyName} on ${symbol} from ${startDate} to ${endDate}`);

      // 1. Create strategy instance
      const strategy = parameters && Object.keys(parameters).length > 0
        ? StrategyUtils.createStrategyWithParameters(strategyName, parameters)
        : StrategyUtils.getStrategy(strategyName);

      if (!strategy) {
        throw new Error(`Strategy '${strategyName}' not found`);
      }

      // 2. Fetch historical data
      const dataResult = await dataManager.fetchHistoricalData({
        symbol,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        interval: '5min',
        validateData: true,
        fillGaps: true,
        extendedHours: false
      });

      if (!dataResult.success || dataResult.data.length === 0) {
        throw new Error(`Failed to fetch data for ${symbol}: ${dataResult.errors?.join(', ')}`);
      }

      console.log(`📊 Fetched ${dataResult.dataPoints} data points for ${symbol}`);

      // 3. Configure and run backtest
      const backtestConfig = {
        strategy,
        symbol,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        initialCapital,
        commission: 1.0, // $1 per trade
        slippage: 0.001, // 0.1% slippage
        marketHours: US_MARKET_HOURS,
        allowExtendedHours: false,
        maxPositionSize: 0.1, // 10% max position size
        riskPerTrade: 0.02, // 2% risk per trade
        data: dataResult.data,
        enableLogging: true,
        saveResults,
        validateTrades: true
      };

      const engine = new BacktestingEngine();
      const results = await engine.runBacktest(backtestConfig);

      // 4. Generate summary
      const summary = generateBacktestSummary(results);

      return {
        success: true,
        results,
        summary,
        dataPoints: dataResult.dataPoints,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Backtest execution failed:', error);
      return {
        success: false,
        error: `Backtest failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
});

// Strategy Management Tool
export const manageStrategiesTool = createTool({
  id: "manageStrategies",
  description: "List available strategies, get strategy details, or find profitable strategies from previous backtests",
  inputSchema: z.object({
    action: z.enum(['list', 'details', 'profitable', 'similar']).describe("Action to perform"),
    strategyName: z.string().optional().describe("Strategy name for details action"),
    minHitRate: z.number().optional().default(60).describe("Minimum hit rate for profitable strategies"),
    minProfitFactor: z.number().optional().default(1.5).describe("Minimum profit factor for profitable strategies"),
    query: z.string().optional().describe("Search query for similar strategies")
  }),
  execute: async ({ context }) => {
    const { action, strategyName, minHitRate, minProfitFactor, query } = context;

    try {
      switch (action) {
        case 'list':
          const availableStrategies = StrategyUtils.getAvailableStrategies();
          const strategiesWithMetadata = availableStrategies.map(name => {
            const metadata = StrategyUtils.getStrategyMetadata(name);
            return {
              name,
              description: metadata?.description || 'No description available',
              category: metadata?.category || 'unknown',
              difficulty: metadata?.difficulty || 'unknown'
            };
          });

          return {
            success: true,
            strategies: strategiesWithMetadata,
            count: availableStrategies.length
          };

        case 'details':
          if (!strategyName) {
            throw new Error('Strategy name is required for details action');
          }

          const strategy = StrategyUtils.getStrategy(strategyName);
          if (!strategy) {
            throw new Error(`Strategy '${strategyName}' not found`);
          }

          const metadata = StrategyUtils.getStrategyMetadata(strategyName);
          const validation = strategy.validateParameters();

          return {
            success: true,
            strategy: {
              name: strategy.name,
              description: strategy.description,
              category: strategy.category,
              parameters: strategy.parameters,
              requiredHistory: strategy.requiredHistory,
              requiredIndicators: strategy.getRequiredIndicators(),
              metadata,
              validation
            }
          };

        case 'profitable':
          const profitableResults = await backtestingKnowledgeStore.findProfitableStrategies(
            minHitRate!, 
            minProfitFactor!
          );

          return {
            success: true,
            strategies: profitableResults.map(result => ({
              name: result.strategyName,
              symbol: result.symbol,
              hitRate: result.performance.hitRate,
              profitFactor: result.performance.profitFactor,
              totalPL: result.performance.totalPL,
              maxDrawdown: result.performance.maxDrawdown,
              totalTrades: result.performance.totalTrades,
              parameters: result.parameters,
              endDate: result.endDate
            })),
            count: profitableResults.length
          };

        case 'similar':
          if (!query) {
            throw new Error('Query is required for similar strategies search');
          }

          const similarStrategies = await backtestingKnowledgeStore.findSimilarStrategies(query);

          return {
            success: true,
            strategies: similarStrategies.map(strategy => ({
              name: strategy.name,
              description: strategy.description,
              category: strategy.category,
              performance: strategy.performance,
              tags: strategy.tags
            })),
            count: similarStrategies.length
          };

        default:
          throw new Error(`Unknown action: ${action}`);
      }

    } catch (error) {
      console.error('❌ Strategy management failed:', error);
      return {
        success: false,
        error: `Strategy management failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
});

// Data Management Tool
export const manageDataTool = createTool({
  id: "manageData",
  description: "Check data availability, fetch new data, or get data statistics for backtesting",
  inputSchema: z.object({
    action: z.enum(['summary', 'fetch', 'stats', 'cleanup']).describe("Action to perform"),
    symbol: z.string().optional().describe("Stock symbol for data operations"),
    startDate: z.string().optional().describe("Start date for data fetch (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date for data fetch (YYYY-MM-DD)"),
    interval: z.enum(['1min', '5min', '15min', '30min', '60min']).optional().default('5min').describe("Data interval"),
    forceRefresh: z.boolean().optional().default(false).describe("Force refresh data from API")
  }),
  execute: async ({ context }) => {
    const { action, symbol, startDate, endDate, interval, forceRefresh } = context;

    try {
      switch (action) {
        case 'summary':
          if (!symbol) {
            throw new Error('Symbol is required for data summary');
          }

          const summary = await dataManager.getDataSummary(symbol, interval!);
          return {
            success: true,
            summary: {
              symbol,
              interval,
              available: summary.available,
              dataPoints: summary.dataPoints,
              dateRange: summary.dateRange,
              gaps: summary.gaps,
              lastUpdated: summary.lastUpdated
            }
          };

        case 'fetch':
          if (!symbol || !startDate || !endDate) {
            throw new Error('Symbol, start date, and end date are required for data fetch');
          }

          const fetchResult = await dataManager.fetchHistoricalData({
            symbol,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            interval: interval!,
            forceRefresh,
            validateData: true,
            fillGaps: true
          });

          return {
            success: fetchResult.success,
            result: {
              symbol,
              interval,
              dataPoints: fetchResult.dataPoints,
              source: fetchResult.source,
              dateRange: fetchResult.dateRange,
              gaps: fetchResult.gaps,
              errors: fetchResult.errors
            }
          };

        case 'stats':
          const storageStats = await dataManager.getStorageStats();
          return {
            success: true,
            stats: storageStats
          };

        case 'cleanup':
          await dataManager.cleanupOldData(30); // Clean data older than 30 days
          return {
            success: true,
            message: 'Cleaned up data older than 30 days'
          };

        default:
          throw new Error(`Unknown action: ${action}`);
      }

    } catch (error) {
      console.error('❌ Data management failed:', error);
      return {
        success: false,
        error: `Data management failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
});

// Helper functions
function generateBacktestSummary(results: any): string {
  const perf = results.performance;
  return `Backtest Summary for ${results.strategyName} on ${results.symbol}:
📈 Total P/L: ${perf.totalPL >= 0 ? '+' : ''}$${perf.totalPL.toFixed(2)}
🎯 Hit Rate: ${perf.hitRate.toFixed(1)}% (${perf.winningTrades}/${perf.totalTrades} trades)
💰 Profit Factor: ${perf.profitFactor.toFixed(2)}
📉 Max Drawdown: ${perf.maxDrawdown.toFixed(2)}%
📊 Sharpe Ratio: ${perf.sharpeRatio.toFixed(2)}
💵 Average Win: $${perf.averageWin.toFixed(2)}
💸 Average Loss: $${perf.averageLoss.toFixed(2)}
🏆 Largest Win: $${perf.largestWin.toFixed(2)}
📉 Largest Loss: $${perf.largestLoss.toFixed(2)}
📅 Period: ${results.startDate.toDateString()} to ${results.endDate.toDateString()}`;
}
