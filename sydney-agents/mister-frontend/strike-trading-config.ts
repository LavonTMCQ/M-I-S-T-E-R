/**
 * Strike Finance Trading Configuration
 * 
 * SECURITY WARNING:
 * - NEVER commit seed phrases to git
 * - This file should be in .gitignore
 * - In production, use encrypted storage
 * 
 * For testing only - replace with secure storage in production
 */

export const STRIKE_TRADING_CONFIG = {
  // Replace with your wallet address
  WALLET_ADDRESS: '', // Example: 'addr1qx...'
  
  // For testing only - in production this should be:
  // 1. Stored encrypted in database
  // 2. Retrieved via secure API
  // 3. Never exposed in code
  WALLET_SEED: process.env.WALLET_SEED || '', // Set via environment variable
  
  // Trading parameters
  DEFAULT_COLLATERAL: 40, // ADA
  DEFAULT_LEVERAGE: 2, // Conservative 2x
  MAX_LEVERAGE: 5, // Maximum allowed leverage
  
  // Risk management
  DEFAULT_STOP_LOSS_PERCENT: 5, // 5% stop loss
  DEFAULT_TAKE_PROFIT_PERCENT: 10, // 10% take profit
  
  // API endpoints
  CARDANO_SERVICE_URL: process.env.NEXT_PUBLIC_CARDANO_SERVICE_URL || 
                       'https://friendly-reprieve-production.up.railway.app',
  
  STRIKE_API_BASE: 'https://app.strikefinance.org',
  
  // Safety limits
  MAX_POSITION_SIZE: 100, // Maximum ADA per position
  MAX_OPEN_POSITIONS: 3, // Maximum concurrent positions
  
  // Monitoring
  POSITION_CHECK_INTERVAL: 30000, // Check positions every 30 seconds
  PRICE_UPDATE_INTERVAL: 10000, // Update price every 10 seconds
};

// Validate configuration
export function validateConfig(): boolean {
  if (!STRIKE_TRADING_CONFIG.WALLET_ADDRESS) {
    console.error('❌ WALLET_ADDRESS not configured');
    return false;
  }
  
  if (!STRIKE_TRADING_CONFIG.WALLET_SEED && process.env.NODE_ENV === 'production') {
    console.error('❌ WALLET_SEED not configured');
    return false;
  }
  
  return true;
}