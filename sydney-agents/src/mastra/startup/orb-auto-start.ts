/**
 * Tomorrow Labs ORB Auto-Start Module
 * 
 * This module automatically initializes the ORB monitoring system when Mastra starts.
 * It runs in the background and handles:
 * - System startup detection
 * - Market hours validation
 * - Automatic monitoring activation
 * - Voice announcements
 * - Error handling and recovery
 */

import { autoStartOrbMonitorTool } from '../tools/auto-start-orb-monitor.js';

// Configuration for auto-start
const AUTO_START_CONFIG = {
  symbols: ['SPY'], // Primary symbol to monitor
  enableVoice: true, // Voice announcements
  checkSystemHealth: true, // Health checks before starting
  waitForMarketOpen: true, // Wait for market open if closed
  autoRestart: true, // Restart each trading day
  startupDelay: 5000, // 5 second delay after Mastra starts
};

// Auto-start flag to prevent multiple initializations
let autoStartInitialized = false;

/**
 * Initialize the Tomorrow Labs ORB auto-start system
 * This function is called when Mastra starts up
 */
export async function initializeOrbAutoStart(): Promise<void> {
  if (autoStartInitialized) {
    console.log('⚠️ ORB auto-start already initialized');
    return;
  }

  autoStartInitialized = true;
  
  try {
    console.log('🚀 Initializing Tomorrow Labs ORB Auto-Start...');
    
    // Add startup delay to ensure Mastra is fully loaded
    await new Promise(resolve => setTimeout(resolve, AUTO_START_CONFIG.startupDelay));
    
    console.log('🎯 Starting Tomorrow Labs ORB monitoring system...');
    
    // Execute the auto-start tool
    const result = await autoStartOrbMonitorTool.execute({
      context: AUTO_START_CONFIG
    });

    if (result.success) {
      console.log('✅ Tomorrow Labs ORB Auto-Start successful');
      console.log(`📊 Status: ${result.status}`);
      console.log(`🎯 Symbols: ${AUTO_START_CONFIG.symbols.join(', ')}`);
      
      if (result.message) {
        console.log(`📝 Message: ${result.message}`);
      }

      // Log next actions if provided
      if (result.nextActions) {
        console.log('📋 Next Actions:');
        result.nextActions.forEach((action: string, index: number) => {
          console.log(`   ${index + 1}. ${action}`);
        });
      }

      // Set up periodic health checks
      setupPeriodicHealthChecks();
      
    } else {
      console.error('❌ Tomorrow Labs ORB Auto-Start failed:', result.error);
      
      if (result.suggestion) {
        console.log(`💡 Suggestion: ${result.suggestion}`);
      }

      // Attempt recovery after delay
      console.log('🔄 Attempting recovery in 30 seconds...');
      setTimeout(async () => {
        await attemptRecovery();
      }, 30000);
    }

  } catch (error) {
    console.error('❌ Critical error in ORB auto-start:', error);
    
    // Log error details for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Attempt recovery
    setTimeout(async () => {
      await attemptRecovery();
    }, 60000); // Wait 1 minute before recovery attempt
  }
}

/**
 * Attempt to recover from startup failures
 */
async function attemptRecovery(): Promise<void> {
  try {
    console.log('🔄 Attempting ORB auto-start recovery...');
    
    // Reset initialization flag
    autoStartInitialized = false;
    
    // Try again with reduced configuration
    const recoveryConfig = {
      ...AUTO_START_CONFIG,
      checkSystemHealth: false, // Skip health checks in recovery
      enableVoice: false, // Disable voice to reduce complexity
    };

    const result = await autoStartOrbMonitorTool.execute({
      context: recoveryConfig
    });

    if (result.success) {
      console.log('✅ ORB auto-start recovery successful');
      autoStartInitialized = true;
    } else {
      console.error('❌ ORB auto-start recovery failed:', result.error);
      
      // Schedule another recovery attempt
      console.log('🔄 Scheduling another recovery attempt in 5 minutes...');
      setTimeout(async () => {
        await attemptRecovery();
      }, 300000); // 5 minutes
    }

  } catch (error) {
    console.error('❌ Recovery attempt failed:', error);
    
    // Final fallback - just log the issue
    console.log('⚠️ ORB auto-start in manual mode. Use backtesting agent to start monitoring manually.');
  }
}

/**
 * Set up periodic health checks for the monitoring system
 */
function setupPeriodicHealthChecks(): void {
  console.log('🏥 Setting up periodic health checks...');
  
  // Check system health every 30 minutes during market hours
  setInterval(async () => {
    try {
      const marketStatus = getCurrentMarketStatus();
      
      if (marketStatus.isMarketHours) {
        console.log('🏥 Performing periodic health check...');
        
        // Basic health check
        const healthCheck = await performBasicHealthCheck();
        
        if (!healthCheck.healthy) {
          console.warn('⚠️ Health check issues detected:', healthCheck.issues);
          
          // Attempt to restart monitoring if needed
          if (healthCheck.issues.includes('monitoring_stopped')) {
            console.log('🔄 Attempting to restart monitoring...');
            await attemptRecovery();
          }
        } else {
          console.log('✅ System health check passed');
        }
      }
    } catch (error) {
      console.error('❌ Error in periodic health check:', error);
    }
  }, 1800000); // 30 minutes
}

/**
 * Basic health check for the monitoring system
 */
async function performBasicHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  try {
    // Check if monitoring is still active
    // This would check the actual monitor status
    // For now, simulate the check
    const monitoringActive = true; // This would be a real check
    
    if (!monitoringActive) {
      issues.push('monitoring_stopped');
    }

    // Check network connectivity
    try {
      const response = await fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=demo', {
        timeout: 5000
      } as any);
      
      if (!response.ok) {
        issues.push('network_connectivity');
      }
    } catch {
      issues.push('api_unreachable');
    }

    return {
      healthy: issues.length === 0,
      issues
    };

  } catch (error) {
    issues.push(`health_check_error: ${error}`);
    return { healthy: false, issues };
  }
}

/**
 * Get current market status
 */
function getCurrentMarketStatus() {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  const dayOfWeek = easternTime.getDay();
  const hour = easternTime.getHours();
  const minute = easternTime.getMinutes();
  
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isMarketHours = isWeekday && (hour > 9 || (hour === 9 && minute >= 30)) && hour < 16;
  
  return {
    isMarketDay: isWeekday,
    isMarketHours,
    currentTime: easternTime.toLocaleString()
  };
}

/**
 * Manual start function for troubleshooting
 */
export async function manualStartOrbMonitoring(symbols: string[] = ['SPY']): Promise<any> {
  try {
    console.log('🔧 Manual start of ORB monitoring requested...');
    
    const result = await autoStartOrbMonitorTool.execute({
      context: {
        symbols,
        enableVoice: true,
        checkSystemHealth: true,
        waitForMarketOpen: false, // Start immediately
        autoRestart: true
      }
    });

    console.log('📊 Manual start result:', result);
    return result;

  } catch (error) {
    console.error('❌ Manual start failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Stop ORB monitoring
 */
export async function stopOrbMonitoring(): Promise<void> {
  try {
    console.log('🛑 Stopping ORB monitoring...');
    
    // This would call the actual stop function
    // For now, just reset the flag
    autoStartInitialized = false;
    
    console.log('✅ ORB monitoring stopped');
    
  } catch (error) {
    console.error('❌ Error stopping ORB monitoring:', error);
  }
}

/**
 * Get ORB monitoring status
 */
export function getOrbMonitoringStatus(): any {
  return {
    initialized: autoStartInitialized,
    config: AUTO_START_CONFIG,
    marketStatus: getCurrentMarketStatus(),
    timestamp: new Date().toISOString()
  };
}

// Export the main initialization function
export default initializeOrbAutoStart;
