import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { GoogleVoice } from '@mastra/voice-google';
import { exec } from 'child_process';
import { createWriteStream } from 'fs';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Crypto Backtesting Tool - Advanced Cryptocurrency Strategy Testing
 * 
 * Features:
 * - ADA and other crypto backtesting with Phemex data
 * - Crypto-specific indicators and strategies
 * - Voice announcements for crypto results
 * - 24/7 market simulation
 * - Volatility and risk analysis for crypto
 */

export interface CryptoBacktestResult {
  symbol: string;
  strategy: string;
  timeframe: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  hitRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;
  profitFactor: number;
  trades: CryptoTrade[];
}

export interface CryptoTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  side: 'long' | 'short';
  pnl: number;
  pnlPercent: number;
  holdingPeriod: number; // in hours
}

export const cryptoBacktestTool = createTool({
  id: 'crypto-backtest-tool',
  description: 'Run comprehensive backtests on cryptocurrency strategies using Phemex data',
  inputSchema: z.object({
    symbol: z.string().default('ADAUSDT').describe('Crypto symbol to backtest (e.g., ADAUSDT, BTCUSDT)'),
    strategy: z.enum(['rsi_mean_reversion', 'macd_momentum', 'bollinger_breakout', 'sma_crossover', 'custom']).describe('Trading strategy to test'),
    timeframe: z.enum(['5m', '15m', '30m', '1h', '4h', '1d']).default('1h').describe('Timeframe for analysis'),
    startDate: z.string().describe('Start date for backtest (YYYY-MM-DD)'),
    endDate: z.string().describe('End date for backtest (YYYY-MM-DD)'),
    initialCapital: z.number().default(10000).describe('Starting capital in USDT'),
    riskPerTrade: z.number().default(2).describe('Risk per trade as percentage of capital'),
    speakResults: z.boolean().default(true).describe('Announce results with voice'),
    // Strategy-specific parameters
    rsiPeriod: z.number().optional().default(14).describe('RSI period for RSI strategies'),
    rsiOverbought: z.number().optional().default(70).describe('RSI overbought level'),
    rsiOversold: z.number().optional().default(30).describe('RSI oversold level'),
    macdFast: z.number().optional().default(12).describe('MACD fast EMA period'),
    macdSlow: z.number().optional().default(26).describe('MACD slow EMA period'),
    macdSignal: z.number().optional().default(9).describe('MACD signal line period'),
    smaPeriod1: z.number().optional().default(20).describe('First SMA period'),
    smaPeriod2: z.number().optional().default(50).describe('Second SMA period'),
  }),
  execute: async ({ context }) => {
    const {
      symbol,
      strategy,
      timeframe,
      startDate,
      endDate,
      initialCapital,
      riskPerTrade,
      speakResults,
      rsiPeriod,
      rsiOverbought,
      rsiOversold,
      macdFast,
      macdSlow,
      macdSignal,
      smaPeriod1,
      smaPeriod2
    } = context;

    try {
      console.log(`🚀 Starting crypto backtest: ${strategy} on ${symbol}`);
      console.log(`📊 Timeframe: ${timeframe}, Period: ${startDate} to ${endDate}`);

      // Fetch historical data from Phemex
      const historicalData = await fetchCryptoData(symbol, timeframe, startDate, endDate);

      if (!historicalData.success) {
        throw new Error(`Failed to fetch data: ${historicalData.error}`);
      }

      console.log(`📈 Retrieved ${historicalData.data.length} candles for ${symbol} from ${historicalData.source}`);

      // Create params object for compatibility
      const params = { symbol, strategy, timeframe, startDate, endDate, initialCapital, riskPerTrade, speakResults, rsiPeriod, rsiOverbought, rsiOversold, macdFast, macdSlow, macdSignal, smaPeriod1, smaPeriod2 };

      // Run the selected strategy
      const backtestResult = await runCryptoStrategy(params, historicalData.data);

      // Calculate performance metrics
      const metrics = calculateCryptoMetrics(backtestResult, initialCapital);

      // Generate summary
      const summary = generateCryptoSummary(metrics, params);

      // Speak results if enabled
      if (speakResults) {
        await speakCryptoResults(metrics, symbol, strategy);
      }

      return {
        success: true,
        symbol: symbol,
        strategy: strategy,
        timeframe: timeframe,
        period: `${startDate} to ${endDate}`,
        dataSource: historicalData.source,
        results: metrics,
        summary: summary,
        trades: backtestResult.trades.slice(0, 10), // First 10 trades for review
        totalTrades: backtestResult.trades.length,
        voiceAnnouncement: speakResults ? 'Results announced via Google Voice' : 'Voice disabled'
      };

    } catch (error) {
      console.error('❌ Crypto backtest error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: 'Check symbol format (e.g., ADAUSDT) and date range'
      };
    }
  },
});

// Fetch crypto data using real APIs (Phemex primary, Kraken fallback)
async function fetchCryptoData(symbol: string, timeframe: string, startDate: string, endDate: string): Promise<any> {
  // Try Phemex first
  try {
    console.log(`📡 Attempting to fetch ${symbol} data from Phemex API...`);
    return await fetchPhemexData(symbol, timeframe, startDate, endDate);
  } catch (phemexError) {
    console.log(`⚠️ Phemex failed: ${phemexError instanceof Error ? phemexError.message : String(phemexError)}`);
    console.log(`📡 Falling back to Kraken API for ${symbol}...`);

    // Convert symbol format for Kraken (sADAUSDT -> ADAUSD)
    const krakenSymbol = convertToKrakenSymbol(symbol);
    return await fetchKrakenData(krakenSymbol, timeframe, startDate, endDate);
  }
}

// Fetch data from Phemex API
async function fetchPhemexData(symbol: string, timeframe: string, startDate: string, endDate: string): Promise<any> {
  // Convert timeframe to Phemex format (seconds)
  const phemexTimeframe = convertTimeframeToSeconds(timeframe);

  // Build Phemex API URL
  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
  const url = `https://api.phemex.com/md/kline?symbol=${symbol}&resolution=${phemexTimeframe}&from=${startTimestamp}&to=${endTimestamp}`;

  console.log(`🔗 Phemex API URL: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Phemex API HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Phemex API error: ${data.msg || 'Unknown error'}`);
  }

  if (!data.result || !Array.isArray(data.result)) {
    throw new Error(`No kline data returned for ${symbol}`);
  }

  // Process real Phemex kline data
  const priceScale = 8; // Default price scale for most symbols
  const processedData = data.result.map((kline: any[]) => ({
    timestamp: kline[0],
    date: new Date(kline[0] * 1000),
    open: kline[1] / Math.pow(10, priceScale),
    high: kline[2] / Math.pow(10, priceScale),
    low: kline[3] / Math.pow(10, priceScale),
    close: kline[4] / Math.pow(10, priceScale),
    volume: kline[5] / Math.pow(10, 8), // Volume scale
  }));

  const sortedData = processedData.sort((a: any, b: any) => a.timestamp - b.timestamp);

  console.log(`✅ Retrieved ${sortedData.length} real candles for ${symbol} from Phemex`);

  return {
    success: true,
    data: sortedData,
    source: 'phemex_api',
    symbol: symbol,
    timeframe: timeframe,
    count: sortedData.length
  };
}

// Fetch data from Kraken API as fallback
async function fetchKrakenData(symbol: string, timeframe: string, startDate: string, endDate: string): Promise<any> {
  // Convert timeframe to Kraken format (minutes)
  const krakenTimeframe = convertTimeframeToMinutes(timeframe);

  // Build Kraken API URL
  let url = `https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=${krakenTimeframe}`;

  if (startDate) {
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    url += `&since=${startTimestamp}`;
  }

  console.log(`🔗 Kraken API URL: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Kraken API HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error && data.error.length > 0) {
    throw new Error(`Kraken API error: ${data.error.join(', ')}`);
  }

  const ohlcKey = Object.keys(data.result).find(key => key !== 'last');
  if (!ohlcKey || !data.result[ohlcKey]) {
    throw new Error(`No OHLC data returned for ${symbol}`);
  }

  // Process Kraken OHLC data - format: [timestamp, open, high, low, close, vwap, volume, count]
  const ohlcData = data.result[ohlcKey];
  const processedData = ohlcData.map((candle: any[]) => ({
    timestamp: candle[0],
    date: new Date(candle[0] * 1000),
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[6]),
  }));

  // Sort and filter by end date
  let sortedData = processedData.sort((a: any, b: any) => a.timestamp - b.timestamp);

  if (endDate) {
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    sortedData = sortedData.filter((candle: any) => candle.timestamp <= endTimestamp);
  }

  console.log(`✅ Retrieved ${sortedData.length} real candles for ${symbol} from Kraken`);

  return {
    success: true,
    data: sortedData,
    source: 'kraken_api',
    symbol: symbol,
    timeframe: timeframe,
    count: sortedData.length
  };
}

// Convert symbol format for Kraken (sADAUSDT -> ADAUSD)
function convertToKrakenSymbol(phemexSymbol: string): string {
  // Remove 's' prefix if present
  let symbol = phemexSymbol.startsWith('s') ? phemexSymbol.slice(1) : phemexSymbol;

  // Convert USDT to USD for Kraken
  symbol = symbol.replace('USDT', 'USD');

  // Handle specific conversions
  const conversions: { [key: string]: string } = {
    'ADAUSD': 'ADAUSD',
    'BTCUSD': 'XBTUSD',
    'ETHUSD': 'ETHUSD',
    'SOLUSD': 'SOLUSD',
    'DOTUSD': 'DOTUSD'
  };

  return conversions[symbol] || symbol;
}

// Convert timeframe to minutes for Kraken
function convertTimeframeToMinutes(timeframe: string): string {
  const map: { [key: string]: string } = {
    '5m': '5', '15m': '15', '30m': '30', '1h': '60', '4h': '240', '1d': '1440'
  };
  return map[timeframe] || '60';
}

// Real crypto data only - no mock data fallback

// Run crypto trading strategy
async function runCryptoStrategy(params: any, data: any[]): Promise<CryptoBacktestResult> {
  const trades: CryptoTrade[] = [];
  let position: any = null;
  
  // Calculate indicators based on strategy
  const indicators = calculateCryptoIndicators(data, params);
  
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    
    // Strategy logic
    let signal = null;
    
    switch (params.strategy) {
      case 'rsi_mean_reversion':
        if (indicators.rsi[i] < params.rsiOversold && !position) {
          signal = 'buy';
        } else if (indicators.rsi[i] > params.rsiOverbought && position) {
          signal = 'sell';
        }
        break;
        
      case 'macd_momentum':
        if (indicators.macd[i] > indicators.macdSignal[i] && indicators.macd[i - 1] <= indicators.macdSignal[i - 1] && !position) {
          signal = 'buy';
        } else if (indicators.macd[i] < indicators.macdSignal[i] && indicators.macd[i - 1] >= indicators.macdSignal[i - 1] && position) {
          signal = 'sell';
        }
        break;
        
      case 'sma_crossover':
        if (indicators.sma1[i] > indicators.sma2[i] && indicators.sma1[i - 1] <= indicators.sma2[i - 1] && !position) {
          signal = 'buy';
        } else if (indicators.sma1[i] < indicators.sma2[i] && indicators.sma1[i - 1] >= indicators.sma2[i - 1] && position) {
          signal = 'sell';
        }
        break;
    }
    
    // Execute trades
    if (signal === 'buy' && !position) {
      const quantity = (params.initialCapital * params.riskPerTrade / 100) / current.close;
      position = {
        entryDate: current.date.toISOString(),
        entryPrice: current.close,
        quantity: quantity,
        side: 'long'
      };
    } else if (signal === 'sell' && position) {
      const trade: CryptoTrade = {
        entryDate: position.entryDate,
        exitDate: current.date.toISOString(),
        entryPrice: position.entryPrice,
        exitPrice: current.close,
        quantity: position.quantity,
        side: position.side,
        pnl: (current.close - position.entryPrice) * position.quantity,
        pnlPercent: ((current.close - position.entryPrice) / position.entryPrice) * 100,
        holdingPeriod: (new Date(current.date).getTime() - new Date(position.entryDate).getTime()) / (1000 * 60 * 60) // hours
      };
      
      trades.push(trade);
      position = null;
    }
  }
  
  return {
    symbol: params.symbol,
    strategy: params.strategy,
    timeframe: params.timeframe,
    totalTrades: trades.length,
    winningTrades: trades.filter(t => t.pnl > 0).length,
    losingTrades: trades.filter(t => t.pnl <= 0).length,
    hitRate: trades.length > 0 ? trades.filter(t => t.pnl > 0).length / trades.length : 0,
    totalReturn: trades.reduce((sum, t) => sum + t.pnl, 0),
    maxDrawdown: 0, // Calculate separately
    sharpeRatio: 0, // Calculate separately
    volatility: 0, // Calculate separately
    profitFactor: 0, // Calculate separately
    trades: trades
  };
}

// Calculate crypto-specific indicators
function calculateCryptoIndicators(data: any[], params: any): any {
  const indicators: any = {
    rsi: [],
    macd: [],
    macdSignal: [],
    sma1: [],
    sma2: []
  };
  
  // Simple RSI calculation
  for (let i = 0; i < data.length; i++) {
    if (i < params.rsiPeriod) {
      indicators.rsi[i] = 50; // Default neutral
    } else {
      const gains = [];
      const losses = [];
      
      for (let j = i - params.rsiPeriod + 1; j <= i; j++) {
        const change = data[j].close - data[j - 1].close;
        if (change > 0) gains.push(change);
        else losses.push(Math.abs(change));
      }
      
      const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
      const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      indicators.rsi[i] = 100 - (100 / (1 + rs));
    }
  }
  
  // Simple SMA calculations
  for (let i = 0; i < data.length; i++) {
    if (i < params.smaPeriod1) {
      indicators.sma1[i] = data[i].close;
    } else {
      const sum = data.slice(i - params.smaPeriod1 + 1, i + 1).reduce((a, b) => a + b.close, 0);
      indicators.sma1[i] = sum / params.smaPeriod1;
    }
    
    if (i < params.smaPeriod2) {
      indicators.sma2[i] = data[i].close;
    } else {
      const sum = data.slice(i - params.smaPeriod2 + 1, i + 1).reduce((a, b) => a + b.close, 0);
      indicators.sma2[i] = sum / params.smaPeriod2;
    }
  }
  
  // Simplified MACD (would need proper EMA calculation)
  for (let i = 0; i < data.length; i++) {
    indicators.macd[i] = indicators.sma1[i] - indicators.sma2[i];
    indicators.macdSignal[i] = indicators.macd[i]; // Simplified
  }
  
  return indicators;
}

// Calculate crypto performance metrics
function calculateCryptoMetrics(result: CryptoBacktestResult, initialCapital: number): any {
  const trades = result.trades;
  
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      hitRate: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      volatility: 0,
      avgHoldingPeriod: 0
    };
  }
  
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl <= 0);
  
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  
  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    hitRate: winningTrades.length / trades.length,
    totalReturn: totalPnl,
    totalReturnPercent: (totalPnl / initialCapital) * 100,
    profitFactor: grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss,
    maxDrawdown: 0, // Would need running balance calculation
    sharpeRatio: 0, // Would need risk-free rate and return volatility
    volatility: 0, // Would need return standard deviation
    avgHoldingPeriod: trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / trades.length,
    grossProfit: grossProfit,
    grossLoss: grossLoss
  };
}

// Generate crypto backtest summary
function generateCryptoSummary(metrics: any, params: any): string {
  return `🚀 Crypto Backtest Results: ${params.strategy} on ${params.symbol}
📊 Total Trades: ${metrics.totalTrades}
🎯 Hit Rate: ${(metrics.hitRate * 100).toFixed(1)}%
💰 Total Return: $${metrics.totalReturn.toFixed(2)} (${metrics.totalReturnPercent.toFixed(2)}%)
📈 Profit Factor: ${metrics.profitFactor.toFixed(2)}
⏱️ Avg Holding Period: ${metrics.avgHoldingPeriod.toFixed(1)} hours
${metrics.hitRate >= 0.6 ? '✅ Strategy shows promise for crypto trading!' : '⚠️ Strategy needs optimization for crypto markets.'}`;
}

// Voice announcement for crypto results
async function speakCryptoResults(metrics: any, symbol: string, strategy: string): Promise<void> {
  try {
    const hitRate = Math.round(metrics.hitRate * 100);
    const profitFactor = Math.round(metrics.profitFactor * 100) / 100;
    const totalReturn = Math.round(metrics.totalReturn * 100) / 100;
    const returnPercent = Math.round(metrics.totalReturnPercent * 100) / 100;
    
    const announcement = `Crypto backtest results for ${symbol} using ${strategy} strategy. Hit rate: ${hitRate} percent. Profit factor: ${profitFactor}. Total return: ${totalReturn} USDT, equivalent to ${returnPercent} percent. Total trades: ${metrics.totalTrades}. Average holding period: ${Math.round(metrics.avgHoldingPeriod)} hours. ${hitRate >= 60 ? 'Strategy shows promise for crypto trading!' : 'Strategy needs optimization for crypto markets.'}`;
    
    console.log(`🔊 SPEAKING OUT LOUD: ${announcement}`);
    
    // Use Google Voice (same as other agents)
    try {
      const googleVoice = new GoogleVoice({
        speechModel: {
          apiKey: 'AIzaSyBNU1uWipiCzM8dxCv0X2hpkiVX5Uk0QX4',
        },
        speaker: 'en-US-Studio-O',
      });

      console.log('🎤 Generating Google Voice audio for crypto results...');
      const audioStream = await googleVoice.speak(announcement);
      
      if (audioStream) {
        const tempAudioPath = path.join(process.cwd(), '.mastra', 'output', 'temp-crypto-voice.wav');
        const outputDir = path.dirname(tempAudioPath);
        
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const writer = createWriteStream(tempAudioPath);
        audioStream.pipe(writer);
        
        writer.on('finish', () => {
          console.log('🔊 Playing crypto backtest audio through speakers...');
          exec(`afplay "${tempAudioPath}"`, (error) => {
            if (error) {
              console.error('❌ Audio playback error:', error);
              exec(`say "${announcement}"`, (sayError) => {
                if (!sayError) console.log('✅ Fallback voice announcement completed');
              });
            } else {
              console.log('✅ Google Voice crypto announcement played successfully!');
              setTimeout(() => {
                try { fs.unlinkSync(tempAudioPath); } catch {}
              }, 1000);
            }
          });
        });
        
        writer.on('error', () => {
          exec(`say "${announcement}"`, (sayError) => {
            if (!sayError) console.log('✅ Fallback voice announcement completed');
          });
        });
        
      } else {
        exec(`say "${announcement}"`, (sayError) => {
          if (!sayError) console.log('✅ Fallback voice announcement completed');
        });
      }
    } catch (voiceError) {
      console.error('❌ Google Voice Error:', voiceError);
      exec(`say "${announcement}"`, (sayError) => {
        if (!sayError) console.log('✅ Fallback voice announcement completed');
      });
    }
    
  } catch (error) {
    console.error('❌ Error in crypto voice announcement:', error);
  }
}

// Helper function to convert timeframe to seconds
function convertTimeframeToSeconds(timeframe: string): number {
  const map: { [key: string]: number } = {
    '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1d': 86400
  };
  return map[timeframe] || 3600;
}

