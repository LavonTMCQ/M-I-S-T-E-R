import { apiClient } from './client';
import { ApiResponse } from '@/types/api';

/**
 * Strike Finance API Service
 * Integrates with Strike Finance platform for trading and market data
 */
export class StrikeAPI {
  /**
   * Get current market data
   */
  async getMarketData(pair: string = 'ADA/USD'): Promise<ApiResponse<{
    pair: string;
    price: number;
    change24h: number;
    changePercent24h: number;
    volume24h: number;
    high24h: number;
    low24h: number;
    marketCap: number;
    circulatingSupply: number;
    lastUpdated: string;
    strikeData: {
      totalLiquidity: number;
      openInterest: number;
      fundingRate: number;
      nextFundingTime: string;
      maxLeverage: number;
      minPositionSize: number;
      tradingFees: {
        maker: number;
        taker: number;
      };
    };
    technicalIndicators: {
      rsi: number;
      macd: {
        macd: number;
        signal: number;
        histogram: number;
      };
      bollinger: {
        upper: number;
        middle: number;
        lower: number;
      };
      sma20: number;
      sma50: number;
      volume: number;
    };
  }>> {
    console.log(`📊 Fetching market data for ${pair}...`);
    
    return apiClient.get(`/api/market-data?pair=${pair}`);
  }

  /**
   * Subscribe to real-time market data
   */
  async subscribeToMarketData(pairs: string[], interval: string = '1s'): Promise<ApiResponse<{
    subscriptionId: string;
    pairs: string[];
    interval: string;
    status: string;
    createdAt: string;
  }>> {
    console.log(`📊 Subscribing to market data for ${pairs.join(', ')}...`);
    
    return apiClient.post('/api/market-data', { pairs, interval });
  }

  /**
   * Check Strike Finance platform health
   */
  async getHealthStatus(): Promise<ApiResponse<{
    isHealthy: boolean;
    status: string;
    responseTime: number;
    timestamp: string;
    services: {
      trading: { status: string; responseTime: number; lastCheck: string };
      marketData: { status: string; responseTime: number; lastCheck: string };
      websocket: { status: string; connections: number; lastCheck: string };
      liquidation: { status: string; responseTime: number; lastCheck: string };
    };
    apiLimits: {
      requestsPerMinute: number;
      currentUsage: number;
      resetTime: string;
    };
    network: {
      cardanoNetwork: string;
      blockHeight: number;
      networkLatency: number;
      lastBlockTime: string;
    };
    platformStats: {
      totalValueLocked: number;
      activePositions: number;
      dailyVolume: number;
      totalUsers: number;
    };
    issues?: string[];
  }>> {
    console.log('🏥 Checking Strike Finance health...');
    
    return apiClient.get('/api/strike/health');
  }

  /**
   * Execute a trade on Strike Finance
   */
  async executeTrade(params: {
    userId: string;
    walletAddress: string;
    walletType: string;
    action: 'open' | 'close'; // Lowercase to match backend
    side?: 'Long' | 'Short';
    pair: string;
    size?: number;
    leverage?: number;
    positionId?: string;
    stopLoss?: number;
    takeProfit?: number;
  }): Promise<ApiResponse<{
    success: boolean;
    cbor?: string; // CBOR transaction data for signing
    txHash?: string;
    action: string;
    pair: string;
    side: string | null;
    size: number | null;
    leverage: number | null;
    price: number;
    timestamp: string;
    strikeData: {
      positionId: string;
      collateralAmount: number; // Now in ADA
      enteredPositionTime?: number; // POSIX timestamp
      liquidationPrice: number | null;
      fundingRate: number;
      fees: {
        tradingFee: number | null;
        fundingFee: number;
        networkFee: number;
      };
    };
    execution: {
      slippage: number;
      executionTime: number;
      blockHeight: number;
      confirmations: number;
    };
    message: string;
  }>> {
    console.log(`🎯 Executing Strike Finance trade (corrected format)...`);
    
    return apiClient.post('/api/strike/trade', params);
  }

  /**
   * Open a new position (convenience method)
   */
  async openPosition(params: {
    address: string;
    side: 'Long' | 'Short';
    collateralAmount: number;
    enteredPositionTime?: number;
    leverage?: number;
    pair?: string;
  }): Promise<ApiResponse<{
    success: boolean;
    cbor?: string;
    data?: any;
    error?: string;
  }>> {
    console.log(`🎯 Opening Strike Finance position...`);

    return this.executeTrade({
      userId: 'frontend-user',
      walletAddress: params.address,
      walletType: 'connected',
      action: 'open',
      side: params.side,
      pair: params.pair || 'ADA/USD',
      size: params.collateralAmount,
      leverage: params.leverage || 2
    });
  }

  /**
   * Get trade preview/simulation
   */
  async getTradePreview(params: {
    action: 'open' | 'close';
    side: 'Long' | 'Short';
    pair: string;
    size: number;
    leverage: number;
  }): Promise<ApiResponse<{
    action: string;
    side: string;
    pair: string;
    size: number;
    leverage: number;
    currentPrice: number;
    estimatedPrice: number;
    collateralAmount: number;
    liquidationPrice: number;
    fees: {
      tradingFee: number;
      fundingFee: number;
      networkFee: number;
      totalFees: number;
    };
    riskMetrics: {
      marginRatio: number;
      maxLoss: number;
      riskLevel: string;
    };
  }>> {
    console.log(`🔍 Getting trade preview...`);
    
    const params_str = new URLSearchParams({
      action: params.action,
      side: params.side,
      pair: params.pair,
      size: params.size.toString(),
      leverage: params.leverage.toString()
    });
    
    return apiClient.get(`/api/strike/trade?${params_str}`);
  }

  /**
   * Format currency values for Strike Finance
   */
  formatStrikeValue(value: number, currency: string = 'ADA'): string {
    if (currency === 'ADA') {
      return `${value.toLocaleString()} ADA`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  }

  /**
   * Calculate position value
   */
  calculatePositionValue(size: number, price: number): number {
    return size * price;
  }

  /**
   * Calculate required collateral
   */
  calculateCollateral(size: number, price: number, leverage: number): number {
    return (size * price) / leverage;
  }

  /**
   * Calculate liquidation price
   */
  calculateLiquidationPrice(entryPrice: number, side: 'Long' | 'Short', leverage: number): number {
    const liquidationThreshold = 0.9; // 90% of collateral
    const priceMove = (entryPrice / leverage) * liquidationThreshold;
    
    if (side === 'Long') {
      return entryPrice - priceMove;
    } else {
      return entryPrice + priceMove;
    }
  }

  /**
   * Get risk level based on leverage
   */
  getRiskLevel(leverage: number): { level: string; color: string; description: string } {
    if (leverage <= 2) {
      return {
        level: 'Low',
        color: 'text-green-600',
        description: 'Conservative leverage with lower risk'
      };
    } else if (leverage <= 5) {
      return {
        level: 'Medium',
        color: 'text-yellow-600',
        description: 'Moderate leverage with balanced risk/reward'
      };
    } else {
      return {
        level: 'High',
        color: 'text-red-600',
        description: 'High leverage with significant risk'
      };
    }
  }
}

// Export singleton instance
export const strikeAPI = new StrikeAPI();
export default strikeAPI;
