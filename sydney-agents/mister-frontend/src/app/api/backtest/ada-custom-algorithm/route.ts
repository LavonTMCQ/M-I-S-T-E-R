import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/backtest/ada-custom-algorithm
 * Run ADA Custom Algorithm backtest using the same approach as Fibonacci (real Kraken data)
 */
export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, symbol = 'ADAUSD' } = await request.json();

    console.log('🎯 Running ADA Custom Algorithm backtest...');
    console.log(`📊 Parameters: ${symbol} from ${startDate} to ${endDate}`);

    // Get real historical data from Kraken for the specified period (same as Fibonacci)
    const historicalData = await getHistoricalADAData(startDate, endDate);
    
    if (!historicalData || historicalData.length === 0) {
      throw new Error('Failed to fetch historical data');
    }

    console.log(`📈 Loaded ${historicalData.length} 15-minute candles for ADA Custom Algorithm backtesting`);

    // Run the ADA Custom Algorithm simulation
    const backtestResults = await runADACustomAlgorithmBacktest(historicalData);

    return NextResponse.json({
      success: true,
      strategy: 'ADA Custom Algorithm',
      symbol,
      timeframe: '15m',
      startDate,
      endDate,
      ...backtestResults
    });

  } catch (error) {
    console.error('❌ ADA Custom Algorithm backtest failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * Get historical OHLCV data from Kraken API (same as Fibonacci strategy)
 */
async function getHistoricalADAData(startDate: string, endDate: string) {
  try {
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    
    // Kraken API for 15-minute OHLC data (identical to Fibonacci)
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
    
    console.log(`✅ Processed ${chartData.length} candles for ADA Custom Algorithm backtest period`);
    return chartData;
    
  } catch (error) {
    console.error('❌ Failed to fetch historical data:', error);
    throw error;
  }
}

/**
 * Run ADA Custom Algorithm backtest on historical data with Tomorrow Labs Strategy
 */
async function runADACustomAlgorithmBacktest(chartData: any[]) {
  const trades: any[] = [];
  let currentPosition: any = null;
  let totalPnl = 0;
  let maxDrawdown = 0;
  let peakValue = 0;
  let currentDrawdown = 0;
  
  // ADA Custom Algorithm parameters (Tomorrow Labs Strategy)
  const rsiPeriod = 14;
  const bbPeriod = 20;
  const bbStdDev = 2;
  const volumePeriod = 20;
  
  console.log('🎯 Starting ADA Custom Algorithm simulation (Tomorrow Labs Strategy)...');
  
  // Calculate indicators for each candle
  for (let i = Math.max(rsiPeriod, bbPeriod, volumePeriod); i < chartData.length - 1; i++) {
    const currentCandle = chartData[i];
    const currentPrice = currentCandle.close;
    
    // Calculate RSI
    const rsi = calculateRSI(chartData, i, rsiPeriod);
    
    // Calculate Bollinger Bands
    const bb = calculateBollingerBands(chartData, i, bbPeriod, bbStdDev);
    
    // Calculate Volume moving average
    const volumeSMA = calculateVolumeSMA(chartData, i, volumePeriod);
    const volumeRatio = currentCandle.volume / volumeSMA;
    
    // Trading logic (Tomorrow Labs Strategy)
    if (!currentPosition) {
      // LONG signal: RSI oversold + price at/below BB lower + volume spike
      if (rsi < 30 && currentPrice <= bb.lower * 1.01 && volumeRatio > 1.5) {
        currentPosition = {
          id: `ada_trade_${trades.length + 1}`,
          side: 'LONG',
          entryTime: currentCandle.time,
          entryPrice: currentPrice,
          size: 50000 / currentPrice, // $50k position
          reason: `RSI oversold (${rsi.toFixed(1)}) + BB lower bounce + volume spike (${volumeRatio.toFixed(1)}x)`
        };
      }
      
      // SHORT signal: RSI overbought + price at/above BB upper + volume spike  
      else if (rsi > 70 && currentPrice >= bb.upper * 0.99 && volumeRatio > 1.5) {
        currentPosition = {
          id: `ada_trade_${trades.length + 1}`,
          side: 'SHORT',
          entryTime: currentCandle.time,
          entryPrice: currentPrice,
          size: 50000 / currentPrice,
          reason: `RSI overbought (${rsi.toFixed(1)}) + BB upper rejection + volume spike (${volumeRatio.toFixed(1)}x)`
        };
      }
    } else {
      // Look for exit signals
      let shouldExit = false;
      let exitReason = '';
      
      if (currentPosition.side === 'LONG') {
        // Exit LONG: Take profit (8%) or stop loss (4%)
        const takeProfit = currentPosition.entryPrice * 1.08;
        const stopLoss = currentPosition.entryPrice * 0.96;
        
        if (currentPrice >= takeProfit) {
          shouldExit = true;
          exitReason = 'Take profit hit (8%)';
        } else if (currentPrice <= stopLoss) {
          shouldExit = true;
          exitReason = 'Stop loss hit (4%)';
        } else if (rsi > 65) {
          shouldExit = true;
          exitReason = 'RSI exit signal (overbought)';
        }
      } else if (currentPosition.side === 'SHORT') {
        // Exit SHORT: Take profit (8%) or stop loss (4%)
        const takeProfit = currentPosition.entryPrice * 0.92;
        const stopLoss = currentPosition.entryPrice * 1.04;
        
        if (currentPrice <= takeProfit) {
          shouldExit = true;
          exitReason = 'Take profit hit (8%)';
        } else if (currentPrice >= stopLoss) {
          shouldExit = true;
          exitReason = 'Stop loss hit (4%)';
        } else if (rsi < 35) {
          shouldExit = true;
          exitReason = 'RSI exit signal (oversold)';
        }
      }
      
      if (shouldExit) {
        // Calculate P&L
        let pnl = 0;
        if (currentPosition.side === 'LONG') {
          pnl = (currentPrice - currentPosition.entryPrice) * currentPosition.size;
        } else {
          pnl = (currentPosition.entryPrice - currentPrice) * currentPosition.size;
        }
        
        const trade = {
          ...currentPosition,
          exitTime: currentCandle.time,
          exitPrice: currentPrice,
          netPnl: pnl,
          reason: exitReason,
          duration: Math.floor((new Date(currentCandle.time).getTime() - 
                               new Date(currentPosition.entryTime).getTime()) / (1000 * 60))
        };
        
        trades.push(trade);
        totalPnl += pnl;
        
        // Update drawdown calculation
        if (totalPnl > peakValue) {
          peakValue = totalPnl;
          currentDrawdown = 0;
        } else {
          currentDrawdown = ((peakValue - totalPnl) / Math.max(peakValue, 50000)) * 100;
          maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
        }
        
        currentPosition = null;
      }
    }
  }
  
  // Calculate performance metrics
  const winningTrades = trades.filter(t => t.netPnl > 0);
  const losingTrades = trades.filter(t => t.netPnl < 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  
  const avgWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + t.netPnl, 0) / winningTrades.length 
    : 0;
  const avgLoss = losingTrades.length > 0 
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.netPnl, 0) / losingTrades.length)
    : 0;
  
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
  const avgTradeDuration = trades.length > 0 
    ? trades.reduce((sum, t) => sum + (t.duration || 0), 0) / trades.length 
    : 0;
  
  const sharpeRatio = calculateSharpeRatio(trades);
  
  console.log(`✅ ADA Custom Algorithm backtest completed:`);
  console.log(`📊 Total Trades: ${trades.length}`);
  console.log(`💰 Total P&L: $${totalPnl.toFixed(2)}`);
  console.log(`🎯 Win Rate: ${winRate.toFixed(1)}%`);
  console.log(`📉 Max Drawdown: ${maxDrawdown.toFixed(1)}%`);
  
  return {
    totalNetPnl: totalPnl,
    winRate: winRate,
    maxDrawdown: maxDrawdown,
    sharpeRatio: sharpeRatio,
    totalTrades: trades.length,
    avgTradeDuration: avgTradeDuration,
    trades: trades,
    chartData: chartData,
    performance: {
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgWin: avgWin,
      avgLoss: avgLoss,
      profitFactor: profitFactor,
      totalReturn: (totalPnl / 50000) * 100
    }
  };
}

/**
 * Calculate RSI indicator
 */
function calculateRSI(data: any[], index: number, period: number): number {
  if (index < period) return 50; // Default neutral RSI
  
  let gains = 0;
  let losses = 0;
  
  for (let i = index - period + 1; i <= index; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate Bollinger Bands
 */
function calculateBollingerBands(data: any[], index: number, period: number, stdDev: number) {
  if (index < period - 1) {
    return { upper: data[index].close * 1.02, middle: data[index].close, lower: data[index].close * 0.98 };
  }
  
  // Calculate SMA
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    sum += data[i].close;
  }
  const sma = sum / period;
  
  // Calculate standard deviation
  let variance = 0;
  for (let i = index - period + 1; i <= index; i++) {
    variance += Math.pow(data[i].close - sma, 2);
  }
  const std = Math.sqrt(variance / period);
  
  return {
    upper: sma + (stdDev * std),
    middle: sma,
    lower: sma - (stdDev * std)
  };
}

/**
 * Calculate Volume SMA
 */
function calculateVolumeSMA(data: any[], index: number, period: number): number {
  if (index < period - 1) return data[index].volume;
  
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    sum += data[i].volume;
  }
  return sum / period;
}

/**
 * Calculate Sharpe ratio for the trading strategy
 */
function calculateSharpeRatio(trades: any[]): number {
  if (trades.length < 2) return 0;
  
  const returns = trades.map(t => (t.netPnl / 50000) * 100); // Convert to percentage returns
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  return stdDev > 0 ? avgReturn / stdDev : 0;
}
