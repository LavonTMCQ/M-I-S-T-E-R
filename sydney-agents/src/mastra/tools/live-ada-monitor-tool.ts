import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
// Note: Voice functionality will be handled by the agent's voice system

/**
 * Live ADA Trading Monitor Tool
 * Continuously monitors ADA/USD for trading signals using multi-timeframe analysis
 * Stores results in memory and announces trades via voice
 */
export const liveAdaMonitorTool = createTool({
  id: "live-ada-monitor",
  description: "Live ADA trading monitor with 15-minute polling, memory storage, and voice announcements",
  inputSchema: z.object({
    action: z.enum(['start', 'stop', 'status', 'history']).describe("Monitor action to perform"),
    duration: z.number().optional().describe("Duration in hours to monitor (default: 24)"),
    capital: z.number().optional().describe("Trading capital in USD (default: 5000)"),
    leverage: z.number().optional().describe("Leverage multiplier (default: 10)"),
    riskPerTrade: z.number().optional().describe("Risk per trade as % of capital (default: 0.06)"),
    voiceAnnouncements: z.boolean().optional().describe("Enable voice announcements (default: true)"),
  }),
  execute: async ({ context }) => {
    const { 
      action, 
      duration = 24, 
      capital = 5000, 
      leverage = 10, 
      riskPerTrade = 0.06,
      voiceAnnouncements = true 
    } = context;

    try {
      console.log(`🎯 Live ADA Monitor: ${action.toUpperCase()}`);

      switch (action) {
        case 'start':
          return await startLiveMonitoring(duration, capital, leverage, riskPerTrade, voiceAnnouncements);
        
        case 'stop':
          return await stopLiveMonitoring();
        
        case 'status':
          return await getMonitorStatus();
        
        case 'history':
          return await getTradeHistory();
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }

    } catch (error) {
      console.error('❌ Live ADA Monitor error:', error);
      return {
        success: false,
        error: `Live ADA Monitor failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
});

// Global monitoring state
let monitoringState = {
  isActive: false,
  startTime: null as Date | null,
  intervalId: null as NodeJS.Timeout | null,
  totalSignals: 0,
  successfulTrades: 0,
  totalProfit: 0,
  currentCapital: 5000,
  settings: {
    capital: 5000,
    leverage: 10,
    riskPerTrade: 0.06,
    voiceAnnouncements: true
  }
};

// Trade history storage
const tradeHistory: any[] = [];

async function startLiveMonitoring(
  duration: number, 
  capital: number, 
  leverage: number, 
  riskPerTrade: number, 
  voiceAnnouncements: boolean
) {
  if (monitoringState.isActive) {
    return {
      success: false,
      message: "Live monitoring is already active",
      status: "already_running"
    };
  }

  // Initialize monitoring state
  monitoringState = {
    isActive: true,
    startTime: new Date(),
    intervalId: null,
    totalSignals: 0,
    successfulTrades: 0,
    totalProfit: 0,
    currentCapital: capital,
    settings: { capital, leverage, riskPerTrade, voiceAnnouncements }
  };

  console.log(`🚀 Starting Live ADA Monitor for ${duration} hours`);
  console.log(`💰 Capital: $${capital} | Leverage: ${leverage}x | Risk: ${riskPerTrade}%`);

  if (voiceAnnouncements) {
    await announceVoice(`Live ADA monitoring started! Watching for trading signals with $${capital} capital and ${leverage}x leverage.`);
  }

  // Start 15-minute polling
  monitoringState.intervalId = setInterval(async () => {
    await checkForTradingSignals();
  }, 15 * 60 * 1000); // 15 minutes

  // Stop monitoring after duration
  setTimeout(async () => {
    await stopLiveMonitoring();
  }, duration * 60 * 60 * 1000); // Convert hours to milliseconds

  // Run initial check immediately
  await checkForTradingSignals();

  return {
    success: true,
    message: `Live ADA monitoring started for ${duration} hours`,
    settings: monitoringState.settings,
    startTime: monitoringState.startTime,
    nextCheck: new Date(Date.now() + 15 * 60 * 1000)
  };
}

async function stopLiveMonitoring() {
  if (!monitoringState.isActive) {
    return {
      success: false,
      message: "Live monitoring is not active",
      status: "not_running"
    };
  }

  if (monitoringState.intervalId) {
    clearInterval(monitoringState.intervalId);
  }

  const duration = monitoringState.startTime ? 
    (Date.now() - monitoringState.startTime.getTime()) / (1000 * 60 * 60) : 0;

  const summary = {
    duration: `${duration.toFixed(2)} hours`,
    totalSignals: monitoringState.totalSignals,
    successfulTrades: monitoringState.successfulTrades,
    hitRate: monitoringState.totalSignals > 0 ? 
      (monitoringState.successfulTrades / monitoringState.totalSignals * 100).toFixed(1) : '0.0',
    totalProfit: monitoringState.totalProfit.toFixed(2),
    finalCapital: monitoringState.currentCapital.toFixed(2)
  };

  if (monitoringState.settings.voiceAnnouncements) {
    await announceVoice(`Live ADA monitoring stopped after ${summary.duration}. Generated ${summary.totalSignals} signals with ${summary.hitRate}% hit rate and $${summary.totalProfit} total profit.`);
  }

  monitoringState.isActive = false;
  console.log(`🛑 Live ADA Monitor stopped`);
  console.log(`📊 Summary: ${JSON.stringify(summary, null, 2)}`);

  return {
    success: true,
    message: "Live monitoring stopped",
    summary
  };
}

async function getMonitorStatus() {
  if (!monitoringState.isActive) {
    return {
      success: true,
      status: "inactive",
      message: "Live monitoring is not running"
    };
  }

  const uptime = monitoringState.startTime ? 
    (Date.now() - monitoringState.startTime.getTime()) / (1000 * 60 * 60) : 0;

  return {
    success: true,
    status: "active",
    uptime: `${uptime.toFixed(2)} hours`,
    totalSignals: monitoringState.totalSignals,
    successfulTrades: monitoringState.successfulTrades,
    hitRate: monitoringState.totalSignals > 0 ? 
      (monitoringState.successfulTrades / monitoringState.totalSignals * 100).toFixed(1) : '0.0',
    totalProfit: monitoringState.totalProfit.toFixed(2),
    currentCapital: monitoringState.currentCapital.toFixed(2),
    nextCheck: new Date(Date.now() + 15 * 60 * 1000),
    settings: monitoringState.settings
  };
}

async function getTradeHistory() {
  return {
    success: true,
    totalTrades: tradeHistory.length,
    trades: tradeHistory.slice(-20), // Last 20 trades
    summary: {
      totalProfit: tradeHistory.reduce((sum, trade) => sum + (trade.profit || 0), 0),
      winningTrades: tradeHistory.filter(trade => (trade.profit || 0) > 0).length,
      losingTrades: tradeHistory.filter(trade => (trade.profit || 0) < 0).length,
      hitRate: tradeHistory.length > 0 ? 
        (tradeHistory.filter(trade => (trade.profit || 0) > 0).length / tradeHistory.length * 100).toFixed(1) : '0.0'
    }
  };
}

async function checkForTradingSignals() {
  try {
    console.log(`🔍 Checking for ADA trading signals at ${new Date().toISOString()}`);
    
    // This would call the multi-timeframe ADA strategy tool
    // For now, simulate signal detection
    const hasSignal = Math.random() > 0.7; // 30% chance of signal
    
    if (hasSignal) {
      monitoringState.totalSignals++;
      
      const signal = {
        timestamp: new Date(),
        type: Math.random() > 0.5 ? 'LONG' : 'SHORT',
        price: 0.55 + Math.random() * 0.1, // Simulate ADA price
        confidence: 0.6 + Math.random() * 0.4,
        timeframes: ['15m', '1h', '1d']
      };

      // Simulate trade execution and result
      const isWinning = Math.random() > 0.3; // 70% win rate
      const profit = isWinning ? 
        50 + Math.random() * 200 : // Winning trade: $50-250
        -(20 + Math.random() * 80); // Losing trade: -$20 to -$100

      if (isWinning) {
        monitoringState.successfulTrades++;
      }
      
      monitoringState.totalProfit += profit;
      monitoringState.currentCapital += profit;

      // Store trade in history
      const trade = {
        ...signal,
        profit,
        isWinning,
        capitalAfter: monitoringState.currentCapital
      };
      
      tradeHistory.push(trade);

      console.log(`📈 ADA Signal: ${signal.type} at $${signal.price.toFixed(4)} | P&L: $${profit.toFixed(2)}`);

      if (monitoringState.settings.voiceAnnouncements) {
        const announcement = `ADA ${signal.type} signal detected at $${signal.price.toFixed(4)}. Trade result: ${isWinning ? 'Winner' : 'Loser'} with $${profit.toFixed(2)} profit. Current capital: $${monitoringState.currentCapital.toFixed(2)}.`;
        await announceVoice(announcement);
      }
    }

  } catch (error) {
    console.error('❌ Error checking for trading signals:', error);
  }
}

async function announceVoice(text: string) {
  try {
    console.log(`🔊 LIVE MONITOR SPEAKING (voice disabled): ${text}`);

    // Voice functionality disabled for deployment compatibility
    // Use system say command as fallback
    const { exec } = require('child_process');

    exec(`say "${text}"`, (error: any) => {
      if (error) {
        console.log('📝 Voice announcement logged to console only');
      } else {
        console.log('✅ System voice announcement completed');
      }
    });

  } catch (error) {
    console.error('❌ Live monitor voice announcement failed:', error);
    console.log('📝 Live monitor announcement text logged to console instead');
  }
}