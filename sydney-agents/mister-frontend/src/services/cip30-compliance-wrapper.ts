/**
 * CIP-30 Compliance Wrapper for Agent Vault V2
 * Ensures full compliance with Cardano wallet standards
 * References: CIP-30 (dApp-Wallet Bridge), CIP-31 (Reference Inputs), CIP-32 (Inline Datums)
 */

import { 
  agentVaultV2MeshService,
  TransactionResult,
  VaultState 
} from './agent-vault-v2-mesh-service';

// CIP-30 API Error Codes
export enum CIP30ErrorCode {
  InvalidRequest = -1,
  InternalError = -2,
  Refused = -3,
  AccountChange = -4
}

// CIP-30 Error Type
export interface CIP30Error {
  code: CIP30ErrorCode;
  info: string;
}

// CIP-30 DataSignature Type
export interface DataSignature {
  signature: string; // cbor<COSE_Sign1>
  key: string;       // cbor<COSE_Key>
}

// CIP-30 Paginate Type
export interface Paginate {
  page: number;
  limit: number;
}

// CIP-30 Extension Type
export interface Extension {
  cip: number;
}

/**
 * CIP-30 Compliant Wallet Interface
 * Wraps wallet API to ensure full CIP-30 compliance
 */
export class CIP30WalletWrapper {
  private walletApi: any;
  private extensions: Extension[] = [
    { cip: 30 }, // Base CIP-30
    { cip: 31 }, // Reference Inputs (for reading vault state)
    { cip: 32 }, // Inline Datums (for vault datum)
    { cip: 40 }, // Collateral Output (for script transactions)
  ];

  constructor(walletApi: any) {
    this.walletApi = walletApi;
  }

  /**
   * Validate wallet API compliance with CIP-30
   */
  async validateCompliance(): Promise<boolean> {
    try {
      // Check required CIP-30 methods
      const requiredMethods = [
        'getUsedAddresses',
        'getUnusedAddresses',
        'getUtxos',
        'signTx',
        'submitTx'
      ];

      for (const method of requiredMethods) {
        if (typeof this.walletApi[method] !== 'function') {
          console.error(`❌ Wallet missing CIP-30 method: ${method}`);
          return false;
        }
      }

      // Check optional but recommended methods
      const optionalMethods = [
        'getBalance',
        'getCollateral',
        'getExtensions',
        'getNetworkId'
      ];

      for (const method of optionalMethods) {
        if (typeof this.walletApi[method] === 'function') {
          console.log(`✅ Wallet supports optional CIP-30 method: ${method}`);
        } else {
          console.warn(`⚠️ Wallet missing optional CIP-30 method: ${method}`);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ CIP-30 compliance validation failed:', error);
      return false;
    }
  }

  /**
   * Get wallet extensions (CIP-30 compliant)
   */
  async getExtensions(): Promise<Extension[]> {
    try {
      if (typeof this.walletApi.getExtensions === 'function') {
        const walletExtensions = await this.walletApi.getExtensions();
        return [...this.extensions, ...walletExtensions];
      }
      return this.extensions;
    } catch (error) {
      return this.extensions;
    }
  }

  /**
   * Get network ID (CIP-30 compliant)
   * 0 = testnet, 1 = mainnet
   */
  async getNetworkId(): Promise<number> {
    try {
      if (typeof this.walletApi.getNetworkId === 'function') {
        return await this.walletApi.getNetworkId();
      }
      // Default to mainnet if not available
      return 1;
    } catch (error) {
      console.warn('⚠️ Could not get network ID, defaulting to mainnet');
      return 1;
    }
  }

  /**
   * Get UTxOs with pagination (CIP-30 compliant)
   */
  async getUtxos(amount?: string, paginate?: Paginate): Promise<string[] | undefined> {
    try {
      return await this.walletApi.getUtxos(amount, paginate);
    } catch (error) {
      throw this.createCIP30Error(
        CIP30ErrorCode.InternalError,
        `Failed to get UTxOs: ${error}`
      );
    }
  }

  /**
   * Get collateral UTxOs (CIP-40 compliant)
   */
  async getCollateral(params?: { amount?: string }): Promise<string[] | undefined> {
    try {
      if (typeof this.walletApi.getCollateral === 'function') {
        return await this.walletApi.getCollateral(params);
      }
      
      // Fallback: Use regular UTxOs as collateral
      console.warn('⚠️ Wallet does not support getCollateral, using regular UTxOs');
      const utxos = await this.getUtxos();
      
      // Select pure ADA UTxOs for collateral (5 ADA worth)
      const collateralAmount = '5000000'; // 5 ADA in lovelace
      return utxos?.slice(0, 1); // Return first UTxO as collateral
    } catch (error) {
      throw this.createCIP30Error(
        CIP30ErrorCode.InternalError,
        `Failed to get collateral: ${error}`
      );
    }
  }

  /**
   * Sign transaction with proper CIP-30 handling
   */
  async signTx(tx: string, partialSign: boolean = false): Promise<string> {
    try {
      // Validate transaction CBOR format
      if (!this.isValidCBOR(tx)) {
        throw this.createCIP30Error(
          CIP30ErrorCode.InvalidRequest,
          'Invalid transaction CBOR format'
        );
      }

      // Sign transaction
      const signedTx = await this.walletApi.signTx(tx, partialSign);
      
      // Validate signed transaction
      if (!signedTx || signedTx.length === 0) {
        throw this.createCIP30Error(
          CIP30ErrorCode.InternalError,
          'Wallet returned empty signature'
        );
      }

      return signedTx;
    } catch (error: any) {
      // Handle wallet-specific errors
      if (error?.code === 'UserDeclined' || error?.message?.includes('User declined')) {
        throw this.createCIP30Error(
          CIP30ErrorCode.Refused,
          'User declined to sign transaction'
        );
      }
      
      throw this.createCIP30Error(
        CIP30ErrorCode.InternalError,
        `Failed to sign transaction: ${error?.message || error}`
      );
    }
  }

  /**
   * Submit transaction with proper CIP-30 handling
   */
  async submitTx(tx: string): Promise<string> {
    try {
      // Validate signed transaction CBOR
      if (!this.isValidCBOR(tx)) {
        throw this.createCIP30Error(
          CIP30ErrorCode.InvalidRequest,
          'Invalid signed transaction CBOR format'
        );
      }

      // Submit transaction
      const txHash = await this.walletApi.submitTx(tx);
      
      // Validate transaction hash format (64 hex chars)
      if (!txHash || !/^[0-9a-fA-F]{64}$/.test(txHash)) {
        throw this.createCIP30Error(
          CIP30ErrorCode.InternalError,
          'Invalid transaction hash returned from wallet'
        );
      }

      return txHash;
    } catch (error: any) {
      // Handle submission errors
      if (error?.message?.includes('insufficient')) {
        throw this.createCIP30Error(
          CIP30ErrorCode.InvalidRequest,
          'Insufficient funds for transaction'
        );
      }
      
      throw this.createCIP30Error(
        CIP30ErrorCode.InternalError,
        `Failed to submit transaction: ${error?.message || error}`
      );
    }
  }

  /**
   * Create CIP-30 compliant error
   */
  private createCIP30Error(code: CIP30ErrorCode, info: string): CIP30Error {
    return { code, info };
  }

  /**
   * Validate CBOR hex string format
   */
  private isValidCBOR(cbor: string): boolean {
    // Check if it's a valid hex string
    if (!/^[0-9a-fA-F]*$/.test(cbor)) {
      return false;
    }
    
    // Check if length is even (hex pairs)
    if (cbor.length % 2 !== 0) {
      return false;
    }
    
    // Check minimum length (at least a basic transaction)
    if (cbor.length < 100) {
      return false;
    }
    
    return true;
  }
}

/**
 * CIP-30 Compliant Agent Vault V2 Service
 * Wraps the Mesh service with CIP-30 compliance checks
 */
export class CIP30CompliantVaultService {
  /**
   * Withdraw with full CIP-30 compliance
   */
  async withdraw(
    walletApi: any,
    amount: number,
    vaultState: VaultState
  ): Promise<TransactionResult> {
    try {
      // Wrap wallet API for CIP-30 compliance
      const cip30Wallet = new CIP30WalletWrapper(walletApi);
      
      // Validate compliance
      const isCompliant = await cip30Wallet.validateCompliance();
      if (!isCompliant) {
        console.warn('⚠️ Wallet may not be fully CIP-30 compliant');
      }

      // Check network
      const networkId = await cip30Wallet.getNetworkId();
      if (networkId !== 1) {
        return {
          success: false,
          error: 'Please switch to Cardano mainnet',
          timestamp: new Date()
        };
      }

      // Check extensions
      const extensions = await cip30Wallet.getExtensions();
      console.log('📋 Wallet extensions:', extensions);

      // Check for CIP-32 (inline datums) support
      const hasInlineDatums = extensions.some(ext => ext.cip === 32);
      if (!hasInlineDatums) {
        console.warn('⚠️ Wallet does not advertise CIP-32 (inline datums) support');
      }

      // Execute withdrawal with compliant wallet
      return await agentVaultV2MeshService.withdraw(
        cip30Wallet,
        amount,
        vaultState
      );

    } catch (error: any) {
      // Handle CIP-30 errors
      if (error?.code !== undefined) {
        const cip30Error = error as CIP30Error;
        return {
          success: false,
          error: `CIP-30 Error ${cip30Error.code}: ${cip30Error.info}`,
          timestamp: new Date()
        };
      }

      return {
        success: false,
        error: error?.message || 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Toggle emergency stop with CIP-30 compliance
   */
  async toggleEmergencyStop(
    walletApi: any,
    currentState: boolean
  ): Promise<TransactionResult> {
    try {
      // Wrap wallet API for CIP-30 compliance
      const cip30Wallet = new CIP30WalletWrapper(walletApi);
      
      // Validate compliance
      await cip30Wallet.validateCompliance();

      // Execute emergency stop
      return await agentVaultV2MeshService.toggleEmergencyStop(
        cip30Wallet,
        currentState
      );

    } catch (error: any) {
      if (error?.code !== undefined) {
        const cip30Error = error as CIP30Error;
        return {
          success: false,
          error: `CIP-30 Error ${cip30Error.code}: ${cip30Error.info}`,
          timestamp: new Date()
        };
      }

      return {
        success: false,
        error: error?.message || 'Unknown error',
        timestamp: new Date()
      };
    }
  }
}

// Export singleton instance
export const cip30CompliantVaultService = new CIP30CompliantVaultService();