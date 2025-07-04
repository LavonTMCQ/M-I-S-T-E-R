import { NextRequest, NextResponse } from 'next/server';
import { TradingDecision } from '@/types/api';

// This would import our actual backend services
// import { SignalService } from '@/backend/services/signal-service';

/**
 * POST /api/ai-signals/force
 * Force AI signal check
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { immediate } = body;

    console.log('🔧 Forcing AI signal check...');

    // In production, this would integrate with SignalService:
    // const signalService = SignalService.getInstance();
    // const decision = await signalService.forceSignalCheck();

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, immediate ? 500 : 2000));

    // Mock trading decision for demo
    const mockDecision: TradingDecision = {
      action: Math.random() > 0.7 ? 'Open' : Math.random() > 0.5 ? 'Hold' : 'Close',
      side: Math.random() > 0.5 ? 'Long' : 'Short',
      leverage: Math.floor(Math.random() * 3) + 1,
      positionSize: Math.floor(Math.random() * 5000) + 1000,
      collateralAmount: 0, // Will be calculated
      enteredPrice: 0.4500 + (Math.random() - 0.5) * 0.1,
      confidence: Math.floor(Math.random() * 40) + 60, // 60-100%
      reasoning: generateRandomReasoning()
    };

    // Calculate collateral amount
    if (mockDecision.action === 'Open' && mockDecision.positionSize && mockDecision.enteredPrice && mockDecision.leverage) {
      mockDecision.collateralAmount = (mockDecision.positionSize * mockDecision.enteredPrice) / mockDecision.leverage;
    }

    const result = {
      decision: mockDecision,
      timestamp: new Date().toISOString(),
      executionTime: immediate ? 500 : 2000,
      marketConditions: {
        price: mockDecision.enteredPrice,
        volatility: Math.random() * 0.1,
        volume: Math.floor(Math.random() * 1000000) + 500000,
        trend: mockDecision.side === 'Long' ? 'bullish' : 'bearish'
      }
    };

    console.log(`✅ Signal check completed: ${mockDecision.action} (${mockDecision.confidence}% confidence)`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error forcing signal check:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to force signal check. Please try again.' 
      },
      { status: 500 }
    );
  }
}

/**
 * Generate random reasoning for demo purposes
 */
function generateRandomReasoning(): string {
  const reasons = [
    'Strong bullish momentum detected with RSI oversold recovery and volume spike',
    'Bearish reversal pattern confirmed with high volume breakdown',
    'Support level bounce with bullish divergence on MACD',
    'Resistance level break with strong momentum continuation',
    'Market consolidation phase, waiting for directional clarity',
    'Risk/reward ratio favorable for entry at current levels',
    'Take profit target reached, securing gains',
    'Stop loss triggered to limit downside risk',
    'Volatility spike detected, adjusting position sizing',
    'Technical indicators showing mixed signals, maintaining caution',
    'Trend continuation pattern confirmed with volume validation',
    'Market showing signs of exhaustion, considering exit',
    'Strong support/resistance level identified for entry',
    'Momentum indicators aligned with price action',
    'Market sentiment shift detected through volume analysis'
  ];

  return reasons[Math.floor(Math.random() * reasons.length)];
}
