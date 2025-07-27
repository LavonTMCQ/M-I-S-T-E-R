/**
 * Signal Context
 * 
 * Provides centralized state management for signal services
 * and integrates with existing wallet context.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWallet } from './WalletContext';
import { useToast } from '@/hooks/use-toast';

import {
  TradingSignal,
  OneClickExecutionResponse,
  SignalServiceStatus,
  ServiceHealthStatus,
  TransactionRecord
} from '@/types/signals';

// Import services
import { initializeStrikeFinanceIntegration } from '@/services/strike-finance';
import { initializeSignalService } from '@/services/signal-generation';

/**
 * Signal Context Type
 */
interface SignalContextType {
  // Signal Generation
  activeSignals: TradingSignal[];
  signalServiceStatus: SignalServiceStatus | null;
  isSignalServiceLoading: boolean;
  
  // Execution
  executionHistory: OneClickExecutionResponse[];
  activeExecutions: string[];
  isExecuting: boolean;
  
  // Transactions
  transactions: TransactionRecord[];
  transactionStatistics: any;
  
  // Service Health
  serviceHealth: ServiceHealthStatus | null;
  isHealthy: boolean;
  
  // Actions
  executeSignal: (signal: TradingSignal, overrides?: any) => Promise<OneClickExecutionResponse>;
  cancelExecution: (signalId: string) => Promise<boolean>;
  generateTestSignal: () => Promise<void>;
  refreshServices: () => Promise<void>;
}

/**
 * Default Context Value
 */
const defaultContextValue: SignalContextType = {
  activeSignals: [],
  signalServiceStatus: null,
  isSignalServiceLoading: true,
  executionHistory: [],
  activeExecutions: [],
  isExecuting: false,
  transactions: [],
  transactionStatistics: null,
  serviceHealth: null,
  isHealthy: false,
  executeSignal: async () => ({ success: false, updated_signal: {} as TradingSignal, summary: { action: '', amount: 0, price: 0, fees: 0 } }),
  cancelExecution: async () => false,
  generateTestSignal: async () => {},
  refreshServices: async () => {},
};

/**
 * Signal Context
 */
const SignalContext = createContext<SignalContextType>(defaultContextValue);

/**
 * Signal Provider Props
 */
interface SignalProviderProps {
  children: ReactNode;
}

/**
 * Signal Provider Component
 */
export function SignalProvider({ children }: SignalProviderProps) {
  // State
  const [activeSignals, setActiveSignals] = useState<TradingSignal[]>([]);
  const [signalServiceStatus, setSignalServiceStatus] = useState<SignalServiceStatus | null>(null);
  const [isSignalServiceLoading, setIsSignalServiceLoading] = useState(true);
  const [executionHistory, setExecutionHistory] = useState<OneClickExecutionResponse[]>([]);
  const [activeExecutions, setActiveExecutions] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [transactionStatistics, setTransactionStatistics] = useState<any>(null);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealthStatus | null>(null);
  const [isHealthy, setIsHealthy] = useState(false);
  const [services, setServices] = useState<any>(null);

  // Hooks
  const { mainWallet } = useWallet();
  const { toast } = useToast();

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log('🎯 Initializing signal services...');
        
        // Initialize signal generation service
        const signalService = initializeSignalService({
          polling_interval: 300, // 5 minutes
          min_confidence: 70,
          max_signals_per_hour: 12,
        });

        // Initialize Strike Finance integration
        const strikeIntegration = await initializeStrikeFinanceIntegration({
          execution_config: {
            max_execution_time: 30,
            min_confidence_threshold: 70,
            enable_notifications: true,
          },
          auto_start: true,
        });

        setServices({
          signalService,
          strikeIntegration,
        });

        // Set up signal listener
        signalService.addSignalListener((signal: TradingSignal) => {
          console.log('🔔 New signal received:', signal.id);
          setActiveSignals(prev => {
            const now = new Date();
            const validSignals = prev.filter(s => new Date(s.expires_at) > now);
            return [signal, ...validSignals].slice(0, 10);
          });
        });

        // Update service status
        const updateStatus = () => {
          const status = signalService.getStatus();
          setSignalServiceStatus(status);
          setIsSignalServiceLoading(false);
        };

        updateStatus();
        const statusInterval = setInterval(updateStatus, 30000);

        console.log('✅ Signal services initialized successfully');

        return () => {
          clearInterval(statusInterval);
        };
      } catch (error) {
        console.error('❌ Failed to initialize signal services:', error);
        setIsSignalServiceLoading(false);
        toast({
          title: "Service Initialization Failed",
          description: "Failed to initialize signal services. Some features may not work.",
          variant: "destructive",
        });
      }
    };

    initializeServices();
  }, [toast]);

  // Update execution history and active executions
  useEffect(() => {
    if (!services?.strikeIntegration) return;

    const updateExecutionData = () => {
      try {
        const executionService = services.strikeIntegration.executionService;
        const transactionTracker = services.strikeIntegration.transactionTracker;

        // Update execution history
        const history = executionService.getExecutionHistory(20);
        setExecutionHistory(history);

        // Update active executions
        const active = executionService.getActiveExecutions();
        setActiveExecutions(active);

        // Update transactions for current wallet
        if (mainWallet?.address) {
          const walletTransactions = transactionTracker.getTransactionsByWallet(mainWallet.address);
          setTransactions(walletTransactions);

          const stats = transactionTracker.getTransactionStatistics(mainWallet.address);
          setTransactionStatistics(stats);
        }
      } catch (error) {
        console.error('Error updating execution data:', error);
      }
    };

    updateExecutionData();
    const interval = setInterval(updateExecutionData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [services, mainWallet?.address]);

  // Monitor service health
  useEffect(() => {
    if (!services) return;

    const checkHealth = async () => {
      try {
        const signalStatus = services.signalService.getStatus();
        const executionStats = services.strikeIntegration.executionService.getServiceStatistics();
        const transactionStats = services.strikeIntegration.transactionTracker.getTransactionStatistics();

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

        const serviceStatuses = Object.values(health.services).map(s => s.status);
        health.overall_status = serviceStatuses.every(s => s === 'healthy') ? 'healthy' :
                               serviceStatuses.some(s => s === 'unhealthy') ? 'unhealthy' : 'degraded';

        setServiceHealth(health);
        setIsHealthy(health.overall_status === 'healthy');
      } catch (error) {
        console.error('Health check failed:', error);
        setIsHealthy(false);
      }
    };

    checkHealth();
    const healthInterval = setInterval(checkHealth, 60000); // Check every minute

    return () => clearInterval(healthInterval);
  }, [services]);

  // Execute signal
  const executeSignal = async (
    signal: TradingSignal,
    overrides?: {
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

    if (!services?.strikeIntegration) {
      throw new Error('Strike Finance integration not available');
    }

    setIsExecuting(true);

    try {
      const response = await services.strikeIntegration.integrationManager.executeSignal(
        signal,
        mainWallet.address,
        {
          user_confirmed: true,
          position_size_override: overrides?.position_size_override,
          risk_overrides: overrides?.risk_overrides,
        }
      );

      // Update execution history
      setExecutionHistory(prev => [response, ...prev.slice(0, 19)]);

      // Show toast notification
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
  };

  // Cancel execution
  const cancelExecution = async (signalId: string): Promise<boolean> => {
    if (!services?.strikeIntegration) {
      return false;
    }

    try {
      const success = await services.strikeIntegration.executionService.cancelExecution(signalId);
      
      if (success) {
        toast({
          title: "🛑 Execution Cancelled",
          description: "Signal execution has been cancelled",
        });
        
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
  };

  // Generate test signal
  const generateTestSignal = async (): Promise<void> => {
    if (!services?.signalService) {
      throw new Error('Signal service not available');
    }

    try {
      await services.signalService.generateSignalNow();
      toast({
        title: "Test Signal Generated",
        description: "A test signal has been generated for demonstration",
      });
    } catch (error) {
      toast({
        title: "Signal Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      throw error;
    }
  };

  // Refresh services
  const refreshServices = async (): Promise<void> => {
    try {
      // Refresh signal service status
      if (services?.signalService) {
        const status = services.signalService.getStatus();
        setSignalServiceStatus(status);
      }

      // Refresh execution data
      if (services?.strikeIntegration && mainWallet?.address) {
        const executionService = services.strikeIntegration.executionService;
        const transactionTracker = services.strikeIntegration.transactionTracker;

        const history = executionService.getExecutionHistory(20);
        setExecutionHistory(history);

        const active = executionService.getActiveExecutions();
        setActiveExecutions(active);

        const walletTransactions = transactionTracker.getTransactionsByWallet(mainWallet.address);
        setTransactions(walletTransactions);

        const stats = transactionTracker.getTransactionStatistics(mainWallet.address);
        setTransactionStatistics(stats);
      }

      toast({
        title: "Services Refreshed",
        description: "All signal services have been refreshed",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : 'Failed to refresh services',
        variant: "destructive",
      });
    }
  };

  // Context value
  const contextValue: SignalContextType = {
    activeSignals,
    signalServiceStatus,
    isSignalServiceLoading,
    executionHistory,
    activeExecutions,
    isExecuting,
    transactions,
    transactionStatistics,
    serviceHealth,
    isHealthy,
    executeSignal,
    cancelExecution,
    generateTestSignal,
    refreshServices,
  };

  return (
    <SignalContext.Provider value={contextValue}>
      {children}
    </SignalContext.Provider>
  );
}

/**
 * Hook to use Signal Context
 */
export function useSignalContext(): SignalContextType {
  const context = useContext(SignalContext);
  if (!context) {
    throw new Error('useSignalContext must be used within a SignalProvider');
  }
  return context;
}

/**
 * Hook for backward compatibility with useSignalServices
 */
export function useSignalServices() {
  const context = useSignalContext();
  
  return {
    signals: {
      activeSignals: context.activeSignals,
      serviceStatus: context.signalServiceStatus,
      isLoading: context.isSignalServiceLoading,
      error: null,
      generateSignalNow: context.generateTestSignal,
      removeExpiredSignals: () => {
        // This would be handled automatically by the service
      },
    },
    execution: {
      executeSignal: context.executeSignal,
      validateExecution: async () => ({ can_execute: true, checks: {}, warnings: [], errors: [], estimation: {} }),
      cancelExecution: context.cancelExecution,
      executionHistory: context.executionHistory,
      activeExecutions: context.activeExecutions,
      isExecuting: context.isExecuting,
    },
    tracking: {
      transactions: context.transactions,
      statistics: context.transactionStatistics,
    },
    health: {
      healthStatus: context.serviceHealth,
      isHealthy: context.isHealthy,
    },
  };
}