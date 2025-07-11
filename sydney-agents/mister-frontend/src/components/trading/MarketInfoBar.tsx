'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketData {
  price: number;
  change24h: number;
  change24hPercent: number;
  // Removed Strike-specific data - will integrate broader market data later
  volume24h?: number;
  longInterest?: number;
  shortInterest?: number;
}

interface MarketInfoBarProps {
  marketData: MarketData;
}

export function MarketInfoBar({ marketData }: MarketInfoBarProps) {
  // Ensure all values have defaults to prevent undefined errors
  const safeMarketData = {
    price: marketData?.price || 0.47,
    change24h: marketData?.change24h || 0,
    change24hPercent: marketData?.change24hPercent || 0,
    // TODO: Need to integrate broader market data from major exchanges
    // Strike Finance data is too limited for comprehensive market analysis
    // Consider integrating: Binance, Coinbase, or aggregated data sources
    volume24h: marketData?.volume24h || 0,
    longInterest: marketData?.longInterest || 1777163.53,
    shortInterest: marketData?.shortInterest || 19694.99
  };

  const isPositive = safeMarketData.change24h >= 0;

  return (
    <div className="flex items-center justify-between">
      {/* Left Side - Price & Change */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-lg font-bold">₳</span>
            </div>
            <div>
              <div className="font-bold text-xl">ADA/USD</div>
              <div className="text-xs text-muted-foreground">Cardano</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">${safeMarketData.price.toFixed(4)}</span>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
              isPositive
                ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                : 'bg-red-500/10 text-red-600 border border-red-500/20'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <div className="flex items-center gap-1">
                <span className="font-semibold">
                  {isPositive ? '+' : ''}{safeMarketData.change24h.toFixed(4)}
                </span>
                <span className="text-sm opacity-80">
                  ({isPositive ? '+' : ''}{safeMarketData.change24hPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Market Status */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="flex items-center gap-2 bg-green-50 border-green-200 text-green-700 px-3 py-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Market Open
        </Badge>

        <Badge variant="secondary" className="flex items-center gap-2 bg-primary/10 border-primary/20 text-primary px-3 py-1.5">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          Tomorrow Labs v.1
        </Badge>
      </div>
    </div>
  );
}
