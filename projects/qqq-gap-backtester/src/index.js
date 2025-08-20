#!/usr/bin/env node

import { OptimizedGapScanner } from './optimized-scanner.js';
import { FreeTierScanner } from './free-tier-scanner.js';
import { QQQGapBacktester } from './backtester.js';
import { MorningGapScanner } from './morning-scanner.js';

console.log('\n🎯 QQQ Gap Fill Trading System');
console.log('================================\n');

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'scan':
      // Quick morning scan using optimized batch requests
      console.log('Running optimized morning gap scan...\n');
      const optimizedScanner = new OptimizedGapScanner();
      await optimizedScanner.scanMorningGaps();
      break;
      
    case 'monitor':
      // Continuous monitoring throughout the day
      console.log('Starting continuous monitoring...\n');
      const monitor = new OptimizedGapScanner();
      await monitor.runContinuousMonitoring(15);
      break;
      
    case 'backtest':
      // Run historical backtest
      console.log('Running historical backtest...\n');
      const backtester = new QQQGapBacktester({
        startDate: args[1] || '2024-01-01',
        endDate: args[2] || new Date().toISOString().split('T')[0],
        initialCapital: 10000,
        positionSize: 0.1,
        maxRiskPerTrade: 100
      });
      
      const results = await backtester.run();
      
      if (results && results.tradingRules) {
        console.log('\n🎯 GENERATED TRADING RULES:');
        console.log('===========================');
        for (const rule of results.tradingRules) {
          console.log(`\n${rule.name}:`);
          console.log(`  ${rule.rule}`);
          console.log(`  Confidence: ${rule.confidence.toFixed(1)}%`);
        }
      }
      break;
      
    case 'free':
      // Use free tier scanner (limited but safe)
      console.log('Running free tier scanner (rate-limited)...\n');
      const freeScanner = new FreeTierScanner();
      await freeScanner.scanDailyGaps();
      break;
      
    case 'schedule':
      // Schedule morning scans
      console.log('Scheduling automated morning scans...\n');
      const scheduler = new MorningGapScanner();
      scheduler.startScheduledScanning();
      break;
      
    case 'test':
      // Test API connection
      console.log('Testing Polygon API connection...\n');
      const testScanner = new FreeTierScanner();
      const price = await testScanner.getStockPrice('QQQ');
      console.log('✅ API connection successful!');
      console.log(`QQQ Price: $${price.close.toFixed(2)}`);
      break;
      
    default:
      console.log('Available commands:');
      console.log('  npm run scan       - Quick morning gap scan (optimized)');
      console.log('  npm run monitor    - Continuous monitoring every 15 minutes');
      console.log('  npm run backtest   - Run historical backtest');
      console.log('  npm run free       - Use free tier scanner (limited)');
      console.log('  npm run schedule   - Schedule automated morning scans');
      console.log('  npm test           - Test API connection');
      console.log('\nUsage examples:');
      console.log('  node src/index.js scan');
      console.log('  node src/index.js backtest 2024-01-01 2024-12-31');
      console.log('  node src/index.js monitor');
  }
  
  // Play completion sound
  if (command && command !== 'monitor' && command !== 'schedule') {
    import('child_process').then(({ exec }) => {
      exec('/Users/sbg/SYDNEY/projects/sydney-trading-system/claude-done.sh done');
    });
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});