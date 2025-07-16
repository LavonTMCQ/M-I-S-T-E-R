import { Agent } from '@mastra/core';
import { z } from 'zod';

// Import all available tools for the network
import { fibonacciStrategyTool } from '../tools/fibonacci-strategy-tool';
import { multiTimeframeAdaStrategyTool } from '../tools/multi-timeframe-ada-strategy-tool';
import { cryptoBacktestTool } from '../tools/crypto-backtest-tool';
import { krakenDataTool } from '../tools/kraken-data-tool';
import { strikeFinanceTools } from '../tools/strike-finance-tools';

/**
 * Tomorrow Labs Network Agent
 * 
 * Master coordinator agent that can access and orchestrate all other agents
 * and tools in the MISTER ecosystem. This agent acts as the central hub
 * for user interactions and can intelligently route requests to the
 * appropriate specialized agents.
 */

export const tomorrowLabsNetworkAgent = new Agent({
  name: 'Tomorrow Labs Network',
  instructions: `
You are the Tomorrow Labs Network, a master coordinator AI agent that serves as the central hub for the MISTER trading ecosystem. You have access to all specialized agents and tools, and your role is to:

## Core Capabilities:
1. **Intelligent Routing**: Analyze user requests and route them to the appropriate specialized agents
2. **Multi-Agent Coordination**: Orchestrate complex workflows that require multiple agents
3. **Unified Interface**: Provide a seamless chat experience that abstracts the complexity of multiple agents
4. **Context Management**: Maintain conversation context across different agent interactions

## Available Specialized Agents & Tools:

### Trading & Strategy Analysis:
- **Fibonacci Agent**: Expert in Fibonacci retracement trading strategies and technical analysis
- **Multi-Timeframe Strategy**: Advanced multi-timeframe analysis with MRLABS-optimized algorithms
- **Crypto Backtesting**: Strategy backtesting and performance optimization

### Data & Market Analysis:
- **Kraken Data Tool**: Real-time and historical market data from Kraken exchange
- **Strike Finance Tools**: Integration with Strike Finance perpetual swaps platform

### General Capabilities:
- **Code Generation**: Help with programming, scripting, and technical implementation
- **Data Analysis**: Analyze trading data, performance metrics, and market trends
- **Strategy Development**: Assist in creating and optimizing trading strategies
- **Educational Content**: Explain trading concepts, technical analysis, and DeFi protocols

## Interaction Guidelines:

1. **Be Conversational**: Engage naturally and maintain a helpful, professional tone
2. **Route Intelligently**: When users ask about specific domains (trading, backtesting, etc.), use the appropriate specialized tools
3. **Provide Context**: Always explain what you're doing and which tools/agents you're using
4. **Aggregate Results**: When using multiple tools, synthesize the results into a coherent response
5. **Ask for Clarification**: If a request is ambiguous, ask clarifying questions

## Example Routing Logic:
- Fibonacci/Trading Strategy questions → Use Fibonacci Strategy Tool
- Backtesting requests → Use Multi-Timeframe or Crypto Backtest Tools
- Market data requests → Use Kraken Data Tool
- Strike Finance operations → Use Strike Finance Tools
- General coding/analysis → Handle directly with your base capabilities

## Response Format:
- Start with a brief acknowledgment of the user's request
- Explain which tools/agents you're using and why
- Provide the results in a clear, organized manner
- Offer follow-up suggestions or related actions

Remember: You are the friendly, intelligent face of the entire MISTER ecosystem. Make complex trading and DeFi concepts accessible while maintaining technical accuracy.
  `,
  
  model: {
    provider: 'OPEN_AI',
    name: 'gpt-4o',
    toolChoice: 'auto',
  },

  tools: {
    // Trading Strategy Tools
    fibonacciStrategy: fibonacciStrategyTool,
    multiTimeframeStrategy: multiTimeframeAdaStrategyTool,
    cryptoBacktest: cryptoBacktestTool,
    
    // Data Tools
    krakenData: krakenDataTool,
    
    // Strike Finance Integration
    ...strikeFinanceTools,

    // Network Coordination Tool
    routeToAgent: {
      description: 'Route a request to a specific specialized agent in the network',
      inputSchema: z.object({
        agentType: z.enum(['fibonacci', 'backtesting', 'sone', 'strike']).describe('The type of agent to route to'),
        request: z.string().describe('The user request to forward to the agent'),
        context: z.string().optional().describe('Additional context for the agent')
      }),
      execute: async ({ agentType, request, context }) => {
        // This would typically call other agents in a real network
        // For now, we'll provide routing information
        const agentInfo = {
          fibonacci: {
            name: 'Fibonacci Trading Agent',
            capabilities: ['Fibonacci retracement analysis', 'Technical trading strategies', 'Entry/exit signals'],
            description: 'Specialized in Fibonacci-based trading strategies and technical analysis'
          },
          backtesting: {
            name: 'Crypto Backtesting Agent', 
            capabilities: ['Strategy backtesting', 'Performance analysis', 'Algorithm optimization'],
            description: 'Expert in backtesting trading strategies and performance optimization'
          },
          sone: {
            name: 'Sone Assistant Agent',
            capabilities: ['General AI assistance', 'Code generation', 'Data analysis', 'Educational content'],
            description: 'General-purpose AI assistant for coding, analysis, and learning'
          },
          strike: {
            name: 'Strike Finance Agent',
            capabilities: ['Perpetual swaps trading', 'Position management', 'Strike Finance integration'],
            description: 'Specialized in Strike Finance perpetual swaps and DeFi trading'
          }
        };

        const agent = agentInfo[agentType];
        
        return {
          success: true,
          routedTo: agent.name,
          capabilities: agent.capabilities,
          description: agent.description,
          request: request,
          context: context || 'No additional context provided',
          message: `Request routed to ${agent.name}. This agent specializes in: ${agent.capabilities.join(', ')}`
        };
      }
    },

    // Network Status Tool
    getNetworkStatus: {
      description: 'Get the status of all agents and tools in the Tomorrow Labs Network',
      inputSchema: z.object({}),
      execute: async () => {
        return {
          network: 'Tomorrow Labs',
          status: 'online',
          agents: [
            { name: 'Fibonacci Agent', status: 'online', specialization: 'Trading Strategies' },
            { name: 'Multi-Timeframe Agent', status: 'online', specialization: 'Advanced Backtesting' },
            { name: 'Crypto Backtesting Agent', status: 'online', specialization: 'Performance Analysis' },
            { name: 'Sone Assistant', status: 'online', specialization: 'General AI' },
            { name: 'Strike Finance Agent', status: 'online', specialization: 'DeFi Trading' }
          ],
          tools: [
            { name: 'Fibonacci Strategy Tool', status: 'active' },
            { name: 'Multi-Timeframe Strategy Tool', status: 'active' },
            { name: 'Kraken Data Tool', status: 'active' },
            { name: 'Strike Finance Tools', status: 'active' }
          ],
          lastUpdated: new Date().toISOString()
        };
      }
    }
  }
});

export default tomorrowLabsNetworkAgent;
