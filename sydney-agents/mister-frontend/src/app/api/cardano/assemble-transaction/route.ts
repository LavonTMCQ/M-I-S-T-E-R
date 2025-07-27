import { NextRequest, NextResponse } from 'next/server';

/**
 * Assemble a complete signed transaction from CBOR and witness set
 * This avoids CSL import issues in the browser
 */
export async function POST(request: NextRequest) {
  try {
    const { txCbor, witnessSet } = await request.json();

    console.log(`🔧 Assembling transaction server-side...`);
    console.log(`   📦 Original CBOR: ${txCbor.length} characters`);
    console.log(`   ✍️ Witness set: ${witnessSet.length} characters`);

    // Import CSL browser version on server-side (we already have this installed)
    const CSL = await import('@emurgo/cardano-serialization-lib-browser');

    // Parse the original transaction
    const tx = CSL.Transaction.from_bytes(Buffer.from(txCbor, 'hex'));
    console.log(`✅ Parsed original transaction`);

    // Parse the witness set
    const witnesses = CSL.TransactionWitnessSet.from_bytes(Buffer.from(witnessSet, 'hex'));
    console.log(`✅ Parsed witness set`);

    // Combine them into a complete signed transaction
    const signedTx = CSL.Transaction.new(
      tx.body(),
      witnesses,
      tx.auxiliary_data() // metadata
    );

    const signedTxCbor = Buffer.from(signedTx.to_bytes()).toString('hex');
    console.log(`✅ Assembled complete transaction: ${signedTxCbor.length} characters`);

    return NextResponse.json({
      success: true,
      signedTxCbor: signedTxCbor,
      originalLength: txCbor.length,
      witnessLength: witnessSet.length,
      finalLength: signedTxCbor.length
    });

  } catch (error) {
    console.error('❌ Transaction assembly failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Transaction assembly failed' 
      },
      { status: 500 }
    );
  }
}
