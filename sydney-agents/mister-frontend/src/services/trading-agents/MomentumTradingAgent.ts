/**
 * Momentum Trading Agent
 * 
 * Simple momentum-based trading strategy that analyzes ADA price movements
 * and generates buy/sell signals based on momentum indicators.
 */

import { AgentTradingSignal } from '../agent-wallets/AgentStrikeTrader';

export interface PriceDataPoint {
  timestamp: number;
  price: number;
  volume?: number;
}

export interface MomentumAnalysis {
  momentum: number; // -1 to 1 (bearish to bullish)
  trend: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0 to 1
  priceChange: number;
  volumeChange?: number;
}

export class MomentumTradingAgent {
  private agentId: string = 'momentum-trader-v1';
  private priceHistory: PriceDataPoint[] = [];
  private lastSignalTime: number = 0;
  private minSignalInterval: number = 5 * 60 * 1000; // 5 minutes
  private readonly stopLossPercentage = 0.05; // 5%
  private readonly takeProfitPercentage = 0.10; // 10%

  constructor() {
    console.log(`🤖 Momentum Trading Agent initialized (ID: ${this.agentId})`);
  }

  /**
   * Add new price data point
   */
  addPriceData(price: number, timestamp: number = Date.now(), volume?: number): void {
    this.priceHistory.push({ timestamp, price, volume });
    
    // Keep only last 100 data points for performance
    if (this.priceHistory.length > 100) {
      this.priceHistory = this.priceHistory.slice(-100);
    }
    
    console.log(`📊 Added price data: $${price} at ${new Date(timestamp).toISOString()}`);
  }

  /**
   * Analyze momentum based on recent price history
   */
  analyzeMomentum(): MomentumAnalysis {
    if (this.priceHistory.length < 10) {
      return {
        momentum: 0,
        trend: 'neutral',
        confidence: 0,
        priceChange: 0
      };
    }

    const recent = this.priceHistory.slice(-10); // Last 10 data points
    const older = this.priceHistory.slice(-20, -10); // Previous 10 data points
    
    const recentAvg = recent.reduce((sum, point) => sum + point.price, 0) / recent.length;
    const olderAvg = older.length > 0 
      ? older.reduce((sum, point) => sum + point.price, 0) / older.length 
      : recentAvg;
    
    const priceChange = (recentAvg - olderAvg) / olderAvg;
    const momentum = Math.max(-1, Math.min(1, priceChange * 10)); // Scale and clamp
    
    // Calculate confidence based on consistency of direction
    const priceChanges = recent.slice(1).map((point, i) => 
      (point.price - recent[i].price) / recent[i].price
    );
    
    const positiveChanges = priceChanges.filter(change => change > 0).length;
    const consistencyRatio = Math.abs(positiveChanges - (priceChanges.length / 2)) / (priceChanges.length / 2);
    const confidence = Math.min(1, consistencyRatio * Math.abs(momentum) * 2);
    
    const trend = momentum > 0.1 ? 'bullish' : momentum < -0.1 ? 'bearish' : 'neutral';
    
    const analysis: MomentumAnalysis = {
      momentum,
      trend,
      confidence,
      priceChange
    };

    console.log(`📈 Momentum Analysis:`, analysis);
    return analysis;
  }

  /**
   * Generate trading signal based on momentum analysis
   */
  generateTradingSignal(currentPrice: number): AgentTradingSignal | null {
    const now = Date.now();
    
    // Rate limiting: Don't generate signals too frequently
    if (now - this.lastSignalTime < this.minSignalInterval) {
      console.log('⏰ Signal generation rate limited');
      return null;
    }

    const analysis = this.analyzeMomentum();
    
    // Signal generation thresholds
    const minConfidence = 0.4;
    const minMomentum = 0.3;
    
    if (analysis.confidence < minConfidence) {
      console.log(`🤔 Confidence too low: ${analysis.confidence} < ${minConfidence}`);
      return null;
    }

    let signal: AgentTradingSignal | null = null;

    // Bullish signal
    if (analysis.momentum > minMomentum && analysis.trend === 'bullish') {
      signal = {
        agentId: this.agentId,
        signal: 'buy',
        confidence: analysis.confidence,
        reasoning: `Strong bullish momentum detected (${analysis.momentum.toFixed(3)}) with ${(analysis.priceChange * 100).toFixed(2)}% price increase`,
        maxPositionSize: this.calculatePositionSize(analysis.confidence),
        stopLoss: currentPrice * (1 - this.stopLossPercentage),
        takeProfit: currentPrice * (1 + this.takeProfitPercentage)
      };
    }
    // Bearish signal (for short positions)
    else if (analysis.momentum < -minMomentum && analysis.trend === 'bearish') {
      signal = {
        agentId: this.agentId,
        signal: 'sell',
        confidence: analysis.confidence,
        reasoning: `Strong bearish momentum detected (${analysis.momentum.toFixed(3)}) with ${(analysis.priceChange * 100).toFixed(2)}% price decrease`,
        maxPositionSize: this.calculatePositionSize(analysis.confidence),
        stopLoss: currentPrice * (1 + this.stopLossPercentage),
        takeProfit: currentPrice * (1 - this.takeProfitPercentage)
      };
    }

    if (signal) {
      this.lastSignalTime = now;
      console.log(`🚨 Trading Signal Generated:`, signal);
    } else {
      console.log('🔇 No signal generated - conditions not met');
    }

    return signal;
  }

  /**
   * Calculate position size based on confidence
   */
  private calculatePositionSize(confidence: number): number {
    const baseSize = 40; // Minimum for Strike Finance
    const maxSize = 100;
    
    // Scale position size with confidence (40-100 ADA range)
    const positionSize = baseSize + (confidence * (maxSize - baseSize));
    return Math.round(positionSize);
  }

  /**
   * Simulate price feed for testing
   */
  async simulatePriceFeed(duration: number = 60000, interval: number = 5000): Promise<void> {
    console.log(`📡 Starting simulated price feed for ${duration / 1000} seconds...`);
    
    let currentPrice = 0.45; // Starting ADA price
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      // Simulate price movement
      const volatility = 0.02; // 2% max change per tick
      const randomChange = (Math.random() - 0.5) * volatility;
      currentPrice = Math.max(0.01, currentPrice * (1 + randomChange));
      
      this.addPriceData(currentPrice);
      
      // Generate and log signals
      const signal = this.generateTradingSignal(currentPrice);
      if (signal) {
        console.log(`🎯 Signal: ${signal.signal.toUpperCase()} ${signal.maxPositionSize} ADA (${(signal.confidence * 100).toFixed(1)}% confidence)`);
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    console.log('📊 Price feed simulation completed');
  }

  /**
   * Get agent status and statistics
   */
  getStatus(): {
    agentId: string;
    priceDataPoints: number;
    lastPrice?: number;
    lastSignalTime: number;
    isActive: boolean;
  } {
    const lastPoint = this.priceHistory[this.priceHistory.length - 1];
    
    return {
      agentId: this.agentId,
      priceDataPoints: this.priceHistory.length,
      lastPrice: lastPoint?.price,
      lastSignalTime: this.lastSignalTime,
      isActive: this.priceHistory.length > 0 && (Date.now() - (lastPoint?.timestamp || 0)) < 30000
    };
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.priceHistory = [];
    this.lastSignalTime = 0;
    console.log(`🔄 Agent ${this.agentId} reset`);
  }
}

// Export singleton instance
export const momentumTradingAgent = new MomentumTradingAgent();

// Export factory function
export function createMomentumTradingAgent(): MomentumTradingAgent {
  return new MomentumTradingAgent();
}