/**
 * Real-Time Data Service
 * Provides WebSocket-like functionality using efficient polling
 * for continuous market data updates and signal analysis
 */

import { alphaVantageService } from './alphaVantageService';
import { macdService } from './macdService';
import { signalAnalyticsService } from './signalAnalyticsService';
import { OHLCV, SignalData } from '@/types/tradingview';

export interface RealTimeUpdate {
  timestamp: Date;
  price: number;
  signal?: SignalData;
  macd?: {
    value: number;
    signal: number;
    histogram: number;
  };
  volume?: number;
  isMarketHours: boolean;
}

export interface RealTimeDataServiceConfig {
  symbol: string;
  updateInterval: number; // milliseconds
  dataRefreshInterval: number; // how often to refresh full dataset
  enableSignalGeneration: boolean;
  enableAnalytics: boolean;
}

export class RealTimeDataService {
  private config: RealTimeDataServiceConfig;
  private isRunning = false;
  private updateInterval?: NodeJS.Timeout;
  private dataRefreshInterval?: NodeJS.Timeout;
  private listeners: ((update: RealTimeUpdate) => void)[] = [];
  private dataRefreshListeners: ((data: OHLCV[]) => void)[] = [];
  private lastPrice = 0;
  private updateCount = 0;

  constructor(config: RealTimeDataServiceConfig) {
    this.config = config;
  }

  /**
   * Start real-time data streaming
   */
  start(): void {
    if (this.isRunning) {
      console.warn('⚠️ Real-time service already running');
      return;
    }

    console.log(`🚀 Starting real-time data service for ${this.config.symbol}`);
    console.log(`   Update interval: ${this.config.updateInterval}ms`);
    console.log(`   Data refresh: every ${this.config.dataRefreshInterval}ms`);
    
    this.isRunning = true;
    this.updateCount = 0;

    // Start price updates
    this.updateInterval = setInterval(() => {
      this.fetchPriceUpdate();
    }, this.config.updateInterval);

    // Start data refresh (for new signals)
    this.dataRefreshInterval = setInterval(() => {
      this.refreshFullDataset();
    }, this.config.dataRefreshInterval);

    // Initial price fetch
    this.fetchPriceUpdate();
  }

  /**
   * Stop real-time data streaming
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log(`⏹️ Stopping real-time data service for ${this.config.symbol}`);
    
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
    
    if (this.dataRefreshInterval) {
      clearInterval(this.dataRefreshInterval);
      this.dataRefreshInterval = undefined;
    }
  }

  /**
   * Subscribe to real-time price updates
   */
  onUpdate(callback: (update: RealTimeUpdate) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to full data refresh events
   */
  onDataRefresh(callback: (data: OHLCV[]) => void): () => void {
    this.dataRefreshListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.dataRefreshListeners.indexOf(callback);
      if (index > -1) {
        this.dataRefreshListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      symbol: this.config.symbol,
      updateInterval: this.config.updateInterval,
      updateCount: this.updateCount,
      lastPrice: this.lastPrice,
      listeners: this.listeners.length
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RealTimeDataServiceConfig>): void {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.config = { ...this.config, ...newConfig };
    
    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Fetch latest price and generate update
   */
  private async fetchPriceUpdate(): Promise<void> {
    try {
      this.updateCount++;
      
      const price = await alphaVantageService.getLatestPrice(this.config.symbol);
      const timestamp = new Date();
      const isMarketHours = this.isMarketHours(timestamp);

      // Only process during market hours or if price changed significantly
      const priceChange = Math.abs(price - this.lastPrice);
      const significantChange = priceChange > 0.01; // 1 cent change
      
      if (!isMarketHours && !significantChange) {
        console.log(`💤 Market closed, skipping update (${price})`);
        return;
      }

      this.lastPrice = price;

      let signal: SignalData | undefined;
      let macd: { value: number; signal: number; histogram: number } | undefined;

      // Generate signals if enabled and during market hours
      if (this.config.enableSignalGeneration && isMarketHours) {
        const update = macdService.updateWithNewPrice(price, timestamp);
        
        if (update.signal) {
          signal = update.signal;
          
          // Add to analytics if enabled
          if (this.config.enableAnalytics) {
            const signalId = signalAnalyticsService.addSignal(signal);
            signal.id = signalId;
            console.log(`🎯 New ${signal.type} signal: $${signal.price.toFixed(2)} (confidence: ${signal.confidence.toFixed(1)})`);
          }
        }
        
        if (update.macd) {
          macd = update.macd;
        }
      }

      // Simulate signal exits if analytics enabled
      if (this.config.enableAnalytics) {
        signalAnalyticsService.simulateSignalExits(price, timestamp);
      }

      const update: RealTimeUpdate = {
        timestamp,
        price,
        signal,
        macd,
        isMarketHours
      };

      // Notify all listeners
      this.listeners.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error('❌ Error in update listener:', error);
        }
      });

      console.log(`💰 ${this.config.symbol}: $${price.toFixed(2)} ${signal ? `| 🎯 ${signal.type.toUpperCase()}` : ''} ${isMarketHours ? '🟢' : '🔴'}`);

    } catch (error) {
      console.error('❌ Real-time update error:', error);
    }
  }

  /**
   * Refresh full dataset for new signal generation
   */
  private async refreshFullDataset(): Promise<void> {
    try {
      console.log('🔄 Refreshing full dataset for comprehensive signal analysis...');
      
      // Clear cache to force fresh data
      alphaVantageService.clearCache();
      
      // Fetch fresh intraday data
      const freshData = await alphaVantageService.fetchIntradayData(this.config.symbol);
      
      if (freshData.length === 0) {
        console.warn('⚠️ No fresh data received');
        return;
      }

      // Recalculate all indicators and signals
      const ema9Data = macdService.calculateEMA9(freshData);
      const macdData = macdService.calculateMACD(freshData);
      const signals = macdService.generateSignals(freshData, macdData);

      // Add new signals to analytics
      if (this.config.enableAnalytics) {
        signals.forEach(signal => {
          const signalId = signalAnalyticsService.addSignal(signal);
          signal.id = signalId;
        });
      }

      // Notify data refresh listeners
      this.dataRefreshListeners.forEach(callback => {
        try {
          callback(freshData);
        } catch (error) {
          console.error('❌ Error in data refresh listener:', error);
        }
      });

      console.log(`✅ Dataset refreshed: ${freshData.length} bars, ${signals.length} signals`);

    } catch (error) {
      console.error('❌ Data refresh error:', error);
    }
  }

  /**
   * Check if current time is during market hours
   */
  private isMarketHours(date: Date): boolean {
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Weekend check
    if (day === 0 || day === 6) {
      return false;
    }

    // Convert to EST
    const estTime = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hours = estTime.getHours();
    const minutes = estTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Market hours: 9:30 AM - 4:00 PM EST
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM

    return totalMinutes >= marketOpen && totalMinutes < marketClose;
  }
}

// Export singleton instance for SPY
export const spyRealTimeService = new RealTimeDataService({
  symbol: 'SPY',
  updateInterval: 30000, // 30 seconds
  dataRefreshInterval: 300000, // 5 minutes
  enableSignalGeneration: true,
  enableAnalytics: true
});
