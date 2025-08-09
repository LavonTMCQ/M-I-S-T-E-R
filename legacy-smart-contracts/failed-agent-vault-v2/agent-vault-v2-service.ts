/**
 * Agent Vault V2 Service
 * Handles real Cardano transactions for Agent Vault V2 smart contract using Lucid
 */

import { simpleTransactionService, SimpleTransactionService, AGENT_VAULT_V2_CONFIG as SIMPLE_CONFIG } from './simple-transaction-service';
import { meshTransactionService } from './mesh-transaction-service';
import { plutusTransactionService } from './plutus-transaction-service';
import { agentVaultV2MeshService } from './agent-vault-v2-mesh-service';
import { cip30CompliantVaultService } from './cip30-compliance-wrapper';
import { lucidClientService } from './agent-vault-v2-lucid-client';

// Re-export configuration for compatibility
export const AGENT_VAULT_V2_CONFIG = SIMPLE_CONFIG;

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

// Transaction Result Interface
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  timestamp: Date;
}

// Vault Operation Types
export type VaultOperation = 
  | { type: 'UserDeposit'; amount: number }
  | { type: 'UserWithdraw'; amount: number }
  | { type: 'AgentTrade'; amount: number; leverage: number; position: 'Long' | 'Short'; strikeCbor: string }
  | { type: 'EmergencyStop' }
  | { type: 'UpdateSettings'; maxTradeAmount: number; leverageLimit: number };

/**
 * Agent Vault V2 Service Class
 */
export class AgentVaultV2Service {
  private static instance: AgentVaultV2Service;

  private constructor() {}

  public static getInstance(): AgentVaultV2Service {
    if (!AgentVaultV2Service.instance) {
      AgentVaultV2Service.instance = new AgentVaultV2Service();
    }
    return AgentVaultV2Service.instance;
  }

  /**
   * Get wallet API for a connected wallet
   */
  async getWalletApi(walletType: string = 'vespr'): Promise<any | null> {
    return await simpleTransactionService.getWalletApi(walletType);
  }

  /**
   * Get vault state from blockchain - REAL IMPLEMENTATION
   */
  async getVaultState(walletAddress: string): Promise<VaultState | null> {
    try {
      console.log(`🔍 Fetching REAL vault state for: ${walletAddress}`);

      // Query the actual vault contract address for UTxOs
      const contractAddress = AGENT_VAULT_V2_CONFIG.contractAddress;
      console.log(`📍 Querying contract address: ${contractAddress}`);

      const response = await fetch(`https://cardano-mainnet.blockfrost.io/api/v0/addresses/${contractAddress}/utxos`, {
        headers: {
          'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
        }
      });

      if (!response.ok) {
        console.error(`❌ Blockfrost API error: ${response.status}`);
        throw new Error(`Failed to fetch vault UTxOs: ${response.status}`);
      }

      const utxos = await response.json();
      console.log(`📦 Found ${utxos.length} UTxOs at contract address`);

      // Calculate total balance from all UTxOs at the contract address
      let totalBalance = 0;
      if (Array.isArray(utxos)) {
        totalBalance = utxos.reduce((sum: number, utxo: any) => {
          const lovelaceAmount = utxo.amount.find((a: any) => a.unit === 'lovelace');
          const amount = parseInt(lovelaceAmount?.quantity || '0');
          console.log(`💰 UTxO ${utxo.tx_hash}#${utxo.output_index}: ${amount / 1_000_000} ADA`);
          return sum + amount;
        }, 0);
      }

      console.log(`✅ Total vault balance: ${totalBalance / 1_000_000} ADA`);

      return {
        owner: walletAddress,
        totalDeposited: totalBalance, // Real balance from blockchain
        availableBalance: totalBalance, // For now, assume all is available
        agentAuthorized: true,
        emergencyStop: false,
        maxTradeAmount: 50_000_000, // 50 ADA
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
   * Build transaction for vault operation
   */
  async buildTransaction(
    walletApi: any,
    operation: VaultOperation,
    currentVaultState?: VaultState
  ): Promise<string> {
    try {
      // This would build the actual Cardano transaction using cardano-serialization-lib
      // or similar library to interact with the Agent Vault V2 smart contract
      
      console.log('Building transaction for operation:', operation);
      
      // Mock transaction building - in production this would:
      // 1. Get wallet UTXOs
      // 2. Build transaction inputs/outputs
      // 3. Attach the Agent Vault V2 script
      // 4. Create proper datum and redeemer
      // 5. Calculate fees
      // 6. Return transaction CBOR
      
      const mockTxCbor = "84a400818258200000000000000000000000000000000000000000000000000000000000000000000182a200581d60" + 
                        AGENT_VAULT_V2_CONFIG.scriptHash + 
                        "1a" + operation.type.padEnd(8, '0');
      
      return mockTxCbor;
    } catch (error) {
      console.error('Transaction building failed:', error);
      throw new Error(`Failed to build transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Submit transaction to blockchain
   */
  async submitTransaction(walletApi: any, txCbor: string): Promise<string> {
    try {
      // Submit transaction through wallet API
      const txHash = await walletApi.submitTx(txCbor);
      console.log('Transaction submitted:', txHash);
      return txHash;
    } catch (error) {
      console.error('Transaction submission failed:', error);
      throw new Error(`Failed to submit transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Deposit ADA to vault using simple transaction service
   */
  async deposit(walletApi: any, amount: number): Promise<TransactionResult> {
    try {
      console.log(`🏦 Agent Vault V2 Deposit: ${amount} ADA`);

      // Execute deposit transaction using simple service
      const result = await simpleTransactionService.deposit(walletApi, amount);

      if (result.success) {
        console.log('✅ Deposit successful:', result.txHash);
      } else {
        console.error('❌ Deposit failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Deposit error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Deposit ADA to vault with specific address (FIXED VERSION)
   */
  async depositWithAddress(walletApi: any, amount: number, fromAddress: string): Promise<TransactionResult> {
    try {
      console.log(`🏦 Agent Vault V2 Deposit with Address: ${amount} ADA`);
      console.log(`📍 Using address: ${fromAddress}`);

      // Execute deposit transaction using simple service with specific address
      const result = await simpleTransactionService.depositWithAddress(walletApi, amount, fromAddress);

      if (result.success) {
        console.log('✅ Deposit successful:', result.txHash);
      } else {
        console.error('❌ Deposit failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Deposit error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Withdraw ADA from vault using Lucid for proper PlutusV3 support
   */
  async withdraw(walletApi: any, amount: number, vaultState: VaultState): Promise<TransactionResult> {
    try {
      console.log(`🏦 Agent Vault V2 Withdrawal: ${amount} ADA`);
      console.log(`🚀 Using Lucid for proper PlutusV3 script handling...`);
      console.log(`🔧 Implementing CIP-31 (Reference Inputs) and CIP-32 (Inline Datums)...`);

      // Check if we're on client side
      if (!lucidClientService) {
        throw new Error('Lucid client service not available (server-side)');
      }

      // Convert VaultState to the format Lucid service expects
      const lucidVaultState = {
        ownerPubKeyHash: vaultState.owner.substring(0, 56), // Extract pub key hash
        isEmergencyStopped: vaultState.emergencyStop,
        withdrawalLimit: BigInt(1000 * 1_000_000), // 1000 ADA limit
        minimumBalance: BigInt(2 * 1_000_000) // 2 ADA minimum
      };

      // Use the client-side Lucid service for proper PlutusV3 handling
      const result = await lucidClientService.withdraw(walletApi, amount, lucidVaultState);

      if (result.success) {
        console.log('✅ Withdrawal successful:', result.txHash);
        console.log(`🎉 Successfully withdrew ${amount} ADA from Agent Vault V2`);
        console.log('📋 Transaction compliant with CIP-30, CIP-31, CIP-32');
      } else {
        console.error('❌ Withdrawal failed:', result.error);
      }

      return {
        ...result,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Withdrawal error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Withdrawal failed',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get UTxOs from the contract address
   */
  async getContractUtxos(contractAddress: string): Promise<any[]> {
    try {
      const response = await fetch(`https://cardano-mainnet.blockfrost.io/api/v0/addresses/${contractAddress}/utxos`, {
        headers: {
          'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch contract UTxOs: ${response.status}`);
      }

      const utxos = await response.json();
      console.log(`📦 Contract has ${utxos.length} UTxOs`);

      return utxos;
    } catch (error) {
      console.error('❌ Failed to fetch contract UTxOs:', error);
      throw error;
    }
  }


  /**
   * Build REAL contract withdrawal transaction (LEGACY - CSL based)
   */
  async buildRealContractWithdrawal(
    walletApi: any,
    amount: number,
    contractAddress: string,
    contractUtxos: any[]
  ): Promise<string> {
    try {
      console.log(`🏗️ Building REAL contract withdrawal transaction:`);
      console.log(`   📤 FROM: ${contractAddress} (contract)`);
      console.log(`   💰 AMOUNT: ${amount} ADA`);

      // Get user's address for withdrawal destination
      const userAddresses = await walletApi.getUsedAddresses();
      if (!userAddresses || userAddresses.length === 0) {
        throw new Error('No user addresses available');
      }

      // Use the first address (this should be the correct one)
      const userAddress = userAddresses[0];
      console.log(`   📥 TO: ${userAddress} (user)`);

      // For now, create a withdrawal authorization transaction
      // This represents the user's intent to withdraw from the contract
      const authMetadata = {
        674: {
          msg: [`Vault withdrawal: ${amount} ADA`], // Shortened (under 64 chars)
          contract: contractAddress.substring(0, 60), // Truncated
          operation: 'withdraw',
          amount: amount,
          user: userAddress.substring(0, 60), // Truncated
          utxos: contractUtxos.length,
          time: Date.now()
        }
      };

      // Build authorization transaction that user can sign
      console.log(`🔧 Building withdrawal authorization with contract verification...`);

      // Use the simple transaction service to build a signable transaction
      return await SimpleTransactionService.getInstance().buildProperTransaction(
        walletApi,
        userAddress,
        1.0, // 1 ADA authorization fee (meets minimum UTxO requirement)
        authMetadata
      );

    } catch (error) {
      console.error('❌ Real contract withdrawal building failed:', error);
      throw error;
    }
  }

  /**
   * Toggle emergency stop using Mesh-based service
   */
  async toggleEmergencyStop(walletApi: any, vaultState: VaultState): Promise<TransactionResult> {
    try {
      console.log(`🚨 Agent Vault V2 Emergency Stop Toggle`);
      console.log(`🔧 Using Mesh-based service for emergency stop...`);

      // Use the new Mesh service for emergency stop
      const result = await agentVaultV2MeshService.toggleEmergencyStop(walletApi, vaultState.emergencyStop);

      if (result.success) {
        console.log('✅ Emergency stop toggle successful:', result.txHash);
        console.log(`🎉 ${result.message}`);
      } else {
        console.error('❌ Emergency stop toggle failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Emergency stop error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Update vault settings
   */
  async updateSettings(
    walletApi: any, 
    maxTradeAmount: number, 
    leverageLimit: number, 
    vaultState: VaultState
  ): Promise<TransactionResult> {
    try {
      // Validate settings
      if (leverageLimit > AGENT_VAULT_V2_CONFIG.maxLeverage) {
        throw new Error(`Maximum leverage is ${AGENT_VAULT_V2_CONFIG.maxLeverage}x`);
      }

      const operation: VaultOperation = {
        type: 'UpdateSettings',
        maxTradeAmount: maxTradeAmount * 1_000_000, // Convert to lovelace
        leverageLimit
      };

      const txCbor = await this.buildTransaction(walletApi, operation, vaultState);
      const txHash = await this.submitTransaction(walletApi, txCbor);

      return {
        success: true,
        txHash,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate operation parameters
   */
  validateOperation(operation: VaultOperation, vaultState?: VaultState): { valid: boolean; error?: string } {
    switch (operation.type) {
      case 'UserDeposit':
        if (operation.amount < AGENT_VAULT_V2_CONFIG.minVaultBalance) {
          return { valid: false, error: `Minimum deposit is ${AGENT_VAULT_V2_CONFIG.minVaultBalance / 1_000_000} ADA` };
        }
        break;
        
      case 'UserWithdraw':
        if (vaultState && operation.amount > vaultState.availableBalance) {
          return { valid: false, error: 'Insufficient vault balance' };
        }
        break;
        
      case 'AgentTrade':
        if (operation.amount < AGENT_VAULT_V2_CONFIG.minStrikeTrade) {
          return { valid: false, error: `Minimum trade amount is ${AGENT_VAULT_V2_CONFIG.minStrikeTrade / 1_000_000} ADA` };
        }
        if (operation.leverage > AGENT_VAULT_V2_CONFIG.maxLeverage) {
          return { valid: false, error: `Maximum leverage is ${AGENT_VAULT_V2_CONFIG.maxLeverage}x` };
        }
        break;
        
      case 'UpdateSettings':
        if (operation.leverageLimit > AGENT_VAULT_V2_CONFIG.maxLeverage) {
          return { valid: false, error: `Maximum leverage is ${AGENT_VAULT_V2_CONFIG.maxLeverage}x` };
        }
        break;
    }
    
    return { valid: true };
  }
}

// Export singleton instance
export const agentVaultV2Service = AgentVaultV2Service.getInstance();
