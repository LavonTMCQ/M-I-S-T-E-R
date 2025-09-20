/**
 * Provider Interfaces - Barrel Export
 * 
 * Centralized exports for all provider interfaces and types
 */

// Core Provider Interface
export type {
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
} from './ITradingProvider';

export {
  ProviderError,
  InsufficientBalanceError,
  UnsupportedAssetError,
} from './ITradingProvider';

// Wallet Connector Interface
export type {
  IWalletConnector,
  IMultiChainWalletAdapter,
  TransactionPayload,
  CardanoTxPayload,
  EvmTxPayload,
  EIP712TypedData,
  WalletConnectionResult,
  WalletAddresses,
  SignatureResult,
  WalletInfo,
  AvailableWallet,
  WalletType,
  WalletPreferences,
  CardanoWalletApi,
  EthereumProvider,
} from './IWalletConnector';

export {
  WalletError,
  UnsupportedChainError,
  WalletNotInstalledError,
} from './IWalletConnector';

// Shared Types
export type {
  ProviderName,
  ProviderRegistry,
  ProviderHealthStatus,
  ProviderFees,
  ProviderLimits,
  ProviderFeatures,
  RateLimitConfig,
  RoutingDecision,
  RoutingReason,
  ExecutionCostBreakdown,
  ExecutionContext,
  TradingStrategy,
  UserExecutionPreferences,
  ShadowModeResult,
  AggregatedPosition,
  LiquidationRisk,
  ProviderEvent,
  ProviderEventType,
  Timestamp,
  PricePoint,
  VolumeData,
} from './types';

export {
  SUPPORTED_ASSETS,
  DEFAULT_EXECUTION_WEIGHTS,
  PROVIDER_PRIORITIES,
} from './types';