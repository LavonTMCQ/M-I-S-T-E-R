import { OHLVC } from '../knowledge-store.js';

/**
 * MACD Histogram Momentum Strategy
 * 
 * This strategy trades based on MACD histogram changes to capture momentum shifts:
 * 
 * ENTRY SIGNALS:
 * - LONG: Histogram turns positive (crosses above zero) + increasing slope
 * - SHORT: Histogram turns negative (crosses below zero) + decreasing slope
 * 
 * EXIT SIGNALS:
 * - Opposite histogram signal
 * - Maximum position time (default: 2 hours)
 * - Stop loss based on ATR
 * 
 * FEATURES:
 * - Uses 5-minute MACD data for intraday momentum
 * - Histogram slope confirmation for stronger signals
 * - Dynamic position sizing based on histogram strength
 * - ATR-based stop losses
 */

export interface MACDHistogramConfig {
  // MACD Parameters
  fastPeriod: number;        // Default: 12
  slowPeriod: number;        // Default: 26
  signalPeriod: number;      // Default: 9

  // Strategy Parameters
  minHistogramChange: number;     // Minimum histogram change to trigger signal (default: 0.01)
  slopeConfirmation: boolean;     // Require histogram slope confirmation (default: true)
  maxPositionMinutes: number;     // Maximum time to hold position (default: 120)

  // Trend Filter
  useTrendFilter: boolean;        // Use EMA-9 trend filter (default: true)
  trendFilterPeriod: number;      // EMA period for trend filter (default: 9)

  // Risk Management
  stopLossATRMultiple: number;    // Stop loss as multiple of ATR (default: 2.0)
  takeProfitATRMultiple: number;  // Take profit as multiple of ATR (default: 3.0)
  maxPositionSize: number;        // Maximum position size (default: 100 contracts)

  // Profit Taking
  usePartialProfits: boolean;     // Enable partial profit taking (default: true)
  firstProfitTarget: number;      // First profit target as ATR multiple (default: 1.5)
  secondProfitTarget: number;     // Second profit target as ATR multiple (default: 2.5)
  trailingStopATR: number;        // Trailing stop as ATR multiple (default: 1.0)

  // Market Hours
  marketOpen: string;        // Market open time (default: "09:30")
  marketClose: string;       // Market close time (default: "16:00")
}

export interface MACDData {
  timestamp: Date;
  macd: number;
  signal: number;
  histogram: number;
}

export interface Trade {
  entryTime: Date;
  exitTime?: Date;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  remainingQuantity?: number;  // For partial exits
  pnl?: number;
  pnlPips?: number;
  reason: string;
  histogramAtEntry: number;
  histogramSlope: number;
  emaAtEntry?: number;         // EMA-9 value at entry
  partialExits?: Array<{       // Track partial profit taking
    time: Date;
    price: number;
    quantity: number;
    pnl: number;
    reason: string;
  }>;
  highestPrice?: number;       // For trailing stops
  lowestPrice?: number;        // For trailing stops
}

export class MACDHistogramStrategy {
  private config: MACDHistogramConfig;
  private macdData: MACDData[] = [];
  private trades: Trade[] = [];
  private currentPosition: Trade | null = null;
  private atrValues: number[] = [];
  private emaValues: number[] = [];  // EMA-9 for trend filter

  constructor(config: Partial<MACDHistogramConfig> = {}) {
    this.config = {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      minHistogramChange: 0.01,
      slopeConfirmation: true,
      maxPositionMinutes: 120,
      useTrendFilter: true,
      trendFilterPeriod: 9,
      stopLossATRMultiple: 2.0,
      takeProfitATRMultiple: 3.0,
      maxPositionSize: 100,  // 100 contracts for SPY/QQQ
      usePartialProfits: true,
      firstProfitTarget: 1.5,
      secondProfitTarget: 2.5,
      trailingStopATR: 1.0,
      marketOpen: "09:30",
      marketClose: "16:00",
      ...config
    };
  }

  /**
   * Calculate MACD data from price data
   */
  calculateMACDData(priceData: OHLVC[]): void {
    console.log(`📊 Calculating MACD data from ${priceData.length} price points...`);

    if (priceData.length < this.config.slowPeriod + this.config.signalPeriod) {
      throw new Error(`Insufficient data for MACD calculation. Need at least ${this.config.slowPeriod + this.config.signalPeriod} data points, got ${priceData.length}`);
    }

    // Calculate EMAs for MACD
    const fastEMA = this.calculateEMA(priceData.map(p => p.close), this.config.fastPeriod);
    const slowEMA = this.calculateEMA(priceData.map(p => p.close), this.config.slowPeriod);

    // Calculate EMA for trend filter
    if (this.config.useTrendFilter) {
      this.emaValues = this.calculateEMA(priceData.map(p => p.close), this.config.trendFilterPeriod);
      console.log(`📈 Calculated EMA-${this.config.trendFilterPeriod} trend filter with ${this.emaValues.length} values`);
    }

    // Calculate MACD line (fast EMA - slow EMA)
    const macdLine: number[] = [];
    for (let i = 0; i < fastEMA.length; i++) {
      if (i >= this.config.slowPeriod - 1) {
        macdLine.push(fastEMA[i] - slowEMA[i]);
      }
    }

    // Calculate Signal line (EMA of MACD line)
    const signalLine = this.calculateEMA(macdLine, this.config.signalPeriod);

    // Calculate Histogram (MACD - Signal)
    this.macdData = [];
    const startIndex = this.config.slowPeriod + this.config.signalPeriod - 2;

    for (let i = startIndex; i < priceData.length; i++) {
      const macdIndex = i - (this.config.slowPeriod - 1);
      const signalIndex = macdIndex - (this.config.signalPeriod - 1);

      if (macdIndex >= 0 && signalIndex >= 0 && signalIndex < signalLine.length) {
        this.macdData.push({
          timestamp: priceData[i].timestamp,
          macd: macdLine[macdIndex],
          signal: signalLine[signalIndex],
          histogram: macdLine[macdIndex] - signalLine[signalIndex]
        });
      }
    }

    console.log(`✅ Calculated ${this.macdData.length} MACD data points`);
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA for the first value
    let sum = 0;
    for (let i = 0; i < period && i < prices.length; i++) {
      sum += prices[i];
    }

    if (prices.length >= period) {
      ema[period - 1] = sum / period;

      // Calculate EMA for remaining values
      for (let i = period; i < prices.length; i++) {
        ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
      }
    }

    return ema;
  }

  /**
   * Calculate ATR for stop loss/take profit levels
   */
  private calculateATR(priceData: OHLVC[], period: number = 14): number[] {
    const atr: number[] = [];
    const trueRanges: number[] = [];

    for (let i = 0; i < priceData.length; i++) {
      if (i === 0) {
        trueRanges.push(priceData[i].high - priceData[i].low);
      } else {
        const tr1 = priceData[i].high - priceData[i].low;
        const tr2 = Math.abs(priceData[i].high - priceData[i - 1].close);
        const tr3 = Math.abs(priceData[i].low - priceData[i - 1].close);
        trueRanges.push(Math.max(tr1, tr2, tr3));
      }

      if (i >= period - 1) {
        const avgTR = trueRanges.slice(i - period + 1, i + 1).reduce((sum, tr) => sum + tr, 0) / period;
        atr.push(avgTR);
      } else {
        atr.push(0);
      }
    }

    return atr;
  }

  /**
   * Check if current time is within market hours
   */
  private isMarketHours(timestamp: Date): boolean {
    const timeStr = timestamp.toTimeString().slice(0, 5); // HH:MM format
    return timeStr >= this.config.marketOpen && timeStr <= this.config.marketClose;
  }

  /**
   * Calculate histogram slope (rate of change)
   */
  private calculateHistogramSlope(index: number, lookback: number = 3): number {
    if (index < lookback) return 0;
    
    const current = this.macdData[index].histogram;
    const previous = this.macdData[index - lookback].histogram;
    return current - previous;
  }

  /**
   * Generate entry signal based on histogram changes and trend filter
   */
  private generateSignal(index: number, priceIndex: number, currentPrice: number): 'long' | 'short' | null {
    if (index < 2) return null;

    const current = this.macdData[index];
    const previous = this.macdData[index - 1];

    // Check for histogram zero-line crossover
    const histogramChange = Math.abs(current.histogram - previous.histogram);
    if (histogramChange < this.config.minHistogramChange) return null;

    // Apply EMA trend filter
    if (this.config.useTrendFilter && this.emaValues.length > priceIndex) {
      const ema = this.emaValues[priceIndex];

      // Long signal: histogram crosses above zero AND price above EMA-9
      if (previous.histogram <= 0 && current.histogram > 0 && currentPrice > ema) {
        if (this.config.slopeConfirmation) {
          const slope = this.calculateHistogramSlope(index);
          if (slope > 0) return 'long';
        } else {
          return 'long';
        }
      }

      // Short signal: histogram crosses below zero AND price below EMA-9
      if (previous.histogram >= 0 && current.histogram < 0 && currentPrice < ema) {
        if (this.config.slopeConfirmation) {
          const slope = this.calculateHistogramSlope(index);
          if (slope < 0) return 'short';
        } else {
          return 'short';
        }
      }
    } else {
      // Original logic without trend filter
      if (previous.histogram <= 0 && current.histogram > 0) {
        if (this.config.slopeConfirmation) {
          const slope = this.calculateHistogramSlope(index);
          if (slope > 0) return 'long';
        } else {
          return 'long';
        }
      }

      if (previous.histogram >= 0 && current.histogram < 0) {
        if (this.config.slopeConfirmation) {
          const slope = this.calculateHistogramSlope(index);
          if (slope < 0) return 'short';
        } else {
          return 'short';
        }
      }
    }

    return null;
  }

  /**
   * Execute the MACD Histogram strategy
   */
  async executeStrategy(symbol: string, priceData: OHLVC[], startDate: Date, endDate: Date): Promise<Trade[]> {
    console.log(`🚀 Executing MACD Histogram Strategy on ${symbol}...`);
    console.log(`📅 Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Reset state
    this.trades = [];
    this.currentPosition = null;
    
    // Calculate ATR for risk management
    this.atrValues = this.calculateATR(priceData);
    
    // Filter price data to match date range
    const filteredPriceData = priceData.filter(candle => 
      candle.timestamp >= startDate && candle.timestamp <= endDate
    );

    console.log(`📊 Processing ${filteredPriceData.length} price candles and ${this.macdData.length} MACD data points...`);

    // Process each MACD data point
    for (let i = 0; i < this.macdData.length; i++) {
      const macdPoint = this.macdData[i];
      
      // Find corresponding price data
      const priceIndex = filteredPriceData.findIndex(candle => 
        Math.abs(candle.timestamp.getTime() - macdPoint.timestamp.getTime()) < 5 * 60 * 1000 // 5 minute tolerance
      );
      
      if (priceIndex === -1) continue;
      
      const currentPrice = filteredPriceData[priceIndex];
      
      // Skip if outside market hours
      if (!this.isMarketHours(macdPoint.timestamp)) continue;

      // Check for exit conditions first
      if (this.currentPosition) {
        const shouldExit = this.checkExitConditions(i, currentPrice, priceIndex);
        if (shouldExit) {
          this.exitPosition(currentPrice, shouldExit, priceIndex);
        }
      }

      // Check for entry signals (only if no current position)
      if (!this.currentPosition) {
        const signal = this.generateSignal(i, priceIndex, currentPrice.close);
        if (signal) {
          this.enterPosition(signal, currentPrice, macdPoint, priceIndex);
        }
      }
    }

    // Close any remaining position
    if (this.currentPosition && filteredPriceData.length > 0) {
      const lastPrice = filteredPriceData[filteredPriceData.length - 1];
      this.exitPosition(lastPrice, 'end_of_period', filteredPriceData.length - 1);
    }

    console.log(`✅ Strategy execution complete. Generated ${this.trades.length} trades.`);
    return this.trades;
  }

  /**
   * Enter a new position
   */
  private enterPosition(side: 'long' | 'short', priceData: OHLVC, macdPoint: MACDData, priceIndex: number): void {
    const _atr = this.atrValues[priceIndex] || 0.5; // Default ATR if not available
    const entryPrice = priceData.close;
    const emaValue = this.emaValues[priceIndex] || entryPrice;

    // Use 100 contracts for SPY/QQQ trading
    const quantity = this.config.maxPositionSize;

    this.currentPosition = {
      entryTime: macdPoint.timestamp,
      side,
      entryPrice,
      quantity,
      remainingQuantity: quantity,  // Track remaining for partial exits
      reason: `MACD histogram ${side} signal`,
      histogramAtEntry: macdPoint.histogram,
      histogramSlope: this.calculateHistogramSlope(this.macdData.findIndex(d => d.timestamp.getTime() === macdPoint.timestamp.getTime())),
      emaAtEntry: emaValue,
      partialExits: [],
      highestPrice: side === 'long' ? entryPrice : undefined,
      lowestPrice: side === 'short' ? entryPrice : undefined
    };

    const trendDirection = entryPrice > emaValue ? 'above' : 'below';
    console.log(`📈 ${side.toUpperCase()} entry at ${entryPrice} (${quantity} contracts) | Histogram: ${macdPoint.histogram.toFixed(4)} | Price ${trendDirection} EMA-9: ${emaValue.toFixed(2)}`);
  }

  /**
   * Check exit conditions with intelligent profit-taking
   */
  private checkExitConditions(macdIndex: number, priceData: OHLVC, priceIndex: number): string | null {
    if (!this.currentPosition) return null;

    const currentMacd = this.macdData[macdIndex];
    const currentPrice = priceData.close;
    const atr = this.atrValues[priceIndex] || 0.5;
    const timeDiff = currentMacd.timestamp.getTime() - this.currentPosition.entryTime.getTime();
    const minutesHeld = timeDiff / (1000 * 60);

    // Update highest/lowest prices for trailing stops
    if (this.currentPosition.side === 'long') {
      this.currentPosition.highestPrice = Math.max(this.currentPosition.highestPrice || 0, currentPrice);
    } else {
      this.currentPosition.lowestPrice = Math.min(this.currentPosition.lowestPrice || Infinity, currentPrice);
    }

    // Check for partial profit taking
    if (this.config.usePartialProfits && this.currentPosition.remainingQuantity === this.currentPosition.quantity) {
      const profitTarget1 = this.currentPosition.side === 'long'
        ? this.currentPosition.entryPrice + (atr * this.config.firstProfitTarget)
        : this.currentPosition.entryPrice - (atr * this.config.firstProfitTarget);

      if ((this.currentPosition.side === 'long' && currentPrice >= profitTarget1) ||
          (this.currentPosition.side === 'short' && currentPrice <= profitTarget1)) {
        return 'partial_profit_1';
      }
    }

    // Check for second partial profit taking
    if (this.config.usePartialProfits && this.currentPosition.remainingQuantity === Math.floor(this.currentPosition.quantity * 0.5)) {
      const profitTarget2 = this.currentPosition.side === 'long'
        ? this.currentPosition.entryPrice + (atr * this.config.secondProfitTarget)
        : this.currentPosition.entryPrice - (atr * this.config.secondProfitTarget);

      if ((this.currentPosition.side === 'long' && currentPrice >= profitTarget2) ||
          (this.currentPosition.side === 'short' && currentPrice <= profitTarget2)) {
        return 'partial_profit_2';
      }
    }

    // Trailing stop for remaining position
    if (this.currentPosition && this.currentPosition.remainingQuantity !== undefined && this.currentPosition.remainingQuantity < this.currentPosition.quantity) {
      const trailingStop = this.currentPosition.side === 'long'
        ? (this.currentPosition.highestPrice || 0) - (atr * this.config.trailingStopATR)
        : (this.currentPosition.lowestPrice || Infinity) + (atr * this.config.trailingStopATR);

      if ((this.currentPosition.side === 'long' && currentPrice <= trailingStop) ||
          (this.currentPosition.side === 'short' && currentPrice >= trailingStop)) {
        return 'trailing_stop';
      }
    }

    // Time-based exit (only if no partial profits taken)
    if (minutesHeld >= this.config.maxPositionMinutes) {
      return 'max_time';
    }

    // Signal-based exit (opposite histogram signal)
    const signal = this.generateSignal(macdIndex, priceIndex, currentPrice);
    if (signal && signal !== this.currentPosition.side) {
      return 'opposite_signal';
    }

    // Histogram zero-line reversal
    if (this.currentPosition.side === 'long' && currentMacd.histogram < 0) {
      return 'histogram_reversal';
    }
    if (this.currentPosition.side === 'short' && currentMacd.histogram > 0) {
      return 'histogram_reversal';
    }

    return null;
  }

  /**
   * Exit current position (full or partial)
   */
  private exitPosition(priceData: OHLVC, reason: string, _priceIndex: number): void {
    if (!this.currentPosition) return;

    const exitPrice = priceData.close;
    let exitQuantity = this.currentPosition.remainingQuantity || this.currentPosition.quantity;

    // Handle partial exits
    if (reason === 'partial_profit_1') {
      exitQuantity = Math.floor(this.currentPosition.quantity * 0.5); // Exit 50%
      this.currentPosition.remainingQuantity = this.currentPosition.quantity - exitQuantity;
    } else if (reason === 'partial_profit_2') {
      exitQuantity = Math.floor(this.currentPosition.remainingQuantity! * 0.5); // Exit 50% of remaining
      this.currentPosition.remainingQuantity = this.currentPosition.remainingQuantity! - exitQuantity;
    }

    const pnl = this.currentPosition.side === 'long'
      ? (exitPrice - this.currentPosition.entryPrice) * exitQuantity
      : (this.currentPosition.entryPrice - exitPrice) * exitQuantity;

    const pnlPips = this.currentPosition.side === 'long'
      ? (exitPrice - this.currentPosition.entryPrice) * 10000
      : (this.currentPosition.entryPrice - exitPrice) * 10000;

    // Record partial exit
    if (reason.includes('partial_profit')) {
      this.currentPosition.partialExits = this.currentPosition.partialExits || [];
      this.currentPosition.partialExits.push({
        time: priceData.timestamp,
        price: exitPrice,
        quantity: exitQuantity,
        pnl,
        reason
      });

      console.log(`💰 ${this.currentPosition.side.toUpperCase()} partial exit (${exitQuantity} contracts) at ${exitPrice} | P/L: $${pnl.toFixed(2)} (${pnlPips.toFixed(1)} pips) | Reason: ${reason} | Remaining: ${this.currentPosition.remainingQuantity}`);
      return; // Don't close position yet
    }

    // Full exit - calculate total P/L including partial exits
    let totalPnL = pnl;
    if (this.currentPosition.partialExits) {
      totalPnL += this.currentPosition.partialExits.reduce((sum, exit) => sum + exit.pnl, 0);
    }

    const completedTrade: Trade = {
      ...this.currentPosition,
      exitTime: priceData.timestamp,
      exitPrice,
      pnl: totalPnL,
      pnlPips,
      reason: `Exit: ${reason}`
    };

    this.trades.push(completedTrade);
    console.log(`📉 ${this.currentPosition.side.toUpperCase()} full exit (${exitQuantity} contracts) at ${exitPrice} | Total P/L: $${totalPnL.toFixed(2)} | Reason: ${reason}`);

    this.currentPosition = null;
  }

  /**
   * Generate month range for data fetching
   */
  private generateMonthRange(_startMonth: string, _endMonth: string): string[] {
    const months: string[] = [];
    const [startYear, startMonthNum] = _startMonth.split('-').map(Number);
    const [endYear, endMonthNum] = _endMonth.split('-').map(Number);

    let currentYear = startYear;
    let currentMonth = startMonthNum;

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonthNum)) {
      months.push(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    return months;
  }

  /**
   * Utility delay function
   */
  private delay(_ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, _ms));
  }

  /**
   * Get strategy configuration
   */
  getConfig(): MACDHistogramConfig {
    return { ...this.config };
  }

  /**
   * Get MACD data
   */
  getMACDData(): MACDData[] {
    return [...this.macdData];
  }
}