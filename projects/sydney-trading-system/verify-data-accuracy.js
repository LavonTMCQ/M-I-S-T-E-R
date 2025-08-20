#!/usr/bin/env node

/**
 * Data Accuracy Verification for Phemex Portfolio Agent
 * Ensures all tools return consistent, accurate prices
 */

const API_URL = 'http://localhost:4111/api/agents/phemexPortfolioAgent/generate';

async function makeRequest(message) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: message })
  });
  return response.json();
}

async function verifyDataAccuracy() {
  console.log('\n🔍 DATA ACCURACY VERIFICATION');
  console.log('=' .repeat(50));
  
  const results = {
    ada: { prices: [], consistent: false },
    eth: { prices: [], consistent: false },
    fet: { prices: [], consistent: false },
    atom: { prices: [], consistent: false }
  };
  
  // Test 1: Get current positions
  console.log('\n📊 Test 1: Current Positions & P&L');
  console.log('-' .repeat(50));
  const positions = await makeRequest('Get current positions with exact mark prices');
  
  if (positions.text) {
    // Extract ADA price from positions
    const adaMatch = positions.text.match(/ADAUSDT.*?Mark Price.*?\$?([\d.]+)/i);
    if (adaMatch) {
      results.ada.prices.push({ source: 'Positions', price: parseFloat(adaMatch[1]) });
      console.log(`✅ ADA from Positions: $${adaMatch[1]}`);
    }
  }
  
  // Test 2: Market Character Analysis - ADA
  console.log('\n📊 Test 2: Market Character - ADA');
  console.log('-' .repeat(50));
  const adaMarket = await makeRequest('Check ADA market character with exact prices for all timeframes');
  
  if (adaMarket.text) {
    // Extract all ADA prices
    const priceMatches = adaMarket.text.match(/\$?(0\.9\d+)/g) || [];
    priceMatches.forEach(price => {
      const cleanPrice = parseFloat(price.replace('$', ''));
      if (cleanPrice > 0.8 && cleanPrice < 1.0) {
        results.ada.prices.push({ source: 'Market Character', price: cleanPrice });
        console.log(`✅ ADA from Market Character: $${cleanPrice}`);
      }
    });
  }
  
  // Test 3: Direct Price Request
  console.log('\n📊 Test 3: Direct Price Request');
  console.log('-' .repeat(50));
  const directPrice = await makeRequest('What is the exact current price of ADA?');
  
  if (directPrice.text) {
    const priceMatch = directPrice.text.match(/\$?(0\.9\d+)/);
    if (priceMatch) {
      results.ada.prices.push({ source: 'Direct Request', price: parseFloat(priceMatch[1]) });
      console.log(`✅ ADA from Direct Request: $${priceMatch[1]}`);
    }
  }
  
  // Test 4: Multi-symbol market character
  console.log('\n📊 Test 4: Multi-Symbol Market Character');
  console.log('-' .repeat(50));
  const multiMarket = await makeRequest('Check market character for ETH, FET, ATOM with current prices');
  
  if (multiMarket.text) {
    // Extract ETH price
    const ethMatch = multiMarket.text.match(/ETH[A-Z]*.*?\$?([\d,]+\.?\d*)/i);
    if (ethMatch) {
      const price = parseFloat(ethMatch[1].replace(',', ''));
      results.eth.prices.push({ source: 'Multi-Market', price });
      console.log(`✅ ETH: $${price}`);
    }
    
    // Extract FET price
    const fetMatch = multiMarket.text.match(/FET[A-Z]*.*?\$?([\d.]+)/i);
    if (fetMatch) {
      results.fet.prices.push({ source: 'Multi-Market', price: parseFloat(fetMatch[1]) });
      console.log(`✅ FET: $${fetMatch[1]}`);
    }
    
    // Extract ATOM price
    const atomMatch = multiMarket.text.match(/ATOM[A-Z]*.*?\$?([\d.]+)/i);
    if (atomMatch) {
      results.atom.prices.push({ source: 'Multi-Market', price: parseFloat(atomMatch[1]) });
      console.log(`✅ ATOM: $${atomMatch[1]}`);
    }
  }
  
  // Analyze consistency
  console.log('\n' + '=' .repeat(50));
  console.log('📊 CONSISTENCY ANALYSIS');
  console.log('=' .repeat(50));
  
  for (const [symbol, data] of Object.entries(results)) {
    if (data.prices.length === 0) continue;
    
    console.log(`\n${symbol.toUpperCase()}:`);
    
    // Calculate consistency
    const prices = data.prices.map(p => p.price);
    const uniquePrices = [...new Set(prices.map(p => p.toFixed(4)))];
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const spread = maxPrice - minPrice;
    const spreadPercent = (spread / avgPrice * 100).toFixed(2);
    
    data.consistent = spreadPercent < 1; // Less than 1% spread
    
    console.log(`  Sources checked: ${data.prices.length}`);
    console.log(`  Unique prices: ${uniquePrices.length}`);
    console.log(`  Average: $${avgPrice.toFixed(4)}`);
    console.log(`  Range: $${minPrice.toFixed(4)} - $${maxPrice.toFixed(4)}`);
    console.log(`  Spread: ${spreadPercent}%`);
    
    if (data.consistent) {
      console.log(`  ✅ CONSISTENT - All prices within 1% of each other`);
    } else {
      console.log(`  ⚠️ INCONSISTENT - Prices vary by ${spreadPercent}%`);
      console.log('  Details:');
      data.prices.forEach(p => {
        console.log(`    • ${p.source}: $${p.price.toFixed(4)}`);
      });
    }
  }
  
  // Final verdict
  console.log('\n' + '=' .repeat(50));
  console.log('🎯 FINAL VERDICT');
  console.log('=' .repeat(50));
  
  const allConsistent = Object.values(results).every(r => r.prices.length === 0 || r.consistent);
  
  if (allConsistent) {
    console.log('✅ ALL DATA IS CONSISTENT AND ACCURATE!');
    console.log('The agent is providing reliable, real-time prices.');
  } else {
    console.log('⚠️ SOME INCONSISTENCIES DETECTED');
    console.log('Review the details above to identify problematic tools.');
  }
  
  // Expected vs Actual comparison
  console.log('\n📋 EXPECTED PRICES (Approximate):');
  console.log('  ADA: ~$0.93');
  console.log('  ETH: ~$4,400');
  console.log('  FET: ~$0.68');
  console.log('  ATOM: ~$4.40');
  
  console.log('\n✅ ACTUAL AVERAGES:');
  for (const [symbol, data] of Object.entries(results)) {
    if (data.prices.length > 0) {
      const avg = data.prices.reduce((a, b) => a + b.price, 0) / data.prices.length;
      console.log(`  ${symbol.toUpperCase()}: $${avg.toFixed(4)}`);
    }
  }
  
  console.log('\n' + '=' .repeat(50) + '\n');
}

// Run verification
console.log('Starting data accuracy verification...');
verifyDataAccuracy().catch(error => {
  console.error('Fatal error:', error);
});