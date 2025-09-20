/**
 * ITradingProvider - Universal Trading Provider Interface
 * 
 * This interface abstracts all trading operations across different providers
 * (Strike Finance on Cardano, Hyperliquid on EVM, etc.) to enable unified
 * trading logic and seamless provider switching.
 */

export interface ITradingProvider {
  // Provider Identification
  getProviderName(): string;
  getChainType(): 'cardano' | 'evm';
  
  // Asset Support
  supportsAsset(asset: string): Promise<boolean>;
  getSupportedAssets(): Promise<string[]>;
  
  // Core Trading Operations
  placeOrder(orderParams: AbstractOrderParams): Promise<OrderResult>;
  cancelOrder(orderId: string, asset: string): Promise<boolean>;
  getOrderStatus(orderId: string, asset: string): Promise<OrderStatus>;
  
  // Position Management
  getPosition(asset: string): Promise<Position | null>;
  getAllPositions(): Promise<Position[]>;
  
  // Account State
  getAccountState(): Promise<AccountState>;
  
  // Collateral Management
  deposit(amount: number, asset: string): Promise<TransactionReceipt>;
  withdraw(amount: number, asset: string): Promise<TransactionReceipt>;
  
  // Market Data
  getOrderBook(asset: string): Promise<OrderBook>;
  getMarketPrice(asset: string): Promise<number>;
  
  // Provider Health
  isHealthy(): Promise<boolean>;
  getProviderMetrics(): Promise<ProviderMetrics>;
}

// Core Data Types

export interface AbstractOrderParams {
  asset: string;           // e.g., 'ADA-PERP', 'ETH-PERP'
  side: 'buy' | 'sell';    // Order direction
  type: 'market' | 'limit'; // Order type
  size: number;            // Position size in base asset units
  price?: number;          // Required for limit orders
  timeInForce?: 'GTC' | 'IOC' | 'FOK'; // Time in force
  clientOrderId?: string;  // Client-side order tracking
  stopLoss?: number;       // Optional stop loss price
  takeProfit?: number;     // Optional take profit price
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  status: OrderStatus;
  filledSize?: number;
  averagePrice?: number;
  executionId?: string;
  error?: {
    type: 'validation' | 'balance' | 'api' | 'network' | 'provider';
    message: string;
    details?: any;
  };
  providerData?: any; // Provider-specific response data
}

export type OrderStatus = 
  | 'pending'        // Order submitted but not confirmed
  | 'open'           // Order active in order book
  | 'filled'         // Order completely filled
  | 'partially_filled' // Order partially filled
  | 'cancelled'      // Order cancelled
  | 'rejected'       // Order rejected by exchange
  | 'expired';       // Order expired

export interface Position {
  asset: string;
  side: 'long' | 'short';
  size: number;              // Position size in base asset
  entryPrice: number;        // Average entry price
  markPrice: number;         // Current mark price
  liquidationPrice?: number; // Liquidation price if available
  unrealizedPnl: number;     // Unrealized P&L in quote currency
  realizedPnl: number;       // Realized P&L in quote currency
  margin: number;            // Margin used for this position
  leverage: number;          // Effective leverage
  timestamp: string;         // Position open time
  providerPositionId?: string; // Provider-specific position ID
}

export interface AccountState {
  totalCollateralValue: number;  // Total collateral in USD
  freeCollateral: number;        // Available collateral for new positions
  usedMargin: number;            // Margin currently in use
  marginRatio: number;           // Current margin ratio (0-1)
  unrealizedPnl: number;         // Total unrealized P&L
  realizedPnl: number;           // Total realized P&L
  availableWithdrawal: number;   // Amount available for withdrawal
  portfolioValue: number;        // Total portfolio value
}

export interface TransactionReceipt {
  success: boolean;
  transactionId: string;
  amount: number;
  asset: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockHeight?: number;
  confirmations?: number;
  error?: string;
}

export interface OrderBook {
  asset: string;
  timestamp: string;
  bids: [number, number][]; // [price, size] pairs
  asks: [number, number][]; // [price, size] pairs
  spread: number;           // Best bid-ask spread
  midPrice: number;         // Mid-market price
}

export interface ProviderMetrics {
  uptime: number;           // Provider uptime percentage
  avgLatency: number;       // Average API response time (ms)
  lastSuccessfulCall: string; // ISO timestamp
  errorRate: number;        // Error rate (0-1)
  maintenanceMode: boolean; // Is provider in maintenance
  supportedAssets: string[]; // Currently supported assets
}

// Provider Configuration Types

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  chainType: 'cardano' | 'evm';
  apiUrl: string;
  testnetUrl?: string;
  minPositionSizeUsd: number;
  maxPositionSizeUsd?: number;
  supportedAssets: string[];
  fees: {
    makerRate: number;  // Maker fee rate (0-1)
    takerRate: number;  // Taker fee rate (0-1)
    withdrawalFee?: number; // Fixed withdrawal fee
  };
  limits: {
    maxLeverage: number;
    minOrderSize: number;
    maxOrderSize: number;
  };
  features: {
    supportsStopLoss: boolean;
    supportsTakeProfit: boolean;
    supportsTrailingStop: boolean;
    supportsConditionalOrders: boolean;
  };
}

// Error Types

export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public type: 'connection' | 'validation' | 'execution' | 'timeout',
    public details?: any
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class InsufficientBalanceError extends ProviderError {
  constructor(provider: string, required: number, available: number) {
    super(
      `Insufficient balance: required ${required}, available ${available}`,
      provider,
      'validation',
      { required, available }
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class UnsupportedAssetError extends ProviderError {
  constructor(provider: string, asset: string) {
    super(
      `Asset ${asset} is not supported by provider ${provider}`,
      provider,
      'validation',
      { asset }
    );
    this.name = 'UnsupportedAssetError';
  }
}