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
    if (!chartData || chartData.length === 0) {
      return [];
    }

    // Handle Railway API format (chartData.candlestick) or direct array
    const dataArray = Array.isArray(chartData) ? chartData : chartData.candlestick || [];

    return dataArray.map(candle => {
      // Handle both Unix timestamp (Railway API) and ISO string formats
      const timestamp = typeof candle.time === 'number'
        ? candle.time * 1000  // Convert Unix timestamp to milliseconds
        : new Date(candle.time).getTime(); // Parse ISO string

      return {
        x: timestamp,
        y: [
          parseFloat(candle.open),
          parseFloat(candle.high),
          parseFloat(candle.low),
          parseFloat(candle.close)
        ]
      };
    }).sort((a, b) => a.x - b.x);
  }, [chartData]);

  // Format trade annotations with enhanced trade pair visualization
  const annotations = useMemo(() => {
    if (!trades || trades.length === 0) {
      return { points: [], shapes: [] };
    }

    const points: any[] = [];
    const shapes: any[] = [];

    // Define colors for better trade pair visualization
    const tradeColors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
    ];

    trades.forEach((trade, index) => {
      // Handle both Railway API format and existing format
      const entryTime = trade.entry_timestamp || trade.entryTime;
      const exitTime = trade.exit_timestamp || trade.exitTime;
      const entryPrice = trade.entry_price || trade.entryPrice;
      const exitPrice = trade.exit_price || trade.exitPrice;
      const tradeSide = trade.type === 'long' ? 'LONG' : (trade.type === 'short' ? 'SHORT' : trade.side);
      const pnl = trade.pnl || trade.netPnl;

      // Skip if essential data is missing
      if (!entryTime || !entryPrice || !tradeSide) {
        console.warn('⚠️ Skipping trade due to missing data:', trade);
        return;
      }

      // Use consistent color for each trade pair
      const tradeColor = tradeColors[index % tradeColors.length];
      const tradeNumber = index + 1;

      // Entry point with trade number
      points.push({
        x: new Date(entryTime).getTime(),
        y: entryPrice,
        marker: {
          size: 10,
          fillColor: tradeColor,
          strokeColor: '#ffffff',
          strokeWidth: 2,
          shape: tradeSide === 'LONG' ? 'circle' : 'square'
        },
        label: {
          text: `${tradeNumber}${tradeSide.charAt(0)}`,
          style: {
            color: '#ffffff',
            background: tradeColor,
            fontSize: '9px',
            fontWeight: 'bold'
          }
        }
      });

      // Exit point (if trade is closed)
      if (exitTime && exitPrice && pnl !== undefined) {
        const isProfitable = pnl >= 0;

        // Exit point with same color as entry
        points.push({
          x: new Date(exitTime).getTime(),
          y: exitPrice,
          marker: {
            size: 8,
            fillColor: isProfitable ? '#22c55e' : '#ef4444',
            strokeColor: tradeColor,
            strokeWidth: 2,
            shape: 'circle'
          },
          label: {
            text: isProfitable ? '✓' : '✗',
            style: {
              color: '#ffffff',
              background: isProfitable ? '#22c55e' : '#ef4444',
              fontSize: '10px',
              fontWeight: 'bold'
            }
          }
        });

        // Add connecting line between entry and exit
        shapes.push({
          type: 'line',
          x1: new Date(entryTime).getTime(),
          y1: entryPrice,
          x2: new Date(exitTime).getTime(),
          y2: exitPrice,
          strokeDashArray: 3,
          borderColor: tradeColor,
          borderWidth: 1,
          opacity: 0.6
        });

      } else {
        console.log(`⚠️ CHART DEBUG: Missing exit data for trade ${index + 1}:`, { exitTime, exitPrice, pnl });
      }
    });

    console.log(`🎯 CHART DEBUG: Enhanced annotations created:`, {
      totalPoints: points.length,
      totalShapes: shapes.length,
      points,
      shapes
    });

    return { points, shapes };
  }, [trades]);

  // ApexCharts configuration
  const chartOptions = {
    chart: {
      type: 'candlestick' as const,
      height: 600,
      background: '#ffffff',
      redrawOnParentResize: true,
      redrawOnWindowResize: true,
      toolbar: {
        show: true,
        offsetX: 0,
        offsetY: 0,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        },
        export: {
          csv: {
            filename: 'trading-data'
          },
          svg: {
            filename: 'trading-chart'
          },
          png: {
            filename: 'trading-chart'
          }
        }
      },
      zoom: {
        enabled: true,
        type: 'x' as const,
        autoScaleYaxis: true,
        zoomedArea: {
          fill: {
            color: '#90CAF9',
            opacity: 0.4
          },
          stroke: {
            color: '#0D47A1',
            opacity: 0.4,
            width: 1
          }
        }
      },
      selection: {
        enabled: true,
        type: 'x' as const,
        fill: {
          color: '#24292e',
          opacity: 0.1
        },
        stroke: {
          width: 1,
          dashArray: 3,
          color: '#24292e',
          opacity: 0.4
        }
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
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
      },
      crosshairs: {
        show: true,
        width: 1,
        position: 'back',
        opacity: 0.9,
        stroke: {
          color: '#b6b6b6',
          width: 1,
          dashArray: 3
        }
      }
    },
    yaxis: {
      tooltip: {
        enabled: true
      },
      labels: {
        formatter: (value: number) => `$${value.toFixed(4)}`
      },
      crosshairs: {
        show: true,
        position: 'back',
        stroke: {
          color: '#b6b6b6',
          width: 1,
          dashArray: 3
        }
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
          key={`chart-${trades?.length || 0}-${chartData?.length || 0}`}
          options={chartOptions}
          series={series}
          type="candlestick"
          height={600}
        />
      </div>
      
      {/* Trade Statistics Overlay - Positioned to avoid chart controls */}
      {tradeStats && (
        <div className="absolute top-16 right-4 bg-black/80 text-white p-2 rounded text-xs backdrop-blur-sm z-10 shadow-md border border-gray-600 max-w-48">
          <div className="font-semibold mb-1 flex items-center gap-1 text-xs">
            <span className="text-yellow-400">📊</span>
            <span className="text-white">MISTER</span>
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between">
              <span>Trades:</span>
              <span className="text-blue-400">{tradeStats.total}</span>
            </div>
            <div className="flex justify-between">
              <span>Win Rate:</span>
              <span className="text-green-400">{tradeStats.winRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>P&L:</span>
              <span className={tradeStats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                ${tradeStats.totalPnl.toFixed(0)}
              </span>
            </div>
          </div>
          <div className="text-gray-400 text-xs mt-1 pt-1 border-t border-gray-600">
            <div className="text-center">1L/S=Entry • ✓/✗=Exit</div>
          </div>
        </div>
      )}
    </div>
  );
}
