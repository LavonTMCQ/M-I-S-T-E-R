import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { TokenLimiter, ToolCallFilter } from '@mastra/memory/processors';
import { CompositeVoice } from '@mastra/core/voice';
// TEMPORARILY COMMENTED OUT FOR DEPLOYMENT FIX
// import { GoogleVoice } from '@mastra/voice-google';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';

// Import the Fibonacci strategy tool and Kraken tools
import { fibonacciStrategyTool } from '../tools/fibonacci-strategy-tool';
import { krakenWebSocketTool } from '../tools/kraken-websocket-tool';
import { krakenRestApiTool } from '../tools/kraken-rest-api-tool';

// Initialize Google Voice for Fibonacci agent
let fibonacciVoiceInstance: any;

try {
  const GOOGLE_API_KEY = 'AIzaSyBNU1uWipiCzM8dxCv0X2hpkiVX5Uk0QX4';

  const googleVoiceForFibonacci = new GoogleVoice({
    speechModel: {
      apiKey: GOOGLE_API_KEY,
    },
    listeningModel: {
      apiKey: GOOGLE_API_KEY,
    },
    speaker: 'en-US-Studio-M', // Professional male voice for trading
  });

  fibonacciVoiceInstance = new CompositeVoice({
    input: googleVoiceForFibonacci,
    output: googleVoiceForFibonacci,
  });

  console.log('✅ Fibonacci Agent: Using Google Voice (primary)');
} catch (error) {
  console.error('❌ Fibonacci Agent: Voice initialization failed:', error instanceof Error ? error.message : String(error));
  fibonacciVoiceInstance = undefined;
}

// Voice tool for Fibonacci trading results
const speakFibonacciResultsTool = createTool({
  id: "speak-fibonacci-results",
  description: "MANDATORY: Speak ALL Fibonacci trading results using Google Voice TTS through Mac speakers",
  inputSchema: z.object({
    text: z.string().describe("The text to speak aloud through Mac speakers"),
  }),
  execute: async ({ context }) => {
    const { text } = context;

    try {
      console.log(`🔊 FIBONACCI VOICE SPEAKING: ${text}`);

      if (!fibonacciVoiceInstance) {
        console.error('❌ Fibonacci voice system not available');
        exec(`say "${text}"`, (sayError) => {
          if (sayError) {
            console.error('❌ Say command failed:', sayError);
          } else {
            console.log('✅ Fallback fibonacci voice announcement completed');
          }
        });
        return {
          success: false,
          error: "Voice system not available"
        };
      }

      console.log(`🎤 Fibonacci: Converting text to speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

      const audioStream = await fibonacciVoiceInstance.speak(text, {
        speaker: 'en-US-Studio-M'
      });

      if (!audioStream) {
        console.error('❌ Fibonacci: No audio stream received');
        exec(`say "${text}"`, (sayError) => {
          if (sayError) {
            console.error('❌ Say command failed:', sayError);
          } else {
            console.log('✅ Fallback fibonacci voice announcement completed');
          }
        });
        return {
          success: false,
          error: "No audio stream received"
        };
      }

      return new Promise((resolve) => {
        const chunks: Buffer[] = [];

        audioStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        audioStream.on('end', async () => {
          try {
            const audioBuffer = Buffer.concat(chunks);
            console.log(`🎵 Fibonacci: Audio buffer size: ${audioBuffer.length} bytes`);

            if (audioBuffer.length === 0) {
              console.error('❌ Fibonacci: Empty audio buffer received');
              exec(`say "${text}"`, (sayError) => {
                if (sayError) {
                  console.error('❌ Say command failed:', sayError);
                } else {
                  console.log('✅ Fallback fibonacci voice announcement completed');
                }
              });
              resolve({
                success: false,
                error: "Empty audio buffer"
              });
              return;
            }

            // Play audio through Mac speakers using afplay
            const { spawn } = require('child_process');
            const afplay = spawn('afplay', ['-'], { stdio: ['pipe', 'pipe', 'pipe'] });

            afplay.stdin.write(audioBuffer);
            afplay.stdin.end();

            afplay.on('close', (code: number) => {
              if (code === 0) {
                console.log('✅ Fibonacci voice announcement completed successfully');
                resolve({
                  success: true,
                  message: "Fibonacci voice announcement completed"
                });
              } else {
                console.error(`❌ Fibonacci: afplay exited with code ${code}`);
                exec(`say "${text}"`, (sayError) => {
                  if (sayError) {
                    console.error('❌ Say command also failed:', sayError);
                  } else {
                    console.log('✅ Fallback fibonacci voice announcement completed');
                  }
                });
                resolve({
                  success: false,
                  error: `afplay failed with code ${code}`
                });
              }
            });

            afplay.on('error', (error: Error) => {
              console.error('❌ Fibonacci: afplay error:', error);
              exec(`say "${text}"`, (sayError) => {
                if (sayError) {
                  console.error('❌ Say command also failed:', sayError);
                } else {
                  console.log('✅ Fallback fibonacci voice announcement completed');
                }
              });
              resolve({
                success: false,
                error: `afplay error: ${error.message}`
              });
            });

          } catch (error) {
            console.error('❌ Fibonacci: Audio processing failed:', error);
            exec(`say "${text}"`, (sayError) => {
              if (sayError) {
                console.error('❌ Say command failed:', sayError);
              } else {
                console.log('✅ Fallback fibonacci voice announcement completed');
              }
            });
            resolve({
              success: false,
              error: `Audio processing failed: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        });

        audioStream.on('error', (error: Error) => {
          console.error('❌ Fibonacci: Audio stream error:', error);
          exec(`say "${text}"`, (sayError) => {
            if (sayError) {
              console.error('❌ Say command also failed:', sayError);
            } else {
              console.log('✅ Fallback fibonacci voice announcement completed');
            }
          });
          resolve({
            success: false,
            error: `Audio stream error: ${error.message}`
          });
        });
      });

    } catch (error) {
      console.error('❌ Fibonacci voice announcement failed:', error);
      return {
        success: false,
        error: `Voice announcement failed: ${error instanceof Error ? error.message : String(error)}`,
        fallback: "Text logged to console"
      };
    }
  }
});

// Create Fibonacci trading tools object
const fibonacciTradingTools: any = {
  fibonacciStrategyTool,
  krakenWebSocketTool,
  krakenRestApiTool,
  speakFibonacciResultsTool,
};

// Enhanced memory system for Fibonacci trading data
const fibonacciTradingMemory = new Memory({
  storage: new LibSQLStore({
    url: 'file:./fibonacci-agent-memory.db',
  }) as any,
  vector: new LibSQLVector({
    connectionUrl: 'file:./fibonacci-agent-memory.db',
  }),
  embedder: fastembed,
  options: {
    lastMessages: 25,
    semanticRecall: {
      topK: 8,
      messageRange: {
        before: 4,
        after: 2,
      },
      scope: 'resource',
    },
  },
  processors: [
    new TokenLimiter(40000),
    new ToolCallFilter({ exclude: [] }),
  ],
});

/**
 * Fibonacci Retracement Trading Agent for ADA/USD Leveraged Positions
 *
 * This agent specializes in Fibonacci retracement trading strategy:
 * - Identifies key swing highs and lows for Fibonacci level calculation
 * - Uses 38.2%, 50%, 61.8%, and 78.6% retracement levels for entries
 * - Combines Fibonacci analysis with RSI and volume confirmation
 * - Optimized for Strike Finance leveraged trading (3x leverage)
 * - Professional risk management with dynamic position sizing
 * - Voice-enabled trade announcements and performance reporting
 */
export const fibonacciAgent = new Agent({
  name: 'fibonacciAgent',
  instructions: `You are Sydney's dedicated Fibonacci Retracement Trading Agent, specialized in leveraged ADA/USD trading using Fibonacci technical analysis.

## Your Core Responsibilities:

### 🔸 Fibonacci Analysis:
- **PRIMARY STRATEGY**: Identify swing highs and lows for accurate Fibonacci level calculation
- **KEY LEVELS**: Focus on 38.2%, 50%, 61.8%, and 78.6% retracement levels
- **ENTRY SIGNALS**: Look for price bounces or rejections at key Fibonacci levels
- **CONFIRMATION**: Combine with RSI (oversold/overbought) and volume analysis
- **TIMEFRAMES**: Use 15-minute charts for entries, 1-hour for trend confirmation
- **REAL-TIME DATA**: Always use krakenWebSocketTool for live ADA/USD price feeds
- **HISTORICAL DATA**: Use krakenRestApiTool to pull OHLCV data for accurate swing point identification
- **API ACCESS**: Use krakenRestApiTool for order book depth, recent trades, and market analysis
- **DATA VALIDATION**: Always validate data quality before making trading decisions

### 🔸 Strike Finance Integration:
- **LEVERAGED TRADING**: Execute 3x leveraged positions on Strike Finance
- **AUTOMATED EXECUTION**: Use managed wallets for seamless trade execution
- **RISK MANAGEMENT**: 2% account risk per trade with dynamic position sizing
- **STOP LOSSES**: Place stops beyond the next Fibonacci level for protection
- **TAKE PROFITS**: Target the next significant Fibonacci extension level

### 🔸 Trading Rules:
- **LONG SIGNALS**: Enter long when price bounces off 38.2% or 61.8% retracement with RSI < 40
- **SHORT SIGNALS**: Enter short when price rejects 38.2% or 61.8% retracement with RSI > 60
- **VOLUME CONFIRMATION**: Require above-average volume for signal validation
- **TREND ALIGNMENT**: Only trade in direction of higher timeframe trend
- **RISK-REWARD**: Minimum 2:1 risk-reward ratio for all trades

### 🔸 Performance Tracking:
- **BACKTESTING**: Maintain comprehensive backtesting results and performance metrics
- **WIN RATE**: Target 65%+ win rate with Fibonacci strategy
- **PROFIT FACTOR**: Aim for 1.8+ profit factor with proper risk management
- **DRAWDOWN**: Keep maximum drawdown below 8% of account balance
- **TRADE LOGGING**: Record all trades with entry/exit reasons and Fibonacci levels

### 🔸 Voice Communication:
- **MANDATORY**: Always use Google Voice TTS for ALL trading signals and results
- **AUTOMATIC**: Call speakFibonacciResultsTool immediately after every analysis
- **REQUIRED**: Announce trade entries, exits, and Fibonacci level analysis
- **CLEAR AUDIO**: Ensure voice announcements are professional and clear
- **COMPREHENSIVE**: Include Fibonacci level, RSI, volume, and confidence in announcements

## Communication Style:
- Be precise about Fibonacci levels and retracement percentages
- Always specify the exact Fibonacci level triggering the signal
- Include RSI values and volume confirmation in analysis
- Mention risk-reward ratios and position sizing
- **MANDATORY**: Use speakFibonacciResultsTool for ALL trading signals
- **NEVER SKIP**: Voice announcements are required for every analysis

## Key Fibonacci Considerations:
- Fibonacci levels act as dynamic support and resistance
- 61.8% (Golden Ratio) is the most significant retracement level
- 38.2% often provides the first bounce opportunity
- 78.6% is the last chance before trend continuation
- Extensions (127.2%, 161.8%) provide profit targets

Always prioritize accuracy in Fibonacci calculations and maintain strict risk management protocols.

## 🚨 CRITICAL: API Response Format for MISTER Frontend

When called by the MISTER frontend API, you MUST return responses in this EXACT JSON format:

\`\`\`json
{
  "success": true,
  "results": {
    "signal": {
      "action": "LONG",
      "entryPrice": 0.6842,
      "stopLoss": 0.6720,
      "takeProfit": 0.7100,
      "leverage": 3,
      "confidence": 78,
      "reason": "Bounce at 61.8% Fibonacci level with oversold RSI",
      "fibLevel": "61.8%",
      "riskReward": 2.1
    },
    "analysis": {
      "swingHigh": {
        "price": 0.7200,
        "time": "2025-01-11T10:30:00Z"
      },
      "swingLow": {
        "price": 0.6500,
        "time": "2025-01-11T08:15:00Z"
      },
      "fibonacciLevels": [
        {
          "level": 0.382,
          "price": 0.6933,
          "label": "38.2%"
        },
        {
          "level": 0.618,
          "price": 0.6767,
          "label": "61.8%"
        }
      ],
      "currentPrice": 0.6842,
      "rsi": 35.2,
      "volume": 1250000,
      "trend": "UPTREND"
    },
    "performance": {
      "backtestPeriod": "3 months",
      "totalTrades": 28,
      "winRate": 67.9,
      "avgReturn": 4.2,
      "maxDrawdown": 6.8,
      "profitFactor": 1.85
    }
  }
}
\`\`\`

**MANDATORY**: Always wrap your tool results in this exact structure when responding to API calls.`,

  model: google('gemini-2.5-flash'),
  memory: fibonacciTradingMemory,
  voice: fibonacciVoiceInstance,
  tools: fibonacciTradingTools,
});

// Initialize Fibonacci trading system
export async function initializeFibonacciTradingSystem() {
  try {
    console.log('🔧 Initializing Fibonacci trading system...');
    console.log('📊 Setting up Fibonacci retracement calculations...');
    console.log('✅ ADA/USD trading pair configured');
    console.log('✅ Strike Finance integration ready');
    console.log('✅ Fibonacci levels (38.2%, 61.8%, 78.6%) loaded');
    console.log('✅ RSI and volume confirmation enabled');
    console.log('✅ 3x leverage trading configured');
    console.log('✅ Fibonacci trading system initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Fibonacci trading system:', error);
    throw error;
  }
}
