import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

// Import our existing agents and tools
import { quantAgent } from '../agents/quant-agent';
import { cryptoBacktestingAgent } from '../agents/crypto-backtesting-agent';
import { krakenDataTool } from '../tools/kraken-data-tool';
import { generatePineScriptTool } from '../tools/pine-script-tools';
import { parsePineScriptTool } from '../tools/pine-script-parser';

/**
 * Natural Language to ADA Backtesting Workflow
 * 
 * This workflow takes natural language trading strategy descriptions
 * and converts them into fully backtested ADA trading strategies using:
 * 
 * 1. Natural Language → Pine Script (Quant Agent)
 * 2. Pine Script → Backtesting Format (Parser Tool)
 * 3. Kraken ADA Data Fetching (Kraken Tool)
 * 4. Full ADA Backtesting (Crypto Backtesting Agent)
 * 5. Performance Analysis & Results
 */

// Step 1: Convert Natural Language to Pine Script
const naturalLanguageToPineScriptStep = createStep({
  id: 'natural-language-to-pine-script',
  description: 'Convert natural language trading strategy description into working Pine Script v6 code',
  inputSchema: z.object({
    strategyDescription: z.string().describe('Natural language description of the trading strategy'),
    timeframe: z.string().default('15m').describe('Preferred timeframe (5m, 15m, 1h, 4h, 1d)'),
    includeAlerts: z.boolean().default(true).describe('Include TradingView alerts in Pine Script'),
  }),
  outputSchema: z.object({
    pineScriptCode: z.string().describe('Generated Pine Script v6 code'),
    strategyName: z.string().describe('Extracted strategy name'),
    indicators: z.array(z.string()).describe('Technical indicators used'),
    complexity: z.string().describe('Strategy complexity level'),
    originalDescription: z.string().describe('Original natural language description'),
  }),
  execute: async ({ inputData, mastra }) => {
    const { strategyDescription, timeframe, includeAlerts } = inputData;

    console.log('🧠 Converting natural language to Pine Script...');
    console.log(`📝 Strategy: ${strategyDescription}`);

    // Use the Quant Agent to generate Pine Script
    const { text } = await quantAgent.generate([
      {
        role: 'user',
        content: `Convert this trading strategy description into working TradingView Pine Script v6 code:

STRATEGY DESCRIPTION: ${strategyDescription}

REQUIREMENTS:
- Target timeframe: ${timeframe}
- Include alerts: ${includeAlerts}
- Make it suitable for ADA/USD cryptocurrency trading
- Include proper entry/exit conditions
- Add risk management (stop loss, take profit)
- Use Pine Script v6 syntax
- Make it copy-paste ready for TradingView

Please provide:
1. Complete Pine Script code
2. Strategy name
3. List of indicators used
4. Complexity assessment (low/medium/high)`
      }
    ]);

    // Parse the response to extract components
    const pineScriptMatch = text.match(/```pinescript\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const pineScriptCode = pineScriptMatch ? pineScriptMatch[1] : text;

    // Extract strategy name (look for strategy() function)
    const strategyNameMatch = pineScriptCode.match(/strategy\s*\(\s*["']([^"']+)["']/);
    const strategyName = strategyNameMatch ? strategyNameMatch[1] : 'Custom ADA Strategy';

    // Extract indicators (common ones)
    const indicators: string[] = [];
    if (pineScriptCode.includes('ta.sma') || pineScriptCode.includes('sma(')) indicators.push('SMA');
    if (pineScriptCode.includes('ta.ema') || pineScriptCode.includes('ema(')) indicators.push('EMA');
    if (pineScriptCode.includes('ta.rsi') || pineScriptCode.includes('rsi(')) indicators.push('RSI');
    if (pineScriptCode.includes('ta.macd') || pineScriptCode.includes('macd(')) indicators.push('MACD');
    if (pineScriptCode.includes('ta.bb') || pineScriptCode.includes('bb(')) indicators.push('Bollinger Bands');

    // Assess complexity
    const complexity = indicators.length > 3 ? 'high' : indicators.length > 1 ? 'medium' : 'low';

    return {
      pineScriptCode,
      strategyName,
      indicators,
      complexity,
      originalDescription: strategyDescription,
    };
  },
});

// Step 2: Parse Pine Script for Backtesting
const parsePineScriptStep = createStep({
  id: 'parse-pine-script',
  description: 'Parse Pine Script code and convert to backtesting-compatible format',
  inputSchema: z.object({
    pineScriptCode: z.string(),
    strategyName: z.string(),
    indicators: z.array(z.string()),
    complexity: z.string(),
    originalDescription: z.string(),
  }),
  outputSchema: z.object({
    backtestingStrategy: z.any().describe('Parsed strategy in backtesting format'),
    strategyMetadata: z.object({
      name: z.string(),
      indicators: z.array(z.string()),
      entryConditions: z.array(z.string()),
      exitConditions: z.array(z.string()),
      riskManagement: z.object({
        stopLoss: z.boolean(),
        takeProfit: z.boolean(),
      }),
    }),
    pineScriptCode: z.string(),
    originalDescription: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { pineScriptCode, strategyName, indicators, originalDescription } = inputData;

    console.log('🔍 Parsing Pine Script for backtesting compatibility...');

    // Use the Pine Script parser tool
    const parseResult = await parsePineScriptTool.execute({
      context: {
        pineScriptCode,
        symbol: 'ADAUSD', // We're focusing on ADA
        timeframe: '15min',
        initialCapital: 10000,
      },
      runtimeContext: {} as any,
    });

    return {
      backtestingStrategy: parseResult.backtestingStrategy,
      strategyMetadata: parseResult.metadata,
      pineScriptCode,
      originalDescription,
    };
  },
});

// Step 3: Fetch ADA Historical Data
const fetchAdaDataStep = createStep({
  id: 'fetch-ada-data',
  description: 'Fetch historical ADA/USD data from Kraken for backtesting',
  inputSchema: z.object({
    backtestingStrategy: z.any(),
    strategyMetadata: z.any(),
    pineScriptCode: z.string(),
    originalDescription: z.string(),
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
  }),
  outputSchema: z.object({
    historicalData: z.any().describe('ADA historical OHLCV data'),
    dataStats: z.object({
      symbol: z.string(),
      timeframe: z.string(),
      candleCount: z.number(),
      dateRange: z.string(),
    }),
    backtestingStrategy: z.any(),
    strategyMetadata: z.any(),
    pineScriptCode: z.string(),
    originalDescription: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { backtestingStrategy, strategyMetadata, pineScriptCode, originalDescription, startDate, endDate } = inputData;

    console.log('📡 Fetching ADA historical data from Kraken...');

    // Default to last 30 days if no dates provided
    const actualEndDate = endDate || new Date().toISOString().split('T')[0];
    const actualStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch historical data using Kraken tool
    const dataResult = await krakenDataTool.execute({
      context: {
        action: 'historical',
        symbol: 'ADAUSD',
        timeframe: '15m',
        startDate: actualStartDate,
        endDate: actualEndDate,
        limit: 720, // Maximum allowed
      },
      runtimeContext: {} as any,
    });

    if (!dataResult.success) {
      throw new Error(`Failed to fetch ADA data: ${dataResult.error}`);
    }

    const dataStats = {
      symbol: 'ADAUSD',
      timeframe: '15m',
      candleCount: dataResult.data.length,
      dateRange: `${actualStartDate} to ${actualEndDate}`,
    };

    console.log(`✅ Fetched ${dataStats.candleCount} ADA candles for backtesting`);

    return {
      historicalData: dataResult.data,
      dataStats,
      backtestingStrategy,
      strategyMetadata,
      pineScriptCode,
      originalDescription,
    };
  },
});

// Step 4: Run ADA Backtesting
const runAdaBacktestStep = createStep({
  id: 'run-ada-backtest',
  description: 'Execute comprehensive ADA backtesting using the crypto backtesting agent',
  inputSchema: z.object({
    historicalData: z.any(),
    dataStats: z.any(),
    backtestingStrategy: z.any(),
    strategyMetadata: z.any(),
    pineScriptCode: z.string(),
    originalDescription: z.string(),
    initialCapital: z.number().default(10000).describe('Starting capital in USD'),
    riskPerTrade: z.number().default(0.02).describe('Risk per trade (2% default)'),
  }),
  outputSchema: z.object({
    backtestResults: z.object({
      totalTrades: z.number(),
      winningTrades: z.number(),
      losingTrades: z.number(),
      winRate: z.number(),
      totalReturn: z.number(),
      totalReturnPercent: z.number(),
      maxDrawdown: z.number(),
      sharpeRatio: z.number(),
      profitFactor: z.number(),
      avgWin: z.number(),
      avgLoss: z.number(),
    }),
    tradeHistory: z.array(z.any()).describe('Detailed trade history'),
    performanceMetrics: z.any(),
    chartData: z.any().describe('OHLCV data with trade markers'),
    strategyMetadata: z.any(),
    pineScriptCode: z.string(),
    originalDescription: z.string(),
  }),
  execute: async ({ inputData }) => {
    const {
      historicalData,
      dataStats,
      backtestingStrategy,
      strategyMetadata,
      pineScriptCode,
      originalDescription,
      initialCapital,
      riskPerTrade
    } = inputData;

    console.log('🚀 Running comprehensive ADA backtesting...');
    console.log(`📊 Data: ${dataStats.candleCount} candles, ${dataStats.dateRange}`);

    // Use the Crypto Backtesting Agent to run the backtest
    const { text } = await cryptoBacktestingAgent.generate([
      {
        role: 'user',
        content: `Run a comprehensive backtest for this ADA trading strategy:

ORIGINAL STRATEGY DESCRIPTION: ${originalDescription}

STRATEGY METADATA:
- Name: ${strategyMetadata.name}
- Indicators: ${strategyMetadata.indicators.join(', ')}
- Entry Conditions: ${strategyMetadata.entryConditions.join(', ')}
- Exit Conditions: ${strategyMetadata.exitConditions.join(', ')}

BACKTESTING PARAMETERS:
- Symbol: ADAUSD
- Timeframe: 15m
- Data Points: ${dataStats.candleCount} candles
- Date Range: ${dataStats.dateRange}
- Initial Capital: $${initialCapital}
- Risk Per Trade: ${(riskPerTrade * 100).toFixed(1)}%

REQUIREMENTS:
1. Use the multi-timeframe-ada-strategy tool for backtesting
2. Provide complete trade history with entry/exit points
3. Calculate comprehensive performance metrics
4. Include OHLCV chart data with trade markers
5. Analyze strategy effectiveness for ADA trading
6. Format results in the required JSON structure

Please execute the backtest and provide detailed results.`
      }
    ]);

    // Parse the agent response to extract backtest results
    // The crypto backtesting agent should return structured data
    let backtestResults;
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        backtestResults = JSON.parse(jsonMatch[0].replace(/```json\n?|\n?```/g, ''));
      } else {
        // Fallback: create basic results structure
        backtestResults = {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          totalReturn: 0,
          totalReturnPercent: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          profitFactor: 0,
          avgWin: 0,
          avgLoss: 0,
        };
      }
    } catch (error) {
      console.error('Error parsing backtest results:', error);
      // Create default results
      backtestResults = {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
      };
    }

    return {
      backtestResults,
      tradeHistory: [], // Will be populated by the agent
      performanceMetrics: {
        strategy: strategyMetadata.name,
        symbol: 'ADAUSD',
        timeframe: '15m',
        dataRange: dataStats.dateRange,
        totalCandles: dataStats.candleCount,
      },
      chartData: historicalData, // OHLCV data for charting
      strategyMetadata,
      pineScriptCode,
      originalDescription,
    };
  },
});

// Step 5: Generate Final Report
const generateReportStep = createStep({
  id: 'generate-final-report',
  description: 'Generate comprehensive backtesting report with insights and recommendations',
  inputSchema: z.object({
    backtestResults: z.any(),
    tradeHistory: z.array(z.any()),
    performanceMetrics: z.any(),
    chartData: z.any(),
    strategyMetadata: z.any(),
    pineScriptCode: z.string(),
    originalDescription: z.string(),
  }),
  outputSchema: z.object({
    report: z.object({
      summary: z.string(),
      performance: z.any(),
      insights: z.array(z.string()),
      recommendations: z.array(z.string()),
      pineScriptCode: z.string(),
      chartData: z.any(),
    }),
    success: z.boolean(),
    executionTime: z.string(),
  }),
  execute: async ({ inputData }) => {
    const {
      backtestResults,
      tradeHistory,
      performanceMetrics,
      chartData,
      strategyMetadata,
      pineScriptCode,
      originalDescription
    } = inputData;

    console.log('📊 Generating comprehensive backtesting report...');

    const winRate = backtestResults.winRate || 0;
    const totalReturn = backtestResults.totalReturnPercent || 0;
    const maxDrawdown = backtestResults.maxDrawdown || 0;
    const sharpeRatio = backtestResults.sharpeRatio || 0;

    // Generate insights based on performance
    const insights: string[] = [];
    if (winRate > 60) insights.push('✅ High win rate indicates strong signal quality');
    if (winRate < 40) insights.push('⚠️ Low win rate suggests strategy needs optimization');
    if (totalReturn > 20) insights.push('🚀 Excellent returns for the backtesting period');
    if (totalReturn < 0) insights.push('📉 Strategy shows losses - consider parameter adjustment');
    if (maxDrawdown > 20) insights.push('⚠️ High drawdown indicates significant risk');
    if (sharpeRatio > 1.5) insights.push('📈 Good risk-adjusted returns');

    // Generate recommendations
    const recommendations: string[] = [];
    if (winRate < 50) recommendations.push('Consider tightening entry conditions to improve signal quality');
    if (maxDrawdown > 15) recommendations.push('Implement stricter risk management and position sizing');
    if (backtestResults.totalTrades < 10) recommendations.push('Extend backtesting period for more statistical significance');
    recommendations.push('Test strategy on different market conditions (bull/bear/sideways)');
    recommendations.push('Consider implementing dynamic position sizing based on volatility');

    const summary = `
🎯 STRATEGY: ${strategyMetadata.name}
📝 DESCRIPTION: ${originalDescription}
📊 PERFORMANCE SUMMARY:
- Total Trades: ${backtestResults.totalTrades}
- Win Rate: ${winRate.toFixed(1)}%
- Total Return: ${totalReturn.toFixed(2)}%
- Max Drawdown: ${maxDrawdown.toFixed(2)}%
- Sharpe Ratio: ${sharpeRatio.toFixed(2)}
- Profit Factor: ${backtestResults.profitFactor?.toFixed(2) || 'N/A'}

🔧 INDICATORS USED: ${strategyMetadata.indicators.join(', ')}
⏱️ TIMEFRAME: 15-minute ADA/USD
📅 PERIOD: ${performanceMetrics.dataRange}
    `.trim();

    return {
      report: {
        summary,
        performance: backtestResults,
        insights,
        recommendations,
        pineScriptCode,
        chartData,
      },
      success: true,
      executionTime: new Date().toISOString(),
    };
  },
});

// Create the Natural Language to ADA Backtesting Workflow
export const naturalLanguageAdaBacktestingWorkflow = createWorkflow({
  id: 'natural-language-ada-backtesting',
  description: 'Convert natural language trading strategies into fully backtested ADA trading strategies with Pine Script generation, data fetching, and comprehensive performance analysis',
  inputSchema: z.object({
    strategyDescription: z.string().describe('Natural language description of the trading strategy'),
    timeframe: z.string().default('15m').describe('Preferred timeframe (5m, 15m, 1h, 4h, 1d)'),
    includeAlerts: z.boolean().default(true).describe('Include TradingView alerts in Pine Script'),
    startDate: z.string().optional().describe('Start date for backtesting (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date for backtesting (YYYY-MM-DD)'),
    initialCapital: z.number().default(10000).describe('Starting capital in USD'),
    riskPerTrade: z.number().default(0.02).describe('Risk per trade (2% default)'),
  }),
  outputSchema: z.object({
    report: z.object({
      summary: z.string().describe('Comprehensive strategy performance summary'),
      performance: z.any().describe('Detailed performance metrics'),
      insights: z.array(z.string()).describe('Key insights from backtesting'),
      recommendations: z.array(z.string()).describe('Optimization recommendations'),
      pineScriptCode: z.string().describe('Generated Pine Script code'),
      chartData: z.any().describe('OHLCV data with trade markers'),
    }),
    success: z.boolean(),
    executionTime: z.string(),
  }),
})
  .then(naturalLanguageToPineScriptStep)
  .then(parsePineScriptStep)
  .then(fetchAdaDataStep)
  .then(runAdaBacktestStep)
  .then(generateReportStep)
  .commit();

export default naturalLanguageAdaBacktestingWorkflow;
