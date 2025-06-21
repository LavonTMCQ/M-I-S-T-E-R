import TradingViewChart from '@/components/TradingViewChart';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">
            🎯 Sydney's Advanced Trading System
          </h1>
          <p className="text-gray-300">
            Enhanced MACD Histogram Strategy | Locked Optimal Configuration | 10.04% Monthly Return
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Dashboard */}
        <Dashboard />

        {/* TradingView Chart */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">📊 SPY 5-Minute Chart</h2>
          <TradingViewChart
            symbol="SPY"
            interval="5m"
            height={600}
            theme="dark"
          />
        </div>

        {/* Week 1 Progress */}
        <div className="bg-green-900/20 border border-green-500 rounded-lg p-6">
          <h2 className="text-green-400 text-xl font-bold mb-4">🎉 Week 1 Implementation Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-green-300 font-semibold mb-3">✅ Completed Deliverables</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  TradingView integration research and documentation
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Next.js frontend project setup with TypeScript
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Basic chart component with mock SPY data
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  MACD calculation using locked optimal parameters (5/15/5)
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Signal generation with EMA-9 trend filter
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Performance dashboard with validated metrics
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  Development environment with hot reload
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-yellow-300 font-semibold mb-3">🔄 Week 2 Priorities</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">🔄</span>
                  TradingView library access and integration
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">🔄</span>
                  Real-time data feed from Alpha Vantage
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">🔄</span>
                  WebSocket implementation for live updates
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">🔄</span>
                  Interactive chart controls and navigation
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">🔄</span>
                  Signal overlay visualization on charts
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">🔄</span>
                  Performance optimization for real-time data
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
