import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// Strike Finance API Types and Interfaces
export interface Asset {
  policyId: string;
  assetName: string;
}

export interface OutRef {
  txHash: string;
  outputIndex: number;
}

export type Side = "Long" | "Short";

export interface OpenPositionRequest {
  request: {
    address: string; // Changed from bech32Address
    asset: Asset;
    collateralAmount: number; // In ADA, not lovelace!
    leverage: number;
    position: Side;
    enteredPositionTime: number; // REQUIRED - POSIX timestamp
    stopLossPrice?: number; // Optional
    takeProfitPrice?: number; // Optional
  };
}

export interface ClosePositionRequest {
  request: {
    address: string;
    asset: Asset;
    outRef: OutRef;
    enteredPositionTime: number; // REQUIRED - POSIX timestamp when position was entered
  };
}

export interface UpdatePositionRequest {
  request: {
    address: string;
    asset: Asset;
    outRef: OutRef;
    stopLossPrice: number;
    takeProfitPrice: number;
  };
}

export interface PerpetualInfo {
  position: Side;
  positionSize: number;
  leverage: number;
  stopLoss: number;
  takeProfit: number;
  asset: {
    ticker: string;
    asset: Asset;
    type: string;
    url: string;
    decimals: number;
    dex: string;
    perpAuthPolicyId: string;
  };
  collateral: {
    amount: number;
    ticker: string;
  };
  entryPrice: number;
  isPending: boolean;
  outRef: OutRef;
  enteredPositionTime: number;
  status: "Pending" | "Completed";
  liquidationPrice: number;
  hourlyBorrowFee: number;
}

export interface PoolInfo {
  totalAssetAmount: number;
  availableAssetAmount: number;
  totalLpMinted: number;
  totalValueLocked: number;
}

export interface MarketInfo {
  longInterest: number;
  shortInterest: number;
}

export interface PoolInfo {
  totalAssetAmount: number;
  availableAssetAmount: number;
  totalLpMinted: number;
  totalValueLocked: number;
}

export interface PerpetualTransactionInfo {
  contract: "Perpetual";
  action: string;
  assetTicker: string;
  type: "Perpetual";
  pair: string;
  time: number;
  address: string;
  txHash: string;
  status: string;
  enteredPrice: number;
  positionSize: number;
  positionType: string;
  collateralAmount: number;
  description: string;
  pnl: number;
  usdPrice?: number;
  leverage?: number;
  currentPrice: number;
}

export interface LiquidityTransactionInfo {
  txHash: string;
  depositedAssetAmount: number;
  recievedAssetAmount: number;
  assetTicker: string;
  date: number;
  action: "Assets recieved" | "LP assets recieved" | "Provide Liquidity" | "Withdraw Liquidity";
}

export interface PerpetualTransactionInfo {
  contract: "Perpetual";
  action: string;
  assetTicker: string;
  type: "Perpetual";
  pair: string;
  time: number;
  address: string;
  txHash: string;
  status: string;
  enteredPrice: number;
  positionSize: number;
  positionType: string;
  collateralAmount: number;
  description: string;
  pnl: number;
  usdPrice?: number;
  leverage?: number;
  currentPrice: number;
}

/**
 * Strike Finance API Service
 * Handles all interactions with the Strike Finance Perpetuals API
 */
export class StrikeFinanceAPI {
  private readonly client: AxiosInstance;
  private readonly baseUrl = "https://app.strikefinance.org";

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Strike-Managed-Wallet/1.0",
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
   * Opens a new perpetual position with corrected API format
   */
  async openPosition(
    address: string,
    collateralAmountADA: number,
    leverage: number,
    position: Side,
    stopLossPrice?: number,
    takeProfitPrice?: number
  ): Promise<{ cbor: string }> {
    try {
      const requestData: OpenPositionRequest = {
        request: {
          address: address, // Corrected from bech32Address
          asset: { policyId: "", assetName: "" }, // Empty for ADA
          collateralAmount: collateralAmountADA, // In ADA, not lovelace!
          leverage: leverage,
          position: position,
          enteredPositionTime: Date.now(), // Required POSIX timestamp
          ...(stopLossPrice && { stopLossPrice }),
          ...(takeProfitPrice && { takeProfitPrice })
        }
      };

      console.log('🎯 Strike Finance API Request (Corrected):', JSON.stringify(requestData, null, 2));

      const response = await this.client.post("/api/perpetuals/openPosition", requestData);
      console.log('✅ Strike Finance API Response received');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to open position:', error);
      throw new Error(`Failed to open position: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Closes an existing perpetual position with corrected API format
   */
  async closePosition(
    address: string,
    txHash: string,
    outputIndex: number,
    enteredPositionTime: number
  ): Promise<{ cbor: string }> {
    try {
      const requestData: ClosePositionRequest = {
        request: {
          address: address,
          asset: { policyId: "", assetName: "" }, // Empty for ADA
          outRef: { txHash, outputIndex },
          enteredPositionTime: enteredPositionTime // Required POSIX timestamp
        }
      };

      console.log('🎯 Strike Finance Close Position Request (Corrected):', JSON.stringify(requestData, null, 2));

      const response = await this.client.post("/api/perpetuals/closePosition", requestData);
      console.log('✅ Strike Finance Close Position Response received');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to close position:', error);
      throw new Error(`Failed to close position: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates an existing perpetual position (stop loss, take profit)
   */
  async updatePosition(data: UpdatePositionRequest): Promise<{ cbor: string }> {
    try {
      const response = await this.client.post("/api/perpetuals/updatePosition", data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to update position:', error);
      throw new Error(`Failed to update position: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves all active and pending positions for a given address
   */
  async getPositions(address: string): Promise<PerpetualInfo[]> {
    try {
      const response = await this.client.get(`/api/perpetuals/getPositions?address=${address}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get positions:', error);
      throw new Error(`Failed to get positions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves information about the V2 perpetuals liquidity pool
   */
  async getPoolInfoV2(): Promise<{ data: PoolInfo }> {
    try {
      const response = await this.client.get("/api/perpetuals/getPoolInfoV2");
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get pool info:', error);
      throw new Error(`Failed to get pool info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves overall market information
   */
  async getOverallInfo(): Promise<{ data: MarketInfo }> {
    try {
      const response = await this.client.get("/api/perpetuals/getOverallInfo");
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get market info:', error);
      throw new Error(`Failed to get market info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves the perpetual transaction history for a specific address
   */
  async getPerpetualHistory(address: string): Promise<{ transactions: PerpetualTransactionInfo[] }> {
    try {
      const response = await this.client.get(`/api/perpetuals/getPerpetualHistory?address=${address}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get perpetual history:', error);
      throw new Error(`Failed to get perpetual history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validates request data before sending to API
   */
  private validateRequest(data: any, schema: z.ZodSchema): boolean {
    try {
      schema.parse(data);
      return true;
    } catch (error) {
      console.error('❌ Request validation failed:', error);
      return false;
    }
  }

  /**
   * Retrieves pool information V2 with enhanced data
   */
  async getPoolInfoV2(): Promise<{ data: PoolInfo }> {
    try {
      const response = await this.client.get("/api/perpetuals/getPoolInfoV2");
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get pool info V2:', error);
      throw new Error(`Failed to get pool info V2: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves LP profit information
   */
  async getLPProfit(): Promise<{ data: any }> {
    try {
      const response = await this.client.get("/api/perpetuals/getLPProfit");
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get LP profit:', error);
      throw new Error(`Failed to get LP profit: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves perpetual transaction history for an address
   */
  async getPerpetualHistory(address: string): Promise<{ transactions: PerpetualTransactionInfo[] }> {
    try {
      const response = await this.client.get(`/api/perpetuals/getPerpetualHistory?address=${address}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get perpetual history:', error);
      throw new Error(`Failed to get perpetual history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves liquidity history transactions for an address
   */
  async getLiquidityHistory(address: string): Promise<{ transactions: LiquidityTransactionInfo[] }> {
    try {
      const response = await this.client.get(`/api/perpetuals/getLiquidityHistoryTransactions?address=${address}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get liquidity history:', error);
      throw new Error(`Failed to get liquidity history: ${error instanceof Error ? error.message : String(error)}`);
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