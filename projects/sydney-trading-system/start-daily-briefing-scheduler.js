/**
 * Daily Briefing Scheduler Starter
 * 
 * Starts the presidential-level daily briefing system
 * Runs at 9:30 AM EST every trading day
 */

import { mastra } from './src/mastra/index.js';

const PORTFOLIO_SYMBOLS = ['ETH', 'ADA', 'FET', 'ATOM'];

async function startDailyBriefingScheduler() {
  console.log('🏛️ PRESIDENTIAL DAILY BRIEFING SCHEDULER');
  console.log('=' .repeat(50));
  console.log(`🎯 Portfolio: ${PORTFOLIO_SYMBOLS.join(', ')}`);
  console.log(`⏰ Started: ${new Date().toLocaleString()}`);
  
  try {
    console.log('🚀 Starting daily briefing scheduler...');
    
    const scheduler = mastra.getWorkflow('dailyBriefingScheduler');
    const run = await scheduler.createRunAsync();
    
    console.log('📅 Calculating next 9:30 AM briefing time...');
    
    const result = await run.start({
      inputData: {
        portfolioSymbols: PORTFOLIO_SYMBOLS
      }
    });
    
    if (result.status === 'success') {
      console.log('✅ Daily briefing scheduler started successfully!');
      console.log(`📊 Next briefing: ${new Date(result.result.nextScheduledTime).toLocaleString()}`);
      console.log('🔄 Scheduler will run continuously...');
    } else if (result.status === 'suspended') {
      console.log('⏸️ Scheduler suspended - waiting for scheduled time');
    } else {
      console.log('❌ Scheduler failed to start:', result.error);
    }
    
    // Also start breaking news monitoring
    console.log('\n🚨 Starting breaking news monitoring...');
    const agent = mastra.getAgent('phemexPortfolioAgent');
    
    const monitoringResult = await agent.tools.startBreakingNewsMonitoring.execute({
      context: {
        portfolioSymbols: PORTFOLIO_SYMBOLS,
        scanIntervalMinutes: 15,
        alertThreshold: 'MEDIUM'
      }
    });
    
    if (monitoringResult.success) {
      console.log('✅ Breaking news monitoring started!');
      console.log(`📡 Scan interval: ${monitoringResult.scan_interval_minutes} minutes`);
      console.log(`🎯 Alert threshold: ${monitoringResult.alert_threshold}`);
      console.log(`⏰ Next scan: ${new Date(monitoringResult.next_scan).toLocaleString()}`);
    } else {
      console.log('❌ Breaking news monitoring failed to start');
    }
    
    console.log('\n🎉 Presidential briefing system is now OPERATIONAL!');
    console.log(`📋 Daily briefings at 9:30 AM EST`);
    console.log(`🚨 Breaking news monitoring every 15 minutes`);
    console.log(`💬 Enhanced portfolio agent with news integration`);
    
    // Keep the process running
    console.log('\nPress Ctrl+C to stop the scheduler...');
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down briefing scheduler...');
      process.exit(0);
    });
    
    // Keep alive
    setInterval(() => {
      console.log(`💓 Scheduler heartbeat: ${new Date().toLocaleString()}`);
    }, 60000 * 15); // Every 15 minutes
    
  } catch (error) {
    console.error('❌ Failed to start briefing scheduler:', error);
    process.exit(1);
  }
}

console.log('🏛️ Initializing Presidential Portfolio Briefing System...');
startDailyBriefingScheduler();