/**
 * PROPER Cardano transaction signing using Cardano Serialization Library
 * This completely replaces the broken string-based CBOR manipulation
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Proper Cardano transaction signing using Cardano Serialization Library
 * This is the CORRECT way to handle CBOR transactions
 */
async function properCardanoTransactionSigning(
  txCbor: string, 
  witnessSetCbor: string
): Promise<{ success: boolean; signedTxCbor?: string; error?: string }> {
  try {
    console.log('🔧 CSL: Starting proper Cardano transaction signing...');
    
    // Import the browser version of Cardano Serialization Library (works better in Next.js)
    const CSL = await import('@emurgo/cardano-serialization-lib-browser');
    console.log('✅ CSL: Cardano Serialization Library loaded');
    
    // Parse the original transaction from Strike Finance
    console.log('🔍 CSL: Parsing Strike Finance transaction...');
    const originalTx = CSL.Transaction.from_bytes(Buffer.from(txCbor, 'hex'));
    console.log('✅ CSL: Original transaction parsed successfully');
    
    // Extract the transaction body (this is what we want to keep)
    const txBody = originalTx.body();
    console.log('✅ CSL: Transaction body extracted');
    
    // Parse the witness set from the wallet
    console.log('🔍 CSL: Parsing wallet witness set...');
    const walletWitnessSet = CSL.TransactionWitnessSet.from_bytes(Buffer.from(witnessSetCbor, 'hex'));
    console.log('✅ CSL: Wallet witness set parsed successfully');
    
    // Get any existing witness set from the original transaction
    const originalWitnessSet = originalTx.witness_set();
    
    // Create a new combined witness set
    console.log('🔧 CSL: Combining witness sets...');
    const combinedWitnessSet = CSL.TransactionWitnessSet.new();
    
    // Add witnesses from wallet
    const walletVkeys = walletWitnessSet.vkeys();
    if (walletVkeys) {
      combinedWitnessSet.set_vkeys(walletVkeys);
      console.log('✅ CSL: Added wallet vkey witnesses');
    }
    
    // Add any existing witnesses from original transaction
    if (originalWitnessSet) {
      const originalVkeys = originalWitnessSet.vkeys();
      if (originalVkeys) {
        // If we already have vkeys, we need to merge them
        const existingVkeys = combinedWitnessSet.vkeys() || CSL.Vkeywitnesses.new();
        for (let i = 0; i < originalVkeys.len(); i++) {
          existingVkeys.add(originalVkeys.get(i));
        }
        combinedWitnessSet.set_vkeys(existingVkeys);
        console.log('✅ CSL: Merged original vkey witnesses');
      }
      
      // Copy other witness types if they exist
      const nativeScripts = originalWitnessSet.native_scripts();
      if (nativeScripts) {
        combinedWitnessSet.set_native_scripts(nativeScripts);
      }
      
      const plutusScripts = originalWitnessSet.plutus_scripts();
      if (plutusScripts) {
        combinedWitnessSet.set_plutus_scripts(plutusScripts);
      }
      
      const plutusData = originalWitnessSet.plutus_data();
      if (plutusData) {
        combinedWitnessSet.set_plutus_data(plutusData);
      }
      
      const redeemers = originalWitnessSet.redeemers();
      if (redeemers) {
        combinedWitnessSet.set_redeemers(redeemers);
      }
    }
    
    // Get auxiliary data if it exists
    const auxiliaryData = originalTx.auxiliary_data();
    
    // Create the final signed transaction
    console.log('🔧 CSL: Building final signed transaction...');
    const signedTx = CSL.Transaction.new(
      txBody,
      combinedWitnessSet,
      auxiliaryData
    );
    
    // Convert back to CBOR hex
    const signedTxCbor = Buffer.from(signedTx.to_bytes()).toString('hex');
    console.log('✅ CSL: Final transaction built successfully');
    console.log('📋 CSL: Original length:', txCbor.length, 'Final length:', signedTxCbor.length);
    
    return {
      success: true,
      signedTxCbor
    };
    
  } catch (error) {
    console.error('❌ CSL: Proper transaction signing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown CSL error'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚨 PROPER CARDANO TRANSACTION SIGNING! 🚨');
    console.log('🔧 Server: Using Cardano Serialization Library...');
    
    const body = await request.json();
    const { txCbor, witnessSetCbor } = body;
    
    if (!txCbor || !witnessSetCbor) {
      return NextResponse.json(
        { success: false, error: 'Missing txCbor or witnessSetCbor' },
        { status: 400 }
      );
    }
    
    console.log('📋 Server: Input transaction CBOR length:', txCbor.length);
    console.log('📋 Server: Input witness set CBOR length:', witnessSetCbor.length);
    
    // NEW APPROACH: Use proper Cardano Serialization Library
    const result = await properCardanoTransactionSigning(txCbor, witnessSetCbor);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    console.log('✅ Server: Transaction properly signed using CSL');
    console.log('📋 Server: Final transaction length:', result.signedTxCbor?.length || 0);
    
    return NextResponse.json({
      success: true,
      signedTxCbor: result.signedTxCbor
    });
    
  } catch (error) {
    console.error('❌ Server: Proper transaction signing failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
