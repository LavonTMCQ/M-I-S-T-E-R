import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/backtest/fibonacci
 * Run a real backtest using the Fibonacci 15-minute strategy
 */
export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, symbol = 'ADAUSD' } = await request.json();

    console.log('🔢 Running Fibonacci strategy backtest...');
    console.log(`📊 Parameters: ${symbol} from ${startDate} to ${endDate}`);

    // Get real historical data from Kraken for the specified period
    const historicalData = await getHistoricalADAData(startDate, endDate);
    
    if (!historicalData || historicalData.length === 0) {
      throw new Error('Failed to fetch historical data');
    }

    console.log(`📈 Loaded ${historicalData.length} 15-minute candles for backtesting`);

    // Run the Fibonacci strategy simulation
    const backtestResults = await runFibonacciBacktest(historicalData, startDate, endDate);

    return NextResponse.json({
      success: true,
      strategy: 'Fibonacci Retracement Strategy',
      symbol,
      timeframe: '15m',
      startDate,
      endDate,
      ...backtestResults
    });

  } catch (error) {
    console.error('❌ Fibonacci backtest failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * Get historical OHLCV data from Kraken API
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
 * Run Fibonacci retracement strategy backtest on historical data
 */
async function runFibonacciBacktest(chartData: any[], startDate: string, endDate: string) {
  const trades: any[] = [];
  let currentPosition: any = null;
  let totalPnl = 0;
  let maxDrawdown = 0;
  let peakValue = 0;
  let currentDrawdown = 0;
  
  // Fibonacci calculation parameters
  const lookbackPeriod = 50; // Look back 50 candles for swing points
  const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
  
  console.log('🔢 Starting Fibonacci strategy simulation...');
  
  for (let i = lookbackPeriod; i < chartData.length - 1; i++) {
    const currentCandle = chartData[i];
    const currentPrice = currentCandle.close;
    
    // Find swing high and low in lookback period
    const lookbackData = chartData.slice(i - lookbackPeriod, i);
    const swingHigh = Math.max(...lookbackData.map(c => c.high));
    const swingLow = Math.min(...lookbackData.map(c => c.low));
    
    // Calculate Fibonacci levels
    const range = swingHigh - swingLow;
    const fibPrices = fibLevels.map(ratio => swingHigh - (range * ratio));
    
    // Trading logic
    if (!currentPosition) {
      // Look for entry signals
      
      // LONG signal: Price bounces from 61.8% or 50% support
      const fib618 = fibPrices[4]; // 61.8%
      const fib50 = fibPrices[3];  // 50%
      
      if (currentPrice <= fib618 * 1.005 && currentPrice >= fib618 * 0.995) {
        // Enter LONG at 61.8% Fibonacci support
        currentPosition = {
          id: `fib_trade_${trades.length + 1}`,
          side: 'LONG',
          entryTime: currentCandle.time,
          entryPrice: currentPrice,
          size: 50000 / currentPrice, // $50k position
          reason: 'Bounce from 61.8% Fibonacci support'
        };
      } else if (currentPrice <= fib50 * 1.005 && currentPrice >= fib50 * 0.995) {
        // Enter LONG at 50% Fibonacci support
        currentPosition = {
          id: `fib_trade_${trades.length + 1}`,
          side: 'LONG',
          entryTime: currentCandle.time,
          entryPrice: currentPrice,
          size: 50000 / currentPrice,
          reason: 'Bounce from 50% Fibonacci support'
        };
      }
      
      // SHORT signal: Price rejects from 23.6% resistance
      const fib236 = fibPrices[1]; // 23.6%
      
      if (currentPrice >= fib236 * 0.995 && currentPrice <= fib236 * 1.005) {
        currentPosition = {
          id: `fib_trade_${trades.length + 1}`,
          side: 'SHORT',
          entryTime: currentCandle.time,
          entryPrice: currentPrice,
          size: 50000 / currentPrice,
          reason: 'Rejection at 23.6% Fibonacci resistance'
        };
      }
    } else {
      // Look for exit signals
      let shouldExit = false;
      let exitReason = '';
      
      if (currentPosition.side === 'LONG') {
        // Exit LONG at 23.6% resistance or stop loss
        const fib236 = fibPrices[1];
        const stopLoss = currentPosition.entryPrice * 0.97; // 3% stop loss
        
        if (currentPrice >= fib236 * 0.995) {
          shouldExit = true;
          exitReason = 'Take profit at 23.6% Fibonacci resistance';
        } else if (currentPrice <= stopLoss) {
          shouldExit = true;
          exitReason = 'Stop loss hit';
        }
      } else if (currentPosition.side === 'SHORT') {
        // Exit SHORT at 50% support or stop loss
        const fib50 = fibPrices[3];
        const stopLoss = currentPosition.entryPrice * 1.03; // 3% stop loss
        
        if (currentPrice <= fib50 * 1.005) {
          shouldExit = true;
          exitReason = 'Take profit at 50% Fibonacci support';
        } else if (currentPrice >= stopLoss) {
          shouldExit = true;
          exitReason = 'Stop loss hit';
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
  
  console.log(`✅ Fibonacci backtest completed:`);
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
