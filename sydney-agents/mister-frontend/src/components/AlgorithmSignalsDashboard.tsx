'use client';

import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlgorithmData {
  daily: {
    close: number;
    ema14: number;
    ema30: number;
    bullTrend: boolean;
    conditions: {
      closeAboveEma14: { status: boolean; gap: number; gapPercent: number };
      ema14AboveEma30: { status: boolean; gap: number; gapPercent: number };
    };
  };
  fourHour: {
    close: number;
    ema9: number;
    ema21: number;
    sma50: number;
    bullRegime: boolean;
    conditions: {
      ema9AboveEma21: { status: boolean; gap: number; gapPercent: number };
      closeAboveSma50: { status: boolean; gap: number; gapPercent: number };
    };
  };
  oneHour: {
    close: number;
    sma220: number;
    aboveSma220: boolean;
    distanceFromSma220: number;
  };
  signals: {
    longScore: number;
    shortScore: number;
    readinessStatus: string;
    readinessMessage: string;
    missingConditions: string[];
  };
  activeSignal: {
    type: string | null;
    leverage: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number[];
  };
  account: {
    balance: number;
    position: string;
    unrealizedPnl: number;
  };
}

// Mock data for initial development
const mockData: AlgorithmData = {
  daily: {
    close: 0.8640,
    ema14: 0.8725,
    ema30: 0.8309,
    bullTrend: false,
    conditions: {
      closeAboveEma14: { status: false, gap: 0.0085, gapPercent: 0.98 },
      ema14AboveEma30: { status: true, gap: 0, gapPercent: 0 }
    }
  },
  fourHour: {
    close: 0.8640,
    ema9: 0.8639,
    ema21: 0.8690,
    sma50: 0.8764,
    bullRegime: false,
    conditions: {
      ema9AboveEma21: { status: false, gap: 0.0052, gapPercent: 0.60 },
      closeAboveSma50: { status: false, gap: 0.0124, gapPercent: 1.44 }
    }
  },
  oneHour: {
    close: 0.8640,
    sma220: 0.8827,
    aboveSma220: false,
    distanceFromSma220: -2.12
  },
  signals: {
    longScore: 50,
    shortScore: 33,
    readinessStatus: 'APPROACHING_LONG',
    readinessMessage: 'Approaching long setup (50% ready)',
    missingConditions: [
      'Need above SMA220 (currently -2.12% below)',
      'Need daily bull trend',
      'Need 4H bull regime'
    ]
  },
  activeSignal: {
    type: null,
    leverage: 0,
    entryPrice: 0,
    stopLoss: 0,
    takeProfit: []
  },
  account: {
    balance: 136.79,
    position: 'FLAT',
    unrealizedPnl: 0
  }
};

export function AlgorithmSignalsDashboard() {
  const [algorithmData, setAlgorithmData] = useState<AlgorithmData>(mockData);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      
      // Simulate some changes in the data
      setAlgorithmData(prev => ({
        ...prev,
        signals: {
          ...prev.signals,
          longScore: Math.min(100, Math.max(0, prev.signals.longScore + (Math.random() * 10 - 5))),
          shortScore: Math.min(100, Math.max(0, prev.signals.shortScore + (Math.random() * 10 - 5)))
        }
      }));
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getSignalStrength = (score: number) => {
    if (score >= 75) return { color: 'text-green-400', bg: 'bg-green-500', label: 'STRONG' };
    if (score >= 50) return { color: 'text-yellow-400', bg: 'bg-yellow-500', label: 'MODERATE' };
    return { color: 'text-gray-500', bg: 'bg-gray-600', label: 'WEAK' };
  };

  const longStrength = getSignalStrength(algorithmData.signals.longScore);
  const shortStrength = getSignalStrength(algorithmData.signals.shortScore);

  return (
    <div className="h-full bg-black/95 rounded-lg border border-gray-800/50 overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-b border-gray-800/50 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">MisterLabs220 Algorithm</h3>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Live</span>
                <span>•</span>
                <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <div className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium",
            algorithmData.signals.readinessStatus === 'READY_LONG' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : algorithmData.signals.readinessStatus === 'READY_SHORT'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          )}>
            {algorithmData.signals.readinessMessage}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-12 gap-6">
          
          {/* Signal Strength Meters - Left Side */}
          <div className="col-span-4 space-y-4">
            {/* Long Signal */}
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-white font-semibold">Long Signal</span>
                </div>
                <div className={cn("text-2xl font-bold", longStrength.color)}>
                  {algorithmData.signals.longScore.toFixed(0)}%
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", longStrength.bg)}
                    style={{ width: `${algorithmData.signals.longScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Signal Strength</span>
                  <span className={longStrength.color}>{longStrength.label}</span>
                </div>
              </div>
            </div>

            {/* Short Signal */}
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  <span className="text-white font-semibold">Short Signal</span>
                </div>
                <div className={cn("text-2xl font-bold", shortStrength.color)}>
                  {algorithmData.signals.shortScore.toFixed(0)}%
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", shortStrength.bg)}
                    style={{ width: `${algorithmData.signals.shortScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Signal Strength</span>
                  <span className={shortStrength.color}>{shortStrength.label}</span>
                </div>
              </div>
            </div>

            {/* Missing Conditions */}
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800/50">
              <h4 className="text-white font-semibold mb-3 text-sm">Required Conditions</h4>
              <div className="space-y-2">
                {algorithmData.signals.missingConditions.map((condition, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-300">{condition}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeframe Indicators - Center */}
          <div className="col-span-5 space-y-4">
            {/* Daily Timeframe */}
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm font-medium">DAILY</span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold",
                  algorithmData.daily.bullTrend 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-red-500/20 text-red-400"
                )}>
                  {algorithmData.daily.bullTrend ? 'BULL' : 'BEAR'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Close</div>
                  <div className="text-white font-mono">${algorithmData.daily.close.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">EMA14</div>
                  <div className="text-blue-400 font-mono">${algorithmData.daily.ema14.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">EMA30</div>
                  <div className="text-purple-400 font-mono">${algorithmData.daily.ema30.toFixed(4)}</div>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {algorithmData.daily.conditions.closeAboveEma14.status ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-gray-300">Close > EMA14</span>
                  </div>
                  {!algorithmData.daily.conditions.closeAboveEma14.status && (
                    <span className="text-yellow-400 text-xs">
                      +{algorithmData.daily.conditions.closeAboveEma14.gapPercent.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {algorithmData.daily.conditions.ema14AboveEma30.status ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-gray-300">EMA14 > EMA30</span>
                </div>
              </div>
            </div>

            {/* 4-Hour Timeframe */}
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm font-medium">4-HOUR</span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold",
                  algorithmData.fourHour.bullRegime 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-red-500/20 text-red-400"
                )}>
                  {algorithmData.fourHour.bullRegime ? 'BULL' : 'BEAR'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">EMA9 / EMA21</div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-mono">${algorithmData.fourHour.ema9.toFixed(4)}</span>
                    <span className="text-gray-600">/</span>
                    <span className="text-orange-400 font-mono">${algorithmData.fourHour.ema21.toFixed(4)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">SMA50</div>
                  <div className="text-cyan-400 font-mono">${algorithmData.fourHour.sma50.toFixed(4)}</div>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {algorithmData.fourHour.conditions.ema9AboveEma21.status ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-gray-300">EMA9 > EMA21</span>
                  </div>
                  {!algorithmData.fourHour.conditions.ema9AboveEma21.status && (
                    <span className="text-yellow-400 text-xs">
                      +{algorithmData.fourHour.conditions.ema9AboveEma21.gapPercent.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {algorithmData.fourHour.conditions.closeAboveSma50.status ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-gray-300">Close > SMA50</span>
                  </div>
                  {!algorithmData.fourHour.conditions.closeAboveSma50.status && (
                    <span className="text-yellow-400 text-xs">
                      +{algorithmData.fourHour.conditions.closeAboveSma50.gapPercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 1-Hour Timeframe */}
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm font-medium">1-HOUR</span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold",
                  algorithmData.oneHour.aboveSma220 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-red-500/20 text-red-400"
                )}>
                  {algorithmData.oneHour.aboveSma220 ? 'ABOVE' : 'BELOW'}
                </span>
              </div>
              
              <div className="text-center py-4">
                <div className="text-sm text-gray-400 mb-2">Distance from SMA220</div>
                <div className={cn(
                  "text-3xl font-bold",
                  algorithmData.oneHour.distanceFromSma220 > 0 ? "text-green-400" : "text-red-400"
                )}>
                  {algorithmData.oneHour.distanceFromSma220 > 0 ? '+' : ''}{algorithmData.oneHour.distanceFromSma220.toFixed(2)}%
                </div>
                {algorithmData.oneHour.distanceFromSma220 < 0 && (
                  <div className="text-xs text-yellow-400 mt-2">
                    Need +{Math.abs(algorithmData.oneHour.distanceFromSma220).toFixed(2)}% to cross
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Signal Status - Right Side */}
          <div className="col-span-3 space-y-4">
            {/* Active Signal / Waiting */}
            {algorithmData.activeSignal.type ? (
              <div className="bg-gradient-to-br from-green-900/30 to-green-900/10 rounded-xl p-5 border border-green-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-semibold">Active Signal</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm font-medium">
                      {algorithmData.activeSignal.type.toUpperCase()} {algorithmData.activeSignal.leverage}x
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Entry</span>
                    <span className="text-white font-mono">${algorithmData.activeSignal.entryPrice.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Stop Loss</span>
                    <span className="text-red-400 font-mono">${algorithmData.activeSignal.stopLoss.toFixed(4)}</span>
                  </div>
                  {algorithmData.activeSignal.takeProfit.map((tp, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-400">TP {i + 1}</span>
                      <span className="text-green-400 font-mono">${tp.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900/50 rounded-xl p-8 border border-gray-800/50 text-center">
                <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h4 className="text-white font-semibold mb-2">No Active Signal</h4>
                <p className="text-sm text-gray-400">Waiting for conditions to align</p>
                {(algorithmData.signals.longScore > 70 || algorithmData.signals.shortScore > 70) && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-full">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-yellow-400 font-medium">Signal approaching!</span>
                  </div>
                )}
              </div>
            )}

            {/* Account Status */}
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800/50">
              <h4 className="text-white font-semibold mb-4 text-sm">Account Status</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Balance</span>
                  <span className="text-white font-semibold">${algorithmData.account.balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Position</span>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold",
                    algorithmData.account.position === 'FLAT' 
                      ? "bg-gray-700 text-gray-300"
                      : algorithmData.account.position === 'LONG'
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  )}>
                    {algorithmData.account.position}
                  </span>
                </div>
                {algorithmData.account.unrealizedPnl !== 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Unrealized P&L</span>
                    <span className={cn(
                      "font-semibold",
                      algorithmData.account.unrealizedPnl > 0 ? "text-green-400" : "text-red-400"
                    )}>
                      ${algorithmData.account.unrealizedPnl.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}