/**
 * Signal Validation Types and Schemas
 * 
 * Validation utilities and schemas for ensuring signal data integrity
 * and compatibility across the system.
 */

import { TradingSignal, SignalType, TradingPattern, SignalStatus } from './core';
import { StrikeFinanceTradeRequest } from './strike-finance';

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Is valid */
  valid: boolean;
  
  /** Validation errors */
  errors: ValidationError[];
  
  /** Validation warnings */
  warnings: ValidationWarning[];
  
  /** Validation score (0-100) */
  score: number;
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error field */
  field: string;
  
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Error severity */
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  /** Suggested fix */
  suggested_fix?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning field */
  field: string;
  
  /** Warning code */
  code: string;
  
  /** Warning message */
  message: string;
  
  /** Warning type */
  type: 'performance' | 'risk' | 'compatibility' | 'best_practice';
}

/**
 * Signal validation constraints
 */
export interface SignalValidationConstraints {
  /** Price constraints */
  price: {
    min: number;
    max: number;
    decimal_places: number;
  };
  
  /** Confidence constraints */
  confidence: {
    min: number;
    max: number;
    recommended_min: number;
  };
  
  /** Position size constraints */
  position_size: {
    min: number;
    max: number;
    recommended_max: number;
  };
  
  /** Risk constraints */
  risk: {
    max_risk_per_trade: number;
    min_risk_reward_ratio: number;
    max_stop_loss_pct: number;
    max_take_profit_pct: number;
  };
  
  /** Time constraints */
  time: {
    max_signal_age_minutes: number;
    min_expiry_minutes: number;
    max_expiry_minutes: number;
  };
}

/**
 * Default validation constraints
 */
export const DEFAULT_VALIDATION_CONSTRAINTS: SignalValidationConstraints = {
  price: {
    min: 0.0001,
    max: 1000,
    decimal_places: 4,
  },
  confidence: {
    min: 50,
    max: 100,
    recommended_min: 70,
  },
  position_size: {
    min: 40, // Strike Finance minimum
    max: 1000,
    recommended_max: 200,
  },
  risk: {
    max_risk_per_trade: 100, // ADA
    min_risk_reward_ratio: 1.5,
    max_stop_loss_pct: 10,
    max_take_profit_pct: 20,
  },
  time: {
    max_signal_age_minutes: 60,
    min_expiry_minutes: 15,
    max_expiry_minutes: 240,
  },
};

/**
 * Validate trading signal
 */
export function validateTradingSignal(
  signal: TradingSignal,
  constraints: SignalValidationConstraints = DEFAULT_VALIDATION_CONSTRAINTS
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Validate required fields
  if (!signal.id || signal.id.trim() === '') {
    errors.push({
      field: 'id',
      code: 'MISSING_ID',
      message: 'Signal ID is required',
      severity: 'critical',
      suggested_fix: 'Generate a unique signal ID',
    });
  }
  
  if (!signal.timestamp) {
    errors.push({
      field: 'timestamp',
      code: 'MISSING_TIMESTAMP',
      message: 'Signal timestamp is required',
      severity: 'critical',
      suggested_fix: 'Set timestamp to current ISO string',
    });
  }
  
  // Validate signal type
  if (!['long', 'short'].includes(signal.type)) {
    errors.push({
      field: 'type',
      code: 'INVALID_TYPE',
      message: 'Signal type must be "long" or "short"',
      severity: 'critical',
      suggested_fix: 'Set type to "long" or "short"',
    });
  }
  
  // Validate price
  if (signal.price <= constraints.price.min || signal.price >= constraints.price.max) {
    errors.push({
      field: 'price',
      code: 'PRICE_OUT_OF_RANGE',
      message: `Price must be between ${constraints.price.min} and ${constraints.price.max}`,
      severity: 'high',
      suggested_fix: 'Check price data source',
    });
  }
  
  // Validate confidence
  if (signal.confidence < constraints.confidence.min || signal.confidence > constraints.confidence.max) {
    errors.push({
      field: 'confidence',
      code: 'CONFIDENCE_OUT_OF_RANGE',
      message: `Confidence must be between ${constraints.confidence.min} and ${constraints.confidence.max}`,
      severity: 'high',
      suggested_fix: 'Recalculate confidence score',
    });
  }
  
  if (signal.confidence < constraints.confidence.recommended_min) {
    warnings.push({
      field: 'confidence',
      code: 'LOW_CONFIDENCE',
      message: `Confidence ${signal.confidence}% is below recommended minimum ${constraints.confidence.recommended_min}%`,
      type: 'performance',
    });
  }
  
  // Validate position size
  if (signal.risk.position_size < constraints.position_size.min) {
    errors.push({
      field: 'risk.position_size',
      code: 'POSITION_SIZE_TOO_SMALL',
      message: `Position size must be at least ${constraints.position_size.min} ADA`,
      severity: 'high',
      suggested_fix: 'Increase position size to meet minimum requirements',
    });
  }
  
  if (signal.risk.position_size > constraints.position_size.max) {
    errors.push({
      field: 'risk.position_size',
      code: 'POSITION_SIZE_TOO_LARGE',
      message: `Position size exceeds maximum ${constraints.position_size.max} ADA`,
      severity: 'medium',
      suggested_fix: 'Reduce position size or split into multiple signals',
    });
  }
  
  if (signal.risk.position_size > constraints.position_size.recommended_max) {
    warnings.push({
      field: 'risk.position_size',
      code: 'LARGE_POSITION_SIZE',
      message: `Position size ${signal.risk.position_size} ADA exceeds recommended maximum ${constraints.position_size.recommended_max} ADA`,
      type: 'risk',
    });
  }
  
  // Validate risk parameters
  const stopLossPct = Math.abs((signal.risk.stop_loss - signal.price) / signal.price * 100);
  const takeProfitPct = Math.abs((signal.risk.take_profit - signal.price) / signal.price * 100);
  const riskRewardRatio = takeProfitPct / stopLossPct;
  
  if (stopLossPct > constraints.risk.max_stop_loss_pct) {
    warnings.push({
      field: 'risk.stop_loss',
      code: 'HIGH_STOP_LOSS',
      message: `Stop loss ${stopLossPct.toFixed(1)}% exceeds recommended maximum ${constraints.risk.max_stop_loss_pct}%`,
      type: 'risk',
    });
  }
  
  if (takeProfitPct > constraints.risk.max_take_profit_pct) {
    warnings.push({
      field: 'risk.take_profit',
      code: 'HIGH_TAKE_PROFIT',
      message: `Take profit ${takeProfitPct.toFixed(1)}% exceeds recommended maximum ${constraints.risk.max_take_profit_pct}%`,
      type: 'risk',
    });
  }
  
  if (riskRewardRatio < constraints.risk.min_risk_reward_ratio) {
    warnings.push({
      field: 'risk',
      code: 'LOW_RISK_REWARD_RATIO',
      message: `Risk/reward ratio ${riskRewardRatio.toFixed(2)} is below recommended minimum ${constraints.risk.min_risk_reward_ratio}`,
      type: 'risk',
    });
  }
  
  // Validate timestamps
  const signalAge = Date.now() - new Date(signal.timestamp).getTime();
  const signalAgeMinutes = signalAge / (1000 * 60);
  
  if (signalAgeMinutes > constraints.time.max_signal_age_minutes) {
    warnings.push({
      field: 'timestamp',
      code: 'OLD_SIGNAL',
      message: `Signal is ${signalAgeMinutes.toFixed(0)} minutes old, exceeding maximum age ${constraints.time.max_signal_age_minutes} minutes`,
      type: 'performance',
    });
  }
  
  const expiryTime = new Date(signal.expires_at).getTime() - Date.now();
  const expiryMinutes = expiryTime / (1000 * 60);
  
  if (expiryMinutes < constraints.time.min_expiry_minutes) {
    errors.push({
      field: 'expires_at',
      code: 'EXPIRY_TOO_SOON',
      message: `Signal expires in ${expiryMinutes.toFixed(0)} minutes, minimum is ${constraints.time.min_expiry_minutes} minutes`,
      severity: 'high',
      suggested_fix: 'Extend expiry time',
    });
  }
  
  if (expiryMinutes > constraints.time.max_expiry_minutes) {
    warnings.push({
      field: 'expires_at',
      code: 'LONG_EXPIRY',
      message: `Signal expires in ${expiryMinutes.toFixed(0)} minutes, exceeding recommended maximum ${constraints.time.max_expiry_minutes} minutes`,
      type: 'best_practice',
    });
  }
  
  // Validate algorithm metadata
  if (!signal.algorithm.algorithm_name || signal.algorithm.algorithm_name.trim() === '') {
    errors.push({
      field: 'algorithm.algorithm_name',
      code: 'MISSING_ALGORITHM_NAME',
      message: 'Algorithm name is required',
      severity: 'medium',
      suggested_fix: 'Set algorithm name',
    });
  }
  
  if (signal.algorithm.historical_win_rate < 50) {
    warnings.push({
      field: 'algorithm.historical_win_rate',
      code: 'LOW_WIN_RATE',
      message: `Algorithm win rate ${signal.algorithm.historical_win_rate}% is below 50%`,
      type: 'performance',
    });
  }
  
  // Calculate validation score
  const maxScore = 100;
  const errorPenalty = errors.reduce((sum, error) => {
    switch (error.severity) {
      case 'critical': return sum + 25;
      case 'high': return sum + 15;
      case 'medium': return sum + 10;
      case 'low': return sum + 5;
      default: return sum;
    }
  }, 0);
  
  const warningPenalty = warnings.length * 2;
  const score = Math.max(0, maxScore - errorPenalty - warningPenalty);
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    score,
  };
}

/**
 * Validate Strike Finance trade request
 */
export function validateStrikeFinanceRequest(
  request: StrikeFinanceTradeRequest
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Validate wallet address
  if (!request.wallet_address || !request.wallet_address.startsWith('addr1')) {
    errors.push({
      field: 'wallet_address',
      code: 'INVALID_WALLET_ADDRESS',
      message: 'Valid Cardano wallet address is required',
      severity: 'critical',
      suggested_fix: 'Provide valid bech32 Cardano address',
    });
  }
  
  // Validate trade side
  if (!['long', 'short'].includes(request.side)) {
    errors.push({
      field: 'side',
      code: 'INVALID_SIDE',
      message: 'Trade side must be "long" or "short"',
      severity: 'critical',
      suggested_fix: 'Set side to "long" or "short"',
    });
  }
  
  // Validate amount
  if (request.amount < 40) {
    errors.push({
      field: 'amount',
      code: 'AMOUNT_TOO_SMALL',
      message: 'Trade amount must be at least 40 ADA for Strike Finance',
      severity: 'high',
      suggested_fix: 'Increase trade amount to minimum 40 ADA',
    });
  }
  
  if (request.amount > 1000) {
    warnings.push({
      field: 'amount',
      code: 'LARGE_AMOUNT',
      message: 'Trade amount exceeds 1000 ADA, consider risk management',
      type: 'risk',
    });
  }
  
  // Validate client request ID
  if (!request.client_request_id || request.client_request_id.trim() === '') {
    errors.push({
      field: 'client_request_id',
      code: 'MISSING_CLIENT_REQUEST_ID',
      message: 'Client request ID is required for tracking',
      severity: 'medium',
      suggested_fix: 'Generate unique client request ID',
    });
  }
  
  const score = Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5));
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    score,
  };
}

/**
 * Sanitize signal data
 */
export function sanitizeSignal(signal: Partial<TradingSignal>): Partial<TradingSignal> {
  return {
    ...signal,
    id: signal.id?.trim(),
    timestamp: signal.timestamp || new Date().toISOString(),
    price: signal.price ? Number(signal.price.toFixed(4)) : signal.price,
    confidence: signal.confidence ? Math.round(Math.max(0, Math.min(100, signal.confidence))) : signal.confidence,
    reasoning: signal.reasoning?.trim(),
    expires_at: signal.expires_at || new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour default
  };
}

/**
 * Check if signal is executable
 */
export function isSignalExecutable(signal: TradingSignal): boolean {
  const validation = validateTradingSignal(signal);
  const now = new Date();
  const expiryTime = new Date(signal.expires_at);
  
  return (
    validation.valid &&
    signal.status === 'pending' &&
    expiryTime > now &&
    signal.confidence >= 70 &&
    signal.risk.position_size >= 40
  );
}

/**
 * Get validation summary
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid) {
    return `✅ Valid (Score: ${result.score}/100)`;
  }
  
  const criticalErrors = result.errors.filter(e => e.severity === 'critical').length;
  const highErrors = result.errors.filter(e => e.severity === 'high').length;
  const warnings = result.warnings.length;
  
  let summary = '❌ Invalid';
  if (criticalErrors > 0) summary += ` (${criticalErrors} critical errors)`;
  if (highErrors > 0) summary += ` (${highErrors} high errors)`;
  if (warnings > 0) summary += ` (${warnings} warnings)`;
  
  return `${summary} (Score: ${result.score}/100)`;
}