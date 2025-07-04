import { NextRequest, NextResponse } from 'next/server';
import { TradingDecision } from '@/types/api';

// This would import our actual backend services
// import { SignalService } from '@/backend/services/signal-service';

/**
 * GET /api/ai-signals
 * Get AI signal history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const action = searchParams.get('action'); // 'Open', 'Close', 'Hold'

    console.log(`📡 Fetching AI signal history...`);

    // In production, this would integrate with SignalService:
    // const signalService = SignalService.getInstance();
    // const signalHistory = await signalService.getSignalHistory(limit, action);

    // Mock signal history data for demo
    const mockSignals: (TradingDecision & { id: string; timestamp: string })[] = [
      {
        id: '1',
        action: 'Open',
        side: 'Long',
        leverage: 2,
        positionSize: 5000,
        collateralAmount: 1130.75,
        enteredPrice: 0.4523,
        confidence: 87,
        reasoning: 'Strong bullish momentum detected with RSI oversold recovery and volume spike',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        action: 'Hold',
        confidence: 65,
        reasoning: 'Market conditions neutral, waiting for clearer directional signal',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        action: 'Close',
        confidence: 92,
        reasoning: 'Take profit target reached, risk/reward ratio no longer favorable',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        action: 'Open',
        side: 'Short',
        leverage: 3,
        positionSize: 2500,
        collateralAmount: 352.83,
        enteredPrice: 0.4234,
        confidence: 78,
        reasoning: 'Bearish reversal pattern confirmed with high volume breakdown',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '5',
        action: 'Hold',
        confidence: 45,
        reasoning: 'Mixed signals from technical indicators, market indecision',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '6',
        action: 'Open',
        side: 'Long',
        leverage: 2,
        positionSize: 3000,
        collateralAmount: 615.00,
        enteredPrice: 0.4100,
        confidence: 91,
        reasoning: 'Strong support level bounce with bullish divergence on MACD',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '7',
        action: 'Close',
        confidence: 85,
        reasoning: 'Profit target achieved, market showing signs of consolidation',
        timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '8',
        action: 'Hold',
        confidence: 55,
        reasoning: 'Waiting for breakout confirmation above resistance level',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Filter by action if provided
    let filteredSignals = mockSignals;
    if (action && action !== 'all') {
      filteredSignals = mockSignals.filter(signal => signal.action === action);
    }

    // Apply limit
    const limitedSignals = filteredSignals.slice(0, limit);

    // Calculate signal statistics
    const totalSignals = filteredSignals.length;
    const openSignals = filteredSignals.filter(s => s.action === 'Open').length;
    const closeSignals = filteredSignals.filter(s => s.action === 'Close').length;
    const holdSignals = filteredSignals.filter(s => s.action === 'Hold').length;
    const avgConfidence = filteredSignals.reduce((sum, s) => sum + (s.confidence || 0), 0) / totalSignals;

    const statistics = {
      totalSignals,
      openSignals,
      closeSignals,
      holdSignals,
      avgConfidence: Math.round(avgConfidence)
    };

    console.log(`✅ Found ${limitedSignals.length} AI signals`);

    return NextResponse.json({
      success: true,
      data: {
        signals: limitedSignals,
        statistics
      }
    });

  } catch (error) {
    console.error('❌ Error fetching AI signals:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch AI signals. Please try again.' 
      },
      { status: 500 }
    );
  }
}
