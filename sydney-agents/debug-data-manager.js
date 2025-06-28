#!/usr/bin/env node

/**
 * Debug Data Manager Issue
 * 
 * This script tests the data manager to see why it's returning 0 data points
 * when the Alpha Vantage API is working perfectly.
 */

import { dataManager } from './src/mastra/backtesting/data-manager.js';

async function debugDataManager() {
  console.log('🔍 Debugging Data Manager Issue...');
  console.log('=' .repeat(50));

  try {
    // Test 1: Try fetching recent data (should work)
    console.log('\n📊 Test 1: Fetching recent data (last 7 days)...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    const recentResult = await dataManager.fetchHistoricalData({
      symbol: 'SPY',
      startDate,
      endDate,
      interval: '5min',
      forceRefresh: true
    });

    console.log(`✅ Recent data result: ${recentResult.dataPoints} points`);
    if (recentResult.data.length > 0) {
      console.log(`📅 Data range: ${recentResult.data[0].timestamp.toISOString()} to ${recentResult.data[recentResult.data.length - 1].timestamp.toISOString()}`);
    }

    // Test 2: Try fetching historical data (December 2024)
    console.log('\n📊 Test 2: Fetching historical data (December 2024)...');
    const historicalStart = new Date('2024-12-01');
    const historicalEnd = new Date('2024-12-31');

    console.log(`📅 Date range: ${historicalStart.toISOString().split('T')[0]} to ${historicalEnd.toISOString().split('T')[0]}`);

    const historicalResult = await dataManager.fetchHistoricalData({
      symbol: 'SPY',
      startDate: historicalStart,
      endDate: historicalEnd,
      interval: '5min',
      forceRefresh: true
    });

    console.log(`✅ Historical data result: ${historicalResult.dataPoints} points`);
    if (historicalResult.data.length > 0) {
      console.log(`📅 Data range: ${historicalResult.data[0].timestamp.toISOString()} to ${historicalResult.data[historicalResult.data.length - 1].timestamp.toISOString()}`);
    }

    // Test 3: Check what the Alpha Vantage API actually returns
    console.log('\n📊 Test 3: Direct Alpha Vantage API test...');
    const { alphaVantageClient } = await import('./src/mastra/backtesting/alpha-vantage-client.js');
    
    const directData = await alphaVantageClient.fetchIntradayData('SPY', {
      interval: '5min',
      month: '2024-12'
    });

    console.log(`✅ Direct API result: ${directData.length} points`);
    if (directData.length > 0) {
      console.log(`📅 API data range: ${directData[0].timestamp.toISOString()} to ${directData[directData.length - 1].timestamp.toISOString()}`);
    }

  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

debugDataManager().catch(console.error);
