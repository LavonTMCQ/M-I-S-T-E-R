/**
 * Agent Wallet Generator
 * 
 * Generates new Cardano wallets for AI agents using MeshJS
 * Integrates with the existing working Cardano service architecture
 */

import { IWalletGenerator, AgentWalletCredentials } from '@/types/agent-wallets/types';

// NOTE: We don't import MeshJS directly here to avoid WASM issues in Next.js
// Instead, we'll make API calls to our working cardano-service

const CARDANO_SERVICE_URL = process.env.NEXT_PUBLIC_CARDANO_SERVICE_URL || process.env.CARDANO_SERVICE_URL || 'http://localhost:3001';

export class WalletGenerator implements IWalletGenerator {

  /**
   * Generate a new wallet by calling the cardano-service
   * This avoids WASM conflicts by using the proven working service
   */
  async generateNewWallet(): Promise<AgentWalletCredentials> {
    try {
      console.log('🔧 Generating new agent wallet via cardano-service...');

      // Call the working cardano-service to generate credentials
      const response = await fetch(`${CARDANO_SERVICE_URL}/generate-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purpose: 'agent_wallet_generation'
        }),
      });

      if (!response.ok) {
        throw new Error(`Cardano service error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Wallet generation failed: ${result.error}`);
      }

      // Map cardano-service response to our credentials format
      const credentials: AgentWalletCredentials = {
        address: result.address,
        privateKey: result.privateKey || '', // May not be provided by cardano-service
        mnemonic: Array.isArray(result.mnemonic) ? result.mnemonic.join(' ') : result.mnemonic || result.seed,
        publicKey: result.publicKey || ''
      };

      // Validate address format
      if (!this.validateAddress(credentials.address)) {
        throw new Error('Generated wallet address is invalid');
      }

      console.log('✅ Agent wallet generated successfully:', {
        address: credentials.address.substring(0, 20) + '...',
        hasPrivateKey: !!credentials.privateKey,
        hasMnemonic: !!credentials.mnemonic,
        hasPublicKey: !!credentials.publicKey
      });

      return credentials;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Agent wallet generation failed:', errorMessage);
      throw new Error(`Failed to generate agent wallet: ${errorMessage}`);
    }
  }

  /**
   * Validate Cardano address format
   */
  validateAddress(address: string): boolean {
    // Basic Cardano address validation
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Check if it's a valid Cardano address (starts with addr1 for mainnet or addr_test1 for testnet)
    const isMainnet = address.startsWith('addr1');
    const isTestnet = address.startsWith('addr_test1');
    
    if (!isMainnet && !isTestnet) {
      return false;
    }

    // Check length (Cardano addresses are typically 103 characters)
    if (address.length < 50 || address.length > 120) {
      return false;
    }

    // Check if it contains only valid Bech32 characters
    const bech32Pattern = /^[a-z0-9]+$/;
    const addressWithoutPrefix = isMainnet ? address.substring(5) : address.substring(10);
    
    return bech32Pattern.test(addressWithoutPrefix);
  }

  /**
   * Derive wallet credentials from an existing mnemonic
   * Useful for wallet recovery or testing
   */
  async deriveAddressFromMnemonic(mnemonic: string): Promise<AgentWalletCredentials> {
    try {
      console.log('🔧 Deriving wallet from mnemonic via cardano-service...');

      // Call the cardano-service to derive credentials from mnemonic
      const response = await fetch(`${CARDANO_SERVICE_URL}/derive-from-mnemonic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mnemonic: mnemonic,
          purpose: 'agent_wallet_recovery'
        }),
      });

      if (!response.ok) {
        throw new Error(`Cardano service error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Wallet derivation failed: ${result.error}`);
      }

      const credentials: AgentWalletCredentials = {
        address: result.address,
        privateKey: result.privateKey,
        mnemonic: mnemonic,
        publicKey: result.publicKey
      };

      // Validate derived address
      if (!this.validateAddress(credentials.address)) {
        throw new Error('Derived wallet address is invalid');
      }

      console.log('✅ Wallet derived from mnemonic successfully:', {
        address: credentials.address.substring(0, 20) + '...'
      });

      return credentials;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Wallet derivation failed:', errorMessage);
      throw new Error(`Failed to derive wallet: ${errorMessage}`);
    }
  }

  /**
   * Check if the cardano-service is healthy and available
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${CARDANO_SERVICE_URL}/health`, {
        method: 'GET',
        timeout: 5000, // 5 second timeout
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Cardano service health check failed:', error);
      return false;
    }
  }

  /**
   * Get current network information from cardano-service
   */
  async getNetworkInfo(): Promise<{
    network: string;
    isMainnet: boolean;
    serviceUrl: string;
  }> {
    try {
      const response = await fetch(`${CARDANO_SERVICE_URL}/network-info`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to get network info');
      }

      const result = await response.json();

      return {
        network: result.network || 'unknown',
        isMainnet: result.network === 'mainnet',
        serviceUrl: CARDANO_SERVICE_URL
      };

    } catch (error) {
      console.error('❌ Failed to get network info:', error);
      // Return default info
      return {
        network: 'unknown',
        isMainnet: false,
        serviceUrl: CARDANO_SERVICE_URL
      };
    }
  }
}

// Export singleton instance
export const walletGenerator = new WalletGenerator();

// Export factory function for testing with different service URLs
export function createWalletGenerator(serviceUrl?: string): WalletGenerator {
  const generator = new WalletGenerator();
  if (serviceUrl) {
    // Override the service URL for testing
    (generator as any).serviceUrl = serviceUrl;
  }
  return generator;
}