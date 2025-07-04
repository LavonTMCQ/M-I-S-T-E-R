"use client";

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
  LineStyle,
  PriceScaleMode
} from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, BarChart3, Activity, Volume2 } from "lucide-react";

// Types for chart data
export interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface VolumeData {
  time: string;
  value: number;
  color?: string;
}

export interface LineData {
  time: string;
  value: number;
}

export type ChartType = 'candlestick' | 'area' | 'line';
export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

interface TradingViewChartProps {
  symbol?: string;
  data?: CandlestickData[];
  volumeData?: VolumeData[];
  className?: string;
  height?: number;
  showVolume?: boolean;
  showToolbar?: boolean;
  defaultChartType?: ChartType;
  defaultTimeFrame?: TimeFrame;
  onTimeFrameChange?: (timeFrame: TimeFrame) => void;
  onChartTypeChange?: (chartType: ChartType) => void;
}

// Sample ADA/USD data for demonstration
const sampleCandlestickData: CandlestickData[] = [
  { time: '2024-01-01', open: 0.4500, high: 0.4650, low: 0.4420, close: 0.4580 },
  { time: '2024-01-02', open: 0.4580, high: 0.4720, low: 0.4550, close: 0.4680 },
  { time: '2024-01-03', open: 0.4680, high: 0.4750, low: 0.4620, close: 0.4690 },
  { time: '2024-01-04', open: 0.4690, high: 0.4780, low: 0.4650, close: 0.4720 },
  { time: '2024-01-05', open: 0.4720, high: 0.4820, low: 0.4680, close: 0.4750 },
  { time: '2024-01-08', open: 0.4750, high: 0.4850, low: 0.4700, close: 0.4780 },
  { time: '2024-01-09', open: 0.4780, high: 0.4880, low: 0.4740, close: 0.4820 },
  { time: '2024-01-10', open: 0.4820, high: 0.4920, low: 0.4780, close: 0.4850 },
  { time: '2024-01-11', open: 0.4850, high: 0.4950, low: 0.4800, close: 0.4880 },
  { time: '2024-01-12', open: 0.4880, high: 0.4980, low: 0.4840, close: 0.4920 },
  { time: '2024-01-15', open: 0.4920, high: 0.5020, low: 0.4870, close: 0.4950 },
  { time: '2024-01-16', open: 0.4950, high: 0.5050, low: 0.4900, close: 0.4980 },
  { time: '2024-01-17', open: 0.4980, high: 0.5080, low: 0.4930, close: 0.5010 },
  { time: '2024-01-18', open: 0.5010, high: 0.5110, low: 0.4960, close: 0.5040 },
  { time: '2024-01-19', open: 0.5040, high: 0.5140, low: 0.4990, close: 0.5070 },
  { time: '2024-01-22', open: 0.5070, high: 0.5170, low: 0.5020, close: 0.5100 },
  { time: '2024-01-23', open: 0.5100, high: 0.5200, low: 0.5050, close: 0.5130 },
  { time: '2024-01-24', open: 0.5130, high: 0.5230, low: 0.5080, close: 0.5160 },
  { time: '2024-01-25', open: 0.5160, high: 0.5260, low: 0.5110, close: 0.5190 },
  { time: '2024-01-26', open: 0.5190, high: 0.5290, low: 0.5140, close: 0.5220 },
];

const sampleVolumeData: VolumeData[] = sampleCandlestickData.map((candle, index) => ({
  time: candle.time,
  value: Math.random() * 1000000 + 500000,
  color: candle.close >= candle.open ? '#26a69a' : '#ef5350'
}));

export function TradingViewChart({
  symbol = 'ADA/USD',
  data = sampleCandlestickData,
  volumeData = sampleVolumeData,
  className = '',
  height = 500,
  showVolume = true,
  showToolbar = true,
  defaultChartType = 'candlestick',
  defaultTimeFrame = '1d',
  onTimeFrameChange,
  onChartTypeChange
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const mainSeries = useRef<ISeriesApi<any> | null>(null);
  const volumeSeries = useRef<ISeriesApi<any> | null>(null);
  
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(defaultTimeFrame);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart with professional styling
    chart.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#d1d4dc',
        fontSize: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.4)',
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.3 : 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.4)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    return () => {
      if (chart.current) {
        chart.current.remove();
        chart.current = null;
      }
    };
  }, [height, showVolume]);

  // Update chart type and data
  useEffect(() => {
    if (!chart.current) return;

    try {
      // Remove existing series
      if (mainSeries.current) {
        chart.current.removeSeries(mainSeries.current);
        mainSeries.current = null;
      }
      if (volumeSeries.current) {
        chart.current.removeSeries(volumeSeries.current);
        volumeSeries.current = null;
      }

      // Create main series based on chart type
      switch (chartType) {
        case 'candlestick':
          if (chart.current && typeof chart.current.addCandlestickSeries === 'function') {
            mainSeries.current = chart.current.addCandlestickSeries({
              upColor: '#26a69a',
              downColor: '#ef5350',
              borderVisible: false,
              wickUpColor: '#26a69a',
              wickDownColor: '#ef5350',
            });
            if (mainSeries.current && data) {
              mainSeries.current.setData(data);
            }
          }
          break;

        case 'area':
          if (chart.current && typeof chart.current.addAreaSeries === 'function') {
            const areaData = data.map(d => ({ time: d.time, value: d.close }));
            mainSeries.current = chart.current.addAreaSeries({
              lineColor: '#2962FF',
              topColor: 'rgba(41, 98, 255, 0.4)',
              bottomColor: 'rgba(41, 98, 255, 0.0)',
              lineWidth: 2,
            });
            if (mainSeries.current && areaData) {
              mainSeries.current.setData(areaData);
            }
          }
          break;

        case 'line':
          if (chart.current && typeof chart.current.addLineSeries === 'function') {
            const lineData = data.map(d => ({ time: d.time, value: d.close }));
            mainSeries.current = chart.current.addLineSeries({
              color: '#2962FF',
              lineWidth: 2,
            });
            if (mainSeries.current && lineData) {
              mainSeries.current.setData(lineData);
            }
          }
          break;
      }

      // Add volume series if enabled
      if (showVolume && volumeData && chart.current && typeof chart.current.addHistogramSeries === 'function') {
        volumeSeries.current = chart.current.addHistogramSeries({
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'volume',
          scaleMargins: {
            top: 0.7,
            bottom: 0,
          },
        });
        if (volumeSeries.current) {
          volumeSeries.current.setData(volumeData);
        }
      }
    } catch (error) {
      console.error('Error updating chart:', error);
    }

    // Calculate price statistics
    if (data.length > 0) {
      const latestCandle = data[data.length - 1];
      const previousCandle = data[data.length - 2];
      
      setCurrentPrice(latestCandle.close);
      
      if (previousCandle) {
        const change = latestCandle.close - previousCandle.close;
        const changePercent = (change / previousCandle.close) * 100;
        setPriceChange(change);
        setPriceChangePercent(changePercent);
      }
    }

    // Fit content
    chart.current.timeScale().fitContent();
  }, [chartType, data, volumeData, showVolume]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chart.current) {
        chart.current.resize(chartContainerRef.current.clientWidth, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height]);

  const handleChartTypeChange = (newType: ChartType) => {
    setChartType(newType);
    onChartTypeChange?.(newType);
  };

  const handleTimeFrameChange = (newTimeFrame: TimeFrame) => {
    setTimeFrame(newTimeFrame);
    onTimeFrameChange?.(newTimeFrame);
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-4">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {symbol} Price Chart
          </CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold">${currentPrice.toFixed(4)}</span>
            <span className={`flex items-center text-sm ${
              priceChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {priceChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(4)} ({priceChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        
        {showToolbar && (
          <div className="flex items-center space-x-2">
            <Select value={chartType} onValueChange={handleChartTypeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="candlestick">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Candles
                  </div>
                </SelectItem>
                <SelectItem value="area">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Area
                  </div>
                </SelectItem>
                <SelectItem value="line">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Line
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={timeFrame} onValueChange={handleTimeFrameChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
                <SelectItem value="1d">1d</SelectItem>
                <SelectItem value="1w">1w</SelectItem>
              </SelectContent>
            </Select>
            
            {showVolume && (
              <Button variant="outline" size="sm">
                <Volume2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div 
          ref={chartContainerRef} 
          className="w-full"
          style={{ height: `${height}px` }}
        />
      </CardContent>
    </Card>
  );
}
