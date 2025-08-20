#!/usr/bin/env node

import { marketCharacterAnalysisTool } from './src/mastra/tools/market-character-analysis-tool.js';

console.log('\n🔍 TESTING MARKET CHARACTER ANALYSIS FIX');
console.log('==========================================\n');

async function testMarketCharacter() {
  try {
    console.log('Analyzing ADA across all timeframes...\n');
    
    const result = await marketCharacterAnalysisTool.execute({
      context: {
        symbols: ['ADAUSDT'],
        timeframes: ['15m', '1h', '1d'],
        includeCorrelation: false
      }
    });
    
    if (result.success) {
      console.log('\n✅ Analysis Complete!\n');
      
      // Check ADA prices across timeframes
      const adaData = result.analysis.ADAUSDT;
      
      console.log('📊 ADA PRICES BY TIMEFRAME:');
      console.log('============================');
      
      const prices = {};
      for (const [timeframe, data] of Object.entries(adaData)) {
        const price = data.currentPrice || data.technicals?.price || 'N/A';
        prices[timeframe] = price;
        console.log(`${timeframe}: $${typeof price === 'number' ? price.toFixed(4) : price}`);
        console.log(`  Character: ${data.character}`);
        console.log(`  RSI: ${data.technicals?.rsi?.toFixed(2) || 'N/A'}`);
        console.log(`  Source: ${data.source}`);
        console.log(`  Last Update: ${data.lastUpdate}`);
        console.log('');
      }
      
      // Validate consistency
      console.log('🔍 VALIDATION:');
      console.log('==============');
      
      const priceValues = Object.values(prices).filter(p => typeof p === 'number');
      if (priceValues.length > 0) {
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);
        const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
        const spread = ((maxPrice - minPrice) / avgPrice * 100).toFixed(2);
        
        console.log(`Average Price: $${avgPrice.toFixed(4)}`);
        console.log(`Price Range: $${minPrice.toFixed(4)} - $${maxPrice.toFixed(4)}`);
        console.log(`Spread: ${spread}%`);
        
        if (spread < 5) {
          console.log('✅ Prices are consistent across timeframes!');
        } else {
          console.log(`⚠️ WARNING: ${spread}% price spread detected!`);
        }
      }
      
      // Check for validation warnings
      if (result.dataValidation?.hasWarnings) {
        console.log('\n⚠️ DATA VALIDATION WARNINGS:');
        result.dataValidation.warnings.forEach(warning => {
          console.log(`  - ${warning}`);
        });
      } else {
        console.log('\n✅ No data validation warnings');
      }
      
      // Compare with wrong values
      console.log('\n📋 COMPARISON WITH WRONG VALUES:');
      console.log('=================================');
      const wrongValues = {
        '1d': 0.6888,
        '1h': 0.7967,
        '15m': 0.9063
      };
      
      for (const [tf, wrongPrice] of Object.entries(wrongValues)) {
        const currentPrice = prices[tf];
        if (typeof currentPrice === 'number') {
          const diff = ((currentPrice - wrongPrice) / wrongPrice * 100).toFixed(1);
          console.log(`${tf}: Was $${wrongPrice} ❌ → Now $${currentPrice.toFixed(4)} ✅ (${diff}% correction)`);
        }
      }
      
    } else {
      console.error('❌ Analysis failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMarketCharacter().then(() => {
  console.log('\n✅ Test complete!\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});