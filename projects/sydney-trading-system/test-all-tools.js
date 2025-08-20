#!/usr/bin/env node

/**
 * Comprehensive test suite for all Phemex Portfolio Agent tools
 * Tests data accuracy, consistency, and functionality
 */

const API_URL = 'http://localhost:4111/api/agents/phemexPortfolioAgent/generate';

async function testTool(description, message) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log('=' .repeat(60));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: message })
    });
    
    const data = await response.json();
    
    if (data.text) {
      // Extract key information
      const text = data.text;
      
      // Look for prices
      const priceMatches = text.match(/\$[\d,]+\.?\d*/g) || [];
      if (priceMatches.length > 0) {
        console.log('💰 Prices found:', priceMatches.join(', '));
      }
      
      // Look for percentages
      const percentMatches = text.match(/-?\d+\.?\d*%/g) || [];
      if (percentMatches.length > 0) {
        console.log('📊 Percentages:', percentMatches.join(', '));
      }
      
      // Show first 500 chars of response
      console.log('\n📝 Response Preview:');
      console.log(text.substring(0, 500) + '...');
      
      return { success: true, data: text };
    } else {
      console.error('❌ No text in response');
      return { success: false, error: 'No text in response' };
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('\n🚀 COMPREHENSIVE PHEMEX PORTFOLIO AGENT TEST SUITE');
  console.log('=' .repeat(60));
  console.log(`Started: ${new Date().toLocaleTimeString()}`);
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Get Current Positions
  console.log('\n' + '=' .repeat(60));
  const positions = await testTool(
    '1. getCurrentPositions - P&L and Open Positions',
    'Get my current positions with P&L. Show exact numbers.'
  );
  results.tests.push({ name: 'getCurrentPositions', ...positions });
  if (positions.success) results.passed++; else results.failed++;
  
  // Test 2: Market Character for Single Symbol
  console.log('\n' + '=' .repeat(60));
  const adaMarket = await testTool(
    '2. marketCharacterAnalysis - ADA Only',
    'Run market character analysis for ADA only. Show exact prices for each timeframe.'
  );
  results.tests.push({ name: 'marketCharacterAnalysis-ADA', ...adaMarket });
  if (adaMarket.success) results.passed++; else results.failed++;
  
  // Test 3: Market Character for Multiple Symbols
  console.log('\n' + '=' .repeat(60));
  const multiMarket = await testTool(
    '3. marketCharacterAnalysis - Multiple Symbols',
    'Run market character analysis for ETH, FET, and ATOM. Show current prices.'
  );
  results.tests.push({ name: 'marketCharacterAnalysis-Multi', ...multiMarket });
  if (multiMarket.success) results.passed++; else results.failed++;
  
  // Test 4: Account Info
  console.log('\n' + '=' .repeat(60));
  const accountInfo = await testTool(
    '4. getAccountInfo - Balance and Equity',
    'Get my account balance, equity, and margin information.'
  );
  results.tests.push({ name: 'getAccountInfo', ...accountInfo });
  if (accountInfo.success) results.passed++; else results.failed++;
  
  // Test 5: Risk Analysis
  console.log('\n' + '=' .repeat(60));
  const riskAnalysis = await testTool(
    '5. analyzeRiskExposure - Liquidation and Margin',
    'Analyze my risk exposure. Show liquidation levels and margin usage.'
  );
  results.tests.push({ name: 'analyzeRiskExposure', ...riskAnalysis });
  if (riskAnalysis.success) results.passed++; else results.failed++;
  
  // Test 6: Direct Price Check
  console.log('\n' + '=' .repeat(60));
  const priceCheck = await testTool(
    '6. Direct Price Check - ADA, ETH, FET',
    'What are the current prices of ADA, ETH, and FET?'
  );
  results.tests.push({ name: 'priceCheck', ...priceCheck });
  if (priceCheck.success) results.passed++; else results.failed++;
  
  // Test 7: News Tool
  console.log('\n' + '=' .repeat(60));
  const news = await testTool(
    '7. comprehensiveNews - Portfolio Impact',
    'Get latest news for my portfolio symbols (ADA, ETH, FET, ATOM). Keep it brief.'
  );
  results.tests.push({ name: 'comprehensiveNews', ...news });
  if (news.success) results.passed++; else results.failed++;
  
  // Data Consistency Check
  console.log('\n' + '=' .repeat(60));
  console.log('\n🔍 DATA CONSISTENCY ANALYSIS');
  console.log('=' .repeat(60));
  
  // Extract all ADA prices found
  const adaPrices = [];
  results.tests.forEach(test => {
    if (test.data) {
      // Look for ADA prices in various formats
      const matches = test.data.match(/ADA.*?\$(\d+\.?\d*)/gi) || [];
      matches.forEach(match => {
        const price = match.match(/\$(\d+\.?\d*)/);
        if (price) adaPrices.push(parseFloat(price[1]));
      });
    }
  });
  
  if (adaPrices.length > 0) {
    const uniquePrices = [...new Set(adaPrices.map(p => p.toFixed(4)))];
    console.log(`\n📊 ADA Prices Found Across All Tests:`);
    uniquePrices.forEach(price => {
      console.log(`  • $${price}`);
    });
    
    if (uniquePrices.length === 1) {
      console.log('✅ EXCELLENT: All ADA prices are consistent!');
    } else {
      const min = Math.min(...adaPrices);
      const max = Math.max(...adaPrices);
      const spread = ((max - min) / min * 100).toFixed(2);
      console.log(`⚠️ WARNING: Price spread detected: ${spread}%`);
      console.log(`  Min: $${min.toFixed(4)}, Max: $${max.toFixed(4)}`);
    }
  }
  
  // Final Report
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${(results.passed / (results.passed + results.failed) * 100).toFixed(1)}%`);
  
  // Critical Checks
  console.log('\n🔐 CRITICAL DATA INTEGRITY CHECKS:');
  
  const checks = [
    {
      name: 'Price Consistency',
      passed: uniquePrices?.length === 1,
      message: uniquePrices?.length === 1 ? 'All prices match' : 'Price discrepancies found'
    },
    {
      name: 'P&L Data Available',
      passed: positions.success && positions.data?.includes('$'),
      message: positions.success ? 'P&L data retrieved' : 'P&L data missing'
    },
    {
      name: 'Market Character Working',
      passed: adaMarket.success && multiMarket.success,
      message: 'Market analysis functional'
    },
    {
      name: 'Risk Analysis Working',
      passed: riskAnalysis.success,
      message: riskAnalysis.success ? 'Risk metrics available' : 'Risk analysis failed'
    }
  ];
  
  checks.forEach(check => {
    console.log(`${check.passed ? '✅' : '❌'} ${check.name}: ${check.message}`);
  });
  
  console.log('\n' + '=' .repeat(60));
  console.log(`Completed: ${new Date().toLocaleTimeString()}`);
  console.log('=' .repeat(60) + '\n');
}

// Run tests
console.log('Starting comprehensive test suite...');
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});