import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { MACDHistogramStrategy, MACDHistogramConfig } from '../backtesting/strategies/macd-histogram-strategy.js';
import { dataManager } from '../backtesting/data-manager.js';
import { backtestingKnowledgeStore } from '../backtesting/knowledge-store.js';

/**
 * MACD Histogram Backtesting Tool
 * 
 * Executes backtests using the MACD Histogram momentum strategy.
 * This strategy trades on MACD histogram zero-line crossovers with slope confirmation.
 */

const macdHistogramBacktestSchema = z.object({
  symbol: z.string().describe('Stock symbol to backtest (e.g., SPY, QQQ)'),
  startDate: z.string().describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().describe('End date in YYYY-MM-DD format'),
  initialCapital: z.number().default(10000).describe('Initial capital for backtesting'),

  // MACD Parameters
  fastPeriod: z.number().default(12).describe('MACD fast period'),
  slowPeriod: z.number().default(26).describe('MACD slow period'),
  signalPeriod: z.number().default(9).describe('MACD signal period'),

  // Strategy Parameters
  minHistogramChange: z.number().default(0.01).describe('Minimum histogram change to trigger signal'),
  slopeConfirmation: z.boolean().default(true).describe('Require histogram slope confirmation'),
  maxPositionMinutes: z.number().default(120).describe('Maximum time to hold position (minutes)'),

  // Trend Filter
  useTrendFilter: z.boolean().default(true).describe('Use EMA-9 trend filter'),
  trendFilterPeriod: z.number().default(9).describe('EMA period for trend filter'),

  // Risk Management
  stopLossATRMultiple: z.number().default(2.0).describe('Stop loss as multiple of ATR'),
  takeProfitATRMultiple: z.number().default(3.0).describe('Take profit as multiple of ATR'),
  maxPositionSize: z.number().default(100).describe('Maximum position size (100 contracts for SPY/QQQ)'),

  // Profit Taking
  usePartialProfits: z.boolean().default(true).describe('Enable partial profit taking'),
  firstProfitTarget: z.number().default(1.5).describe('First profit target as ATR multiple'),
  secondProfitTarget: z.number().default(2.5).describe('Second profit target as ATR multiple'),
  trailingStopATR: z.number().default(1.0).describe('Trailing stop as ATR multiple'),

  // Market Hours
  marketOpen: z.string().default("09:30").describe('Market open time (HH:MM)'),
  marketClose: z.string().default("16:00").describe('Market close time (HH:MM)')
});

export const macdHistogramBacktest = createTool({
  id: 'macd-histogram-backtest',
  description: 'Execute enhanced MACD Histogram momentum strategy backtest with EMA trend filter, partial profit-taking, trailing stops, and 100 contract position sizing for SPY/QQQ trading',
  inputSchema: macdHistogramBacktestSchema,
  
  execute: async (context) => {
    try {
      console.log(`🚀 MACD Histogram tool starting...`);

      // Extract input from context
      const input = context.context || context;
      console.log(`🔍 Input symbol:`, input.symbol);
      console.log(`🔍 Input startDate:`, input.startDate);
      console.log(`🔍 Input endDate:`, input.endDate);

      const {
        symbol,
        startDate,
        endDate,
        initialCapital = 10000,
        ...strategyConfig
      } = input;

      console.log(`🚀 Starting MACD Histogram backtest for ${symbol}...`);
      console.log(`📅 Period: ${startDate} to ${endDate}`);
      console.log(`💰 Initial Capital: $${initialCapital.toLocaleString()}`);
      console.log(`📊 Strategy: MACD Histogram Momentum (5min intervals)`);

      // Initialize components
      const strategy = new MACDHistogramStrategy(strategyConfig as Partial<MACDHistogramConfig>);

      // Parse dates with validation
      console.log(`📅 Parsing dates: startDate="${startDate}", endDate="${endDate}"`);

      if (!startDate || !endDate) {
        throw new Error(`Invalid dates provided: startDate="${startDate}", endDate="${endDate}"`);
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error(`Invalid date format: startDate="${startDate}" -> ${start}, endDate="${endDate}" -> ${end}`);
      }

      console.log(`✅ Parsed dates: start=${start.toISOString()}, end=${end.toISOString()}`);
      
      // Generate month range for data fetching
      const startMonth = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      const endMonth = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;

      console.log(`📊 Fetching price data for ${symbol}...`);
      
      // Fetch price data
      const priceDataResult = await dataManager.fetchHistoricalData({
        symbol,
        startDate: start,
        endDate: end,
        interval: '5min'
      });

      if (!priceDataResult.success) {
        throw new Error(`Failed to fetch price data: ${priceDataResult.errors?.join(', ') || 'Unknown error'}`);
      }

      const priceData = priceDataResult.data;

      if (priceData.length === 0) {
        throw new Error(`No price data found for ${symbol} in the specified period`);
      }

      console.log(`✅ Fetched ${priceData.length} price data points`);
      console.log(`📅 Price data range: ${priceData[0].timestamp.toISOString().split('T')[0]} to ${priceData[priceData.length - 1].timestamp.toISOString().split('T')[0]}`);

      // Calculate MACD data from price data
      console.log(`📊 Calculating MACD data for ${symbol}...`);
      try {
        strategy.calculateMACDData(priceData);
        console.log(`✅ MACD calculation completed`);
      } catch (error) {
        console.error(`❌ MACD calculation failed:`, error);
        throw new Error(`MACD calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const macdData = strategy.getMACDData();
      if (macdData.length === 0) {
        throw new Error(`No MACD data calculated for ${symbol} in the specified period`);
      }

      console.log(`✅ Calculated ${macdData.length} MACD data points`);
      console.log(`📅 MACD data range: ${macdData[0].timestamp.toISOString().split('T')[0]} to ${macdData[macdData.length - 1].timestamp.toISOString().split('T')[0]}`);

      // Execute strategy
      console.log(`🎯 Executing MACD Histogram strategy...`);
      let trades;
      try {
        trades = await strategy.executeStrategy(symbol, priceData, start, end);
        console.log(`✅ Strategy execution completed with ${trades.length} trades`);
      } catch (error) {
        console.error(`❌ Strategy execution failed:`, error);
        throw new Error(`Strategy execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      if (trades.length === 0) {
        return {
          success: true,
          message: `No trades generated for ${symbol} using MACD Histogram strategy in the specified period`,
          summary: {
            symbol,
            period: `${startDate} to ${endDate}`,
            strategy: 'MACD Histogram Momentum',
            totalTrades: 0,
            priceDataPoints: priceData.length,
            macdDataPoints: macdData.length,
            config: strategy.getConfig()
          }
        };
      }

      // Calculate performance metrics
      const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      const totalPnLPips = trades.reduce((sum, trade) => sum + (trade.pnlPips || 0), 0);
      const winningTrades = trades.filter(trade => (trade.pnl || 0) > 0);
      const losingTrades = trades.filter(trade => (trade.pnl || 0) < 0);
      
      const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
      const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / winningTrades.length : 0;
      const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / losingTrades.length : 0;
      const profitFactor = Math.abs(avgLoss) > 0 ? Math.abs(avgWin / avgLoss) : 0;
      
      const finalCapital = initialCapital + totalPnL;
      const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100;
      
      // Calculate max drawdown
      let peak = initialCapital;
      let maxDrawdown = 0;
      let runningCapital = initialCapital;
      
      for (const trade of trades) {
        runningCapital += (trade.pnl || 0);
        if (runningCapital > peak) {
          peak = runningCapital;
        }
        const drawdown = ((peak - runningCapital) / peak) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      // Calculate Sharpe ratio (simplified)
      const avgDailyReturn = totalReturn / Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const sharpeRatio = avgDailyReturn / Math.max(0.1, Math.sqrt(maxDrawdown));

      // Store results in knowledge store
      const backtestResult = {
        id: `macd-histogram-${symbol}-${Date.now()}`,
        timestamp: new Date(),
        strategyName: 'MACD Histogram Momentum',
        symbol,
        startDate: start,
        endDate: end,
        period: `${startDate} to ${endDate}`,
        config: strategy.getConfig(),
        performance: {
          totalTrades: trades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
          winRate: winRate,
          totalPnL: totalPnL,
          totalPnLPips: totalPnLPips,
          totalReturn: totalReturn,
          maxDrawdown: maxDrawdown,
          sharpeRatio: sharpeRatio,
          profitFactor: profitFactor,
          avgWin: avgWin,
          avgLoss: avgLoss,
          initialCapital: initialCapital,
          finalCapital: finalCapital
        },
        trades: trades.slice(0, 10), // Store first 10 trades as examples
        dataQuality: {
          priceDataPoints: priceData.length,
          macdDataPoints: macdData.length,
          dataRange: `${priceData[0].timestamp.toISOString().split('T')[0]} to ${priceData[priceData.length - 1].timestamp.toISOString().split('T')[0]}`
        }
      };

      await backtestingKnowledgeStore.storeBacktestResult(backtestResult);

      console.log(`✅ Backtest complete! Stored results in knowledge store.`);

      // Format detailed results
      const tradeDetails = trades.slice(0, 5).map(trade => ({
        time: trade.entryTime.toISOString().replace('T', ' ').slice(0, 16),
        side: trade.side.toUpperCase(),
        entry: trade.entryPrice.toFixed(2),
        exit: trade.exitPrice?.toFixed(2) || 'N/A',
        pnl: `$${(trade.pnl || 0).toFixed(2)}`,
        pips: `${(trade.pnlPips || 0).toFixed(1)} pips`,
        histogram: trade.histogramAtEntry.toFixed(4),
        slope: trade.histogramSlope.toFixed(4),
        reason: trade.reason
      }));

      return {
        success: true,
        message: `MACD Histogram backtest completed successfully for ${symbol}`,
        summary: {
          strategy: 'MACD Histogram Momentum Strategy',
          symbol: symbol,
          period: `${startDate} to ${endDate}`,
          dataQuality: `${priceData.length} price points, ${macdData.length} MACD points`,
          
          performance: {
            totalTrades: trades.length,
            winRate: `${winRate.toFixed(1)}%`,
            totalPnL: `$${totalPnL.toFixed(2)}`,
            totalPnLPips: `${totalPnLPips.toFixed(1)} pips`,
            totalReturn: `${totalReturn.toFixed(2)}%`,
            maxDrawdown: `${maxDrawdown.toFixed(2)}%`,
            sharpeRatio: sharpeRatio.toFixed(2),
            profitFactor: profitFactor.toFixed(2),
            avgWin: `$${avgWin.toFixed(2)}`,
            avgLoss: `$${avgLoss.toFixed(2)}`,
            finalCapital: `$${finalCapital.toLocaleString()}`
          },
          
          config: {
            fastPeriod: input.fastPeriod,
            slowPeriod: input.slowPeriod,
            signalPeriod: input.signalPeriod,
            minHistogramChange: input.minHistogramChange,
            slopeConfirmation: input.slopeConfirmation,
            maxPositionMinutes: input.maxPositionMinutes,
            marketHours: `${input.marketOpen} - ${input.marketClose}`
          },
          
          sampleTrades: tradeDetails,
          
          optimization: trades.length > 0 ? {
            suggestion: totalReturn < 0 
              ? "Consider adjusting minHistogramChange or disabling slopeConfirmation for more signals"
              : "Strategy showing positive results. Consider testing on different time periods.",
            nextSteps: [
              "Test with different MACD parameters (fast/slow periods)",
              "Experiment with different market hours",
              "Try varying the minimum histogram change threshold",
              "Test on different symbols (QQQ, IWM, etc.)"
            ]
          } : undefined
        }
      };

    } catch (error) {
      console.error('❌ MACD Histogram backtest failed:', error);

      // Try to get symbol from input for error message
      const input = context?.context || context || {};
      const symbol = input.symbol || 'unknown symbol';

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: `Failed to execute MACD Histogram backtest for ${symbol}`
      };
    }
  }
});
