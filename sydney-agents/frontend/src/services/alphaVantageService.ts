/**
 * Alpha Vantage API Service for Real-Time SPY Data
 * Integrates with existing sydney-agents backend Alpha Vantage client
 */

import { OHLCV, TradingViewBar } from '@/types/tradingview';

export interface AlphaVantageConfig {
  apiKey: string;
  baseUrl: string;
  symbol: string;
  interval: string;
}

export class AlphaVantageService {
  private config: AlphaVantageConfig;
  private cache: Map<string, any> = new Map();
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  constructor(config: Partial<AlphaVantageConfig> = {}) {
    this.config = {
      apiKey: 'TJ3M96GBAVU75JQC', // Using our paid tier key
      baseUrl: 'https://www.alphavantage.co/query',
      symbol: 'SPY',
      interval: '5min',
      ...config
    };
  }

  /**
   * Fetch intraday data from Alpha Vantage
   */
  async fetchIntradayData(symbol: string = this.config.symbol): Promise<OHLCV[]> {
    const cacheKey = `intraday_${symbol}_${this.config.interval}`;
    const now = Date.now();

    // Check cache first
    if (this.cache.has(cacheKey) && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      console.log('📊 Using cached Alpha Vantage data');
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`📡 Fetching ${symbol} data from Alpha Vantage...`);
      
      const url = new URL(this.config.baseUrl);
      url.searchParams.append('function', 'TIME_SERIES_INTRADAY');
      url.searchParams.append('symbol', symbol);
      url.searchParams.append('interval', this.config.interval);
      url.searchParams.append('apikey', this.config.apiKey);
      url.searchParams.append('outputsize', 'full'); // Get more historical data for market hours filtering
      url.searchParams.append('datatype', 'json');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data = await response.json();

      // Check for API errors
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage Error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        console.warn('⚠️ Alpha Vantage API limit warning:', data['Note']);
        // Return cached data if available
        if (this.cache.has(cacheKey)) {
          return this.cache.get(cacheKey);
        }
        throw new Error('API call frequency limit reached');
      }

      const timeSeries = data[`Time Series (${this.config.interval})`];
      if (!timeSeries) {
        throw new Error('No time series data found in response');
      }

      // Convert to OHLCV format and filter for recent data
      const allData: OHLCV[] = Object.entries(timeSeries)
        .map(([timestamp, values]: [string, any]) => ({
          timestamp: new Date(timestamp),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // Sort chronologically

      // Filter to last 3 trading days to get more market hours data
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const ohlcvData = allData.filter(bar => bar.timestamp >= threeDaysAgo);

      console.log(`📅 Filtered to ${ohlcvData.length} bars from last 3 days (${allData.length} total available)`);
      if (ohlcvData.length > 0) {
        console.log(`📊 Data range: ${ohlcvData[0].timestamp.toLocaleString()} to ${ohlcvData[ohlcvData.length - 1].timestamp.toLocaleString()}`);
      }

      // Cache the result
      this.cache.set(cacheKey, ohlcvData);
      this.lastFetchTime = now;

      console.log(`✅ Fetched ${ohlcvData.length} ${symbol} data points from Alpha Vantage`);
      return ohlcvData;

    } catch (error) {
      console.error('❌ Alpha Vantage fetch error:', error);
      
      // Return cached data if available
      if (this.cache.has(cacheKey)) {
        console.log('📊 Falling back to cached data');
        return this.cache.get(cacheKey);
      }
      
      throw error;
    }
  }

  /**
   * Convert OHLCV data to TradingView Lightweight Charts format
   */
  convertToLightweightChartData(ohlcvData: OHLCV[]): TradingViewBar[] {
    return ohlcvData.map(bar => ({
      time: Math.floor(bar.timestamp.getTime() / 1000) as any, // Unix timestamp in seconds
      open: Number(bar.open.toFixed(2)),
      high: Number(bar.high.toFixed(2)),
      low: Number(bar.low.toFixed(2)),
      close: Number(bar.close.toFixed(2)),
      volume: bar.volume
    }));
  }

  /**
   * Get latest price for real-time updates
   */
  async getLatestPrice(symbol: string = this.config.symbol): Promise<number> {
    try {
      const url = new URL(this.config.baseUrl);
      url.searchParams.append('function', 'GLOBAL_QUOTE');
      url.searchParams.append('symbol', symbol);
      url.searchParams.append('apikey', this.config.apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data['Error Message']) {
        throw new Error(`Alpha Vantage Error: ${data['Error Message']}`);
      }

      const quote = data['Global Quote'];
      if (!quote) {
        throw new Error('No quote data found');
      }

      const price = parseFloat(quote['05. price']);
      console.log(`💰 Latest ${symbol} price: $${price.toFixed(2)}`);
      return price;

    } catch (error) {
      console.error('❌ Latest price fetch error:', error);
      throw error;
    }
  }

  /**
   * Start real-time price monitoring (simulated with periodic fetches)
   */
  startRealTimeUpdates(
    symbol: string,
    onUpdate: (price: number, timestamp: Date) => void,
    intervalMs: number = 60000 // 1 minute intervals
  ): () => void {
    console.log(`🔄 Starting real-time updates for ${symbol} (${intervalMs}ms intervals)`);
    
    const interval = setInterval(async () => {
      try {
        const price = await this.getLatestPrice(symbol);
        onUpdate(price, new Date());
      } catch (error) {
        console.error('❌ Real-time update error:', error);
      }
    }, intervalMs);

    // Return cleanup function
    return () => {
      console.log(`⏹️ Stopping real-time updates for ${symbol}`);
      clearInterval(interval);
    };
  }

  /**
   * Check API status and remaining calls
   */
  async checkApiStatus(): Promise<{ status: string; remainingCalls?: number }> {
    try {
      // Make a lightweight API call to check status
      const url = new URL(this.config.baseUrl);
      url.searchParams.append('function', 'GLOBAL_QUOTE');
      url.searchParams.append('symbol', 'SPY');
      url.searchParams.append('apikey', this.config.apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data['Error Message']) {
        return { status: 'error' };
      }

      if (data['Note']) {
        return { status: 'rate_limited' };
      }

      return { status: 'active' };

    } catch (error) {
      return { status: 'error' };
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.lastFetchTime = 0;
    console.log('🗑️ Alpha Vantage cache cleared');
  }
}

// Export singleton instance
export const alphaVantageService = new AlphaVantageService();

export default alphaVantageService;
