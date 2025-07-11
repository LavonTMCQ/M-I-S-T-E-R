'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { ProfessionalChart } from './ProfessionalChart';
import { ApexTradingChart } from './ApexTradingChart';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  DollarSign, 
  BarChart3,
  Download,
  Share2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface BacktestTrade {
  id: string;
  entryTime: string;
  exitTime: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  size: number;
  netPnl: number;
  reason: string;
  duration?: number; // in minutes
}

interface BacktestResults {
  runId: string;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  totalNetPnl: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
  avgTradeDuration: number;
  trades: BacktestTrade[];
  chartData: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
}

interface BacktestResultsProps {
  results: BacktestResults;
  className?: string;
}

export function BacktestResults({ results, className = '' }: BacktestResultsProps) {
  // Chart refs removed - using ProfessionalChart component instead
  const [selectedTrade, setSelectedTrade] = useState<BacktestTrade | null>(null);
  const [realChartData, setRealChartData] = useState<any[]>([]);
  const [realTrades, setRealTrades] = useState<BacktestTrade[]>([]);
  const [isLoadingChartData, setIsLoadingChartData] = useState(true);
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);

  // Fetch real market data directly from Kraken API
  useEffect(() => {
    const fetchRealMarketData = async () => {
      try {
        setIsLoadingChartData(true);
        setIsLoadingTrades(true);

        // Get date range for the last 30 days of data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days

        console.log(`📊 Fetching real ADA/USD market data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // Fetch real OHLCV data directly from Kraken API
        const since = Math.floor(startDate.getTime() / 1000);
        const krakenUrl = `https://api.kraken.com/0/public/OHLC?pair=ADAUSD&interval=15&since=${since}`;

        console.log('🌐 Fetching from Kraken API:', krakenUrl);

        const response = await fetch(krakenUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'MISTER-Trading-Bot/1.0'
          }
        });

        if (!response.ok) {
          throw new Error(`Kraken API error: ${response.status}`);
        }

        const krakenData = await response.json();

        if (krakenData.error && krakenData.error.length > 0) {
          throw new Error(`Kraken API error: ${krakenData.error.join(', ')}`);
        }

        // Extract OHLCV data from Kraken response
        const ohlcData = krakenData.result?.ADAUSD || [];

        if (ohlcData && ohlcData.length > 0) {
          // Convert Kraken format to our chart format
          const chartData = ohlcData.map((candle: any[]) => ({
            time: new Date(candle[0] * 1000).toISOString(), // Convert Unix timestamp to ISO string
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[6])
          }));

          setRealChartData(chartData);
          console.log(`✅ Loaded ${chartData.length} real OHLCV candles from Kraken API`);
          console.log('📊 Sample data:', chartData.slice(0, 3));
        } else {
          console.warn('No OHLCV data returned from Kraken, using fallback');
          setRealChartData(results.chartData || []);
        }

        // Use the trades from the backtest results
        setRealTrades(results.trades || []);
        console.log(`✅ Using ${results.trades?.length || 0} trades from backtest results`);

      } catch (error) {
        console.error('❌ Error fetching real market data:', error);
        setRealChartData(results.chartData || []);
        setRealTrades(results.trades || []);
      } finally {
        setIsLoadingChartData(false);
        setIsLoadingTrades(false);
      }
    };

    fetchRealMarketData();
  }, [results.chartData, results.trades]);

  // Performance metrics calculations - use real trades if available
  const tradesToCalculate = realTrades.length > 0 ? realTrades : results.trades;
  const winningTrades = tradesToCalculate.filter(trade => trade.netPnl > 0);
  const losingTrades = tradesToCalculate.filter(trade => trade.netPnl < 0);
  const totalNetPnl = tradesToCalculate.reduce((sum, trade) => sum + trade.netPnl, 0);
  const winRate = tradesToCalculate.length > 0 ? (winningTrades.length / tradesToCalculate.length) * 100 : 0;
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, trade) => sum + trade.netPnl, 0) / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, trade) => sum + trade.netPnl, 0) / losingTrades.length)
    : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Calculate average trade duration from real trades
  const avgTradeDuration = tradesToCalculate.length > 0
    ? tradesToCalculate.reduce((sum, trade) => {
        const entryTime = new Date(trade.entryTime).getTime();
        const exitTime = new Date(trade.exitTime).getTime();
        return sum + (exitTime - entryTime) / (1000 * 60 * 60); // hours
      }, 0) / tradesToCalculate.length
    : 0;

  // Chart initialization removed - using ProfessionalChart component instead

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Backtest Results</h1>
          <p className="text-muted-foreground mt-1">
            Run ID: {results.runId} • {results.symbol} ({results.timeframe})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Net P&L</p>
              <p className={`text-2xl font-bold ${totalNetPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(totalNetPnl)}
              </p>
              <p className="text-xs text-muted-foreground">
                ({formatPercentage((totalNetPnl / 5000) * 100)})
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                ({winningTrades.length}/{tradesToCalculate.length})
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Max Drawdown</p>
              <p className="text-2xl font-bold text-red-500">{results.maxDrawdown.toFixed(1)}%</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
              <p className="text-2xl font-bold">{results.sharpeRatio.toFixed(2)}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold">{tradesToCalculate.length}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avg. Trade Duration</p>
              <p className="text-2xl font-bold">{avgTradeDuration.toFixed(1)}h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            ADA Price Chart with{' '}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent font-bold animate-pulse drop-shadow-lg" style={{textShadow: '0 0 10px rgba(147, 51, 234, 0.5)'}}>
              MISTER
            </span>{' '}
            Signals
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingChartData || isLoadingTrades ? (
            <div className="w-full h-[600px] flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">
                  {isLoadingChartData && isLoadingTrades
                    ? 'Running Mastra ADA strategy backtest...'
                    : isLoadingChartData
                    ? 'Loading real market data...'
                    : 'Loading real trade data...'}
                </p>
              </div>
            </div>
          ) : (
            <ApexTradingChart
              chartData={realChartData.length > 0 ? realChartData : (results.chartData || [])}
              trades={realTrades.length > 0 ? realTrades : results.trades}
              className="w-full"
            />
          )}
        </CardContent>
      </Card>

      {/* Trades Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Trades Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] overflow-y-auto border rounded-md">
            <div className="space-y-2 p-4">
              {/* Table Header */}
              <div className="grid grid-cols-8 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div>Entry Time</div>
                <div>Exit Time</div>
                <div>Side</div>
                <div>Entry Price</div>
                <div>Exit Price</div>
                <div>Size</div>
                <div>Net P&L</div>
                <div>Reason</div>
              </div>

              {/* Trade Rows */}
              {(realTrades.length > 0 ? realTrades : results.trades).map((trade, index) => (
                <div
                  key={trade.id}
                  className={`grid grid-cols-8 gap-4 text-sm py-2 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors ${
                    selectedTrade?.id === trade.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedTrade(trade)}
                >
                  <div className="font-mono text-xs">
                    {new Date(trade.entryTime).toLocaleString()}
                  </div>
                  <div className="font-mono text-xs">
                    {new Date(trade.exitTime).toLocaleString()}
                  </div>
                  <div>
                    <Badge
                      variant={trade.side === 'LONG' ? 'default' : 'secondary'}
                      className={`text-xs ${
                        trade.side === 'LONG'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}
                    >
                      {trade.side === 'LONG' ? (
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                      )}
                      {trade.side}
                    </Badge>
                  </div>
                  <div className="font-mono">${trade.entryPrice.toFixed(4)}</div>
                  <div className="font-mono">${trade.exitPrice.toFixed(4)}</div>
                  <div className="font-mono">{trade.size.toFixed(6)}</div>
                  <div className={`font-mono font-medium ${
                    trade.netPnl >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {trade.netPnl >= 0 ? '+' : ''}{formatCurrency(trade.netPnl)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {trade.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Run Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Run Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] overflow-y-auto border rounded-md">
            <div className="space-y-2 font-mono text-sm p-4">
              <div className="text-muted-foreground">
                [{new Date(results.startDate).toISOString()}] Strategy execution started
              </div>
              <div className="text-muted-foreground">
                [{new Date(results.startDate).toISOString()}] Loading market data for {results.symbol}
              </div>
              <div className="text-muted-foreground">
                [{new Date(results.startDate).toISOString()}] Timeframe: {results.timeframe}
              </div>
              <div className="text-muted-foreground">
                [{new Date(results.startDate).toISOString()}] Date range: {results.startDate} to {results.endDate}
              </div>
              <div className="text-green-400">
                [{new Date(results.startDate).toISOString()}] Strategy initialized successfully
              </div>

              {(realTrades.length > 0 ? realTrades : results.trades).slice(0, 10).map((trade, index) => (
                <div key={trade.id} className="space-y-1">
                  <div className={trade.side === 'LONG' ? 'text-green-400' : 'text-red-400'}>
                    [{trade.entryTime}] {trade.side} position opened at ${trade.entryPrice.toFixed(4)}
                  </div>
                  <div className={trade.netPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                    [{trade.exitTime}] Position closed at ${trade.exitPrice.toFixed(4)} | P&L: {formatCurrency(trade.netPnl)} | Reason: {trade.reason}
                  </div>
                </div>
              ))}

              {results.trades.length > 10 && (
                <div className="text-muted-foreground">
                  ... {results.trades.length - 10} more trades
                </div>
              )}

              <div className="text-green-400">
                [{new Date(results.endDate).toISOString()}] Strategy execution completed
              </div>
              <div className="text-blue-400">
                [{new Date(results.endDate).toISOString()}] Final P&L: {formatCurrency(totalNetPnl)}
              </div>
              <div className="text-blue-400">
                [{new Date(results.endDate).toISOString()}] Win Rate: {winRate.toFixed(1)}%
              </div>
              <div className="text-blue-400">
                [{new Date(results.endDate).toISOString()}] Total Trades: {tradesToCalculate.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
