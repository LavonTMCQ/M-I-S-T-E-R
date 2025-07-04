'use client';

import React from 'react';
import { BacktestResults } from '@/components/backtesting/BacktestResults';

// Sample backtest data that matches your successful ADA strategy
const sampleBacktestResults = {
  runId: 'backtest_MultiTimeframeADAStrategy_e77532aed0a80',
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
  chartData: [] // Will be loaded dynamically from API
};

export default function BacktestResultsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <BacktestResults results={sampleBacktestResults} />
      </div>
    </div>
  );
}
