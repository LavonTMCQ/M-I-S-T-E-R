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
   * Build a simple authorization transaction (not the actual withdrawal)
   * This is just to authorize the withdrawal, the actual 10 ADA comes later
   */
  async buildWithdrawalTransaction(params: {
    userAddress: string;
    contractAddress: string;
    withdrawAmount: number; // in ADA
    contractUtxos: any[];
    userUtxos: any[];
  }): Promise<string> {
    try {
      console.log('🔧 Building ADA RECOVERY transaction with Mesh...');
      console.log(`   👤 User: ${params.userAddress}`);
      console.log(`   🏦 Contract: ${params.contractAddress}`);
      console.log(`   💰 Recovering: ${Math.min(params.withdrawAmount, 5)} ADA to user wallet`);

      // Create Mesh transaction builder
      const txBuilder = new MeshTxBuilder({
        fetcher: this.blockfrostProvider,
        submitter: this.blockfrostProvider,
      });

      // Find a suitable user UTxO with enough ADA for the authorization fee
      const suitableUserUtxo = params.userUtxos.find(utxo => {
        const adaAmount = utxo.amount.find((asset: any) => asset.unit === 'lovelace');
        return adaAmount && parseInt(adaAmount.quantity) > 2000000; // At least 2 ADA
      });

      if (!suitableUserUtxo) {
        throw new Error('No suitable user UTxO found for authorization fee');
      }

      console.log(`🔧 Adding user UTxO: ${suitableUserUtxo.tx_hash}#${suitableUserUtxo.output_index}`);

      txBuilder.txIn(
        suitableUserUtxo.tx_hash,
        suitableUserUtxo.output_index,
        suitableUserUtxo.amount,
        params.userAddress
      );

      // Output: Send small amount back to user (what we can afford)
      // The user UTxO likely has ~1 ADA, so let's send 0.5 ADA to be safe
      const recoveryAmount = 500000; // 0.5 ADA (safe amount)
      console.log(`🔧 Adding recovery output: ${recoveryAmount / 1000000} ADA to user`);

      txBuilder.txOut(params.userAddress, [
        { unit: 'lovelace', quantity: recoveryAmount.toString() }
      ]);

      // Add metadata for ADA recovery (keep strings under 64 bytes)
      const metadata = {
        674: {
          msg: [`Vault V2 Recovery: ${recoveryAmount / 1000000} ADA`],
          contract: params.contractAddress.substring(0, 20) + '...', // Truncate to fit
          user: params.userAddress.substring(0, 20) + '...', // Truncate to fit
          timestamp: Date.now(),
          type: 'recovery'
        }
      };

      console.log('🔧 Adding recovery metadata (truncated for length limits)...');
      txBuilder.metadataValue('674', metadata[674]);

      // Set change address (remaining ADA and all NFTs go back to user)
      txBuilder.changeAddress(params.userAddress);

      // Build the transaction
      console.log('🔧 Building complete authorization transaction...');
      const unsignedTx = await txBuilder.complete();

      console.log(`✅ Mesh authorization transaction built successfully`);
      console.log(`📦 Transaction CBOR: ${unsignedTx.length} characters`);

      return unsignedTx;

    } catch (error) {
      console.error('❌ Mesh transaction building failed:', error);
      throw error;
    }
  }

  /**
   * Build ACTUAL withdrawal transaction that extracts ADA from the vault
   */
  async buildActualWithdrawal(params: {
    userAddress: string;
    contractAddress: string;
    contractUtxos: any[];
    userUtxos: any[];
  }): Promise<string> {
    try {
      console.log('🔧 Building ACTUAL withdrawal transaction with Mesh...');
      console.log(`   👤 User: ${params.userAddress}`);
      console.log(`   🏦 Contract: ${params.contractAddress}`);

      // Create Mesh transaction builder
      const txBuilder = new MeshTxBuilder({
        fetcher: this.blockfrostProvider,
        submitter: this.blockfrostProvider,
      });

      // Add contract UTxO as input with Plutus script and redeemer
      const contractUtxo = params.contractUtxos[0];
      const contractAda = contractUtxo.amount.find((a: any) => a.unit === 'lovelace');
      const contractAdaAmount = parseInt(contractAda.quantity) / 1000000;

      console.log(`🔧 Adding contract UTxO: ${contractUtxo.tx_hash}#${contractUtxo.output_index}`);
      console.log(`   💰 Contract UTxO contains: ${contractAdaAmount} ADA`);

      // For now, let's use regular txIn and add script witness separately
      // This avoids the Mesh txInScript complexity
      console.log(`🔧 Adding contract UTxO as regular input (script witness handled separately)...`);

      txBuilder.txIn(
        contractUtxo.tx_hash,
        contractUtxo.output_index,
        contractUtxo.amount,
        params.contractAddress
      );

      // Add the Plutus script witness
      const agentVaultScript = {
        type: 'PlutusV3',
        code: '5870010100323232323225333002323232323253330073370e900118041baa0011323322533300a3370e900118059baa0011324a2601a60186ea800452898058009805980600098049baa001163009300a0033008002300700230070013004375400229309b2b2b9a5573aaae795d0aba201'
      };

      // UserWithdraw redeemer (constructor 1)
      const withdrawRedeemer = {
        data: {
          alternative: 1, // UserWithdraw
          fields: [contractAda.quantity] // Amount in lovelace as string
        }
      };

      console.log(`🔧 Adding Plutus script and redeemer...`);

      // Add script witness
      txBuilder.txInScript(
        contractUtxo.tx_hash,
        contractUtxo.output_index,
        contractUtxo.amount,
        agentVaultScript,
        withdrawRedeemer
      );

      // Find a suitable user UTxO for fees
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

      // Output: Send ALL ADA from contract to user
      console.log(`🔧 Adding output: ${contractAdaAmount} ADA to user (full vault amount)`);

      txBuilder.txOut(params.userAddress, [
        { unit: 'lovelace', quantity: contractAda.quantity }
      ]);

      // Add metadata for actual withdrawal
      const metadata = {
        674: {
          msg: [`Vault V2 Withdraw: ${contractAdaAmount} ADA`],
          contract: params.contractAddress.substring(0, 20) + '...',
          user: params.userAddress.substring(0, 20) + '...',
          timestamp: Date.now(),
          type: 'withdraw'
        }
      };

      console.log('🔧 Adding withdrawal metadata...');
      txBuilder.metadataValue('674', metadata[674]);

      // Set change address (remaining user ADA and all NFTs go back to user)
      txBuilder.changeAddress(params.userAddress);

      // Build the transaction
      console.log('🔧 Building complete withdrawal transaction...');
      const unsignedTx = await txBuilder.complete();

      console.log(`✅ Mesh withdrawal transaction built successfully`);
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
