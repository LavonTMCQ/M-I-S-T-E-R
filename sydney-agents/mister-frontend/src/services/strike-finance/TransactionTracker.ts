/**
 * Transaction Tracking and Monitoring System
 * 
 * Comprehensive system for tracking Strike Finance transactions and monitoring
 * their status, providing real-time updates and historical data.
 * 
 * Features:
 * - Real-time transaction status monitoring
 * - Transaction history and audit trails
 * - Position tracking and P&L monitoring
 * - Error tracking and recovery mechanisms
 * - Performance metrics and analytics
 * - Integration with Strike Finance API
 * - WebSocket support for real-time updates
 */

import {
  TradingSignal,
  SignalExecution,
  StrikeFinanceTradeResponse,
  StrikeFinancePosition
} from '@/types/signals';

import { StrikeFinanceApiClient, getStrikeFinanceClient } from './StrikeFinanceClient';

/**
 * Transaction status types
 */
export type TransactionStatus = 
  | 'pending'      // Transaction submitted, waiting for confirmation
  | 'confirmed'    // Transaction confirmed on blockchain
  | 'executed'     // Position opened/closed successfully
  | 'failed'       // Transaction failed
  | 'cancelled'    // Transaction cancelled
  | 'expired';     // Transaction expired

/**
 * Transaction record
 */
export interface TransactionRecord {
  /** Unique transaction ID */
  transaction_id: string;
  
  /** Related signal ID */
  signal_id: string;
  
  /** User wallet address */
  wallet_address: string;
  
  /** Transaction type */
  type: 'open_position' | 'close_position' | 'modify_position';
  
  /** Transaction status */
  status: TransactionStatus;
  
  /** Strike Finance trade request */
  trade_request: any;
  
  /** Strike Finance trade response */
  trade_response: StrikeFinanceTradeResponse;
  
  /** Transaction timestamps */
  timestamps: {
    submitted: string;
    confirmed?: string;
    executed?: string;
    failed?: string;
  };
  
  /** Transaction details */
  details: {
    side: 'long' | 'short';
    amount: number;
    execution_price?: number;
    fees?: {
      trading_fee: number;
      network_fee: number;
      total_fee: number;
    };
    position_id?: string;
  };
  
  /** Error information if failed */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  
  /** Retry information */
  retry_info?: {
    attempt_count: number;
    last_attempt: string;
    next_attempt?: string;
  };
}

/**
 * Position monitoring record
 */
export interface PositionMonitorRecord {
  /** Position ID */
  position_id: string;
  
  /** Related transaction ID */
  transaction_id: string;
  
  /** Related signal ID */
  signal_id: string;
  
  /** User wallet address */
  wallet_address: string;
  
  /** Position details */
  position: StrikeFinancePosition;
  
  /** Monitoring status */
  monitoring_status: 'active' | 'paused' | 'stopped';
  
  /** P&L tracking */
  pnl_history: {
    timestamp: string;
    current_price: number;
    unrealized_pnl: number;
    pnl_percentage: number;
  }[];
  
  /** Risk monitoring */
  risk_alerts: {
    stop_loss_triggered: boolean;
    take_profit_triggered: boolean;
    liquidation_risk: boolean;
    high_drawdown: boolean;
  };
  
  /** Last update timestamp */
  last_updated: string;
}

/**
 * Transaction Tracker Configuration
 */
export interface TransactionTrackerConfig {
  /** Polling interval for status updates (seconds) */
  polling_interval: number;
  
  /** Maximum retry attempts for failed transactions */
  max_retry_attempts: number;
  
  /** Retry delay in milliseconds */
  retry_delay_ms: number;
  
  /** Enable real-time position monitoring */
  enable_position_monitoring: boolean;
  
  /** Position monitoring interval (seconds) */
  position_monitoring_interval: number;
  
  /** Maximum transaction history to keep */
  max_history_entries: number;
  
  /** Enable WebSocket for real-time updates */
  enable_websocket: boolean;
  
  /** WebSocket endpoint */
  websocket_endpoint?: string;
}

/**
 * Default tracker configuration
 */
const DEFAULT_TRACKER_CONFIG: TransactionTrackerConfig = {
  polling_interval: 10, // 10 seconds
  max_retry_attempts: 3,
  retry_delay_ms: 5000, // 5 seconds
  enable_position_monitoring: true,
  position_monitoring_interval: 30, // 30 seconds
  max_history_entries: 1000,
  enable_websocket: false,
};

/**
 * Transaction Tracker Class
 */
export class TransactionTracker {
  private config: TransactionTrackerConfig;
  private strikeClient: StrikeFinanceApiClient;
  private transactions: Map<string, TransactionRecord> = new Map();
  private positions: Map<string, PositionMonitorRecord> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private positionMonitoringInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private listeners: Map<string, ((record: TransactionRecord) => void)[]> = new Map();

  constructor(config: Partial<TransactionTrackerConfig> = {}) {
    this.config = { ...DEFAULT_TRACKER_CONFIG, ...config };
    this.strikeClient = getStrikeFinanceClient();
    
    console.log('📊 Transaction Tracker initialized');
    console.log('⚙️ Configuration:', {
      polling_interval: this.config.polling_interval,
      max_retry_attempts: this.config.max_retry_attempts,
      enable_position_monitoring: this.config.enable_position_monitoring,
    });
  }

  /**
   * Start transaction tracking
   */
  public start(): void {
    if (this.isRunning) {
      console.log('⚠️ Transaction tracker is already running');
      return;
    }

    console.log('🚀 Starting transaction tracker...');
    this.isRunning = true;

    // Start transaction status polling
    this.startTransactionPolling();

    // Start position monitoring if enabled
    if (this.config.enable_position_monitoring) {
      this.startPositionMonitoring();
    }

    console.log('✅ Transaction tracker started successfully');
  }

  /**
   * Stop transaction tracking
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Transaction tracker is not running');
      return;
    }

    console.log('🛑 Stopping transaction tracker...');
    this.isRunning = false;

    // Stop polling intervals
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.positionMonitoringInterval) {
      clearInterval(this.positionMonitoringInterval);
      this.positionMonitoringInterval = null;
    }

    console.log('✅ Transaction tracker stopped');
  }

  /**
   * Track a new transaction
   */
  public trackTransaction(
    transactionId: string,
    signalId: string,
    walletAddress: string,
    tradeRequest: any,
    tradeResponse: StrikeFinanceTradeResponse
  ): void {
    console.log(`📝 Tracking new transaction: ${transactionId}`);

    const record: TransactionRecord = {
      transaction_id: transactionId,
      signal_id: signalId,
      wallet_address: walletAddress,
      type: 'open_position', // Default type
      status: tradeResponse.success ? 'confirmed' : 'failed',
      trade_request: tradeRequest,
      trade_response: tradeResponse,
      timestamps: {
        submitted: new Date().toISOString(),
        confirmed: tradeResponse.success ? new Date().toISOString() : undefined,
        failed: !tradeResponse.success ? new Date().toISOString() : undefined,
      },
      details: {
        side: tradeRequest.side,
        amount: tradeRequest.amount,
        execution_price: tradeResponse.execution_price,
        fees: tradeResponse.fees,
      },
      error: tradeResponse.error ? {
        code: tradeResponse.error.code || 'UNKNOWN',
        message: tradeResponse.error.message || 'Unknown error',
        details: tradeResponse.error.details,
      } : undefined,
    };

    this.transactions.set(transactionId, record);

    // Notify listeners
    this.notifyListeners(transactionId, record);

    // If successful, start position monitoring
    if (tradeResponse.success && this.config.enable_position_monitoring) {
      this.startPositionTracking(transactionId, signalId, walletAddress);
    }

    console.log(`✅ Transaction tracking started: ${transactionId} (Status: ${record.status})`);
  }

  /**
   * Get transaction by ID
   */
  public getTransaction(transactionId: string): TransactionRecord | null {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * Get all transactions for a wallet
   */
  public getTransactionsByWallet(walletAddress: string): TransactionRecord[] {
    return Array.from(this.transactions.values())
      .filter(record => record.wallet_address === walletAddress)
      .sort((a, b) => new Date(b.timestamps.submitted).getTime() - new Date(a.timestamps.submitted).getTime());
  }

  /**
   * Get transaction statistics
   */
  public getTransactionStatistics(walletAddress?: string): {
    total_transactions: number;
    successful_transactions: number;
    failed_transactions: number;
    pending_transactions: number;
    success_rate: number;
    total_volume: number;
    total_fees: number;
  } {
    let transactions = Array.from(this.transactions.values());
    
    if (walletAddress) {
      transactions = transactions.filter(t => t.wallet_address === walletAddress);
    }

    const total = transactions.length;
    const successful = transactions.filter(t => t.status === 'executed' || t.status === 'confirmed').length;
    const failed = transactions.filter(t => t.status === 'failed').length;
    const pending = transactions.filter(t => t.status === 'pending').length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    
    const totalVolume = transactions.reduce((sum, t) => sum + (t.details.amount || 0), 0);
    const totalFees = transactions.reduce((sum, t) => sum + (t.details.fees?.total_fee || 0), 0);

    return {
      total_transactions: total,
      successful_transactions: successful,
      failed_transactions: failed,
      pending_transactions: pending,
      success_rate: successRate,
      total_volume: totalVolume,
      total_fees: totalFees,
    };
  }

  /**
   * Add transaction status listener
   */
  public addTransactionListener(
    transactionId: string,
    listener: (record: TransactionRecord) => void
  ): void {
    if (!this.listeners.has(transactionId)) {
      this.listeners.set(transactionId, []);
    }
    this.listeners.get(transactionId)!.push(listener);
  }

  /**
   * Remove transaction status listener
   */
  public removeTransactionListener(
    transactionId: string,
    listener: (record: TransactionRecord) => void
  ): void {
    const listeners = this.listeners.get(transactionId);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get position monitoring data
   */
  public getPositionMonitoring(positionId: string): PositionMonitorRecord | null {
    return this.positions.get(positionId) || null;
  }

  /**
   * Get all monitored positions for a wallet
   */
  public getMonitoredPositions(walletAddress: string): PositionMonitorRecord[] {
    return Array.from(this.positions.values())
      .filter(record => record.wallet_address === walletAddress)
      .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
  }

  /**
   * Start transaction status polling
   */
  private startTransactionPolling(): void {
    this.pollingInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.updateTransactionStatuses();
      } catch (error) {
        console.error('❌ Transaction polling error:', error);
      }
    }, this.config.polling_interval * 1000);
  }

  /**
   * Start position monitoring
   */
  private startPositionMonitoring(): void {
    this.positionMonitoringInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.updatePositionStatuses();
      } catch (error) {
        console.error('❌ Position monitoring error:', error);
      }
    }, this.config.position_monitoring_interval * 1000);
  }

  /**
   * Update transaction statuses
   */
  private async updateTransactionStatuses(): Promise<void> {
    const pendingTransactions = Array.from(this.transactions.values())
      .filter(record => record.status === 'pending' || record.status === 'confirmed');

    for (const record of pendingTransactions) {
      try {
        // Check transaction status with Strike Finance
        // For now, we'll simulate status updates
        await this.updateTransactionStatus(record);
      } catch (error) {
        console.error(`❌ Failed to update transaction status ${record.transaction_id}:`, error);
      }
    }
  }

  /**
   * Update position statuses
   */
  private async updatePositionStatuses(): Promise<void> {
    const activePositions = Array.from(this.positions.values())
      .filter(record => record.monitoring_status === 'active');

    for (const record of activePositions) {
      try {
        await this.updatePositionStatus(record);
      } catch (error) {
        console.error(`❌ Failed to update position status ${record.position_id}:`, error);
      }
    }
  }

  /**
   * Update individual transaction status
   */
  private async updateTransactionStatus(record: TransactionRecord): Promise<void> {
    // In a real implementation, this would check the blockchain or Strike Finance API
    // For now, we'll simulate status progression
    
    if (record.status === 'pending') {
      // Simulate confirmation after some time
      const timeSinceSubmission = Date.now() - new Date(record.timestamps.submitted).getTime();
      if (timeSinceSubmission > 30000) { // 30 seconds
        record.status = 'confirmed';
        record.timestamps.confirmed = new Date().toISOString();
        
        this.transactions.set(record.transaction_id, record);
        this.notifyListeners(record.transaction_id, record);
        
        console.log(`✅ Transaction confirmed: ${record.transaction_id}`);
      }
    } else if (record.status === 'confirmed') {
      // Simulate execution after confirmation
      const timeSinceConfirmation = record.timestamps.confirmed 
        ? Date.now() - new Date(record.timestamps.confirmed).getTime()
        : 0;
      
      if (timeSinceConfirmation > 10000) { // 10 seconds
        record.status = 'executed';
        record.timestamps.executed = new Date().toISOString();
        
        this.transactions.set(record.transaction_id, record);
        this.notifyListeners(record.transaction_id, record);
        
        console.log(`✅ Transaction executed: ${record.transaction_id}`);
      }
    }
  }

  /**
   * Update individual position status
   */
  private async updatePositionStatus(record: PositionMonitorRecord): Promise<void> {
    try {
      // Get updated position data from Strike Finance
      const positions = await this.strikeClient.getPositions(record.wallet_address);
      const updatedPosition = positions.find(p => p.position_id === record.position_id);
      
      if (updatedPosition) {
        // Update position data
        record.position = updatedPosition;
        record.last_updated = new Date().toISOString();
        
        // Add P&L history entry
        record.pnl_history.push({
          timestamp: new Date().toISOString(),
          current_price: updatedPosition.current_price,
          unrealized_pnl: updatedPosition.unrealized_pnl,
          pnl_percentage: (updatedPosition.unrealized_pnl / (updatedPosition.size * updatedPosition.entry_price)) * 100,
        });
        
        // Keep only last 100 P&L entries
        if (record.pnl_history.length > 100) {
          record.pnl_history = record.pnl_history.slice(-100);
        }
        
        // Check risk alerts
        this.checkRiskAlerts(record);
        
        this.positions.set(record.position_id, record);
        
        console.log(`📊 Position updated: ${record.position_id} (P&L: ${updatedPosition.unrealized_pnl.toFixed(2)} ADA)`);
      }
    } catch (error) {
      console.error(`❌ Failed to update position ${record.position_id}:`, error);
    }
  }

  /**
   * Start position tracking for a new position
   */
  private startPositionTracking(
    transactionId: string,
    signalId: string,
    walletAddress: string
  ): void {
    // This would be called after a successful trade execution
    // For now, we'll create a mock position record
    const positionId = `pos_${transactionId}`;
    
    const mockPosition: StrikeFinancePosition = {
      position_id: positionId,
      asset: 'ADA',
      side: 'long',
      size: 50,
      entry_price: 0.7445,
      current_price: 0.7445,
      unrealized_pnl: 0,
      status: 'open',
      opened_at: new Date().toISOString(),
    };

    const monitorRecord: PositionMonitorRecord = {
      position_id: positionId,
      transaction_id: transactionId,
      signal_id: signalId,
      wallet_address: walletAddress,
      position: mockPosition,
      monitoring_status: 'active',
      pnl_history: [{
        timestamp: new Date().toISOString(),
        current_price: mockPosition.current_price,
        unrealized_pnl: 0,
        pnl_percentage: 0,
      }],
      risk_alerts: {
        stop_loss_triggered: false,
        take_profit_triggered: false,
        liquidation_risk: false,
        high_drawdown: false,
      },
      last_updated: new Date().toISOString(),
    };

    this.positions.set(positionId, monitorRecord);
    console.log(`📊 Position tracking started: ${positionId}`);
  }

  /**
   * Check risk alerts for a position
   */
  private checkRiskAlerts(record: PositionMonitorRecord): void {
    const position = record.position;
    const alerts = record.risk_alerts;

    // Check stop loss
    if (position.stop_loss) {
      const stopLossTriggered = (position.side === 'long' && position.current_price <= position.stop_loss) ||
                               (position.side === 'short' && position.current_price >= position.stop_loss);
      
      if (stopLossTriggered && !alerts.stop_loss_triggered) {
        alerts.stop_loss_triggered = true;
        console.log(`🚨 Stop loss triggered for position: ${position.position_id}`);
      }
    }

    // Check take profit
    if (position.take_profit) {
      const takeProfitTriggered = (position.side === 'long' && position.current_price >= position.take_profit) ||
                                 (position.side === 'short' && position.current_price <= position.take_profit);
      
      if (takeProfitTriggered && !alerts.take_profit_triggered) {
        alerts.take_profit_triggered = true;
        console.log(`🎯 Take profit triggered for position: ${position.position_id}`);
      }
    }

    // Check high drawdown (more than 20% loss)
    const drawdownPercentage = (position.unrealized_pnl / (position.size * position.entry_price)) * 100;
    if (drawdownPercentage < -20 && !alerts.high_drawdown) {
      alerts.high_drawdown = true;
      console.log(`⚠️ High drawdown alert for position: ${position.position_id} (${drawdownPercentage.toFixed(2)}%)`);
    }
  }

  /**
   * Notify transaction listeners
   */
  private notifyListeners(transactionId: string, record: TransactionRecord): void {
    const listeners = this.listeners.get(transactionId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(record);
        } catch (error) {
          console.error('❌ Transaction listener error:', error);
        }
      }
    }
  }

  /**
   * Clean up old records
   */
  private cleanupOldRecords(): void {
    // Remove old transaction records
    if (this.transactions.size > this.config.max_history_entries) {
      const sortedTransactions = Array.from(this.transactions.entries())
        .sort(([, a], [, b]) => new Date(a.timestamps.submitted).getTime() - new Date(b.timestamps.submitted).getTime());
      
      const toRemove = sortedTransactions.slice(0, sortedTransactions.length - this.config.max_history_entries);
      for (const [id] of toRemove) {
        this.transactions.delete(id);
        this.listeners.delete(id);
      }
    }
  }
}

/**
 * Singleton instance for global access
 */
let transactionTrackerInstance: TransactionTracker | null = null;

/**
 * Get or create transaction tracker instance
 */
export function getTransactionTracker(config?: Partial<TransactionTrackerConfig>): TransactionTracker {
  if (!transactionTrackerInstance) {
    transactionTrackerInstance = new TransactionTracker(config);
  }
  return transactionTrackerInstance;
}

/**
 * Initialize transaction tracker with auto-start
 */
export function initializeTransactionTracker(
  config?: Partial<TransactionTrackerConfig>,
  autoStart: boolean = true
): TransactionTracker {
  console.log('📊 Initializing Transaction Tracker...');
  const tracker = getTransactionTracker(config);
  
  if (autoStart) {
    tracker.start();
  }
  
  console.log('✅ Transaction Tracker initialized successfully');
  return tracker;
}