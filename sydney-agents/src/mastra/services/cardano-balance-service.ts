/**
 * Cardano Balance Service
 * Fetches real wallet balances from Cardano blockchain using Blockfrost API
 */

interface WalletBalance {
  address: string;
  balance: number; // in ADA
  balanceLovelace: number; // in lovelace
  assets: Array<{
    unit: string;
    quantity: string;
  }>;
  lastUpdated: Date;
}

interface BlockfrostResponse {
  amount: Array<{
    unit: string;
    quantity: string;
  }>;
}

export class CardanoBalanceService {
  private readonly blockfrostApiKey: string;
  private readonly baseUrl: string;
  private balanceCache: Map<string, WalletBalance> = new Map();
  private readonly cacheTimeout = 30000; // 30 seconds

  constructor(apiKey?: string) {
    // Use environment variable or fallback to demo key
    this.blockfrostApiKey = apiKey || process.env.BLOCKFROST_API_KEY || 'demo_key';
    this.baseUrl = 'https://cardano-mainnet.blockfrost.io/api/v0';
  }

  /**
   * Get wallet balance for a Cardano address
   */
  async getWalletBalance(address: string): Promise<WalletBalance> {
    try {
      // Check cache first
      const cached = this.balanceCache.get(address);
      if (cached && Date.now() - cached.lastUpdated.getTime() < this.cacheTimeout) {
        return cached;
      }

      // Fetch from Blockfrost API
      const response = await fetch(`${this.baseUrl}/addresses/${address}`, {
        headers: {
          'project_id': this.blockfrostApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Address not found or no transactions
          return this.createEmptyBalance(address);
        }
        throw new Error(`Blockfrost API error: ${response.status}`);
      }

      const data: BlockfrostResponse = await response.json();
      
      // Find ADA balance (unit: 'lovelace')
      const adaAmount = data.amount.find(asset => asset.unit === 'lovelace');
      const balanceLovelace = adaAmount ? parseInt(adaAmount.quantity) : 0;
      const balanceAda = balanceLovelace / 1_000_000; // Convert lovelace to ADA

      // Get other assets
      const assets = data.amount.filter(asset => asset.unit !== 'lovelace');

      const walletBalance: WalletBalance = {
        address,
        balance: balanceAda,
        balanceLovelace,
        assets,
        lastUpdated: new Date()
      };

      // Cache the result
      this.balanceCache.set(address, walletBalance);

      return walletBalance;

    } catch (error) {
      console.error(`Error fetching balance for ${address}:`, error);
      
      // Return cached data if available, otherwise empty balance
      const cached = this.balanceCache.get(address);
      if (cached) {
        return cached;
      }
      
      return this.createEmptyBalance(address);
    }
  }

  /**
   * Get balances for multiple addresses
   */
  async getMultipleWalletBalances(addresses: string[]): Promise<WalletBalance[]> {
    const promises = addresses.map(address => this.getWalletBalance(address));
    return Promise.all(promises);
  }

  /**
   * Create empty balance object for addresses with no funds
   */
  private createEmptyBalance(address: string): WalletBalance {
    return {
      address,
      balance: 0,
      balanceLovelace: 0,
      assets: [],
      lastUpdated: new Date()
    };
  }

  /**
   * Clear cache for specific address or all addresses
   */
  clearCache(address?: string): void {
    if (address) {
      this.balanceCache.delete(address);
    } else {
      this.balanceCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; addresses: string[] } {
    return {
      size: this.balanceCache.size,
      addresses: Array.from(this.balanceCache.keys())
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: string; apiKey: boolean; timestamp: Date }> {
    try {
      // Test with a known address (Cardano Foundation donation address)
      const testAddress = 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2qd4a6gtpc6z3rqgr83dc';
      
      const response = await fetch(`${this.baseUrl}/addresses/${testAddress}`, {
        headers: {
          'project_id': this.blockfrostApiKey,
          'Content-Type': 'application/json'
        }
      });

      return {
        status: response.ok ? 'healthy' : 'degraded',
        apiKey: this.blockfrostApiKey !== 'demo_key',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        apiKey: this.blockfrostApiKey !== 'demo_key',
        timestamp: new Date()
      };
    }
  }
}

// Export singleton instance
export const cardanoBalanceService = new CardanoBalanceService();
