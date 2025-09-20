/**
 * Strike Finance Autonomous Trading Service
 * 
 * Complete implementation for autonomous trading on Strike Finance
 * using user wallet with seed phrase for direct signing.
 * 
 * Features:
 * - Direct Strike Finance API integration
 * - CBOR transaction signing with seed phrase
 * - Autonomous position management
 * - Real-time P&L tracking
 */

import { StrikeProxy } from '../strike-proxy';

interface StrikePosition {
  address: string;
  asset: { policyId: string; assetName: string };
  assetTicker: string;
  collateralAmount: number;
  leverage: number;
  position: 'Long' | 'Short';
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

interface StrikeTradingSignal {
  action: 'open' | 'close';
  side: 'Long' | 'Short';
  collateral: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number;
  reasoning: string;
}

export class StrikeAutonomousTrader {
  private strikeProxy: StrikeProxy;
  private walletAddress: string = '';
  private walletSeed: string = '';
  private isInitialized: boolean = false;
  private activePositions: Map<string, any> = new Map();
  
  // Strike Finance API endpoints
  private readonly STRIKE_API = {
    openPosition: '/api/perpetuals/openPosition',
    closePosition: '/api/perpetuals/closePosition', 
    getPositions: '/api/perpetuals/positionsV2',
    getOverallInfo: '/api/perpetuals/getOverallInfo',
    getAssetInfo: '/api/perpetuals/getAssetInfo'
  };

  constructor() {
    this.strikeProxy = StrikeProxy.getInstance();
    console.log('🤖 Strike Autonomous Trader initialized');
  }

  /**
   * Initialize with wallet address and optional seed for signing
   */
  async initialize(walletAddress: string, seedPhrase?: string): Promise<boolean> {
    try {
      console.log('🔐 Initializing Strike Finance trader...');
      this.walletAddress = walletAddress;
      this.walletSeed = seedPhrase || '';
      
      // Test Strike Finance connectivity
      const testResponse = await this.strikeProxy.makeStrikeRequest(this.STRIKE_API.getOverallInfo);
      
      if (!testResponse.ok) {
        throw new Error('Failed to connect to Strike Finance API');
      }
      
      const data = await testResponse.json();
      console.log('✅ Strike Finance connected successfully');
      console.log('📊 Platform info:', {
        totalLiquidity: data.totalLiquidity,
        totalVolume24h: data.totalVolume24h,
        activePositions: data.totalOpenPositions
      });
      
      this.isInitialized = true;
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Strike trader:', error);
      return false;
    }
  }

  /**
   * Execute trading signal autonomously
   */
  async executeTradingSignal(signal: StrikeTradingSignal): Promise<{
    success: boolean;
    positionId?: string;
    txHash?: string;
    error?: string;
  }> {
    if (!this.isInitialized) {
      return { success: false, error: 'Trader not initialized' };
    }

    console.log('🎯 Executing trading signal:', signal);

    try {
      if (signal.action === 'open') {
        return await this.openPosition(signal);
      } else {
        // Close position logic
        return await this.closeAllPositions(signal.reasoning);
      }
    } catch (error) {
      console.error('❌ Signal execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Open a new position on Strike Finance
   */
  private async openPosition(signal: StrikeTradingSignal): Promise<{
    success: boolean;
    positionId?: string;
    txHash?: string;
    error?: string;
  }> {
    console.log(`📈 Opening ${signal.side} position with ${signal.collateral} ADA at ${signal.leverage}x leverage`);

    const positionRequest = {
      request: {
        address: this.walletAddress,
        asset: { policyId: "", assetName: "" }, // ADA native asset
        assetTicker: "ADA",
        collateralAmount: signal.collateral,
        leverage: signal.leverage,
        position: signal.side,
        stopLossPrice: signal.stopLoss,
        takeProfitPrice: signal.takeProfit
      }
    };

    try {
      // Call Strike Finance API to get unsigned CBOR
      const response = await this.strikeProxy.makeStrikeRequest(
        this.STRIKE_API.openPosition,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(positionRequest)
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Strike API error: ${error}`);
      }

      const result = await response.json();
      
      if (!result.cbor) {
        throw new Error('Strike Finance did not return CBOR transaction');
      }

      console.log('✅ Received CBOR from Strike Finance');
      console.log('📝 CBOR length:', result.cbor.length);

      // Sign and submit via Railway service
      const signResult = await this.signAndSubmitCBOR(result.cbor);
      
      if (!signResult.success) {
        throw new Error(`Transaction signing failed: ${signResult.error}`);
      }

      // Store position for tracking
      const positionId = `pos_${Date.now()}`;
      this.activePositions.set(positionId, {
        ...signal,
        txHash: signResult.txHash,
        openedAt: new Date(),
        cbor: result.cbor
      });

      console.log(`✅ Position opened successfully!`);
      console.log(`📊 Position ID: ${positionId}`);
      console.log(`🔗 TX Hash: ${signResult.txHash}`);

      return {
        success: true,
        positionId,
        txHash: signResult.txHash
      };

    } catch (error) {
      console.error('❌ Failed to open position:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open position'
      };
    }
  }

  /**
   * Close all open positions
   */
  private async closeAllPositions(reason: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    console.log(`📉 Closing all positions. Reason: ${reason}`);

    try {
      // Get current positions from Strike Finance
      const response = await this.strikeProxy.makeStrikeRequest(
        `${this.STRIKE_API.getPositions}?address=${this.walletAddress}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }

      const positions = await response.json();
      
      if (!positions || positions.length === 0) {
        console.log('ℹ️ No open positions to close');
        return { success: true };
      }

      console.log(`📊 Found ${positions.length} open positions to close`);

      // Close each position
      for (const position of positions) {
        const closeRequest = {
          request: {
            address: this.walletAddress,
            asset: position.asset,
            assetTicker: position.assetTicker,
            outRef: position.outRef
          }
        };

        const closeResponse = await this.strikeProxy.makeStrikeRequest(
          this.STRIKE_API.closePosition,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(closeRequest)
          }
        );

        if (closeResponse.ok) {
          const result = await closeResponse.json();
          if (result.cbor) {
            await this.signAndSubmitCBOR(result.cbor);
            console.log(`✅ Closed position: ${position.assetTicker}`);
          }
        }
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to close positions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close positions'
      };
    }
  }

  /**
   * Sign and submit CBOR transaction using Railway service
   */
  private async signAndSubmitCBOR(cbor: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      const cardanoServiceUrl = process.env.NEXT_PUBLIC_CARDANO_SERVICE_URL || 
                                'https://friendly-reprieve-production.up.railway.app';
      
      console.log('🔐 Signing CBOR with Railway service...');
      
      // Note: In production, the seed phrase should be encrypted and stored securely
      // For now, we'll need to pass it to the Railway service
      const response = await fetch(`${cardanoServiceUrl}/sign-submit-tx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: this.walletAddress,
          cbor: cbor,
          agentSeed: this.walletSeed // Pass seed for signing (encrypted in production)
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Railway service error: ${error}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Transaction signing failed');
      }

      console.log(`✅ Transaction signed and submitted: ${result.txHash}`);
      
      return {
        success: true,
        txHash: result.txHash
      };

    } catch (error) {
      console.error('❌ CBOR signing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Signing failed'
      };
    }
  }

  /**
   * Monitor positions and P&L
   */
  async monitorPositions(): Promise<{
    positions: any[];
    totalPnL: number;
  }> {
    if (!this.isInitialized) {
      return { positions: [], totalPnL: 0 };
    }

    try {
      const response = await this.strikeProxy.makeStrikeRequest(
        `${this.STRIKE_API.getPositions}?address=${this.walletAddress}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }

      const positions = await response.json();
      let totalPnL = 0;

      for (const position of positions) {
        // Calculate P&L based on current price vs entry price
        const pnl = position.unrealizedPnL || 0;
        totalPnL += pnl;
        
        console.log(`📊 Position ${position.assetTicker}:`, {
          side: position.side,
          collateral: position.collateralAmount,
          leverage: position.leverage,
          pnl: pnl
        });
      }

      return { positions, totalPnL };

    } catch (error) {
      console.error('❌ Failed to monitor positions:', error);
      return { positions: [], totalPnL: 0 };
    }
  }

  /**
   * Get current ADA price from Strike Finance
   */
  async getCurrentPrice(): Promise<number> {
    try {
      const response = await this.strikeProxy.makeStrikeRequest(
        `${this.STRIKE_API.getAssetInfo}?asset=ADA`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch ADA price');
      }

      const data = await response.json();
      return parseFloat(data.price || '0');

    } catch (error) {
      console.error('❌ Failed to get ADA price:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const strikeTrader = new StrikeAutonomousTrader();