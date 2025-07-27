/**
 * Strike Finance API Service for Frontend
 * 
 * This service handles direct communication with the Strike Finance API
 * for trade execution and position management.
 */

import axios, { AxiosInstance } from 'axios';

export interface StrikeFinanceTradeParams {
  userId: string;
  walletAddress: string;
  walletType: string;
  action: 'open' | 'close';
  side?: 'Long' | 'Short';
  pair: string;
  size?: number;
  leverage?: number;
  positionId?: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface StrikeFinanceResponse {
  success: boolean;
  cbor?: string;
  txHash?: string;
  error?: string;
  data?: any;
}

/**
 * Strike Finance API Service
 */
export class StrikeFinanceAPI {
  private readonly client: AxiosInstance;
  private readonly baseUrl = "https://app.strikefinance.org";

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Strike-Agent/1.0",
      },
      timeout: 30000, // 30 second timeout
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔄 Strike API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Strike API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Strike API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('❌ Strike API Response Error:', error.response?.status, error.response?.statusText);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute a trade on Strike Finance
   */
  async executeTrade(params: StrikeFinanceTradeParams): Promise<StrikeFinanceResponse> {
    try {
      console.log('🎯 Executing Strike Finance trade:', {
        action: params.action,
        side: params.side,
        pair: params.pair,
        size: params.size,
        leverage: params.leverage,
        wallet: params.walletAddress.substring(0, 20) + '...'
      });

      if (params.action === 'open') {
        return await this.openPosition(params);
      } else if (params.action === 'close') {
        return await this.closePosition(params);
      } else {
        throw new Error(`Unsupported action: ${params.action}`);
      }
    } catch (error) {
      console.error('❌ Strike Finance trade execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Open a new position
   */
  private async openPosition(params: StrikeFinanceTradeParams): Promise<StrikeFinanceResponse> {
    if (!params.side || !params.size || !params.leverage) {
      throw new Error('Missing required parameters for opening position: side, size, leverage');
    }

    const requestData = {
      request: {
        address: params.walletAddress,
        asset: { policyId: "", assetName: "" }, // Empty for ADA
        collateralAmount: params.size, // In ADA
        leverage: params.leverage,
        position: params.side,
        enteredPositionTime: Date.now(), // Required POSIX timestamp
        ...(params.stopLoss && { stopLossPrice: params.stopLoss }),
        ...(params.takeProfit && { takeProfitPrice: params.takeProfit })
      }
    };

    console.log('🎯 Strike Finance Open Position Request:', JSON.stringify(requestData, null, 2));

    try {
      const response = await this.client.post("/api/perpetuals/openPosition", requestData);
      console.log('✅ Strike Finance Open Position Response received');
      
      return {
        success: true,
        cbor: response.data.cbor,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Failed to open position:', error);
      throw new Error(`Failed to open position: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Close an existing position
   */
  private async closePosition(params: StrikeFinanceTradeParams): Promise<StrikeFinanceResponse> {
    if (!params.positionId) {
      throw new Error('Position ID is required for closing position');
    }

    const requestData = {
      request: {
        address: params.walletAddress,
        positionId: params.positionId,
        enteredPositionTime: Date.now()
      }
    };

    console.log('🎯 Strike Finance Close Position Request:', JSON.stringify(requestData, null, 2));

    try {
      const response = await this.client.post("/api/perpetuals/closePosition", requestData);
      console.log('✅ Strike Finance Close Position Response received');
      
      return {
        success: true,
        cbor: response.data.cbor,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Failed to close position:', error);
      throw new Error(`Failed to close position: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get market information
   */
  async getMarketInfo(): Promise<any> {
    try {
      const response = await this.client.get("/api/perpetuals/getOverallInfo");
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get market info:', error);
      throw new Error(`Failed to get market info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get positions for a wallet
   */
  async getPositions(address: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/perpetuals/getPositions?address=${address}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get positions:', error);
      throw new Error(`Failed to get positions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Health check for Strike Finance API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/api/perpetuals/getOverallInfo");
      return response.status === 200;
    } catch (error) {
      console.error('❌ Strike Finance API health check failed:', error);
      return false;
    }
  }
}
