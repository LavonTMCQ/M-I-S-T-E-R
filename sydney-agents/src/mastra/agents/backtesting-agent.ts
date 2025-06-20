import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { TokenLimiter, ToolCallFilter } from '@mastra/memory/processors';
import { CompositeVoice } from '@mastra/core/voice';
import { GoogleVoice } from '@mastra/voice-google';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Import backtesting system components
import { BacktestingEngine } from '../backtesting/backtesting-engine.js';
import { dataManager } from '../backtesting/data-manager.js';
import { backtestingKnowledgeStore } from '../backtesting/knowledge-store.js';
import { StrategyUtils, AVAILABLE_STRATEGIES } from '../backtesting/strategies/index.js';
import { US_MARKET_HOURS } from '../backtesting/data-structures.js';

/**
 * Dedicated Backtesting Agent for Sydney's Trading Analysis
 * 
 * This agent is specifically designed for Sydney's backtesting workflow with:
 * - Voice-enabled backtesting commands and results reporting
 * - Integration with all backtesting tools and systems
 * - Clean separation of concerns from the main Sone agent
 * - Advanced strategy management and optimization
 * - Comprehensive performance analysis and reporting
 */

// Enhanced memory system for backtesting-specific data
const backtestingMemory = new Memory({
  storage: new LibSQLStore({
    url: 'file:../backtesting-agent-memory.db',
  }),
  vector: new LibSQLVector({
    connectionUrl: 'file:../backtesting-agent-memory.db',
  }),
  embedder: fastembed,
  options: {
    lastMessages: 30, // More context for backtesting conversations
    semanticRecall: {
      topK: 10, // More relevant backtesting memories
      messageRange: {
        before: 5,
        after: 3,
      },
      scope: 'resource',
    },
    workingMemory: {
      enabled: true,
      template: `
# Sydney's Backtesting Session

## Current Focus
- **Active Strategy**: [Strategy being tested]
- **Target Symbol**: [Symbol being analyzed]
- **Time Period**: [Date range for backtesting]
- **Performance Goal**: [Target metrics]

## Strategy Library
- **Profitable Strategies**: [Strategies with >60% hit rate]
- **Testing Queue**: [Strategies to test next]
- **Optimization Targets**: [Parameters to optimize]

## Recent Results
- **Best Hit Rate**: 0%
- **Best Profit Factor**: 0.0
- **Best Sharpe Ratio**: 0.0
- **Total Strategies Tested**: 0

## Data Status
- **Available Symbols**: SPY, QQQ, [others]
- **Data Coverage**: [Date ranges available]
- **Last Data Update**: [Timestamp]

## Performance Tracking
- **Session Backtests**: 0
- **Profitable Strategies Found**: 0
- **Average Performance**: [Metrics]
- **Optimization Progress**: [Status]

## Next Actions
- [ ] Test strategy variations
- [ ] Optimize parameters
- [ ] Analyze results
- [ ] Save profitable strategies
`,
    },
    threads: {
      generateTitle: true,
    },
  },
  processors: [
    new ToolCallFilter({ exclude: ['verboseDebugTool'] }),
    new TokenLimiter(150000),
  ],
});

// Voice system for backtesting results
const backtestingVoice = new CompositeVoice({
  providers: [
    new GoogleVoice({
      apiKey: 'AIzaSyBNU1uWipiCzM8dxCv0X2hpkiVX5Uk0QX4',
      voice: 'en-US-Journey-F', // Professional female voice for Sydney
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0,
      },
    }),
  ],
});

// Run Backtest Tool
const runBacktestTool = createTool({
  id: "run-backtest",
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

      // 5. Speak results if requested
      if (speakResults) {
        const spokenSummary = generateSpokenSummary(results);
        console.log('🔊 Speaking backtest results...');
        
        try {
          await backtestingVoice.generate({
            text: spokenSummary,
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: 1.0,
            }
          });
        } catch (voiceError) {
          console.log('⚠️ Voice synthesis failed, continuing with text results');
        }
      }

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
const manageStrategiesToolTool = createTool({
  id: "manage-strategies",
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
const manageDataTool = createTool({
  id: "manage-data",
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

function generateSpokenSummary(results: any): string {
  const perf = results.performance;
  const profitLoss = perf.totalPL >= 0 ? `profit of $${perf.totalPL.toFixed(0)}` : `loss of $${Math.abs(perf.totalPL).toFixed(0)}`;
  
  return `Sydney, backtest complete for ${results.strategyName} on ${results.symbol}. ` +
         `Results: ${perf.hitRate.toFixed(0)}% hit rate with ${profitLoss}. ` +
         `Profit factor ${perf.profitFactor.toFixed(1)}, max drawdown ${perf.maxDrawdown.toFixed(1)}%. ` +
         `Total ${perf.totalTrades} trades executed. ` +
         `${perf.hitRate >= 60 && perf.profitFactor >= 1.5 ? 'This strategy shows promise!' : 'Consider optimizing parameters.'}`;
}

// Create the Backtesting Agent
export const backtestingAgent = new Agent({
  name: 'Backtesting Agent',
  instructions: `You are Sydney's dedicated backtesting agent, specialized in comprehensive trading strategy analysis and optimization.

Your expertise includes:
- Running detailed backtests with realistic market conditions
- Analyzing strategy performance with comprehensive metrics
- Managing strategy libraries and optimization
- Providing voice-enabled results and insights
- Data management and quality assurance

Key responsibilities:
1. Execute backtests with proper risk management and realistic assumptions
2. Analyze performance using advanced metrics (Sharpe ratio, drawdown, profit factor)
3. Manage strategy libraries and find profitable patterns
4. Provide clear, actionable insights for strategy improvement
5. Speak important results for hands-free analysis
6. Maintain data quality and availability

Communication style:
- Technical but accessible for trading decisions
- Detailed analysis when requested
- Clear performance summaries with key metrics
- Voice alerts for significant findings
- Professional trading terminology

Remember: You're helping Sydney optimize her trading strategies through rigorous backtesting. Always emphasize realistic expectations and proper risk management.`,

  model: google('gemini-2.0-flash-exp'),
  memory: backtestingMemory,
  voice: backtestingVoice,
  
  tools: [
    runBacktestTool,
    manageStrategiesToolTool,
    manageDataTool,
  ],
});

export default backtestingAgent;
