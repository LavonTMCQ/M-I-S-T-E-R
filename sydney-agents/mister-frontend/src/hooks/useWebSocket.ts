import { useEffect, useState, useCallback, useRef } from 'react';
import { wsClient } from '@/lib/websocket/client';
import { realTimeDataService } from '@/lib/realtime/dataService';
import { MarketData, Position, AIActivity } from '@/types/api';

/**
 * Hook for WebSocket connection management
 */
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const success = await wsClient.connect();
      setIsConnected(success);
      if (!success) {
        setConnectionError('Failed to connect to WebSocket server');
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected]);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
    setIsConnected(false);
    setConnectionError(null);
  }, []);

  useEffect(() => {
    // Check connection status periodically
    const checkConnection = () => {
      setIsConnected(wsClient.isConnected());
    };

    const interval = setInterval(checkConnection, 5000);
    checkConnection(); // Initial check

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect
  };
}

/**
 * Hook for subscribing to real-time market data
 * DISABLED: Returns null data until real backend WebSocket is connected
 */
export function useMarketData(pair: string = 'ADA/USD') {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Disabled - no fake data subscriptions
  // Real implementation should connect to actual backend WebSocket

  return {
    marketData: null, // No fake data
    lastUpdate: null,
    isConnected: false // Not connected to real data
  };
}

/**
 * Hook for subscribing to real-time position updates
 */
export function usePositionUpdates(userId: string) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to real-time position updates
    unsubscribeRef.current = realTimeDataService.subscribe('position_update', (data) => {
      if (data.userId === userId || data.userId === 'current_user') {
        setPositions(prevPositions => {
          const updatedPositions = [...prevPositions];
          const index = updatedPositions.findIndex(p => p.id === data.position.id);

          if (index >= 0) {
            updatedPositions[index] = { ...updatedPositions[index], ...data.position };
          } else {
            updatedPositions.push(data.position);
          }

          return updatedPositions;
        });
        setLastUpdate(new Date());
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userId]);

  return {
    positions,
    lastUpdate
  };
}

/**
 * Hook for subscribing to real-time AI activity
 */
export function useAIActivity(userId: string) {
  const [activities, setActivities] = useState<AIActivity[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to real-time AI activity updates
    unsubscribeRef.current = realTimeDataService.subscribe('ai_activity', (data) => {
      if (data.userId === userId || data.userId === 'current_user' || !data.userId) {
        setActivities(prevActivities => {
          const newActivities = [data.activity, ...prevActivities];
          return newActivities.slice(0, 50); // Keep only last 50 activities
        });
        setLastUpdate(new Date());
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userId]);

  return {
    activities,
    lastUpdate
  };
}

/**
 * Hook for subscribing to system status updates
 */
export function useSystemStatus() {
  const [systemStatus, setSystemStatus] = useState<Record<string, unknown> | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to real-time system status updates
    unsubscribeRef.current = realTimeDataService.subscribe('system_status', (data) => {
      setSystemStatus(data);
      setLastUpdate(new Date());
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    systemStatus,
    lastUpdate
  };
}

/**
 * Hook for real-time portfolio value updates
 * DISABLED: Returns null data until real backend WebSocket is connected
 */
export function usePortfolioUpdates(userId: string) {
  // Disabled - no fake data subscriptions
  // Real implementation should connect to actual backend WebSocket

  return {
    portfolioValue: null, // No fake data
    dailyChange: null,
    dailyChangePercent: null,
    availableBalance: null,
    lastUpdate: null
  };
}
