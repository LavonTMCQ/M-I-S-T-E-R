/**
 * Strike Finance Integration Manager
 * 
 * Comprehensive manager that coordinates all Strike Finance services and
 * provides a unified interface for the one-click execution system.
 * 
 * Features:
 * - Coordinates Strike Finance client, execution service, and transaction tracker
 * - Provides unified API for signal execution workflow
 * - Manages service health and monitoring
 * - Handles integration with Signal Generation Service
 * - Provides comprehensive error handling and recovery
 * - Manages service lifecycle and configuration
 */

import {
  TradingSignal,
  OneClickExecutionRequest,
  OneClickExecutionResponse,
  PreExecutionValidation,
  SignalGenerationResponse
} from '@/types/signals';

import { StrikeFinanceApiClient } from './StrikeFinanceClient';
import { OneClickExecutionService, WalletIntegration, DiscordIntegration } from './OneClickExecutionService';
import { TransactionTracker, TransactionRecord } from './TransactionTracker';

/**
 * Integration manager configuration
 */
export interface StrikeFinanceIntegrationConfig {
  /** Strike Finance API client */
  strikeClient: StrikeFinanceApiClient;
  
  /** One-click execution service */
  executionService: OneClickExecutionService;
  
  /** Transaction tracker */
  transactionTracker: TransactionTracker;
  
  /** Enable automatic signal processing */
  enable_auto_execution?: boolean;
  
  /** Auto-execution filters */
  auto_execution_filters?: {
    min_confidence: number;
    max_position_size: number;
    allowed_patterns: string[];
    allowed_wallets: string[];
  };
  
  /** Enable service health monitoring */
  enable_health_monitoring?: boolean;
  
  /** Health check interval in seconds */
  health_check_interval?: number;
}

/**
 * Service health status
 */
export interface ServiceHealthStatus {
  /** Overall health status */
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Individual service statuses */
  services: {
    strike_client: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      last_check: string;
      response_time?: number;
      error?: string;
    };
    execution_service: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      active_executions: number;
      success_rate: number;
      error?: string;
    };
    transaction_tracker: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      tracked_transactions: number;
      pending_transactions: number;
      error?: string;
    };
  };
  
  /** Last health check timestamp */
  last_health_check: string;
  
  /** Health check history */
  health_history: {
    timestamp: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
  }[];
}

/**
 * Integration statistics
 */
export interface IntegrationStatistics {
  /** Execution statistics */
  executions: {
    total: number;
    successful: number;
    failed: number;
    success_rate: number;
    average_execution_time: number;
  };
  
  /** Transaction statistics */
  transactions: {
    total: number;
    confirmed: number;
    pending: number;
    failed: number;
    total_volume: number;
    total_fees: number;
  };
  
  /** Performance metrics */
  performance: {
    uptime_percentage: number;
    average_response_time: number;
    error_rate: number;
    last_24h_executions: number;
  };
  
  /** Service usage */
  usage: {
    unique_wallets: number;
    total_signals_processed: number;
    most_active_wallet: string;
    peak_execution_hour: string;
  };
}

/**
 * Strike Finance Integration Manager
 */
export class StrikeFinanceIntegrationManager {
  private config: StrikeFinanceIntegrationConfig;
  private healthStatus: ServiceHealthStatus;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private signalListeners: ((signal: TradingSignal) => void)[] = [];
  private serviceStartTime: number = Date.now();
  private executionHistory: Map<string, OneClickExecutionResponse> = new Map();

  constructor(config: StrikeFinanceIntegrationConfig) {
    this.config = config;
    this.healthStatus = this.initializeHealthStatus();
    
    console.log('🎯 Strike Finance Integration Manager initialized');
    
    // Set up signal listener if auto-execution is enabled
    if (config.enable_auto_execution) {
      this.setupAutoExecution();
    }
    
    // Start health monitoring if enabled
    if (config.enable_health_monitoring !== false) {
      this.startHealthMonitoring(config.health_check_interval || 60);
    }
  }

  /**
   * Execute signal with comprehensive workflow
   */
  public async executeSignal(
    signal: TradingSignal,
    walletAddress: string,
    options?: {
      user_confirmed?: boolean;
      position_size_override?: number;
      risk_overrides?: {
        stop_loss?: number;
        take_profit?: number;
      };
      skip_validation?: boolean;
    }
  ): Promise<OneClickExecutionResponse> {
    const executionId = this.generateExecutionId();
    console.log(`🚀 Starting comprehensive signal execution (ID: ${executionId}):`, {
      signal_id: signal.id,
      wallet_address: walletAddress.substring(0, 20) + '...',
      signal_type: signal.type,
      confidence: signal.confidence,
    });

    try {
      // Step 1: Pre-execution validation (unless skipped)
      if (!options?.skip_validation) {
        const validation = await this.config.executionService.performPreExecutionValidation(
          signal,
          walletAddress,
          options?.position_size_override
        );

        if (!validation.can_execute) {
          console.log(`❌ Pre-execution validation failed for signal ${signal.id}:`, validation.errors);
          return {
            success: false,
            updated_signal: signal,
            summary: {
              action: 'Validation failed',
              amount: 0,
              price: 0,
              fees: 0,
            },
            error: {
              type: 'validation',
              message: `Validation failed: ${validation.errors.join(', ')}`,
              details: validation,
            },
          };
        }
      }

      // Step 2: Create execution request
      const executionRequest: OneClickExecutionRequest = {
        signal,
        wallet_address: walletAddress,
        user_confirmed: options?.user_confirmed !== false,
        position_size_override: options?.position_size_override,
        risk_overrides: options?.risk_overrides,
      };

      // Step 3: Execute signal
      const executionResponse = await this.config.executionService.executeSignal(executionRequest);

      // Step 4: Track transaction if successful
      if (executionResponse.success && executionResponse.strike_response?.transaction_id) {
        this.config.transactionTracker.trackTransaction(
          executionResponse.strike_response.transaction_id,
          signal.id,
          walletAddress,
          executionRequest,
          executionResponse.strike_response
        );
      }

      // Step 5: Store execution history
      this.executionHistory.set(executionId, executionResponse);

      console.log(`✅ Signal execution completed (ID: ${executionId}):`, {
        success: executionResponse.success,
        transaction_id: executionResponse.strike_response?.transaction_id,
      });

      return executionResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      console.error(`❌ Signal execution failed (ID: ${executionId}):`, errorMessage);

      return {
        success: false,
        updated_signal: signal,
        summary: {
          action: 'Execution failed',
          amount: 0,
          price: 0,
          fees: 0,
        },
        error: {
          type: 'api',
          message: errorMessage,
          details: error,
        },
      };
    }
  }

  /**
   * Perform comprehensive pre-execution validation
   */
  public async validateSignalExecution(
    signal: TradingSignal,
    walletAddress: string,
    positionSizeOverride?: number
  ): Promise<PreExecutionValidation> {
    return await this.config.executionService.performPreExecutionValidation(
      signal,
      walletAddress,
      positionSizeOverride
    );
  }

  /**
   * Get comprehensive service status
   */
  public async getServiceStatus(): Promise<{
    health: ServiceHealthStatus;
    statistics: IntegrationStatistics;
    active_executions: string[];
    recent_transactions: TransactionRecord[];
  }> {
    // Update health status
    await this.performHealthCheck();

    // Get statistics
    const statistics = this.calculateStatistics();

    // Get active executions
    const activeExecutions = this.config.executionService.getActiveExecutions();

    // Get recent transactions
    const recentTransactions = Array.from(this.config.transactionTracker.getTransactionStatistics())
      .slice(0, 10); // Last 10 transactions

    return {
      health: this.healthStatus,
      statistics,
      active_executions: activeExecutions,
      recent_transactions: recentTransactions as any, // Type assertion for now
    };
  }

  /**
   * Set wallet integration
   */
  public setWalletIntegration(integration: WalletIntegration): void {
    this.config.executionService.setWalletIntegration(integration);
    console.log('✅ Wallet integration set for Strike Finance manager');
  }

  /**
   * Set Discord integration
   */
  public setDiscordIntegration(integration: DiscordIntegration): void {
    this.config.executionService.setDiscordIntegration(integration);
    console.log('✅ Discord integration set for Strike Finance manager');
  }

  /**
   * Add signal listener for auto-execution
   */
  public addSignalListener(listener: (signal: TradingSignal) => void): void {
    this.signalListeners.push(listener);
  }

  /**
   * Remove signal listener
   */
  public removeSignalListener(listener: (signal: TradingSignal) => void): void {
    const index = this.signalListeners.indexOf(listener);
    if (index > -1) {
      this.signalListeners.splice(index, 1);
    }
  }

  /**
   * Get execution history
   */
  public getExecutionHistory(limit?: number): OneClickExecutionResponse[] {
    const history = Array.from(this.executionHistory.values());
    const sorted = history.sort((a, b) => {
      const aTime = a.updated_signal.execution?.completed_at || a.updated_signal.timestamp;
      const bTime = b.updated_signal.execution?.completed_at || b.updated_signal.timestamp;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get transaction by ID
   */
  public getTransaction(transactionId: string): TransactionRecord | null {
    return this.config.transactionTracker.getTransaction(transactionId);
  }

  /**
   * Cancel active execution
   */
  public async cancelExecution(signalId: string): Promise<boolean> {
    return await this.config.executionService.cancelExecution(signalId);
  }

  /**
   * Restart services
   */
  public async restartServices(): Promise<void> {
    console.log('🔄 Restarting Strike Finance services...');
    
    try {
      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Restart transaction tracker
      this.config.transactionTracker.stop();
      this.config.transactionTracker.start();

      // Restart health monitoring
      this.startHealthMonitoring(this.config.health_check_interval || 60);

      console.log('✅ Strike Finance services restarted successfully');
    } catch (error) {
      console.error('❌ Failed to restart Strike Finance services:', error);
      throw error;
    }
  }

  /**
   * Setup auto-execution for signals
   */
  private setupAutoExecution(): void {
    console.log('🤖 Setting up auto-execution for signals...');
    
    // This would integrate with the Signal Generation Service
    // For now, we'll set up a placeholder listener
    const autoExecutionListener = async (signal: TradingSignal) => {
      try {
        // Check auto-execution filters
        if (!this.shouldAutoExecuteSignal(signal)) {
          console.log(`⚠️ Signal ${signal.id} does not meet auto-execution criteria`);
          return;
        }

        console.log(`🤖 Auto-executing signal: ${signal.id}`);
        
        // Get wallet address (would come from wallet integration)
        const walletAddress = 'addr1...'; // Placeholder
        
        // Execute signal automatically
        const result = await this.executeSignal(signal, walletAddress, {
          user_confirmed: true, // Auto-confirmed for auto-execution
          skip_validation: false, // Always validate auto-executions
        });

        if (result.success) {
          console.log(`✅ Auto-execution successful for signal: ${signal.id}`);
        } else {
          console.log(`❌ Auto-execution failed for signal: ${signal.id}`, result.error?.message);
        }
      } catch (error) {
        console.error(`❌ Auto-execution error for signal ${signal.id}:`, error);
      }
    };

    this.addSignalListener(autoExecutionListener);
    console.log('✅ Auto-execution setup completed');
  }

  /**
   * Check if signal should be auto-executed
   */
  private shouldAutoExecuteSignal(signal: TradingSignal): boolean {
    const filters = this.config.auto_execution_filters;
    if (!filters) return true;

    // Check confidence threshold
    if (signal.confidence < filters.min_confidence) {
      return false;
    }

    // Check position size
    if (signal.risk.position_size > filters.max_position_size) {
      return false;
    }

    // Check allowed patterns
    if (filters.allowed_patterns.length > 0 && !filters.allowed_patterns.includes(signal.pattern)) {
      return false;
    }

    return true;
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(intervalSeconds: number): void {
    console.log(`🏥 Starting health monitoring (${intervalSeconds}s interval)...`);
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ Health check error:', error);
      }
    }, intervalSeconds * 1000);
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    const checkTime = new Date().toISOString();
    const issues: string[] = [];

    try {
      // Check Strike Finance client
      const strikeStartTime = Date.now();
      try {
        await this.config.strikeClient.getBalance('addr1test'); // Test call
        this.healthStatus.services.strike_client = {
          status: 'healthy',
          last_check: checkTime,
          response_time: Date.now() - strikeStartTime,
        };
      } catch (error) {
        this.healthStatus.services.strike_client = {
          status: 'unhealthy',
          last_check: checkTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        issues.push('Strike Finance client unhealthy');
      }

      // Check execution service
      const executionStats = this.config.executionService.getServiceStatistics();
      const executionStatus = executionStats.success_rate >= 80 ? 'healthy' : 
                             executionStats.success_rate >= 60 ? 'degraded' : 'unhealthy';
      
      this.healthStatus.services.execution_service = {
        status: executionStatus,
        active_executions: executionStats.active_executions,
        success_rate: executionStats.success_rate,
      };

      if (executionStatus !== 'healthy') {
        issues.push(`Execution service ${executionStatus} (${executionStats.success_rate.toFixed(1)}% success rate)`);
      }

      // Check transaction tracker
      const transactionStats = this.config.transactionTracker.getTransactionStatistics();
      const trackerStatus = transactionStats.pending_transactions < 10 ? 'healthy' : 
                           transactionStats.pending_transactions < 20 ? 'degraded' : 'unhealthy';
      
      this.healthStatus.services.transaction_tracker = {
        status: trackerStatus,
        tracked_transactions: transactionStats.total_transactions,
        pending_transactions: transactionStats.pending_transactions,
      };

      if (trackerStatus !== 'healthy') {
        issues.push(`Transaction tracker ${trackerStatus} (${transactionStats.pending_transactions} pending)`);
      }

      // Determine overall status
      const serviceStatuses = Object.values(this.healthStatus.services).map(s => s.status);
      const overallStatus = serviceStatuses.every(s => s === 'healthy') ? 'healthy' :
                           serviceStatuses.some(s => s === 'unhealthy') ? 'unhealthy' : 'degraded';

      this.healthStatus.overall_status = overallStatus;
      this.healthStatus.last_health_check = checkTime;

      // Add to health history
      this.healthStatus.health_history.push({
        timestamp: checkTime,
        status: overallStatus,
        issues: [...issues],
      });

      // Keep only last 100 health checks
      if (this.healthStatus.health_history.length > 100) {
        this.healthStatus.health_history = this.healthStatus.health_history.slice(-100);
      }

      if (issues.length > 0) {
        console.warn(`⚠️ Health check issues detected:`, issues);
      }

    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.healthStatus.overall_status = 'unhealthy';
      this.healthStatus.last_health_check = checkTime;
    }
  }

  /**
   * Calculate comprehensive statistics
   */
  private calculateStatistics(): IntegrationStatistics {
    const executionStats = this.config.executionService.getServiceStatistics();
    const transactionStats = this.config.transactionTracker.getTransactionStatistics();
    
    const uptime = Date.now() - this.serviceStartTime;
    const uptimePercentage = 99.9; // Would calculate based on actual downtime

    return {
      executions: {
        total: executionStats.total_executions,
        successful: executionStats.successful_executions,
        failed: executionStats.failed_executions,
        success_rate: executionStats.success_rate,
        average_execution_time: executionStats.average_execution_time,
      },
      transactions: {
        total: transactionStats.total_transactions,
        confirmed: transactionStats.successful_transactions,
        pending: transactionStats.pending_transactions,
        failed: transactionStats.failed_transactions,
        total_volume: transactionStats.total_volume,
        total_fees: transactionStats.total_fees,
      },
      performance: {
        uptime_percentage: uptimePercentage,
        average_response_time: 2500, // Would calculate from actual data
        error_rate: (1 - executionStats.success_rate / 100) * 100,
        last_24h_executions: executionStats.total_executions, // Would filter by time
      },
      usage: {
        unique_wallets: 1, // Would calculate from actual data
        total_signals_processed: executionStats.total_executions,
        most_active_wallet: 'addr1...', // Would calculate from actual data
        peak_execution_hour: '14:00', // Would calculate from actual data
      },
    };
  }

  /**
   * Initialize health status
   */
  private initializeHealthStatus(): ServiceHealthStatus {
    return {
      overall_status: 'healthy',
      services: {
        strike_client: {
          status: 'healthy',
          last_check: new Date().toISOString(),
        },
        execution_service: {
          status: 'healthy',
          active_executions: 0,
          success_rate: 100,
        },
        transaction_tracker: {
          status: 'healthy',
          tracked_transactions: 0,
          pending_transactions: 0,
        },
      },
      last_health_check: new Date().toISOString(),
      health_history: [],
    };
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `integration_${timestamp}_${random}`;
  }
}

/**
 * Singleton instance for global access
 */
let integrationManagerInstance: StrikeFinanceIntegrationManager | null = null;

/**
 * Get or create integration manager instance
 */
export function getStrikeFinanceIntegrationManager(): StrikeFinanceIntegrationManager | null {
  return integrationManagerInstance;
}

/**
 * Set integration manager instance
 */
export function setStrikeFinanceIntegrationManager(manager: StrikeFinanceIntegrationManager): void {
  integrationManagerInstance = manager;
}