/**
 * Agent Wallet Manager
 * 
 * Core service for managing AI agent wallets including:
 * - Wallet generation and storage
 * - Secure credential management
 * - Balance tracking
 * - Database integration
 */

import {
  IAgentWalletManager,
  AgentWallet,
  AgentWalletCredentials,
  WalletGenerationRequest,
  WalletGenerationResult,
  BalanceCheckResult,
  WalletRecoveryRequest,
  WalletRecoveryResult,
  AgentWalletStatus
} from '@/types/agent-wallets/types';
import { walletGenerator } from './WalletGenerator';
import { walletEncryption } from '@/lib/encryption/wallet-encryption';
import { getRailwayDB, DatabaseClient } from '@/lib/database/railway-db';

export class AgentWalletManager implements IAgentWalletManager {
  private db: DatabaseClient;
  private cardanoServiceUrl: string;

  constructor(
    databaseClient?: DatabaseClient,
    cardanoServiceUrl: string = process.env.NEXT_PUBLIC_CARDANO_SERVICE_URL || process.env.CARDANO_SERVICE_URL || 'http://localhost:3001'
  ) {
    this.db = databaseClient || getRailwayDB();
    this.cardanoServiceUrl = cardanoServiceUrl;
    
    console.log('🎯 AgentWalletManager initialized with Railway PostgreSQL');
    console.log('📊 Config:', {
      hasDatabase: true,
      databaseType: 'Railway PostgreSQL',
      cardanoServiceUrl: this.cardanoServiceUrl
    });
  }

  /**
   * Generate a new agent wallet with secure storage
   */
  async generateWallet(request: WalletGenerationRequest): Promise<WalletGenerationResult> {
    const startTime = Date.now();
    console.log(`🚀 Generating agent wallet for user: ${request.userId}, agent: ${request.agentId}`);

    try {
      // Validate request
      if (!request.userId || !request.agentId) {
        throw new Error('User ID and Agent ID are required');
      }

      // Check if wallet already exists for this agent
      const existingWallet = await this.getWallet(request.agentId);
      if (existingWallet) {
        console.log('⚠️ Wallet already exists for agent:', request.agentId);
        return {
          success: false,
          error: 'Wallet already exists for this agent'
        };
      }

      // Generate wallet credentials
      console.log('🔧 Generating wallet credentials...');
      const credentials = await walletGenerator.generateNewWallet();

      // Generate encryption password (deterministic per user+agent)
      const encryptionPassword = request.encryptionPassword || 
        walletEncryption.generateDeterministicPassword(request.userId, request.agentId);

      // Encrypt sensitive data
      console.log('🔐 Encrypting wallet credentials...');
      const [encryptedPrivateKey, encryptedMnemonic] = await Promise.all([
        credentials.privateKey ? walletEncryption.encryptData(credentials.privateKey, encryptionPassword) : null,
        walletEncryption.encryptData(credentials.mnemonic, encryptionPassword)
      ]);

      // Create wallet record
      const walletData: Omit<AgentWallet, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: request.userId,
        agentId: request.agentId,
        walletAddress: credentials.address,
        privateKeyEncrypted: encryptedPrivateKey ? JSON.stringify(encryptedPrivateKey) : '',
        encryptionKeyHash: encryptedPrivateKey ? encryptedPrivateKey.keyHash : encryptedMnemonic.keyHash,
        mnemonicEncrypted: JSON.stringify(encryptedMnemonic),
        currentBalanceLovelace: 0,
        currentBalanceAda: 0,
        lastBalanceCheck: new Date(),
        status: 'active' as AgentWalletStatus
      };

      // Convert camelCase to snake_case for database
      const dbWalletData = {
        user_id: walletData.userId,
        agent_id: walletData.agentId,
        wallet_address: walletData.walletAddress,
        private_key_encrypted: walletData.privateKeyEncrypted,
        encryption_key_hash: walletData.encryptionKeyHash,
        mnemonic_encrypted: walletData.mnemonicEncrypted,
        current_balance_lovelace: walletData.currentBalanceLovelace,
        last_balance_check: walletData.lastBalanceCheck,
        status: walletData.status
      };

      // Store in Railway PostgreSQL database
      console.log('💾 Storing wallet in Railway PostgreSQL...');
      const result = await this.db.insert('agent_wallets', dbWalletData);
      const savedWallet: AgentWallet = { 
        ...walletData, 
        id: result.id, 
        createdAt: result.created_at,
        updatedAt: result.updated_at 
      };

      // Initial balance check
      console.log('💰 Checking initial balance...');
      try {
        await this.updateBalance(credentials.address);
      } catch (balanceError) {
        console.log('⚠️ Initial balance check failed (non-critical):', balanceError);
      }

      const executionTime = Date.now() - startTime;
      console.log(`✅ Agent wallet generated successfully in ${executionTime}ms:`, {
        agentId: request.agentId,
        address: credentials.address.substring(0, 20) + '...',
        walletId: savedWallet.id
      });

      return {
        success: true,
        wallet: savedWallet,
        credentials: credentials // Return unencrypted for immediate use
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Agent wallet generation failed after ${executionTime}ms:`, errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get agent wallet by agent ID
   */
  async getWallet(agentId: string): Promise<AgentWallet | null> {
    try {
      console.log(`🔍 Looking up wallet for agent: ${agentId}`);

      const results = await this.db.select('agent_wallets', { agent_id: agentId });
      if (results.length === 0) {
        return null;
      }

      const record = results[0];
      return {
        id: record.id,
        userId: record.user_id,
        agentId: record.agent_id,
        walletAddress: record.wallet_address,
        privateKeyEncrypted: record.private_key_encrypted,
        encryptionKeyHash: record.encryption_key_hash,
        mnemonicEncrypted: record.mnemonic_encrypted,
        currentBalanceLovelace: parseInt(record.current_balance_lovelace) || 0,
        currentBalanceAda: parseFloat(record.current_balance_ada) || 0,
        lastBalanceCheck: new Date(record.last_balance_check),
        status: record.status,
        createdAt: new Date(record.created_at),
        updatedAt: new Date(record.updated_at)
      };

    } catch (error) {
      console.error(`❌ Failed to get wallet for agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Get decrypted wallet credentials
   */
  async getWalletCredentials(agentId: string, encryptionPassword: string): Promise<WalletRecoveryResult> {
    try {
      console.log(`🔐 Recovering credentials for agent: ${agentId}`);

      // Get wallet record
      const wallet = await this.getWallet(agentId);
      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found for agent'
        };
      }

      // Parse encrypted data
      const encryptedPrivateKey = JSON.parse(wallet.privateKeyEncrypted);
      const encryptedMnemonic = JSON.parse(wallet.mnemonicEncrypted);

      // Decrypt credentials
      const [privateKey, mnemonic] = await Promise.all([
        walletEncryption.decryptData(encryptedPrivateKey, encryptionPassword),
        walletEncryption.decryptData(encryptedMnemonic, encryptionPassword)
      ]);

      // Derive public key (if needed)
      const credentials: AgentWalletCredentials = {
        address: wallet.walletAddress,
        privateKey: privateKey,
        mnemonic: mnemonic,
        publicKey: '' // Could derive from private key if needed
      };

      console.log(`✅ Credentials recovered for agent: ${agentId}`);

      return {
        success: true,
        credentials: credentials
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to recover credentials for agent ${agentId}:`, errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Check wallet balance via cardano-service
   */
  async checkBalance(walletAddress: string): Promise<BalanceCheckResult> {
    try {
      console.log(`💰 Checking balance for wallet: ${walletAddress.substring(0, 20)}...`);

      const response = await fetch(`${this.cardanoServiceUrl}/check-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: walletAddress
        }),
      });

      if (!response.ok) {
        throw new Error(`Cardano service error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Balance check failed: ${result.error}`);
      }

      const balanceResult: BalanceCheckResult = {
        address: walletAddress,
        balanceLovelace: parseInt(result.balanceLovelace) || 0,
        balanceAda: parseFloat(result.balanceAda) || 0,
        utxos: result.utxos || [],
        lastChecked: new Date()
      };

      console.log(`✅ Balance check complete: ${balanceResult.balanceAda} ADA`);

      return balanceResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Balance check failed for ${walletAddress}:`, errorMessage);
      
      // Return zero balance on error
      return {
        address: walletAddress,
        balanceLovelace: 0,
        balanceAda: 0,
        utxos: [],
        lastChecked: new Date()
      };
    }
  }

  /**
   * Update wallet balance in database
   */
  async updateBalance(walletAddress: string): Promise<void> {
    try {
      console.log(`🔄 Updating balance for wallet: ${walletAddress.substring(0, 20)}...`);

      // Get current balance from blockchain
      const balanceResult = await this.checkBalance(walletAddress);

      // Update Railway PostgreSQL database
      await this.db.update(
        'agent_wallets',
        {
          current_balance_lovelace: balanceResult.balanceLovelace,
          last_balance_check: balanceResult.lastChecked
        },
        { wallet_address: walletAddress }
      );

      console.log(`✅ Balance updated: ${balanceResult.balanceAda} ADA`);

    } catch (error) {
      console.error(`❌ Failed to update balance for ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * List all wallets for a user
   */
  async listUserWallets(userId: string): Promise<AgentWallet[]> {
    try {
      console.log(`📋 Listing wallets for user: ${userId}`);

      const results = await this.db.select('agent_wallets', { user_id: userId });
      
      const wallets: AgentWallet[] = results.map(record => ({
        id: record.id,
        userId: record.user_id,
        agentId: record.agent_id,
        walletAddress: record.wallet_address,
        privateKeyEncrypted: record.private_key_encrypted,
        encryptionKeyHash: record.encryption_key_hash,
        mnemonicEncrypted: record.mnemonic_encrypted,
        currentBalanceLovelace: parseInt(record.current_balance_lovelace) || 0,
        currentBalanceAda: parseFloat(record.current_balance_ada) || 0,
        lastBalanceCheck: new Date(record.last_balance_check),
        status: record.status,
        createdAt: new Date(record.created_at),
        updatedAt: new Date(record.updated_at)
      }));

      console.log(`✅ Found ${wallets.length} wallets for user: ${userId}`);
      return wallets;

    } catch (error) {
      console.error(`❌ Failed to list wallets for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Update wallet status
   */
  async updateWalletStatus(agentId: string, status: AgentWalletStatus): Promise<void> {
    try {
      console.log(`🔄 Updating status for agent ${agentId} to: ${status}`);

      await this.db.update(
        'agent_wallets',
        { 
          status: status,
          updated_at: new Date()
        },
        { agent_id: agentId }
      );

      console.log(`✅ Status updated for agent: ${agentId}`);

    } catch (error) {
      console.error(`❌ Failed to update status for agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Health check for the wallet manager
   */
  async healthCheck(): Promise<{
    status: string;
    cardanoService: boolean;
    database: boolean;
    timestamp: Date;
  }> {
    const healthStatus = {
      status: 'unknown',
      cardanoService: false,
      database: false,
      timestamp: new Date()
    };

    try {
      // Check cardano service
      const cardanoResponse = await fetch(`${this.cardanoServiceUrl}/health`);
      healthStatus.cardanoService = cardanoResponse.ok;

      // Check Railway PostgreSQL database
      const dbHealth = await this.db.healthCheck();
      healthStatus.database = dbHealth.connected;

      // Overall status
      healthStatus.status = (healthStatus.cardanoService && healthStatus.database) 
        ? 'healthy' 
        : 'degraded';

      return healthStatus;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      healthStatus.status = 'unhealthy';
      return healthStatus;
    }
  }
}

// Export singleton instance (initialized with Railway PostgreSQL)
export const agentWalletManager = new AgentWalletManager();

// Export factory function for dependency injection
export function createAgentWalletManager(
  databaseClient?: DatabaseClient,
  cardanoServiceUrl?: string
): AgentWalletManager {
  return new AgentWalletManager(databaseClient, cardanoServiceUrl);
}