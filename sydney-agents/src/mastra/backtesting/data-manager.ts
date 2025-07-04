import { alphaVantageClient, Interval } from './alpha-vantage-client.js';
import { backtestingKnowledgeStore, OHLVC, MarketData } from './knowledge-store.js';
import { DataUtils } from './data-structures.js';

/**
 * Data Fetching and Storage System for Stock Backtesting
 * 
 * This module implements the data layer from stockbacktestdesign.txt,
 * providing functions to:
 * - Fetch historical data from Alpha Vantage API
 * - Store data in Mastra knowledge store with proper indexing
 * - Retrieve and manage cached data efficiently
 * - Handle data validation and quality assurance
 * 
 * Key Features:
 * - Intelligent caching to minimize API calls
 * - Data validation and gap filling
 * - Multi-symbol data management
 * - Efficient storage and retrieval patterns
 */

export interface DataFetchOptions {
  symbol: string;
  startDate: Date;
  endDate: Date;
  interval: Interval;
  forceRefresh?: boolean;
  validateData?: boolean;
  fillGaps?: boolean;
  extendedHours?: boolean;
}

export interface DataFetchResult {
  success: boolean;
  data: OHLVC[];
  source: 'cache' | 'api' | 'mixed';
  dataPoints: number;
  dateRange: { start: Date; end: Date };
  gaps: number;
  errors?: string[];
}

export class DataManager {
  private static instance: DataManager;
  private initialized = false;

  private constructor() {}

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await backtestingKnowledgeStore.initialize();
      this.initialized = true;
      console.log('✅ Data Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Data Manager:', error);
      throw error;
    }
  }

  /**
   * Main data fetching function implementing the fetchIntradayData logic
   * from stockbacktestdesign.txt with intelligent caching
   */
  async fetchHistoricalData(options: DataFetchOptions): Promise<DataFetchResult> {
    await this.ensureInitialized();

    const {
      symbol,
      startDate,
      endDate,
      interval,
      forceRefresh = false,
      validateData = true,
      fillGaps = true,
      extendedHours = true
    } = options;

    console.log(`📊 Fetching historical data for ${symbol} (${interval}) from ${startDate.toDateString()} to ${endDate.toDateString()}`);

    try {
      let data: OHLVC[] = [];
      let source: 'cache' | 'api' | 'mixed' = 'cache';

      // Step 1: Check cache first (unless force refresh)
      if (!forceRefresh) {
        // Quick check if we have any data for this symbol/interval/date range
        const hasData = await backtestingKnowledgeStore.hasMarketData(symbol, interval, { start: startDate, end: endDate });

        if (hasData) {
          const cachedData = await this.getCachedData(symbol, interval, { start: startDate, end: endDate });
          if (cachedData.length > 0) {
            console.log(`📋 Found ${cachedData.length} cached data points for ${symbol} ${interval}`);
            data = cachedData;
            source = 'cache';
          }
        } else {
          console.log(`📋 No cached data found for ${symbol} ${interval} in date range`);
        }
      }

      // Step 2: Fetch missing data from API if needed
      if (data.length === 0 || forceRefresh) {
        console.log('🌐 Fetching data from Alpha Vantage API...');
        
        const apiData = await this.fetchFromAPI(symbol, startDate, endDate, interval, extendedHours);
        data = apiData;
        source = forceRefresh ? 'api' : 'mixed';

        // Store in cache for future use
        if (apiData.length > 0) {
          await this.cacheData(symbol, interval, apiData, extendedHours);
        }
      }

      // Step 3: Data validation
      if (validateData && data.length > 0) {
        const validation = DataUtils.validateOHLVC(data);
        if (!validation.valid) {
          console.warn(`⚠️ Data validation issues found:`, validation.errors);
          return {
            success: false,
            data: [],
            source,
            dataPoints: 0,
            dateRange: { start: startDate, end: endDate },
            gaps: 0,
            errors: validation.errors
          };
        }
      }

      // Step 4: Fill gaps if requested
      if (fillGaps && data.length > 0) {
        const intervalMinutes = this.getIntervalMinutes(interval);
        const originalLength = data.length;
        data = DataUtils.fillGaps(data, intervalMinutes);
        
        if (data.length > originalLength) {
          console.log(`🔧 Filled ${data.length - originalLength} data gaps`);
        }
      }

      // Step 5: Filter to requested date range
      data = data.filter(bar => 
        bar.timestamp >= startDate && bar.timestamp <= endDate
      );

      // Step 6: Calculate statistics
      const stats = DataUtils.calculateStatistics(data);

      const result: DataFetchResult = {
        success: true,
        data,
        source,
        dataPoints: data.length,
        dateRange: data.length > 0 ? {
          start: data[0].timestamp,
          end: data[data.length - 1].timestamp
        } : { start: startDate, end: endDate },
        gaps: stats.gaps
      };

      console.log(`✅ Successfully fetched ${result.dataPoints} data points from ${source}`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to fetch historical data for ${symbol}:`, error);
      return {
        success: false,
        data: [],
        source: 'api',
        dataPoints: 0,
        dateRange: { start: startDate, end: endDate },
        gaps: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Fetch data from Alpha Vantage API for a date range
   */
  private async fetchFromAPI(
    symbol: string,
    startDate: Date,
    endDate: Date,
    interval: Interval,
    _extendedHours: boolean
  ): Promise<OHLVC[]> {
    // Generate correct month range for API calls
    const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

    console.log(`📅 Fetching data for date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`📅 Using month range: ${startMonth} to ${endMonth}`);

    // Use Alpha Vantage client to fetch historical data range
    const data = await alphaVantageClient.fetchHistoricalDataRange(
      symbol,
      startMonth,
      endMonth,
      interval
    );

    console.log(`📊 Raw API data: ${data.length} points`);
    if (data.length > 0) {
      console.log(`📅 Data range: ${data[0].timestamp.toISOString().split('T')[0]} to ${data[data.length - 1].timestamp.toISOString().split('T')[0]}`);
    }

    // Filter to exact date range with more lenient comparison
    const filteredData = data.filter(bar => {
      const barDate = new Date(bar.timestamp);
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Set times to start/end of day for comparison
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      return barDate >= start && barDate <= end;
    });

    console.log(`📊 Filtered data: ${filteredData.length} points in requested range`);

    // If we still have no data, try a broader approach
    if (filteredData.length === 0 && data.length > 0) {
      console.log(`⚠️ No data in exact range, trying broader date matching...`);

      // Try matching just the date part (ignore time)
      const broadFilteredData = data.filter(bar => {
        const barDateStr = bar.timestamp.toISOString().split('T')[0];
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        return barDateStr >= startDateStr && barDateStr <= endDateStr;
      });

      console.log(`📊 Broad filtered data: ${broadFilteredData.length} points found`);
      return broadFilteredData;
    }

    return filteredData;
  }

  /**
   * Cache data in knowledge store
   */
  private async cacheData(
    symbol: string,
    interval: Interval,
    data: OHLVC[],
    extendedHours: boolean
  ): Promise<void> {
    if (data.length === 0) return;

    const marketData: MarketData = {
      id: `${symbol}_${interval}_${Date.now()}`,
      symbol,
      interval,
      data,
      source: 'alpha-vantage',
      fetchedAt: new Date(),
      metadata: {
        extendedHours,
        adjusted: true
      }
    };

    await backtestingKnowledgeStore.storeMarketData(marketData);
  }

  /**
   * Retrieve cached data from knowledge store
   */
  private async getCachedData(
    symbol: string,
    interval: Interval,
    dateRange: { start: Date; end: Date }
  ): Promise<OHLVC[]> {
    // Use the new efficient SQL-based retrieval that returns OHLVC[] directly
    return await backtestingKnowledgeStore.getMarketData(
      symbol,
      interval,
      dateRange
    );
  }

  /**
   * Batch fetch data for multiple symbols
   */
  async fetchMultipleSymbols(
    symbols: string[],
    options: Omit<DataFetchOptions, 'symbol'>
  ): Promise<Map<string, DataFetchResult>> {
    await this.ensureInitialized();

    const results = new Map<string, DataFetchResult>();
    
    console.log(`📊 Batch fetching data for ${symbols.length} symbols...`);

    // Process symbols sequentially to respect rate limits
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      console.log(`📈 Processing ${symbol} (${i + 1}/${symbols.length})`);

      try {
        const result = await this.fetchHistoricalData({
          ...options,
          symbol
        });
        results.set(symbol, result);

        // Add delay between symbols to respect rate limits
        if (i < symbols.length - 1) {
          await this.delay(1000);
        }
      } catch (error) {
        console.error(`❌ Failed to fetch data for ${symbol}:`, error);
        results.set(symbol, {
          success: false,
          data: [],
          source: 'api',
          dataPoints: 0,
          dateRange: { start: options.startDate, end: options.endDate },
          gaps: 0,
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }

    const successCount = Array.from(results.values()).filter(r => r.success).length;
    console.log(`✅ Successfully fetched data for ${successCount}/${symbols.length} symbols`);

    return results;
  }

  /**
   * Get available data summary for a symbol
   */
  async getDataSummary(symbol: string, interval: Interval): Promise<{
    available: boolean;
    dateRange?: { start: Date; end: Date };
    dataPoints: number;
    lastUpdated?: Date;
    gaps: number;
  }> {
    await this.ensureInitialized();

    try {
      const cachedData = await backtestingKnowledgeStore.getMarketData(symbol, interval);

      if (cachedData.length === 0) {
        return {
          available: false,
          dataPoints: 0,
          gaps: 0
        };
      }

      // Data is already sorted and deduplicated from SQL query
      const stats = DataUtils.calculateStatistics(cachedData);

      return {
        available: true,
        dateRange: cachedData.length > 0 ? {
          start: cachedData[0].timestamp,
          end: cachedData[cachedData.length - 1].timestamp
        } : undefined,
        dataPoints: cachedData.length,
        lastUpdated: new Date(), // Could be enhanced to track actual last update
        gaps: stats.gaps
      };
    } catch (error) {
      console.error(`❌ Failed to get data summary for ${symbol}:`, error);
      return {
        available: false,
        dataPoints: 0,
        gaps: 0
      };
    }
  }

  /**
   * Clean up old cached data
   */
  async cleanupOldData(olderThanDays: number = 30): Promise<void> {
    await this.ensureInitialized();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    await backtestingKnowledgeStore.cleanup(cutoffDate);
    console.log(`🧹 Cleaned up cached data older than ${olderThanDays} days`);
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    marketDataCount: number;
    totalSize: string;
    symbols: string[];
    intervals: string[];
  }> {
    await this.ensureInitialized();
    
    const stats = await backtestingKnowledgeStore.getStorageStats();
    
    // This would be enhanced to provide more detailed statistics
    return {
      marketDataCount: stats.marketDataCount,
      totalSize: stats.totalSize,
      symbols: [], // Would be populated from actual data
      intervals: [] // Would be populated from actual data
    };
  }

  /**
   * Utility methods
   */
  private getIntervalMinutes(interval: Interval): number {
    const intervalMap: Record<Interval, number> = {
      '1min': 1,
      '5min': 5,
      '15min': 15,
      '30min': 30,
      '60min': 60
    };
    return intervalMap[interval];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Export singleton instance
export const dataManager = DataManager.getInstance();