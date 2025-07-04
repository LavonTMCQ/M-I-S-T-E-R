// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Authentication Types
export interface AuthToken {
  token: string;
  expiresAt: Date;
  userId: string;
}

export interface User {
  id: string;
  email?: string;
  createdAt: Date;
  lastLogin?: Date;
}

// Wallet Types
export interface CreateWalletResult {
  bech32Address: string;
  mnemonic: string;
  userId: string;
}

export interface WalletInfo {
  userId: string;
  bech32Address: string;
  createdAt: Date;
  isActive: boolean;
  balance?: number;
}

// Trading Types
export interface Position {
  id: string;
  pair: string;
  type: 'Long' | 'Short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  status: 'open' | 'closed';
  leverage: number;
  collateralAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradingDecision {
  action: 'Open' | 'Close' | 'Hold';
  side?: 'Long' | 'Short';
  leverage?: number;
  positionSize?: number;
  collateralAmount?: number;
  enteredPrice?: number;
  confidence?: number;
  reasoning?: string;
}

// Dashboard Types
export interface PortfolioData {
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  availableBalance: number;
  totalPnL: number;
  totalPnLPercent: number;
}

export interface AIActivity {
  id: string;
  action: string;
  description?: string;
  pair?: string;
  amount?: number;
  price?: number;
  timestamp: string;
  status: 'success' | 'info' | 'error' | 'pending';
  txHash?: string;
}

export interface AIStatus {
  isRunning: boolean;
  strategy: string;
  lastCheck: string;
  nextCheck: string;
  totalSignals: number;
  successfulTrades: number;
  failedTrades: number;
}

export interface DashboardData {
  portfolio: PortfolioData;
  positions: Position[];
  aiActivity: AIActivity[];
  aiStatus: AIStatus;
  wallet: WalletInfo;
}

// Market Data Types
export interface MarketData {
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  timestamp: Date;
}

export interface PriceHistory {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Analytics Types
export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalReturn: number;
  annualizedReturn: number;
}

export interface TradeHistory {
  id: string;
  pair: string;
  type: 'Long' | 'Short';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  pnl?: number;
  pnlPercent?: number;
  entryTime: Date;
  exitTime?: Date;
  status: 'open' | 'closed' | 'cancelled';
  txHash?: string;
}

// Settings Types
export interface UserSettings {
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  maxPositionSize: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  enableNotifications: boolean;
  emailNotifications: boolean;
  tradingEnabled: boolean;
  autoTradingEnabled: boolean;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'price_update' | 'position_update' | 'ai_activity' | 'system_status' | 'portfolio_update' | 'subscribe' | 'unsubscribe' | 'ping' | 'get_positions' | 'get_system_status' | 'get_market_data';
  data: Record<string, unknown>;
  timestamp: Date;
}

// Market Data Interfaces
export interface MarketData {
  pair: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: string;
}

// Portfolio Update Interfaces
export interface PortfolioUpdate {
  userId: string;
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  availableBalance: number;
  timestamp: string;
}

// System Status Interfaces
export interface SystemStatus {
  aiStatus: {
    isRunning: boolean;
    strategy: string;
    lastCheck: string;
    nextCheck: string;
    totalSignals: number;
    successfulTrades: number;
    failedTrades: number;
  };
  strikeFinance: {
    status: 'operational' | 'degraded' | 'down';
    responseTime: number;
    lastCheck: string;
  };
  network: {
    blockHeight: number;
    networkLatency: number;
  };
  timestamp: string;
}

// Signal Statistics
export interface SignalStats {
  totalSignals: number;
  openSignals: number;
  closeSignals: number;
  avgConfidence: number;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Request Types
export interface CreateWalletRequest {
  userId?: string;
}

export interface UpdateSettingsRequest {
  settings: Partial<UserSettings>;
}

export interface ForceSignalRequest {
  immediate?: boolean;
}
