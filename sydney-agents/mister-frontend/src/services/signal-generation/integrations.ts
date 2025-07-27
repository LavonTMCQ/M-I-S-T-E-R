/**
 * Signal Generation Integrations
 * 
 * Integration utilities for connecting the signal generation service
 * with existing systems (wallet context, Strike Finance, Discord, etc.)
 */

import { 
  TradingSignal, 
  StrikeFinanceTradeRequest,
  DiscordNotification,
  createSignalNotification,
  signalToStrikeFinanceRequest
} from '@/types/signals';

import { getSignalGenerationService } from './SignalGenerationService';

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
}

/**
 * Strike Finance integration interface
 */
export interface StrikeFinanceIntegration {
  /** Execute trade on Strike Finance */
  executeTrade(request: StrikeFinanceTradeRequest): Promise<{
    success: boolean;
    transaction_id?: string;
    error?: string;
  }>;
  
  /** Check if Strike Finance is available */
  isAvailable(): boolean;
  
  /** Get minimum trade amount */
  getMinimumTradeAmount(): number;
}

/**
 * Discord integration interface
 */
export interface DiscordIntegration {
  /** Send notification to Discord */
  sendNotification(notification: DiscordNotification): Promise<boolean>;
  
  /** Check if Discord bot is connected */
  isConnected(): boolean;
  
  /** Get user Discord ID */
  getUserDiscordId(): string | null;
}

/**
 * Signal Integration Manager
 */
export class SignalIntegrationManager {
  private walletIntegration: WalletIntegration | null = null;
  private strikeFinanceIntegration: StrikeFinanceIntegration | null = null;
  private discordIntegration: DiscordIntegration | null = null;

  constructor() {
    console.log('🔗 Signal Integration Manager initialized');
  }

  /**
   * Set wallet integration
   */
  public setWalletIntegration(integration: WalletIntegration): void {
    this.walletIntegration = integration;
    console.log('✅ Wallet integration connected');
  }

  /**
   * Set Strike Finance integration
   */
  public setStrikeFinanceIntegration(integration: StrikeFinanceIntegration): void {
    this.strikeFinanceIntegration = integration;
    console.log('✅ Strike Finance integration connected');
  }

  /**
   * Set Discord integration
   */
  public setDiscordIntegration(integration: DiscordIntegration): void {
    this.discordIntegration = integration;
    console.log('✅ Discord integration connected');
  }

  /**
   * Initialize signal listener for automatic integrations
   */
  public initializeSignalListener(): void {
    const signalService = getSignalGenerationService();
    
    signalService.addSignalListener(async (signal: TradingSignal) => {
      console.log('🔔 New signal received for integration processing:', signal.id);
      
      // Send Discord notification
      await this.sendSignalNotification(signal);
      
      // Log signal for potential auto-execution
      this.logSignalForExecution(signal);
    });
    
    console.log('🔗 Signal listener initialized for integrations');
  }

  /**
   * Send Discord notification for new signal
   */
  public async sendSignalNotification(signal: TradingSignal): Promise<boolean> {
    if (!this.discordIntegration || !this.walletIntegration) {
      console.log('⚠️ Discord or wallet integration not available for notification');
      return false;
    }

    try {
      const userDiscordId = this.discordIntegration.getUserDiscordId();
      const walletAddress = this.walletIntegration.getWalletAddress();
      
      if (!userDiscordId || !walletAddress) {
        console.log('⚠️ Missing Discord ID or wallet address for notification');
        return false;
      }

      const notification = createSignalNotification(signal, userDiscordId, walletAddress);
      const success = await this.discordIntegration.sendNotification(notification);
      
      if (success) {
        console.log('✅ Discord notification sent for signal:', signal.id);
      } else {
        console.log('❌ Failed to send Discord notification for signal:', signal.id);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error sending Discord notification:', error);
      return false;
    }
  }

  /**
   * Execute signal on Strike Finance (one-click execution)
   */
  public async executeSignalOnStrikeFinance(signal: TradingSignal): Promise<{
    success: boolean;
    transaction_id?: string;
    error?: string;
  }> {
    if (!this.strikeFinanceIntegration || !this.walletIntegration) {
      return {
        success: false,
        error: 'Strike Finance or wallet integration not available',
      };
    }

    try {
      const walletAddress = this.walletIntegration.getWalletAddress();
      if (!walletAddress) {
        return {
          success: false,
          error: 'Wallet not connected',
        };
      }

      // Check wallet balance
      const walletBalance = this.walletIntegration.getWalletBalance();
      const requiredAmount = signal.risk.position_size + 13; // Position + fees
      
      if (walletBalance < requiredAmount) {
        return {
          success: false,
          error: `Insufficient balance: ${walletBalance} ADA available, ${requiredAmount} ADA required`,
        };
      }

      // Check Strike Finance availability
      if (!this.strikeFinanceIntegration.isAvailable()) {
        return {
          success: false,
          error: 'Strike Finance service not available',
        };
      }

      // Convert signal to Strike Finance request
      const clientRequestId = this.generateRequestId();
      const tradeRequest = signalToStrikeFinanceRequest(signal, walletAddress, clientRequestId);

      // Execute trade
      console.log('🚀 Executing signal on Strike Finance:', {
        signal_id: signal.id,
        wallet_address: walletAddress,
        amount: tradeRequest.amount,
        side: tradeRequest.side,
      });

      const result = await this.strikeFinanceIntegration.executeTrade(tradeRequest);
      
      if (result.success) {
        console.log('✅ Signal executed successfully on Strike Finance:', {
          signal_id: signal.id,
          transaction_id: result.transaction_id,
        });
      } else {
        console.log('❌ Signal execution failed on Strike Finance:', {
          signal_id: signal.id,
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      console.error('❌ Error executing signal on Strike Finance:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if all integrations are ready
   */
  public getIntegrationStatus(): {
    wallet_connected: boolean;
    strike_finance_available: boolean;
    discord_connected: boolean;
    ready_for_execution: boolean;
  } {
    const walletConnected = this.walletIntegration?.isWalletConnected() || false;
    const strikeFinanceAvailable = this.strikeFinanceIntegration?.isAvailable() || false;
    const discordConnected = this.discordIntegration?.isConnected() || false;
    
    return {
      wallet_connected: walletConnected,
      strike_finance_available: strikeFinanceAvailable,
      discord_connected: discordConnected,
      ready_for_execution: walletConnected && strikeFinanceAvailable,
    };
  }

  /**
   * Get integration health summary
   */
  public getIntegrationHealth(): {
    status: 'healthy' | 'partial' | 'unavailable';
    details: string[];
    recommendations: string[];
  } {
    const status = this.getIntegrationStatus();
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check wallet
    if (status.wallet_connected) {
      details.push('✅ Wallet connected');
    } else {
      details.push('❌ Wallet not connected');
      recommendations.push('Connect your Cardano wallet');
    }

    // Check Strike Finance
    if (status.strike_finance_available) {
      details.push('✅ Strike Finance available');
    } else {
      details.push('❌ Strike Finance unavailable');
      recommendations.push('Check Strike Finance API connectivity');
    }

    // Check Discord
    if (status.discord_connected) {
      details.push('✅ Discord connected');
    } else {
      details.push('⚠️ Discord not connected');
      recommendations.push('Configure Discord bot for notifications');
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'partial' | 'unavailable';
    if (status.ready_for_execution && status.discord_connected) {
      overallStatus = 'healthy';
    } else if (status.ready_for_execution) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'unavailable';
    }

    return {
      status: overallStatus,
      details,
      recommendations,
    };
  }

  /**
   * Log signal for potential execution (for manual review)
   */
  private logSignalForExecution(signal: TradingSignal): void {
    const integrationStatus = this.getIntegrationStatus();
    
    console.log('📊 Signal execution readiness:', {
      signal_id: signal.id,
      signal_type: signal.type,
      confidence: signal.confidence,
      position_size: signal.risk.position_size,
      wallet_connected: integrationStatus.wallet_connected,
      strike_finance_available: integrationStatus.strike_finance_available,
      ready_for_execution: integrationStatus.ready_for_execution,
    });

    if (integrationStatus.ready_for_execution) {
      console.log('🎯 Signal ready for one-click execution');
    } else {
      console.log('⚠️ Signal cannot be executed automatically - manual intervention required');
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `integration_${timestamp}_${random}`;
  }
}

/**
 * Default wallet integration using existing wallet context
 */
export class DefaultWalletIntegration implements WalletIntegration {
  getWalletAddress(): string | null {
    // This would integrate with your existing WalletContext
    // For now, return null - implement based on your wallet context
    return null;
  }

  getWalletBalance(): number {
    // This would integrate with your existing WalletContext
    // For now, return 0 - implement based on your wallet context
    return 0;
  }

  isWalletConnected(): boolean {
    // This would integrate with your existing WalletContext
    // For now, return false - implement based on your wallet context
    return false;
  }

  getWalletType(): string | null {
    // This would integrate with your existing WalletContext
    // For now, return null - implement based on your wallet context
    return null;
  }
}

/**
 * Default Strike Finance integration
 */
export class DefaultStrikeFinanceIntegration implements StrikeFinanceIntegration {
  async executeTrade(request: StrikeFinanceTradeRequest): Promise<{
    success: boolean;
    transaction_id?: string;
    error?: string;
  }> {
    try {
      // This would integrate with your existing Strike Finance API
      // For now, return mock response - implement based on your API
      console.log('🚀 Mock Strike Finance execution:', request);
      
      return {
        success: true,
        transaction_id: `mock_tx_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  isAvailable(): boolean {
    // This would check your Strike Finance API availability
    // For now, return true - implement based on your API
    return true;
  }

  getMinimumTradeAmount(): number {
    return 40; // Strike Finance minimum
  }
}

/**
 * Singleton integration manager
 */
let integrationManagerInstance: SignalIntegrationManager | null = null;

/**
 * Get or create integration manager
 */
export function getSignalIntegrationManager(): SignalIntegrationManager {
  if (!integrationManagerInstance) {
    integrationManagerInstance = new SignalIntegrationManager();
  }
  return integrationManagerInstance;
}

/**
 * Initialize integrations with default implementations
 */
export function initializeDefaultIntegrations(): SignalIntegrationManager {
  const manager = getSignalIntegrationManager();
  
  // Set up default integrations
  manager.setWalletIntegration(new DefaultWalletIntegration());
  manager.setStrikeFinanceIntegration(new DefaultStrikeFinanceIntegration());
  
  // Initialize signal listener
  manager.initializeSignalListener();
  
  console.log('🔗 Default integrations initialized');
  return manager;
}