/**
 * Automated Strike Finance Trading Service
 * Integrates managed wallets with Strike Finance for automated perpetual trading
 * Uses seed phrase signing to eliminate manual wallet interactions
 */

import { StrikeFinanceAPI, Side } from './strike-finance-api.js';
import { EventEmitter } from 'events';

export interface ManagedWalletInfo {
  userId: string;
  walletId: string;
  address: string;
  stakeAddress?: string;
  encryptedSeed: string;
  isActive: boolean;
  tradingConfig?: {
    autoTradingEnabled: boolean;
    maxDailyTrades: number;
    maxPositionSize: number;
    riskLevel: 'conservative' | 'moderate' | 'aggressive';
  };
}

export interface AutomatedTradeRequest {
  walletId: string;
  action: 'open' | 'close';
  side?: Side;
  collateralAmount: number; // In ADA
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionId?: string; // For closing positions
  // Additional fields for closing positions
  txHash?: string; // Transaction hash of the position to close
  outputIndex?: number; // Output index of the position UTXO
  enteredPositionTime?: number; // POSIX timestamp when position was entered
}

export interface AutomatedTradeResult {
  success: boolean;
  txHash?: string;
  error?: string;
  tradeId: string;
  walletAddress: string;
  action: string;
  side?: string;
  amount: number;
  leverage?: number;
  timestamp: Date;
}

/**
 * Service for executing automated Strike Finance trades using managed wallets
 */
export class AutomatedStrikeTradingService extends EventEmitter {
  private strikeAPI: StrikeFinanceAPI;
  private managedWallets: Map<string, ManagedWalletInfo> = new Map();
  private activeTrades: Map<string, AutomatedTradeResult> = new Map();
  private readonly blockfrostProjectId: string;
  private readonly automatedSigningEndpoint: string;
  // Discord bot removed for deployment

  constructor(
    blockfrostProjectId: string = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu',
    automatedSigningEndpoint: string = '/api/cardano/automated-strike-signing'
  ) {
    super();
    this.strikeAPI = new StrikeFinanceAPI();
    this.blockfrostProjectId = blockfrostProjectId;
    this.automatedSigningEndpoint = automatedSigningEndpoint;

    // Discord notifications disabled for deployment

    console.log('🤖 Automated Strike Trading Service initialized');
  }

  // Discord bot functionality removed for deployment

  /**
   * Register a managed wallet for automated trading
   */
  async registerManagedWallet(walletInfo: ManagedWalletInfo): Promise<boolean> {
    try {
      console.log(`🔐 Registering managed wallet ${walletInfo.walletId} for automated trading`);
      
      // Validate wallet info
      if (!walletInfo.address || !walletInfo.encryptedSeed) {
        throw new Error('Invalid wallet info: missing address or encrypted seed');
      }
      
      this.managedWallets.set(walletInfo.walletId, walletInfo);
      
      console.log(`✅ Managed wallet ${walletInfo.walletId} registered successfully`);
      this.emit('walletRegistered', walletInfo);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to register managed wallet ${walletInfo.walletId}:`, error);
      return false;
    }
  }

  /**
   * Execute automated Strike Finance trade
   */
  async executeAutomatedTrade(request: AutomatedTradeRequest): Promise<AutomatedTradeResult> {
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      console.log(`🤖 Starting automated Strike trade ${tradeId}`);
      console.log('📋 Trade request:', JSON.stringify(request, null, 2));
      
      // Get managed wallet info
      const walletInfo = this.managedWallets.get(request.walletId);
      if (!walletInfo) {
        throw new Error(`Managed wallet ${request.walletId} not found`);
      }
      
      if (!walletInfo.isActive) {
        throw new Error(`Managed wallet ${request.walletId} is not active`);
      }
      
      // Check trading configuration
      if (!walletInfo.tradingConfig?.autoTradingEnabled) {
        throw new Error(`Auto-trading not enabled for wallet ${request.walletId}`);
      }
      
      // Validate trade amount against limits
      if (request.collateralAmount > walletInfo.tradingConfig.maxPositionSize) {
        throw new Error(`Trade amount ${request.collateralAmount} exceeds max position size ${walletInfo.tradingConfig.maxPositionSize}`);
      }
      
      console.log(`✅ Wallet validation passed for ${walletInfo.address.substring(0, 20)}...`);
      
      // Get transaction CBOR from Strike Finance API
      let cbor: string;
      
      if (request.action === 'open') {
        if (!request.side) {
          throw new Error('Side is required for opening positions');
        }
        
        const response = await this.strikeAPI.openPosition(
          walletInfo.address,
          request.collateralAmount,
          request.leverage || 1,
          request.side,
          request.stopLoss,
          request.takeProfit
        );
        
        cbor = response.cbor;
        console.log('✅ Strike Finance open position CBOR received');
        
      } else if (request.action === 'close') {
        if (!request.positionId) {
          throw new Error('Position ID is required for closing positions');
        }
        
        // For closing positions, we need txHash, outputIndex, and enteredPositionTime
        // These should be provided in the request or retrieved from position data
        const txHash = request.txHash || 'placeholder-tx-hash';
        const outputIndex = request.outputIndex || 0;
        const enteredPositionTime = request.enteredPositionTime || Date.now();

        const response = await this.strikeAPI.closePosition(
          walletInfo.address,
          txHash,
          outputIndex,
          enteredPositionTime
        );
        
        cbor = response.cbor;
        console.log('✅ Strike Finance close position CBOR received');
        
      } else {
        throw new Error(`Unsupported action: ${request.action}`);
      }
      
      // Decrypt seed phrase (in production, this would use proper encryption)
      const seedPhrase = this.decryptSeedPhrase(walletInfo.encryptedSeed);
      
      // Call automated signing endpoint
      const signingResponse = await fetch(this.automatedSigningEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txCbor: cbor,
          seedPhrase,
          walletAddress: walletInfo.address,
          blockfrostProjectId: this.blockfrostProjectId
        })
      });
      
      if (!signingResponse.ok) {
        const errorData = await signingResponse.json();
        throw new Error(`Automated signing failed: ${errorData.error}`);
      }
      
      const signingResult = await signingResponse.json();
      
      if (!signingResult.success) {
        throw new Error(`Automated signing failed: ${signingResult.error}`);
      }
      
      console.log('🎉 Automated Strike Finance trade completed successfully!');
      console.log('📋 Transaction hash:', signingResult.txHash);

      // Create trade result
      const tradeResult: AutomatedTradeResult = {
        success: true,
        txHash: signingResult.txHash,
        tradeId,
        walletAddress: walletInfo.address,
        action: request.action,
        side: request.side,
        amount: request.collateralAmount,
        leverage: request.leverage,
        timestamp: new Date()
      };

      // Store active trade
      this.activeTrades.set(tradeId, tradeResult);

      // Discord notifications disabled for deployment
      console.log('📢 Trade completed:', tradeResult.success ? 'SUCCESS' : 'FAILED');

      // Emit trade completed event
      this.emit('tradeCompleted', tradeResult);

      return tradeResult;
      
    } catch (error) {
      console.error(`❌ Automated Strike trade ${tradeId} failed:`, error);
      
      const errorResult: AutomatedTradeResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        tradeId,
        walletAddress: this.managedWallets.get(request.walletId)?.address || 'unknown',
        action: request.action,
        side: request.side,
        amount: request.collateralAmount,
        leverage: request.leverage,
        timestamp: new Date()
      };
      
      this.emit('tradeFailed', errorResult);
      return errorResult;
    }
  }

  /**
   * Get active trades for a wallet
   */
  getActiveTradesForWallet(walletId: string): AutomatedTradeResult[] {
    const walletInfo = this.managedWallets.get(walletId);
    if (!walletInfo) return [];
    
    return Array.from(this.activeTrades.values())
      .filter(trade => trade.walletAddress === walletInfo.address);
  }

  /**
   * Get all registered managed wallets
   */
  getRegisteredWallets(): ManagedWalletInfo[] {
    return Array.from(this.managedWallets.values());
  }

  // Discord notification method removed for deployment

  /**
   * Decrypt seed phrase (placeholder - implement proper encryption in production)
   */
  private decryptSeedPhrase(encryptedSeed: string): string {
    // TODO: Implement proper decryption using the same method as managed wallet system
    // For now, assume it's base64 encoded
    try {
      return Buffer.from(encryptedSeed, 'base64').toString('utf-8');
    } catch (error) {
      throw new Error('Failed to decrypt seed phrase');
    }
  }
}

// Export singleton instance
export const automatedStrikeTradingService = new AutomatedStrikeTradingService();
