/**
 * Signal Conversion Utilities
 * 
 * Utilities for converting between different signal formats:
 * - Railway API responses to TypeScript interfaces
 * - TypeScript signals to Strike Finance format
 * - Signal validation and sanitization
 */

import { 
  TradingSignal, 
  SignalType, 
  TradingPattern,
  TechnicalIndicators,
  RiskParameters,
  AlgorithmMetadata,
  StrikeFinanceTradeRequest,
  signalToStrikeFinanceRequest,
  validateTradingSignal,
  sanitizeSignal,
  ValidationResult
} from '@/types/signals';

/**
 * Railway API response structure (matches ada-custom-algorithm-tool.ts)
 */
export interface RailwayApiSignalData {
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  current_price: number;
  reasoning: string;
  indicators: {
    rsi: number;
    bb_position?: number;
    volume_ratio?: number;
    bollinger_upper?: number;
    bollinger_lower?: number;
    volume_sma?: number;
  };
  pattern?: string;
  stop_loss?: number;
  take_profit?: number;
  timestamp: string;
}

/**
 * Signal conversion configuration
 */
export interface SignalConversionConfig {
  /** Default position size in ADA */
  default_position_size: number;
  
  /** Default stop loss percentage */
  default_stop_loss_pct: number;
  
  /** Default take profit percentage */
  default_take_profit_pct: number;
  
  /** Maximum position size */
  max_position_size: number;
  
  /** Signal expiry time in minutes */
  signal_expiry_minutes: number;
  
  /** Algorithm metadata */
  algorithm_metadata: Partial<AlgorithmMetadata>;
}

/**
 * Default conversion configuration
 */
const DEFAULT_CONVERSION_CONFIG: SignalConversionConfig = {
  default_position_size: 50,
  default_stop_loss_pct: 5,
  default_take_profit_pct: 10,
  max_position_size: 200,
  signal_expiry_minutes: 60,
  algorithm_metadata: {
    algorithm_name: 'ADA Custom Algorithm',
    version: '1.0.0',
    timeframe: '15m',
    historical_win_rate: 62.5,
  },
};

/**
 * Signal Converter Class
 */
export class SignalConverter {
  private config: SignalConversionConfig;

  constructor(config: Partial<SignalConversionConfig> = {}) {
    this.config = { ...DEFAULT_CONVERSION_CONFIG, ...config };
  }

  /**
   * Convert Railway API data to TradingSignal
   */
  public convertRailwayToSignal(
    railwayData: RailwayApiSignalData,
    signalId?: string
  ): TradingSignal | null {
    // Skip HOLD signals
    if (railwayData.signal === 'HOLD') {
      console.log('📊 Railway API returned HOLD - no signal generated');
      return null;
    }

    // Determine signal type
    const signalType: SignalType = railwayData.signal === 'BUY' ? 'long' : 'short';

    // Extract and validate indicators
    const indicators = this.extractTechnicalIndicators(railwayData);
    
    // Determine trading pattern
    const pattern = this.determineTradingPattern(indicators, signalType, railwayData.pattern);
    
    // Calculate risk parameters
    const riskParams = this.calculateRiskParameters(
      railwayData.current_price,
      signalType,
      railwayData.confidence,
      railwayData.stop_loss,
      railwayData.take_profit
    );

    // Create algorithm metadata
    const algorithmMetadata: AlgorithmMetadata = {
      ...this.config.algorithm_metadata,
      pattern_performance: {
        win_rate: this.getPatternWinRate(pattern),
        total_trades: 100,
        avg_return: 0.08,
      },
    } as AlgorithmMetadata;

    // Generate signal ID if not provided
    const id = signalId || this.generateSignalId();

    // Create the trading signal
    const signal: TradingSignal = {
      id,
      timestamp: railwayData.timestamp || new Date().toISOString(),
      type: signalType,
      price: railwayData.current_price,
      confidence: railwayData.confidence,
      pattern,
      reasoning: railwayData.reasoning || this.generateReasoning(indicators, signalType, pattern),
      indicators,
      risk: riskParams,
      algorithm: algorithmMetadata,
      status: 'pending',
      expires_at: new Date(Date.now() + this.config.signal_expiry_minutes * 60 * 1000).toISOString(),
    };

    // Sanitize and return
    return sanitizeSignal(signal) as TradingSignal;
  }

  /**
   * Convert TradingSignal to Strike Finance format
   */
  public convertSignalToStrikeFinance(
    signal: TradingSignal,
    walletAddress: string,
    clientRequestId?: string
  ): StrikeFinanceTradeRequest {
    const requestId = clientRequestId || this.generateRequestId();
    return signalToStrikeFinanceRequest(signal, walletAddress, requestId);
  }

  /**
   * Validate and convert signal with comprehensive error handling
   */
  public validateAndConvertSignal(
    railwayData: RailwayApiSignalData,
    signalId?: string
  ): { signal: TradingSignal | null; validation: ValidationResult; errors: string[] } {
    const errors: string[] = [];

    try {
      // Convert to signal
      const signal = this.convertRailwayToSignal(railwayData, signalId);
      
      if (!signal) {
        return {
          signal: null,
          validation: {
            valid: false,
            errors: [{ field: 'signal', code: 'NO_SIGNAL', message: 'No tradeable signal generated', severity: 'high', suggested_fix: 'Wait for BUY/SELL signal' }],
            warnings: [],
            score: 0,
          },
          errors: ['No tradeable signal generated from Railway API'],
        };
      }

      // Validate signal
      const validation = validateTradingSignal(signal);

      // Add any conversion-specific warnings
      if (railwayData.confidence < 70) {
        validation.warnings.push({
          field: 'confidence',
          code: 'LOW_CONFIDENCE',
          message: `Signal confidence ${railwayData.confidence}% is below recommended 70%`,
          type: 'performance',
        });
      }

      if (!railwayData.indicators.bb_position) {
        validation.warnings.push({
          field: 'indicators.bb_position',
          code: 'MISSING_BB_POSITION',
          message: 'Bollinger Band position not provided by Railway API',
          type: 'compatibility',
        });
      }

      return {
        signal: validation.valid ? signal : null,
        validation,
        errors,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
      errors.push(errorMessage);

      return {
        signal: null,
        validation: {
          valid: false,
          errors: [{ field: 'conversion', code: 'CONVERSION_ERROR', message: errorMessage, severity: 'critical', suggested_fix: 'Check Railway API response format' }],
          warnings: [],
          score: 0,
        },
        errors,
      };
    }
  }

  /**
   * Extract technical indicators from Railway data
   */
  private extractTechnicalIndicators(railwayData: RailwayApiSignalData): TechnicalIndicators {
    return {
      rsi: railwayData.indicators.rsi || 50,
      bb_position: railwayData.indicators.bb_position || this.calculateBBPosition(
        railwayData.current_price,
        railwayData.indicators.bollinger_upper,
        railwayData.indicators.bollinger_lower
      ),
      volume_ratio: railwayData.indicators.volume_ratio || 1.0,
      price: railwayData.current_price,
      bb_upper: railwayData.indicators.bollinger_upper,
      bb_lower: railwayData.indicators.bollinger_lower,
      volume_sma: railwayData.indicators.volume_sma,
    };
  }

  /**
   * Calculate Bollinger Band position if not provided
   */
  private calculateBBPosition(price: number, bbUpper?: number, bbLower?: number): number {
    if (!bbUpper || !bbLower) {
      return 0.5; // Default to middle
    }

    const position = (price - bbLower) / (bbUpper - bbLower);
    return Math.max(0, Math.min(1, position));
  }

  /**
   * Determine trading pattern based on indicators
   */
  private determineTradingPattern(
    indicators: TechnicalIndicators,
    signalType: SignalType,
    patternHint?: string
  ): TradingPattern {
    // Use pattern hint if provided
    if (patternHint) {
      const normalizedPattern = patternHint.toLowerCase().replace(/[^a-z_]/g, '');
      switch (normalizedPattern) {
        case 'rsi_oversold_bb_bounce':
          return 'RSI_Oversold_BB_Bounce';
        case 'rsi_overbought_bb_rejection':
          return 'RSI_Overbought_BB_Rejection';
        case 'volume_spike_reversal':
          return 'Volume_Spike_Reversal';
        case 'multi_indicator_confluence':
          return 'Multi_Indicator_Confluence';
      }
    }

    // Determine pattern based on indicators
    const { rsi, bb_position, volume_ratio } = indicators;

    // RSI Oversold + BB Bounce (Long signals)
    if (signalType === 'long' && rsi < 35 && bb_position < 0.2) {
      return 'RSI_Oversold_BB_Bounce';
    }

    // RSI Overbought + BB Rejection (Short signals)
    if (signalType === 'short' && rsi > 65 && bb_position > 0.8) {
      return 'RSI_Overbought_BB_Rejection';
    }

    // Volume Spike Reversal
    if (volume_ratio > 1.5) {
      return 'Volume_Spike_Reversal';
    }

    // Default to multi-indicator confluence
    return 'Multi_Indicator_Confluence';
  }

  /**
   * Calculate risk parameters
   */
  private calculateRiskParameters(
    price: number,
    signalType: SignalType,
    confidence: number,
    providedStopLoss?: number,
    providedTakeProfit?: number
  ): RiskParameters {
    // Dynamic position sizing based on confidence
    const confidenceMultiplier = Math.max(0.8, Math.min(1.5, confidence / 75));
    const positionSize = Math.min(
      Math.round(this.config.default_position_size * confidenceMultiplier),
      this.config.max_position_size
    );

    // Use provided levels or calculate defaults
    let stopLoss: number;
    let takeProfit: number;
    let stopLossPct: number;
    let takeProfitPct: number;

    if (providedStopLoss && providedTakeProfit) {
      // Use provided levels
      stopLoss = providedStopLoss;
      takeProfit = providedTakeProfit;
      
      if (signalType === 'long') {
        stopLossPct = ((price - stopLoss) / price) * 100;
        takeProfitPct = ((takeProfit - price) / price) * 100;
      } else {
        stopLossPct = ((stopLoss - price) / price) * 100;
        takeProfitPct = ((price - takeProfit) / price) * 100;
      }
    } else {
      // Calculate default levels
      const baseStopLossPct = this.config.default_stop_loss_pct / 100;
      const baseTakeProfitPct = this.config.default_take_profit_pct / 100;
      
      // Adjust based on confidence
      const stopLossMultiplier = Math.max(0.7, Math.min(1.3, 1 - (confidence - 70) / 100));
      const takeProfitMultiplier = Math.max(0.8, Math.min(1.5, 1 + (confidence - 70) / 150));

      stopLossPct = (baseStopLossPct * stopLossMultiplier) * 100;
      takeProfitPct = (baseTakeProfitPct * takeProfitMultiplier) * 100;

      if (signalType === 'long') {
        stopLoss = price * (1 - stopLossPct / 100);
        takeProfit = price * (1 + takeProfitPct / 100);
      } else {
        stopLoss = price * (1 + stopLossPct / 100);
        takeProfit = price * (1 - takeProfitPct / 100);
      }
    }

    return {
      stop_loss: Number(stopLoss.toFixed(4)),
      take_profit: Number(takeProfit.toFixed(4)),
      stop_loss_pct: Number(stopLossPct.toFixed(2)),
      take_profit_pct: Number(takeProfitPct.toFixed(2)),
      position_size: positionSize,
      max_risk: Number((positionSize * (stopLossPct / 100)).toFixed(2)),
    };
  }

  /**
   * Get historical win rate for pattern
   */
  private getPatternWinRate(pattern: TradingPattern): number {
    const patternWinRates: Record<TradingPattern, number> = {
      'RSI_Oversold_BB_Bounce': 72.0,
      'RSI_Overbought_BB_Rejection': 78.3,
      'Volume_Spike_Reversal': 61.1,
      'Multi_Indicator_Confluence': 65.5,
      'Custom_Pattern': 62.5,
    };

    return patternWinRates[pattern] || 62.5;
  }

  /**
   * Generate reasoning text
   */
  private generateReasoning(
    indicators: TechnicalIndicators,
    signalType: SignalType,
    pattern: TradingPattern
  ): string {
    const rsi = indicators.rsi.toFixed(1);
    const bbPos = (indicators.bb_position * 100).toFixed(1);
    const volRatio = indicators.volume_ratio.toFixed(1);
    const direction = signalType === 'long' ? 'BULLISH' : 'BEARISH';

    const baseReasoning = `${direction} signal detected by ADA Custom Algorithm`;
    const technicalDetails = `RSI: ${rsi}, BB Position: ${bbPos}%, Volume: ${volRatio}x avg`;

    switch (pattern) {
      case 'RSI_Oversold_BB_Bounce':
        return `${baseReasoning} - RSI oversold bounce pattern (${technicalDetails})`;
      
      case 'RSI_Overbought_BB_Rejection':
        return `${baseReasoning} - RSI overbought rejection pattern (${technicalDetails})`;
      
      case 'Volume_Spike_Reversal':
        return `${baseReasoning} - Volume spike reversal pattern (${technicalDetails})`;
      
      case 'Multi_Indicator_Confluence':
        return `${baseReasoning} - Multi-indicator confluence (${technicalDetails})`;
      
      default:
        return `${baseReasoning} (${technicalDetails})`;
    }
  }

  /**
   * Generate unique signal ID
   */
  private generateSignalId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `ada_${timestamp}_${random}`;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `req_${timestamp}_${random}`;
  }
}

/**
 * Default signal converter instance
 */
export const defaultSignalConverter = new SignalConverter();

/**
 * Utility functions for quick conversions
 */

/**
 * Quick convert Railway data to signal
 */
export function convertRailwayToSignal(
  railwayData: RailwayApiSignalData,
  config?: Partial<SignalConversionConfig>
): TradingSignal | null {
  const converter = config ? new SignalConverter(config) : defaultSignalConverter;
  return converter.convertRailwayToSignal(railwayData);
}

/**
 * Quick validate and convert with error handling
 */
export function validateAndConvertRailwaySignal(
  railwayData: RailwayApiSignalData,
  config?: Partial<SignalConversionConfig>
): { signal: TradingSignal | null; validation: ValidationResult; errors: string[] } {
  const converter = config ? new SignalConverter(config) : defaultSignalConverter;
  return converter.validateAndConvertSignal(railwayData);
}

/**
 * Quick convert signal to Strike Finance format
 */
export function convertSignalForStrikeFinance(
  signal: TradingSignal,
  walletAddress: string,
  clientRequestId?: string
): StrikeFinanceTradeRequest {
  return defaultSignalConverter.convertSignalToStrikeFinance(signal, walletAddress, clientRequestId);
}