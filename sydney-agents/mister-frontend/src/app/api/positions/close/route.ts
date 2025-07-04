import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/positions/close
 * Close a specific position using REAL Strike Finance API
 * Takes position ID in request body instead of URL parameter
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { positionId, userId, reason } = body;

    if (!positionId) {
      return NextResponse.json(
        { success: false, error: 'Position ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Closing position ${positionId} via Strike Finance API...`);

    // Call the bridge server to get the close position CBOR
    const closeResponse = await fetch('http://localhost:4113/api/strike/close-position', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
