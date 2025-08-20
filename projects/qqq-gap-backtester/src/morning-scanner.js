import { PolygonDataProvider } from './data-providers/polygon-provider.js';
import { GapDetector } from './gap-detector.js';
import cron from 'node-cron';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class MorningGapScanner {
  constructor() {
    this.dataProvider = new PolygonDataProvider();
    this.gapDetector = new GapDetector();
    this.voiceEnabled = process.env.VOICE_ENABLED === 'true';
    this.slackWebhook = process.env.SLACK_WEBHOOK_URL;
  }

  async scanForGaps() {
    const timestamp = new Date().toLocaleString();
    console.log(`\n🔍 MORNING GAP SCAN - ${timestamp}`);
    console.log('=====================================');
    
    try {
      // Get current QQQ price
      const snapshot = await this.dataProvider.getOptionsSnapshot('QQQ');
      const underlyingPrice = snapshot[0]?.underlying?.price || 500;
      
      console.log(`QQQ Current Price: $${underlyingPrice.toFixed(2)}`);
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Get options chain for today
      const chain = await this.dataProvider.getOptionsChain('QQQ', today);
      
      // Filter for relevant strikes (ATM ± 5)
      const atmStrike = Math.round(underlyingPrice);
      const relevantContracts = chain.filter(c => 
        Math.abs(c.strike - atmStrike) <= 5 &&
        c.volume > 50
      );
      
      console.log(`Found ${relevantContracts.length} liquid contracts near ATM\n`);
      
      const gapOpportunities = [];
      
      // Check each contract for gaps
      for (const contract of relevantContracts) {
        const gapInfo = await this.analyzeContract(contract, underlyingPrice);
        
        if (gapInfo && Math.abs(gapInfo.gapPercent) > 1.5) {
          gapOpportunities.push(gapInfo);
          this.displayGapAlert(gapInfo);
        }
      }
      
      // Sort by opportunity score
      gapOpportunities.sort((a, b) => b.score - a.score);
      
      // Generate recommendations
      if (gapOpportunities.length > 0) {
        await this.generateRecommendations(gapOpportunities);
      } else {
        console.log('❌ No significant gaps detected this morning');
      }
      
      return gapOpportunities;
      
    } catch (error) {
      console.error('Error during morning scan:', error);
      return [];
    }
  }

  async analyzeContract(contract, underlyingPrice) {
    try {
      // Get yesterday's close
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const historicalData = await this.dataProvider.getHistoricalOptionsData(
        contract.symbol,
        yesterdayStr,
        yesterdayStr,
        '1Day'
      );
      
      if (!historicalData || historicalData.length === 0) {
        return null;
      }
      
      const prevClose = historicalData[historicalData.length - 1].c;
      const currentPrice = contract.bid || contract.ask || 0;
      
      if (currentPrice === 0) return null;
      
      const gapPercent = ((currentPrice - prevClose) / prevClose) * 100;
      
      // Calculate opportunity score based on historical fill rates
      const score = this.calculateOpportunityScore(
        gapPercent,
        contract.volume,
        contract.openInterest,
        contract.impliedVolatility
      );
      
      return {
        contract: contract.symbol,
        strike: contract.strike,
        expiry: contract.expiry,
        type: contract.type,
        prevClose,
        currentPrice,
        gapPercent,
        gapDirection: gapPercent > 0 ? 'UP' : 'DOWN',
        volume: contract.volume,
        openInterest: contract.openInterest,
        iv: contract.impliedVolatility,
        delta: contract.delta,
        score,
        recommendation: this.getRecommendation(gapPercent, contract.type),
        entryPrice: currentPrice,
        targetPrice: prevClose,
        stopLoss: currentPrice * (gapPercent > 0 ? 1.05 : 0.95)
      };
      
    } catch (error) {
      console.error(`Error analyzing contract ${contract.symbol}:`, error);
      return null;
    }
  }

  calculateOpportunityScore(gapPercent, volume, openInterest, iv) {
    let score = 0;
    
    // Gap size score (bigger gaps have higher fill probability)
    const gapSize = Math.abs(gapPercent);
    if (gapSize >= 2 && gapSize <= 4) {
      score += 30; // Optimal gap size
    } else if (gapSize > 4) {
      score += 20; // Large gaps might not fill completely
    } else {
      score += 10; // Small gaps less profitable
    }
    
    // Liquidity score
    if (volume > 1000) score += 25;
    else if (volume > 500) score += 15;
    else if (volume > 100) score += 5;
    
    if (openInterest > 5000) score += 25;
    else if (openInterest > 1000) score += 15;
    else if (openInterest > 500) score += 5;
    
    // IV score (higher IV = more premium)
    if (iv > 0.3) score += 15;
    else if (iv > 0.2) score += 10;
    else if (iv > 0.15) score += 5;
    
    return score;
  }

  getRecommendation(gapPercent, contractType) {
    if (contractType === 'put') {
      if (gapPercent < -2) {
        return 'BUY - Strong gap down likely to fill';
      } else if (gapPercent > 2) {
        return 'SELL/AVOID - Gap up in puts unfavorable';
      }
    } else {
      if (gapPercent > 2) {
        return 'BUY - Strong gap up likely to fill';
      } else if (gapPercent < -2) {
        return 'SELL/AVOID - Gap down in calls unfavorable';
      }
    }
    
    return 'MONITOR - Unclear signal';
  }

  displayGapAlert(gapInfo) {
    const arrow = gapInfo.gapDirection === 'UP' ? '📈' : '📉';
    const action = gapInfo.recommendation.startsWith('BUY') ? '🟢' : 
                   gapInfo.recommendation.startsWith('SELL') ? '🔴' : '🟡';
    
    console.log(`${arrow} GAP ALERT: ${gapInfo.contract}`);
    console.log(`  Strike: $${gapInfo.strike} | Type: ${gapInfo.type.toUpperCase()}`);
    console.log(`  Gap: ${gapInfo.gapPercent.toFixed(2)}% ${gapInfo.gapDirection}`);
    console.log(`  Price: $${gapInfo.currentPrice.toFixed(2)} (was $${gapInfo.prevClose.toFixed(2)})`);
    console.log(`  Volume: ${gapInfo.volume} | OI: ${gapInfo.openInterest}`);
    console.log(`  Score: ${gapInfo.score}/100`);
    console.log(`  ${action} ${gapInfo.recommendation}`);
    console.log('');
  }

  async generateRecommendations(opportunities) {
    console.log('\n📊 TOP RECOMMENDATIONS');
    console.log('======================');
    
    const top3 = opportunities.slice(0, 3);
    
    for (let i = 0; i < top3.length; i++) {
      const opp = top3[i];
      console.log(`\n${i + 1}. ${opp.contract}`);
      console.log(`   Entry: $${opp.entryPrice.toFixed(2)}`);
      console.log(`   Target: $${opp.targetPrice.toFixed(2)} (gap fill)`);
      console.log(`   Stop: $${opp.stopLoss.toFixed(2)}`);
      console.log(`   Risk/Reward: 1:${((opp.targetPrice - opp.entryPrice) / (opp.entryPrice - opp.stopLoss)).toFixed(1)}`);
      console.log(`   Confidence: ${(opp.score / 100 * 100).toFixed(0)}%`);
    }
    
    // Voice announcement if enabled
    if (this.voiceEnabled && top3.length > 0) {
      await this.announceTopPick(top3[0]);
    }
    
    // Slack notification if configured
    if (this.slackWebhook && top3.length > 0) {
      await this.sendSlackAlert(top3);
    }
  }

  async announceTopPick(opportunity) {
    try {
      const message = `Gap alert on QQQ. ${opportunity.strike} strike ${opportunity.type} showing ${Math.abs(opportunity.gapPercent).toFixed(1)} percent gap ${opportunity.gapDirection.toLowerCase()}. Confidence score ${opportunity.score}. ${opportunity.recommendation}`;
      
      // Call the voice announcement system
      const voiceCommand = `/Users/sbg/SYDNEY/projects/sydney-trading-system/claude-done.sh speak "${message}"`;
      
      const { exec } = await import('child_process');
      exec(voiceCommand, (error) => {
        if (error) {
          console.error('Voice announcement failed:', error);
        }
      });
    } catch (error) {
      console.error('Voice system error:', error);
    }
  }

  async sendSlackAlert(opportunities) {
    try {
      const blocks = opportunities.map(opp => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${opp.contract}*\n` +
                `Gap: ${opp.gapPercent.toFixed(2)}% | Score: ${opp.score}/100\n` +
                `Entry: $${opp.entryPrice.toFixed(2)} | Target: $${opp.targetPrice.toFixed(2)}\n` +
                `${opp.recommendation}`
        }
      }));
      
      const payload = {
        text: '🔔 QQQ Gap Opportunities Detected',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: 'Morning Gap Scanner Alert'
            }
          },
          ...blocks
        ]
      };
      
      await axios.post(this.slackWebhook, payload);
    } catch (error) {
      console.error('Slack notification failed:', error);
    }
  }

  startScheduledScanning() {
    console.log('📅 Morning Gap Scanner Scheduled');
    console.log('Will run Monday-Friday at 9:15 AM EST\n');
    
    // Schedule for 9:15 AM EST Monday-Friday
    cron.schedule('15 9 * * 1-5', async () => {
      await this.scanForGaps();
    }, {
      timezone: 'America/New_York'
    });
    
    // Also schedule for 9:45 AM for second check
    cron.schedule('45 9 * * 1-5', async () => {
      console.log('\n🔄 Second morning scan...');
      await this.scanForGaps();
    }, {
      timezone: 'America/New_York'
    });
    
    console.log('Scanner is running. Press Ctrl+C to stop.\n');
  }
}

// Run scanner if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const scanner = new MorningGapScanner();
  
  // Check if we should run immediately or schedule
  const args = process.argv.slice(2);
  
  if (args.includes('--now')) {
    // Run immediately
    scanner.scanForGaps().then(opportunities => {
      console.log(`\n✅ Scan complete. Found ${opportunities.length} opportunities.`);
      
      // Play completion sound
      import('child_process').then(({ exec }) => {
        exec('/Users/sbg/SYDNEY/projects/sydney-trading-system/claude-done.sh success');
      });
    });
  } else {
    // Start scheduled scanning
    scanner.startScheduledScanning();
    
    // Also run once immediately for testing
    console.log('Running initial scan for testing...\n');
    scanner.scanForGaps();
  }
}