/**
 * Shared Types for Provider System
 * 
 * Common types and utilities used across all providers and provider management.
 */

// Provider Registry Types
export type ProviderName = 'strike' | 'hyperliquid' | 'mock';

export interface ProviderRegistry {
  [key: string]: {
    instance: any; // Will be ITradingProvider when instantiated
    config: ProviderConfig;
    isActive: boolean;
    lastHealthCheck: string;
    healthStatus: ProviderHealthStatus;
  };
}

export interface ProviderHealthStatus {
  status: 'healthy' | 'degraded' | 'down' | 'maintenance';
  lastSuccessfulOperation: string;
  errorCount: number;
  averageLatency: number;
  uptime: number;
}

// Provider Configuration (extending from ITradingProvider)
export interface ProviderConfig {
  name: ProviderName;
  displayName: string;
  enabled: boolean;
  chainType: 'cardano' | 'evm';
  apiUrl: string;
  testnetUrl?: string;
  websocketUrl?: string;
  minPositionSizeUsd: number;
  maxPositionSizeUsd?: number;
  supportedAssets: string[];
  fees: ProviderFees;
  limits: ProviderLimits;
  features: ProviderFeatures;
  rateLimit?: RateLimitConfig;
  timeout?: number; // API timeout in milliseconds
}

export interface ProviderFees {
  makerRate: number;      // Maker fee rate (0-1)
  takerRate: number;      // Taker fee rate (0-1)
  withdrawalFee?: number; // Fixed withdrawal fee in USD
  fundingRate?: number;   // Current funding rate (if applicable)
}

export interface ProviderLimits {
  maxLeverage: number;
  minOrderSize: number;    // Minimum order size in USD
  maxOrderSize: number;    // Maximum order size in USD
  maxOpenPositions?: number;
  maxDailyVolume?: number; // Maximum daily trading volume
}

export interface ProviderFeatures {
  supportsStopLoss: boolean;
  supportsTakeProfit: boolean;
  supportsTrailingStop: boolean;
  supportsConditionalOrders: boolean;
  supportsMarginTrading: boolean;
  supportsSpotTrading: boolean;
  supportsCrossMargin: boolean;
  supportsIsolatedMargin: boolean;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  burstLimit: number;
}

// Routing and Execution Types
export interface RoutingDecision {
  selectedProvider: ProviderName;
  reason: RoutingReason;
  score: number;
  executionCost: ExecutionCostBreakdown;
  alternativeProviders: {
    provider: ProviderName;
    score: number;
    reason: string;
  }[];
}

export type RoutingReason = 
  | 'best_execution_cost'
  | 'only_supported_asset'
  | 'provider_preference'
  | 'failover'
  | 'load_balancing'
  | 'regulatory_requirement';

export interface ExecutionCostBreakdown {
  slippageCost: number;     // Estimated slippage cost in USD
  tradingFees: number;      // Trading fees in USD
  fundingCost?: number;     // Funding cost for position (if held)
  networkFees?: number;     // Blockchain network fees
  totalCost: number;        // Total execution cost in USD
  costPercentage: number;   // Total cost as percentage of trade size
}

// Best Execution Algorithm Types
export interface ExecutionContext {
  asset: string;
  side: 'buy' | 'sell';
  size: number;             // Trade size in USD
  urgency: 'low' | 'medium' | 'high'; // Execution urgency
  strategy: TradingStrategy;
  userPreferences?: UserExecutionPreferences;
}

export type TradingStrategy = 
  | 'scalping'        // High frequency, low latency priority
  | 'swing'           // Medium term, cost optimization priority  
  | 'position'        // Long term, funding rate priority
  | 'arbitrage'       // Cross-provider arbitrage
  | 'balanced';       // Default balanced approach

export interface UserExecutionPreferences {
  preferredProviders: ProviderName[];
  avoidProviders: ProviderName[];
  maxSlippagePercent: number;
  maxExecutionTimeMs: number;
  prioritizeCost: boolean;      // Prioritize cost over speed
  prioritizeSpeed: boolean;     // Prioritize speed over cost
}

// Shadow Mode and Testing Types
export interface ShadowModeResult {
  originalExecution: {
    provider: ProviderName;
    executionPrice: number;
    totalCost: number;
    latency: number;
    success: boolean;
  };
  shadowExecutions: {
    provider: ProviderName;
    hypotheticalPrice: number;
    estimatedCost: number;
    estimatedLatency: number;
    wouldHaveSucceeded: boolean;
    savingsVsOriginal: number; // Positive = would have saved money
  }[];
  recommendation: {
    bestProvider: ProviderName;
    potentialSavings: number;
    confidence: number; // 0-1 confidence in recommendation
  };
}

// Performance Metrics
export interface ProviderMetrics {
  provider: ProviderName;
  timeWindow: string; // ISO 8601 duration (e.g., "PT1H", "P1D")
  metrics: {
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    averageSlippage: number;
    totalVolume: number;
    totalFees: number;
    uptime: number; // 0-1
  };
  errorBreakdown: {
    [errorType: string]: number;
  };
}

// Cross-Provider Position Aggregation
export interface AggregatedPosition {
  asset: string;
  totalNetSize: number;        // Net position across all providers
  averageEntryPrice: number;   // Volume-weighted average entry
  totalUnrealizedPnl: number;  // Total unrealized P&L
  totalRealizedPnl: number;    // Total realized P&L
  totalMarginUsed: number;     // Total margin across providers
  effectiveLeverage: number;   // Effective leverage of combined position
  liquidationRisk: LiquidationRisk;
  providerBreakdown: {
    [provider: string]: {
      size: number;
      entryPrice: number;
      unrealizedPnl: number;
      marginUsed: number;
      liquidationPrice?: number;
    };
  };
}

export interface LiquidationRisk {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  nearestLiquidationPrice?: number;
  nearestLiquidationProvider?: ProviderName;
  marginCallLevel?: number;
  timeToLiquidation?: number; // Estimated time in seconds
}

// Event Types for Provider System
export interface ProviderEvent {
  type: ProviderEventType;
  provider: ProviderName;
  timestamp: string;
  data: any;
}

export type ProviderEventType =
  | 'provider_connected'
  | 'provider_disconnected'
  | 'provider_error'
  | 'order_placed'
  | 'order_filled'
  | 'order_cancelled'
  | 'position_opened'
  | 'position_closed'
  | 'balance_updated'
  | 'health_check_failed'
  | 'failover_triggered';

// Utility Types
export interface Timestamp {
  iso: string;
  unix: number;
}

export interface PricePoint {
  price: number;
  timestamp: Timestamp;
  source: ProviderName;
}

export interface VolumeData {
  volume24h: number;
  volumeChange24h: number;
  averageDailyVolume: number;
}

// Constants
export const SUPPORTED_ASSETS = [
  'ADA-PERP',
  'BTC-PERP', 
  'ETH-PERP',
  'SOL-PERP'
] as const;

export const DEFAULT_EXECUTION_WEIGHTS = {
  slippage: 0.4,
  fees: 0.4,
  funding: 0.1,
  quality: 0.1,
  latency: 0.0
} as const;

export const PROVIDER_PRIORITIES = {
  strike: 1,      // Primary provider
  hyperliquid: 2, // Secondary provider  
  mock: 999       // Testing only
} as const;