"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity } from "lucide-react";

interface SingleADAChartProps {
  className?: string;
  height?: number;
  showHeader?: boolean;
}

export function SingleADAChart({
  className = '',
  height = 1000,
  showHeader = true
}: SingleADAChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
      "interval": "15", // 15-minute timeframe for detailed candles
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1", // Candlestick
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
      "studies": [
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies",
        "Volume@tv-basicstudies"
      ],
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
        "scalesProperties.backgroundColor": "#131722"
      }
    });

    // Create widget container with proper ID
    const widgetDiv = document.createElement('div');
    widgetDiv.id = containerId;
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = `${height}px`;
    widgetDiv.style.width = '100%';

    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [height]);

  if (!showHeader) {
    return (
      <div 
        ref={containerRef}
        className={`tradingview-widget-container ${className}`}
        style={{ height: `${height}px`, width: '100%' }}
      />
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          ADA/USD Live Chart
          <Badge variant="outline" className="ml-2">
            <Activity className="w-3 h-3 mr-1" />
            Real-Time
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div 
          ref={containerRef}
          className="tradingview-widget-container"
          style={{ height: `${height}px`, width: '100%' }}
        />
      </CardContent>
    </Card>
  );
}

// Clean Price Analysis - Single Chart Only
export function CleanADAPriceAnalysis({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Single, tall ADA chart */}
      <SingleADAChart height={1000} />
      
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
        <CardTitle className="text-lg">ADA/USD Price Chart</CardTitle>
      </CardHeader>
      <CardContent className="p-2 h-[750px]">
        <SingleADAChart height={720} showHeader={false} />
      </CardContent>
    </Card>
  );
}
