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
    <div className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">

          {/* Left Side - Price & Change Only */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">₳</span>
                </div>
                <span className="font-semibold text-lg">ADA/USD</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">${safeMarketData.price.toFixed(4)}</span>
                <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {isPositive ? '+' : ''}{safeMarketData.change24h.toFixed(4)}
                  </span>
                  <span className="text-sm">
                    ({isPositive ? '+' : ''}{safeMarketData.change24hPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Market Status Only */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Market Open
            </Badge>

            <Badge variant="secondary" className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Tomorrow Labs v.1
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
