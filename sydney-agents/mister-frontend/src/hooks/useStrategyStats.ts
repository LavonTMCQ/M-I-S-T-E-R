import { useState, useEffect, useCallback } from 'react';

export interface StrategyPerformance {
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  avgReturn: number;
  maxDrawdown: number;
  totalPnl: number;
  sharpeRatio: number;
}

export interface StrategyData {
  id: string;
  name: string;
  description: string;
  status: string;
  lastUpdate: string;
  performance: StrategyPerformance;
  features: string[];
  risk: string;
  leverage: string;
  minAmount: number;
  timeframe: string;
  error?: string;
}

export interface StrategyStatsResponse {
  success: boolean;
  timestamp: string;
  strategies: {
    [key: string]: StrategyData;
  };
}

/**
 * Custom hook for managing real-time strategy statistics
 * Ensures all components show consistent, up-to-date backtest results
 */
export function useStrategyStats(strategyId?: string) {
  const [strategies, setStrategies] = useState<{ [key: string]: StrategyData }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  /**
   * Fetch latest strategy statistics from API
   */
  const fetchStrategyStats = useCallback(async () => {
    try {
      console.log('📊 Fetching latest strategy statistics...');
      setLoading(true);
      setError(null);

      const response = await fetch('/api/trading/strategy-stats');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: StrategyStatsResponse = await response.json();
      
      if (data.success && data.strategies) {
        setStrategies(data.strategies);
        setLastUpdate(data.timestamp);
        console.log('✅ Strategy stats updated:', Object.keys(data.strategies).length, 'strategies');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Failed to fetch strategy stats:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update strategy statistics after a new backtest run
   */
  const updateStrategyStats = useCallback(async (strategyId: string, results: any) => {
    try {
      console.log(`📈 Updating stats for strategy: ${strategyId}`);
      
      const response = await fetch('/api/trading/strategy-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategyId,
          results
        })
      });

      if (response.ok) {
        console.log('✅ Strategy stats updated successfully');
        // Refresh the data to get latest stats
        await fetchStrategyStats();
        return true;
      } else {
        throw new Error(`Failed to update strategy stats: ${response.statusText}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Failed to update strategy stats:', errorMessage);
      setError(errorMessage);
      return false;
    }
  }, [fetchStrategyStats]);

  /**
   * Get specific strategy data
   */
  const getStrategy = useCallback((id: string): StrategyData | null => {
    return strategies[id] || null;
  }, [strategies]);

  /**
   * Get Fibonacci strategy specifically (most commonly used)
   */
  const getFibonacciStrategy = useCallback((): StrategyData | null => {
    return getStrategy('fibonacci-retracement');
  }, [getStrategy]);

  /**
   * Check if strategy has real data (not just defaults)
   */
  const hasRealData = useCallback((id: string): boolean => {
    const strategy = getStrategy(id);
    return strategy ? strategy.performance.totalTrades > 0 : false;
  }, [getStrategy]);

  // Initial fetch on mount
  useEffect(() => {
    fetchStrategyStats();
  }, [fetchStrategyStats]);

  // Auto-refresh every 5 minutes to catch updates from other sources
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing strategy stats...');
      fetchStrategyStats();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchStrategyStats]);

  return {
    // Data
    strategies,
    loading,
    error,
    lastUpdate,
    
    // Actions
    fetchStrategyStats,
    updateStrategyStats,
    
    // Helpers
    getStrategy,
    getFibonacciStrategy,
    hasRealData,
    
    // Specific strategy (if requested)
    currentStrategy: strategyId ? getStrategy(strategyId) : null
  };
}

/**
 * Simplified hook for components that only need Fibonacci stats
 */
export function useFibonacciStats() {
  const { getFibonacciStrategy, loading, error, updateStrategyStats, hasRealData } = useStrategyStats();
  
  return {
    fibonacciStrategy: getFibonacciStrategy(),
    loading,
    error,
    updateStrategyStats: (results: any) => updateStrategyStats('fibonacci-retracement', results),
    hasRealData: hasRealData('fibonacci-retracement')
  };
}
