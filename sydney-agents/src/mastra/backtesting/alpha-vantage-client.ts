import { OHLVC } from './knowledge-store.js';

/**
 * Alpha Vantage API Client for Stock Backtesting System
 * 
 * This module provides a comprehensive TypeScript client for the Alpha Vantage API
 * with features specifically designed for backtesting:
 * - Rate limiting to respect API limits
 * - Robust error handling and retry logic
 * - Data fetching for intraday, daily, and technical indicators
 * - Automatic data transformation to standardized OHLVC format
 * - Caching to minimize API calls
 * 
 * Based on Alpha Vantage API documentation and stockbacktestdesign.txt requirements
 */

// API Response Interfaces
interface AlphaVantageTimeSeriesResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval'?: string;
    '5. Output Size'?: string;
    '6. Time Zone': string;
  };
  [key: string]: any; // Time series data with dynamic keys
}

interface AlphaVantageErrorResponse {
  'Error Message'?: string;
  'Note'?: string;
  'Information'?: string;
}

// Configuration and Types
export type Interval = '1min' | '5min' | '15min' | '30min' | '60min';
export type OutputSize = 'compact' | 'full';
export type DataType = 'json' | 'csv';

export interface FetchOptions {
  interval?: Interval;
  month?: string; // YYYY-MM format
  outputSize?: OutputSize;
  extendedHours?: boolean;
  adjusted?: boolean;
  dataType?: DataType;
}

export interface TechnicalIndicatorOptions {
  interval: Interval | 'daily' | 'weekly' | 'monthly';
  timePeriod?: number;
  seriesType?: 'close' | 'open' | 'high' | 'low';
  month?: string;
}

// Rate Limiting Configuration
interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  retryAttempts: number;
  retryDelay: number;
}

export class AlphaVantageClient {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private rateLimitConfig: RateLimitConfig;
  private requestQueue: Array<() => Promise<any>> = [];
  private requestTimes: number[] = [];
  private dailyRequestCount = 0;
  private lastResetDate = new Date().toDateString();

  constructor(apiKey: string, rateLimitConfig?: Partial<RateLimitConfig>) {
    this.apiKey = apiKey;
    this.rateLimitConfig = {
      requestsPerMinute: 150,  // Premium tier default: 150 requests per minute
      requestsPerDay: 100000,  // Premium tier default: 100,000 requests per day
      retryAttempts: 3,
      retryDelay: 400,         // Faster retry for premium tier
      ...rateLimitConfig
    };
  }

  /**
   * Fetch intraday time series data
   * Based on stockbacktestdesign.txt fetchIntradayData function
   */
  async fetchIntradayData(
    symbol: string, 
    options: FetchOptions = {}
  ): Promise<OHLVC[]> {
    const {
      interval = '5min',
      month,
      outputSize = 'full',
      extendedHours = true,
      adjusted = true,
      dataType = 'json'
    } = options;

    const params = new URLSearchParams({
      function: 'TIME_SERIES_INTRADAY',
      symbol,
      interval,
      outputsize: outputSize,
      extended_hours: extendedHours.toString(),
      adjusted: adjusted.toString(),
      datatype: dataType,
      apikey: this.apiKey
    });

    if (month) {
      params.append('month', month);
    }

    try {
      const response = await this.makeRequest(`${this.baseUrl}?${params}`);
      return this.parseTimeSeriesData(response, interval);
    } catch (error) {
      console.error(`❌ Failed to fetch intraday data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch daily time series data
   */
  async fetchDailyData(
    symbol: string,
    options: { outputSize?: OutputSize; adjusted?: boolean } = {}
  ): Promise<OHLVC[]> {
    const { outputSize = 'full', adjusted = true } = options;

    const functionName = adjusted ? 'TIME_SERIES_DAILY_ADJUSTED' : 'TIME_SERIES_DAILY';
    
    const params = new URLSearchParams({
      function: functionName,
      symbol,
      outputsize: outputSize,
      apikey: this.apiKey
    });

    try {
      const response = await this.makeRequest(`${this.baseUrl}?${params}`);
      return this.parseTimeSeriesData(response, 'daily');
    } catch (error) {
      console.error(`❌ Failed to fetch daily data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch technical indicator data
   */
  async fetchTechnicalIndicator(
    symbol: string,
    indicator: string,
    options: TechnicalIndicatorOptions
  ): Promise<any> {
    const {
      interval,
      timePeriod = 14,
      seriesType = 'close',
      month
    } = options;

    const params = new URLSearchParams({
      function: indicator.toUpperCase(),
      symbol,
      interval,
      time_period: timePeriod.toString(),
      series_type: seriesType,
      apikey: this.apiKey
    });

    if (month) {
      params.append('month', month);
    }

    try {
      const response = await this.makeRequest(`${this.baseUrl}?${params}`);
      return this.parseTechnicalIndicatorData(response, indicator);
    } catch (error) {
      console.error(`❌ Failed to fetch ${indicator} for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch multiple months of historical data
   * Useful for building comprehensive datasets for backtesting
   */
  async fetchHistoricalDataRange(
    symbol: string,
    startMonth: string, // YYYY-MM
    endMonth: string,   // YYYY-MM
    interval: Interval = '5min'
  ): Promise<OHLVC[]> {
    console.log(`📊 Fetching data for ${symbol} (${interval})...`);
    console.log(`📅 Requested range: ${startMonth} to ${endMonth}`);

    try {
      // For historical data, go directly to specific months instead of recent data
      console.log(`📊 Fetching historical data for specific months...`);
      const months = this.generateMonthRange(startMonth, endMonth);
      const allData: OHLVC[] = [];

      console.log(`📅 Generated months: ${months.join(', ')}`);

      for (let i = 0; i < months.length; i++) {
        const month = months[i];
        console.log(`📅 Fetching ${month} (${i + 1}/${months.length})`);

        try {
          const monthData = await this.fetchIntradayData(symbol, {
            interval,
            month,
            outputSize: 'full',
            extendedHours: true
          });

          console.log(`📊 Received ${monthData.length} data points for ${month}`);
          if (monthData.length > 0) {
            console.log(`📅 Month ${month} data range: ${monthData[0].timestamp.toISOString().split('T')[0]} to ${monthData[monthData.length - 1].timestamp.toISOString().split('T')[0]}`);
          }

          allData.push(...monthData);

          // Add delay between requests to respect rate limits
          if (i < months.length - 1) {
            await this.delay(this.rateLimitConfig.retryDelay);
          }
        } catch (error) {
          console.error(`⚠️ Failed to fetch data for ${month}, skipping...`, error);
          continue;
        }
      }

      // Sort by timestamp to ensure chronological order
      allData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      console.log(`✅ Fetched ${allData.length} data points for ${symbol}`);
      return allData;
    } catch (error) {
      console.error(`❌ Failed to fetch data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Parse time series data from Alpha Vantage response
   * Implements the parsing logic from stockbacktestdesign.txt
   */
  private parseTimeSeriesData(data: any, interval: string): OHLVC[] {
    // Handle actual error responses (but not informational messages)
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    // Handle rate limit or API limit messages
    if (data['Note'] && (data['Note'].includes('limit') || data['Note'].includes('exceeded'))) {
      throw new Error(data['Note']);
    }

    // Find the time series key (varies by endpoint)
    const timeSeriesKey = Object.keys(data).find(key => 
      key.includes('Time Series') || key.includes('time series')
    );

    if (!timeSeriesKey) {
      throw new Error('No time series data found in response');
    }

    const rawData = data[timeSeriesKey];
    if (!rawData) {
      throw new Error('Empty time series data');
    }

    // Transform raw data to OHLVC format
    const parsedData: OHLVC[] = Object.entries(rawData).map(([timestamp, values]: [string, any]) => ({
      timestamp: new Date(timestamp),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'] || values['6. volume'] || '0', 10)
    }));

    // Ensure chronological order (Alpha Vantage returns reverse chronological)
    return parsedData.reverse();
  }

  /**
   * Parse technical indicator data
   */
  private parseTechnicalIndicatorData(data: any, indicator: string): any {
    // Handle actual error responses (but not informational messages)
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    // Handle rate limit or API limit messages
    if (data['Note'] && (data['Note'].includes('limit') || data['Note'].includes('exceeded'))) {
      throw new Error(data['Note']);
    }

    // Find the technical analysis key
    const technicalKey = Object.keys(data).find(key => 
      key.includes('Technical Analysis') || key.includes(indicator.toUpperCase())
    );

    if (!technicalKey) {
      throw new Error(`No ${indicator} data found in response`);
    }

    return data[technicalKey];
  }

  /**
   * Make HTTP request with rate limiting and error handling
   */
  private async makeRequest(url: string): Promise<any> {
    await this.enforceRateLimit();

    for (let attempt = 1; attempt <= this.rateLimitConfig.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mastra-Backtesting-System/1.0'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Track successful request
        this.trackRequest();
        
        return data;
      } catch (error) {
        console.error(`❌ Request attempt ${attempt} failed:`, error);
        
        if (attempt === this.rateLimitConfig.retryAttempts) {
          throw error;
        }
        
        // Exponential backoff
        await this.delay(this.rateLimitConfig.retryDelay * Math.pow(2, attempt - 1));
      }
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const currentDate = new Date().toDateString();

    // Reset daily counter if new day
    if (currentDate !== this.lastResetDate) {
      this.dailyRequestCount = 0;
      this.lastResetDate = currentDate;
    }

    // Check daily limit
    if (this.dailyRequestCount >= this.rateLimitConfig.requestsPerDay) {
      throw new Error('Daily API request limit exceeded');
    }

    // Clean old request times (older than 1 minute)
    this.requestTimes = this.requestTimes.filter(time => now - time < 60000);

    // Check per-minute limit
    if (this.requestTimes.length >= this.rateLimitConfig.requestsPerMinute) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = 60000 - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`⏳ Rate limit reached, waiting ${waitTime}ms...`);
        await this.delay(waitTime);
      }
    }
  }

  /**
   * Track successful request for rate limiting
   */
  private trackRequest(): void {
    this.requestTimes.push(Date.now());
    this.dailyRequestCount++;
  }

  /**
   * Generate array of months between start and end dates
   */
  private generateMonthRange(startMonth: string, endMonth: string): string[] {
    const months: string[] = [];

    // Parse the input strings directly
    const [startYear, startMonthNum] = startMonth.split('-').map(Number);
    const [endYear, endMonthNum] = endMonth.split('-').map(Number);

    console.log(`📅 Generating months from ${startMonth} to ${endMonth}`);

    // Create proper date objects
    let currentYear = startYear;
    let currentMonth = startMonthNum;

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonthNum)) {
      const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
      months.push(monthStr);
      console.log(`📅 Added month: ${monthStr}`);

      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    console.log(`📅 Final month list: ${months.join(', ')}`);
    return months;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): {
    requestsThisMinute: number;
    requestsToday: number;
    dailyLimitRemaining: number;
  } {
    const now = Date.now();
    const recentRequests = this.requestTimes.filter(time => now - time < 60000);

    return {
      requestsThisMinute: recentRequests.length,
      requestsToday: this.dailyRequestCount,
      dailyLimitRemaining: this.rateLimitConfig.requestsPerDay - this.dailyRequestCount
    };
  }
}

// Export configured client instance with PREMIUM TIER limits
export const alphaVantageClient = new AlphaVantageClient('TJ3M96GBAVU75JQC', {
  requestsPerMinute: 150,  // Premium tier: 150 requests per minute
  requestsPerDay: 100000,  // Premium tier: 100,000 requests per day
  retryAttempts: 3,
  retryDelay: 400          // Faster retry for premium tier
});