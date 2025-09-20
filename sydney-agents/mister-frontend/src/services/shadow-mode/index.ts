/**
 * Shadow Mode Service - Main Entry Point
 * 
 * Centralized exports for the shadow mode testing and validation system.
 */

export { ShadowModeLogger } from './ShadowModeLogger';

export type {
  ShadowModeConfig,
  ShadowExecutionLog,
  ShadowModeMetrics
} from './ShadowModeLogger';

// Convenience function to get the shadow mode logger instance
export const getShadowModeLogger = () => ShadowModeLogger.getInstance();

// Helper functions for common shadow mode operations
export const enableShadowMode = (config?: Partial<import('./ShadowModeLogger').ShadowModeConfig>) => {
  const logger = ShadowModeLogger.getInstance();
  logger.updateConfig({ enabled: true, ...config });
  console.log('✅ [Shadow Mode] Enabled');
  return logger;
};

export const disableShadowMode = () => {
  const logger = ShadowModeLogger.getInstance();
  logger.updateConfig({ enabled: false });
  console.log('⏸️ [Shadow Mode] Disabled');
  return logger;
};

export const generateShadowModeReport = () => {
  const logger = ShadowModeLogger.getInstance();
  return logger.generateReport();
};

// Environment-based initialization
export const initializeShadowMode = () => {
  const logger = ShadowModeLogger.getInstance();
  
  // Enable shadow mode based on environment variables
  const isEnabled = process.env.SHADOW_MODE_ENABLED === 'true' || 
                   process.env.NODE_ENV === 'development';
  
  if (isEnabled) {
    logger.updateConfig({
      enabled: true,
      logToConsole: process.env.NODE_ENV === 'development',
      logToDatabase: process.env.NODE_ENV === 'production',
      trackMetrics: true
    });
    
    console.log('🚀 [Shadow Mode] Initialized and enabled');
  } else {
    console.log('⏸️ [Shadow Mode] Initialized but disabled');
  }
  
  return logger;
};