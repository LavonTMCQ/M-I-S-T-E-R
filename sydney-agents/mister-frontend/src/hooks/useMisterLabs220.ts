/**
 * React Hook for MisterLabs220 Algorithm Service
 * Provides real-time data and control functions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getMisterLabs220Service,
  SignalData,
  AccountData,
  PositionDetails,
  PerformanceSummary,
  GatekeeperAnalysis,
  WebSocketMessage,
} from '@/services/misterlabs220/misterlabs220Service';

export interface UseMisterLabs220Return {
  // Connection State
  isConnected: boolean;
  connectionState: string;
  
  // Real-time Data
  signals: SignalData | null;
  account: AccountData | null;
  position: PositionDetails | null;
  
  // Analytics Data
  performance: PerformanceSummary | null;
  gatekeeper: GatekeeperAnalysis | null;
  config: any | null;
  health: any | null;
  
  // Loading States
  isLoading: boolean;
  isPerformanceLoading: boolean;
  isGatekeeperLoading: boolean;
  
  // Error State
  error: string | null;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  enableTrading: () => Promise<void>;
  disableTrading: () => Promise<void>;
  closePosition: (reason?: string) => Promise<void>;
  updateLeverage: (leverage: number) => Promise<void>;
  refreshData: () => Promise<void>;
  downloadCSV: () => Promise<void>;
}

export function useMisterLabs220(): UseMisterLabs220Return {
  // Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  
  // Real-time Data
  const [signals, setSignals] = useState<SignalData | null>(null);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [position, setPosition] = useState<PositionDetails | null>(null);
  
  // Analytics Data
  const [performance, setPerformance] = useState<PerformanceSummary | null>(null);
  const [gatekeeper, setGatekeeper] = useState<GatekeeperAnalysis | null>(null);
  const [config, setConfig] = useState<any | null>(null);
  const [health, setHealth] = useState<any | null>(null);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false);
  const [isGatekeeperLoading, setIsGatekeeperLoading] = useState(false);
  
  // Error State
  const [error, setError] = useState<string | null>(null);
  
  // Service reference
  const serviceRef = useRef(getMisterLabs220Service());

  // Load initial data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all initial data in parallel with error handling for each
      const [signalsData, accountData, positionData, configData, healthData] = await Promise.allSettled([
        serviceRef.current.getSignals().catch(() => null),
        serviceRef.current.getAccount().catch(() => null),
        serviceRef.current.getPositionDetails().catch(() => null),
        serviceRef.current.getConfig().catch(() => null),
        serviceRef.current.getHealthDetailed().catch(() => null),
      ]);
      
      // Extract successful results
      if (signalsData.status === 'fulfilled' && signalsData.value) setSignals(signalsData.value);
      if (accountData.status === 'fulfilled' && accountData.value) setAccount(accountData.value);
      if (positionData.status === 'fulfilled' && positionData.value) setPosition(positionData.value);
      if (configData.status === 'fulfilled' && configData.value) setConfig(configData.value);
      if (healthData.status === 'fulfilled' && healthData.value) setHealth(healthData.value);
    } catch (err) {
      console.warn('⚠️ Failed to load some data, using defaults:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load performance data
  const loadPerformanceData = useCallback(async () => {
    setIsPerformanceLoading(true);
    
    try {
      const perfData = await serviceRef.current.getPerformanceSummary();
      setPerformance(perfData);
    } catch (err) {
      console.error('❌ Failed to load performance data:', err);
    } finally {
      setIsPerformanceLoading(false);
    }
  }, []);

  // Load gatekeeper analysis
  const loadGatekeeperData = useCallback(async () => {
    setIsGatekeeperLoading(true);
    
    try {
      const gkData = await serviceRef.current.getGatekeeperAnalysis();
      setGatekeeper(gkData);
    } catch (err) {
      // Silently fail for gatekeeper data - it's optional
      console.warn('⚠️ Gatekeeper service not available');
    } finally {
      setIsGatekeeperLoading(false);
    }
  }, []);

  // Connect WebSocket
  const connect = useCallback(() => {
    const service = serviceRef.current;
    
    // Setup event listeners
    service.on('connected', () => {
      setIsConnected(true);
      setConnectionState('CONNECTED');
      setError(null);
      console.log('✅ MisterLabs220 WebSocket connected');
    });
    
    service.on('disconnected', () => {
      setIsConnected(false);
      setConnectionState('DISCONNECTED');
    });
    
    service.on('error', (err) => {
      setError(err?.message || 'Connection error');
      console.error('❌ MisterLabs220 WebSocket error:', err);
    });
    
    service.on('reconnectFailed', () => {
      setError('Failed to reconnect after multiple attempts');
    });
    
    service.on('signals', (data: SignalData) => {
      setSignals(data);
    });
    
    service.on('account', (data: AccountData) => {
      setAccount(data);
    });
    
    service.on('position', (data: PositionDetails) => {
      setPosition(data);
    });
    
    service.on('message', (data: WebSocketMessage) => {
      console.log('📨 MisterLabs220 message:', data.type);
    });
    
    // Connect
    service.connectWebSocket();
  }, []);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    serviceRef.current.disconnectWebSocket();
    setIsConnected(false);
    setConnectionState('DISCONNECTED');
  }, []);

  // Trading Actions
  const enableTrading = useCallback(async () => {
    setError(null);
    try {
      await serviceRef.current.enableTrading();
      // Refresh account data
      const accountData = await serviceRef.current.getAccount();
      setAccount(accountData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable trading');
      throw err;
    }
  }, []);

  const disableTrading = useCallback(async () => {
    setError(null);
    try {
      await serviceRef.current.disableTrading();
      // Refresh account data
      const accountData = await serviceRef.current.getAccount();
      setAccount(accountData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable trading');
      throw err;
    }
  }, []);

  const closePosition = useCallback(async (reason?: string) => {
    setError(null);
    try {
      await serviceRef.current.closePosition(reason);
      // Refresh position data
      const positionData = await serviceRef.current.getPositionDetails();
      setPosition(positionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close position');
      throw err;
    }
  }, []);

  const updateLeverage = useCallback(async (leverage: number) => {
    setError(null);
    try {
      await serviceRef.current.updateLeverage(leverage);
      // Refresh config
      const configData = await serviceRef.current.getConfig();
      setConfig(configData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update leverage');
      throw err;
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      loadInitialData(),
      loadPerformanceData(),
      // loadGatekeeperData(), // Skip - endpoint doesn't exist
    ]);
  }, [loadInitialData, loadPerformanceData]);

  // Download CSV
  const downloadCSV = useCallback(async () => {
    try {
      const blob = await serviceRef.current.downloadPerformanceCSV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mister_performance_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download CSV');
      throw err;
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    loadInitialData();
    loadPerformanceData();
    // Skip gatekeeper - endpoint doesn't exist
    // loadGatekeeperData();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  // Update connection state
  useEffect(() => {
    const interval = setInterval(() => {
      const state = serviceRef.current.getConnectionState();
      setConnectionState(state);
      setIsConnected(state === 'CONNECTED');
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    // Connection State
    isConnected,
    connectionState,
    
    // Real-time Data
    signals,
    account,
    position,
    
    // Analytics Data
    performance,
    gatekeeper,
    config,
    health,
    
    // Loading States
    isLoading,
    isPerformanceLoading,
    isGatekeeperLoading,
    
    // Error State
    error,
    
    // Actions
    connect,
    disconnect,
    enableTrading,
    disableTrading,
    closePosition,
    updateLeverage,
    refreshData,
    downloadCSV,
  };
}