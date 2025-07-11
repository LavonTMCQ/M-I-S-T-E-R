import { EventEmitter } from 'events';
import { TradingDecision } from './signal-service';
import { StrikeFinanceAPI, OpenPositionRequest, ClosePositionRequest, UpdatePositionRequest, Asset, PerpetualInfo } from './strike-finance-api';
import { WalletManager } from './wallet-manager';
import { automatedStrikeTradingService, AutomatedTradeRequest } from './automated-strike-trading-service';

// Unified execution interfaces
export interface UnifiedExecutionResult {
  walletAddress: string;
  walletType: 'managed' | 'connected';
  success: boolean;
  txHash?: string;
  error?: string;
  timestamp: Date;
  executionMode: 'manual' | 'agent' | 'algorithmic';
}

export interface ConnectedWalletInfo {
  address: string;
  stakeAddress?: string;
  walletType: string;
  balance: number;
  handle?: string;
  // Browser wallet API for signing transactions
  signTx?: (txCbor: string) => Promise<string>;
}

export interface ManualTradeParams {
  walletAddress: string;
  walletType: 'managed' | 'connected';
  action: 'Open' | 'Close' | 'Update';
  side?: 'Long' | 'Short';
  pair: string;
  leverage?: number;
  collateralAmount?: number;
  positionSize?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionId?: string;
}

/**
 * UnifiedExecutionService - Handles trading execution for BOTH managed and connected wallets
 * This service bridges the gap and provides a single interface for all trading modes
 */
export class UnifiedExecutionService extends EventEmitter {
  private static instance: UnifiedExecutionService;
  private strikeAPI: StrikeFinanceAPI;
  private walletManager: WalletManager;
  private connectedWallets: Map<string, ConnectedWalletInfo> = new Map();

  // Default asset for ADA perpetuals
  private readonly defaultAsset: Asset = {
    policyId: "",
    assetName: ""
  };

  private constructor() {
    super();
    this.strikeAPI = new StrikeFinanceAPI();
    this.walletManager = WalletManager.getInstance();
    console.log('🔄 UnifiedExecutionService initialized - supports both managed and connected wallets');
  }

  static getInstance(): UnifiedExecutionService {
    if (!UnifiedExecutionService.instance) {
      UnifiedExecutionService.instance = new UnifiedExecutionService();
    }
    return UnifiedExecutionService.instance;
  }

  // ==================== CONNECTED WALLET METHODS ====================

  /**
   * Register a connected wallet for direct trading
   */
  registerConnectedWallet(walletInfo: ConnectedWalletInfo): void {
    this.connectedWallets.set(walletInfo.address, walletInfo);
    console.log(`🔗 Registered connected wallet: ${walletInfo.address.substring(0, 20)}... (${walletInfo.walletType})`);
  }

  /**
   * Unregister a connected wallet
   */
  unregisterConnectedWallet(walletAddress: string): void {
    this.connectedWallets.delete(walletAddress);
    console.log(`🔗 Unregistered connected wallet: ${walletAddress.substring(0, 20)}...`);
  }

  // ==================== MANAGED WALLET METHODS ====================

  /**
   * Register a managed wallet for automated trading
   * Also registers with automated Strike trading service
   */
  async registerManagedWallet(walletInfo: ManagedWalletInfo): Promise<boolean> {
    try {
      console.log(`🔐 Registering managed wallet ${walletInfo.walletId} for automated trading`);

      this.managedWallets.set(walletInfo.address, walletInfo);

      // Also register with automated Strike trading service
      const automatedRegistration = await automatedStrikeTradingService.registerManagedWallet({
        userId: walletInfo.userId,
        walletId: walletInfo.walletId,
        address: walletInfo.address,
        stakeAddress: walletInfo.stakeAddress,
        encryptedSeed: walletInfo.encryptedSeed,
        isActive: walletInfo.isActive,
        tradingConfig: walletInfo.tradingConfig
      });

      if (!automatedRegistration) {
        console.warn(`⚠️ Failed to register wallet ${walletInfo.walletId} with automated Strike trading service`);
      }

      console.log(`✅ Managed wallet ${walletInfo.walletId} registered successfully`);
      this.emit('managedWalletRegistered', walletInfo);

      return true;
    } catch (error) {
      console.error(`❌ Failed to register managed wallet ${walletInfo.walletId}:`, error);
      return false;
    }
  }

  /**
   * Unregister a managed wallet
   */
  unregisterManagedWallet(walletAddress: string): void {
    this.managedWallets.delete(walletAddress);
    console.log(`🔐 Unregistered managed wallet: ${walletAddress.substring(0, 20)}...`);
  }

  // ==================== UNIFIED TRADING METHODS ====================

  /**
   * Execute manual trade - works with both managed and connected wallets
   */
  async executeManualTrade(params: ManualTradeParams): Promise<UnifiedExecutionResult> {
    console.log(`👤 Executing manual trade (${params.walletType} wallet)...`);

    // Create trading decision from manual parameters
    const decision: TradingDecision = {
      action: params.action,
      params: {
        position: params.side,
        leverage: params.leverage || 5,
        collateralAmount: params.collateralAmount || 1000 * 1_000_000, // 1000 ADA
        positionSize: params.positionSize || 5000 * 1_000_000, // 5000 ADA
        stopLossPrice: params.stopLoss,
        takeProfitPrice: params.takeProfit
      },
      reason: `Manual trade: ${params.action} ${params.side || ''} ${params.pair}`,
      timestamp: new Date()
    };

    if (params.walletType === 'connected') {
      return await this.executeConnectedWalletTrade(decision, params.walletAddress, 'manual');
    } else {
      return await this.executeManagedWalletTrade(decision, params.walletAddress, 'manual');
    }
  }

  /**
   * Execute agent-based trade - works with both wallet types
   */
  async executeAgentTrade(decision: TradingDecision, walletAddress: string, walletType: 'managed' | 'connected'): Promise<UnifiedExecutionResult> {
    console.log(`🤖 Executing agent-based trade (${walletType} wallet)...`);

    if (walletType === 'connected') {
      return await this.executeConnectedWalletTrade(decision, walletAddress, 'agent');
    } else {
      return await this.executeManagedWalletTrade(decision, walletAddress, 'agent');
    }
  }

  /**
   * Execute algorithmic trade - works with both wallet types
   */
  async executeAlgorithmicTrade(decision: TradingDecision, walletAddress: string, walletType: 'managed' | 'connected'): Promise<UnifiedExecutionResult> {
    console.log(`⚡ Executing algorithmic trade (${walletType} wallet)...`);

    if (walletType === 'connected') {
      return await this.executeConnectedWalletTrade(decision, walletAddress, 'algorithmic');
    } else {
      return await this.executeManagedWalletTrade(decision, walletAddress, 'algorithmic');
    }
  }

  // ==================== CONNECTED WALLET EXECUTION ====================

  /**
   * Execute trade for connected wallet (user signs via browser wallet)
   */
  private async executeConnectedWalletTrade(
    decision: TradingDecision,
    walletAddress: string,
    mode: 'manual' | 'agent' | 'algorithmic'
  ): Promise<UnifiedExecutionResult> {
    const startTime = Date.now();

    try {
      const walletInfo = this.connectedWallets.get(walletAddress);
      if (!walletInfo) {
        throw new Error('Connected wallet not registered');
      }

      let txHash: string | undefined;

      switch (decision.action) {
        case "Open":
          txHash = await this.executeOpenPositionConnected(decision, walletInfo);
          break;
        case "Close":
          txHash = await this.executeClosePositionConnected(decision, walletInfo);
          break;
        case "Update":
          txHash = await this.executeUpdatePositionConnected(decision, walletInfo);
          break;
        default:
          throw new Error(`Unsupported action: ${decision.action}`);
      }

      const result: UnifiedExecutionResult = {
        walletAddress,
        walletType: 'connected',
        success: true,
        txHash,
        timestamp: new Date(),
        executionMode: mode
      };

      console.log(`✅ Connected wallet ${mode} trade executed: ${decision.action} (${Date.now() - startTime}ms)`);
      this.emit('tradeExecuted', { result, decision, mode });
      return result;

    } catch (error) {
      const result: UnifiedExecutionResult = {
        walletAddress,
        walletType: 'connected',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        executionMode: mode
      };

      console.error(`❌ Connected wallet ${mode} trade failed:`, error);
      this.emit('tradeError', { result, decision, mode, error });
      return result;
    }
  }

  // ==================== MANAGED WALLET EXECUTION ====================

  /**
   * Execute trade for managed wallet (automated signing with seed phrase)
   * Uses automated Strike trading service for seamless execution
   */
  private async executeManagedWalletTrade(
    decision: TradingDecision,
    walletAddress: string,
    mode: 'manual' | 'agent' | 'algorithmic'
  ): Promise<UnifiedExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`🤖 Executing managed wallet trade: ${decision.action} (${mode} mode)`);

      // Check if managed wallet exists
      const managedWallet = this.walletManager.getWallet(walletAddress);
      if (!managedWallet) {
        throw new Error('Managed wallet not found');
      }

      // Convert trading decision to automated trade request
      const automatedRequest: AutomatedTradeRequest = {
        walletId: managedWallet.walletId,
        action: decision.action.toLowerCase() as 'open' | 'close',
        collateralAmount: decision.params?.collateralAmount ? decision.params.collateralAmount / 1_000_000 : 40, // Convert lovelace to ADA
        leverage: decision.params?.leverage || 2,
        stopLoss: decision.params?.stopLoss,
        takeProfit: decision.params?.takeProfit
      };

      // Add side for open positions
      if (decision.action === 'Open' && decision.params?.position) {
        automatedRequest.side = decision.params.position as 'Long' | 'Short';
      }

      // Add position ID for close positions
      if (decision.action === 'Close' && decision.params?.positionId) {
        automatedRequest.positionId = decision.params.positionId;
      }

      console.log('📋 Automated trade request:', JSON.stringify(automatedRequest, null, 2));

      // Execute automated trade using the automated Strike trading service
      const automatedResult = await automatedStrikeTradingService.executeAutomatedTrade(automatedRequest);

      if (!automatedResult.success) {
        throw new Error(automatedResult.error || 'Automated trade execution failed');
      }

      const result: UnifiedExecutionResult = {
        walletAddress,
        walletType: 'managed',
        success: true,
        txHash: automatedResult.txHash,
        timestamp: new Date(),
        executionMode: mode
      };

      console.log(`✅ Managed wallet ${mode} trade executed: ${decision.action} (${Date.now() - startTime}ms)`);
      console.log(`📋 Transaction hash: ${automatedResult.txHash}`);

      this.emit('tradeExecuted', { result, decision, mode });
      return result;

    } catch (error) {
      const result: UnifiedExecutionResult = {
        walletAddress,
        walletType: 'managed',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        executionMode: mode
      };

      console.error(`❌ Managed wallet ${mode} trade failed:`, error);
      this.emit('tradeError', { result, decision, mode, error });
      return result;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get all available wallets (both managed and connected)
   */
  getAllAvailableWallets(): Array<{address: string, type: 'managed' | 'connected', info: any}> {
    const wallets = [];
    
    // Add managed wallets
    const managedWallets = this.walletManager.getActiveWallets();
    for (const wallet of managedWallets) {
      wallets.push({
        address: wallet.address,
        type: 'managed' as const,
        info: wallet
      });
    }
    
    // Add connected wallets
    for (const [address, info] of this.connectedWallets) {
      wallets.push({
        address,
        type: 'connected' as const,
        info
      });
    }
    
    return wallets;
  }

  /**
   * Check if any wallets are available for trading
   */
  hasAvailableWallets(): boolean {
    return this.walletManager.getActiveWallets().length > 0 || this.connectedWallets.size > 0;
  }

  // ==================== CONNECTED WALLET POSITION EXECUTION ====================

  /**
   * Execute open position for connected wallet
   */
  private async executeOpenPositionConnected(decision: TradingDecision, walletInfo: ConnectedWalletInfo): Promise<string> {
    const { position, leverage, collateralAmount, positionSize } = decision.params || {};

    if (!position || !leverage || !collateralAmount || !positionSize) {
      throw new Error('Missing required position parameters');
    }

    // Get current price for entry price
    const currentPrice = 0.45; // This would come from price service

    // Convert collateral amount from lovelace to ADA
    const collateralAmountADA = collateralAmount / 1_000_000;

    // Get unsigned transaction CBOR from Strike Finance API
    const response = await this.strikeAPI.openPosition(
      walletInfo.address,
      collateralAmountADA,
      leverage,
      position,
      decision.params?.stopLoss,
      decision.params?.takeProfit
    );

    // For connected wallets, return the CBOR for frontend signing
    // The frontend will handle wallet signing and transaction submission
    console.log(`📋 Connected wallet trade prepared - CBOR ready for frontend signing`);
    console.log(`📋 CBOR length: ${response.cbor.length} characters`);

    // Return a special result that indicates frontend signing is needed
    return `FRONTEND_SIGNING_REQUIRED:${response.cbor}`;
  }

  /**
   * Execute close position for connected wallet
   */
  private async executeClosePositionConnected(decision: TradingDecision, walletInfo: ConnectedWalletInfo): Promise<string> {
    // Get existing positions for this wallet
    const positions = await this.strikeAPI.getPositions(walletInfo.address);

    if (positions.length === 0) {
      throw new Error('No positions found to close');
    }

    // For now, close the first position (in production, this would be more sophisticated)
    const position = positions[0];

    const closeRequest: ClosePositionRequest = {
      request: {
        address: walletInfo.address,
        asset: position.asset.asset,
        outRef: position.outRef,
        positionSize: position.positionSize,
        positionType: position.position,
        collateralAmount: position.collateral.amount,
        position: position.position
      }
    };

    // Get unsigned transaction CBOR from Strike Finance API
    const response = await this.strikeAPI.closePosition(closeRequest);

    // Sign transaction using connected wallet
    if (!walletInfo.signTx) {
      throw new Error('Wallet signing function not available');
    }

    const signedTxCbor = await walletInfo.signTx(response.cbor);

    // Submit to Cardano network
    const txHash = await this.submitTransaction(signedTxCbor);

    console.log(`📉 Closed ${position.position} position for connected wallet (${txHash})`);
    return txHash;
  }

  /**
   * Execute update position for connected wallet
   */
  private async executeUpdatePositionConnected(decision: TradingDecision, walletInfo: ConnectedWalletInfo): Promise<string> {
    const positions = await this.strikeAPI.getPositions(walletInfo.address);

    if (positions.length === 0) {
      throw new Error('No positions found to update');
    }

    const position = positions[0];

    const updateRequest: UpdatePositionRequest = {
      request: {
        address: walletInfo.address,
        asset: position.asset.asset,
        outRef: position.outRef,
        stopLossPrice: decision.params?.stopLossPrice || position.stopLoss,
        takeProfitPrice: decision.params?.takeProfitPrice || position.takeProfit
      }
    };

    // Get unsigned transaction CBOR from Strike Finance API
    const response = await this.strikeAPI.updatePosition(updateRequest);

    // Sign transaction using connected wallet
    if (!walletInfo.signTx) {
      throw new Error('Wallet signing function not available');
    }

    const signedTxCbor = await walletInfo.signTx(response.cbor);

    // Submit to Cardano network
    const txHash = await this.submitTransaction(signedTxCbor);

    console.log(`🔄 Updated position for connected wallet (${txHash})`);
    return txHash;
  }

  // ==================== MANAGED WALLET POSITION EXECUTION ====================

  /**
   * Execute open position for managed wallet (reuse existing logic)
   */
  private async executeOpenPositionManaged(decision: TradingDecision, walletAddress: string): Promise<string> {
    const { position, leverage, collateralAmount, positionSize } = decision.params || {};

    if (!position || !leverage || !collateralAmount || !positionSize) {
      throw new Error('Missing required position parameters');
    }

    const currentPrice = 0.45;

    // Convert collateral amount from lovelace to ADA
    const collateralAmountADA = collateralAmount / 1_000_000;

    // Get transaction CBOR from Strike Finance API
    const response = await this.strikeAPI.openPosition(
      walletAddress,
      collateralAmountADA,
      leverage,
      position,
      decision.params?.stopLoss,
      decision.params?.takeProfit
    );

    // Sign and submit transaction using managed wallet
    const signedTxCbor = await this.walletManager.signTransaction(walletAddress, response.cbor);

    if (!signedTxCbor) {
      throw new Error('Failed to sign transaction with managed wallet');
    }

    const txHash = await this.submitTransaction(signedTxCbor);

    console.log(`📈 Opened ${position} position for managed wallet (${txHash})`);
    return txHash;
  }

  /**
   * Execute close position for managed wallet
   */
  private async executeClosePositionManaged(decision: TradingDecision, walletAddress: string): Promise<string> {
    const positions = await this.strikeAPI.getPositions(walletAddress);

    if (positions.length === 0) {
      throw new Error('No positions found to close');
    }

    const position = positions[0];

    const closeRequest: ClosePositionRequest = {
      request: {
        address: walletAddress,
        asset: position.asset.asset,
        outRef: position.outRef,
        positionSize: position.positionSize,
        positionType: position.position,
        collateralAmount: position.collateral.amount,
        position: position.position
      }
    };

    const response = await this.strikeAPI.closePosition(closeRequest);
    const signedTxCbor = await this.walletManager.signTransaction(walletAddress, response.cbor);

    if (!signedTxCbor) {
      throw new Error('Failed to sign transaction with managed wallet');
    }

    const txHash = await this.submitTransaction(signedTxCbor);

    console.log(`📉 Closed ${position.position} position for managed wallet (${txHash})`);
    return txHash;
  }

  /**
   * Execute update position for managed wallet
   */
  private async executeUpdatePositionManaged(decision: TradingDecision, walletAddress: string): Promise<string> {
    const positions = await this.strikeAPI.getPositions(walletAddress);

    if (positions.length === 0) {
      throw new Error('No positions found to update');
    }

    const position = positions[0];

    const updateRequest: UpdatePositionRequest = {
      request: {
        address: walletAddress,
        asset: position.asset.asset,
        outRef: position.outRef,
        stopLossPrice: decision.params?.stopLossPrice || position.stopLoss,
        takeProfitPrice: decision.params?.takeProfitPrice || position.takeProfit
      }
    };

    const response = await this.strikeAPI.updatePosition(updateRequest);
    const signedTxCbor = await this.walletManager.signTransaction(walletAddress, response.cbor);

    if (!signedTxCbor) {
      throw new Error('Failed to sign transaction with managed wallet');
    }

    const txHash = await this.submitTransaction(signedTxCbor);

    console.log(`🔄 Updated position for managed wallet (${txHash})`);
    return txHash;
  }

  /**
   * Submit signed transaction to Cardano network
   */
  private async submitTransaction(signedTxCbor: string): Promise<string> {
    // This would submit to Cardano network
    // For now, return a mock transaction hash
    const mockTxHash = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In production, this would use Cardano CLI or a service like Blockfrost
    console.log(`📤 Submitting transaction: ${signedTxCbor.substring(0, 20)}...`);

    return mockTxHash;
  }
}
