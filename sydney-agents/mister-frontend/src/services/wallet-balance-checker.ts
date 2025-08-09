/**
 * WALLET BALANCE CHECKER
 * Quick utility to check wallet balance before transactions
 */

export class WalletBalanceChecker {
  /**
   * Check wallet balance
   */
  async checkBalance(walletApi: any): Promise<{ ada: number; lovelace: bigint }> {
    try {
      console.log('💰 Checking wallet balance...');
      
      // Get UTxOs from wallet
      const utxosHex = await walletApi.getUtxos();
      
      if (!utxosHex || utxosHex.length === 0) {
        console.log('❌ No UTxOs found in wallet');
        return { ada: 0, lovelace: 0n };
      }
      
      // Import Lucid to parse UTxOs
      const { C } = await import('@lucid-evolution/lucid');
      
      let totalLovelace = 0n;
      
      // Parse each UTxO and sum the lovelace
      for (const utxoHex of utxosHex) {
        try {
          const utxo = C.TransactionUnspentOutput.from_hex(utxoHex);
          const output = utxo.output();
          const amount = output.amount();
          const coin = amount.coin();
          totalLovelace += BigInt(coin.to_str());
        } catch (e) {
          console.warn('Failed to parse UTxO:', e);
        }
      }
      
      const ada = Number(totalLovelace) / 1_000_000;
      
      console.log(`✅ Wallet balance: ${ada} ADA (${totalLovelace} lovelace)`);
      console.log(`📊 UTxO count: ${utxosHex.length}`);
      
      return { ada, lovelace: totalLovelace };
      
    } catch (error: any) {
      console.error('❌ Balance check failed:', error);
      return { ada: 0, lovelace: 0n };
    }
  }
  
  /**
   * Get minimum ADA required for a transaction
   */
  getMinimumAda(): number {
    // Cardano requires minimum ~1-2 ADA for transactions
    // We'll use 2 ADA to be safe
    return 2;
  }
  
  /**
   * Check if wallet has enough for deposit
   */
  async canDeposit(walletApi: any, depositAmount: number): Promise<{ 
    canDeposit: boolean; 
    balance: number; 
    required: number;
    message: string;
  }> {
    const balance = await this.checkBalance(walletApi);
    
    // Need deposit amount + ~2 ADA for fees and change
    const required = depositAmount + 2;
    const canDeposit = balance.ada >= required;
    
    const message = canDeposit 
      ? `✅ Sufficient balance: ${balance.ada} ADA (need ${required} ADA)`
      : `❌ Insufficient balance: ${balance.ada} ADA (need ${required} ADA)`;
    
    console.log(message);
    
    return {
      canDeposit,
      balance: balance.ada,
      required,
      message
    };
  }
}

export const walletBalanceChecker = typeof window !== 'undefined' ? new WalletBalanceChecker() : null;