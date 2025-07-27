/**
 * Core Signal Type Definitions
 * 
 * These interfaces formalize the signal structure from our production-ready
 * ADA Custom Algorithm (62.5% win rate) for use across the signal provider system.
 * 
 * Based on: ada_custom_algorithm.py and ada-custom-algorithm-tool.ts
 */

/**
 * Signal direction type
 */
export type SignalType = 'long' | 'short';

/**
 * Signal execution status for tracking
 */
export type SignalStatus = 
  | 'pending'      // Signal generated, awaiting user action
  | 'executing'    // User clicked execute, processing
  | 'executed'     // Successfully executed on Strike Finance
  | 'failed'       // Execution failed
  | 'cancelled'    // User cancelled
  | 'expired';     // Signal expired (time-based)

/**
 * Trading pattern types from ADA algorithm
 */
export type TradingPattern = 
  | 'RSI_Oversold_BB_Bounce'      // RSI < 35 + BB lower bounce (72% success)
  | 'RSI_Overbought_BB_Rejection' // RSI > 65 + BB upper rejection (78.3% success)
  | 'Volume_Spike_Reversal'       // Volume spike + price reversal (61.1% success)
  | 'Multi_Indicator_Confluence'  // Multiple indicators align
  | 'Custom_Pattern';             // Future algorithm patterns

/**
 * Core technical indicators used in signal generation
 */
export interface TechnicalIndicators {
  /** RSI value (0-100) */
  rsi: number;
  
  /** Bollinger Band position (0-1, where 0 = lower band, 1 = upper band) */
  bb_position: number;
  
  /** Volume ratio compared to SMA (e.g., 1.5 = 50% above average) */
  volume_ratio: number;
  
  /** Current price */
  price: number;
  
  /** Bollinger Band upper value */
  bb_upper?: number;
  
  /** Bollinger Band lower value */
  bb_lower?: number;
  
  /** Volume SMA for comparison */
  volume_sma?: number;
  
  /** Additional indicators for future algorithms */
  [key: string]: number | undefined;
}

/**
 * Risk management parameters
 */
export interface RiskParameters {
  /** Stop loss price level */
  stop_loss: number;
  
  /** Take profit price level */
  take_profit: number;
  
  /** Stop loss percentage from entry */
  stop_loss_pct: number;
  
  /** Take profit percentage from entry */
  take_profit_pct: number;
  
  /** Recommended position size in ADA */
  position_size: number;
  
  /** Maximum risk per trade in ADA */
  max_risk?: number;
}

/**
 * Algorithm metadata and performance tracking
 */
export interface AlgorithmMetadata {
  /** Algorithm name (e.g., "ADA Custom Algorithm") */
  algorithm_name: string;
  
  /** Algorithm version for tracking changes */
  version: string;
  
  /** Timeframe used for analysis (e.g., "15m") */
  timeframe: string;
  
  /** Historical win rate percentage */
  historical_win_rate: number;
  
  /** Pattern-specific performance data */
  pattern_performance?: {
    win_rate: number;
    total_trades: number;
    avg_return: number;
  };
}

/**
 * Core Trading Signal Interface
 * 
 * This is the main signal structure used throughout the system,
 * based on the production ADA Custom Algorithm format.
 */
export interface TradingSignal {
  /** Unique signal identifier */
  id: string;
  
  /** Signal generation timestamp (ISO string) */
  timestamp: string;
  
  /** Signal direction */
  type: SignalType;
  
  /** Entry price for the signal */
  price: number;
  
  /** Signal confidence (70-95% based on ADA algorithm) */
  confidence: number;
  
  /** Trading pattern that triggered the signal */
  pattern: TradingPattern;
  
  /** Human-readable explanation of why signal was generated */
  reasoning: string;
  
  /** Technical indicators at signal generation */
  indicators: TechnicalIndicators;
  
  /** Risk management parameters */
  risk: RiskParameters;
  
  /** Algorithm metadata */
  algorithm: AlgorithmMetadata;
  
  /** Current signal status */
  status: SignalStatus;
  
  /** Signal expiration time (ISO string) */
  expires_at: string;
  
  /** Optional execution tracking */
  execution?: SignalExecution;
}

/**
 * Signal execution tracking
 */
export interface SignalExecution {
  /** Execution start timestamp */
  started_at: string;
  
  /** Execution completion timestamp */
  completed_at?: string;
  
  /** Actual execution price */
  execution_price?: number;
  
  /** Strike Finance transaction ID */
  transaction_id?: string;
  
  /** Execution result */
  result?: 'success' | 'partial' | 'failed';
  
  /** Error message if execution failed */
  error_message?: string;
  
  /** Actual position size executed */
  executed_size?: number;
  
  /** Execution fees */
  fees?: number;
}

/**
 * Signal generation request parameters
 */
export interface SignalGenerationRequest {
  /** Trading symbol (e.g., "ADAUSD") */
  symbol: string;
  
  /** Timeframe for analysis */
  timeframe: string;
  
  /** Analysis mode */
  mode: 'live_analysis' | 'backtest';
  
  /** Minimum confidence threshold */
  min_confidence?: number;
  
  /** User-specific risk preferences */
  risk_preferences?: {
    max_position_size: number;
    max_risk_per_trade: number;
    preferred_patterns: TradingPattern[];
  };
}

/**
 * Signal generation response from algorithm
 */
export interface SignalGenerationResponse {
  /** Success status */
  success: boolean;
  
  /** Generated signal (if any) */
  signal?: TradingSignal;
  
  /** Current market analysis */
  analysis: {
    summary: string;
    current_price: number;
    market_conditions: string;
    next_analysis_time?: string;
  };
  
  /** Error message if generation failed */
  error?: string;
  
  /** Fallback indicator if using cached data */
  fallback?: boolean;
}

/**
 * Signal validation result
 */
export interface SignalValidation {
  /** Is signal valid for execution */
  is_valid: boolean;
  
  /** Validation errors */
  errors: string[];
  
  /** Validation warnings */
  warnings: string[];
  
  /** Updated signal with corrections */
  corrected_signal?: TradingSignal;
}

/**
 * Type guard to check if object is a valid TradingSignal
 */
export function isTradingSignal(obj: any): obj is TradingSignal {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.timestamp === 'string' &&
    (obj.type === 'long' || obj.type === 'short') &&
    typeof obj.price === 'number' &&
    typeof obj.confidence === 'number' &&
    obj.confidence >= 0 && obj.confidence <= 100 &&
    typeof obj.pattern === 'string' &&
    typeof obj.reasoning === 'string' &&
    obj.indicators &&
    obj.risk &&
    obj.algorithm
  );
}

/**
 * Type guard to check if signal is executable
 */
export function isExecutableSignal(signal: TradingSignal): boolean {
  return (
    signal.status === 'pending' &&
    new Date(signal.expires_at) > new Date() &&
    signal.confidence >= 70 &&
    signal.price > 0 &&
    signal.risk.position_size > 0
  );
}