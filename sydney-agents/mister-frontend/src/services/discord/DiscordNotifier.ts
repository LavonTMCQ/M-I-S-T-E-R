/**
 * Discord Notification Service
 * 
 * Handles Discord webhook notifications for trading signals and executions
 */

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  thumbnail?: {
    url: string;
  };
}

export interface DiscordMessage {
  content?: string;
  embeds: DiscordEmbed[];
}

export class DiscordNotifier {
  private static instance: DiscordNotifier;
  private webhookUrl: string | null = null;

  constructor() {
    // Get webhook URL from environment or localStorage
    this.webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL || 
                     localStorage.getItem('discord_webhook_url') || 
                     null;
  }

  static getInstance(): DiscordNotifier {
    if (!DiscordNotifier.instance) {
      DiscordNotifier.instance = new DiscordNotifier();
    }
    return DiscordNotifier.instance;
  }

  /**
   * Set Discord webhook URL
   */
  setWebhookUrl(url: string): void {
    this.webhookUrl = url;
    localStorage.setItem('discord_webhook_url', url);
  }

  /**
   * Check if Discord notifications are configured
   */
  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  /**
   * Send signal generation notification
   */
  async notifySignalGenerated(signal: any): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('⚠️ Discord webhook not configured');
      return false;
    }

    const embed: DiscordEmbed = {
      title: `🔔 New ${signal.type.toUpperCase()} Signal Generated`,
      color: signal.type === 'long' ? 0x00ff00 : 0xff0000,
      fields: [
        {
          name: '📊 Signal Details',
          value: `**Pattern:** ${signal.pattern.replace(/_/g, ' ')}\n**Confidence:** ${signal.confidence}%\n**Symbol:** ${signal.symbol}`,
          inline: true
        },
        {
          name: '💰 Entry & Targets',
          value: `**Entry:** $${signal.price.toFixed(4)}\n**Stop Loss:** $${signal.risk.stop_loss.toFixed(4)}\n**Take Profit:** $${signal.risk.take_profit.toFixed(4)}`,
          inline: true
        },
        {
          name: '🎯 Position Details',
          value: `**Size:** ${signal.risk.position_size.toFixed(0)} ADA\n**Max Risk:** ${signal.risk.max_risk.toFixed(1)} ADA\n**Expires:** <t:${Math.floor(new Date(signal.expires_at).getTime() / 1000)}:R>`,
          inline: true
        },
        {
          name: '🧠 Analysis',
          value: `"${signal.reasoning}"`,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MISTER Trading • Signal Generated',
      },
      thumbnail: {
        url: signal.type === 'long' 
          ? 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c8.png'
          : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c9.png'
      }
    };

    return await this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send trade execution notification
   */
  async notifyTradeExecution(
    signal: any, 
    strikeResponse: any, 
    success: boolean, 
    errorMessage?: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('⚠️ Discord webhook not configured');
      return false;
    }

    const embed: DiscordEmbed = success ? {
      title: `🚀 Trade Executed Successfully - ${signal.type.toUpperCase()}`,
      color: signal.type === 'long' ? 0x00ff00 : 0xff0000,
      fields: [
        {
          name: '📊 Signal Executed',
          value: `**Pattern:** ${signal.pattern.replace(/_/g, ' ')}\n**Confidence:** ${signal.confidence}%\n**Entry Price:** $${signal.price.toFixed(4)}`,
          inline: true
        },
        {
          name: '💰 Position Details',
          value: `**Size:** ${signal.risk.position_size.toFixed(0)} ADA\n**Stop Loss:** $${signal.risk.stop_loss.toFixed(4)}\n**Take Profit:** $${signal.risk.take_profit.toFixed(4)}`,
          inline: true
        },
        {
          name: '🔗 Transaction Info',
          value: `**TX ID:** \`${strikeResponse?.transaction_id || 'Pending'}\`\n**Position ID:** \`${strikeResponse?.position_id || 'Pending'}\`\n**Status:** ${strikeResponse?.status || 'Processing'}`,
          inline: true
        },
        {
          name: '💸 Fees & Costs',
          value: `**Trading Fee:** ${strikeResponse?.details?.fees?.trading_fee?.toFixed(3) || '0.000'} ADA\n**Network Fee:** ${strikeResponse?.details?.fees?.network_fee?.toFixed(1) || '2.0'} ADA\n**Total Cost:** ${(signal.risk.position_size + (strikeResponse?.details?.fees?.trading_fee || 0) + (strikeResponse?.details?.fees?.network_fee || 2)).toFixed(2)} ADA`,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MISTER Trading • Strike Finance',
      },
      thumbnail: {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2705.png'
      }
    } : {
      title: `❌ Trade Execution Failed - ${signal.type.toUpperCase()}`,
      color: 0xff0000,
      fields: [
        {
          name: '📊 Signal Details',
          value: `**Pattern:** ${signal.pattern.replace(/_/g, ' ')}\n**Confidence:** ${signal.confidence}%\n**Entry Price:** $${signal.price.toFixed(4)}`,
          inline: true
        },
        {
          name: '💰 Attempted Position',
          value: `**Size:** ${signal.risk.position_size.toFixed(0)} ADA\n**Stop Loss:** $${signal.risk.stop_loss.toFixed(4)}\n**Take Profit:** $${signal.risk.take_profit.toFixed(4)}`,
          inline: true
        },
        {
          name: '❌ Error Details',
          value: `**Error:** ${errorMessage || 'Unknown error'}\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MISTER Trading • Execution Failed',
      },
      thumbnail: {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/274c.png'
      }
    };

    return await this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send position update notification (P&L, stop loss hit, etc.)
   */
  async notifyPositionUpdate(
    signal: any,
    updateType: 'profit_target' | 'stop_loss' | 'manual_close' | 'pnl_update',
    details: {
      current_price?: number;
      pnl?: number;
      pnl_percentage?: number;
      close_reason?: string;
    }
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('⚠️ Discord webhook not configured');
      return false;
    }

    const isProfit = (details.pnl || 0) > 0;
    const updateTypeLabels = {
      profit_target: '🎯 Take Profit Hit',
      stop_loss: '🛑 Stop Loss Hit',
      manual_close: '👤 Manual Close',
      pnl_update: '📊 P&L Update'
    };

    const embed: DiscordEmbed = {
      title: `${updateTypeLabels[updateType]} - ${signal.type.toUpperCase()}`,
      color: isProfit ? 0x00ff00 : 0xff0000,
      fields: [
        {
          name: '📊 Position Details',
          value: `**Original Entry:** $${signal.price.toFixed(4)}\n**Current Price:** $${details.current_price?.toFixed(4) || 'N/A'}\n**Position Size:** ${signal.risk.position_size.toFixed(0)} ADA`,
          inline: true
        },
        {
          name: '💰 P&L Summary',
          value: `**P&L:** ${isProfit ? '+' : ''}${details.pnl?.toFixed(2) || '0.00'} ADA\n**P&L %:** ${isProfit ? '+' : ''}${details.pnl_percentage?.toFixed(2) || '0.00'}%\n**Status:** ${updateType === 'profit_target' ? 'Target Hit ✅' : updateType === 'stop_loss' ? 'Stopped Out ❌' : 'Closed 📝'}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MISTER Trading • Position Update',
      },
      thumbnail: {
        url: isProfit 
          ? 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4b0.png'
          : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c9.png'
      }
    };

    if (details.close_reason) {
      embed.fields.push({
        name: '📝 Close Reason',
        value: details.close_reason,
        inline: false
      });
    }

    return await this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send daily summary notification
   */
  async notifyDailySummary(stats: {
    total_signals: number;
    executed_signals: number;
    successful_trades: number;
    total_pnl: number;
    win_rate: number;
  }): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('⚠️ Discord webhook not configured');
      return false;
    }

    const embed: DiscordEmbed = {
      title: '📊 Daily Trading Summary',
      color: stats.total_pnl > 0 ? 0x00ff00 : 0xff0000,
      fields: [
        {
          name: '🔔 Signal Activity',
          value: `**Generated:** ${stats.total_signals}\n**Executed:** ${stats.executed_signals}\n**Success Rate:** ${stats.win_rate.toFixed(1)}%`,
          inline: true
        },
        {
          name: '💰 Performance',
          value: `**Total P&L:** ${stats.total_pnl > 0 ? '+' : ''}${stats.total_pnl.toFixed(2)} ADA\n**Successful Trades:** ${stats.successful_trades}\n**Win Rate:** ${stats.win_rate.toFixed(1)}%`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MISTER Trading • Daily Summary',
      }
    };

    return await this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send Discord message
   */
  private async sendMessage(message: DiscordMessage): Promise<boolean> {
    if (!this.webhookUrl) {
      console.error('❌ Discord webhook URL not configured');
      return false;
    }

    try {
      console.log('📢 Sending Discord notification:', JSON.stringify(message, null, 2));

      // LIVE DISCORD INTEGRATION - ENABLED!
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('✅ Discord notification sent successfully to live webhook!');
      return true;

    } catch (error) {
      console.error('❌ Failed to send Discord notification:', error);
      return false;
    }
  }
}

export const discordNotifier = DiscordNotifier.getInstance();
