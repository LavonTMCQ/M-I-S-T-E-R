import { MeshTxBuilder, BlockfrostProvider, MeshWallet } from '@meshsdk/core';

/**
 * Mesh-based transaction service for Agent Vault V2 withdrawals
 * Handles fee calculation, UTxO selection, and metadata properly
 */
export class MeshTransactionService {
  private blockfrostProvider: BlockfrostProvider;

  constructor() {
    const blockfrostApiKey = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
    this.blockfrostProvider = new BlockfrostProvider(blockfrostApiKey);
  }

  /**
   * Build Agent Vault V2 withdrawal transaction using Mesh
   */
  async buildWithdrawalTransaction(params: {
    userAddress: string;
    contractAddress: string;
    withdrawAmount: number; // in ADA
    contractUtxos: any[];
    userUtxos: any[];
  }): Promise<string> {
    try {
      console.log('🔧 Building withdrawal transaction with Mesh...');
      console.log(`   👤 User: ${params.userAddress}`);
      console.log(`   🏦 Contract: ${params.contractAddress}`);
      console.log(`   💰 Amount: ${params.withdrawAmount} ADA`);

      // Create Mesh transaction builder
      const txBuilder = new MeshTxBuilder({
        fetcher: this.blockfrostProvider,
        submitter: this.blockfrostProvider,
      });

      // Add contract UTxO as input (the one with 10 ADA)
      const contractUtxo = params.contractUtxos[0];
      console.log(`🔧 Adding contract UTxO: ${contractUtxo.tx_hash}#${contractUtxo.output_index}`);
      
      txBuilder.txIn(
        contractUtxo.tx_hash,
        contractUtxo.output_index,
        contractUtxo.amount, // All assets in the UTxO
        params.contractAddress
      );

      // Add user UTxO for fees (find one with sufficient ADA)
      const suitableUserUtxo = params.userUtxos.find(utxo => {
        const adaAmount = utxo.amount.find((asset: any) => asset.unit === 'lovelace');
        return adaAmount && parseInt(adaAmount.quantity) > 2000000; // At least 2 ADA for fees
      });

      if (!suitableUserUtxo) {
        throw new Error('No suitable user UTxO found for fees');
      }

      console.log(`🔧 Adding user UTxO for fees: ${suitableUserUtxo.tx_hash}#${suitableUserUtxo.output_index}`);

      txBuilder.txIn(
        suitableUserUtxo.tx_hash,
        suitableUserUtxo.output_index,
        suitableUserUtxo.amount,
        params.userAddress
      );

      // Output: Send withdrawn ADA to user
      const withdrawAmountLovelace = params.withdrawAmount * 1_000_000;
      console.log(`🔧 Adding output: ${withdrawAmountLovelace} lovelace to user`);
      
      txBuilder.txOut(params.userAddress, [
        { unit: 'lovelace', quantity: withdrawAmountLovelace.toString() }
      ]);

      // Add metadata for withdrawal authorization
      const metadata = {
        674: {
          msg: [`Agent Vault V2 Withdrawal: ${params.withdrawAmount} ADA`],
          contract: params.contractAddress,
          user: params.userAddress,
          timestamp: Date.now()
        }
      };
      
      console.log('🔧 Adding withdrawal metadata...');
      txBuilder.metadataValue('674', metadata[674]);

      // Set change address
      txBuilder.changeAddress(params.userAddress);

      // Build the transaction
      console.log('🔧 Building complete transaction...');
      const unsignedTx = await txBuilder.complete();
      
      console.log(`✅ Mesh transaction built successfully`);
      console.log(`📦 Transaction CBOR: ${unsignedTx.length} characters`);

      return unsignedTx;

    } catch (error) {
      console.error('❌ Mesh transaction building failed:', error);
      throw error;
    }
  }

  /**
   * Submit signed transaction using Mesh
   */
  async submitTransaction(signedTxCbor: string): Promise<string> {
    try {
      console.log('📤 Submitting transaction via Mesh/Blockfrost...');
      
      const txHash = await this.blockfrostProvider.submitTx(signedTxCbor);
      
      console.log(`✅ Transaction submitted successfully: ${txHash}`);
      return txHash;

    } catch (error) {
      console.error('❌ Mesh transaction submission failed:', error);
      throw error;
    }
  }
}

export const meshTransactionService = new MeshTransactionService();
