/**
 * Agent Wallet Types
 * 
 * Type definitions for the agent wallet management system
 */

export interface AgentWallet {
  id: string;
  userId: string;
  agentId: string;
  walletAddress: string;
  privateKeyEncrypted: string;
  encryptionKeyHash: string;
  mnemonicEncrypted: string;
  currentBalanceLovelace: number;
  currentBalanceAda: number;
  lastBalanceCheck: Date;
  status: AgentWalletStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentWalletStatus = 'active' | 'paused' | 'disabled' | 'error';

export interface AgentWalletCredentials {
  address: string;
  privateKey: string;
  mnemonic: string;
  publicKey: string;
}

export interface WalletGenerationRequest {
  userId: string;
  agentId: string;
  encryptionPassword?: string;
}

export interface WalletGenerationResult {
  success: boolean;
  wallet?: AgentWallet;
  credentials?: AgentWalletCredentials;
  error?: string;
}

export interface BalanceCheckResult {
  address: string;
  balanceLovelace: number;
  balanceAda: number;
  utxos: Array<{
    txHash: string;
    outputIndex: number;
    amount: string;
    assets: any[];
  }>;
  lastChecked: Date;
}

export interface WalletRecoveryRequest {
  walletId: string;
  encryptionPassword: string;
}

export interface WalletRecoveryResult {
  success: boolean;
  credentials?: AgentWalletCredentials;
  error?: string;
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
}

export interface EncryptedData {
  encryptedContent: string;
  salt: string;
  iv: string;
  keyHash: string;
}

export interface WalletTransaction {
  id: string;
  walletAddress: string;
  type: 'incoming' | 'outgoing';
  amountLovelace: number;
  amountAda: number;
  txHash: string;
  blockHeight: number;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
}

// Agent wallet manager interface
export interface IAgentWalletManager {
  generateWallet(request: WalletGenerationRequest): Promise<WalletGenerationResult>;
  getWallet(agentId: string): Promise<AgentWallet | null>;
  getWalletCredentials(agentId: string, encryptionPassword: string): Promise<WalletRecoveryResult>;
  checkBalance(walletAddress: string): Promise<BalanceCheckResult>;
  updateBalance(walletAddress: string): Promise<void>;
  listUserWallets(userId: string): Promise<AgentWallet[]>;
  updateWalletStatus(agentId: string, status: AgentWalletStatus): Promise<void>;
}

// Wallet generator interface
export interface IWalletGenerator {
  generateNewWallet(): Promise<AgentWalletCredentials>;
  validateAddress(address: string): boolean;
  deriveAddressFromMnemonic(mnemonic: string): Promise<AgentWalletCredentials>;
}

// Encryption interface
export interface IWalletEncryption {
  encryptData(data: string, password: string): Promise<EncryptedData>;
  decryptData(encryptedData: EncryptedData, password: string): Promise<string>;
  generateKeyHash(password: string): string;
  validatePassword(password: string, keyHash: string): boolean;
}