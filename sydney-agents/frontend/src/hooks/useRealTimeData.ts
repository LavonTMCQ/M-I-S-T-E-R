/**
 * Real-Time Data Hook for TradingView Chart
 * Manages Alpha Vantage data fetching and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OHLCV, MACDData, SignalData } from '@/types/tradingview';
import { alphaVantageService } from '@/services/alphaVantageService';
import { macdService } from '@/services/macdService';

export interface RealTimeDataState {
  ohlcvData: OHLCV[];
  macdData: MACDData[];
  signals: SignalData[];
  ema9Data: number[];
  latestPrice: number;
  latestSignal: SignalData | null;
  isLoading: boolean;
  error: string | null;
  apiStatus: string;
  isRealTime: boolean;
}

export interface RealTimeDataActions {
  loadData: () => Promise<void>;
  startRealTime: () => void;
  stopRealTime: () => void;
  clearError: () => void;
  refreshData: () => Promise<void>;
}

export function useRealTimeData(symbol: string = 'SPY'): [RealTimeDataState, RealTimeDataActions] {
  const [state, setState] = useState<RealTimeDataState>({
    ohlcvData: [],
    macdData: [],
    signals: [],
    ema9Data: [],
    latestPrice: 0,
    latestSignal: null,
    isLoading: true,
    error: null,
    apiStatus: 'checking',
    isRealTime: false
  });

  const realTimeCleanupRef = useRef<(() => void) | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      console.log(`🚀 Loading real ${symbol} data from Alpha Vantage...`);

      // Check API status first
      const status = await alphaVantageService.checkApiStatus();
      setState(prev => ({ ...prev, apiStatus: status.status }));

      if (status.status === 'error') {
        throw new Error('Alpha Vantage API is not accessible');
      }

      // Fetch real data
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

      setState(prev => ({
        ...prev,
        ohlcvData,
        macdData,
        signals,
        ema9Data,
        latestPrice: ohlcvData[ohlcvData.length - 1]?.close || 0,
        latestSignal: signals[signals.length - 1] || null,
        isLoading: false,
        error: null
      }));

      console.log(`✅ Loaded ${ohlcvData.length} price bars, ${macdData.length} MACD points, ${signals.length} signals`);

    } catch (err) {
      console.error('❌ Error loading real data:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load chart data',
        isLoading: false
      }));
    }
  }, [symbol]);

  // Start real-time updates
  const startRealTime = useCallback(() => {
    if (state.isRealTime || realTimeCleanupRef.current) return;

    console.log('🔄 Starting real-time updates...');
    setState(prev => ({ ...prev, isRealTime: true }));

    const cleanup = alphaVantageService.startRealTimeUpdates(
      symbol,
      (price, timestamp) => {
        console.log(`💰 Real-time update: ${symbol} @ $${price.toFixed(2)}`);
        
        // Update MACD service with new price
        const update = macdService.updateWithNewPrice(price, timestamp);
        
        // Update state with new data
        setState(prev => {
          const newState = { ...prev, latestPrice: price };
          
          // Add new OHLCV data point (simplified)
          if (update.macd) {
            const newOHLCV: OHLCV = {
              timestamp,
              open: price,
              high: price,
              low: price,
              close: price,
              volume: 0 // Would need real volume data
            };
            
            newState.ohlcvData = [...prev.ohlcvData.slice(-99), newOHLCV]; // Keep last 100
            newState.macdData = [...prev.macdData.slice(-99), update.macd]; // Keep last 100
          }
          
          // Add new EMA data
          if (update.ema9) {
            newState.ema9Data = [...prev.ema9Data.slice(-99), update.ema9]; // Keep last 100
          }
          
          // Add new signal if generated
          if (update.signal) {
            newState.signals = [...prev.signals, update.signal];
            newState.latestSignal = update.signal;
            console.log(`🎯 New ${update.signal.type} signal generated at $${update.signal.price.toFixed(2)}`);
          }
          
          return newState;
        });
      },
      60000 // 1-minute intervals
    );

    realTimeCleanupRef.current = cleanup;
  }, [symbol, state.isRealTime]);

  // Stop real-time updates
  const stopRealTime = useCallback(() => {
    console.log('⏹️ Stopping real-time updates...');
    
    if (realTimeCleanupRef.current) {
      realTimeCleanupRef.current();
      realTimeCleanupRef.current = null;
    }
    
    setState(prev => ({ ...prev, isRealTime: false }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    // Stop real-time updates if active
    if (state.isRealTime) {
      stopRealTime();
    }
    
    // Clear cache and reload
    alphaVantageService.clearCache();
    macdService.reset();
    await loadData();
  }, [loadData, stopRealTime, state.isRealTime]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realTimeCleanupRef.current) {
        realTimeCleanupRef.current();
      }
    };
  }, []);

  const actions: RealTimeDataActions = {
    loadData,
    startRealTime,
    stopRealTime,
    clearError,
    refreshData
  };

  return [state, actions];
}

export default useRealTimeData;
