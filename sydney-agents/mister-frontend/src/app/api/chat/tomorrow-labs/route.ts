import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/chat/tomorrow-labs
 * Tomorrow Labs Network - Master coordinator agent that can access all other agents
 */
export async function POST(request: NextRequest) {
  try {
    const { message, agentType, chatHistory } = await request.json();

    console.log('🚀 Tomorrow Labs Network received message:', {
      message: message.substring(0, 100) + '...',
      agentType,
      historyLength: chatHistory?.length || 0
    });

    // Determine which agent to route to based on the message content and selected agent
    const routedAgent = determineAgent(message, agentType);
    
    console.log(`🎯 Routing to agent: ${routedAgent}`);

    // Call the appropriate Mastra Cloud agent
    const agentResponse = await callMastraAgent(routedAgent, message, chatHistory);

    return NextResponse.json({
      success: true,
      response: agentResponse,
      agentUsed: routedAgent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Tomorrow Labs Network error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      response: 'Sorry, I encountered an error. Please try again.'
    }, { status: 500 });
  }
}

/**
 * Determine which agent to use based on message content - Tomorrow Labs Network coordination
 */
function determineAgent(message: string, selectedAgent: string): string {
  const lowerMessage = message.toLowerCase();

  // For specific Strike Finance queries, route directly to Strike agent
  if (lowerMessage.includes('strike finance') || lowerMessage.includes('perpetual') || lowerMessage.includes('leverage position')) {
    return 'strike-agent';
  }

  // For specific backtesting queries, route directly to backtesting agent
  if (lowerMessage.includes('backtest this strategy') || lowerMessage.includes('test this algorithm') || lowerMessage.includes('performance analysis')) {
    return 'crypto-backtesting';
  }

  // Default to Tomorrow Labs Network for coordination and general queries
  return 'tomorrow-labs';
}

/**
 * Call the appropriate Mastra Cloud agent
 */
async function callMastraAgent(agentType: string, message: string, chatHistory: any[]): Promise<string> {
  const MASTRA_CLOUD_URL = 'https://substantial-scarce-magazin.mastra.cloud';
  
  // Map agent types to Mastra Cloud endpoints - Strike Finance and Crypto only
  const agentEndpoints = {
    'strike-agent': '/api/agents/strikeAgent/generate',
    'crypto-backtesting': '/api/agents/cryptoBacktestingAgent/generate',
    'tomorrow-labs': '/api/agents/tomorrowLabsNetworkAgent/generate' // Tomorrow Labs Network Agent
  };

  const endpoint = agentEndpoints[agentType as keyof typeof agentEndpoints] || agentEndpoints['tomorrow-labs'];

  try {
    console.log(`🌐 Calling Mastra Cloud: ${MASTRA_CLOUD_URL}${endpoint}`);

    // Prepare the request payload
    const payload = {
      messages: [
        // Include recent chat history for context
        ...chatHistory.slice(-5).map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })),
        // Add the current message
        {
          role: 'user',
          content: message
        }
      ]
    };

    const response = await fetch(`${MASTRA_CLOUD_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Mastra Cloud responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the response content
    let responseContent = '';

    if (data.text) {
      responseContent = data.text;
    } else if (data.content) {
      responseContent = data.content;
    } else if (data.response) {
      responseContent = data.response;
    } else if (data.message) {
      responseContent = data.message;
    } else if (typeof data === 'string') {
      responseContent = data;
    } else {
      // Try to extract from common response formats
      responseContent = data.choices?.[0]?.message?.content ||
                      data.result?.content ||
                      data.output ||
                      'I received your message but had trouble formatting the response.';
    }

    // Ensure responseContent is a string
    if (typeof responseContent !== 'string') {
      responseContent = JSON.stringify(responseContent);
    }

    console.log('✅ Mastra Cloud response received:', {
      agent: agentType,
      responseLength: responseContent.length,
      preview: responseContent.substring(0, 100) + '...'
    });

    return responseContent;

  } catch (error) {
    console.error(`❌ Error calling ${agentType}:`, error);
    
    // Provide helpful fallback responses based on agent type
    const fallbackResponses = {
      'strike-agent': 'I\'m having trouble connecting to the Strike Finance agent right now. Please try again in a moment.',
      'crypto-backtesting': 'The crypto backtesting agent is currently unavailable. Please try again later.',
      'tomorrow-labs': 'The Tomorrow Labs Network is temporarily unavailable. I\'m a master coordinator for Strike Finance trading and crypto backtesting. Please try your request again.'
    };

    return fallbackResponses[agentType as keyof typeof fallbackResponses] || 
           'I\'m having trouble processing your request right now. Please try again.';
  }
}

/**
 * GET /api/chat/tomorrow-labs
 * Get available agents and network status
 */
export async function GET() {
  try {
    const agents = [
      {
        id: 'tomorrow-labs',
        name: 'Tomorrow Labs Network',
        description: 'Strike Finance and crypto backtesting coordinator',
        status: 'online',
        capabilities: ['strike-finance', 'crypto-backtesting', 'natural-language-analysis']
      },
      {
        id: 'strike-agent',
        name: 'Strike Finance Agent',
        description: 'Cardano perpetual swaps specialist',
        status: 'online',
        capabilities: ['strike-finance', 'perpetual-swaps', 'position-management']
      },
      {
        id: 'crypto-backtesting',
        name: 'Crypto Backtesting Agent',
        description: 'Natural language crypto strategy backtesting',
        status: 'online',
        capabilities: ['crypto-backtesting', 'strategy-analysis', 'performance-optimization']
      }
    ];

    return NextResponse.json({
      success: true,
      network: 'Tomorrow Labs',
      agents,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting network status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get network status'
    }, { status: 500 });
  }
}
