/**
 * Trading Intelligence Network (vNext)
 * 
 * Smart orchestration layer that lets AI decide how to best coordinate
 * multiple agents, workflows, and tools for complex trading analysis.
 * 
 * This network automatically determines execution plans for tasks like:
 * - "Analyze market conditions and recommend actions"
 * - "Get portfolio status, check news, and assess risks"
 * - "Run daily briefing and provide trading recommendations"
 */

import { NewAgentNetwork } from '@mastra/core/network/vNext';
import { google } from '@ai-sdk/google';

// Import agents
import { phemexPortfolioAgent } from '../agents/phemex-portfolio-agent';


/**
 * Trading Intelligence Network
 * 
 * Coordinates multiple agents and workflows to provide comprehensive
 * trading analysis and recommendations through intelligent orchestration.
 */
export const tradingIntelligenceNetwork = new NewAgentNetwork({
  id: "trading-intelligence-network",
  name: "Trading Intelligence Network",
  
  instructions: `You are an intelligent orchestration system for sophisticated cryptocurrency trading analysis.

NETWORK CAPABILITIES:
You coordinate multiple specialized agents, workflows, and tools to provide comprehensive trading intelligence:

1. **PORTFOLIO AGENT**: Deep portfolio analysis, risk assessment, position management
2. **DAILY BRIEFING WORKFLOW**: Presidential-level intelligence gathering with news analysis
3. **MARKET ANALYSIS TOOLS**: Real-time market character analysis across multiple timeframes
4. **NEWS INTELLIGENCE**: Breaking news monitoring and comprehensive news analysis
5. **MEMORY SYSTEM**: Persistent context and conversation history

ORCHESTRATION PRINCIPLES:

**MODE 1: Single Task Routing**
For simple requests, route to the most appropriate primitive:
- "What's my portfolio status?" → Portfolio Agent
- "Get breaking news" → Breaking News Monitor
- "Analyze market character" → Market Character Analysis Tool

**MODE 2: Complex Multi-Step Orchestration**
For complex requests, create intelligent execution plans:
- "Full market analysis with recommendations" → Portfolio Agent + Market Analysis + News Analysis
- "Daily briefing with action plan" → Daily Briefing Workflow + Portfolio Analysis + Risk Assessment
- "Emergency risk check" → Portfolio Agent + Breaking News + Market Character Analysis

**INTELLIGENT ROUTING RULES:**

1. **PORTFOLIO-RELATED QUERIES**: Always include Portfolio Agent for account-specific analysis
2. **NEWS-SENSITIVE REQUESTS**: Include news analysis when market events might impact decisions
3. **TIME-SENSITIVE ALERTS**: Prioritize breaking news and real-time market data
4. **COMPREHENSIVE ANALYSIS**: Combine multiple primitives for thorough evaluation
5. **RISK ASSESSMENTS**: Always include portfolio context for risk-related queries

**EXECUTION STRATEGY:**
- Start with most critical/time-sensitive analysis
- Build context progressively through the execution chain
- Provide synthesis and actionable recommendations
- Maintain awareness of user's hedging strategy context
- Prioritize specific, actionable advice over general market commentary

**USER CONTEXT:**
- Sophisticated trader using intentional hedging strategy
- Positions: ETH, ADA, FET, ATOM (currently negative as planned)
- Needs presidential-level intelligence and specific actionable advice
- Requires both strategic and tactical trading guidance

Route intelligently based on request complexity and required analysis depth.`,

  model: google('gemini-2.5-pro'),
  
  // NewAgentNetwork expects an object of agents
  agents: {
    phemexPortfolioAgent,
  },
});

/**
 * Convenience functions for common trading intelligence tasks
 */

/**
 * Comprehensive Market Analysis
 * Orchestrates portfolio, market, and news analysis for complete market view
 */
export async function comprehensiveMarketAnalysis(query: string, context?: any) {
  return await tradingIntelligenceNetwork.generate(
    `Perform comprehensive market analysis: ${query}. Include portfolio status, market character analysis across timeframes, recent news impact, and provide specific actionable recommendations with entry/exit levels and risk management guidance.`
  );
}

/**
 * Emergency Risk Assessment
 * Quick risk analysis with immediate actions for urgent situations
 */
export async function emergencyRiskAssessment(query: string, context?: any) {
  return await tradingIntelligenceNetwork.generate(
    `URGENT RISK ASSESSMENT: ${query}. Immediately analyze portfolio liquidation risks, check for breaking news affecting positions, assess market character changes, and provide emergency actions with specific dollar amounts and timing.`
  );
}

/**
 * Daily Intelligence Briefing
 * Presidential-level briefing with comprehensive intelligence and action plan
 */
export async function dailyIntelligenceBriefing(context?: any) {
  return await tradingIntelligenceNetwork.generate(
    `Execute full daily presidential intelligence briefing. Run complete daily briefing workflow, analyze current portfolio status, assess all positions for scaling opportunities, review overnight news and market developments, and provide detailed action plan with priorities and specific recommendations.`
  );
}

/**
 * Smart Query Router
 * Routes natural language queries to appropriate analysis depth
 */
export async function smartQuery(query: string, context?: any) {
  // Use generate() for all queries (AgentNetwork handles routing internally)
  return await tradingIntelligenceNetwork.generate(query);
}

/**
 * Determine if a query is simple enough for single-step routing
 */
function isSimpleQuery(query: string): boolean {
  const simplePatterns = [
    /^(what|how|when|where|why)\s+(is|are|was|were)/i,
    /^(get|show|display)\s+/i,
    /^(check|verify)\s+/i,
    /portfolio status/i,
    /current positions/i,
    /account/i,
  ];
  
  const complexPatterns = [
    /analysis|analyze/i,
    /recommend|suggestion/i,
    /action plan/i,
    /comprehensive/i,
    /briefing/i,
    /emergency|urgent/i,
    /and/i, // Multiple requests
  ];
  
  const hasSimplePattern = simplePatterns.some(pattern => pattern.test(query));
  const hasComplexPattern = complexPatterns.some(pattern => pattern.test(query));
  
  return hasSimplePattern && !hasComplexPattern;
}