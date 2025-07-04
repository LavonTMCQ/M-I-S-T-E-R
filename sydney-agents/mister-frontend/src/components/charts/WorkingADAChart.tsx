"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity } from "lucide-react";

interface WorkingADAChartProps {
  className?: string;
}

export function WorkingADAChart({ className = '' }: WorkingADAChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = '';

    // Create script element
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;

    // Simple, working configuration
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": "BINANCE:ADAUSD",
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "backgroundColor": "rgba(19, 23, 34, 1)",
      "gridColor": "rgba(42, 46, 57, 0.5)",
      "hide_top_toolbar": false,
      "hide_legend": false,
      "save_image": false,
      "calendar": false,
      "hide_volume": false,
      "support_host": "https://www.tradingview.com"
    });

    // Create widget container
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '600px';
    widgetDiv.style.width = '100%';

    containerRef.current.appendChild(widgetDiv);
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
          ADA/USD Live Chart
          <Badge variant="outline" className="ml-2">
            <Activity className="w-3 h-3 mr-1" />
            Real-Time
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className="tradingview-widget-container"
          style={{ height: '600px', width: '100%' }}
        />
      </CardContent>
    </Card>
  );
}

// Alternative: Mini Chart Widget
export function WorkingADAMiniChart({ className = '' }: WorkingADAChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;

    script.innerHTML = JSON.stringify({
      "symbol": "BINANCE:ADAUSD",
      "width": "100%",
      "height": "220",
      "locale": "en",
      "dateRange": "12M",
      "colorTheme": "dark",
      "isTransparent": false,
      "autosize": true,
      "largeChartUrl": ""
    });

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '220px';
    widgetDiv.style.width = '100%';

    containerRef.current.appendChild(widgetDiv);
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
        <CardTitle className="text-lg">ADA/USD Price</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className="tradingview-widget-container"
          style={{ height: '220px', width: '100%' }}
        />
      </CardContent>
    </Card>
  );
}

// Fallback: Simple HTML Chart
export function FallbackADAChart({ className = '' }: WorkingADAChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          ADA/USD Price Chart
          <Badge variant="outline" className="ml-2">
            <Activity className="w-3 h-3 mr-1" />
            Loading...
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[600px] bg-gray-900 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-2">ADA/USD</div>
            <div className="text-lg text-green-400">$0.548</div>
            <div className="text-sm text-gray-400">+1.29% (24h)</div>
            <div className="mt-4 text-sm text-gray-500">
              TradingView chart loading...
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main component that tries different approaches
export function WorkingADAPriceAnalysis({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Try the main chart first */}
      <WorkingADAChart />
      
      {/* Mini chart as backup */}
      <WorkingADAMiniChart />
      
      {/* Fallback display */}
      <FallbackADAChart />
      
      {/* Info section */}
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
                <li>• Professional charting</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Chart Features:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Multiple timeframes</li>
                <li>• Technical indicators</li>
                <li>• Volume analysis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
