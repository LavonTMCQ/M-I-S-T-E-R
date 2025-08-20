'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ChatSelector } from '@/components/ChatSelector';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { TrendingUp, TrendingDown, Activity, Clock, Wifi, WifiOff } from 'lucide-react';

interface TradingHeaderProps {
  isConnected: boolean;
  onRefresh?: () => void;
}

interface PortfolioStats {
  totalPnL: number;
  totalPositions: number;
  marginUsed: number;
  lastUpdate: Date | null;
}

export function TradingHeader({ isConnected, onRefresh }: TradingHeaderProps) {
  const { portfolioData, isLoading, fetchPortfolioData } = usePortfolio();
  const [marketStatus, setMarketStatus] = useState<'open' | 'closed' | 'pre-market' | 'after-hours'>('closed');

  // Use portfolio data from context
  const portfolioStats = {
    totalPnL: portfolioData?.totalPnL || 0,
    totalPositions: portfolioData?.positions?.length || 0,
    marginUsed: portfolioData?.marginUsed || 0,
    lastUpdate: portfolioData ? new Date() : null,
  };

  // DISABLED: Auto-fetch to prevent overloading Gemini
  // Users should manually refresh using the refresh button
  // useEffect(() => {
  //   if (isConnected) {
  //     fetchPortfolioData();
  //   }
  // }, [isConnected, fetchPortfolioData]);

  // Determine market status based on current time
  useEffect(() => {
    const updateMarketStatus = () => {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Crypto markets are always open, but we can show different statuses
      if (day === 0 || day === 6) {
        setMarketStatus('after-hours'); // Weekend
      } else if (hour >= 9 && hour < 16) {
        setMarketStatus('open'); // Traditional market hours for reference
      } else if (hour >= 7 && hour < 9) {
        setMarketStatus('pre-market');
      } else {
        setMarketStatus('after-hours');
      }
    };

    updateMarketStatus();
    const interval = setInterval(updateMarketStatus, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Handle refresh button click
  const handleRefresh = () => {
    if (onRefresh) onRefresh(); // Call parent refresh if provided
    fetchPortfolioData(true); // Force refresh portfolio data
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatRelativeTime = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return date.toLocaleTimeString();
  };

  const getMarketStatusIndicator = () => {
    const statusConfig = {
      open: { color: 'text-green-400', text: 'Markets Open', dot: 'bg-green-400' },
      'pre-market': { color: 'text-blue-400', text: 'Pre-Market', dot: 'bg-blue-400' },
      'after-hours': { color: 'text-orange-400', text: 'After Hours', dot: 'bg-orange-400' },
      closed: { color: 'text-slate-400', text: 'Markets Closed', dot: 'bg-slate-400' },
    };

    const config = statusConfig[marketStatus];

    return (
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${config.dot}`}></div>
        <span className={`${config.color} font-medium`}>{config.text}</span>
      </div>
    );
  };

  const getConnectionIndicator = () => {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
        <span className={`${isConnected ? 'text-green-400' : 'text-red-400'} font-medium`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    );
  };

  const getPnLIndicator = () => {
    const isProfit = portfolioStats.totalPnL > 0;
    const isZero = portfolioStats.totalPnL === 0;
    const statusClass = isZero ? 'profit-neutral' : isProfit ? 'profit-positive' : 'profit-negative';
    
    return (
      <div className={`flex items-center gap-2 font-medium trading-font ${statusClass}`}>
        {!isZero && (isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
        <span className="text-base">{formatCurrency(portfolioStats.totalPnL)}</span>
        {portfolioStats.totalPositions > 0 && (
          <span className="text-xs opacity-60 ml-1">
            ({portfolioStats.totalPositions} pos)
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-semibold tracking-tight">Phemex Portfolio Agent</h1>
          <div className="h-6 w-px bg-border"></div>
          {getPnLIndicator()}
          <div className="h-6 w-px bg-border"></div>
          <ChatSelector />
        </div>
        
        <div className="ml-auto flex items-center space-x-6">
          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
            <span>Last update: {formatRelativeTime(portfolioStats.lastUpdate)}</span>
            {isLoading && <Activity className="w-3 h-3 animate-spin text-primary" />}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-7 px-3 text-xs hover:bg-accent/50"
            >
              Refresh
            </Button>
          </div>
          <div className="h-6 w-px bg-border"></div>
          {getMarketStatusIndicator()}
          {getConnectionIndicator()}
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}