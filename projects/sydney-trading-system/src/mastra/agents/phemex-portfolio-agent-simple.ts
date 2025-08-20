import { Agent } from '@mastra/core';
import { google } from '@ai-sdk/google';
import { GoogleVoice } from '@mastra/voice-google';
import {
  getAccountInfoTool,
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
import { phemexDataTool } from '../tools/phemex-data-tool';
import { krakenDataTool } from '../tools/kraken-data-tool';
import { marketCharacterAnalysisTool } from '../tools/market-character-analysis-tool';
import { comprehensiveNewsTool } from '../tools/comprehensive-news-tool';

const voice = new GoogleVoice();

export const phemexPortfolioAgentSimple = new Agent({
  name: 'PhemexPortfolioAgentSimple',
  instructions: `You are Sydney's crypto portfolio assistant.

KEY RULES:
- You have READ-ONLY access to Sydney's Phemex account
- You CANNOT execute trades, only provide analysis
- The account has intentionally negative positions as part of a hedging strategy

CAPABILITIES:
- Get current positions and P&L
- Analyze risk and liquidation levels
- Provide market analysis for ADA, ETH, FET, ATOM
- Presidential briefings with comprehensive news

For Presidential Briefings:
1. Use comprehensiveNews tool to gather news for ETH, ADA, FET, ATOM
2. Use getCurrentPositions to show current portfolio status
3. Use marketCharacterAnalysis for technical analysis
4. Provide SHORT position recommendations and fund injection advice

Keep responses concise and actionable.`,

  model: google('gemini-2.5-pro'),
  voice: voice,

  tools: {
    getAccountInfo: getAccountInfoTool,
    getCurrentPositions: getCurrentPositionsTool,
    getOrderHistory: getOrderHistoryTool,
    analyzeRiskExposure: analyzeRiskExposureTool,
    getMarketData: getMarketDataTool,
    calculatePositionRisk: calculatePositionRiskTool,
    suggestPositionAdjustment: suggestPositionAdjustmentTool,
    phemexData: phemexDataTool,
    krakenData: krakenDataTool,
    marketCharacterAnalysis: marketCharacterAnalysisTool,
    comprehensiveNews: comprehensiveNewsTool,
    speakAdvice: speakAdviceTool,
  },
});