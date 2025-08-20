import axios from 'axios';
import dotenv from 'dotenv';
import { RateLimiter } from './data-providers/rate-limiter.js';

dotenv.config();

/**
 * Simplified scanner optimized for Polygon free tier
 * - Uses only end-of-day data (free tier limitation)
 * - Respects 5 requests/minute rate limit
 * - Focuses on most liquid strikes only
 */
export class FreeTierScanner {
  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
    this.rateLimiter = new RateLimiter(5);
  }

  async scanDailyGaps() {
    console.log('\n📊 QQQ GAP SCANNER - FREE TIER MODE');
    console.log('====================================');
    console.log('Using end-of-day data only (free tier)\n');
    
    try {
      // Step 1: Get QQQ price (1 request)
      await this.rateLimiter.throttle();
      const qqq = await this.getStockPrice('QQQ');
      console.log(`QQQ Price: $${qqq.close.toFixed(2)}`);
      console.log(`Previous Close: $${qqq.prevClose.toFixed(2)}`);
      console.log(`Gap: ${qqq.gapPercent.toFixed(2)}%\n`);
      
      // Step 2: Get most active options (1 request)
      await this.rateLimiter.throttle();
      const activeOptions = await this.getMostActiveOptions();
      console.log(`Found ${activeOptions.length} active QQQ options\n`);
      
      // Step 3: Analyze top 3 contracts only (3 requests max)
      const gaps = [];
      const topContracts = activeOptions.slice(0, 3);
      
      for (const contract of topContracts) {
        await this.rateLimiter.throttle();
        const gap = await this.analyzeContractGap(contract);
        if (gap) {
          gaps.push(gap);
          this.displayGap(gap);
        }
        
        // Show rate limit status
        const status = this.rateLimiter.getStatus();
        console.log(`⏱️ Rate limit: ${status.requestsUsed}/${5} used, resets in ${status.resetInSeconds}s\n`);
      }
      
      return gaps;
      
    } catch (error) {
      console.error('Error:', error.message);
      return [];
    }
  }

  async getStockPrice(symbol) {
    const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/prev`;
    const response = await axios.get(url, {
      params: { apiKey: this.apiKey }
    });
    
    const data = response.data.results[0];
    const today = new Date();
    const todayOpen = data.o; // Using previous day's data
    const prevClose = data.c;
    const gapPercent = ((todayOpen - prevClose) / prevClose) * 100;
    
    return {
      open: todayOpen,
      close: data.c,
      prevClose: prevClose,
      gapPercent
    };
  }

  async getMostActiveOptions() {
    const url = `${this.baseUrl}/v3/snapshot/options/QQQ`;
    const response = await axios.get(url, {
      params: { 
        apiKey: this.apiKey,
        limit: 10
      }
    });
    
    if (!response.data.results) return [];
    
    // Filter for puts near the money with good volume
    return response.data.results
      .filter(opt => {
        return opt.details.contract_type === 'put' && 
               opt.day && opt.day.volume > 100;
      })
      .sort((a, b) => (b.day?.volume || 0) - (a.day?.volume || 0));
  }

  async analyzeContractGap(contract) {
    const url = `${this.baseUrl}/v2/aggs/ticker/${contract.details.ticker}/prev`;
    
    try {
      const response = await axios.get(url, {
        params: { apiKey: this.apiKey }
      });
      
      if (!response.data.results || response.data.results.length === 0) {
        return null;
      }
      
      const data = response.data.results[0];
      const gapPercent = ((data.o - data.c) / data.c) * 100;
      
      // Only return significant gaps
      if (Math.abs(gapPercent) < 1.5) return null;
      
      return {
        ticker: contract.details.ticker,
        strike: contract.details.strike_price,
        expiry: contract.details.expiration_date,
        type: contract.details.contract_type,
        open: data.o,
        close: data.c,
        volume: data.v,
        gapPercent,
        gapDirection: gapPercent > 0 ? 'UP' : 'DOWN',
        recommendation: this.getRecommendation(gapPercent)
      };
      
    } catch (error) {
      console.error(`Failed to analyze ${contract.details.ticker}`);
      return null;
    }
  }

  getRecommendation(gapPercent) {
    const absGap = Math.abs(gapPercent);
    
    if (absGap >= 2 && absGap <= 4) {
      if (gapPercent < 0) {
        return 'BUY PUTS - Gap down likely to fill';
      } else {
        return 'BUY CALLS - Gap up likely to fill';
      }
    } else if (absGap > 4) {
      return 'CAUTION - Large gap may not fill completely';
    }
    
    return 'MONITOR - Small gap, limited opportunity';
  }

  displayGap(gap) {
    const arrow = gap.gapDirection === 'UP' ? '📈' : '📉';
    
    console.log(`${arrow} ${gap.ticker}`);
    console.log(`  Strike: $${gap.strike} | Expiry: ${gap.expiry}`);
    console.log(`  Gap: ${gap.gapPercent.toFixed(2)}% ${gap.gapDirection}`);
    console.log(`  Open: $${gap.open.toFixed(2)} | Close: $${gap.close.toFixed(2)}`);
    console.log(`  Volume: ${gap.volume.toLocaleString()}`);
    console.log(`  📌 ${gap.recommendation}`);
    console.log('');
  }

  async getHistoricalGaps(days = 30) {
    console.log(`\n📅 HISTORICAL GAP ANALYSIS (${days} days)`);
    console.log('=========================================\n');
    
    const gaps = [];
    const today = new Date();
    let requestCount = 0;
    
    // With free tier, we can only check a few days
    const maxDays = Math.min(days, 5); // Limit to 5 days to stay under rate limit
    
    for (let i = 0; i < maxDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i - 1);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const dateStr = date.toISOString().split('T')[0];
      console.log(`Checking ${dateStr}...`);
      
      await this.rateLimiter.throttle();
      
      try {
        const url = `${this.baseUrl}/v2/aggs/ticker/QQQ/open-close/${dateStr}`;
        const response = await axios.get(url, {
          params: { apiKey: this.apiKey }
        });
        
        if (response.data.status === 'OK') {
          const data = response.data;
          const gap = ((data.open - data.preMarket) / data.preMarket) * 100;
          
          if (Math.abs(gap) > 0.5) {
            gaps.push({
              date: dateStr,
              gap: gap,
              filled: this.checkIfFilled(data)
            });
          }
        }
        
        requestCount++;
        if (requestCount >= 4) {
          console.log('⚠️ Approaching rate limit, pausing analysis...');
          break;
        }
        
      } catch (error) {
        console.error(`No data for ${dateStr}`);
      }
    }
    
    // Analyze patterns
    const fillRate = gaps.filter(g => g.filled).length / gaps.length * 100;
    console.log(`\n📊 Results: ${gaps.length} gaps found`);
    console.log(`Fill Rate: ${fillRate.toFixed(1)}%`);
    
    return gaps;
  }

  checkIfFilled(data) {
    // Simple check: did price cross back through the open during the day?
    if (data.open > data.preMarket) {
      // Gap up - check if low went below preMarket
      return data.low <= data.preMarket;
    } else {
      // Gap down - check if high went above preMarket
      return data.high >= data.preMarket;
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const scanner = new FreeTierScanner();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--historical')) {
    scanner.getHistoricalGaps(30);
  } else {
    scanner.scanDailyGaps().then(gaps => {
      console.log(`\n✅ Scan complete. Found ${gaps.length} gap opportunities.`);
      
      // Play completion sound
      import('child_process').then(({ exec }) => {
        exec('/Users/sbg/SYDNEY/projects/sydney-trading-system/claude-done.sh success');
      });
    });
  }
}