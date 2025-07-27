/**
 * Signal Dashboard Types
 * 
 * Type definitions for the signal dashboard UI components,
 * performance tracking, and user interface elements.
 */

import { TradingSignal, SignalStatus, TradingPattern } from './core';
import { StrikeFinancePosition } from './strike-finance';

/**
 * Dashboard time range filters
 */
export type DashboardTimeRange = '1h' | '4h' | '1d' | '3d' | '1w' | '1m' | '3m' | 'all';

/**
 * Signal dashboard filter options
 */
export interface SignalDashboardFilters {
  /** Time range */
  time_range: DashboardTimeRange;
  
  /** Signal status filter */
  status: SignalStatus | 'all';
  
  /** Signal type filter */
  type: 'long' | 'short' | 'all';
  
  /** Minimum confidence */
  min_confidence: number;
  
  /** Trading patterns */
  patterns: TradingPattern[] | 'all';
  
  /** Algorithm filter */
  algorithms: string[] | 'all';
}

/**
 * Signal performance metrics
 */
export interface SignalPerformanceMetrics {
  /** Total signals generated */
  total_signals: number;
  
  /** Executed signals */
  executed_signals: number;
  
  /** Win rate percentage */
  win_rate: number;
  
  /** Total P&L in ADA */
  total_pnl: number;
  
  /** Average P&L per trade */
  avg_pnl: number;
  
  /** Best trade P&L */
  best_trade: number;
  
  /** Worst trade P&L */
  worst_trade: number;
  
  /** Total fees paid */
  total_fees: number;
  
  /** Average confidence of executed signals */
  avg_confidence: number;
  
  /** Success rate by confidence range */
  confidence_breakdown: {
    range: string;
    count: number;
    win_rate: number;
  }[];
  
  /** Performance by pattern */
  pattern_performance: {
    pattern: TradingPattern;
    count: number;
    win_rate: number;
    avg_pnl: number;
  }[];
  
  /** Daily performance data for charts */
  daily_performance: {
    date: string;
    signals: number;
    executed: number;
    pnl: number;
    win_rate: number;
  }[];
}

/**
 * Dashboard summary statistics
 */
export interface DashboardSummary {
  /** Current active signals */
  active_signals: number;
  
  /** Pending executions */
  pending_executions: number;
  
  /** Open positions */
  open_positions: number;
  
  /** Today's P&L */
  todays_pnl: number;
  
  /** This week's P&L */
  weekly_pnl: number;
  
  /** Account balance */
  account_balance: number;
  
  /** Available balance for trading */
  available_balance: number;
  
  /** Total portfolio value */
  portfolio_value: number;
  
  /** Current drawdown */
  current_drawdown: number;
  
  /** Max drawdown */
  max_drawdown: number;
}

/**
 * Signal list item for dashboard display
 */
export interface SignalListItem {
  /** Signal data */
  signal: TradingSignal;
  
  /** Display formatting */
  display: {
    /** Formatted timestamp */
    time_ago: string;
    
    /** Confidence badge color */
    confidence_color: 'green' | 'yellow' | 'red';
    
    /** Status badge color */
    status_color: 'blue' | 'green' | 'red' | 'gray' | 'orange';
    
    /** P&L if executed */
    pnl?: {
      amount: number;
      percentage: number;
      color: 'green' | 'red';
    };
    
    /** Time until expiration */
    expires_in?: string;
  };
  
  /** Available actions */
  actions: {
    can_execute: boolean;
    can_cancel: boolean;
    can_modify: boolean;
  };
}

/**
 * Position list item for dashboard display
 */
export interface PositionListItem {
  /** Position data */
  position: StrikeFinancePosition;
  
  /** Related signal if available */
  original_signal?: TradingSignal;
  
  /** Display formatting */
  display: {
    /** P&L color */
    pnl_color: 'green' | 'red';
    
    /** Position age */
    age: string;
    
    /** Risk level */
    risk_level: 'low' | 'medium' | 'high';
    
    /** Performance percentage */
    performance_pct: number;
  };
  
  /** Available actions */
  actions: {
    can_close: boolean;
    can_modify_sl: boolean;
    can_modify_tp: boolean;
  };
}

/**
 * Chart data for performance visualization
 */
export interface ChartDataPoint {
  /** X-axis value (timestamp or label) */
  x: string | number;
  
  /** Y-axis value */
  y: number;
  
  /** Additional data for tooltips */
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  /** Chart type */
  type: 'line' | 'bar' | 'area' | 'candlestick';
  
  /** Chart title */
  title: string;
  
  /** X-axis label */
  x_label: string;
  
  /** Y-axis label */
  y_label: string;
  
  /** Color scheme */
  colors: string[];
  
  /** Show grid */
  show_grid: boolean;
  
  /** Show legend */
  show_legend: boolean;
  
  /** Height in pixels */
  height: number;
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  /** Widget ID */
  id: string;
  
  /** Widget type */
  type: 'summary' | 'chart' | 'signal_list' | 'position_list' | 'performance_metrics';
  
  /** Widget title */
  title: string;
  
  /** Widget size */
  size: 'small' | 'medium' | 'large' | 'full';
  
  /** Widget position */
  position: {
    row: number;
    col: number;
    width: number;
    height: number;
  };
  
  /** Widget configuration */
  config: any;
  
  /** Refresh interval in seconds */
  refresh_interval: number;
  
  /** Is widget visible */
  visible: boolean;
}

/**
 * Dashboard layout configuration
 */
export interface DashboardLayout {
  /** Layout name */
  name: string;
  
  /** Layout description */
  description: string;
  
  /** Widgets in this layout */
  widgets: DashboardWidget[];
  
  /** Grid configuration */
  grid: {
    columns: number;
    row_height: number;
    margin: number;
  };
  
  /** Is default layout */
  is_default: boolean;
}

/**
 * User dashboard preferences
 */
export interface UserDashboardPreferences {
  /** User wallet address */
  wallet_address: string;
  
  /** Selected layout */
  selected_layout: string;
  
  /** Custom layouts */
  custom_layouts: DashboardLayout[];
  
  /** Default filters */
  default_filters: SignalDashboardFilters;
  
  /** Notification settings */
  notifications: {
    show_browser_notifications: boolean;
    play_sound_on_signal: boolean;
    show_execution_confirmations: boolean;
  };
  
  /** Display preferences */
  display: {
    theme: 'light' | 'dark' | 'auto';
    compact_mode: boolean;
    show_advanced_metrics: boolean;
    default_chart_timeframe: DashboardTimeRange;
  };
  
  /** Auto-refresh settings */
  auto_refresh: {
    enabled: boolean;
    interval_seconds: number;
    pause_when_inactive: boolean;
  };
}

/**
 * Real-time dashboard update
 */
export interface DashboardUpdate {
  /** Update type */
  type: 'signal_new' | 'signal_updated' | 'position_updated' | 'metrics_updated' | 'balance_updated';
  
  /** Update timestamp */
  timestamp: string;
  
  /** Update data */
  data: any;
  
  /** Affected widget IDs */
  affected_widgets: string[];
  
  /** Should trigger notification */
  notify_user: boolean;
}

/**
 * Dashboard API response
 */
export interface DashboardApiResponse<T = any> {
  /** Success status */
  success: boolean;
  
  /** Response data */
  data?: T;
  
  /** Error message */
  error?: string;
  
  /** Response timestamp */
  timestamp: string;
  
  /** Cache information */
  cache?: {
    cached: boolean;
    expires_at: string;
  };
}

/**
 * Signal execution confirmation dialog data
 */
export interface ExecutionConfirmationData {
  /** Signal to execute */
  signal: TradingSignal;
  
  /** Execution estimation */
  estimation: {
    execution_price: number;
    total_cost: number;
    fees: number;
    max_loss: number;
    max_profit: number;
    risk_reward_ratio: number;
  };
  
  /** User balance check */
  balance_check: {
    sufficient: boolean;
    available: number;
    required: number;
  };
  
  /** Risk warnings */
  warnings: string[];
  
  /** Confirmation required */
  requires_confirmation: boolean;
}

/**
 * Dashboard error types
 */
export type DashboardError = 
  | 'network_error'
  | 'api_error'
  | 'authentication_error'
  | 'insufficient_balance'
  | 'signal_expired'
  | 'execution_failed'
  | 'unknown_error';

/**
 * Dashboard error details
 */
export interface DashboardErrorDetails {
  /** Error type */
  type: DashboardError;
  
  /** Error message */
  message: string;
  
  /** Error code */
  code?: string;
  
  /** Additional details */
  details?: any;
  
  /** Suggested actions */
  suggested_actions: string[];
  
  /** Is recoverable */
  recoverable: boolean;
  
  /** Retry delay in seconds */
  retry_delay?: number;
}