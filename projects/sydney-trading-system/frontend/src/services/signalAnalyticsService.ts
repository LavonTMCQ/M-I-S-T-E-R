/**
 * Signal Analytics Service
 * Provides comprehensive analytics for trading signals including performance tracking,
 * win/loss analysis, and predictive scoring based on historical data.
 */

import { 
  SignalData, 
  SignalPerformance, 
  SignalAnalytics, 
  SignalFilter,
  MarketCondition,
  OHLCV 
} from '@/types/tradingview';

export class SignalAnalyticsService {
  private signalHistory: SignalPerformance[] = [];
  private marketConditions: MarketCondition[] = [];

  constructor() {
    this.loadStoredData();
  }

  /**
   * Add a new signal to tracking
   */
  addSignal(signal: SignalData): string {
    const signalId = this.generateSignalId(signal);
    const performance: SignalPerformance = {
      signalId,
      signal: { ...signal, id: signalId },
      outcome: 'pending'
    };

    this.signalHistory.push(performance);
    this.saveData();
    
    console.log(`📊 Added signal ${signalId} for tracking: ${signal.type.toUpperCase()} @ $${signal.price.toFixed(2)}`);
    return signalId;
  }

  /**
   * Update signal with exit information
   */
  updateSignalExit(signalId: string, exitPrice: number, exitTime: Date): void {
    const performance = this.signalHistory.find(p => p.signalId === signalId);
    if (!performance) {
      console.warn(`⚠️ Signal ${signalId} not found for exit update`);
      return;
    }

    const entryPrice = performance.signal.price;
    const isLong = performance.signal.type === 'long';
    
    // Calculate P&L
    const pnl = isLong 
      ? (exitPrice - entryPrice) * 100 // Assuming 100 shares/contracts
      : (entryPrice - exitPrice) * 100;
    
    // Calculate P&L in pips (assuming SPY where 1 pip = $0.01)
    const pnlPips = isLong 
      ? (exitPrice - entryPrice) * 100
      : (entryPrice - exitPrice) * 100;

    // Calculate holding period in minutes
    const holdingPeriod = (exitTime.getTime() - performance.signal.timestamp.getTime()) / (1000 * 60);

    // Determine outcome
    const outcome: 'win' | 'loss' = pnl > 0 ? 'win' : 'loss';

    // Update performance record
    performance.exitPrice = exitPrice;
    performance.exitTime = exitTime;
    performance.pnl = pnl;
    performance.pnlPips = pnlPips;
    performance.holdingPeriod = holdingPeriod;
    performance.outcome = outcome;
    performance.riskRewardRatio = Math.abs(pnl / (entryPrice * 0.01)); // Assuming 1% risk

    this.saveData();
    
    console.log(`✅ Updated signal ${signalId} exit: ${outcome.toUpperCase()} ${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPips.toFixed(1)} pips)`);
  }

  /**
   * Calculate comprehensive signal analytics
   */
  calculateAnalytics(filter?: SignalFilter): SignalAnalytics {
    const filteredSignals = this.filterSignals(filter);
    const completedSignals = filteredSignals.filter(p => p.outcome !== 'pending');

    if (completedSignals.length === 0) {
      return this.getEmptyAnalytics();
    }

    const longSignals = filteredSignals.filter(p => p.signal.type === 'long');
    const shortSignals = filteredSignals.filter(p => p.signal.type === 'short');
    const completedLongSignals = completedSignals.filter(p => p.signal.type === 'long');
    const completedShortSignals = completedSignals.filter(p => p.signal.type === 'short');

    const winningSignals = completedSignals.filter(p => p.outcome === 'win');
    const losingSignals = completedSignals.filter(p => p.outcome === 'loss');
    const longWinningSignals = completedLongSignals.filter(p => p.outcome === 'win');
    const shortWinningSignals = completedShortSignals.filter(p => p.outcome === 'win');

    // Calculate win rates
    const winRate = (winningSignals.length / completedSignals.length) * 100;
    const longWinRate = completedLongSignals.length > 0 
      ? (longWinningSignals.length / completedLongSignals.length) * 100 
      : 0;
    const shortWinRate = completedShortSignals.length > 0 
      ? (shortWinningSignals.length / completedShortSignals.length) * 100 
      : 0;

    // Calculate P&L metrics
    const totalPnL = completedSignals.reduce((sum, p) => sum + (p.pnl || 0), 0);
    const avgPnL = totalPnL / completedSignals.length;
    const avgPnLPips = completedSignals.reduce((sum, p) => sum + (p.pnlPips || 0), 0) / completedSignals.length;

    // Calculate holding period
    const avgHoldingPeriod = completedSignals.reduce((sum, p) => sum + (p.holdingPeriod || 0), 0) / completedSignals.length;

    // Find best and worst signals
    const bestSignal = completedSignals.reduce((best, current) => 
      (current.pnl || 0) > (best?.pnl || -Infinity) ? current : best, null as SignalPerformance | null);
    const worstSignal = completedSignals.reduce((worst, current) => 
      (current.pnl || 0) < (worst?.pnl || Infinity) ? current : worst, null as SignalPerformance | null);

    // Calculate profit factor
    const grossProfit = winningSignals.reduce((sum, p) => sum + (p.pnl || 0), 0);
    const grossLoss = Math.abs(losingSignals.reduce((sum, p) => sum + (p.pnl || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

    // Calculate Sharpe ratio (simplified)
    const returns = completedSignals.map(p => (p.pnl || 0) / (p.signal.price * 100)); // Return percentage
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;

    // Calculate consecutive streaks
    const { consecutiveWins, consecutiveLosses } = this.calculateStreaks(completedSignals);

    // Calculate confidence metrics
    const avgConfidence = filteredSignals.reduce((sum, p) => sum + p.signal.confidence, 0) / filteredSignals.length;
    const confidenceCorrelation = this.calculateConfidenceCorrelation(completedSignals);

    return {
      totalSignals: filteredSignals.length,
      longSignals: longSignals.length,
      shortSignals: shortSignals.length,
      winRate,
      longWinRate,
      shortWinRate,
      avgPnL,
      avgPnLPips,
      avgHoldingPeriod,
      bestSignal,
      worstSignal,
      profitFactor,
      sharpeRatio,
      consecutiveWins,
      consecutiveLosses,
      avgConfidence,
      confidenceCorrelation
    };
  }

  /**
   * Get signal history with optional filtering
   */
  getSignalHistory(filter?: SignalFilter): SignalPerformance[] {
    return this.filterSignals(filter);
  }

  /**
   * Get signals for a specific time period
   */
  getSignalsInPeriod(startDate: Date, endDate: Date): SignalPerformance[] {
    return this.signalHistory.filter(p => 
      p.signal.timestamp >= startDate && p.signal.timestamp <= endDate
    );
  }

  /**
   * Calculate signal quality score based on historical performance
   */
  calculateSignalQualityScore(signal: SignalData): number {
    // Find similar historical signals
    const similarSignals = this.findSimilarSignals(signal);
    
    if (similarSignals.length === 0) {
      return 0.5; // Neutral score for new signal types
    }

    const completedSimilar = similarSignals.filter(p => p.outcome !== 'pending');
    if (completedSimilar.length === 0) {
      return 0.5;
    }

    // Calculate success rate of similar signals
    const successRate = completedSimilar.filter(p => p.outcome === 'win').length / completedSimilar.length;
    
    // Adjust for confidence level
    const confidenceWeight = Math.min(signal.confidence / 1000, 1); // Normalize confidence
    
    // Combine success rate and confidence
    return (successRate * 0.7) + (confidenceWeight * 0.3);
  }

  /**
   * Simulate signal exits based on current market data
   */
  simulateSignalExits(currentPrice: number, currentTime: Date): void {
    const pendingSignals = this.signalHistory.filter(p => p.outcome === 'pending');
    
    for (const performance of pendingSignals) {
      const entryTime = performance.signal.timestamp;
      const holdingMinutes = (currentTime.getTime() - entryTime.getTime()) / (1000 * 60);
      
      // Auto-exit after 2 hours or based on simple profit/loss logic
      if (holdingMinutes > 120) {
        this.updateSignalExit(performance.signalId, currentPrice, currentTime);
      }
    }
  }

  // Private helper methods
  private generateSignalId(signal: SignalData): string {
    return `${signal.type}_${signal.timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private filterSignals(filter?: SignalFilter): SignalPerformance[] {
    if (!filter) return [...this.signalHistory];

    return this.signalHistory.filter(performance => {
      const signal = performance.signal;
      
      // Type filter
      if (filter.type && filter.type !== 'all' && signal.type !== filter.type) {
        return false;
      }
      
      // Outcome filter
      if (filter.outcome && filter.outcome !== 'all' && performance.outcome !== filter.outcome) {
        return false;
      }
      
      // Confidence filter
      if (filter.minConfidence !== undefined && signal.confidence < filter.minConfidence) {
        return false;
      }
      if (filter.maxConfidence !== undefined && signal.confidence > filter.maxConfidence) {
        return false;
      }
      
      // Date range filter
      if (filter.dateRange) {
        if (signal.timestamp < filter.dateRange.start || signal.timestamp > filter.dateRange.end) {
          return false;
        }
      }
      
      // P&L filter
      if (filter.minPnL !== undefined && (performance.pnl || 0) < filter.minPnL) {
        return false;
      }
      if (filter.maxPnL !== undefined && (performance.pnl || 0) > filter.maxPnL) {
        return false;
      }
      
      return true;
    });
  }

  private calculateStreaks(signals: SignalPerformance[]): { consecutiveWins: number; consecutiveLosses: number } {
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    // Sort by timestamp
    const sortedSignals = [...signals].sort((a, b) => 
      a.signal.timestamp.getTime() - b.signal.timestamp.getTime()
    );

    for (const signal of sortedSignals) {
      if (signal.outcome === 'win') {
        currentWinStreak++;
        currentLossStreak = 0;
        consecutiveWins = Math.max(consecutiveWins, currentWinStreak);
      } else if (signal.outcome === 'loss') {
        currentLossStreak++;
        currentWinStreak = 0;
        consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
      }
    }

    return { consecutiveWins, consecutiveLosses };
  }

  private calculateConfidenceCorrelation(signals: SignalPerformance[]): number {
    if (signals.length < 2) return 0;

    const confidences = signals.map(p => p.signal.confidence);
    const returns = signals.map(p => (p.pnl || 0) / (p.signal.price * 100));

    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    let numerator = 0;
    let denomConfidence = 0;
    let denomReturn = 0;

    for (let i = 0; i < signals.length; i++) {
      const confDiff = confidences[i] - avgConfidence;
      const retDiff = returns[i] - avgReturn;
      
      numerator += confDiff * retDiff;
      denomConfidence += confDiff * confDiff;
      denomReturn += retDiff * retDiff;
    }

    const denominator = Math.sqrt(denomConfidence * denomReturn);
    return denominator > 0 ? numerator / denominator : 0;
  }

  private findSimilarSignals(signal: SignalData): SignalPerformance[] {
    return this.signalHistory.filter(p => {
      const historical = p.signal;
      
      // Same signal type
      if (historical.type !== signal.type) return false;
      
      // Similar confidence level (within 20%)
      const confidenceDiff = Math.abs(historical.confidence - signal.confidence) / signal.confidence;
      if (confidenceDiff > 0.2) return false;
      
      // Similar MACD value (within 30%)
      const macdDiff = Math.abs(historical.macdValue - signal.macdValue) / Math.abs(signal.macdValue);
      if (macdDiff > 0.3) return false;
      
      return true;
    });
  }

  private getEmptyAnalytics(): SignalAnalytics {
    return {
      totalSignals: 0,
      longSignals: 0,
      shortSignals: 0,
      winRate: 0,
      longWinRate: 0,
      shortWinRate: 0,
      avgPnL: 0,
      avgPnLPips: 0,
      avgHoldingPeriod: 0,
      bestSignal: null,
      worstSignal: null,
      profitFactor: 0,
      sharpeRatio: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      avgConfidence: 0,
      confidenceCorrelation: 0
    };
  }

  private loadStoredData(): void {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('signalAnalytics');
      if (stored) {
        const data = JSON.parse(stored);
        this.signalHistory = data.signalHistory || [];
        this.marketConditions = data.marketConditions || [];

        // Convert date strings back to Date objects
        this.signalHistory.forEach(p => {
          p.signal.timestamp = new Date(p.signal.timestamp);
          if (p.exitTime) p.exitTime = new Date(p.exitTime);
        });

        console.log(`📊 Loaded ${this.signalHistory.length} signals from storage`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load stored signal analytics:', error);
    }
  }

  private saveData(): void {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const data = {
        signalHistory: this.signalHistory,
        marketConditions: this.marketConditions
      };
      localStorage.setItem('signalAnalytics', JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Failed to save signal analytics:', error);
    }
  }
}

// Export singleton instance
export const signalAnalyticsService = new SignalAnalyticsService();
