/**
 * Enhanced Trading Interface
 * 
 * Combines manual trading with signal-based execution.
 * Preserves existing ManualTradingInterface functionality while
 * adding signal integration capabilities.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { useSignalServices } from '@/hooks/useSignalServices';

// Import existing components
import { ManualTradingInterface } from './ManualTradingInterface';
import SignalPanel from './SignalPanel';
import ExecutionConfirmationDialog from './ExecutionConfirmationDialog';
import TransactionStatusPanel from './TransactionStatusPanel';

import {
  TradingSignal,
  OneClickExecutionResponse,
  PreExecutionValidation
} from '@/types/signals';

import {
  Zap,
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

/**
 * Trading Mode Toggle Component
 */
interface TradingModeToggleProps {
  mode: 'manual' | 'signals';
  onModeChange: (mode: 'manual' | 'signals') => void;
  signalCount: number;
  isHealthy: boolean;
}

function TradingModeToggle({ mode, onModeChange, signalCount, isHealthy }: TradingModeToggleProps) {
  return (
    <Tabs value={mode} onValueChange={(value) => onModeChange(value as 'manual' | 'signals')}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="manual" className="flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <span>Manual Trading</span>
        </TabsTrigger>
        <TabsTrigger value="signals" className="flex items-center space-x-2">
          <Zap className="h-4 w-4" />
          <span>Signal Trading</span>
          {signalCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {signalCount}
            </Badge>
          )}
          {!isHealthy && (
            <AlertTriangle className="h-3 w-3 text-yellow-500 ml-1" />
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

/**
 * Quick Stats Component
 */
interface QuickStatsProps {
  executionHistory: OneClickExecutionResponse[];
  activeExecutions: string[];
}

function QuickStats({ executionHistory, activeExecutions }: QuickStatsProps) {
  const todayExecutions = executionHistory.filter(exec => {
    const today = new Date().toDateString();
    const execDate = new Date(exec.updated_signal.timestamp).toDateString();
    return execDate === today;
  });

  const successfulExecutions = executionHistory.filter(exec => exec.success);
  const successRate = executionHistory.length > 0 
    ? (successfulExecutions.length / executionHistory.length) * 100 
    : 0;

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className="text-center p-2 bg-muted rounded">
        <div className="text-lg font-semibold">{todayExecutions.length}</div>
        <div className="text-xs text-muted-foreground">Today</div>
      </div>
      <div className="text-center p-2 bg-muted rounded">
        <div className="text-lg font-semibold text-green-600">{successRate.toFixed(0)}%</div>
        <div className="text-xs text-muted-foreground">Success</div>
      </div>
      <div className="text-center p-2 bg-muted rounded">
        <div className="text-lg font-semibold text-blue-600">{activeExecutions.length}</div>
        <div className="text-xs text-muted-foreground">Active</div>
      </div>
    </div>
  );
}

/**
 * Main Enhanced Trading Interface Component
 */
export default function EnhancedTradingInterface() {
  const [tradingMode, setTradingMode] = useState<'manual' | 'signals'>('manual');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);
  const [validationResult, setValidationResult] = useState<PreExecutionValidation | null>(null);
  
  const { mainWallet } = useWallet();
  const { signals, execution, tracking, health } = useSignalServices();

  // Auto-switch to signals mode when signals are available
  useEffect(() => {
    if (signals.activeSignals.length > 0 && tradingMode === 'manual') {
      // Don't auto-switch, let user choose
    }
  }, [signals.activeSignals.length, tradingMode]);

  // Handle signal execution with confirmation
  const handleSignalExecution = async (signal: TradingSignal) => {
    if (!mainWallet?.isConnected) {
      return;
    }

    try {
      // Perform pre-execution validation
      const validation = await execution.validateExecution(signal);
      setValidationResult(validation);
      setSelectedSignal(signal);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // Confirm and execute signal
  const handleConfirmExecution = async (
    signal: TradingSignal,
    overrides?: {
      position_size?: number;
      stop_loss?: number;
      take_profit?: number;
    }
  ) => {
    try {
      await execution.executeSignal(signal, {
        position_size_override: overrides?.position_size,
        risk_overrides: overrides ? {
          stop_loss: overrides.stop_loss,
          take_profit: overrides.take_profit,
        } : undefined,
      });
      
      setShowConfirmation(false);
      setSelectedSignal(null);
      setValidationResult(null);
    } catch (error) {
      console.error('Execution failed:', error);
    }
  };

  // Cancel execution
  const handleCancelExecution = () => {
    setShowConfirmation(false);
    setSelectedSignal(null);
    setValidationResult(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Mode Toggle */}
      <div className="mb-4">
        <TradingModeToggle
          mode={tradingMode}
          onModeChange={setTradingMode}
          signalCount={signals.activeSignals.length}
          isHealthy={health.isHealthy}
        />
      </div>

      {/* Quick Stats for Signal Mode */}
      {tradingMode === 'signals' && (
        <QuickStats
          executionHistory={execution.executionHistory}
          activeExecutions={execution.activeExecutions}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {tradingMode === 'manual' ? (
          <div className="h-full">
            <ManualTradingInterface
              walletAddress="addr1..."
              walletType="connected"
              balance={100}
              currentPrice={0.47}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Signal Panel */}
            <div className="flex-1 overflow-hidden">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">Signal Trading Mode</h3>
                <p className="text-muted-foreground mb-4">
                  Real-time signals from the ADA Custom Algorithm
                </p>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    🔔 Waiting for signals... (Check console for service initialization)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Service Health Indicator */}
      {!health.isHealthy && (
        <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-yellow-800">
              Some trading services are experiencing issues
            </span>
          </div>
        </div>
      )}

      {/* Execution Confirmation Dialog */}
      {showConfirmation && selectedSignal && validationResult && (
        <ExecutionConfirmationDialog
          signal={selectedSignal}
          validation={validationResult}
          onConfirm={handleConfirmExecution}
          onCancel={handleCancelExecution}
          isExecuting={execution.isExecuting}
        />
      )}
    </div>
  );
}