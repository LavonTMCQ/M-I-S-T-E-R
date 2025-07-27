/**
 * Cardano Transaction Signing API
 * Combines original transaction CBOR with wallet witness set to create complete signed transaction
 * Uses server-side CSL to avoid browser compatibility issues
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Proper Cardano transaction signing using CSL
 */
async function properCardanoTransactionSigning(
  txCbor: string, 
  witnessSetCbor: string
): Promise<{ success: boolean; signedTxCbor?: string; error?: string }> {
  try {
    console.log('🔧 CSL: Starting proper transaction signing...');
    console.log('📋 CSL: Input transaction CBOR length:', txCbor.length);
    console.log('📋 CSL: Input witness set CBOR length:', witnessSetCbor.length);

    // Use CSL browser version (works in Next.js API routes)
    const CSL = await import('@emurgo/cardano-serialization-lib-browser');
    console.log('✅ CSL: Library imported successfully');
    
    // Parse the original transaction from the API
    console.log('🔍 CSL: Parsing original transaction...');
    const originalTx = CSL.Transaction.from_bytes(Buffer.from(txCbor, 'hex'));
    const txBody = originalTx.body();
    console.log('✅ CSL: Original transaction parsed successfully');

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

    const signedTxCbor = Buffer.from(signedTx.to_bytes()).toString('hex');
    console.log('✅ CSL: Complete signed transaction created successfully');
    console.log(`📦 CSL: Signed transaction CBOR length: ${signedTxCbor.length} characters`);

    return {
      success: true,
      signedTxCbor: signedTxCbor
    };
  } catch (error) {
    console.error('❌ CSL: Transaction signing failed:', error);
    console.log('🔄 CSL: Trying Mesh SDK fallback...');

    try {
      // Fallback to Mesh SDK for CBOR combination
      const { Transaction, deserializeTransaction } = await import('@meshsdk/core');

      console.log('🔧 Mesh: Attempting transaction reconstruction...');

      // For now, let's try a simpler approach - just return the witness set
      // and let the client handle it differently
      return {
        success: false,
        error: 'CSL failed, need alternative approach: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    } catch (meshError) {
      console.error('❌ Mesh: Fallback also failed:', meshError);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown CSL error'
      };
    }
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
    
    // Use proper Cardano Serialization Library
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
    console.error('❌ Server: Transaction signing failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
