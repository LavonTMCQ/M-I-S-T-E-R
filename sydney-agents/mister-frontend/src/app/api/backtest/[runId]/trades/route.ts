import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/backtest/[runId]/trades
 * Get real trade data for a specific backtest run
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    if (!runId) {
      return NextResponse.json({
        success: false,
        error: 'Run ID is required'
      }, { status: 400 });
    }

    // Connect to Mastra Multi-Timeframe ADA Strategy for real trade data
    const symbol = 'ADAUSD';
    // Always backtest 30 days back from today
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Call the actual Mastra strategy to get real backtest results
    const backtestResults = await runRealMastraBacktest(symbol, startDate, endDate);

    if (!backtestResults) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate backtest results'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      runId,
      symbol,
      startDate,
      endDate,
      totalTrades: backtestResults.trades?.length || 0,
      trades: backtestResults.trades || [],
      performance: backtestResults.performance || {},
      summary: backtestResults.summary || {}
    });

  } catch (error) {
    console.error('Error fetching backtest trade data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * Run the actual Mastra Multi-Timeframe ADA Strategy
 * This connects to your real backtesting system
 */
async function runRealMastraBacktest(symbol: string, startDate: string, endDate: string) {
  try {
    // Call your Mastra agent directly
    const response = await fetch('http://localhost:4112/api/agents/cryptoBacktestingAgent/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `Use the multi-timeframe-ada-strategy tool to run a comprehensive backtest for ${symbol} from ${startDate} to ${endDate}. Use 15-minute execution timeframe with 10x leverage. Return complete trade log with entry/exit times, prices, P&L, and reasons for each trade.`
        }]
      }),
      signal: AbortSignal.timeout(240000) // 4 minute timeout for full backtest
    });

    if (!response.ok) {
      throw new Error(`Mastra API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('🔍 Mastra trades response keys:', Object.keys(result));

    // Extract the backtest results from the Mastra agent response
    // Based on logs, the data is in result.toolResults[0].result
    let backtestData: any = null;

    try {
      // First, try to get data from toolResults (where the actual JSON is)
      if (result.toolResults && Array.isArray(result.toolResults) && result.toolResults.length > 0) {
        const toolResult = result.toolResults[0];
        if (toolResult.result && typeof toolResult.result === 'object') {
          console.log('🔍 Found toolResult data:', Object.keys(toolResult.result));
          if (toolResult.result.success && toolResult.result.results) {
            backtestData = toolResult.result.results;
            console.log('✅ Found trade data in toolResults');
          }
        }
      }

      // Fallback: try to parse the text field which contains the JSON response
      if (!backtestData && result.text && typeof result.text === 'string') {
        try {
          // Remove markdown code blocks if present
          let cleanText = result.text.trim();
          console.log('🔍 Raw text field:', cleanText.substring(0, 200) + '...');

          // Look for JSON block in the text
          const jsonMatch = cleanText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
          if (jsonMatch) {
            cleanText = jsonMatch[1];
            console.log('🔍 Extracted JSON from markdown:', cleanText.substring(0, 200) + '...');
          } else {
            // Look for any large JSON object in the text (for voice announcement responses)
            const largeJsonMatch = cleanText.match(/(\{[\s\S]{500,}?\})/);
            if (largeJsonMatch) {
              cleanText = largeJsonMatch[1];
              console.log('🔍 Extracted large JSON object:', cleanText.substring(0, 200) + '...');
            } else if (cleanText.startsWith('```json')) {
              cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanText.startsWith('```')) {
              cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
          }

          console.log('🔍 Cleaned text field:', cleanText.substring(0, 200) + '...');

          const parsedText = JSON.parse(cleanText);
          if (parsedText.success && parsedText.results) {
            backtestData = parsedText.results;
            console.log('✅ Found trade data in text field');
          }
        } catch (e) {
          console.log('Could not parse text field as JSON:', e instanceof Error ? e.message : String(e));
          console.log('🔍 Text field preview:', result.text.substring(0, 500));
        }
      }

      // Fallback: try the direct format
      if (!backtestData && result.success && result.results) {
        const directResults = result.results;
        backtestData = directResults;
        console.log('✅ Found trade data in direct results');
      }

      if (backtestData) {
        const trades = backtestData.trades || [];
        const performance = backtestData.performance || {};

        console.log(`✅ Loaded ${trades.length} real trades from Mastra strategy`);
        console.log(`🔍 Trades API - First trade sample:`, trades[0] ? {
          id: trades[0].id,
          entryTime: trades[0].entryTime || trades[0].entryDate,
          side: trades[0].side,
          entryPrice: trades[0].entryPrice,
          pnl: trades[0].pnl
        } : 'No trades');

        return {
          trades: trades.map((trade: any) => ({
            id: trade.id || `trade_${trade.entryTime || trade.entryDate}`,
            entryTime: trade.entryTime || trade.entryDate,
            exitTime: trade.exitTime || trade.exitDate,
            side: trade.side.toUpperCase(),
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            size: trade.quantity,
            netPnl: trade.pnl,
            reason: trade.entryReason || trade.exitReason
          })),
          performance: {
            totalReturn: performance.totalReturn || backtestData.totalReturn,
            winRate: performance.hitRate || backtestData.hitRate,
            totalTrades: performance.totalTrades || backtestData.totalTrades,
            maxDrawdown: performance.maxDrawdown || backtestData.maxDrawdown,
            sharpeRatio: performance.sharpeRatio || backtestData.sharpeRatio
          },
          summary: performance
        };
      } else {
        console.log('❌ No valid trade data found in response structure');
        console.log('🔍 Response keys:', Object.keys(result));
        console.log('🔍 Full result structure:', JSON.stringify(result, null, 2).substring(0, 1000) + '...');

        // Try one more fallback - look for any JSON-like structure in the text
        if (result.text && typeof result.text === 'string') {
          const jsonBlocks = result.text.match(/\{[\s\S]*?\}/g);
          if (jsonBlocks) {
            console.log('🔍 Found potential JSON blocks:', jsonBlocks.length);
            for (let i = 0; i < Math.min(jsonBlocks.length, 3); i++) {
              try {
                const parsed = JSON.parse(jsonBlocks[i]);
                if (parsed.success && parsed.results) {
                  backtestData = parsed.results;
                  console.log('✅ Found trade data in JSON block', i);
                  break;
                }
              } catch (e) {
                console.log(`Could not parse JSON block ${i}:`, e.message);
              }
            }
          }
        }

        if (!backtestData) {
          throw new Error('Failed to get valid backtest results from Mastra');
        }
      }
    } catch (parseError) {
      console.error('❌ Error parsing Mastra response:', parseError);
      throw new Error('Failed to parse backtest results from Mastra');
    }

  } catch (error) {
    console.error('Error calling Mastra strategy:', error);

    // Fallback: Return empty results with error message
    return {
      trades: [],
      performance: {},
      summary: {},
      error: 'Could not connect to Mastra backtesting system. Please ensure Mastra is running on port 4112.'
    };
  }
}
