import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/backtest/multi-timeframe
 * Run a real backtest using the Multi-Timeframe strategy (COPIED FROM FIBONACCI APPROACH)
 */
export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, symbol = 'ADAUSD' } = await request.json();

    console.log('🔢 Running Multi-Timeframe strategy backtest...');

    // If no dates provided, use recent 30-day period like Fibonacci
    const actualEndDate = endDate || new Date().toISOString();
    const actualStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`📊 Parameters: ${symbol} from ${actualStartDate} to ${actualEndDate}`);

    // Get real historical data from Kraken for the specified period (SAME AS FIBONACCI)
    const historicalData = await getHistoricalADAData(actualStartDate, actualEndDate);

    if (!historicalData || historicalData.length === 0) {
      throw new Error('Failed to fetch historical data');
    }

    console.log(`📈 Loaded ${historicalData.length} 15-minute candles for backtesting`);

    // Run the Multi-Timeframe strategy simulation (SAME PATTERN AS FIBONACCI)
    const backtestResults = await runMultiTimeframeBacktest(historicalData, actualStartDate, actualEndDate);

    return NextResponse.json({
      success: true,
      strategy: 'Multi-Timeframe ADA Strategy',
      symbol,
      timeframe: '15m',
      startDate: actualStartDate,
      endDate: actualEndDate,
      ...backtestResults
    });

  } catch (error) {
    console.error('❌ Multi-Timeframe backtest failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * Get historical OHLCV data from Kraken API (COPIED FROM FIBONACCI)
 */
async function getHistoricalADAData(startDate: string, endDate: string) {
  try {
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    // Kraken API for 15-minute OHLC data
    const url = `https://api.kraken.com/0/public/OHLC?pair=ADAUSD&interval=15&since=${startTimestamp}`;

    console.log('🌐 Fetching historical data from Kraken:', url);

    const response = await fetch(url);
    const data = await response.json();

    if (!data.result || !data.result.ADAUSD) {
      throw new Error('Invalid response from Kraken API');
    }

    const ohlcData = data.result.ADAUSD;

    // Convert to our format and filter by date range
    const chartData = ohlcData
      .map((candle: any[]) => ({
        timestamp: candle[0] * 1000,
        time: new Date(candle[0] * 1000).toISOString(),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[6])
      }))
      .filter((candle: any) => {
        const candleTime = new Date(candle.time).getTime();
        return candleTime >= new Date(startDate).getTime() &&
               candleTime <= new Date(endDate).getTime();
      });

    console.log(`✅ Processed ${chartData.length} candles for backtest period`);
    return chartData;

  } catch (error) {
    console.error('❌ Failed to fetch historical data:', error);
    throw error;
  }
}

/**
 * Run Multi-Timeframe backtest simulation (BASED ON FIBONACCI BUT WITH MULTI-TIMEFRAME LOGIC)
 */
async function runMultiTimeframeBacktest(chartData: any[], startDate: string, endDate: string) {
  const trades: any[] = [];
  let currentPosition: any = null;
  let totalPnl = 0;
  let maxDrawdown = 0;
  let currentCapital = 5000;

  console.log('🔄 Starting Multi-Timeframe strategy simulation...');

  // Multi-timeframe parameters
  const rsiPeriod = 21;
  const macdFast = 8;
  const macdSlow = 21;
  const leverage = 10;

  for (let i = 50; i < chartData.length - 1; i++) {
    const currentCandle = chartData[i];
    const currentPrice = currentCandle.close;

    // Calculate indicators
    const rsi = calculateRSI(chartData.slice(i - rsiPeriod, i));
    const macd = calculateMACD(chartData.slice(i - macdSlow - 10, i), macdFast, macdSlow, 5);
    const sma20 = calculateSMA(chartData.slice(i - 20, i), 20);

    // Multi-timeframe confluence scoring
    let confluenceScore = 0;

    // RSI signals
    if (rsi < 30) confluenceScore += 2; // Oversold
    if (rsi > 70) confluenceScore -= 2; // Overbought

    // MACD signals
    if (macd.histogram > 0) confluenceScore += 1.5; // Bullish momentum
    if (macd.histogram < 0) confluenceScore -= 1.5; // Bearish momentum

    // Trend filter
    if (currentPrice > sma20) confluenceScore += 1; // Uptrend
    if (currentPrice < sma20) confluenceScore -= 1; // Downtrend

    // Volume confirmation
    const avgVolume = chartData.slice(i - 10, i).reduce((sum, c) => sum + c.volume, 0) / 10;
    if (currentCandle.volume > avgVolume * 1.2) confluenceScore += 0.5;

    // Entry logic
    if (!currentPosition && Math.abs(confluenceScore) >= 4.0) {
      const isLong = confluenceScore > 0;
      const riskAmount = currentCapital * 0.03; // 3% risk
      const positionSize = (riskAmount * leverage) / currentPrice;

      currentPosition = {
        type: isLong ? 'LONG' : 'SHORT',
        entryPrice: currentPrice,
        entryTime: currentCandle.time,
        size: positionSize,
        stopLoss: isLong ? currentPrice * 0.97 : currentPrice * 1.03,
        takeProfit: isLong ? currentPrice * 1.06 : currentPrice * 0.94,
        confluenceScore: Math.abs(confluenceScore)
      };
    }

    // Exit logic
    if (currentPosition) {
      let exitReason = '';
      let exitPrice = currentPrice;

      if (currentPosition.type === 'LONG') {
        if (currentPrice <= currentPosition.stopLoss) {
          exitReason = 'Stop Loss';
          exitPrice = currentPosition.stopLoss;
        } else if (currentPrice >= currentPosition.takeProfit) {
          exitReason = 'Take Profit';
          exitPrice = currentPosition.takeProfit;
        }
      } else {
        if (currentPrice >= currentPosition.stopLoss) {
          exitReason = 'Stop Loss';
          exitPrice = currentPosition.stopLoss;
        } else if (currentPrice <= currentPosition.takeProfit) {
          exitReason = 'Take Profit';
          exitPrice = currentPosition.takeProfit;
        }
      }

      if (exitReason) {
        const pnlPercent = currentPosition.type === 'LONG'
          ? ((exitPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * 100
          : ((currentPosition.entryPrice - exitPrice) / currentPosition.entryPrice) * 100;

        const pnlDollar = (pnlPercent / 100) * (currentPosition.size * currentPosition.entryPrice) * leverage;
        totalPnl += pnlDollar;
        currentCapital += pnlDollar;

        trades.push({
          id: trades.length + 1,
          type: currentPosition.type,
          entryTime: currentPosition.entryTime,
          exitTime: currentCandle.time,
          entryPrice: currentPosition.entryPrice,
          exitPrice: exitPrice,
          size: currentPosition.size,
          pnl: pnlDollar,
          pnlPercent: pnlPercent,
          exitReason: exitReason,
          confluenceScore: currentPosition.confluenceScore
        });

        currentPosition = null;
      }
    }
  }

  // Calculate performance metrics
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

  console.log(`✅ Multi-Timeframe backtest completed: ${trades.length} trades, ${winRate.toFixed(1)}% win rate, $${totalPnl.toFixed(2)} total P&L`);

  // Calculate additional metrics to match Fibonacci pattern
  const avgTradeDuration = calculateAvgHoldingPeriod(trades) * 60; // Convert to minutes
  const sharpeRatio = calculateSharpeRatio(trades);

  // Format trades to match Fibonacci structure
  const formattedTrades = trades.map(trade => ({
    id: `mt_trade_${trade.id}`,
    entryTime: trade.entryTime,
    exitTime: trade.exitTime,
    side: trade.type, // 'LONG' or 'SHORT'
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    size: trade.size,
    netPnl: trade.pnl,
    reason: `Multi-timeframe ${trade.type} signal (confluence: ${trade.confluenceScore?.toFixed(1) || 'N/A'})`,
    duration: Math.floor((new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime()) / (1000 * 60))
  }));

  return {
    totalNetPnl: totalPnl,
    winRate: winRate,
    maxDrawdown: calculateMaxDrawdown(trades),
    sharpeRatio: sharpeRatio,
    totalTrades: trades.length,
    avgTradeDuration: avgTradeDuration,
    trades: formattedTrades, // CRITICAL for chart rendering
    chartData: chartData, // CRITICAL for chart rendering
    performance: {
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgWin: avgWin,
      avgLoss: avgLoss,
      profitFactor: profitFactor,
      totalReturn: ((currentCapital - 5000) / 5000) * 100
    }
  };
}

/**
 * Helper calculation functions (COPIED FROM FIBONACCI)
 */
function calculateRSI(data: any[], period: number = 14): number {
  if (data.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i < period + 1; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(data: any[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
  if (data.length < slowPeriod) return { macd: 0, signal: 0, histogram: 0 };

  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  const macd = fastEMA - slowEMA;

  // Simplified signal line
  const signal = macd * 0.9;
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

function calculateEMA(data: any[], period: number): number {
  if (data.length === 0) return 0;

  const multiplier = 2 / (period + 1);
  let ema = data[0].close;

  for (let i = 1; i < data.length; i++) {
    ema = (data[i].close * multiplier) + (ema * (1 - multiplier));
  }

  return ema;
}

function calculateSMA(data: any[], period: number): number {
  if (data.length < period) return data[data.length - 1]?.close || 0;

  const sum = data.slice(-period).reduce((sum, candle) => sum + candle.close, 0);
  return sum / period;
}

function calculateMaxDrawdown(trades: any[]): number {
  if (trades.length === 0) return 0;

  let peak = 5000;
  let maxDrawdown = 0;
  let runningCapital = 5000;

  for (const trade of trades) {
    runningCapital += trade.pnl;
    if (runningCapital > peak) peak = runningCapital;
    const drawdown = ((peak - runningCapital) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}

function calculateAvgHoldingPeriod(trades: any[]): number {
  if (trades.length === 0) return 0;

  const totalHours = trades.reduce((sum, trade) => {
    const entryTime = new Date(trade.entryTime).getTime();
    const exitTime = new Date(trade.exitTime).getTime();
    return sum + (exitTime - entryTime) / (1000 * 60 * 60);
  }, 0);

  return totalHours / trades.length;
}

function calculateSharpeRatio(trades: any[]): number {
  if (trades.length === 0) return 0;

  const returns = trades.map(t => (t.pnl / 5000) * 100); // % returns
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);

  return stdDev > 0 ? avgReturn / stdDev : 0;
}
