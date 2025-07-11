"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ColorType, CandlestickSeries } from 'lightweight-charts';

interface ProfessionalChartProps {
  chartData: any[];
  trades: any[];
  className?: string;
}

export function ProfessionalChart({ chartData, trades, className = '' }: ProfessionalChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);

  // Calculate trade statistics for overlay
  const tradeStats = React.useMemo(() => {
    if (!trades || trades.length === 0) return null;

    const completedTrades = trades.filter(t => t.exitTime);
    const profitableTrades = completedTrades.filter(t => t.netPnl > 0);
    const totalPnl = completedTrades.reduce((sum, t) => sum + t.netPnl, 0);

    // Calculate average trade duration
    const tradeDurations = completedTrades.map(t => {
      const entry = new Date(t.entryTime);
      const exit = new Date(t.exitTime);
      return (exit.getTime() - entry.getTime()) / (1000 * 60 * 60); // hours
    });
    const avgDuration = tradeDurations.length > 0
      ? tradeDurations.reduce((sum, d) => sum + d, 0) / tradeDurations.length
      : 0;

    return {
      total: trades.length,
      completed: completedTrades.length,
      winRate: completedTrades.length > 0 ? (profitableTrades.length / completedTrades.length) * 100 : 0,
      totalPnl,
      avgDuration: avgDuration < 24 ? `${avgDuration.toFixed(1)}h` : `${(avgDuration / 24).toFixed(1)}d`,
      sameDayTrades: completedTrades.filter(t => {
        const entryDay = new Date(t.entryTime).toISOString().split('T')[0];
        const exitDay = new Date(t.exitTime).toISOString().split('T')[0];
        return entryDay === exitDay;
      }).length
    };
  }, [trades]);

  useEffect(() => {
    if (!chartContainerRef.current || !chartData || chartData.length === 0) return;

    try {
      // Create chart with professional styling matching target image
      chart.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 600,
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#333333',
        },
        grid: {
          vertLines: { color: 'rgba(200, 200, 200, 0.3)' },
          horzLines: { color: 'rgba(200, 200, 200, 0.3)' },
        },
        rightPriceScale: {
          borderColor: '#cccccc',
        },
        timeScale: {
          borderColor: '#cccccc',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      // Add candlestick series using v5 API
      const candlestickSeries = chart.current.addSeries(CandlestickSeries, {
        upColor: '#00C851',
        downColor: '#FF4444',
        borderVisible: true,
        borderUpColor: '#00C851',
        borderDownColor: '#FF4444',
        wickUpColor: '#00C851',
        wickDownColor: '#FF4444',
      });

      // Convert and set chart data with proper time formatting and deduplication
      const formattedData = chartData
        .map(item => ({
          time: item.time.split('T')[0], // Convert to YYYY-MM-DD format
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }))
        .sort((a, b) => a.time.localeCompare(b.time)) // Sort first
        .reduce((acc, current) => {
          // Remove duplicates by keeping only the last entry for each date
          const lastItem = acc[acc.length - 1];
          if (!lastItem || lastItem.time !== current.time) {
            acc.push(current);
          } else {
            // Replace with current (latest) data for this date
            acc[acc.length - 1] = current;
          }
          return acc;
        }, [] as any[]);

      console.log('Chart data sample:', formattedData.slice(0, 5));
      candlestickSeries.setData(formattedData);

      // Add trade markers with improved visualization
      if (trades && trades.length > 0) {
        console.log('📊 Processing', trades.length, 'trades for chart visualization');

        // Group trades by day to handle multiple trades per day
        const tradesByDay = new Map();
        trades.forEach(trade => {
          const entryDay = new Date(trade.entryTime).toISOString().split('T')[0];
          if (!tradesByDay.has(entryDay)) {
            tradesByDay.set(entryDay, []);
          }
          tradesByDay.get(entryDay).push(trade);
        });

        const markers: any[] = [];
        let markerOffset = 0;

        // Process trades with better spacing and reduced clutter
        tradesByDay.forEach((dayTrades, day) => {
          dayTrades.forEach((trade, index) => {
            const isProfitable = trade.netPnl >= 0;
            const isLong = trade.side === 'LONG';

            // Entry marker - simplified
            markers.push({
              time: day,
              position: isLong ? 'belowBar' : 'aboveBar' as const,
              color: isLong ? '#22c55e' : '#ef4444',
              shape: isLong ? 'arrowUp' : 'arrowDown' as const,
              text: `${trade.side.charAt(0)}`, // Just "L" or "S"
              size: 0.8,
            });

            // Exit marker - only if trade is closed and different day
            if (trade.exitTime) {
              const exitDay = new Date(trade.exitTime).toISOString().split('T')[0];

              // Only show exit marker if it's a different day or significant trade
              if (exitDay !== day || Math.abs(trade.netPnl) > 50) {
                markers.push({
                  time: exitDay,
                  position: isLong ? 'aboveBar' : 'belowBar' as const,
                  color: isProfitable ? '#22c55e' : '#ef4444',
                  shape: 'circle' as const,
                  text: isProfitable ? '✓' : '✗', // Simple checkmark or X
                  size: 0.6,
                });
              }
            }
          });
        });

        console.log('📈 Created', markers.length, 'chart markers from', trades.length, 'trades');
        candlestickSeries.setMarkers(markers);

        // Add trade duration lines for longer trades
        const tradeDurationLines: any[] = [];
        trades.forEach(trade => {
          if (trade.exitTime) {
            const entryDay = new Date(trade.entryTime).toISOString().split('T')[0];
            const exitDay = new Date(trade.exitTime).toISOString().split('T')[0];

            // Only show duration lines for trades lasting more than 1 day
            if (entryDay !== exitDay) {
              const isProfitable = trade.netPnl >= 0;
              tradeDurationLines.push({
                time: entryDay,
                value: trade.entryPrice,
              });
              tradeDurationLines.push({
                time: exitDay,
                value: trade.exitPrice,
              });
            }
          }
        });

        // Add a line series for trade durations if we have multi-day trades
        if (tradeDurationLines.length > 0) {
          const durationSeries = chart.current.addLineSeries({
            color: 'rgba(255, 193, 7, 0.6)',
            lineWidth: 1,
            lineStyle: 2, // Dashed line
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          durationSeries.setData(tradeDurationLines);
        }
      }

      // Fit content
      chart.current.timeScale().fitContent();

    } catch (error) {
      console.error('Error creating professional chart:', error);
    }

    return () => {
      if (chart.current) {
        chart.current.remove();
        chart.current = null;
      }
    };
  }, [chartData, trades]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chart.current) {
        chart.current.resize(chartContainerRef.current.clientWidth, 600);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`w-full relative ${className}`}>
      <div ref={chartContainerRef} className="w-full h-[600px]" />

      {/* Trade Statistics Overlay */}
      {tradeStats && (
        <div className="absolute top-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs space-y-1 backdrop-blur-sm">
          <div className="font-semibold text-yellow-400">Trade Analysis</div>
          <div>Total Trades: <span className="text-blue-400">{tradeStats.total}</span></div>
          <div>Completed: <span className="text-green-400">{tradeStats.completed}</span></div>
          <div>Win Rate: <span className="text-green-400">{tradeStats.winRate.toFixed(1)}%</span></div>
          <div>Total P&L: <span className={tradeStats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
            ${tradeStats.totalPnl.toFixed(0)}
          </span></div>
          <div>Avg Duration: <span className="text-purple-400">{tradeStats.avgDuration}</span></div>
          <div>Same-Day Trades: <span className="text-orange-400">{tradeStats.sameDayTrades}</span></div>
          <div className="text-gray-400 text-xs mt-2">
            L/S = Long/Short Entry • ✓/✗ = Profitable/Loss Exit
          </div>
        </div>
      )}
    </div>
  );
}
