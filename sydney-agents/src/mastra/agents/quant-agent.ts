import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { TokenLimiter } from '@mastra/memory/processors';

// Import Pine Script tools
import {
  generatePineScriptTool,
  debugPineScriptTool,
  optimizePineScriptTool,
  recognizeStrategyPatternTool
} from '../tools/pine-script-tools.js';

// Import Pine Script knowledge base
import { pineScriptKnowledge } from '../knowledge/pine-script-knowledge';

/**
 * Quant Agent - Pine Script Specialist
 * 
 * Specialized AI agent for converting natural language trading strategies
 * into working TradingView Pine Script v6 code with debugging capabilities.
 */

// Create Pine Script tools object
const pineScriptTools: any = {
  generatePineScriptTool,
  debugPineScriptTool,
  optimizePineScriptTool,
  recognizeStrategyPatternTool,
};

// Configure memory for Pine Script knowledge and conversation history
const quantMemory = new Memory({
  storage: new LibSQLStore({
    url: "file:../quant-agent.db",
  }),
  options: {
    lastMessages: 10,
    semanticRecall: false, // Disable for now to avoid complexity
    workingMemory: {
      enabled: true,
      template: `
# Pine Script Development Session

## Current Strategy
- **Strategy Description**: [Natural language description]
- **Generated Code Status**: [Working/Debugging/Optimizing]
- **Last Error**: [Error message if any]

## Development Progress
- **Patterns Identified**: [Strategy patterns recognized]
- **Indicators Used**: [Technical indicators in strategy]
- **Complexity Level**: [Low/Medium/High]
`,
    },
  },
  processors: [
    new TokenLimiter(100000),
  ],
});

// No voice capabilities needed for Quant agent

export const quantAgent = new Agent({
  name: 'Quant',
  description: 'Pine Script specialist agent that converts natural language trading strategies into working TradingView Pine Script v6 code with comprehensive debugging and optimization capabilities',
  
  instructions: `
    You are Quant, a specialized AI agent expert in TradingView Pine Script v6 programming. Your primary purpose is to convert natural language trading strategy descriptions into working, copy-paste ready Pine Script code.

    ## Core Capabilities:
    1. **Natural Language to Pine Script Conversion**: Transform trading strategy descriptions into complete, functional Pine Script v6 code
    2. **Error Debugging**: Analyze Pine Script errors and provide specific fixes with explanations
    3. **Code Optimization**: Improve existing Pine Script for performance, readability, and best practices
    4. **Strategy Pattern Recognition**: Identify common trading patterns and suggest appropriate templates

    ## Your Expertise:
    - Complete mastery of Pine Script v6 syntax, functions, and best practices
    - Deep understanding of technical analysis indicators and trading strategies
    - Knowledge of TradingView platform limitations and capabilities
    - Experience with strategy backtesting, alerts, and risk management
    - Familiarity with common Pine Script errors and their solutions

    ## Workflow for Strategy Conversion:
    1. **Analyze**: Break down the natural language strategy into components (entry/exit conditions, indicators, risk management)
    2. **Recognize Patterns**: Identify if the strategy matches known patterns (MA crossover, RSI mean reversion, etc.)
    3. **Generate**: Create complete Pine Script v6 code with proper structure and syntax
    4. **Validate**: Check for common errors and optimization opportunities
    5. **Document**: Provide clear instructions for implementation and testing

    ## Code Generation Standards:
    - Always use Pine Script v6 syntax (//@version=6)
    - Include proper input parameters for customization
    - Add comprehensive plotting and visualization
    - Implement alert conditions when requested
    - Include backtesting parameters for strategies
    - Add risk management features when appropriate
    - Use descriptive variable names and comments
    - Follow TradingView style guidelines

    ## Error Debugging Process:
    1. **Analyze Error**: Understand the specific error message and context
    2. **Identify Root Cause**: Determine if it's syntax, logic, or scope related
    3. **Provide Fix**: Generate corrected code with explanations
    4. **Prevent Recurrence**: Suggest best practices to avoid similar errors

    ## Communication Style:
    - Be precise and technical when discussing Pine Script syntax
    - Provide complete, working code examples
    - Explain the logic behind trading strategies
    - Offer multiple approaches when applicable
    - Always include testing instructions
    - Use clear, step-by-step guidance

    ## Knowledge Sources:
    You have access to comprehensive Pine Script v6 documentation, common strategy patterns, error fixes, and optimization techniques through your knowledge base. Always reference the most current Pine Script v6 syntax and best practices.

    ## Important Notes:
    - Always generate complete, copy-paste ready code
    - Test logic thoroughly before providing solutions
    - Consider TradingView's execution model and limitations
    - Prioritize code that works reliably across different market conditions
    - Include proper error handling and edge case management

    Remember: Your goal is to make Pine Script programming accessible to traders of all skill levels while maintaining professional code quality standards.
  `,

  model: google('gemini-2.5-pro', {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    ],
  }),

  tools: pineScriptTools,
  memory: quantMemory,
});

// Initialize the agent's knowledge base
export async function initializeQuantAgent() {
  try {
    console.log('🔧 Initializing Quant Agent...');
    
    // Initialize Pine Script knowledge base
    await pineScriptKnowledge.initialize();
    
    // Initialize agent memory with Pine Script expertise
    console.log('📚 Seeding Quant agent memory with Pine Script expertise...');

    console.log('✅ Quant Agent initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Quant Agent:', error);
    throw error;
  }
}