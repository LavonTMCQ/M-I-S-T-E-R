'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SignalPerformance, SignalFilter } from '@/types/tradingview';
import { signalAnalyticsService } from '@/services/signalAnalyticsService';

interface PerformanceChartsProps {
  className?: string;
  filter?: SignalFilter;
}

interface ChartDataPoint {
  date: string;
  timestamp: number;
  cumulativePnL: number;
  dailyPnL: number;
  winRate: number;
  signalCount: number;
  longSignals: number;
  shortSignals: number;
}

/**
 * Advanced Performance Charts Component
 * Displays interactive performance visualizations including cumulative P&L,
 * win rate trends, and signal distribution analysis
 */
export default function PerformanceCharts({ 
  className = '', 
  filter 
}: PerformanceChartsProps) {
  const [signalHistory, setSignalHistory] = useState<SignalPerformance[]>([]);
  const [selectedChart, setSelectedChart] = useState<'cumulative' | 'winrate' | 'distribution'>('cumulative');
  const [isLoading, setIsLoading] = useState(true);

  // Load signal history
  useEffect(() => {
    const loadSignals = () => {
      setIsLoading(true);
      const history = signalAnalyticsService.getSignalHistory(filter);
      setSignalHistory(history);
      setIsLoading(false);
    };

    loadSignals();
  }, [filter]);

  // Process data for charts
  const chartData = useMemo(() => {
    if (signalHistory.length === 0) return [];

    // Group signals by date
    const dailyData: { [key: string]: ChartDataPoint } = {};
    let cumulativePnL = 0;

    // Sort signals by timestamp
    const sortedSignals = [...signalHistory].sort((a, b) => 
      a.signal.timestamp.getTime() - b.signal.timestamp.getTime()
    );

    sortedSignals.forEach(signal => {
      const dateKey = signal.signal.timestamp.toDateString();
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          timestamp: signal.signal.timestamp.getTime(),
          cumulativePnL: 0,
          dailyPnL: 0,
          winRate: 0,
          signalCount: 0,
          longSignals: 0,
          shortSignals: 0
        };
      }

      const dayData = dailyData[dateKey];
      dayData.signalCount++;
      dayData.dailyPnL += signal.pnl || 0;
      
      if (signal.signal.type === 'long') {
        dayData.longSignals++;
      } else {
        dayData.shortSignals++;
      }

      // Update cumulative P&L
      if (signal.pnl !== undefined) {
        cumulativePnL += signal.pnl;
        dayData.cumulativePnL = cumulativePnL;
      }
    });

    // Calculate win rates for each day
    Object.values(dailyData).forEach(dayData => {
      const daySignals = sortedSignals.filter(s => 
        s.signal.timestamp.toDateString() === dayData.date
      );
      const completedSignals = daySignals.filter(s => s.outcome !== 'pending');
      const winningSignals = completedSignals.filter(s => s.outcome === 'win');
      
      dayData.winRate = completedSignals.length > 0 
        ? (winningSignals.length / completedSignals.length) * 100 
        : 0;
    });

    return Object.values(dailyData).sort((a, b) => a.timestamp - b.timestamp);
  }, [signalHistory]);

  const formatCurrency = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${value.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getBarHeight = (value: number, maxValue: number, minValue: number) => {
    if (maxValue === minValue) return 50;
    const range = maxValue - minValue;
    const normalizedValue = (value - minValue) / range;
    return Math.max(5, normalizedValue * 100);
  };

  const getBarColor = (value: number) => {
    if (value > 0) return 'bg-green-500';
    if (value < 0) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const renderCumulativeChart = () => {
    if (chartData.length === 0) return null;

    const maxPnL = Math.max(...chartData.map(d => d.cumulativePnL));
    const minPnL = Math.min(...chartData.map(d => d.cumulativePnL));

    return (
      <div className="space-y-4">
        <h4 className="text-white font-semibold">📈 Cumulative P&L</h4>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-end space-x-1 h-48">
            {chartData.map((point, index) => (
              <div key={point.date} className="flex-1 flex flex-col items-center">
                <div className="flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t transition-all duration-300 hover:opacity-80 ${
                      point.cumulativePnL >= 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{
                      height: `${getBarHeight(point.cumulativePnL, maxPnL, minPnL)}%`
                    }}
                    title={`${formatDate(point.date)}: ${formatCurrency(point.cumulativePnL)}`}
                  ></div>
                </div>
                <div className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-left">
                  {formatDate(point.date)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <span className="text-gray-400">Min: {formatCurrency(minPnL)}</span>
            <span className="text-gray-400">Max: {formatCurrency(maxPnL)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderWinRateChart = () => {
    if (chartData.length === 0) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-white font-semibold">🎯 Daily Win Rate</h4>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-end space-x-1 h-48">
            {chartData.map((point, index) => (
              <div key={point.date} className="flex-1 flex flex-col items-center">
                <div className="flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t transition-all duration-300 hover:opacity-80 ${
                      point.winRate >= 50 ? 'bg-green-500' : 
                      point.winRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{
                      height: `${point.winRate}%`
                    }}
                    title={`${formatDate(point.date)}: ${point.winRate.toFixed(1)}% (${point.signalCount} signals)`}
                  ></div>
                </div>
                <div className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-left">
                  {formatDate(point.date)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <span className="text-gray-400">0%</span>
            <span className="text-gray-400">100%</span>
          </div>
        </div>
      </div>
    );
  };

  const renderDistributionChart = () => {
    if (chartData.length === 0) return null;

    const maxSignals = Math.max(...chartData.map(d => d.signalCount));

    return (
      <div className="space-y-4">
        <h4 className="text-white font-semibold">📊 Signal Distribution</h4>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-end space-x-1 h-48">
            {chartData.map((point, index) => (
              <div key={point.date} className="flex-1 flex flex-col items-center">
                <div className="flex-1 flex items-end space-x-0.5">
                  {/* Long signals */}
                  <div
                    className="bg-green-500 rounded-t transition-all duration-300 hover:opacity-80"
                    style={{
                      height: `${(point.longSignals / maxSignals) * 100}%`,
                      width: '45%'
                    }}
                    title={`${formatDate(point.date)}: ${point.longSignals} LONG signals`}
                  ></div>
                  {/* Short signals */}
                  <div
                    className="bg-red-500 rounded-t transition-all duration-300 hover:opacity-80"
                    style={{
                      height: `${(point.shortSignals / maxSignals) * 100}%`,
                      width: '45%'
                    }}
                    title={`${formatDate(point.date)}: ${point.shortSignals} SHORT signals`}
                  ></div>
                </div>
                <div className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-left">
                  {formatDate(point.date)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-400">LONG</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-gray-400">SHORT</span>
              </div>
            </div>
            <span className="text-gray-400">Max: {maxSignals} signals/day</span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-900 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading performance charts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">📊 Performance Charts</h3>
        
        {/* Chart Type Selector */}
        <div className="flex space-x-2">
          {([
            { key: 'cumulative', label: 'P&L', icon: '📈' },
            { key: 'winrate', label: 'Win Rate', icon: '🎯' },
            { key: 'distribution', label: 'Distribution', icon: '📊' }
          ] as const).map((chart) => (
            <button
              key={chart.key}
              onClick={() => setSelectedChart(chart.key)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors flex items-center space-x-1 ${
                selectedChart === chart.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>{chart.icon}</span>
              <span>{chart.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart Content */}
      {chartData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No data available for charts
        </div>
      ) : (
        <div>
          {selectedChart === 'cumulative' && renderCumulativeChart()}
          {selectedChart === 'winrate' && renderWinRateChart()}
          {selectedChart === 'distribution' && renderDistributionChart()}
        </div>
      )}

      {/* Chart Summary */}
      {chartData.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-white font-mono">
                {chartData.length}
              </div>
              <div className="text-xs text-gray-400">Trading Days</div>
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-blue-400">
                {(chartData.reduce((sum, d) => sum + d.signalCount, 0) / chartData.length).toFixed(1)}
              </div>
              <div className="text-xs text-gray-400">Avg Signals/Day</div>
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-yellow-400">
                {(chartData.reduce((sum, d) => sum + d.winRate, 0) / chartData.length).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">Avg Win Rate</div>
            </div>
            <div>
              <div className={`text-lg font-bold font-mono ${
                chartData[chartData.length - 1]?.cumulativePnL >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(chartData[chartData.length - 1]?.cumulativePnL || 0)}
              </div>
              <div className="text-xs text-gray-400">Total P&L</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
