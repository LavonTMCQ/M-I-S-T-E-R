import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Import backtesting system components
import { BacktestingEngine } from '../backtesting/backtesting-engine';
import { dataManager } from '../backtesting/data-manager';
import { backtestingKnowledgeStore } from '../backtesting/knowledge-store';
import { StrategyUtils } from '../backtesting/strategies/index';
import { US_MARKET_HOURS } from '../backtesting/data-structures';
import { macdHistogramBacktest } from './macd-histogram-backtest';

/**
 * Backtesting Tools for Mastra (v2)
 *
 * These tools provide comprehensive backtesting capabilities including:
 * - Running backtests with real Alpha Vantage data
 * - Managing strategies and parameters
 * - Data management and quality assurance
 */

// Run Backtest Tool
export const runBacktestTool = createTool({
  id: "run_backtest",
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
      speakResults: _speakResults,
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

      // 2. Fetch historical data - use 1min for SPY/QQQ for better granularity
      const interval = (symbol === 'SPY' || symbol === 'QQQ') ? '1min' : '5min';
      console.log(`📊 Using ${interval} interval for ${symbol}`);

      const dataResult = await dataManager.fetchHistoricalData({
        symbol,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        interval,
        validateData: true,
        fillGaps: true,
        extendedHours: false
      });

      if (!dataResult.success || dataResult.data.length === 0) {
        const errorMessage = dataResult.errors?.length ? dataResult.errors.join(', ') : 'Unknown error';
        throw new Error(`Failed to fetch data for ${symbol}: ${errorMessage}`);
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
  id: "manage_strategies",
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
  id: "manage_data",
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
function calculatePipAnalysis(trades: any[], symbol: string): any {
  // For stocks like SPY, 1 pip = $0.01 (1 cent)
  // For forex, 1 pip = 0.0001 (except JPY pairs where 1 pip = 0.01)
  const pipValue = symbol.includes('JPY') ? 0.01 : (symbol.length === 6 ? 0.0001 : 0.01);

  const pipData = trades.map(trade => {
    if (trade.pnl !== undefined) {
      const pips = trade.pnl / pipValue;
      const entryPrice = trade.price || 0;
      const percentage = entryPrice > 0 ? (trade.pnl / entryPrice) * 100 : 0;
      return {
        ...trade,
        pips: pips,
        percentage: percentage
      };
    }
    return { ...trade, pips: 0, percentage: 0 };
  });

  const completedTrades = pipData.filter(t => t.pnl !== undefined);
  const totalPips = completedTrades.reduce((sum, t) => sum + t.pips, 0);
  const winningTrades = completedTrades.filter(t => t.pips > 0);
  const losingTrades = completedTrades.filter(t => t.pips < 0);

  const avgWinPips = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pips, 0) / winningTrades.length : 0;
  const avgLossPips = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pips, 0) / losingTrades.length) : 0;
  const largestWinPips = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pips)) : 0;
  const largestLossPips = losingTrades.length > 0 ? Math.abs(Math.min(...losingTrades.map(t => t.pips))) : 0;

  return {
    totalPips,
    avgWinPips,
    avgLossPips,
    largestWinPips,
    largestLossPips,
    pipValue,
    tradesWithPips: pipData
  };
}

function generateBacktestSummary(results: any): string {
  const perf = results.performance;
  const pipAnalysis = calculatePipAnalysis(results.trades || [], results.symbol);

  return `Backtest Summary for ${results.strategyName} on ${results.symbol}:
📈 Total P/L: ${perf.totalPL >= 0 ? '+' : ''}$${perf.totalPL.toFixed(2)} (${pipAnalysis.totalPips >= 0 ? '+' : ''}${pipAnalysis.totalPips.toFixed(1)} pips)
🎯 Hit Rate: ${perf.hitRate.toFixed(1)}% (${perf.winningTrades}/${perf.totalTrades} trades)
💰 Profit Factor: ${perf.profitFactor.toFixed(2)}
📉 Max Drawdown: ${perf.maxDrawdown.toFixed(2)}%
📊 Sharpe Ratio: ${perf.sharpeRatio.toFixed(2)}
💵 Average Win: $${perf.averageWin.toFixed(2)} (${pipAnalysis.avgWinPips.toFixed(1)} pips)
💸 Average Loss: $${perf.averageLoss.toFixed(2)} (${pipAnalysis.avgLossPips.toFixed(1)} pips)
🏆 Largest Win: $${perf.largestWin.toFixed(2)} (${pipAnalysis.largestWinPips.toFixed(1)} pips)
📉 Largest Loss: $${perf.largestLoss.toFixed(2)} (${pipAnalysis.largestLossPips.toFixed(1)} pips)
📅 Period: ${results.startDate.toDateString()} to ${results.endDate.toDateString()}`;
}

// Adaptive Strategy Learning Tool
export const adaptiveStrategyTool = createTool({
  id: "adaptive_strategy",
  description: "Analyze backtest results and automatically generate improved strategy variations based on market behavior patterns",
  inputSchema: z.object({
    originalStrategy: z.string().describe("Name of the original strategy to analyze"),
    symbol: z.string().describe("Symbol that was backtested"),
    analysisType: z.enum(['pattern_analysis', 'parameter_optimization', 'reverse_strategy', 'hybrid_approach']).describe("Type of adaptive analysis to perform"),
    minTradesRequired: z.number().optional().default(10).describe("Minimum number of trades required for analysis")
  }),
  execute: async ({ context }) => {
    const { originalStrategy, symbol, analysisType, minTradesRequired } = context;

    try {
      console.log(`🧠 Analyzing ${originalStrategy} results for adaptive learning...`);

      // Get recent backtest results for this strategy
      const recentResults = await backtestingKnowledgeStore.getStrategyResults(originalStrategy, symbol);

      if (!recentResults || recentResults.length === 0) {
        return {
          success: false,
          error: `No backtest results found for ${originalStrategy} on ${symbol}`
        };
      }

      const latestResult = recentResults[0];
      const trades = latestResult.trades || [];

      if (trades.length < minTradesRequired) {
        return {
          success: false,
          error: `Insufficient trades (${trades.length}) for analysis. Need at least ${minTradesRequired} trades.`
        };
      }

      console.log(`📊 Analyzing ${trades.length} trades for pattern recognition...`);

      let adaptiveInsights: any = {};
      let suggestedStrategies: any[] = [];

      switch (analysisType) {
        case 'pattern_analysis':
          adaptiveInsights = analyzeMarketPatterns(trades, latestResult);
          break;

        case 'parameter_optimization':
          adaptiveInsights = optimizeParameters(trades, latestResult);
          break;

        case 'reverse_strategy':
          adaptiveInsights = createReverseStrategy(trades, latestResult);
          suggestedStrategies = generateReverseStrategyVariations(latestResult);
          break;

        case 'hybrid_approach':
          adaptiveInsights = createHybridStrategy(trades, latestResult);
          suggestedStrategies = generateHybridStrategyVariations(latestResult);
          break;
      }

      return {
        success: true,
        originalStrategy,
        symbol,
        analysisType,
        insights: adaptiveInsights,
        suggestedStrategies,
        tradesAnalyzed: trades.length,
        recommendations: generateAdaptiveRecommendations(adaptiveInsights, analysisType)
      };

    } catch (error: any) {
      console.error('❌ Adaptive strategy analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
});

// Adaptive Strategy Helper Functions
function analyzeMarketPatterns(trades: any[], backtestResult: any): any {
  const completedTrades = trades.filter(t => t.pnl !== undefined);
  const pipAnalysis = calculatePipAnalysis(trades, backtestResult.symbol);

  // Analyze entry vs exit patterns
  const entryExitPattern = completedTrades.map(trade => {
    const entryPrice = trade.price || 0;
    const exitPrice = entryPrice + (trade.pnl || 0);
    const direction = trade.type === 'BUY' ? 'LONG' : 'SHORT';
    const outcome = (trade.pnl || 0) > 0 ? 'WIN' : 'LOSS';

    return {
      direction,
      outcome,
      entryPrice,
      exitPrice,
      pips: trade.pnl ? trade.pnl / pipAnalysis.pipValue : 0,
      reason: trade.reason || 'Unknown'
    };
  });

  // Pattern analysis
  const longTrades = entryExitPattern.filter(t => t.direction === 'LONG');
  const shortTrades = entryExitPattern.filter(t => t.direction === 'SHORT');
  const breakoutTrades = entryExitPattern.filter(t => t.reason.includes('breakout'));

  const patterns = {
    totalTrades: completedTrades.length,
    longTradeCount: longTrades.length,
    shortTradeCount: shortTrades.length,
    longWinRate: longTrades.length > 0 ? (longTrades.filter(t => t.outcome === 'WIN').length / longTrades.length) * 100 : 0,
    shortWinRate: shortTrades.length > 0 ? (shortTrades.filter(t => t.outcome === 'WIN').length / shortTrades.length) * 100 : 0,
    breakoutSuccessRate: breakoutTrades.length > 0 ? (breakoutTrades.filter(t => t.outcome === 'WIN').length / breakoutTrades.length) * 100 : 0,
    avgPipsPerTrade: pipAnalysis.totalPips / completedTrades.length,
    marketBehavior: determineMarketBehavior(entryExitPattern)
  };

  return {
    patterns,
    insights: generatePatternInsights(patterns),
    recommendations: generatePatternRecommendations(patterns)
  };
}

function determineMarketBehavior(trades: any[]): string {
  const breakoutTrades = trades.filter(t => t.reason.includes('breakout'));
  const reversalCount = breakoutTrades.filter(t => t.outcome === 'LOSS').length;
  const followThroughCount = breakoutTrades.filter(t => t.outcome === 'WIN').length;

  if (reversalCount > followThroughCount * 2) {
    return 'MEAN_REVERTING'; // Breakouts tend to fail and reverse
  } else if (followThroughCount > reversalCount * 2) {
    return 'TRENDING'; // Breakouts tend to follow through
  } else {
    return 'CHOPPY'; // Mixed behavior
  }
}

function generatePatternInsights(patterns: any): string[] {
  const insights = [];

  if (patterns.breakoutSuccessRate < 20) {
    insights.push(`🔄 CRITICAL INSIGHT: Breakouts are failing ${(100 - patterns.breakoutSuccessRate).toFixed(1)}% of the time - market is mean-reverting`);
  }

  if (patterns.longWinRate < 30 && patterns.longTradeCount > 5) {
    insights.push(`📉 Long trades have only ${patterns.longWinRate.toFixed(1)}% win rate - consider shorting instead`);
  }

  if (patterns.avgPipsPerTrade < -2) {
    insights.push(`💸 Average loss of ${Math.abs(patterns.avgPipsPerTrade).toFixed(1)} pips per trade - strategy needs reversal`);
  }

  if (patterns.marketBehavior === 'MEAN_REVERTING') {
    insights.push(`🎯 Market is mean-reverting - consider fade/counter-trend strategies`);
  }

  return insights;
}

function generatePatternRecommendations(patterns: any): string[] {
  const recommendations = [];

  if (patterns.marketBehavior === 'MEAN_REVERTING') {
    recommendations.push('Create a "Fade the Breakout" strategy that shorts breakouts instead of buying them');
    recommendations.push('Implement mean reversion entries at opening range extremes');
    recommendations.push('Use tighter profit targets and wider stops for counter-trend trades');
  }

  if (patterns.breakoutSuccessRate < 30) {
    recommendations.push('Reverse the entry logic: sell when price breaks above range, buy when it breaks below');
    recommendations.push('Add volume divergence filter to identify false breakouts');
    recommendations.push('Consider using opening range as resistance/support for reversal trades');
  }

  return recommendations;
}

function createReverseStrategy(trades: any[], backtestResult: any): any {
  const patterns = analyzeMarketPatterns(trades, backtestResult).patterns;

  // If breakouts are failing, create a fade strategy
  if (patterns.breakoutSuccessRate < 30) {
    return {
      strategyType: 'OPENING_RANGE_FADE',
      description: 'Fade breakouts and trade mean reversion',
      parameters: {
        rangePeriodMinutes: 30,
        fadeThreshold: 0.002, // Same as original breakout threshold
        volumeMultiplier: 1.2,
        stopLossATRMultiplier: 2.0, // Wider stops for counter-trend
        takeProfitRatio: 1.5, // Tighter targets for mean reversion
        maxPositionTime: 120, // Shorter hold time
        minRangeSize: 0.0005,
        exitBeforeClose: 30
      },
      logic: 'SHORT when price breaks ABOVE opening range high, BUY when price breaks BELOW opening range low',
      expectedImprovement: `Potential to flip ${(100 - patterns.breakoutSuccessRate).toFixed(1)}% of losing trades into winners`
    };
  }

  return {
    strategyType: 'PARAMETER_OPTIMIZED',
    description: 'Optimized version of original strategy',
    improvements: 'Adjusted parameters based on market behavior'
  };
}

function generateReverseStrategyVariations(_backtestResult: any): any[] {
  return [
    {
      name: 'Opening Range Fade',
      description: 'Counter-trend strategy that fades breakouts',
      parameters: {
        rangePeriodMinutes: 30,
        fadeThreshold: 0.002,
        volumeMultiplier: 1.2,
        stopLossATRMultiplier: 2.0,
        takeProfitRatio: 1.5,
        maxPositionTime: 120,
        minRangeSize: 0.0005,
        exitBeforeClose: 30
      }
    },
    {
      name: 'Opening Range Mean Reversion',
      description: 'Buy at range low, sell at range high',
      parameters: {
        rangePeriodMinutes: 30,
        reversionThreshold: 0.001,
        volumeMultiplier: 1.0,
        stopLossATRMultiplier: 1.5,
        takeProfitRatio: 2.0,
        maxPositionTime: 180,
        minRangeSize: 0.0005,
        exitBeforeClose: 30
      }
    }
  ];
}

function optimizeParameters(_trades: any[], backtestResult: any): any {
  // Analyze parameter effectiveness
  return {
    currentParameters: backtestResult.parameters,
    suggestions: [
      'Increase stop loss multiplier to 2.0 for better risk management',
      'Reduce position hold time to 120 minutes for faster exits',
      'Lower volume multiplier to 1.0 to capture more signals'
    ]
  };
}

function createHybridStrategy(_trades: any[], _backtestResult: any): any {
  return {
    strategyType: 'HYBRID_BREAKOUT_FADE',
    description: 'Combines breakout and fade strategies based on market conditions'
  };
}

function generateHybridStrategyVariations(_backtestResult: any): any[] {
  return [
    {
      name: 'Adaptive Opening Range',
      description: 'Switches between breakout and fade based on volatility'
    }
  ];
}

function generateAdaptiveRecommendations(_insights: any, analysisType: string): string[] {
  const recommendations = [];

  if (analysisType === 'reverse_strategy') {
    recommendations.push('🔄 Implement the reverse strategy immediately');
    recommendations.push('📊 Backtest the fade strategy on the same time period');
    recommendations.push('🎯 Compare results to validate the reversal hypothesis');
  }

  return recommendations;
}

// Export all tools including the new MACD Histogram tool
export { macdHistogramBacktest };