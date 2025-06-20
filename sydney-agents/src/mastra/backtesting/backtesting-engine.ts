import { 
  OHLVC, 
  Order, 
  Position, 
  BacktestConfig, 
  TradeRecord, 
  BacktestResult,
  MarketHoursUtils,
  US_MARKET_HOURS
} from './data-structures.js';
import { 
  IStrategy, 
  StrategySignal, 
  StrategyContext, 
  StrategyState 
} from './strategy-interface.js';
import { backtestingKnowledgeStore } from './knowledge-store.js';
import { PerformanceAnalyzer } from './performance-analysis.js';

/**
 * Backtesting Engine Core
 * 
 * This module implements the main Backtester class with event-driven processing
 * as specified in stockbacktestdesign.txt. It provides:
 * - Event-driven bar-by-bar processing
 * - Realistic trade execution simulation with slippage and commission
 * - Market hours validation and trading session logic
 * - Pending order management and end-of-day position closing
 * - Integration with Alpha Vantage data and knowledge store systems
 */

export interface BacktestExecutionConfig extends BacktestConfig {
  strategy: IStrategy;
  data: OHLVC[];
  enableLogging: boolean;
  saveResults: boolean;
  validateTrades: boolean;
}

export interface BacktestProgress {
  currentBar: number;
  totalBars: number;
  currentDate: Date;
  currentPrice: number;
  portfolioValue: number;
  openPositions: number;
  totalTrades: number;
  unrealizedPL: number;
  realizedPL: number;
}

export class BacktestingEngine {
  private config!: BacktestExecutionConfig;
  private strategy!: IStrategy;
  private data: OHLVC[] = [];
  
  // Portfolio state
  private cash = 0;
  private positions: Position[] = [];
  private pendingOrders: Order[] = [];
  private trades: TradeRecord[] = [];
  
  // Strategy state
  private strategyState: StrategyState = {
    pendingOrders: [],
    sessionData: {},
    indicators: {},
    performance: {
      totalTrades: 0,
      winningTrades: 0,
      currentDrawdown: 0,
      maxDrawdown: 0
    }
  };

  // Execution tracking
  private currentBarIndex = 0;
  private portfolioValues: { timestamp: Date; value: number }[] = [];
  private highWaterMark = 0;
  private maxDrawdown = 0;

  // Event callbacks
  private onProgressCallback?: (progress: BacktestProgress) => void;
  private onTradeCallback?: (trade: TradeRecord) => void;
  private onSignalCallback?: (signal: StrategySignal) => void;

  constructor() {}

  /**
   * Initialize and run a backtest
   */
  async runBacktest(config: BacktestExecutionConfig): Promise<BacktestResult> {
    this.config = config;
    this.strategy = config.strategy;
    this.data = config.data;

    try {
      // Initialize backtest
      await this.initialize();

      // Validate configuration
      this.validateConfig();

      // Run the main event loop
      await this.executeEventLoop();

      // Generate and return results
      const results = await this.generateResults();

      // Save results if requested
      if (config.saveResults) {
        await this.saveResults(results);
      }

      return results;

    } catch (error) {
      console.error('❌ Backtest execution failed:', error);
      throw error;
    }
  }

  /**
   * Initialize the backtesting engine
   */
  private async initialize(): Promise<void> {
    console.log(`🚀 Initializing backtest for ${this.config.symbol} with ${this.strategy.name}`);

    // Initialize portfolio
    this.cash = this.config.initialCapital;
    this.positions = [];
    this.pendingOrders = [];
    this.trades = [];

    // Initialize strategy
    await this.strategy.initialize(this.config.initialCapital);

    // Initialize tracking
    this.currentBarIndex = 0;
    this.portfolioValues = [];
    this.highWaterMark = this.config.initialCapital;
    this.maxDrawdown = 0;

    // Reset strategy state
    this.strategyState = {
      pendingOrders: [],
      sessionData: {},
      indicators: {},
      performance: {
        totalTrades: 0,
        winningTrades: 0,
        currentDrawdown: 0,
        maxDrawdown: 0
      }
    };

    console.log(`✅ Backtest initialized with $${this.config.initialCapital.toLocaleString()} capital`);
  }

  /**
   * Main event-driven processing loop
   */
  private async executeEventLoop(): Promise<void> {
    console.log(`📊 Processing ${this.data.length} bars from ${this.data[0].timestamp.toDateString()} to ${this.data[this.data.length - 1].timestamp.toDateString()}`);

    for (this.currentBarIndex = 0; this.currentBarIndex < this.data.length; this.currentBarIndex++) {
      const currentBar = this.data[this.currentBarIndex];
      
      try {
        // Process the current bar
        await this.processBar(currentBar);

        // Update progress
        this.updateProgress(currentBar);

        // Check for session end
        if (this.isSessionEnd(currentBar)) {
          await this.handleSessionEnd();
        }

      } catch (error) {
        console.error(`❌ Error processing bar ${this.currentBarIndex}:`, error);
        if (this.config.validateTrades) {
          throw error;
        }
      }
    }

    console.log(`✅ Processed ${this.data.length} bars successfully`);
  }

  /**
   * Process a single bar (main event-driven logic)
   */
  private async processBar(currentBar: OHLVC): Promise<void> {
    // 1. Update market data and context
    const context = this.buildStrategyContext(currentBar);

    // 2. Process pending orders
    await this.processPendingOrders(currentBar);

    // 3. Update position values
    this.updatePositionValues(currentBar);

    // 4. Check market hours
    if (!this.isMarketHours(currentBar) && !this.config.allowExtendedHours) {
      return; // Skip processing during closed hours
    }

    // 5. Get strategy signal
    const signal = await this.strategy.onBar(context, this.strategyState);

    // 6. Validate and process signal
    if (this.isValidSignal(signal, context)) {
      await this.processSignal(signal, currentBar, context);
    }

    // 7. Update portfolio tracking
    this.updatePortfolioTracking(currentBar);

    // 8. Log progress if enabled
    if (this.config.enableLogging && this.currentBarIndex % 100 === 0) {
      this.logProgress(currentBar);
    }
  }

  /**
   * Build strategy context for current bar
   */
  private buildStrategyContext(currentBar: OHLVC): StrategyContext {
    const previousBars = this.data.slice(
      Math.max(0, this.currentBarIndex - this.strategy.requiredHistory),
      this.currentBarIndex
    );

    const portfolioValue = this.calculatePortfolioValue(currentBar);
    const timeToClose = this.getTimeToMarketClose(currentBar);

    return {
      currentBar,
      previousBars,
      marketHours: {
        isOpen: this.isMarketHours(currentBar),
        isPreMarket: this.isPreMarketHours(currentBar),
        isAfterHours: this.isAfterHours(currentBar),
        timeToClose
      },
      portfolio: {
        cash: this.cash,
        positions: [...this.positions],
        totalValue: portfolioValue
      },
      riskLimits: {
        maxPositionSize: this.config.maxPositionSize,
        maxDailyLoss: portfolioValue * 0.05, // 5% daily loss limit
        maxDrawdown: this.config.initialCapital * 0.2 // 20% max drawdown
      }
    };
  }

  /**
   * Process strategy signal
   */
  private async processSignal(signal: StrategySignal, currentBar: OHLVC, context: StrategyContext): Promise<void> {
    if (this.onSignalCallback) {
      this.onSignalCallback(signal);
    }

    switch (signal.type) {
      case 'BUY':
        await this.executeBuyOrder(signal, currentBar, context);
        break;
      case 'SELL':
        await this.executeSellOrder(signal, currentBar, context);
        break;
      case 'CLOSE':
        await this.closeAllPositions(currentBar, signal.reason);
        break;
      case 'HOLD':
        // No action needed
        break;
    }
  }

  /**
   * Execute buy order
   */
  private async executeBuyOrder(signal: StrategySignal, currentBar: OHLVC, context: StrategyContext): Promise<void> {
    // Calculate position size
    const quantity = signal.quantity || this.strategy.calculatePositionSize(signal, context);
    const price = signal.price || currentBar.close;
    
    // Apply slippage
    const executionPrice = this.applySlippage(price, 'BUY');
    
    // Calculate total cost including commission
    const totalCost = (executionPrice * quantity) + this.config.commission;

    // Check if we have enough cash
    if (totalCost > this.cash) {
      console.log(`⚠️ Insufficient cash for buy order: Need $${totalCost.toFixed(2)}, have $${this.cash.toFixed(2)}`);
      return;
    }

    // Execute the trade
    const trade = this.createTradeRecord('BUY', quantity, executionPrice, currentBar.timestamp, signal.reason);
    this.trades.push(trade);

    // Update cash and positions
    this.cash -= totalCost;
    
    const position: Position = {
      symbol: this.config.symbol,
      quantity,
      entryPrice: executionPrice,
      entryTime: currentBar.timestamp,
      currentPrice: executionPrice,
      unrealizedPL: 0,
      side: 'LONG'
    };

    this.positions.push(position);
    this.strategyState.currentPosition = position;

    // Notify strategy of order fill
    const order: Order = {
      id: trade.id,
      symbol: this.config.symbol,
      type: 'MARKET',
      side: 'BUY',
      quantity,
      timeInForce: 'DAY',
      status: 'FILLED',
      createdAt: currentBar.timestamp,
      filledAt: currentBar.timestamp,
      filledPrice: executionPrice
    };

    await this.strategy.onOrderFilled(order, this.strategyState);

    if (this.onTradeCallback) {
      this.onTradeCallback(trade);
    }

    console.log(`📈 BUY: ${quantity} shares @ $${executionPrice.toFixed(2)} (Total: $${totalCost.toFixed(2)})`);
  }

  /**
   * Execute sell order (close position)
   */
  private async executeSellOrder(signal: StrategySignal, currentBar: OHLVC, context: StrategyContext): Promise<void> {
    if (this.positions.length === 0) {
      console.log('⚠️ No positions to sell');
      return;
    }

    // For simplicity, close all long positions
    await this.closeAllPositions(currentBar, signal.reason);
  }

  /**
   * Close all positions
   */
  private async closeAllPositions(currentBar: OHLVC, reason: string): Promise<void> {
    for (const position of this.positions) {
      await this.closePosition(position, currentBar, reason);
    }
    
    this.positions = [];
    this.strategyState.currentPosition = undefined;
  }

  /**
   * Close a specific position
   */
  private async closePosition(position: Position, currentBar: OHLVC, reason: string): Promise<void> {
    const executionPrice = this.applySlippage(currentBar.close, 'SELL');
    const totalProceeds = (executionPrice * position.quantity) - this.config.commission;

    // Calculate P/L
    const pnl = (executionPrice - position.entryPrice) * position.quantity - (this.config.commission * 2);

    // Create trade record
    const trade = this.createTradeRecord('SELL', position.quantity, executionPrice, currentBar.timestamp, reason);
    trade.pnl = pnl;
    this.trades.push(trade);

    // Update cash
    this.cash += totalProceeds;

    // Update strategy performance
    this.strategyState.performance.totalTrades++;
    if (pnl > 0) {
      this.strategyState.performance.winningTrades++;
    }

    if (this.onTradeCallback) {
      this.onTradeCallback(trade);
    }

    console.log(`📉 SELL: ${position.quantity} shares @ $${executionPrice.toFixed(2)} (P/L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)})`);
  }

  /**
   * Apply slippage to execution price
   */
  private applySlippage(price: number, side: 'BUY' | 'SELL'): number {
    const slippageAmount = price * this.config.slippage;
    return side === 'BUY' ? price + slippageAmount : price - slippageAmount;
  }

  /**
   * Create trade record
   */
  private createTradeRecord(type: 'BUY' | 'SELL', quantity: number, price: number, timestamp: Date, reason: string): TradeRecord {
    return {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: this.config.symbol,
      type,
      quantity,
      price,
      timestamp,
      commission: this.config.commission,
      slippage: this.config.slippage,
      reason
    };
  }

  /**
   * Update position values with current market price
   */
  private updatePositionValues(currentBar: OHLVC): void {
    for (const position of this.positions) {
      position.currentPrice = currentBar.close;
      position.unrealizedPL = (currentBar.close - position.entryPrice) * position.quantity;
    }
  }

  /**
   * Calculate total portfolio value
   */
  private calculatePortfolioValue(currentBar: OHLVC): number {
    const positionValue = this.positions.reduce((total, position) => {
      return total + (position.quantity * currentBar.close);
    }, 0);

    return this.cash + positionValue;
  }

  /**
   * Update portfolio tracking and drawdown calculation
   */
  private updatePortfolioTracking(currentBar: OHLVC): void {
    const portfolioValue = this.calculatePortfolioValue(currentBar);
    
    this.portfolioValues.push({
      timestamp: currentBar.timestamp,
      value: portfolioValue
    });

    // Update high water mark and drawdown
    if (portfolioValue > this.highWaterMark) {
      this.highWaterMark = portfolioValue;
    }

    const currentDrawdown = (this.highWaterMark - portfolioValue) / this.highWaterMark;
    this.strategyState.performance.currentDrawdown = currentDrawdown;

    if (currentDrawdown > this.maxDrawdown) {
      this.maxDrawdown = currentDrawdown;
      this.strategyState.performance.maxDrawdown = currentDrawdown;
    }
  }

  /**
   * Market hours validation
   */
  private isMarketHours(bar: OHLVC): boolean {
    return MarketHoursUtils.isMarketHours(bar.timestamp, this.config.marketHours);
  }

  private isPreMarketHours(bar: OHLVC): boolean {
    const timeStr = bar.timestamp.toTimeString().substring(0, 5);
    return timeStr >= this.config.marketHours.preMarketStart && timeStr < this.config.marketHours.marketOpen;
  }

  private isAfterHours(bar: OHLVC): boolean {
    const timeStr = bar.timestamp.toTimeString().substring(0, 5);
    return timeStr > this.config.marketHours.marketClose && timeStr <= this.config.marketHours.afterHoursEnd;
  }

  private getTimeToMarketClose(bar: OHLVC): number {
    const nextClose = MarketHoursUtils.getNextMarketClose(bar.timestamp, this.config.marketHours);
    return Math.max(0, Math.floor((nextClose.getTime() - bar.timestamp.getTime()) / (60 * 1000)));
  }

  /**
   * Session management
   */
  private isSessionEnd(bar: OHLVC): boolean {
    // Check if this is the last bar of the trading day
    const nextBar = this.data[this.currentBarIndex + 1];
    if (!nextBar) return true;

    const currentDay = bar.timestamp.toDateString();
    const nextDay = nextBar.timestamp.toDateString();
    
    return currentDay !== nextDay;
  }

  private async handleSessionEnd(): Promise<void> {
    console.log('📅 End of trading session');
    
    // Get session end signals from strategy
    const sessionEndSignals = await this.strategy.onSessionEnd(this.strategyState);
    
    // Process any session end signals
    for (const signal of sessionEndSignals) {
      if (signal.type === 'CLOSE') {
        const currentBar = this.data[this.currentBarIndex];
        await this.closeAllPositions(currentBar, signal.reason);
      }
    }
  }

  /**
   * Utility methods
   */
  private processPendingOrders(currentBar: OHLVC): Promise<void> {
    // Implementation for pending orders (limit orders, stop orders, etc.)
    // For now, we only handle market orders
    return Promise.resolve();
  }

  private isValidSignal(signal: StrategySignal, context: StrategyContext): boolean {
    // Basic signal validation
    if (!signal || !signal.type || !signal.reason) {
      return false;
    }

    // Check if signal price is reasonable
    if (signal.price && (signal.price <= 0 || !isFinite(signal.price))) {
      return false;
    }

    return true;
  }

  private validateConfig(): void {
    if (!this.config.strategy) {
      throw new Error('Strategy is required');
    }
    if (!this.config.data || this.config.data.length === 0) {
      throw new Error('Data is required');
    }
    if (this.config.initialCapital <= 0) {
      throw new Error('Initial capital must be positive');
    }
  }

  private updateProgress(currentBar: OHLVC): void {
    if (this.onProgressCallback) {
      const progress: BacktestProgress = {
        currentBar: this.currentBarIndex + 1,
        totalBars: this.data.length,
        currentDate: currentBar.timestamp,
        currentPrice: currentBar.close,
        portfolioValue: this.calculatePortfolioValue(currentBar),
        openPositions: this.positions.length,
        totalTrades: this.trades.length,
        unrealizedPL: this.positions.reduce((sum, pos) => sum + pos.unrealizedPL, 0),
        realizedPL: this.trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
      };

      this.onProgressCallback(progress);
    }
  }

  private logProgress(currentBar: OHLVC): void {
    const portfolioValue = this.calculatePortfolioValue(currentBar);
    const progress = ((this.currentBarIndex + 1) / this.data.length * 100).toFixed(1);
    
    console.log(`📊 Progress: ${progress}% | ${currentBar.timestamp.toDateString()} | Portfolio: $${portfolioValue.toLocaleString()} | Trades: ${this.trades.length}`);
  }

  /**
   * Event callback setters
   */
  onProgress(callback: (progress: BacktestProgress) => void): void {
    this.onProgressCallback = callback;
  }

  onTrade(callback: (trade: TradeRecord) => void): void {
    this.onTradeCallback = callback;
  }

  onSignal(callback: (signal: StrategySignal) => void): void {
    this.onSignalCallback = callback;
  }

  /**
   * Generate comprehensive backtest results
   */
  private async generateResults(): Promise<BacktestResult> {
    console.log('📊 Generating comprehensive backtest results...');

    const results = PerformanceAnalyzer.generateResults(
      this.strategy.name,
      this.config.symbol,
      this.trades,
      this.portfolioValues,
      this.config.initialCapital,
      this.config.startDate,
      this.config.endDate,
      this.strategy.parameters
    );

    // Log summary
    console.log(`✅ Backtest Results Summary:`);
    console.log(`   📈 Total P/L: ${results.performance.totalPL >= 0 ? '+' : ''}$${results.performance.totalPL.toFixed(2)}`);
    console.log(`   🎯 Hit Rate: ${results.performance.hitRate.toFixed(1)}%`);
    console.log(`   💰 Profit Factor: ${results.performance.profitFactor.toFixed(2)}`);
    console.log(`   📉 Max Drawdown: ${results.performance.maxDrawdown.toFixed(2)}%`);
    console.log(`   📊 Sharpe Ratio: ${results.performance.sharpeRatio.toFixed(2)}`);
    console.log(`   🔄 Total Trades: ${results.performance.totalTrades}`);

    return results;
  }

  private async saveResults(results: BacktestResult): Promise<void> {
    // Save to knowledge store
    await backtestingKnowledgeStore.storeBacktestResult(results);
  }
}
