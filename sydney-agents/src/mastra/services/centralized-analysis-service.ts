/**
 * Centralized Analysis Service
 * 
 * Manages all trading agent analysis on fixed server-side schedules
 * to prevent API overload and ensure consistent data for all users
 */

import { Mastra } from '@mastra/core';

interface FibonacciAnalysis {
  timestamp: string;
  currentPrice: number;
  rsi: number;
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  volume: number;
  fibonacciLevels: {
    level: string;
    price: number;
    distance: number;
    isSupport: boolean;
    isResistance: boolean;
  }[];
  swingHigh: { price: number; time: string };
  swingLow: { price: number; time: string };
  signal: {
    action: 'BUY' | 'SELL' | 'HOLD';
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    confidence: number;
    reason: string;
    fibLevel: string;
    riskReward: number;
  };
  performance: {
    winRate: number;
    totalTrades: number;
    profitFactor: number;
    avgReturn: number;
    maxDrawdown: number;
  };
  watchingFor: string; // What the agent is currently watching for
  nextLevelToWatch: { level: string; price: number; type: 'support' | 'resistance' };
}

interface CachedAnalysis {
  fibonacci: FibonacciAnalysis | null;
  lastUpdated: {
    fibonacci: string | null;
  };
}

class CentralizedAnalysisService {
  private static instance: CentralizedAnalysisService;
  private mastra: Mastra;
  private cache: CachedAnalysis = {
    fibonacci: null,
    lastUpdated: {
      fibonacci: null
    }
  };
  private intervals: { [key: string]: NodeJS.Timeout } = {};

  private constructor() {
    // Initialize Mastra instance
    this.mastra = new Mastra({
      name: 'centralized-analysis',
      agents: [], // Will be populated with deployed agents
    });
  }

  public static getInstance(): CentralizedAnalysisService {
    if (!CentralizedAnalysisService.instance) {
      CentralizedAnalysisService.instance = new CentralizedAnalysisService();
    }
    return CentralizedAnalysisService.instance;
  }

  /**
   * Start all analysis schedules
   */
  public startAnalysisSchedules(): void {
    console.log('🚀 Starting centralized analysis schedules...');
    
    // Fibonacci Agent: Every 5 minutes
    this.intervals.fibonacci = setInterval(async () => {
      await this.runFibonacciAnalysis();
    }, 5 * 60 * 1000); // 5 minutes

    // Run initial analysis immediately
    setTimeout(() => this.runFibonacciAnalysis(), 5000);
    
    console.log('✅ Analysis schedules started:');
    console.log('   📊 Fibonacci Agent: Every 5 minutes');
  }

  /**
   * Stop all analysis schedules
   */
  public stopAnalysisSchedules(): void {
    console.log('🛑 Stopping analysis schedules...');
    Object.values(this.intervals).forEach(interval => clearInterval(interval));
    this.intervals = {};
  }

  /**
   * Run Fibonacci analysis and cache results
   */
  private async runFibonacciAnalysis(): Promise<void> {
    try {
      console.log('🔢 Running Fibonacci analysis...');
      
      // Call the deployed Fibonacci agent on Mastra Cloud
      const response = await fetch('https://substantial-scarce-magazin.mastra.cloud/api/agents/fibonacciAgent/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: ['Use the fibonacciStrategyTool to analyze current ADA/USD market conditions, provide detailed Fibonacci levels, and specify what you are watching for next entry'],
          options: {
            memory: {
              thread: `fibonacci-centralized-${Date.now()}`,
              resource: 'centralized-service'
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Fibonacci agent API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the response
      let parsedResults;
      try {
        const textResponse = data.text || '';
        const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/);
        
        if (jsonMatch && jsonMatch[1]) {
          parsedResults = JSON.parse(jsonMatch[1]);
        } else {
          const cleanText = textResponse.replace(/```json\n?|\n?```/g, '');
          parsedResults = JSON.parse(cleanText);
        }
      } catch (parseError) {
        console.error('❌ Failed to parse Fibonacci agent response:', parseError);
        return;
      }

      if (parsedResults.success && parsedResults.results) {
        const results = parsedResults.results;
        
        // Create enhanced analysis with watching conditions
        const analysis: FibonacciAnalysis = {
          timestamp: new Date().toISOString(),
          currentPrice: results.analysis.currentPrice,
          rsi: results.analysis.rsi,
          trend: results.analysis.trend,
          volume: results.analysis.volume,
          fibonacciLevels: results.analysis.fibonacciLevels || [],
          swingHigh: results.analysis.swingHigh,
          swingLow: results.analysis.swingLow,
          signal: results.signal,
          performance: results.performance,
          watchingFor: this.generateWatchingCondition(results),
          nextLevelToWatch: this.getNextLevelToWatch(results)
        };

        // Cache the analysis
        this.cache.fibonacci = analysis;
        this.cache.lastUpdated.fibonacci = new Date().toISOString();
        
        console.log('✅ Fibonacci analysis cached successfully');
        console.log(`📊 Current Price: $${analysis.currentPrice}`);
        console.log(`🎯 Watching for: ${analysis.watchingFor}`);
        
      } else {
        console.error('❌ Invalid Fibonacci analysis response structure');
      }

    } catch (error) {
      console.error('❌ Fibonacci analysis failed:', error);
    }
  }

  /**
   * Generate human-readable watching condition
   */
  private generateWatchingCondition(results: any): string {
    const signal = results.signal;
    const analysis = results.analysis;
    const currentPrice = analysis.currentPrice;
    
    if (signal.action === 'BUY') {
      return `BUY signal active at ${signal.fibLevel} level ($${signal.entryPrice.toFixed(4)})`;
    } else if (signal.action === 'SELL') {
      return `SELL signal active at ${signal.fibLevel} level ($${signal.entryPrice.toFixed(4)})`;
    } else {
      // HOLD - determine what we're watching for
      const fibLevels = analysis.fibonacciLevels || [];
      
      if (fibLevels.length > 0) {
        // Find the closest Fibonacci level
        const closestLevel = fibLevels.reduce((closest, level) => {
          const currentDistance = Math.abs(currentPrice - level.price);
          const closestDistance = Math.abs(currentPrice - closest.price);
          return currentDistance < closestDistance ? level : closest;
        });
        
        if (currentPrice > closestLevel.price) {
          return `Watching for pullback to ${closestLevel.level} support at $${closestLevel.price.toFixed(4)}`;
        } else {
          return `Watching for breakout above ${closestLevel.level} resistance at $${closestLevel.price.toFixed(4)}`;
        }
      }
      
      return `Monitoring price action for Fibonacci setup development`;
    }
  }

  /**
   * Get the next key level to watch
   */
  private getNextLevelToWatch(results: any): { level: string; price: number; type: 'support' | 'resistance' } {
    const analysis = results.analysis;
    const currentPrice = analysis.currentPrice;
    const fibLevels = analysis.fibonacciLevels || [];
    
    if (fibLevels.length === 0) {
      return { level: 'N/A', price: currentPrice, type: 'support' };
    }
    
    // Find the closest level above and below current price
    const levelsBelow = fibLevels.filter(level => level.price < currentPrice);
    const levelsAbove = fibLevels.filter(level => level.price > currentPrice);
    
    if (analysis.trend === 'UPTREND' && levelsBelow.length > 0) {
      // In uptrend, watch for support below
      const closestSupport = levelsBelow.reduce((closest, level) => 
        Math.abs(currentPrice - level.price) < Math.abs(currentPrice - closest.price) ? level : closest
      );
      return { level: closestSupport.level, price: closestSupport.price, type: 'support' };
    } else if (analysis.trend === 'DOWNTREND' && levelsAbove.length > 0) {
      // In downtrend, watch for resistance above
      const closestResistance = levelsAbove.reduce((closest, level) => 
        Math.abs(currentPrice - level.price) < Math.abs(currentPrice - closest.price) ? level : closest
      );
      return { level: closestResistance.level, price: closestResistance.price, type: 'resistance' };
    } else {
      // Sideways or no clear direction, watch closest level
      const closestLevel = fibLevels.reduce((closest, level) => 
        Math.abs(currentPrice - level.price) < Math.abs(currentPrice - closest.price) ? level : closest
      );
      const type = currentPrice > closestLevel.price ? 'support' : 'resistance';
      return { level: closestLevel.level, price: closestLevel.price, type };
    }
  }

  /**
   * Get cached Fibonacci analysis
   */
  public getFibonacciAnalysis(): FibonacciAnalysis | null {
    return this.cache.fibonacci;
  }

  /**
   * Get last update time for Fibonacci analysis
   */
  public getFibonacciLastUpdate(): string | null {
    return this.cache.lastUpdated.fibonacci;
  }

  /**
   * Get all cached analysis data
   */
  public getAllAnalysis(): CachedAnalysis {
    return this.cache;
  }

  /**
   * Check if analysis is fresh (within expected interval)
   */
  public isAnalysisFresh(analysisType: 'fibonacci'): boolean {
    const lastUpdate = this.cache.lastUpdated[analysisType];
    if (!lastUpdate) return false;
    
    const now = new Date().getTime();
    const lastUpdateTime = new Date(lastUpdate).getTime();
    const maxAge = analysisType === 'fibonacci' ? 6 * 60 * 1000 : 5 * 60 * 1000; // 6 minutes for fibonacci
    
    return (now - lastUpdateTime) < maxAge;
  }
}

export default CentralizedAnalysisService;
export type { FibonacciAnalysis, CachedAnalysis };
