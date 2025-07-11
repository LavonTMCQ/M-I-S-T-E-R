import { Agent } from '@mastra/core/agent';
import { BackendTransactionSigner } from '../../../mister-frontend/src/utils/backendTransactionSigning';

/**
 * Strategy Execution Service
 * 
 * Connects Mastra strategy agents to the automated Strike Finance signing system.
 * This service enables algorithmic trading strategies to execute trades automatically
 * using managed wallets without manual intervention.
 */

export interface StrategySignal {
  action: 'LONG' | 'SHORT' | 'CLOSE' | 'HOLD';
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  confidence: number;
  reason: string;
  strategyName: string;
  timestamp: string;
}

export interface ManagedWalletInfo {
  walletId: string;
  address: string;
  encryptedSeed: string;
  userId: string;
  balance: number;
  isActive: boolean;
}

export interface TradeExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  signal: StrategySignal;
  executionTime: string;
  gasUsed?: number;
  actualPrice?: number;
}

export interface StrategyConfig {
  strategyName: string;
  agent: Agent;
  isActive: boolean;
  maxPositionSize: number;
  riskPercentage: number;
  cooldownMinutes: number;
  lastExecutionTime?: string;
}

export class StrategyExecutionService {
  private strategies: Map<string, StrategyConfig> = new Map();
  private activePositions: Map<string, any> = new Map();
  private executionHistory: TradeExecutionResult[] = [];
  private isRunning: boolean = false;

  constructor(
    private strikeFinanceApiUrl: string = 'https://api.strike.finance',
    private blockfrostProjectId: string = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
  ) {
    console.log('🤖 Strategy Execution Service initialized');
  }

  /**
   * Register a trading strategy agent
   */
  registerStrategy(config: StrategyConfig): void {
    this.strategies.set(config.strategyName, config);
    console.log(`✅ Strategy registered: ${config.strategyName}`);
  }

  /**
   * Start automated strategy execution for a user's managed wallet
   */
  async startStrategyTrading(
    strategyName: string,
    managedWallet: ManagedWalletInfo,
    intervalMinutes: number = 15
  ): Promise<void> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyName}`);
    }

    if (!strategy.isActive) {
      throw new Error(`Strategy is not active: ${strategyName}`);
    }

    console.log(`🚀 Starting automated trading for strategy: ${strategyName}`);
    console.log(`💰 Wallet: ${managedWallet.address.substring(0, 12)}...`);
    console.log(`⏰ Interval: ${intervalMinutes} minutes`);

    this.isRunning = true;

    // Start the trading loop
    const tradingLoop = async () => {
      if (!this.isRunning) return;

      try {
        await this.executeStrategyIteration(strategyName, managedWallet);
      } catch (error) {
        console.error(`❌ Strategy execution error for ${strategyName}:`, error);
      }

      // Schedule next iteration
      if (this.isRunning) {
        setTimeout(tradingLoop, intervalMinutes * 60 * 1000);
      }
    };

    // Start the first iteration
    await tradingLoop();
  }

  /**
   * Stop automated strategy execution
   */
  stopStrategyTrading(): void {
    this.isRunning = false;
    console.log('⏹️ Strategy trading stopped');
  }

  /**
   * Execute a single strategy iteration
   */
  private async executeStrategyIteration(
    strategyName: string,
    managedWallet: ManagedWalletInfo
  ): Promise<void> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) return;

    console.log(`🔍 Executing ${strategyName} analysis...`);

    try {
      // Check cooldown period
      if (this.isInCooldown(strategy)) {
        console.log(`⏳ Strategy ${strategyName} in cooldown period`);
        return;
      }

      // Get signal from strategy agent
      const signal = await this.getStrategySignal(strategy, managedWallet);
      
      if (signal.action === 'HOLD') {
        console.log(`📊 ${strategyName}: HOLD signal - no action taken`);
        return;
      }

      // Execute the trade
      const result = await this.executeTrade(signal, managedWallet);
      
      // Update execution history
      this.executionHistory.push(result);
      strategy.lastExecutionTime = new Date().toISOString();

      // Log result
      if (result.success) {
        console.log(`✅ ${strategyName}: Trade executed successfully`);
        console.log(`📋 TX Hash: ${result.txHash}`);
      } else {
        console.log(`❌ ${strategyName}: Trade execution failed - ${result.error}`);
      }

    } catch (error) {
      console.error(`❌ Strategy iteration failed for ${strategyName}:`, error);
    }
  }

  /**
   * Get trading signal from strategy agent
   */
  private async getStrategySignal(
    strategy: StrategyConfig,
    managedWallet: ManagedWalletInfo
  ): Promise<StrategySignal> {
    try {
      // Call the strategy agent to get analysis
      const response = await strategy.agent.generate(
        `Analyze current ADA/USD market conditions and provide a trading signal. 
         Current wallet balance: ${managedWallet.balance} ADA.
         Max position size: ${strategy.maxPositionSize} ADA.
         Risk percentage: ${strategy.riskPercentage}%.`,
        {
          memory: {
            thread: `strategy-${strategy.strategyName}`,
            resource: managedWallet.userId
          }
        }
      );

      // Parse the agent response to extract trading signal
      // This assumes the agent returns structured data
      const signalData = this.parseAgentResponse(response.text, strategy.strategyName);
      
      return {
        ...signalData,
        strategyName: strategy.strategyName,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Failed to get signal from ${strategy.strategyName}:`, error);
      
      // Return safe HOLD signal on error
      return {
        action: 'HOLD',
        entryPrice: 0.6842, // Default ADA price
        leverage: 1,
        confidence: 0,
        reason: `Strategy error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        strategyName: strategy.strategyName,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute a trade using automated Strike Finance signing
   */
  private async executeTrade(
    signal: StrategySignal,
    managedWallet: ManagedWalletInfo
  ): Promise<TradeExecutionResult> {
    const startTime = new Date().toISOString();

    try {
      console.log(`⚡ Executing ${signal.action} trade for ${signal.strategyName}`);
      console.log(`💰 Entry: ${signal.entryPrice}, Leverage: ${signal.leverage}x`);

      // Calculate position size based on risk management
      const positionSize = this.calculatePositionSize(
        managedWallet.balance,
        signal.entryPrice,
        signal.stopLoss || signal.entryPrice * 0.95, // 5% default stop
        2 // 2% risk per trade
      );

      // Prepare trade parameters for Strike Finance
      const tradeParams = {
        walletAddress: managedWallet.address,
        action: signal.action.toLowerCase() as 'open' | 'close',
        side: signal.action === 'LONG' ? 'long' : 'short',
        pair: 'ADA/USD',
        size: Math.round(positionSize), // Ensure whole numbers
        leverage: signal.leverage,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit
      };

      // Prepare signing configuration
      const signingConfig = {
        seedPhrase: this.decryptSeedPhrase(managedWallet.encryptedSeed),
        networkId: 1 // Mainnet
      };

      // Execute automated trade using backend signing
      const result = await BackendTransactionSigner.executeAutomatedTrade(
        this.strikeFinanceApiUrl,
        tradeParams,
        signingConfig,
        this.blockfrostProjectId
      );

      if (result.success) {
        // Update active positions
        if (signal.action === 'LONG' || signal.action === 'SHORT') {
          this.activePositions.set(managedWallet.walletId, {
            signal,
            positionSize,
            openTime: startTime,
            txHash: result.txHash
          });
        } else if (signal.action === 'CLOSE') {
          this.activePositions.delete(managedWallet.walletId);
        }

        return {
          success: true,
          txHash: result.txHash,
          signal,
          executionTime: startTime,
          actualPrice: signal.entryPrice // In production, get actual execution price
        };
      } else {
        return {
          success: false,
          error: result.error,
          signal,
          executionTime: startTime
        };
      }

    } catch (error) {
      console.error('❌ Trade execution failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        signal,
        executionTime: startTime
      };
    }
  }

  /**
   * Parse agent response to extract trading signal
   */
  private parseAgentResponse(response: string, strategyName: string): Partial<StrategySignal> {
    try {
      // Try to parse JSON response first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.signal) {
          return parsed.signal;
        }
      }

      // Fallback to text parsing
      const actionMatch = response.match(/(LONG|SHORT|HOLD|CLOSE)/i);
      const priceMatch = response.match(/price[:\s]*(\d+\.?\d*)/i);
      const confidenceMatch = response.match(/confidence[:\s]*(\d+)/i);

      return {
        action: (actionMatch?.[1]?.toUpperCase() as any) || 'HOLD',
        entryPrice: parseFloat(priceMatch?.[1] || '0.6842'),
        leverage: strategyName.includes('fibonacci') ? 3 : 2,
        confidence: parseInt(confidenceMatch?.[1] || '0'),
        reason: `${strategyName} analysis`
      };

    } catch (error) {
      console.error('❌ Failed to parse agent response:', error);
      return {
        action: 'HOLD',
        entryPrice: 0.6842,
        leverage: 1,
        confidence: 0,
        reason: 'Parse error'
      };
    }
  }

  /**
   * Calculate position size based on risk management
   */
  private calculatePositionSize(
    balance: number,
    entryPrice: number,
    stopLoss: number,
    riskPercentage: number
  ): number {
    const riskAmount = balance * (riskPercentage / 100);
    const priceRisk = Math.abs(entryPrice - stopLoss);
    const positionSize = riskAmount / priceRisk;
    
    // Ensure minimum 40 ADA for Strike Finance
    return Math.max(40, Math.round(positionSize));
  }

  /**
   * Check if strategy is in cooldown period
   */
  private isInCooldown(strategy: StrategyConfig): boolean {
    if (!strategy.lastExecutionTime) return false;
    
    const lastExecution = new Date(strategy.lastExecutionTime);
    const cooldownEnd = new Date(lastExecution.getTime() + strategy.cooldownMinutes * 60 * 1000);
    
    return new Date() < cooldownEnd;
  }

  /**
   * Decrypt seed phrase (placeholder - implement proper decryption)
   */
  private decryptSeedPhrase(encryptedSeed: string): string {
    // TODO: Implement proper decryption using the same method as managed wallet system
    // For now, return placeholder
    return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): TradeExecutionResult[] {
    return [...this.executionHistory];
  }

  /**
   * Get active positions
   */
  getActivePositions(): Map<string, any> {
    return new Map(this.activePositions);
  }

  /**
   * Get strategy performance metrics
   */
  getStrategyPerformance(strategyName: string): any {
    const strategyTrades = this.executionHistory.filter(
      trade => trade.signal.strategyName === strategyName
    );

    const successfulTrades = strategyTrades.filter(trade => trade.success);
    const winningTrades = successfulTrades.filter(trade => 
      trade.signal.action === 'LONG' || trade.signal.action === 'SHORT'
    );

    return {
      totalTrades: strategyTrades.length,
      successfulTrades: successfulTrades.length,
      winRate: strategyTrades.length > 0 ? (winningTrades.length / strategyTrades.length) * 100 : 0,
      avgConfidence: strategyTrades.reduce((sum, trade) => sum + trade.signal.confidence, 0) / strategyTrades.length || 0,
      lastExecution: strategyTrades[strategyTrades.length - 1]?.executionTime
    };
  }
}
