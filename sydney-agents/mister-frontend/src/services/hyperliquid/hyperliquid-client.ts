/**
 * Hyperliquid API Client for Frontend Integration
 * This connects to the shared vault that all users contribute to
 */

export interface HyperliquidVaultInfo {
  // Shared vault address (same for all users)
  vaultAddress: string;
  
  // Total vault metrics
  totalBalance: number;
  totalPositions: number;
  totalPnL24h: number;
  totalVolume24h: number;
  
  // Performance metrics
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  
  // User's contribution to the vault
  userContribution?: {
    amountUSD: number;
    percentage: number;
    joinDate: string;
    totalReturns: number;
  };
}

export interface HyperliquidPosition {
  id: string;
  coin: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercent: number;
  leverage: number;
  liquidationPrice?: number;
}

// Shared vault address - this will be the same for everyone
const SHARED_VAULT_ADDRESS = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74";

export class HyperliquidClient {
  private baseUrl = "https://api.hyperliquid.xyz";
  
  /**
   * Fetch the shared vault information
   * All users see the same vault data
   */
  async getSharedVaultInfo(): Promise<HyperliquidVaultInfo> {
    try {
      // For now, return mock data until we set up the API proxy
      // In production, this will call our backend which has the private key
      return {
        vaultAddress: SHARED_VAULT_ADDRESS,
        totalBalance: 141142.50,
        totalPositions: 3,
        totalPnL24h: 4328.21,
        totalVolume24h: 285430.00,
        winRate: 68.5,
        sharpeRatio: 2.34,
        maxDrawdown: -8.2,
      };
    } catch (error) {
      console.error("Failed to fetch Hyperliquid vault info:", error);
      throw error;
    }
  }
  
  /**
   * Fetch active positions from the shared vault
   */
  async getVaultPositions(): Promise<HyperliquidPosition[]> {
    try {
      // Mock positions for now - will be replaced with real API call
      return [
        {
          id: "1",
          coin: "ADA",
          side: "long",
          size: 154000,
          entryPrice: 0.9164,
          markPrice: 0.9178,
          pnl: 215.60,
          pnlPercent: 0.15,
          leverage: 5,
          liquidationPrice: 0.8248
        },
        {
          id: "2", 
          coin: "SOL",
          side: "long",
          size: 125.5,
          entryPrice: 202.50,
          markPrice: 208.30,
          pnl: 727.90,
          pnlPercent: 2.86,
          leverage: 3,
          liquidationPrice: 182.25
        },
        {
          id: "3",
          coin: "ETH",
          side: "long",
          size: 15.3,
          entryPrice: 3120.50,
          markPrice: 3185.20,
          pnl: 989.91,
          pnlPercent: 2.07,
          leverage: 2,
          liquidationPrice: 2496.40
        }
      ];
    } catch (error) {
      console.error("Failed to fetch vault positions:", error);
      throw error;
    }
  }
  
  /**
   * Calculate user's share of the vault based on their contribution
   */
  calculateUserShare(userContributionUSD: number, totalVaultValue: number): number {
    if (totalVaultValue === 0) return 0;
    return (userContributionUSD / totalVaultValue) * 100;
  }
}

// Singleton instance
export const hyperliquidClient = new HyperliquidClient();