/**
 * Signal Types - Main Export File
 * 
 * Centralized exports for all signal-related TypeScript interfaces and types.
 * This provides a clean API for importing signal types throughout the application.
 * 
 * Usage:
 * ```typescript
 * import { TradingSignal, SignalType, StrikeFinanceTradeRequest } from '@/types/signals';
 * ```
 */

// Core signal types
export type {
  // Basic types
  SignalType,
  SignalStatus,
  TradingPattern,
  
  // Core interfaces
  TechnicalIndicators,
  RiskParameters,
  AlgorithmMetadata,
  TradingSignal,
  SignalExecution,
  
  // Request/Response types
  SignalGenerationRequest,
  SignalGenerationResponse,
  SignalValidation,
} from './core';

// Core utility functions
export {
  isTradingSignal,
  isExecutableSignal,
} from './core';

// Strike Finance integration types
export type {
  // Trade execution
  StrikeFinanceTradeRequest,
  StrikeFinanceTradeResponse,
  StrikeFinancePosition,
  StrikeFinanceConfig,
  StrikeFinanceClient,
  
  // One-click execution
  OneClickExecutionRequest,
  OneClickExecutionResponse,
  PreExecutionValidation,
} from './strike-finance';

// Strike Finance utility functions
export {
  signalToStrikeFinanceRequest,
} from './strike-finance';

// Discord notification types
export type {
  // Basic notification types
  NotificationType,
  NotificationPriority,
  
  // Notification interfaces
  DiscordNotification,
  DiscordEmbed,
  DiscordEmbedField,
  
  // Specific notification types
  SignalGeneratedNotification,
  SignalExecutedNotification,
  SignalFailedNotification,
  PositionUpdateNotification,
  
  // Configuration and preferences
  DiscordBotConfig,
  UserNotificationPreferences,
  NotificationDeliveryStatus,
} from './notifications';

// Discord constants and utilities
export {
  DISCORD_COLORS,
  createSignalNotification,
  createExecutionNotification,
} from './notifications';

// Dashboard and UI types
export type {
  // Time and filters
  DashboardTimeRange,
  SignalDashboardFilters,
  
  // Performance and metrics
  SignalPerformanceMetrics,
  DashboardSummary,
  
  // List items
  SignalListItem,
  PositionListItem,
  
  // Charts and visualization
  ChartDataPoint,
  ChartConfig,
  
  // Dashboard configuration
  DashboardWidget,
  DashboardLayout,
  UserDashboardPreferences,
  
  // Real-time updates
  DashboardUpdate,
  DashboardApiResponse,
  
  // Execution confirmation
  ExecutionConfirmationData,
  
  // Error handling
  DashboardError,
  DashboardErrorDetails,
} from './dashboard';

// Validation types and utilities
export type {
  // Validation results
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SignalValidationConstraints,
} from './validation';

// Validation constants and functions
export {
  DEFAULT_VALIDATION_CONSTRAINTS,
  validateTradingSignal,
  validateStrikeFinanceRequest,
  sanitizeSignal,
  isSignalExecutable,
  getValidationSummary,
} from './validation';

/**
 * Common type unions for convenience
 */
export type AnySignalNotification = 
  | SignalGeneratedNotification
  | SignalExecutedNotification
  | SignalFailedNotification
  | PositionUpdateNotification;

export type AnyDashboardWidget = DashboardWidget;

export type AnyValidationResult = ValidationResult;

/**
 * Type guards for runtime type checking
 */
export function isSignalGeneratedNotification(
  notification: DiscordNotification
): notification is SignalGeneratedNotification {
  return notification.type === 'signal_generated';
}

export function isSignalExecutedNotification(
  notification: DiscordNotification
): notification is SignalExecutedNotification {
  return notification.type === 'signal_executed';
}

export function isSignalFailedNotification(
  notification: DiscordNotification
): notification is SignalFailedNotification {
  return notification.type === 'signal_failed';
}

/**
 * Utility type for partial signal updates
 */
export type PartialSignalUpdate = Partial<Pick<TradingSignal, 
  | 'status' 
  | 'execution' 
  | 'confidence'
  | 'expires_at'
>>;

/**
 * Utility type for signal creation
 */
export type SignalCreationData = Omit<TradingSignal, 
  | 'id' 
  | 'status' 
  | 'execution'
> & {
  id?: string;
  status?: SignalStatus;
};

/**
 * Utility type for dashboard widget data
 */
export type WidgetData<T = any> = {
  loading: boolean;
  data: T | null;
  error: string | null;
  last_updated: string;
};

/**
 * Common API response wrapper
 */
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  request_id?: string;
};

/**
 * WebSocket message types for real-time updates
 */
export type WebSocketMessage = 
  | { type: 'signal_new'; data: TradingSignal }
  | { type: 'signal_updated'; data: { id: string; updates: PartialSignalUpdate } }
  | { type: 'execution_started'; data: { signal_id: string; execution: SignalExecution } }
  | { type: 'execution_completed'; data: { signal_id: string; execution: SignalExecution } }
  | { type: 'position_updated'; data: StrikeFinancePosition }
  | { type: 'balance_updated'; data: { wallet_address: string; balance: number } }
  | { type: 'error'; data: { message: string; code?: string } };

/**
 * Configuration for signal generation service
 */
export interface SignalServiceConfig {
  /** Polling interval in seconds */
  polling_interval: number;
  
  /** Minimum confidence threshold */
  min_confidence: number;
  
  /** Maximum signals per hour */
  max_signals_per_hour: number;
  
  /** Enabled trading patterns */
  enabled_patterns: TradingPattern[];
  
  /** Risk management settings */
  risk_settings: {
    max_position_size: number;
    default_stop_loss_pct: number;
    default_take_profit_pct: number;
  };
  
  /** API endpoints */
  endpoints: {
    ada_algorithm: string;
    strike_finance: string;
    discord_webhook?: string;
  };
}

/**
 * Signal service status
 */
export interface SignalServiceStatus {
  /** Service running status */
  running: boolean;
  
  /** Last signal generation time */
  last_signal_time: string | null;
  
  /** Signals generated today */
  signals_today: number;
  
  /** Service health */
  health: 'healthy' | 'warning' | 'error';
  
  /** Current errors */
  errors: string[];
  
  /** Service uptime */
  uptime_seconds: number;
}

/**
 * Export version information
 */
export const SIGNAL_TYPES_VERSION = '1.0.0';

/**
 * Export type metadata for runtime introspection
 */
export const TYPE_METADATA = {
  version: SIGNAL_TYPES_VERSION,
  core_types: [
    'TradingSignal',
    'SignalExecution',
    'TechnicalIndicators',
    'RiskParameters',
    'AlgorithmMetadata',
  ],
  strike_finance_types: [
    'StrikeFinanceTradeRequest',
    'StrikeFinanceTradeResponse',
    'StrikeFinancePosition',
    'OneClickExecutionRequest',
    'OneClickExecutionResponse',
  ],
  notification_types: [
    'DiscordNotification',
    'SignalGeneratedNotification',
    'SignalExecutedNotification',
    'UserNotificationPreferences',
  ],
  dashboard_types: [
    'SignalDashboardFilters',
    'SignalPerformanceMetrics',
    'DashboardSummary',
    'SignalListItem',
    'PositionListItem',
  ],
  validation_types: [
    'ValidationResult',
    'SignalValidationConstraints',
  ],
} as const;