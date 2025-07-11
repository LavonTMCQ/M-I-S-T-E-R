/**
 * Unified Managed Wallet Service
 * Integrates CNT bot managed wallets with Strike Finance automated trading
 * Provides seamless switching between DEX trades and perpetual trades
 */

import { EventEmitter } from 'events';
import { managedWalletManager, ManagedWallet } from '../../../MMISTERMMCP/src/managed-wallets/wallet-manager.js';
import { managedWalletTradingService } from '../../../MMISTERMMCP/src/managed-wallets/trading-service.js';
import { automatedStrikeTradingService, AutomatedTradeRequest } from './automated-strike-trading-service.js';
import { UnifiedExecutionService } from './unified-execution-service.js';

export interface UnifiedTradingRequest {
  userId: string;
  walletId: string;
  tradeType: 'dex' | 'perpetual';
  
  // DEX trade parameters (for CNT bot)
  dexParams?: {
    ticker: string;
    direction: 'buy' | 'sell';
    amount: number; // In ADA
  };
  
  // Perpetual trade parameters (for Strike Finance)
  perpetualParams?: {
    action: 'open' | 'close';
    side?: 'Long' | 'Short';
    collateralAmount: number; // In ADA
    leverage?: number;
    stopLoss?: number;
    takeProfit?: number;
    positionId?: string;
  };
}

export interface UnifiedTradingResult {
  success: boolean;
  tradeType: 'dex' | 'perpetual';
  txHash?: string;
  error?: string;
  walletAddress: string;
  timestamp: Date;
  details: any;
}

/**
 * Service that unifies CNT bot DEX trading with Strike Finance perpetual trading
 * Uses the same managed wallet system for both trading types
 */
export class UnifiedManagedWalletService extends EventEmitter {
  private static instance: UnifiedManagedWalletService;
  
  private constructor() {
    super();
    console.log('🔗 Unified Managed Wallet Service initialized');
    this.setupEventListeners();
  }

  static getInstance(): UnifiedManagedWalletService {
    if (!UnifiedManagedWalletService.instance) {
      UnifiedManagedWalletService.instance = new UnifiedManagedWalletService();
    }
    return UnifiedManagedWalletService.instance;
  }

  /**
   * Setup event listeners for both trading services
   */
  private setupEventListeners(): void {
    // Listen to CNT bot trading events
    managedWalletTradingService.on('tradeExecuted', (result) => {
      console.log('📈 CNT DEX trade executed:', result);
      this.emit('dexTradeCompleted', result);
    });

    managedWalletTradingService.on('tradeFailed', (error) => {
      console.error('❌ CNT DEX trade failed:', error);
      this.emit('dexTradeFailed', error);
    });

    // Listen to Strike Finance trading events
    automatedStrikeTradingService.on('tradeCompleted', (result) => {
      console.log('📊 Strike perpetual trade completed:', result);
      this.emit('perpetualTradeCompleted', result);
    });

    automatedStrikeTradingService.on('tradeFailed', (error) => {
      console.error('❌ Strike perpetual trade failed:', error);
      this.emit('perpetualTradeFailed', error);
    });
  }

  /**
   * Create a new managed wallet that works with both trading systems
   */
  async createUnifiedManagedWallet(
    userId: string, 
    displayName: string = 'Unified Trading Wallet'
  ): Promise<{ wallet: ManagedWallet; mnemonic: string }> {
    try {
      console.log(`🆕 Creating unified managed wallet for user ${userId}`);
      
      // Create wallet using CNT bot's wallet manager
      const walletResult = await managedWalletManager.createManagedWallet(userId, displayName);
      
      // Register with Strike Finance automated trading service
      const strikeRegistration = await automatedStrikeTradingService.registerManagedWallet({
        userId: walletResult.wallet.userId,
        walletId: walletResult.wallet.walletId,
        address: walletResult.wallet.address,
        stakeAddress: walletResult.wallet.stakeAddress,
        encryptedSeed: walletResult.wallet.encryptedSeed,
        isActive: walletResult.wallet.isActive,
        tradingConfig: walletResult.wallet.tradingConfig
      });

      if (!strikeRegistration) {
        console.warn(`⚠️ Failed to register wallet with Strike Finance service`);
      }

      // Register with unified execution service
      const unifiedExecution = UnifiedExecutionService.getInstance();
      await unifiedExecution.registerManagedWallet({
        userId: walletResult.wallet.userId,
        walletId: walletResult.wallet.walletId,
        address: walletResult.wallet.address,
        stakeAddress: walletResult.wallet.stakeAddress,
        encryptedSeed: walletResult.wallet.encryptedSeed,
        isActive: walletResult.wallet.isActive,
        tradingConfig: walletResult.wallet.tradingConfig
      });

      console.log(`✅ Unified managed wallet created: ${walletResult.wallet.walletId}`);
      this.emit('walletCreated', walletResult.wallet);
      
      return walletResult;
    } catch (error) {
      console.error('❌ Failed to create unified managed wallet:', error);
      throw error;
    }
  }

  /**
   * Execute unified trade (DEX or perpetual) using managed wallet
   */
  async executeUnifiedTrade(request: UnifiedTradingRequest): Promise<UnifiedTradingResult> {
    try {
      console.log(`🔄 Executing unified ${request.tradeType} trade for wallet ${request.walletId}`);
      
      // Get managed wallet info
      const wallet = await managedWalletManager.getWallet(request.walletId);
      if (!wallet) {
        throw new Error(`Managed wallet ${request.walletId} not found`);
      }

      if (!wallet.isActive) {
        throw new Error(`Managed wallet ${request.walletId} is not active`);
      }

      let result: UnifiedTradingResult;

      if (request.tradeType === 'dex' && request.dexParams) {
        // Execute DEX trade using CNT bot
        result = await this.executeDEXTrade(wallet, request.dexParams);
      } else if (request.tradeType === 'perpetual' && request.perpetualParams) {
        // Execute perpetual trade using Strike Finance
        result = await this.executePerpetualTrade(wallet, request.perpetualParams);
      } else {
        throw new Error('Invalid trade request: missing required parameters');
      }

      this.emit('tradeCompleted', result);
      return result;

    } catch (error) {
      const errorResult: UnifiedTradingResult = {
        success: false,
        tradeType: request.tradeType,
        error: error instanceof Error ? error.message : String(error),
        walletAddress: 'unknown',
        timestamp: new Date(),
        details: request
      };

      this.emit('tradeFailed', errorResult);
      return errorResult;
    }
  }

  /**
   * Execute DEX trade using CNT bot's trading service
   */
  private async executeDEXTrade(
    wallet: ManagedWallet, 
    params: NonNullable<UnifiedTradingRequest['dexParams']>
  ): Promise<UnifiedTradingResult> {
    try {
      console.log(`📈 Executing DEX trade: ${params.direction} ${params.amount} ADA of ${params.ticker}`);
      
      const tradeResult = await managedWalletTradingService.executeTrade(
        wallet.walletId,
        params.ticker,
        params.direction,
        params.amount
      );

      return {
        success: tradeResult.success,
        tradeType: 'dex',
        txHash: tradeResult.txHash,
        error: tradeResult.success ? undefined : 'DEX trade failed',
        walletAddress: wallet.address,
        timestamp: new Date(),
        details: {
          ticker: params.ticker,
          direction: params.direction,
          amount: params.amount,
          tradeResult
        }
      };
    } catch (error) {
      throw new Error(`DEX trade failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute perpetual trade using Strike Finance automated service
   */
  private async executePerpetualTrade(
    wallet: ManagedWallet,
    params: NonNullable<UnifiedTradingRequest['perpetualParams']>
  ): Promise<UnifiedTradingResult> {
    try {
      console.log(`📊 Executing perpetual trade: ${params.action} ${params.side || ''} ${params.collateralAmount} ADA`);
      
      const automatedRequest: AutomatedTradeRequest = {
        walletId: wallet.walletId,
        action: params.action,
        side: params.side,
        collateralAmount: params.collateralAmount,
        leverage: params.leverage,
        stopLoss: params.stopLoss,
        takeProfit: params.takeProfit,
        positionId: params.positionId
      };

      const tradeResult = await automatedStrikeTradingService.executeAutomatedTrade(automatedRequest);

      return {
        success: tradeResult.success,
        tradeType: 'perpetual',
        txHash: tradeResult.txHash,
        error: tradeResult.error,
        walletAddress: wallet.address,
        timestamp: new Date(),
        details: {
          action: params.action,
          side: params.side,
          collateralAmount: params.collateralAmount,
          leverage: params.leverage,
          tradeResult
        }
      };
    } catch (error) {
      throw new Error(`Perpetual trade failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all managed wallets that support unified trading
   */
  async getUnifiedManagedWallets(userId?: string): Promise<ManagedWallet[]> {
    return await managedWalletManager.getUserWallets(userId);
  }

  /**
   * Get wallet balance and trading status
   */
  async getWalletStatus(walletId: string): Promise<{
    wallet: ManagedWallet | null;
    dexTradingActive: boolean;
    perpetualTradingActive: boolean;
  }> {
    const wallet = await managedWalletManager.getWallet(walletId);
    
    return {
      wallet,
      dexTradingActive: wallet?.tradingConfig?.autoTradingEnabled || false,
      perpetualTradingActive: wallet?.tradingConfig?.autoTradingEnabled || false
    };
  }
}

// Export singleton instance
export const unifiedManagedWalletService = UnifiedManagedWalletService.getInstance();
