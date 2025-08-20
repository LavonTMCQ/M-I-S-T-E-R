import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Research Query Step with Human Input
const getUserQueryStep = createStep({
  id: "get-user-query",
  description: "Get research query from user with depth and breadth parameters",
  inputSchema: z.object({
    suggestions: z.array(z.string()).optional(),
  }),
  resumeSchema: z.object({
    query: z.string(),
    depth: z.number().min(1).max(3).default(2),
    breadth: z.number().min(1).max(5).default(2),
  }),
  outputSchema: z.object({
    query: z.string(),
    depth: z.number(),
    breadth: z.number(),
    approved: z.boolean().default(false),
  }),
  execute: async ({ resumeData, suspend }) => {
    if (resumeData) {
      return {
        query: resumeData.query || "",
        depth: resumeData.depth || 2,
        breadth: resumeData.breadth || 2,
        approved: false,
      };
    }

    await suspend({
      message: {
        query: "What would you like to research?",
        depth: "Please provide the depth of the research [1-3] (default: 2): ",
        breadth: "Please provide the breadth of the research [1-5] (default: 2): ",
      },
    });

    // Unreachable but needed for TypeScript
    return {
      query: "",
      depth: 2,
      breadth: 2,
      approved: false,
    };
  },
});

// Web Search Step using MRS/MISTER agents for financial research
const webSearchStep = createStep({
  id: "web-search",
  description: "Perform web search using financial agents",
  inputSchema: z.object({
    query: z.string(),
    depth: z.number(),
    breadth: z.number(),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      title: z.string(),
      content: z.string(),
      source: z.string(),
    })),
    query: z.string(),
    depth: z.number(),
    breadth: z.number(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { query, depth, breadth } = inputData;
    const results = [];

    try {
      // Check if query is financial/stock related
      const isFinancial = /stock|finance|market|trading|investment|crypto|bitcoin|portfolio/i.test(query);
      
      if (isFinancial) {
        // Use MRS agent for traditional finance
        if (/stock|market|trading|investment|portfolio/i.test(query)) {
          const mrsAgent = mastra?.getAgent?.("soneAgent");
          if (mrsAgent) {
            const response = await fetch('https://misterexc6.ngrok.io/api/agents/MRSAgent/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: `Research: ${query}` }),
            });
            
            if (response.ok) {
              const data = await response.json();
              results.push({
                title: `Financial Analysis: ${query}`,
                content: data.response || data.text || "No response received",
                source: "MRS Financial Agent",
              });
            }
          }
        }

        // Use MISTER agent for crypto
        if (/crypto|bitcoin|ethereum|blockchain|defi/i.test(query)) {
          const response = await fetch('https://misterexc6.ngrok.io/api/agents/MISTERAgent/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `Research: ${query}` }),
          });
          
          if (response.ok) {
            const data = await response.json();
            results.push({
              title: `Crypto Analysis: ${query}`,
              content: data.response || data.text || "No response received",
              source: "MISTER Crypto Agent",
            });
          }
        }
      }

      // Add general web search simulation for non-financial queries
      if (results.length === 0) {
        for (let i = 0; i < breadth; i++) {
          results.push({
            title: `Research Result ${i + 1}: ${query}`,
            content: `Detailed research content for "${query}" - depth level ${depth}, result ${i + 1}. This would contain comprehensive information gathered from web sources.`,
            source: `Web Source ${i + 1}`,
          });
        }
      }

    } catch (error) {
      console.error('Search error:', error);
      results.push({
        title: `Error in search for: ${query}`,
        content: `Unable to complete search due to: ${error}`,
        source: "Error Handler",
      });
    }

    return {
      results,
      query,
      depth,
      breadth,
    };
  },
});

// Analysis Step
const analyzeResultsStep = createStep({
  id: "analyze-results",
  description: "Analyze search results and create comprehensive report",
  inputSchema: z.object({
    results: z.array(z.object({
      title: z.string(),
      content: z.string(),
      source: z.string(),
    })),
    query: z.string(),
    depth: z.number(),
    breadth: z.number(),
  }),
  outputSchema: z.object({
    analysis: z.string(),
    summary: z.string(),
    recommendations: z.array(z.string()),
    query: z.string(),
    approved: z.boolean().default(false),
  }),
  execute: async ({ inputData }) => {
    const { results, query, depth, breadth } = inputData;
    
    const analysis = `
# Research Analysis: ${query}

## Executive Summary
Based on ${results.length} sources with depth level ${depth} and breadth ${breadth}, here's the comprehensive analysis:

${results.map((result, index) => `
### ${index + 1}. ${result.title}
**Source:** ${result.source}
**Content:** ${result.content.substring(0, 500)}${result.content.length > 500 ? '...' : ''}
`).join('\n')}

## Key Insights
- Comprehensive coverage of "${query}" across multiple dimensions
- Analysis depth: ${depth}/3 (${depth === 1 ? 'Basic' : depth === 2 ? 'Intermediate' : 'Advanced'})
- Source diversity: ${breadth} different perspectives analyzed

## Methodology
This research utilized advanced AI agents specialized in different domains:
- Financial markets analysis via MRS Agent
- Cryptocurrency and DeFi analysis via MISTER Agent  
- General web research for comprehensive coverage
`;

    const summary = `Research on "${query}" completed with ${results.length} sources analyzed. Key findings include comprehensive coverage across financial and general domains with ${depth === 3 ? 'deep' : depth === 2 ? 'moderate' : 'basic'} analysis depth.`;

    const recommendations = [
      `Consider expanding research depth to level 3 for more detailed analysis`,
      `Cross-reference findings with additional specialized sources`,
      `Monitor ongoing developments related to "${query}"`,
      `Implement findings in relevant decision-making processes`,
    ];

    return {
      analysis,
      summary,
      recommendations,
      query,
      approved: false,
    };
  },
});

// Approval Step with Human Review
const getApprovalStep = createStep({
  id: "get-approval",
  description: "Get human approval for research results",
  inputSchema: z.object({
    analysis: z.string(),
    summary: z.string(),
    recommendations: z.array(z.string()),
    query: z.string(),
  }),
  resumeSchema: z.object({
    approved: z.boolean(),
    feedback: z.string().optional(),
  }),
  outputSchema: z.object({
    approved: z.boolean(),
    feedback: z.string().optional(),
    analysis: z.string(),
    summary: z.string(),
    recommendations: z.array(z.string()),
    query: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    if (resumeData) {
      return {
        approved: resumeData.approved,
        feedback: resumeData.feedback,
        analysis: inputData.analysis,
        summary: inputData.summary,
        recommendations: inputData.recommendations,
        query: inputData.query,
      };
    }

    await suspend({
      message: {
        analysis: inputData.analysis,
        summary: inputData.summary,
        recommendations: inputData.recommendations,
        prompt: "Do you approve this research? (yes/no)",
        feedback: "Any feedback or requests for changes?",
      },
    });

    // Unreachable but needed for TypeScript
    return {
      approved: false,
      analysis: inputData.analysis,
      summary: inputData.summary,
      recommendations: inputData.recommendations,
      query: inputData.query,
    };
  },
});

// Research Workflow with Human-in-the-Loop
export const soneResearchWorkflow = createWorkflow({
  id: "sone-research-workflow",
  description: "AI-powered research workflow with human approval and financial agent integration",
  inputSchema: z.object({
    suggestions: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    approved: z.boolean(),
    analysis: z.string(),
    summary: z.string(),
    recommendations: z.array(z.string()),
    query: z.string(),
    feedback: z.string().optional(),
  }),
})
  .then(getUserQueryStep)
  .then(webSearchStep)
  .then(analyzeResultsStep)
  .dowhile(getApprovalStep, async ({ inputData }) => {
    // Continue until approved
    return inputData.approved !== true;
  })
  .commit();

// Final Report Generation Step
const generateReportStep = createStep({
  id: "generate-report",
  description: "Generate final research report",
  inputSchema: z.object({
    approved: z.boolean(),
    analysis: z.string(),
    summary: z.string(),
    recommendations: z.array(z.string()),
    query: z.string(),
    feedback: z.string().optional(),
  }),
  outputSchema: z.object({
    reportPath: z.string(),
    completed: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const { analysis, summary, recommendations, query, feedback } = inputData;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `./reports/sone-research-${timestamp}.md`;
    
    const report = `# Sone Research Report
**Query:** ${query}
**Generated:** ${new Date().toLocaleString()}
**Status:** Approved ✅

${feedback ? `**User Feedback:** ${feedback}\n` : ''}

${analysis}

## Summary
${summary}

## Recommendations
${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

---
*Generated by Sone AI Research Workflow*
`;

    // In a real implementation, you would save this to a file
    console.log(`Report generated: ${reportPath}`);
    console.log(report);
    
    return {
      reportPath,
      completed: true,
    };
  },
});

// Main Research Workflow that orchestrates everything
export const soneMainResearchWorkflow = createWorkflow({
  id: "sone-main-research-workflow", 
  description: "Complete research workflow with iterative approval and final report generation",
  inputSchema: z.object({
    suggestions: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    reportPath: z.string(),
    completed: z.boolean(),
  }),
})
  .dowhile(soneResearchWorkflow, async ({ inputData }) => {
    // Keep researching until approved
    return inputData.approved !== true;
  })
  .then(generateReportStep)
  .commit();
