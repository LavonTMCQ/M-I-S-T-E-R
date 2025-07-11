"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ApexTradingChartProps {
  chartData: any[];
  trades: any[];
  className?: string;
}

export function ApexTradingChart({ chartData, trades, className = '' }: ApexTradingChartProps) {
  
  // Calculate trade statistics
  const tradeStats = useMemo(() => {
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

  // Format data for ApexCharts candlestick
  const candlestickData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    
    return chartData.map(candle => ({
      x: new Date(candle.time).getTime(),
      y: [
        parseFloat(candle.open),
        parseFloat(candle.high),
        parseFloat(candle.low),
        parseFloat(candle.close)
      ]
    })).sort((a, b) => a.x - b.x);
  }, [chartData]);

  // Format trade annotations
  const annotations = useMemo(() => {
    if (!trades || trades.length === 0) return { points: [] };
    
    const points: any[] = [];
    
    trades.forEach((trade, index) => {
      // Entry point
      points.push({
        x: new Date(trade.entryTime).getTime(),
        y: trade.entryPrice,
        marker: {
          size: 8,
          fillColor: trade.side === 'LONG' ? '#22c55e' : '#ef4444',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          shape: trade.side === 'LONG' ? 'circle' : 'square'
        },
        label: {
          text: `${trade.side.charAt(0)}`,
          style: {
            color: '#ffffff',
            background: trade.side === 'LONG' ? '#22c55e' : '#ef4444',
            fontSize: '10px',
            fontWeight: 'bold'
          }
        }
      });

      // Exit point (if trade is closed)
      if (trade.exitTime && trade.exitPrice) {
        const isProfitable = trade.netPnl >= 0;
        points.push({
          x: new Date(trade.exitTime).getTime(),
          y: trade.exitPrice,
          marker: {
            size: 6,
            fillColor: isProfitable ? '#22c55e' : '#ef4444',
            strokeColor: '#ffffff',
            strokeWidth: 1,
            shape: 'circle'
          },
          label: {
            text: isProfitable ? '✓' : '✗',
            style: {
              color: '#ffffff',
              background: isProfitable ? '#22c55e' : '#ef4444',
              fontSize: '8px'
            }
          }
        });
      }
    });

    return { points };
  }, [trades]);

  // ApexCharts configuration
  const chartOptions = {
    chart: {
      type: 'candlestick' as const,
      height: 600,
      background: '#ffffff',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      zoom: {
        enabled: true,
        type: 'x' as const,
        autoScaleYaxis: true
      }
    },
    // Title removed - handled by parent Card component
    xaxis: {
      type: 'datetime' as const,
      labels: {
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM \'yy',
          day: 'dd MMM',
          hour: 'HH:mm'
        }
      }
    },
    yaxis: {
      tooltip: {
        enabled: true
      },
      labels: {
        formatter: (value: number) => `$${value.toFixed(4)}`
      }
    },
    annotations: annotations,
    grid: {
      borderColor: '#e0e0e0',
      strokeDashArray: 3
    },
    tooltip: {
      enabled: true,
      shared: false,
      custom: ({ seriesIndex, dataPointIndex, w }: any) => {
        try {
          // Get the actual candlestick data from the series
          const seriesData = w.config.series[seriesIndex]?.data;
          if (!seriesData || !seriesData[dataPointIndex]) return '';

          const candle = seriesData[dataPointIndex];
          const [open, high, low, close] = candle.y || [0, 0, 0, 0];
          const timestamp = candle.x;
          const date = new Date(timestamp).toLocaleDateString();
          const time = new Date(timestamp).toLocaleTimeString();

          return `
            <div class="bg-white p-3 border rounded shadow-lg text-sm">
              <div class="font-semibold mb-2">${date} ${time}</div>
              <div>Open: <span class="font-mono text-blue-600">$${open.toFixed(4)}</span></div>
              <div>High: <span class="font-mono text-green-600">$${high.toFixed(4)}</span></div>
              <div>Low: <span class="font-mono text-red-600">$${low.toFixed(4)}</span></div>
              <div>Close: <span class="font-mono text-purple-600">$${close.toFixed(4)}</span></div>
              <div class="mt-2 text-xs text-gray-500">
                Change: <span class="${close >= open ? 'text-green-600' : 'text-red-600'}">
                  ${close >= open ? '+' : ''}${((close - open) / open * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          `;
        } catch (error) {
          return '<div class="bg-white p-2 border rounded">Hover data unavailable</div>';
        }
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#22c55e',
          downward: '#ef4444'
        },
        wick: {
          useFillColor: true
        }
      }
    }
  };

  const series = [{
    name: 'ADA/USD',
    data: candlestickData
  }];

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`w-full h-[600px] flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full relative ${className}`}>
      <div className="w-full">
        <Chart
          options={chartOptions}
          series={series}
          type="candlestick"
          height={600}
        />
      </div>
      
      {/* Trade Statistics Overlay - Positioned away from price scale */}
      {tradeStats && (
        <div className="absolute top-16 left-20 bg-black/90 text-white p-2 rounded-lg text-xs space-y-0.5 backdrop-blur-sm z-10 max-w-xs shadow-lg border border-gray-700">
          <div className="font-semibold mb-1 flex items-center gap-1">
            <span className="text-yellow-400">📊</span>
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-600 bg-clip-text text-transparent font-bold drop-shadow-sm" style={{textShadow: '0 0 8px rgba(147, 51, 234, 0.4)'}}>
              MISTER
            </span>
            <span className="text-white">Analysis</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <div>Trades: <span className="text-blue-400">{tradeStats.total}</span></div>
            <div>Completed: <span className="text-green-400">{tradeStats.completed}</span></div>
            <div>Win Rate: <span className="text-green-400">{tradeStats.winRate.toFixed(1)}%</span></div>
            <div>P&L: <span className={tradeStats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
              ${tradeStats.totalPnl.toFixed(0)}
            </span></div>
            <div>Duration: <span className="text-purple-400">{tradeStats.avgDuration}</span></div>
            <div>Same-Day: <span className="text-orange-400">{tradeStats.sameDayTrades}</span></div>
          </div>
          <div className="text-gray-400 text-xs mt-1 pt-1 border-t border-gray-600">
            L/S = Entry • ✓/✗ = Exit
          </div>
        </div>
      )}
    </div>
  );
}
