import { NextRequest, NextResponse } from 'next/server';
import { AIActivity } from '@/types/api';

// This would import our actual backend services
// import { SignalService } from '@/backend/services/signal-service';
// import { ExecutionService } from '@/backend/services/execution-service';

/**
 * GET /api/ai-activity
 * Get AI activity feed for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const since = searchParams.get('since'); // ISO timestamp
    const type = searchParams.get('type'); // 'trade', 'signal', 'analysis', 'error'

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🤖 Fetching AI activity for user ${userId}...`);

    // In production, this would integrate with SignalService and ExecutionService:
    // const signalService = SignalService.getInstance();
    // const executionService = ExecutionService.getInstance();
    // 
    // // Get recent signals and execution results
    // const recentSignals = await signalService.getRecentSignals(limit);
    // const executionResults = await executionService.getRecentExecutions(userId, limit);
    // 
    // // Combine and format activity data
    // const activity = await formatActivityFeed(recentSignals, executionResults);

    // Mock AI activity data for demo
    const mockActivity: AIActivity[] = [
      {
        id: '1',
        action: 'Opened Long Position',
        description: 'TITAN2K strategy detected strong bullish momentum',
        pair: 'ADA/USD',
        amount: 5000,
        price: 0.4523,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        txHash: '0x1234567890abcdef1234567890abcdef12345678'
      },
      {
        id: '2',
        action: 'Signal Generated',
        description: 'TITAN2K detected potential long entry opportunity',
        pair: 'ADA/USD',
        timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
        status: 'info'
      },
      {
        id: '3',
        action: 'Market Analysis',
        description: 'Analyzed 200 data points, trend confidence: 87%',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        status: 'info'
      },
      {
        id: '4',
        action: 'Risk Assessment',
        description: 'Portfolio risk level: Low (15% of available balance)',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        status: 'success'
      },
      {
        id: '5',
        action: 'Closed Short Position',
        description: 'Take profit triggered at +1.84% gain',
        pair: 'ADA/USD',
        amount: 2500,
        price: 0.4156,
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        txHash: '0xabcdef1234567890abcdef1234567890abcdef12'
      },
      {
        id: '6',
        action: 'Signal Generated',
        description: 'TITAN2K detected potential short entry opportunity',
        pair: 'ADA/USD',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        status: 'info'
      },
      {
        id: '7',
        action: 'Opened Short Position',
        description: 'TITAN2K strategy detected bearish reversal pattern',
        pair: 'ADA/USD',
        amount: 2500,
        price: 0.4234,
        timestamp: new Date(Date.now() - 6.5 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        txHash: '0x567890abcdef1234567890abcdef1234567890ab'
      },
      {
        id: '8',
        action: 'Market Analysis',
        description: 'Volatility spike detected, adjusting position sizing',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        status: 'info'
      },
      {
        id: '9',
        action: 'System Check',
        description: 'All systems operational, connection to Strike Finance stable',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        status: 'success'
      },
      {
        id: '10',
        action: 'Error Recovery',
        description: 'Temporary connection issue resolved, resuming normal operations',
        timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        status: 'error'
      }
    ];

    // Filter by timestamp if 'since' parameter provided
    let filteredActivity = mockActivity;
    if (since) {
      const sinceDate = new Date(since);
      filteredActivity = mockActivity.filter(activity => 
        new Date(activity.timestamp) > sinceDate
      );
    }

    // Filter by type if provided
    if (type) {
      filteredActivity = filteredActivity.filter(activity => {
        switch (type) {
          case 'trade':
            return activity.action.includes('Position') || activity.action.includes('Closed');
          case 'signal':
            return activity.action.includes('Signal');
          case 'analysis':
            return activity.action.includes('Analysis') || activity.action.includes('Assessment');
          case 'error':
            return activity.status === 'error';
          default:
            return true;
        }
      });
    }

    // Apply limit
    const limitedActivity = filteredActivity.slice(0, limit);

    console.log(`✅ Found ${limitedActivity.length} AI activities for user ${userId}`);

    return NextResponse.json({
      success: true,
      data: limitedActivity
    });

  } catch (error) {
    console.error('❌ Error fetching AI activity:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch AI activity. Please try again.' 
      },
      { status: 500 }
    );
  }
}
