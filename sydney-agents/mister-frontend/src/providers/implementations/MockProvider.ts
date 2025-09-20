/**
 * MockProvider - Testing and Development Provider
 * 
 * A mock implementation of ITradingProvider for testing, development,
 * and shadow mode validation. Simulates realistic trading behavior
 * without executing real trades.
 */

import { 
  ITradingProvider,
  AbstractOrderParams,
  OrderResult,
  OrderStatus,
  Position,
  AccountState,
  TransactionReceipt,
  OrderBook,
  ProviderMetrics,
  ProviderConfig,
  ProviderError,
  InsufficientBalanceError,
  UnsupportedAssetError
} from '../interfaces';

interface MockOrderData {
  id: string;
  params: AbstractOrderParams;
  status: OrderStatus;
  filledSize: number;
  averagePrice: number;
  timestamp: string;
}

interface MockPositionData {
  asset: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  timestamp: string;
}

export class MockProvider implements ITradingProvider {
  private config: ProviderConfig;
  private orders: Map<string, MockOrderData> = new Map();
  private positions: Map<string, MockPositionData> = new Map();
  private accountBalance = 10000; // Mock account with $10k
  private isHealthy = true;
  private latencyMs = 100;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  // Provider Identification
  getProviderName(): string {
    return 'mock';
  }

  getChainType(): 'cardano' | 'evm' {
    return 'evm'; // Mock as EVM for testing
  }

  // Asset Support
  async supportsAsset(asset: string): Promise<boolean> {
    const supportedAssets = ['ADA-PERP', 'BTC-PERP', 'ETH-PERP', 'SOL-PERP'];
    return supportedAssets.includes(asset.toUpperCase());
  }

  async getSupportedAssets(): Promise<string[]> {
    return ['ADA-PERP', 'BTC-PERP', 'ETH-PERP', 'SOL-PERP'];
  }

  // Core Trading Operations
  async placeOrder(orderParams: AbstractOrderParams): Promise<OrderResult> {
    // Simulate API latency
    await this.simulateLatency();

    try {
      console.log('🧪 [Mock Provider] Placing order:', orderParams);

      // Validate asset support
      if (!await this.supportsAsset(orderParams.asset)) {
        throw new UnsupportedAssetError('mock', orderParams.asset);
      }

      // Generate order ID
      const orderId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate market price
      const marketPrice = this.getSimulatedPrice(orderParams.asset);
      const executionPrice = orderParams.type === 'market' 
        ? marketPrice 
        : (orderParams.price || marketPrice);

      // Check if we have sufficient balance
      const orderValue = orderParams.size * executionPrice;
      if (orderValue > this.accountBalance) {
        throw new InsufficientBalanceError('mock', orderValue, this.accountBalance);
      }

      // Create order record
      const orderData: MockOrderData = {
        id: orderId,
        params: orderParams,
        status: 'filled', // Mock orders fill immediately
        filledSize: orderParams.size,
        averagePrice: executionPrice,
        timestamp: new Date().toISOString()
      };

      this.orders.set(orderId, orderData);

      // Update position
      await this.updatePosition(orderParams, executionPrice);

      return {
        success: true,
        orderId,
        status: 'filled',
        filledSize: orderParams.size,
        averagePrice: executionPrice,
        executionId: `mock_exec_${orderId}`,
        providerData: {
          simulatedExecution: true,
          mockLatency: this.latencyMs
        }
      };

    } catch (error) {
      console.error('❌ [Mock Provider] Order placement failed:', error);
      
      return {
        success: false,
        status: 'rejected',
        error: {
          type: error instanceof UnsupportedAssetError || error instanceof InsufficientBalanceError 
            ? 'validation' : 'provider',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        }
      };
    }
  }

  async cancelOrder(orderId: string, asset: string): Promise<boolean> {
    await this.simulateLatency();

    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    if (order.status === 'filled') {
      return false; // Cannot cancel filled order
    }

    order.status = 'cancelled';
    this.orders.set(orderId, order);
    
    console.log('🚫 [Mock Provider] Order cancelled:', orderId);
    return true;
  }

  async getOrderStatus(orderId: string, asset: string): Promise<OrderStatus> {
    await this.simulateLatency();

    const order = this.orders.get(orderId);
    return order?.status || 'rejected';
  }

  // Position Management
  async getPosition(asset: string): Promise<Position | null> {
    await this.simulateLatency();

    const positionData = this.positions.get(asset);
    if (!positionData) {
      return null;
    }

    return {
      asset: positionData.asset,
      side: positionData.side,
      size: positionData.size,
      entryPrice: positionData.entryPrice,
      markPrice: positionData.currentPrice,
      liquidationPrice: this.calculateLiquidationPrice(positionData),
      unrealizedPnl: positionData.unrealizedPnl,
      realizedPnl: 0, // Mock doesn't track realized P&L
      margin: positionData.size * positionData.entryPrice * 0.1, // 10% margin
      leverage: 10,
      timestamp: positionData.timestamp,
      providerPositionId: `mock_pos_${asset}`
    };
  }

  async getAllPositions(): Promise<Position[]> {
    await this.simulateLatency();

    const positions: Position[] = [];
    
    for (const asset of this.positions.keys()) {
      const position = await this.getPosition(asset);
      if (position) {
        positions.push(position);
      }
    }

    return positions;
  }

  // Account State
  async getAccountState(): Promise<AccountState> {
    await this.simulateLatency();

    const positions = await this.getAllPositions();
    const totalUnrealizedPnl = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
    const totalMargin = positions.reduce((sum, pos) => sum + pos.margin, 0);

    return {
      totalCollateralValue: this.accountBalance,
      freeCollateral: this.accountBalance - totalMargin,
      usedMargin: totalMargin,
      marginRatio: totalMargin > 0 ? (this.accountBalance + totalUnrealizedPnl) / totalMargin : 1,
      unrealizedPnl: totalUnrealizedPnl,
      realizedPnl: 0,
      availableWithdrawal: this.accountBalance - totalMargin,
      portfolioValue: this.accountBalance + totalUnrealizedPnl
    };
  }

  // Collateral Management
  async deposit(amount: number, asset: string): Promise<TransactionReceipt> {
    await this.simulateLatency();

    this.accountBalance += amount;

    return {
      success: true,
      transactionId: `mock_deposit_${Date.now()}`,
      amount,
      asset,
      timestamp: new Date().toISOString(),
      status: 'confirmed',
      confirmations: 1
    };
  }

  async withdraw(amount: number, asset: string): Promise<TransactionReceipt> {
    await this.simulateLatency();

    if (amount > this.accountBalance) {
      return {
        success: false,
        transactionId: '',
        amount,
        asset,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: 'Insufficient balance for withdrawal'
      };
    }

    this.accountBalance -= amount;

    return {
      success: true,
      transactionId: `mock_withdrawal_${Date.now()}`,
      amount,
      asset,
      timestamp: new Date().toISOString(),
      status: 'confirmed',
      confirmations: 1
    };
  }

  // Market Data
  async getOrderBook(asset: string): Promise<OrderBook> {
    await this.simulateLatency();

    const midPrice = this.getSimulatedPrice(asset);
    const spread = midPrice * 0.001; // 0.1% spread

    return {
      asset,
      timestamp: new Date().toISOString(),
      bids: [
        [midPrice - spread/2, 100],
        [midPrice - spread, 200],
        [midPrice - spread*1.5, 150]
      ],
      asks: [
        [midPrice + spread/2, 100],
        [midPrice + spread, 200],
        [midPrice + spread*1.5, 150]
      ],
      spread: spread,
      midPrice: midPrice
    };
  }

  async getMarketPrice(asset: string): Promise<number> {
    await this.simulateLatency();
    return this.getSimulatedPrice(asset);
  }

  // Provider Health
  async isHealthy(): Promise<boolean> {
    await this.simulateLatency();
    return this.isHealthy;
  }

  async getProviderMetrics(): Promise<ProviderMetrics> {
    await this.simulateLatency();

    return {
      uptime: this.isHealthy ? 0.999 : 0.5,
      avgLatency: this.latencyMs,
      lastSuccessfulCall: new Date().toISOString(),
      errorRate: this.isHealthy ? 0.001 : 0.1,
      maintenanceMode: false,
      supportedAssets: await this.getSupportedAssets()
    };
  }

  // Mock-specific methods for testing
  setHealthy(healthy: boolean): void {
    this.isHealthy = healthy;
  }

  setLatency(latencyMs: number): void {
    this.latencyMs = latencyMs;
  }

  setAccountBalance(balance: number): void {
    this.accountBalance = balance;
  }

  clearPositions(): void {
    this.positions.clear();
    this.orders.clear();
  }

  // Private Helper Methods
  private async simulateLatency(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs));
    }
  }

  private getSimulatedPrice(asset: string): number {
    // Return simulated prices with some randomness
    const basePrices: { [key: string]: number } = {
      'ADA-PERP': 0.80,
      'BTC-PERP': 45000,
      'ETH-PERP': 3000,
      'SOL-PERP': 100
    };

    const basePrice = basePrices[asset.toUpperCase()] || 1;
    const randomFactor = 0.98 + Math.random() * 0.04; // ±2% randomness
    
    return basePrice * randomFactor;
  }

  private async updatePosition(orderParams: AbstractOrderParams, executionPrice: number): Promise<void> {
    const existingPosition = this.positions.get(orderParams.asset);
    
    if (!existingPosition) {
      // Create new position
      const positionData: MockPositionData = {
        asset: orderParams.asset,
        side: orderParams.side === 'buy' ? 'long' : 'short',
        size: orderParams.size,
        entryPrice: executionPrice,
        currentPrice: executionPrice,
        unrealizedPnl: 0,
        timestamp: new Date().toISOString()
      };
      
      this.positions.set(orderParams.asset, positionData);
    } else {
      // Update existing position (simplified - would need proper averaging)
      const totalSize = existingPosition.size + 
        (orderParams.side === 'buy' ? orderParams.size : -orderParams.size);
      
      if (totalSize === 0) {
        // Position closed
        this.positions.delete(orderParams.asset);
      } else {
        existingPosition.size = Math.abs(totalSize);
        existingPosition.side = totalSize > 0 ? 'long' : 'short';
        // Simplified - should properly calculate weighted average
        existingPosition.entryPrice = (existingPosition.entryPrice + executionPrice) / 2;
        
        this.positions.set(orderParams.asset, existingPosition);
      }
    }
  }

  private calculateLiquidationPrice(position: MockPositionData): number {
    // Simplified liquidation price calculation
    const leverage = 10;
    const liquidationBuffer = 0.05; // 5% buffer
    
    if (position.side === 'long') {
      return position.entryPrice * (1 - (1/leverage) + liquidationBuffer);
    } else {
      return position.entryPrice * (1 + (1/leverage) - liquidationBuffer);
    }
  }
}