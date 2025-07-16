'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ArrowDownRight,
  Activity,
  Zap,
  AlertTriangle
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
  duration?: number;
}

interface BacktestResults {
  runId: string;
  strategy: string;
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

interface ImprovedBacktestResultsProps {
  results: BacktestResults;
  isLoading?: boolean;
  className?: string;
}

export function ImprovedBacktestResults({ results, isLoading = false, className = '' }: ImprovedBacktestResultsProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [realTimeData, setRealTimeData] = useState<any>(null);

  // Performance calculations
  const winningTrades = results.trades.filter(trade => trade.netPnl > 0);
  const losingTrades = results.trades.filter(trade => trade.netPnl < 0);
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, trade) => sum + trade.netPnl, 0) / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, trade) => sum + trade.netPnl, 0) / losingTrades.length)
    : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

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

  if (isLoading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Running Backtest</h3>
            <p className="text-sm text-muted-foreground">
              Analyzing {results.strategy} strategy on {results.symbol}...
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Activity className="w-3 h-3 animate-pulse" />
              Processing market data and generating signals
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8" />
            Backtest Results
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{results.strategy}</span>
            <span>•</span>
            <span>{results.symbol} ({results.timeframe})</span>
            <span>•</span>
            <span>{new Date(results.startDate).toLocaleDateString()} - {new Date(results.endDate).toLocaleDateString()}</span>
          </div>
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

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(results.totalNetPnl)}
            </div>
            <div className="text-xs text-muted-foreground">Total P&L</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {results.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {profitFactor.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Profit Factor</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {results.maxDrawdown.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Max Drawdown</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {results.totalTrades}
            </div>
            <div className="text-xs text-muted-foreground">Total Trades</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-indigo-600">
              {Math.round(results.avgTradeDuration / 60)}h
            </div>
            <div className="text-xs text-muted-foreground">Avg Duration</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trades">Trade Log</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Winning Trades:</span>
                      <span className="font-medium text-green-600">{winningTrades.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Losing Trades:</span>
                      <span className="font-medium text-red-600">{losingTrades.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Win:</span>
                      <span className="font-medium text-green-600">{formatCurrency(avgWin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Loss:</span>
                      <span className="font-medium text-red-600">{formatCurrency(-avgLoss)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sharpe Ratio:</span>
                      <span className="font-medium">{results.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Factor:</span>
                      <span className="font-medium">{profitFactor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Return:</span>
                      <span className="font-medium text-green-600">
                        {formatPercentage((results.totalNetPnl / 50000) * 100)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.trades.slice(-5).reverse().map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {trade.side === 'LONG' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium text-sm">{trade.side}</div>
                          <div className="text-xs text-muted-foreground">
                            ${trade.entryPrice.toFixed(4)} → ${trade.exitPrice.toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium text-sm ${trade.netPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(trade.netPnl)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(trade.exitTime).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          {/* Trade log content will be added here */}
          <Card>
            <CardHeader>
              <CardTitle>Complete Trade Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Detailed trade log coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance analysis content will be added here */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Advanced performance analytics coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
