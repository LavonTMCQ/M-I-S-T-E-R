'use client';

import React, { useState, useEffect } from 'react';
import TradingViewChart from '@/components/TradingViewChart';
import Dashboard from '@/components/Dashboard';
import SignalAnalyticsDashboard from '@/components/SignalAnalyticsDashboard';
import SignalQualityIndicator from '@/components/SignalQualityIndicator';
import { SignalData } from '@/types/tradingview';
import { clearSignalData, initializeMockSignalData } from '@/utils/mockSignalData';

export default function Home() {
  const [latestSignal, setLatestSignal] = useState<SignalData | null>(null);
  const [showDataControls, setShowDataControls] = useState(false);

  const handleSignalGenerated = (signal: SignalData) => {
    setLatestSignal(signal);
    console.log('📊 New signal received in main page:', signal);
  };

  const handleClearData = () => {
    clearSignalData();
    window.location.reload(); // Refresh to show empty state
  };

  const handleLoadTestData = () => {
    initializeMockSignalData();
    window.location.reload(); // Refresh to show test data
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                🎯 Sydney's Advanced Trading System
              </h1>
              <p className="text-gray-300">
                Enhanced MACD Histogram Strategy | Locked Optimal Configuration | 10.04% Monthly Return
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowDataControls(!showDataControls)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
              >
                ⚙️ Data Controls
              </button>
              {showDataControls && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleClearData}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                  >
                    🗑️ Clear Data
                  </button>
                  <button
                    onClick={handleLoadTestData}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                  >
                    📊 Load Test Data
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Dashboard */}
        <Dashboard />

        {/* Advanced Signal Analytics Dashboard */}
        <SignalAnalyticsDashboard />

        {/* TradingView Chart with Signal Quality */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-3 bg-gray-900 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">📊 SPY 5-Minute Chart</h2>
            <TradingViewChart
              symbol="SPY"
              interval="5m"
              height={600}
              theme="dark"
              onSignalGenerated={handleSignalGenerated}
            />
          </div>

          {/* Signal Quality Indicator */}
          <div className="lg:col-span-1">
            <SignalQualityIndicator signal={latestSignal} />
          </div>
        </div>

        {/* Phase 2 Implementation Status */}
        <div className="bg-green-900/20 border border-green-500 rounded-lg p-6">
          <h2 className="text-green-400 text-xl font-bold mb-4">🎉 Phase 2: Advanced Analytics Dashboard Complete!</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-green-300 font-semibold mb-3">✅ Phase 2: Advanced Analytics Complete</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Interactive signal timeline visualization
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Advanced filtering interface
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Performance charts (P&L, Win Rate, Distribution)
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Multi-view dashboard (Overview/Timeline/Charts)
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Signal quality scoring system
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Comprehensive filter presets
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Real-time analytics updates
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-blue-300 font-semibold mb-3">🚀 Phase 3: Predictive Analytics (Next)</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">🤖</span>
                  Machine learning signal quality prediction
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">📊</span>
                  Market condition correlation analysis
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">⚙️</span>
                  Strategy optimization recommendations
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">🎯</span>
                  Advanced risk management scoring
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">📈</span>
                  Predictive performance modeling
                </li>
                <li className="flex items-center">
                  <span className="text-blue-400 mr-2">🔮</span>
                  AI-powered signal recommendations
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Strategy Foundation */}
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6">
          <h2 className="text-blue-400 text-xl font-bold mb-4">🏆 Strategy Foundation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-blue-300 font-semibold mb-3">📊 Locked Configuration</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">MACD Fast:</span>
                  <span className="text-white font-mono">5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">MACD Slow:</span>
                  <span className="text-white font-mono">15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">MACD Signal:</span>
                  <span className="text-white font-mono">5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">EMA Filter:</span>
                  <span className="text-white font-mono">9</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Position Size:</span>
                  <span className="text-white font-mono">100</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-blue-300 font-semibold mb-3">📈 Validated Performance</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Monthly Return:</span>
                  <span className="text-green-400 font-mono">10.04%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Win Rate:</span>
                  <span className="text-blue-400 font-mono">46.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Profit Factor:</span>
                  <span className="text-green-400 font-mono">1.58</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sharpe Ratio:</span>
                  <span className="text-yellow-400 font-mono">0.11</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Drawdown:</span>
                  <span className="text-red-400 font-mono">8.22%</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-blue-300 font-semibold mb-3">🎯 Next Milestone</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>Real-time TradingView chart integration with live SPY data</p>
                <p>Signal overlay system showing entry/exit points</p>
                <p>Interactive trade management interface</p>
                <p>WebSocket-based performance monitoring</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-700 p-6 mt-12">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p>🚀 Sydney's Trading System | Enhanced MACD Strategy | Week 1 Foundation Complete</p>
        </div>
      </footer>
    </div>
  );
}
