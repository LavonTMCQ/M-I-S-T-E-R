/**
 * Vault-Agent Capital Allocation Bridge
 * 
 * Manages capital flow between user vaults and agent wallets:
 * - User Vault → Agent Wallet (capital allocation)
 * - Agent Wallet → User Vault (profit/loss return)
 * 
 * Integrates with:
 * - Working cardano-service for vault operations
 * - Railway PostgreSQL for allocation tracking
 * - AgentWalletManager for wallet management
 */

import { getRailwayDB, DatabaseClient } from '@/lib/database/railway-db';
import { AgentWalletManager, createAgentWalletManager } from './AgentWalletManager';

// Capital allocation interfaces
export interface CapitalAllocationRequest {
  userVaultAddress: string;
  agentId: string;
  amountADA: number;
  purpose: string;
  maxAllowedADA?: number; // Risk limit
}

export interface CapitalAllocationResult {
  success: boolean;
  allocationId?: string;
  txHash?: string;
  allocatedAmount?: number;
  agentWalletAddress?: string;
  error?: string;
}

export interface CapitalReturnRequest {
  allocationId: string;
  amountADA: number;
  pnlADA: number; // Profit/loss from trading
  reason: string;
}

export interface CapitalReturnResult {
  success: boolean;
  returnTxHash?: string;
  returnedAmount?: number;
  netPnL?: number;
  error?: string;
}

export interface AllocationStatus {
  id: string;
  userVaultAddress: string;
  agentWalletAddress: string;
  amountADA: number;
  status: 'pending' | 'active' | 'returned' | 'failed' | 'lost';
  allocatedAt: Date;
  returnedAt?: Date;
  netPnLADA: number;
  allocationTxHash?: string;
  returnTxHash?: string;
}

export class VaultAgentBridge {
  private db: DatabaseClient;
  private walletManager: AgentWalletManager;
  private cardanoServiceUrl: string;

  constructor(
    databaseClient?: DatabaseClient,
    walletManager?: AgentWalletManager,
    cardanoServiceUrl: string = process.env.NEXT_PUBLIC_CARDANO_SERVICE_URL || process.env.CARDANO_SERVICE_URL || 'http://localhost:3001'
  ) {
    this.db = databaseClient || getRailwayDB();
    this.walletManager = walletManager || createAgentWalletManager();
    this.cardanoServiceUrl = cardanoServiceUrl;

    console.log('🌉 VaultAgentBridge initialized');
    console.log('📊 Config:', {
      hasDatabase: true,
      hasWalletManager: true,
      cardanoServiceUrl: this.cardanoServiceUrl
    });
  }

  /**
   * Allocate capital from user vault to agent wallet
   */
  async allocateCapitalToAgent(request: CapitalAllocationRequest): Promise<CapitalAllocationResult> {
    const startTime = Date.now();
    console.log(`💰 Allocating ${request.amountADA} ADA from vault to agent ${request.agentId}`);

    try {
      // Validate request
      const validation = await this.validateAllocationRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Get or create agent wallet
      let agentWallet = await this.walletManager.getWallet(request.agentId);
      if (!agentWallet) {
        console.log('🔧 Agent wallet not found, creating new one...');
        const walletResult = await this.walletManager.generateWallet({
          userId: request.userVaultAddress, // Use vault address as user ID for now
          agentId: request.agentId
        });

        if (!walletResult.success || !walletResult.wallet) {
          return {
            success: false,
            error: `Failed to create agent wallet: ${walletResult.error}`
          };
        }

        agentWallet = walletResult.wallet;
      }

      // Create allocation record (pending)
      const allocationData = {
        user_vault_address: request.userVaultAddress,
        agent_wallet_address: agentWallet.walletAddress,
        amount_lovelace: request.amountADA * 1_000_000,
        purpose: request.purpose,
        status: 'pending'
      };

      const allocation = await this.db.insert('vault_agent_allocations', allocationData);
      console.log(`📝 Created allocation record: ${allocation.id}`);

      // Execute vault → agent transfer via cardano-service
      console.log('🔄 Executing vault → agent transfer...');
      const transferResult = await this.executeVaultToAgentTransfer(
        request.userVaultAddress,
        agentWallet.walletAddress,
        request.amountADA
      );

      if (!transferResult.success) {
        // Mark allocation as failed
        await this.db.update(
          'vault_agent_allocations',
          { status: 'failed' },
          { id: allocation.id }
        );

        return {
          success: false,
          error: `Transfer failed: ${transferResult.error}`
        };
      }

      // Update allocation record with transaction hash
      await this.db.update(
        'vault_agent_allocations',
        {
          status: 'active',
          allocation_tx_hash: transferResult.txHash,
          allocation_tx_confirmed: true
        },
        { id: allocation.id }
      );

      // Update agent wallet balance
      await this.walletManager.updateBalance(agentWallet.walletAddress);

      const executionTime = Date.now() - startTime;
      console.log(`✅ Capital allocation completed in ${executionTime}ms:`, {
        allocationId: allocation.id,
        txHash: transferResult.txHash,
        amount: request.amountADA
      });

      return {
        success: true,
        allocationId: allocation.id,
        txHash: transferResult.txHash,
        allocatedAmount: request.amountADA,
        agentWalletAddress: agentWallet.walletAddress
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Capital allocation failed after ${executionTime}ms:`, errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Return capital from agent wallet to user vault
   */
  async returnCapitalToVault(request: CapitalReturnRequest): Promise<CapitalReturnResult> {
    const startTime = Date.now();
    console.log(`💸 Returning capital for allocation ${request.allocationId}`);

    try {
      // Get allocation record
      const allocations = await this.db.select('vault_agent_allocations', { id: request.allocationId });
      if (allocations.length === 0) {
        return {
          success: false,
          error: 'Allocation not found'
        };
      }

      const allocation = allocations[0];
      if (allocation.status !== 'active') {
        return {
          success: false,
          error: `Cannot return capital from allocation with status: ${allocation.status}`
        };
      }

      // Calculate return amount (original + P&L)
      const returnAmountADA = request.amountADA;
      console.log(`💰 Returning ${returnAmountADA} ADA (P&L: ${request.pnlADA} ADA)`);

      // Execute agent → vault transfer via cardano-service
      console.log('🔄 Executing agent → vault transfer...');
      const transferResult = await this.executeAgentToVaultTransfer(
        allocation.agent_wallet_address,
        allocation.user_vault_address,
        returnAmountADA
      );

      if (!transferResult.success) {
        return {
          success: false,
          error: `Return transfer failed: ${transferResult.error}`
        };
      }

      // Update allocation record
      await this.db.update(
        'vault_agent_allocations',
        {
          status: 'returned',
          return_tx_hash: transferResult.txHash,
          return_tx_confirmed: true,
          returned_amount_lovelace: returnAmountADA * 1_000_000,
          returned_at: new Date()
        },
        { id: request.allocationId }
      );

      // Update agent wallet balance
      await this.walletManager.updateBalance(allocation.agent_wallet_address);

      // Record transaction in audit trail
      await this.recordTransaction({
        agentWalletAddress: allocation.agent_wallet_address,
        type: 'allocation_returned',
        amountADA: -returnAmountADA, // Negative for outgoing
        txHash: transferResult.txHash,
        allocationId: request.allocationId,
        description: `Capital return: ${request.reason}`
      });

      const executionTime = Date.now() - startTime;
      console.log(`✅ Capital return completed in ${executionTime}ms:`, {
        returnTxHash: transferResult.txHash,
        returnedAmount: returnAmountADA,
        netPnL: request.pnlADA
      });

      return {
        success: true,
        returnTxHash: transferResult.txHash,
        returnedAmount: returnAmountADA,
        netPnL: request.pnlADA
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Capital return failed after ${executionTime}ms:`, errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get allocation status
   */
  async getAllocationStatus(allocationId: string): Promise<AllocationStatus | null> {
    try {
      const allocations = await this.db.select('vault_agent_allocations', { id: allocationId });
      if (allocations.length === 0) {
        return null;
      }

      const allocation = allocations[0];
      return {
        id: allocation.id,
        userVaultAddress: allocation.user_vault_address,
        agentWalletAddress: allocation.agent_wallet_address,
        amountADA: parseFloat(allocation.amount_ada),
        status: allocation.status,
        allocatedAt: new Date(allocation.allocated_at),
        returnedAt: allocation.returned_at ? new Date(allocation.returned_at) : undefined,
        netPnLADA: parseFloat(allocation.net_pnl_ada) || 0,
        allocationTxHash: allocation.allocation_tx_hash,
        returnTxHash: allocation.return_tx_hash
      };

    } catch (error) {
      console.error(`❌ Failed to get allocation status for ${allocationId}:`, error);
      return null;
    }
  }

  /**
   * List all allocations for a user vault
   */
  async getUserAllocations(userVaultAddress: string): Promise<AllocationStatus[]> {
    try {
      const allocations = await this.db.select('vault_agent_allocations', { 
        user_vault_address: userVaultAddress 
      });

      return allocations.map(allocation => ({
        id: allocation.id,
        userVaultAddress: allocation.user_vault_address,
        agentWalletAddress: allocation.agent_wallet_address,
        amountADA: parseFloat(allocation.amount_ada),
        status: allocation.status,
        allocatedAt: new Date(allocation.allocated_at),
        returnedAt: allocation.returned_at ? new Date(allocation.returned_at) : undefined,
        netPnLADA: parseFloat(allocation.net_pnl_ada) || 0,
        allocationTxHash: allocation.allocation_tx_hash,
        returnTxHash: allocation.return_tx_hash
      }));

    } catch (error) {
      console.error(`❌ Failed to get user allocations for ${userVaultAddress}:`, error);
      return [];
    }
  }

  /**
   * Validate allocation request
   */
  private async validateAllocationRequest(request: CapitalAllocationRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate vault address
    if (!request.userVaultAddress || !request.userVaultAddress.startsWith('addr1')) {
      errors.push('Invalid vault address');
    }

    // Validate agent ID
    if (!request.agentId || request.agentId.length < 3) {
      errors.push('Invalid agent ID');
    }

    // Validate amount
    if (request.amountADA <= 0) {
      errors.push('Amount must be positive');
    }

    if (request.amountADA < 1) {
      errors.push('Minimum allocation is 1 ADA');
    }

    if (request.amountADA > 100) {
      warnings.push('Large allocation amount - consider risk limits');
    }

    // Check max allowed amount
    if (request.maxAllowedADA && request.amountADA > request.maxAllowedADA) {
      errors.push(`Amount exceeds maximum allowed: ${request.maxAllowedADA} ADA`);
    }

    // Check for existing active allocations (risk management)
    try {
      const existingAllocations = await this.db.select('vault_agent_allocations', {
        user_vault_address: request.userVaultAddress,
        status: 'active'
      });

      const totalActiveADA = existingAllocations.reduce((sum, alloc) => 
        sum + parseFloat(alloc.amount_ada), 0
      );

      if (totalActiveADA + request.amountADA > 200) {
        warnings.push('Total active allocations would exceed 200 ADA');
      }
    } catch (error) {
      warnings.push('Could not verify existing allocations');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Execute vault to agent transfer via cardano-service
   */
  private async executeVaultToAgentTransfer(
    vaultAddress: string,
    agentAddress: string,
    amountADA: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log(`🔗 Calling cardano-service for vault → agent transfer...`);
      
      const response = await fetch(`${this.cardanoServiceUrl}/vault-to-agent-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultAddress,
          agentAddress,
          amountLovelace: amountADA * 1_000_000,
          userSeed: process.env.LIVE_TEST_USER_SEED // Add user seed for transaction signing
        })
      });

      if (!response.ok) {
        throw new Error(`Transfer service error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Transfer failed');
      }

      return {
        success: true,
        txHash: result.txHash
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown transfer error';
      console.error('❌ Vault → Agent transfer failed:', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Execute agent to vault transfer via cardano-service
   */
  private async executeAgentToVaultTransfer(
    agentAddress: string,
    vaultAddress: string,
    amountADA: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log(`🔗 Calling cardano-service for agent → vault transfer...`);
      
      // This will need to be implemented in cardano-service
      const response = await fetch(`${this.cardanoServiceUrl}/agent-to-vault-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentAddress,
          vaultAddress,
          amountLovelace: amountADA * 1_000_000
        })
      });

      if (!response.ok) {
        throw new Error(`Transfer service error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Transfer failed');
      }

      return {
        success: true,
        txHash: result.txHash
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown transfer error';
      console.error('❌ Agent → Vault transfer failed:', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Record transaction in audit trail
   */
  private async recordTransaction(params: {
    agentWalletAddress: string;
    type: string;
    amountADA: number;
    txHash?: string;
    allocationId?: string;
    description: string;
  }): Promise<void> {
    try {
      await this.db.insert('agent_wallet_transactions', {
        agent_wallet_address: params.agentWalletAddress,
        transaction_type: params.type,
        amount_lovelace: params.amountADA * 1_000_000,
        tx_hash: params.txHash,
        related_allocation_id: params.allocationId,
        description: params.description
      });
    } catch (error) {
      console.error('⚠️ Failed to record transaction:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Health check for the bridge
   */
  async healthCheck(): Promise<{
    status: string;
    database: boolean;
    walletManager: boolean;
    cardanoService: boolean;
  }> {
    try {
      // Check database
      const dbHealth = await this.db.healthCheck();
      
      // Check wallet manager
      const walletHealth = await this.walletManager.healthCheck();
      
      // Check cardano service
      const cardanoResponse = await fetch(`${this.cardanoServiceUrl}/health`);
      const cardanoOk = cardanoResponse.ok;

      const allHealthy = dbHealth.connected && walletHealth.database && cardanoOk;

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        database: dbHealth.connected,
        walletManager: walletHealth.database,
        cardanoService: cardanoOk
      };

    } catch (error) {
      console.error('❌ Bridge health check failed:', error);
      return {
        status: 'unhealthy',
        database: false,
        walletManager: false,
        cardanoService: false
      };
    }
  }
}

// Export singleton instance
export const vaultAgentBridge = new VaultAgentBridge();

// Export factory function
export function createVaultAgentBridge(
  databaseClient?: DatabaseClient,
  walletManager?: AgentWalletManager,
  cardanoServiceUrl?: string
): VaultAgentBridge {
  return new VaultAgentBridge(databaseClient, walletManager, cardanoServiceUrl);
}