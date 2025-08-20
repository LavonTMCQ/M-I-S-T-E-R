import axios from 'axios';
import dotenv from 'dotenv';
import { RateLimiter } from './data-providers/rate-limiter.js';

dotenv.config();

/**
 * Manual scanner that constructs option symbols directly
 * Works with free tier by querying specific contracts
 */
export class ManualGapScanner {
  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
    this.rateLimiter = new RateLimiter(5);
  }

  // Construct option symbol in Polygon format
  // Format: O:QQQ[YYMMDD][P/C][STRIKE*1000]
  constructOptionSymbol(expiry, type, strike) {
    const dateStr = expiry.replace(/-/g, '').substring(2); // YYMMDD
    const typeChar = type === 'put' ? 'P' : 'C';
    const strikeStr = String(strike * 1000).padStart(8, '0');
    return `O:QQQ${dateStr}${typeChar}${strikeStr}`;
  }

  async scanTodayGaps() {
    console.log('\n📊 QQQ OPTIONS GAP SCANNER');
    console.log('==========================\n');
    
    try {
      // Step 1: Get QQQ price
      await this.rateLimiter.throttle();
      const qqqPrice = await this.getQQQPrice();
      console.log(`QQQ Price: $${qqqPrice.toFixed(2)}\n`);
      
      // Step 2: Define options to check
      const today = new Date();
      const expiries = this.getUpcomingExpiries();
      const strikes = this.getNearbyStrikes(qqqPrice);
      
      console.log(`Checking ${strikes.length} strikes across ${expiries.length} expiries\n`);
      
      const gaps = [];
      let checked = 0;
      
      // Step 3: Check each option (respecting rate limits)
      for (const expiry of expiries) {
        for (const strike of strikes) {
          // Check puts only (most relevant for gap fills)
          const putSymbol = this.constructOptionSymbol(expiry, 'put', strike);
          
          await this.rateLimiter.throttle();
          const gapData = await this.checkOptionGap(putSymbol, strike, expiry);
          
          if (gapData) {
            gaps.push(gapData);
            this.displayGap(gapData);
          }
          
          checked++;
          
          // Show progress and rate limit status
          if (checked % 3 === 0) {
            const status = this.rateLimiter.getStatus();
            console.log(`⏳ Checked ${checked} contracts | Rate: ${status.requestsUsed}/5, resets in ${status.resetInSeconds}s\n`);
          }
          
          // Stop after checking 4 contracts to stay under rate limit
          if (checked >= 4) {
            console.log('⚠️ Stopping to respect rate limits. Run again in 1 minute for more.\n');
            break;
          }
        }
        if (checked >= 4) break;
      }
      
      // Step 4: Summarize findings
      this.summarizeGaps(gaps);
      
      return gaps;
      
    } catch (error) {
      console.error('Error:', error.message);
      return [];
    }
  }

  async getQQQPrice() {
    const url = `${this.baseUrl}/v2/aggs/ticker/QQQ/prev`;
    const response = await axios.get(url, {
      params: { apiKey: this.apiKey }
    });
    
    return response.data.results[0].c;
  }

  getUpcomingExpiries() {
    const expiries = [];
    const today = new Date();
    
    // Get next 3 Fridays (weekly options)
    for (let weeks = 0; weeks < 3; weeks++) {
      const friday = new Date(today);
      friday.setDate(friday.getDate() + (5 - friday.getDay() + 7 * weeks) % 7);
      
      // Skip if it's today and after market close
      if (weeks === 0 && friday.getDate() === today.getDate() && today.getHours() >= 16) {
        continue;
      }
      
      const year = friday.getFullYear();
      const month = String(friday.getMonth() + 1).padStart(2, '0');
      const day = String(friday.getDate()).padStart(2, '0');
      expiries.push(`${year}-${month}-${day}`);
    }
    
    return expiries.slice(0, 2); // Just check next 2 expiries for free tier
  }

  getNearbyStrikes(currentPrice) {
    const atm = Math.round(currentPrice);
    const strikes = [];
    
    // Get ATM and 2 strikes on each side
    for (let offset = -2; offset <= 2; offset++) {
      strikes.push(atm + offset);
    }
    
    return strikes;
  }

  async checkOptionGap(symbol, strike, expiry) {
    try {
      const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/prev`;
      const response = await axios.get(url, {
        params: { apiKey: this.apiKey }
      });
      
      if (!response.data.results || response.data.results.length === 0) {
        return null;
      }
      
      const data = response.data.results[0];
      
      // Calculate gap
      const gapPercent = ((data.o - data.c) / data.c) * 100;
      
      // Only report significant gaps
      if (Math.abs(gapPercent) < 2) return null;
      
      return {
        symbol,
        strike,
        expiry,
        type: 'put',
        prevClose: data.c,
        open: data.o,
        high: data.h,
        low: data.l,
        close: data.c,
        volume: data.v,
        vwap: data.vw,
        gapPercent,
        gapDirection: gapPercent > 0 ? 'UP' : 'DOWN',
        filled: gapPercent > 0 ? data.l <= data.c : data.h >= data.c,
        timestamp: new Date(data.t).toLocaleString()
      };
      
    } catch (error) {
      // Option might not exist or have data
      return null;
    }
  }

  displayGap(gap) {
    const arrow = gap.gapDirection === 'UP' ? '📈' : '📉';
    const fillStatus = gap.filled ? '✅ FILLED' : '⏳ OPEN';
    
    console.log(`${arrow} GAP FOUND: Strike $${gap.strike} Put (${gap.expiry})`);
    console.log(`  Gap: ${gap.gapPercent.toFixed(2)}% ${gap.gapDirection} ${fillStatus}`);
    console.log(`  Open: $${gap.open.toFixed(2)} | Prev Close: $${gap.prevClose.toFixed(2)}`);
    console.log(`  Volume: ${gap.volume}`);
    console.log('');
  }

  summarizeGaps(gaps) {
    if (gaps.length === 0) {
      console.log('❌ No significant gaps found in checked contracts\n');
      return;
    }
    
    console.log('\n📊 SUMMARY');
    console.log('==========');
    console.log(`Total Gaps Found: ${gaps.length}`);
    
    const filled = gaps.filter(g => g.filled).length;
    console.log(`Filled: ${filled}/${gaps.length} (${(filled/gaps.length*100).toFixed(0)}%)`);
    
    const avgGap = gaps.reduce((sum, g) => sum + Math.abs(g.gapPercent), 0) / gaps.length;
    console.log(`Average Gap Size: ${avgGap.toFixed(2)}%`);
    
    // Best opportunity
    const bestGap = gaps.sort((a, b) => Math.abs(b.gapPercent) - Math.abs(a.gapPercent))[0];
    if (bestGap) {
      console.log(`\n🎯 Best Opportunity:`);
      console.log(`  Strike $${bestGap.strike} Put (${bestGap.expiry})`);
      console.log(`  ${Math.abs(bestGap.gapPercent).toFixed(2)}% gap ${bestGap.gapDirection}`);
      
      const recommendation = bestGap.gapDirection === 'DOWN' 
        ? 'BUY for gap fill up' 
        : 'SELL or avoid';
      console.log(`  Recommendation: ${recommendation}`);
    }
  }

  async scanWithSymbols(symbols) {
    console.log('\n📊 SCANNING SPECIFIC OPTIONS');
    console.log('============================\n');
    
    const gaps = [];
    
    for (const symbol of symbols) {
      await this.rateLimiter.throttle();
      
      // Extract strike from symbol
      const strike = parseInt(symbol.slice(-8)) / 1000;
      const expiry = 'manual';
      
      const gapData = await this.checkOptionGap(symbol, strike, expiry);
      
      if (gapData) {
        gaps.push(gapData);
        this.displayGap(gapData);
      }
    }
    
    this.summarizeGaps(gaps);
    return gaps;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const scanner = new ManualGapScanner();
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Scan specific symbols provided as arguments
    scanner.scanWithSymbols(args);
  } else {
    // Default scan
    scanner.scanTodayGaps().then(gaps => {
      console.log('\n✅ Scan complete!');
      
      // Voice alert if gaps found
      if (gaps.length > 0) {
        const bestGap = gaps.sort((a, b) => Math.abs(b.gapPercent) - Math.abs(a.gapPercent))[0];
        const message = `Gap alert. QQQ ${bestGap.strike} strike put showing ${Math.abs(bestGap.gapPercent).toFixed(1)} percent gap ${bestGap.gapDirection.toLowerCase()}`;
        
        import('child_process').then(({ exec }) => {
          exec(`/Users/sbg/SYDNEY/projects/sydney-trading-system/claude-done.sh speak "${message}"`);
          exec('/Users/sbg/SYDNEY/projects/sydney-trading-system/claude-done.sh success');
        });
      }
    });
  }
}