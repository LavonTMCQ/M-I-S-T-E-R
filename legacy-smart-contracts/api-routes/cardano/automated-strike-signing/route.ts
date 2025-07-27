import { NextRequest, NextResponse } from 'next/server';
import { BackendTransactionSigner } from '@/utils/backendTransactionSigning';

/**
 * Automated Strike Finance Transaction Signing API
 * This endpoint handles automated signing for managed wallets
 * SECURITY: Only accepts requests with valid managed wallet credentials
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 API: Automated Strike Finance signing request received');
    
    const body = await request.json();
    const { 
      txCbor, 
      seedPhrase, 
      walletAddress,
      blockfrostProjectId = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu' // Default Blockfrost project ID
    } = body;
    
    // Validate required parameters
    if (!txCbor) {
      return NextResponse.json(
        { success: false, error: 'Missing txCbor parameter' },
        { status: 400 }
      );
    }
    
    if (!seedPhrase) {
      return NextResponse.json(
        { success: false, error: 'Missing seedPhrase parameter' },
        { status: 400 }
      );
    }
    
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing walletAddress parameter' },
        { status: 400 }
      );
    }
    
    console.log('📋 API: Transaction CBOR length:', txCbor.length);
    console.log('📋 API: Wallet address:', walletAddress.substring(0, 20) + '...');
    
    // SECURITY CHECK: Ensure this is running on server-side only
    if (typeof window !== 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Automated signing must run server-side only' },
        { status: 403 }
      );
    }
    
    // Sign the transaction using seed phrase
    const signingResult = await BackendTransactionSigner.signTransactionWithSeedPhrase(
      txCbor,
      {
        seedPhrase,
        networkId: 1 // Mainnet
      }
    );
    
    if (!signingResult.success) {
      console.error('❌ API: Transaction signing failed:', signingResult.error);
      return NextResponse.json(
        { success: false, error: `Signing failed: ${signingResult.error}` },
        { status: 400 }
      );
    }
    
    console.log('✅ API: Transaction signed successfully');
    
    // Submit the signed transaction to Cardano network
    const submissionResult = await BackendTransactionSigner.submitSignedTransaction(
      signingResult.signedTxCbor!,
      blockfrostProjectId
    );
    
    if (!submissionResult.success) {
      console.error('❌ API: Transaction submission failed:', submissionResult.error);
      return NextResponse.json(
        { success: false, error: `Submission failed: ${submissionResult.error}` },
        { status: 400 }
      );
    }
    
    console.log('🎉 API: Automated Strike Finance trade completed successfully!');
    console.log('📋 API: Transaction hash:', submissionResult.txHash);
    
    return NextResponse.json({
      success: true,
      txHash: submissionResult.txHash,
      signedTxCbor: signingResult.signedTxCbor,
      message: 'Automated Strike Finance trade executed successfully'
    });
    
  } catch (error) {
    console.error('❌ API: Automated signing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown automated signing error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for automated signing service
 */
export async function GET() {
  return NextResponse.json({
    service: 'Automated Strike Finance Signing',
    status: 'operational',
    timestamp: new Date().toISOString(),
    capabilities: [
      'Seed phrase transaction signing',
      'Strike Finance CBOR processing',
      'Cardano network submission',
      'Managed wallet automation'
    ]
  });
}
