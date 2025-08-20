'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SignalPerformance, SignalFilter } from '@/types/tradingview';
import { signalAnalyticsService } from '@/services/signalAnalyticsService';

interface SignalTimelineProps {
  className?: string;
  filter?: SignalFilter;
  onSignalSelect?: (signal: SignalPerformance) => void;
}

interface TimelineGroup {
  date: string;
  signals: SignalPerformance[];
  totalPnL: number;
  winRate: number;
}

/**
 * Interactive Signal Timeline Component
 * Displays signal history in a chronological timeline with performance visualization
 */
export default function SignalTimeline({ 
  className = '', 
  filter,
  onSignalSelect 
}: SignalTimelineProps) {
  const [signalHistory, setSignalHistory] = useState<SignalPerformance[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1d' | '3d' | '1w' | '2w' | '1m'>('1w');
  const [isLoading, setIsLoading] = useState(true);

  // Load signal history
  useEffect(() => {
    const loadSignals = () => {
      setIsLoading(true);
      
      // Apply timeframe to filter
      const now = new Date();
      let timeframeFilter: SignalFilter = { ...filter };
      
      switch (selectedTimeframe) {
        case '1d':
          timeframeFilter.dateRange = {
            start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            end: now
          };
          break;
        case '3d':
          timeframeFilter.dateRange = {
            start: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
            end: now
          };
          break;
        case '1w':
          timeframeFilter.dateRange = {
            start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            end: now
          };
          break;
        case '2w':
          timeframeFilter.dateRange = {
            start: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
            end: now
          };
          break;
        case '1m':
          timeframeFilter.dateRange = {
            start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            end: now
          };
          break;
      }

      const history = signalAnalyticsService.getSignalHistory(timeframeFilter);
      setSignalHistory(history);
      setIsLoading(false);
    };

    loadSignals();
  }, [filter, selectedTimeframe]);

  // Group signals by date
  const timelineGroups = useMemo(() => {
    const groups: { [key: string]: TimelineGroup } = {};
    
    signalHistory.forEach(signal => {
      const dateKey = signal.signal.timestamp.toDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          signals: [],
          totalPnL: 0,
          winRate: 0
        };
      }
      
      groups[dateKey].signals.push(signal);
      groups[dateKey].totalPnL += signal.pnl || 0;
    });
    
    // Calculate win rates for each group
    Object.values(groups).forEach(group => {
      const completedSignals = group.signals.filter(s => s.outcome !== 'pending');
      const winningSignals = completedSignals.filter(s => s.outcome === 'win');
      group.winRate = completedSignals.length > 0 
        ? (winningSignals.length / completedSignals.length) * 100 
        : 0;
    });
    
    // Sort by date (newest first)
    return Object.values(groups).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [signalHistory]);

  const formatCurrency = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${value.toFixed(2)}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getSignalIcon = (signal: SignalPerformance) => {
    if (signal.outcome === 'pending') return '⏳';
    if (signal.outcome === 'win') return '✅';
    return '❌';
  };

  const getSignalColor = (signal: SignalPerformance) => {
    if (signal.outcome === 'pending') return 'text-yellow-400';
    if (signal.outcome === 'win') return 'text-green-400';
    return 'text-red-400';
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
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
            <p className="text-gray-300">Loading signal timeline...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">📈 Signal Timeline</h3>
        
        {/* Timeframe Selector */}
        <div className="flex space-x-2">
          {(['1d', '3d', '1w', '2w', '1m'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedTimeframe === timeframe
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {timeframe.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {timelineGroups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No signals found for the selected timeframe
          </div>
        ) : (
          timelineGroups.map((group, groupIndex) => (
            <div key={group.date} className="relative">
              {/* Date Header */}
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="ml-4 flex-1">
                  <div className="flex justify-between items-center">
                    <h4 className="text-white font-semibold">
                      {new Date(group.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </h4>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-gray-400">
                        Signals: <span className="text-white font-mono">{group.signals.length}</span>
                      </span>
                      <span className="text-gray-400">
                        P&L: <span className={`font-mono ${getPnLColor(group.totalPnL)}`}>
                          {formatCurrency(group.totalPnL)}
                        </span>
                      </span>
                      <span className="text-gray-400">
                        Win Rate: <span className={`font-mono ${getWinRateColor(group.winRate)}`}>
                          {group.winRate.toFixed(1)}%
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signals for this date */}
              <div className="ml-7 space-y-3">
                {group.signals.map((signal, signalIndex) => (
                  <div
                    key={signal.signalId}
                    onClick={() => onSignalSelect?.(signal)}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-600 hover:border-gray-500 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      {/* Signal Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`text-lg ${getSignalColor(signal)}`}>
                            {getSignalIcon(signal)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            signal.signal.type === 'long' 
                              ? 'bg-green-900 text-green-300' 
                              : 'bg-red-900 text-red-300'
                          }`}>
                            {signal.signal.type.toUpperCase()}
                          </span>
                          <span className="text-gray-300 font-mono text-sm">
                            {formatTime(signal.signal.timestamp)}
                          </span>
                          <span className="text-gray-400 text-sm">
                            @ ${signal.signal.price.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-400 mb-2">
                          {signal.signal.reason}
                        </div>
                        
                        <div className="flex space-x-4 text-xs">
                          <span className="text-gray-400">
                            Confidence: <span className="text-yellow-400 font-mono">
                              {signal.signal.confidence.toFixed(1)}
                            </span>
                          </span>
                          {signal.holdingPeriod && (
                            <span className="text-gray-400">
                              Hold: <span className="text-blue-400 font-mono">
                                {signal.holdingPeriod.toFixed(0)}m
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Performance */}
                      <div className="text-right">
                        {signal.pnl !== undefined ? (
                          <div className={`text-lg font-bold font-mono ${getPnLColor(signal.pnl)}`}>
                            {formatCurrency(signal.pnl)}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">Pending</div>
                        )}
                        {signal.pnlPips !== undefined && (
                          <div className={`text-xs font-mono ${getPnLColor(signal.pnlPips)}`}>
                            {signal.pnlPips > 0 ? '+' : ''}{signal.pnlPips.toFixed(1)} pips
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline connector */}
              {groupIndex < timelineGroups.length - 1 && (
                <div className="absolute left-1.5 top-12 bottom-0 w-0.5 bg-gray-600"></div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {timelineGroups.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white font-mono">
                {signalHistory.length}
              </div>
              <div className="text-xs text-gray-400">Total Signals</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-green-400">
                {signalHistory.filter(s => s.outcome === 'win').length}
              </div>
              <div className="text-xs text-gray-400">Winners</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-red-400">
                {signalHistory.filter(s => s.outcome === 'loss').length}
              </div>
              <div className="text-xs text-gray-400">Losers</div>
            </div>
            <div>
              <div className={`text-2xl font-bold font-mono ${getPnLColor(
                signalHistory.reduce((sum, s) => sum + (s.pnl || 0), 0)
              )}`}>
                {formatCurrency(signalHistory.reduce((sum, s) => sum + (s.pnl || 0), 0))}
              </div>
              <div className="text-xs text-gray-400">Total P&L</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
