/**
 * Strategy Registry and Exports
 * 
 * This module exports all available strategies and registers them
 * with the StrategyFactory for easy instantiation.
 */

import { StrategyFactory } from '../strategy-interface';
import { OpeningRangeBreakoutStrategy } from './opening-range-breakout';
import { OpeningRangeFadeStrategy } from './opening-range-fade';
import { MovingAverageCrossoverStrategy } from './moving-average-crossover';

// Register all strategies with the factory
StrategyFactory.register('Opening Range Breakout', () => new OpeningRangeBreakoutStrategy());
StrategyFactory.register('Opening Range Fade', () => new OpeningRangeFadeStrategy());
StrategyFactory.register('Moving Average Crossover', () => new MovingAverageCrossoverStrategy());

// Export strategies
export { OpeningRangeBreakoutStrategy } from './opening-range-breakout';
export { OpeningRangeFadeStrategy } from './opening-range-fade';
export { MovingAverageCrossoverStrategy } from './moving-average-crossover';

// Export factory for convenience
export { StrategyFactory } from '../strategy-interface';

// Strategy metadata for UI and documentation
export const AVAILABLE_STRATEGIES = [
  {
    name: 'Opening Range Breakout',
    description: 'Trades breakouts from the opening range with volume confirmation and ATR-based stops',
    category: 'day-trading',
    difficulty: 'Intermediate',
    timeframes: ['1min', '5min'],
    parameters: {
      rangePeriodMinutes: { default: 30, min: 5, max: 120, description: 'Opening range period in minutes' },
      breakoutThreshold: { default: 0.001, min: 0, max: 0.05, description: 'Minimum breakout percentage' },
      volumeMultiplier: { default: 1.5, min: 1.0, max: 5.0, description: 'Volume confirmation multiplier' },
      stopLossATRMultiplier: { default: 2.0, min: 0.5, max: 5.0, description: 'Stop loss as multiple of ATR' },
      takeProfitRatio: { default: 2.0, min: 1.0, max: 5.0, description: 'Take profit ratio vs stop loss' }
    }
  },
  {
    name: 'Opening Range Fade',
    description: 'Fades breakouts from the opening range - counter-trend strategy optimized for mean reversion',
    category: 'day-trading',
    difficulty: 'Advanced',
    timeframes: ['1min', '5min'],
    parameters: {
      rangePeriodMinutes: { default: 30, min: 5, max: 120, description: 'Opening range period in minutes' },
      fadeThreshold: { default: 0.002, min: 0, max: 0.05, description: 'Minimum breakout to fade percentage' },
      volumeMultiplier: { default: 1.2, min: 1.0, max: 5.0, description: 'Volume confirmation multiplier' },
      stopLossATRMultiplier: { default: 2.0, min: 0.5, max: 5.0, description: 'Stop loss as multiple of ATR (wider for counter-trend)' },
      takeProfitRatio: { default: 1.5, min: 1.0, max: 5.0, description: 'Take profit ratio vs stop loss (tighter for mean reversion)' }
    }
  },
  {
    name: 'Moving Average Crossover',
    description: 'Classic MA crossover strategy with trend confirmation and risk management',
    category: 'day-trading',
    difficulty: 'Beginner',
    timeframes: ['5min', '15min', '1h'],
    parameters: {
      fastPeriod: { default: 10, min: 2, max: 50, description: 'Fast moving average period' },
      slowPeriod: { default: 20, min: 5, max: 200, description: 'Slow moving average period' },
      maType: { default: 'EMA', options: ['SMA', 'EMA'], description: 'Moving average type' },
      stopLossPercent: { default: 0.02, min: 0.005, max: 0.1, description: 'Stop loss percentage' },
      takeProfitPercent: { default: 0.04, min: 0.01, max: 0.2, description: 'Take profit percentage' }
    }
  }
];

// Utility functions for strategy management
export const StrategyUtils = {
  /**
   * Get strategy by name
   */
  getStrategy: (name: string) => {
    return StrategyFactory.create(name);
  },

  /**
   * Get all available strategy names
   */
  getAvailableStrategies: () => {
    return StrategyFactory.getAvailableStrategies();
  },

  /**
   * Get strategy metadata
   */
  getStrategyMetadata: (name: string) => {
    return AVAILABLE_STRATEGIES.find(s => s.name === name);
  },

  /**
   * Validate strategy parameters
   */
  validateStrategyParameters: (strategyName: string, parameters: any) => {
    const strategy = StrategyFactory.create(strategyName);
    if (!strategy) {
      return { valid: false, errors: [`Strategy '${strategyName}' not found`] };
    }

    // Apply parameters
    Object.assign((strategy as any).parameters, parameters);
    
    return strategy.validateParameters();
  },

  /**
   * Create strategy with custom parameters
   */
  createStrategyWithParameters: (strategyName: string, parameters: any) => {
    const strategy = StrategyFactory.create(strategyName);
    if (!strategy) {
      throw new Error(`Strategy '${strategyName}' not found`);
    }

    // Validate parameters first
    const validation = StrategyUtils.validateStrategyParameters(strategyName, parameters);
    if (!validation.valid) {
      throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
    }

    // Apply parameters
    Object.assign((strategy as any).parameters, parameters);
    
    return strategy;
  }
};