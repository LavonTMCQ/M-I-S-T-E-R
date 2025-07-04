import { TradeRecord, BacktestResult } from './data-structures.js';

/**
 * Performance Analysis System for Stock Backtesting
 * 
 * This module implements comprehensive performance metrics calculation
 * as specified in stockbacktestdesign.txt, including:
 * - P/L calculations (total, per trade, percentage returns)
 * - Hit rate and win/loss ratios
 * - Profit factor and risk-reward ratios
 * - Maximum drawdown and recovery periods
 * - Sharpe ratio and risk-adjusted returns
 * - Detailed trade logging and analysis capabilities
 */

export interface PerformanceMetrics {
  // P/L Metrics
  totalPL: number;
  totalPLPercent: number;
  averagePLPerTrade: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  
  // Trade Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  hitRate: number;
  
  // Risk Metrics
  profitFactor: number;
  riskRewardRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  recoveryFactor: number;
  
  // Risk-Adjusted Returns
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Time-Based Metrics
  averageHoldingPeriod: number; // in minutes
  maxHoldingPeriod: number;
  minHoldingPeriod: number;
  
  // Additional Metrics
  consecutiveWins: number;
  consecutiveLosses: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  
  // Monthly/Daily Breakdown
  monthlyReturns: { month: string; return: number; trades: number }[];
  dailyReturns: number[];
  
  // Equity Curve Data
  equityCurve: { timestamp: Date; value: number; drawdown: number }[];
}

export interface TradeAnalysis {
  trade: TradeRecord;
  holdingPeriod: number; // in minutes
  pnlPercent: number;
  isWinner: boolean;
  consecutiveNumber: number;
  runup: number; // Best unrealized profit during trade
  drawdown: number; // Worst unrealized loss during trade
}

export class PerformanceAnalyzer {
  /**
   * Generate comprehensive backtest results
   */
  static generateResults(
    strategyName: string,
    symbol: string,
    trades: TradeRecord[],
    portfolioValues: { timestamp: Date; value: number }[],
    initialCapital: number,
    startDate: Date,
    endDate: Date,
    parameters: Record<string, any>
  ): BacktestResult {
    
    console.log(`📊 Generating performance analysis for ${trades.length} trades...`);

    // Calculate comprehensive metrics
    const metrics = this.calculatePerformanceMetrics(trades, portfolioValues, initialCapital);
    
    // Analyze individual trades
    const _tradeAnalyses = this.analyzeIndividualTrades(trades);
    
    // Generate final capital
    const finalCapital = portfolioValues.length > 0 
      ? portfolioValues[portfolioValues.length - 1].value 
      : initialCapital;

    const result: BacktestResult = {
      id: `backtest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      strategyName,
      symbol,
      parameters,
      performance: {
        totalPL: metrics.totalPL,
        hitRate: metrics.hitRate,
        profitFactor: metrics.profitFactor,
        maxDrawdown: metrics.maxDrawdownPercent,
        sharpeRatio: metrics.sharpeRatio,
        totalTrades: metrics.totalTrades,
        winningTrades: metrics.winningTrades,
        losingTrades: metrics.losingTrades,
        averageWin: metrics.averageWin,
        averageLoss: metrics.averageLoss,
        largestWin: metrics.largestWin,
        largestLoss: metrics.largestLoss
      },
      trades,
      startDate,
      endDate,
      initialCapital,
      finalCapital,
      metadata: {
        dataSource: 'alpha-vantage',
        interval: '5min', // This should be passed as parameter
        marketHours: true,
        createdAt: new Date(),
        tags: [strategyName.toLowerCase().replace(/\s+/g, '-'), symbol.toLowerCase()]
      }
    };

    console.log(`✅ Performance analysis complete: ${metrics.hitRate.toFixed(1)}% hit rate, ${metrics.profitFactor.toFixed(2)} profit factor`);
    
    return result;
  }

  /**
   * Calculate comprehensive performance metrics
   */
  static calculatePerformanceMetrics(
    trades: TradeRecord[],
    portfolioValues: { timestamp: Date; value: number }[],
    initialCapital: number
  ): PerformanceMetrics {
    
    if (trades.length === 0) {
      return this.getEmptyMetrics();
    }

    // Separate buy and sell trades, match them into complete round trips
    const roundTripTrades = this.matchRoundTripTrades(trades);
    
    // Calculate basic P/L metrics
    const pnlMetrics = this.calculatePLMetrics(roundTripTrades, initialCapital);
    
    // Calculate trade statistics
    const tradeStats = this.calculateTradeStatistics(roundTripTrades);
    
    // Calculate risk metrics
    const riskMetrics = this.calculateRiskMetrics(roundTripTrades, portfolioValues, initialCapital);
    
    // Calculate time-based metrics
    const timeMetrics = this.calculateTimeMetrics(roundTripTrades);
    
    // Calculate consecutive win/loss streaks
    const streakMetrics = this.calculateStreakMetrics(roundTripTrades);
    
    // Calculate monthly/daily returns
    const periodReturns = this.calculatePeriodReturns(portfolioValues, initialCapital);
    
    // Generate equity curve with drawdown
    const equityCurve = this.generateEquityCurve(portfolioValues, initialCapital);

    return {
      ...pnlMetrics,
      ...tradeStats,
      ...riskMetrics,
      ...timeMetrics,
      ...streakMetrics,
      ...periodReturns,
      equityCurve
    };
  }

  /**
   * Match buy and sell trades into complete round trips
   */
  private static matchRoundTripTrades(trades: TradeRecord[]): Array<{ buy: TradeRecord; sell: TradeRecord; pnl: number }> {
    const roundTrips: Array<{ buy: TradeRecord; sell: TradeRecord; pnl: number }> = [];
    const buyTrades = trades.filter(t => t.type === 'BUY').sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const sellTrades = trades.filter(t => t.type === 'SELL').sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Simple FIFO matching
    let buyIndex = 0;
    let sellIndex = 0;

    while (buyIndex < buyTrades.length && sellIndex < sellTrades.length) {
      const buyTrade = buyTrades[buyIndex];
      const sellTrade = sellTrades[sellIndex];

      if (sellTrade.timestamp > buyTrade.timestamp) {
        const pnl = (sellTrade.price - buyTrade.price) * Math.min(buyTrade.quantity, sellTrade.quantity) 
                   - (buyTrade.commission || 0) - (sellTrade.commission || 0);
        
        roundTrips.push({
          buy: buyTrade,
          sell: sellTrade,
          pnl
        });

        buyIndex++;
        sellIndex++;
      } else {
        sellIndex++;
      }
    }

    return roundTrips;
  }

  /**
   * Calculate P/L metrics
   */
  private static calculatePLMetrics(roundTrips: Array<{ buy: TradeRecord; sell: TradeRecord; pnl: number }>, initialCapital: number) {
    const pnls = roundTrips.map(rt => rt.pnl);
    const wins = pnls.filter(pnl => pnl > 0);
    const losses = pnls.filter(pnl => pnl < 0);

    const totalPL = pnls.reduce((sum, pnl) => sum + pnl, 0);
    const totalPLPercent = (totalPL / initialCapital) * 100;

    return {
      totalPL,
      totalPLPercent,
      averagePLPerTrade: pnls.length > 0 ? totalPL / pnls.length : 0,
      averageWin: wins.length > 0 ? wins.reduce((sum, win) => sum + win, 0) / wins.length : 0,
      averageLoss: losses.length > 0 ? Math.abs(losses.reduce((sum, loss) => sum + loss, 0) / losses.length) : 0,
      largestWin: wins.length > 0 ? Math.max(...wins) : 0,
      largestLoss: losses.length > 0 ? Math.abs(Math.min(...losses)) : 0
    };
  }

  /**
   * Calculate trade statistics
   */
  private static calculateTradeStatistics(roundTrips: Array<{ buy: TradeRecord; sell: TradeRecord; pnl: number }>) {
    const totalTrades = roundTrips.length;
    const winningTrades = roundTrips.filter(rt => rt.pnl > 0).length;
    const losingTrades = roundTrips.filter(rt => rt.pnl < 0).length;
    const hitRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      hitRate
    };
  }

  /**
   * Calculate risk metrics
   */
  private static calculateRiskMetrics(
    roundTrips: Array<{ buy: TradeRecord; sell: TradeRecord; pnl: number }>,
    portfolioValues: { timestamp: Date; value: number }[],
    initialCapital: number
  ) {
    const wins = roundTrips.filter(rt => rt.pnl > 0);
    const losses = roundTrips.filter(rt => rt.pnl < 0);

    // Profit Factor
    const totalWins = wins.reduce((sum, win) => sum + win.pnl, 0);
    const totalLosses = Math.abs(losses.reduce((sum, loss) => sum + loss.pnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

    // Risk-Reward Ratio
    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0;

    // Drawdown calculations
    const { maxDrawdown, maxDrawdownPercent } = this.calculateDrawdown(portfolioValues, initialCapital);

    // Recovery Factor
    const totalReturn = portfolioValues.length > 0 
      ? portfolioValues[portfolioValues.length - 1].value - initialCapital 
      : 0;
    const recoveryFactor = maxDrawdown > 0 ? totalReturn / maxDrawdown : 0;

    // Risk-adjusted returns
    const returns = this.calculateReturns(portfolioValues);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const sortinoRatio = this.calculateSortinoRatio(returns);
    const calmarRatio = this.calculateCalmarRatio(totalReturn / initialCapital, maxDrawdownPercent);

    return {
      profitFactor,
      riskRewardRatio,
      maxDrawdown,
      maxDrawdownPercent,
      recoveryFactor,
      sharpeRatio,
      sortinoRatio,
      calmarRatio
    };
  }

  /**
   * Calculate time-based metrics
   */
  private static calculateTimeMetrics(roundTrips: Array<{ buy: TradeRecord; sell: TradeRecord; pnl: number }>) {
    const holdingPeriods = roundTrips.map(rt => {
      return (rt.sell.timestamp.getTime() - rt.buy.timestamp.getTime()) / (1000 * 60); // minutes
    });

    return {
      averageHoldingPeriod: holdingPeriods.length > 0 ? holdingPeriods.reduce((sum, period) => sum + period, 0) / holdingPeriods.length : 0,
      maxHoldingPeriod: holdingPeriods.length > 0 ? Math.max(...holdingPeriods) : 0,
      minHoldingPeriod: holdingPeriods.length > 0 ? Math.min(...holdingPeriods) : 0
    };
  }

  /**
   * Calculate consecutive win/loss streaks
   */
  private static calculateStreakMetrics(roundTrips: Array<{ buy: TradeRecord; sell: TradeRecord; pnl: number }>) {
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    for (const roundTrip of roundTrips) {
      if (roundTrip.pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
      } else if (roundTrip.pnl < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
      }
    }

    consecutiveWins = currentWinStreak;
    consecutiveLosses = currentLossStreak;

    return {
      consecutiveWins,
      consecutiveLosses,
      maxConsecutiveWins,
      maxConsecutiveLosses
    };
  }

  /**
   * Calculate period returns (monthly/daily)
   */
  private static calculatePeriodReturns(portfolioValues: { timestamp: Date; value: number }[], _initialCapital: number) {
    const monthlyReturns: { month: string; return: number; trades: number }[] = [];
    const dailyReturns: number[] = [];

    // Group by month and calculate returns
    const monthlyGroups = new Map<string, { start: number; end: number; trades: number }>();
    
    for (let i = 0; i < portfolioValues.length; i++) {
      const value = portfolioValues[i];
      const monthKey = `${value.timestamp.getFullYear()}-${String(value.timestamp.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, { start: value.value, end: value.value, trades: 0 });
      } else {
        monthlyGroups.get(monthKey)!.end = value.value;
      }
    }

    for (const [month, data] of monthlyGroups) {
      const monthReturn = ((data.end - data.start) / data.start) * 100;
      monthlyReturns.push({ month, return: monthReturn, trades: data.trades });
    }

    // Calculate daily returns
    for (let i = 1; i < portfolioValues.length; i++) {
      const prevValue = portfolioValues[i - 1].value;
      const currentValue = portfolioValues[i].value;
      const dailyReturn = ((currentValue - prevValue) / prevValue) * 100;
      dailyReturns.push(dailyReturn);
    }

    return {
      monthlyReturns,
      dailyReturns
    };
  }

  /**
   * Generate equity curve with drawdown
   */
  private static generateEquityCurve(portfolioValues: { timestamp: Date; value: number }[], initialCapital: number) {
    const equityCurve: { timestamp: Date; value: number; drawdown: number }[] = [];
    let highWaterMark = initialCapital;

    for (const point of portfolioValues) {
      if (point.value > highWaterMark) {
        highWaterMark = point.value;
      }
      
      const drawdown = ((highWaterMark - point.value) / highWaterMark) * 100;
      
      equityCurve.push({
        timestamp: point.timestamp,
        value: point.value,
        drawdown
      });
    }

    return equityCurve;
  }

  /**
   * Helper methods for risk calculations
   */
  private static calculateDrawdown(portfolioValues: { timestamp: Date; value: number }[], initialCapital: number) {
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let highWaterMark = initialCapital;

    for (const point of portfolioValues) {
      if (point.value > highWaterMark) {
        highWaterMark = point.value;
      }
      
      const drawdown = highWaterMark - point.value;
      const drawdownPercent = (drawdown / highWaterMark) * 100;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    }

    return { maxDrawdown, maxDrawdownPercent };
  }

  private static calculateReturns(portfolioValues: { timestamp: Date; value: number }[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < portfolioValues.length; i++) {
      const prevValue = portfolioValues[i - 1].value;
      const currentValue = portfolioValues[i].value;
      const returnPct = (currentValue - prevValue) / prevValue;
      returns.push(returnPct);
    }
    
    return returns;
  }

  private static calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Assuming risk-free rate of 2% annually, convert to period return
    const riskFreeRate = 0.02 / 252; // Daily risk-free rate
    
    return stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;
  }

  private static calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const negativeReturns = returns.filter(ret => ret < 0);
    
    if (negativeReturns.length === 0) return avgReturn > 0 ? 999 : 0;
    
    const downwardDeviation = Math.sqrt(
      negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length
    );
    
    const riskFreeRate = 0.02 / 252;
    
    return downwardDeviation > 0 ? (avgReturn - riskFreeRate) / downwardDeviation : 0;
  }

  private static calculateCalmarRatio(annualReturn: number, maxDrawdownPercent: number): number {
    return maxDrawdownPercent > 0 ? annualReturn / (maxDrawdownPercent / 100) : 0;
  }

  /**
   * Analyze individual trades
   */
  static analyzeIndividualTrades(trades: TradeRecord[]): TradeAnalysis[] {
    const analyses: TradeAnalysis[] = [];
    const roundTrips = this.matchRoundTripTrades(trades);
    
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    
    for (const roundTrip of roundTrips) {
      const holdingPeriod = (roundTrip.sell.timestamp.getTime() - roundTrip.buy.timestamp.getTime()) / (1000 * 60);
      const pnlPercent = (roundTrip.pnl / (roundTrip.buy.price * roundTrip.buy.quantity)) * 100;
      const isWinner = roundTrip.pnl > 0;
      
      if (isWinner) {
        consecutiveWins++;
        consecutiveLosses = 0;
      } else {
        consecutiveLosses++;
        consecutiveWins = 0;
      }
      
      analyses.push({
        trade: roundTrip.sell, // Use sell trade as the completed trade
        holdingPeriod,
        pnlPercent,
        isWinner,
        consecutiveNumber: isWinner ? consecutiveWins : consecutiveLosses,
        runup: 0, // Would need tick data to calculate
        drawdown: 0 // Would need tick data to calculate
      });
    }
    
    return analyses;
  }

  /**
   * Get empty metrics for cases with no trades
   */
  private static getEmptyMetrics(): PerformanceMetrics {
    return {
      totalPL: 0,
      totalPLPercent: 0,
      averagePLPerTrade: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      hitRate: 0,
      profitFactor: 0,
      riskRewardRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      recoveryFactor: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      averageHoldingPeriod: 0,
      maxHoldingPeriod: 0,
      minHoldingPeriod: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      monthlyReturns: [],
      dailyReturns: [],
      equityCurve: []
    };
  }
}