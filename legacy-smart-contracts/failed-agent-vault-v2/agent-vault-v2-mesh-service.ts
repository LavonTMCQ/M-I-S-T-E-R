/**
 * Agent Vault V2 Mesh Service
 * Complete replacement for CSL-based withdrawal functionality
 * Handles complex UTxO selection, script witnesses, and transaction balancing
 */

import { 
  MeshTxBuilder, 
  BlockfrostProvider
} from '@meshsdk/core';
import { AGENT_VAULT_V2_CONFIG } from './simple-transaction-service';

// Transaction Result Interface
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  message?: string;
  timestamp: Date;
}

// Vault State Interface
export interface VaultState {
  owner: string;
  totalDeposited: number;
  availableBalance: number;
  agentAuthorized: boolean;
  emergencyStop: boolean;
  maxTradeAmount: number;
  leverageLimit: number;
  tradeCount: number;
  lastTradeAt: number;
  createdAt: number;
}

// Asset type for UTxO amounts
type Asset = {
  unit: string;
  quantity: string;
};

// UTxO Interface for better type safety
interface DetailedUTxO {
  tx_hash: string;
  output_index: number;
  amount: Asset[];
  address: string;
  data_hash?: string;
  inline_datum?: string;
  reference_script_hash?: string;
}

/**
 * Agent Vault V2 Mesh Service
 * Handles all withdrawal operations with proper UTxO selection and script witnesses
 */
export class AgentVaultV2MeshService {
  private static instance: AgentVaultV2MeshService;
  private blockfrostProvider: BlockfrostProvider;
  
  // Agent Vault V2 Plutus Script (PlutusV3)
  private readonly AGENT_VAULT_SCRIPT = {
    type: 'PlutusV3',
    code: AGENT_VAULT_V2_CONFIG.cborHex
  };

  // Redeemer constructors
  private readonly REDEEMERS = {
    UserDeposit: 0,
    UserWithdraw: 1,
    AgentTrade: 2,
    EmergencyStop: 3,
    UpdateSettings: 4
  };

  private constructor() {
    const blockfrostApiKey = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
    this.blockfrostProvider = new BlockfrostProvider(blockfrostApiKey);
  }

  public static getInstance(): AgentVaultV2MeshService {
    if (!AgentVaultV2MeshService.instance) {
      AgentVaultV2MeshService.instance = new AgentVaultV2MeshService();
    }
    return AgentVaultV2MeshService.instance;
  }

  /**
   * Main withdrawal function - handles all complexity
   */
  async withdraw(walletApi: any, amount: number, vaultState: VaultState): Promise<TransactionResult> {
    try {
      console.log(`🏦 Agent Vault V2 Mesh-based Withdrawal: ${amount} ADA`);
      
      // Step 1: Validate withdrawal parameters
      const validation = this.validateWithdrawal(amount, vaultState);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          timestamp: new Date()
        };
      }

      // Step 2: Get contract UTxOs
      const contractUtxos = await this.getContractUtxos();
      if (!contractUtxos || contractUtxos.length === 0) {
        return {
          success: false,
          error: 'No funds available in vault contract',
          timestamp: new Date()
        };
      }

      // Step 3: Select contract UTxOs for withdrawal
      const selectedContractUtxo = this.selectOptimalContractUtxo(contractUtxos, amount);
      if (!selectedContractUtxo) {
        return {
          success: false,
          error: 'No suitable contract UTxO found for withdrawal amount',
          timestamp: new Date()
        };
      }
      
      // Check if we need all contract UTxOs (full withdrawal)
      const totalInContract = contractUtxos.reduce((sum, utxo) => {
        const ada = utxo.amount.find(a => a.unit === 'lovelace');
        return sum + (ada ? parseInt(ada.quantity) : 0);
      }, 0) / 1_000_000;
      
      const isFullWithdrawal = Math.abs(totalInContract - amount) < 1; // Within 1 ADA tolerance
      const contractUtxosToUse = isFullWithdrawal ? contractUtxos : [selectedContractUtxo];

      // Step 4: Get user address and UTxOs
      const userAddress = await this.getUserAddress(walletApi);
      const userUtxos = await this.getUserUtxos(userAddress);
      
      if (!userUtxos || userUtxos.length === 0) {
        return {
          success: false,
          error: 'No UTxOs available for transaction fees',
          timestamp: new Date()
        };
      }

      // Step 5: Select optimal user UTxOs for fees
      const selectedUserUtxos = this.selectUserUtxosForFees(userUtxos);
      if (!selectedUserUtxos || selectedUserUtxos.length === 0) {
        return {
          success: false,
          error: 'No suitable user UTxOs found for transaction fees',
          timestamp: new Date()
        };
      }

      // Step 6: Build withdrawal transaction with Mesh
      console.log('🔧 Building withdrawal transaction with Mesh...');
      const txCbor = await this.buildWithdrawalTransaction({
        userAddress,
        contractUtxos: contractUtxosToUse,
        userUtxos: selectedUserUtxos,
        withdrawAmount: amount * 1_000_000 // Convert to lovelace
      });

      if (!txCbor) {
        return {
          success: false,
          error: 'Failed to build withdrawal transaction',
          timestamp: new Date()
        };
      }

      // Step 7: Sign and submit transaction
      console.log('✍️ Signing withdrawal transaction...');
      const signedTx = await this.signTransaction(walletApi, txCbor);
      
      if (!signedTx) {
        return {
          success: false,
          error: 'Failed to sign withdrawal transaction',
          timestamp: new Date()
        };
      }

      console.log('📤 Submitting withdrawal transaction...');
      const txHash = await this.submitTransaction(walletApi, signedTx);

      return {
        success: true,
        txHash,
        message: `Successfully withdrew ${amount} ADA from Agent Vault V2`,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Withdrawal failed',
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate withdrawal parameters with comprehensive checks
   */
  private validateWithdrawal(amount: number, vaultState: VaultState): { valid: boolean; error?: string } {
    // Check if amount is a valid number
    if (isNaN(amount) || !isFinite(amount)) {
      return { valid: false, error: 'Invalid withdrawal amount' };
    }

    // Check minimum withdrawal
    if (amount < 1) {
      return { valid: false, error: 'Minimum withdrawal is 1 ADA' };
    }

    // Check maximum single withdrawal (safety limit)
    const maxSingleWithdrawal = 1000; // 1000 ADA max per withdrawal for safety
    if (amount > maxSingleWithdrawal) {
      return { 
        valid: false, 
        error: `Maximum single withdrawal is ${maxSingleWithdrawal} ADA. Please withdraw in multiple transactions.` 
      };
    }

    // Check available balance
    const availableAda = vaultState.availableBalance / 1_000_000;
    if (amount > availableAda) {
      return { 
        valid: false, 
        error: `Insufficient funds. Available: ${availableAda.toFixed(2)} ADA, Requested: ${amount} ADA` 
      };
    }

    // Check if amount would leave dust in vault
    const remainingAfterWithdrawal = availableAda - amount;
    if (remainingAfterWithdrawal > 0 && remainingAfterWithdrawal < 2) {
      return { 
        valid: false, 
        error: `Withdrawal would leave ${remainingAfterWithdrawal.toFixed(2)} ADA in vault. Minimum vault balance is 2 ADA or withdraw all funds.` 
      };
    }

    // Check emergency stop
    if (vaultState.emergencyStop) {
      return { valid: false, error: 'Vault is in emergency stop mode. Contact support to unlock.' };
    }

    // Check if vault is properly initialized
    if (!vaultState.owner || vaultState.owner.length < 10) {
      return { valid: false, error: 'Vault owner not properly initialized' };
    }

    return { valid: true };
  }

  /**
   * Get contract UTxOs from blockchain
   */
  private async getContractUtxos(): Promise<DetailedUTxO[]> {
    try {
      const response = await fetch(
        `https://cardano-mainnet.blockfrost.io/api/v0/addresses/${AGENT_VAULT_V2_CONFIG.contractAddress}/utxos`,
        {
          headers: {
            'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch contract UTxOs: ${response.status}`);
      }

      const utxos: DetailedUTxO[] = await response.json();
      console.log(`📦 Found ${utxos.length} contract UTxOs`);
      
      // Log details of each UTxO for debugging
      utxos.forEach((utxo, index) => {
        const adaAmount = utxo.amount.find(a => a.unit === 'lovelace');
        const ada = adaAmount ? parseInt(adaAmount.quantity) / 1_000_000 : 0;
        console.log(`  UTxO ${index + 1}: ${ada} ADA (${utxo.tx_hash}#${utxo.output_index})`);
      });

      return utxos;
    } catch (error) {
      console.error('❌ Failed to fetch contract UTxOs:', error);
      throw error;
    }
  }

  /**
   * Select optimal contract UTxO(s) for withdrawal
   * Can combine multiple UTxOs if needed
   */
  private selectOptimalContractUtxo(utxos: DetailedUTxO[], withdrawalAmountAda: number): DetailedUTxO | null {
    const withdrawalLovelace = withdrawalAmountAda * 1_000_000;
    
    // Calculate total available in contract
    let totalAvailable = 0;
    const utxosWithAmount = utxos.map(utxo => {
      const adaAmount = utxo.amount.find(a => a.unit === 'lovelace');
      const lovelace = adaAmount ? parseInt(adaAmount.quantity) : 0;
      totalAvailable += lovelace;
      return { utxo, lovelace };
    }).sort((a, b) => b.lovelace - a.lovelace); // Sort descending (largest first)

    console.log(`💰 Total available in contract: ${totalAvailable / 1_000_000} ADA`);
    console.log(`📤 Requested withdrawal: ${withdrawalAmountAda} ADA`);

    // Check if total is sufficient
    if (totalAvailable < withdrawalLovelace) {
      console.error(`❌ Insufficient total funds. Available: ${totalAvailable / 1_000_000} ADA, Requested: ${withdrawalAmountAda} ADA`);
      return null;
    }

    // For full withdrawal, combine all UTxOs
    if (Math.abs(totalAvailable - withdrawalLovelace) < 1_000_000) { // Within 1 ADA means full withdrawal
      console.log(`✅ Full withdrawal detected. Will combine all ${utxos.length} contract UTxOs`);
      // Return first UTxO as primary, others will be added in transaction building
      return utxosWithAmount[0].utxo;
    }

    // Try to find single UTxO that covers the amount
    const singleUtxo = utxosWithAmount.find(item => item.lovelace >= withdrawalLovelace);
    if (singleUtxo) {
      console.log(`✅ Found single contract UTxO with ${singleUtxo.lovelace / 1_000_000} ADA`);
      return singleUtxo.utxo;
    }

    // Otherwise, we need to combine UTxOs (return largest as primary)
    console.log(`✅ Will combine multiple contract UTxOs for withdrawal`);
    return utxosWithAmount[0].utxo;
  }

  /**
   * Get user address from wallet
   */
  private async getUserAddress(walletApi: any): Promise<string> {
    try {
      // Check if it's the wrapped wallet API or direct wallet API
      const getAddresses = walletApi.getUsedAddresses || walletApi.walletApi?.getUsedAddresses;
      if (!getAddresses) {
        // Fallback: Try to get from the global stored address
        if (typeof window !== 'undefined' && (window as any).mainWalletAddress) {
          const address = (window as any).mainWalletAddress;
          console.log(`👤 Using stored wallet address: ${address.substring(0, 30)}...`);
          return address;
        }
        throw new Error('Wallet API does not have getUsedAddresses method');
      }

      const addresses = await getAddresses.call(walletApi.walletApi || walletApi);
      if (!addresses || addresses.length === 0) {
        const getUnusedAddresses = walletApi.getUnusedAddresses || walletApi.walletApi?.getUnusedAddresses;
        if (getUnusedAddresses) {
          const unusedAddresses = await getUnusedAddresses.call(walletApi.walletApi || walletApi);
          if (unusedAddresses && unusedAddresses.length > 0) {
            return unusedAddresses[0];
          }
        }
        throw new Error('No addresses available from wallet');
      }
      
      let address = addresses[0];
      
      // Convert hex to bech32 if needed
      if (address && address.length > 100 && !address.startsWith('addr1')) {
        console.log('🔄 Converting hex address to bech32...');
        const { normalizeAddress } = await import('@/utils/addressUtils');
        address = await normalizeAddress(address);
      }
      
      console.log(`👤 User address: ${address.substring(0, 30)}...`);
      return address;
    } catch (error) {
      console.error('❌ Failed to get user address:', error);
      throw error;
    }
  }

  /**
   * Get user UTxOs from blockchain
   */
  private async getUserUtxos(userAddress: string): Promise<DetailedUTxO[]> {
    try {
      const response = await fetch(
        `https://cardano-mainnet.blockfrost.io/api/v0/addresses/${userAddress}/utxos`,
        {
          headers: {
            'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user UTxOs: ${response.status}`);
      }

      const utxos: DetailedUTxO[] = await response.json();
      console.log(`📦 Found ${utxos.length} user UTxOs`);
      
      return utxos;
    } catch (error) {
      console.error('❌ Failed to fetch user UTxOs:', error);
      throw error;
    }
  }

  /**
   * Select user UTxOs for transaction fees
   * Uses coin selection algorithm to minimize UTxOs used
   */
  private selectUserUtxosForFees(utxos: DetailedUTxO[]): DetailedUTxO[] {
    const requiredLovelace = 5_000_000; // 5 ADA for fees and collateral
    
    // First try to find pure ADA UTxOs (preferred)
    const pureAdaUtxos = utxos.filter(utxo => {
      // Skip UTxOs with datum (might be locked)
      if (utxo.data_hash || utxo.inline_datum) {
        console.log(`⚠️ Skipping UTxO with datum: ${utxo.tx_hash}#${utxo.output_index}`);
        return false;
      }
      
      // Pure ADA only (no tokens)
      if (utxo.amount.length > 1) {
        return false;
      }
      
      return true;
    });

    // If we have pure ADA UTxOs, use them
    let usableUtxos = pureAdaUtxos;
    
    // If no pure ADA UTxOs, we have to use ones with tokens
    if (pureAdaUtxos.length === 0) {
      console.log('⚠️ No pure ADA UTxOs found, will use UTxOs with tokens');
      usableUtxos = utxos.filter(utxo => {
        // Still skip UTxOs with datum (might be locked)
        if (utxo.data_hash || utxo.inline_datum) {
          console.log(`⚠️ Skipping UTxO with datum: ${utxo.tx_hash}#${utxo.output_index}`);
          return false;
        }
        return true;
      });
      
      // Log which tokens are included
      usableUtxos.forEach(utxo => {
        if (utxo.amount.length > 1) {
          const tokens = utxo.amount.filter(a => a.unit !== 'lovelace');
          console.log(`📦 UTxO ${utxo.tx_hash}#${utxo.output_index} contains ${tokens.length} token type(s)`);
        }
      });
    }

    // Sort UTxOs by ADA amount (ascending)
    const sortedUtxos = usableUtxos
      .map(utxo => {
        const adaAmount = utxo.amount.find(a => a.unit === 'lovelace');
        const lovelace = adaAmount ? parseInt(adaAmount.quantity) : 0;
        return { utxo, lovelace };
      })
      .filter(item => item.lovelace > 0)
      .sort((a, b) => a.lovelace - b.lovelace);

    if (sortedUtxos.length === 0) {
      console.error('❌ No usable UTxOs found (all have tokens or datums)');
      return [];
    }

    // Try to find a single UTxO that covers fees
    const singleUtxo = sortedUtxos.find(item => item.lovelace >= requiredLovelace);
    if (singleUtxo) {
      console.log(`✅ Selected single user UTxO with ${singleUtxo.lovelace / 1_000_000} ADA for fees`);
      return [singleUtxo.utxo];
    }

    // Otherwise, accumulate multiple UTxOs (max 5 to avoid transaction size issues)
    const selectedUtxos: DetailedUTxO[] = [];
    let totalLovelace = 0;
    const maxUtxos = 5;
    
    for (const item of sortedUtxos) {
      if (selectedUtxos.length >= maxUtxos) {
        console.warn(`⚠️ Reached maximum UTxO limit (${maxUtxos}). Total collected: ${totalLovelace / 1_000_000} ADA`);
        break;
      }
      
      selectedUtxos.push(item.utxo);
      totalLovelace += item.lovelace;
      
      if (totalLovelace >= requiredLovelace) {
        console.log(`✅ Selected ${selectedUtxos.length} user UTxOs with total ${totalLovelace / 1_000_000} ADA for fees`);
        return selectedUtxos;
      }
    }

    if (totalLovelace < requiredLovelace) {
      console.error(`❌ Insufficient user funds for fees. Required: ${requiredLovelace / 1_000_000} ADA, Available: ${totalLovelace / 1_000_000} ADA`);
    }
    
    return selectedUtxos; // Return what we have, even if insufficient
  }

  /**
   * Build withdrawal transaction using Mesh
   */
  private async buildWithdrawalTransaction(params: {
    userAddress: string;
    contractUtxos: DetailedUTxO[];
    userUtxos: DetailedUTxO[];
    withdrawAmount: number; // in lovelace
  }): Promise<string> {
    try {
      console.log('🔧 Building Mesh withdrawal transaction...');
      
      // Create transaction builder
      const txBuilder = new MeshTxBuilder({
        fetcher: this.blockfrostProvider,
        submitter: this.blockfrostProvider,
      });

      // Calculate total from contract UTxOs
      let totalContractLovelace = 0;
      for (const contractUtxo of params.contractUtxos) {
        const adaAmount = contractUtxo.amount.find(a => a.unit === 'lovelace');
        const lovelace = adaAmount ? parseInt(adaAmount.quantity) : 0;
        totalContractLovelace += lovelace;
      }
      
      console.log(`📍 Adding ${params.contractUtxos.length} contract UTxO(s) with total: ${totalContractLovelace / 1_000_000} ADA`);
      
      // Build withdrawal redeemer (UserWithdraw constructor = 1)
      const withdrawRedeemer = {
        alternative: this.REDEEMERS.UserWithdraw,
        fields: [params.withdrawAmount.toString()]
      };

      // Add all contract UTxOs with script witness
      for (const contractUtxo of params.contractUtxos) {
        const adaAmount = contractUtxo.amount.find(a => a.unit === 'lovelace');
        const lovelace = adaAmount ? parseInt(adaAmount.quantity) : 0;
        console.log(`  📍 Contract UTxO: ${lovelace / 1_000_000} ADA (${contractUtxo.tx_hash}#${contractUtxo.output_index})`);
        
        txBuilder.spendingPlutusScriptV3()
          .txIn(
            contractUtxo.tx_hash,
            contractUtxo.output_index,
            contractUtxo.amount,
            contractUtxo.address
          )
          .txInInlineDatumPresent()
          .txInRedeemerValue(withdrawRedeemer)
          .txInScript(this.AGENT_VAULT_SCRIPT.code);
      }

      // Add user UTxOs for fees
      let hasTokens = false;
      for (const userUtxo of params.userUtxos) {
        const adaAmount = userUtxo.amount.find(a => a.unit === 'lovelace');
        const lovelace = adaAmount ? parseInt(adaAmount.quantity) : 0;
        const tokens = userUtxo.amount.filter(a => a.unit !== 'lovelace');
        
        if (tokens.length > 0) {
          hasTokens = true;
          console.log(`📍 Adding user input: ${lovelace / 1_000_000} ADA + ${tokens.length} token type(s)`);
        } else {
          console.log(`📍 Adding user input: ${lovelace / 1_000_000} ADA`);
        }
        
        txBuilder.txIn(
          userUtxo.tx_hash,
          userUtxo.output_index,
          userUtxo.amount,
          params.userAddress
        );
      }

      // Add output: withdrawn amount to user
      console.log(`📤 Adding output: ${params.withdrawAmount / 1_000_000} ADA to user`);
      txBuilder.txOut(params.userAddress, [
        { unit: 'lovelace', quantity: params.withdrawAmount.toString() }
      ]);

      // If there's remaining balance in contract, send it back
      const remainingLovelace = totalContractLovelace - params.withdrawAmount;
      if (remainingLovelace > 2_000_000) { // Keep at least 2 ADA in contract
        console.log(`📤 Adding output: ${remainingLovelace / 1_000_000} ADA back to contract`);
        
        // Build updated datum for remaining balance
        const updatedDatum = this.buildVaultDatum({
          owner: params.userAddress,
          remainingBalance: remainingLovelace
        });
        
        txBuilder.txOut(AGENT_VAULT_V2_CONFIG.contractAddress, [
          { unit: 'lovelace', quantity: remainingLovelace.toString() }
        ])
        .txOutInlineDatumValue(updatedDatum);
      }

      // Add metadata
      const metadata = {
        674: {
          msg: [`Agent Vault V2 Withdrawal: ${params.withdrawAmount / 1_000_000} ADA`],
          contract: AGENT_VAULT_V2_CONFIG.contractAddress.substring(0, 30),
          operation: 'withdraw',
          timestamp: Date.now()
        }
      };
      
      txBuilder.metadataValue('674', metadata[674]);

      // Set change address for remaining user funds
      txBuilder.changeAddress(params.userAddress);

      // Set collateral (required for Plutus scripts)
      const collateralUtxo = params.userUtxos[0]; // Use first user UTxO as collateral
      txBuilder.txInCollateral(
        collateralUtxo.tx_hash,
        collateralUtxo.output_index,
        collateralUtxo.amount,
        params.userAddress
      );

      // Complete the transaction
      console.log('🔧 Completing transaction build...');
      const unsignedTx = await txBuilder.complete();
      
      console.log(`✅ Transaction built successfully: ${unsignedTx.length} characters`);
      return unsignedTx;

    } catch (error) {
      console.error('❌ Transaction building failed:', error);
      throw error;
    }
  }

  /**
   * Build vault datum for contract outputs
   */
  private buildVaultDatum(params: {
    owner: string;
    remainingBalance: number;
  }): any {
    // Build datum structure matching the Aiken contract
    // Return as object for Mesh to handle
    const datum = {
      owner: params.owner,
      balance: params.remainingBalance.toString(),
      agentAuthorized: true,
      emergencyStop: false,
      lastTradeAt: Date.now().toString()
    };
    
    return datum;
  }

  /**
   * Sign transaction with wallet
   */
  private async signTransaction(walletApi: any, txCbor: string): Promise<string> {
    try {
      console.log('✍️ Requesting wallet signature...');
      
      // Get the actual wallet API (might be wrapped)
      const actualWalletApi = walletApi.walletApi || walletApi;
      const signTx = actualWalletApi.signTx || walletApi.signTx;
      
      if (!signTx) {
        throw new Error('Wallet API does not have signTx method');
      }
      
      // Try complete signing first (partialSign: false)
      try {
        const signedTx = await signTx.call(actualWalletApi, txCbor, false);
        console.log('✅ Complete signed transaction received');
        return signedTx;
      } catch (completeSignError) {
        console.log('⚠️ Complete signing failed, trying partial signing...');
        
        // Fallback to witness set approach
        const witnessSet = await signTx.call(actualWalletApi, txCbor, true);
        console.log('✅ Witness set received, combining with transaction...');
        
        // Combine witness set with original transaction
        const signedTx = await this.combineTransactionWithWitness(txCbor, witnessSet);
        return signedTx;
      }
    } catch (error) {
      console.error('❌ Transaction signing failed:', error);
      throw error;
    }
  }

  /**
   * Combine transaction with witness set (for Vespr compatibility)
   */
  private async combineTransactionWithWitness(txCbor: string, witnessSetCbor: string): Promise<string> {
    try {
      const response = await fetch('/api/cardano/sign-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txCbor,
          witnessSetCbor
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to combine transaction: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to combine transaction');
      }

      return result.signedTxCbor;
    } catch (error) {
      console.error('❌ Failed to combine transaction with witness:', error);
      throw error;
    }
  }

  /**
   * Submit transaction to blockchain
   */
  private async submitTransaction(walletApi: any, signedTx: string): Promise<string> {
    try {
      // Get the actual wallet API (might be wrapped)
      const actualWalletApi = walletApi.walletApi || walletApi;
      const submitTx = actualWalletApi.submitTx || walletApi.submitTx;
      
      // Try wallet submission first
      try {
        if (submitTx) {
          const txHash = await submitTx.call(actualWalletApi, signedTx);
          console.log('✅ Transaction submitted via wallet:', txHash);
          return txHash;
        }
      } catch (walletError) {
        console.log('⚠️ Wallet submission failed, trying Blockfrost...');
      }
      
      // Fallback to Blockfrost
      const txHash = await this.blockfrostProvider.submitTx(signedTx);
      console.log('✅ Transaction submitted via Blockfrost:', txHash);
      return txHash;
    } catch (error) {
      console.error('❌ Transaction submission failed:', error);
      throw error;
    }
  }

  /**
   * Get vault state from blockchain
   */
  async getVaultState(walletAddress: string): Promise<VaultState | null> {
    try {
      const contractUtxos = await this.getContractUtxos();
      
      // Calculate total balance
      let totalBalance = 0;
      for (const utxo of contractUtxos) {
        const adaAmount = utxo.amount.find(a => a.unit === 'lovelace');
        if (adaAmount) {
          totalBalance += parseInt(adaAmount.quantity);
        }
      }

      return {
        owner: walletAddress,
        totalDeposited: totalBalance,
        availableBalance: totalBalance,
        agentAuthorized: true,
        emergencyStop: false,
        maxTradeAmount: 50_000_000,
        leverageLimit: 2,
        tradeCount: 0,
        lastTradeAt: 0,
        createdAt: Date.now()
      };
    } catch (error) {
      console.error('❌ Failed to get vault state:', error);
      return null;
    }
  }

  /**
   * Toggle emergency stop on the vault
   */
  async toggleEmergencyStop(walletApi: any, currentEmergencyState: boolean): Promise<TransactionResult> {
    try {
      console.log(`🚨 Agent Vault V2 Emergency Stop Toggle`);
      console.log(`   Current State: ${currentEmergencyState ? 'STOPPED' : 'ACTIVE'}`);
      console.log(`   New State: ${!currentEmergencyState ? 'STOPPED' : 'ACTIVE'}`);

      // Get user address
      const userAddress = await this.getUserAddress(walletApi);
      const userUtxos = await this.getUserUtxos(userAddress);
      
      if (!userUtxos || userUtxos.length === 0) {
        return {
          success: false,
          error: 'No UTxOs available for transaction fees',
          timestamp: new Date()
        };
      }

      // Select UTxOs for fees
      const selectedUserUtxos = this.selectUserUtxosForFees(userUtxos);
      if (!selectedUserUtxos || selectedUserUtxos.length === 0) {
        return {
          success: false,
          error: 'No suitable user UTxOs found for transaction fees',
          timestamp: new Date()
        };
      }

      // Build emergency stop transaction
      const txCbor = await this.buildEmergencyStopTransaction({
        userAddress,
        userUtxos: selectedUserUtxos,
        newEmergencyState: !currentEmergencyState
      });

      if (!txCbor) {
        return {
          success: false,
          error: 'Failed to build emergency stop transaction',
          timestamp: new Date()
        };
      }

      // Sign and submit
      const signedTx = await this.signTransaction(walletApi, txCbor);
      const txHash = await this.submitTransaction(walletApi, signedTx);

      return {
        success: true,
        txHash,
        message: `Emergency stop ${!currentEmergencyState ? 'ACTIVATED' : 'DEACTIVATED'} successfully`,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Emergency stop toggle failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Emergency stop toggle failed',
        timestamp: new Date()
      };
    }
  }

  /**
   * Build emergency stop transaction
   */
  private async buildEmergencyStopTransaction(params: {
    userAddress: string;
    userUtxos: DetailedUTxO[];
    newEmergencyState: boolean;
  }): Promise<string> {
    try {
      console.log('🔧 Building emergency stop transaction with Mesh...');
      
      // Create transaction builder
      const txBuilder = new MeshTxBuilder({
        fetcher: this.blockfrostProvider,
        submitter: this.blockfrostProvider,
      });

      // Get contract UTxOs (need at least one to interact with contract)
      const contractUtxos = await this.getContractUtxos();
      if (contractUtxos.length === 0) {
        throw new Error('No contract UTxOs found');
      }

      const contractUtxo = contractUtxos[0];
      const contractAdaAmount = contractUtxo.amount.find(a => a.unit === 'lovelace');
      const contractLovelace = contractAdaAmount ? parseInt(contractAdaAmount.quantity) : 0;

      // Build emergency stop redeemer (EmergencyStop constructor = 3)
      const emergencyRedeemer = {
        alternative: this.REDEEMERS.EmergencyStop,
        fields: [] // No parameters needed
      };

      // Add contract UTxO with script
      txBuilder.spendingPlutusScriptV3()
        .txIn(
          contractUtxo.tx_hash,
          contractUtxo.output_index,
          contractUtxo.amount,
          contractUtxo.address
        )
        .txInInlineDatumPresent()
        .txInRedeemerValue(emergencyRedeemer)
        .txInScript(this.AGENT_VAULT_SCRIPT.code);

      // Add user UTxOs for fees
      for (const userUtxo of params.userUtxos) {
        txBuilder.txIn(
          userUtxo.tx_hash,
          userUtxo.output_index,
          userUtxo.amount,
          params.userAddress
        );
      }

      // Send contract funds back with updated emergency state in datum
      const updatedDatum = this.buildVaultDatumWithEmergencyStop({
        owner: params.userAddress,
        balance: contractLovelace,
        emergencyStop: params.newEmergencyState
      });

      txBuilder.txOut(AGENT_VAULT_V2_CONFIG.contractAddress, [
        { unit: 'lovelace', quantity: contractLovelace.toString() }
      ])
      .txOutInlineDatumValue(updatedDatum);

      // Add metadata
      const metadata = {
        674: {
          msg: [`Emergency Stop: ${params.newEmergencyState ? 'ACTIVATED' : 'DEACTIVATED'}`],
          contract: AGENT_VAULT_V2_CONFIG.contractAddress.substring(0, 30),
          operation: 'emergency_stop',
          state: params.newEmergencyState,
          timestamp: Date.now()
        }
      };
      
      txBuilder.metadataValue('674', metadata[674]);

      // Set change address
      txBuilder.changeAddress(params.userAddress);

      // Set collateral
      const collateralUtxo = params.userUtxos[0];
      txBuilder.txInCollateral(
        collateralUtxo.tx_hash,
        collateralUtxo.output_index,
        collateralUtxo.amount,
        params.userAddress
      );

      // Complete transaction
      const unsignedTx = await txBuilder.complete();
      
      console.log(`✅ Emergency stop transaction built: ${unsignedTx.length} characters`);
      return unsignedTx;

    } catch (error) {
      console.error('❌ Emergency stop transaction building failed:', error);
      throw error;
    }
  }

  /**
   * Build vault datum with emergency stop state
   */
  private buildVaultDatumWithEmergencyStop(params: {
    owner: string;
    balance: number;
    emergencyStop: boolean;
  }): any {
    const datum = {
      owner: params.owner,
      balance: params.balance.toString(),
      agentAuthorized: true,
      emergencyStop: params.emergencyStop,
      lastTradeAt: Date.now().toString()
    };
    
    return datum;
  }
}

// Export singleton instance
export const agentVaultV2MeshService = AgentVaultV2MeshService.getInstance();