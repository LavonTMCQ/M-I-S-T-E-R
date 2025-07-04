"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Activity, Target, Info } from "lucide-react";

interface RealTradingViewChartProps {
  className?: string;
  symbol?: string;
  theme?: 'light' | 'dark';
  height?: number;
}

export function RealTradingViewChart({ 
  className = '', 
  symbol = 'BINANCE:ADAUSD',
  theme = 'dark',
  height = 600 
}: RealTradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing content
    containerRef.current.innerHTML = '';

    // Create TradingView widget script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;

    // Widget configuration
    const config = {
      "autosize": true,
      "symbol": symbol,
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": theme,
      "style": "1", // Candlestick
      "locale": "en",
      "enable_publishing": false,
      "backgroundColor": theme === 'dark' ? "rgba(19, 23, 34, 1)" : "rgba(255, 255, 255, 1)",
      "gridColor": theme === 'dark' ? "rgba(42, 46, 57, 0.5)" : "rgba(230, 230, 230, 0.5)",
      "hide_top_toolbar": false,
      "hide_legend": false,
      "save_image": false,
      "calendar": false,
      "hide_volume": false,
      "support_host": "https://www.tradingview.com",
      "studies": [
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies",
        "BB@tv-basicstudies"
      ],
      "show_popup_button": true,
      "popup_width": "1000",
      "popup_height": "650",
      "container_id": "tradingview_widget"
    };

    script.innerHTML = JSON.stringify(config);
    
    // Create container div for the widget
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'tradingview_widget';
    widgetContainer.style.height = `${height}px`;
    widgetContainer.style.width = '100%';
    
    containerRef.current.appendChild(widgetContainer);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, theme, height]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          ADA/USD Real-Time Price Chart
          <Badge variant="outline" className="ml-2">
            <Activity className="w-3 h-3 mr-1" />
            Live Data
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div
          ref={containerRef}
          className="w-full overflow-hidden rounded-lg"
          style={{ height: `${height}px` }}
        />
      </CardContent>
    </Card>
  );
}

// Alternative: TradingView Mini Chart Widget (Compact Version)
export function TradingViewMiniChart({ 
  className = '', 
  symbol = 'BINANCE:ADAUSD',
  theme = 'dark' 
}: Omit<RealTradingViewChartProps, 'height'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;

    const config = {
      "symbol": symbol,
      "width": "100%",
      "height": "220",
      "locale": "en",
      "dateRange": "12M",
      "colorTheme": theme,
      "isTransparent": true,
      "autosize": true,
      "largeChartUrl": ""
    };

    script.innerHTML = JSON.stringify(config);
    
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '220px';
    widgetContainer.style.width = '100%';
    
    containerRef.current.appendChild(widgetContainer);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, theme]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          ADA/USD Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div ref={containerRef} className="w-full h-[220px] overflow-hidden" />
      </CardContent>
    </Card>
  );
}

// Market Data Widget for additional crypto info
export function TradingViewMarketData({ 
  className = '', 
  theme = 'dark' 
}: { className?: string; theme?: 'light' | 'dark' }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js';
    script.async = true;

    const config = {
      "width": "100%",
      "height": "400",
      "symbolsGroups": [
        {
          "name": "Cardano Ecosystem",
          "originalName": "Cardano",
          "symbols": [
            {
              "name": "BINANCE:ADAUSD",
              "displayName": "ADA/USD"
            },
            {
              "name": "BINANCE:ADABTC", 
              "displayName": "ADA/BTC"
            },
            {
              "name": "BINANCE:ADAETH",
              "displayName": "ADA/ETH"
            }
          ]
        },
        {
          "name": "Major Crypto",
          "originalName": "Crypto",
          "symbols": [
            {
              "name": "BINANCE:BTCUSD",
              "displayName": "Bitcoin"
            },
            {
              "name": "BINANCE:ETHUSD",
              "displayName": "Ethereum"
            }
          ]
        }
      ],
      "showSymbolLogo": true,
      "isTransparent": true,
      "colorTheme": theme,
      "locale": "en"
    };

    script.innerHTML = JSON.stringify(config);
    
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '400px';
    widgetContainer.style.width = '100%';
    
    containerRef.current.appendChild(widgetContainer);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [theme]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Market Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div ref={containerRef} className="w-full h-[400px] overflow-hidden" />
      </CardContent>
    </Card>
  );
}

// Complete Price Analysis Section with Real TradingView Charts
export function RealPriceAnalysisSection({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Real-Time Chart - Fixed Height Container */}
      <div className="w-full">
        <RealTradingViewChart height={600} />
      </div>

      {/* Analysis Tabs with Real Data - Separate Container */}
      <div className="w-full">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Market Overview</TabsTrigger>
            <TabsTrigger value="analysis">Technical Analysis</TabsTrigger>
            <TabsTrigger value="comparison">Price Comparison</TabsTrigger>
          </TabsList>

          {/* Market Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TradingViewMiniChart />
              <TradingViewMarketData />
            </div>
          </TabsContent>

          {/* Technical Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Real-Time Technical Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    The TradingView chart above includes real-time technical analysis with:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Built-in Indicators:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• RSI (Relative Strength Index)</li>
                        <li>• MACD (Moving Average Convergence Divergence)</li>
                        <li>• Bollinger Bands</li>
                        <li>• Moving Averages (SMA, EMA)</li>
                        <li>• Volume Analysis</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Chart Features:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Real-time price updates</li>
                        <li>• Multiple timeframes</li>
                        <li>• Drawing tools</li>
                        <li>• Support/Resistance levels</li>
                        <li>• Pattern recognition</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Price Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>ADA vs BTC</CardTitle>
                </CardHeader>
                <CardContent>
                  <TradingViewMiniChart symbol="BINANCE:ADABTC" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>ADA vs ETH</CardTitle>
                </CardHeader>
                <CardContent>
                  <TradingViewMiniChart symbol="BINANCE:ADAETH" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
