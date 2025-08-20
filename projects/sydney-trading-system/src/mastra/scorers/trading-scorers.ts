/**
 * Custom Trading Scorers for Portfolio Agent
 * 
 * These scorers evaluate the quality and accuracy of trading advice,
 * risk assessments, and market analysis provided by the portfolio agent.
 */

import { createScorer } from '@mastra/core/scores';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Create model configuration for scoring
const scoringModel = openai('gpt-4o-mini') as any;

/**
 * Risk Assessment Accuracy Scorer
 * 
 * Evaluates how accurately the agent assesses portfolio risk,
 * liquidation levels, and fund injection recommendations.
 */
export const riskAssessmentAccuracyScorer = createScorer({
  name: "Risk Assessment Accuracy",
  description: "Evaluates the accuracy of portfolio risk assessments and liquidation warnings",
  judge: {
    model: scoringModel,
    instructions: "You are a professional risk management expert evaluating trading advice accuracy."
  }
})
.analyze({
  description: "Analyze trading advice for risk assessment accuracy",
  createPrompt: ({ run }) => `
You are a professional risk management expert evaluating trading advice.

AGENT RESPONSE TO EVALUATE:
"${run.output.text}"

ANALYSIS TASK:
Analyze this trading advice for risk assessment accuracy. Consider:

1. LIQUIDATION RISK ANALYSIS:
   - Are liquidation warnings appropriate and timely?
   - Does the agent correctly identify proximity to liquidation levels?
   - Are fund injection recommendations reasonable?

2. POSITION SIZING ACCURACY:
   - Are position size recommendations appropriate for account size?
   - Does the agent consider portfolio correlation and diversification?
   - Are leverage recommendations within reasonable risk parameters?

3. RISK MANAGEMENT PRINCIPLES:
   - Does the advice follow sound risk management practices?
   - Are stop-loss and take-profit levels logical?
   - Does the agent consider market volatility appropriately?

4. URGENCY ASSESSMENT:
   - Is the urgency level (LOW/MEDIUM/HIGH/URGENT) appropriate?
   - Does the agent correctly prioritize immediate vs future risks?

Provide your analysis with specific reasoning.
`,
  outputSchema: z.object({
    liquidationAccuracy: z.number().min(0).max(1).describe("Accuracy of liquidation risk assessment (0-1)"),
    positionSizingAccuracy: z.number().min(0).max(1).describe("Accuracy of position sizing advice (0-1)"),
    riskManagementScore: z.number().min(0).max(1).describe("Quality of risk management principles (0-1)"),
    urgencyAppropriate: z.boolean().describe("Whether urgency level is appropriate"),
    overallRiskScore: z.number().min(0).max(1).describe("Overall risk assessment quality (0-1)"),
    criticalIssues: z.array(z.string()).describe("List of critical risk assessment issues"),
    strengths: z.array(z.string()).describe("Strengths in the risk assessment")
  })
})
.generateScore(({ results }) => {
  const analysis = results.analyzeStepResult;
  
  // Weight different components
  const liquidationWeight = 0.3;
  const positionWeight = 0.25;
  const riskMgmtWeight = 0.25;
  const urgencyWeight = 0.2;
  
  const urgencyScore = analysis.urgencyAppropriate ? 1 : 0;
  
  const finalScore = (
    analysis.liquidationAccuracy * liquidationWeight +
    analysis.positionSizingAccuracy * positionWeight +
    analysis.riskManagementScore * riskMgmtWeight +
    urgencyScore * urgencyWeight
  );
  
  // Reduce score if critical issues found
  const criticalPenalty = Math.min(analysis.criticalIssues.length * 0.1, 0.3);
  
  return Math.max(0, finalScore - criticalPenalty);
})
.generateReason(({ score, results }) => {
  const analysis = results.analyzeStepResult;
  
  let reason = `Risk Assessment Score: ${(score * 100).toFixed(1)}%\n\n`;
  
  reason += `📊 COMPONENT SCORES:\n`;
  reason += `• Liquidation Analysis: ${(analysis.liquidationAccuracy * 100).toFixed(1)}%\n`;
  reason += `• Position Sizing: ${(analysis.positionSizingAccuracy * 100).toFixed(1)}%\n`;
  reason += `• Risk Management: ${(analysis.riskManagementScore * 100).toFixed(1)}%\n`;
  reason += `• Urgency Assessment: ${analysis.urgencyAppropriate ? '✅ Appropriate' : '❌ Inappropriate'}\n\n`;
  
  if (analysis.criticalIssues.length > 0) {
    reason += `🚨 CRITICAL ISSUES:\n`;
    analysis.criticalIssues.forEach(issue => reason += `• ${issue}\n`);
    reason += `\n`;
  }
  
  if (analysis.strengths.length > 0) {
    reason += `✅ STRENGTHS:\n`;
    analysis.strengths.forEach(strength => reason += `• ${strength}\n`);
  }
  
  return reason;
});

/**
 * News Relevance Scorer
 * 
 * Evaluates how well the agent incorporates relevant news into trading decisions
 * and filters out irrelevant information.
 */
export const newsRelevanceScorer = createScorer({
  name: "News Relevance Scorer",
  description: "Evaluates how effectively the agent uses news in trading decisions",
  judge: {
    model: scoringModel,
    instructions: "You are analyzing how well a trading agent incorporates news into investment decisions."
  }
})
.analyze({
  description: "Analyze how effectively the agent uses news in trading decisions",
  createPrompt: ({ run }) => `
You are analyzing how well a trading agent incorporates news into investment decisions.

AGENT RESPONSE TO EVALUATE:
"${run.output.text}"

EVALUATION CRITERIA:

1. NEWS INTEGRATION:
   - Does the agent reference relevant breaking news?
   - Are news sources credible and current?
   - Is the news actually relevant to the portfolio positions (ETH, ADA, FET, ATOM)?

2. IMPACT ANALYSIS:
   - Does the agent correctly assess news impact on specific positions?
   - Are geopolitical and regulatory developments properly considered?
   - Is the timeline for news impact realistic?

3. FILTERING QUALITY:
   - Does the agent avoid irrelevant news?
   - Is the focus on high-impact developments appropriate?
   - Are minor news items given appropriate weight?

4. ACTIONABILITY:
   - Does news analysis lead to specific trading recommendations?
   - Are news-driven actions timely and appropriate?
   - Is the risk/reward of news-based decisions sound?

Provide detailed analysis of news integration quality.
`,
  outputSchema: z.object({
    newsIntegrationScore: z.number().min(0).max(1).describe("Quality of news integration (0-1)"),
    impactAnalysisScore: z.number().min(0).max(1).describe("Accuracy of news impact analysis (0-1)"),
    filteringQuality: z.number().min(0).max(1).describe("Quality of news filtering (0-1)"),
    actionabilityScore: z.number().min(0).max(1).describe("How actionable news analysis is (0-1)"),
    relevantNewsCount: z.number().describe("Number of relevant news items referenced"),
    irrelevantNewsCount: z.number().describe("Number of irrelevant news items referenced"),
    missingCriticalNews: z.array(z.string()).describe("Critical news that should have been mentioned"),
    wellIntegratedNews: z.array(z.string()).describe("News items that were well integrated")
  })
})
.generateScore(({ results }) => {
  const analysis = results.analyzeStepResult;
  
  // Base score from components
  const baseScore = (
    analysis.newsIntegrationScore * 0.3 +
    analysis.impactAnalysisScore * 0.3 +
    analysis.filteringQuality * 0.2 +
    analysis.actionabilityScore * 0.2
  );
  
  // Penalty for irrelevant news
  const irrelevantPenalty = Math.min(analysis.irrelevantNewsCount * 0.05, 0.2);
  
  // Penalty for missing critical news
  const missingNewsPenalty = Math.min(analysis.missingCriticalNews.length * 0.1, 0.3);
  
  return Math.max(0, baseScore - irrelevantPenalty - missingNewsPenalty);
})
.generateReason(({ score, results }) => {
  const analysis = results.analyzeStepResult;
  
  let reason = `News Relevance Score: ${(score * 100).toFixed(1)}%\n\n`;
  
  reason += `📈 COMPONENT ANALYSIS:\n`;
  reason += `• News Integration: ${(analysis.newsIntegrationScore * 100).toFixed(1)}%\n`;
  reason += `• Impact Analysis: ${(analysis.impactAnalysisScore * 100).toFixed(1)}%\n`;
  reason += `• Filtering Quality: ${(analysis.filteringQuality * 100).toFixed(1)}%\n`;
  reason += `• Actionability: ${(analysis.actionabilityScore * 100).toFixed(1)}%\n\n`;
  
  reason += `📊 NEWS METRICS:\n`;
  reason += `• Relevant News Referenced: ${analysis.relevantNewsCount}\n`;
  reason += `• Irrelevant News Referenced: ${analysis.irrelevantNewsCount}\n\n`;
  
  if (analysis.wellIntegratedNews.length > 0) {
    reason += `✅ WELL INTEGRATED NEWS:\n`;
    analysis.wellIntegratedNews.forEach(news => reason += `• ${news}\n`);
    reason += `\n`;
  }
  
  if (analysis.missingCriticalNews.length > 0) {
    reason += `❌ MISSING CRITICAL NEWS:\n`;
    analysis.missingCriticalNews.forEach(news => reason += `• ${news}\n`);
  }
  
  return reason;
});

/**
 * Trading Advice Quality Scorer
 * 
 * Evaluates the overall quality of trading advice including specificity,
 * actionability, and adherence to the user's hedging strategy.
 */
export const tradingAdviceQualityScorer = createScorer({
  name: "Trading Advice Quality",
  description: "Evaluates overall quality and actionability of trading advice",
  judge: {
    model: scoringModel,
    instructions: "Evaluate the quality of trading advice for a sophisticated crypto trader using a hedging strategy."
  }
})
.analyze({
  description: "Evaluate overall quality and actionability of trading advice",
  createPrompt: ({ run }) => `
Evaluate the quality of this trading advice for a sophisticated crypto trader using a hedging strategy.

TRADING ADVICE TO EVALUATE:
"${run.output.text}"

CONTEXT: The user has intentionally negative positions in ETH, ADA, FET, and ATOM as part of a hedging strategy, waiting for market character changes.

EVALUATION CRITERIA:

1. SPECIFICITY:
   - Are specific entry/exit levels provided?
   - Are dollar amounts and position sizes mentioned?
   - Is the timing for actions clear?

2. ACTIONABILITY:
   - Can the trader immediately act on this advice?
   - Are the recommendations clear and unambiguous?
   - Is the priority order of actions specified?

3. STRATEGY ALIGNMENT:
   - Does the advice respect the hedging strategy context?
   - Are recommendations appropriate for negative positions?
   - Is the advice suitable for the user's sophisticated approach?

4. COMPLETENESS:
   - Does the advice cover all relevant aspects (entry, exit, risk)?
   - Are fund injection needs addressed when relevant?
   - Is voice announcement priority appropriate?

Analyze each aspect thoroughly.
`,
  outputSchema: z.object({
    specificityScore: z.number().min(0).max(1).describe("How specific the advice is (0-1)"),
    actionabilityScore: z.number().min(0).max(1).describe("How actionable the advice is (0-1)"),
    strategyAlignment: z.number().min(0).max(1).describe("Alignment with hedging strategy (0-1)"),
    completenessScore: z.number().min(0).max(1).describe("Completeness of the advice (0-1)"),
    hasSpecificLevels: z.boolean().describe("Whether specific price levels are provided"),
    hasDollarAmounts: z.boolean().describe("Whether specific dollar amounts are mentioned"),
    hasTimingGuidance: z.boolean().describe("Whether timing guidance is clear"),
    respectsHedgingStrategy: z.boolean().describe("Whether advice respects hedging context"),
    qualityIssues: z.array(z.string()).describe("Issues with advice quality"),
    strengths: z.array(z.string()).describe("Strengths of the advice")
  })
})
.generateScore(({ results }) => {
  const analysis = results.analyzeStepResult;
  
  // Base score from main components
  const baseScore = (
    analysis.specificityScore * 0.25 +
    analysis.actionabilityScore * 0.25 +
    analysis.strategyAlignment * 0.25 +
    analysis.completenessScore * 0.25
  );
  
  // Bonus for key elements
  let bonuses = 0;
  if (analysis.hasSpecificLevels) bonuses += 0.05;
  if (analysis.hasDollarAmounts) bonuses += 0.05;
  if (analysis.hasTimingGuidance) bonuses += 0.05;
  if (analysis.respectsHedgingStrategy) bonuses += 0.1;
  
  // Penalty for quality issues
  const qualityPenalty = Math.min(analysis.qualityIssues.length * 0.05, 0.2);
  
  return Math.min(1, Math.max(0, baseScore + bonuses - qualityPenalty));
})
.generateReason(({ score, results }) => {
  const analysis = results.analyzeStepResult;
  
  let reason = `Trading Advice Quality Score: ${(score * 100).toFixed(1)}%\n\n`;
  
  reason += `📋 QUALITY COMPONENTS:\n`;
  reason += `• Specificity: ${(analysis.specificityScore * 100).toFixed(1)}%\n`;
  reason += `• Actionability: ${(analysis.actionabilityScore * 100).toFixed(1)}%\n`;
  reason += `• Strategy Alignment: ${(analysis.strategyAlignment * 100).toFixed(1)}%\n`;
  reason += `• Completeness: ${(analysis.completenessScore * 100).toFixed(1)}%\n\n`;
  
  reason += `✅ KEY ELEMENTS:\n`;
  reason += `• Specific Levels: ${analysis.hasSpecificLevels ? '✅' : '❌'}\n`;
  reason += `• Dollar Amounts: ${analysis.hasDollarAmounts ? '✅' : '❌'}\n`;
  reason += `• Timing Guidance: ${analysis.hasTimingGuidance ? '✅' : '❌'}\n`;
  reason += `• Hedging Strategy Respect: ${analysis.respectsHedgingStrategy ? '✅' : '❌'}\n\n`;
  
  if (analysis.strengths.length > 0) {
    reason += `💪 STRENGTHS:\n`;
    analysis.strengths.forEach(strength => reason += `• ${strength}\n`);
    reason += `\n`;
  }
  
  if (analysis.qualityIssues.length > 0) {
    reason += `⚠️ AREAS FOR IMPROVEMENT:\n`;
    analysis.qualityIssues.forEach(issue => reason += `• ${issue}\n`);
  }
  
  return reason;
});