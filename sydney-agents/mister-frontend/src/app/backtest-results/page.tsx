'use client';

import React, { useState, useEffect } from 'react';
import { StrategySelector, TradingStrategy } from '@/components/backtesting/StrategySelector';
import { ImprovedBacktestResults } from '@/components/backtesting/ImprovedBacktestResults';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play } from 'lucide-react';

// Sample backtest data for different strategies
const strategyResults = {
  'multi-timeframe-ada': {
    runId: 'backtest_MultiTimeframeADAStrategy_e77532aed0a80',
    strategy: 'Multi-Timeframe ADA Strategy',
    symbol: 'ADAUSD',
    timeframe: '15m',
    startDate: '2025-04-01T00:00:00Z',
    endDate: '2025-06-30T23:59:59Z',
    totalNetPnl: 2736.12,
    winRate: 66.67,
    maxDrawdown: 8.20,
    sharpeRatio: 2.30,
    totalTrades: 45,
    avgTradeDuration: 480, // 8 hours in minutes
  trades: [
    {
      id: 'trade_1',
      entryTime: '2025-06-23T09:15:00Z',
      exitTime: '2025-06-23T15:30:00Z',
      side: 'SHORT' as const,
      entryPrice: 0.5805,
      exitPrice: 0.5652,
      size: 86206.90, // $50000 / 0.5805
      netPnl: 1314.49,
      reason: 'RSI extremely oversold (20-)',
      duration: 375
    },
    {
      id: 'trade_2',
      entryTime: '2025-06-23T16:00:00Z',
      exitTime: '2025-06-23T18:45:00Z',
      side: 'SHORT' as const,
      entryPrice: 0.5652,
      exitPrice: 0.5638,
      size: 88495.58,
      netPnl: 125.89,
      reason: 'RSI extremely oversold (20-)',
      duration: 165
    },
    {
      id: 'trade_3',
      entryTime: '2025-06-24T08:30:00Z',
      exitTime: '2025-06-25T20:30:00Z',
      side: 'SHORT' as const,
      entryPrice: 0.5638,
      exitPrice: 0.5581,
      size: 88707.48,
      netPnl: 506.94,
      reason: 'Trend max time (36h)',
      duration: 2160
    },
    {
      id: 'trade_4',
      entryTime: '2025-06-25T21:00:00Z',
      exitTime: '2025-06-26T02:15:00Z',
      side: 'SHORT' as const,
      entryPrice: 0.5581,
      exitPrice: 0.5612,
      size: 89634.12,
      netPnl: -380.43,
      reason: 'Stop loss hit',
      duration: 315
    },
    {
      id: 'trade_5',
      entryTime: '2025-06-26T10:30:00Z',
      exitTime: '2025-06-26T18:30:00Z',
      side: 'SHORT' as const,
      entryPrice: 0.5623,
      exitPrice: 0.5611,
      size: 88945.23,
      netPnl: 105.73,
      reason: 'Momentum max time (8h)',
      duration: 480
    },
    {
      id: 'trade_6',
      entryTime: '2025-06-26T19:00:00Z',
      exitTime: '2025-06-27T01:45:00Z',
      side: 'SHORT' as const,
      entryPrice: 0.5611,
      exitPrice: 0.5673,
      size: 89123.45,
      netPnl: -610.30,
      reason: 'Stop loss hit',
      duration: 405
    },
    {
      id: 'trade_7',
      entryTime: '2025-06-27T11:15:00Z',
      exitTime: '2025-06-27T19:15:00Z',
      side: 'SHORT' as const,
      entryPrice: 0.5680,
      exitPrice: 0.5636,
      size: 88028.17,
      netPnl: 384.44,
      reason: 'Momentum max time (8h)',
      duration: 480
    },
    {
      id: 'trade_8',
      entryTime: '2025-06-28T09:00:00Z',
      exitTime: '2025-06-28T17:00:00Z',
      side: 'SHORT' as const,
      entryPrice: 0.5636,
      exitPrice: 0.5649,
      size: 88707.48,
      netPnl: -120.21,
      reason: 'Momentum max time (8h)',
      duration: 480
    },
    {
      id: 'trade_9',
      entryTime: '2025-06-28T20:30:00Z',
      exitTime: '2025-06-29T04:30:00Z',
      side: 'SHORT' as const,
      entryPrice: 0.5649,
      exitPrice: 0.5559,
      size: 88523.67,
      netPnl: 796.97,
      reason: 'Momentum profit target (80%)',
      duration: 480
    },
    {
      id: 'trade_10',
      entryTime: '2025-06-29T12:15:00Z',
      exitTime: '2025-06-29T18:45:00Z',
      side: 'SHORT' as const,
      entryPrice: 0.5559,
      exitPrice: 0.5624,
      size: 89945.23,
      netPnl: -993.71,
      reason: 'Stop loss hit',
      duration: 390
    },
    {
      id: 'trade_11',
      entryTime: '2025-06-30T08:00:00Z',
      exitTime: '2025-06-30T14:30:00Z',
      side: 'LONG' as const,
      entryPrice: 0.5670,
      exitPrice: 0.5809,
      size: 88183.42,
      netPnl: 1227.09,
      reason: 'Take profit hit',
      duration: 390
    },
    {
      id: 'trade_12',
      entryTime: '2025-06-30T15:00:00Z',
      exitTime: '2025-06-30T23:59:00Z',
      side: 'SHORT' as const,
      entryPrice: 0.5809,
      exitPrice: 0.5862,
      size: 86123.45,
      netPnl: -456.78,
      reason: 'End of backtest period',
      duration: 539
    }
  ],
  chartData: [
    // Comprehensive 15-minute chart data showing detailed price action between trades
    // Pre-trade setup (June 23, 2025 - before first SHORT entry at 09:15)
    { time: '2025-06-23T08:00:00Z', open: 0.5780, high: 0.5795, low: 0.5775, close: 0.5790 },
    { time: '2025-06-23T08:15:00Z', open: 0.5790, high: 0.5800, low: 0.5785, close: 0.5795 },
    { time: '2025-06-23T08:30:00Z', open: 0.5795, high: 0.5810, low: 0.5790, close: 0.5805 },
    { time: '2025-06-23T08:45:00Z', open: 0.5805, high: 0.5815, low: 0.5800, close: 0.5810 },
    { time: '2025-06-23T09:00:00Z', open: 0.5810, high: 0.5820, low: 0.5800, close: 0.5805 },

    // First trade period: SHORT entry at 09:15 ($0.5805) to exit at 15:30 ($0.5652)
    { time: '2025-06-23T09:15:00Z', open: 0.5805, high: 0.5810, low: 0.5800, close: 0.5802 }, // Entry candle
    { time: '2025-06-23T09:30:00Z', open: 0.5802, high: 0.5808, low: 0.5795, close: 0.5798 },
    { time: '2025-06-23T09:45:00Z', open: 0.5798, high: 0.5805, low: 0.5790, close: 0.5792 },
    { time: '2025-06-23T10:00:00Z', open: 0.5792, high: 0.5800, low: 0.5785, close: 0.5788 },
    { time: '2025-06-23T10:15:00Z', open: 0.5788, high: 0.5795, low: 0.5780, close: 0.5782 },
    { time: '2025-06-23T10:30:00Z', open: 0.5782, high: 0.5790, low: 0.5775, close: 0.5778 },
    { time: '2025-06-23T10:45:00Z', open: 0.5778, high: 0.5785, low: 0.5770, close: 0.5772 },
    { time: '2025-06-23T11:00:00Z', open: 0.5772, high: 0.5780, low: 0.5765, close: 0.5768 },
    { time: '2025-06-23T11:15:00Z', open: 0.5768, high: 0.5775, low: 0.5760, close: 0.5762 },
    { time: '2025-06-23T11:30:00Z', open: 0.5762, high: 0.5770, low: 0.5755, close: 0.5758 },
    { time: '2025-06-23T11:45:00Z', open: 0.5758, high: 0.5765, low: 0.5750, close: 0.5752 },
    { time: '2025-06-23T12:00:00Z', open: 0.5752, high: 0.5760, low: 0.5745, close: 0.5748 },
    { time: '2025-06-23T12:15:00Z', open: 0.5748, high: 0.5755, low: 0.5740, close: 0.5742 },
    { time: '2025-06-23T12:30:00Z', open: 0.5742, high: 0.5750, low: 0.5735, close: 0.5738 },
    { time: '2025-06-23T12:45:00Z', open: 0.5738, high: 0.5745, low: 0.5730, close: 0.5732 },
    { time: '2025-06-23T13:00:00Z', open: 0.5732, high: 0.5740, low: 0.5725, close: 0.5728 },
    { time: '2025-06-23T13:15:00Z', open: 0.5728, high: 0.5735, low: 0.5720, close: 0.5722 },
    { time: '2025-06-23T13:30:00Z', open: 0.5722, high: 0.5730, low: 0.5715, close: 0.5718 },
    { time: '2025-06-23T13:45:00Z', open: 0.5718, high: 0.5725, low: 0.5710, close: 0.5712 },
    { time: '2025-06-23T14:00:00Z', open: 0.5712, high: 0.5720, low: 0.5705, close: 0.5708 },
    { time: '2025-06-23T14:15:00Z', open: 0.5708, high: 0.5715, low: 0.5700, close: 0.5702 },
    { time: '2025-06-23T14:30:00Z', open: 0.5702, high: 0.5710, low: 0.5695, close: 0.5698 },
    { time: '2025-06-23T14:45:00Z', open: 0.5698, high: 0.5705, low: 0.5690, close: 0.5692 },
    { time: '2025-06-23T15:00:00Z', open: 0.5692, high: 0.5700, low: 0.5685, close: 0.5688 },
    { time: '2025-06-23T15:15:00Z', open: 0.5688, high: 0.5695, low: 0.5680, close: 0.5682 },
    { time: '2025-06-23T15:30:00Z', open: 0.5682, high: 0.5690, low: 0.5650, close: 0.5652 }, // Exit candle

    // Between trades: Brief consolidation before second SHORT entry at 16:00 ($0.5652)
    { time: '2025-06-23T15:45:00Z', open: 0.5652, high: 0.5660, low: 0.5648, close: 0.5655 },
    { time: '2025-06-23T16:00:00Z', open: 0.5655, high: 0.5658, low: 0.5650, close: 0.5652 }, // Second entry
    { time: '2025-06-23T16:15:00Z', open: 0.5652, high: 0.5655, low: 0.5645, close: 0.5648 },
    { time: '2025-06-23T16:30:00Z', open: 0.5648, high: 0.5652, low: 0.5640, close: 0.5642 },
    { time: '2025-06-23T16:45:00Z', open: 0.5642, high: 0.5648, low: 0.5635, close: 0.5638 },
    { time: '2025-06-23T17:00:00Z', open: 0.5638, high: 0.5642, low: 0.5632, close: 0.5635 },
    { time: '2025-06-23T17:15:00Z', open: 0.5635, high: 0.5640, low: 0.5630, close: 0.5632 },
    { time: '2025-06-23T17:30:00Z', open: 0.5632, high: 0.5638, low: 0.5628, close: 0.5630 },
    { time: '2025-06-23T17:45:00Z', open: 0.5630, high: 0.5635, low: 0.5625, close: 0.5628 },
    { time: '2025-06-23T18:00:00Z', open: 0.5628, high: 0.5632, low: 0.5622, close: 0.5625 },
    { time: '2025-06-23T18:15:00Z', open: 0.5625, high: 0.5630, low: 0.5620, close: 0.5622 },
    { time: '2025-06-23T18:30:00Z', open: 0.5622, high: 0.5628, low: 0.5618, close: 0.5620 },
    { time: '2025-06-23T18:45:00Z', open: 0.5620, high: 0.5625, low: 0.5615, close: 0.5618 } // Second exit around here
  ] // Detailed 15-minute candles showing all price action between trades
  },
  'fibonacci-retracement': {
    runId: 'backtest_FibonacciStrategy_f88643bed1b91',
    strategy: 'Fibonacci Retracement Strategy',
    symbol: 'ADAUSD',
    timeframe: '15m',
    startDate: '2025-04-01T00:00:00Z',
    endDate: '2025-06-30T23:59:59Z',
    totalNetPnl: 1890.45,
    winRate: 71.0,
    maxDrawdown: 5.2,
    sharpeRatio: 2.1,
    totalTrades: 31,
    avgTradeDuration: 420, // 7 hours in minutes
    trades: [
      {
        id: 'fib_trade_1',
        entryTime: '2025-06-15T10:30:00Z',
        exitTime: '2025-06-15T16:45:00Z',
        side: 'LONG' as const,
        entryPrice: 0.7421, // 61.8% Fibonacci support
        exitPrice: 0.7563, // 23.6% Fibonacci resistance
        size: 67340.25,
        netPnl: 956.32,
        reason: 'Bounce from 61.8% Fibonacci support',
        duration: 375
      },
      {
        id: 'fib_trade_2',
        entryTime: '2025-06-18T14:15:00Z',
        exitTime: '2025-06-18T19:30:00Z',
        side: 'SHORT' as const,
        entryPrice: 0.7563, // 23.6% Fibonacci resistance
        exitPrice: 0.7465, // 50% Fibonacci support
        size: 66225.17,
        netPnl: 649.07,
        reason: 'Rejection at 23.6% Fibonacci resistance',
        duration: 315
      },
      {
        id: 'fib_trade_3',
        entryTime: '2025-06-22T09:00:00Z',
        exitTime: '2025-06-22T15:15:00Z',
        side: 'LONG' as const,
        entryPrice: 0.7319, // 38.2% Fibonacci support
        exitPrice: 0.7509, // Near 50% Fibonacci level
        size: 68450.89,
        netPnl: 1300.57,
        reason: 'Strong bounce from 38.2% Fibonacci support',
        duration: 375
      }
    ],
    chartData: [
      // Fibonacci-based chart data showing key levels
      { time: '2025-06-15T08:00:00Z', open: 0.7450, high: 0.7465, low: 0.7435, close: 0.7440 },
      { time: '2025-06-15T08:15:00Z', open: 0.7440, high: 0.7445, low: 0.7425, close: 0.7430 },
      { time: '2025-06-15T08:30:00Z', open: 0.7430, high: 0.7435, low: 0.7420, close: 0.7425 },
      { time: '2025-06-15T08:45:00Z', open: 0.7425, high: 0.7430, low: 0.7415, close: 0.7421 },
      { time: '2025-06-15T09:00:00Z', open: 0.7421, high: 0.7425, low: 0.7418, close: 0.7420 },
      // Entry at 61.8% support
      { time: '2025-06-15T10:30:00Z', open: 0.7420, high: 0.7425, low: 0.7418, close: 0.7421 },
      { time: '2025-06-15T10:45:00Z', open: 0.7421, high: 0.7435, low: 0.7420, close: 0.7430 },
      { time: '2025-06-15T11:00:00Z', open: 0.7430, high: 0.7445, low: 0.7428, close: 0.7440 },
      // Move towards 23.6% resistance
      { time: '2025-06-15T15:30:00Z', open: 0.7555, high: 0.7565, low: 0.7550, close: 0.7560 },
      { time: '2025-06-15T15:45:00Z', open: 0.7560, high: 0.7568, low: 0.7558, close: 0.7563 },
      // Exit at 23.6% resistance
      { time: '2025-06-15T16:45:00Z', open: 0.7563, high: 0.7565, low: 0.7560, close: 0.7563 }
    ]
  }
};

export default function BacktestResultsPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<TradingStrategy | null>(null);
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);
  const [backtestResults, setBacktestResults] = useState<any>(null);

  const handleStrategySelect = (strategy: TradingStrategy) => {
    setSelectedStrategy(strategy);
    setBacktestResults(null);
  };

  const handleRunBacktest = async () => {
    if (!selectedStrategy) return;

    setIsRunningBacktest(true);

    try {
      if (selectedStrategy.id === 'fibonacci-retracement') {
        // Run real Fibonacci backtest
        console.log('🔢 Running real Fibonacci backtest...');

        // Use REAL-TIME dates like Fibonacci agent (recent data that exists)
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days

        const response = await fetch('/api/backtest/fibonacci', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            symbol: 'ADAUSD'
          })
        });

        if (response.ok) {
          const realResults = await response.json();
          console.log('✅ Real Fibonacci backtest completed:', realResults);
          setBacktestResults(realResults);
        } else {
          console.warn('⚠️ Real backtest failed, using sample data');
          const results = strategyResults[selectedStrategy.id as keyof typeof strategyResults];
          setBacktestResults(results);
        }
      } else if (selectedStrategy.id === 'multi-timeframe') {
        // Run real Multi-Timeframe backtest
        console.log('📊 Running real Multi-Timeframe backtest...');

        // NO DATES - Use count approach like Fibonacci agent
        const response = await fetch('/api/backtest/multi-timeframe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: 'ADAUSD'
          })
        });

        if (response.ok) {
          const realResults = await response.json();
          console.log('✅ Real Multi-Timeframe backtest completed:', realResults);
          setBacktestResults(realResults);
        } else {
          console.warn('⚠️ Real backtest failed, using sample data');
          const results = strategyResults[selectedStrategy.id as keyof typeof strategyResults];
          setBacktestResults(results);
        }
      } else {
        // Use sample data for other strategies
        const results = strategyResults[selectedStrategy.id as keyof typeof strategyResults];
        setBacktestResults(results);
      }
    } catch (error) {
      console.error('❌ Backtest error:', error);
      // Fallback to sample data
      const results = strategyResults[selectedStrategy.id as keyof typeof strategyResults];
      setBacktestResults(results);
    }

    setIsRunningBacktest(false);
  };

  const handleBackToSelection = () => {
    setSelectedStrategy(null);
    setBacktestResults(null);
    setIsRunningBacktest(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {!selectedStrategy ? (
          <StrategySelector
            selectedStrategy={null}
            onStrategySelect={handleStrategySelect}
          />
        ) : (
          <div className="space-y-6">
            {/* Back button and run controls */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleBackToSelection}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Strategy Selection
              </Button>

              {!backtestResults && !isRunningBacktest && (
                <Button
                  onClick={handleRunBacktest}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Run Backtest
                </Button>
              )}
            </div>

            {/* Strategy info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2">{selectedStrategy.name}</h2>
              <p className="text-muted-foreground">{selectedStrategy.description}</p>
            </div>

            {/* Results or loading */}
            {isRunningBacktest && (
              <ImprovedBacktestResults
                results={{
                  ...strategyResults[selectedStrategy.id as keyof typeof strategyResults],
                  strategy: selectedStrategy.name
                }}
                isLoading={true}
              />
            )}

            {backtestResults && !isRunningBacktest && (
              <ImprovedBacktestResults
                results={{
                  ...backtestResults,
                  strategy: selectedStrategy.name
                }}
                isLoading={false}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
