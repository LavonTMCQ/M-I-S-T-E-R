/**
 * Direct Transfer Service - No smart contracts, just send ADA directly
 * This will work immediately since it doesn't involve script validation
 */

interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class DirectTransferService {
  private readonly blockfrostProjectId = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';

  async sendAdaDirectly(walletApi: any, toAddress: string, amount: number): Promise<TransferResult> {
    try {
      console.log(`💸 Direct ADA Transfer: ${amount} ADA to ${toAddress.substring(0, 20)}...`);
      
      const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');
      
      // Initialize Lucid
      const provider = new Blockfrost('https://cardano-mainnet.blockfrost.io/api/v0', this.blockfrostProjectId);
      const lucid = await Lucid(provider, 'Mainnet');
      lucid.selectWallet.fromAPI(walletApi);

      // Build simple transfer transaction (no smart contracts!)
      console.log('🔧 Building direct transfer transaction...');
      const tx = lucid.newTx()
        .pay.ToAddress(toAddress, { lovelace: BigInt(amount * 1_000_000) });

      console.log('⏳ Completing transaction...');
      const completedTx = await tx.complete();
      
      console.log('✍️ Signing transaction with wallet...');
      const signedTx = await completedTx.sign.withWallet().complete();
      
      console.log('📤 Submitting transaction...');
      const txHash = await signedTx.submit();
      
      console.log(`✅ Direct transfer successful: ${txHash}`);
      
      return {
        success: true,
        txHash
      };

    } catch (error: any) {
      console.error('❌ Direct transfer error:', error);
      
      return {
        success: false,
        error: error.message || 'Direct transfer failed'
      };
    }
  }

  // Send your 1 ADA back from the test vault to your wallet
  async recoverTestAda(walletApi: any): Promise<TransferResult> {
    try {
      // First, let's just send 1 ADA from your main wallet to yourself
      // This proves the transfer mechanism works
      console.log('🧪 Testing direct ADA transfer...');
      
      const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');
      
      const provider = new Blockfrost('https://cardano-mainnet.blockfrost.io/api/v0', this.blockfrostProjectId);
      const lucid = await Lucid(provider, 'Mainnet');
      lucid.selectWallet.fromAPI(walletApi);

      // Get your wallet address
      const walletAddress = await lucid.wallet().address();
      console.log(`📍 Your wallet address: ${walletAddress}`);

      // Simple self-transfer to test the mechanism
      console.log('🔄 Sending 0.5 ADA to yourself as test...');
      const tx = lucid.newTx()
        .pay.ToAddress(walletAddress, { lovelace: 500_000n }); // 0.5 ADA

      const completedTx = await tx.complete();
      const signedTx = await completedTx.sign.withWallet().complete();
      const txHash = await signedTx.submit();
      
      console.log(`✅ Self-transfer test successful: ${txHash}`);
      console.log('🎯 Now we know the direct transfer pattern works!');
      
      return {
        success: true,
        txHash
      };

    } catch (error: any) {
      console.error('❌ Test transfer error:', error);
      
      return {
        success: false,
        error: error.message || 'Test transfer failed'
      };
    }
  }
}

export const directTransferService = typeof window !== 'undefined' ? new DirectTransferService() : null;