/**
 * Wallet Encryption Utilities
 * 
 * Secure encryption/decryption for agent wallet private keys
 * Uses AES-256-GCM for authenticated encryption
 */

import * as crypto from 'crypto';
import { IWalletEncryption, EncryptedData, EncryptionConfig } from '@/types/agent-wallets/types';

const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  saltLength: 32, // 256 bits
  iterations: 100000 // PBKDF2 iterations
};

export class WalletEncryption implements IWalletEncryption {
  private config: EncryptionConfig;

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Encrypt sensitive data (private keys, mnemonics)
   */
  async encryptData(data: string, password: string): Promise<EncryptedData> {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.config.saltLength);
      const iv = crypto.randomBytes(this.config.ivLength);

      // Derive key from password using PBKDF2
      const key = crypto.pbkdf2Sync(
        password,
        salt,
        this.config.iterations,
        this.config.keyLength,
        'sha256'
      );

      // Create cipher using createCipheriv (modern approach)
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Create HMAC for authentication since CBC doesn't have built-in auth
      const hmac = crypto.createHmac('sha256', key);
      hmac.update(encrypted + salt.toString('hex') + iv.toString('hex'));
      const authTag = hmac.digest();

      // Combine encrypted data with auth tag
      const encryptedContent = encrypted + ':' + authTag.toString('hex');

      // Generate key hash for validation
      const keyHash = this.generateKeyHash(password);

      return {
        encryptedContent,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        keyHash
      };

    } catch (error) {
      console.error('❌ Wallet encryption failed:', error);
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: EncryptedData, password: string): Promise<string> {
    try {
      // Validate password
      if (!this.validatePassword(password, encryptedData.keyHash)) {
        throw new Error('Invalid password');
      }

      // Parse encrypted content and auth tag
      const [encrypted, authTagHex] = encryptedData.encryptedContent.split(':');
      if (!encrypted || !authTagHex) {
        throw new Error('Invalid encrypted data format');
      }

      // Convert hex strings back to buffers
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Derive key from password
      const key = crypto.pbkdf2Sync(
        password,
        salt,
        this.config.iterations,
        this.config.keyLength,
        'sha256'
      );

      // Create decipher using createDecipheriv (modern approach)
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      // Verify HMAC before decryption
      const expectedHmac = crypto.createHmac('sha256', key);
      expectedHmac.update(encrypted + encryptedData.salt + encryptedData.iv);
      const expectedAuthTag = expectedHmac.digest();
      
      if (!crypto.timingSafeEqual(authTag, expectedAuthTag)) {
        throw new Error('Authentication failed - data may be corrupted');
      }

      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      console.error('❌ Wallet decryption failed:', error);
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Invalid password or corrupted data'}`);
    }
  }

  /**
   * Generate key hash for password validation
   */
  generateKeyHash(password: string): string {
    // Use a fixed salt for key hash (this is for validation, not encryption)
    const fixedSalt = 'mrstrike_agent_wallet_validation_salt_2025';
    return crypto.pbkdf2Sync(
      password,
      fixedSalt,
      10000, // Fewer iterations for validation
      32,
      'sha256'
    ).toString('hex');
  }

  /**
   * Validate password against stored key hash
   */
  validatePassword(password: string, keyHash: string): boolean {
    try {
      const computedHash = this.generateKeyHash(password);
      return crypto.timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(keyHash, 'hex')
      );
    } catch (error) {
      console.error('❌ Password validation failed:', error);
      return false;
    }
  }

  /**
   * Generate a secure random password for wallet encryption
   */
  generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Generate deterministic password from user credentials
   * This allows regenerating the same password for a user
   */
  generateDeterministicPassword(userId: string, agentId: string): string {
    // Combine user ID and agent ID with a secret salt
    const input = `${userId}:${agentId}:mrstrike_agent_deterministic_salt_2025`;
    
    // Use HMAC-SHA256 to generate deterministic but secure password
    return crypto
      .createHmac('sha256', process.env.AGENT_WALLET_SECRET || 'default_secret_change_in_production')
      .update(input)
      .digest('hex')
      .substring(0, 32); // Use first 32 chars
  }
}

// Export singleton instance
export const walletEncryption = new WalletEncryption();

// Export factory function for custom configs
export function createWalletEncryption(config: Partial<EncryptionConfig>): WalletEncryption {
  return new WalletEncryption(config);
}