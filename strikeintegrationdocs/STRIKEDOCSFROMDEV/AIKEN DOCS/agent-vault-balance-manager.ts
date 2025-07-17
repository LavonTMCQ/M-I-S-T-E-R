/**
 * Agent Vault Balance Management Service
 * Handles balance checking, trade sizing, and execution logic
 */

interface VaultBalance {
  totalBalance: number; // in ADA
  availableForTrading: number; // excluding reserved amounts
  reservedForFees: number; // transaction fees
  lastUpdated: string;
}

interface TradeSignal {
  type: 'long' | 'short';
  suggestedAmount: number; // in ADA
  confidence: number;
  strategy: string;
  timestamp: string;
}

interface TradeExecution {
  actualAmount: number; // in ADA
  canExecute: boolean;
  reason: string;
  adjustedFromOriginal: boolean;
}

export class AgentVaultBalanceManager {
  private readonly STRIKE_MINIMUM = 40; // ADA
  private readonly TRANSACTION_FEE_RESERVE = 5; // ADA
  private readonly SAFETY_BUFFER = 10; // ADA

  constructor(
    private vaultAddress: string,
    private agentWalletConfig: any
  ) {}

  /**
   * Check current vault balance from blockchain
   */
  async getVaultBalance(): Promise<VaultBalance> {
    try {
      // Query vault UTxOs from Blockfrost
      const response = await fetch(
        `https://cardano-mainnet.blockfrost.io/api/v0/addresses/${this.vaultAddress}/utxos`,
        {
          headers: {
            'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
          }
        }
      );

      const utxos = await response.json();
      const totalLovelace = utxos.reduce((sum: number, utxo: any) => 
        sum + parseInt(utxo.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0'), 0
      );

      const totalBalance = totalLovelace / 1000000; // Convert to ADA
      const reservedForFees = this.TRANSACTION_FEE_RESERVE;
      const availableForTrading = Math.max(0, totalBalance - reservedForFees - this.SAFETY_BUFFER);

      return {
        totalBalance,
        availableForTrading,
        reservedForFees,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get vault balance:', error);
      throw new Error('Unable to query vault balance');
    }
  }

  /**
   * Determine if and how a trade can be executed
   */
  async evaluateTradeExecution(signal: TradeSignal): Promise<TradeExecution> {
    const balance = await this.getVaultBalance();
    
    // Check if we have minimum balance for any trade
    if (balance.availableForTrading < this.STRIKE_MINIMUM) {
      return {
        actualAmount: 0,
        canExecute: false,
        reason: `Insufficient balance. Need ${this.STRIKE_MINIMUM} ADA minimum, have ${balance.availableForTrading.toFixed(2)} ADA available`,
        adjustedFromOriginal: false
      };
    }

    // Check if suggested amount can be executed as-is
    if (signal.suggestedAmount <= balance.availableForTrading) {
      return {
        actualAmount: signal.suggestedAmount,
        canExecute: true,
        reason: 'Trade can be executed at suggested amount',
        adjustedFromOriginal: false
      };
    }

    // Adjust trade size to available balance
    const adjustedAmount = Math.floor(balance.availableForTrading);
    
    if (adjustedAmount >= this.STRIKE_MINIMUM) {
      return {
        actualAmount: adjustedAmount,
        canExecute: true,
        reason: `Trade size adjusted from ${signal.suggestedAmount} to ${adjustedAmount} ADA due to balance constraints`,
        adjustedFromOriginal: true
      };
    }

    return {
      actualAmount: 0,
      canExecute: false,
      reason: `Cannot execute trade. Available balance ${balance.availableForTrading.toFixed(2)} ADA is below ${this.STRIKE_MINIMUM} ADA minimum`,
      adjustedFromOriginal: false
    };
  }

  /**
   * Execute trade through Agent Vault
   */
  async executeVaultTrade(execution: TradeExecution, signal: TradeSignal): Promise<boolean> {
    if (!execution.canExecute) {
      console.log(`Trade skipped: ${execution.reason}`);
      return false;
    }

    try {
      // Build agent trade transaction
      const redeemer = {
        constructor: 0, // AgentTrade
        fields: [
          { int: (execution.actualAmount * 1000000).toString() } // Convert to lovelace
        ]
      };

      // This would integrate with the existing Strike Finance API
      const tradeResult = await this.executeStrikeTrade({
        amount: execution.actualAmount,
        type: signal.type,
        vaultAddress: this.vaultAddress,
        redeemer
      });

      if (tradeResult.success) {
        console.log(`✅ Agent trade executed: ${execution.actualAmount} ADA ${signal.type} position`);
        if (execution.adjustedFromOriginal) {
          console.log(`⚠️ Trade size was adjusted: ${execution.reason}`);
        }
        return true;
      } else {
        console.error(`❌ Trade execution failed: ${tradeResult.error}`);
        return false;
      }
    } catch (error) {
      console.error('Agent trade execution error:', error);
      return false;
    }
  }

  /**
   * Integration with existing Strike Finance API
   */
  private async executeStrikeTrade(params: any): Promise<any> {
    // This would call the existing Strike Finance API
    // but with Agent Vault transaction signing
    
    // Placeholder for actual implementation
    return {
      success: true,
      txHash: 'placeholder_tx_hash',
      amount: params.amount
    };
  }

  /**
   * Get trading recommendations based on balance
   */
  async getTradingRecommendations(): Promise<{
    canTrade: boolean;
    maxTradeSize: number;
    recommendedSize: number;
    warnings: string[];
  }> {
    const balance = await this.getVaultBalance();
    const warnings: string[] = [];

    if (balance.availableForTrading < this.STRIKE_MINIMUM) {
      warnings.push(`Balance too low for trading. Need ${this.STRIKE_MINIMUM} ADA minimum.`);
      return {
        canTrade: false,
        maxTradeSize: 0,
        recommendedSize: 0,
        warnings
      };
    }

    if (balance.availableForTrading < 100) {
      warnings.push('Low balance - consider adding more ADA for better trading opportunities.');
    }

    const maxTradeSize = Math.floor(balance.availableForTrading);
    const recommendedSize = Math.min(maxTradeSize, Math.floor(balance.availableForTrading * 0.5)); // Use 50% max

    return {
      canTrade: true,
      maxTradeSize,
      recommendedSize,
      warnings
    };
  }
}

/**
 * Integration with existing Mastra agents
 */
export class MastraAgentVaultIntegration {
  constructor(private balanceManager: AgentVaultBalanceManager) {}

  /**
   * Process Fibonacci agent signals through Agent Vault
   */
  async processFibonacciSignal(signal: any): Promise<void> {
    const tradeSignal: TradeSignal = {
      type: signal.side === 'Long' ? 'long' : 'short',
      suggestedAmount: signal.collateralAmount || 50, // Default 50 ADA
      confidence: signal.confidence || 75,
      strategy: 'Fibonacci',
      timestamp: new Date().toISOString()
    };

    const execution = await this.balanceManager.evaluateTradeExecution(tradeSignal);
    
    if (execution.canExecute) {
      await this.balanceManager.executeVaultTrade(execution, tradeSignal);
    } else {
      console.log(`Fibonacci trade skipped: ${execution.reason}`);
    }
  }

  /**
   * Process Multi-Timeframe agent signals through Agent Vault
   */
  async processMultiTimeframeSignal(signal: any): Promise<void> {
    const tradeSignal: TradeSignal = {
      type: signal.side === 'Long' ? 'long' : 'short',
      suggestedAmount: signal.collateralAmount || 75, // Default 75 ADA
      confidence: signal.confidence || 80,
      strategy: 'Multi-Timeframe',
      timestamp: new Date().toISOString()
    };

    const execution = await this.balanceManager.evaluateTradeExecution(tradeSignal);
    
    if (execution.canExecute) {
      await this.balanceManager.executeVaultTrade(execution, tradeSignal);
    } else {
      console.log(`Multi-Timeframe trade skipped: ${execution.reason}`);
    }
  }
}

// Usage example
export const initializeAgentVaultTrading = async (vaultAddress: string) => {
  const balanceManager = new AgentVaultBalanceManager(vaultAddress, {
    agentVkh: "34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d"
  });

  const mastraIntegration = new MastraAgentVaultIntegration(balanceManager);

  // Get current trading status
  const recommendations = await balanceManager.getTradingRecommendations();
  console.log('Trading recommendations:', recommendations);

  return {
    balanceManager,
    mastraIntegration,
    recommendations
  };
};
