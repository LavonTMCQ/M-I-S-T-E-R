/**
 * WalletConnector - Universal Multi-Chain Wallet Interface
 * 
 * This service provides a unified interface for connecting to and interacting
 * with wallets across different blockchain ecosystems (Cardano CIP-30, EVM EIP-1193).
 * It normalizes wallet operations and provides seamless multi-chain support.
 */

import { 
  IWalletConnector,
  IMultiChainWalletAdapter,
  TransactionPayload,
  WalletConnectionResult,
  WalletAddresses,
  SignatureResult,
  WalletInfo,
  AvailableWallet,
  WalletType,
  WalletPreferences,
  WalletError,
  UnsupportedChainError,
  WalletNotInstalledError
} from '../providers/interfaces/IWalletConnector';

import { CardanoWalletAdapter } from './adapters/CardanoWalletAdapter';
import { EVMWalletAdapter } from './adapters/EVMWalletAdapter';

// Wallet detection utilities
const WALLET_DETECTION = {
  eternl: () => typeof window !== 'undefined' && window.cardano?.eternl,
  typhon: () => typeof window !== 'undefined' && window.cardano?.typhon,
  nufi: () => typeof window !== 'undefined' && window.cardano?.nufi,
  nami: () => typeof window !== 'undefined' && window.cardano?.nami,
  flint: () => typeof window !== 'undefined' && window.cardano?.flint,
  metamask: () => typeof window !== 'undefined' && window.ethereum?.isMetaMask,
  walletconnect: () => false, // Would require WalletConnect implementation
  hardware: () => false // Would require hardware wallet detection
};

const WALLET_INFO: { [key in WalletType]: Partial<WalletInfo> } = {
  eternl: {
    name: 'Eternl',
    supportedChains: ['cardano', 'evm'],
    features: {
      multiChain: true,
      cip30: true,
      eip1193: true,
      walletConnect: false
    }
  },
  typhon: {
    name: 'Typhon',
    supportedChains: ['cardano', 'evm'],
    features: {
      multiChain: true,
      cip30: true,
      eip1193: true,
      walletConnect: false
    }
  },
  nufi: {
    name: 'Nufi',
    supportedChains: ['cardano', 'evm'],
    features: {
      multiChain: true,
      cip30: true,
      eip1193: true,
      walletConnect: false
    }
  },
  nami: {
    name: 'Nami',
    supportedChains: ['cardano'],
    features: {
      multiChain: false,
      cip30: true,
      eip1193: false,
      walletConnect: false
    }
  },
  flint: {
    name: 'Flint',
    supportedChains: ['cardano'],
    features: {
      multiChain: false,
      cip30: true,
      eip1193: false,
      walletConnect: false
    }
  },
  metamask: {
    name: 'MetaMask',
    supportedChains: ['evm'],
    features: {
      multiChain: false,
      cip30: false,
      eip1193: true,
      walletConnect: false
    }
  },
  walletconnect: {
    name: 'WalletConnect',
    supportedChains: ['evm'],
    features: {
      multiChain: true,
      cip30: false,
      eip1193: true,
      walletConnect: true
    }
  },
  hardware: {
    name: 'Hardware Wallet',
    supportedChains: ['cardano', 'evm'],
    features: {
      multiChain: true,
      cip30: false,
      eip1193: false,
      walletConnect: false
    }
  }
};

export class UniversalWalletConnector implements IWalletConnector {
  private walletType: WalletType;
  private cardanoAdapter: CardanoWalletAdapter | null = null;
  private evmAdapter: EVMWalletAdapter | null = null;
  private isConnectedState = false;
  private currentAddresses: WalletAddresses = {};

  constructor(walletType: WalletType) {
    this.walletType = walletType;
  }

  // Connection Management
  async connect(): Promise<WalletConnectionResult> {
    try {
      console.log(`🔗 [Wallet Connector] Connecting to ${this.walletType}...`);

      // Check if wallet is installed
      if (!this.isWalletInstalled()) {
        throw new WalletNotInstalledError(this.walletType);
      }

      const walletInfo = WALLET_INFO[this.walletType];
      const supportedChains = walletInfo.supportedChains || [];
      let addresses: WalletAddresses = {};

      // Initialize adapters based on supported chains
      if (supportedChains.includes('cardano')) {
        this.cardanoAdapter = new CardanoWalletAdapter(this.walletType);
        const cardanoAddress = await this.cardanoAdapter.connect();
        addresses.cardano = cardanoAddress;
      }

      if (supportedChains.includes('evm')) {
        this.evmAdapter = new EVMWalletAdapter(this.walletType);
        const evmAddress = await this.evmAdapter.connect();
        addresses.evm = evmAddress;
      }

      this.currentAddresses = addresses;
      this.isConnectedState = true;

      console.log(`✅ [Wallet Connector] Connected to ${this.walletType}:`, addresses);

      return {
        success: true,
        addresses,
        supportedChains,
        walletName: walletInfo.name || this.walletType,
      };

    } catch (error) {
      console.error(`❌ [Wallet Connector] Connection failed for ${this.walletType}:`, error);
      
      return {
        success: false,
        addresses: {},
        supportedChains: [],
        walletName: this.walletType,
        error: error instanceof Error ? error.message : 'Unknown connection error'
      };
    }
  }

  async disconnect(): Promise<void> {
    console.log(`🔌 [Wallet Connector] Disconnecting ${this.walletType}...`);

    if (this.cardanoAdapter) {
      await this.cardanoAdapter.disconnect();
      this.cardanoAdapter = null;
    }

    if (this.evmAdapter) {
      await this.evmAdapter.disconnect();
      this.evmAdapter = null;
    }

    this.isConnectedState = false;
    this.currentAddresses = {};

    console.log(`✅ [Wallet Connector] Disconnected from ${this.walletType}`);
  }

  async isConnected(): Promise<boolean> {
    return this.isConnectedState;
  }

  // Address Management
  async getAddresses(): Promise<WalletAddresses> {
    return this.currentAddresses;
  }

  // Transaction Signing
  async sign(payload: TransactionPayload): Promise<SignatureResult> {
    try {
      console.log(`✍️ [Wallet Connector] Signing ${payload.chain} transaction...`);

      if (payload.chain === 'cardano') {
        if (!this.cardanoAdapter) {
          throw new UnsupportedChainError(this.walletType, 'cardano');
        }
        return await this.cardanoAdapter.sign(payload);
      }

      if (payload.chain === 'evm') {
        if (!this.evmAdapter) {
          throw new UnsupportedChainError(this.walletType, 'evm');
        }
        return await this.evmAdapter.sign(payload);
      }

      throw new Error(`Unsupported chain: ${payload.chain}`);

    } catch (error) {
      console.error(`❌ [Wallet Connector] Signing failed:`, error);
      
      return {
        success: false,
        error: {
          type: error instanceof UnsupportedChainError ? 'unsupported_operation' : 'network_error',
          message: error instanceof Error ? error.message : 'Unknown signing error',
          details: error
        }
      };
    }
  }

  // Wallet Information
  async getWalletInfo(): Promise<WalletInfo> {
    const baseInfo = WALLET_INFO[this.walletType];
    
    return {
      name: baseInfo.name || this.walletType,
      icon: undefined, // Would load from wallet
      version: undefined, // Would query from wallet
      supportedChains: baseInfo.supportedChains || [],
      isHardwareWallet: this.walletType === 'hardware',
      features: baseInfo.features || {
        multiChain: false,
        cip30: false,
        eip1193: false,
        walletConnect: false
      }
    };
  }

  // Event Handling
  onAccountsChanged(callback: (addresses: WalletAddresses) => void): void {
    if (this.cardanoAdapter) {
      this.cardanoAdapter.onAccountsChanged((cardanoAddress) => {
        this.currentAddresses.cardano = cardanoAddress;
        callback(this.currentAddresses);
      });
    }

    if (this.evmAdapter) {
      this.evmAdapter.onAccountsChanged((evmAddress) => {
        this.currentAddresses.evm = evmAddress;
        callback(this.currentAddresses);
      });
    }
  }

  onDisconnect(callback: () => void): void {
    if (this.cardanoAdapter) {
      this.cardanoAdapter.onDisconnect(callback);
    }

    if (this.evmAdapter) {
      this.evmAdapter.onDisconnect(callback);
    }
  }

  // Private Methods
  private isWalletInstalled(): boolean {
    const detector = WALLET_DETECTION[this.walletType];
    return detector ? detector() : false;
  }
}

// Multi-Chain Wallet Adapter Implementation
export class MultiChainWalletAdapter implements IMultiChainWalletAdapter {
  // Wallet Detection
  async detectWallets(): Promise<AvailableWallet[]> {
    const wallets: AvailableWallet[] = [];

    for (const [walletType, info] of Object.entries(WALLET_INFO)) {
      const type = walletType as WalletType;
      const detector = WALLET_DETECTION[type];
      const isInstalled = detector ? detector() : false;

      wallets.push({
        type,
        name: info.name || walletType,
        icon: undefined, // Would load wallet icons
        isInstalled,
        supportedChains: info.supportedChains || [],
        downloadUrl: this.getDownloadUrl(type)
      });
    }

    console.log(`🔍 [Multi-Chain Adapter] Detected wallets:`, wallets);
    return wallets;
  }

  // Wallet-Specific Connectors
  async createConnector(walletType: WalletType): Promise<IWalletConnector> {
    return new UniversalWalletConnector(walletType);
  }

  // Unified Connection
  async connectBestAvailable(preferences?: WalletPreferences): Promise<IWalletConnector> {
    const availableWallets = await this.detectWallets();
    const installedWallets = availableWallets.filter(w => w.isInstalled);

    if (installedWallets.length === 0) {
      throw new WalletError('No compatible wallets installed', 'connection');
    }

    // Apply preferences and find best wallet
    let bestWallet = installedWallets[0];

    if (preferences) {
      // Filter by preferred chains
      if (preferences.preferredChains.length > 0) {
        const compatibleWallets = installedWallets.filter(wallet =>
          preferences.preferredChains.some(chain => wallet.supportedChains.includes(chain))
        );
        if (compatibleWallets.length > 0) {
          bestWallet = compatibleWallets[0];
        }
      }

      // Filter by preferred wallet types
      if (preferences.preferredWalletTypes.length > 0) {
        const preferredWallet = installedWallets.find(wallet =>
          preferences.preferredWalletTypes.includes(wallet.type)
        );
        if (preferredWallet) {
          bestWallet = preferredWallet;
        }
      }

      // Require multi-chain if specified
      if (preferences.requireMultiChain) {
        const multiChainWallet = installedWallets.find(wallet =>
          wallet.supportedChains.length > 1
        );
        if (multiChainWallet) {
          bestWallet = multiChainWallet;
        } else {
          throw new WalletError('No multi-chain wallets available', 'connection');
        }
      }
    }

    console.log(`🎯 [Multi-Chain Adapter] Selected wallet: ${bestWallet.name}`);
    return this.createConnector(bestWallet.type);
  }

  // Private Methods
  private getDownloadUrl(walletType: WalletType): string | undefined {
    const downloadUrls: { [key in WalletType]?: string } = {
      eternl: 'https://eternl.io/app/mainnet/welcome',
      typhon: 'https://typhonwallet.io/',
      nufi: 'https://nu.fi/',
      nami: 'https://namiwallet.io/',
      flint: 'https://flint-wallet.com/',
      metamask: 'https://metamask.io/download/'
    };

    return downloadUrls[walletType];
  }
}

// Global instance
let globalWalletAdapter: MultiChainWalletAdapter | null = null;

export const getWalletAdapter = (): MultiChainWalletAdapter => {
  if (!globalWalletAdapter) {
    globalWalletAdapter = new MultiChainWalletAdapter();
  }
  return globalWalletAdapter;
};

// Convenience functions
export const detectAvailableWallets = (): Promise<AvailableWallet[]> => {
  return getWalletAdapter().detectWallets();
};

export const connectWallet = (walletType: WalletType): Promise<IWalletConnector> => {
  return getWalletAdapter().createConnector(walletType);
};

export const connectBestWallet = (preferences?: WalletPreferences): Promise<IWalletConnector> => {
  return getWalletAdapter().connectBestAvailable(preferences);
};