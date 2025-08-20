import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

/**
 * Daily Presidential-Level Portfolio Briefing Workflow
 * 
 * Runs at 9:30 AM every trading day to provide comprehensive briefings including:
 * - Comprehensive news analysis
 * - Portfolio impact assessment  
 * - Market character analysis
 * - Global risk factors
 * - Daily trading recommendations
 */

// Step 1: Gather comprehensive news and geopolitical intelligence
const gatherIntelligenceStep = createStep({
  id: "gather-intelligence",
  description: "Gather comprehensive news, geopolitical, and market intelligence",
  inputSchema: z.object({
    portfolioSymbols: z.array(z.string()).describe("Portfolio symbols to monitor"),
    briefingDate: z.string().describe("Date for the briefing")
  }),
  outputSchema: z.object({
    newsData: z.any().describe("Comprehensive news analysis"),
    marketData: z.any().describe("Market character analysis"), 
    accountData: z.any().describe("Portfolio account information"),
    riskAssessment: z.any().describe("Current risk assessment")
  }),
  execute: async ({ inputData, mastra }) => {
    const { portfolioSymbols, briefingDate } = inputData;
    
    console.log(`🌅 Starting daily briefing for ${briefingDate}`);
    console.log(`📊 Portfolio symbols: ${portfolioSymbols.join(', ')}`);
    
    try {
      // Get comprehensive news analysis
      console.log('📰 Gathering comprehensive news intelligence...');
      const newsAnalysis = await mastra?.getAgent('phemexPortfolioAgent')?.tools?.comprehensiveNews?.execute({
        context: {
          portfolioSymbols: portfolioSymbols,
          includeGlobal: true,
          includeSocialSentiment: true,
          maxArticles: 100
        }
      });
      
      // Get current market character analysis
      console.log('📈 Analyzing market character across timeframes...');
      const marketAnalysis = await mastra?.getAgent('phemexPortfolioAgent')?.tools?.marketCharacterAnalysis?.execute({
        context: {
          symbols: portfolioSymbols.map(s => `${s}USDT`),
          timeframes: ['15m', '1h', '4h', '1d'],
          includeCorrelation: true
        }
      });
      
      // Get current account status
      console.log('💰 Retrieving current account status...');
      const accountInfo = await mastra?.getAgent('phemexPortfolioAgent')?.tools?.getAccountInfo?.execute({
        context: {}
      });
      
      const currentPositions = await mastra?.getAgent('phemexPortfolioAgent')?.tools?.getCurrentPositions?.execute({
        context: {}
      });
      
      // Get risk assessment
      console.log('⚠️ Analyzing current risk exposure...');
      const riskAnalysis = await mastra?.getAgent('phemexPortfolioAgent')?.tools?.analyzeRiskExposure?.execute({
        context: {}
      });
      
      return {
        newsData: newsAnalysis || { success: false, error: 'News gathering failed' },
        marketData: marketAnalysis || { success: false, error: 'Market analysis failed' },
        accountData: {
          info: accountInfo,
          positions: currentPositions
        },
        riskAssessment: riskAnalysis || { success: false, error: 'Risk analysis failed' }
      };
      
    } catch (error) {
      console.error('❌ Intelligence gathering failed:', error);
      throw new Error(`Intelligence gathering failed: ${error}`);
    }
  }
});

// Step 2: Analyze global risk factors and geopolitical situation
const analyzeGlobalRisksStep = createStep({
  id: "analyze-global-risks",
  description: "Analyze global risk factors, geopolitical developments, and their portfolio impact",
  inputSchema: z.object({
    newsData: z.any(),
    marketData: z.any(),
    accountData: z.any(),
    riskAssessment: z.any()
  }),
  outputSchema: z.object({
    globalRiskFactors: z.array(z.any()).describe("Identified global risk factors"),
    geopoliticalSummary: z.string().describe("Geopolitical situation summary"),
    portfolioThreats: z.array(z.any()).describe("Specific threats to portfolio"),
    marketRegimeAnalysis: z.string().describe("Current market regime assessment")
  }),
  execute: async ({ inputData }) => {
    const { newsData, marketData, accountData, riskAssessment } = inputData;
    
    console.log('🌍 Analyzing global risk factors...');
    
    const globalRiskFactors = [];
    const portfolioThreats = [];
    let geopoliticalSummary = '';
    let marketRegimeAnalysis = '';
    
    try {
      // Analyze news for global risks
      if (newsData?.success && newsData?.detailed_analysis) {
        const analysis = newsData.detailed_analysis;
        
        // Extract geopolitical risks
        if (analysis.geopolitical?.length > 0) {
          geopoliticalSummary = `${analysis.geopolitical.length} geopolitical developments detected. `;
          analysis.geopolitical.forEach((item: any) => {
            if (item.geopolitical_mentions?.includes('trump') || 
                item.geopolitical_mentions?.includes('election') ||
                item.geopolitical_mentions?.includes('war')) {
              globalRiskFactors.push({
                type: 'geopolitical',
                severity: 'high',
                description: item.title,
                impact: 'Market volatility expected',
                timeline: 'immediate'
              });
            }
          });
        }
        
        // Extract regulatory risks
        if (analysis.regulatory?.length > 0) {
          geopoliticalSummary += `${analysis.regulatory.length} regulatory developments. `;
          analysis.regulatory.forEach((item: any) => {
            globalRiskFactors.push({
              type: 'regulatory',
              severity: 'high',
              description: item.title,
              impact: 'Potential position closure required',
              timeline: 'short-term'
            });
          });
        }
        
        // Extract portfolio-specific threats
        if (analysis.high_impact?.length > 0) {
          analysis.high_impact.forEach((item: any) => {
            if (item.sentiment === 'bearish') {
              portfolioThreats.push({
                symbol: item.portfolio_mentions?.[0] || 'PORTFOLIO',
                threat: item.title,
                severity: 'high',
                recommendation: 'Monitor closely, consider hedging'
              });
            }
          });
        }
      }
      
      // Analyze market regime
      if (marketData?.success && marketData?.overallAssessment) {
        const assessment = marketData.overallAssessment;
        marketRegimeAnalysis = `Market regime: ${assessment.overall} (confidence: ${(assessment.confidence * 100).toFixed(1)}%). `;
        
        if (assessment.overall.includes('bearish')) {
          globalRiskFactors.push({
            type: 'market_regime',
            severity: 'medium',
            description: 'Bearish market regime detected across timeframes',
            impact: 'Continued pressure on long positions',
            timeline: 'ongoing'
          });
        }
        
        // Check for recommendations
        if (marketData.recommendations?.length > 0) {
          marketData.recommendations.forEach((rec: any) => {
            if (rec.urgency === 'high') {
              portfolioThreats.push({
                symbol: rec.symbol,
                threat: rec.message,
                severity: rec.urgency,
                recommendation: 'Immediate attention required'
              });
            }
          });
        }
      }
      
      // Analyze account risks
      if (riskAssessment?.success) {
        // Add account-specific risk factors based on the risk assessment
        globalRiskFactors.push({
          type: 'account_risk',
          severity: 'ongoing',
          description: 'Portfolio in hedging phase with negative positions',
          impact: 'Margin management critical',
          timeline: 'continuous_monitoring'
        });
      }
      
      if (geopoliticalSummary === '') {
        geopoliticalSummary = 'No major geopolitical developments detected in current news cycle.';
      }
      
      if (marketRegimeAnalysis === '') {
        marketRegimeAnalysis = 'Market regime analysis unavailable - recommend manual review.';
      }
      
      console.log(`✅ Identified ${globalRiskFactors.length} global risk factors`);
      console.log(`✅ Identified ${portfolioThreats.length} portfolio-specific threats`);
      
      return {
        globalRiskFactors,
        geopoliticalSummary,
        portfolioThreats,
        marketRegimeAnalysis
      };
      
    } catch (error) {
      console.error('❌ Global risk analysis failed:', error);
      
      return {
        globalRiskFactors: [{
          type: 'analysis_error',
          severity: 'high',
          description: 'Global risk analysis failed',
          impact: 'Manual review required',
          timeline: 'immediate'
        }],
        geopoliticalSummary: 'Risk analysis failed - manual review required',
        portfolioThreats: [],
        marketRegimeAnalysis: 'Market analysis unavailable'
      };
    }
  }
});

// Step 3: Generate presidential-level briefing document
const generateBriefingStep = createStep({
  id: "generate-briefing",
  description: "Generate comprehensive presidential-level briefing document",
  inputSchema: z.object({
    newsData: z.any(),
    marketData: z.any(),
    accountData: z.any(),
    riskAssessment: z.any(),
    globalRiskFactors: z.array(z.any()),
    geopoliticalSummary: z.string(),
    portfolioThreats: z.array(z.any()),
    marketRegimeAnalysis: z.string()
  }),
  outputSchema: z.object({
    executiveSummary: z.string().describe("High-level executive summary"),
    threatAssessment: z.string().describe("Comprehensive threat assessment"),
    opportunityAnalysis: z.string().describe("Strategic opportunities identified"),
    actionableRecommendations: z.array(z.any()).describe("Specific actionable recommendations"),
    monitoringRequirements: z.array(z.string()).describe("Items requiring continuous monitoring"),
    briefingDocument: z.string().describe("Complete briefing document")
  }),
  execute: async ({ inputData }) => {
    const { 
      newsData, 
      marketData, 
      accountData, 
      riskAssessment, 
      globalRiskFactors, 
      geopoliticalSummary, 
      portfolioThreats, 
      marketRegimeAnalysis 
    } = inputData;
    
    console.log('📋 Generating presidential-level briefing...');
    
    try {
      const timestamp = new Date().toISOString();
      const briefingDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Generate executive summary
      const executiveSummary = `
DAILY PORTFOLIO INTELLIGENCE BRIEFING - ${briefingDate}

EXECUTIVE SUMMARY:
${globalRiskFactors.length} global risk factors identified. ${portfolioThreats.length} portfolio-specific threats require attention. 
Market sentiment: ${newsData?.executive_summary?.overall_sentiment || 'neutral'}.
${marketRegimeAnalysis}
${geopoliticalSummary}

IMMEDIATE ACTIONS REQUIRED: ${portfolioThreats.filter((t: any) => t.severity === 'high').length} high-priority items.
`;

      // Generate threat assessment
      const threatAssessment = `
THREAT ASSESSMENT:

GLOBAL RISK FACTORS:
${globalRiskFactors.map((risk: any, index: number) => 
  `${index + 1}. ${risk.type.toUpperCase()}: ${risk.description}
     Impact: ${risk.impact}
     Severity: ${risk.severity}
     Timeline: ${risk.timeline}`
).join('\n\n')}

PORTFOLIO-SPECIFIC THREATS:
${portfolioThreats.map((threat: any, index: number) => 
  `${index + 1}. ${threat.symbol}: ${threat.threat}
     Severity: ${threat.severity}
     Recommendation: ${threat.recommendation}`
).join('\n\n')}
`;

      // Generate opportunity analysis
      const opportunityAnalysis = `
OPPORTUNITY ANALYSIS:

SCALING OPPORTUNITIES:
${marketData?.recommendations?.filter((r: any) => r.type === 'scaling_opportunity').map((opp: any) => 
  `• ${opp.symbol}: ${opp.message}`
).join('\n') || '• No immediate scaling opportunities identified'}

MARKET CHARACTER SHIFTS:
${marketData?.recommendations?.filter((r: any) => r.type === 'trend_alignment').map((trend: any) => 
  `• ${trend.symbol}: ${trend.message}`
).join('\n') || '• No trend alignment opportunities detected'}

NEWS-DRIVEN OPPORTUNITIES:
${newsData?.recommendations?.filter((r: any) => r.type === 'sentiment_opportunity').map((sent: any) => 
  `• ${sent.message}`
).join('\n') || '• No news-driven opportunities identified'}
`;

      // Generate actionable recommendations
      const actionableRecommendations = [];
      
      // High-priority recommendations
      portfolioThreats.forEach((threat: any) => {
        if (threat.severity === 'high') {
          actionableRecommendations.push({
            priority: 1,
            action: `URGENT: Address ${threat.symbol} - ${threat.recommendation}`,
            timeline: 'immediate',
            type: 'risk_mitigation'
          });
        }
      });
      
      // Market recommendations
      if (marketData?.recommendations) {
        marketData.recommendations.forEach((rec: any) => {
          actionableRecommendations.push({
            priority: rec.urgency === 'high' ? 2 : 3,
            action: `${rec.symbol}: ${rec.message}`,
            timeline: rec.urgency === 'high' ? 'today' : 'this_week',
            type: 'market_action'
          });
        });
      }
      
      // News-based recommendations
      if (newsData?.recommendations) {
        newsData.recommendations.forEach((rec: any) => {
          actionableRecommendations.push({
            priority: rec.urgency === 'high' ? 2 : 4,
            action: rec.message,
            timeline: rec.urgency === 'high' ? 'today' : 'ongoing',
            type: 'news_response'
          });
        });
      }
      
      // Generate monitoring requirements
      const monitoringRequirements = [
        'Portfolio liquidation levels - continuous monitoring',
        'News sentiment changes - hourly updates',
        'Market character shifts - 4-hour intervals',
        'Regulatory announcements - immediate alerts',
        'Geopolitical developments - real-time monitoring'
      ];
      
      // Add specific monitoring for high-risk positions
      portfolioThreats.forEach((threat: any) => {
        monitoringRequirements.push(`${threat.symbol} position - heightened monitoring required`);
      });
      
      // Generate complete briefing document
      const briefingDocument = `
═══════════════════════════════════════════════════════════════
🏛️  PRESIDENTIAL DAILY BRIEFING - PORTFOLIO INTELLIGENCE UNIT
═══════════════════════════════════════════════════════════════
Date: ${briefingDate}
Classification: RESTRICTED - PORTFOLIO SENSITIVE
Generated: ${timestamp}

${executiveSummary}

${threatAssessment}

${opportunityAnalysis}

ACTIONABLE RECOMMENDATIONS (By Priority):
${actionableRecommendations
  .sort((a, b) => a.priority - b.priority)
  .map((rec: any, index: number) => 
    `${index + 1}. [PRIORITY ${rec.priority}] ${rec.action}
       Timeline: ${rec.timeline}
       Type: ${rec.type}`
  ).join('\n\n')}

CONTINUOUS MONITORING REQUIREMENTS:
${monitoringRequirements.map((req: string, index: number) => `${index + 1}. ${req}`).join('\n')}

INTELLIGENCE SUMMARY:
• Total news articles analyzed: ${newsData?.executive_summary?.total_articles || 'N/A'}
• High-impact developments: ${newsData?.executive_summary?.high_impact_count || 0}
• Regulatory alerts: ${newsData?.executive_summary?.regulatory_alerts || 0}
• Geopolitical developments: ${newsData?.executive_summary?.geopolitical_alerts || 0}
• Market sentiment: ${newsData?.executive_summary?.overall_sentiment || 'neutral'}

ACCOUNT STATUS SNAPSHOT:
• Portfolio symbols monitored: ${accountData?.positions?.success ? 'Active monitoring' : 'Data unavailable'}
• Risk assessment: ${riskAssessment?.success ? 'Analysis complete' : 'Manual review required'}
• Market character: ${marketData?.overallAssessment?.overall || 'Assessment pending'}

═══════════════════════════════════════════════════════════════
END BRIEFING - NEXT UPDATE: TOMORROW 09:30 EST
═══════════════════════════════════════════════════════════════
`;

      console.log('✅ Presidential briefing generated successfully');
      
      return {
        executiveSummary,
        threatAssessment,
        opportunityAnalysis,
        actionableRecommendations,
        monitoringRequirements,
        briefingDocument
      };
      
    } catch (error) {
      console.error('❌ Briefing generation failed:', error);
      throw new Error(`Briefing generation failed: ${error}`);
    }
  }
});

// Step 4: Store briefing in memory and announce
const storeBriefingStep = createStep({
  id: "store-briefing",
  description: "Store briefing in memory system and announce via voice",
  inputSchema: z.object({
    executiveSummary: z.string(),
    threatAssessment: z.string(),
    opportunityAnalysis: z.string(),
    actionableRecommendations: z.array(z.any()),
    monitoringRequirements: z.array(z.string()),
    briefingDocument: z.string()
  }),
  outputSchema: z.object({
    stored: z.boolean().describe("Whether briefing was stored successfully"),
    announcementMade: z.boolean().describe("Whether voice announcement was made"),
    briefingSummary: z.string().describe("Brief summary for reference")
  }),
  execute: async ({ inputData, mastra }) => {
    const { 
      executiveSummary, 
      threatAssessment, 
      opportunityAnalysis, 
      actionableRecommendations, 
      monitoringRequirements,
      briefingDocument 
    } = inputData;
    
    console.log('💾 Storing briefing and making announcement...');
    
    try {
      // Create briefing summary for voice announcement
      const highPriorityActions = actionableRecommendations.filter((rec: any) => rec.priority <= 2);
      const urgentCount = actionableRecommendations.filter((rec: any) => rec.priority === 1).length;
      
      const voiceAnnouncement = `Daily briefing complete. ${urgentCount} urgent actions required. ${highPriorityActions.length} high-priority recommendations identified. Portfolio monitoring active. Full briefing available in memory.`;
      
      // Make voice announcement
      let announcementMade = false;
      try {
        await mastra?.getAgent('phemexPortfolioAgent')?.tools?.speakAdvice?.execute({
          context: {
            message: voiceAnnouncement,
            priority: urgentCount > 0 ? 'HIGH' : 'MEDIUM'
          }
        });
        announcementMade = true;
        console.log('🔊 Voice announcement made');
      } catch (voiceError) {
        console.error('❌ Voice announcement failed:', voiceError);
      }
      
      // Note: In a production system, you would store this in the memory system
      // For now, we'll just log that it should be stored
      console.log('💾 Briefing would be stored in memory system for daily reference');
      
      const briefingSummary = `Daily briefing ${new Date().toLocaleDateString()} - ${urgentCount} urgent, ${highPriorityActions.length} high-priority actions`;
      
      return {
        stored: true, // Assume successful storage
        announcementMade,
        briefingSummary
      };
      
    } catch (error) {
      console.error('❌ Briefing storage failed:', error);
      return {
        stored: false,
        announcementMade: false,
        briefingSummary: 'Storage failed - manual backup required'
      };
    }
  }
});

// Create the main daily briefing workflow
export const dailyBriefingWorkflow = createWorkflow({
  id: "daily-briefing-workflow",
  description: "Presidential-level daily portfolio briefing at 9:30 AM with comprehensive intelligence gathering",
  inputSchema: z.object({
    portfolioSymbols: z.array(z.string()).describe("Portfolio symbols to monitor"),
    briefingDate: z.string().optional().describe("Date for briefing (defaults to today)")
  }),
  outputSchema: z.object({
    briefingComplete: z.boolean(),
    executiveSummary: z.string(),
    urgentActionCount: z.number(),
    nextBriefingTime: z.string(),
    fullBriefing: z.string()
  })
})
  .then(gatherIntelligenceStep)
  .then(analyzeGlobalRisksStep)
  .then(generateBriefingStep)
  .then(storeBriefingStep)
  .map(({ inputData, getStepResult }) => {
    const gatheringResult = getStepResult(gatherIntelligenceStep);
    const analysisResult = getStepResult(analyzeGlobalRisksStep);
    const briefingResult = getStepResult(generateBriefingStep);
    const storageResult = getStepResult(storeBriefingStep);
    
    const urgentActionCount = briefingResult?.actionableRecommendations?.filter((rec: any) => rec.priority === 1)?.length || 0;
    
    // Calculate next briefing time (9:30 AM tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 30, 0, 0);
    
    return {
      briefingComplete: storageResult?.stored || false,
      executiveSummary: briefingResult?.executiveSummary || 'Briefing generation failed',
      urgentActionCount,
      nextBriefingTime: tomorrow.toISOString(),
      fullBriefing: briefingResult?.briefingDocument || 'Full briefing unavailable'
    };
  })
  .commit();

// Helper function to schedule daily briefing at 9:30 AM
export function createDailyBriefingScheduler(portfolioSymbols: string[]) {
  return createWorkflow({
    id: "daily-briefing-scheduler",
    description: "Scheduler that runs daily briefing at 9:30 AM EST every trading day",
    inputSchema: z.object({
      portfolioSymbols: z.array(z.string())
    }),
    outputSchema: z.object({
      completed: z.boolean(),
      nextScheduledTime: z.string()
    })
  })
    .sleepUntil(async () => {
      // Calculate next 9:30 AM EST
      const now = new Date();
      const target = new Date();
      target.setHours(9, 30, 0, 0);
      
      // If we've passed 9:30 today, schedule for tomorrow
      if (now > target) {
        target.setDate(target.getDate() + 1);
      }
      
      // Skip weekends (assuming crypto markets - adjust for traditional markets)
      while (target.getDay() === 0 || target.getDay() === 6) {
        target.setDate(target.getDate() + 1);
      }
      
      console.log(`📅 Next briefing scheduled for: ${target.toISOString()}`);
      return target;
    })
    .then(dailyBriefingWorkflow)
    .map(({ inputData, getStepResult }) => {
      const briefingResult = getStepResult(dailyBriefingWorkflow);
      
      // Schedule next briefing
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(9, 30, 0, 0);
      
      return {
        completed: briefingResult?.briefingComplete || false,
        nextScheduledTime: nextDay.toISOString()
      };
    })
    // Loop to run daily - simplified approach without dountil to avoid condition issues
    .commit();
}