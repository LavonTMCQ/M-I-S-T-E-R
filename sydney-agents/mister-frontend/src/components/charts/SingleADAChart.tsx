"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Activity, Clock, TrendingUp, Settings, Maximize2 } from "lucide-react";

interface SingleADAChartProps {
  className?: string;
  height?: number;
  showHeader?: boolean;
  showControls?: boolean;
  defaultTimeframe?: string;
  defaultChartType?: string;
}

export function SingleADAChart({
  className = '',
  height = 1000,
  showHeader = true,
  showControls = true,
  defaultTimeframe = '15',
  defaultChartType = '1'
}: SingleADAChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState(defaultTimeframe);
  const [chartType, setChartType] = useState(defaultChartType);
  const [showIndicators, setShowIndicators] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);

    // Clear container
    containerRef.current.innerHTML = '';

    // Create unique container ID to avoid conflicts
    const containerId = `tradingview_${Math.random().toString(36).substr(2, 9)}`;

    // Create script element
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;

    // Professional trading configuration matching your target design
    script.innerHTML = JSON.stringify({
      "autosize": false,
      "width": "100%",
      "height": height,
      "symbol": "BINANCE:ADAUSD",
      "interval": timeframe,
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": chartType,
      "locale": "en",
      "enable_publishing": false,
      "backgroundColor": "rgba(19, 23, 34, 1)",
      "gridColor": "rgba(42, 46, 57, 0.5)",
      "hide_top_toolbar": false,
      "hide_legend": false,
      "save_image": false,
      "calendar": false,
      "hide_volume": false,
      "support_host": "https://www.tradingview.com",
      "studies": showIndicators ? [
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies",
        "Volume@tv-basicstudies"
      ] : [],
      "show_popup_button": true,
      "popup_width": "1000",
      "popup_height": "650",
      "container_id": containerId,
      // Enhanced professional settings
      "withdateranges": true,
      "hide_side_toolbar": false,
      "allow_symbol_change": false,
      "details": true,
      "hotlist": false,
      "calendar": false,
      "studies_overrides": {},
      "overrides": {
        // Professional price scale styling
        "paneProperties.background": "#131722",
        "paneProperties.vertGridProperties.color": "#2a2e39",
        "paneProperties.horzGridProperties.color": "#2a2e39",
        "symbolWatermarkProperties.transparency": 90,
        "scalesProperties.textColor": "#d1d4dc",
        "scalesProperties.backgroundColor": "#131722",
        // Fix modal centering and alignment
        "paneProperties.topMargin": 0,
        "paneProperties.bottomMargin": 0,
        "paneProperties.leftAxisProperties.autoScale": true,
        "paneProperties.rightAxisProperties.autoScale": true
      }
    });

    // Create widget container with proper ID
    const widgetDiv = document.createElement('div');
    widgetDiv.id = containerId;
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = `${height}px`;
    widgetDiv.style.width = '100%';

    // Add load event listener
    script.onload = () => {
      setTimeout(() => setIsLoading(false), 2000); // Give widget time to fully load
    };

    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [height, timeframe, chartType, showIndicators]);

  if (!showHeader) {
    return (
      <div
        ref={containerRef}
        className={`tradingview-widget-container w-full overflow-hidden ${className}`}
        style={{
          height: `${height}px`,
          width: '100%',
          margin: 0,
          padding: 0,
          border: 'none',
          borderRadius: '8px'
        }}
      />
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            ADA/USD Live Chart
            <Badge variant="outline" className="ml-2">
              <Activity className="w-3 h-3 mr-1" />
              Real-Time
            </Badge>
          </CardTitle>

          {showControls && (
            <div className="flex items-center gap-2">
              {/* Timeframe Selector */}
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1m</SelectItem>
                  <SelectItem value="5">5m</SelectItem>
                  <SelectItem value="15">15m</SelectItem>
                  <SelectItem value="30">30m</SelectItem>
                  <SelectItem value="60">1h</SelectItem>
                  <SelectItem value="240">4h</SelectItem>
                  <SelectItem value="D">1D</SelectItem>
                  <SelectItem value="W">1W</SelectItem>
                </SelectContent>
              </Select>

              {/* Chart Type Selector */}
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Candles</SelectItem>
                  <SelectItem value="0">Bars</SelectItem>
                  <SelectItem value="3">Line</SelectItem>
                  <SelectItem value="8">Area</SelectItem>
                </SelectContent>
              </Select>

              {/* Indicators Toggle */}
              <Button
                variant={showIndicators ? "default" : "outline"}
                size="sm"
                onClick={() => setShowIndicators(!showIndicators)}
                className="h-8 px-3"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Indicators
              </Button>

              {/* Fullscreen Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const widget = containerRef.current?.querySelector('iframe');
                  if (widget) {
                    widget.requestFullscreen?.();
                  }
                }}
                className="h-8 px-3"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-b-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-300">Loading chart...</p>
            </div>
          </div>
        )}
        <div
          ref={containerRef}
          className="tradingview-widget-container w-full overflow-hidden"
          style={{
            height: `${height}px`,
            width: '100%',
            margin: 0,
            padding: 0,
            border: 'none',
            borderRadius: '0 0 8px 8px' // Match card border radius
          }}
        />
      </CardContent>
    </Card>
  );
}

// Enhanced Chart with Full Controls
export function EnhancedADAChart({ className = '' }: { className?: string }) {
  return (
    <SingleADAChart
      className={className}
      height={800}
      showHeader={true}
      showControls={true}
      defaultTimeframe="15"
      defaultChartType="1"
    />
  );
}

// Clean Price Analysis - Single Chart Only
export function CleanADAPriceAnalysis({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced ADA chart with controls */}
      <EnhancedADAChart />
      
      {/* Strike Finance info */}
      <Card>
        <CardHeader>
          <CardTitle>Strike Finance - ADA Trading</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Trading Focus:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• ADA/USD perpetual swaps</li>
                <li>• Real-time Binance data</li>
                <li>• Professional charting tools</li>
                <li>• Technical analysis indicators</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Chart Features:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Multiple timeframes (1m to 1M)</li>
                <li>• Candlestick charts with volume</li>
                <li>• RSI and MACD indicators</li>
                <li>• Zoom and navigation controls</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Compact chart for trading page - Optimized for single-page layout
export function CompactADAChart({ className = '' }: { className?: string }) {
  return (
    <Card className={`${className} h-full`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            ADA/USD Price Chart
            <Badge variant="outline" className="ml-2">
              <Activity className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            15m
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[750px]">
        <SingleADAChart
          height={750}
          showHeader={false}
          showControls={false}
          defaultTimeframe="15"
          defaultChartType="1"
        />
      </CardContent>
    </Card>
  );
}

// Note: Components are exported individually above
