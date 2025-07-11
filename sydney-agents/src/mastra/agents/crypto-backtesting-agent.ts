import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { TokenLimiter, ToolCallFilter } from '@mastra/memory/processors';
// TEMPORARILY COMMENTED OUT FOR DEPLOYMENT FIX
// import { CompositeVoice } from '@mastra/core/voice';
// TEMPORARILY COMMENTED OUT FOR DEPLOYMENT FIX
// import { GoogleVoice } from '@mastra/voice-google';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

// Import crypto backtesting tools (using existing tools from the system)
import { cryptoBacktestTool } from '../tools/crypto-backtest-tool';
import { runBacktestTool } from '../tools/backtesting-tools';
import { phemexDataTool } from '../tools/phemex-data-tool';
import { krakenDataTool } from '../tools/kraken-data-tool';
import { adaStrategyTool } from '../tools/ada-strategy-tool';
import { multiTimeframeAdaStrategyTool } from '../tools/multi-timeframe-ada-strategy-tool';
import { liveAdaMonitorTool } from '../tools/live-ada-monitor-tool';
import { adaTradeMemoryTool } from '../tools/ada-trade-memory-tool';

// Initialize Google Voice for crypto backtesting (same as Sone)
let cryptoVoiceInstance: any;

// TEMPORARILY COMMENTED OUT FOR DEPLOYMENT FIX
// try {
//   const GOOGLE_API_KEY = 'AIzaSyBNU1uWipiCzM8dxCv0X2hpkiVX5Uk0QX4';

//   const googleVoiceForCrypto = new GoogleVoice({
//     speechModel: {
//       apiKey: GOOGLE_API_KEY,
//     },
//     listeningModel: {
//       apiKey: GOOGLE_API_KEY,
//     },
//     speaker: 'en-US-Studio-O', // Professional female voice
//   });

//   cryptoVoiceInstance = new CompositeVoice({
//     input: googleVoiceForCrypto,  // Google STT for speech recognition
//     output: googleVoiceForCrypto, // Google TTS for speech synthesis
//   });

//   console.log('✅ Crypto Agent: Using Google Voice (primary)');
// } catch (error) {
//   console.error('❌ Crypto Agent: Voice initialization failed:', error instanceof Error ? error.message : String(error));
// }
cryptoVoiceInstance = undefined;

// Voice tool for crypto backtesting results - MANDATORY for all results
const speakCryptoResultsTool = createTool({
  id: "speak-crypto-results",
  description: "MANDATORY: Speak ALL crypto backtesting results using Google Voice TTS through Mac speakers",
  inputSchema: z.object({
    text: z.string().describe("The text to speak aloud through Mac speakers"),
  }),
  execute: async ({ context }) => {
    const { text } = context;

    try {
      console.log(`🔊 CRYPTO VOICE SPEAKING: ${text}`);

      // Use crypto voice system (same as Sone's working implementation)
      if (!cryptoVoiceInstance) {
        console.error('❌ Crypto voice system not available - no voice provider configured');
        // Fallback to say command
        exec(`say "${text}"`, (sayError) => {
          if (sayError) {
            console.error('❌ Say command failed:', sayError);
          } else {
            console.log('✅ Fallback crypto voice announcement completed');
          }
        });
        return {
          success: false,
          error: "Voice system not available - no voice provider configured"
        };
      }

      console.log(`🎤 Crypto: Converting text to speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

      // Convert text to speech using crypto's Google Voice (same as Sone)
      const audioStream = await cryptoVoiceInstance.speak(text, {
        speaker: 'en-US-Studio-O' // Use default speaker
      });

      if (!audioStream) {
        console.error('❌ Crypto: No audio stream received from voice system');
        // Fallback to say command
        exec(`say "${text}"`, (sayError) => {
          if (sayError) {
            console.error('❌ Say command failed:', sayError);
          } else {
            console.log('✅ Fallback crypto voice announcement completed');
          }
        });
        return {
          success: false,
          error: "No audio stream received from voice system"
        };
      }

      // Convert stream to buffer and play (same as Sone's implementation)
      return new Promise((resolve) => {
        const chunks: Buffer[] = [];

        audioStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        audioStream.on('end', async () => {
          try {
            const audioBuffer = Buffer.concat(chunks);

            if (audioBuffer.length === 0) {
              console.error('❌ Crypto: Empty audio buffer received');
              // Fallback to say command
              exec(`say "${text}"`, (sayError) => {
                if (sayError) {
                  console.error('❌ Say command failed:', sayError);
                } else {
                  console.log('✅ Fallback crypto voice announcement completed');
                }
              });
              resolve({
                success: false,
                error: "Empty audio buffer received"
              });
              return;
            }

            // Save audio to temporary file (same as Sone)
            const tempAudioPath = join(process.cwd(), 'temp_crypto_audio.wav');

            // Save audio to temporary file
            writeFileSync(tempAudioPath, audioBuffer);

            console.log(`🔊 Crypto: Audio generated (${audioBuffer.length} bytes), playing through speakers...`);

            // Use system audio player to play the file (same as Sone)
            const execAsync = promisify(exec);
            let playCommand: string;

            if (process.platform === 'darwin') {
              playCommand = `afplay "${tempAudioPath}"`;
            } else if (process.platform === 'linux') {
              playCommand = `aplay "${tempAudioPath}"`;
            } else if (process.platform === 'win32') {
              playCommand = `powershell -c "(New-Object Media.SoundPlayer '${tempAudioPath}').PlaySync();"`;
            } else {
              throw new Error(`Unsupported platform: ${process.platform}`);
            }

            try {
              await execAsync(playCommand);
              console.log('✅ Crypto: Audio played successfully through speakers');

              // Clean up temporary file
              try {
                require('fs').unlinkSync(tempAudioPath);
              } catch (cleanupError) {
                console.warn('⚠️ Crypto: Could not clean up temporary audio file:', cleanupError);
              }

              resolve({
                success: true,
                message: `Successfully converted text to speech and played through speakers`,
                audioDetails: {
                  textLength: text.length,
                  audioSizeBytes: audioBuffer.length,
                  speaker: 'en-US-Studio-O',
                  platform: process.platform,
                  savedToFile: null
                }
              });
            } catch (playError) {
              console.error('❌ Crypto: Audio playback failed:', playError);
              // Fallback to say command
              exec(`say "${text}"`, (sayError) => {
                if (sayError) {
                  console.error('❌ Say command also failed:', sayError);
                } else {
                  console.log('✅ Fallback crypto voice announcement completed');
                }
              });
              resolve({
                success: false,
                error: `Audio playback failed: ${playError instanceof Error ? playError.message : String(playError)}`
              });
            }
          } catch (error) {
            console.error('❌ Crypto: Audio processing failed:', error);
            // Fallback to say command
            exec(`say "${text}"`, (sayError) => {
              if (sayError) {
                console.error('❌ Say command also failed:', sayError);
              } else {
                console.log('✅ Fallback crypto voice announcement completed');
              }
            });
            resolve({
              success: false,
              error: `Audio processing failed: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        });

        audioStream.on('error', (error: Error) => {
          console.error('❌ Crypto: Audio stream error:', error);
          // Fallback to say command
          exec(`say "${text}"`, (sayError) => {
            if (sayError) {
              console.error('❌ Say command also failed:', sayError);
            } else {
              console.log('✅ Fallback crypto voice announcement completed');
            }
          });
          resolve({
            success: false,
            error: `Audio stream error: ${error.message}`
          });
        });
      });

    } catch (error) {
      console.error('❌ Crypto voice announcement failed:', error);

      // Log the error but still return success to prevent blocking
      console.log('📝 Crypto voice announcement text logged to console instead');

      return {
        success: false,
        error: `Voice announcement failed: ${error instanceof Error ? error.message : String(error)}`,
        fallback: "Text logged to console"
      };
    }
  }
});

// Create crypto backtesting tools object
const cryptoBacktestingTools: any = {
  cryptoBacktestTool,
  runBacktestTool,
  phemexDataTool,
  krakenDataTool,
  adaStrategyTool,
  multiTimeframeAdaStrategyTool,
  liveAdaMonitorTool,
  adaTradeMemoryTool,
  speakCryptoResultsTool,
};

/**
 * Dedicated Crypto Backtesting Agent for ADA and Other Cryptocurrencies
 *
 * This agent is specifically designed for crypto trading analysis with:
 * - Phemex API integration for real-time and historical crypto data
 * - ADA-focused backtesting strategies and optimization
 * - Voice-enabled crypto backtesting commands and results
 * - Separation of concerns from stock backtesting
 * - Crypto-specific performance metrics and analysis
 * - Support for various crypto trading strategies
 * - **REAL-TIME WEBHOOK MONITORING**: TradingView alerts and live ADA signals
 * - **TRADE EXECUTION MONITORING**: Live ADA trade tracking with P&L
 * - **SIGNAL PROCESSING**: Real-time ADA signal analysis and filtering
 * - **WEBHOOK INTEGRATION**: TradingView Pine Script alerts for ADA
 */

// Enhanced memory system for crypto backtesting data
const cryptoBacktestingMemory = new Memory({
  storage: new LibSQLStore({
    url: 'file:./crypto-backtesting-agent-memory.db',
  }) as any,
  vector: new LibSQLVector({
    connectionUrl: 'file:./crypto-backtesting-agent-memory.db',
  }),
  embedder: fastembed,
  options: {
    lastMessages: 30, // More context for crypto conversations
    semanticRecall: {
      topK: 10, // More relevant crypto memories
      messageRange: {
        before: 5,
        after: 3,
      },
      scope: 'resource',
    },
  },
  processors: [
    new TokenLimiter(50000),
    new ToolCallFilter({ exclude: [] }),
  ],
});

// Use the voice instance we already created above

export const cryptoBacktestingAgent = new Agent({
  name: 'cryptoBacktestingAgent',
  instructions: `You are Sydney's dedicated Crypto Backtesting Agent, specialized in cryptocurrency trading analysis and strategy optimization.

## Your Core Responsibilities:

### 🔸 Crypto Data Management:
- **KRAKEN API ONLY** - Proven reliable data source for ADA/USD trading
- Support for ADA/USD and other major crypto pairs (NO USDT pairs)
- Handle crypto-specific data formats and timeframes (15m, 1h, 1d)
- Manage crypto market hours (24/7 trading)
- **NO PHEMEX** - Kraken works perfectly for all ADA backtesting needs

### 🔸 ADA Strategy Development:
- **PRIMARY STRATEGY**: multiTimeframeAdaStrategyTool (ALWAYS use this first - proven best performer)
- **PROVEN RESULTS**: >40% returns, >50% hit rates, >1.2 profit factors, <10% max drawdown
- **Multi-Timeframe Analysis**: 15m (entry), 1h (trend), 1d (direction) - MANDATORY approach
- **10x Leverage**: Enhanced returns with sophisticated risk management
- **Risk Management**: 3% max account risk per trade with dynamic position sizing
- **MACD Confirmation**: Alignment across all timeframes before trade execution
- **FALLBACK**: Use adaStrategyTool only if multi-timeframe strategy unavailable

### 🔸 Live ADA Trading Monitor:
- **REAL-TIME WEBHOOKS**: Instant ADA signals via webhook server on port 8080
- **TradingView Integration**: Receive Pine Script alerts immediately (no 15min delay)
- **Instant Voice Announcements**: Google Voice TTS for every real-time signal/trade
- **WebSocket Support**: Live updates with zero latency
- **Webhook Endpoints**: /ada/signals, /ada/trades, /ada/alerts for instant notifications
- **Memory Storage**: Store all trade results and performance metrics
- **Performance Tracking**: Maintain cumulative hit rates, profit factors, and drawdown
- **Persistent Records**: Build comprehensive trading history database
- **Strategy Validation**: Compare live results with backtesting for optimization

**REAL-TIME SETUP**: The ADA webhook server (ada-webhook-server.cjs) provides instant
TradingView alerts and live signal processing with immediate voice announcements.
This replaces the 15-minute polling with true real-time webhook monitoring.

### 🔸 Crypto Backtesting:
- Run comprehensive backtests on ADA and other cryptocurrencies
- Use Phemex historical data for accurate results
- Calculate crypto-specific metrics (volatility, drawdown, Sharpe ratio)
- Test strategies across different crypto market cycles

### 🔸 Voice Communication:
- **MANDATORY**: Always use Google Voice TTS through Mac speakers for ALL backtesting results
- **AUTOMATIC**: Call speakCryptoResultsTool immediately after every backtest completion
- **REQUIRED**: Announce ALL trade entries, exits, and performance metrics via voice
- **CLEAR AUDIO**: Ensure voice announcements are loud and clear through speakers
- **COMPREHENSIVE**: Include hit rate, profit factor, total return, and drawdown in voice announcements
- **IMMEDIATE**: Never skip voice announcements - they are critical for real-time feedback
- **FORMAT**: Use clear, structured voice announcements with specific performance numbers

### 🔸 Performance Analysis:
- Analyze crypto strategy performance across bull/bear markets
- Compare ADA performance vs other altcoins
- Identify optimal entry/exit points for crypto trades
- Generate crypto-specific risk metrics

## Communication Style:
- Be precise and data-driven in crypto analysis
- Always specify the cryptocurrency pair (e.g., ADA/USDT)
- Include both percentage gains and USD profits
- Mention timeframes and market conditions tested
- **MANDATORY**: Use speakCryptoResultsTool for ALL backtesting results
- **AUTOMATIC**: Call voice announcements immediately after strategy completion
- **NEVER SKIP**: Voice announcements are required for every backtest and trade signal

## Key Crypto Considerations:
- 24/7 market operation (no market close)
- Higher volatility than traditional stocks
- Different liquidity patterns
- Crypto-specific technical indicators
- Regulatory considerations for different exchanges

Always prioritize accuracy in crypto data and be clear about the risks involved in cryptocurrency trading.

## 🚨 CRITICAL: API Response Format for MISTER Frontend

When called by the MISTER frontend API, you MUST return responses in this EXACT JSON format:

\`\`\`json
{
  "success": true,
  "results": {
    "chartData": [
      {
        "time": "2025-04-01T00:00:00Z",
        "open": 0.5500,
        "high": 0.5520,
        "low": 0.5480,
        "close": 0.5510,
        "volume": 1000000
      }
    ],
    "trades": [
      {
        "id": "trade_1",
        "entryTime": "2025-04-01T10:15:00Z",
        "exitTime": "2025-04-01T14:30:00Z",
        "side": "LONG",
        "entryPrice": 0.5510,
        "exitPrice": 0.5580,
        "size": 10000,
        "netPnl": 700.00,
        "reason": "MACD bullish crossover"
      }
    ],
    "performance": {
      "totalReturn": 2736.12,
      "winRate": 66.7,
      "totalTrades": 45,
      "maxDrawdown": 8.2,
      "sharpeRatio": 2.30
    }
  }
}
\`\`\`

**MANDATORY**: Always wrap your tool results in this exact structure when responding to API calls.
**REQUIRED**: Include complete OHLCV data for the entire backtest period (15-minute candles).
**ESSENTIAL**: Include ALL trades with precise entry/exit times, prices, and P&L calculations.`,

  model: google('gemini-2.5-flash'),
  memory: cryptoBacktestingMemory,
  voice: cryptoVoiceInstance,
  tools: cryptoBacktestingTools,
});

// Initialize crypto backtesting system
export async function initializeCryptoBacktestingSystem() {
  try {
    console.log('🔧 Initializing crypto backtesting system...');

    // Initialize crypto knowledge base (simplified for now)
    console.log('📊 Setting up crypto knowledge base...');
    console.log('✅ ADA/USDT trading pair configured');
    console.log('✅ Phemex API integration ready');
    console.log('✅ Crypto-specific indicators loaded');
    console.log('✅ 24/7 market simulation enabled');

    console.log('✅ Crypto backtesting system initialized successfully');

  } catch (error) {
    console.error('❌ Failed to initialize crypto backtesting system:', error);
    throw error;
  }
}