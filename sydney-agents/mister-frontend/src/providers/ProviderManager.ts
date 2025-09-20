/**
 * ProviderManager - Central Provider Orchestration Service
 * 
 * This service manages all trading providers, handles routing decisions,
 * monitors provider health, and provides a unified interface for all
 * trading operations across multiple providers.
 */

import { 
  ITradingProvider,
  ProviderConfig,
  ProviderName,
  ProviderRegistry,
  ProviderHealthStatus,
  RoutingDecision,
  ExecutionContext,
  AbstractOrderParams,
  OrderResult,
  Position,
  AccountState,
  ProviderError,
  UnsupportedAssetError
} from './interfaces';

import { StrikeProvider } from './implementations/StrikeProvider';
import { MockProvider } from './implementations/MockProvider';
import { HyperliquidProvider } from './implementations/HyperliquidProvider';

// Provider configurations
const PROVIDER_CONFIGS: { [key in ProviderName]: ProviderConfig } = {
  strike: {
    name: 'strike',
    displayName: 'Strike Finance',
    enabled: true,
    chainType: 'cardano',
    apiUrl: process.env.NEXT_PUBLIC_CARDANO_SERVICE_URL || 'https://friendly-reprieve-production.up.railway.app',
    websocketUrl: undefined,
    minPositionSizeUsd: 40,
    maxPositionSizeUsd: 100000,
    supportedAssets: ['ADA-PERP', 'ADA/USD'],
    fees: {
      makerRate: 0.001,  // 0.1% maker fee
      takerRate: 0.002,  // 0.2% taker fee
      withdrawalFee: 2   // $2 withdrawal fee
    },
    limits: {
      maxLeverage: 10,
      minOrderSize: 40,
      maxOrderSize: 100000,
      maxOpenPositions: 10
    },
    features: {
      supportsStopLoss: true,
      supportsTakeProfit: true,
      supportsTrailingStop: false,
      supportsConditionalOrders: false,
      supportsMarginTrading: true,
      supportsSpotTrading: false,
      supportsCrossMargin: false,
      supportsIsolatedMargin: true
    },
    rateLimit: {
      requestsPerSecond: 5,
      requestsPerMinute: 100,
      burstLimit: 10
    },
    timeout: 30000
  },

  hyperliquid: {
    name: 'hyperliquid',
    displayName: 'Hyperliquid',
    enabled: false, // Feature flag - disabled by default
    chainType: 'evm',
    apiUrl: 'https://api.hyperliquid.xyz',
    testnetUrl: 'https://api.hyperliquid-testnet.xyz',
    websocketUrl: 'wss://api.hyperliquid.xyz/ws',
    minPositionSizeUsd: 10,
    maxPositionSizeUsd: 1000000,
    supportedAssets: ['ADA-PERP', 'BTC-PERP', 'ETH-PERP', 'SOL-PERP'],
    fees: {
      makerRate: 0.0002,  // 0.02% maker fee
      takerRate: 0.0005,  // 0.05% taker fee
      withdrawalFee: 0    // No withdrawal fee
    },
    limits: {
      maxLeverage: 20,
      minOrderSize: 10,
      maxOrderSize: 1000000,
      maxOpenPositions: 50
    },
    features: {
      supportsStopLoss: true,
      supportsTakeProfit: true,
      supportsTrailingStop: true,
      supportsConditionalOrders: true,
      supportsMarginTrading: true,
      supportsSpotTrading: true,
      supportsCrossMargin: true,
      supportsIsolatedMargin: true
    },
    rateLimit: {
      requestsPerSecond: 20,
      requestsPerMinute: 1000,
      burstLimit: 50
    },
    timeout: 5000
  },

  mock: {
    name: 'mock',
    displayName: 'Mock Provider (Testing)',
    enabled: process.env.NODE_ENV === 'development',
    chainType: 'evm',
    apiUrl: 'mock://localhost',
    minPositionSizeUsd: 1,
    maxPositionSizeUsd: 10000,
    supportedAssets: ['ADA-PERP', 'BTC-PERP', 'ETH-PERP', 'SOL-PERP'],
    fees: {
      makerRate: 0.001,
      takerRate: 0.002,
      withdrawalFee: 0
    },
    limits: {
      maxLeverage: 10,
      minOrderSize: 1,
      maxOrderSize: 10000,
      maxOpenPositions: 20
    },
    features: {
      supportsStopLoss: true,
      supportsTakeProfit: true,
      supportsTrailingStop: true,
      supportsConditionalOrders: true,
      supportsMarginTrading: true,
      supportsSpotTrading: true,
      supportsCrossMargin: true,
      supportsIsolatedMargin: true
    },
    timeout: 100
  }
};

export class ProviderManager {
  private static instance: ProviderManager;
  private providers: ProviderRegistry = {};
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private assetCache: Map<string, string[]> = new Map(); // asset -> [provider names]
  private cacheExpiry: Map<string, number> = new Map();

  private constructor() {
    this.initializeProviders();
    this.startHealthMonitoring();
  }

  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  // Provider Initialization
  private initializeProviders(): void {
    console.log('🚀 [Provider Manager] Initializing providers...');

    for (const [name, config] of Object.entries(PROVIDER_CONFIGS)) {
      if (!config.enabled) {
        console.log(`⏸️ [Provider Manager] Skipping disabled provider: ${name}`);
        continue;
      }

      try {
        let providerInstance: ITradingProvider;

        switch (name) {
          case 'strike':
            providerInstance = new StrikeProvider(config);
            break;
          case 'mock':
            providerInstance = new MockProvider(config);
            break;
          case 'hyperliquid':
            providerInstance = new HyperliquidProvider(config);
            break;
          default:
            console.warn(`⚠️ [Provider Manager] Unknown provider: ${name}`);
            continue;
        }

        this.providers[name] = {
          instance: providerInstance,
          config,
          isActive: true,
          lastHealthCheck: new Date().toISOString(),
          healthStatus: {
            status: 'healthy',
            lastSuccessfulOperation: new Date().toISOString(),
            errorCount: 0,
            averageLatency: 0,
            uptime: 1.0
          }
        };

        console.log(`✅ [Provider Manager] Initialized provider: ${config.displayName}`);

      } catch (error) {
        console.error(`❌ [Provider Manager] Failed to initialize provider ${name}:`, error);
      }
    }

    console.log(`🎯 [Provider Manager] Initialized ${Object.keys(this.providers).length} providers`);
  }

  // Health Monitoring
  private startHealthMonitoring(): void {
    // Check provider health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000);

    console.log('🏥 [Provider Manager] Health monitoring started');
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Object.entries(this.providers).map(async ([name, providerData]) => {
      try {
        const startTime = Date.now();
        const isHealthy = await providerData.instance.isHealthy();
        const latency = Date.now() - startTime;

        const healthStatus: ProviderHealthStatus = {
          status: isHealthy ? 'healthy' : 'degraded',
          lastSuccessfulOperation: isHealthy ? new Date().toISOString() : providerData.healthStatus.lastSuccessfulOperation,
          errorCount: isHealthy ? 0 : providerData.healthStatus.errorCount + 1,
          averageLatency: (providerData.healthStatus.averageLatency + latency) / 2,
          uptime: isHealthy ? Math.min(providerData.healthStatus.uptime + 0.01, 1.0) : providerData.healthStatus.uptime * 0.95
        };

        this.providers[name] = {
          ...providerData,
          isActive: isHealthy,
          lastHealthCheck: new Date().toISOString(),
          healthStatus
        };

        console.log(`🏥 [Provider Manager] Health check ${name}: ${isHealthy ? '✅' : '❌'} (${latency}ms)`);

      } catch (error) {
        console.error(`❌ [Provider Manager] Health check failed for ${name}:`, error);
        
        this.providers[name].healthStatus.status = 'down';
        this.providers[name].healthStatus.errorCount++;
        this.providers[name].isActive = false;
      }
    });

    await Promise.allSettled(promises);
  }

  // Provider Access
  getProvider(name: ProviderName): ITradingProvider | null {
    const providerData = this.providers[name];
    return providerData?.isActive ? providerData.instance : null;
  }

  getActiveProviders(): ITradingProvider[] {
    return Object.values(this.providers)
      .filter(data => data.isActive)
      .map(data => data.instance);
  }

  getProviderConfig(name: ProviderName): ProviderConfig | null {
    return this.providers[name]?.config || null;
  }

  // Asset Support
  async getProvidersForAsset(asset: string): Promise<ProviderName[]> {
    const cacheKey = asset.toUpperCase();
    const now = Date.now();
    
    // Check cache
    if (this.assetCache.has(cacheKey) && (this.cacheExpiry.get(cacheKey) || 0) > now) {
      return this.assetCache.get(cacheKey)!;
    }

    // Query providers
    const supportingProviders: ProviderName[] = [];
    
    const promises = Object.entries(this.providers).map(async ([name, providerData]) => {
      if (!providerData.isActive) return;
      
      try {
        const supports = await providerData.instance.supportsAsset(asset);
        if (supports) {
          supportingProviders.push(name as ProviderName);
        }
      } catch (error) {
        console.warn(`⚠️ [Provider Manager] Asset check failed for ${name}:`, error);
      }
    });

    await Promise.allSettled(promises);

    // Cache result for 1 hour
    this.assetCache.set(cacheKey, supportingProviders);
    this.cacheExpiry.set(cacheKey, now + 3600000);

    console.log(`🎯 [Provider Manager] Asset ${asset} supported by: [${supportingProviders.join(', ')}]`);
    
    return supportingProviders;
  }

  // Routing and Best Execution
  async routeOrder(orderParams: AbstractOrderParams, context?: ExecutionContext): Promise<RoutingDecision> {
    console.log('🧭 [Provider Manager] Routing order:', orderParams);

    // Get providers that support this asset
    const supportingProviders = await this.getProvidersForAsset(orderParams.asset);

    if (supportingProviders.length === 0) {
      throw new UnsupportedAssetError('any', orderParams.asset);
    }

    // If only one provider supports the asset, use it
    if (supportingProviders.length === 1) {
      return {
        selectedProvider: supportingProviders[0],
        reason: 'only_supported_asset',
        score: 1.0,
        executionCost: {
          slippageCost: 0,
          tradingFees: 0,
          totalCost: 0,
          costPercentage: 0
        },
        alternativeProviders: []
      };
    }

    // Calculate best execution for each provider
    const executionOptions = await Promise.allSettled(
      supportingProviders.map(async (providerName) => {
        const provider = this.getProvider(providerName);
        const config = this.getProviderConfig(providerName);
        
        if (!provider || !config) {
          throw new Error(`Provider ${providerName} not available`);
        }

        // Calculate execution cost
        const orderValue = orderParams.size * (orderParams.price || 1);
        const tradingFee = orderValue * (orderParams.type === 'market' ? config.fees.takerRate : config.fees.makerRate);
        const slippageCost = this.estimateSlippage(orderParams, config);

        return {
          provider: providerName,
          score: this.calculateProviderScore(config, orderValue, tradingFee, slippageCost, context),
          executionCost: {
            slippageCost,
            tradingFees: tradingFee,
            fundingCost: 0, // TODO: Calculate funding cost
            networkFees: 0, // TODO: Calculate network fees
            totalCost: tradingFee + slippageCost,
            costPercentage: (tradingFee + slippageCost) / orderValue
          }
        };
      })
    );

    // Find best execution option
    const validOptions = executionOptions
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)
      .sort((a, b) => b.score - a.score);

    if (validOptions.length === 0) {
      throw new ProviderError('No providers available for execution', 'any', 'execution');
    }

    const bestOption = validOptions[0];
    const alternatives = validOptions.slice(1).map(option => ({
      provider: option.provider,
      score: option.score,
      reason: `Score: ${option.score.toFixed(3)}, Cost: ${option.executionCost.costPercentage.toFixed(4)}%`
    }));

    return {
      selectedProvider: bestOption.provider,
      reason: 'best_execution_cost',
      score: bestOption.score,
      executionCost: bestOption.executionCost,
      alternativeProviders: alternatives
    };
  }

  // Execute order with automatic routing
  async executeOrder(orderParams: AbstractOrderParams, context?: ExecutionContext): Promise<OrderResult> {
    try {
      console.log('⚡ [Provider Manager] Executing order:', orderParams);

      // Route order to best provider
      const routing = await this.routeOrder(orderParams, context);
      const provider = this.getProvider(routing.selectedProvider);

      if (!provider) {
        throw new ProviderError(`Selected provider ${routing.selectedProvider} not available`, routing.selectedProvider, 'connection');
      }

      console.log(`🎯 [Provider Manager] Routing to ${routing.selectedProvider} (score: ${routing.score.toFixed(3)})`);

      // Execute order
      const result = await provider.placeOrder(orderParams);

      // Track execution metrics
      this.trackExecutionMetrics(routing.selectedProvider, result, routing.executionCost);

      return result;

    } catch (error) {
      console.error('❌ [Provider Manager] Order execution failed:', error);
      
      // TODO: Implement failover logic here
      
      throw error;
    }
  }

  // Position Management
  async getAllPositionsAcrossProviders(): Promise<{ [provider: string]: Position[] }> {
    const allPositions: { [provider: string]: Position[] } = {};

    const promises = Object.entries(this.providers).map(async ([name, providerData]) => {
      if (!providerData.isActive) return;

      try {
        const positions = await providerData.instance.getAllPositions();
        allPositions[name] = positions;
      } catch (error) {
        console.warn(`⚠️ [Provider Manager] Failed to get positions from ${name}:`, error);
        allPositions[name] = [];
      }
    });

    await Promise.allSettled(promises);

    return allPositions;
  }

  // Provider Management
  enableProvider(name: ProviderName): void {
    if (this.providers[name]) {
      this.providers[name].isActive = true;
      console.log(`✅ [Provider Manager] Enabled provider: ${name}`);
    }
  }

  disableProvider(name: ProviderName): void {
    if (this.providers[name]) {
      this.providers[name].isActive = false;
      console.log(`⏸️ [Provider Manager] Disabled provider: ${name}`);
    }
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.providers = {};
    this.assetCache.clear();
    this.cacheExpiry.clear();
    
    console.log('🧹 [Provider Manager] Cleaned up');
  }

  // Private Helper Methods
  private estimateSlippage(orderParams: AbstractOrderParams, config: ProviderConfig): number {
    // Simplified slippage estimation
    const orderValue = orderParams.size * (orderParams.price || 1);
    const slippageRate = orderParams.type === 'market' ? 0.001 : 0; // 0.1% for market orders
    
    return orderValue * slippageRate;
  }

  private calculateProviderScore(
    config: ProviderConfig, 
    orderValue: number,
    tradingFee: number,
    slippageCost: number,
    context?: ExecutionContext
  ): number {
    // Base score from provider health
    const healthScore = this.providers[config.name]?.healthStatus.uptime || 0;
    
    // Cost efficiency score (lower cost = higher score)
    const totalCostPct = (tradingFee + slippageCost) / orderValue;
    const costScore = Math.max(0, 1 - totalCostPct * 100); // Penalize high cost percentages
    
    // Latency score
    const avgLatency = this.providers[config.name]?.healthStatus.averageLatency || 1000;
    const latencyScore = Math.max(0, 1 - avgLatency / 5000); // Penalize >5s latency
    
    // Strategy-based weighting
    const weights = this.getStrategyWeights(context?.strategy);
    
    return (
      healthScore * weights.health +
      costScore * weights.cost +
      latencyScore * weights.latency
    );
  }

  private getStrategyWeights(strategy?: string) {
    switch (strategy) {
      case 'scalping':
        return { health: 0.3, cost: 0.2, latency: 0.5 };
      case 'swing':
      case 'position':
        return { health: 0.4, cost: 0.6, latency: 0.0 };
      default:
        return { health: 0.4, cost: 0.4, latency: 0.2 };
    }
  }

  private trackExecutionMetrics(provider: ProviderName, result: OrderResult, cost: any): void {
    // TODO: Implement metrics tracking
    console.log(`📊 [Provider Manager] Execution metrics for ${provider}:`, {
      success: result.success,
      cost: cost.totalCost,
      costPercentage: cost.costPercentage
    });
  }
}