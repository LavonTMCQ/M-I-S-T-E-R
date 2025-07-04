import { EventEmitter } from 'events';
import { z } from 'zod';
import { StrikeFinanceAPI, MarketInfo, PerpetualInfo } from './strike-finance-api';

// Trading decision types
export type TradingAction = "Open" | "Close" | "Update" | "Hold";

export interface TradingDecision {
  action: TradingAction;
  params?: {
    position?: "Long" | "Short";
    leverage?: number;
    collateralAmount?: number;
    positionSize?: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
    confidence?: number;
  };
  reason?: string;
  timestamp: Date;
}

// Price data interface
export interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Trading strategy interface
export abstract class TradingStrategy {
  abstract evaluate(
    marketInfo: MarketInfo,
    existingPositions: PerpetualInfo[],
    priceData: PriceData[]
  ): TradingDecision;
}

/**
 * Mock Price Service for development
 * In production, this would connect to real price feeds
 */
export class PriceService {
  private priceHistory: PriceData[] = [];
  private currentPrice = 0.45; // Starting ADA price

  constructor() {
    // Initialize with some mock historical data
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Generate 200 hours of mock price data
    for (let i = 200; i >= 0; i--) {
      const timestamp = now - (i * oneHour);
      const price = 0.45 + (Math.sin(i / 10) * 0.05) + (Math.random() - 0.5) * 0.02;

      this.priceHistory.push({
        timestamp,
        open: price,
        high: price * (1 + Math.random() * 0.02),
        low: price * (1 - Math.random() * 0.02),
        close: price,
        volume: Math.random() * 1000000
      });
    }

    this.currentPrice = this.priceHistory[this.priceHistory.length - 1].close;
    console.log(`📊 Initialized price service with ${this.priceHistory.length} data points`);
  }

  async getCurrentPrice(): Promise<number> {
    // Simulate price movement
    const change = (Math.random() - 0.5) * 0.01; // ±0.5% change
    this.currentPrice = Math.max(0.1, this.currentPrice * (1 + change));

    return this.currentPrice;
  }

  async getPriceHistory(hours: number = 200): Promise<PriceData[]> {
    // Add new price data point
    const newPrice = await this.getCurrentPrice();
    const newDataPoint: PriceData = {
      timestamp: Date.now(),
      open: this.priceHistory[this.priceHistory.length - 1]?.close || newPrice,
      high: newPrice * (1 + Math.random() * 0.01),
      low: newPrice * (1 - Math.random() * 0.01),
      close: newPrice,
      volume: Math.random() * 1000000
    };

    this.priceHistory.push(newDataPoint);

    // Keep only requested number of hours
    if (this.priceHistory.length > hours) {
      this.priceHistory = this.priceHistory.slice(-hours);
    }

    return [...this.priceHistory];
  }
}

/**
 * TITAN2K Trend-Tuned Trading Strategy
 * Ported from Python implementation
 */
export class TITAN2KTrendTuned extends TradingStrategy {
  private readonly aggressiveMode: boolean;
  private readonly timeframeWeights = { daily: 0.6, medium: 0.25, lower: 0.15 };
  private readonly trendStrengthThreshold = 0.5;
  private readonly maxPositionSize = 1;
  private readonly maxLeverage = 10;
  private readonly trailingStopMultiplier = 1.5;
  private readonly profitTargetMultiplier = 3;

  constructor(aggressiveMode = true) {
    super();
    this.aggressiveMode = aggressiveMode;
    console.log(`🤖 TITAN2K Strategy initialized (aggressive: ${aggressiveMode})`);
  }

  evaluate(marketInfo: MarketInfo, existingPositions: PerpetualInfo[], priceData: PriceData[]): TradingDecision {
    console.log('📈 Evaluating TITAN2K Trend-Tuned Strategy...');

    if (priceData.length < 50) {
      console.log('⚠️ Not enough price data for analysis');
      return {
        action: "Hold",
        reason: "Insufficient price data",
        timestamp: new Date()
      };
    }

    try {
      const indicators = this.calculateIndicators(priceData);
      const signal = this.generateSignal(indicators, priceData);

      // Check existing positions
      const hasLongPosition = existingPositions.some(p => p.position === "Long");
      const hasShortPosition = existingPositions.some(p => p.position === "Short");

      if (signal.action === "BUY" && !hasLongPosition) {
        return {
          action: "Open",
          params: {
            position: "Long",
            leverage: Math.min(signal.leverage || 5, this.maxLeverage),
            collateralAmount: 1000 * 1_000_000, // 1000 ADA in lovelace
            positionSize: (signal.positionSize || 0.5) * 5000 * 1_000_000,
            stopLossPrice: signal.stopLoss,
            takeProfitPrice: signal.takeProfit,
            confidence: signal.confidence
          },
          reason: `TITAN2K BUY signal (confidence: ${signal.confidence?.toFixed(2)})`,
          timestamp: new Date()
        };
      }

      if (signal.action === "SELL" && !hasShortPosition) {
        return {
          action: "Open",
          params: {
            position: "Short",
            leverage: Math.min(signal.leverage || 5, this.maxLeverage),
            collateralAmount: 1000 * 1_000_000,
            positionSize: (signal.positionSize || 0.5) * 5000 * 1_000_000,
            stopLossPrice: signal.stopLoss,
            takeProfitPrice: signal.takeProfit,
            confidence: signal.confidence
          },
          reason: `TITAN2K SELL signal (confidence: ${signal.confidence?.toFixed(2)})`,
          timestamp: new Date()
        };
      }

      return {
        action: "Hold",
        reason: `No clear signal or position already exists (${signal.action})`,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Strategy evaluation failed:', error);
      return {
        action: "Hold",
        reason: `Strategy error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  private calculateIndicators(priceData: PriceData[]): any {
    const closes = priceData.map(d => d.close);
    const highs = priceData.map(d => d.high);
    const lows = priceData.map(d => d.low);

    return {
      ema20: this.calculateEMA(closes, 20),
      ema50: this.calculateEMA(closes, 50),
      rsi: this.calculateRSI(closes, 14),
      macd: this.calculateMACD(closes),
      atr: this.calculateATR(highs, lows, closes, 14),
      currentPrice: closes[closes.length - 1]
    };
  }

  private generateSignal(indicators: any, priceData: PriceData[]): any {
    const { ema20, ema50, rsi, macd, atr, currentPrice } = indicators;

    // Trend analysis
    const trendUp = ema20 > ema50 && macd.histogram > 0;
    const trendDown = ema20 < ema50 && macd.histogram < 0;

    // Momentum analysis
    const oversold = rsi < 30;
    const overbought = rsi > 70;

    // Signal generation
    let action = "HOLD";
    let confidence = 0;
    let leverage = 5;
    let positionSize = 0.5;

    if (trendUp && oversold && macd.signal > macd.macd) {
      action = "BUY";
      confidence = 0.8;
      leverage = this.aggressiveMode ? 8 : 5;
      positionSize = this.aggressiveMode ? 0.8 : 0.5;
    } else if (trendDown && overbought && macd.signal < macd.macd) {
      action = "SELL";
      confidence = 0.8;
      leverage = this.aggressiveMode ? 8 : 5;
      positionSize = this.aggressiveMode ? 0.8 : 0.5;
    }

    const stopLoss = action === "BUY"
      ? currentPrice - (atr * this.trailingStopMultiplier)
      : currentPrice + (atr * this.trailingStopMultiplier);

    const takeProfit = action === "BUY"
      ? currentPrice + (atr * this.profitTargetMultiplier)
      : currentPrice - (atr * this.profitTargetMultiplier);

    return {
      action,
      confidence,
      leverage,
      positionSize,
      stopLoss,
      takeProfit
    };
  }

  private calculateEMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

    for (let i = period; i < data.length; i++) {
      ema = (data[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  private calculateRSI(data: number[], period: number): number {
    if (data.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = data[i] - data[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(data: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);
    const macd = ema12 - ema26;

    // Calculate signal line (9-period EMA of MACD)
    const macdData = [];
    for (let i = 26; i < data.length; i++) {
      const ema12_i = this.calculateEMA(data.slice(0, i + 1), 12);
      const ema26_i = this.calculateEMA(data.slice(0, i + 1), 26);
      macdData.push(ema12_i - ema26_i);
    }

    const signal = this.calculateEMA(macdData, 9);
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    if (highs.length < period + 1) return 0.01;

    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    return trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
  }
}

/**
 * SignalService - Main service for generating trading signals
 * Emits events when trading signals are generated
 */
export class SignalService extends EventEmitter {
  private static instance: SignalService;
  private strategy: TradingStrategy;
  private priceService: PriceService;
  private strikeAPI: StrikeFinanceAPI;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private readonly checkInterval = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    super();
    this.strategy = new TITAN2KTrendTuned(true); // Aggressive mode
    this.priceService = new PriceService();
    this.strikeAPI = new StrikeFinanceAPI();
    console.log('📡 SignalService initialized');
  }

  static getInstance(): SignalService {
    if (!SignalService.instance) {
      SignalService.instance = new SignalService();
    }
    return SignalService.instance;
  }

  /**
   * Starts the signal generation service
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ SignalService is already running');
      return;
    }

    console.log('🚀 Starting SignalService...');
    this.isRunning = true;

    // Run initial check
    this.runSignalCheck();

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.runSignalCheck();
    }, this.checkInterval);

    console.log(`✅ SignalService started (checking every ${this.checkInterval / 1000}s)`);
  }

  /**
   * Stops the signal generation service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ SignalService is not running');
      return;
    }

    console.log('🛑 Stopping SignalService...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log('✅ SignalService stopped');
  }

  /**
   * Runs a single signal check
   */
  private async runSignalCheck(): Promise<void> {
    try {
      console.log('🔍 Running signal check...');

      // Get market data
      const marketInfo = await this.strikeAPI.getOverallInfo();
      const priceData = await this.priceService.getPriceHistory(200);

      // For now, check positions for a mock address (in production, this would iterate through all managed wallets)
      const mockAddress = "addr1qy..."; // This would be replaced with actual wallet addresses
      const existingPositions: PerpetualInfo[] = []; // Would get from Strike API

      // Generate trading decision
      const decision = this.strategy.evaluate(marketInfo.data, existingPositions, priceData);

      console.log(`📊 Trading decision: ${decision.action} - ${decision.reason}`);

      // Emit signal if action is required
      if (decision.action !== "Hold") {
        this.emit('tradingSignal', {
          decision,
          marketInfo: marketInfo.data,
          timestamp: new Date()
        });

        console.log(`🚨 Trading signal emitted: ${decision.action}`);
      }

    } catch (error) {
      console.error('❌ Signal check failed:', error);
      this.emit('error', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    }
  }

  /**
   * Forces a manual signal check
   */
  async forceSignalCheck(): Promise<TradingDecision> {
    console.log('🔧 Forcing manual signal check...');

    try {
      const marketInfo = await this.strikeAPI.getOverallInfo();
      const priceData = await this.priceService.getPriceHistory(200);
      const existingPositions: PerpetualInfo[] = [];

      const decision = this.strategy.evaluate(marketInfo.data, existingPositions, priceData);

      console.log(`📊 Manual signal check result: ${decision.action}`);
      return decision;

    } catch (error) {
      console.error('❌ Manual signal check failed:', error);
      return {
        action: "Hold",
        reason: `Manual check error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Gets the current service status
   */
  getStatus(): { isRunning: boolean; checkInterval: number; strategy: string } {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      strategy: this.strategy.constructor.name
    };
  }

  /**
   * Updates the trading strategy
   */
  setStrategy(strategy: TradingStrategy): void {
    this.strategy = strategy;
    console.log(`🔄 Strategy updated to: ${strategy.constructor.name}`);
  }
}