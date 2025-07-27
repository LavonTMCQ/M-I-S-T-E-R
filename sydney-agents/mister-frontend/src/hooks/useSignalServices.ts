/**
 * Signal Services Integration Hooks
 * 
 * React hooks for integrating with our backend signal services.
 * Provides clean interfaces for UI components to interact with:
 * - Signal Generation Service
 * - One-Click Execution Service  
 * - Transaction Tracker
 * - Strike Finance Integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';

import {
  TradingSignal,
  OneClickExecutionRequest,
  OneClickExecutionResponse,
  SignalGenerationResponse,
  TransactionRecord,
  ServiceHealthStatus,
  SignalServiceStatus
} from '@/types/signals';

// Import our backend services
import { getSignalGenerationService } from '@/services/signal-generation';
import { getOneClickExecutionService } from '@/services/strike-finance';
import { getTransactionTracker } from '@/services/strike-finance';

/**
 * Hook for Signal Generation Service integration
 */
export function useSignalGeneration() {
  const [activeSignals, setActiveSignals] = useState<TradingSignal[]>([]);
  const [serviceStatus, setServiceStatus] = useState<SignalServiceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const signalService = useRef(getSignalGenerationService());

  // Initialize service and set up signal listener
  useEffect(() => {
    const service = signalService.current;
    
    // Signal listener for real-time updates
    const handleNewSignal = (signal: TradingSignal) => {
      console.log('🔔 New signal received in UI:', signal.id);
      
      setActiveSignals(prev => {
        // Remove expired signals and add new one
        const now = new Date();
        const validSignals = prev.filter(s => new Date(s.expires_at) > now);
        return [signal, ...validSignals].slice(0, 10); // Keep max 10 signals
      });
    };

    // Add listener
    service.addSignalListener(handleNewSignal);
    
    // Get initial status
    const updateStatus = () => {
      const status = service.getStatus();
      setServiceStatus(status);
      setIsLoading(false);
    };

    updateStatus();
    
    // Update status every 30 seconds
    const statusInterval = setInterval(updateStatus, 30000);

    return () => {
      service.removeSignalListener(handleNewSignal);
      clearInterval(statusInterval);
    };
  }, []);

  // Generate signal manually (for testing)
  const generateSignalNow = useCallback(async (): Promise<SignalGenerationResponse> => {
    try {
      setError(null);
      const response = await signalService.current.generateSignalNow();
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate signal';
      setError(errorMessage);
      throw error;
    }
  }, []);

  // Remove expired signals
  const removeExpiredSignals = useCallback(() => {
    const now = new Date();
    setActiveSignals(prev => prev.filter(signal => new Date(signal.expires_at) > now));
  }, []);

  return {
    activeSignals,
    serviceStatus,
    isLoading,
    error,
    generateSignalNow,
    removeExpiredSignals,
  };
}

/**
 * Hook for One-Click Execution Service integration
 */
export function useOneClickExecution() {
  const [executionHistory, setExecutionHistory] = useState<OneClickExecutionResponse[]>([]);
  const [activeExecutions, setActiveExecutions] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const { mainWallet } = useWallet();
  const { toast } = useToast();
  const executionService = useRef(getOneClickExecutionService());

  // Get execution history on mount
  useEffect(() => {
    const history = executionService.current.getExecutionHistory(20);
    setExecutionHistory(history);
    
    // Update active executions
    const active = executionService.current.getActiveExecutions();
    setActiveExecutions(active);
    
    // Poll for active execution updates
    const pollInterval = setInterval(() => {
      const currentActive = executionService.current.getActiveExecutions();
      setActiveExecutions(currentActive);
    }, 2000);

    return () => clearInterval(pollInterval);
  }, []);

  // Execute signal with comprehensive error handling
  const executeSignal = useCallback(async (
    signal: TradingSignal,
    options?: {
      position_size_override?: number;
      risk_overrides?: {
        stop_loss?: number;
        take_profit?: number;
      };
    }
  ): Promise<OneClickExecutionResponse> => {
    if (!mainWallet?.address) {
      throw new Error('Wallet not connected');
    }

    setIsExecuting(true);
    
    try {
      const request: OneClickExecutionRequest = {
        signal,
        wallet_address: mainWallet.address,
        user_confirmed: true,
        position_size_override: options?.position_size_override,
        risk_overrides: options?.risk_overrides,
      };

      console.log('🚀 Executing signal via UI:', {
        signal_id: signal.id,
        wallet_address: mainWallet.address.substring(0, 20) + '...',
      });

      const response = await executionService.current.executeSignal(request);

      // Update execution history
      setExecutionHistory(prev => [response, ...prev.slice(0, 19)]);

      // Show success/error toast
      if (response.success) {
        toast({
          title: "✅ Trade Executed Successfully",
          description: `${signal.type.toUpperCase()} position opened for ${response.summary.amount} ADA`,
        });
      } else {
        toast({
          title: "❌ Trade Execution Failed",
          description: response.error?.message || 'Unknown error occurred',
          variant: "destructive",
        });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';
      
      toast({
        title: "❌ Execution Error",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [mainWallet?.address, toast]);

  // Validate signal execution
  const validateExecution = useCallback(async (
    signal: TradingSignal,
    positionSizeOverride?: number
  ) => {
    if (!mainWallet?.address) {
      throw new Error('Wallet not connected');
    }

    return await executionService.current.performPreExecutionValidation(
      signal,
      mainWallet.address,
      positionSizeOverride
    );
  }, [mainWallet?.address]);

  // Cancel active execution
  const cancelExecution = useCallback(async (signalId: string): Promise<boolean> => {
    try {
      const success = await executionService.current.cancelExecution(signalId);
      
      if (success) {
        toast({
          title: "🛑 Execution Cancelled",
          description: "Signal execution has been cancelled",
        });
        
        // Update active executions
        setActiveExecutions(prev => prev.filter(id => id !== signalId));
      }
      
      return success;
    } catch (error) {
      toast({
        title: "❌ Cancellation Failed",
        description: error instanceof Error ? error.message : 'Failed to cancel execution',
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  return {
    executeSignal,
    validateExecution,
    cancelExecution,
    executionHistory,
    activeExecutions,
    isExecuting,
  };
}

/**
 * Hook for Transaction Tracker integration
 */
export function useTransactionTracking() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const { mainWallet } = useWallet();
  const transactionTracker = useRef(getTransactionTracker());

  // Load transactions and statistics
  useEffect(() => {
    if (!mainWallet?.address) return;

    const loadData = () => {
      // Get transactions for current wallet
      const walletTransactions = transactionTracker.current.getTransactionsByWallet(mainWallet.address);
      setTransactions(walletTransactions);

      // Get statistics
      const stats = transactionTracker.current.getTransactionStatistics(mainWallet.address);
      setStatistics(stats);
    };

    loadData();

    // Poll for updates every 10 seconds
    const pollInterval = setInterval(loadData, 10000);

    return () => clearInterval(pollInterval);
  }, [mainWallet?.address]);

  // Add transaction listener for real-time updates
  useEffect(() => {
    const handleTransactionUpdate = (record: TransactionRecord) => {
      if (record.wallet_address === mainWallet?.address) {
        setTransactions(prev => {
          const index = prev.findIndex(t => t.transaction_id === record.transaction_id);
          if (index >= 0) {
            // Update existing transaction
            const updated = [...prev];
            updated[index] = record;
            return updated;
          } else {
            // Add new transaction
            return [record, ...prev];
          }
        });
      }
    };

    // Note: In a real implementation, we'd need to add listeners for specific transactions
    // For now, we rely on polling

    return () => {
      // Cleanup listeners
    };
  }, [mainWallet?.address]);

  return {
    transactions,
    statistics,
  };
}

/**
 * Hook for Service Health Monitoring
 */
export function useServiceHealth() {
  const [healthStatus, setHealthStatus] = useState<ServiceHealthStatus | null>(null);
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Get signal service status
        const signalService = getSignalGenerationService();
        const signalStatus = signalService.getStatus();

        // Get execution service statistics
        const executionService = getOneClickExecutionService();
        const executionStats = executionService.getServiceStatistics();

        // Get transaction tracker statistics
        const transactionTracker = getTransactionTracker();
        const transactionStats = transactionTracker.getTransactionStatistics();

        // Create health status
        const health: ServiceHealthStatus = {
          overall_status: 'healthy',
          services: {
            signal_generation: {
              status: signalStatus.health === 'healthy' ? 'healthy' : 'degraded',
              running: signalStatus.running,
              signals_today: signalStatus.signals_today,
              last_signal: signalStatus.last_signal_time,
            },
            execution_service: {
              status: executionStats.success_rate >= 80 ? 'healthy' : 'degraded',
              success_rate: executionStats.success_rate,
              active_executions: executionStats.active_executions,
              total_executions: executionStats.total_executions,
            },
            transaction_tracker: {
              status: transactionStats.pending_transactions < 10 ? 'healthy' : 'degraded',
              total_transactions: transactionStats.total_transactions,
              pending_transactions: transactionStats.pending_transactions,
              success_rate: transactionStats.success_rate,
            },
          },
          last_check: new Date().toISOString(),
        };

        // Determine overall health
        const serviceStatuses = Object.values(health.services).map(s => s.status);
        health.overall_status = serviceStatuses.every(s => s === 'healthy') ? 'healthy' :
                               serviceStatuses.some(s => s === 'unhealthy') ? 'unhealthy' : 'degraded';

        setHealthStatus(health);
        setIsHealthy(health.overall_status === 'healthy');

      } catch (error) {
        console.error('Health check failed:', error);
        setIsHealthy(false);
      }
    };

    checkHealth();
    
    // Check health every minute
    const healthInterval = setInterval(checkHealth, 60000);

    return () => clearInterval(healthInterval);
  }, []);

  return {
    healthStatus,
    isHealthy,
  };
}

/**
 * Combined hook for all signal services
 */
export function useSignalServices() {
  const signalGeneration = useSignalGeneration();
  const oneClickExecution = useOneClickExecution();
  const transactionTracking = useTransactionTracking();
  const serviceHealth = useServiceHealth();

  return {
    signals: signalGeneration,
    execution: oneClickExecution,
    tracking: transactionTracking,
    health: serviceHealth,
  };
}