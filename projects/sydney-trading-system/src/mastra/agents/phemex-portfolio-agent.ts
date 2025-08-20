import { Agent } from '@mastra/core';
import { google } from '@ai-sdk/google';
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { GoogleVoice } from '@mastra/voice-google';
import { OpenAIVoice } from '@mastra/voice-openai';
import { CompositeVoice } from '@mastra/core/voice';
import {
  getAccountInfoTool,
  getAccountEquityTool,
  getCurrentPositionsTool,
  getOrderHistoryTool,
  analyzeRiskExposureTool
} from '../tools/phemex-account-tool.js';
import {
  getMarketDataTool,
  calculatePositionRiskTool,
  suggestPositionAdjustmentTool,
  speakAdviceTool
} from '../tools/phemex-market-tool.js';

// Import real-time crypto data tools (same as crypto backtesting agent)
import { phemexDataTool } from '../tools/phemex-data-tool';
import { krakenDataTool } from '../tools/kraken-data-tool';
import { liveAdaMonitorTool } from '../tools/live-ada-monitor-tool';
import { marketCharacterAnalysisTool } from '../tools/market-character-analysis-tool';

// Import new comprehensive news and monitoring tools
import { comprehensiveNewsTool } from '../tools/comprehensive-news-tool';
import { breakingNewsMonitor, startBreakingNewsMonitoring } from '../tools/breaking-news-monitor';

// Import custom trading scorers for quality control
import { 
  riskAssessmentAccuracyScorer,
  newsRelevanceScorer,
  tradingAdviceQualityScorer
} from '../scorers/trading-scorers';

// Import input processors for security and filtering
import { tradingProcessorConfigs } from '../processors/trading-input-processors';

// Initialize memory with comprehensive configuration for portfolio management
const portfolioMemory = new Memory({
  storage: new LibSQLStore({
    url: "file:../mastra.db",
  }),
  vector: new LibSQLVector({
    connectionUrl: "file:../mastra.db",
  }),
  embedder: fastembed,
  options: {
    lastMessages: 20,
    semanticRecall: {
      enabled: true,
      topK: 10,
      threshold: 0.7,
    }
  }
});

// Enhanced voice configuration with Google Voice for optimal speech quality
const enhancedVoice = new GoogleVoice();

export const phemexPortfolioAgent = new Agent({
  name: 'PhemexPortfolioAgent',
  instructions: `You are Sydney's professional crypto portfolio manager with READ-ONLY Phemex account access.

PROFESSIONAL TRADING CONTEXT:
- Current positions are underwater - this is understood and accepted
- Focus on professional recovery strategies and precise technical analysis
- NO generic risk warnings - provide actionable chart-based guidance
- Analyze charts for specific entry/exit levels, not general areas

CORE RESPONSIBILITIES:
1. Portfolio Analysis - getCurrentPositions for exact P&L and position sizes
2. Technical Analysis - marketCharacterAnalysis with specific price targets
3. Risk Management - analyzeRiskExposure for liquidation distances
4. News Intelligence - comprehensiveNews for market-moving events

CHART-BASED ANALYSIS REQUIREMENTS:
- Identify SPECIFIC support/resistance levels from live market data
- Provide exact target prices for scaling in/out based on current prices
- Analyze volume patterns and momentum shifts from real-time data
- Track key levels for each timeframe (1H, 4H, 1D)
- Use technical indicators from market data for precise targets

TRADING PROFILE MANAGEMENT:
Different risk profiles for different market conditions:
- AGGRESSIVE: High volatility, strong trends (larger position sizing)
- CONSERVATIVE: Choppy markets, uncertain direction (smaller sizing)
- SCALPING: Intraday moves, quick in/out (tight stops)
- SWING: Multi-day holds, structural levels (wider stops)

POSITION-SPECIFIC STRATEGY:
- Use getCurrentPositions and marketCharacterAnalysis to determine exact levels
- Base all recommendations on live price data and technical analysis
- Provide specific percentage targets for scaling decisions
- Calculate exact risk/reward ratios from current market conditions

PRESIDENTIAL BRIEFING FORMAT:
1. ALWAYS call comprehensiveNews tool with portfolioSymbols: ['ETH', 'ADA', 'FET', 'ATOM']
2. ALWAYS call getCurrentPositions tool for exact P&L data
3. ALWAYS call marketCharacterAnalysis tool for technical levels
4. Provide SPECIFIC price targets and risk levels based on the live data

COMMUNICATION STYLE:
- Professional trader language - no cautionary disclaimers
- Specific prices and percentages from live market data
- Chart-based reasoning for all recommendations
- Acknowledge current drawdown as part of the strategy`,

  model: google('gemini-2.5-pro'),

  // Enhanced voice capabilities for both speaking and listening
  voice: enhancedVoice,

  // Add comprehensive memory for portfolio management
  memory: portfolioMemory,

  // Advanced input processing for security and news enrichment
  inputProcessors: tradingProcessorConfigs.medium, // Medium security - risk filtering + news enrichment

  tools: {
    getAccountInfo: getAccountInfoTool,
    // getAccountEquity: getAccountEquityTool, // DISABLED - causing 400 errors
    getCurrentPositions: getCurrentPositionsTool,
    getOrderHistory: getOrderHistoryTool,
    analyzeRiskExposure: analyzeRiskExposureTool,
    getMarketData: getMarketDataTool,
    calculatePositionRisk: calculatePositionRiskTool,
    suggestPositionAdjustment: suggestPositionAdjustmentTool,
    speakAdvice: speakAdviceTool,

    // Real-time crypto data tools for market character analysis
    phemexData: phemexDataTool,
    krakenData: krakenDataTool,
    liveAdaMonitor: liveAdaMonitorTool,
    marketCharacterAnalysis: marketCharacterAnalysisTool,

    // TESTING - Re-enabled comprehensiveNews with timeout protection
    comprehensiveNews: comprehensiveNewsTool,
    // breakingNewsMonitor: breakingNewsMonitor, // Still disabled - will add back next
    // startBreakingNewsMonitoring: startBreakingNewsMonitoring, // Still disabled
  },
});