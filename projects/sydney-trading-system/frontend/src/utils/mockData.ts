/**
 * Mock Data Generator for TradingView Chart Testing
 * Generates realistic SPY 5-minute OHLCV data for development
 */

import { OHLCV, TradingViewBar, MACDData, SignalData } from '@/types/tradingview';

/**
 * Generate mock SPY 5-minute OHLCV data
 */
export function generateMockOHLCVData(
  startDate: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  endDate: Date = new Date(),
  intervalMinutes: number = 5
): OHLCV[] {
  const data: OHLCV[] = [];
  let currentTime = new Date(startDate);
  let currentPrice = 580; // Realistic SPY price
  
  while (currentTime <= endDate) {
    // Skip weekends
    if (currentTime.getDay() === 0 || currentTime.getDay() === 6) {
      currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
      continue;
    }
    
    // Market hours only (9:30 AM - 4:00 PM ET)
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    if (timeInMinutes >= 9 * 60 + 30 && timeInMinutes <= 16 * 60) {
      // Generate realistic price movement
      const volatility = 0.002; // 0.2% volatility per 5-minute bar
      const trend = Math.sin(data.length * 0.01) * 0.001; // Slight trending
      const randomMove = (Math.random() - 0.5) * volatility;
      
      const open = currentPrice;
      const priceChange = (trend + randomMove) * currentPrice;
      const close = open + priceChange;
      
      // Generate high/low with realistic spread
      const spread = Math.abs(priceChange) + (Math.random() * 0.001 * currentPrice);
      const high = Math.max(open, close) + spread * Math.random();
      const low = Math.min(open, close) - spread * Math.random();
      
      // Generate volume (higher during market open/close)
      const baseVolume = 1000000;
      const timeMultiplier = (timeInMinutes < 11 * 60 || timeInMinutes > 15 * 60) ? 1.5 : 1.0;
      const volume = Math.floor(baseVolume * timeMultiplier * (0.5 + Math.random()));
      
      data.push({
        timestamp: new Date(currentTime),
        open,
        high,
        low,
        close,
        volume
      });
      
      currentPrice = close;
    }
    
    currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
  }
  
  return data;
}

/**
 * Convert OHLCV data to TradingView bar format
 */
export function convertToTradingViewBars(ohlcvData: OHLCV[]): TradingViewBar[] {
  return ohlcvData.map(bar => ({
    time: Math.floor(bar.timestamp.getTime() / 1000), // Convert to Unix timestamp in seconds
    open: Number(bar.open.toFixed(2)),
    high: Number(bar.high.toFixed(2)),
    low: Number(bar.low.toFixed(2)),
    close: Number(bar.close.toFixed(2)),
    volume: bar.volume
  }));
}

/**
 * Calculate MACD using locked optimal parameters (5/15/5)
 */
export function calculateMACDData(ohlcvData: OHLCV[]): MACDData[] {
  const fastPeriod = 5;
  const slowPeriod = 15;
  const signalPeriod = 5;
  
  if (ohlcvData.length < slowPeriod + signalPeriod) {
    return [];
  }
  
  const closes = ohlcvData.map(d => d.close);
  
  // Calculate EMAs
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);
  
  // Calculate MACD line
  const macdLine: number[] = [];
  for (let i = slowPeriod - 1; i < fastEMA.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i - (fastPeriod - slowPeriod)]);
  }
  
  // Calculate Signal line
  const signalLine = calculateEMA(macdLine, signalPeriod);
  
  // Calculate Histogram
  const macdData: MACDData[] = [];
  const startIndex = slowPeriod + signalPeriod - 2;
  
  for (let i = 0; i < signalLine.length; i++) {
    const dataIndex = startIndex + i;
    if (dataIndex < ohlcvData.length) {
      const macd = macdLine[i + signalPeriod - 1];
      const signal = signalLine[i];
      const histogram = macd - signal;
      
      macdData.push({
        timestamp: ohlcvData[dataIndex].timestamp,
        macd,
        signal,
        histogram
      });
    }
  }
  
  return macdData;
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA value is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  ema.push(sum / period);
  
  // Calculate subsequent EMA values
  for (let i = period; i < data.length; i++) {
    const emaValue = (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(emaValue);
  }
  
  return ema;
}

/**
 * Generate mock trading signals based on MACD histogram crossovers
 */
export function generateMockSignals(ohlcvData: OHLCV[], macdData: MACDData[]): SignalData[] {
  const signals: SignalData[] = [];
  const ema9 = calculateEMA(ohlcvData.map(d => d.close), 9);
  
  for (let i = 1; i < macdData.length; i++) {
    const current = macdData[i];
    const previous = macdData[i - 1];
    const priceIndex = ohlcvData.findIndex(d => d.timestamp.getTime() === current.timestamp.getTime());
    
    if (priceIndex === -1) continue;
    
    const currentPrice = ohlcvData[priceIndex].close;
    const emaValue = ema9[priceIndex] || currentPrice;
    
    // Long signal: histogram crosses above zero AND price above EMA-9
    if (previous.histogram <= 0 && current.histogram > 0 && currentPrice > emaValue) {
      signals.push({
        timestamp: current.timestamp,
        type: 'long',
        price: currentPrice,
        confidence: Math.abs(current.histogram) * 100,
        reason: 'MACD histogram bullish crossover + EMA trend filter',
        macdValue: current.histogram,
        emaValue
      });
    }
    
    // Short signal: histogram crosses below zero AND price below EMA-9
    if (previous.histogram >= 0 && current.histogram < 0 && currentPrice < emaValue) {
      signals.push({
        timestamp: current.timestamp,
        type: 'short',
        price: currentPrice,
        confidence: Math.abs(current.histogram) * 100,
        reason: 'MACD histogram bearish crossover + EMA trend filter',
        macdValue: current.histogram,
        emaValue
      });
    }
  }
  
  return signals;
}

/**
 * Get latest mock data for real-time simulation
 */
export function getLatestMockData() {
  const now = new Date();
  const ohlcvData = generateMockOHLCVData(
    new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
    now,
    5 // 5-minute intervals
  );
  
  const macdData = calculateMACDData(ohlcvData);
  const signals = generateMockSignals(ohlcvData, macdData);
  const tradingViewBars = convertToTradingViewBars(ohlcvData);
  
  return {
    ohlcvData,
    macdData,
    signals,
    tradingViewBars,
    latestPrice: ohlcvData[ohlcvData.length - 1]?.close || 580,
    latestSignal: signals[signals.length - 1] || null
  };
}

export default {
  generateMockOHLCVData,
  convertToTradingViewBars,
  calculateMACDData,
  generateMockSignals,
  getLatestMockData
};
