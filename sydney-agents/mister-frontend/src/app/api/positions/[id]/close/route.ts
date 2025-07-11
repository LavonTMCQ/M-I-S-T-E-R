import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/positions/[id]/close
 * Close a specific position using REAL Strike Finance API
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const positionId = params.id;
    const body = await request.json();
    const { userId, reason } = body;

    if (!positionId) {
      return NextResponse.json(
        { success: false, error: 'Position ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Closing position ${positionId} via Strike Finance API...`);

    // Get the authorization header from the original request
    const authHeader = request.headers.get('authorization');

    // Call the bridge server to get the close position CBOR
    const closeResponse = await fetch('http://localhost:4113/api/strike/close-position', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader })
      },
      body: JSON.stringify({
        positionId: positionId,
        reason: reason || 'Manual close from trading interface'
      })
    });

    if (!closeResponse.ok) {
      const errorData = await closeResponse.json();
      console.error('❌ Strike Finance close position failed:', errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || 'Failed to close position via Strike Finance'
        },
        { status: closeResponse.status }
      );
    }

    const closeResult = await closeResponse.json();

    if (closeResult.success && closeResult.data?.cbor) {
      console.log(`✅ Strike Finance close position CBOR received for position: ${positionId}`);

      // Return the CBOR for frontend wallet signing
      // The frontend will handle wallet signing and transaction submission
      return NextResponse.json({
        success: true,
        data: {
          positionId,
          cbor: closeResult.data.cbor,
          requiresSigning: true,
          reason: closeResult.data.reason,
          timestamp: closeResult.data.timestamp
        },
        message: 'Position close transaction ready for wallet signing'
      });
    } else {
      console.error('❌ Strike Finance returned error or missing CBOR:', closeResult.error);
      return NextResponse.json(
        {
          success: false,
          error: closeResult.error || 'Strike Finance close position failed - no CBOR received'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Error closing position:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to close position. Please try again.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/positions/[id]/close
 * Get close position preview/simulation
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const positionId = params.id;

    if (!positionId) {
      return NextResponse.json(
        { success: false, error: 'Position ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Getting close preview for position ${positionId}...`);

    // In production, this would calculate actual close preview:
    // const executionService = ExecutionService.getInstance();
    // const strikeAPI = new StrikeFinanceAPI();
    // 
    // const position = await executionService.getPosition(positionId);
    // const currentMarketPrice = await strikeAPI.getCurrentPrice(position.pair);
    // const closePreview = await strikeAPI.getClosePreview(position, currentMarketPrice);

    // Mock close preview for demo
    const closePreview = {
      positionId,
      currentPrice: 0.4687,
      estimatedPnl: 164.00,
      estimatedPnlPercent: 3.63,
      estimatedFees: 2.34,
      netPnl: 161.66,
      slippage: 0.001,
      estimatedClosePrice: 0.4682,
      canClose: true,
      warnings: []
    };

    console.log(`✅ Close preview generated for position ${positionId}`);

    return NextResponse.json({
      success: true,
      data: closePreview
    });

  } catch (error) {
    console.error('❌ Error generating close preview:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate close preview. Please try again.' 
      },
      { status: 500 }
    );
  }
}
