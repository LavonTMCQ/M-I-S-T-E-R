import { OHLVC, Order, Position } from './data-structures.js';

/**
 * Strategy Interface and Base Classes for Stock Backtesting System
 * 
 * This module implements the strategy layer from stockbacktestdesign.txt,
 * providing a standardized interface for trading strategies with:
 * - Event-driven architecture pattern
 * - Configurable parameters with validation
 * - Signal generation methods
 * - Risk management integration
 * - Performance tracking capabilities
 */

// Core strategy interfaces
export interface StrategyParameters {
  [key: string]: number | string | boolean;
}

export interface StrategySignal {
  type: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE';
  strength: 'WEAK' | 'MEDIUM' | 'STRONG';
  price?: number;
  quantity?: number;
  stopLoss?: number;
  takeProfit?: number;
  reason: string;
  confidence: number; // 0-1
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface StrategyState {
  currentPosition?: Position;
  pendingOrders: Order[];
  lastSignal?: StrategySignal;
  sessionData: Record<string, any>;
  indicators: Record<string, number[]>;
  performance: {
    totalTrades: number;
    winningTrades: number;
    currentDrawdown: number;
    maxDrawdown: number;
  };
}

export interface StrategyContext {
  currentBar: OHLVC;
  previousBars: OHLVC[];
  marketHours: {
    isOpen: boolean;
    isPreMarket: boolean;
    isAfterHours: boolean;
    timeToClose: number; // minutes
  };
  portfolio: {
    cash: number;
    positions: Position[];
    totalValue: number;
  };
  riskLimits: {
    maxPositionSize: number;
    maxDailyLoss: number;
    maxDrawdown: number;
  };
}

// Main Strategy Interface
export interface IStrategy {
  readonly name: string;
  readonly description: string;
  readonly category: 'day-trading' | 'swing-trading' | 'position-trading';
  readonly parameters: StrategyParameters;
  readonly requiredHistory: number; // Number of bars needed for analysis
  
  // Core strategy methods
  initialize(initialCapital: number): Promise<void>;
  onBar(context: StrategyContext, state: StrategyState): Promise<StrategySignal>;
  onOrderFilled(order: Order, state: StrategyState): Promise<void>;
  onSessionEnd(state: StrategyState): Promise<StrategySignal[]>;
  validateParameters(): { valid: boolean; errors: string[] };
  
  // Risk management
  calculatePositionSize(signal: StrategySignal, context: StrategyContext): number;
  shouldExit(context: StrategyContext, state: StrategyState): StrategySignal | null;
  
  // Utility methods
  getRequiredIndicators(): string[];
  clone(): IStrategy;
  toJSON(): object;
}

// Abstract base strategy class
export abstract class BaseStrategy implements IStrategy {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: 'day-trading' | 'swing-trading' | 'position-trading';
  abstract readonly parameters: StrategyParameters;
  abstract readonly requiredHistory: number;

  protected initialized = false;
  protected initialCapital = 0;

  async initialize(initialCapital: number): Promise<void> {
    this.initialCapital = initialCapital;
    this.initialized = true;
    console.log(`✅ Strategy ${this.name} initialized with $${initialCapital.toLocaleString()}`);
  }

  abstract onBar(context: StrategyContext, state: StrategyState): Promise<StrategySignal>;

  async onOrderFilled(order: Order, _state: StrategyState): Promise<void> {
    // Default implementation - can be overridden
    console.log(`📋 Order filled: ${order.side} ${order.quantity} @ $${order.filledPrice}`);
  }

  async onSessionEnd(state: StrategyState): Promise<StrategySignal[]> {
    // Default implementation - close all positions for day trading
    const signals: StrategySignal[] = [];
    
    if (state.currentPosition && this.category === 'day-trading') {
      signals.push({
        type: 'CLOSE',
        strength: 'STRONG',
        reason: 'End of trading session - day trading strategy',
        confidence: 1.0,
        timestamp: new Date()
      });
    }
    
    return signals;
  }

  validateParameters(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic validation - can be overridden for specific parameter checks
    for (const [key, value] of Object.entries(this.parameters)) {
      if (value === null || value === undefined) {
        errors.push(`Parameter ${key} is required`);
      }
      if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        errors.push(`Parameter ${key} must be a valid number`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  calculatePositionSize(signal: StrategySignal, context: StrategyContext): number {
    // Conservative position sizing to ensure sufficient cash
    const accountValue = context.portfolio.totalValue;
    const availableCash = context.portfolio.cash;
    const price = signal.price || 0;

    if (price <= 0) return 0;

    // Use 10% of available cash for position (conservative approach)
    const maxPositionValue = Math.min(
      availableCash * 0.10,  // 10% of cash
      accountValue * 0.25    // or 25% of total portfolio value
    );

    // Calculate max shares we can afford including commission buffer
    const commission = 1.0; // $1 commission
    const maxShares = Math.floor((maxPositionValue - commission) / price);

    // Risk-based sizing if stop loss is provided
    if (signal.stopLoss && signal.price) {
      const riskPerShare = Math.abs(signal.price - signal.stopLoss);
      if (riskPerShare > 0) {
        // Risk 1% of account value per trade
        const riskAmount = accountValue * 0.01;
        const riskBasedShares = Math.floor(riskAmount / riskPerShare);

        // Use the smaller of risk-based or cash-based sizing
        return Math.min(maxShares, riskBasedShares);
      }
    }

    return Math.max(1, maxShares); // Ensure at least 1 share if we can afford it
  }

  shouldExit(context: StrategyContext, state: StrategyState): StrategySignal | null {
    // Default exit logic - stop loss and take profit
    if (!state.currentPosition) return null;

    const currentPrice = context.currentBar.close;
    const position = state.currentPosition;

    // Calculate unrealized P/L percentage
    const entryPrice = position.entryPrice;
    const pnlPercent = position.side === 'LONG'
      ? (currentPrice - entryPrice) / entryPrice
      : (entryPrice - currentPrice) / entryPrice;

    // Use strategy-specific stop loss if available, otherwise default to 2%
    const stopLossPercent = (this.parameters as any).stopLossPercent || 0.02;
    if (pnlPercent < -stopLossPercent) {
      return {
        type: 'CLOSE',
        strength: 'STRONG',
        reason: 'Stop loss triggered',
        confidence: 1.0,
        timestamp: new Date()
      };
    }

    // Use strategy-specific take profit if available, otherwise default to 4%
    const takeProfitPercent = (this.parameters as any).takeProfitPercent || 0.04;
    if (pnlPercent > takeProfitPercent) {
      return {
        type: 'CLOSE',
        strength: 'STRONG',
        reason: 'Take profit triggered',
        confidence: 1.0,
        timestamp: new Date()
      };
    }

    return null;
  }

  getRequiredIndicators(): string[] {
    return []; // Override in specific strategies
  }

  abstract clone(): IStrategy;

  toJSON(): object {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      parameters: this.parameters,
      requiredHistory: this.requiredHistory
    };
  }

  // Utility methods for technical analysis
  protected calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  protected calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    ema[0] = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    return ema;
  }

  protected calculateRSI(prices: number[], period: number = 14): number[] {
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const avgGains = this.calculateSMA(gains, period);
    const avgLosses = this.calculateSMA(losses, period);
    
    return avgGains.map((gain, i) => {
      const rs = gain / avgLosses[i];
      return 100 - (100 / (1 + rs));
    });
  }

  protected isMarketOpen(context: StrategyContext): boolean {
    return context.marketHours.isOpen;
  }

  protected getTimeToClose(context: StrategyContext): number {
    return context.marketHours.timeToClose;
  }

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Strategy ${this.name} must be initialized before use`);
    }
  }
}

// Strategy factory for creating strategy instances
export class StrategyFactory {
  private static strategies = new Map<string, () => IStrategy>();

  static register(name: string, factory: () => IStrategy): void {
    this.strategies.set(name, factory);
  }

  static create(name: string): IStrategy | null {
    const factory = this.strategies.get(name);
    return factory ? factory() : null;
  }

  static getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  static createFromJSON(json: any): IStrategy | null {
    const strategy = this.create(json.name);
    if (strategy && json.parameters) {
      // Apply parameters from JSON
      Object.assign((strategy as any).parameters, json.parameters);
    }
    return strategy;
  }
}

// Strategy validation utilities
export class StrategyValidator {
  static validateSignal(signal: StrategySignal): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!['BUY', 'SELL', 'HOLD', 'CLOSE'].includes(signal.type)) {
      errors.push('Invalid signal type');
    }

    if (!['WEAK', 'MEDIUM', 'STRONG'].includes(signal.strength)) {
      errors.push('Invalid signal strength');
    }

    if (signal.confidence < 0 || signal.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }

    if (!signal.reason || signal.reason.trim().length === 0) {
      errors.push('Signal reason is required');
    }

    if (signal.price !== undefined && (signal.price <= 0 || !isFinite(signal.price))) {
      errors.push('Signal price must be positive and finite');
    }

    if (signal.quantity !== undefined && (signal.quantity <= 0 || !Number.isInteger(signal.quantity))) {
      errors.push('Signal quantity must be positive integer');
    }

    return { valid: errors.length === 0, errors };
  }

  static validateParameters(parameters: StrategyParameters, schema: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, rules] of Object.entries(schema)) {
      const value = parameters[key];

      if (rules.required && (value === undefined || value === null)) {
        errors.push(`Parameter ${key} is required`);
        continue;
      }

      if (value !== undefined) {
        if (rules.type && typeof value !== rules.type) {
          errors.push(`Parameter ${key} must be of type ${rules.type}`);
        }

        if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
          errors.push(`Parameter ${key} must be >= ${rules.min}`);
        }

        if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
          errors.push(`Parameter ${key} must be <= ${rules.max}`);
        }

        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`Parameter ${key} must be one of: ${rules.enum.join(', ')}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// Export common strategy utilities
export const StrategyUtils = {
  calculateATR: (highs: number[], lows: number[], closes: number[], period: number = 14): number[] => {
    const trueRanges: number[] = [];

    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    // Calculate simple moving average of true ranges
    const atr: number[] = [];
    for (let i = period - 1; i < trueRanges.length; i++) {
      const sum = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      atr.push(sum / period);
    }

    return atr;
  },

  findHighestHigh: (highs: number[], startIndex: number, endIndex: number): number => {
    return Math.max(...highs.slice(startIndex, endIndex + 1));
  },

  findLowestLow: (lows: number[], startIndex: number, endIndex: number): number => {
    return Math.min(...lows.slice(startIndex, endIndex + 1));
  },

  isTimeInRange: (timestamp: Date, startTime: string, endTime: string): boolean => {
    const timeStr = timestamp.toTimeString().substring(0, 5); // "HH:MM"
    return timeStr >= startTime && timeStr <= endTime;
  }
};