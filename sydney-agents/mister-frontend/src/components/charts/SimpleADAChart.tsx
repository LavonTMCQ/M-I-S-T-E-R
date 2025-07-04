"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity } from "lucide-react";

interface SimpleADAChartProps {
  className?: string;
  height?: number;
}

export function SimpleADAChart({ 
  className = '', 
  height = 600 
}: SimpleADAChartProps) {
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

    // Simplified widget configuration focused on ADA/USD
    const config = {
      "autosize": true,
      "symbol": "BINANCE:ADAUSD",
      "interval": "D",
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
        "MACD@tv-basicstudies"
      ],
      "show_popup_button": true,
      "popup_width": "1000",
      "popup_height": "650",
      "container_id": "tradingview_ada_chart"
    };

    script.innerHTML = JSON.stringify(config);
    
    // Create container div for the widget
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'tradingview_ada_chart';
    widgetContainer.style.height = `${height}px`;
    widgetContainer.style.width = '100%';
    
    containerRef.current.appendChild(widgetContainer);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [height]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          ADA/USD Price Chart
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

// Alternative: TradingView Symbol Widget (Simpler)
export function SimpleADASymbolWidget({ 
  className = '' 
}: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.async = true;

    const config = {
      "symbols": [
        [
          "BINANCE:ADAUSD|1D"
        ]
      ],
      "chartOnly": false,
      "width": "100%",
      "height": "500",
      "locale": "en",
      "colorTheme": "dark",
      "autosize": true,
      "showVolume": false,
      "showMA": false,
      "hideDateRanges": false,
      "hideMarketStatus": false,
      "hideSymbolLogo": false,
      "scalePosition": "right",
      "scaleMode": "Normal",
      "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      "fontSize": "10",
      "noTimeScale": false,
      "valuesTracking": "1",
      "changeMode": "price-and-percent",
      "chartType": "area",
      "maLineColor": "#2962FF",
      "maLineWidth": 1,
      "maLength": 9,
      "backgroundColor": "rgba(19, 23, 34, 1)",
      "lineWidth": 2,
      "lineType": 0,
      "dateRanges": [
        "1d|1",
        "1m|30",
        "3m|60",
        "12m|1D",
        "60m|1W",
        "all|1M"
      ]
    };

    script.innerHTML = JSON.stringify(config);
    
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '500px';
    widgetContainer.style.width = '100%';
    
    containerRef.current.appendChild(widgetContainer);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          ADA/USD Price Overview
          <Badge variant="outline" className="ml-2">
            <Activity className="w-3 h-3 mr-1" />
            Real-Time
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div ref={containerRef} className="w-full h-[500px] overflow-hidden" />
      </CardContent>
    </Card>
  );
}

// Simplified Price Analysis Section - ADA Only
export function SimpleADAPriceAnalysis({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main ADA/USD Chart */}
      <SimpleADAChart height={600} />
      
      {/* Alternative: Symbol Widget */}
      <SimpleADASymbolWidget />
      
      {/* Simple Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>ADA Trading Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Strike Finance Focus:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• ADA/USD perpetual swaps</li>
                <li>• Real-time price data from Binance</li>
                <li>• Professional charting tools</li>
                <li>• Technical analysis indicators</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Chart Features:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Multiple timeframes (1m to 1M)</li>
                <li>• Candlestick and area charts</li>
                <li>• Volume analysis</li>
                <li>• RSI and MACD indicators</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
