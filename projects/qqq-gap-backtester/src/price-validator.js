import axios from 'axios';

/**
 * Real-time price validator to ensure financial data accuracy
 * Prevents stale/cached data issues in trading systems
 */
export class PriceValidator {
  constructor() {
    this.sources = {
      coingecko: 'https://api.coingecko.com/api/v3',
      binance: 'https://api.binance.com/api/v3',
      coinbase: 'https://api.coinbase.com/v2'
    };
  }

  /**
   * Get current ADA price from multiple sources for validation
   */
  async getADAPrice() {
    const prices = {};
    const errors = [];
    
    // Try CoinGecko
    try {
      const cgResponse = await axios.get(`${this.sources.coingecko}/simple/price`, {
        params: {
          ids: 'cardano',
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_last_updated_at: true
        }
      });
      
      prices.coingecko = {
        price: cgResponse.data.cardano.usd,
        change24h: cgResponse.data.cardano.usd_24h_change,
        timestamp: new Date(cgResponse.data.cardano.last_updated_at * 1000),
        source: 'CoinGecko'
      };
    } catch (error) {
      errors.push(`CoinGecko: ${error.message}`);
    }
    
    // Try Binance
    try {
      const binanceResponse = await axios.get(`${this.sources.binance}/ticker/24hr`, {
        params: { symbol: 'ADAUSDT' }
      });
      
      prices.binance = {
        price: parseFloat(binanceResponse.data.lastPrice),
        change24h: parseFloat(binanceResponse.data.priceChangePercent),
        volume: parseFloat(binanceResponse.data.volume),
        timestamp: new Date(binanceResponse.data.closeTime),
        source: 'Binance'
      };
    } catch (error) {
      errors.push(`Binance: ${error.message}`);
    }
    
    // Try Coinbase
    try {
      const cbResponse = await axios.get(`${this.sources.coinbase}/exchange-rates`, {
        params: { currency: 'ADA' }
      });
      
      const usdRate = cbResponse.data.data.rates.USD;
      prices.coinbase = {
        price: 1 / parseFloat(usdRate),
        timestamp: new Date(),
        source: 'Coinbase'
      };
    } catch (error) {
      errors.push(`Coinbase: ${error.message}`);
    }
    
    return { prices, errors };
  }

  /**
   * Validate timeframe data for consistency
   */
  validateTimeframeData(data) {
    const issues = [];
    const now = new Date();
    
    // Check 1: All timeframes should have similar current prices (within 5%)
    const prices = Object.values(data).map(tf => tf.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    for (const [timeframe, info] of Object.entries(data)) {
      const deviation = Math.abs((info.price - avgPrice) / avgPrice * 100);
      
      if (deviation > 5) {
        issues.push({
          severity: 'CRITICAL',
          timeframe,
          issue: `Price deviation ${deviation.toFixed(2)}% from average`,
          price: info.price,
          avgPrice
        });
      }
      
      // Check 2: Timestamp freshness
      if (info.timestamp) {
        const age = (now - new Date(info.timestamp)) / 1000 / 60; // minutes
        if (age > 5) {
          issues.push({
            severity: 'WARNING',
            timeframe,
            issue: `Data is ${age.toFixed(1)} minutes old`,
            timestamp: info.timestamp
          });
        }
      }
      
      // Check 3: Price sanity check for ADA
      if (info.price < 0.1 || info.price > 10) {
        issues.push({
          severity: 'CRITICAL',
          timeframe,
          issue: `Price $${info.price} outside reasonable range for ADA`,
          price: info.price
        });
      }
    }
    
    return {
      valid: issues.filter(i => i.severity === 'CRITICAL').length === 0,
      issues,
      summary: {
        criticalIssues: issues.filter(i => i.severity === 'CRITICAL').length,
        warnings: issues.filter(i => i.severity === 'WARNING').length,
        avgPrice,
        priceRange: {
          min: Math.min(...prices),
          max: Math.max(...prices)
        }
      }
    };
  }

  /**
   * Compare agent data with real-time prices
   */
  async validateAgentData(agentData) {
    console.log('\n🔍 VALIDATING AGENT DATA');
    console.log('========================\n');
    
    // Get real prices
    const { prices, errors } = await this.getADAPrice();
    
    console.log('📊 Real-Time ADA Prices:');
    for (const [source, data] of Object.entries(prices)) {
      console.log(`  ${source}: $${data.price.toFixed(4)}`);
    }
    
    if (errors.length > 0) {
      console.log('\n⚠️ Source Errors:', errors);
    }
    
    // Calculate consensus price
    const validPrices = Object.values(prices).map(p => p.price);
    const consensusPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    
    console.log(`\n✅ Consensus Price: $${consensusPrice.toFixed(4)}\n`);
    
    // Validate agent's timeframe data
    console.log('🔍 Checking Agent Data:');
    
    const validation = this.validateTimeframeData(agentData);
    
    if (!validation.valid) {
      console.log('\n❌ CRITICAL ISSUES FOUND:');
      validation.issues
        .filter(i => i.severity === 'CRITICAL')
        .forEach(issue => {
          console.log(`  - ${issue.timeframe}: ${issue.issue}`);
          console.log(`    Agent Price: $${issue.price}`);
          console.log(`    Expected: ~$${consensusPrice.toFixed(4)}`);
        });
    }
    
    if (validation.issues.filter(i => i.severity === 'WARNING').length > 0) {
      console.log('\n⚠️ Warnings:');
      validation.issues
        .filter(i => i.severity === 'WARNING')
        .forEach(issue => {
          console.log(`  - ${issue.timeframe}: ${issue.issue}`);
        });
    }
    
    // Calculate deviations
    console.log('\n📈 Price Deviations from Real-Time:');
    for (const [timeframe, info] of Object.entries(agentData)) {
      const deviation = ((info.price - consensusPrice) / consensusPrice * 100).toFixed(2);
      const status = Math.abs(deviation) > 5 ? '❌' : '✅';
      console.log(`  ${timeframe}: $${info.price} (${deviation}%) ${status}`);
    }
    
    return {
      consensusPrice,
      realTimePrices: prices,
      validation,
      recommendation: validation.valid 
        ? 'Data appears valid' 
        : 'CRITICAL: Agent data is stale or incorrect. Restart agent or check data source.'
    };
  }
}

// Test with your agent's data
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new PriceValidator();
  
  // The problematic data from your agent
  const agentData = {
    '1d': { price: 0.6888, RSI: 35.05 },
    '1h': { price: 0.7967, RSI: 59.20 },
    '15m': { price: 0.9063, RSI: 62.53 }
  };
  
  console.log('Testing with agent data that showed:');
  console.log('  1d: $0.6888');
  console.log('  1h: $0.7967');
  console.log('  15m: $0.9063');
  console.log('  Expected: ~$0.95\n');
  
  validator.validateAgentData(agentData).then(result => {
    console.log('\n' + '='.repeat(50));
    console.log('RECOMMENDATION:', result.recommendation);
    console.log('='.repeat(50));
    
    if (!result.validation.valid) {
      console.log('\n🔧 FIXES REQUIRED:');
      console.log('1. Check agent\'s data source timestamp');
      console.log('2. Ensure API is returning real-time data');
      console.log('3. Clear any caches in the data pipeline');
      console.log('4. Verify timezone settings (should be UTC or local)');
      console.log('5. Check if agent is using historical data instead of live');
    }
  });
}