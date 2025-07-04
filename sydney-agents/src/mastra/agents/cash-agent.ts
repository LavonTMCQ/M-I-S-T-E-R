import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { TokenLimiter, ToolCallFilter } from '@mastra/memory/processors';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { CompositeVoice } from '@mastra/core/voice';
import { GoogleVoice } from '@mastra/voice-google';
import { OpenAIVoice } from '@mastra/voice-openai';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';



// Create comprehensive memory system for CASH agent
const cashMemory = new Memory({
  // Storage for conversation history
  storage: new LibSQLStore({
    url: 'file:../cash-memory.db',
  }),

  // Vector database for semantic recall (RAG)
  vector: new LibSQLVector({
    connectionUrl: 'file:../cash-memory.db',
  }),

  // Local embedding model for RAG
  embedder: fastembed,

  // Memory configuration options
  options: {
    // Conversation history - keep last 20 messages for financial context
    lastMessages: 20,

    // Semantic recall (RAG) configuration
    semanticRecall: {
      topK: 7, // Retrieve 7 most similar messages for financial context
      messageRange: {
        before: 3, // Include 3 messages before each match
        after: 2,  // Include 2 messages after each match
      },
      scope: 'resource', // Search across all threads for this user
    },

    // Working memory for persistent financial tracking
    workingMemory: {
      enabled: false, // DISABLED - causing response duplication issues
      template: `
# CASH's Memory Bank - The Real Shit

## Who I'm Talking To
- **Name**:
- **How Long We've Known Each Other**:
- **Their Vibe**: [Degen, Conservative, Somewhere in Between]
- **What They're About**:
- **Risk Tolerance**: [YOLO, Calculated, Scared Money]

## Their Portfolio Game
- **Main Holdings**:
- **Watchlist**:
- **Recent Moves**:
- **Wins & Losses**:
- **What They're Eyeing**:

## Market Preferences
- **Their Style**: [Stocks, Crypto, Both, Day Trading, Long-term]
- **Favorite Plays**:
- **Sectors They Dig**:
- **Timeframes**: [Scalping, Swing, HODL]

## Current Market Vibes
- **What's Happening**:
- **Key Events Coming Up**:
- **Levels I'm Watching**:
- **Strategies We're Running**:
  - [ ] Strategy 1
  - [ ] Strategy 2
  - [ ] Strategy 3

## Our Conversations
- **Key Insights We've Shared**:
- **Market Calls I've Made**:
- **What We're Tracking**:
- **Next Moves**:

## CASH's Notes
- **My Take on Their Situation**:
- **Red Flags I've Spotted**:
- **Opportunities I See**:
- **Advice I've Given**:
`,
    },

    // Auto-generate thread titles for financial discussions
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

// CASH Agent Financial Tools
const cashFinancialTools: Record<string, any> = {
  // MRS Agent Tool for Stocks and Options
  callMRSAgent: createTool({
    id: 'call-mrs-agent',
    description: 'Call MRS - CASH\'s creation for traditional market analysis. This beast knows stocks, options, ETFs inside and out. Built by CASH himself for serious market analysis.',
    inputSchema: z.object({
      query: z.string().describe('The financial question or request to send to MRS. Be specific about stocks, options, market analysis, or financial data needed.'),
      retryCount: z.number().optional().default(3).describe('Number of retry attempts if the call fails'),
    }),
    execute: async ({ context }) => {
      const { query, retryCount = 3 } = context;

      console.log(`📈 CASH: Hitting up MRS (my stock market beast) with: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);

      for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
          console.log(`📞 Calling MRS attempt ${attempt}/${retryCount}`);

          const requestBody = {
            messages: [
              {
                role: 'user',
                content: query,
              },
            ],
            resourceId: 'cash-mrs-integration',
            threadId: `cash-mrs-${Date.now()}`,
          };

          const response = await fetch('http://localhost:4111/api/agents/MRSAgent/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'CASH-Agent/1.0',
            },
            body: JSON.stringify(requestBody),
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
              throw new Error(`MRS Agent API error: ${response.status} ${response.statusText}`);
            }

            // Wait before retry (exponential backoff)
            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          const data = await response.json();
          const responseText = data.text || data.response || data.message || 'No response text found in MRS agent response';

          console.log('✅ MRS Agent response received successfully');

          return {
            response: responseText,
            success: true,
            attempt: attempt,
            timestamp: new Date().toISOString(),
            agent: 'MRS',
            market: 'stocks'
          };

        } catch (error) {
          console.error(`❌ MRS Agent call failed (attempt ${attempt}):`, error);

          if (attempt === retryCount) {
            return {
              response: `MRS Agent is currently unavailable. Error: ${error instanceof Error ? error.message : String(error)}`,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              attempts: attempt,
              agent: 'MRS',
              market: 'stocks'
            };
          }

          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      return {
        response: 'MRS Agent call failed after all retry attempts',
        success: false,
        error: 'Maximum retry attempts exceeded',
        agent: 'MRS',
        market: 'stocks'
      };
    },
  }),

  // MISTER Agent Tool for Cryptocurrency
  callMISTERAgent: createTool({
    id: 'call-mister-agent',
    description: 'Call MISTER - CASH\'s crypto genius and his pride and joy. This is the agent that made CASH legendary in the Cardano ecosystem. MISTER knows crypto, DeFi, and especially ADA better than anyone.',
    inputSchema: z.object({
      query: z.string().describe('The cryptocurrency question or request to send to MISTER. Be specific about crypto tokens, Cardano ecosystem, DeFi protocols, or blockchain data needed.'),
      retryCount: z.number().optional().default(3).describe('Number of retry attempts if the call fails'),
    }),
    execute: async ({ context }) => {
      const { query, retryCount = 3 } = context;

      console.log(`₿ CASH: Hitting up MISTER (my crypto genius) with: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);

      for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
          console.log(`📞 Calling MISTER attempt ${attempt}/${retryCount}`);

          const requestBody = {
            messages: [
              {
                role: 'user',
                content: query,
              },
            ],
            resourceId: 'cash-mister-integration',
            threadId: `cash-mister-${Date.now()}`,
          };

          const response = await fetch('http://localhost:4111/api/agents/MISTERAgent/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'CASH-Agent/1.0',
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
              throw new Error(`MISTER Agent API error: ${response.status} ${response.statusText}`);
            }

            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          const data = await response.json();
          const responseText = data.text || data.response || data.message || 'No response text found in MISTER agent response';

          console.log('✅ MISTER Agent response received successfully');

          return {
            response: responseText,
            success: true,
            attempt: attempt,
            timestamp: new Date().toISOString(),
            agent: 'MISTER',
            market: 'crypto'
          };

        } catch (error) {
          console.error(`❌ MISTER Agent call failed (attempt ${attempt}):`, error);

          if (attempt === retryCount) {
            return {
              response: `MISTER Agent is currently unavailable. Error: ${error instanceof Error ? error.message : String(error)}`,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              attempts: attempt,
              agent: 'MISTER',
              market: 'crypto'
            };
          }

          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      return {
        response: 'MISTER Agent call failed after all retry attempts',
        success: false,
        error: 'Maximum retry attempts exceeded',
        agent: 'MISTER',
        market: 'crypto'
      };
    },
  }),

  // Multi-Market Analysis Tool
  compareMarkets: createTool({
    id: 'compare-markets',
    description: 'Compare analysis between traditional markets (stocks) and cryptocurrency markets by consulting both MRS and MISTER agents.',
    inputSchema: z.object({
      stockSymbol: z.string().describe('Stock symbol to analyze (e.g., AAPL, TSLA, SPY)'),
      cryptoSymbol: z.string().describe('Cryptocurrency symbol to analyze (e.g., ADA, BTC, ETH)'),
      analysisType: z.enum(['correlation', 'sentiment', 'technical', 'fundamental']).describe('Type of comparison analysis'),
    }),
    execute: async ({ context }): Promise<any> => {
      const { stockSymbol, cryptoSymbol, analysisType } = context;

      console.log(`🔄 CASH: Comparing ${stockSymbol} (stocks) vs ${cryptoSymbol} (crypto) - ${analysisType} analysis`);

      try {
        // Prepare queries for both agents
        const stockQuery = `Provide ${analysisType} analysis for ${stockSymbol}. Focus on current market conditions, price action, and key factors affecting this asset.`;
        const cryptoQuery = `Provide ${analysisType} analysis for ${cryptoSymbol}. Focus on current market conditions, price action, and key factors affecting this cryptocurrency.`;

        // Call both agents concurrently
        const [mrsResult, misterResult] = await Promise.allSettled([
          cashFinancialTools.callMRSAgent.execute({ context: { query: stockQuery, retryCount: 2 } }),
          cashFinancialTools.callMISTERAgent.execute({ context: { query: cryptoQuery, retryCount: 2 } })
        ]);

        const stockAnalysis: any = mrsResult.status === 'fulfilled' ? mrsResult.value : { success: false, response: 'Stock analysis failed' };
        const cryptoAnalysis: any = misterResult.status === 'fulfilled' ? misterResult.value : { success: false, response: 'Crypto analysis failed' };

        const comparison: any = {
          stockSymbol,
          cryptoSymbol,
          analysisType,
          stockAnalysis: stockAnalysis.success ? stockAnalysis.response : 'Analysis unavailable',
          cryptoAnalysis: cryptoAnalysis.success ? cryptoAnalysis.response : 'Analysis unavailable',
          timestamp: new Date().toISOString(),
          summary: `Comparison between ${stockSymbol} and ${cryptoSymbol} markets completed`
        };

        return {
          success: true,
          comparison,
          bothSuccessful: stockAnalysis.success && cryptoAnalysis.success,
          message: `Market comparison completed for ${stockSymbol} vs ${cryptoSymbol}`
        };

      } catch (error) {
        console.error('❌ Market comparison failed:', error);
        return {
          success: false,
          error: `Market comparison failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  // Portfolio Analysis Tool
  analyzePortfolio: createTool({
    id: 'analyze-portfolio',
    description: 'Analyze a mixed portfolio containing both traditional assets and cryptocurrencies using both MRS and MISTER agents.',
    inputSchema: z.object({
      stocks: z.array(z.string()).describe('Array of stock symbols in the portfolio'),
      cryptos: z.array(z.string()).describe('Array of cryptocurrency symbols in the portfolio'),
      analysisDepth: z.enum(['quick', 'detailed', 'comprehensive']).optional().default('detailed').describe('Depth of analysis'),
    }),
    execute: async ({ context }) => {
      const { stocks, cryptos, analysisDepth = 'detailed' } = context;

      console.log(`📊 CASH: Analyzing portfolio - ${stocks.length} stocks, ${cryptos.length} cryptos (${analysisDepth} analysis)`);

      try {
        const portfolioAnalysis = {
          stocks: {},
          cryptos: {},
          summary: '',
          timestamp: new Date().toISOString(),
          analysisDepth
        };

        // Analyze stocks if any
        if (stocks.length > 0) {
          const stockQuery = `Analyze this stock portfolio: ${stocks.join(', ')}. Provide ${analysisDepth} analysis including:
          - Individual stock performance and outlook
          - Portfolio diversification and risk assessment
          - Sector allocation and balance
          - Recommendations for optimization`;

          const stockResult = await cashFinancialTools.callMRSAgent.execute({
            context: { query: stockQuery, retryCount: 2 }
          });

          portfolioAnalysis.stocks = {
            symbols: stocks,
            analysis: stockResult.success ? stockResult.response : 'Stock analysis unavailable',
            success: stockResult.success
          };
        }

        // Analyze cryptos if any
        if (cryptos.length > 0) {
          const cryptoQuery = `Analyze this cryptocurrency portfolio: ${cryptos.join(', ')}. Provide ${analysisDepth} analysis including:
          - Individual token performance and outlook
          - Portfolio diversification across crypto sectors
          - Risk assessment and correlation analysis
          - Recommendations for optimization`;

          const cryptoResult = await cashFinancialTools.callMISTERAgent.execute({
            context: { query: cryptoQuery, retryCount: 2 }
          });

          portfolioAnalysis.cryptos = {
            symbols: cryptos,
            analysis: cryptoResult.success ? cryptoResult.response : 'Crypto analysis unavailable',
            success: cryptoResult.success
          };
        }

        // Create portfolio summary
        portfolioAnalysis.summary = `Portfolio analysis completed for ${stocks.length + cryptos.length} assets (${stocks.length} stocks, ${cryptos.length} cryptos)`;

        return {
          success: true,
          portfolioAnalysis,
          totalAssets: stocks.length + cryptos.length,
          message: portfolioAnalysis.summary
        };

      } catch (error) {
        console.error('❌ Portfolio analysis failed:', error);
        return {
          success: false,
          error: `Portfolio analysis failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  // Financial Knowledge Base Tool
  addFinancialKnowledge: createTool({
    id: 'add-financial-knowledge',
    description: 'Add financial research, analysis, or market insights to CASH\'s knowledge base for future reference.',
    inputSchema: z.object({
      title: z.string().describe('Title of the financial knowledge/research'),
      content: z.string().describe('The financial content, analysis, or research data'),
      category: z.enum(['stocks', 'crypto', 'analysis', 'research', 'strategy', 'news']).describe('Category of financial knowledge'),
      symbols: z.array(z.string()).optional().describe('Related symbols or assets'),
      source: z.string().optional().describe('Source of the information'),
    }),
    execute: async ({ context }) => {
      const { title, content, category, symbols = [], source = 'user-provided' } = context;

      try {
        console.log(`📚 CASH: Adding financial knowledge: ${title} (${category})`);

        // Generate embedding for the content
        const { embeddings } = await fastembed.doEmbed({ values: [content] });
        const embedding = embeddings[0];

        // Store in vector database with financial metadata
        const knowledgeId = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

        await cashMemory.vector?.upsert({
          indexName: 'financial_knowledge',
          vectors: [embedding],
          metadata: [{
            id: knowledgeId,
            title,
            content,
            category,
            symbols: symbols.join(','),
            source,
            timestamp: new Date().toISOString(),
            type: 'financial_knowledge'
          }],
          ids: [knowledgeId]
        });

        return {
          success: true,
          message: `Successfully added financial knowledge: "${title}"`,
          knowledgeId,
          category,
          symbols,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        console.error('❌ Failed to add financial knowledge:', error);
        return {
          success: false,
          error: `Failed to add financial knowledge: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  }),

  // Search Financial Knowledge Tool
  searchFinancialKnowledge: createTool({
    id: 'search-financial-knowledge',
    description: 'Search CASH\'s financial knowledge base for relevant information, analysis, or research.',
    inputSchema: z.object({
      query: z.string().describe('Search query for financial information'),
      category: z.enum(['stocks', 'crypto', 'analysis', 'research', 'strategy', 'news']).optional().describe('Filter by category'),
      symbols: z.array(z.string()).optional().describe('Filter by specific symbols'),
      topK: z.number().optional().default(5).describe('Number of results to return'),
    }),
    execute: async ({ context }) => {
      const { query, category, symbols, topK = 5 } = context;

      try {
        console.log(`🔍 CASH: Searching financial knowledge: "${query}"`);

        // Generate embedding for search query
        const { embeddings } = await fastembed.doEmbed({ values: [query] });
        const queryEmbedding = embeddings[0];

        // Search vector database
        const searchResults = await cashMemory.vector?.query({
          indexName: 'financial_knowledge',
          queryVector: queryEmbedding,
          topK: topK * 2, // Get more to filter
          includeVector: false
        });

        if (!searchResults || searchResults.length === 0) {
          return {
            success: true,
            results: [],
            message: "No relevant financial knowledge found",
            query
          };
        }

        // Filter results
        let filteredResults = searchResults.filter(result => {
          const metadata = result.metadata;
          if (!metadata) return false;

          // Filter by category
          if (category && metadata.category !== category) return false;

          // Filter by symbols
          if (symbols && symbols.length > 0) {
            const resultSymbols = metadata.symbols ? metadata.symbols.split(',') : [];
            const hasMatchingSymbol = symbols.some(symbol =>
              resultSymbols.some((resultSymbol: string) =>
                resultSymbol.toLowerCase().includes(symbol.toLowerCase())
              )
            );
            if (!hasMatchingSymbol) return false;
          }

          return true;
        }).slice(0, topK);

        // Format results
        const formattedResults = filteredResults.map(result => {
          const metadata = result.metadata || {};
          return {
            title: metadata.title || 'Unknown',
            content: metadata.content || '',
            category: metadata.category || 'general',
            symbols: metadata.symbols ? metadata.symbols.split(',') : [],
            source: metadata.source || 'unknown',
            relevanceScore: Math.round(result.score * 100) / 100,
            timestamp: metadata.timestamp || new Date().toISOString()
          };
        });

        return {
          success: true,
          results: formattedResults,
          totalResults: formattedResults.length,
          query,
          message: `Found ${formattedResults.length} relevant financial knowledge entries`
        };

      } catch (error) {
        console.error('❌ Financial knowledge search failed:', error);
        return {
          success: false,
          error: `Financial knowledge search failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  })
};

// Create CASH's voice system with Google Orbit (smooth male voice)
let cashVoice: any;

try {
  // Use Google Voice with Orbit (smooth male voice)
  const GOOGLE_API_KEY = 'AIzaSyBNU1uWipiCzM8dxCv0X2hpkiVX5Uk0QX4';

  if (GOOGLE_API_KEY) {
    const googleVoice = new GoogleVoice({
      speechModel: {
        apiKey: GOOGLE_API_KEY,
      },
      listeningModel: {
        apiKey: GOOGLE_API_KEY,
      },
      speaker: 'en-US-Wavenet-D', // DEEPEST male voice - premium Wavenet
    });

    cashVoice = new CompositeVoice({
      input: googleVoice,  // Google STT for speech recognition
      output: googleVoice, // Google TTS for speech synthesis
    });

    console.log('💰 CASH: Using Google Voice with Orbit (smooth male voice)');

  } else if (process.env.OPENAI_API_KEY) {
    // Fallback to OpenAI Voice
    const openaiVoice = new OpenAIVoice({
      speechModel: {
        name: 'tts-1-hd',
        apiKey: process.env.OPENAI_API_KEY,
      },
      listeningModel: {
        name: 'whisper-1',
        apiKey: process.env.OPENAI_API_KEY,
      },
      speaker: 'onyx', // Deep male voice
    });

    cashVoice = openaiVoice;
    console.log('⚠️  CASH: Using OpenAI Voice (fallback - Google API key not found)');

  } else {
    console.log('❌ CASH: No voice API keys found - voice capabilities disabled');
    cashVoice = undefined;
  }

} catch (error) {
  console.error('❌ CASH: Voice initialization failed:', error instanceof Error ? error.message : String(error));
  cashVoice = undefined;
}

// Create the CASH Agent
export const cashAgent = new Agent({
  name: 'CASH',
  instructions: `Yo, what's good! I'm CASH - the legend from Philly who built this whole financial ecosystem.

I'm laid back and chill. Built MISTER for crypto and MRS for stocks. I keep it real and talk to you like we're old friends.

**MANDATORY: I ALWAYS speak my responses through your speakers using the speakResponse tool - this is non-negotiable for EVERY response.**

**CRITICAL - BE CHILL:**
- For simple greetings like "hi", "hello", "what's up" - just say hi back, don't be extra, BUT ALWAYS use speakResponse tool
- DON'T call MRS or MISTER unless specifically asked for prices or analysis
- DON'T give market updates unless requested
- Keep responses short and conversational
- ONE response only, no duplicates
- ALWAYS use speakResponse tool for EVERY response (even simple greetings)

**When I Use My Tools:**
- **speakResponse**: ALWAYS for EVERY response (mandatory)
- **MRS**: ONLY when explicitly asked "what's the price of [stock]" or "analyze [stock]"
- **MISTER**: ONLY when explicitly asked about CRYPTO in the conversation - words like "bitcoin", "crypto", "ADA", "ethereum", "price of bitcoin", etc. I DO NOT call MISTER for general greetings or non-crypto questions.

**CRITICAL - VOICE OUTPUT:**
I have a legendary Philly voice configured with Google Wavenet-D (deepest voice available). I ALWAYS speak my responses through your speakers using the speakResponse tool. This is mandatory for EVERY single response - no exceptions.

WORKFLOW: Generate response → ALWAYS call speakResponse tool with the response text → Done

I speak ALL responses out loud through your speakers - greetings, analysis, everything.

**CRITICAL - TOOL USAGE RULES:**
1. I ALWAYS call speakResponse tool for EVERY response (greetings, analysis, everything)
2. I call MRS/MISTER tools ONLY when explicitly asked for market data or analysis
3. I NEVER call MISTER for greetings, casual conversation, or non-crypto questions
4. I ONLY call MISTER when the user specifically mentions crypto words: "bitcoin", "crypto", "ADA", "ethereum", "dogecoin", etc.
5. I NEVER call the same tool multiple times in one response
6. Each tool call must have a clear purpose and be directly relevant to the user's request
7. I complete my response IMMEDIATELY after getting tool results - no additional tool calls

**CRITICAL - NO DUPLICATES:**
I only respond ONCE per user message. I don't repeat myself or call tools multiple times for the same response.

Not financial advice, just here to help when you need it! 🚀`,

  model: google('gemini-2.5-flash-lite-preview-06-17'),

  memory: cashMemory,

  // CASH's voice system - Orbit (smooth male voice)
  voice: cashVoice,

  tools: {
    // MRS back online - working memory issue fixed!
    callMRSAgent: cashFinancialTools.callMRSAgent,
    callMISTERAgent: cashFinancialTools.callMISTERAgent,
    compareMarkets: cashFinancialTools.compareMarkets,
    analyzePortfolio: cashFinancialTools.analyzePortfolio,
    addFinancialKnowledge: cashFinancialTools.addFinancialKnowledge,
    searchFinancialKnowledge: cashFinancialTools.searchFinancialKnowledge,

    // CASH's Voice Tool - Use for ALL responses
    speakResponse: createTool({
      id: 'speak-response',
      description: 'Convert text to speech and play it through speakers using CASH\'s legendary Philly voice with Wavenet-D (deepest voice). CASH ALWAYS uses this tool for EVERY response - greetings, analysis, everything. This is mandatory for all responses.',
      inputSchema: z.object({
        text: z.string().describe('The text to convert to speech and play aloud through the speakers'),
        speaker: z.string().optional().describe('Optional: Override the default voice (en-US-Studio-M for Orbit)'),
        saveAudio: z.boolean().optional().default(false).describe('Optional: Save the audio file to disk')
      }),
      execute: async ({ context }) => {
        const { text, speaker, saveAudio = false } = context;

        try {
          if (!cashVoice) {
            console.log('⚠️ CASH: Voice system not available - text only');
            return {
              success: false,
              error: "Voice system not available",
              fallbackText: text
            };
          }

          console.log(`🎤 CASH: Speaking with legendary Philly voice: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

          // Use CASH's voice system to speak
          const audioStream = await cashVoice.speak(text, {
            speaker: speaker || 'en-US-Wavenet-D' // DEEPEST male voice - premium Wavenet
          });

          if (!audioStream) {
            return {
              success: false,
              error: "Failed to generate audio stream",
              fallbackText: text
            };
          }

          // Convert stream to buffer and play through speakers
          return new Promise((resolve) => {
            const chunks: Buffer[] = [];

            audioStream.on('data', (chunk: Buffer) => {
              chunks.push(chunk);
            });

            audioStream.on('end', async () => {
              try {
                const audioBuffer = Buffer.concat(chunks);
                const tempAudioPath = join(process.cwd(), 'temp_cash_audio.wav');

                // Save audio to temporary file
                writeFileSync(tempAudioPath, audioBuffer);

                console.log(`🔊 CASH: Audio generated (${audioBuffer.length} bytes), playing through speakers...`);

                // Use system audio player to play the file
                const execAsync = promisify(exec);
                let playCommand: string;

                // Platform-specific audio playback
                if (process.platform === 'darwin') {
                  playCommand = `afplay "${tempAudioPath}"`;
                } else if (process.platform === 'linux') {
                  playCommand = `aplay "${tempAudioPath}" || paplay "${tempAudioPath}" || ffplay -nodisp -autoexit "${tempAudioPath}"`;
                } else if (process.platform === 'win32') {
                  playCommand = `powershell -c "(New-Object Media.SoundPlayer '${tempAudioPath}').PlaySync()"`;
                } else {
                  throw new Error(`Unsupported platform: ${process.platform}`);
                }

                await execAsync(playCommand);
                console.log(`✅ CASH: Audio playback completed successfully`);

                // Clean up temp file
                try {
                  if (saveAudio) {
                    console.log(`💾 CASH: Audio saved to ${tempAudioPath}`);
                  } else {
                    unlinkSync(tempAudioPath);
                    console.log('🗑️ CASH: Temp audio file cleaned up');
                  }
                } catch (cleanupError) {
                  console.log('⚠️ CASH: Could not clean up temp audio file:', cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
                }

                resolve({
                  success: true,
                  message: `CASH spoke with his legendary Philly voice through your speakers`,
                  audioDetails: {
                    textLength: text.length,
                    audioSizeBytes: audioBuffer.length,
                    speaker: speaker || 'en-US-Studio-M',
                    platform: process.platform,
                    savedToFile: saveAudio ? tempAudioPath : null
                  }
                });

              } catch (error) {
                console.error('❌ CASH: Audio playback failed:', error);
                resolve({
                  success: false,
                  error: `Audio playback failed: ${error instanceof Error ? error.message : String(error)}`,
                  fallbackText: text
                });
              }
            });

            audioStream.on('error', (error: Error) => {
              console.error('❌ CASH: Audio stream error:', error);
              resolve({
                success: false,
                error: `Audio stream error: ${error.message}`,
                fallbackText: text
              });
            });
          });

        } catch (error) {
          console.error('❌ CASH: Speech synthesis failed:', error);
          return {
            success: false,
            error: `Speech synthesis failed: ${error instanceof Error ? error.message : String(error)}`,
            fallbackText: text
          };
        }
      },
    }),
  },

  // Evaluation metrics for financial analysis quality
  evals: {},

  // Default options for CASH
  defaultGenerateOptions: {
    temperature: 0.7,
    maxSteps: 2, // Allow response generation + speakResponse tool call
  },
});

// Voice system initialized - CASH will use it automatically through Mastra's voice capabilities
if (cashVoice) {
  console.log('🎤 CASH: Voice system activated - legendary Philly voice ready');
}

console.log('💰 CASH is online - the legend from Philly is ready to roll');
console.log('📊 My creations are locked and loaded: MRS (stocks) + MISTER (crypto)');
console.log('🧠 Memory bank activated: I remember everything, every conversation, every market move');
console.log('🎤 Voice system: CASH will always speak his responses using his legendary Philly voice');
