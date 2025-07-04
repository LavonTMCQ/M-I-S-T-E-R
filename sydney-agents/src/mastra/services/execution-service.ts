import { EventEmitter } from 'events';
import { WalletManager } from './wallet-manager';
import { SignalService, TradingDecision } from './signal-service';
import { StrikeFinanceAPI, OpenPositionRequest, ClosePositionRequest, UpdatePositionRequest, Asset } from './strike-finance-api';

// Execution result interfaces
export interface ExecutionResult {
  walletAddress: string;
  success: boolean;
  txHash?: string;
  error?: string;
  timestamp: Date;
}

export interface ExecutionSummary {
  totalWallets: number;
  successfulExecutions: number;
  failedExecutions: number;
  results: ExecutionResult[];
  decision: TradingDecision;
  timestamp: Date;
}

/**
 * ExecutionService - Handles fan-out execution of trading signals across multiple managed wallets
 * Listens to SignalService events and executes trades on all active wallets
 */
export class ExecutionService extends EventEmitter {
  private static instance: ExecutionService;
  private walletManager: WalletManager;
  private signalService: SignalService;
  private strikeAPI: StrikeFinanceAPI;
  private isRunning = false;

  // Default asset for ADA perpetuals
  private readonly defaultAsset: Asset = {
    policyId: "ada",
    assetName: "ADA"
  };

  private constructor() {
    super();
    this.walletManager = WalletManager.getInstance();
    this.signalService = SignalService.getInstance();
    this.strikeAPI = new StrikeFinanceAPI();

    console.log('⚡ ExecutionService initialized');
  }

  static getInstance(): ExecutionService {
    if (!ExecutionService.instance) {
      ExecutionService.instance = new ExecutionService();
    }
    return ExecutionService.instance;
  }

  /**
   * Starts the execution service and begins listening for trading signals
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ ExecutionService is already running');
      return;
    }

    console.log('🚀 Starting ExecutionService...');
    this.isRunning = true;

    // Listen for trading signals
    this.signalService.on('tradingSignal', this.handleTradingSignal.bind(this));
    this.signalService.on('error', this.handleSignalError.bind(this));

    console.log('✅ ExecutionService started and listening for signals');
  }

  /**
   * Stops the execution service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ ExecutionService is not running');
      return;
    }

    console.log('🛑 Stopping ExecutionService...');
    this.isRunning = false;

    // Remove event listeners
    this.signalService.removeAllListeners('tradingSignal');
    this.signalService.removeAllListeners('error');

    console.log('✅ ExecutionService stopped');
  }

  /**
   * Handles incoming trading signals and executes across all managed wallets
   */
  private async handleTradingSignal(signalData: any): Promise<void> {
    const { decision, marketInfo, timestamp } = signalData;

    console.log(`🎯 Received trading signal: ${decision.action} at ${timestamp}`);
    console.log(`📊 Signal details: ${decision.reason}`);

    try {
      // Get all active managed wallets
      const activeWallets = this.walletManager.getActiveWallets();

      if (activeWallets.length === 0) {
        console.log('⚠️ No active managed wallets found');
        return;
      }

      console.log(`🏦 Executing signal across ${activeWallets.length} managed wallets...`);

      // Execute the trading decision across all wallets (fan-out)
      const executionResults = await this.executeFanOut(decision, activeWallets);

      // Create execution summary
      const summary: ExecutionSummary = {
        totalWallets: activeWallets.length,
        successfulExecutions: executionResults.filter(r => r.success).length,
        failedExecutions: executionResults.filter(r => !r.success).length,
        results: executionResults,
        decision,
        timestamp: new Date()
      };

      // Log summary
      console.log(`📈 Execution Summary:`);
      console.log(`   Total Wallets: ${summary.totalWallets}`);
      console.log(`   Successful: ${summary.successfulExecutions}`);
      console.log(`   Failed: ${summary.failedExecutions}`);

      // Emit execution completed event
      this.emit('executionCompleted', summary);

      // If there were failures, emit error event
      if (summary.failedExecutions > 0) {
        this.emit('executionErrors', {
          failedResults: executionResults.filter(r => !r.success),
          summary
        });
      }

    } catch (error) {
      console.error('❌ Failed to handle trading signal:', error);
      this.emit('error', {
        error: error instanceof Error ? error.message : String(error),
        decision,
        timestamp: new Date()
      });
    }
  }

  /**
   * Executes trading decision across multiple wallets (fan-out pattern)
   */
  private async executeFanOut(decision: TradingDecision, walletAddresses: string[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    // Execute in parallel for better performance
    const promises = walletAddresses.map(async (address) => {
      return this.executeForWallet(decision, address);
    });

    const executionResults = await Promise.allSettled(promises);

    // Process results
    executionResults.forEach((result, index) => {
      const walletAddress = walletAddresses[index];

      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          walletAddress,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          timestamp: new Date()
        });
      }
    });

    return results;
  }

  /**
   * Executes trading decision for a single wallet
   */
  private async executeForWallet(decision: TradingDecision, walletAddress: string): Promise<ExecutionResult> {
    if (!walletAddress) {
      throw new Error('Wallet address is required for trade execution');
    }
    console.log(`🔄 Executing ${decision.action} for wallet: ${walletAddress.substring(0, 20)}...`);

    try {
      let txHash: string | undefined;

      switch (decision.action) {
        case "Open":
          txHash = await this.executeOpenPosition(decision, walletAddress);
          break;

        case "Close":
          txHash = await this.executeClosePosition(decision, walletAddress);
          break;

        case "Update":
          txHash = await this.executeUpdatePosition(decision, walletAddress);
          break;

        default:
          throw new Error(`Unsupported action: ${decision.action}`);
      }

      console.log(`✅ Successfully executed ${decision.action} for ${walletAddress.substring(0, 20)}...`);

      return {
        walletAddress,
        success: true,
        txHash,
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`❌ Failed to execute ${decision.action} for ${walletAddress.substring(0, 20)}...`, error);

      return {
        walletAddress,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Executes opening a new position
   */
  private async executeOpenPosition(decision: TradingDecision, walletAddress: string): Promise<string> {
    if (!decision.params) {
      throw new Error('Missing parameters for open position');
    }

    const { position, leverage, collateralAmount, positionSize } = decision.params;

    if (!position || !leverage || !collateralAmount || !positionSize) {
      throw new Error('Missing required parameters for open position');
    }

    // Calculate collateral amount in ADA (not lovelace)
    const collateralAmountADA = collateralAmount / 1_000_000; // Convert from lovelace to ADA

    // Get transaction CBOR from Strike Finance API with corrected format
    const response = await this.strikeAPI.openPosition(
      walletAddress,
      collateralAmountADA,
      leverage,
      position
    );

    // Sign and submit transaction
    const signedTxCbor = await this.walletManager.signTransaction(walletAddress, response.cbor);

    if (!signedTxCbor) {
      throw new Error('Failed to sign transaction');
    }

    // Submit to Cardano network (mock for now)
    const txHash = await this.submitTransaction(signedTxCbor);

    console.log(`📈 Opened ${position} position for ${walletAddress.substring(0, 20)}... (${txHash})`);
    return txHash;
  }

  /**
   * Executes closing an existing position
   */
  private async executeClosePosition(decision: TradingDecision, walletAddress: string): Promise<string> {
    // Get existing positions for this wallet
    const positions = await this.strikeAPI.getPositions(walletAddress);

    if (positions.length === 0) {
      throw new Error('No positions to close');
    }

    // Close the first position (in production, this would be more sophisticated)
    const position = positions[0];

    const closeRequest: ClosePositionRequest = {
      request: {
        address: walletAddress,
        asset: position.asset.asset,
        outRef: position.outRef,
        positionSize: position.positionSize,
        positionType: "Perpetual",
        collateralAmount: position.collateral.amount,
        position: position.position
      }
    };

    // Get transaction CBOR from Strike Finance API
    const response = await this.strikeAPI.closePosition(closeRequest);

    // Sign and submit transaction
    const signedTxCbor = await this.walletManager.signTransaction(walletAddress, response.cbor);

    if (!signedTxCbor) {
      throw new Error('Failed to sign transaction');
    }

    // Submit to Cardano network
    const txHash = await this.submitTransaction(signedTxCbor);

    console.log(`📉 Closed ${position.position} position for ${walletAddress.substring(0, 20)}... (${txHash})`);
    return txHash;
  }

  /**
   * Executes updating an existing position (stop loss, take profit)
   */
  private async executeUpdatePosition(decision: TradingDecision, walletAddress: string): Promise<string> {
    if (!decision.params?.stopLossPrice && !decision.params?.takeProfitPrice) {
      throw new Error('Missing stop loss or take profit parameters');
    }

    // Get existing positions for this wallet
    const positions = await this.strikeAPI.getPositions(walletAddress);

    if (positions.length === 0) {
      throw new Error('No positions to update');
    }

    const position = positions[0];

    const updateRequest: UpdatePositionRequest = {
      request: {
        address: walletAddress,
        asset: position.asset.asset,
        outRef: position.outRef,
        stopLossPrice: decision.params.stopLossPrice || position.stopLoss,
        takeProfitPrice: decision.params.takeProfitPrice || position.takeProfit
      }
    };

    // Get transaction CBOR from Strike Finance API
    const response = await this.strikeAPI.updatePosition(updateRequest);

    // Sign and submit transaction
    const signedTxCbor = await this.walletManager.signTransaction(walletAddress, response.cbor);

    if (!signedTxCbor) {
      throw new Error('Failed to sign transaction');
    }

    // Submit to Cardano network
    const txHash = await this.submitTransaction(signedTxCbor);

    console.log(`🔄 Updated position for ${walletAddress.substring(0, 20)}... (${txHash})`);
    return txHash;
  }

  /**
   * Submits signed transaction to Cardano network
   * Mock implementation - in production would use Blockfrost or similar
   */
  private async submitTransaction(signedTxCbor: string): Promise<string> {
    // Mock transaction submission
    console.log('📡 Submitting transaction to Cardano network...');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock transaction hash
    const txHash = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    console.log(`✅ Transaction submitted successfully: ${txHash}`);
    return txHash;
  }

  /**
   * Handles signal service errors
   */
  private handleSignalError(errorData: any): void {
    console.error('❌ Signal service error:', errorData);
    this.emit('signalError', errorData);
  }

  /**
   * Gets execution service status
   */
  getStatus(): { isRunning: boolean; activeWallets: number; stats: any } {
    const walletStats = this.walletManager.getWalletStats();

    return {
      isRunning: this.isRunning,
      activeWallets: walletStats.active,
      stats: walletStats
    };
  }

  /**
   * Forces execution of a trading decision (for testing/manual execution)
   */
  async forceExecution(decision: TradingDecision): Promise<ExecutionSummary> {
    console.log('🔧 Forcing manual execution...');

    const activeWallets = this.walletManager.getActiveWallets();

    if (activeWallets.length === 0) {
      throw new Error('No active managed wallets found');
    }

    const executionResults = await this.executeFanOut(decision, activeWallets);

    const summary: ExecutionSummary = {
      totalWallets: activeWallets.length,
      successfulExecutions: executionResults.filter(r => r.success).length,
      failedExecutions: executionResults.filter(r => !r.success).length,
      results: executionResults,
      decision,
      timestamp: new Date()
    };

    console.log(`📊 Manual execution completed: ${summary.successfulExecutions}/${summary.totalWallets} successful`);

    return summary;
  }

  /**
   * Gets execution history (mock implementation)
   */
  getExecutionHistory(): ExecutionSummary[] {
    // In production, this would retrieve from database
    return [];
  }
}