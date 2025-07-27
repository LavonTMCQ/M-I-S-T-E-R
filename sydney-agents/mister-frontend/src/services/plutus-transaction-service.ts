/**
 * Plutus Transaction Service
 * Handles smart contract interactions with proper script witnesses
 */

import { BlockfrostProvider } from '@meshsdk/core';

export class PlutusTransactionService {
  private blockfrostProvider: BlockfrostProvider;

  constructor() {
    const blockfrostApiKey = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
    this.blockfrostProvider = new BlockfrostProvider(blockfrostApiKey);
  }

  /**
   * Build Agent Vault V2 withdrawal transaction with proper script witness
   */
  async buildContractWithdrawal(params: {
    userAddress: string;
    contractAddress: string;
    contractUtxos: any[];
    userUtxos: any[];
    withdrawAmount: number; // in lovelace
  }): Promise<string> {
    try {
      console.log('🔧 Building REAL contract withdrawal with script witness...');
      console.log(`   👤 User: ${params.userAddress}`);
      console.log(`   🏦 Contract: ${params.contractAddress}`);
      console.log(`   💰 Withdrawing: ${params.withdrawAmount / 1000000} ADA`);

      // Agent Vault V2 contract details
      const AGENT_VAULT_SCRIPT = {
        type: 'PlutusV3',
        cborHex: '5870010100323232323225333002323232323253330073370e900118041baa0011323322533300a3370e900118059baa0011324a2601a60186ea800452898058009805980600098049baa001163009300a0033008002300700230070013004375400229309b2b2b9a5573aaae795d0aba201'
      };

      // UserWithdraw redeemer (constructor 1)
      const WITHDRAW_REDEEMER = {
        tag: 'SPEND',
        data: {
          alternative: 1, // UserWithdraw constructor
          fields: [params.withdrawAmount.toString()] // Amount in lovelace
        }
      };

      // Build transaction using CSL approach (more reliable for script witnesses)
      const txBuilder = await this.buildWithCSL(params, AGENT_VAULT_SCRIPT, WITHDRAW_REDEEMER);
      
      return txBuilder;

    } catch (error) {
      console.error('❌ Plutus transaction building failed:', error);
      throw error;
    }
  }

  /**
   * Build transaction using Cardano Serialization Library
   * More reliable for complex script witness handling
   */
  private async buildWithCSL(
    params: any,
    script: any,
    redeemer: any
  ): Promise<string> {
    console.log('🔧 Building transaction with CSL for script witness support...');

    // Use the working build-transaction API with script witness parameters
    const response = await fetch('/api/cardano/build-transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: params.userAddress,
        toAddress: params.userAddress, // Send back to user
        amount: params.withdrawAmount / 1000000, // Convert to ADA
        network: 'mainnet',
        metadata: {
          674: {
            msg: [`Agent Vault V2 Withdrawal: ${params.withdrawAmount / 1000000} ADA`],
            type: 'contract_withdrawal'
          }
        },
        // Script witness parameters
        contractUtxos: params.contractUtxos,
        script: script,
        redeemer: redeemer,
        includeScriptWitness: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CSL transaction building failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`CSL transaction building failed: ${result.error}`);
    }

    console.log(`✅ CSL transaction built successfully: ${result.cborHex.length} characters`);
    return result.cborHex;
  }

  /**
   * Submit signed transaction
   */
  async submitTransaction(signedTxCbor: string): Promise<string> {
    try {
      console.log('📤 Submitting Plutus transaction...');
      
      const txHash = await this.blockfrostProvider.submitTx(signedTxCbor);
      
      console.log(`✅ Plutus transaction submitted successfully: ${txHash}`);
      return txHash;

    } catch (error) {
      console.error('❌ Plutus transaction submission failed:', error);
      throw error;
    }
  }
}

export const plutusTransactionService = new PlutusTransactionService();
