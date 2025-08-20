'use client';

import React, { useState, useEffect } from 'react';
import { PerformanceMetrics } from '@/types/tradingview';

interface DashboardProps {
  className?: string;
}

/**
 * Performance Dashboard Component
 * Displays real-time trading metrics based on locked optimal strategy
 */
export default function Dashboard({ className = '' }: DashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalPnL: 1003.56, // From our validated backtest results
    dailyPnL: 45.23,
    winRate: 46.3, // From locked optimal configuration
    totalTrades: 80,
    currentPosition: 'flat',
    unrealizedPnL: 0,
    sharpeRatio: 0.11, // From validated results
    maxDrawdown: 8.22
  });

  const [isLive, setIsLive] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        dailyPnL: prev.dailyPnL + (Math.random() - 0.5) * 10,
        unrealizedPnL: prev.currentPosition !== 'flat' ? (Math.random() - 0.5) * 50 : 0
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive]);

  const formatCurrency = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'long': return 'text-green-400 bg-green-900/20';
      case 'short': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getPnLColor = (value: number) => {
    return value >= 0 ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">📊 Enhanced MACD Strategy Dashboard</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-sm text-gray-300">{isLive ? 'Live' : 'Offline'}</span>
          </div>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              isLive 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isLive ? 'Stop' : 'Start'} Live Mode
          </button>
        </div>
      </div>

      {/* Strategy Status */}
      <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
        <h3 className="text-blue-400 font-semibold mb-2">🎯 Locked Optimal Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">MACD:</span>
            <span className="text-white ml-2 font-mono">5/15/5</span>
          </div>
          <div>
            <span className="text-gray-400">EMA Filter:</span>
            <span className="text-white ml-2 font-mono">9-period</span>
          </div>
          <div>
            <span className="text-gray-400">Position Size:</span>
            <span className="text-white ml-2 font-mono">100 contracts</span>
          </div>
          <div>
            <span className="text-gray-400">Validated Return:</span>
            <span className="text-green-400 ml-2 font-mono">10.04%</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total P&L */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <div className="text-gray-400 text-sm mb-1">Total P&L</div>
          <div className={`text-2xl font-bold font-mono ${getPnLColor(metrics.totalPnL)}`}>
            {formatCurrency(metrics.totalPnL)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Validated: +10.04%</div>
        </div>

        {/* Daily P&L */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <div className="text-gray-400 text-sm mb-1">Daily P&L</div>
          <div className={`text-2xl font-bold font-mono ${getPnLColor(metrics.dailyPnL)}`}>
            {formatCurrency(metrics.dailyPnL)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Today's performance</div>
        </div>

        {/* Win Rate */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <div className="text-gray-400 text-sm mb-1">Win Rate</div>
          <div className="text-2xl font-bold font-mono text-blue-400">
            {formatPercentage(metrics.winRate)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Validated metric</div>
        </div>

        {/* Total Trades */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <div className="text-gray-400 text-sm mb-1">Total Trades</div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics.totalTrades}
          </div>
          <div className="text-xs text-gray-500 mt-1">Active strategy</div>
        </div>
      </div>

      {/* Position and Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Current Position */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <h3 className="text-gray-300 font-semibold mb-3">📍 Current Position</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPositionColor(metrics.currentPosition)}`}>
                {metrics.currentPosition.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Unrealized P&L:</span>
              <span className={`font-mono ${getPnLColor(metrics.unrealizedPnL)}`}>
                {formatCurrency(metrics.unrealizedPnL)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Position Size:</span>
              <span className="text-white font-mono">100 contracts</span>
            </div>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <h3 className="text-gray-300 font-semibold mb-3">⚠️ Risk Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Sharpe Ratio:</span>
              <span className="text-white font-mono">{metrics.sharpeRatio.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Max Drawdown:</span>
              <span className="text-red-400 font-mono">-{formatPercentage(metrics.maxDrawdown)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Risk Level:</span>
              <span className="text-green-400 font-mono">Controlled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Performance Summary */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
        <h3 className="text-gray-300 font-semibold mb-3">🏆 Strategy Performance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-green-400 text-lg font-bold">10.04%</div>
            <div className="text-gray-400">Monthly Return</div>
          </div>
          <div className="text-center">
            <div className="text-blue-400 text-lg font-bold">1.58</div>
            <div className="text-gray-400">Profit Factor</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-400 text-lg font-bold">0.11</div>
            <div className="text-gray-400">Sharpe Ratio</div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 text-lg font-bold">8.22%</div>
            <div className="text-gray-400">Max Drawdown</div>
          </div>
        </div>
      </div>

      {/* Development Status */}
      <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg">
        <h4 className="text-yellow-400 font-semibold mb-2">🚧 Week 1 Dashboard Status</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-green-400">✅ Performance metrics display</p>
            <p className="text-green-400">✅ Locked strategy configuration</p>
            <p className="text-green-400">✅ Real-time simulation ready</p>
          </div>
          <div>
            <p className="text-yellow-400">🔄 Live data integration pending</p>
            <p className="text-yellow-400">🔄 WebSocket connection setup</p>
            <p className="text-yellow-400">🔄 Trade execution interface</p>
          </div>
        </div>
      </div>
    </div>
  );
}
