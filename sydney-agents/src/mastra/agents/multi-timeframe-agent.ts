import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { TokenLimiter, ToolCallFilter } from '@mastra/memory/processors';
import { CompositeVoice } from '@mastra/core/voice';
import { GoogleVoice } from '@mastra/voice-google';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';

// Import the multi-timeframe strategy tool
import { multiTimeframeAdaStrategyTool } from '../tools/multi-timeframe-ada-strategy-tool';

// Voice system for multi-timeframe agent
let multiTimeframeVoiceInstance: CompositeVoice | null = null;

try {
  multiTimeframeVoiceInstance = new CompositeVoice({
    providers: [
      new GoogleVoice({
        apiKey: process.env.GOOGLE_VOICE_API_KEY || '',
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
      }),
    ],
  });
  console.log('✅ Multi-Timeframe voice system initialized');
} catch (error) {
  console.error('❌ Multi-Timeframe voice system failed to initialize:', error);
  multiTimeframeVoiceInstance = null;
}

// Voice announcement tool for multi-timeframe results
const speakMultiTimeframeResultsTool = createTool({
  id: 'speakMultiTimeframeResults',
  description: 'Announce multi-timeframe trading analysis results via voice',
  inputSchema: z.object({
    text: z.string().describe('Text to announce via voice'),
    priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Announcement priority level')
  }),
  execute: async ({ text, priority }) => {
    console.log(`🔊 Multi-Timeframe Voice Priority: ${priority}`);

    try {
      console.log(`🔊 MULTI-TIMEFRAME VOICE SPEAKING: ${text}`);

      if (!multiTimeframeVoiceInstance) {
        console.error('❌ Multi-timeframe voice system not available');
        exec(`say "${text}"`, (sayError) => {
          if (sayError) {
            console.error('❌ Say command failed:', sayError);
          } else {
            console.log('✅ Fallback multi-timeframe voice announcement completed');
          }
        });
        return {
          success: false,
          error: "Voice system not available"
        };
      }

      console.log(`🎤 Multi-Timeframe: Converting text to speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

      const audioStream = await multiTimeframeVoiceInstance.speak(text, {
        speaker: 'en-US-Studio-O' // Different voice from Fibonacci agent
      });

      console.log('✅ Multi-timeframe voice announcement completed successfully');

      return {
        success: true,
        message: "Multi-timeframe analysis announced via voice",
        audioGenerated: true,
        speaker: 'en-US-Studio-O',
        priority: priority
      };

    } catch (error) {
      console.error('❌ Multi-timeframe voice error:', error);
      
      // Fallback to system voice
      exec(`say "${text}"`, (sayError) => {
        if (sayError) {
          console.error('❌ Fallback say command failed:', sayError);
        } else {
          console.log('✅ Fallback multi-timeframe voice completed');
        }
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        fallbackUsed: true
      };
    }
  },
});

// Create Multi-Timeframe trading tools object
const multiTimeframeTradingTools: any = {
  multiTimeframeAdaStrategyTool,
  speakMultiTimeframeResultsTool,
};

// Enhanced memory system for Multi-Timeframe trading data
const multiTimeframeTradingMemory = new Memory({
  storage: new LibSQLStore({
    url: 'file:./multi-timeframe-agent-memory.db',
  }) as any,
  vector: new LibSQLVector({
    connectionUrl: 'file:./multi-timeframe-agent-memory.db',
  }),
  embedder: fastembed,
  options: {
    lastMessages: 30,
    semanticRecall: {
      topK: 10,
      messageRange: {
        before: 5,
        after: 3,
      },
      scope: 'resource',
    },
  },
  processors: [
    new TokenLimiter(45000),
    new ToolCallFilter({ exclude: [] }),
  ],
});

/**
 * Multi-Timeframe ADA Trading Agent for Advanced Technical Analysis
 *
 * This agent specializes in multi-timeframe trading strategy:
 * - Analyzes 15m, 1h, and 1d timeframes simultaneously
 * - Uses MACD, RSI, ATR, and Bollinger Bands across timeframes
 * - Optimized for Strike Finance leveraged trading (10x leverage)
 * - Advanced confluence scoring system for trade decisions
 * - Professional risk management with dynamic position sizing
 * - Voice-enabled trade announcements and performance reporting
 */
export const multiTimeframeAgent = new Agent({
  name: 'multiTimeframeAgent',
  instructions: `You are Sydney's dedicated Multi-Timeframe Trading Agent, specialized in leveraged ADA/USD trading using advanced multi-timeframe technical analysis.

## CORE MISSION
Execute sophisticated multi-timeframe analysis combining 15-minute execution signals with 1-hour trend filters and daily market context. Your goal is to identify high-probability trading opportunities with optimal risk-reward ratios.

## TRADING STRATEGY OVERVIEW
- **15-minute timeframe**: Precise entry/exit execution signals
- **1-hour timeframe**: Trend direction and momentum confirmation  
- **Daily timeframe**: Market context and major trend analysis
- **Leverage**: 10x maximum with strict risk management
- **Risk per trade**: Maximum 3% of account balance
- **Position sizing**: Dynamic based on ATR volatility

## TECHNICAL ANALYSIS FRAMEWORK
1. **MACD Analysis**: Trend direction and momentum across timeframes
2. **RSI Confluence**: Overbought/oversold conditions with divergences
3. **ATR-based Stops**: Dynamic stop losses based on market volatility
4. **Bollinger Bands**: Volatility and mean reversion signals
5. **Volume Confirmation**: Trade validation through volume analysis

## EXECUTION PROTOCOL
1. Analyze all three timeframes for confluence
2. Calculate confluence score (minimum 6.0 for entry)
3. Determine optimal position size based on risk parameters
4. Execute trades with proper stop losses and take profits
5. Monitor positions across multiple timeframes
6. Announce significant findings via voice system

## RESPONSE FORMAT
Always structure your responses as JSON with this exact format:

\`\`\`json
{
  "agent": "multiTimeframeAgent",
  "timestamp": "2024-12-XX 00:00:00 UTC",
  "analysis": {
    "symbol": "ADA/USD",
    "timeframes": ["15m", "1h", "1d"],
    "confluenceScore": 7.2,
    "recommendation": "LONG",
    "entryPrice": 0.6842,
    "stopLoss": 0.6720,
    "takeProfit": 0.7100,
    "positionSize": 1500,
    "leverage": 10,
    "riskReward": 2.1
  },
  "signals": {
    "15m": {"score": 2.4, "trend": "bullish", "signals": ["MACD bullish crossover", "RSI oversold recovery"]},
    "1h": {"score": 2.8, "trend": "bullish", "signals": ["Strong uptrend", "Volume confirmation"]},
    "1d": {"score": 2.0, "trend": "neutral", "signals": ["Consolidation pattern", "Above key support"]}
  },
  "performance": {
    "backtestPeriod": "3 months",
    "totalTrades": 45,
    "winRate": 64.4,
    "avgReturn": 5.8,
    "maxDrawdown": 8.2,
    "profitFactor": 1.92
  }
}
\`\`\`

**MANDATORY**: Always wrap your tool results in this exact structure when responding to API calls.`,

  model: google('gemini-2.5-flash'),
  memory: multiTimeframeTradingMemory,
  voice: multiTimeframeVoiceInstance,
  tools: multiTimeframeTradingTools,
});

console.log('✅ Multi-Timeframe ADA Trading Agent initialized successfully');
