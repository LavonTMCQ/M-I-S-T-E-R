/**
 * Discord Notification Types
 * 
 * Type definitions for Discord bot notifications about trading signals
 * and execution confirmations.
 */

import { TradingSignal, SignalExecution } from './core';
import { StrikeFinanceTradeResponse } from './strike-finance';

/**
 * Discord notification types
 */
export type NotificationType = 
  | 'signal_generated'    // New signal available
  | 'signal_executed'     // Signal executed successfully
  | 'signal_failed'       // Signal execution failed
  | 'signal_expired'      // Signal expired without execution
  | 'position_update'     // Position P&L update
  | 'system_alert';       // System status alerts

/**
 * Discord notification priority levels
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Discord embed color scheme
 */
export const DISCORD_COLORS = {
  SUCCESS: 0x00ff00,    // Green for successful executions
  WARNING: 0xffaa00,    // Orange for warnings
  ERROR: 0xff0000,      // Red for errors
  INFO: 0x0099ff,       // Blue for information
  SIGNAL: 0x9932cc,     // Purple for new signals
} as const;

/**
 * Base Discord notification interface
 */
export interface DiscordNotification {
  /** Notification unique ID */
  id: string;
  
  /** Notification type */
  type: NotificationType;
  
  /** Priority level */
  priority: NotificationPriority;
  
  /** User Discord ID to notify */
  user_discord_id: string;
  
  /** User wallet address for context */
  wallet_address: string;
  
  /** Notification timestamp */
  timestamp: string;
  
  /** Discord embed data */
  embed: DiscordEmbed;
  
  /** Optional direct message content */
  message?: string;
  
  /** Delivery status */
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  
  /** Retry count */
  retry_count: number;
  
  /** Max retry attempts */
  max_retries: number;
}

/**
 * Discord embed structure
 */
export interface DiscordEmbed {
  /** Embed title */
  title: string;
  
  /** Embed description */
  description: string;
  
  /** Embed color */
  color: number;
  
  /** Embed fields */
  fields: DiscordEmbedField[];
  
  /** Footer text */
  footer?: {
    text: string;
    icon_url?: string;
  };
  
  /** Thumbnail image */
  thumbnail?: {
    url: string;
  };
  
  /** Timestamp */
  timestamp?: string;
  
  /** Author information */
  author?: {
    name: string;
    icon_url?: string;
  };
}

/**
 * Discord embed field
 */
export interface DiscordEmbedField {
  /** Field name */
  name: string;
  
  /** Field value */
  value: string;
  
  /** Display inline */
  inline?: boolean;
}

/**
 * Signal generated notification data
 */
export interface SignalGeneratedNotification extends DiscordNotification {
  type: 'signal_generated';
  signal: TradingSignal;
}

/**
 * Signal executed notification data
 */
export interface SignalExecutedNotification extends DiscordNotification {
  type: 'signal_executed';
  signal: TradingSignal;
  execution: SignalExecution;
  strike_response: StrikeFinanceTradeResponse;
}

/**
 * Signal failed notification data
 */
export interface SignalFailedNotification extends DiscordNotification {
  type: 'signal_failed';
  signal: TradingSignal;
  error_message: string;
  error_details?: any;
}

/**
 * Position update notification data
 */
export interface PositionUpdateNotification extends DiscordNotification {
  type: 'position_update';
  position_id: string;
  current_pnl: number;
  pnl_change: number;
  current_price: number;
  entry_price: number;
}

/**
 * Create Discord notification for new signal
 */
export function createSignalNotification(
  signal: TradingSignal,
  userDiscordId: string,
  walletAddress: string
): SignalGeneratedNotification {
  const confidenceEmoji = signal.confidence >= 80 ? '🔥' : signal.confidence >= 70 ? '⚡' : '📊';
  const directionEmoji = signal.type === 'long' ? '📈' : '📉';
  
  return {
    id: `signal_${signal.id}_${Date.now()}`,
    type: 'signal_generated',
    priority: signal.confidence >= 80 ? 'high' : 'medium',
    user_discord_id: userDiscordId,
    wallet_address: walletAddress,
    timestamp: new Date().toISOString(),
    signal: signal,
    status: 'pending',
    retry_count: 0,
    max_retries: 3,
    embed: {
      title: `${confidenceEmoji} New Trading Signal ${directionEmoji}`,
      description: `**${signal.algorithm.algorithm_name}** detected a ${signal.type.toUpperCase()} opportunity`,
      color: DISCORD_COLORS.SIGNAL,
      fields: [
        {
          name: '📊 Signal Details',
          value: `**Type:** ${signal.type.toUpperCase()}\n**Price:** $${signal.price.toFixed(4)}\n**Confidence:** ${signal.confidence}%`,
          inline: true
        },
        {
          name: '🎯 Risk Management',
          value: `**Position:** ${signal.risk.position_size} ADA\n**Stop Loss:** $${signal.risk.stop_loss.toFixed(4)}\n**Take Profit:** $${signal.risk.take_profit.toFixed(4)}`,
          inline: true
        },
        {
          name: '🔍 Pattern',
          value: `**${signal.pattern}**\n${signal.reasoning}`,
          inline: false
        },
        {
          name: '⏰ Expires',
          value: `<t:${Math.floor(new Date(signal.expires_at).getTime() / 1000)}:R>`,
          inline: true
        }
      ],
      footer: {
        text: `MISTER Trading • ${signal.algorithm.timeframe} • ${signal.algorithm.historical_win_rate}% Win Rate`
      },
      timestamp: signal.timestamp
    }
  };
}

/**
 * Create Discord notification for executed signal
 */
export function createExecutionNotification(
  signal: TradingSignal,
  execution: SignalExecution,
  strikeResponse: StrikeFinanceTradeResponse,
  userDiscordId: string,
  walletAddress: string
): SignalExecutedNotification {
  const successEmoji = execution.result === 'success' ? '✅' : execution.result === 'partial' ? '⚠️' : '❌';
  const directionEmoji = signal.type === 'long' ? '📈' : '📉';
  
  return {
    id: `execution_${signal.id}_${Date.now()}`,
    type: 'signal_executed',
    priority: execution.result === 'success' ? 'medium' : 'high',
    user_discord_id: userDiscordId,
    wallet_address: walletAddress,
    timestamp: new Date().toISOString(),
    signal: signal,
    execution: execution,
    strike_response: strikeResponse,
    status: 'pending',
    retry_count: 0,
    max_retries: 3,
    embed: {
      title: `${successEmoji} Signal Executed ${directionEmoji}`,
      description: `Your ${signal.type.toUpperCase()} signal has been executed on Strike Finance`,
      color: execution.result === 'success' ? DISCORD_COLORS.SUCCESS : DISCORD_COLORS.WARNING,
      fields: [
        {
          name: '💼 Execution Details',
          value: `**Price:** $${execution.execution_price?.toFixed(4) || 'N/A'}\n**Amount:** ${execution.executed_size || signal.risk.position_size} ADA\n**Status:** ${execution.result?.toUpperCase() || 'PROCESSING'}`,
          inline: true
        },
        {
          name: '💰 Fees & Costs',
          value: `**Trading Fee:** ${strikeResponse.fees?.trading_fee || 0} ADA\n**Network Fee:** ${strikeResponse.fees?.network_fee || 0} ADA\n**Total Fees:** ${strikeResponse.fees?.total_fee || 0} ADA`,
          inline: true
        },
        {
          name: '🎯 Risk Levels',
          value: `**Stop Loss:** $${signal.risk.stop_loss.toFixed(4)}\n**Take Profit:** $${signal.risk.take_profit.toFixed(4)}`,
          inline: false
        }
      ],
      footer: {
        text: `Transaction ID: ${strikeResponse.transaction_id || 'Pending'}`
      },
      timestamp: execution.completed_at || execution.started_at
    }
  };
}

/**
 * Discord bot configuration
 */
export interface DiscordBotConfig {
  /** Bot token */
  token: string;
  
  /** Bot client ID */
  client_id: string;
  
  /** Default channel for system alerts */
  system_channel_id?: string;
  
  /** Rate limiting */
  rate_limit: {
    messages_per_minute: number;
    burst_limit: number;
  };
  
  /** Retry configuration */
  retry_config: {
    max_retries: number;
    base_delay_ms: number;
    max_delay_ms: number;
  };
}

/**
 * User notification preferences
 */
export interface UserNotificationPreferences {
  /** User Discord ID */
  discord_id: string;
  
  /** User wallet address */
  wallet_address: string;
  
  /** Notification types to receive */
  enabled_types: NotificationType[];
  
  /** Minimum signal confidence to notify */
  min_signal_confidence: number;
  
  /** Minimum position size to notify */
  min_position_size: number;
  
  /** Quiet hours (no notifications) */
  quiet_hours?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
    timezone: string;
  };
  
  /** Preferred notification priority levels */
  priority_filter: NotificationPriority[];
}

/**
 * Notification delivery status
 */
export interface NotificationDeliveryStatus {
  /** Notification ID */
  notification_id: string;
  
  /** Delivery attempts */
  attempts: {
    timestamp: string;
    success: boolean;
    error?: string;
    response_time_ms?: number;
  }[];
  
  /** Final delivery status */
  final_status: 'delivered' | 'failed' | 'abandoned';
  
  /** Total delivery time */
  total_delivery_time_ms?: number;
}