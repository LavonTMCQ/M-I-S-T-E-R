import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Market Character Analysis Tool for Phemex Portfolio Agent
 * 
 * Analyzes real-time market character changes for crypto positions
 * to identify optimal scaling and exit opportunities
 */

// CRITICAL FIX: Fetch current real-time price (Kraken first since Phemex is down)
async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  // Try Kraken first since Phemex is having issues
  try {
    const krakenSymbol = convertToKrakenSymbol(symbol);
    const krakenUrl = `https://api.kraken.com/0/public/Ticker?pair=${krakenSymbol}`;
    const response = await fetch(krakenUrl);
    const data = await response.json();
    
    if (data.error?.length === 0 && data.result) {
      const ticker = Object.values(data.result)[0] as any;
      const currentPrice = parseFloat(ticker.c[0]); // Current price is in 'c' array
      console.log(`✅ Real-time price for ${symbol} from Kraken: $${currentPrice}`);
      return currentPrice;
    }
  } catch (error) {
    console.log(`⚠️ Kraken price fetch failed for ${symbol}`);
  }
  
  // Fallback to Phemex if Kraken fails
  try {
    const tickerUrl = `https://api.phemex.com/exchange/public/md/v2/ticker/24hr?symbol=${symbol}`;
    const response = await fetch(tickerUrl);
    const data = await response.json();
    
    if (data.code === 0 && data.data?.length > 0) {
      const ticker = data.data[0];
      const currentPrice = parseFloat(ticker.lastPrice);
      console.log(`✅ Real-time price for ${symbol} from Phemex: $${currentPrice}`);
      return currentPrice;
    }
  } catch (error) {
    console.log(`⚠️ Failed to get real-time price for ${symbol}, will use last candle close`);
  }
  
  return null;
}

// Helper function to fetch real-time crypto data from multiple sources
async function fetchCryptoData(symbol: string, timeframe: string = '1h') {
  try {
    // CRITICAL FIX: Get current real-time price first
    const currentPrice = await fetchCurrentPrice(symbol);
    
    // Fetch 100 candles for all timeframes
    // For daily: 100 days of data
    // For hourly: 100 hours (~4 days)
    // For 15m: 100 x 15 minutes (~25 hours)
    const candleLimit = 100;
    
    // Try Phemex API first
    const phemexUrl = `https://api.phemex.com/exchange/public/md/v2/kline/last?symbol=${symbol}&resolution=${getPhemexResolution(timeframe)}&limit=${candleLimit}`;
    
    const response = await fetch(phemexUrl);
    const data = await response.json();
    
    if (data.code === 0 && data.data?.rows?.length > 0) {
      const candles = data.data.rows.map((candle: any) => ({
        timestamp: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
      
      // CRITICAL: Replace last candle's close with real-time price
      if (candles.length > 0 && currentPrice) {
        candles[candles.length - 1].close = currentPrice;
      }
      
      return {
        source: 'Phemex',
        symbol,
        timeframe,
        currentPrice, // Add current price to response
        data: candles
      };
    }
    
    throw new Error('Phemex data not available');
  } catch (error) {
    console.log(`⚠️ Phemex failed for ${symbol}, trying Kraken...`);
    
    // Fallback to Kraken (convert symbol format)
    const krakenSymbol = convertToKrakenSymbol(symbol);
    const krakenInterval = getKrakenInterval(timeframe);
    
    try {
      // Get current price first
      const currentPrice = await fetchCurrentPrice(symbol);
      
      const krakenUrl = `https://api.kraken.com/0/public/OHLC?pair=${krakenSymbol}&interval=${krakenInterval}`;
      const krakenResponse = await fetch(krakenUrl);
      const krakenData = await krakenResponse.json();
      
      if (krakenData.error?.length === 0 && krakenData.result) {
        const pairData = Object.values(krakenData.result)[0] as any[];
        // Always use last 100 candles
        const candles = pairData.slice(-100).map((candle: any) => ({
          timestamp: candle[0] * 1000,
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[6])
        }));
        
        // CRITICAL: Replace last candle's close with real-time price
        if (candles.length > 0 && currentPrice) {
          candles[candles.length - 1].close = currentPrice;
        }
        
        return {
          source: 'Kraken',
          symbol,
          timeframe,
          currentPrice, // Add current price to response
          data: candles
        };
      }
    } catch (krakenError) {
      console.error(`❌ Kraken also failed for ${symbol}:`, krakenError);
    }
    
    throw new Error(`Unable to fetch data for ${symbol} from any source`);
  }
}

// Helper functions for API conversions
function getPhemexResolution(timeframe: string): string {
  const resolutions: { [key: string]: string } = {
    '1m': '60',
    '5m': '300',
    '15m': '900',
    '1h': '3600',
    '4h': '14400',
    '1d': '86400'
  };
  return resolutions[timeframe] || '3600';
}

function getKrakenInterval(timeframe: string): string {
  const intervals: { [key: string]: string } = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '1h': '60',
    '4h': '240',
    '1d': '1440'
  };
  return intervals[timeframe] || '60';
}

function convertToKrakenSymbol(phemexSymbol: string): string {
  const conversions: { [key: string]: string } = {
    'ADAUSDT': 'ADAUSD',
    'ETHUSDT': 'ETHUSD',
    'FETUSDT': 'FETUSD',
    'ATOMUSDT': 'ATOMUSD',
    'BTCUSDT': 'XBTUSD'
  };
  return conversions[phemexSymbol] || phemexSymbol;
}

// Technical analysis functions
function calculateSMA(data: any[], period: number): number[] {
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
    sma.push(sum / period);
  }
  return sma;
}

function calculateRSI(data: any[], period: number = 14): number[] {
  const rsi = [];
  const gains = [];
  const losses = [];
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

function analyzeMarketCharacter(data: any[]) {
  // For proper analysis we need at least 20 candles for SMA20 calculation
  // But we'll work with whatever we have for daily timeframe
  if (data.length < 20) {
    console.log(`⚠️ Only ${data.length} candles available - need at least 20 for proper analysis`);
    return { character: 'insufficient_data', confidence: 0 };
  }
  
  const latest = data[data.length - 1];
  const sma20 = calculateSMA(data, 20);
  const sma50 = calculateSMA(data, 50);
  const rsi = calculateRSI(data);
  
  const currentSMA20 = sma20[sma20.length - 1];
  const currentSMA50 = sma50[sma50.length - 1];
  const currentRSI = rsi[rsi.length - 1];
  
  // Trend analysis
  const priceAboveSMA20 = latest.close > currentSMA20;
  const priceAboveSMA50 = latest.close > currentSMA50;
  const sma20AboveSMA50 = currentSMA20 > currentSMA50;
  
  // Momentum analysis
  const recentHigh = Math.max(...data.slice(-10).map(d => d.high));
  const recentLow = Math.min(...data.slice(-10).map(d => d.low));
  const pricePosition = (latest.close - recentLow) / (recentHigh - recentLow);
  
  // Volume analysis
  const avgVolume = data.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
  const recentVolume = data.slice(-5).reduce((sum, d) => sum + d.volume, 0) / 5;
  const volumeIncrease = recentVolume > avgVolume * 1.2;
  
  // Determine market character
  let character = 'neutral';
  let confidence = 0.5;
  
  if (priceAboveSMA20 && priceAboveSMA50 && sma20AboveSMA50 && currentRSI > 50) {
    character = 'bullish';
    confidence = 0.7 + (volumeIncrease ? 0.2 : 0) + (pricePosition > 0.7 ? 0.1 : 0);
  } else if (!priceAboveSMA20 && !priceAboveSMA50 && !sma20AboveSMA50 && currentRSI < 50) {
    character = 'bearish';
    confidence = 0.7 + (volumeIncrease ? 0.2 : 0) + (pricePosition < 0.3 ? 0.1 : 0);
  } else if (currentRSI < 30) {
    character = 'oversold_reversal_potential';
    confidence = 0.8;
  } else if (currentRSI > 70) {
    character = 'overbought_correction_potential';
    confidence = 0.8;
  }
  
  return {
    character,
    confidence: Math.min(confidence, 1.0),
    technicals: {
      price: latest.close,
      sma20: currentSMA20,
      sma50: currentSMA50,
      rsi: currentRSI,
      pricePosition,
      volumeIncrease
    }
  };
}

export const marketCharacterAnalysisTool = createTool({
  id: "market-character-analysis",
  description: "Analyze real-time market character for crypto positions to identify trend changes and scaling opportunities",
  inputSchema: z.object({
    symbols: z.array(z.string()).describe("Crypto symbols to analyze (e.g., ['ADAUSDT', 'ETHUSDT', 'FETUSDT'])"),
    timeframes: z.array(z.string()).optional().describe("Timeframes to analyze (default: ['15m', '1h', '1d'])"),
    includeCorrelation: z.boolean().optional().describe("Include correlation analysis between symbols")
  }),
  execute: async ({ context }) => {
    const { symbols, timeframes = ['15m', '1h', '1d'], includeCorrelation = true } = context;
    
    try {
      console.log(`🔍 Analyzing market character for: ${symbols.join(', ')}`);
      console.log(`📊 Using 100 candles per timeframe: 100 days for daily, 100 hours for hourly`);
      
      const results: any = {};
      
      // Analyze each symbol across timeframes
      for (const symbol of symbols) {
        results[symbol] = {};
        
        for (const timeframe of timeframes) {
          try {
            const data = await fetchCryptoData(symbol, timeframe);
            console.log(`📊 ${symbol} ${timeframe}: Received ${data.data.length} candles from ${data.source}`);
            const analysis = analyzeMarketCharacter(data.data);
            
            // CRITICAL: Use real-time price for ALL timeframes
            if (data.currentPrice) {
              analysis.technicals.price = data.currentPrice;
            }
            
            results[symbol][timeframe] = {
              ...analysis,
              source: data.source,
              currentPrice: data.currentPrice, // Add current price to results
              lastUpdate: new Date().toISOString()
            };
            
            console.log(`✅ ${symbol} ${timeframe}: ${analysis.character} (${(analysis.confidence * 100).toFixed(1)}% confidence) @ $${data.currentPrice || analysis.technicals.price}`);
          } catch (error) {
            console.error(`❌ Failed to analyze ${symbol} ${timeframe}:`, error);
            results[symbol][timeframe] = {
              character: 'data_unavailable',
              confidence: 0,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        }
      }
      
      // CRITICAL: Validate data consistency across timeframes
      const validationErrors = validateDataConsistency(results);
      if (validationErrors.length > 0) {
        console.error('⚠️ DATA VALIDATION WARNINGS:');
        validationErrors.forEach(error => console.error(`  - ${error}`));
      }
      
      // Generate overall market assessment
      const overallAssessment = generateOverallAssessment(results);
      
      return {
        success: true,
        analysis: results,
        overallAssessment,
        timestamp: new Date().toISOString(),
        recommendations: generateRecommendations(results),
        dataValidation: {
          hasWarnings: validationErrors.length > 0,
          warnings: validationErrors
        }
      };
      
    } catch (error) {
      console.error('❌ Market character analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

// CRITICAL: Data validation function to prevent stale/wrong data
function validateDataConsistency(results: any): string[] {
  const errors: string[] = [];
  
  for (const [symbol, timeframes] of Object.entries(results)) {
    const prices: { [key: string]: number } = {};
    
    // Collect all prices for this symbol
    for (const [timeframe, analysis] of Object.entries(timeframes as any)) {
      if (analysis.technicals?.price) {
        prices[timeframe] = analysis.technicals.price;
      } else if (analysis.currentPrice) {
        prices[timeframe] = analysis.currentPrice;
      }
    }
    
    // Check if all timeframes show similar current prices (within 5%)
    const priceValues = Object.values(prices);
    if (priceValues.length > 1) {
      const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
      
      for (const [timeframe, price] of Object.entries(prices)) {
        const deviation = Math.abs((price - avgPrice) / avgPrice * 100);
        if (deviation > 5) {
          errors.push(`${symbol} ${timeframe}: Price $${price.toFixed(4)} deviates ${deviation.toFixed(1)}% from average $${avgPrice.toFixed(4)}`);
        }
      }
    }
    
    // Check for stale data (timestamps)
    for (const [timeframe, analysis] of Object.entries(timeframes as any)) {
      if (analysis.lastUpdate) {
        const updateTime = new Date(analysis.lastUpdate);
        const now = new Date();
        const ageMinutes = (now.getTime() - updateTime.getTime()) / 1000 / 60;
        
        if (ageMinutes > 5) {
          errors.push(`${symbol} ${timeframe}: Data is ${ageMinutes.toFixed(1)} minutes old`);
        }
      }
    }
  }
  
  return errors;
}

function generateOverallAssessment(results: any) {
  const assessments = [];
  
  for (const [symbol, timeframes] of Object.entries(results)) {
    for (const [timeframe, analysis] of Object.entries(timeframes as any)) {
      if (analysis.character !== 'data_unavailable') {
        assessments.push({
          symbol,
          timeframe,
          character: analysis.character,
          confidence: analysis.confidence
        });
      }
    }
  }
  
  if (assessments.length === 0) {
    return { overall: 'insufficient_data', confidence: 0 };
  }
  
  // Weight longer timeframes more heavily
  const weights = { '1d': 3, '1h': 2, '15m': 1 };
  let bullishScore = 0;
  let bearishScore = 0;
  let totalWeight = 0;
  
  assessments.forEach(a => {
    const weight = weights[a.timeframe as keyof typeof weights] || 1;
    totalWeight += weight;
    
    if (a.character.includes('bullish') || a.character.includes('reversal')) {
      bullishScore += weight * a.confidence;
    } else if (a.character.includes('bearish')) {
      bearishScore += weight * a.confidence;
    }
  });
  
  const netScore = (bullishScore - bearishScore) / totalWeight;
  
  let overall = 'neutral';
  if (netScore > 0.3) overall = 'bullish_bias';
  else if (netScore < -0.3) overall = 'bearish_bias';
  else if (netScore > 0.1) overall = 'slightly_bullish';
  else if (netScore < -0.1) overall = 'slightly_bearish';
  
  return {
    overall,
    confidence: Math.abs(netScore),
    bullishScore: bullishScore / totalWeight,
    bearishScore: bearishScore / totalWeight
  };
}

function generateRecommendations(results: any) {
  const recommendations = [];
  
  for (const [symbol, timeframes] of Object.entries(results)) {
    const tf = timeframes as any;
    
    // Check for reversal signals
    if (tf['1h']?.character === 'oversold_reversal_potential' && tf['1h']?.confidence > 0.7) {
      recommendations.push({
        symbol,
        type: 'scaling_opportunity',
        message: `${symbol} showing oversold reversal potential on 1h - consider scaling opportunity`,
        urgency: 'medium'
      });
    }
    
    // Check for trend alignment
    if (tf['1d']?.character?.includes('bullish') && tf['1h']?.character?.includes('bullish')) {
      recommendations.push({
        symbol,
        type: 'trend_alignment',
        message: `${symbol} showing bullish alignment across timeframes - potential exit opportunity`,
        urgency: 'high'
      });
    }
    
    // Check for risk warnings
    if (tf['1d']?.character?.includes('bearish') && tf['1h']?.character?.includes('bearish')) {
      recommendations.push({
        symbol,
        type: 'risk_warning',
        message: `${symbol} showing bearish alignment - monitor liquidation levels closely`,
        urgency: 'high'
      });
    }
  }
  
  return recommendations;
}
