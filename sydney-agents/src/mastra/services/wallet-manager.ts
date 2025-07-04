import * as CSL from '@emurgo/cardano-serialization-lib-nodejs';
import * as bip39 from 'bip39';
import { z } from 'zod';

// Wallet interfaces
export interface WalletInfo {
  userId: string;
  bech32Address: string;
  mnemonic: string;
  createdAt: Date;
  isActive: boolean;
}

export interface CreateWalletResult {
  bech32Address: string;
  mnemonic: string;
  userId: string;
}

// Mock secure storage for development (replace with real KMS in production)
class MockSecureStorage {
  private storage = new Map<string, string>();

  async store(key: string, value: string): Promise<void> {
    // In production, this would use AWS Secrets Manager, HashiCorp Vault, etc.
    this.storage.set(key, this.encrypt(value));
    console.log(`🔐 Stored encrypted data for key: ${key}`);
  }

  async retrieve(key: string): Promise<string | null> {
    const encrypted = this.storage.get(key);
    if (!encrypted) return null;

    const decrypted = this.decrypt(encrypted);
    console.log(`🔓 Retrieved encrypted data for key: ${key}`);
    return decrypted;
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
    console.log(`🗑️ Deleted data for key: ${key}`);
  }

  private encrypt(data: string): string {
    // Mock encryption - in production use proper encryption
    return `encrypted_${Buffer.from(data).toString('base64')}`;
  }

  private decrypt(data: string): string {
    // Mock decryption - in production use proper decryption
    return Buffer.from(data.replace('encrypted_', ''), 'base64').toString();
  }
}

/**
 * WalletManager Service
 * Handles secure creation and management of Cardano wallets for the managed wallet system
 */
export class WalletManager {
  private static instance: WalletManager;
  private secureStorage: MockSecureStorage;
  private walletDatabase = new Map<string, WalletInfo>();

  private constructor() {
    this.secureStorage = new MockSecureStorage();
    console.log('🏦 WalletManager initialized with secure storage');
  }

  static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  /**
   * Creates a new Cardano wallet with 24-word mnemonic
   */
  async createNewWallet(userId?: string): Promise<CreateWalletResult> {
    try {
      console.log('🆕 Creating new managed wallet...');

      // Generate 24-word mnemonic
      const mnemonic = bip39.generateMnemonic(256); // 256 bits = 24 words

      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Generated mnemonic is invalid');
      }

      // Derive Cardano private key from mnemonic
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const rootKey = CSL.Bip32PrivateKey.from_bip39_entropy(
        seed.subarray(0, 32), // First 32 bytes
        Buffer.from('') // Empty passphrase
      );

      // Derive account key (m/1852'/1815'/0')
      const accountKey = rootKey
        .derive(1852 | 0x80000000) // Purpose: 1852' (CIP-1852)
        .derive(1815 | 0x80000000) // Coin type: 1815' (ADA)
        .derive(0 | 0x80000000);   // Account: 0'

      // Derive payment key (m/1852'/1815'/0'/0/0)
      const paymentKey = accountKey
        .derive(0) // External chain
        .derive(0) // Address index
        .to_raw_key();

      // Derive stake key (m/1852'/1815'/0'/2/0)
      const stakeKey = accountKey
        .derive(2) // Stake chain
        .derive(0) // Address index
        .to_raw_key();

      // Create Cardano address
      const paymentCredential = CSL.Credential.from_keyhash(
        paymentKey.to_public().hash()
      );
      const stakeCredential = CSL.Credential.from_keyhash(
        stakeKey.to_public().hash()
      );

      const baseAddress = CSL.BaseAddress.new(
        CSL.NetworkInfo.mainnet().network_id(),
        paymentCredential,
        stakeCredential
      );

      const bech32Address = baseAddress.to_address().to_bech32();

      // Generate unique user ID if not provided
      const walletUserId = userId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Store mnemonic securely
      const mnemonicKey = `wallet_mnemonic_${bech32Address}`;
      await this.secureStorage.store(mnemonicKey, mnemonic);

      // Store wallet info in database
      const walletInfo: WalletInfo = {
        userId: walletUserId,
        bech32Address,
        mnemonic, // This would not be stored in production, only in secure storage
        createdAt: new Date(),
        isActive: true
      };

      this.walletDatabase.set(bech32Address, walletInfo);

      console.log(`✅ Created new managed wallet: ${bech32Address}`);
      console.log(`👤 User ID: ${walletUserId}`);

      return {
        bech32Address,
        mnemonic,
        userId: walletUserId
      };

    } catch (error) {
      console.error('❌ Failed to create wallet:', error);
      throw new Error(`Wallet creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves the private key for a given wallet address
   * SECURITY CRITICAL: This method should be heavily access-controlled
   */
  async getPrivateKeyForAddress(bech32Address: string): Promise<CSL.PrivateKey | null> {
    try {
      console.log(`🔑 Retrieving private key for address: ${bech32Address.substring(0, 20)}...`);

      // Check if wallet exists
      const walletInfo = this.walletDatabase.get(bech32Address);
      if (!walletInfo || !walletInfo.isActive) {
        console.warn(`⚠️ Wallet not found or inactive: ${bech32Address}`);
        return null;
      }

      // Retrieve mnemonic from secure storage
      const mnemonicKey = `wallet_mnemonic_${bech32Address}`;
      const mnemonic = await this.secureStorage.retrieve(mnemonicKey);

      if (!mnemonic) {
        console.error(`❌ Mnemonic not found for address: ${bech32Address}`);
        return null;
      }

      // Derive private key from mnemonic
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const rootKey = CSL.Bip32PrivateKey.from_bip39_entropy(
        seed.subarray(0, 32),
        Buffer.from('')
      );

      const privateKey = rootKey
        .derive(1852 | 0x80000000) // Purpose
        .derive(1815 | 0x80000000) // Coin type
        .derive(0 | 0x80000000)    // Account
        .derive(0)                 // External chain
        .derive(0)                 // Address index
        .to_raw_key();

      console.log(`✅ Private key retrieved successfully for ${bech32Address.substring(0, 20)}...`);
      return privateKey;

    } catch (error) {
      console.error('❌ Failed to retrieve private key:', error);
      return null;
    }
  }

  /**
   * Gets all active managed wallet addresses
   */
  getActiveWallets(): string[] {
    const activeWallets = Array.from(this.walletDatabase.values())
      .filter(wallet => wallet.isActive)
      .map(wallet => wallet.bech32Address);

    console.log(`📊 Found ${activeWallets.length} active managed wallets`);
    return activeWallets;
  }

  /**
   * Gets wallet information by address
   */
  getWalletInfo(bech32Address: string): WalletInfo | null {
    return this.walletDatabase.get(bech32Address) || null;
  }

  /**
   * Deactivates a wallet (soft delete)
   */
  async deactivateWallet(bech32Address: string): Promise<boolean> {
    try {
      const walletInfo = this.walletDatabase.get(bech32Address);
      if (!walletInfo) {
        console.warn(`⚠️ Wallet not found: ${bech32Address}`);
        return false;
      }

      walletInfo.isActive = false;
      this.walletDatabase.set(bech32Address, walletInfo);

      console.log(`🔒 Deactivated wallet: ${bech32Address}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to deactivate wallet:', error);
      return false;
    }
  }

  /**
   * Signs a transaction with the wallet's private key
   */
  async signTransaction(bech32Address: string, txCbor: string): Promise<string | null> {
    try {
      console.log(`✍️ Signing transaction for wallet: ${bech32Address.substring(0, 20)}...`);

      const privateKey = await this.getPrivateKeyForAddress(bech32Address);
      if (!privateKey) {
        console.error(`❌ Cannot retrieve private key for ${bech32Address}`);
        return null;
      }

      // Parse transaction
      const transaction = CSL.Transaction.from_bytes(Buffer.from(txCbor, "hex"));
      const txBody = transaction.body();
      const txHash = CSL.hash_transaction(txBody);

      // Create witness
      const witnesses = CSL.TransactionWitnessSet.new();
      const vkeyWitnesses = CSL.Vkeywitnesses.new();
      const vkeyWitness = CSL.make_vkey_witness(txHash, privateKey);
      vkeyWitnesses.add(vkeyWitness);
      witnesses.set_vkeys(vkeyWitnesses);

      // Create signed transaction
      const signedTx = CSL.Transaction.new(
        txBody,
        witnesses,
        transaction.auxiliary_data()
      );

      const signedTxCbor = Buffer.from(signedTx.to_bytes()).toString('hex');
      console.log(`✅ Transaction signed successfully for ${bech32Address.substring(0, 20)}...`);

      return signedTxCbor;

    } catch (error) {
      console.error('❌ Failed to sign transaction:', error);
      return null;
    }
  }

  /**
   * Validates a Cardano address
   */
  static isValidCardanoAddress(address: string): boolean {
    try {
      CSL.Address.from_bech32(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets wallet statistics
   */
  getWalletStats(): { total: number; active: number; inactive: number } {
    const wallets = Array.from(this.walletDatabase.values());
    const active = wallets.filter(w => w.isActive).length;
    const inactive = wallets.filter(w => !w.isActive).length;

    return {
      total: wallets.length,
      active,
      inactive
    };
  }
}