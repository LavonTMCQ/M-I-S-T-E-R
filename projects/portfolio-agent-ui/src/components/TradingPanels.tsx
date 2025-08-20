'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Target,
  Shield,
  Zap,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface TradingPanelsProps {
  isConnected: boolean;
}

interface RealPortfolioData {
  totalPnL: number;
  positions: Array<{
    symbol: string;
    side: string;
    size: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
  }>;
  marginUsed: number;
  marginAvailable: number;
  lastUpdate: string;
}

// Mock data for demo - in real app this would come from your portfolio agent
const mockPositions = [
  { 
    symbol: 'ADA/USDT', 
    side: 'Long', 
    size: 1000, 
    entryPrice: 0.45, 
    currentPrice: 0.48, 
    pnl: 30.00,
    pnlPercent: 6.67
  },
  { 
    symbol: 'ETH/USDT', 
    side: 'Short', 
    size: 0.5, 
    entryPrice: 2500, 
    currentPrice: 2450, 
    pnl: 25.00,
    pnlPercent: 2.00
  }
];

const mockChartData = [
  { time: '09:00', value: 100 },
  { time: '10:00', value: 120 },
  { time: '11:00', value: 90 },
  { time: '12:00', value: 150 },
  { time: '13:00', value: 130 },
  { time: '14:00', value: 155 },
];

const mockRiskData = [
  { name: 'Used', value: 35, color: '#ef4444' },
  { name: 'Available', value: 65, color: '#22c55e' }
];

export function TradingPanels({ isConnected }: TradingPanelsProps) {
  const { portfolioData, isLoading, fetchPortfolioData, getCacheStatus } = usePortfolio();

  // Use shared fetch function from context
  const handleRefresh = () => {
    fetchPortfolioData(true);
  };


  // Convert portfolio data to trading panels format
  const currentData = portfolioData ? {
    totalPnL: portfolioData.totalPnL,
    positions: portfolioData.positions,
    marginUsed: portfolioData.marginUsed,
    marginAvailable: portfolioData.marginAvailable,
    lastUpdate: portfolioData.lastUpdate
  } : {
    totalPnL: -21920.01,
    positions: mockPositions,
    marginUsed: 2040.18,
    marginAvailable: 22512.04,
    lastUpdate: 'Loading...'
  };

  const cacheStatus = getCacheStatus();

  return (
    <div className="flex gap-1">
      {/* P&L Performance Modal */}
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-6 w-6 p-0 hover:bg-accent/50 border border-border/30"
            title="P&L Performance"
          >
            <BarChart3 className="w-3 h-3 text-green-500" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-green-500" />
                P&L Performance
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${cacheStatus.color}`}>{cacheStatus.status}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="h-6 w-6 p-0"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData}>
                  <defs>
                    <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    fill="url(#pnlGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-muted/30 rounded-md">
                <div className="text-muted-foreground">Total P&L</div>
                <div className={`font-mono font-semibold ${currentData.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {currentData.totalPnL >= 0 ? '+' : ''}${currentData.totalPnL.toFixed(2)}
                </div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-md">
                <div className="text-muted-foreground">Positions</div>
                <div className="font-mono font-semibold">{currentData.positions.length}</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-md">
                <div className="text-muted-foreground">Last Update</div>
                <div className="font-mono text-xs">{currentData.lastUpdate}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Positions Modal */}
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-6 w-6 p-0 hover:bg-accent/50 border border-border/30"
            title="Live Positions"
          >
            <Target className="w-3 h-3 text-blue-500" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                Live Positions ({currentData.positions.length})
                {isLoading && <div className="ml-2 w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${cacheStatus.color}`}>{cacheStatus.status}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="h-6 w-6 p-0"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {currentData.positions.map((position, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${position.side === 'Long' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <div className="font-semibold">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">{position.side} Position</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono font-semibold ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                    </div>
                    <div className={`text-sm ${position.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Size</div>
                    <div className="font-mono">{position.size}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Entry</div>
                    <div className="font-mono">${position.entryPrice}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Current</div>
                    <div className="font-mono">${position.currentPrice}</div>
                  </div>
                </div>
              </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Risk Metrics Modal */}
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-6 w-6 p-0 hover:bg-accent/50 border border-border/30"
            title="Risk Metrics"
          >
            <Shield className="w-3 h-3 text-orange-500" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-500" />
                Risk Metrics
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${cacheStatus.color}`}>{cacheStatus.status}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="h-6 w-6 p-0"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="h-32 w-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockRiskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {mockRiskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between p-3 bg-muted/30 rounded-md">
                <span className="text-muted-foreground">Total Equity:</span>
                <span className="font-mono text-blue-500 font-semibold">${(24552.22).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/30 rounded-md">
                <span className="text-muted-foreground">Margin Used:</span>
                <span className="font-mono text-orange-500 font-semibold">${(2040.18).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/30 rounded-md">
                <span className="text-muted-foreground">Available:</span>
                <span className="font-mono text-green-500 font-semibold">${(22512.04).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/30 rounded-md">
                <span className="text-muted-foreground">Risk Level:</span>
                <span className="font-mono text-orange-500 font-semibold">
                  {Math.round((2040.18 / 24552.22) * 100)}% Used
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Market Data Modal */}
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-6 w-6 p-0 hover:bg-accent/50 border border-border/30"
            title="Market Data"
          >
            <Activity className="w-3 h-3 text-purple-500" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                Market Data
                <div className="flex items-center gap-1 ml-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-500">Live</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${cacheStatus.color}`}>{cacheStatus.status}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="h-6 w-6 p-0"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">ADA/USDT</div>
                    <div className="text-sm text-muted-foreground">Cardano</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-red-500 font-semibold">$0.9675</div>
                    <div className="text-sm text-red-500">-4.98%</div>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">ETH/USDT</div>
                    <div className="text-sm text-muted-foreground">Ethereum</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-green-500 font-semibold">$4,752</div>
                    <div className="text-sm text-green-500">+25.09%</div>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">FET/USDT</div>
                    <div className="text-sm text-muted-foreground">Fetch.ai</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-red-500 font-semibold">$0.7555</div>
                    <div className="text-sm text-red-500">-57.07%</div>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">ATOM/USDT</div>
                    <div className="text-sm text-muted-foreground">Cosmos</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-red-500 font-semibold">$4.878</div>
                    <div className="text-sm text-red-500">-47.29%</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}