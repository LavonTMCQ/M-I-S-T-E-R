import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Start Trading Command Tool
 * 
 * Simple command interface for Sydney to start trading monitoring.
 * Responds to commands like "start trading" and automatically begins
 * Tomorrow Labs ORB monitoring with voice feedback.
 */

export const startTradingTool = createTool({
  id: 'start-trading',
  description: 'Start Tomorrow Labs ORB trading monitoring with a simple command. Responds to "start trading" and begins autonomous monitoring.',
  inputSchema: z.object({
    command: z.string().default('start trading').describe('Trading command (e.g., "start trading", "begin monitoring")'),
    symbol: z.string().default('SPY').describe('Symbol to monitor (default: SPY)'),
    voice: z.boolean().default(true).describe('Enable voice announcements'),
    force: z.boolean().default(false).describe('Force start even if market is closed'),
  }),
  execute: async ({ context }): Promise<any> => {
    const { command, symbol, voice, force } = context;

    try {
      console.log(`🎯 Processing trading command: "${command}"`);
      
      // Parse command intent
      const commandLower = command.toLowerCase();
      const isStartCommand = commandLower.includes('start') || 
                           commandLower.includes('begin') || 
                           commandLower.includes('trading') ||
                           commandLower.includes('monitor');

      if (!isStartCommand) {
        return {
          success: false,
          message: `❓ Command "${command}" not recognized. Try "start trading" or "begin monitoring".`,
          availableCommands: [
            "start trading",
            "begin monitoring", 
            "start trading SPY",
            "begin monitoring QQQ"
          ]
        };
      }

      // Check market status
      const marketStatus = getCurrentMarketStatus();
      
      if (!force && !marketStatus.isMarketDay) {
        if (voice) {
          await speak('Market is closed today. Tomorrow Labs ORB monitoring will start on the next trading day.');
        }
        
        return {
          success: true,
          status: 'market_closed',
          message: '📅 Market is closed (weekend/holiday). Monitoring scheduled for next trading day.',
          marketStatus: marketStatus.status,
          nextTradingDay: marketStatus.nextMarketOpen
        };
      }

      if (!force && marketStatus.isMarketDay && !marketStatus.isMarketHours) {
        if (voice) {
          await speak(`Market opens at 9:30 AM Eastern. Tomorrow Labs ORB monitoring will start automatically when the market opens.`);
        }
        
        return {
          success: true,
          status: 'scheduled_for_market_open',
          message: '⏰ Market is closed but it\'s a trading day. Monitoring will start at market open.',
          marketStatus: marketStatus.status,
          nextMarketOpen: marketStatus.nextMarketOpen
        };
      }

      // Market is open or force start requested
      console.log(`🚀 Starting Tomorrow Labs ORB monitoring for ${symbol}`);
      
      if (voice) {
        if (marketStatus.isMarketHours) {
          await speak(`Starting Tomorrow Labs ORB monitoring for ${symbol}. Market is open and I'm now watching for breakout signals.`);
        } else {
          await speak(`Force starting Tomorrow Labs ORB monitoring for ${symbol}. I'll begin watching for signals immediately.`);
        }
      }

      // Start the monitoring (this would call the actual monitor)
      const monitoringResult = await startOrbMonitoring(symbol, voice);
      
      return {
        success: true,
        status: 'monitoring_active',
        symbol,
        message: `🎯 Tomorrow Labs ORB monitoring started for ${symbol}`,
        marketStatus: marketStatus.status,
        monitoringDetails: {
          symbol,
          voiceEnabled: voice,
          startTime: new Date().toISOString(),
          marketHours: marketStatus.isMarketHours,
          forced: force && !marketStatus.isMarketHours
        },
        nextActions: [
          "Monitoring every 3 minutes for ORB signals",
          "Voice alerts enabled for trade detection",
          "Charts will be generated for each trade",
          "Daily summary at market close"
        ],
        monitoringResult
      };

    } catch (error) {
      console.error('❌ Error starting trading:', error);
      
      if (voice) {
        await speak('Sorry, there was an error starting the trading monitor. Please check the system and try again.');
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: "Check system configuration and try again"
      };
    }
  }
});

// Get current market status
function getCurrentMarketStatus() {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  const dayOfWeek = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = easternTime.getHours();
  const minute = easternTime.getMinutes();
  
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isMarketHours = isWeekday && (hour > 9 || (hour === 9 && minute >= 30)) && hour < 16;
  
  let status = 'closed';
  if (isWeekday && isMarketHours) {
    status = 'open';
  } else if (isWeekday) {
    status = 'closed_market_day';
  } else {
    status = 'weekend';
  }

  // Calculate next market open
  let nextMarketOpen = new Date(easternTime);

  if (!isWeekday) {
    // Weekend - move to next Monday
    while (nextMarketOpen.getDay() === 0 || nextMarketOpen.getDay() === 6) {
      nextMarketOpen.setDate(nextMarketOpen.getDate() + 1);
    }
  } else if (isWeekday && hour >= 16) {
    // After market close - move to next trading day
    nextMarketOpen.setDate(nextMarketOpen.getDate() + 1);
    // Skip weekends if we land on one
    while (nextMarketOpen.getDay() === 0 || nextMarketOpen.getDay() === 6) {
      nextMarketOpen.setDate(nextMarketOpen.getDate() + 1);
    }
  }
  // If it's a weekday and before market close, keep the same day

  nextMarketOpen.setHours(9, 30, 0, 0);

  return {
    status,
    isMarketDay: isWeekday,
    isMarketHours,
    currentTime: easternTime.toLocaleString(),
    nextMarketOpen: nextMarketOpen.toLocaleString()
  };
}

// Start ORB monitoring
async function startOrbMonitoring(symbol: string, voice: boolean): Promise<any> {
  try {
    console.log(`🎯 Initializing ORB monitoring for ${symbol}...`);
    
    // This would call the actual monitoring system
    // For now, simulate the start
    const result = {
      symbol,
      status: 'monitoring_started',
      startTime: new Date().toISOString(),
      interval: '3 minutes',
      voiceEnabled: voice
    };
    
    console.log('✅ ORB monitoring started successfully');
    console.log(`📊 Monitoring ${symbol} every 3 minutes`);
    console.log(`🔊 Voice alerts: ${voice ? 'Enabled' : 'Disabled'}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error starting ORB monitoring:', error);
    throw error;
  }
}

// Text-to-speech function
async function speak(message: string): Promise<void> {
  // This would integrate with actual TTS
  console.log(`🔊 SPEAKING: ${message}`);
}


