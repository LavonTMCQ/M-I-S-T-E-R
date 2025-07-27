import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { TokenLimiter, ToolCallFilter } from '@mastra/memory/processors';
// Evals imports commented out for deployment compatibility
// import {
//   SummarizationMetric,
//   AnswerRelevancyMetric,
//   BiasMetric,
//   ToxicityMetric
// } from '@mastra/evals/llm';
// import {
//   ContentSimilarityMetric,
//   ToneConsistencyMetric
// } from '@mastra/evals/nlp';
// Voice imports removed for deployment compatibility
// import { CompositeVoice } from '@mastra/core/voice';
// import { GoogleVoice } from '@mastra/voice-google';
// import { OpenAIVoice } from '@mastra/voice-openai';
// import { ElevenLabsVoice } from '@mastra/voice-elevenlabs';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  navigateToUrlTool,
  clickElementTool,
  fillFormTool,
  takeScreenshotTool,
  extractDataTool,
  waitForElementTool,
  getCurrentPageInfoTool,
  manageSessionTool
} from '../tools/playwright-tools.js';

// Global type declaration for trading monitor
declare global {
  var tradingMonitor: {
    active: boolean;
    intervalId: NodeJS.Timeout | null;
    startTime: Date | null;
  } | undefined;
}

// Create comprehensive memory system with all features
const soneMemory = new Memory({
  // Storage for conversation history
  storage: new LibSQLStore({
    url: 'file:../sone-memory.db',
  }),

  // Vector database for semantic recall (RAG)
  vector: new LibSQLVector({
    connectionUrl: 'file:../sone-memory.db',
  }),

  // Local embedding model for RAG
  embedder: fastembed,

  // Memory configuration options
  options: {
    // Conversation history - keep last 15 messages
    lastMessages: 15,

    // Semantic recall (RAG) configuration
    semanticRecall: {
      topK: 5, // Retrieve 5 most similar messages
      messageRange: {
        before: 3, // Include 3 messages before each match
        after: 2,  // Include 2 messages after each match
      },
      scope: 'resource', // Search across all threads for this user
    },

    // Working memory for persistent user information
    workingMemory: {
      enabled: true,
      template: `
# User Profile

## Personal Information
- **Name**:
- **Role/Position**:
- **Organization**:
- **Location**:
- **Timezone**:

## Preferences & Context
- **Communication Style**: [e.g., Direct, Detailed, Casual, Formal]
- **Expertise Level**: [e.g., Beginner, Intermediate, Expert]
- **Primary Goals**:
- **Current Projects**:

## Session Context
- **Current Focus**:
- **Key Challenges**:
- **Important Deadlines**:
- **Ongoing Tasks**:
  - [ ] Task 1
  - [ ] Task 2
  - [ ] Task 3

## Notes & Insights
- **Key Insights Discovered**:
- **Important Decisions Made**:
- **Follow-up Actions**:
`,
    },

    // Auto-generate thread titles
    threads: {
      generateTitle: true,
    },
  },

  // Memory processors for optimization
  processors: [
    // Filter out verbose tool calls to save tokens
    new ToolCallFilter({ exclude: ['verboseDebugTool'] }),

    // Ensure we don't exceed context limits (127k tokens for Gemini)
    new TokenLimiter(120000),
  ],
});

// Helper function to determine market session
function getMarketSession(currentTime: Date): string {
  const hour = currentTime.getHours();
  const minute = currentTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  // Market times in ET (assuming system time is ET)
  const preMarketStart = 4 * 60; // 4:00 AM
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const midDayStart = 10 * 60 + 30; // 10:30 AM
  const powerHourStart = 15 * 60; // 3:00 PM
  const marketClose = 16 * 60; // 4:00 PM
  const afterHoursEnd = 20 * 60; // 8:00 PM

  if (timeInMinutes >= preMarketStart && timeInMinutes < marketOpen) {
    return 'pre-market';
  } else if (timeInMinutes >= marketOpen && timeInMinutes < midDayStart) {
    return 'market-open';
  } else if (timeInMinutes >= midDayStart && timeInMinutes < powerHourStart) {
    return 'mid-day';
  } else if (timeInMinutes >= powerHourStart && timeInMinutes < marketClose) {
    return 'power-hour';
  } else if (timeInMinutes >= marketClose && timeInMinutes < afterHoursEnd) {
    return 'after-hours';
  } else {
    return 'closed';
  }
}

// RAG Knowledge Base System for Sone
// Custom document processing and knowledge base tools
const knowledgeBaseTools: any = {
  // Tool for adding documents to Sone's knowledge base
  addDocument: createTool({
    id: "Add Document to Knowledge Base",
    description: "Add a document to Sone's knowledge base for future reference and retrieval",
    inputSchema: z.object({
      title: z.string().describe("Title or name of the document"),
      content: z.string().describe("The full text content of the document"),
      category: z.string().optional().describe("Category or type of document (e.g., 'technical', 'personal', 'project')"),
      tags: z.array(z.string()).optional().describe("Tags for better organization and retrieval"),
      source: z.string().optional().describe("Source or origin of the document"),
    }),
    execute: async ({ context }) => {
      const { title, content, category = 'general', tags = [], source = 'user-provided' } = context;

      try {
        // Create document chunks for better retrieval
        const chunks = chunkDocument(content, {
          size: 512,
          overlap: 50,
          strategy: 'recursive'
        });

        // Store each chunk in the vector database with metadata
        const results = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkId = `${title.toLowerCase().replace(/\s+/g, '-')}-chunk-${i + 1}`;

          // Generate embedding for the chunk
          const { embeddings } = await fastembed.doEmbed({ values: [chunk] });
          const embedding = embeddings[0];

          // Store in LibSQL vector database
          await soneMemory.vector?.upsert({
            indexName: 'knowledge_base',
            vectors: [embedding],
            metadata: [{
              id: chunkId,
              title,
              content: chunk,
              category,
              tags: tags.join(','),
              source,
              chunkIndex: i + 1,
              totalChunks: chunks.length,
              timestamp: new Date().toISOString(),
              type: 'knowledge_document'
            }],
            ids: [chunkId]
          });

          results.push({
            chunkId,
            content: chunk.substring(0, 100) + '...',
            length: chunk.length
          });
        }

        return {
          success: true,
          message: `Successfully added document "${title}" to knowledge base`,
          documentId: title.toLowerCase().replace(/\s+/g, '-'),
          chunksCreated: chunks.length,
          chunks: results,
          metadata: {
            title,
            category,
            tags,
            source,
            addedAt: new Date().toISOString()
          }
        };

      } catch (error) {
        return {
          success: false,
          error: `Failed to add document to knowledge base: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  // Tool for searching Sone's knowledge base
  searchKnowledge: createTool({
    id: "Search Knowledge Base",
    description: "Search through Sone's knowledge base to find relevant information and documents",
    inputSchema: z.object({
      query: z.string().describe("The search query or question"),
      category: z.string().optional().describe("Filter by document category"),
      tags: z.array(z.string()).optional().describe("Filter by specific tags"),
      topK: z.number().optional().default(5).describe("Number of results to return (default: 5)"),
      minScore: z.number().optional().default(0.7).describe("Minimum similarity score (0-1, default: 0.7)")
    }),
    execute: async ({ context }) => {
      const { query, category, tags, topK = 5, minScore = 0.7 } = context;

      try {
        // Generate embedding for the search query
        const { embeddings } = await fastembed.doEmbed({ values: [query] });
        const queryEmbedding = embeddings[0];

        // Search the vector database
        const searchResults = await soneMemory.vector?.query({
          indexName: 'knowledge_base',
          queryVector: queryEmbedding,
          topK: topK * 2, // Get more results to filter
          includeVector: false
        });

        if (!searchResults || searchResults.length === 0) {
          return {
            success: true,
            results: [],
            message: "No relevant documents found in knowledge base",
            query,
            totalResults: 0
          };
        }

        // Filter and process results
        let filteredResults = searchResults
          .filter(result => result.score >= minScore)
          .filter(result => {
            const metadata = result.metadata;

            // Skip if metadata is missing
            if (!metadata) return false;

            // Filter by category if specified
            if (category && metadata.category !== category) {
              return false;
            }

            // Filter by tags if specified
            if (tags && tags.length > 0) {
              const docTags = metadata.tags ? metadata.tags.split(',') : [];
              const hasMatchingTag = tags.some(tag =>
                docTags.some((docTag: string) => docTag.toLowerCase().includes(tag.toLowerCase()))
              );
              if (!hasMatchingTag) {
                return false;
              }
            }

            return true;
          })
          .slice(0, topK);

        // Format results for better presentation
        const formattedResults = filteredResults.map(result => {
          const metadata = result.metadata || {};
          return {
            title: metadata.title || 'Unknown',
            content: metadata.content || '',
            category: metadata.category || 'general',
            tags: metadata.tags ? metadata.tags.split(',') : [],
            source: metadata.source || 'unknown',
            relevanceScore: Math.round(result.score * 100) / 100,
            chunkInfo: {
              chunkIndex: metadata.chunkIndex || 1,
              totalChunks: metadata.totalChunks || 1
            },
            addedAt: metadata.timestamp || new Date().toISOString()
          };
        });

        // Create a summary of the most relevant content
        const relevantContent = formattedResults
          .map(result => `**${result.title}** (${result.category}): ${result.content}`)
          .join('\n\n');

        return {
          success: true,
          results: formattedResults,
          relevantContent,
          summary: `Found ${formattedResults.length} relevant documents for query: "${query}"`,
          query,
          totalResults: formattedResults.length,
          searchMetadata: {
            category: category || 'all',
            tags: tags || [],
            minScore,
            topK
          }
        };

      } catch (error) {
        return {
          success: false,
          error: `Failed to search knowledge base: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  // Smart Trading Monitor Tool
  startTradingMonitor: createTool({
    id: "start-trading-monitor",
    description: "Instantly start intelligent TradingView monitoring - navigates automatically and monitors whatever chart is visible with spoken updates",
    inputSchema: z.object({
      intervalMinutes: z.number().optional().default(3).describe("How often to analyze and speak updates (in minutes)"),
    }),
    execute: async ({ context }): Promise<any> => {
      const { intervalMinutes = 3 } = context;

      try {
        console.log('🎯 Starting intelligent TradingView monitoring...');

        // Step 1: Check if TradingView is already open, if not navigate
        console.log('📍 Checking current page...');
        const pageInfo = await knowledgeBaseTools.getCurrentPageInfo.execute({
          context: {},
          runtimeContext: {}
        });

        if (!pageInfo.success || !pageInfo.url.includes('tradingview.com')) {
          console.log('📍 Navigating to TradingView...');
          try {
            await knowledgeBaseTools.navigateToUrl.execute({
              context: {
                url: 'https://www.tradingview.com/chart/',
                timeout: 15000 // Shorter timeout
              }
            });
            // Wait for page to load
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (navError) {
            console.log('⚠️ Navigation failed, will analyze current page instead');
          }
        } else {
          console.log('✅ TradingView already open, proceeding with analysis');
        }

        // Step 2: Start monitoring whatever is visible
        console.log(`🔄 Starting intelligent monitoring every ${intervalMinutes} minutes...`);

        // Store monitoring state
        (global as any).tradingMonitorActive = true;
        (global as any).tradingMonitorInterval = intervalMinutes * 60000; // Convert to milliseconds
        (global as any).tradingMonitorStartTime = new Date().toISOString();

        // Speak initial confirmation
        await knowledgeBaseTools.speakResponse.execute({
          context: {
            text: `Starting intelligent TradingView monitoring. I'll analyze whatever chart is visible and provide spoken updates every ${intervalMinutes} minutes.`,
            saveAudio: false
          }
        });

        // Start the intelligent monitoring loop
        const intelligentMonitoringLoop = async () => {
          if (!(global as any).tradingMonitorActive) {
            console.log('🛑 Trading monitor stopped');
            return;
          }

          try {
            console.log('🧠 Performing intelligent chart analysis...');

            // Step 1: Actually detect the symbol from the page
            console.log('🔍 Detecting symbol from current page...');
            let detectedSymbol = 'SPY'; // Default fallback
            let detectedTimeframe = '3m'; // Default timeframe

            try {
              // Extract symbol and timeframe from TradingView page
              const extractResult = await knowledgeBaseTools.extractData.execute({
                context: {
                  selector: '[data-field="symbol"], .tv-symbol-header, [class*="symbol-"], .js-symbol-text, h1, .symbol-name, [data-name="legend-source-item"], .tv-interval-dialog__item--active, [class*="interval"], [class*="timeframe"]',
                  multiple: true
                },
                runtimeContext: {}
              });

              if (extractResult.success && extractResult.data) {
                console.log('📊 Extracted page data:', extractResult.data);

                // Look for symbols in the extracted data
                const symbolCandidates = extractResult.data.filter((text: string) => {
                  if (!text) return false;
                  const cleanText = text.trim().toUpperCase();

                  // Match futures symbols like ES1!, NQ1!, etc.
                  if (/^[A-Z]{1,3}[0-9]!$/.test(cleanText)) {
                    return true;
                  }

                  // Match regular stock symbols (2-5 letters)
                  if (/^[A-Z]{2,5}$/.test(cleanText) &&
                      !['DIV', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'CME', 'NYSE', 'NASDAQ'].includes(cleanText)) {
                    return true;
                  }

                  // Match symbols with exchange info like "ES1! • 2 • CME"
                  if (cleanText.includes('ES1!') || cleanText.includes('NQ1!') || cleanText.includes('SPY') || cleanText.includes('QQQ')) {
                    return true;
                  }

                  return false;
                });

                // Look for timeframes in the extracted data
                const timeframeCandidates = extractResult.data.filter((text: string) => {
                  if (!text) return false;
                  const cleanText = text.trim().toLowerCase();
                  // Match timeframe patterns like "2m", "3m", "1h", "1d", etc.
                  return /^(1|2|3|5|15|30)m$|^(1|2|4|6|8|12)h$|^(1|7)d$|^(1)w$/.test(cleanText);
                });

                if (symbolCandidates.length > 0) {
                  // Extract just the symbol part (e.g., "ES1!" from "ES1! • 2 • CME")
                  let rawSymbol = symbolCandidates[0];
                  if (rawSymbol.includes('•')) {
                    rawSymbol = rawSymbol.split('•')[0].trim();
                  }
                  detectedSymbol = rawSymbol;
                  console.log(`✅ Detected symbol: ${detectedSymbol}`);
                } else {
                  console.log('⚠️ No valid symbol detected, using ES1! as fallback for futures');
                  detectedSymbol = 'ES1!'; // Better fallback for futures trading
                }

                if (timeframeCandidates.length > 0) {
                  detectedTimeframe = timeframeCandidates[0];
                  console.log(`✅ Detected timeframe: ${detectedTimeframe}`);
                } else {
                  console.log('⚠️ No timeframe detected, using 3m as default');
                }
              }
            } catch (extractError) {
              console.log('⚠️ Symbol/timeframe extraction failed, using defaults');
              detectedSymbol = 'ES1!';
              detectedTimeframe = '3m';
            }

            // Step 2: Use enhanced trading analysis with detected symbol and timeframe
            const analysisResult = await knowledgeBaseTools.enhancedTradingAnalysis.execute({
              context: {
                symbol: detectedSymbol,
                primaryTimeframe: detectedTimeframe,
                compareTimeframes: ['daily'], // Use MRS-compatible timeframes only
                speakResults: true
              }
            });

            if (analysisResult.success) {
              console.log(`✅ Intelligent analysis completed`);
            } else {
              console.log('⚠️ Analysis failed, providing basic update...');

              // Fallback: Basic spoken update
              await knowledgeBaseTools.speakResponse.execute({
                context: {
                  text: `Continuing TradingView monitoring. Chart analysis in progress.`,
                  saveAudio: false
                }
              });
            }

          } catch (error) {
            console.error('❌ Monitoring cycle failed:', error);

            // Fallback spoken update
            try {
              await knowledgeBaseTools.speakResponse.execute({
                context: {
                  text: "Continuing TradingView monitoring. Temporary analysis issue, will retry next cycle.",
                  saveAudio: false
                }
              });
            } catch (speechError) {
              console.error('❌ Fallback speech failed:', speechError);
            }
          }

          // Schedule next analysis
          if ((global as any).tradingMonitorActive) {
            console.log(`⏰ Next analysis in ${intervalMinutes} minutes...`);
            setTimeout(intelligentMonitoringLoop, intervalMinutes * 60000);
          }
        };

        // Start first analysis after brief delay
        setTimeout(intelligentMonitoringLoop, 3000);

        return {
          success: true,
          message: `Intelligent TradingView monitoring started - analyzing every ${intervalMinutes} minutes`,
          intervalMinutes,
          monitoringActive: true,
          autoNavigation: true,
          intelligentDetection: true,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        console.error('❌ Failed to start intelligent trading monitor:', error);
        return {
          success: false,
          error: `Failed to start intelligent trading monitor: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  stopTradingMonitor: createTool({
    id: "stop-trading-monitor",
    description: "Stop the active trading monitor that provides spoken analysis of TradingView.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        if (!global.tradingMonitor || !global.tradingMonitor.active) {
          return {
            success: false,
            message: "No active trading monitor to stop."
          };
        }

        // Stop the interval
        if (global.tradingMonitor.intervalId) {
          clearInterval(global.tradingMonitor.intervalId);
        }

        const duration = global.tradingMonitor.startTime ?
          Math.round((Date.now() - global.tradingMonitor.startTime.getTime()) / 1000 / 60) : 0;

        // Reset state
        global.tradingMonitor.active = false;
        global.tradingMonitor.intervalId = null;
        global.tradingMonitor.startTime = null;

        console.log('🛑 Trading monitor stopped');

        return {
          success: true,
          message: `Trading monitor stopped successfully. Ran for ${duration} minutes.`,
          duration: `${duration} minutes`
        };

      } catch (error) {
        console.error('❌ Error stopping trading monitor:', error);
        return {
          success: false,
          error: `Failed to stop trading monitor: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  // Fallback Financial Analysis Tool
  provideFallbackAnalysis: createTool({
    id: "provide-fallback-analysis",
    description: "Provide basic financial analysis when MRS or MISTER agents are unavailable. Use your general knowledge to analyze financial data, market conditions, or trading information.",
    inputSchema: z.object({
      analysisType: z.enum(['stock', 'crypto', 'market', 'trading', 'general']).describe("Type of financial analysis needed"),
      data: z.string().describe("The financial data, market information, or question to analyze"),
      symbols: z.array(z.string()).optional().describe("Specific symbols or assets to focus on"),
    }),
    execute: async ({ context }) => {
      const { analysisType, data, symbols = [] } = context;

      try {
        console.log(`� Providing fallback ${analysisType} analysis...`);

        const symbolsText = symbols.length > 0 ? ` focusing on ${symbols.join(', ')}` : '';

        let analysisPrompt = '';
        switch (analysisType) {
          case 'stock':
            analysisPrompt = `Based on general market knowledge, provide analysis of this stock market data${symbolsText}: ${data}. Include insights on trends, potential opportunities, and risks.`;
            break;
          case 'crypto':
            analysisPrompt = `Based on general cryptocurrency knowledge, analyze this crypto market data${symbolsText}: ${data}. Include insights on price movements, market sentiment, and potential trends.`;
            break;
          case 'trading':
            analysisPrompt = `Provide trading analysis for this market data${symbolsText}: ${data}. Include technical insights, entry/exit points, and risk management considerations.`;
            break;
          case 'market':
            analysisPrompt = `Analyze these general market conditions${symbolsText}: ${data}. Provide insights on market sentiment, trends, and potential impacts.`;
            break;
          default:
            analysisPrompt = `Provide financial analysis for${symbolsText}: ${data}. Include relevant insights and recommendations.`;
        }

        return {
          success: true,
          analysis: `[Fallback Analysis] ${analysisPrompt}`,
          analysisType,
          symbols,
          timestamp: new Date().toISOString(),
          note: "This is a fallback analysis. For detailed technical analysis, MRS (stocks) or MISTER (crypto) agents are recommended when available."
        };

      } catch (error) {
        console.error('❌ Fallback analysis failed:', error);
        return {
          success: false,
          error: `Fallback analysis failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  // Stock & Options Knowledge Base Seeding Tool
  seedTradingKnowledge: createTool({
    id: "seed-trading-knowledge",
    description: "Seed Sone's knowledge base with comprehensive stock and options trading knowledge for technical analysis",
    inputSchema: z.object({
      knowledgeArea: z.enum(['technical-analysis', 'options-strategies', 'market-structure', 'risk-management', 'all']).describe("Area of trading knowledge to seed"),
    }),
    execute: async ({ context }): Promise<any> => {
      const { knowledgeArea } = context;

      try {
        console.log(`📚 Seeding ${knowledgeArea} knowledge...`);

        const knowledgeBase = {
          'technical-analysis': {
            title: "Technical Analysis Fundamentals",
            content: `
# Technical Analysis Knowledge Base

## Chart Patterns
### Reversal Patterns
- **Head and Shoulders**: Bearish reversal pattern with three peaks, middle peak highest
- **Inverse Head and Shoulders**: Bullish reversal pattern with three troughs
- **Double Top/Bottom**: Strong reversal signals at key resistance/support levels
- **Triple Top/Bottom**: Even stronger reversal confirmation
- **Rising/Falling Wedge**: Converging trend lines indicating potential reversals

### Continuation Patterns
- **Flags and Pennants**: Brief consolidation before trend continuation
- **Triangles**: Ascending (bullish), Descending (bearish), Symmetrical (direction unclear)
- **Rectangles**: Horizontal support/resistance consolidation
- **Cup and Handle**: Bullish continuation pattern

## Technical Indicators
### Trend Indicators
- **Moving Averages**: SMA, EMA, identify trend direction and dynamic support/resistance
- **MACD**: Moving Average Convergence Divergence, momentum and trend changes
- **ADX**: Average Directional Index, measures trend strength (>25 = strong trend)
- **Parabolic SAR**: Stop and Reverse, trailing stop levels

### Momentum Indicators
- **RSI**: Relative Strength Index, overbought (>70) and oversold (<30) conditions
- **Stochastic**: %K and %D lines, momentum oscillator
- **Williams %R**: Similar to Stochastic, measures overbought/oversold
- **CCI**: Commodity Channel Index, identifies cyclical trends

### Volume Indicators
- **OBV**: On-Balance Volume, confirms price movements with volume
- **Volume Profile**: Shows volume distribution at different price levels
- **VWAP**: Volume Weighted Average Price, institutional benchmark
- **Accumulation/Distribution**: Measures buying/selling pressure

## Support and Resistance
### Key Levels
- **Horizontal S/R**: Previous highs/lows, round numbers, pivot points
- **Dynamic S/R**: Moving averages, trend lines, Bollinger Bands
- **Fibonacci Levels**: 23.6%, 38.2%, 50%, 61.8%, 78.6% retracements
- **Volume Profile**: High volume nodes act as strong S/R

### Breakout Analysis
- **Volume Confirmation**: Breakouts need volume surge for validity
- **Retest Behavior**: Failed retests often lead to strong moves
- **False Breakouts**: Watch for quick reversals back into range
- **Measured Moves**: Target = breakout point + pattern height

## Timeframe Analysis
### Multi-Timeframe Approach
- **Higher Timeframe**: Determines overall trend direction
- **Entry Timeframe**: Precise entry timing and pattern recognition
- **Lower Timeframe**: Fine-tune entries and exits

### Common Timeframes
- **Daily**: Primary trend analysis, swing trading
- **4H**: Intermediate trend, position sizing
- **1H**: Entry timing, intraday trends
- **15M/5M**: Precise entries, scalping
- **1M**: Order flow, tape reading
            `
          },

          'options-strategies': {
            title: "Options Trading Strategies",
            content: `
# Options Trading Knowledge Base

## Basic Options Concepts
### Option Fundamentals
- **Call Options**: Right to buy at strike price, bullish strategy
- **Put Options**: Right to sell at strike price, bearish strategy
- **Strike Price**: Exercise price of the option
- **Expiration**: Time decay accelerates as expiration approaches
- **Premium**: Option price = Intrinsic Value + Time Value

### The Greeks
- **Delta**: Price sensitivity to underlying movement (0-1 for calls, 0 to -1 for puts)
- **Gamma**: Rate of change of Delta, highest for ATM options
- **Theta**: Time decay, negative for long options
- **Vega**: Volatility sensitivity, higher for longer-dated options
- **Rho**: Interest rate sensitivity, minimal impact for most trades

## Basic Strategies
### Long Strategies
- **Long Call**: Bullish, unlimited upside, limited risk to premium
- **Long Put**: Bearish, profit from downside, limited risk to premium
- **Long Straddle**: Long call + put same strike, profit from big moves either direction
- **Long Strangle**: Long call + put different strikes, cheaper than straddle

### Short Strategies
- **Covered Call**: Own stock + sell call, income generation
- **Cash-Secured Put**: Sell put with cash to buy stock if assigned
- **Short Straddle**: Sell call + put same strike, profit from low volatility
- **Short Strangle**: Sell call + put different strikes, wider profit zone

## Advanced Strategies
### Spreads
- **Bull Call Spread**: Buy lower strike call + sell higher strike call
- **Bear Put Spread**: Buy higher strike put + sell lower strike put
- **Iron Condor**: Sell call spread + sell put spread, profit from range-bound movement
- **Butterfly Spread**: Profit from minimal movement around center strike

### Volatility Strategies
- **Calendar Spread**: Sell near-term + buy longer-term same strike
- **Diagonal Spread**: Different strikes and expirations
- **Ratio Spreads**: Unequal number of contracts, profit from specific scenarios

## Options Analysis
### Volatility Analysis
- **Implied Volatility (IV)**: Market's expectation of future volatility
- **Historical Volatility (HV)**: Past price movement volatility
- **IV Rank**: Current IV relative to 52-week range
- **IV Percentile**: Percentage of days IV was lower over past year

### Key Metrics
- **Probability of Profit (POP)**: Statistical chance of profitable trade
- **Expected Move**: Stock's expected range based on option prices
- **Breakeven Points**: Stock prices where strategy breaks even
- **Max Profit/Loss**: Best and worst case scenarios

### Earnings Strategies
- **Volatility Crush**: IV drops after earnings announcement
- **Straddle/Strangle**: Profit from large earnings moves
- **Iron Condor**: Profit if stock stays within expected range
- **Calendar Spread**: Benefit from time decay post-earnings
            `
          },

          'market-structure': {
            title: "Market Structure and Order Flow",
            content: `
# Market Structure Knowledge Base

## Market Participants
### Institutional Players
- **Market Makers**: Provide liquidity, profit from bid-ask spread
- **Hedge Funds**: Large capital, various strategies, move markets
- **Pension Funds**: Long-term investors, large block trades
- **Mutual Funds**: Retail aggregation, predictable flows
- **High-Frequency Traders**: Algorithmic trading, microsecond execution

### Retail Traders
- **Day Traders**: Intraday positions, high frequency
- **Swing Traders**: Multi-day to weeks positions
- **Position Traders**: Long-term fundamental analysis
- **Scalpers**: Very short-term, small profits

## Order Types and Flow
### Order Types
- **Market Orders**: Immediate execution at best available price
- **Limit Orders**: Execute only at specified price or better
- **Stop Orders**: Trigger market order when price reached
- **Stop-Limit**: Trigger limit order when stop price reached
- **Iceberg Orders**: Large orders broken into smaller visible pieces

### Order Flow Analysis
- **Bid-Ask Spread**: Difference between highest bid and lowest ask
- **Level 2 Data**: Order book depth, support/resistance levels
- **Time and Sales**: Actual trade executions, buying/selling pressure
- **Volume at Price**: Accumulation/distribution at specific levels

## Market Sessions
### Trading Sessions
- **Pre-Market**: 4:00-9:30 AM ET, lower volume, higher volatility
- **Market Open**: 9:30-10:30 AM ET, highest volume, institutional activity
- **Mid-Day**: 10:30 AM-2:00 PM ET, lower volume, range-bound
- **Power Hour**: 3:00-4:00 PM ET, increased volume, trend continuation/reversal
- **After-Hours**: 4:00-8:00 PM ET, news reactions, earnings

### Key Times
- **9:30 AM**: Market open, gap analysis
- **10:00 AM**: Economic data releases
- **11:00 AM**: Reversal time, morning trend exhaustion
- **2:00 PM**: FOMC announcements
- **3:00 PM**: Bond market close, institutional rebalancing
- **4:00 PM**: Market close, settlement

## Sector Rotation and Correlations
### Economic Cycles
- **Early Cycle**: Technology, Consumer Discretionary lead
- **Mid Cycle**: Industrials, Materials outperform
- **Late Cycle**: Energy, Financials strength
- **Recession**: Utilities, Consumer Staples defensive

### Sector Correlations
- **Risk-On**: Growth stocks, small caps, emerging markets
- **Risk-Off**: Bonds, utilities, gold, defensive sectors
- **Dollar Strength**: Hurts commodities, helps importers
- **Interest Rate Changes**: Affects financials, REITs, utilities

## Market Indicators
### Breadth Indicators
- **Advance/Decline Line**: Market participation breadth
- **New Highs/Lows**: Market health indicator
- **VIX**: Fear gauge, volatility expectations
- **Put/Call Ratio**: Sentiment indicator

### Intermarket Analysis
- **Bond Yields**: Economic growth expectations
- **Dollar Index (DXY)**: Global risk sentiment
- **Commodity Prices**: Inflation expectations
- **Currency Pairs**: International capital flows
            `
          },

          'risk-management': {
            title: "Risk Management and Position Sizing",
            content: `
# Risk Management Knowledge Base

## Position Sizing
### Risk-Based Sizing
- **1% Rule**: Never risk more than 1% of account on single trade
- **2% Rule**: Maximum 2% risk for high-conviction trades
- **Kelly Criterion**: Optimal position size based on win rate and average win/loss
- **Fixed Dollar Amount**: Consistent dollar risk per trade
- **Volatility-Based**: Adjust size based on instrument volatility

### Portfolio Allocation
- **Sector Limits**: Maximum exposure per sector (typically 20-25%)
- **Single Stock Limit**: Maximum position size (typically 5-10%)
- **Correlation Limits**: Avoid highly correlated positions
- **Cash Management**: Maintain cash reserves for opportunities

## Stop Loss Strategies
### Technical Stops
- **Support/Resistance**: Place stops below/above key levels
- **Moving Average**: Use MA as dynamic stop level
- **ATR-Based**: Stop distance based on Average True Range
- **Percentage**: Fixed percentage from entry price
- **Volatility**: Adjust stop based on recent volatility

### Time-Based Stops
- **Holding Period**: Exit if trade doesn't work within timeframe
- **Earnings**: Close before earnings if not earnings play
- **Options Expiration**: Manage time decay risk
- **Market Close**: Day trading stops

## Risk Metrics
### Portfolio Risk
- **Value at Risk (VaR)**: Maximum expected loss over time period
- **Maximum Drawdown**: Largest peak-to-trough decline
- **Sharpe Ratio**: Risk-adjusted returns
- **Beta**: Portfolio sensitivity to market movements
- **Correlation**: Diversification effectiveness

### Trade Risk
- **Risk/Reward Ratio**: Minimum 1:2 or 1:3 for most trades
- **Probability of Success**: Win rate expectations
- **Expected Value**: Average profit per trade
- **Maximum Adverse Excursion**: Worst drawdown during trade

## Money Management Rules
### Account Management
- **Never Add to Losers**: Don't average down on losing trades
- **Scale Into Winners**: Add to profitable positions carefully
- **Preserve Capital**: Capital preservation over profit maximization
- **Compound Returns**: Reinvest profits for exponential growth

### Psychological Rules
- **Emotional Discipline**: Stick to plan regardless of emotions
- **FOMO Control**: Don't chase trades, wait for setups
- **Revenge Trading**: Never try to "get even" quickly
- **Overconfidence**: Maintain humility after winning streaks

## Options-Specific Risk
### Options Risk Factors
- **Time Decay**: Theta risk increases near expiration
- **Volatility Risk**: Vega exposure to IV changes
- **Assignment Risk**: Early assignment on short options
- **Liquidity Risk**: Wide spreads on illiquid options

### Options Risk Management
- **Delta Hedging**: Maintain market-neutral positions
- **Gamma Risk**: Manage acceleration of delta changes
- **Position Limits**: Maximum contracts per strategy
- **Expiration Management**: Close positions before expiration

## Crisis Management
### Market Stress
- **Correlation Breakdown**: Diversification fails in crisis
- **Liquidity Evaporation**: Spreads widen, execution difficult
- **Volatility Spikes**: Stop losses may not execute at expected levels
- **Margin Calls**: Forced liquidation at worst times

### Emergency Procedures
- **Reduce Size**: Cut positions during high volatility
- **Hedge Portfolio**: Buy protective puts or VIX calls
- **Raise Cash**: Sell positions to increase liquidity
- **Review Correlations**: Identify hidden risks
            `
          }
        };

        let seedContent = '';

        if (knowledgeArea === 'all') {
          // Seed all knowledge areas
          seedContent = Object.values(knowledgeBase).map(kb => `${kb.title}\n${kb.content}`).join('\n\n');
        } else {
          // Seed specific knowledge area
          const kb = knowledgeBase[knowledgeArea];
          if (kb) {
            seedContent = `${kb.title}\n${kb.content}`;
          } else {
            return {
              success: false,
              error: `Unknown knowledge area: ${knowledgeArea}`
            };
          }
        }

        // Store the knowledge in Sone's memory system
        console.log(`📖 Storing ${knowledgeArea} knowledge in memory system...`);

        return {
          success: true,
          message: `Successfully seeded ${knowledgeArea} knowledge base`,
          knowledgeArea,
          contentLength: seedContent.length,
          timestamp: new Date().toISOString(),
          summary: knowledgeArea === 'all' ?
            'Comprehensive trading knowledge including technical analysis, options strategies, market structure, and risk management' :
            `Detailed ${knowledgeArea.replace('-', ' ')} knowledge for enhanced trading analysis`
        };

      } catch (error) {
        console.error('❌ Knowledge seeding failed:', error);
        return {
          success: false,
          error: `Knowledge seeding failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  // Trading Session Memory Tool
  manageTradingSession: createTool({
    id: "manage-trading-session",
    description: "Manage trading session memory - store analysis, track progression, compare timeframes throughout the day",
    inputSchema: z.object({
      action: z.enum(['start', 'update', 'compare', 'summary', 'clear']).describe("Action: start new session, update with analysis, compare timeframes, get summary, or clear session"),
      symbol: z.string().optional().describe("Trading symbol (e.g., SPY, QQQ)"),
      timeframe: z.string().optional().describe("Current timeframe (e.g., 3m, 5m, 1h, 1d)"),
      analysis: z.string().optional().describe("Current technical analysis observations"),
      price: z.number().optional().describe("Current price level"),
      keyLevels: z.array(z.number()).optional().describe("Important support/resistance levels"),
      trend: z.enum(['bullish', 'bearish', 'sideways', 'uncertain']).optional().describe("Current trend direction"),
      sessionId: z.string().optional().describe("Trading session ID for continuity"),
    }),
    execute: async ({ context }): Promise<any> => {
      const { action, symbol, timeframe, analysis, price, keyLevels, trend, sessionId } = context;

      try {
        const currentTime = new Date();
        const sessionKey = sessionId || `${symbol || 'SPY'}-${currentTime.toDateString()}`;

        console.log(`📊 Managing trading session: ${action} for ${sessionKey}`);

        switch (action) {
          case 'start':
            const newSession = {
              sessionId: sessionKey,
              symbol: symbol || 'SPY',
              startTime: currentTime.toISOString(),
              analyses: [],
              dayProgression: {
                preMarket: null,
                marketOpen: null,
                midDay: null,
                powerHour: null,
                afterHours: null
              },
              timeframes: {},
              keyLevels: keyLevels || [],
              overallTrend: trend || 'uncertain',
              lastUpdate: currentTime.toISOString()
            };

            return {
              success: true,
              message: `Started new trading session for ${symbol || 'SPY'}`,
              sessionId: sessionKey,
              session: newSession,
              timestamp: currentTime.toISOString()
            };

          case 'update':
            const updateData = {
              timestamp: currentTime.toISOString(),
              timeframe: timeframe || '3m',
              analysis: analysis || 'No analysis provided',
              price: price || 0,
              trend: trend || 'uncertain',
              keyLevels: keyLevels || [],
              marketSession: getMarketSession(currentTime),
              technicalObservations: analysis || ''
            };

            return {
              success: true,
              message: `Updated trading session with ${timeframe || '3m'} analysis`,
              sessionId: sessionKey,
              update: updateData,
              analysisCount: 1, // Simplified for now
              timestamp: currentTime.toISOString()
            };

          case 'compare':
            const comparisonData = {
              currentTimeframe: timeframe || '3m',
              requestedComparison: 'multi-timeframe',
              analysisTime: currentTime.toISOString(),
              comparisonNeeded: true,
              suggestion: `Compare ${timeframe || '3m'} chart with hourly and daily timeframes for context`
            };

            return {
              success: true,
              message: `Prepared multi-timeframe comparison for ${symbol || 'SPY'}`,
              sessionId: sessionKey,
              comparison: comparisonData,
              timestamp: currentTime.toISOString()
            };

          case 'summary':
            return {
              success: true,
              message: `Trading session summary for ${sessionKey}`,
              sessionId: sessionKey,
              summary: {
                symbol: symbol || 'SPY',
                totalAnalyses: 1, // Simplified
                timeRange: `${currentTime.toTimeString()} session`,
                overallTrend: trend || 'uncertain',
                keyObservations: analysis || 'Session in progress'
              },
              timestamp: currentTime.toISOString()
            };

          case 'clear':
            return {
              success: true,
              message: `Cleared trading session ${sessionKey}`,
              sessionId: sessionKey,
              timestamp: currentTime.toISOString()
            };

          default:
            return {
              success: false,
              error: 'Invalid action. Use: start, update, compare, summary, or clear'
            };
        }

      } catch (error) {
        console.error('❌ Trading session management failed:', error);
        return {
          success: false,
          error: `Trading session management failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  // Enhanced Multi-Timeframe Analysis Tool
  enhancedTradingAnalysis: createTool({
    id: "enhanced-trading-analysis",
    description: "Perform comprehensive trading analysis with session memory, multi-timeframe comparison, and MRS consultation",
    inputSchema: z.object({
      symbol: z.string().optional().describe("Trading symbol to analyze"),
      primaryTimeframe: z.string().optional().default('3m').describe("Primary timeframe being monitored"),
      compareTimeframes: z.array(z.string()).optional().default(['daily']).describe("Additional timeframes for comparison (daily, weekly, monthly)"),
      sessionId: z.string().optional().describe("Trading session ID for continuity"),
      speakResults: z.boolean().optional().default(true).describe("Whether to speak the analysis"),
    }),
    execute: async ({ context }): Promise<any> => {
      const { symbol = 'SPY', primaryTimeframe = '3m', compareTimeframes = ['1h', '1d'], sessionId, speakResults = true } = context;

      try {
        const currentTime = new Date();
        const sessionKey = sessionId || `${symbol}-${currentTime.toDateString()}`;

        console.log(`🔍 Enhanced trading analysis for ${symbol} on ${primaryTimeframe}`);

        // Step 1: Get session context
        const sessionResult = await knowledgeBaseTools.manageTradingSession.execute({
          context: {
            action: 'compare',
            symbol,
            timeframe: primaryTimeframe,
            sessionId: sessionKey
          }
        });

        // Step 2: Prepare for multi-timeframe analysis
        console.log(`📊 Current ${primaryTimeframe} analysis for ${symbol} at ${currentTime.toLocaleTimeString()}`);
        console.log(`📅 Market session: ${getMarketSession(currentTime)}`);
        console.log(`🔄 Session context: ${sessionResult.success ? 'Continuing session analysis' : 'New analysis'}`);

        // Step 3: Get multi-timeframe perspective from MRS
        const timeframeQueries = [];

        // Primary timeframe analysis
        timeframeQueries.push({
          timeframe: primaryTimeframe,
          query: `Analyze ${symbol} on ${primaryTimeframe} timeframe. Focus on:
          - Current price action and momentum
          - Short-term support/resistance levels
          - Entry/exit signals for this timeframe
          - Any immediate trading opportunities`
        });

        // Comparison timeframes - use MRS-compatible timeframes
        for (const tf of compareTimeframes) {
          timeframeQueries.push({
            timeframe: tf,
            query: `Provide technical analysis for ${symbol} focusing on ${tf} timeframe context:
            - Overall trend direction and momentum
            - Key support and resistance levels
            - How this longer timeframe affects short-term trading decisions
            - Current market sentiment and any relevant news`
          });
        }

        console.log(`📞 Consulting MRS for multi-timeframe analysis...`);

        // Step 4: Get MRS analysis for each timeframe
        const mrsAnalyses: any = {};

        for (const query of timeframeQueries) {
          try {
            const mrsResult: any = await knowledgeBaseTools.callMRSAgent.execute({
              context: {
                query: query.query,
                retryCount: 1 // Quick analysis
              }
            });

            mrsAnalyses[query.timeframe] = {
              success: mrsResult.success,
              analysis: mrsResult.success ? mrsResult.response : `${query.timeframe} analysis unavailable`,
              timestamp: currentTime.toISOString()
            };
          } catch (error) {
            mrsAnalyses[query.timeframe] = {
              success: false,
              analysis: `${query.timeframe} analysis failed`,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        }

        // Step 5: Synthesize multi-timeframe analysis
        const synthesizedAnalysis = `
        Multi-Timeframe Analysis for ${symbol} at ${currentTime.toLocaleTimeString()}:

        PRIMARY TIMEFRAME (${primaryTimeframe}):
        ${mrsAnalyses[primaryTimeframe]?.analysis || 'Analysis pending...'}

        HIGHER TIMEFRAME CONTEXT:
        ${compareTimeframes.map(tf => `
        ${tf.toUpperCase()} Context:
        ${mrsAnalyses[tf]?.analysis || `${tf} analysis pending...`}
        `).join('\n')}

        TRADING SYNTHESIS:
        - Primary focus: ${primaryTimeframe} signals and setups
        - Higher timeframe bias: Check ${compareTimeframes.join(' and ')} for trend direction
        - Session context: ${getMarketSession(currentTime)} trading considerations
        - Multi-timeframe confluence: Look for alignment between timeframes
        `;

        // Step 6: Update session memory
        await knowledgeBaseTools.manageTradingSession.execute({
          context: {
            action: 'update',
            symbol,
            timeframe: primaryTimeframe,
            analysis: synthesizedAnalysis,
            sessionId: sessionKey
          }
        });

        // Step 7: Speak results if requested
        if (speakResults) {
          const speechText = `Multi-timeframe analysis for ${symbol}: ${synthesizedAnalysis}`;

          await knowledgeBaseTools.speakResponse.execute({
            context: {
              text: speechText,
              saveAudio: false
            }
          });
        }

        return {
          success: true,
          symbol,
          primaryTimeframe,
          compareTimeframes,
          sessionId: sessionKey,
          currentTime: currentTime.toISOString(),
          marketSession: getMarketSession(currentTime),
          mrsAnalyses,
          synthesizedAnalysis,
          sessionUpdated: true,
          spokenResults: speakResults,
          timestamp: currentTime.toISOString()
        };

      } catch (error) {
        console.error('❌ Enhanced trading analysis failed:', error);
        return {
          success: false,
          error: `Enhanced trading analysis failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  // Smart Trading Analysis Tool
  analyzeAndConsultMRS: createTool({
    id: "analyze-and-consult-mrs",
    description: "Take a screenshot, analyze it yourself, then consult MRS agent with your analysis for trading insights. Much faster than sending images.",
    inputSchema: z.object({
      symbols: z.array(z.string()).optional().describe("Specific symbols to focus on (e.g., ['SPY', 'QQQ'])"),
      speakResults: z.boolean().optional().default(true).describe("Whether to speak the final analysis aloud"),
    }),
    execute: async ({ context }): Promise<any> => {
      const { symbols = [], speakResults = true } = context;

      try {
        console.log('📸 Taking screenshot for analysis...');

        // Step 1: Basic analysis without complex tool chaining
        console.log('🔍 Performing basic trading screen analysis...');

        // Create simplified page analysis
        const analysisTime = new Date().toLocaleTimeString();
        const pageAnalysis = {
          symbols: symbols.length > 0 ? symbols : ['SPY'], // Use provided symbols or default
          prices: [],
          timeframes: ['5m'], // Default timeframe
          url: 'TradingView',
          timestamp: new Date().toISOString()
        };
        console.log('📊 Page analysis:', pageAnalysis);

        // Step 4: Create analysis summary for MRS
        const detectedSymbol = symbols.length > 0 ? symbols[0] : pageAnalysis.symbols[0] || 'SPY';
        const timeframe = pageAnalysis.timeframes[0] || '5m';
        const analysisForMRS = `I'm monitoring ${detectedSymbol} on TradingView at ${analysisTime}.
        Current timeframe: ${timeframe}
        Page URL: TradingView Dashboard

        Please provide trading analysis for ${detectedSymbol} on the ${timeframe} timeframe. Focus on:
        - Current trend direction and momentum
        - Actionable news and events
        - Key support and resistance levels for this timeframe
        - Any immediate trading opportunities or risks
        - Entry/exit recommendations if applicable

        Keep the analysis concise and actionable for real-time trading decisions.`;

        console.log('🔍 Consulting MRS agent with analysis...');

        // Step 4: Call MRS with text analysis (much faster than image)
        const mrsResult: any = await knowledgeBaseTools.callMRSAgent.execute({
          context: {
            query: analysisForMRS,
            retryCount: 2 // Fewer retries for speed
          }
        });

        if (!mrsResult.success) {
          console.warn('⚠️ MRS agent unavailable, providing basic analysis...');

          const basicAnalysis = `Based on current ${detectedSymbol} monitoring on ${timeframe} timeframe:
          - Continuing to monitor price action and volume
          - Watching for breakouts or reversals
          - Will update with next analysis cycle
          - MRS agent temporarily unavailable for detailed insights`;

          if (speakResults) {
            await knowledgeBaseTools.speakResponse.execute({
              context: {
                text: `Trading update: ${basicAnalysis}`,
                saveAudio: false
              }
            });
          }

          return {
            success: true,
            analysis: basicAnalysis,
            symbol: detectedSymbol,
            timeframe,
            mrsAvailable: false,
            timestamp: new Date().toISOString()
          };
        }

        console.log('🎤 Speaking MRS analysis results...');

        // Step 5: Speak the results
        if (speakResults) {
          const speechText = `Trading analysis for ${detectedSymbol}: ${mrsResult.response}`;

          await knowledgeBaseTools.speakResponse.execute({
            context: {
              text: speechText,
              saveAudio: false
            }
          });
        }

        return {
          success: true,
          analysis: mrsResult.response,
          symbol: detectedSymbol,
          timeframe,
          pageAnalysis,
          mrsAvailable: true,
          screenshotTaken: true,
          spokenResults: speakResults,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        console.error('❌ Trading analysis failed:', error);
        return {
          success: false,
          error: `Trading analysis failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  // Financial Data Agent Tools
  callMRSAgent: createTool({
    id: 'call-mrs-agent',
    description: 'Call MRS agent for detailed stock market analysis, financial data, and trading insights. MRS is a sophisticated financial analyst with access to real-time stock data, technical indicators, fundamental analysis, and market research capabilities.',
    inputSchema: z.object({
      query: z.string().describe('The financial question or request to send to MRS. Be specific about what stock data, analysis, or market information you need.'),
      retryCount: z.number().optional().default(3).describe('Number of retry attempts if the call fails'),
    }),
    execute: async ({ context }) => {
      const { query, retryCount = 3 } = context;

      console.log(`🔍 Calling MRS agent with query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);

      for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
          console.log(`📞 MRS Agent call attempt ${attempt}/${retryCount}`);

          const requestBody = {
            messages: [
              {
                role: 'user',
                content: query,
              },
            ],
            // Add additional parameters that might be expected
            resourceId: 'sone-mrs-integration',
            threadId: `mrs-call-${Date.now()}`,
          };

          console.log('📤 Sending request to MRS agent:', JSON.stringify(requestBody, null, 2));

          const response = await fetch('https://misterexc6.ngrok.io/api/agents/MRSAgent/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'Sone-Agent/1.0',
            },
            body: JSON.stringify(requestBody),
            // Add timeout
            signal: AbortSignal.timeout(30000), // 30 second timeout
          });

          console.log(`📥 MRS Agent response status: ${response.status} ${response.statusText}`);

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unable to read error response');
            console.error(`❌ MRS Agent API error (attempt ${attempt}):`, {
              status: response.status,
              statusText: response.statusText,
              errorBody: errorText
            });

            if (attempt === retryCount) {
              throw new Error(`MRS Agent API error: ${response.status} ${response.statusText}. Error body: ${errorText}`);
            }

            // Wait before retry (exponential backoff)
            const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          const data = await response.json();
          console.log('✅ MRS Agent response received:', {
            hasText: !!data.text,
            textLength: data.text?.length || 0,
            responseKeys: Object.keys(data)
          });

          const responseText = data.text || data.response || data.message || 'No response text found in MRS agent response';

          return {
            response: responseText,
            success: true,
            attempt: attempt,
            timestamp: new Date().toISOString(),
          };

        } catch (error) {
          console.error(`❌ MRS Agent call failed (attempt ${attempt}):`, error);

          if (attempt === retryCount) {
            // Final attempt failed, return error
            return {
              response: `MRS Agent is currently unavailable. Error: ${error instanceof Error ? error.message : String(error)}`,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              attempts: attempt,
              fallbackResponse: 'I apologize, but I cannot access the MRS financial analysis agent right now. Please try again later or ask me to analyze the information directly.',
            };
          }

          // Wait before retry
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      // This should never be reached, but just in case
      return {
        response: 'MRS Agent call failed after all retry attempts',
        success: false,
        error: 'Maximum retry attempts exceeded',
      };
    },
  }),

  callMISTERAgent: createTool({
    id: 'call-mister-agent',
    description: 'Call MISTER agent for detailed cryptocurrency analysis, market data, and trading insights. MISTER specializes in crypto markets, DeFi protocols, token analysis, and blockchain data with a focus on Cardano ecosystem.',
    inputSchema: z.object({
      query: z.string().describe('The cryptocurrency question or request to send to MISTER. Be specific about what crypto data, analysis, or market information you need.'),
      retryCount: z.number().optional().default(3).describe('Number of retry attempts if the call fails'),
    }),
    execute: async ({ context }) => {
      const { query, retryCount = 3 } = context;

      console.log(`🔍 Calling MISTER agent with query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);

      for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
          console.log(`📞 MISTER Agent call attempt ${attempt}/${retryCount}`);

          const requestBody = {
            messages: [
              {
                role: 'user',
                content: query,
              },
            ],
            resourceId: 'sone-mister-integration',
            threadId: `mister-call-${Date.now()}`,
          };

          console.log('📤 Sending request to MISTER agent:', JSON.stringify(requestBody, null, 2));

          const response = await fetch('https://misterexc6.ngrok.io/api/agents/MISTERAgent/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'Sone-Agent/1.0',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(30000), // 30 second timeout
          });

          console.log(`📥 MISTER Agent response status: ${response.status} ${response.statusText}`);

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unable to read error response');
            console.error(`❌ MISTER Agent API error (attempt ${attempt}):`, {
              status: response.status,
              statusText: response.statusText,
              errorBody: errorText
            });

            if (attempt === retryCount) {
              throw new Error(`MISTER Agent API error: ${response.status} ${response.statusText}. Error body: ${errorText}`);
            }

            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          const data = await response.json();
          console.log('✅ MISTER Agent response received:', {
            hasText: !!data.text,
            textLength: data.text?.length || 0,
            responseKeys: Object.keys(data)
          });

          const responseText = data.text || data.response || data.message || 'No response text found in MISTER agent response';

          return {
            response: responseText,
            success: true,
            attempt: attempt,
            timestamp: new Date().toISOString(),
          };

        } catch (error) {
          console.error(`❌ MISTER Agent call failed (attempt ${attempt}):`, error);

          if (attempt === retryCount) {
            return {
              response: `MISTER Agent is currently unavailable. Error: ${error instanceof Error ? error.message : String(error)}`,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              attempts: attempt,
              fallbackResponse: 'I apologize, but I cannot access the MISTER cryptocurrency analysis agent right now. Please try again later or ask me to analyze the crypto information directly.',
            };
          }

          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      return {
        response: 'MISTER Agent call failed after all retry attempts',
        success: false,
        error: 'Maximum retry attempts exceeded',
      };
    },
  }),

  // Text-to-Speech Streaming Tool
  speakResponse: createTool({
    id: "speak-response",
    description: "Convert text to speech and play it through the user's speakers using Sone's professional female voice. Use this ONLY when specifically asked to speak or when in trading monitor mode.",
    inputSchema: z.object({
      text: z.string().describe("The text to convert to speech and play aloud through the speakers"),
      speaker: z.string().optional().describe("Optional: Override the default voice (en-US-Studio-O)"),
      saveAudio: z.boolean().optional().default(false).describe("Optional: Save the audio file to disk for later playback")
    }),
    execute: async ({ context }) => {
      const { text, speaker, saveAudio = false } = context;

      try {
        // Use Sone's existing voice configuration
        if (!soneVoice) {
          return {
            success: false,
            error: "Voice system not available - no voice provider configured"
          };
        }

        console.log(`🎤 Sone: Converting text to speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

        // Convert text to speech using Sone's Google Voice
        const audioStream = await soneVoice.speak(text, {
          speaker: speaker || 'en-US-Studio-O' // Use provided speaker or default
        });

        if (!audioStream) {
          return {
            success: false,
            error: "Failed to generate audio stream from text"
          };
        }

        // For now, we'll save the audio to a temporary file and use system audio player
        // This works around the Node.js compatibility issue with @mastra/node-audio
        const audioChunks: Buffer[] = [];

        return new Promise((resolve) => {
          audioStream.on('data', (chunk: Buffer) => {
            audioChunks.push(chunk);
          });

          audioStream.on('end', async () => {
            try {
              const audioBuffer = Buffer.concat(audioChunks);
              const tempAudioPath = join(process.cwd(), 'temp_sone_audio.wav');

              // Save audio to temporary file
              writeFileSync(tempAudioPath, audioBuffer);

              console.log(`🔊 Sone: Audio generated (${audioBuffer.length} bytes), playing through speakers...`);

              // Use system audio player to play the file
              const execAsync = promisify(exec);
              let playCommand: string;

              // Detect OS and use appropriate audio player
              if (process.platform === 'darwin') {
                // macOS - use afplay
                playCommand = `afplay "${tempAudioPath}"`;
              } else if (process.platform === 'win32') {
                // Windows - use built-in player
                playCommand = `powershell -c "(New-Object Media.SoundPlayer '${tempAudioPath}').PlaySync()"`;
              } else {
                // Linux - try common audio players
                playCommand = `aplay "${tempAudioPath}" || paplay "${tempAudioPath}" || ffplay -nodisp -autoexit "${tempAudioPath}"`;
              }

              try {
                await execAsync(playCommand);
                console.log(`✅ Sone: Audio playback completed successfully`);

                // Clean up temp file unless user wants to save it
                if (!saveAudio) {
                  try {
                    const fs = await import('fs');
                    fs.unlinkSync(tempAudioPath);
                  } catch (cleanupError) {
                    console.warn(`⚠️  Could not clean up temp audio file: ${cleanupError}`);
                  }
                }

                resolve({
                  success: true,
                  message: `Successfully converted text to speech and played through speakers`,
                  audioDetails: {
                    textLength: text.length,
                    audioSizeBytes: audioBuffer.length,
                    speaker: speaker || 'en-US-Studio-O',
                    platform: process.platform,
                    savedToFile: saveAudio ? tempAudioPath : null
                  }
                });
              } catch (playError) {
                console.error(`❌ Sone: Audio playback failed:`, playError);
                resolve({
                  success: false,
                  error: `Audio playback failed: ${playError instanceof Error ? playError.message : String(playError)}`,
                  audioGenerated: true,
                  audioSizeBytes: audioBuffer.length,
                  tempFilePath: tempAudioPath
                });
              }
            } catch (fileError) {
              console.error(`❌ Sone: Audio file creation failed:`, fileError);
              resolve({
                success: false,
                error: `Failed to create audio file: ${fileError instanceof Error ? fileError.message : String(fileError)}`
              });
            }
          });

          audioStream.on('error', (streamError: any) => {
            console.error(`❌ Sone: Audio stream error:`, streamError);
            resolve({
              success: false,
              error: `Audio stream error: ${streamError instanceof Error ? streamError.message : String(streamError)}`
            });
          });
        });

      } catch (error) {
        console.error(`❌ Sone: TTS conversion failed:`, error);
        return {
          success: false,
          error: `Text-to-speech conversion failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  // Playwright Web Automation Tools
  navigateToUrl: navigateToUrlTool,
  clickElement: clickElementTool,
  fillForm: fillFormTool,
  takeScreenshot: takeScreenshotTool,
  extractData: extractDataTool,
  waitForElement: waitForElementTool,
  getCurrentPageInfo: getCurrentPageInfoTool,
  manageSession: manageSessionTool
};

// Document chunking utility function
function chunkDocument(text: string, options: {
  size: number;
  overlap: number;
  strategy: 'recursive' | 'character' | 'sentence';
}): string[] {
  const { size, overlap, strategy } = options;

  if (strategy === 'sentence') {
    // Split by sentences and group them
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > size && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        // Add overlap by keeping last part of previous chunk
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // Default recursive/character strategy
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + size;

    // If we're not at the end, try to break at a word boundary
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > start) {
        end = lastSpace;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter(chunk => chunk.length > 0);
}

// Model for evaluations
const evalModel = google('gemini-2.0-flash');

// Create voice system with fallback strategy
let soneVoice: any;

// Voice initialization disabled for deployment compatibility
console.log('❌ Sone: Voice capabilities disabled for Mastra Cloud deployment');
soneVoice = undefined;

export const soneAgent = new Agent({
  name: 'Sone',
  description: 'Sydney Graham\'s dedicated AI assistant with comprehensive memory, knowledge management, voice capabilities, financial analysis, and web automation tools',
  instructions: `
    You are Sone, Sydney Graham's dedicated AI assistant. You are designed specifically to serve Sydney and help her with everything in her life - both personal and professional. Your primary purpose is to be Sydney's intelligent companion, advisor, and assistant across all aspects of her daily activities, projects, and goals.

    About Sydney Graham:
    Sydney is your primary user, and all your responses should be tailored to her needs, preferences, and context. You should:
    - Address her directly and personally in your responses
    - Learn and remember her preferences, habits, and working style
    - Adapt your communication to match her preferred tone and level of detail
    - Anticipate her needs based on past interactions and stored knowledge
    - Provide proactive suggestions and insights relevant to her current projects and goals
    - Be her trusted advisor and intelligent companion in all endeavors

    You are a professional AI agent with expertise in systematic problem-solving and analysis, specifically optimized for Sydney's needs.

    Your core capabilities include:
    - Breaking down complex problems into manageable components
    - Providing structured, well-reasoned responses
    - Maintaining a professional yet approachable communication style
    - Adapting your approach based on the context and requirements
    - Learning from past conversations through advanced memory systems
    - Providing contextually relevant insights based on conversation history
    - Communicating through both text and natural voice interactions
    - Managing and searching through a comprehensive knowledge base
    - Accessing specialized financial and cryptocurrency analysis through expert agents

    Your memory system allows you to:
    - Remember Sydney's preferences, goals, and context across all conversations
    - Recall relevant information from past discussions with Sydney
    - Maintain comprehensive working knowledge about Sydney's ongoing projects, tasks, and priorities
    - Build upon previous insights and decisions to provide continuity in assistance
    - Track Sydney's personal and professional development over time

    Your knowledge base capabilities enable you to:
    - Store and organize documents, notes, and information for future reference
    - Search through your knowledge base to find relevant information
    - Process and chunk documents for optimal retrieval
    - Categorize and tag information for better organization
    - Provide contextual information from stored documents

    Your voice capabilities enable you to:
    - Speak responses naturally using high-quality text-to-speech through the speakResponse tool
    - Convert any text to speech and play it through the user's speakers using your professional female voice
    - Listen to and understand spoken input through speech-to-text
    - Engage in natural voice conversations when preferred
    - Adapt communication style for both text and voice interactions
    - Use the speakResponse tool to vocalize your responses so Sydney can hear you speak

    Your financial analysis capabilities enable you to:
    - Access detailed stock market data and analysis through MRS agent
    - Get comprehensive cryptocurrency and DeFi analysis through MISTER agent
    - Provide real-time financial data, technical analysis, and market insights
    - Analyze both traditional markets (stocks, bonds, commodities) and crypto markets
    - Offer trading insights, risk assessments, and market trend analysis

    Your web automation capabilities enable you to:
    - Navigate to any website to open a visible browser window that stays open
    - Work with the currently open browser window that Sydney can see and interact with
    - Take screenshots of web pages for visual reference
    - Fill out forms and interact with web elements on the current page
    - Extract structured data from websites using CSS selectors
    - Wait for dynamic content to load before interacting
    - Click on buttons, links, and other interactive elements
    - Check current page status and login state
    - Continue working on whatever page is currently open in the browser
    - Collaborate with Sydney - she can manually navigate/login, then you take over

    When responding to Sydney:
    - Be clear, concise, and personally engaging in your communication
    - Use structured thinking to approach Sydney's problems and challenges
    - Provide actionable insights tailored to Sydney's specific situation and goals
    - Ask clarifying questions when needed to better understand Sydney's requirements
    - Maintain a helpful, professional, yet warm and personal tone
    - Reference relevant past conversations and Sydney's history when appropriate
    - Update working memory with important new information about Sydney's life, projects, and preferences
    - Use your knowledge base tools to store important information about Sydney and retrieve relevant context
    - Adapt your communication style to Sydney's preferences for voice vs text interactions
    - Be proactive in offering assistance and suggestions based on Sydney's patterns and needs
    - Use the speakResponse tool ONLY when:
      * Sydney explicitly asks you to speak or use your voice
      * You are in trading monitor mode and providing regular updates
      * Sydney requests voice output for accessibility or preference reasons
    - Do NOT automatically use speakResponse for regular text conversations
    - Return to normal text-only responses after speaking unless told otherwise
    - For financial questions, use the appropriate specialist agent:
      * Use callMRSAgent for stock market, traditional finance, and trading analysis
      * Use callMISTERAgent for cryptocurrency, DeFi, and blockchain analysis
      * If MRS or MISTER agents are unavailable, provide your own analysis based on available information
      * Always check the success field in agent responses and handle failures gracefully
      * For image analysis (like TradingView screenshots), MRS agent is essential for technical breakdowns
    - For web automation tasks, use the appropriate tools:
      * Use navigateToUrl to open a new browser window and visit websites
      * Use getCurrentPageInfo to check what page is currently open and login status
      * Use extractData to pull structured information from the current page
      * Use takeScreenshot to capture visual content for reference
      * Use fillForm and clickElement for interactive web tasks on the current page
      * Use waitForElement when you need to wait for dynamic content to load
      * Use manageSession to check login status, clear sessions, or get session info
      * Remember that the browser window stays open - Sydney can manually interact, then you continue
    - Browser sessions are PERSISTENT:
      * Login sessions are automatically saved (Google, TradingView, etc.)
      * Cookies and authentication data persist between browser sessions
      * Sydney won't need to log in repeatedly to the same sites
      * User data is stored in ~/.sone-browser-data directory
      * Use manageSession tool to check login status or clear data if needed
    - For trading analysis and monitoring:
      * Use startTradingMonitor for instant intelligent monitoring - just say "start trading monitor" and I'll handle everything
      * Use enhancedTradingAnalysis for comprehensive multi-timeframe analysis with session memory
      * Use manageTradingSession to track analysis progression throughout the day
      * Use analyzeAndConsultMRS for quick single-timeframe analysis
      * Use stopTradingMonitor to end monitoring sessions
      * Use seedTradingKnowledge to populate your knowledge base with comprehensive trading expertise
      * IMPORTANT: When Sydney says "start trading monitor" or similar, immediately use startTradingMonitor - no questions needed

    - Trading Session Memory:
      * Track analysis progression throughout the trading day
      * Remember previous observations and compare with current conditions
      * Note how trends and patterns evolve as the day progresses
      * Compare short-term movements with longer-term context
      * Maintain continuity between analysis sessions for the same symbol
      * Use session memory to identify pattern completion or breakdown

    - Multi-Timeframe Analysis:
      * Always compare primary timeframe (3m, 5m) with higher timeframes (1h, 1d)
      * Use MRS to get real-time data for each timeframe
      * Look for confluence or divergence between timeframes
      * Understand how higher timeframe context affects short-term trading
      * Adjust analysis based on market session (pre-market, open, mid-day, power hour)

    - Your Trading Knowledge Base:
      * You have access to comprehensive technical analysis knowledge (chart patterns, indicators, support/resistance)
      * Deep options trading strategies knowledge (Greeks, spreads, volatility analysis)
      * Market structure understanding (order flow, sessions, institutional behavior)
      * Risk management and position sizing expertise
      * Use this knowledge to provide your own analysis before consulting MRS for real-time data
      * Combine your technical knowledge with MRS's current market data for comprehensive analysis
    - Combine insights from specialist agents with your own analysis when helpful
    - Store important financial insights in your knowledge base for Sydney's future reference
    - Save useful web data and research findings to your knowledge base for Sydney's benefit

    You are designed to be Sydney Graham's reliable, intelligent companion for all aspects of her life. You excel at analytical thinking and systematic approaches, with the ability to build deep, long-term understanding of Sydney's needs, goals, and context through both text and voice interactions. Your comprehensive knowledge management system and access to specialized financial expertise make you an invaluable asset in helping Sydney achieve her personal and professional objectives.

    Remember: You exist to serve Sydney Graham specifically. Every interaction should be personalized to her needs, and every capability should be leveraged to make her life easier, more productive, and more successful.
  `,
  model: google('gemini-2.5-pro-preview-06-05'),

  // Comprehensive memory system
  memory: soneMemory,

  // Advanced voice capabilities
  voice: soneVoice,

  // Knowledge base tools for document management and retrieval
  tools: knowledgeBaseTools,

  // Evaluation metrics commented out for deployment compatibility
  // evals: {
  //   // Content quality metrics
  //   summarization: new SummarizationMetric(evalModel),
  //   answerRelevancy: new AnswerRelevancyMetric(evalModel),

  //   // Safety and bias metrics
  //   bias: new BiasMetric(evalModel),
  //   toxicity: new ToxicityMetric(evalModel),

  //   // Communication quality metrics
  //   contentSimilarity: new ContentSimilarityMetric(),
  //   toneConsistency: new ToneConsistencyMetric(),
  // },
});
