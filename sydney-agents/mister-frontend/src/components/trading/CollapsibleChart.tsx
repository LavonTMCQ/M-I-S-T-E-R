'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TradingChart } from './TradingChart';
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Activity,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsibleChartProps {
  marketData: {
    price: number;
    change24h: number;
    change24hPercent: number;
    volume24h: number;
  };
}

export function CollapsibleChart({ marketData }: CollapsibleChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPositive = marketData.change24hPercent >= 0;

  return (
    <Card className="shadow-lg border-border/50 bg-gradient-to-br from-card to-card/95 overflow-hidden">
      {/* Collapsible Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors group"
      >
        <div className="flex items-center gap-4">
          {/* Chart Icon */}
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 group-hover:scale-105 transition-transform">
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>

          {/* Price Info */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground font-medium">ADA/USD</span>
              <span className="text-2xl font-bold">${marketData.price.toFixed(4)}</span>
            </div>

            {/* 24h Change */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <div className="flex flex-col items-start">
                <span className={`text-sm font-bold ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? '+' : ''}{marketData.change24h.toFixed(4)}
                </span>
                <span className={`text-xs ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? '+' : ''}{marketData.change24hPercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Volume */}
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">24h Volume</span>
              <span className="text-sm font-medium">
                ${(marketData.volume24h / 1000000).toFixed(2)}M
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Live badge and expand button */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <Activity className="h-3 w-3 mr-1 animate-pulse" />
            LIVE
          </Badge>
          
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors`}>
            {isExpanded ? (
              <>
                <Minimize2 className="h-4 w-4" />
                <span className="text-sm font-medium">Hide Chart</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                <span className="text-sm font-medium">Show Chart</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </div>
        </div>
      </button>

      {/* Expandable Chart Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 600, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              height: { duration: 0.3, ease: "easeInOut" },
              opacity: { duration: 0.2 }
            }}
            className="border-t border-border/30"
          >
            <CardContent className="p-0 h-[600px]">
              <TradingChart />
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}