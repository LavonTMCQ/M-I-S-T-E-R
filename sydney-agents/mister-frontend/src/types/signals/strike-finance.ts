/**
 * Strike Finance Integration Types
 * 
 * Type definitions for integrating trading signals with Strike Finance API
 * for one-click execution functionality.
 */

import { TradingSignal, SignalType } from './core';

/**
 * Strike Finance trade execution request
 */
export interface StrikeFinanceTradeRequest {
  /** User wallet address */
  wallet_address: string;
  
  /** Trade direction */
  side: 'long' | 'short';
  
  /** Trade amount in ADA */
  amount: number;
  
  /** Asset to trade */
  asset: string;
  
  /** Leverage multiplier (if supported) */
  leverage?: number;
  
  /** Stop loss price */
  stop_loss?: number;
  
  /** Take profit price */
  take_profit?: number;
  
  /** Reference to original signal */
  signal_id?: string;
  
  /** Client-side request ID for tracking */
  client_request_id: string;
}

/**
 * Strike Finance trade execution response
 */
export interface StrikeFinanceTradeResponse {
  /** Success status */
  success: boolean;
  
  /** Strike Finance transaction ID */
  transaction_id?: string;
  
  /** Actual execution price */
  execution_price?: number;
  
  /** Executed amount */
  executed_amount?: number;
  
  /** Trade fees */
  fees?: {
    trading_fee: number;
    network_fee: number;
    total_fee: number;
  };
  
  /** Error details if failed */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  
  /** Execution timestamp */
  executed_at?: string;
}

/**
 * Strike Finance position status
 */
export interface StrikeFinancePosition {
  /** Position ID */
  position_id: string;
  
  /** Asset */
  asset: string;
  
  /** Position side */
  side: 'long' | 'short';
  
  /** Position size */
  size: number;
  
  /** Entry price */
  entry_price: number;
  
  /** Current price */
  current_price: number;
  
  /** Unrealized P&L */
  unrealized_pnl: number;
  
  /** Position status */
  status: 'open' | 'closed' | 'liquidated';
  
  /** Stop loss level */
  stop_loss?: number;
  
  /** Take profit level */
  take_profit?: number;
  
  /** Position opened timestamp */
  opened_at: string;
  
  /** Position closed timestamp */
  closed_at?: string;
}

/**
 * Convert TradingSignal to Strike Finance trade request
 */
export function signalToStrikeFinanceRequest(
  signal: TradingSignal,
  walletAddress: string,
  clientRequestId: string
): StrikeFinanceTradeRequest {
  return {
    wallet_address: walletAddress,
    side: signal.type,
    amount: signal.risk.position_size,
    asset: 'ADA', // Default to ADA for now
    stop_loss: signal.risk.stop_loss,
    take_profit: signal.risk.take_profit,
    signal_id: signal.id,
    client_request_id: clientRequestId,
  };
}

/**
 * Strike Finance API endpoints configuration
 */
export interface StrikeFinanceConfig {
  /** Base API URL */
  base_url: string;
  
  /** API version */
  version: string;
  
  /** Timeout for requests (ms) */
  timeout: number;
  
  /** Retry configuration */
  retry: {
    max_attempts: number;
    delay_ms: number;
  };
}

/**
 * Strike Finance API client interface
 */
export interface StrikeFinanceClient {
  /**
   * Execute a trade based on a signal
   */
  executeTrade(request: StrikeFinanceTradeRequest): Promise<StrikeFinanceTradeResponse>;
  
  /**
   * Get current positions for a wallet
   */
  getPositions(walletAddress: string): Promise<StrikeFinancePosition[]>;
  
  /**
   * Close a specific position
   */
  closePosition(positionId: string): Promise<StrikeFinanceTradeResponse>;
  
  /**
   * Get account balance
   */
  getBalance(walletAddress: string): Promise<{
    available_balance: number;
    total_balance: number;
    currency: string;
  }>;
  
  /**
   * Check if wallet has sufficient balance for trade
   */
  checkBalance(walletAddress: string, amount: number): Promise<boolean>;
}

/**
 * One-click execution request
 */
export interface OneClickExecutionRequest {
  /** Signal to execute */
  signal: TradingSignal;
  
  /** User wallet address */
  wallet_address: string;
  
  /** User confirmation */
  user_confirmed: boolean;
  
  /** Optional position size override */
  position_size_override?: number;
  
  /** Optional risk parameter overrides */
  risk_overrides?: {
    stop_loss?: number;
    take_profit?: number;
  };
}

/**
 * One-click execution response
 */
export interface OneClickExecutionResponse {
  /** Execution success */
  success: boolean;
  
  /** Strike Finance response */
  strike_response?: StrikeFinanceTradeResponse;
  
  /** Updated signal with execution data */
  updated_signal: TradingSignal;
  
  /** Execution summary for user */
  summary: {
    action: string;
    amount: number;
    price: number;
    fees: number;
    estimated_pnl?: number;
  };
  
  /** Error details if failed */
  error?: {
    type: 'validation' | 'balance' | 'api' | 'network';
    message: string;
    details?: any;
  };
}

/**
 * Pre-execution validation
 */
export interface PreExecutionValidation {
  /** Can execute signal */
  can_execute: boolean;
  
  /** Validation checks */
  checks: {
    signal_valid: boolean;
    balance_sufficient: boolean;
    market_open: boolean;
    risk_acceptable: boolean;
  };
  
  /** Warnings to show user */
  warnings: string[];
  
  /** Blocking errors */
  errors: string[];
  
  /** Estimated execution details */
  estimation: {
    execution_price: number;
    total_fees: number;
    net_amount: number;
    max_loss: number;
    max_profit: number;
  };
}