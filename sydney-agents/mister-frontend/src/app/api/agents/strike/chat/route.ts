import { NextRequest, NextResponse } from 'next/server';
import { MASTRA_API_URL } from '@/lib/api-config';

/**
 * Strike Finance Agent Chat API
 * Connects the frontend trading interface to the Mastra Strike Agent
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, userWallet } = body;

    if (!message) {
      return NextResponse.json({
        success: false,
        error: 'Message is required'
      }, { status: 400 });
    }

    console.log('🤖 Calling Mastra Strike Agent with message:', message);
    console.log('📍 Context:', context);
    console.log('👛 User Wallet:', userWallet ? `${userWallet.stakeAddress?.substring(0, 20)}...` : 'Not provided');

    // Build enhanced message with wallet context since runtimeContext may not work via HTTP API
    let enhancedMessage = message;
    if (userWallet) {
      enhancedMessage = `WALLET_CONTEXT:
- Wallet Address: ${userWallet.address}
- Stake Address: ${userWallet.stakeAddress}
- Balance: ${userWallet.balance} ADA
- Wallet Type: ${userWallet.walletType}
${userWallet.handle ? `- ADA Handle: ${userWallet.handle}` : ''}
- Trading Mode: connected

USER_MESSAGE: ${message}`;
    }

    // Call the Mastra Strike Agent
    const response = await fetch(`${MASTRA_API_URL}/api/agents/strikeAgent/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: enhancedMessage
          }
        ],
        resourceId: userWallet?.address || 'anonymous',
        threadId: `trading-${Date.now()}`
      })
    });

    if (!response.ok) {
      console.error('❌ Mastra API error:', response.status, response.statusText);
      return NextResponse.json({
        success: false,
        error: `Mastra API error: ${response.status}`
      }, { status: 500 });
    }

    const result = await response.json();
    console.log('✅ Strike Agent response received');
    console.log('🔍 Full Mastra response:', JSON.stringify(result, null, 2));

    // Check all possible locations for tool call data
    console.log('🔍 Checking for tool calls in response...');
    console.log('🔍 result.toolCalls:', result.toolCalls);
    console.log('🔍 result.toolResults:', result.toolResults);
    console.log('🔍 result.steps:', result.steps);
    console.log('🔍 result.finishReason:', result.finishReason);

    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log('🔍 Found tool calls:', result.toolCalls.length);
      result.toolCalls.forEach((toolCall: any, index: number) => {
        console.log(`🔍 Tool Call ${index + 1}:`, {
          toolName: toolCall.toolName,
          args: toolCall.args,
          hasResult: !!toolCall.result,
          resultData: toolCall.result
        });
      });
    } else {
      console.log('❌ No tool calls found in result.toolCalls');
    }

    // Extract the agent's response
    const agentResponse = result.text || result.content || 'I apologize, but I encountered an issue processing your request.';

    // Check if the response contains any trade actions
    let tradeAction = null;
    let requiresWalletSigning = false;
    let transactionCbor = null;
    let tradeDetails = null;

    // Look for trade-related keywords in the response to detect if a trade was executed
    const tradeKeywords = ['executed', 'opened position', 'closed position', 'trade completed', 'trade prepared'];
    const hasTradeAction = tradeKeywords.some(keyword =>
      agentResponse.toLowerCase().includes(keyword.toLowerCase())
    );

    // Check if the response indicates wallet signing is required
    if (agentResponse.includes('sign the transaction') || agentResponse.includes('approve the transaction') || agentResponse.includes('Vespr wallet')) {
      requiresWalletSigning = true;
      console.log('🔍 Wallet signing required detected in response');

      // Try to extract CBOR and trade details from the complex Mastra response
      // The CBOR data is deeply nested in the response structure
      console.log('🔍 Searching for CBOR in complex Mastra response...');

      // Method 1: Check in result.messages for tool results
      if (result.messages && Array.isArray(result.messages)) {
        console.log('🔍 Checking messages array for tool results...');
        for (const message of result.messages) {
          if (message.role === 'tool' && message.content && Array.isArray(message.content)) {
            for (const contentItem of message.content) {
              if (contentItem.type === 'tool-result' &&
                  contentItem.toolName === 'executeManualTrade' &&
                  contentItem.result?.data) {

                const toolData = contentItem.result.data;
                console.log('🎯 Found executeManualTrade tool result in messages');

                if (toolData.requiresFrontendSigning && toolData.cbor) {
                  transactionCbor = toolData.cbor;
                  tradeDetails = toolData.tradeDetails;
                  console.log('✅ Found CBOR data in messages:', toolData.cbor.substring(0, 50) + '...');
                  break;
                }
              }
            }
            if (transactionCbor) break;
          }
        }
      }

      // Method 2: Check in result.steps (Mastra step-by-step execution)
      if (!transactionCbor && result.steps && Array.isArray(result.steps)) {
        console.log('🔍 Checking steps array for tool results...');
        for (const step of result.steps) {
          if (step.stepType === 'tool-result' && step.toolResults && Array.isArray(step.toolResults)) {
            for (const toolResult of step.toolResults) {
              if (toolResult.toolName === 'executeManualTrade' && toolResult.result?.data) {
                const toolData = toolResult.result.data;
                console.log('🎯 Found executeManualTrade in steps');

                if (toolData.requiresFrontendSigning && toolData.cbor) {
                  transactionCbor = toolData.cbor;
                  tradeDetails = toolData.tradeDetails;
                  console.log('✅ Found CBOR data in steps:', toolData.cbor.substring(0, 50) + '...');
                  break;
                }
              }
            }
            if (transactionCbor) break;
          }
        }
      }

      // Method 3: Deep search in the entire response object
      if (!transactionCbor) {
        console.log('🔍 Performing deep search for CBOR data...');
        const searchForCbor = (obj: any, path = ''): any => {
          if (typeof obj !== 'object' || obj === null) return null;

          // Check if this object has the CBOR structure we're looking for
          if (obj.requiresFrontendSigning && obj.cbor && typeof obj.cbor === 'string') {
            console.log('✅ Found CBOR data at path:', path);
            return obj;
          }

          // Recursively search nested objects and arrays
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
              const found = searchForCbor(value, `${path}.${key}`);
              if (found) return found;
            }
          }

          return null;
        };

        const foundData = searchForCbor(result);
        if (foundData) {
          transactionCbor = foundData.cbor;
          tradeDetails = foundData.tradeDetails;
          console.log('✅ Found CBOR data via deep search:', foundData.cbor.substring(0, 50) + '...');
        }
      }

      // Fallback: Check in result.toolCalls (legacy format)
      if (!transactionCbor && result.toolCalls) {
        console.log('🔍 Checking tool calls for CBOR data (fallback)...');
        for (const toolCall of result.toolCalls) {
          if (toolCall.name === 'execute_manual_trade' && toolCall.result?.data?.requiresFrontendSigning) {
            transactionCbor = toolCall.result.data.cbor;
            tradeDetails = toolCall.result.data.tradeDetails;
            console.log('✅ Found CBOR data in tool call result');
            break;
          }
        }
      }

      if (!transactionCbor) {
        console.log('❌ CBOR data not found in any location');
        console.log('🔍 Full result structure keys:', Object.keys(result));
      }
    }

    if (hasTradeAction || requiresWalletSigning) {
      if (requiresWalletSigning) {
        tradeAction = {
          type: 'requires_wallet_signing',
          timestamp: new Date().toISOString(),
          details: 'Transaction ready for wallet signing',
          requiresWalletSigning: true,
          transactionCbor,
          tradeDetails
        };
      } else {
        // Parse potential trade action from response
        // This is a simplified parser - could be enhanced based on actual agent responses
        if (agentResponse.toLowerCase().includes('long')) {
          tradeAction = {
            action: 'long',
            amount: 1000, // Default amount - could be parsed from response
            price: 0.45   // Default price - could be parsed from response
          };
        } else if (agentResponse.toLowerCase().includes('short')) {
          tradeAction = {
            action: 'short',
            amount: 1000,
            price: 0.45
          };
        } else if (agentResponse.toLowerCase().includes('close')) {
          tradeAction = {
            action: 'close',
            amount: 0,
            price: 0.45
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        response: agentResponse,
        tradeAction: tradeAction,
        timestamp: new Date().toISOString(),
        context: context
      }
    });

  } catch (error) {
    console.error('❌ Strike Agent chat error:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
