/**
 * Strike Finance Proxy API Service
 * 
 * Routes all Strike Finance API calls through our Railway proxy service
 * to bypass CORS restrictions and enable proper integration.
 */

const PROXY_BASE_URL = 'https://friendly-reprieve-production.up.railway.app/api/strike';

export interface StrikeApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

/**
 * Make a proxied API call to Strike Finance
 */
async function makeProxyCall<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<StrikeApiResponse<T>> {
  try {
    console.log(`🔗 [Strike Proxy] ${method} ${endpoint}`);
    
    const url = `${PROXY_BASE_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.text();
    
    // Try to parse as JSON
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch {
      parsedData = data;
    }

    if (response.ok) {
      console.log(`✅ [Strike Proxy] ${method} ${endpoint} successful`);
      return {
        success: true,
        data: parsedData,
        status: response.status
      };
    } else {
      console.warn(`⚠️ [Strike Proxy] ${method} ${endpoint} failed: ${response.status}`);
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        data: parsedData,
        status: response.status
      };
    }
  } catch (error) {
    console.error(`❌ [Strike Proxy] ${method} ${endpoint} error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 0
    };
  }
}

// === READ-ONLY ENDPOINTS ===

export const strikeApi = {
  /**
   * Get overall market information
   */
  async getOverallInfo() {
    return makeProxyCall('/perpetuals/getOverallInfo');
  },

  /**
   * Get pool information (V1)
   */
  async getPoolInfo() {
    return makeProxyCall('/perpetuals/getPoolInfo');
  },

  /**
   * Get pool information (V2)
   */
  async getPoolInfoV2() {
    return makeProxyCall('/perpetuals/getPoolInfoV2');
  },

  /**
   * Get user positions
   */
  async getPositions(address: string) {
    return makeProxyCall(`/perpetuals/getPositions?address=${address}`);
  },

  /**
   * Get perpetual trading history for user
   */
  async getPerpetualHistory(address: string) {
    return makeProxyCall(`/perpetuals/getPerpetualHistory?address=${address}`);
  },

  /**
   * Get liquidity history for user  
   */
  async getLiquidityHistory(address: string) {
    return makeProxyCall(`/perpetuals/getLiquidityHistoryTransactions?address=${address}`);
  },

  /**
   * Get overall trade history
   */
  async getTradeHistory() {
    return makeProxyCall('/perpetuals/getTradeHistory');
  },

  /**
   * Get open orders
   */
  async getOpenOrders() {
    return makeProxyCall('/perpetuals/getOpenOrders');
  },

  /**
   * Get LP profit information
   */
  async getLPProfit() {
    return makeProxyCall('/perpetuals/getLPProfit');
  },

  // === TRANSACTION ENDPOINTS ===

  /**
   * Open a new position
   */
  async openPosition(request: {
    address: string;
    asset: {
      policyId: string;
      assetName: string;
    };
    assetTicker: string;
    collateralAmount: number;
    leverage: number;
    position: 'Long' | 'Short';
    enteredPositionTime: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
  }) {
    return makeProxyCall('/perpetuals/openPosition', 'POST', { request });
  },

  /**
   * Close an existing position
   */
  async closePosition(request: {
    address: string;
    asset: {
      policyId: string;
      assetName: string;
    };
    assetTicker: string;
    outRef: {
      txHash: string;
      outputIndex: number;
    };
    enteredPositionTime: number;
  }) {
    return makeProxyCall('/perpetuals/closePosition', 'POST', { request });
  },

  /**
   * Update position (stop loss / take profit)
   */
  async updatePosition(request: {
    address: string;
    asset: {
      policyId: string;
      assetName: string;
    };
    assetTicker: string;
    outRef: {
      txHash: string;
      outputIndex: number;
    };
    stopLossPrice: number;
    takeProfitPrice: number;
  }) {
    return makeProxyCall('/perpetuals/updatePosition', 'POST', { request });
  },

  /**
   * Provide liquidity to pool
   */
  async provideLiquidity(request: {
    address: string;
    asset: {
      policyId: string;
      assetName: string;
    };
    amount: number; // in lovelace
  }) {
    return makeProxyCall('/perpetuals/provideLiquidity', 'POST', { request });
  },

  /**
   * Withdraw liquidity from pool
   */
  async withdrawLiquidity(request: {
    address: string;
    asset: {
      policyId: string;
      assetName: string;
    };
    amount: number; // in lovelace
  }) {
    return makeProxyCall('/perpetuals/withdrawLiquidity', 'POST', { request });
  }
};

/**
 * Test all read-only endpoints (safe to call)
 */
export async function testReadOnlyEndpoints(walletAddress?: string) {
  console.log('🧪 [Strike Proxy] Testing all read-only endpoints...');
  
  const results = {
    overallInfo: await strikeApi.getOverallInfo(),
    poolInfo: await strikeApi.getPoolInfo(),
    poolInfoV2: await strikeApi.getPoolInfoV2(),
    tradeHistory: await strikeApi.getTradeHistory(),
    openOrders: await strikeApi.getOpenOrders(),
    lpProfit: await strikeApi.getLPProfit()
  };

  // Wallet-specific endpoints (if address provided)
  if (walletAddress) {
    results.positions = await strikeApi.getPositions(walletAddress);
    results.perpetualHistory = await strikeApi.getPerpetualHistory(walletAddress);
    results.liquidityHistory = await strikeApi.getLiquidityHistory(walletAddress);
  }

  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.values(results).length;
  
  console.log(`✅ [Strike Proxy] Test complete: ${successful}/${total} endpoints successful`);
  
  return {
    results,
    summary: {
      successful,
      total,
      successRate: Math.round((successful / total) * 100)
    }
  };
}

export default strikeApi;