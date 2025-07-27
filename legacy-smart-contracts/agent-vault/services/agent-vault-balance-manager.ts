/**
 * Agent Vault Balance Management Service
 * Handles balance checking, trade sizing, and execution logic for Agent Vault system
 * 
 * This service bridges the gap between Mastra agents and the Agent Vault smart contract,
 * ensuring proper balance management and 40 ADA minimum requirements.
 */

interface VaultBalance {
  totalBalance: number; // in ADA
  availableForTrading: number; // excluding reserved amounts
  reservedForFees: number; // transaction fees
  lastUpdated: string;
  vaultAddress: string;
}

interface TradeSignal {
  type: 'long' | 'short';
  suggestedAmount: number; // in ADA
  confidence: number;
  strategy: string;
  timestamp: string;
  reason?: string;
}

interface TradeExecution {
  actualAmount: number; // in ADA
  canExecute: boolean;
  reason: string;
  adjustedFromOriginal: boolean;
  vaultAddress: string;
}

interface AgentVaultConfig {
  contractAddress: string;
  agentVkh: string;
  strikeContract: string;
  blockfrostProjectId: string;
  blockfrostTestnetProjectId?: string; // Optional testnet API key
}

export class AgentVaultBalanceManager {
  private readonly STRIKE_MINIMUM = 40; // ADA
  private readonly TRANSACTION_FEE_RESERVE = 5; // ADA
  private readonly SAFETY_BUFFER = 10; // ADA
  private readonly config: AgentVaultConfig;

  constructor(config: AgentVaultConfig) {
    this.config = config;
  }

  /**
   * Get Blockfrost API configuration based on address network
   */
  private getBlockfrostConfig(address: string) {
    const isTestnet = address.startsWith('addr_test') || address.startsWith('stake_test');
    
    if (isTestnet) {
      const apiKey = this.config.blockfrostTestnetProjectId || 'preprodfHBBQsTsk1g3Lna67Vqb8HqZ0NbcPo1f';
      return {
        url: 'https://cardano-preprod.blockfrost.io/api/v0',
        apiKey,
        network: 'preprod'
      };
    } else {
      return {
        url: 'https://cardano-mainnet.blockfrost.io/api/v0',
        apiKey: this.config.blockfrostProjectId,
        network: 'mainnet'
      };
    }
  }

  /**
   * Check current vault balance from blockchain
   */
  async getVaultBalance(vaultAddress: string): Promise<VaultBalance> {
    try {
      console.log(`🔍 Querying vault balance for: ${vaultAddress}`);
      
      // Get network-appropriate Blockfrost configuration
      const blockfrostConfig = this.getBlockfrostConfig(vaultAddress);
      console.log(`🌐 Using ${blockfrostConfig.network} network for vault balance query`);
      
      // Query vault UTxOs from Blockfrost
      const response = await fetch(
        `${blockfrostConfig.url}/addresses/${vaultAddress}/utxos`,
        {
          headers: {
            'project_id': blockfrostConfig.apiKey
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Blockfrost API error: ${response.status}`);
      }

      const utxos = await response.json();
      
      if (!Array.isArray(utxos)) {
        console.log('⚠️ No UTxOs found for vault address');
        return {
          totalBalance: 0,
          availableForTrading: 0,
          reservedForFees: 0,
          lastUpdated: new Date().toISOString(),
          vaultAddress
        };
      }

      const totalLovelace = utxos.reduce((sum: number, utxo: any) => {
        const lovelaceAmount = utxo.amount.find((a: any) => a.unit === 'lovelace');
        return sum + parseInt(lovelaceAmount?.quantity || '0');
      }, 0);

      const totalBalance = totalLovelace / 1000000; // Convert to ADA
      const reservedForFees = this.TRANSACTION_FEE_RESERVE;
      const availableForTrading = Math.max(0, totalBalance - reservedForFees - this.SAFETY_BUFFER);

      console.log(`💰 Vault balance: ${totalBalance.toFixed(2)} ADA, Available: ${availableForTrading.toFixed(2)} ADA`);

      return {
        totalBalance,
        availableForTrading,
        reservedForFees,
        lastUpdated: new Date().toISOString(),
        vaultAddress
      };
    } catch (error) {
      console.error('❌ Failed to get vault balance:', error);
      throw new Error(`Unable to query vault balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Determine if and how a trade can be executed
   */
  async evaluateTradeExecution(vaultAddress: string, signal: TradeSignal): Promise<TradeExecution> {
    const balance = await this.getVaultBalance(vaultAddress);
    
    // Check if we have minimum balance for any trade
    if (balance.availableForTrading < this.STRIKE_MINIMUM) {
      return {
        actualAmount: 0,
        canExecute: false,
        reason: `Insufficient balance. Need ${this.STRIKE_MINIMUM} ADA minimum, have ${balance.availableForTrading.toFixed(2)} ADA available`,
        adjustedFromOriginal: false,
        vaultAddress
      };
    }

    // Check if suggested amount can be executed as-is
    if (signal.suggestedAmount <= balance.availableForTrading) {
      return {
        actualAmount: signal.suggestedAmount,
        canExecute: true,
        reason: 'Trade can be executed at suggested amount',
        adjustedFromOriginal: false,
        vaultAddress
      };
    }

    // Adjust trade size to available balance
    const adjustedAmount = Math.floor(balance.availableForTrading);
    
    if (adjustedAmount >= this.STRIKE_MINIMUM) {
      return {
        actualAmount: adjustedAmount,
        canExecute: true,
        reason: `Trade size adjusted from ${signal.suggestedAmount} to ${adjustedAmount} ADA due to balance constraints`,
        adjustedFromOriginal: true,
        vaultAddress
      };
    }

    return {
      actualAmount: 0,
      canExecute: false,
      reason: `Cannot execute trade. Available balance ${balance.availableForTrading.toFixed(2)} ADA is below ${this.STRIKE_MINIMUM} ADA minimum`,
      adjustedFromOriginal: false,
      vaultAddress
    };
  }

  /**
   * Get trading recommendations based on balance
   */
  async getTradingRecommendations(vaultAddress: string): Promise<{
    canTrade: boolean;
    maxTradeSize: number;
    recommendedSize: number;
    warnings: string[];
    balance: VaultBalance;
  }> {
    const balance = await this.getVaultBalance(vaultAddress);
    const warnings: string[] = [];

    if (balance.availableForTrading < this.STRIKE_MINIMUM) {
      warnings.push(`Balance too low for trading. Need ${this.STRIKE_MINIMUM} ADA minimum.`);
      warnings.push(`Current balance: ${balance.totalBalance.toFixed(2)} ADA`);
      warnings.push(`Available for trading: ${balance.availableForTrading.toFixed(2)} ADA`);
      
      return {
        canTrade: false,
        maxTradeSize: 0,
        recommendedSize: 0,
        warnings,
        balance
      };
    }

    if (balance.availableForTrading < 100) {
      warnings.push('Low balance - consider adding more ADA for better trading opportunities.');
    }

    if (balance.totalBalance < 200) {
      warnings.push('Consider funding vault with at least 200 ADA for optimal trading performance.');
    }

    const maxTradeSize = Math.floor(balance.availableForTrading);
    const recommendedSize = Math.min(maxTradeSize, Math.floor(balance.availableForTrading * 0.5)); // Use 50% max

    return {
      canTrade: true,
      maxTradeSize,
      recommendedSize,
      warnings,
      balance
    };
  }

  /**
   * Log trading activity for monitoring
   */
  logTradingActivity(vaultAddress: string, signal: TradeSignal, execution: TradeExecution): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      vaultAddress,
      strategy: signal.strategy,
      signalType: signal.type,
      suggestedAmount: signal.suggestedAmount,
      actualAmount: execution.actualAmount,
      executed: execution.canExecute,
      reason: execution.reason,
      adjusted: execution.adjustedFromOriginal
    };

    console.log('📊 Trading Activity Log:', JSON.stringify(logEntry, null, 2));

    // In production, this would be stored in a database
    // await this.storeActivityLog(logEntry);
  }

  /**
   * Check if vault has sufficient balance for emergency operations
   */
  async checkEmergencyBalance(vaultAddress: string): Promise<{
    hasEmergencyBalance: boolean;
    canWithdraw: boolean;
    emergencyAmount: number;
  }> {
    const balance = await this.getVaultBalance(vaultAddress);
    const emergencyAmount = balance.totalBalance - this.TRANSACTION_FEE_RESERVE;
    
    return {
      hasEmergencyBalance: balance.totalBalance > this.TRANSACTION_FEE_RESERVE,
      canWithdraw: emergencyAmount > 0,
      emergencyAmount: Math.max(0, emergencyAmount)
    };
  }

  /**
   * Get vault statistics for monitoring dashboard
   */
  async getVaultStatistics(vaultAddress: string): Promise<{
    balance: VaultBalance;
    tradingCapacity: number;
    utilizationRate: number;
    status: 'healthy' | 'low' | 'critical';
    recommendations: string[];
  }> {
    const balance = await this.getVaultBalance(vaultAddress);
    const tradingCapacity = Math.floor(balance.availableForTrading / this.STRIKE_MINIMUM);
    const utilizationRate = balance.availableForTrading / Math.max(balance.totalBalance, 1);
    
    let status: 'healthy' | 'low' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    if (balance.availableForTrading < this.STRIKE_MINIMUM) {
      status = 'critical';
      recommendations.push('⚠️ CRITICAL: Vault balance below minimum trading threshold');
      recommendations.push(`💰 Add at least ${(this.STRIKE_MINIMUM + this.SAFETY_BUFFER - balance.totalBalance).toFixed(2)} ADA to resume trading`);
    } else if (balance.availableForTrading < 100) {
      status = 'low';
      recommendations.push('⚠️ LOW: Consider adding more ADA for better trading opportunities');
      recommendations.push('💡 Recommended minimum: 200 ADA for optimal performance');
    } else {
      recommendations.push('✅ Vault balance is healthy for trading');
      recommendations.push(`🎯 Can execute up to ${tradingCapacity} trades at minimum size`);
    }

    return {
      balance,
      tradingCapacity,
      utilizationRate,
      status,
      recommendations
    };
  }
}

// Export singleton instance
export const createAgentVaultBalanceManager = (config: AgentVaultConfig) => {
  return new AgentVaultBalanceManager(config);
};

// 🎉 NEW WORKING CONTRACT CONFIGURATION - REGISTRY TRACKED
export const DEFAULT_AGENT_VAULT_CONFIG: AgentVaultConfig = {
  contractAddress: "addr1w8gnkw8z0jlyk4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j", // ✅ NEW WORKING CONTRACT - REGISTRY TRACKED
  agentVkh: "34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d",
  strikeContract: "be7544ca7d42c903268caecae465f3f8b5a7e7607d09165e471ac8b5",
  blockfrostProjectId: "mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu"
};
