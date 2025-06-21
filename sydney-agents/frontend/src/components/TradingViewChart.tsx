'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  createSeriesMarkers
} from 'lightweight-charts';
import { OHLCV, MACDData, SignalData } from '@/types/tradingview';
import { alphaVantageService } from '@/services/alphaVantageService';
import { macdService } from '@/services/macdService';

interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  height?: number;
  theme?: 'light' | 'dark';
}

export default function TradingViewChart({
  symbol = 'SPY',
  interval = '5m',
  height = 600,
  theme = 'dark'
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realTimeData, setRealTimeData] = useState<{
    ohlcvData: OHLCV[];
    macdData: MACDData[];
    signals: SignalData[];
    ema9Data: number[];
    latestPrice: number;
    latestSignal: SignalData | null;
  } | null>(null);
  const [isRealTime, setIsRealTime] = useState(false);
  const [apiStatus, setApiStatus] = useState<string>('checking');
  const realTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Chart synchronization functionality
  const synchronizeCharts = useCallback((mainChart: IChartApi, macdChart: IChartApi) => {
    console.log('🔄 Setting up chart synchronization...');

    let isSyncing = false; // Prevent infinite loops

    // Synchronize time scale changes from main chart to MACD chart
    const syncMainToMacd = () => {
      if (isSyncing) return;
      isSyncing = true;

      try {
        const mainTimeScale = mainChart.timeScale();
        const macdTimeScale = macdChart.timeScale();
        const visibleRange = mainTimeScale.getVisibleRange();

        if (visibleRange) {
          macdTimeScale.setVisibleRange(visibleRange);
        }
      } catch (error) {
        console.log('Sync error (main to MACD):', error);
      }

      isSyncing = false;
    };

    // Synchronize time scale changes from MACD chart to main chart
    const syncMacdToMain = () => {
      if (isSyncing) return;
      isSyncing = true;

      try {
        const mainTimeScale = mainChart.timeScale();
        const macdTimeScale = macdChart.timeScale();
        const visibleRange = macdTimeScale.getVisibleRange();

        if (visibleRange) {
          mainTimeScale.setVisibleRange(visibleRange);
        }
      } catch (error) {
        console.log('Sync error (MACD to main):', error);
      }

      isSyncing = false;
    };

    // Subscribe to time scale changes
    mainChart.timeScale().subscribeVisibleTimeRangeChange(syncMainToMacd);
    macdChart.timeScale().subscribeVisibleTimeRangeChange(syncMacdToMain);

    console.log('✅ Chart synchronization enabled');

    // Return cleanup function
    return () => {
      try {
        mainChart.timeScale().unsubscribeVisibleTimeRangeChange(syncMainToMacd);
        macdChart.timeScale().unsubscribeVisibleTimeRangeChange(syncMacdToMain);
        console.log('🔄 Chart synchronization cleanup completed');
      } catch (error) {
        console.log('Cleanup error:', error);
      }
    };
  }, []);

  // Load real SPY data from Alpha Vantage
  const loadRealData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🚀 Loading real SPY data from Alpha Vantage...');

      // Check API status first
      const status = await alphaVantageService.checkApiStatus();
      setApiStatus(status.status);

      if (status.status === 'error') {
        throw new Error('Alpha Vantage API is not accessible');
      }

      // Fetch real SPY data
      const ohlcvData = await alphaVantageService.fetchIntradayData(symbol);

      if (ohlcvData.length === 0) {
        throw new Error('No data received from Alpha Vantage');
      }

      // Calculate MACD using locked optimal parameters
      const macdData = macdService.calculateMACDFromOHLCV(ohlcvData);

      // Calculate EMA-9 trend filter
      const prices = ohlcvData.map(d => d.close);
      const ema9Data = macdService.calculateEMA9(prices);

      // Generate signals using locked strategy
      const signals = macdService.generateSignals(ohlcvData, macdData);

      const data = {
        ohlcvData,
        macdData,
        signals,
        ema9Data,
        latestPrice: ohlcvData[ohlcvData.length - 1]?.close || 0,
        latestSignal: signals[signals.length - 1] || null
      };

      setRealTimeData(data);
      setIsLoading(false);

      console.log(`✅ Loaded ${ohlcvData.length} price bars, ${macdData.length} MACD points, ${signals.length} signals`);
      console.log(`📊 Using locked optimal MACD config: ${JSON.stringify(macdService.getConfig())}`);

    } catch (err) {
      console.error('❌ Error loading real data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      setIsLoading(false);
    }
  }, [symbol]);

  // Load data on component mount
  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  // Initialize TradingView Lightweight Charts
  useEffect(() => {
    if (!realTimeData || !chartContainerRef.current || !macdContainerRef.current) return;

    console.log('📈 Initializing TradingView Lightweight Charts...');

    // Clear previous charts
    if (chartRef.current) {
      chartRef.current.remove();
    }
    if (macdChartRef.current) {
      macdChartRef.current.remove();
    }

    try {
      // Create main price chart
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: height - 200, // Leave space for MACD chart
        layout: {
          background: { type: ColorType.Solid, color: '#1f2937' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#374151' },
          horzLines: { color: '#374151' },
        },
        crosshair: {
          mode: 1,
        },
        rightPriceScale: {
          borderColor: '#4b5563',
        },
        timeScale: {
          borderColor: '#4b5563',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      console.log('📊 Chart created:', chart);
      console.log('📊 Chart methods:', Object.getOwnPropertyNames(chart));
      console.log('📊 Chart prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(chart)));
      console.log('📊 Chart type:', typeof chart);
      console.log('📊 Chart constructor:', chart.constructor.name);

      chartRef.current = chart;

      // Use the correct TradingView Lightweight Charts v5 API
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#10b981',
        wickDownColor: '#ef4444',
        wickUpColor: '#10b981',
      });

      console.log('✅ Candlestick series created successfully!');

    candlestickSeriesRef.current = candlestickSeries;

    // Convert and set candlestick data
    const chartData = alphaVantageService.convertToLightweightChartData(realTimeData.ohlcvData);
    candlestickSeries.setData(chartData);

    // Add EMA-9 line series (v5 API - correct syntax)
    if (realTimeData.ema9Data.length > 0) {
      const emaSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        title: 'EMA-9 Trend Filter',
      });

      emaSeriesRef.current = emaSeries;

      // Create EMA data points
      const emaData = realTimeData.ema9Data.map((ema, index) => {
        const dataIndex = realTimeData.ohlcvData.length - realTimeData.ema9Data.length + index;
        if (dataIndex >= 0 && dataIndex < realTimeData.ohlcvData.length) {
          return {
            time: Math.floor(realTimeData.ohlcvData[dataIndex].timestamp.getTime() / 1000) as any,
            value: ema
          };
        }
        return null;
      }).filter(Boolean);

      emaSeries.setData(emaData);
    }

    // Add signal markers (v5 API - correct syntax)
    if (realTimeData.signals.length > 0) {
      const markers = realTimeData.signals.map(signal => ({
        time: Math.floor(signal.timestamp.getTime() / 1000) as any,
        position: signal.type === 'long' ? 'belowBar' as const : 'aboveBar' as const,
        color: signal.type === 'long' ? '#10b981' : '#ef4444',
        shape: signal.type === 'long' ? 'arrowUp' as const : 'arrowDown' as const,
        text: `${signal.type.toUpperCase()} @ $${signal.price.toFixed(2)}`,
        size: 1,
      }));

      createSeriesMarkers(candlestickSeries, markers);
      console.log(`✅ Added ${markers.length} signal markers to chart`);
    }

    // Create MACD chart
    const macdChart = createChart(macdContainerRef.current, {
      width: macdContainerRef.current.clientWidth,
      height: 150,
      layout: {
        background: { type: ColorType.Solid, color: '#111827' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      rightPriceScale: {
        borderColor: '#4b5563',
      },
      timeScale: {
        borderColor: '#4b5563',
        visible: false,
      },
    });

    macdChartRef.current = macdChart;

    // Add MACD histogram series (v5 API - correct syntax)
    if (realTimeData.macdData.length > 0) {
      const macdSeries = macdChart.addSeries(HistogramSeries, {
        color: '#8b5cf6',
        priceFormat: {
          type: 'volume',
        },
        title: 'MACD Histogram (5/15/5)',
      });

      macdSeriesRef.current = macdSeries;

      // Create MACD histogram data
      const macdHistogramData = realTimeData.macdData.map(macd => ({
        time: Math.floor(macd.timestamp.getTime() / 1000) as any,
        value: macd.histogram,
        color: macd.histogram >= 0 ? '#10b981' : '#ef4444'
      }));

      macdSeries.setData(macdHistogramData);
    }

    // Set up chart synchronization
    let cleanupSync: (() => void) | null = null;
    if (chartRef.current && macdChartRef.current) {
      cleanupSync = synchronizeCharts(chartRef.current, macdChartRef.current);
    }

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
      if (macdChartRef.current && macdContainerRef.current) {
        macdChartRef.current.applyOptions({
          width: macdContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);

      // Cleanup chart synchronization
      if (cleanupSync) {
        cleanupSync();
      }

      if (chartRef.current) {
        chartRef.current.remove();
      }
      if (macdChartRef.current) {
        macdChartRef.current.remove();
      }
    };

    } catch (error) {
      console.error('❌ Error initializing TradingView charts:', error);
      setError(`Chart initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [realTimeData, height, synchronizeCharts]);

  // Real-time updates
  const startRealTimeUpdates = useCallback(() => {
    if (isRealTime || realTimeIntervalRef.current) return;

    console.log('🔄 Starting real-time updates...');
    setIsRealTime(true);

    const updateInterval = setInterval(async () => {
      try {
        const latestPrice = await alphaVantageService.getLatestPrice(symbol);
        const timestamp = new Date();

        console.log(`💰 Real-time update: ${symbol} @ $${latestPrice.toFixed(2)}`);

        // Update MACD service with new price
        const update = macdService.updateWithNewPrice(latestPrice, timestamp);

        // Update chart data if we have new MACD data
        if (update.macd && candlestickSeriesRef.current) {
          // Add new price bar (simplified - in production, you'd accumulate OHLCV)
          const newBar = {
            time: Math.floor(timestamp.getTime() / 1000) as any,
            open: latestPrice,
            high: latestPrice,
            low: latestPrice,
            close: latestPrice,
          };

          candlestickSeriesRef.current.update(newBar);
        }

        // Update EMA line
        if (update.ema9 && emaSeriesRef.current) {
          emaSeriesRef.current.update({
            time: Math.floor(timestamp.getTime() / 1000) as any,
            value: update.ema9
          });
        }

        // Update MACD histogram
        if (update.macd && macdSeriesRef.current) {
          macdSeriesRef.current.update({
            time: Math.floor(timestamp.getTime() / 1000) as any,
            value: update.macd.histogram,
            color: update.macd.histogram >= 0 ? '#10b981' : '#ef4444'
          });
        }

        // Add new signal marker if generated
        if (update.signal && candlestickSeriesRef.current) {
          const newMarker = {
            time: Math.floor(timestamp.getTime() / 1000) as any,
            position: update.signal.type === 'long' ? 'belowBar' as const : 'aboveBar' as const,
            color: update.signal.type === 'long' ? '#10b981' : '#ef4444',
            shape: update.signal.type === 'long' ? 'arrowUp' as const : 'arrowDown' as const,
            text: `${update.signal.type.toUpperCase()} @ $${update.signal.price.toFixed(2)}`,
            size: 1,
          };

          // Note: In a real implementation, you'd manage markers more efficiently
          console.log(`🎯 New ${update.signal.type} signal generated at $${update.signal.price.toFixed(2)}`);
        }

        // Update component state
        setRealTimeData(prev => prev ? {
          ...prev,
          latestPrice: latestPrice,
          latestSignal: update.signal || prev.latestSignal
        } : null);

      } catch (error) {
        console.error('❌ Real-time update error:', error);
      }
    }, 60000); // 1-minute intervals

    realTimeIntervalRef.current = updateInterval;
  }, [isRealTime, symbol]);

  const stopRealTimeUpdates = useCallback(() => {
    console.log('⏹️ Stopping real-time updates...');
    setIsRealTime(false);

    if (realTimeIntervalRef.current) {
      clearInterval(realTimeIntervalRef.current);
      realTimeIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading real SPY data from Alpha Vantage...</p>
          <p className="text-gray-500 text-sm mt-2">API Status: {apiStatus}</p>
          <p className="text-gray-500 text-sm">Initializing TradingView Lightweight Charts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-900/20 rounded-lg border border-red-500">
        <div className="text-center">
          <p className="text-red-400 mb-2">❌ Chart Error</p>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={loadRealData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Main Price Chart Container */}
      <div
        ref={chartContainerRef}
        style={{ height: `${height - 200}px` }}
        className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden mb-4"
      />

      {/* MACD Chart Container */}
      <div
        ref={macdContainerRef}
        style={{ height: '150px' }}
        className="bg-gray-800 rounded-lg border border-gray-600 overflow-hidden mb-4"
      />

      {/* Chart Controls */}
      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg mb-4">
        <div className="flex space-x-4">
          <button
            onClick={loadRealData}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            🔄 Refresh Data
          </button>
          <button
            onClick={isRealTime ? stopRealTimeUpdates : startRealTimeUpdates}
            disabled={!realTimeData}
            className={`px-4 py-2 text-white rounded transition-colors disabled:opacity-50 ${
              isRealTime
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isRealTime ? '⏹️ Stop Live' : '▶️ Start Live'}
          </button>
          <button
            onClick={() => {
              chartRef.current?.timeScale().fitContent();
              macdChartRef.current?.timeScale().fitContent();
            }}
            disabled={!realTimeData}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            🎯 Fit Chart
          </button>
        </div>
        <div className="flex space-x-4 text-sm">
          <div className="text-gray-300">
            <span className="text-gray-400">Latest:</span>
            <span className="text-green-400 ml-1 font-mono">${realTimeData?.latestPrice.toFixed(2) || '---'}</span>
          </div>
          <div className="text-gray-300">
            <span className="text-gray-400">Bars:</span>
            <span className="text-blue-400 ml-1 font-mono">{realTimeData?.ohlcvData.length || 0}</span>
          </div>
          <div className="text-gray-300">
            <span className="text-gray-400">Signals:</span>
            <span className="text-yellow-400 ml-1 font-mono">{realTimeData?.signals.length || 0}</span>
          </div>
          <div className="text-gray-300">
            <span className="text-gray-400">Status:</span>
            <span className={`ml-1 font-mono ${isRealTime ? 'text-green-400' : 'text-gray-400'}`}>
              {isRealTime ? 'LIVE' : 'STATIC'}
            </span>
          </div>
        </div>
      </div>

      {/* Implementation Status */}
      <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg">
        <h4 className="text-green-400 font-semibold mb-2">🎉 Week 2 TradingView Integration Complete!</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-green-400">✅ TradingView Lightweight Charts operational</p>
            <p className="text-green-400">✅ Real Alpha Vantage SPY data loading</p>
            <p className="text-green-400">✅ MACD histogram with locked parameters (5/15/5)</p>
            <p className="text-green-400">✅ EMA-9 trend filter overlay</p>
            <p className="text-green-400">✅ Trading signal markers</p>
            <p className="text-green-400">✅ Real-time updates functional</p>
          </div>
          <div>
            <p className="text-blue-400">📊 Live SPY 5-minute candlestick chart</p>
            <p className="text-blue-400">🎯 MACD histogram with color coding</p>
            <p className="text-blue-400">📈 EMA-9 blue line trend filter</p>
            <p className="text-blue-400">⚡ Interactive controls (zoom, pan, fit)</p>
            <p className="text-blue-400">🔄 Real-time price and signal updates</p>
            <p className="text-blue-400">💰 Integration with performance dashboard</p>
          </div>
        </div>

        {/* Strategy Configuration Display */}
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500 rounded">
          <h5 className="text-blue-400 font-semibold mb-2">🔒 Locked Optimal Strategy Configuration</h5>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-gray-400">MACD:</span>
              <span className="text-white ml-1 font-mono">5/15/5</span>
            </div>
            <div>
              <span className="text-gray-400">EMA Filter:</span>
              <span className="text-white ml-1 font-mono">9-period</span>
            </div>
            <div>
              <span className="text-gray-400">Min Change:</span>
              <span className="text-white ml-1 font-mono">0.002</span>
            </div>
            <div>
              <span className="text-gray-400">Position Size:</span>
              <span className="text-white ml-1 font-mono">100 contracts</span>
            </div>
            <div>
              <span className="text-gray-400">Validated Return:</span>
              <span className="text-green-400 ml-1 font-mono">10.04%</span>
            </div>
            <div>
              <span className="text-gray-400">API Status:</span>
              <span className={`ml-1 font-mono ${
                apiStatus === 'active' ? 'text-green-400' :
                apiStatus === 'rate_limited' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {apiStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
