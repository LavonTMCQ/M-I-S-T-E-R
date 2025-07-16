"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Activity,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { PnLChart } from "@/components/charts/PnLChart";
import { WinLossChart } from "@/components/charts/WinLossChart";
import { DrawdownChart } from "@/components/charts/DrawdownChart";

interface ModernAnalyticsPanelProps {
  className?: string;
}

export function ModernAnalyticsPanel({ className = "" }: ModernAnalyticsPanelProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const timeframes = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '3 Months' },
    { id: '1y', label: '1 Year' }
  ];

  // Mock analytics data
  const analyticsData = {
    overview: {
      totalReturn: 15.67,
      sharpeRatio: 1.23,
      maxDrawdown: -8.45,
      volatility: 12.34,
      totalTrades: 156,
      winRate: 68.5,
      avgWin: 4.23,
      avgLoss: -2.67
    },
    performance: {
      bestDay: 12.45,
      worstDay: -8.23,
      bestWeek: 23.67,
      worstWeek: -15.34,
      consecutiveWins: 7,
      consecutiveLosses: 3
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive performance analysis and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {timeframes.map((timeframe) => (
              <Button
                key={timeframe.id}
                variant={selectedTimeframe === timeframe.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTimeframe(timeframe.id)}
              >
                {timeframe.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Total Return</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                +{analyticsData.overview.totalReturn}%
              </div>
              <div className="text-xs text-muted-foreground">
                Since inception
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Sharpe Ratio</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {analyticsData.overview.sharpeRatio}
              </div>
              <div className="text-xs text-muted-foreground">
                Risk-adjusted return
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">Win Rate</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {analyticsData.overview.winRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                {analyticsData.overview.totalTrades} total trades
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium">Max Drawdown</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {analyticsData.overview.maxDrawdown}%
              </div>
              <div className="text-xs text-muted-foreground">
                Largest peak-to-trough decline
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="pnl">P&L Analysis</TabsTrigger>
          <TabsTrigger value="trades">Trade Analysis</TabsTrigger>
          <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <PerformanceChart 
              currentTimeframe={selectedTimeframe}
              onTimeframeChange={setSelectedTimeframe}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="pnl" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <PnLChart />
          </motion.div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <WinLossChart />
          </motion.div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <DrawdownChart />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Detailed Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Best Trading Day</span>
                <span className="font-medium text-green-600">+{analyticsData.performance.bestDay}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Worst Trading Day</span>
                <span className="font-medium text-red-600">{analyticsData.performance.worstDay}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Best Week</span>
                <span className="font-medium text-green-600">+{analyticsData.performance.bestWeek}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Worst Week</span>
                <span className="font-medium text-red-600">{analyticsData.performance.worstWeek}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Consecutive Wins</span>
                <Badge variant="outline">{analyticsData.performance.consecutiveWins} trades</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Consecutive Losses</span>
                <Badge variant="outline">{analyticsData.performance.consecutiveLosses} trades</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Trading Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Average Win</span>
                <span className="font-medium text-green-600">+{analyticsData.overview.avgWin}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Average Loss</span>
                <span className="font-medium text-red-600">{analyticsData.overview.avgLoss}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Profit Factor</span>
                <span className="font-medium">{(Math.abs(analyticsData.overview.avgWin / analyticsData.overview.avgLoss)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Volatility</span>
                <span className="font-medium">{analyticsData.overview.volatility}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Trades</span>
                <Badge variant="outline">{analyticsData.overview.totalTrades}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Win/Loss Ratio</span>
                <span className="font-medium">{(analyticsData.overview.winRate / (100 - analyticsData.overview.winRate)).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
