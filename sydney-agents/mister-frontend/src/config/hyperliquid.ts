/**
 * Hyperliquid Configuration
 * 
 * Configuration settings for Hyperliquid integration including
 * API endpoints, network settings, and trading parameters.
 */

export interface HyperliquidConfig {
  apiUrl: string;
  testnetUrl: string;
  websocketUrl: string;
  testnetWsUrl: string;
  chainId: number;
  testnetChainId: number;
  environment: 'mainnet' | 'testnet';
  features: {
    enableTestnet: boolean;
    enableWebsockets: boolean;
    enableShadowMode: boolean;
  };
  rateLimit: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    burstLimit: number;
  };
  timeout: {
    apiRequestTimeout: number;
    websocketTimeout: number;
    healthCheckTimeout: number;
  };
}

// Hyperliquid Network Configuration
export const HYPERLIQUID_CONFIG: HyperliquidConfig = {
  apiUrl: 'https://api.hyperliquid.xyz',
  testnetUrl: 'https://api.hyperliquid-testnet.xyz',
  websocketUrl: 'wss://api.hyperliquid.xyz/ws',
  testnetWsUrl: 'wss://api.hyperliquid-testnet.xyz/ws',
  chainId: 42161, // Arbitrum mainnet for collateral
  testnetChainId: 421613, // Arbitrum Goerli for testnet
  environment: process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet',
  features: {
    enableTestnet: process.env.NODE_ENV !== 'production',
    enableWebsockets: true,
    enableShadowMode: process.env.HYPERLIQUID_SHADOW_MODE === 'true'
  },
  rateLimit: {
    requestsPerSecond: 20,
    requestsPerMinute: 1000,
    burstLimit: 50
  },
  timeout: {
    apiRequestTimeout: 5000,   // 5 seconds
    websocketTimeout: 30000,   // 30 seconds
    healthCheckTimeout: 3000   // 3 seconds
  }
};

// API Endpoints
export const HYPERLIQUID_ENDPOINTS = {
  // Info API (Public)
  meta: '/info/meta',
  metaAndAssetCtxs: '/info/metaAndAssetCtxs',
  l2Snapshot: '/info/l2Book',
  candleSnapshot: '/info/candleSnapshot',
  
  // User Info (Requires authentication)
  userState: '/info/userState',
  userFills: '/info/userFills',
  userFunding: '/info/userFunding',
  
  // Exchange API (Trading)
  order: '/exchange/order',
  cancel: '/exchange/cancel',
  cancelByCloid: '/exchange/cancelByCloid',
  modifyOrder: '/exchange/modifyOrder',
  batchModify: '/exchange/batchModify',
  
  // Transfer API
  usdTransfer: '/exchange/usdTransfer',
  spotTransfer: '/exchange/spotTransfer',
  withdrawFromBridge: '/exchange/withdrawFromBridge',
  
  // WebSocket
  subscribe: '/ws'
} as const;

// Asset Information
export interface HyperliquidAsset {
  name: string;
  szDecimals: number;   // Size decimals
  maxLeverage: number;
  onlyIsolated: boolean;
}

// Known Hyperliquid Assets (to be verified dynamically)
export const KNOWN_HYPERLIQUID_ASSETS: { [key: string]: HyperliquidAsset } = {
  'ADA': {
    name: 'ADA',
    szDecimals: 0,
    maxLeverage: 20,
    onlyIsolated: false
  },
  'BTC': {
    name: 'BTC',
    szDecimals: 5,
    maxLeverage: 50,
    onlyIsolated: false
  },
  'ETH': {
    name: 'ETH',
    szDecimals: 4,
    maxLeverage: 50,
    onlyIsolated: false
  },
  'SOL': {
    name: 'SOL',
    szDecimals: 1,
    maxLeverage: 20,
    onlyIsolated: false
  }
};

// EIP-712 Domain for Hyperliquid
export const HYPERLIQUID_DOMAIN = {
  name: 'HyperliquidSignTransaction',
  version: '1',
  chainId: 1337,  // Hyperliquid uses 1337 for all environments
  verifyingContract: '0x0000000000000000000000000000000000000000'
};

// Order types for Hyperliquid
export const ORDER_TYPES = {
  market: {
    limit: {
      tif: 'Ioc' // Immediate or Cancel
    }
  },
  limit: {
    limit: {
      tif: 'Gtc' // Good Till Cancel
    }
  },
  triggerMarket: {
    trigger: {
      isMarket: true,
      triggerPx: '0', // Will be set based on order
      tpsl: 'tp'      // Take profit or stop loss
    }
  },
  triggerLimit: {
    trigger: {
      isMarket: false,
      triggerPx: '0', // Will be set based on order
      tpsl: 'tp'      // Take profit or stop loss
    }
  }
} as const;

// Environment-specific configuration
export const getHyperliquidConfig = (): HyperliquidConfig => {
  const isTestnet = process.env.NODE_ENV !== 'production' || 
                   process.env.HYPERLIQUID_USE_TESTNET === 'true';
  
  return {
    ...HYPERLIQUID_CONFIG,
    environment: isTestnet ? 'testnet' : 'mainnet'
  };
};

// Get appropriate API URL based on environment
export const getHyperliquidApiUrl = (): string => {
  const config = getHyperliquidConfig();
  return config.environment === 'testnet' ? config.testnetUrl : config.apiUrl;
};

// Get appropriate WebSocket URL based on environment
export const getHyperliquidWsUrl = (): string => {
  const config = getHyperliquidConfig();
  return config.environment === 'testnet' ? config.testnetWsUrl : config.websocketUrl;
};

// Feature flags for Hyperliquid integration
export const HYPERLIQUID_FEATURES = {
  SHADOW_MODE: process.env.HYPERLIQUID_SHADOW_MODE === 'true',
  LIVE_TRADING: process.env.HYPERLIQUID_LIVE_TRADING === 'true',
  WEBSOCKET_ENABLED: process.env.HYPERLIQUID_WEBSOCKET !== 'false',
  TESTNET_ONLY: process.env.HYPERLIQUID_TESTNET_ONLY === 'true'
} as const;

// Validation helper
export const validateHyperliquidConfig = (): boolean => {
  const config = getHyperliquidConfig();
  
  // Basic validation
  if (!config.apiUrl || !config.testnetUrl) {
    console.error('❌ [Hyperliquid Config] Missing API URLs');
    return false;
  }
  
  if (config.rateLimit.requestsPerSecond <= 0) {
    console.error('❌ [Hyperliquid Config] Invalid rate limit configuration');
    return false;
  }
  
  console.log('✅ [Hyperliquid Config] Configuration valid');
  console.log(`🌐 [Hyperliquid Config] Environment: ${config.environment}`);
  console.log(`🔗 [Hyperliquid Config] API URL: ${getHyperliquidApiUrl()}`);
  
  return true;
};

// Export the current configuration
export default getHyperliquidConfig();