import { EventEmitter } from 'events';
import { TradingDecision } from './signal-service';
import { StrikeFinanceAPI, OpenPositionRequest, ClosePositionRequest, UpdatePositionRequest, Asset } from './strike-finance-api';

// Direct wallet execution interfaces
export interface DirectWalletExecutionResult {
  walletAddress: string;
  success: boolean;
  txHash?: string;
  error?: string;
  timestamp: Date;
  executionMode: 'manual' | 'agent' | 'algorithmic';
}

export interface DirectWalletExecutionSummary {
  walletAddress: string;
  success: boolean;
  result: DirectWalletExecutionResult;
  decision: TradingDecision;
  timestamp: Date;
}

export interface ConnectedWalletInfo {
  address: string;
  stakeAddress?: string;
  walletType: string;
  balance: number;
  handle?: string;
  // Wallet API interface for signing transactions
  signTx?: (txCbor: string) => Promise<string>;
}

export interface ManualTradeParams {
  walletAddress: string;
  action: 'Open' | 'Close' | 'Update';
  side?: 'Long' | 'Short';
  pair: string;
  leverage?: number;
  collateralAmount?: number;
  positionSize?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionId?: string; // For closing/updating positions
}

/**
 * DirectWalletExecutionService - Handles trading execution for connected wallets
 * Bridges the gap between the existing ExecutionService (designed for managed wallets)
 * and the direct wallet trading mode where users trade from their connected wallet
 */
export class DirectWalletExecutionService extends EventEmitter {
  private static instance: DirectWalletExecutionService;
  private strikeAPI: StrikeFinanceAPI;
  private connectedWallets: Map<string, ConnectedWalletInfo> = new Map();

  // Default asset for ADA perpetuals
  private readonly defaultAsset: Asset = {
    policyId: "",
    assetName: ""
  };

  private constructor() {
    super();
    this.strikeAPI = new StrikeFinanceAPI();
    console.log('🔗 DirectWalletExecutionService initialized');
  }

  static getInstance(): DirectWalletExecutionService {
    if (!DirectWalletExecutionService.instance) {
      DirectWalletExecutionService.instance = new DirectWalletExecutionService();
    }
    return DirectWalletExecutionService.instance;
  }

  /**
   * Register a connected wallet for trading
   */
  registerConnectedWallet(walletInfo: ConnectedWalletInfo): void {
    if (!walletInfo.address) {
      throw new Error('Wallet address is required for registration');
    }
    this.connectedWallets.set(walletInfo.address, walletInfo);
    console.log(`🔗 Registered connected wallet: ${walletInfo.address.substring(0, 20)}...`);
  }

  /**
   * Unregister a connected wallet
   */
  unregisterConnectedWallet(walletAddress: string): void {
    if (!walletAddress) {
      throw new Error('Wallet address is required for unregistration');
    }
    this.connectedWallets.delete(walletAddress);
    console.log(`🔗 Unregistered connected wallet: ${walletAddress.substring(0, 20)}...`);
  }

  /**
   * Execute manual trade from frontend
   */
  async executeManualTrade(params: ManualTradeParams): Promise<DirectWalletExecutionResult> {
    console.log('👤 Executing manual trade...');

    const walletInfo = this.connectedWallets.get(params.walletAddress);
    if (!walletInfo) {
      throw new Error('Wallet not registered for trading');
    }

    // Create trading decision from manual parameters
    const decision: TradingDecision = {
      action: params.action,
      params: {
        position: params.side,
        leverage: params.leverage,
        collateralAmount: params.collateralAmount,
        positionSize: params.positionSize,
        stopLossPrice: params.stopLoss,
        takeProfitPrice: params.takeProfit
      },
      reason: `Manual trade: ${params.action} ${params.side || ''} ${params.pair}`,
      timestamp: new Date()
    };

    return await this.executeSingleWalletTrade(decision, walletInfo, 'manual');
  }

  /**
   * Execute agent-based trade (called by Mastra Strike Agent)
   */
  async executeAgentTrade(decision: TradingDecision, walletAddress: string): Promise<DirectWalletExecutionResult> {
    console.log('🤖 Executing agent-based trade...');

    const walletInfo = this.connectedWallets.get(walletAddress);
    if (!walletInfo) {
      throw new Error('Wallet not registered for trading');
    }

    return await this.executeSingleWalletTrade(decision, walletInfo, 'agent');
  }

  /**
   * Execute algorithmic trade (called by SignalService)
   */
  async executeAlgorithmicTrade(decision: TradingDecision, walletAddress: string): Promise<DirectWalletExecutionResult> {
    console.log('⚡ Executing algorithmic trade...');

    const walletInfo = this.connectedWallets.get(walletAddress);
    if (!walletInfo) {
      throw new Error('Wallet not registered for trading');
    }

    return await this.executeSingleWalletTrade(decision, walletInfo, 'algorithmic');
  }

  /**
   * Core execution logic for a single connected wallet
   */
  private async executeSingleWalletTrade(
    decision: TradingDecision,
    walletInfo: ConnectedWalletInfo,
    mode: 'manual' | 'agent' | 'algorithmic'
  ): Promise<DirectWalletExecutionResult> {
    const startTime = Date.now();

    try {
      let txHash: string | undefined;

      switch (decision.action) {
        case "Open":
          txHash = await this.executeOpenPosition(decision, walletInfo);
          break;

        case "Close":
          txHash = await this.executeClosePosition(decision, walletInfo);
          break;

        case "Update":
          txHash = await this.executeUpdatePosition(decision, walletInfo);
          break;

        default:
          throw new Error(`Unsupported action: ${decision.action}`);
      }

      const result: DirectWalletExecutionResult = {
        walletAddress: walletInfo.address,
        success: true,
        txHash,
        timestamp: new Date(),
        executionMode: mode
      };

      console.log(`✅ ${mode} trade executed successfully: ${decision.action} (${Date.now() - startTime}ms)`);

      // Emit execution event
      this.emit('tradeExecuted', {
        result,
        decision,
        mode,
        timestamp: new Date()
      });

      return result;

    } catch (error) {
      const result: DirectWalletExecutionResult = {
        walletAddress: walletInfo.address,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        executionMode: mode
      };

      console.error(`❌ ${mode} trade execution failed:`, error);

      // Emit error event
      this.emit('tradeError', {
        result,
        decision,
        mode,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });

      return result;
    }
  }

  /**
   * Get all registered connected wallets
   */
  getConnectedWallets(): ConnectedWalletInfo[] {
    return Array.from(this.connectedWallets.values());
  }

  /**
   * Check if a wallet is registered
   */
  isWalletRegistered(walletAddress: string): boolean {
    return this.connectedWallets.has(walletAddress);
  }
}
