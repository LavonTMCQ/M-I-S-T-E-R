/**
 * WORKING VAULT SERVICE
 * Based on proven patterns from Aiken examples and Lucid documentation
 * This uses the simplest possible approach that's known to work
 */

import { Data } from '@lucid-evolution/lucid';

// The compiled CBOR hex of our ultra_simple_vault (always succeeds)
// This is the safest approach for testing - we'll use a validator that always returns True
// This CBOR is for: validator simple_vault { else(_) { True } }
const ULTRA_SIMPLE_VALIDATOR_CBOR = '5834010100323232322533300232323232324a260106012006600e004600c004600c00260066ea8004526136565734aae795d0aba201';

// Alternative: Compiled CBOR for working_vault (with owner check)
// We'll switch to this once basic testing works
const WORKING_VAULT_CBOR = '590115590112010000323232323232323222323232325333009323232533300c3370e900018061baa001132323253330113370e90001806980698069baa00113253333015301837540062930b0b18031baa001132533301230143754004264646464a66602e60340042a66602e60340042a66602e60346ea8004526163009008375c60300026eb8c058004dd71809800980998099baa00113253330143370e900018079baa00113253333018301b37540062930b0b18031baa001132533301530173754004264646464a666036603c0042a666036603c0042a666036603c6ea8004526163010009375c60380026eb8c068004dd71809800980b180b1baa00113253330193370e900018089baa001132533301a301c37540022a666036603c6ea8004526163010009375c60380026eb8c068004dd71809800980b180b1baa00113253333019301c37540062930b0b18031baa001132533301a301c3754002660386ea8c070004c064008c05c004c05c008dd6980a000980a001bae3014001375c60240026eacc044004c044008c03c004c03c008c034004c02c008c024004c024008c01c004c010008c008004c00800452613656375c0026ea80041';

interface VaultResult {
  success: boolean;
  txHash?: string;
  error?: string;
  scriptAddress?: string;
}

export class WorkingVaultService {
  private lucid: any = null;
  private scriptAddress: string = '';
  
  /**
   * Initialize the service with Lucid
   */
  async initialize(walletApi: any): Promise<void> {
    try {
      const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');
      
      // Use mainnet with proxy
      const provider = new Blockfrost(
        '/api/blockfrost',
        'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
      );
      
      this.lucid = await Lucid(provider, 'Mainnet');
      this.lucid.selectWallet.fromAPI(walletApi);
      
      // Generate script address from validator
      const script = {
        type: 'PlutusV3',
        script: ULTRA_SIMPLE_VALIDATOR_CBOR
      };
      
      this.scriptAddress = this.lucid.utils.validatorToAddress(script);
      console.log('✅ Vault initialized with address:', this.scriptAddress);
      
    } catch (error: any) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Deposit ADA to the vault (SIMPLE VERSION)
   */
  async deposit(amount: number): Promise<VaultResult> {
    try {
      if (!this.lucid) {
        throw new Error('Service not initialized');
      }
      
      console.log(`💰 Depositing ${amount} ADA to vault...`);
      
      // Get wallet address for datum
      const walletAddress = await this.lucid.wallet().address();
      const walletPkh = this.lucid.utils.getAddressDetails(walletAddress).paymentCredential?.hash;
      
      if (!walletPkh) {
        throw new Error('Could not get wallet PKH');
      }
      
      // Create simple datum with owner PKH
      const datum = Data.to({
        owner: walletPkh
      });
      
      // Build transaction
      const tx = await this.lucid
        .newTx()
        .pay.ToAddressWithData(
          this.scriptAddress,
          { kind: "inline", value: datum },
          { lovelace: BigInt(amount * 1_000_000) }
        )
        .complete();
      
      // Sign and submit
      const signedTx = await tx.sign.withWallet().complete();
      const txHash = await signedTx.submit();
      
      console.log(`✅ Deposit successful! TX: ${txHash}`);
      
      return {
        success: true,
        txHash,
        scriptAddress: this.scriptAddress
      };
      
    } catch (error: any) {
      console.error('❌ Deposit failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Withdraw ADA from the vault (SIMPLE VERSION)
   */
  async withdraw(): Promise<VaultResult> {
    try {
      if (!this.lucid) {
        throw new Error('Service not initialized');
      }
      
      console.log('💸 Withdrawing from vault...');
      
      // Get UTxOs at script address
      const utxos = await this.lucid.utxosAt(this.scriptAddress);
      
      if (utxos.length === 0) {
        throw new Error('No UTxOs found in vault');
      }
      
      console.log(`📦 Found ${utxos.length} UTxOs in vault`);
      
      // Calculate total
      const totalLovelace = utxos.reduce((sum: bigint, utxo: any) => {
        return sum + BigInt(utxo.assets.lovelace || 0);
      }, 0n);
      
      console.log(`💰 Total in vault: ${Number(totalLovelace) / 1_000_000} ADA`);
      
      // Create redeemer (simple for ultra_simple_vault)
      const redeemer = Data.to('Withdraw');
      
      // Get wallet address
      const walletAddress = await this.lucid.wallet().address();
      
      // Build withdrawal transaction
      const tx = await this.lucid
        .newTx()
        .collectFrom(utxos, redeemer)
        .attach.SpendingValidator({
          type: 'PlutusV3',
          script: ULTRA_SIMPLE_VALIDATOR_CBOR
        })
        .pay.ToAddress(walletAddress, { 
          lovelace: totalLovelace - 2_000_000n // Leave 2 ADA for fees
        })
        .complete();
      
      // Sign and submit
      const signedTx = await tx.sign.withWallet().complete();
      const txHash = await signedTx.submit();
      
      console.log(`✅ Withdrawal successful! TX: ${txHash}`);
      
      return {
        success: true,
        txHash
      };
      
    } catch (error: any) {
      console.error('❌ Withdrawal failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Check vault balance
   */
  async getBalance(): Promise<number> {
    try {
      if (!this.lucid) {
        throw new Error('Service not initialized');
      }
      
      const utxos = await this.lucid.utxosAt(this.scriptAddress);
      
      const totalLovelace = utxos.reduce((sum: bigint, utxo: any) => {
        return sum + BigInt(utxo.assets.lovelace || 0);
      }, 0n);
      
      return Number(totalLovelace) / 1_000_000;
      
    } catch (error: any) {
      console.error('❌ Balance check failed:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const workingVaultService = typeof window !== 'undefined' ? new WorkingVaultService() : null;