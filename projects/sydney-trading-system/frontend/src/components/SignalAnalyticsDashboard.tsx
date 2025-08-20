'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  SignalAnalytics,
  SignalPerformance,
  SignalFilter,
  SignalData
} from '@/types/tradingview';
import { signalAnalyticsService } from '@/services/signalAnalyticsService';
import SignalTimeline from './SignalTimeline';
import PerformanceCharts from './PerformanceCharts';
import AdvancedFilters from './AdvancedFilters';

interface SignalAnalyticsDashboardProps {
  className?: string;
  signals?: SignalData[]; // Current signals from chart
  onSignalSelect?: (signal: SignalPerformance) => void;
}

/**
 * Advanced Signal Analytics Dashboard
 * Provides comprehensive trading signal analysis including performance tracking,
 * win/loss ratios, signal quality scoring, and predictive analytics.
 */
export default function SignalAnalyticsDashboard({ 
  className = '', 
  signals = [],
  onSignalSelect 
}: SignalAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<SignalAnalytics | null>(null);
  const [signalHistory, setSignalHistory] = useState<SignalPerformance[]>([]);
  const [filter, setFilter] = useState<SignalFilter>({});
  const [selectedView, setSelectedView] = useState<'overview' | 'timeline' | 'charts'>('overview');
  const [selectedSignal, setSelectedSignal] = useState<SignalPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = () => {
      setIsLoading(true);

      const calculatedAnalytics = signalAnalyticsService.calculateAnalytics(filter);
      const history = signalAnalyticsService.getSignalHistory(filter);

      setAnalytics(calculatedAnalytics);
      setSignalHistory(history);
      setIsLoading(false);
    };

    loadAnalytics();
  }, [filter]);

  // Handle filter changes from AdvancedFilters component
  const handleFilterChange = useCallback((newFilter: SignalFilter) => {
    setFilter(newFilter);
  }, []);

  // Handle signal selection
  const handleSignalSelect = useCallback((signal: SignalPerformance) => {
    setSelectedSignal(signal);
    if (onSignalSelect) {
      onSignalSelect(signal);
    }
  }, [onSignalSelect]);

  // Add new signals to tracking
  useEffect(() => {
    signals.forEach(signal => {
      if (!signal.id) {
        signalAnalyticsService.addSignal(signal);
      }
    });
  }, [signals]);

  const formatCurrency = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatPips = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)} pips`;
  };

  const getPerformanceColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 60) return 'text-green-400';
    if (rate >= 45) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-900 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading signal analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics || analytics.totalSignals === 0) {
    return (
      <div className={`bg-gray-900 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-white mb-2">Ready for Signal Analytics</h3>
          <p className="text-gray-400 mb-4">Your trading signals will appear here as they're generated</p>
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 max-w-md mx-auto">
            <h4 className="text-blue-400 font-semibold mb-2">🎯 What You'll See:</h4>
            <ul className="text-sm text-gray-300 space-y-1 text-left">
              <li>• Real-time signal performance tracking</li>
              <li>• Win/loss ratios and P&L analysis</li>
              <li>• Signal quality scoring</li>
              <li>• Interactive timeline and charts</li>
              <li>• Advanced filtering and analytics</li>
            </ul>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            Start the TradingView chart below to begin generating signals
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">📊 Advanced Signal Analytics</h2>

        {/* View Selector */}
        <div className="flex space-x-2">
          {([
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'timeline', label: 'Timeline', icon: '📈' },
            { key: 'charts', label: 'Charts', icon: '📉' }
          ] as const).map((view) => (
            <button
              key={view.key}
              onClick={() => setSelectedView(view.key)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center space-x-2 ${
                selectedView === view.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>{view.icon}</span>
              <span>{view.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        onFilterChange={handleFilterChange}
        initialFilter={filter}
        className="mb-6"
      />

      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <>
          {/* Key Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Signals */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <div className="text-gray-400 text-sm mb-1">Total Signals</div>
          <div className="text-2xl font-bold text-white font-mono">
            {analytics.totalSignals}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {analytics.longSignals}L / {analytics.shortSignals}S
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <div className="text-gray-400 text-sm mb-1">Win Rate</div>
          <div className={`text-2xl font-bold font-mono ${getWinRateColor(analytics.winRate)}`}>
            {formatPercentage(analytics.winRate)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            L: {formatPercentage(analytics.longWinRate)} / S: {formatPercentage(analytics.shortWinRate)}
          </div>
        </div>

        {/* Average P&L */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <div className="text-gray-400 text-sm mb-1">Avg P&L</div>
          <div className={`text-2xl font-bold font-mono ${getPerformanceColor(analytics.avgPnL)}`}>
            {formatCurrency(analytics.avgPnL)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatPips(analytics.avgPnLPips)}
          </div>
        </div>

        {/* Profit Factor */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <div className="text-gray-400 text-sm mb-1">Profit Factor</div>
          <div className={`text-2xl font-bold font-mono ${getPerformanceColor(analytics.profitFactor - 1)}`}>
            {analytics.profitFactor.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Sharpe: {analytics.sharpeRatio.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Streak Analysis */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <h4 className="text-white font-semibold mb-3">🔥 Streak Analysis</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Max Win Streak:</span>
              <span className="text-green-400 font-mono">{analytics.consecutiveWins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Max Loss Streak:</span>
              <span className="text-red-400 font-mono">{analytics.consecutiveLosses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Hold Time:</span>
              <span className="text-blue-400 font-mono">{analytics.avgHoldingPeriod.toFixed(0)}m</span>
            </div>
          </div>
        </div>

        {/* Confidence Analysis */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <h4 className="text-white font-semibold mb-3">🎯 Confidence Analysis</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Confidence:</span>
              <span className="text-yellow-400 font-mono">{analytics.avgConfidence.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Confidence Correlation:</span>
              <span className={`font-mono ${getPerformanceColor(analytics.confidenceCorrelation)}`}>
                {analytics.confidenceCorrelation.toFixed(3)}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Higher correlation = confidence predicts performance
            </div>
          </div>
        </div>

        {/* Best/Worst Signals */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
          <h4 className="text-white font-semibold mb-3">🏆 Best/Worst</h4>
          <div className="space-y-2">
            {analytics.bestSignal && (
              <div>
                <div className="text-xs text-gray-400">Best Signal:</div>
                <div className="text-green-400 font-mono text-sm">
                  {analytics.bestSignal.signal.type.toUpperCase()} {formatCurrency(analytics.bestSignal.pnl || 0)}
                </div>
              </div>
            )}
            {analytics.worstSignal && (
              <div>
                <div className="text-xs text-gray-400">Worst Signal:</div>
                <div className="text-red-400 font-mono text-sm">
                  {analytics.worstSignal.signal.type.toUpperCase()} {formatCurrency(analytics.worstSignal.pnl || 0)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signal History Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-600 overflow-hidden">
        <div className="p-4 border-b border-gray-600">
          <h4 className="text-white font-semibold">📈 Recent Signal History</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-gray-300">Time</th>
                <th className="px-4 py-2 text-left text-gray-300">Type</th>
                <th className="px-4 py-2 text-right text-gray-300">Price</th>
                <th className="px-4 py-2 text-right text-gray-300">Confidence</th>
                <th className="px-4 py-2 text-center text-gray-300">Outcome</th>
                <th className="px-4 py-2 text-right text-gray-300">P&L</th>
                <th className="px-4 py-2 text-right text-gray-300">Hold Time</th>
              </tr>
            </thead>
            <tbody>
              {signalHistory.slice(0, 10).map((performance, index) => (
                <tr 
                  key={performance.signalId}
                  className="border-b border-gray-700 hover:bg-gray-750 cursor-pointer"
                  onClick={() => onSignalSelect?.(performance)}
                >
                  <td className="px-4 py-2 text-gray-300 font-mono">
                    {performance.signal.timestamp.toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      performance.signal.type === 'long' 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-red-900 text-red-300'
                    }`}>
                      {performance.signal.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-300 font-mono">
                    ${performance.signal.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-yellow-400 font-mono">
                    {performance.signal.confidence.toFixed(1)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {performance.outcome === 'pending' ? (
                      <span className="text-yellow-400">⏳</span>
                    ) : performance.outcome === 'win' ? (
                      <span className="text-green-400">✅</span>
                    ) : (
                      <span className="text-red-400">❌</span>
                    )}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono ${getPerformanceColor(performance.pnl || 0)}`}>
                    {performance.pnl ? formatCurrency(performance.pnl) : '-'}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-400 font-mono">
                    {performance.holdingPeriod ? `${performance.holdingPeriod.toFixed(0)}m` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {signalHistory.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No signals found for current filters
          </div>
        )}
      </div>
        </>
      )}

      {/* Timeline View */}
      {selectedView === 'timeline' && (
        <SignalTimeline
          filter={filter}
          onSignalSelect={handleSignalSelect}
        />
      )}

      {/* Charts View */}
      {selectedView === 'charts' && (
        <PerformanceCharts
          filter={filter}
        />
      )}
    </div>
  );
}
