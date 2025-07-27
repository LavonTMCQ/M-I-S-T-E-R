/**
 * Signal Execution Hook
 * 
 * React hook for managing signal generation and execution in the UI
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import { signalExecutor, TradingSignal, ExecutionResult } from '@/services/signal-execution/SignalExecutor';

export function useSignalExecution() {
  const [activeSignals, setActiveSignals] = useState<TradingSignal[]>([]);
  const [executionHistory, setExecutionHistory] = useState<ExecutionResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [executionStats, setExecutionStats] = useState({
    total_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
    success_rate: 0,
    active_signals: 0
  });

  const { mainWallet } = useWallet();
  const { toast } = useToast();

  // Update signals and stats
  const updateData = useCallback(() => {
    const signals = signalExecutor.getActiveSignals();
    const history = signalExecutor.getExecutionHistory();
    const stats = signalExecutor.getExecutionStats();

    setActiveSignals(signals);
    setExecutionHistory(history);
    setExecutionStats(stats);
  }, []);

  // Auto-update every 5 seconds
  useEffect(() => {
    updateData();
    const interval = setInterval(updateData, 5000);
    return () => clearInterval(interval);
  }, [updateData]);

  // Generate REAL signal from algorithm
  const generateTestSignal = useCallback(async (currentMarketPrice?: number) => {
    if (isGenerating) return;

    setIsGenerating(true);

    try {
      console.log('🔥 Generating REAL signal from ADA algorithm with current price:', currentMarketPrice);

      // Call REAL algorithm (with fallback to test)
      const signal = await signalExecutor.generateRealSignal(currentMarketPrice);
      
      toast({
        title: "🔔 New Signal Generated",
        description: `${signal.type.toUpperCase()} signal for ADA/USD with ${signal.confidence}% confidence`,
      });

      updateData();
      
    } catch (error) {
      console.error('❌ Failed to generate signal:', error);
      toast({
        title: "❌ Signal Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, toast, updateData]);

  // Execute signal
  const executeSignal = useCallback(async (signal: TradingSignal) => {
    if (!mainWallet?.address) {
      toast({
        title: "❌ Wallet Required",
        description: "Please connect your wallet to execute signals",
        variant: "destructive",
      });
      return null;
    }

    if (isExecuting) {
      toast({
        title: "⏳ Execution in Progress",
        description: "Please wait for the current execution to complete",
        variant: "destructive",
      });
      return null;
    }

    setIsExecuting(true);

    try {
      console.log('🚀 Executing signal via UI:', signal.id);

      toast({
        title: "🚀 Executing Trade",
        description: `Executing ${signal.type.toUpperCase()} signal for ${signal.risk.position_size} ADA...`,
      });

      const result = await signalExecutor.executeSignal(
        signal, 
        mainWallet.address, 
        true // User confirmed via UI
      );

      if (result.success) {
        toast({
          title: "✅ Trade Executed Successfully",
          description: `${signal.type.toUpperCase()} position opened for ${signal.risk.position_size} ADA`,
        });

        // Show Discord notification status
        if (result.discord_notification_sent) {
          setTimeout(() => {
            toast({
              title: "📢 Discord Notification Sent",
              description: "Trade details have been sent to Discord",
            });
          }, 2000);
        }
      } else {
        toast({
          title: "❌ Trade Execution Failed",
          description: result.error?.message || 'Unknown error occurred',
          variant: "destructive",
        });
      }

      updateData();
      return result;

    } catch (error) {
      console.error('❌ Signal execution error:', error);
      toast({
        title: "❌ Execution Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [mainWallet?.address, isExecuting, toast, updateData]);

  // Cancel/expire signal
  const cancelSignal = useCallback((signalId: string) => {
    const signal = activeSignals.find(s => s.id === signalId);
    if (signal) {
      signal.status = 'cancelled';
      updateData();
      
      toast({
        title: "🛑 Signal Cancelled",
        description: "Signal has been cancelled and will not execute",
      });
    }
  }, [activeSignals, toast, updateData]);

  // Get signal by ID
  const getSignalById = useCallback((signalId: string) => {
    return activeSignals.find(s => s.id === signalId);
  }, [activeSignals]);

  // Check if wallet has sufficient balance
  const checkSufficientBalance = useCallback((signal: TradingSignal) => {
    if (!mainWallet?.balance) return false;
    
    const requiredBalance = signal.risk.position_size + 5; // Position size + buffer for fees
    return mainWallet.balance >= requiredBalance;
  }, [mainWallet?.balance]);

  return {
    // Data
    activeSignals,
    executionHistory,
    executionStats,
    
    // State
    isExecuting,
    isGenerating,
    
    // Actions
    generateTestSignal,
    executeSignal,
    cancelSignal,
    
    // Utilities
    getSignalById,
    checkSufficientBalance,
    updateData,
    
    // Wallet info
    walletConnected: !!mainWallet?.address,
    walletBalance: mainWallet?.balance || 0,
  };
}
