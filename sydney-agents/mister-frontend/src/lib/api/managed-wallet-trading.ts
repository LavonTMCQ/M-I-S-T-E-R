import { apiClient } from './client';
import { ApiResponse } from '@/types/api';

/**
 * Managed Wallet Trading API Service
 * Integrates with the new MISTER managed wallet trading system (Port 4114)
 * SEPARATE FROM STRIKE FINANCE - This handles CNT (Cardano Native Token) trading
 */

export interface ManagedWallet {
  walletId: string;
  userId: string;
  displayName: string;
  address: string;
  stakeAddress?: string;
  isActive: boolean;
  createdAt: string;
  balance?: {
    ada: number;
    tokens: Array<{
      unit: string;
      amount: number;
      ticker?: string;
    }>;
    lastUpdated: string;
  };
  tradingConfig?: {
    autoTradingEnabled: boolean;
    maxDailyTrades: number;
    maxPositionSize: number;
    riskLevel: 'conservative' | 'moderate' | 'aggressive';
  };
}

export interface TradingSession {
  sessionId: string;
  userId: string;
  walletId: string;
  isActive: boolean;
  startedAt: string;
  lastTradeAt?: string;
  tradesExecuted: number;
  totalVolume: number;
  pnl: number;
  settings: {
    maxDailyTrades: number;
    maxPositionSize: number;
    riskLevel: 'conservative' | 'moderate' | 'aggressive';
    autoTradingEnabled: boolean;
  };
}

export interface TradeResult {
  success: boolean;
  tradeId?: string;
  ticker: string;
  direction: 'buy' | 'sell';
  amount: number;
  price?: number;
  txHash?: string;
  error?: string;
  timestamp: string;
}

export class ManagedWalletTradingAPI {
  private baseUrl = 'http://localhost:4114/api';

  /**
   * Create a new managed wallet
   */
  async createManagedWallet(
    userId: string, 
    displayName: string = 'Trading Wallet'
  ): Promise<ApiResponse<{
    wallet: ManagedWallet;
    mnemonic: string; // Only returned during creation
  }>> {
    console.log(`💰 Creating managed wallet for user ${userId}...`);
    
    const response = await fetch(`${this.baseUrl}/wallets/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, displayName })
    });

    return response.json();
  }

  /**
   * Get all wallets for a user
   */
  async getUserWallets(userId: string): Promise<ApiResponse<ManagedWallet[]>> {
    console.log(`💰 Fetching wallets for user ${userId}...`);
    
    const response = await fetch(`${this.baseUrl}/wallets/${userId}`);
    return response.json();
  }

  /**
   * Get specific wallet details
   */
  async getWallet(walletId: string): Promise<ApiResponse<ManagedWallet>> {
    console.log(`💰 Fetching wallet ${walletId}...`);
    
    const response = await fetch(`${this.baseUrl}/wallets/wallet/${walletId}`);
    return response.json();
  }

  /**
   * Update wallet configuration
   */
  async updateWalletConfig(
    walletId: string, 
    updates: Partial<ManagedWallet>
  ): Promise<ApiResponse<ManagedWallet>> {
    console.log(`💰 Updating wallet ${walletId}...`);
    
    const response = await fetch(`${this.baseUrl}/wallets/wallet/${walletId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    return response.json();
  }

  /**
   * Delete a managed wallet
   */
  async deleteWallet(walletId: string): Promise<ApiResponse<void>> {
    console.log(`💰 Deleting wallet ${walletId}...`);
    
    const response = await fetch(`${this.baseUrl}/wallets/wallet/${walletId}`, {
      method: 'DELETE'
    });

    return response.json();
  }

  /**
   * Start automated CNT trading for a wallet
   */
  async startTradingSession(
    userId: string,
    walletId: string,
    settings?: Partial<TradingSession['settings']>
  ): Promise<ApiResponse<TradingSession>> {
    console.log(`📈 Starting CNT trading session for wallet ${walletId}...`);
    
    const response = await fetch(`${this.baseUrl}/trading/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, walletId, settings })
    });

    return response.json();
  }

  /**
   * Stop automated trading for a wallet
   */
  async stopTradingSession(walletId: string): Promise<ApiResponse<void>> {
    console.log(`📈 Stopping trading session for wallet ${walletId}...`);
    
    const response = await fetch(`${this.baseUrl}/trading/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId })
    });

    return response.json();
  }

  /**
   * Get trading session status for a wallet
   */
  async getTradingStatus(walletId: string): Promise<ApiResponse<{
    session: TradingSession | null;
    stats: any;
    isActive: boolean;
  }>> {
    console.log(`📈 Getting trading status for wallet ${walletId}...`);
    
    const response = await fetch(`${this.baseUrl}/trading/status/${walletId}`);
    return response.json();
  }

  /**
   * Get all active trading sessions for a user
   */
  async getUserTradingSessions(userId: string): Promise<ApiResponse<TradingSession[]>> {
    console.log(`📈 Getting trading sessions for user ${userId}...`);
    
    const response = await fetch(`${this.baseUrl}/trading/sessions/${userId}`);
    return response.json();
  }

  /**
   * Execute a manual CNT trade
   */
  async executeManualTrade(
    walletId: string,
    ticker: string,
    direction: 'buy' | 'sell',
    amount: number
  ): Promise<ApiResponse<TradeResult>> {
    console.log(`🎯 Executing manual CNT trade: ${direction} ${amount} ADA of ${ticker}...`);
    
    const response = await fetch(`${this.baseUrl}/trading/manual-trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletId,
        ticker,
        direction,
        amount: Math.round(amount) // Ensure whole numbers
      })
    });

    return response.json();
  }

  /**
   * Update trading settings for a wallet
   */
  async updateTradingSettings(
    walletId: string,
    settings: Partial<TradingSession['settings']>
  ): Promise<ApiResponse<TradingSession>> {
    console.log(`⚙️ Updating trading settings for wallet ${walletId}...`);
    
    const response = await fetch(`${this.baseUrl}/trading/settings/${walletId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    return response.json();
  }

  /**
   * Get available tokens for CNT trading
   */
  async getAvailableTokens(): Promise<ApiResponse<Array<{
    ticker: string;
    unit: string;
    name: string;
    price: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
  }>>> {
    console.log(`🪙 Fetching available CNT tokens...`);
    
    // This would integrate with TapTools API or similar
    // For now, return mock data
    return {
      success: true,
      data: [
        {
          ticker: 'SNEK',
          unit: '279c909f348e533da5808898f87f9a14bb2c3dfbbacccd631d927a3f534e454b',
          name: 'Snek',
          price: 0.0012,
          change24h: 5.2,
          volume24h: 125000,
          marketCap: 1200000
        },
        {
          ticker: 'WMTX',
          unit: '1d7f33bd23d85e1a25d87d86fac4f199c3197a2f7afeb662a0f34e1e776f726c646d6f62696c65746f6b656e',
          name: 'World Mobile Token',
          price: 0.045,
          change24h: -2.1,
          volume24h: 89000,
          marketCap: 45000000
        }
      ]
    };
  }

  /**
   * Get trading history for a wallet
   */
  async getTradingHistory(
    walletId: string,
    limit: number = 50
  ): Promise<ApiResponse<TradeResult[]>> {
    console.log(`📊 Fetching trading history for wallet ${walletId}...`);
    
    // This would be implemented when trade history storage is added
    return {
      success: true,
      data: []
    };
  }
}

// Global instance
export const managedWalletTradingAPI = new ManagedWalletTradingAPI();
