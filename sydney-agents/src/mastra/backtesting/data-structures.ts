/**
 * OHLVC Data Structures and Utilities for Stock Backtesting System
 * 
 * This module provides standardized data structures and utility functions
 * for handling OHLVC (Open, High, Low, Volume, Close) data throughout
 * the backtesting system, as specified in stockbacktestdesign.txt
 */

// Re-export OHLVC interface from knowledge-store for consistency
export { OHLVC, TradeRecord, BacktestResult, Strategy, MarketData } from './knowledge-store';

// Additional data structures for backtesting
export interface Position {
  symbol: string;
  quantity: number;
  entryPrice: number;
  entryTime: Date;
  currentPrice: number;
  unrealizedPL: number;
  side: 'LONG' | 'SHORT';
}

export interface Order {
  id: string;
  symbol: string;
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  createdAt: Date;
  filledAt?: Date;
  filledPrice?: number;
  reason?: string;
}

export interface MarketHours {
  preMarketStart: string;   // "04:00"
  marketOpen: string;       // "09:30"
  marketClose: string;      // "16:00"
  afterHoursEnd: string;    // "20:00"
  timezone: string;         // "America/New_York"
}

export interface BacktestConfig {
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  commission: number;
  slippage: number;
  marketHours: MarketHours;
  allowExtendedHours: boolean;
  maxPositionSize: number;
  riskPerTrade: number;
}

// Data Validation and Transformation Utilities
export class DataUtils {
  /**
   * Validate OHLVC data integrity
   * Ensures data quality for backtesting accuracy
   */
  static validateOHLVC(data: OHLVC[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || data.length === 0) {
      errors.push('Data array is empty');
      return { valid: false, errors };
    }

    for (let i = 0; i < data.length; i++) {
      const bar = data[i];
      const prefix = `Bar ${i} (${bar.timestamp}):`;

      // Check for required fields
      if (!bar.timestamp) errors.push(`${prefix} Missing timestamp`);
      if (typeof bar.open !== 'number' || isNaN(bar.open)) errors.push(`${prefix} Invalid open price`);
      if (typeof bar.high !== 'number' || isNaN(bar.high)) errors.push(`${prefix} Invalid high price`);
      if (typeof bar.low !== 'number' || isNaN(bar.low)) errors.push(`${prefix} Invalid low price`);
      if (typeof bar.close !== 'number' || isNaN(bar.close)) errors.push(`${prefix} Invalid close price`);
      if (typeof bar.volume !== 'number' || isNaN(bar.volume) || bar.volume < 0) {
        errors.push(`${prefix} Invalid volume`);
      }

      // Check price relationships
      if (bar.high < bar.low) errors.push(`${prefix} High price less than low price`);
      if (bar.high < bar.open) errors.push(`${prefix} High price less than open price`);
      if (bar.high < bar.close) errors.push(`${prefix} High price less than close price`);
      if (bar.low > bar.open) errors.push(`${prefix} Low price greater than open price`);
      if (bar.low > bar.close) errors.push(`${prefix} Low price greater than close price`);

      // Check for negative prices
      if (bar.open <= 0) errors.push(`${prefix} Open price must be positive`);
      if (bar.high <= 0) errors.push(`${prefix} High price must be positive`);
      if (bar.low <= 0) errors.push(`${prefix} Low price must be positive`);
      if (bar.close <= 0) errors.push(`${prefix} Close price must be positive`);

      // Check chronological order
      if (i > 0 && bar.timestamp <= data[i - 1].timestamp) {
        errors.push(`${prefix} Timestamp not in chronological order`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Fill gaps in OHLVC data
   * Uses forward-fill method for missing bars
   */
  static fillGaps(data: OHLVC[], intervalMinutes: number): OHLVC[] {
    if (data.length === 0) return data;

    const filled: OHLVC[] = [];
    const intervalMs = intervalMinutes * 60 * 1000;

    for (let i = 0; i < data.length; i++) {
      filled.push(data[i]);

      // Check if there's a gap to the next bar
      if (i < data.length - 1) {
        const currentTime = data[i].timestamp.getTime();
        const nextTime = data[i + 1].timestamp.getTime();
        const expectedNextTime = currentTime + intervalMs;

        // Fill gaps with forward-filled data
        let fillTime = expectedNextTime;
        while (fillTime < nextTime) {
          const filledBar: OHLVC = {
            timestamp: new Date(fillTime),
            open: data[i].close,
            high: data[i].close,
            low: data[i].close,
            close: data[i].close,
            volume: 0 // No volume for filled bars
          };
          filled.push(filledBar);
          fillTime += intervalMs;
        }
      }
    }

    return filled;
  }

  /**
   * Remove outliers from OHLVC data
   * Uses statistical methods to identify and handle outliers
   */
  static removeOutliers(data: OHLVC[], method: 'iqr' | 'zscore' = 'iqr', threshold: number = 3): OHLVC[] {
    if (data.length < 10) return data; // Need sufficient data for outlier detection

    const prices = data.map(bar => bar.close);
    const outlierIndices = new Set<number>();

    if (method === 'iqr') {
      const sorted = [...prices].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      prices.forEach((price, index) => {
        if (price < lowerBound || price > upperBound) {
          outlierIndices.add(index);
        }
      });
    } else if (method === 'zscore') {
      const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);

      prices.forEach((price, index) => {
        const zscore = Math.abs((price - mean) / stdDev);
        if (zscore > threshold) {
          outlierIndices.add(index);
        }
      });
    }

    // Remove outliers or replace with interpolated values
    return data.filter((_, index) => !outlierIndices.has(index));
  }

  /**
   * Resample OHLVC data to different timeframes
   * Aggregates higher frequency data to lower frequency
   */
  static resample(data: OHLVC[], targetIntervalMinutes: number): OHLVC[] {
    if (data.length === 0) return data;

    const resampled: OHLVC[] = [];
    const intervalMs = targetIntervalMinutes * 60 * 1000;

    let currentBucket: OHLVC[] = [];
    let bucketStartTime = this.alignToInterval(data[0].timestamp, targetIntervalMinutes);

    for (const bar of data) {
      const barBucketStart = this.alignToInterval(bar.timestamp, targetIntervalMinutes);

      if (barBucketStart.getTime() === bucketStartTime.getTime()) {
        currentBucket.push(bar);
      } else {
        // Process current bucket
        if (currentBucket.length > 0) {
          resampled.push(this.aggregateBars(currentBucket, bucketStartTime));
        }

        // Start new bucket
        currentBucket = [bar];
        bucketStartTime = barBucketStart;
      }
    }

    // Process final bucket
    if (currentBucket.length > 0) {
      resampled.push(this.aggregateBars(currentBucket, bucketStartTime));
    }

    return resampled;
  }

  /**
   * Align timestamp to interval boundary
   */
  private static alignToInterval(timestamp: Date, intervalMinutes: number): Date {
    const intervalMs = intervalMinutes * 60 * 1000;
    const aligned = new Date(Math.floor(timestamp.getTime() / intervalMs) * intervalMs);
    return aligned;
  }

  /**
   * Aggregate multiple bars into a single OHLVC bar
   */
  private static aggregateBars(bars: OHLVC[], timestamp: Date): OHLVC {
    if (bars.length === 0) throw new Error('Cannot aggregate empty bar array');

    const sortedBars = bars.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      timestamp,
      open: sortedBars[0].open,
      high: Math.max(...sortedBars.map(bar => bar.high)),
      low: Math.min(...sortedBars.map(bar => bar.low)),
      close: sortedBars[sortedBars.length - 1].close,
      volume: sortedBars.reduce((sum, bar) => sum + bar.volume, 0)
    };
  }

  /**
   * Calculate basic statistics for OHLVC data
   */
  static calculateStatistics(data: OHLVC[]): {
    count: number;
    priceRange: { min: number; max: number };
    averageVolume: number;
    averagePrice: number;
    volatility: number;
    gaps: number;
  } {
    if (data.length === 0) {
      return {
        count: 0,
        priceRange: { min: 0, max: 0 },
        averageVolume: 0,
        averagePrice: 0,
        volatility: 0,
        gaps: 0
      };
    }

    const prices = data.map(bar => bar.close);
    const volumes = data.map(bar => bar.volume);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const averageVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;

    // Calculate volatility (standard deviation of returns)
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // Count gaps (missing expected intervals)
    let gaps = 0;
    for (let i = 1; i < data.length; i++) {
      const timeDiff = data[i].timestamp.getTime() - data[i - 1].timestamp.getTime();
      const expectedDiff = 5 * 60 * 1000; // Assuming 5-minute intervals
      if (timeDiff > expectedDiff * 1.5) {
        gaps++;
      }
    }

    return {
      count: data.length,
      priceRange: { min: minPrice, max: maxPrice },
      averageVolume,
      averagePrice,
      volatility,
      gaps
    };
  }

  /**
   * Convert OHLVC data to CSV format
   */
  static toCSV(data: OHLVC[]): string {
    const headers = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
    const rows = data.map(bar => [
      bar.timestamp.toISOString(),
      bar.open.toString(),
      bar.high.toString(),
      bar.low.toString(),
      bar.close.toString(),
      bar.volume.toString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Parse CSV data to OHLVC format
   */
  static fromCSV(csvData: string): OHLVC[] {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data: OHLVC[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length !== headers.length) continue;

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index].trim();
      });

      try {
        data.push({
          timestamp: new Date(row.timestamp),
          open: parseFloat(row.open),
          high: parseFloat(row.high),
          low: parseFloat(row.low),
          close: parseFloat(row.close),
          volume: parseInt(row.volume, 10)
        });
      } catch (error) {
        console.warn(`Skipping invalid row ${i}: ${error}`);
      }
    }

    return data;
  }
}

// Market Hours Utilities
export class MarketHoursUtils {
  /**
   * Check if a timestamp falls within market hours
   */
  static isMarketHours(timestamp: Date, marketHours: MarketHours): boolean {
    const timeStr = timestamp.toTimeString().substring(0, 5); // "HH:MM"
    return timeStr >= marketHours.marketOpen && timeStr <= marketHours.marketClose;
  }

  /**
   * Check if a timestamp falls within extended hours
   */
  static isExtendedHours(timestamp: Date, marketHours: MarketHours): boolean {
    const timeStr = timestamp.toTimeString().substring(0, 5);
    return (timeStr >= marketHours.preMarketStart && timeStr < marketHours.marketOpen) ||
           (timeStr > marketHours.marketClose && timeStr <= marketHours.afterHoursEnd);
  }

  /**
   * Get the next market open time
   */
  static getNextMarketOpen(currentTime: Date, marketHours: MarketHours): Date {
    const nextOpen = new Date(currentTime);
    const [hours, minutes] = marketHours.marketOpen.split(':').map(Number);
    
    nextOpen.setHours(hours, minutes, 0, 0);
    
    // If market open has passed today, move to next trading day
    if (nextOpen <= currentTime) {
      nextOpen.setDate(nextOpen.getDate() + 1);
      
      // Skip weekends
      while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
        nextOpen.setDate(nextOpen.getDate() + 1);
      }
    }
    
    return nextOpen;
  }

  /**
   * Get the next market close time
   */
  static getNextMarketClose(currentTime: Date, marketHours: MarketHours): Date {
    const nextClose = new Date(currentTime);
    const [hours, minutes] = marketHours.marketClose.split(':').map(Number);
    
    nextClose.setHours(hours, minutes, 0, 0);
    
    // If market close has passed today, move to next trading day
    if (nextClose <= currentTime) {
      nextClose.setDate(nextClose.getDate() + 1);
      
      // Skip weekends
      while (nextClose.getDay() === 0 || nextClose.getDay() === 6) {
        nextClose.setDate(nextClose.getDate() + 1);
      }
    }
    
    return nextClose;
  }
}

// Default US market hours
export const US_MARKET_HOURS: MarketHours = {
  preMarketStart: "04:00",
  marketOpen: "09:30",
  marketClose: "16:00",
  afterHoursEnd: "20:00",
  timezone: "America/New_York"
};