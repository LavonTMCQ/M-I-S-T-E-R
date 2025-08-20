import axios from 'axios';
import dotenv from 'dotenv';
import { RateLimiter } from './data-providers/rate-limiter.js';

dotenv.config();

/**
 * Optimized scanner that batches requests efficiently
 * - Gets 250 contracts in ONE API call
 * - Stays well within free tier limits
 * - Focuses on most relevant strikes
 */
export class OptimizedGapScanner {
  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
    this.rateLimiter = new RateLimiter(5);
  }

  async scanMorningGaps() {
    console.log('\n🚀 OPTIMIZED QQQ GAP SCANNER');
    console.log('================================');
    const startTime = Date.now();
    
    try {
      // Step 1: Get QQQ current price (1 API call)
      await this.rateLimiter.throttle();
      const qqqData = await this.getQQQData();
      
      console.log(`\n📊 QQQ Analysis:`);
      console.log(`Current: $${qqqData.price.toFixed(2)}`);
      console.log(`Previous Close: $${qqqData.prevClose.toFixed(2)}`);
      console.log(`Gap: ${qqqData.gapPercent.toFixed(2)}% ${qqqData.gapDirection}\n`);
      
      // Step 2: Get ALL options in ONE call (1 API call)
      await this.rateLimiter.throttle();
      const allOptions = await this.getAllOptionsSnapshot(qqqData.price);
      
      console.log(`📦 Retrieved ${allOptions.length} option contracts in ONE API call!\n`);
      
      // Step 3: Analyze gaps locally (no API calls)
      const gaps = this.analyzeGapsLocally(allOptions, qqqData);
      
      // Step 4: Display results
      this.displayTopGaps(gaps);
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n⚡ Analysis complete in ${elapsed} seconds`);
      console.log(`📊 API calls used: 2 out of 5 per minute limit`);
      
      return gaps;
      
    } catch (error) {
      console.error('Error:', error.message);
      return [];
    }
  }

  async getQQQData() {
    const url = `${this.baseUrl}/v2/aggs/ticker/QQQ/prev`;
    const response = await axios.get(url, {
      params: { apiKey: this.apiKey }
    });
    
    const data = response.data.results[0];
    const gapPercent = ((data.o - data.c) / data.c) * 100;
    
    return {
      price: data.c,
      prevClose: data.c,
      open: data.o,
      high: data.h,
      low: data.l,
      volume: data.v,
      gapPercent,
      gapDirection: gapPercent > 0 ? 'UP' : 'DOWN'
    };
  }

  async getAllOptionsSnapshot(underlyingPrice) {
    // Calculate strike range (ATM ± 10)
    const atmStrike = Math.round(underlyingPrice);
    const minStrike = atmStrike - 10;
    const maxStrike = atmStrike + 10;
    
    const url = `${this.baseUrl}/v3/snapshot/options/QQQ`;
    
    try {
      const response = await axios.get(url, {
        params: {
          apiKey: this.apiKey,
          'strike_price.gte': minStrike,
          'strike_price.lte': maxStrike,
          limit: 250 // Get maximum allowed in one call
        }
      });
      
      if (!response.data.results) return [];
      
      return response.data.results.map(opt => ({
        ticker: opt.details.ticker,
        strike: opt.details.strike_price,
        expiry: opt.details.expiration_date,
        type: opt.details.contract_type,
        // Day data
        open: opt.day?.open || 0,
        close: opt.day?.close || 0,
        high: opt.day?.high || 0,
        low: opt.day?.low || 0,
        volume: opt.day?.volume || 0,
        vwap: opt.day?.vwap || 0,
        // Previous day
        prevClose: opt.prev_day?.close || 0,
        // Greeks
        delta: opt.greeks?.delta || 0,
        gamma: opt.greeks?.gamma || 0,
        theta: opt.greeks?.theta || 0,
        vega: opt.greeks?.vega || 0,
        iv: opt.implied_volatility || 0,
        // Open Interest
        openInterest: opt.open_interest || 0,
        // Underlying reference
        underlyingPrice: opt.underlying_price?.price || underlyingPrice
      }));
      
    } catch (error) {
      console.error('Failed to fetch options snapshot:', error.message);
      return [];
    }
  }

  analyzeGapsLocally(options, qqqData) {
    const gaps = [];
    
    for (const opt of options) {
      // Skip if no price data
      if (!opt.prevClose || !opt.open) continue;
      
      // Calculate gap
      const gapPercent = ((opt.open - opt.prevClose) / opt.prevClose) * 100;
      
      // Skip small gaps
      if (Math.abs(gapPercent) < 1.5) continue;
      
      // Calculate opportunity score
      const score = this.calculateScore(opt, gapPercent, qqqData);
      
      // Check if gap filled during the day
      const filled = this.checkIfFilled(opt, gapPercent);
      
      gaps.push({
        ...opt,
        gapPercent,
        gapDirection: gapPercent > 0 ? 'UP' : 'DOWN',
        filled,
        score,
        recommendation: this.getRecommendation(opt, gapPercent, score),
        entryPrice: opt.open,
        targetPrice: opt.prevClose,
        stopLoss: opt.open * (gapPercent > 0 ? 1.05 : 0.95),
        riskReward: Math.abs((opt.prevClose - opt.open) / (opt.open - (opt.open * (gapPercent > 0 ? 1.05 : 0.95))))
      });
    }
    
    // Sort by score
    return gaps.sort((a, b) => b.score - a.score);
  }

  calculateScore(opt, gapPercent, qqqData) {
    let score = 0;
    
    // Gap size (optimal 2-4%)
    const absGap = Math.abs(gapPercent);
    if (absGap >= 2 && absGap <= 4) score += 30;
    else if (absGap > 4 && absGap <= 6) score += 20;
    else if (absGap > 1.5 && absGap < 2) score += 15;
    
    // Volume (liquidity)
    if (opt.volume > 5000) score += 25;
    else if (opt.volume > 1000) score += 20;
    else if (opt.volume > 500) score += 15;
    else if (opt.volume > 100) score += 10;
    
    // Open Interest
    if (opt.openInterest > 10000) score += 20;
    else if (opt.openInterest > 5000) score += 15;
    else if (opt.openInterest > 1000) score += 10;
    
    // IV premium opportunity
    if (opt.iv > 0.3) score += 15;
    else if (opt.iv > 0.25) score += 10;
    else if (opt.iv > 0.2) score += 5;
    
    // Delta (prefer 0.3-0.7 for good movement)
    const absDelta = Math.abs(opt.delta);
    if (absDelta >= 0.3 && absDelta <= 0.7) score += 10;
    else if (absDelta >= 0.2 && absDelta <= 0.8) score += 5;
    
    // Alignment with underlying gap
    if (opt.type === 'put' && qqqData.gapDirection === 'DOWN' && gapPercent < 0) {
      score += 10; // Put gapped down with market
    } else if (opt.type === 'call' && qqqData.gapDirection === 'UP' && gapPercent > 0) {
      score += 10; // Call gapped up with market
    }
    
    return score;
  }

  checkIfFilled(opt, gapPercent) {
    if (gapPercent > 0) {
      // Gap up - check if low touched previous close
      return opt.low <= opt.prevClose;
    } else {
      // Gap down - check if high touched previous close
      return opt.high >= opt.prevClose;
    }
  }

  getRecommendation(opt, gapPercent, score) {
    if (score < 40) return '⚠️ WEAK - Low probability setup';
    
    if (opt.type === 'put') {
      if (gapPercent < -2 && score > 60) {
        return '🟢 STRONG BUY - High probability gap fill';
      } else if (gapPercent < -1.5 && score > 50) {
        return '🟢 BUY - Good gap fill opportunity';
      } else if (gapPercent > 2) {
        return '🔴 AVOID - Unfavorable gap direction';
      }
    } else {
      if (gapPercent > 2 && score > 60) {
        return '🟢 STRONG BUY - High probability gap fill';
      } else if (gapPercent > 1.5 && score > 50) {
        return '🟢 BUY - Good gap fill opportunity';
      } else if (gapPercent < -2) {
        return '🔴 AVOID - Unfavorable gap direction';
      }
    }
    
    return '🟡 MONITOR - Unclear setup';
  }

  displayTopGaps(gaps) {
    if (gaps.length === 0) {
      console.log('❌ No significant gaps found');
      return;
    }
    
    console.log('🎯 TOP GAP OPPORTUNITIES');
    console.log('========================\n');
    
    const top5 = gaps.slice(0, 5);
    
    for (let i = 0; i < top5.length; i++) {
      const gap = top5[i];
      const arrow = gap.gapDirection === 'UP' ? '📈' : '📉';
      const fillStatus = gap.filled ? '✅ FILLED' : '⏳ OPEN';
      
      console.log(`${i + 1}. ${arrow} ${gap.ticker}`);
      console.log(`   Strike: $${gap.strike} | ${gap.type.toUpperCase()} | Exp: ${gap.expiry}`);
      console.log(`   Gap: ${gap.gapPercent.toFixed(2)}% ${gap.gapDirection} ${fillStatus}`);
      console.log(`   Entry: $${gap.entryPrice.toFixed(2)} → Target: $${gap.targetPrice.toFixed(2)}`);
      console.log(`   Volume: ${gap.volume.toLocaleString()} | OI: ${gap.openInterest.toLocaleString()}`);
      console.log(`   Delta: ${gap.delta.toFixed(3)} | IV: ${(gap.iv * 100).toFixed(1)}%`);
      console.log(`   R:R Ratio: 1:${gap.riskReward.toFixed(1)} | Score: ${gap.score}/100`);
      console.log(`   ${gap.recommendation}`);
      console.log('');
    }
    
    // Summary statistics
    const filled = gaps.filter(g => g.filled).length;
    const fillRate = (filled / gaps.length * 100).toFixed(1);
    
    console.log('📊 SUMMARY STATISTICS');
    console.log('====================');
    console.log(`Total Gaps: ${gaps.length}`);
    console.log(`Filled Today: ${filled} (${fillRate}%)`);
    console.log(`Avg Gap Size: ${(gaps.reduce((sum, g) => sum + Math.abs(g.gapPercent), 0) / gaps.length).toFixed(2)}%`);
    console.log(`High Score Setups (>60): ${gaps.filter(g => g.score > 60).length}`);
  }

  async runContinuousMonitoring(intervalMinutes = 15) {
    console.log(`\n🔄 Starting continuous monitoring every ${intervalMinutes} minutes`);
    console.log('Press Ctrl+C to stop\n');
    
    // Run immediately
    await this.scanMorningGaps();
    
    // Then run on interval
    setInterval(async () => {
      console.log('\n' + '='.repeat(50));
      console.log(`🔄 Update at ${new Date().toLocaleTimeString()}`);
      console.log('='.repeat(50));
      
      await this.scanMorningGaps();
      
      // Voice alert for high-score opportunities
      const gaps = await this.scanMorningGaps();
      const highScore = gaps.filter(g => g.score > 70);
      
      if (highScore.length > 0) {
        const message = `High probability gap detected. ${highScore[0].ticker} showing ${Math.abs(highScore[0].gapPercent).toFixed(1)} percent gap with score ${highScore[0].score}`;
        
        import('child_process').then(({ exec }) => {
          exec(`/Users/sbg/SYDNEY/projects/sydney-trading-system/claude-done.sh speak "${message}"`);
        });
      }
      
    }, intervalMinutes * 60 * 1000);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const scanner = new OptimizedGapScanner();
  const args = process.argv.slice(2);
  
  if (args.includes('--monitor')) {
    // Continuous monitoring mode
    scanner.runContinuousMonitoring(15);
  } else {
    // Single scan
    scanner.scanMorningGaps().then(gaps => {
      console.log(`\n✅ Analysis complete!`);
      
      // Play completion sound
      import('child_process').then(({ exec }) => {
        exec('/Users/sbg/SYDNEY/projects/sydney-trading-system/claude-done.sh success');
      });
    });
  }
}