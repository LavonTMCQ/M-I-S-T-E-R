/**
 * IWalletConnector - Universal Wallet Interface
 * 
 * This interface abstracts wallet operations across different blockchain
 * ecosystems (Cardano CIP-30, EVM EIP-1193) to enable unified wallet
 * management from a single interface.
 */

// Main Wallet Connector Interface
export interface IWalletConnector {
  // Connection Management
  connect(): Promise<WalletConnectionResult>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  
  // Address Management
  getAddresses(): Promise<WalletAddresses>;
  
  // Transaction Signing
  sign(payload: TransactionPayload): Promise<SignatureResult>;
  
  // Wallet Information
  getWalletInfo(): Promise<WalletInfo>;
  
  // Event Handling
  onAccountsChanged(callback: (addresses: WalletAddresses) => void): void;
  onDisconnect(callback: () => void): void;
}

// Transaction Payload Types (Discriminated Union)
export type TransactionPayload = CardanoTxPayload | EvmTxPayload;

export interface CardanoTxPayload {
  chain: 'cardano';
  cbor: string;           // The transaction CBOR to be signed
  isPartialSign?: boolean; // Whether to sign just a witness or the whole tx
  metadata?: {
    [key: string]: any;
  };
}

export interface EvmTxPayload {
  chain: 'evm';
  typedData: EIP712TypedData; // The EIP-712 object for signing
  signerAddress: string;      // Address that should sign
}

// EIP-712 Typed Data Structure
export interface EIP712TypedData {
  types: {
    [typeName: string]: Array<{
      name: string;
      type: string;
    }>;
  };
  primaryType: string;
  domain: {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
    salt?: string;
  };
  message: {
    [key: string]: any;
  };
}

// Result Types
export interface WalletConnectionResult {
  success: boolean;
  addresses: WalletAddresses;
  supportedChains: ('cardano' | 'evm')[];
  walletName: string;
  error?: string;
}

export interface WalletAddresses {
  cardano?: {
    mainAddress: string;    // Primary Cardano address
    stakeAddress?: string;  // Stake key address
    changeAddress?: string; // Change address
  };
  evm?: {
    address: string;        // Primary EVM address
    chainId: number;        // Current chain ID
  };
}

export interface SignatureResult {
  success: boolean;
  signature?: string;
  signedData?: string;    // For Cardano, the signed CBOR
  error?: {
    type: 'user_rejected' | 'invalid_payload' | 'network_error' | 'unsupported_operation';
    message: string;
    details?: any;
  };
}

export interface WalletInfo {
  name: string;              // Wallet name (e.g., "Eternl", "MetaMask")
  icon?: string;             // Wallet icon URL
  version?: string;          // Wallet version
  supportedChains: ('cardano' | 'evm')[];
  isHardwareWallet: boolean; // Is this a hardware wallet connection
  features: {
    multiChain: boolean;     // Supports multiple chains from single seed
    cip30: boolean;          // Supports CIP-30 (Cardano dApp connector)
    eip1193: boolean;        // Supports EIP-1193 (Ethereum provider)
    walletConnect: boolean;  // Supports WalletConnect
  };
}

// Multi-Chain Wallet Adapter Interface
export interface IMultiChainWalletAdapter {
  // Wallet Detection
  detectWallets(): Promise<AvailableWallet[]>;
  
  // Wallet-Specific Connectors
  createConnector(walletType: WalletType): Promise<IWalletConnector>;
  
  // Unified Connection
  connectBestAvailable(preferences?: WalletPreferences): Promise<IWalletConnector>;
}

export interface AvailableWallet {
  type: WalletType;
  name: string;
  icon?: string;
  isInstalled: boolean;
  supportedChains: ('cardano' | 'evm')[];
  downloadUrl?: string; // URL to install wallet if not installed
}

export type WalletType = 
  | 'eternl'      // Eternl (multi-chain)
  | 'typhon'      // Typhon (multi-chain)  
  | 'nufi'        // Nufi (multi-chain)
  | 'nami'        // Nami (Cardano only)
  | 'flint'       // Flint (Cardano only)
  | 'metamask'    // MetaMask (EVM only)
  | 'walletconnect' // WalletConnect (various)
  | 'hardware';   // Hardware wallet

export interface WalletPreferences {
  preferredChains: ('cardano' | 'evm')[];
  requireMultiChain: boolean;
  allowHardwareWallets: boolean;
  preferredWalletTypes: WalletType[];
}

// Browser Wallet Detection Types
export interface CardanoWalletApi {
  enable(): Promise<any>;
  isEnabled(): Promise<boolean>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  signData(addr: string, payload: string): Promise<any>;
  getUtxos(): Promise<string[]>;
  getBalance(): Promise<string>;
  getUsedAddresses(): Promise<string[]>;
  getUnusedAddresses(): Promise<string[]>;
  getChangeAddress(): Promise<string>;
  getRewardAddresses(): Promise<string[]>;
  getNetworkId(): Promise<number>;
}

export interface EthereumProvider {
  request(args: { method: string; params?: any[] }): Promise<any>;
  on(eventName: string, listener: (...args: any[]) => void): void;
  removeListener(eventName: string, listener: (...args: any[]) => void): void;
  selectedAddress: string | null;
  chainId: string | null;
  isMetaMask?: boolean;
}

// Window Extensions for Wallet Detection
declare global {
  interface Window {
    cardano?: {
      [walletName: string]: CardanoWalletApi;
    };
    ethereum?: EthereumProvider;
  }
}

// Error Types
export class WalletError extends Error {
  constructor(
    message: string,
    public type: 'connection' | 'signing' | 'network' | 'user_rejection',
    public walletType?: WalletType,
    public details?: any
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

export class UnsupportedChainError extends WalletError {
  constructor(walletType: WalletType, requestedChain: string) {
    super(
      `Wallet ${walletType} does not support chain ${requestedChain}`,
      'network',
      walletType,
      { requestedChain }
    );
    this.name = 'UnsupportedChainError';
  }
}

export class WalletNotInstalledError extends WalletError {
  constructor(walletType: WalletType, downloadUrl?: string) {
    super(
      `Wallet ${walletType} is not installed`,
      'connection',
      walletType,
      { downloadUrl }
    );
    this.name = 'WalletNotInstalledError';
  }
}