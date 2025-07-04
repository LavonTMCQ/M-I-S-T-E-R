"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ColorType } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface SimpleTradingViewChartProps {
  className?: string;
}

export function SimpleTradingViewChart({ className = '' }: SimpleTradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      // Create chart
      chart.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
          horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
        },
        rightPriceScale: {
          borderColor: 'rgba(197, 203, 206, 0.4)',
        },
        timeScale: {
          borderColor: 'rgba(197, 203, 206, 0.4)',
        },
      });

      // Add candlestick series
      const candlestickSeries = chart.current.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      // Sample data
      const data = [
        { time: '2024-01-01', open: 0.4500, high: 0.4650, low: 0.4420, close: 0.4580 },
        { time: '2024-01-02', open: 0.4580, high: 0.4720, low: 0.4550, close: 0.4680 },
        { time: '2024-01-03', open: 0.4680, high: 0.4750, low: 0.4620, close: 0.4690 },
        { time: '2024-01-04', open: 0.4690, high: 0.4780, low: 0.4650, close: 0.4720 },
        { time: '2024-01-05', open: 0.4720, high: 0.4820, low: 0.4680, close: 0.4750 },
      ];

      candlestickSeries.setData(data);

      // Fit content
      chart.current.timeScale().fitContent();

    } catch (error) {
      console.error('Error creating TradingView chart:', error);
    }

    return () => {
      if (chart.current) {
        chart.current.remove();
        chart.current = null;
      }
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chart.current) {
        chart.current.resize(chartContainerRef.current.clientWidth, 400);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          ADA/USD Price Chart (TradingView)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={chartContainerRef} 
          className="w-full"
          style={{ height: '400px' }}
        />
      </CardContent>
    </Card>
  );
}
