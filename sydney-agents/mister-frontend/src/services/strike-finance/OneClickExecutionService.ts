/**
 * One-Click Execution Service
 * 
 * Comprehensive service for executing trading signals with a single click.
 * Handles the complete workflow from signal validation to execution confirmation.
 * 
 * Features:
 * - Complete one-click execution workflow
 * - Pre-execution validation and balance checking
 * - Integration with Signal Generation Service
 * - Wallet context integration for user authentication
 * - Transaction tracking and status monitoring
 * - Error handling and recovery mechanisms
 * - Discord notification integration
 * - Execution history and audit trails
 */

import {
  TradingSignal,
  OneClickExecutionRequest,
  OneClickExecutionResponse,
  PreExecutionValidation,
  StrikeFinanceTradeRequest,
  StrikeFinanceTradeResponse,
  SignalExecution,
  signalToStrikeFinanceRequest,
  validateTradingSignal,
  isExecutableSignal,
  createExecutionNotification
} from '@/types/signals';

import { StrikeFinanceApiClient, getStrikeFinanceClient } from './StrikeFinanceClient';

/**
 * Execution service configuration
 */
export interface OneClickExecutionConfig {
  /** Maximum execution time in seconds */
  max_execution_time: number;
  
  /** Enable pre-execution validation */
  enable_validation: boolean;
  
  /** Enable Discord notifications */
  enable_notifications: boolean;
  
  /** Minimum confidence threshold for execution */
  min_confidence_threshold: number;
  
  /** Maximum position size limit */
  max_position_size: number;
  
  /** Enable execution history tracking */
  enable_history_tracking: boolean;
  
  /** Retry configuration */
  retry_config: {
    max_attempts: number;
    delay_ms: number;
    exponential_backoff: boolean;
  };
}

/**
 * Default execution configuration
 */
const DEFAULT_EXECUTION_CONFIG: OneClickExecutionConfig = {
  max_execution_time: 30, // 30 seconds
  enable_validation: true,
  enable_notifications: true,
  min_confidence_threshold: 70,
  max_position_size: 200,
  enable_history_tracking: true,
  retry_config: {
    max_attempts: 3,
    delay_ms: 1000,
    exponential_backoff: true,
  },
};

/**
 * Execution history entry
 */
export interface ExecutionHistoryEntry {
  /** Execution ID */
  execution_id: string;
  
  /** Original signal */
  signal: TradingSignal;
  
  /** Execution request */
  request: OneClickExecutionRequest;
  
  /** Execution response */
  response: OneClickExecutionResponse;
  
  /** Execution start time */
  started_at: string;
  
  /** Execution completion time */
  completed_at: string;
  
  /** Execution duration in milliseconds */
  duration_ms: number;
  
  /** User wallet address */
  wallet_address: string;
  
  /** Execution status */
  status: 'success' | 'failed' | 'cancelled' | 'timeout';
}

/**
 * Wallet integration interface
 */
export interface WalletIntegration {
  /** Get current wallet address */
  getWalletAddress(): string | null;
  
  /** Get wallet balance in ADA */
  getWalletBalance(): number;
  
  /** Check if wallet is connected */
  isWalletConnected(): boolean;
  
  /** Get wallet type */
  getWalletType(): string | null;
  
  /** Get user identification */
  getUserId(): string | null;
}

/**
 * Discord integration interface
 */
export interface DiscordIntegration {
  /** Send execution notification */
  sendExecutionNotification(
    signal: TradingSignal,
    execution: SignalExecution,
    strikeResponse: StrikeFinanceTradeResponse,
    userDiscordId: string,
    walletAddress: string
  ): Promise<boolean>;
  
  /** Get user Discord ID */
  getUserDiscordId(): string | null;
  
  /** Check if Discord is connected */
  isConnected(): boolean;
}

/**
 * One-Click Execution Service
 */
export class OneClickExecutionService {
  private config: OneClickExecutionConfig;
  private strikeClient: StrikeFinanceApiClient;
  private walletIntegration: WalletIntegration | null = null;
  private discordIntegration: DiscordIntegration | null = null;
  private executionHistory: Map<string, ExecutionHistoryEntry> = new Map();
  private activeExecutions: Map<string, Promise<OneClickExecutionResponse>> = new Map();

  constructor(config: Partial<OneClickExecutionConfig> = {}) {
    this.config = { ...DEFAULT_EXECUTION_CONFIG, ...config };
    this.strikeClient = getStrikeFinanceClient();
    
    console.log('🎯 One-Click Execution Service initialized');
    console.log('📊 Configuration:', {
      max_execution_time: this.config.max_execution_time,
      min_confidence_threshold: this.config.min_confidence_threshold,
      max_position_size: this.config.max_position_size,
      enable_validation: this.config.enable_validation,
    });
  }

  /**
   * Set wallet integration
   */
  public setWalletIntegration(integration: WalletIntegration): void {
    this.walletIntegration = integration;
    console.log('✅ Wallet integration connected to execution service');
  }

  /**
   * Set Discord integration
   */
  public setDiscordIntegration(integration: DiscordIntegration): void {
    this.discordIntegration = integration;
    console.log('✅ Discord integration connected to execution service');
  }

  /**
   * Execute signal with one-click workflow
   */
  public async executeSignal(request: OneClickExecutionRequest): Promise<OneClickExecutionResponse> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    
    console.log(`🚀 Starting one-click execution (ID: ${executionId}):`, {
      signal_id: request.signal.id,
      signal_type: request.signal.type,
      confidence: request.signal.confidence,
      position_size: request.position_size_override || request.signal.risk.position_size,
    });

    try {
      // Check if execution is already in progress
      if (this.activeExecutions.has(request.signal.id)) {
        console.log(`⚠️ Execution already in progress for signal: ${request.signal.id}`);
        return {
          success: false,
          updated_signal: request.signal,
          summary: {
            action: 'Execution already in progress',
            amount: 0,
            price: 0,
            fees: 0,
          },
          error: {
            type: 'validation',
            message: 'Execution already in progress for this signal',
          },
        };
      }

      // Start execution with timeout
      const executionPromise = this.performExecution(request, executionId);
      this.activeExecutions.set(request.signal.id, executionPromise);

      // Set up timeout
      const timeoutPromise = this.createTimeoutPromise(this.config.max_execution_time * 1000);
      
      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      // Clean up active execution
      this.activeExecutions.delete(request.signal.id);
      
      // Record execution history
      if (this.config.enable_history_tracking) {
        this.recordExecutionHistory(executionId, request, result, startTime);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ One-click execution completed (ID: ${executionId}, Duration: ${duration}ms):`, {
        success: result.success,
        transaction_id: result.strike_response?.transaction_id,
      });

      return result;

    } catch (error) {
      // Clean up active execution
      this.activeExecutions.delete(request.signal.id);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      console.error(`❌ One-click execution failed (ID: ${executionId}):`, errorMessage);

      const failedResponse: OneClickExecutionResponse = {
        success: false,
        updated_signal: {
          ...request.signal,
          status: 'failed',
          execution: {
            started_at: new Date(startTime).toISOString(),
            completed_at: new Date().toISOString(),
            result: 'failed',
            error_message: errorMessage,
          },
        },
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

      // Record failed execution
      if (this.config.enable_history_tracking) {
        this.recordExecutionHistory(executionId, request, failedResponse, startTime);
      }

      return failedResponse;
    }
  }

  /**
   * Perform pre-execution validation
   */
  public async performPreExecutionValidation(
    signal: TradingSignal,
    walletAddress: string,
    positionSizeOverride?: number
  ): Promise<PreExecutionValidation> {
    console.log(`🔍 Performing pre-execution validation for signal: ${signal.id}`);

    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate signal
    if (this.config.enable_validation) {
      const signalValidation = validateTradingSignal(signal);
      if (!signalValidation.valid) {
        errors.push(...signalValidation.errors.map(e => e.message));
      }
      warnings.push(...signalValidation.warnings.map(w => w.message));
    }

    // Check if signal is executable
    if (!isExecutableSignal(signal)) {
      errors.push('Signal is not in executable state');
    }

    // Check signal expiry
    const now = new Date();
    const expiryTime = new Date(signal.expires_at);
    if (expiryTime <= now) {
      errors.push('Signal has expired');
    }

    // Check confidence threshold
    if (signal.confidence < this.config.min_confidence_threshold) {
      warnings.push(`Signal confidence ${signal.confidence}% is below threshold ${this.config.min_confidence_threshold}%`);
    }

    // Check position size
    const positionSize = positionSizeOverride || signal.risk.position_size;
    if (positionSize > this.config.max_position_size) {
      errors.push(`Position size ${positionSize} ADA exceeds maximum ${this.config.max_position_size} ADA`);
    }

    // Check wallet balance
    let balanceCheck = { sufficient: false, available: 0, required: positionSize + 13 };
    try {
      const hasBalance = await this.strikeClient.checkBalance(walletAddress, positionSize + 13);
      const balance = await this.strikeClient.getBalance(walletAddress);
      
      balanceCheck = {
        sufficient: hasBalance,
        available: balance.available_balance,
        required: positionSize + 13,
      };

      if (!hasBalance) {
        errors.push(`Insufficient balance: ${balance.available_balance} ADA available, ${positionSize + 13} ADA required`);
      }
    } catch (error) {
      warnings.push('Could not verify wallet balance');
    }

    // Calculate execution estimation
    const currentPrice = signal.price;
    const totalCost = positionSize + 13; // Position + fees
    const fees = (positionSize * 0.001) + 2; // 0.1% trading fee + 2 ADA network fee
    const maxLoss = Math.abs(signal.price - signal.risk.stop_loss) * positionSize;
    const maxProfit = Math.abs(signal.risk.take_profit - signal.price) * positionSize;

    const validation: PreExecutionValidation = {
      can_execute: errors.length === 0,
      checks: {
        signal_valid: errors.filter(e => e.includes('signal')).length === 0,
        balance_sufficient: balanceCheck.sufficient,
        market_open: true, // Strike Finance is always open
        risk_acceptable: positionSize <= this.config.max_position_size,
      },
      warnings,
      errors,
      estimation: {
        execution_price: currentPrice,
        total_fees: fees,
        net_amount: positionSize,
        max_loss: maxLoss,
        max_profit: maxProfit,
      },
    };

    console.log(`✅ Pre-execution validation completed:`, {
      can_execute: validation.can_execute,
      errors_count: errors.length,
      warnings_count: warnings.length,
    });

    return validation;
  }

  /**
   * Get execution history
   */
  public getExecutionHistory(walletAddress?: string): ExecutionHistoryEntry[] {
    const history = Array.from(this.executionHistory.values());
    
    if (walletAddress) {
      return history.filter(entry => entry.wallet_address === walletAddress);
    }
    
    return history.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }

  /**
   * Get active executions
   */
  public getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Cancel active execution
   */
  public async cancelExecution(signalId: string): Promise<boolean> {
    if (!this.activeExecutions.has(signalId)) {
      console.log(`⚠️ No active execution found for signal: ${signalId}`);
      return false;
    }

    try {
      // Remove from active executions (this will cause the execution to be abandoned)
      this.activeExecutions.delete(signalId);
      console.log(`✅ Execution cancelled for signal: ${signalId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to cancel execution for signal ${signalId}:`, error);
      return false;
    }
  }

  /**
   * Perform the actual execution workflow
   */
  private async performExecution(
    request: OneClickExecutionRequest,
    executionId: string
  ): Promise<OneClickExecutionResponse> {
    const signal = request.signal;
    
    // Step 1: Get wallet information
    if (!this.walletIntegration) {
      throw new Error('Wallet integration not configured');
    }

    const walletAddress = this.walletIntegration.getWalletAddress();
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    // Step 2: Perform pre-execution validation
    const validation = await this.performPreExecutionValidation(
      signal,
      walletAddress,
      request.position_size_override
    );

    if (!validation.can_execute) {
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
          message: `Pre-execution validation failed: ${validation.errors.join(', ')}`,
          details: validation,
        },
      };
    }

    // Step 3: Create Strike Finance trade request
    const positionSize = request.position_size_override || signal.risk.position_size;
    const clientRequestId = `${executionId}_${Date.now()}`;
    
    let tradeRequest = signalToStrikeFinanceRequest(signal, walletAddress, clientRequestId);
    
    // Apply overrides
    if (request.position_size_override) {
      tradeRequest.amount = request.position_size_override;
    }
    
    if (request.risk_overrides?.stop_loss) {
      tradeRequest.stop_loss = request.risk_overrides.stop_loss;
    }
    
    if (request.risk_overrides?.take_profit) {
      tradeRequest.take_profit = request.risk_overrides.take_profit;
    }

    // Step 4: Execute trade on Strike Finance
    console.log(`🎯 Executing trade on Strike Finance (${executionId}):`, {
      side: tradeRequest.side,
      amount: tradeRequest.amount,
      stop_loss: tradeRequest.stop_loss,
      take_profit: tradeRequest.take_profit,
    });

    const strikeResponse = await this.strikeClient.executeTrade(tradeRequest);

    // Step 5: Create execution record
    const execution: SignalExecution = {
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      execution_price: strikeResponse.execution_price,
      transaction_id: strikeResponse.transaction_id,
      result: strikeResponse.success ? 'success' : 'failed',
      error_message: strikeResponse.error?.message,
      executed_size: strikeResponse.executed_amount || tradeRequest.amount,
      fees: strikeResponse.fees?.total_fee,
    };

    // Step 6: Update signal with execution data
    const updatedSignal: TradingSignal = {
      ...signal,
      status: strikeResponse.success ? 'executed' : 'failed',
      execution,
    };

    // Step 7: Send Discord notification
    if (this.config.enable_notifications && this.discordIntegration && strikeResponse.success) {
      try {
        const userDiscordId = this.discordIntegration.getUserDiscordId();
        if (userDiscordId) {
          await this.discordIntegration.sendExecutionNotification(
            updatedSignal,
            execution,
            strikeResponse,
            userDiscordId,
            walletAddress
          );
        }
      } catch (error) {
        console.warn('⚠️ Failed to send Discord notification:', error);
      }
    }

    // Step 8: Create response
    const response: OneClickExecutionResponse = {
      success: strikeResponse.success,
      strike_response: strikeResponse,
      updated_signal: updatedSignal,
      summary: {
        action: `${signal.type.toUpperCase()} position opened`,
        amount: execution.executed_size || tradeRequest.amount,
        price: execution.execution_price || signal.price,
        fees: execution.fees || 0,
        estimated_pnl: this.calculateEstimatedPnl(signal, execution.execution_price || signal.price),
      },
      error: strikeResponse.success ? undefined : {
        type: 'api',
        message: strikeResponse.error?.message || 'Strike Finance execution failed',
        details: strikeResponse.error,
      },
    };

    return response;
  }  /**
   * Create timeout promise for execution
   */
  private createTimeoutPromise(timeoutMs: number): Promise<OneClickExecutionResponse> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Record execution in history
   */
  private recordExecutionHistory(
    executionId: string,
    request: OneClickExecutionRequest,
    response: OneClickExecutionResponse,
    startTime: number
  ): void {
    const walletAddress = this.walletIntegration?.getWalletAddress() || 'unknown';
    
    const historyEntry: ExecutionHistoryEntry = {
      execution_id: executionId,
      signal: request.signal,
      request,
      response,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      wallet_address: walletAddress,
      status: response.success ? 'success' : 'failed',
    };

    this.executionHistory.set(executionId, historyEntry);

    // Keep only last 100 executions to prevent memory issues
    if (this.executionHistory.size > 100) {
      const oldestKey = Array.from(this.executionHistory.keys())[0];
      this.executionHistory.delete(oldestKey);
    }

    console.log(`📊 Execution history recorded (ID: ${executionId}):`, {
      status: historyEntry.status,
      duration_ms: historyEntry.duration_ms,
      wallet_address: historyEntry.wallet_address.substring(0, 20) + '...',
    });
  }

  /**
   * Calculate estimated P&L
   */
  private calculateEstimatedPnl(signal: TradingSignal, executionPrice: number): number {
    const positionSize = signal.risk.position_size;
    const priceDiff = signal.type === 'long' 
      ? signal.risk.take_profit - executionPrice
      : executionPrice - signal.risk.take_profit;
    
    return priceDiff * positionSize;
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `exec_${timestamp}_${random}`;
  }

  /**
   * Get service statistics
   */
  public getServiceStatistics(): {
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    success_rate: number;
    average_execution_time: number;
    active_executions: number;
  } {
    const history = Array.from(this.executionHistory.values());
    const totalExecutions = history.length;
    const successfulExecutions = history.filter(h => h.status === 'success').length;
    const failedExecutions = history.filter(h => h.status === 'failed').length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    const averageExecutionTime = totalExecutions > 0 
      ? history.reduce((sum, h) => sum + h.duration_ms, 0) / totalExecutions
      : 0;

    return {
      total_executions: totalExecutions,
      successful_executions: successfulExecutions,
      failed_executions: failedExecutions,
      success_rate: successRate,
      average_execution_time: averageExecutionTime,
      active_executions: this.activeExecutions.size,
    };
  }
}

/**
 * Default wallet integration using existing wallet context
 */
export class DefaultWalletIntegration implements WalletIntegration {
  getWalletAddress(): string | null {
    // This would integrate with your existing WalletContext
    // For now, return null - implement based on your wallet context
    if (typeof window !== 'undefined') {
      // Try to get from localStorage or global state
      return typeof window !== 'undefined' ? localStorage.getItem('wallet_address') || null : null;
    }
    return null;
  }

  getWalletBalance(): number {
    // This would integrate with your existing WalletContext
    // For now, return mock balance - implement based on your wallet context
    if (typeof window !== 'undefined') {
      const balance = typeof window !== 'undefined' ? localStorage.getItem('wallet_balance') : null;
      return balance ? parseFloat(balance) : 100; // Default 100 ADA
    }
    return 100;
  }

  isWalletConnected(): boolean {
    // This would integrate with your existing WalletContext
    // For now, check if wallet address exists
    return this.getWalletAddress() !== null;
  }

  getWalletType(): string | null {
    // This would integrate with your existing WalletContext
    if (typeof window !== 'undefined') {
      return typeof window !== 'undefined' ? localStorage.getItem('wallet_type') || null : null;
    }
    return null;
  }

  getUserId(): string | null {
    // This would integrate with your existing user system
    if (typeof window !== 'undefined') {
      return typeof window !== 'undefined' ? localStorage.getItem('user_id') || null : null;
    }
    return null;
  }
}

/**
 * Default Discord integration
 */
export class DefaultDiscordIntegration implements DiscordIntegration {
  async sendExecutionNotification(
    signal: TradingSignal,
    execution: SignalExecution,
    strikeResponse: StrikeFinanceTradeResponse,
    userDiscordId: string,
    walletAddress: string
  ): Promise<boolean> {
    try {
      // This would integrate with your Discord bot
      // For now, just log the notification
      console.log('📢 Discord execution notification:', {
        signal_id: signal.id,
        execution_result: execution.result,
        transaction_id: execution.transaction_id,
        user_discord_id: userDiscordId,
        wallet_address: walletAddress.substring(0, 20) + '...',
      });

      // Create notification using our types
      const notification = createExecutionNotification(
        signal,
        execution,
        strikeResponse,
        userDiscordId,
        walletAddress
      );

      console.log('📢 Discord notification created:', notification.embed.title);
      
      // In a real implementation, this would send to Discord API
      return true;
    } catch (error) {
      console.error('❌ Failed to send Discord notification:', error);
      return false;
    }
  }

  getUserDiscordId(): string | null {
    // This would integrate with your user system
    if (typeof window !== 'undefined') {
      return typeof window !== 'undefined' ? localStorage.getItem('user_discord_id') || null : null;
    }
    return null;
  }

  isConnected(): boolean {
    // This would check Discord bot connection
    return this.getUserDiscordId() !== null;
  }
}

/**
 * Singleton instance for global access
 */
let oneClickExecutionServiceInstance: OneClickExecutionService | null = null;

/**
 * Get or create one-click execution service instance
 */
export function getOneClickExecutionService(config?: Partial<OneClickExecutionConfig>): OneClickExecutionService {
  if (!oneClickExecutionServiceInstance) {
    oneClickExecutionServiceInstance = new OneClickExecutionService(config);
  }
  return oneClickExecutionServiceInstance;
}

/**
 * Initialize one-click execution service with integrations
 */
export function initializeOneClickExecutionService(
  config?: Partial<OneClickExecutionConfig>,
  walletIntegration?: WalletIntegration,
  discordIntegration?: DiscordIntegration
): OneClickExecutionService {
  console.log('🎯 Initializing One-Click Execution Service...');
  
  const service = getOneClickExecutionService(config);
  
  // Set up integrations
  if (walletIntegration) {
    service.setWalletIntegration(walletIntegration);
  } else {
    service.setWalletIntegration(new DefaultWalletIntegration());
  }
  
  if (discordIntegration) {
    service.setDiscordIntegration(discordIntegration);
  } else {
    service.setDiscordIntegration(new DefaultDiscordIntegration());
  }
  
  console.log('✅ One-Click Execution Service initialized successfully');
  return service;
}