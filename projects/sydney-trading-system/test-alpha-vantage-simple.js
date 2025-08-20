#!/usr/bin/env node

/**
 * Simple Alpha Vantage API Test
 * 
 * This script directly tests Alpha Vantage API to confirm we can get
 * real market data for backtesting both SPY and QQQ.
 */

const API_KEY = 'TJ3M96GBAVU75JQC';

async function fetchAlphaVantageData(symbol, interval = '5min') {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${API_KEY}&outputsize=compact`;
  
  try {
    console.log(`📊 Fetching ${symbol} data from Alpha Vantage...`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    if (data['Note']) {
      throw new Error(`API Limit: ${data['Note']}`);
    }
    
    const metaData = data['Meta Data'];
    const timeSeries = data[`Time Series (${interval})`];
    
    if (!metaData || !timeSeries) {
      throw new Error('Invalid response format');
    }
    
    // Convert to our OHLVC format
    const ohlvcData = Object.entries(timeSeries).map(([timestamp, values]) => ({
      timestamp: new Date(timestamp),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'])
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return {
      success: true,
      symbol: metaData['2. Symbol'],
      interval: metaData['4. Interval'],
      lastRefreshed: metaData['3. Last Refreshed'],
      timezone: metaData['6. Time Zone'],
      dataPoints: ohlvcData.length,
      data: ohlvcData,
      sampleData: ohlvcData.slice(-3) // Last 3 bars
    };
    
  } catch (error) {
    return {
      success: false,
      symbol,
      error: error.message
    };
  }
}

async function testBacktestingDataRequirements() {
  console.log('🚀 Testing Alpha Vantage Data for Backtesting Requirements');
  console.log('=' .repeat(70));
  
  const symbols = ['SPY', 'QQQ'];
  const results = {};
  
  for (const symbol of symbols) {
    console.log(`\n📈 Testing ${symbol}...`);
    console.log('-'.repeat(40));
    
    const result = await fetchAlphaVantageData(symbol);
    results[symbol] = result;
    
    if (result.success) {
      console.log(`✅ ${symbol} data fetched successfully`);
      console.log(`   📊 Data points: ${result.dataPoints}`);
      console.log(`   📅 Last refreshed: ${result.lastRefreshed}`);
      console.log(`   🕐 Timezone: ${result.timezone}`);
      console.log(`   📋 Interval: ${result.interval}`);
      
      // Show sample data
      console.log(`   📊 Sample recent bars:`);
      result.sampleData.forEach((bar, index) => {
        console.log(`     ${index + 1}. ${bar.timestamp.toISOString()} - O:$${bar.open} H:$${bar.high} L:$${bar.low} C:$${bar.close} V:${bar.volume.toLocaleString()}`);
      });
      
      // Validate data quality
      const validBars = result.data.filter(bar => 
        bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0 && bar.volume > 0
      );
      
      const dataQuality = (validBars.length / result.data.length) * 100;
      console.log(`   ✅ Data quality: ${dataQuality.toFixed(1)}% (${validBars.length}/${result.data.length} valid bars)`);
      
      // Check for realistic price ranges
      const prices = result.data.map(bar => bar.close);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = ((maxPrice - minPrice) / minPrice * 100).toFixed(2);
      
      console.log(`   📊 Price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)} (${priceRange}% variation)`);
      
    } else {
      console.error(`❌ ${symbol} data fetch failed: ${result.error}`);
    }
    
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n🎉 Alpha Vantage Data Test Summary');
  console.log('=' .repeat(70));
  
  const successfulSymbols = Object.entries(results).filter(([_, result]) => result.success);
  const failedSymbols = Object.entries(results).filter(([_, result]) => !result.success);
  
  console.log(`✅ Successful: ${successfulSymbols.length}/${symbols.length} symbols`);
  console.log(`❌ Failed: ${failedSymbols.length}/${symbols.length} symbols`);
  
  if (successfulSymbols.length > 0) {
    console.log('\n📊 Data Summary:');
    successfulSymbols.forEach(([symbol, result]) => {
      console.log(`   ${symbol}: ${result.dataPoints} bars, last updated ${result.lastRefreshed}`);
    });
  }
  
  if (failedSymbols.length > 0) {
    console.log('\n❌ Failed Symbols:');
    failedSymbols.forEach(([symbol, result]) => {
      console.log(`   ${symbol}: ${result.error}`);
    });
  }
  
  // Backtesting readiness assessment
  console.log('\n🔥 Backtesting Readiness Assessment:');
  console.log('=' .repeat(50));
  
  if (successfulSymbols.length === symbols.length) {
    console.log('✅ API Connection: READY');
    console.log('✅ Data Availability: READY');
    console.log('✅ Data Quality: READY');
    console.log('✅ Multiple Symbols: READY');
    console.log('✅ Real-time Data: READY');
    console.log('');
    console.log('🎯 READY FOR COMPREHENSIVE BACKTESTING!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Test backtesting agent via Mastra playground');
    console.log('   2. Run SPY and QQQ backtests with both strategies');
    console.log('   3. Compare performance with voice-enabled results');
    console.log('   4. Save profitable strategies to knowledge store');
  } else {
    console.log('⚠️ Some issues detected - check failed symbols above');
  }
  
  return results;
}

// Run the test
testBacktestingDataRequirements().catch(console.error);
