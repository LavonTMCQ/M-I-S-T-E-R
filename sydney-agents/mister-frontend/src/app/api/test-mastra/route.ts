import { NextRequest, NextResponse } from 'next/server';
import { MASTRA_API_URL } from '@/lib/api-config';

/**
 * GET /api/test-mastra
 * Test endpoint to see exactly what Mastra returns
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Mastra connection...');
    
    // Test basic Mastra connectivity
    const response = await fetch(`${MASTRA_API_URL}/api/agents/cryptoBacktestingAgent/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: 'Use the multi-timeframe-ada-strategy tool to run a quick test backtest for ADAUSD from 2025-06-01 to 2025-07-01. Just return a simple response so I can see the format.'
        }]
      }),
      signal: AbortSignal.timeout(120000) // 2 minute timeout
    });

    console.log('📡 Mastra response status:', response.status);
    console.log('📡 Mastra response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Mastra error response:', errorText);
      return NextResponse.json({
        success: false,
        error: `Mastra API error: ${response.status}`,
        details: errorText
      });
    }

    const result = await response.json();
    console.log('✅ Raw Mastra response:', JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Mastra test completed',
      rawResponse: result,
      responseKeys: Object.keys(result),
      responseType: typeof result
    });

  } catch (error) {
    console.error('❌ Mastra test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to connect to Mastra'
    });
  }
}
