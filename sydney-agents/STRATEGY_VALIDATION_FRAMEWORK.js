#!/usr/bin/env node

/**
 * MANDATORY STRATEGY VALIDATION FRAMEWORK
 * 
 * This script MUST be run for every strategy implementation to ensure:
 * - Perfect synchronicity with existing strategies
 * - Tandem operation between backend and frontend
 * - Bulletproof chart rendering with trade signals
 * - Complete performance metrics accuracy
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// MANDATORY: Required fields for all strategies
const REQUIRED_API_FIELDS = [
  'success', 'strategy', 'symbol', 'timeframe', 'startDate', 'endDate',
  'totalNetPnl', 'winRate', 'maxDrawdown', 'sharpeRatio', 'totalTrades',
  'avgTradeDuration', 'trades', 'chartData', 'performance'
];

const REQUIRED_TRADE_FIELDS = [
  'id', 'entryTime', 'exitTime', 'side', 'entryPrice', 'exitPrice', 
  'size', 'netPnl', 'reason', 'duration'
];

const REQUIRED_CANDLE_FIELDS = [
  'time', 'open', 'high', 'low', 'close', 'volume'
];

const REQUIRED_PERFORMANCE_FIELDS = [
  'winningTrades', 'losingTrades', 'avgWin', 'avgLoss', 'profitFactor', 'totalReturn'
];

// MANDATORY: Performance benchmarks
const PERFORMANCE_BENCHMARKS = {
  minChartDataPoints: 100,
  maxApiResponseTime: 30000, // 30 seconds
  minWinRate: 0,
  maxWinRate: 100,
  minTrades: 0,
  maxDrawdown: 100
};

class StrategyValidator {
  constructor(strategyName, port = 3001) {
    this.strategyName = strategyName;
    this.apiUrl = `http://localhost:${port}/api/backtest/${strategyName}`;
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async validateApiEndpoint() {
    this.log(`Testing API endpoint: ${this.apiUrl}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'ADAUSD' })
      });
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate response time
      if (responseTime > PERFORMANCE_BENCHMARKS.maxApiResponseTime) {
        this.results.errors.push(`API response time too slow: ${responseTime}ms > ${PERFORMANCE_BENCHMARKS.maxApiResponseTime}ms`);
        this.results.failed++;
      } else {
        this.log(`API response time: ${responseTime}ms`, 'success');
        this.results.passed++;
      }

      return data;
    } catch (error) {
      this.log(`API endpoint test failed: ${error.message}`, 'error');
      this.results.errors.push(`API endpoint failure: ${error.message}`);
      this.results.failed++;
      throw error;
    }
  }

  validateDataStructure(data) {
    this.log('Validating data structure...');

    // Check required top-level fields
    const missingFields = REQUIRED_API_FIELDS.filter(field => !(field in data));
    if (missingFields.length > 0) {
      const error = `Missing required fields: ${missingFields.join(', ')}`;
      this.log(error, 'error');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    this.log('All required API fields present', 'success');
    this.results.passed++;
    return true;
  }

  validateChartData(data) {
    this.log('Validating chart data...');

    if (!Array.isArray(data.chartData)) {
      const error = 'Chart data is not an array';
      this.log(error, 'error');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    if (data.chartData.length < PERFORMANCE_BENCHMARKS.minChartDataPoints) {
      const error = `Insufficient chart data: ${data.chartData.length} < ${PERFORMANCE_BENCHMARKS.minChartDataPoints}`;
      this.log(error, 'error');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    // Validate candle structure
    if (data.chartData.length > 0) {
      const sampleCandle = data.chartData[0];
      const missingCandleFields = REQUIRED_CANDLE_FIELDS.filter(field => !(field in sampleCandle));
      if (missingCandleFields.length > 0) {
        const error = `Missing candle fields: ${missingCandleFields.join(', ')}`;
        this.log(error, 'error');
        this.results.errors.push(error);
        this.results.failed++;
        return false;
      }

      // Validate timestamp format
      const timestamp = new Date(sampleCandle.time);
      if (isNaN(timestamp.getTime())) {
        const error = 'Invalid timestamp format in chart data';
        this.log(error, 'error');
        this.results.errors.push(error);
        this.results.failed++;
        return false;
      }
    }

    this.log(`Chart data valid: ${data.chartData.length} candles`, 'success');
    this.results.passed++;
    return true;
  }

  validateTradesData(data) {
    this.log('Validating trades data...');

    if (!Array.isArray(data.trades)) {
      const error = 'Trades data is not an array';
      this.log(error, 'error');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    if (data.trades.length > 0) {
      const sampleTrade = data.trades[0];
      const missingTradeFields = REQUIRED_TRADE_FIELDS.filter(field => !(field in sampleTrade));
      if (missingTradeFields.length > 0) {
        const error = `Missing trade fields: ${missingTradeFields.join(', ')}`;
        this.log(error, 'error');
        this.results.errors.push(error);
        this.results.failed++;
        return false;
      }

      // Validate trade side
      if (!['LONG', 'SHORT'].includes(sampleTrade.side)) {
        const error = `Invalid trade side: ${sampleTrade.side}. Must be 'LONG' or 'SHORT'`;
        this.log(error, 'error');
        this.results.errors.push(error);
        this.results.failed++;
        return false;
      }

      // Validate timestamps
      const entryTime = new Date(sampleTrade.entryTime);
      const exitTime = new Date(sampleTrade.exitTime);
      if (isNaN(entryTime.getTime()) || isNaN(exitTime.getTime())) {
        const error = 'Invalid timestamp format in trades data';
        this.log(error, 'error');
        this.results.errors.push(error);
        this.results.failed++;
        return false;
      }

      if (exitTime <= entryTime) {
        const error = 'Exit time must be after entry time';
        this.log(error, 'error');
        this.results.errors.push(error);
        this.results.failed++;
        return false;
      }
    }

    this.log(`Trades data valid: ${data.trades.length} trades`, 'success');
    this.results.passed++;
    return true;
  }

  validatePerformanceMetrics(data) {
    this.log('Validating performance metrics...');

    // Check performance object exists
    if (!data.performance || typeof data.performance !== 'object') {
      const error = 'Performance metrics object missing or invalid';
      this.log(error, 'error');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    // Check required performance fields
    const missingPerfFields = REQUIRED_PERFORMANCE_FIELDS.filter(field => !(field in data.performance));
    if (missingPerfFields.length > 0) {
      const error = `Missing performance fields: ${missingPerfFields.join(', ')}`;
      this.log(error, 'error');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    // Validate win rate range
    if (data.winRate < PERFORMANCE_BENCHMARKS.minWinRate || data.winRate > PERFORMANCE_BENCHMARKS.maxWinRate) {
      const error = `Win rate out of range: ${data.winRate}% (must be 0-100%)`;
      this.log(error, 'error');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    // Validate total trades
    if (data.totalTrades < PERFORMANCE_BENCHMARKS.minTrades) {
      const error = `Total trades below minimum: ${data.totalTrades} < ${PERFORMANCE_BENCHMARKS.minTrades}`;
      this.log(error, 'error');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    // Validate max drawdown
    if (data.maxDrawdown > PERFORMANCE_BENCHMARKS.maxDrawdown) {
      const error = `Max drawdown too high: ${data.maxDrawdown}% > ${PERFORMANCE_BENCHMARKS.maxDrawdown}%`;
      this.log(error, 'error');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    // Validate numeric fields
    const numericFields = ['totalNetPnl', 'winRate', 'maxDrawdown', 'sharpeRatio', 'totalTrades', 'avgTradeDuration'];
    for (const field of numericFields) {
      if (typeof data[field] !== 'number' || isNaN(data[field])) {
        const error = `Invalid numeric value for ${field}: ${data[field]}`;
        this.log(error, 'error');
        this.results.errors.push(error);
        this.results.failed++;
        return false;
      }
    }

    this.log('Performance metrics valid', 'success');
    this.results.passed++;
    return true;
  }

  validateFrontendIntegration() {
    this.log('Validating frontend integration...');

    // Check if strategy exists in StrategySelector
    const selectorPath = 'mister-frontend/src/components/backtesting/StrategySelector.tsx';
    if (!fs.existsSync(selectorPath)) {
      const error = 'StrategySelector.tsx not found';
      this.log(error, 'error');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    const selectorContent = fs.readFileSync(selectorPath, 'utf8');
    if (!selectorContent.includes(this.strategyName)) {
      const error = `Strategy '${this.strategyName}' not found in StrategySelector`;
      this.log(error, 'warning');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    // Check if strategy handler exists in backtest-results page
    const backtestPath = 'mister-frontend/src/app/backtest-results/page.tsx';
    if (!fs.existsSync(backtestPath)) {
      const error = 'backtest-results page.tsx not found';
      this.log(error, 'error');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    const backtestContent = fs.readFileSync(backtestPath, 'utf8');
    if (!backtestContent.includes(this.strategyName)) {
      const error = `Strategy '${this.strategyName}' handler not found in backtest-results page`;
      this.log(error, 'warning');
      this.results.errors.push(error);
      this.results.failed++;
      return false;
    }

    this.log('Frontend integration valid', 'success');
    this.results.passed++;
    return true;
  }

  async runFullValidation() {
    this.log(`🧪 Starting full validation for strategy: ${this.strategyName}`);
    this.log('='.repeat(60));

    try {
      // 1. Test API endpoint
      const data = await this.validateApiEndpoint();

      // 2. Validate data structure
      this.validateDataStructure(data);

      // 3. Validate chart data
      this.validateChartData(data);

      // 4. Validate trades data
      this.validateTradesData(data);

      // 5. Validate performance metrics
      this.validatePerformanceMetrics(data);

      // 6. Validate frontend integration
      this.validateFrontendIntegration();

      // Generate report
      this.generateReport(data);

    } catch (error) {
      this.log(`Validation failed: ${error.message}`, 'error');
      this.results.failed++;
    }

    return this.results;
  }

  generateReport(data) {
    this.log('='.repeat(60));
    this.log('📊 VALIDATION REPORT');
    this.log('='.repeat(60));
    
    if (data) {
      this.log(`Strategy: ${data.strategy}`);
      this.log(`Symbol: ${data.symbol}`);
      this.log(`Timeframe: ${data.timeframe}`);
      this.log(`Period: ${data.startDate} to ${data.endDate}`);
      this.log(`Total Trades: ${data.totalTrades}`);
      this.log(`Win Rate: ${data.winRate.toFixed(1)}%`);
      this.log(`Total P&L: $${data.totalNetPnl.toFixed(2)}`);
      this.log(`Max Drawdown: ${data.maxDrawdown.toFixed(1)}%`);
      this.log(`Sharpe Ratio: ${data.sharpeRatio.toFixed(2)}`);
      this.log(`Chart Data Points: ${data.chartData.length}`);
      this.log(`Profit Factor: ${data.performance.profitFactor.toFixed(2)}`);
    }

    this.log('='.repeat(60));
    this.log(`✅ Tests Passed: ${this.results.passed}`);
    this.log(`❌ Tests Failed: ${this.results.failed}`);
    
    if (this.results.errors.length > 0) {
      this.log('🚨 ERRORS FOUND:');
      this.results.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error}`, 'error');
      });
    }

    const success = this.results.failed === 0;
    this.log('='.repeat(60));
    
    if (success) {
      this.log('🎯 VALIDATION PASSED - Strategy ready for deployment!', 'success');
    } else {
      this.log('🚨 VALIDATION FAILED - Fix errors before deployment!', 'error');
    }
    
    return success;
  }
}

// Main execution
async function main() {
  const strategyName = process.argv[2];
  
  if (!strategyName) {
    console.error('❌ Usage: node STRATEGY_VALIDATION_FRAMEWORK.js <strategy-name>');
    console.error('❌ Example: node STRATEGY_VALIDATION_FRAMEWORK.js fibonacci');
    process.exit(1);
  }

  const validator = new StrategyValidator(strategyName);
  const results = await validator.runFullValidation();
  
  process.exit(results.failed === 0 ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { StrategyValidator };
