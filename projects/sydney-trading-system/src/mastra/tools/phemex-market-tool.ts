import { Tool } from '@mastra/core/tools';
import { z } from 'zod';

const PHEMEX_PUBLIC_URL = 'https://api.phemex.com';

// Helper function for public API calls (no authentication needed)
async function makePublicPhemexRequest(endpoint: string, params: any = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = PHEMEX_PUBLIC_URL + endpoint + (queryString ? '?' + queryString : '');
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Phemex API error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Phemex public API request failed:', error);
    throw error;
  }
}

export const getMarketDataTool = new Tool({
  id: 'getMarketData',
  description: 'Get current market data for analysis',
  inputSchema: z.object({
    symbol: z.string().describe('Trading symbol (e.g., ADAUSD)'),
  }),
  execute: async ({ symbol }) => {
    try {
      // Get 24hr ticker data
      const tickerData = await makePublicPhemexRequest('/md/ticker/24hr', { symbol });
      
      if (tickerData.code !== 0) {
        throw new Error(`Phemex API error: ${tickerData.msg}`);
      }

      const ticker = tickerData.result;
      
      // Get recent kline data for trend analysis
      const klineData = await makePublicPhemexRequest('/md/kline', {
        symbol,
        resolution: 60, // 1 hour
        limit: 24 // Last 24 hours
      });

      const klines = klineData.result || [];
      const prices = klines.map((k: any) => parseFloat(k[4])); // Close prices
      
      // Calculate simple trend indicators
      const currentPrice = parseFloat(ticker.close) / 10000;
      const priceChange24h = parseFloat(ticker.priceChange) / 10000;
      const priceChangePercent = parseFloat(ticker.priceChangePercent);
      const volume24h = parseFloat(ticker.volume);
      const high24h = parseFloat(ticker.high) / 10000;
      const low24h = parseFloat(ticker.low) / 10000;
      
      // Simple trend analysis
      const recentPrices = prices.slice(-6); // Last 6 hours
      const trend = recentPrices.length > 1 ? 
        (recentPrices[recentPrices.length - 1] > recentPrices[0] ? 'BULLISH' : 'BEARISH') : 'NEUTRAL';
      
      // Volatility calculation (simplified)
      const volatility = ((high24h - low24h) / currentPrice) * 100;
      
      return {
        success: true,
        data: {
          symbol,
          currentPrice,
          priceChange24h,
          priceChangePercent,
          volume24h,
          high24h,
          low24h,
          volatility: volatility.toFixed(2) + '%',
          trend,
          marketCap: ticker.marketCap ? parseFloat(ticker.marketCap) : null,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get market data for ${symbol}: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

export const calculatePositionRiskTool = new Tool({
  id: 'calculatePositionRisk',
  description: 'Calculate risk metrics for current positions',
  inputSchema: z.object({
    symbol: z.string().optional().describe('Specific symbol to analyze, or all positions if not provided'),
  }),
  execute: async ({ symbol }) => {
    try {
      // This would integrate with the account tools to get position data
      // For now, providing a framework for risk calculation
      
      const riskMetrics = {
        symbol: symbol || 'ALL_POSITIONS',
        calculations: {
          valueAtRisk: 'VaR calculation based on historical volatility',
          sharpeRatio: 'Risk-adjusted return calculation',
          maxDrawdown: 'Maximum historical loss from peak',
          correlationRisk: 'Portfolio correlation analysis',
          liquidationRisk: 'Distance to liquidation price',
        },
        recommendations: [
          'Position sizing recommendations based on Kelly Criterion',
          'Stop-loss placement suggestions',
          'Take-profit level optimization',
          'Hedge position recommendations',
        ]
      };

      return {
        success: true,
        data: riskMetrics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to calculate position risk: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

export const suggestPositionAdjustmentTool = new Tool({
  id: 'suggestPositionAdjustment',
  description: 'Suggest specific position adjustments based on analysis',
  inputSchema: z.object({
    symbol: z.string().describe('Symbol to analyze'),
    currentSize: z.number().describe('Current position size'),
    marketCondition: z.string().describe('Current market condition assessment'),
  }),
  execute: async ({ symbol, currentSize, marketCondition }) => {
    try {
      // Get current market data for the symbol
      const marketData = await getMarketDataTool.execute({ symbol });
      
      if (!marketData.success) {
        throw new Error('Failed to get market data for analysis');
      }

      const { currentPrice, trend, volatility, priceChangePercent } = marketData.data;
      
      // Generate position adjustment suggestions based on multiple factors
      const suggestions = [];
      
      // Trend-based suggestions
      if (trend === 'BULLISH' && currentSize > 0) {
        suggestions.push({
          action: 'HOLD_OR_ADD',
          reasoning: 'Bullish trend supports long position',
          suggestedSize: Math.min(currentSize * 1.2, currentSize + 100), // Max 20% increase
          confidence: 'MEDIUM'
        });
      } else if (trend === 'BEARISH' && currentSize > 0) {
        suggestions.push({
          action: 'REDUCE_OR_CLOSE',
          reasoning: 'Bearish trend suggests reducing long exposure',
          suggestedSize: currentSize * 0.7, // 30% reduction
          confidence: 'HIGH'
        });
      }
      
      // Volatility-based suggestions
      const volNum = parseFloat(volatility.replace('%', ''));
      if (volNum > 5) {
        suggestions.push({
          action: 'REDUCE_SIZE',
          reasoning: 'High volatility suggests reducing position size for risk management',
          suggestedSize: currentSize * 0.8,
          confidence: 'HIGH'
        });
      }
      
      // Price change based suggestions
      if (Math.abs(priceChangePercent) > 10) {
        suggestions.push({
          action: 'TAKE_PARTIAL_PROFIT',
          reasoning: 'Significant price movement suggests taking partial profits',
          suggestedSize: currentSize * 0.6,
          confidence: 'MEDIUM'
        });
      }
      
      return {
        success: true,
        data: {
          symbol,
          currentSize,
          marketCondition,
          currentPrice,
          trend,
          volatility,
          suggestions,
          riskAssessment: {
            overall: volNum > 5 ? 'HIGH' : volNum > 3 ? 'MEDIUM' : 'LOW',
            factors: ['volatility', 'trend', 'price_momentum']
          },
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate position adjustment suggestions: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

// Global queue to prevent overlapping audio
let isCurrentlySpeaking = false;
const speechQueue: Array<() => Promise<void>> = [];

async function processSpeechQueue() {
  if (isCurrentlySpeaking || speechQueue.length === 0) return;

  isCurrentlySpeaking = true;
  const nextSpeech = speechQueue.shift();

  if (nextSpeech) {
    try {
      await nextSpeech();
    } catch (error) {
      console.error('❌ Speech queue error:', error);
    }
  }

  isCurrentlySpeaking = false;

  // Process next item in queue if any
  if (speechQueue.length > 0) {
    setTimeout(processSpeechQueue, 100); // Small delay between speeches
  }
}

export const speakAdviceTool = new Tool({
  id: 'speakAdvice',
  description: 'Announce important portfolio advice via Google Voice TTS with queue management to prevent overlapping audio',
  inputSchema: z.object({
    message: z.string().describe('Professional advice message to announce'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('Priority level for the announcement'),
  }),
  execute: async ({ context }) => {
    const { message, priority } = context;

    return new Promise((resolve) => {
      // Add to speech queue
      speechQueue.push(async () => {
        try {
          // Import Google Voice (same as Sone and other agents)
          const { GoogleVoice } = await import('@mastra/voice-google');

          // Priority-based voice settings optimized for clear speaker output
          const voiceSettings = {
            low: { speakingRate: 0.9, pitch: 0 },
            medium: { speakingRate: 1.0, pitch: 1 },
            high: { speakingRate: 1.1, pitch: 2 },
            urgent: { speakingRate: 1.2, pitch: 3 }
          };

          const settings = voiceSettings[priority];

          // Clean message for better speech clarity
          const cleanMessage = message.replace(/[🚨🔊✅❌📊💰]/g, '').trim();
          const announcement = `Portfolio update: ${cleanMessage}`;

          console.log(`🔊 SPEAKING ADVICE (${priority.toUpperCase()}): ${cleanMessage}`);

          // Initialize Google Voice with optimized settings for speakers
          const googleVoice = new GoogleVoice({
            speechModel: {
              apiKey: 'AIzaSyBNU1uWipiCzM8dxCv0X2hpkiVX5Uk0QX4',
            },
            speaker: 'en-US-Studio-O', // Professional female voice
          });

          // Speak the announcement with optimized settings
          await googleVoice.speak(announcement, {
            speakingRate: settings.speakingRate,
            pitch: settings.pitch,
            volumeGainDb: 2.0, // Slightly louder for speakers
          });

          console.log('✅ Portfolio voice announcement completed');

          resolve({
            success: true,
            data: {
              message: cleanMessage,
              priority,
              audioGenerated: true,
              announcement,
              queuePosition: speechQueue.length,
              timestamp: new Date().toISOString(),
            }
          });
        } catch (error) {
          console.error('❌ Voice synthesis failed:', error);
          // Fallback to console output
          console.log(`🔊 PORTFOLIO ADVICE (${priority.toUpperCase()}): ${message}`);

          resolve({
            success: false,
            data: {
              message,
              priority,
              audioGenerated: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            }
          });
        }
      });

      // Start processing queue
      processSpeechQueue();
    });
  },
});
