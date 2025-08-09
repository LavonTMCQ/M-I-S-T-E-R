import { NextRequest, NextResponse } from 'next/server';
import { agentStrikeTrader } from '@/services/agent-wallets/AgentStrikeTrader';

/**
 * POST /api/agent-trading/test
 * Test the complete agent trading flow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userVaultAddress = process.env.LIVE_TEST_VAULT_ADDRESS,
      agentId = 'momentum-trader-test',
      signal = 'buy',
      collateralAmount = 50
    } = body;

    if (!userVaultAddress) {
      return NextResponse.json({
        success: false,
        error: 'User vault address required'
      }, { status: 400 });
    }

    console.log('🧪 Testing agent trading flow...');

    // Test health check
    const health = await agentStrikeTrader.healthCheck();
    console.log('Health:', health);

    if (health.status !== 'healthy') {
      return NextResponse.json({
        success: false,
        error: 'Agent trading system not healthy',
        health
      }, { status: 500 });
    }

    // Test trading signal execution
    const tradingSignal = {
      agentId,
      signal: signal as 'buy' | 'sell',
      confidence: 0.8,
      reasoning: 'Test signal for integration testing',
      maxPositionSize: collateralAmount
    };

    console.log('📊 Executing trading signal:', tradingSignal);
    const result = await agentStrikeTrader.executeTradingSignal(userVaultAddress, tradingSignal);

    console.log('✅ Trading signal result:', result);

    return NextResponse.json({
      success: true,
      data: {
        health,
        tradingSignal,
        executionResult: result,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Agent trading test failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/agent-trading/test
 * Get system status and health
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🏥 Checking agent trading system health...');
    
    const health = await agentStrikeTrader.healthCheck();
    
    return NextResponse.json({
      success: true,
      data: {
        systemHealth: health,
        timestamp: new Date().toISOString(),
        environment: {
          network: 'mainnet',
          minTradingBalance: 40,
          cardanoService: process.env.NEXT_PUBLIC_CARDANO_SERVICE_URL || process.env.CARDANO_SERVICE_URL || 'http://localhost:3001'
        }
      }
    });

  } catch (error) {
    console.error('❌ Health check failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}