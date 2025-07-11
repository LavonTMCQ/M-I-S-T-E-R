import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side transaction submission (Strike Finance approach)
 * This matches exactly how Strike Finance submits transactions - server-side only, no wallet submitTx
 */
export async function POST(request: NextRequest) {
  try {
    const { signedTxCbor } = await request.json();
    
    if (!signedTxCbor) {
      return NextResponse.json(
        { success: false, error: 'Missing signedTxCbor' },
        { status: 400 }
      );
    }
    
    console.log('🚀 Server: Submitting transaction to Cardano network (Strike Finance approach)...');
    console.log('📋 Server: Transaction CBOR length:', signedTxCbor.length);
    
    // Submit to Blockfrost (same as Strike Finance backend approach)
    const response = await fetch('https://cardano-mainnet.blockfrost.io/api/v0/tx/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/cbor',
        'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
      },
      body: Buffer.from(signedTxCbor, 'hex')
    });

    if (response.ok) {
      const txHash = await response.text();
      console.log('✅ Server: Transaction submitted successfully via Blockfrost:', txHash);
      return NextResponse.json({
        success: true,
        txHash: txHash
      });
    } else {
      const errorText = await response.text();
      console.error('❌ Server: Blockfrost submission failed:', errorText);
      return NextResponse.json(
        { success: false, error: `Blockfrost submission failed: ${errorText}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Server: Transaction submission error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown submission error' },
      { status: 500 }
    );
  }
}
