/**
 * Vault Automated Trading Service
 * 
 * This service monitors ADA Custom Algorithm signals and automatically executes trades
 * through Agent Vaults when users have created vaults with trading enabled.
 * 
 * Key Features:
 * - Monitors algorithm signals every 5 minutes
 * - Executes trades through Railway Vault API
 * - Manages multiple user vaults
 * - Respects vault trading limits and balances
 */

import { EventEmitter } from 'events';

interface VaultConfig {
  vaultAddress: string;
  userAddress: string;
  tradingEnabled: boolean;
  maxTradeAmount: number; // in ADA
  algorithm: 'ada_custom_algorithm' | 'fibonacci' | 'multi_timeframe';
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  lastTradeTime?: number;
  totalTrades: number;
  winRate: number;
}

interface AlgorithmSignal {
  algorithm: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  tradeAmount: number;
  tradeType: 'long' | 'short';
  timestamp: number;
  reason: string;
}

interface VaultTradeResult {
  success: boolean;
  vaultAddress: string;
  tradeId?: string;
  error?: string;
  tradeDetails?: any;
}

export class VaultAutomatedTradingService extends EventEmitter {
  private activeVaults: Map<string, VaultConfig> = new Map();
  private isRunning: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private readonly MONITORING_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MIN_CONFIDENCE = 75; // Minimum confidence for automated trades
  private readonly RAILWAY_VAULT_API = 'https://ada-backtesting-service-production.up.railway.app';

  constructor() {
    super();
    console.log('🏦 Vault Automated Trading Service initialized');
  }

  /**
   * Register a new vault for automated trading
   */
  registerVault(config: VaultConfig): void {
    console.log(`📝 Registering vault: ${config.vaultAddress.substring(0, 20)}...`);
    
    this.activeVaults.set(config.vaultAddress, {
      ...config,
      totalTrades: 0,
      winRate: 0,
      lastTradeTime: 0
    });

    console.log(`✅ Vault registered. Total active vaults: ${this.activeVaults.size}`);
    
    // Start monitoring if this is the first vault
    if (this.activeVaults.size === 1 && !this.isRunning) {
      this.startMonitoring();
    }
  }

  /**
   * Remove a vault from automated trading
   */
  unregisterVault(vaultAddress: string): void {
    console.log(`🗑️ Unregistering vault: ${vaultAddress.substring(0, 20)}...`);
    
    this.activeVaults.delete(vaultAddress);
    
    console.log(`✅ Vault unregistered. Remaining active vaults: ${this.activeVaults.size}`);
    
    // Stop monitoring if no vaults remain
    if (this.activeVaults.size === 0) {
      this.stopMonitoring();
    }
  }

  /**
   * Start monitoring algorithm signals for automated trading
   */
  startMonitoring(): void {
    if (this.isRunning) {
      console.log('⚠️ Monitoring already running');
      return;
    }

    console.log('🚀 Starting vault automated trading monitoring...');
    this.isRunning = true;

    // Run initial check
    this.checkAlgorithmSignals();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkAlgorithmSignals();
    }, this.MONITORING_INTERVAL);

    console.log(`✅ Monitoring started. Checking every ${this.MONITORING_INTERVAL / 1000 / 60} minutes`);
  }

  /**
   * Stop monitoring algorithm signals
   */
  stopMonitoring(): void {
    if (!this.isRunning) {
      console.log('⚠️ Monitoring not running');
      return;
    }

    console.log('🛑 Stopping vault automated trading monitoring...');
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('✅ Monitoring stopped');
  }

  /**
   * Check algorithm signals and execute trades for eligible vaults
   */
  private async checkAlgorithmSignals(): Promise<void> {
    try {
      console.log('🔍 Checking algorithm signals for vault trading...');
      
      if (this.activeVaults.size === 0) {
        console.log('📭 No active vaults to monitor');
        return;
      }

      // Get current ADA Custom Algorithm signal
      const signal = await this.getAlgorithmSignal();
      
      if (!signal) {
        console.log('📊 No algorithm signal available');
        return;
      }

      console.log(`📈 Algorithm Signal: ${signal.signal} (${signal.confidence}% confidence)`);

      // Only process BUY signals with high confidence for automated trading
      if (signal.signal !== 'BUY' || signal.confidence < this.MIN_CONFIDENCE) {
        console.log(`⏭️ Skipping signal: ${signal.signal} with ${signal.confidence}% confidence (need ≥${this.MIN_CONFIDENCE}%)`);
        return;
      }

      // Execute trades for eligible vaults
      const tradePromises = Array.from(this.activeVaults.values())
        .filter(vault => this.isVaultEligibleForTrade(vault, signal))
        .map(vault => this.executeVaultTrade(vault, signal));

      const results = await Promise.allSettled(tradePromises);
      
      // Log results
      results.forEach((result, index) => {
        const vault = Array.from(this.activeVaults.values())[index];
        if (result.status === 'fulfilled') {
          console.log(`✅ Vault trade completed: ${vault.vaultAddress.substring(0, 20)}...`);
        } else {
          console.log(`❌ Vault trade failed: ${vault.vaultAddress.substring(0, 20)}... - ${result.reason}`);
        }
      });

    } catch (error) {
      console.error('❌ Error checking algorithm signals:', error);
    }
  }

  /**
   * Get current algorithm signal from Railway service
   */
  private async getAlgorithmSignal(): Promise<AlgorithmSignal | null> {
    try {
      // Call the ADA Custom Algorithm through Railway API
      const response = await fetch(`${this.RAILWAY_VAULT_API}/api/backtest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy: 'ada_custom_algorithm',
          timeframe: '15m',
          period: '1d', // Get recent signal
          mode: 'live_signal'
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`Railway API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract signal from backtest results
      if (data.success && data.trades && data.trades.length > 0) {
        const lastTrade = data.trades[data.trades.length - 1];
        
        return {
          algorithm: 'ada_custom_algorithm',
          signal: lastTrade.side === 'long' ? 'BUY' : 'SELL',
          confidence: data.performance?.win_rate || 75,
          entryPrice: lastTrade.entry_price || 1.05,
          tradeAmount: 50, // Default 50 ADA
          tradeType: lastTrade.side || 'long',
          timestamp: Date.now(),
          reason: lastTrade.reason || 'ADA Custom Algorithm signal'
        };
      }

      return null;

    } catch (error) {
      console.error('❌ Failed to get algorithm signal:', error);
      return null;
    }
  }

  /**
   * Check if vault is eligible for automated trading
   */
  private isVaultEligibleForTrade(vault: VaultConfig, signal: AlgorithmSignal): boolean {
    // Check if trading is enabled
    if (!vault.tradingEnabled) {
      return false;
    }

    // Check algorithm match
    if (vault.algorithm !== 'ada_custom_algorithm') {
      return false;
    }

    // Check minimum time between trades (prevent over-trading)
    const timeSinceLastTrade = Date.now() - (vault.lastTradeTime || 0);
    const minTimeBetweenTrades = 30 * 60 * 1000; // 30 minutes
    
    if (timeSinceLastTrade < minTimeBetweenTrades) {
      console.log(`⏰ Vault ${vault.vaultAddress.substring(0, 20)}... - Too soon since last trade`);
      return false;
    }

    // Check confidence level based on risk tolerance
    const minConfidenceByRisk = {
      conservative: 85,
      moderate: 75,
      aggressive: 65
    };

    if (signal.confidence < minConfidenceByRisk[vault.riskLevel]) {
      console.log(`📊 Vault ${vault.vaultAddress.substring(0, 20)}... - Confidence too low for ${vault.riskLevel} risk level`);
      return false;
    }

    return true;
  }

  /**
   * Execute trade for a specific vault
   */
  private async executeVaultTrade(vault: VaultConfig, signal: AlgorithmSignal): Promise<VaultTradeResult> {
    try {
      console.log(`🚀 Executing vault trade: ${vault.vaultAddress.substring(0, 20)}...`);

      // Calculate trade amount based on vault settings
      const tradeAmount = Math.min(signal.tradeAmount, vault.maxTradeAmount);

      // Execute trade through Railway Vault API
      const response = await fetch(`${this.RAILWAY_VAULT_API}/api/vault/execute-trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vault_address: vault.vaultAddress,
          trade_type: signal.tradeType,
          trade_amount: tradeAmount,
          algorithm: signal.algorithm,
          confidence: signal.confidence,
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(`Railway Vault API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Update vault statistics
        vault.lastTradeTime = Date.now();
        vault.totalTrades += 1;
        
        // Emit trade event
        this.emit('vaultTradeExecuted', {
          vaultAddress: vault.vaultAddress,
          tradeDetails: result.trade_details,
          signal: signal
        });

        return {
          success: true,
          vaultAddress: vault.vaultAddress,
          tradeId: result.trade_details?.trade_id,
          tradeDetails: result
        };
      } else {
        throw new Error(result.error || 'Trade execution failed');
      }

    } catch (error) {
      console.error(`❌ Vault trade execution failed for ${vault.vaultAddress.substring(0, 20)}...`, error);
      
      return {
        success: false,
        vaultAddress: vault.vaultAddress,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get status of all active vaults
   */
  getVaultStatus(): Array<VaultConfig & { status: string }> {
    return Array.from(this.activeVaults.values()).map(vault => ({
      ...vault,
      status: vault.tradingEnabled ? 'active' : 'paused'
    }));
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      activeVaults: this.activeVaults.size,
      monitoringInterval: this.MONITORING_INTERVAL / 1000 / 60, // in minutes
      minConfidence: this.MIN_CONFIDENCE
    };
  }
}

// Export singleton instance
export const vaultAutomatedTradingService = new VaultAutomatedTradingService();
