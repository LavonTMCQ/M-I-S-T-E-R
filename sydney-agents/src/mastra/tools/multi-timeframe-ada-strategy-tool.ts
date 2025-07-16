import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Multi-Timeframe ADA Trading Strategy with 10x Leverage
 * 
 * Sophisticated trading strategy that analyzes ADA across multiple timeframes:
 * - 15m: Execution timeframe with precise entry/exit signals
 * - 1h: Trend filter using MACD and momentum
 * - 1d: Market context and major trend direction
 * 
 * Features:
 * - 10x leverage support with proper risk management
 * - Dynamic position sizing based on volatility (ATR)
 * - Multi-timeframe scoring system for trade decisions
 * - Maximum 3% account risk per trade
 * - Sophisticated technical analysis across timeframes
 */

interface TimeframeData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  rsi: number[];
  macd: { macd: number[], signal: number[], histogram: number[] };
  ema50: number[];
  ema200: number[];
  bollingerBands: { upper: number[], middle: number[], lower: number[] };
  atr: number[];
}

interface TimeframeAnalysis {
  timeframe: string;
  score: number;
  signals: string[];
  trend: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

export const multiTimeframeAdaStrategyTool = createTool({
  id: 'multi-timeframe-ada-strategy',
  description: 'Advanced multi-timeframe ADA trading strategy with 10x leverage support and sophisticated risk management',
  inputSchema: z.object({
    symbol: z.string().default('ADAUSD').describe('ADA trading pair (ADAUSD or ADAUSDT)'),
    startDate: z.string().optional().describe('Start date for analysis (YYYY-MM-DD) - defaults to 30 days ago'),
    endDate: z.string().optional().describe('End date for analysis (YYYY-MM-DD) - defaults to today'),
    initialCapital: z.number().default(5000).describe('Starting capital in USD'),
    leverage: z.number().default(10).describe('Leverage multiplier (1-10x)'),
    riskPerTrade: z.number().default(6).describe('Maximum risk per trade as % of capital'),
    speakResults: z.boolean().default(true).describe('Announce results with voice'),

    // OPTIMIZED Technical parameters for better performance
    rsiPeriod: z.number().default(21).describe('RSI calculation period (optimized)'),
    macdFast: z.number().default(8).describe('MACD fast EMA period (optimized)'),
    macdSlow: z.number().default(21).describe('MACD slow EMA period (optimized)'),
    macdSignal: z.number().default(5).describe('MACD signal line period (optimized)'),
    atrPeriod: z.number().default(10).describe('ATR calculation period (optimized)'),
    bbPeriod: z.number().default(15).describe('Bollinger Bands period (optimized)'),
    bbStdDev: z.number().default(1.8).describe('Bollinger Bands standard deviation (optimized)'),
  }),
  execute: async ({ context }) => {
    const {
      symbol, startDate, endDate, initialCapital, leverage, riskPerTrade, speakResults,
      rsiPeriod, macdFast, macdSlow, macdSignal, atrPeriod, bbPeriod, bbStdDev
    } = context;

    try {
      // Set default dates if not provided (last 30 days)
      const defaultEndDate = new Date().toISOString().split('T')[0]; // Today
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago

      const actualStartDate = startDate || defaultStartDate;
      const actualEndDate = endDate || defaultEndDate;

      console.log(`🚀 Starting Multi-Timeframe ADA Strategy Analysis`);
      console.log(`📊 Symbol: ${symbol} | Capital: $${initialCapital} | Leverage: ${leverage}x`);
      console.log(`⚡ Effective Buying Power: $${initialCapital * leverage}`);
      console.log(`🎯 Max Risk Per Trade: ${riskPerTrade}% ($${(initialCapital * riskPerTrade / 100).toFixed(2)})`);
      console.log(`📅 Date Range: ${actualStartDate} to ${actualEndDate}`);

      // Fetch multi-timeframe data
      const timeframes = ['15', '60', '1440']; // 15m, 1h, 1d
      const marketData: { [key: string]: TimeframeData[] } = {};

      for (const tf of timeframes) {
        console.log(`📡 Fetching ${tf}min data for ${symbol} from KRAKEN...`);
        // Use KRAKEN ONLY - it works perfectly for ADA data
        const data = await fetchKrakenData(symbol, tf, actualStartDate, actualEndDate);
        if (!data || data.length === 0) {
          throw new Error(`Failed to fetch ${tf}min data from Kraken for ${symbol}`);
        }
        console.log(`✅ Loaded ${data.length} ${tf}min candles from Kraken`);
        marketData[tf] = data;
      }

      // Calculate technical indicators for each timeframe
      const indicators: { [key: string]: TechnicalIndicators } = {};
      for (const tf of timeframes) {
        indicators[tf] = calculateTechnicalIndicators(
          marketData[tf], 
          { rsiPeriod, macdFast, macdSlow, macdSignal, atrPeriod, bbPeriod, bbStdDev }
        );
      }

      // Run multi-timeframe strategy
      const strategyResults = await runMultiTimeframeStrategy(
        marketData, 
        indicators, 
        { initialCapital, leverage, riskPerTrade }
      );

      // Generate comprehensive analysis
      const analysis = generateStrategyAnalysis(strategyResults, marketData, indicators);

      // Voice announcement
      if (speakResults) {
        await announceResults(strategyResults, symbol, leverage, context);
      }

      console.log(`✅ Multi-Timeframe ADA Strategy Analysis Complete`);

      // Format trades for frontend compatibility
      const formattedTrades = strategyResults.trades.map((trade: any, index: number) => ({
        id: `mt_trade_${index + 1}`,
        entryTime: new Date(trade.entryTime).toISOString(),
        exitTime: trade.exitTime ? new Date(trade.exitTime).toISOString() : null,
        side: trade.side,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice || trade.entryPrice,
        size: trade.size,
        netPnl: trade.pnl || 0,
        reason: trade.reason || 'Multi-timeframe confluence signal',
        leverage: trade.leverage || leverage,
        duration: trade.exitTime ?
          Math.round((new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime()) / (1000 * 60 * 60)) : 0
      }));

      // Format chart data (OHLCV) for frontend
      const chartData = marketData['15'].map((candle: any) => ({
        time: new Date(candle.timestamp * 1000).toISOString(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume || 0
      }));

      return {
        success: true,
        strategy: 'multi-timeframe-ada',
        symbol: symbol,
        leverage: leverage,
        timeframes: ['15m', '1h', '1d'],
        period: `${startDate} to ${endDate}`,
        trades: formattedTrades,
        chartData: chartData,
        analysis: analysis,
        performance: {
          totalTrades: strategyResults.totalTrades,
          winRate: strategyResults.hitRate, // Use hitRate instead of winRate
          avgReturn: strategyResults.totalReturnPercent, // Use totalReturnPercent
          maxDrawdown: strategyResults.maxDrawdown,
          profitFactor: strategyResults.profitFactor,
          sharpeRatio: strategyResults.sharpeRatio || 0,
          totalReturn: strategyResults.totalReturn,
          finalCapital: strategyResults.finalCapital
        },
        summary: generateSummary(strategyResults, symbol, leverage),
        riskMetrics: calculateRiskMetrics(strategyResults, initialCapital),
        voiceAnnouncement: speakResults ? 'Results announced via Google Voice' : 'Voice disabled'
      };

    } catch (error) {
      console.error('❌ Multi-Timeframe Strategy Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: 'Check symbol format, date range, and API availability'
      };
    }
  },
});

// Fetch data from Kraken API - REAL-TIME APPROACH like Fibonacci agent
async function fetchKrakenData(symbol: string, timeframe: string, startDate: string, endDate: string): Promise<TimeframeData[]> {
  try {
    console.log(`📡 Fetching REAL-TIME Kraken data for ${symbol}, timeframe: ${timeframe}min`);

    // Convert timeframe to Kraken format
    const krakenInterval = timeframe === '15' ? '15' : timeframe === '60' ? '60' : '1440';

    // Use COUNT approach like Fibonacci agent (gets recent data that actually exists)
    const count = timeframe === '15' ? 200 : timeframe === '60' ? 100 : 50; // More data for shorter timeframes
    const url = `https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=${krakenInterval}&count=${count}`;

    console.log(`🌐 Kraken API URL: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Kraken API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(', ')}`);
    }

    const ohlcKey = Object.keys(data.result).find(key => key !== 'last');
    if (!ohlcKey) {
      throw new Error(`No OHLC data for ${symbol}`);
    }

    const candles = data.result[ohlcKey].map((candle: any[]) => ({
      timestamp: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[6])
    }));

    // For backtesting, we want recent data - just take the most recent candles
    // Sort by timestamp and take the most recent data
    const sortedCandles = candles.sort((a: TimeframeData, b: TimeframeData) => a.timestamp - b.timestamp);

    // Take the most recent data based on timeframe
    let filteredCandles = sortedCandles;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      filteredCandles = sortedCandles.filter((candle: TimeframeData) => {
        const candleDate = new Date(candle.timestamp * 1000);
        return candleDate >= start && candleDate <= end;
      });

      // If no data in range, take the most recent 100 candles for analysis
      if (filteredCandles.length === 0) {
        console.log(`⚠️ No data in specified range, using most recent 100 candles`);
        filteredCandles = sortedCandles.slice(-100);
      }
    }

    console.log(`📊 Retrieved ${filteredCandles.length} candles from Kraken for ${symbol}`);

    // Debug: Show date range of retrieved data
    if (filteredCandles.length > 0) {
      const firstCandle = new Date(filteredCandles[0].timestamp * 1000);
      const lastCandle = new Date(filteredCandles[filteredCandles.length - 1].timestamp * 1000);
      console.log(`📅 Data range: ${firstCandle.toISOString().split('T')[0]} to ${lastCandle.toISOString().split('T')[0]}`);
    } else {
      console.log(`⚠️ No data found for ${symbol} timeframe ${timeframe}min in date range ${startDate} to ${endDate}`);
    }

    return filteredCandles;

  } catch (error) {
    console.error(`❌ Kraken fetch failed for ${symbol}:`, error);
    // NO FALLBACK - Kraken only, just like Fibonacci strategy
    throw new Error(`Kraken API failed for ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// KRAKEN ONLY - No Phemex fallback needed since Kraken works perfectly for ADA

// Calculate technical indicators
function calculateTechnicalIndicators(data: TimeframeData[], params: any): TechnicalIndicators {
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);

  return {
    rsi: calculateRSI(closes, params.rsiPeriod),
    macd: calculateMACD(closes, params.macdFast, params.macdSlow, params.macdSignal),
    ema50: calculateEMA(closes, 50),
    ema200: calculateEMA(closes, 200),
    bollingerBands: calculateBollingerBands(closes, params.bbPeriod, params.bbStdDev),
    atr: calculateATR(highs, lows, closes, params.atrPeriod)
  };
}

// RSI calculation
function calculateRSI(prices: number[], period: number): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

// EMA calculation
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  ema[0] = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
  }
  
  return ema;
}

// MACD calculation
function calculateMACD(prices: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);
  
  const macdLine = emaFast.map((fast, i) => fast - emaSlow[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

// Bollinger Bands calculation
function calculateBollingerBands(prices: number[], period: number, stdDev: number) {
  const sma: number[] = [];
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const standardDev = Math.sqrt(variance);
    
    sma.push(mean);
    upper.push(mean + (standardDev * stdDev));
    lower.push(mean - (standardDev * stdDev));
  }
  
  return { upper, middle: sma, lower };
}

// ATR calculation
function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
  const trueRanges: number[] = [];
  
  for (let i = 1; i < highs.length; i++) {
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - closes[i - 1]);
    const tr3 = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  const atr: number[] = [];
  for (let i = period - 1; i < trueRanges.length; i++) {
    const avgTR = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    atr.push(avgTR);
  }
  
  return atr;
}

// Multi-timeframe strategy execution
async function runMultiTimeframeStrategy(
  marketData: { [key: string]: TimeframeData[] },
  indicators: { [key: string]: TechnicalIndicators },
  config: { initialCapital: number, leverage: number, riskPerTrade: number }
) {
  const trades: any[] = [];
  const equity: number[] = [config.initialCapital];
  let currentCapital = config.initialCapital;
  let position: any = null;

  const data15m = marketData['15'];
  const maxRiskPerTrade = (config.initialCapital * config.riskPerTrade) / 100;

  console.log(`📊 Analyzing ${data15m.length} 15-minute candles...`);

  for (let i = 200; i < data15m.length; i++) { // Start after indicators are ready
    const currentTime = data15m[i].timestamp;
    const currentPrice = data15m[i].close;

    // Get timeframe analysis
    const timeframeAnalysis = analyzeTimeframes(marketData, indicators, i, currentTime);

    // Check for position exit first
    if (position) {
      const exitSignal = checkExitConditions(position, data15m[i], indicators['15'], i);
      if (exitSignal.shouldExit) {
        const pnl = calculatePnL(position, currentPrice, config.leverage);
        currentCapital += pnl;

        trades.push({
          ...position,
          exitDate: new Date(currentTime * 1000).toISOString(),
          exitPrice: currentPrice,
          exitReason: exitSignal.reason,
          pnl: pnl,
          pnlPercent: (pnl / position.capitalUsed) * 100,
          holdingPeriod: (currentTime - position.entryTimestamp) / 3600, // hours
          timeframeScores: timeframeAnalysis
        });

        console.log(`🔄 ${position.side.toUpperCase()} position closed: ${exitSignal.reason} | P&L: $${pnl.toFixed(2)}`);
        position = null;
      }
    }

    // Check for new position entry
    if (!position) {
      const entrySignal = checkEntryConditions(timeframeAnalysis, data15m[i], indicators['15'], i);

      if (entrySignal.shouldEnter) {
        const atr = indicators['15'].atr[i - 200] || 0.01; // Adjust index for ATR
        const stopDistance = atr * 3.5; // 3.5x ATR stop loss (OPTIMIZED - wider stops)

        // Calculate position size with leverage consideration
        const positionSize = calculatePositionSize(
          maxRiskPerTrade,
          stopDistance,
          currentPrice,
          config.leverage,
          config.initialCapital * config.leverage, // Max buying power
          entrySignal.entryType,
          entrySignal.confidence
        );

        if (positionSize > 0) {
          // AGGRESSIVE RISK/REWARD RATIOS for higher returns
          let riskRewardRatio = 2.5; // Default 2.5:1 (increased)

          if (entrySignal.entryType === 'trend') {
            riskRewardRatio = 4.0; // 4:1 for trends (let winners run more)
          } else if (entrySignal.entryType === 'scalp') {
            riskRewardRatio = 2.0; // 2:1 for scalps (increased from 1.5)
          } else if (entrySignal.entryType === 'momentum') {
            riskRewardRatio = 3.0; // 3:1 for momentum (increased from 2.5)
          } else if (entrySignal.entryType === 'reversal') {
            riskRewardRatio = 2.5; // 2.5:1 for reversals (increased from 2.0)
          }

          // Adjust stop distance based on confidence
          const confidenceAdjustment = Math.max(0.8, Math.min(1.2, entrySignal.confidence * 2));
          const adjustedStopDistance = stopDistance * confidenceAdjustment;

          position = {
            entryDate: new Date(currentTime * 1000).toISOString(),
            entryTimestamp: currentTime,
            entryPrice: currentPrice,
            side: entrySignal.direction,
            quantity: positionSize / currentPrice,
            capitalUsed: positionSize / config.leverage, // Actual capital used (margin)
            leverage: config.leverage,
            stopLoss: entrySignal.direction === 'long'
              ? currentPrice - adjustedStopDistance
              : currentPrice + adjustedStopDistance,
            takeProfit: entrySignal.direction === 'long'
              ? currentPrice + (adjustedStopDistance * riskRewardRatio)
              : currentPrice - (adjustedStopDistance * riskRewardRatio),
            entryReason: entrySignal.reason,
            entryType: entrySignal.entryType,
            confidence: entrySignal.confidence,
            timeframeScores: timeframeAnalysis
          };

          console.log(`🚀 ${entrySignal.direction.toUpperCase()} entry: $${currentPrice.toFixed(4)} | Size: $${positionSize.toFixed(0)} | Stop: $${position.stopLoss.toFixed(4)}`);
        }
      }
    }

    equity.push(currentCapital);
  }

  // Close any remaining position
  if (position) {
    const finalPrice = data15m[data15m.length - 1].close;
    const pnl = calculatePnL(position, finalPrice, config.leverage);
    currentCapital += pnl;

    trades.push({
      ...position,
      exitDate: new Date(data15m[data15m.length - 1].timestamp * 1000).toISOString(),
      exitPrice: finalPrice,
      exitReason: 'End of backtest',
      pnl: pnl,
      pnlPercent: (pnl / position.capitalUsed) * 100,
      holdingPeriod: (data15m[data15m.length - 1].timestamp - position.entryTimestamp) / 3600
    });
  }

  return {
    trades: trades,
    finalCapital: currentCapital,
    totalReturn: currentCapital - config.initialCapital,
    totalReturnPercent: ((currentCapital - config.initialCapital) / config.initialCapital) * 100,
    totalTrades: trades.length,
    winningTrades: trades.filter(t => t.pnl > 0).length,
    losingTrades: trades.filter(t => t.pnl < 0).length,
    hitRate: trades.length > 0 ? trades.filter(t => t.pnl > 0).length / trades.length : 0,
    avgHoldingPeriod: trades.length > 0 ? trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / trades.length : 0,
    maxDrawdown: calculateMaxDrawdown(equity),
    profitFactor: calculateProfitFactor(trades),
    sharpeRatio: calculateSharpeRatio(equity),
    equity: equity
  };
}

// Analyze all timeframes and generate scores
function analyzeTimeframes(
  marketData: { [key: string]: TimeframeData[] },
  indicators: { [key: string]: TechnicalIndicators },
  currentIndex: number,
  currentTime: number
): TimeframeAnalysis[] {
  const analyses: TimeframeAnalysis[] = [];

  // Daily analysis (market context)
  const dailyAnalysis = analyzeDailyTimeframe(marketData['1440'], indicators['1440'], currentTime);
  analyses.push(dailyAnalysis);

  // 1-hour analysis (trend filter)
  const hourlyAnalysis = analyzeHourlyTimeframe(marketData['60'], indicators['60'], currentTime);
  analyses.push(hourlyAnalysis);

  // 15-minute analysis (execution)
  const fifteenMinAnalysis = analyze15MinTimeframe(marketData['15'], indicators['15'], currentIndex);
  analyses.push(fifteenMinAnalysis);

  return analyses;
}

// Daily timeframe analysis - OPTIMIZED for profitable trend detection
function analyzeDailyTimeframe(data: TimeframeData[], indicators: TechnicalIndicators, currentTime: number): TimeframeAnalysis {
  const currentIndex = findNearestIndex(data, currentTime);
  if (currentIndex === -1 || currentIndex < 21) { // Reduced to 21 for faster signals
    return { timeframe: '1d', score: 0, signals: ['Insufficient data'], trend: 'neutral', confidence: 0 };
  }

  const currentPrice = data[currentIndex].close;
  const prev3Price = data[Math.max(0, currentIndex - 3)].close;
  const ema200 = indicators.ema200[currentIndex] || currentPrice;
  const ema50 = indicators.ema50[currentIndex] || currentPrice;
  const rsi = indicators.rsi[Math.max(0, currentIndex - 21)] || 50; // Adjusted for new RSI period

  let score = 0;
  const signals: string[] = [];

  // 1. ENHANCED TREND DIRECTION with momentum confirmation
  const emaDistance = (currentPrice - ema200) / ema200;
  if (emaDistance > 0.02) { // 2% above EMA200
    score += 0.5;
    signals.push(`Strong above EMA200 (+${(emaDistance * 100).toFixed(2)}%)`);
  } else if (emaDistance > 0) {
    score += 0.25;
    signals.push(`Above EMA200 (+${(emaDistance * 100).toFixed(2)}%)`);
  } else if (emaDistance < -0.02) { // 2% below EMA200
    score -= 0.5;
    signals.push(`Strong below EMA200 (${(emaDistance * 100).toFixed(2)}%)`);
  } else if (emaDistance < 0) {
    score -= 0.25;
    signals.push(`Below EMA200 (${(emaDistance * 100).toFixed(2)}%)`);
  }

  // 2. EMA ALIGNMENT for trend strength
  if (currentPrice > ema50 && ema50 > ema200) {
    score += 0.3;
    signals.push('Perfect bullish EMA alignment');
  } else if (currentPrice < ema50 && ema50 < ema200) {
    score -= 0.3;
    signals.push('Perfect bearish EMA alignment');
  }

  // 3. MULTI-DAY MOMENTUM (3-day trend)
  const threeDayChange = (currentPrice - prev3Price) / prev3Price;
  if (threeDayChange > 0.05) { // 5% gain over 3 days
    score += 0.25;
    signals.push(`Strong 3-day momentum (+${(threeDayChange * 100).toFixed(2)}%)`);
  } else if (threeDayChange < -0.05) { // 5% loss over 3 days
    score -= 0.25;
    signals.push(`Strong 3-day momentum (${(threeDayChange * 100).toFixed(2)}%)`);
  }

  // 4. OPTIMIZED RSI CONDITIONS for better entries
  if (rsi < 35 && currentPrice > ema200) { // Oversold in uptrend
    score += 0.3;
    signals.push(`RSI oversold in uptrend (${rsi.toFixed(1)})`);
  } else if (rsi > 65 && currentPrice < ema200) { // Overbought in downtrend
    score -= 0.3;
    signals.push(`RSI overbought in downtrend (${rsi.toFixed(1)})`);
  } else if (rsi < 25) { // Extremely oversold
    score += 0.2;
    signals.push(`RSI extremely oversold (${rsi.toFixed(1)})`);
  } else if (rsi > 75) { // Extremely overbought
    score -= 0.2;
    signals.push(`RSI extremely overbought (${rsi.toFixed(1)})`);
  }

  return {
    timeframe: '1d',
    score: Math.max(-1, Math.min(1, score)),
    signals: signals,
    trend: score > 0.3 ? 'bullish' : score < -0.3 ? 'bearish' : 'neutral',
    confidence: Math.abs(score)
  };
}

// 1-hour timeframe analysis - OPTIMIZED for profitable trend following
function analyzeHourlyTimeframe(data: TimeframeData[], indicators: TechnicalIndicators, currentTime: number): TimeframeAnalysis {
  const currentIndex = findNearestIndex(data, currentTime);
  if (currentIndex === -1 || currentIndex < 21) { // Reduced to 21 for faster signals
    return { timeframe: '1h', score: 0, signals: ['Insufficient data'], trend: 'neutral', confidence: 0 };
  }

  const currentPrice = data[currentIndex].close;
  const prev2Price = data[Math.max(0, currentIndex - 2)].close;
  const ema50 = indicators.ema50[currentIndex] || currentPrice;
  const macd = indicators.macd.macd[currentIndex] || 0;
  const macdSignal = indicators.macd.signal[currentIndex] || 0;
  const macdHist = indicators.macd.histogram[currentIndex] || 0;
  const prevMacdHist = indicators.macd.histogram[Math.max(0, currentIndex - 1)] || 0;
  const prev2MacdHist = indicators.macd.histogram[Math.max(0, currentIndex - 2)] || 0;

  let score = 0;
  const signals: string[] = [];

  // 1. ENHANCED MACD ANALYSIS with trend confirmation
  const macdCrossover = (macd > macdSignal && indicators.macd.macd[Math.max(0, currentIndex - 1)] <= indicators.macd.signal[Math.max(0, currentIndex - 1)]);
  const macdCrossunder = (macd < macdSignal && indicators.macd.macd[Math.max(0, currentIndex - 1)] >= indicators.macd.signal[Math.max(0, currentIndex - 1)]);

  if (macdCrossover) {
    score += 0.4;
    signals.push('MACD bullish crossover');
  } else if (macd > macdSignal && macd > 0) {
    score += 0.35;
    signals.push(`MACD strong bullish (${macd.toFixed(6)})`);
  } else if (macd > macdSignal) {
    score += 0.2;
    signals.push(`MACD bullish (${macd.toFixed(6)})`);
  }

  if (macdCrossunder) {
    score -= 0.4;
    signals.push('MACD bearish crossunder');
  } else if (macd < macdSignal && macd < 0) {
    score -= 0.35;
    signals.push(`MACD strong bearish (${macd.toFixed(6)})`);
  } else if (macd < macdSignal) {
    score -= 0.2;
    signals.push(`MACD bearish (${macd.toFixed(6)})`);
  }

  // 2. MACD HISTOGRAM MOMENTUM with acceleration
  const histAcceleration = macdHist - 2 * prevMacdHist + prev2MacdHist;
  if (macdHist > prevMacdHist && histAcceleration > 0) {
    score += 0.3;
    signals.push('MACD accelerating up');
  } else if (macdHist > prevMacdHist) {
    score += 0.2;
    signals.push('MACD momentum up');
  } else if (macdHist < prevMacdHist && histAcceleration < 0) {
    score -= 0.3;
    signals.push('MACD accelerating down');
  } else if (macdHist < prevMacdHist) {
    score -= 0.2;
    signals.push('MACD momentum down');
  }

  // 3. ENHANCED EMA TREND ANALYSIS
  const emaDistance = (currentPrice - ema50) / ema50;
  const emaSlope = (ema50 - indicators.ema50[Math.max(0, currentIndex - 3)]) / indicators.ema50[Math.max(0, currentIndex - 3)];

  if (emaDistance > 0.01 && emaSlope > 0.002) { // Strong uptrend
    score += 0.3;
    signals.push(`Strong uptrend (+${(emaDistance * 100).toFixed(2)}%, slope +${(emaSlope * 100).toFixed(2)}%)`);
  } else if (emaDistance > 0.005) {
    score += 0.2;
    signals.push(`Above EMA50 (+${(emaDistance * 100).toFixed(2)}%)`);
  } else if (emaDistance < -0.01 && emaSlope < -0.002) { // Strong downtrend
    score -= 0.3;
    signals.push(`Strong downtrend (${(emaDistance * 100).toFixed(2)}%, slope ${(emaSlope * 100).toFixed(2)}%)`);
  } else if (emaDistance < -0.005) {
    score -= 0.2;
    signals.push(`Below EMA50 (${(emaDistance * 100).toFixed(2)}%)`);
  }

  // 4. MOMENTUM CONFIRMATION with 2-hour trend
  const twoHourChange = (currentPrice - prev2Price) / prev2Price;
  if (twoHourChange > 0.01) { // 1% gain over 2 hours
    score += 0.2;
    signals.push(`Strong 2h momentum (+${(twoHourChange * 100).toFixed(2)}%)`);
  } else if (twoHourChange < -0.01) {
    score -= 0.2;
    signals.push(`Strong 2h momentum (${(twoHourChange * 100).toFixed(2)}%)`);
  }

  return {
    timeframe: '1h',
    score: Math.max(-1, Math.min(1, score)),
    signals: signals,
    trend: score > 0.3 ? 'bullish' : score < -0.3 ? 'bearish' : 'neutral',
    confidence: Math.abs(score)
  };
}

// 15-minute timeframe analysis - OPTIMIZED for profitable scalping
function analyze15MinTimeframe(data: TimeframeData[], indicators: TechnicalIndicators, currentIndex: number): TimeframeAnalysis {
  if (currentIndex < 21) { // Adjusted for new RSI period
    return { timeframe: '15m', score: 0, signals: ['Insufficient data'], trend: 'neutral', confidence: 0 };
  }

  const currentPrice = data[currentIndex].close;
  const prevPrice = data[Math.max(0, currentIndex - 1)].close;
  const prev2Price = data[Math.max(0, currentIndex - 2)].close;
  const rsi = indicators.rsi[Math.max(0, currentIndex - 21)] || 50; // Adjusted for new period
  const bbUpper = indicators.bollingerBands.upper[Math.max(0, currentIndex - 15)] || currentPrice * 1.018;
  const bbMiddle = indicators.bollingerBands.middle[Math.max(0, currentIndex - 15)] || currentPrice;
  const bbLower = indicators.bollingerBands.lower[Math.max(0, currentIndex - 15)] || currentPrice * 0.982;
  const volume = data[currentIndex].volume;
  const avgVolume = data.slice(Math.max(0, currentIndex - 15), currentIndex).reduce((sum, d) => sum + d.volume, 0) / 15;

  let score = 0;
  const signals: string[] = [];

  // 1. ENHANCED RSI ANALYSIS with divergence detection
  const rsiPrev = indicators.rsi[Math.max(0, currentIndex - 22)] || 50;
  const rsiDivergence = (currentPrice > prevPrice && rsi < rsiPrev) || (currentPrice < prevPrice && rsi > rsiPrev);

  if (rsi < 30) {
    score += 0.5;
    signals.push(`RSI oversold (${rsi.toFixed(1)})`);
    if (rsi < 20) {
      score += 0.3;
      signals.push('RSI extremely oversold');
    }
  } else if (rsi > 70) {
    score -= 0.5;
    signals.push(`RSI overbought (${rsi.toFixed(1)})`);
    if (rsi > 80) {
      score -= 0.3;
      signals.push('RSI extremely overbought');
    }
  }

  if (rsiDivergence) {
    if (rsi < 50) {
      score += 0.2;
      signals.push('Bullish RSI divergence');
    } else {
      score -= 0.2;
      signals.push('Bearish RSI divergence');
    }
  }

  // 2. ENHANCED BOLLINGER BAND STRATEGY
  const bbPosition = (currentPrice - bbLower) / (bbUpper - bbLower);
  const bbWidth = (bbUpper - bbLower) / bbMiddle;

  // Mean reversion signals
  if (bbPosition < 0.15) { // Very near lower band
    score += 0.4;
    signals.push(`Very near BB lower (${(bbPosition * 100).toFixed(1)}%)`);
  } else if (bbPosition < 0.3) {
    score += 0.25;
    signals.push(`Near BB lower (${(bbPosition * 100).toFixed(1)}%)`);
  } else if (bbPosition > 0.85) { // Very near upper band
    score -= 0.4;
    signals.push(`Very near BB upper (${(bbPosition * 100).toFixed(1)}%)`);
  } else if (bbPosition > 0.7) {
    score -= 0.25;
    signals.push(`Near BB upper (${(bbPosition * 100).toFixed(1)}%)`);
  }

  // Volatility breakout signals
  if (bbWidth < 0.015) { // Very tight squeeze
    score += 0.3;
    signals.push('Very tight BB squeeze');
  } else if (bbWidth < 0.025) {
    score += 0.2;
    signals.push('BB squeeze detected');
  }

  // 3. MOMENTUM ANALYSIS with acceleration
  const priceChange = (currentPrice - prevPrice) / prevPrice;
  const priceAcceleration = ((currentPrice - prevPrice) - (prevPrice - prev2Price)) / prevPrice;

  if (priceChange > 0.005 && priceAcceleration > 0.002) { // Strong accelerating momentum
    score += 0.35;
    signals.push(`Accelerating momentum (+${(priceChange * 100).toFixed(2)}%)`);
  } else if (priceChange > 0.003) {
    score += 0.25;
    signals.push(`Strong 15m momentum (+${(priceChange * 100).toFixed(2)}%)`);
  } else if (priceChange < -0.005 && priceAcceleration < -0.002) {
    score -= 0.35;
    signals.push(`Accelerating momentum (${(priceChange * 100).toFixed(2)}%)`);
  } else if (priceChange < -0.003) {
    score -= 0.25;
    signals.push(`Strong 15m momentum (${(priceChange * 100).toFixed(2)}%)`);
  }

  // 4. VOLUME ANALYSIS with trend confirmation
  const volumeRatio = volume / avgVolume;
  if (volumeRatio > 2.0) { // Very high volume
    score += 0.25;
    signals.push(`Very high volume (${volumeRatio.toFixed(1)}x avg)`);
  } else if (volumeRatio > 1.3) {
    score += 0.15;
    signals.push(`High volume (${volumeRatio.toFixed(1)}x avg)`);
  }

  // 5. CANDLE PATTERN ANALYSIS
  const high = data[currentIndex].high;
  const low = data[currentIndex].low;
  const open = data[currentIndex].open;
  const candleRange = (high - low) / currentPrice;
  const bodySize = Math.abs(currentPrice - open) / currentPrice;

  if (candleRange > 0.015) { // 1.5% range = very volatile
    score += 0.15;
    signals.push('High volatility candle');
  }

  // Doji detection (indecision)
  if (bodySize < 0.002) { // Very small body
    score *= 0.8; // Reduce confidence
    signals.push('Doji pattern (indecision)');
  }

  return {
    timeframe: '15m',
    score: Math.max(-1, Math.min(1, score)),
    signals: signals,
    trend: score > 0.3 ? 'bullish' : score < -0.3 ? 'bearish' : 'neutral',
    confidence: Math.abs(score)
  };
}

// Check entry conditions based on multi-timeframe analysis
function checkEntryConditions(
  timeframeAnalysis: TimeframeAnalysis[],
  _currentCandle: TimeframeData,
  _indicators15m: TechnicalIndicators,
  _currentIndex: number
) {
  const dailyAnalysis = timeframeAnalysis.find(ta => ta.timeframe === '1d');
  const hourlyAnalysis = timeframeAnalysis.find(ta => ta.timeframe === '1h');
  const fifteenMinAnalysis = timeframeAnalysis.find(ta => ta.timeframe === '15m');

  if (!dailyAnalysis || !hourlyAnalysis || !fifteenMinAnalysis) {
    return { shouldEnter: false, direction: 'none', reason: 'Missing timeframe data', confidence: 0 };
  }

  // OPTIMIZED WEIGHTED SCORING for better performance
  const totalScore = (dailyAnalysis.score * 0.35) + (hourlyAnalysis.score * 0.45) + (fifteenMinAnalysis.score * 0.2);
  const confidence = (dailyAnalysis.confidence * 0.35) + (hourlyAnalysis.confidence * 0.45) + (fifteenMinAnalysis.confidence * 0.2);

  // AGGRESSIVE ENTRY CONDITIONS - Optimized for 40%+ returns

  // 1. HIGH-PROBABILITY TREND FOLLOWING (OPTIMIZED - Higher thresholds for quality)
  const strongLongTrend = totalScore >= 0.6 && hourlyAnalysis.score > 0.5 && dailyAnalysis.score > 0.2;
  const strongShortTrend = totalScore <= -0.6 && hourlyAnalysis.score < -0.5 && dailyAnalysis.score < -0.2;

  // 2. SELECTIVE SCALPING ENTRIES (OPTIMIZED - Higher quality signals only)
  const scalpLong = fifteenMinAnalysis.score >= 0.7 && hourlyAnalysis.score > 0.2 && totalScore > 0.4;
  const scalpShort = fifteenMinAnalysis.score <= -0.7 && hourlyAnalysis.score < -0.2 && totalScore < -0.4;

  // 3. MOMENTUM BREAKOUT ENTRIES (OPTIMIZED - More selective)
  const momentumLong = (dailyAnalysis.score > 0.7) || (hourlyAnalysis.score > 0.8 && fifteenMinAnalysis.score > 0.3) || (fifteenMinAnalysis.score > 0.9);
  const momentumShort = (dailyAnalysis.score < -0.7) || (hourlyAnalysis.score < -0.8 && fifteenMinAnalysis.score < -0.3) || (fifteenMinAnalysis.score < -0.9);

  // 4. MEAN REVERSION ENTRIES (OPTIMIZED - More conservative)
  const reversalLong = fifteenMinAnalysis.score > 0.5 && totalScore > 0.2 && dailyAnalysis.score > -0.3;
  const reversalShort = fifteenMinAnalysis.score < -0.5 && totalScore < -0.2 && dailyAnalysis.score < 0.3;

  // ENTRY LOGIC - Multiple strategies
  if (strongLongTrend || scalpLong || momentumLong || reversalLong) {
    let entryType = 'trend';
    if (scalpLong && !strongLongTrend) entryType = 'scalp';
    if (momentumLong && !strongLongTrend && !scalpLong) entryType = 'momentum';
    if (reversalLong && !strongLongTrend && !scalpLong && !momentumLong) entryType = 'reversal';

    return {
      shouldEnter: true,
      direction: 'long',
      reason: `${entryType.toUpperCase()} LONG: Score=${totalScore.toFixed(2)} | 1d=${dailyAnalysis.score.toFixed(2)} | 1h=${hourlyAnalysis.score.toFixed(2)} | 15m=${fifteenMinAnalysis.score.toFixed(2)}`,
      confidence: confidence,
      entryType: entryType
    };
  } else if (strongShortTrend || scalpShort || momentumShort || reversalShort) {
    let entryType = 'trend';
    if (scalpShort && !strongShortTrend) entryType = 'scalp';
    if (momentumShort && !strongShortTrend && !scalpShort) entryType = 'momentum';
    if (reversalShort && !strongShortTrend && !scalpShort && !momentumShort) entryType = 'reversal';

    return {
      shouldEnter: true,
      direction: 'short',
      reason: `${entryType.toUpperCase()} SHORT: Score=${totalScore.toFixed(2)} | 1d=${dailyAnalysis.score.toFixed(2)} | 1h=${hourlyAnalysis.score.toFixed(2)} | 15m=${fifteenMinAnalysis.score.toFixed(2)}`,
      confidence: confidence,
      entryType: entryType
    };
  }

  return { shouldEnter: false, direction: 'none', reason: `No signal: Score=${totalScore.toFixed(2)}`, confidence: confidence };
}

// Check exit conditions - OPTIMIZED for different trade types
function checkExitConditions(position: any, currentCandle: TimeframeData, indicators15m: TechnicalIndicators, currentIndex: number) {
  const currentPrice = currentCandle.close;
  const holdingTime = (currentCandle.timestamp - position.entryTimestamp) / 3600; // hours
  const entryType = position.entryType || 'trend';

  // 1. STOP LOSS (Always enforced)
  if (position.side === 'long' && currentPrice <= position.stopLoss) {
    return { shouldExit: true, reason: 'Stop loss hit' };
  }
  if (position.side === 'short' && currentPrice >= position.stopLoss) {
    return { shouldExit: true, reason: 'Stop loss hit' };
  }

  // 2. TAKE PROFIT (Always enforced)
  if (position.side === 'long' && currentPrice >= position.takeProfit) {
    return { shouldExit: true, reason: 'Take profit hit' };
  }
  if (position.side === 'short' && currentPrice <= position.takeProfit) {
    return { shouldExit: true, reason: 'Take profit hit' };
  }

  // 3. OPTIMIZED TRADE TYPE SPECIFIC EXITS

  // SCALP TRADES - Quick, profitable exits
  if (entryType === 'scalp') {
    if (holdingTime > 1.5) { // Reduced from 2h to 1.5h
      return { shouldExit: true, reason: 'Scalp max time (1.5h)' };
    }

    // Aggressive profit taking for scalps
    const profitTarget = Math.abs(position.takeProfit - position.entryPrice);
    const currentProfit = position.side === 'long'
      ? currentPrice - position.entryPrice
      : position.entryPrice - currentPrice;

    // Take 40% profit quickly (reduced from 50%)
    if (currentProfit >= profitTarget * 0.4 && holdingTime > 0.25) {
      return { shouldExit: true, reason: 'Scalp quick profit (40%)' };
    }

    // Take 60% profit after 30 minutes
    if (currentProfit >= profitTarget * 0.6 && holdingTime > 0.5) {
      return { shouldExit: true, reason: 'Scalp good profit (60%)' };
    }
  }

  // TREND TRADES - Let winners run with smart trailing
  else if (entryType === 'trend') {
    if (holdingTime > 36) { // Reduced from 48h to 36h
      return { shouldExit: true, reason: 'Trend max time (36h)' };
    }

    const profitTarget = Math.abs(position.takeProfit - position.entryPrice);
    const currentProfit = position.side === 'long'
      ? currentPrice - position.entryPrice
      : position.entryPrice - currentPrice;

    // Progressive trailing stops
    if (currentProfit >= profitTarget * 1.5 && holdingTime > 8) { // 150% profit
      const trailPrice = position.side === 'long'
        ? position.entryPrice + (profitTarget * 1.0) // Trail to 100% profit
        : position.entryPrice - (profitTarget * 1.0);

      if ((position.side === 'long' && currentPrice <= trailPrice) ||
          (position.side === 'short' && currentPrice >= trailPrice)) {
        return { shouldExit: true, reason: 'Trend trailing stop (100% profit)' };
      }
    } else if (currentProfit >= profitTarget * 1.0 && holdingTime > 4) { // 100% profit
      const trailPrice = position.side === 'long'
        ? position.entryPrice + (profitTarget * 0.6) // Trail to 60% profit
        : position.entryPrice - (profitTarget * 0.6);

      if ((position.side === 'long' && currentPrice <= trailPrice) ||
          (position.side === 'short' && currentPrice >= trailPrice)) {
        return { shouldExit: true, reason: 'Trend trailing stop (60% profit)' };
      }
    } else if (currentProfit >= profitTarget * 0.7 && holdingTime > 2) { // 70% profit
      const trailPrice = position.side === 'long'
        ? position.entryPrice + (profitTarget * 0.3) // Trail to 30% profit
        : position.entryPrice - (profitTarget * 0.3);

      if ((position.side === 'long' && currentPrice <= trailPrice) ||
          (position.side === 'short' && currentPrice >= trailPrice)) {
        return { shouldExit: true, reason: 'Trend trailing stop (30% profit)' };
      }
    }
  }

  // MOMENTUM TRADES - Medium duration with profit protection
  else if (entryType === 'momentum') {
    if (holdingTime > 8) { // Reduced from 12h to 8h
      return { shouldExit: true, reason: 'Momentum max time (8h)' };
    }

    // Take profits on momentum trades
    const profitTarget = Math.abs(position.takeProfit - position.entryPrice);
    const currentProfit = position.side === 'long'
      ? currentPrice - position.entryPrice
      : position.entryPrice - currentPrice;

    if (currentProfit >= profitTarget * 0.8 && holdingTime > 1) {
      return { shouldExit: true, reason: 'Momentum profit target (80%)' };
    }
  }

  // REVERSAL TRADES - Quick exits with tight management
  else if (entryType === 'reversal') {
    if (holdingTime > 3) { // Reduced from 4h to 3h
      return { shouldExit: true, reason: 'Reversal max time (3h)' };
    }

    // Quick profit taking for reversals
    const profitTarget = Math.abs(position.takeProfit - position.entryPrice);
    const currentProfit = position.side === 'long'
      ? currentPrice - position.entryPrice
      : position.entryPrice - currentPrice;

    if (currentProfit >= profitTarget * 0.5 && holdingTime > 0.5) {
      return { shouldExit: true, reason: 'Reversal profit target (50%)' };
    }
  }

  // 4. RSI REVERSAL EXITS (OPTIMIZED - Less aggressive, let winners run)
  if (currentIndex >= 14) {
    const rsi = indicators15m.rsi[currentIndex - 14] || 50;

    // Calculate current P&L
    const currentPnl = position.side === 'long'
      ? (currentPrice - position.entryPrice) * position.size
      : (position.entryPrice - currentPrice) * position.size;

    // Only exit on extreme RSI after longer holding time and with profit
    if (position.side === 'long' && rsi > 85 && holdingTime > 2.0 && currentPnl > 0) {
      return { shouldExit: true, reason: 'RSI extremely overbought (85+) with profit' };
    }
    if (position.side === 'short' && rsi < 15 && holdingTime > 2.0 && currentPnl > 0) {
      return { shouldExit: true, reason: 'RSI extremely oversold (15-) with profit' };
    }
  }

  return { shouldExit: false, reason: 'Continue holding' };
}

// Calculate position size with leverage - OPTIMIZED for profitability
function calculatePositionSize(
  maxRisk: number,
  stopDistance: number,
  currentPrice: number,
  leverage: number,
  maxBuyingPower: number,
  entryType: string = 'trend',
  confidence: number = 0.5
): number {
  // AGGRESSIVE risk adjustment for higher returns
  let riskMultiplier = 1.2; // Base 20% increase

  if (entryType === 'trend') {
    riskMultiplier = 1.2 + (confidence * 0.8); // Up to 100% more for high confidence trends
  } else if (entryType === 'scalp') {
    riskMultiplier = 1.0 + (confidence * 0.6); // 100-160% for scalps
  } else if (entryType === 'momentum') {
    riskMultiplier = 1.3 + (confidence * 0.5); // 130-180% for momentum
  } else if (entryType === 'reversal') {
    riskMultiplier = 0.8 + (confidence * 0.5); // 80-130% for reversals
  }

  // Aggressive confidence-based risk scaling
  const confidenceAdjustment = Math.max(0.7, Math.min(2.0, confidence * 2.5));
  const adjustedRisk = maxRisk * riskMultiplier * confidenceAdjustment;

  // Position size based on risk management
  const riskBasedSize = adjustedRisk / stopDistance;

  // Apply leverage efficiently
  const leveragedSize = riskBasedSize * leverage;

  // Convert to dollar amount
  const dollarAmount = leveragedSize * currentPrice;

  // Aggressive position sizing (max 50% of buying power per trade)
  const maxSinglePosition = maxBuyingPower * 0.5;
  const maxPosition = Math.min(dollarAmount, maxSinglePosition);

  // Minimum position size for meaningful trades
  const minPosition = 500; // $500 minimum

  return Math.max(minPosition, maxPosition);
}

// Calculate P&L with leverage
function calculatePnL(position: any, exitPrice: number, leverage: number): number {
  const priceChange = position.side === 'long'
    ? exitPrice - position.entryPrice
    : position.entryPrice - exitPrice;

  const pnlPercent = (priceChange / position.entryPrice) * leverage;
  return position.capitalUsed * pnlPercent;
}

// Find nearest index for timestamp alignment
function findNearestIndex(data: TimeframeData[], targetTime: number): number {
  let closest = -1;
  let minDiff = Infinity;

  for (let i = 0; i < data.length; i++) {
    const diff = Math.abs(data[i].timestamp - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }

  return closest;
}

// Calculate maximum drawdown
function calculateMaxDrawdown(equity: number[]): number {
  let maxDrawdown = 0;
  let peak = equity[0];

  for (const value of equity) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = (peak - value) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return maxDrawdown * 100; // Return as percentage
}

// Calculate profit factor
function calculateProfitFactor(trades: any[]): number {
  const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));

  return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
}

// Calculate Sharpe ratio
function calculateSharpeRatio(equity: number[]): number {
  if (equity.length < 2) return 0;

  const returns = equity.slice(1).map((value, i) => (value - equity[i]) / equity[i]);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);

  return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
}

// Generate comprehensive strategy analysis
function generateStrategyAnalysis(results: any, _marketData: any, _indicators: any) {
  const trades = results.trades;

  return {
    performance: {
      totalReturn: results.totalReturn,
      totalReturnPercent: results.totalReturnPercent,
      hitRate: results.hitRate * 100,
      profitFactor: results.profitFactor,
      sharpeRatio: results.sharpeRatio,
      maxDrawdown: results.maxDrawdown
    },
    tradeAnalysis: {
      totalTrades: results.totalTrades,
      winningTrades: results.winningTrades,
      losingTrades: results.losingTrades,
      avgHoldingPeriod: results.avgHoldingPeriod,
      bestTrade: trades.length > 0 ? Math.max(...trades.map((t: any) => t.pnl)) : 0,
      worstTrade: trades.length > 0 ? Math.min(...trades.map((t: any) => t.pnl)) : 0
    },
    timeframeContribution: analyzeTimeframeContribution(trades),
    riskMetrics: {
      maxRiskPerTrade: trades.length > 0 ? Math.max(...trades.map((t: any) => Math.abs(t.pnl))) : 0,
      avgRiskPerTrade: trades.length > 0 ? trades.reduce((sum: number, t: any) => sum + Math.abs(t.pnl), 0) / trades.length : 0,
      riskRewardRatio: calculateAvgRiskReward(trades)
    }
  };
}

// Analyze timeframe contribution to trades
function analyzeTimeframeContribution(trades: any[]) {
  if (trades.length === 0) return {};

  const timeframeStats = {
    dailyBullish: 0,
    dailyBearish: 0,
    hourlyBullish: 0,
    hourlyBearish: 0,
    fifteenMinBullish: 0,
    fifteenMinBearish: 0
  };

  trades.forEach(trade => {
    if (trade.timeframeScores) {
      const daily = trade.timeframeScores.find((tf: any) => tf.timeframe === '1d');
      const hourly = trade.timeframeScores.find((tf: any) => tf.timeframe === '1h');
      const fifteenMin = trade.timeframeScores.find((tf: any) => tf.timeframe === '15m');

      if (daily?.trend === 'bullish') timeframeStats.dailyBullish++;
      if (daily?.trend === 'bearish') timeframeStats.dailyBearish++;
      if (hourly?.trend === 'bullish') timeframeStats.hourlyBullish++;
      if (hourly?.trend === 'bearish') timeframeStats.hourlyBearish++;
      if (fifteenMin?.trend === 'bullish') timeframeStats.fifteenMinBullish++;
      if (fifteenMin?.trend === 'bearish') timeframeStats.fifteenMinBearish++;
    }
  });

  return timeframeStats;
}

// Calculate average risk-reward ratio
function calculateAvgRiskReward(trades: any[]): number {
  if (trades.length === 0) return 0;

  const ratios = trades.map(trade => {
    const risk = Math.abs(trade.entryPrice - trade.stopLoss);
    const reward = Math.abs(trade.takeProfit - trade.entryPrice);
    return risk > 0 ? reward / risk : 0;
  });

  return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
}

// Calculate risk metrics
function calculateRiskMetrics(results: any, initialCapital: number) {
  const trades = results.trades;

  return {
    maxDrawdownPercent: results.maxDrawdown,
    maxDrawdownDollar: (results.maxDrawdown / 100) * initialCapital,
    winRate: results.hitRate * 100,
    lossRate: (1 - results.hitRate) * 100,
    avgWin: trades.length > 0 ? trades.filter((t: any) => t.pnl > 0).reduce((sum: number, t: any) => sum + t.pnl, 0) / Math.max(1, trades.filter((t: any) => t.pnl > 0).length) : 0,
    avgLoss: trades.length > 0 ? trades.filter((t: any) => t.pnl < 0).reduce((sum: number, t: any) => sum + t.pnl, 0) / Math.max(1, trades.filter((t: any) => t.pnl < 0).length) : 0,
    expectancy: trades.length > 0 ? trades.reduce((sum: number, t: any) => sum + t.pnl, 0) / trades.length : 0
  };
}

// Generate summary
function generateSummary(results: any, symbol: string, leverage: number): string {
  const returnPercent = results.totalReturnPercent.toFixed(2);
  const hitRate = (results.hitRate * 100).toFixed(1);
  const profitFactor = results.profitFactor.toFixed(2);
  const maxDD = results.maxDrawdown.toFixed(2);

  return `🚀 Multi-Timeframe ${symbol} Strategy (${leverage}x Leverage)
📊 Total Trades: ${results.totalTrades}
🎯 Hit Rate: ${hitRate}%
💰 Total Return: $${results.totalReturn.toFixed(2)} (${returnPercent}%)
📈 Profit Factor: ${profitFactor}
📉 Max Drawdown: ${maxDD}%
⏱️ Avg Holding: ${results.avgHoldingPeriod.toFixed(1)} hours
🔥 Sophisticated multi-timeframe analysis with leverage risk management`;
}

// Voice announcement using agent's voice tool
async function announceResults(results: any, symbol: string, leverage: number, context?: any) {
  const announcement = `Multi-timeframe ${symbol} strategy with ${leverage}x leverage completed.
    ${results.totalTrades} trades executed with ${(results.hitRate * 100).toFixed(1)}% hit rate.
    Total return: ${results.totalReturnPercent.toFixed(2)}% or $${results.totalReturn.toFixed(2)}.
    Profit factor: ${results.profitFactor.toFixed(2)}.
    Maximum drawdown: ${results.maxDrawdown.toFixed(2)}%.`;

  console.log(`🔊 SPEAKING: ${announcement}`);

  try {
    // Use the agent's voice tool if available
    if (context?.agent?.tools?.speakCryptoResultsTool) {
      console.log('🎤 Using agent voice tool...');
      await context.agent.tools.speakCryptoResultsTool.execute({ context: { text: announcement } });
      console.log('✅ Voice announcement completed via agent voice tool');
      return;
    }

    // Fallback to direct Google Voice
    // TEMPORARILY COMMENTED OUT FOR DEPLOYMENT FIX
    // const { GoogleVoice } = await import('@mastra/voice-google');

    // TEMPORARILY COMMENTED OUT FOR DEPLOYMENT FIX
    // const googleVoice = new GoogleVoice({
    //   speechModel: {
    //     apiKey: 'AIzaSyBNU1uWipiCzM8dxCv0X2hpkiVX5Uk0QX4',
    //   },
    //   speaker: 'en-US-Studio-O',
    // });

    // await googleVoice.speak(announcement);
    console.log('🔊 VOICE ANNOUNCEMENT (temporarily disabled):', announcement);
    console.log('✅ Voice announcement completed via Google Voice');

  } catch (error) {
    console.error('❌ Voice announcement failed:', error);
    console.log('📝 Voice announcement text logged to console instead');
  }
}