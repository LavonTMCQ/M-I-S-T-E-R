/**
 * Agent Autonomous CBOR Signing Service
 * 
 * This service enables AI agents to sign Strike Finance transactions
 * autonomously without requiring user interaction.
 * 
 * Key Features:
 * - Agents have their own wallets with private keys
 * - Can sign CBOR transactions independently
 * - Full audit trail via Archon MCP
 * - No user signature required for trading
 * 
 * Security:
 * - Private keys encrypted in database
 * - Agent-specific access controls
 * - Complete transaction logging
 */

import { getRailwayDB, DatabaseClient } from '@/lib/database/railway-db';
import { decrypt } from '@/lib/encryption/wallet-encryption';

// We'll need to call Railway service for Mesh operations
const CARDANO_SERVICE_URL = process.env.NEXT_PUBLIC_CARDANO_SERVICE_URL || 
                           'https://friendly-reprieve-production.up.railway.app';

export interface AgentWallet {
  id: string;
  agentId: string;
  walletAddress: string;
  encryptedSeed: string;
  encryptedPrivateKey: string;
  publicKey: string;
  createdAt: Date;
  lastUsed?: Date;
}

export interface SigningResult {
  success: boolean;
  signedCbor?: string;
  txHash?: string;
  error?: string;
  auditLog?: {
    agentId: string;
    action: string;
    timestamp: Date;
    details: any;
  };
}

export class AgentAutonomousSigner {
  private db: DatabaseClient;
  
  constructor(databaseClient?: DatabaseClient) {
    this.db = databaseClient || getRailwayDB();
    console.log('🤖 AgentAutonomousSigner initialized');
  }

  /**
   * Get agent wallet from database
   */
  private async getAgentWallet(agentId: string): Promise<AgentWallet | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM agent_wallets WHERE agent_id = $1 AND status = 'active'`,
        [agentId]
      );
      
      if (!result.rows || result.rows.length === 0) {
        console.log(`No active wallet found for agent ${agentId}`);
        return null;
      }
      
      return {
        id: result.rows[0].id,
        agentId: result.rows[0].agent_id,
        walletAddress: result.rows[0].wallet_address,
        encryptedSeed: result.rows[0].encrypted_seed,
        encryptedPrivateKey: result.rows[0].encrypted_private_key,
        publicKey: result.rows[0].public_key,
        createdAt: result.rows[0].created_at,
        lastUsed: result.rows[0].last_used
      };
    } catch (error) {
      console.error(`Failed to get agent wallet:`, error);
      return null;
    }
  }

  /**
   * Sign Strike Finance CBOR transaction autonomously
   * 
   * This is the KEY method that enables autonomous trading!
   * The agent signs with its own wallet, no user interaction needed.
   */
  async signStrikeTransaction(
    agentId: string, 
    unsignedCbor: string,
    purpose: string = 'strike_trading'
  ): Promise<SigningResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔏 Agent ${agentId} signing transaction autonomously...`);
      
      // 1. Get agent wallet from database
      const agentWallet = await this.getAgentWallet(agentId);
      
      if (!agentWallet) {
        return {
          success: false,
          error: 'Agent wallet not found'
        };
      }
      
      // 2. Decrypt agent's seed phrase
      const decryptedSeed = decrypt(
        agentWallet.encryptedSeed,
        this.getDecryptionKey(agentWallet.agentId)
      );
      
      console.log(`✅ Agent wallet retrieved: ${agentWallet.walletAddress.substring(0, 20)}...`);
      
      // 3. Call Railway service to sign with agent's wallet
      // (Railway service handles Mesh.js operations)
      const signResponse = await fetch(`${CARDANO_SERVICE_URL}/sign-with-seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: decryptedSeed,
          unsignedCbor: unsignedCbor,
          purpose: purpose
        })
      });
      
      const signData = await signResponse.json();
      
      if (!signData.success) {
        throw new Error(signData.error || 'Failed to sign transaction');
      }
      
      // 4. Update last used timestamp
      await this.db.update(
        'agent_wallets',
        { last_used: new Date() },
        { agent_id: agentId }
      );
      
      // 5. Log to audit trail
      await this.logAutonomousAction(agentId, 'sign_transaction', {
        purpose: purpose,
        walletAddress: agentWallet.walletAddress,
        timestamp: new Date()
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Transaction signed autonomously by agent ${agentId} in ${duration}ms`);
      
      return {
        success: true,
        signedCbor: signData.signedCbor,
        auditLog: {
          agentId: agentId,
          action: 'autonomous_sign',
          timestamp: new Date(),
          details: {
            purpose: purpose,
            duration: duration,
            walletAddress: agentWallet.walletAddress
          }
        }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Autonomous signing failed for agent ${agentId}:`, errorMessage);
      
      // Log failure for analysis
      await this.logAutonomousAction(agentId, 'sign_failure', {
        error: errorMessage,
        purpose: purpose
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Execute autonomous trade on Strike Finance
   */
  async executeAutonomousTrade(
    agentId: string,
    tradeSignal: {
      action: 'openPosition' | 'closePosition';
      leverage?: number;
      position?: 'Long' | 'Short';
      collateralAmount?: number;
      positionId?: string;
    }
  ): Promise<SigningResult> {
    try {
      console.log(`🤖 Agent ${agentId} executing autonomous trade...`);
      console.log(`   Action: ${tradeSignal.action}`);
      console.log(`   Position: ${tradeSignal.position || 'N/A'}`);
      console.log(`   Leverage: ${tradeSignal.leverage || 'N/A'}x`);
      
      // 1. Get agent wallet
      const agentWallet = await this.getAgentWallet(agentId);
      if (!agentWallet) {
        throw new Error('Agent wallet not found');
      }
      
      // 2. Build Strike Finance transaction
      let unsignedCbor: string;
      
      if (tradeSignal.action === 'openPosition') {
        // Call Strike API to build open position transaction
        const strikeResponse = await fetch('https://app.strikefinance.org/api/perpetuals/openPosition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request: {
              address: agentWallet.walletAddress,
              asset: { policyId: '', assetName: '' }, // ADA
              assetTicker: 'ADA',
              collateralAmount: tradeSignal.collateralAmount || 50,
              leverage: tradeSignal.leverage || 2,
              position: tradeSignal.position || 'Long'
            }
          })
        });
        
        const strikeData = await strikeResponse.json();
        
        if (!strikeData.cbor) {
          throw new Error('Strike Finance did not return CBOR');
        }
        
        unsignedCbor = strikeData.cbor;
        
      } else {
        // Close position logic
        throw new Error('Close position not yet implemented');
      }
      
      // 3. Agent signs autonomously (NO USER INTERACTION!)
      const signingResult = await this.signStrikeTransaction(
        agentId,
        unsignedCbor,
        `strike_${tradeSignal.action}`
      );
      
      if (!signingResult.success || !signingResult.signedCbor) {
        throw new Error(signingResult.error || 'Failed to sign transaction');
      }
      
      // 4. Submit to Strike Finance
      const submitResponse = await fetch('https://app.strikefinance.org/api/perpetuals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedCbor: signingResult.signedCbor
        })
      });
      
      const submitData = await submitResponse.json();
      
      if (!submitData.success) {
        throw new Error(submitData.error || 'Failed to submit to Strike');
      }
      
      // 5. Log successful trade
      await this.logAutonomousAction(agentId, 'trade_executed', {
        action: tradeSignal.action,
        txHash: submitData.txHash,
        position: tradeSignal.position,
        leverage: tradeSignal.leverage
      });
      
      console.log(`🎉 Autonomous trade executed successfully!`);
      console.log(`   TX Hash: ${submitData.txHash}`);
      
      return {
        success: true,
        txHash: submitData.txHash,
        signedCbor: signingResult.signedCbor,
        auditLog: {
          agentId: agentId,
          action: 'autonomous_trade',
          timestamp: new Date(),
          details: tradeSignal
        }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Autonomous trade failed:`, errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Generate decryption key for agent wallet
   */
  private getDecryptionKey(agentId: string): string {
    // In production, this should be more secure
    // For now, using agent-specific key derivation
    return `agent_${agentId}_key_${process.env.ENCRYPTION_SALT || 'default'}`;
  }

  /**
   * Log autonomous actions for audit trail
   */
  private async logAutonomousAction(
    agentId: string,
    action: string,
    details: any
  ): Promise<void> {
    try {
      await this.db.insert('agent_audit_log', {
        agent_id: agentId,
        action: action,
        details: JSON.stringify(details),
        timestamp: new Date(),
        created_at: new Date()
      });
      
      console.log(`📝 Logged autonomous action: ${action} for agent ${agentId}`);
    } catch (error) {
      console.error('Failed to log autonomous action:', error);
    }
  }

  /**
   * Verify agent has sufficient balance for trading
   */
  async verifyAgentBalance(agentId: string, requiredAmount: number): Promise<boolean> {
    try {
      const agentWallet = await this.getAgentWallet(agentId);
      if (!agentWallet) {
        return false;
      }
      
      // Check balance via Railway service
      const balanceResponse = await fetch(`${CARDANO_SERVICE_URL}/check-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: agentWallet.walletAddress })
      });
      
      const balanceData = await balanceResponse.json();
      
      if (balanceData.success) {
        const balanceAda = balanceData.balanceAda;
        console.log(`Agent ${agentId} balance: ${balanceAda} ADA (required: ${requiredAmount} ADA)`);
        return balanceAda >= requiredAmount;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to verify agent balance:', error);
      return false;
    }
  }
}

// Export singleton instance
export const agentSigner = new AgentAutonomousSigner();