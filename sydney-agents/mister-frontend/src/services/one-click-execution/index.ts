/**
 * One-Click Execution System - Main Export
 * 
 * Complete one-click execution system that integrates:
 * - Signal Generation Service
 * - Strike Finance API Integration  
 * - Transaction Tracking
 * - UI Components
 * - Service Management
 */

// Core services
export { 
  getSignalGenerationService,
  initializeSignalService 
} from '@/services/signal-generation';

export { 
  initializeStrikeFinanceIntegration,
  executeSignalWithStrikeFinance,
  getStrikeFinanceStatus
} from '@/services/strike-finance';

// UI Components
export { default as SignalPanel } from '@/components/trading/SignalPanel';
export { default as EnhancedTradingInterface } from '@/components/trading/EnhancedTradingInterface';
export { default as ExecutionConfirmationDialog } from '@/components/trading/ExecutionConfirmationDialog';
export { default as TransactionStatusPanel } from '@/components/trading/TransactionStatusPanel';
export { default as EnhancedTradingPage } from '@/components/trading/EnhancedTradingPage';

// Contexts and Hooks
export { SignalProvider, useSignalContext, useSignalServices } from '@/contexts/SignalContext';
export { useSignalServices as useSignalServicesHook } from '@/hooks/useSignalServices';

// Types
export type {
  TradingSignal,
  OneClickExecutionRequest,
  OneClickExecutionResponse,
  PreExecutionValidation,
  SignalGenerationResponse,
  TransactionRecord,
  ServiceHealthStatus
} from '@/types/signals';

/**
 * Initialize Complete One-Click Execution System
 */
export async function initializeOneClickExecutionSystem(config?: {
  // Signal Generation Config
  signal_config?: {
    polling_interval?: number;
    min_confidence?: number;
    max_signals_per_hour?: number;
  };
  
  // Strike Finance Config
  strike_config?: {
    base_url?: string;
    timeout?: number;
    max_retry_attempts?: number;
  };
  
  // Execution Config
  execution_config?: {
    max_execution_time?: number;
    min_confidence_threshold?: number;
    max_position_size?: number;
    enable_notifications?: boolean;
  };
  
  // Auto-start services
  auto_start?: boolean;
}) {
  console.log('🎯 Initializing Complete One-Click Execution System...');
  
  try {
    // Initialize Signal Generation Service
    const signalService = initializeSignalService({
      polling_interval: config?.signal_config?.polling_interval || 300,
      min_confidence: config?.signal_config?.min_confidence || 70,
      max_signals_per_hour: config?.signal_config?.max_signals_per_hour || 12,
    });

    // Initialize Strike Finance Integration
    const strikeIntegration = await initializeStrikeFinanceIntegration({
      strike_config: config?.strike_config,
      execution_config: config?.execution_config,
      auto_start: config?.auto_start !== false,
    });

    console.log('✅ One-Click Execution System initialized successfully');
    
    return {
      signalService,
      strikeIntegration,
      status: 'initialized',
    };
  } catch (error) {
    console.error('❌ Failed to initialize One-Click Execution System:', error);
    throw error;
  }
}

/**
 * Get system status
 */
export async function getOneClickExecutionSystemStatus() {
  try {
    const signalStatus = getSignalGenerationService().getStatus();
    const strikeStatus = await getStrikeFinanceStatus();
    
    return {
      signal_generation: signalStatus,
      strike_finance: strikeStatus,
      overall_status: signalStatus.health === 'healthy' && strikeStatus ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to get system status:', error);
    return {
      signal_generation: null,
      strike_finance: null,
      overall_status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Health check for all services
 */
export async function performSystemHealthCheck() {
  console.log('🏥 Performing system health check...');
  
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  try {
    // Check Signal Generation Service
    const signalService = getSignalGenerationService();
    const signalStatus = signalService.getStatus();
    
    if (!signalStatus.running) {
      issues.push('Signal Generation Service is not running');
      recommendations.push('Start the signal generation service');
    }
    
    if (signalStatus.errors.length > 0) {
      issues.push(`Signal service has ${signalStatus.errors.length} errors`);
      recommendations.push('Check signal service error logs');
    }
    
    // Check Strike Finance Integration
    const strikeStatus = await getStrikeFinanceStatus();
    
    if (!strikeStatus) {
      issues.push('Strike Finance integration is not available');
      recommendations.push('Initialize Strike Finance integration');
    }
    
    const healthy = issues.length === 0;
    
    console.log(`🏥 Health check completed: ${healthy ? 'HEALTHY' : 'ISSUES FOUND'}`);
    if (issues.length > 0) {
      console.log('Issues:', issues);
      console.log('Recommendations:', recommendations);
    }
    
    return {
      healthy,
      issues,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return {
      healthy: false,
      issues: ['Health check failed'],
      recommendations: ['Check system logs and restart services'],
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Quick start function for development
 */
export async function quickStartOneClickExecution() {
  console.log('🚀 Quick starting One-Click Execution System...');
  
  try {
    const system = await initializeOneClickExecutionSystem({
      signal_config: {
        polling_interval: 60, // 1 minute for development
        min_confidence: 60,   // Lower threshold for testing
        max_signals_per_hour: 60, // Higher limit for testing
      },
      execution_config: {
        max_execution_time: 30,
        min_confidence_threshold: 60,
        max_position_size: 100,
        enable_notifications: true,
      },
      auto_start: true,
    });
    
    // Perform initial health check
    const healthCheck = await performSystemHealthCheck();
    
    console.log('✅ Quick start completed');
    console.log('System status:', system.status);
    console.log('Health check:', healthCheck.healthy ? 'HEALTHY' : 'ISSUES');
    
    return {
      system,
      healthCheck,
    };
  } catch (error) {
    console.error('❌ Quick start failed:', error);
    throw error;
  }
}