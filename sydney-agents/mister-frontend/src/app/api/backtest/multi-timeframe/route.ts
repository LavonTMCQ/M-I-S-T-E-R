import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/backtest/multi-timeframe
 * Run a real backtest using the Multi-Timeframe ADA strategy
 */
export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, symbol = 'ADAUSD' } = await request.json();

    console.log('📊 Running Multi-Timeframe strategy backtest...');
    console.log(`📈 Parameters: ${symbol} from ${startDate} to ${endDate}`);

    // Call the Mastra cryptoBacktestingAgent with multi-timeframe strategy
    const MASTRA_API_URL = process.env.MASTRA_API_URL || 'https://substantial-scarce-magazin.mastra.cloud';
    
    const response = await fetch(`${MASTRA_API_URL}/api/agents/cryptoBacktestingAgent/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `Use the multi-timeframe-ada-strategy tool to run a comprehensive backtest for ${symbol} from ${startDate} to ${endDate}. Use 15-minute execution timeframe with RSI and momentum indicators. I need both the complete OHLCV chart data and all trade results with entry/exit times, prices, and P&L. Return the results in the exact format expected by the frontend with chartData array and trades array.`
        }]
      }),
      signal: AbortSignal.timeout(240000) // 4 minute timeout for full backtest
    });

    if (!response.ok) {
      throw new Error(`Mastra API error: ${response.status} ${response.statusText}`);
    }

    const mastraResult = await response.json();
    console.log('🤖 Mastra Multi-Timeframe response received');

    // Parse the agent's response to extract backtest data
    let backtestData;
    try {
      console.log('🔍 Parsing Mastra agent response...');

      // The agent should return structured data in its response
      const agentResponse = mastraResult.text || mastraResult.content || mastraResult.message || '';
      console.log('📝 Agent response preview:', agentResponse.substring(0, 500));

      // Look for JSON data in the response - try multiple patterns
      let jsonMatch = agentResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch) {
        jsonMatch = agentResponse.match(/\{[\s\S]*\}/);
      }

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        backtestData = JSON.parse(jsonStr);
        console.log('✅ Successfully parsed backtest data');
      } else {
        console.log('⚠️ No JSON found, checking if response is direct object...');
        // Maybe the response is already an object
        if (typeof mastraResult === 'object' && mastraResult.trades && mastraResult.chartData) {
          backtestData = mastraResult;
        } else {
          throw new Error('No structured data found in agent response');
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse agent response:', parseError);
      console.error('📄 Full response:', JSON.stringify(mastraResult, null, 2));
      throw new Error('Failed to parse backtest results from agent');
    }

    // Ensure we have the required data structure
    if (!backtestData.chartData || !backtestData.trades) {
      throw new Error('Invalid backtest data structure from agent');
    }

    console.log(`✅ Multi-Timeframe backtest completed: ${backtestData.trades.length} trades, ${backtestData.chartData.length} candles`);

    // Calculate summary statistics
    const trades = backtestData.trades;
    const winningTrades = trades.filter((t: any) => t.pnl > 0);
    const losingTrades = trades.filter((t: any) => t.pnl < 0);
    
    const totalPnL = trades.reduce((sum: number, t: any) => sum + t.pnl, 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum: number, t: any) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum: number, t: any) => sum + t.pnl, 0) / losingTrades.length) : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
    const maxDrawdown = calculateMaxDrawdown(trades);

    return NextResponse.json({
      success: true,
      strategy: 'Multi-Timeframe ADA Strategy',
      symbol,
      timeframe: '15m',
      startDate,
      endDate,
      chartData: backtestData.chartData,
      trades: backtestData.trades,
      summary: {
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate: winRate,
        totalPnL: totalPnL,
        profitFactor: profitFactor,
        avgWin: avgWin,
        avgLoss: avgLoss,
        maxDrawdown: maxDrawdown,
        sharpeRatio: calculateSharpeRatio(trades),
        totalReturn: (totalPnL / 10000) * 100 // Assuming 10k initial capital
      }
    });

  } catch (error) {
    console.error('❌ Multi-Timeframe backtest failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * Calculate maximum drawdown from trades
 */
function calculateMaxDrawdown(trades: any[]): number {
  let peak = 0;
  let maxDrawdown = 0;
  let runningPnL = 0;

  for (const trade of trades) {
    runningPnL += trade.pnl;
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    const drawdown = peak - runningPnL;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate Sharpe ratio (simplified)
 */
function calculateSharpeRatio(trades: any[]): number {
  if (trades.length === 0) return 0;
  
  const returns = trades.map(t => t.pnl);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  return stdDev > 0 ? avgReturn / stdDev : 0;
}
