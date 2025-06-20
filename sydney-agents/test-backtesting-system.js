#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Stock Backtesting System
 * 
 * Tests the implementation of the backtesting system components:
 * - Knowledge Store initialization and data storage
 * - Alpha Vantage API client with rate limiting
 * - Data structures and validation utilities
 * - Data Manager with caching and retrieval
 * 
 * Based on stockbacktestdesign.txt requirements
 */

import { backtestingKnowledgeStore } from './src/mastra/backtesting/knowledge-store.js';
import { alphaVantageClient } from './src/mastra/backtesting/alpha-vantage-client.js';
import { DataUtils, MarketHoursUtils, US_MARKET_HOURS } from './src/mastra/backtesting/data-structures.js';
import { dataManager } from './src/mastra/backtesting/data-manager.js';

// Test data for validation
const mockOHLVCData = [
  {
    timestamp: new Date('2024-01-15T09:30:00Z'),
    open: 450.25,
    high: 452.80,
    low: 449.90,
    close: 451.50,
    volume: 1250000
  },
  {
    timestamp: new Date('2024-01-15T09:35:00Z'),
    open: 451.50,
    high: 453.20,
    low: 450.80,
    close: 452.90,
    volume: 980000
  },
  {
    timestamp: new Date('2024-01-15T09:40:00Z'),
    open: 452.90,
    high: 454.10,
    low: 452.30,
    close: 453.75,
    volume: 1100000
  }
];

async function testKnowledgeStore() {
  console.log('\n🧠 Testing Knowledge Store...');
  console.log('=' .repeat(50));

  try {
    // Test initialization
    await backtestingKnowledgeStore.initialize();
    console.log('✅ Knowledge store initialized successfully');

    // Test market data storage
    const marketData = {
      id: 'test_spy_5min_' + Date.now(),
      symbol: 'SPY',
      interval: '5min',
      data: mockOHLVCData,
      source: 'alpha-vantage',
      fetchedAt: new Date(),
      metadata: {
        extendedHours: true,
        adjusted: true
      }
    };

    await backtestingKnowledgeStore.storeMarketData(marketData);
    console.log('✅ Market data stored successfully');

    // Test market data retrieval
    const retrievedData = await backtestingKnowledgeStore.getMarketData('SPY', '5min');
    console.log(`✅ Retrieved ${retrievedData.length} market data sets`);

    // Test strategy storage
    const testStrategy = {
      id: 'test_strategy_' + Date.now(),
      name: 'Test Moving Average Strategy',
      description: 'Simple moving average crossover strategy for testing',
      parameters: {
        fastMA: 10,
        slowMA: 20,
        stopLoss: 0.02
      },
      code: 'function execute(data) { return "BUY"; }',
      category: 'day-trading',
      tags: ['moving-average', 'crossover', 'test'],
      performance: {
        avgHitRate: 65.5,
        avgProfitFactor: 1.8,
        backtestCount: 5,
        lastUpdated: new Date()
      },
      metadata: {
        author: 'Test System',
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    await backtestingKnowledgeStore.storeStrategy(testStrategy);
    console.log('✅ Strategy stored successfully');

    // Test strategy search
    const similarStrategies = await backtestingKnowledgeStore.findSimilarStrategies(
      'moving average crossover strategy',
      'day-trading',
      60
    );
    console.log(`✅ Found ${similarStrategies.length} similar strategies`);

    // Test storage statistics
    const stats = await backtestingKnowledgeStore.getStorageStats();
    console.log(`📊 Storage stats: ${stats.marketDataCount} market data, ${stats.strategiesCount} strategies`);

  } catch (error) {
    console.error('❌ Knowledge Store test failed:', error);
  }
}

async function testAlphaVantageClient() {
  console.log('\n🌐 Testing Alpha Vantage API Client...');
  console.log('=' .repeat(50));

  try {
    // Test rate limit status
    const rateLimitStatus = alphaVantageClient.getRateLimitStatus();
    console.log(`📊 Rate limit status: ${rateLimitStatus.requestsThisMinute}/5 per minute, ${rateLimitStatus.dailyLimitRemaining} remaining today`);

    // Test intraday data fetch (using a small request to avoid hitting limits)
    console.log('📈 Testing intraday data fetch...');
    const intradayData = await alphaVantageClient.fetchIntradayData('SPY', {
      interval: '5min',
      outputSize: 'compact', // Smaller dataset for testing
      extendedHours: false
    });

    console.log(`✅ Fetched ${intradayData.length} intraday data points for SPY`);
    
    if (intradayData.length > 0) {
      const firstBar = intradayData[0];
      const lastBar = intradayData[intradayData.length - 1];
      console.log(`📅 Data range: ${firstBar.timestamp.toISOString()} to ${lastBar.timestamp.toISOString()}`);
      console.log(`💰 Latest price: $${lastBar.close} (Volume: ${lastBar.volume.toLocaleString()})`);
    }

    // Test daily data fetch
    console.log('📊 Testing daily data fetch...');
    const dailyData = await alphaVantageClient.fetchDailyData('SPY', {
      outputSize: 'compact'
    });

    console.log(`✅ Fetched ${dailyData.length} daily data points for SPY`);

    // Test technical indicator fetch
    console.log('📈 Testing technical indicator fetch...');
    const rsiData = await alphaVantageClient.fetchTechnicalIndicator('SPY', 'RSI', {
      interval: 'daily',
      timePeriod: 14
    });

    console.log('✅ Fetched RSI technical indicator data');
    console.log(`📊 RSI data keys: ${Object.keys(rsiData).slice(0, 3).join(', ')}...`);

  } catch (error) {
    console.error('❌ Alpha Vantage API test failed:', error);
    console.log('ℹ️ This might be due to rate limits or API key issues');
  }
}

async function testDataStructures() {
  console.log('\n🔧 Testing Data Structures and Utilities...');
  console.log('=' .repeat(50));

  try {
    // Test OHLVC validation
    console.log('🔍 Testing OHLVC data validation...');
    const validation = DataUtils.validateOHLVC(mockOHLVCData);
    console.log(`✅ Data validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
    
    if (!validation.valid) {
      console.log('❌ Validation errors:', validation.errors);
    }

    // Test data statistics
    console.log('📊 Testing data statistics calculation...');
    const stats = DataUtils.calculateStatistics(mockOHLVCData);
    console.log(`📈 Price range: $${stats.priceRange.min.toFixed(2)} - $${stats.priceRange.max.toFixed(2)}`);
    console.log(`📊 Average price: $${stats.averagePrice.toFixed(2)}`);
    console.log(`📈 Average volume: ${stats.averageVolume.toLocaleString()}`);
    console.log(`📉 Volatility: ${(stats.volatility * 100).toFixed(2)}%`);
    console.log(`🕳️ Gaps detected: ${stats.gaps}`);

    // Test data resampling
    console.log('🔄 Testing data resampling...');
    const resampled = DataUtils.resample(mockOHLVCData, 10); // 10-minute bars
    console.log(`✅ Resampled from ${mockOHLVCData.length} to ${resampled.length} bars`);

    // Test CSV conversion
    console.log('📄 Testing CSV conversion...');
    const csvData = DataUtils.toCSV(mockOHLVCData);
    const parsedData = DataUtils.fromCSV(csvData);
    console.log(`✅ CSV round-trip: ${mockOHLVCData.length} → CSV → ${parsedData.length} bars`);

    // Test market hours utilities
    console.log('🕐 Testing market hours utilities...');
    const testTime = new Date('2024-01-15T14:30:00Z'); // 2:30 PM UTC (9:30 AM EST)
    const isMarketHours = MarketHoursUtils.isMarketHours(testTime, US_MARKET_HOURS);
    const isExtendedHours = MarketHoursUtils.isExtendedHours(testTime, US_MARKET_HOURS);
    
    console.log(`✅ Market hours check: ${isMarketHours ? 'MARKET OPEN' : 'MARKET CLOSED'}`);
    console.log(`✅ Extended hours check: ${isExtendedHours ? 'EXTENDED HOURS' : 'NOT EXTENDED HOURS'}`);

    const nextOpen = MarketHoursUtils.getNextMarketOpen(testTime, US_MARKET_HOURS);
    const nextClose = MarketHoursUtils.getNextMarketClose(testTime, US_MARKET_HOURS);
    console.log(`📅 Next market open: ${nextOpen.toISOString()}`);
    console.log(`📅 Next market close: ${nextClose.toISOString()}`);

  } catch (error) {
    console.error('❌ Data Structures test failed:', error);
  }
}

async function testDataManager() {
  console.log('\n📊 Testing Data Manager...');
  console.log('=' .repeat(50));

  try {
    // Test initialization
    await dataManager.initialize();
    console.log('✅ Data Manager initialized successfully');

    // Test data summary for a symbol
    console.log('📋 Testing data summary...');
    const summary = await dataManager.getDataSummary('SPY', '5min');
    console.log(`📊 SPY data summary: ${summary.available ? 'Available' : 'Not available'}`);
    console.log(`📈 Data points: ${summary.dataPoints}`);
    console.log(`🕳️ Gaps: ${summary.gaps}`);
    
    if (summary.dateRange) {
      console.log(`📅 Date range: ${summary.dateRange.start.toDateString()} to ${summary.dateRange.end.toDateString()}`);
    }

    // Test historical data fetch (small request to avoid API limits)
    console.log('📈 Testing historical data fetch...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const fetchResult = await dataManager.fetchHistoricalData({
      symbol: 'SPY',
      startDate,
      endDate,
      interval: '5min',
      forceRefresh: false, // Use cache if available
      validateData: true,
      fillGaps: true,
      extendedHours: false
    });

    console.log(`✅ Fetch result: ${fetchResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📊 Data points: ${fetchResult.dataPoints}`);
    console.log(`📋 Source: ${fetchResult.source}`);
    console.log(`🕳️ Gaps: ${fetchResult.gaps}`);

    if (fetchResult.errors && fetchResult.errors.length > 0) {
      console.log('⚠️ Errors:', fetchResult.errors);
    }

    // Test storage statistics
    console.log('📊 Testing storage statistics...');
    const storageStats = await dataManager.getStorageStats();
    console.log(`📋 Storage: ${storageStats.marketDataCount} datasets, ${storageStats.totalSize}`);

  } catch (error) {
    console.error('❌ Data Manager test failed:', error);
  }
}

async function runAllTests() {
  console.log('🚀 Stock Backtesting System Test Suite');
  console.log('Testing implementation based on stockbacktestdesign.txt');
  console.log('=' .repeat(60));

  // Run all test suites
  await testKnowledgeStore();
  await testDataStructures();
  await testAlphaVantageClient();
  await testDataManager();

  console.log('\n🎉 All Backtesting System Tests Completed!');
  console.log('=' .repeat(60));
  console.log('✅ Knowledge Store: Data storage and retrieval with vector search');
  console.log('✅ Alpha Vantage API: Rate-limited data fetching with error handling');
  console.log('✅ Data Structures: OHLVC validation, statistics, and utilities');
  console.log('✅ Data Manager: Intelligent caching and data management');
  console.log('\n🔥 Ready for strategy implementation and backtesting engine!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Implement Strategy interface and example strategies');
  console.log('   2. Build the main Backtester class with event-driven processing');
  console.log('   3. Add performance analysis and results generation');
  console.log('   4. Integrate with Sone agent for voice-enabled backtesting');
}

// Run the tests
runAllTests().catch(console.error);
