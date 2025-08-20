/**
 * Real-Time MACD Calculation Service
 * Uses locked optimal parameters: fastPeriod=5, slowPeriod=15, signalPeriod=5
 * Implements EMA-9 trend filter for signal generation
 */

import { OHLCV, MACDData, SignalData, OptimalMACDConfig } from '@/types/tradingview';

// Locked optimal configuration from our validated 10.04% return strategy
// Reduced minHistogramChange for more signal generation while maintaining quality
const LOCKED_MACD_CONFIG: OptimalMACDConfig = {
  fastPeriod: 5,
  slowPeriod: 15,
  signalPeriod: 5,
  minHistogramChange: 0.001, // Reduced from 0.002 to generate more signals
  useTrendFilter: true,
  trendFilterPeriod: 9,
  usePartialProfits: true,
  firstProfitTarget: 1.5,
  secondProfitTarget: 2.5,
  trailingStopATR: 1.0,
  maxPositionSize: 100,
  marketOpen: "09:30", // Updated to actual market open
  marketClose: "16:00"  // Updated to actual market close
};

export class MACDService {
  private macdHistory: MACDData[] = [];
  private emaHistory: number[] = [];
  private priceHistory: number[] = [];
  private signalHistory: SignalData[] = [];

  /**
   * Check if timestamp is within market hours (9:30 AM - 4:00 PM EST)
   */
  private isMarketHours(timestamp: Date): boolean {
    // Convert to Eastern Time
    const easternTime = new Date(timestamp.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hours = easternTime.getHours();
    const minutes = easternTime.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    // Market hours: 9:30 AM (570 minutes) to 4:00 PM (960 minutes) EST
    const marketOpen = 9 * 60 + 30; // 9:30 AM = 570 minutes
    const marketClose = 16 * 60; // 4:00 PM = 960 minutes

    return timeInMinutes >= marketOpen && timeInMinutes <= marketClose;
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  private calculateEMA(data: number[], period: number): number[] {
    if (data.length < period) return [];

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
   * Calculate MACD using locked optimal parameters (5/15/5)
   */
  calculateMACDFromPrices(prices: number[]): MACDData[] {
    const { fastPeriod, slowPeriod, signalPeriod } = LOCKED_MACD_CONFIG;

    if (prices.length < slowPeriod + signalPeriod) {
      return [];
    }

    // Calculate EMAs
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);

    // Calculate MACD line
    const macdLine: number[] = [];
    const startIndex = slowPeriod - fastPeriod;

    for (let i = startIndex; i < fastEMA.length; i++) {
      const slowIndex = i - startIndex;
      if (slowIndex < slowEMA.length) {
        macdLine.push(fastEMA[i] - slowEMA[slowIndex]);
      }
    }

    // Calculate Signal line
    const signalLine = this.calculateEMA(macdLine, signalPeriod);

    // Calculate Histogram and create MACD data
    const macdData: MACDData[] = [];
    const dataStartIndex = slowPeriod + signalPeriod - 2;

    for (let i = 0; i < signalLine.length; i++) {
      const priceIndex = dataStartIndex + i;
      if (priceIndex < prices.length) {
        const macd = macdLine[i + signalPeriod - 1];
        const signal = signalLine[i];
        const histogram = macd - signal;

        macdData.push({
          timestamp: new Date(Date.now() - (prices.length - priceIndex - 1) * 5 * 60 * 1000), // 5-minute intervals
          macd,
          signal,
          histogram
        });
      }
    }

    return macdData;
  }

  /**
   * Calculate MACD from OHLCV data
   */
  calculateMACDFromOHLCV(ohlcvData: OHLCV[]): MACDData[] {
    const prices = ohlcvData.map(d => d.close);
    const macdData = this.calculateMACDFromPrices(prices);

    // Update timestamps with actual OHLCV timestamps
    const startIndex = ohlcvData.length - macdData.length;
    return macdData.map((macd, index) => ({
      ...macd,
      timestamp: ohlcvData[startIndex + index].timestamp
    }));
  }

  /**
   * Calculate EMA-9 trend filter
   */
  calculateEMA9(prices: number[]): number[] {
    return this.calculateEMA(prices, LOCKED_MACD_CONFIG.trendFilterPeriod);
  }

  /**
   * Generate trading signals using locked optimal strategy
   * Now filters for market hours only (9:30 AM - 4:00 PM EST)
   */
  generateSignals(ohlcvData: OHLCV[], macdData: MACDData[]): SignalData[] {
    if (macdData.length < 2) return [];

    const signals: SignalData[] = [];
    const prices = ohlcvData.map(d => d.close);
    const ema9 = this.calculateEMA9(prices);

    console.log('🎯 Generating signals with market hours filter (9:30 AM - 4:00 PM EST)...');

    for (let i = 1; i < macdData.length; i++) {
      const current = macdData[i];
      const previous = macdData[i - 1];

      // ✅ MARKET HOURS FILTER: Only generate signals during trading hours
      if (!this.isMarketHours(current.timestamp)) {
        continue; // Skip signals outside market hours
      }

      // Find corresponding price and EMA data
      const priceIndex = ohlcvData.findIndex(d =>
        Math.abs(d.timestamp.getTime() - current.timestamp.getTime()) < 60000 // Within 1 minute
      );

      if (priceIndex === -1 || priceIndex >= ema9.length) continue;

      const currentPrice = ohlcvData[priceIndex].close;
      const emaValue = ema9[priceIndex];
      const histogramChange = Math.abs(current.histogram - previous.histogram);

      // Check minimum histogram change threshold (reduced for more signals)
      if (histogramChange < LOCKED_MACD_CONFIG.minHistogramChange) continue;

      // Long signal: histogram crosses above zero AND price above EMA-9
      if (previous.histogram <= 0 && current.histogram > 0 && currentPrice > emaValue) {
        signals.push({
          timestamp: current.timestamp,
          type: 'long',
          price: currentPrice,
          confidence: Math.abs(current.histogram) * 1000, // Scale for display
          reason: 'MACD histogram bullish crossover + EMA-9 trend filter (Market Hours)',
          macdValue: current.histogram,
          emaValue
        });
        console.log(`📈 LONG signal generated at ${current.timestamp.toLocaleTimeString()} - Price: $${currentPrice.toFixed(2)}`);
      }

      // Short signal: histogram crosses below zero AND price below EMA-9
      if (previous.histogram >= 0 && current.histogram < 0 && currentPrice < emaValue) {
        signals.push({
          timestamp: current.timestamp,
          type: 'short',
          price: currentPrice,
          confidence: Math.abs(current.histogram) * 1000, // Scale for display
          reason: 'MACD histogram bearish crossover + EMA-9 trend filter (Market Hours)',
          macdValue: current.histogram,
          emaValue
        });
        console.log(`📉 SHORT signal generated at ${current.timestamp.toLocaleTimeString()} - Price: $${currentPrice.toFixed(2)}`);
      }
    }

    console.log(`✅ Generated ${signals.length} signals during market hours (9:30 AM - 4:00 PM EST)`);
    return signals;
  }

  /**
   * Update with new price data (for real-time updates)
   */
  updateWithNewPrice(price: number, timestamp: Date): {
    macd?: MACDData;
    ema9?: number;
    signal?: SignalData;
  } {
    this.priceHistory.push(price);
    
    // Keep only last 100 prices for performance
    if (this.priceHistory.length > 100) {
      this.priceHistory = this.priceHistory.slice(-100);
    }

    const result: any = {};

    // Calculate new MACD if we have enough data
    const macdData = this.calculateMACDFromPrices(this.priceHistory);
    if (macdData.length > 0) {
      const latestMacd = macdData[macdData.length - 1];
      latestMacd.timestamp = timestamp;
      result.macd = latestMacd;
      
      // Update MACD history
      this.macdHistory.push(latestMacd);
      if (this.macdHistory.length > 100) {
        this.macdHistory = this.macdHistory.slice(-100);
      }
    }

    // Calculate new EMA-9
    const ema9Data = this.calculateEMA9(this.priceHistory);
    if (ema9Data.length > 0) {
      result.ema9 = ema9Data[ema9Data.length - 1];
    }

    // Check for new signals (with market hours filter)
    if (this.macdHistory.length >= 2 && result.ema9 && this.isMarketHours(timestamp)) {
      const current = this.macdHistory[this.macdHistory.length - 1];
      const previous = this.macdHistory[this.macdHistory.length - 2];
      const histogramChange = Math.abs(current.histogram - previous.histogram);

      if (histogramChange >= LOCKED_MACD_CONFIG.minHistogramChange) {
        // Long signal
        if (previous.histogram <= 0 && current.histogram > 0 && price > result.ema9) {
          result.signal = {
            timestamp,
            type: 'long' as const,
            price,
            confidence: Math.abs(current.histogram) * 1000,
            reason: 'Real-time MACD bullish crossover + EMA-9 filter (Market Hours)',
            macdValue: current.histogram,
            emaValue: result.ema9
          };
          console.log(`🔴 Real-time LONG signal at ${timestamp.toLocaleTimeString()}`);
        }

        // Short signal
        if (previous.histogram >= 0 && current.histogram < 0 && price < result.ema9) {
          result.signal = {
            timestamp,
            type: 'short' as const,
            price,
            confidence: Math.abs(current.histogram) * 1000,
            reason: 'Real-time MACD bearish crossover + EMA-9 filter (Market Hours)',
            macdValue: current.histogram,
            emaValue: result.ema9
          };
          console.log(`🔴 Real-time SHORT signal at ${timestamp.toLocaleTimeString()}`);
        }
      }
    } else if (!this.isMarketHours(timestamp)) {
      console.log(`⏰ Skipping signal generation - outside market hours: ${timestamp.toLocaleTimeString()}`);
    }

    return result;
  }

  /**
   * Get locked optimal configuration
   */
  getConfig(): OptimalMACDConfig {
    return { ...LOCKED_MACD_CONFIG };
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.macdHistory = [];
    this.emaHistory = [];
    this.priceHistory = [];
    this.signalHistory = [];
    console.log('🔄 MACD service reset');
  }

  /**
   * Get current state summary
   */
  getState(): {
    macdCount: number;
    priceCount: number;
    signalCount: number;
    latestMacd?: MACDData;
    latestSignal?: SignalData;
  } {
    return {
      macdCount: this.macdHistory.length,
      priceCount: this.priceHistory.length,
      signalCount: this.signalHistory.length,
      latestMacd: this.macdHistory[this.macdHistory.length - 1],
      latestSignal: this.signalHistory[this.signalHistory.length - 1]
    };
  }
}

// Export singleton instance
export const macdService = new MACDService();

export default macdService;
