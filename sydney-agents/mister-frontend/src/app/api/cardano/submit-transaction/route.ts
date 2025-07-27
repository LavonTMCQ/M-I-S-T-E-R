import { NextRequest, NextResponse } from 'next/server';

/**
 * Submit a signed transaction to the Cardano blockchain via Blockfrost
 * This bypasses wallet submission issues
 */
export async function POST(request: NextRequest) {
  try {
    const { signedTxCbor } = await request.json();

    console.log(`📤 Submitting transaction to Cardano blockchain...`);
    console.log(`   📦 Signed transaction: ${signedTxCbor.length} characters`);

    const blockfrostProjectId = process.env.BLOCKFROST_PROJECT_ID;
    if (!blockfrostProjectId) {
      throw new Error('BLOCKFROST_PROJECT_ID not configured');
    }

    // Submit to Blockfrost
    const submitResponse = await fetch('https://cardano-mainnet.blockfrost.io/api/v0/tx/submit', {
      method: 'POST',
      headers: {
        'project_id': blockfrostProjectId,
        'Content-Type': 'application/cbor',
      },
      body: Buffer.from(signedTxCbor, 'hex'),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error(`❌ Blockfrost submission failed: ${submitResponse.status}`);
      console.error(`❌ Error details: ${errorText}`);
      throw new Error(`Blockfrost submission failed: ${submitResponse.status} - ${errorText}`);
    }

    const txHash = await submitResponse.text();
    console.log(`✅ Transaction submitted successfully to blockchain: ${txHash}`);

    return NextResponse.json({
      success: true,
      txHash: txHash.replace(/"/g, ''), // Remove quotes if present
      message: 'Transaction submitted successfully to Cardano blockchain'
    });

  } catch (error) {
    console.error('❌ Transaction submission failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Transaction submission failed' 
      },
      { status: 500 }
    );
  }
}
