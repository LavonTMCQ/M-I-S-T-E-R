/**
 * EVMWalletAdapter - EVM EIP-1193 Wallet Adapter
 * 
 * This adapter handles EVM wallet connections using the EIP-1193 standard.
 * It provides a unified interface for interacting with EVM wallets
 * (MetaMask, multi-chain wallets with EVM support, etc.).
 */

import { ethers } from 'ethers';
import {
  EvmTxPayload,
  SignatureResult,
  WalletType,
  EthereumProvider,
  WalletError
} from '../../providers/interfaces/IWalletConnector';

export interface EVMAddresses {
  address: string;
  chainId: number;
}

export class EVMWalletAdapter {
  private walletType: WalletType;
  private provider: EthereumProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private currentAddress: EVMAddresses | null = null;
  private accountsChangedHandler: ((addresses: EVMAddresses) => void) | null = null;
  private disconnectHandler: (() => void) | null = null;

  constructor(walletType: WalletType) {
    this.walletType = walletType;
  }

  async connect(): Promise<EVMAddresses> {
    try {
      console.log(`🟪 [EVM Adapter] Connecting to ${this.walletType}...`);

      // Get EVM provider
      this.provider = this.getEvmProvider();
      if (!this.provider) {
        throw new WalletError(
          `EVM wallet ${this.walletType} not found`,
          'connection',
          this.walletType
        );
      }

      // Request account access
      const accounts = await this.provider.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new WalletError(
          'No accounts returned from wallet',
          'connection',
          this.walletType
        );
      }

      // Get chain ID
      const chainId = await this.provider.request({
        method: 'eth_chainId'
      });

      // Setup ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(this.provider);
      this.signer = await ethersProvider.getSigner();

      this.currentAddress = {
        address: accounts[0],
        chainId: parseInt(chainId, 16)
      };

      // Setup event listeners
      this.setupEventListeners();

      console.log(`✅ [EVM Adapter] Connected to ${this.walletType}:`, this.currentAddress);
      
      return this.currentAddress;

    } catch (error) {
      console.error(`❌ [EVM Adapter] Connection failed for ${this.walletType}:`, error);
      
      // Check if user rejected the connection
      if (error && typeof error === 'object' && 'code' in error && error.code === 4001) {
        throw new WalletError(
          'User rejected the connection request',
          'user_rejection',
          this.walletType,
          error
        );
      }

      throw new WalletError(
        `Failed to connect to ${this.walletType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'connection',
        this.walletType,
        error
      );
    }
  }

  async disconnect(): Promise<void> {
    console.log(`🔌 [EVM Adapter] Disconnecting from ${this.walletType}...`);
    
    // Remove event listeners
    this.removeEventListeners();
    
    this.provider = null;
    this.signer = null;
    this.currentAddress = null;
    
    console.log(`✅ [EVM Adapter] Disconnected from ${this.walletType}`);
  }

  async sign(payload: EvmTxPayload): Promise<SignatureResult> {
    try {
      if (!this.provider || !this.signer) {
        throw new WalletError('Wallet not connected', 'connection', this.walletType);
      }

      console.log(`✍️ [EVM Adapter] Signing typed data with ${this.walletType}...`);

      // Sign EIP-712 typed data
      const signature = await this.signer.signTypedData(
        payload.typedData.domain,
        payload.typedData.types,
        payload.typedData.message
      );

      console.log(`✅ [EVM Adapter] Typed data signed successfully`);

      return {
        success: true,
        signature,
        signedData: signature
      };

    } catch (error) {
      console.error(`❌ [EVM Adapter] Signing failed:`, error);

      // Check if user rejected the transaction
      const isUserRejection = error && typeof error === 'object' && 'code' in error && 
                               (error.code === 4001 || error.code === 'ACTION_REJECTED');

      return {
        success: false,
        error: {
          type: isUserRejection ? 'user_rejected' : 'network_error',
          message: error instanceof Error ? error.message : 'Signing failed',
          details: error
        }
      };
    }
  }

  async signMessage(message: string): Promise<SignatureResult> {
    try {
      if (!this.signer) {
        throw new WalletError('Wallet not connected', 'connection', this.walletType);
      }

      console.log(`✍️ [EVM Adapter] Signing message with ${this.walletType}...`);

      const signature = await this.signer.signMessage(message);

      return {
        success: true,
        signature,
        signedData: signature
      };

    } catch (error) {
      console.error(`❌ [EVM Adapter] Message signing failed:`, error);

      const isUserRejection = error && typeof error === 'object' && 'code' in error && 
                               (error.code === 4001 || error.code === 'ACTION_REJECTED');

      return {
        success: false,
        error: {
          type: isUserRejection ? 'user_rejected' : 'network_error',
          message: error instanceof Error ? error.message : 'Message signing failed',
          details: error
        }
      };
    }
  }

  async getBalance(): Promise<string> {
    try {
      if (!this.provider || !this.currentAddress) {
        throw new WalletError('Wallet not connected', 'connection', this.walletType);
      }

      const balance = await this.provider.request({
        method: 'eth_getBalance',
        params: [this.currentAddress.address, 'latest']
      });

      // Convert from hex wei to ETH
      return ethers.formatEther(balance);

    } catch (error) {
      console.error(`❌ [EVM Adapter] Balance retrieval failed:`, error);
      throw new WalletError(
        'Failed to retrieve balance',
        'network',
        this.walletType,
        error
      );
    }
  }

  async switchChain(chainId: number): Promise<boolean> {
    try {
      if (!this.provider) {
        throw new WalletError('Wallet not connected', 'connection', this.walletType);
      }

      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });

      return true;

    } catch (error) {
      console.error(`❌ [EVM Adapter] Chain switch failed:`, error);
      
      // Chain might not be added to wallet
      if (error && typeof error === 'object' && 'code' in error && error.code === 4902) {
        console.log(`⚠️ [EVM Adapter] Chain ${chainId} not found in wallet`);
        return false;
      }

      throw new WalletError(
        'Failed to switch chain',
        'network',
        this.walletType,
        error
      );
    }
  }

  async addChain(chainConfig: {
    chainId: number;
    chainName: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: string[];
    blockExplorerUrls?: string[];
  }): Promise<boolean> {
    try {
      if (!this.provider) {
        throw new WalletError('Wallet not connected', 'connection', this.walletType);
      }

      await this.provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${chainConfig.chainId.toString(16)}`,
          chainName: chainConfig.chainName,
          nativeCurrency: chainConfig.nativeCurrency,
          rpcUrls: chainConfig.rpcUrls,
          blockExplorerUrls: chainConfig.blockExplorerUrls
        }]
      });

      return true;

    } catch (error) {
      console.error(`❌ [EVM Adapter] Add chain failed:`, error);
      
      const isUserRejection = error && typeof error === 'object' && 'code' in error && error.code === 4001;
      
      if (isUserRejection) {
        return false;
      }

      throw new WalletError(
        'Failed to add chain',
        'network',
        this.walletType,
        error
      );
    }
  }

  // Event Handlers
  onAccountsChanged(callback: (addresses: EVMAddresses) => void): void {
    this.accountsChangedHandler = callback;
  }

  onDisconnect(callback: () => void): void {
    this.disconnectHandler = callback;
  }

  // Helper Methods
  isConnected(): boolean {
    return this.provider !== null && this.currentAddress !== null;
  }

  getAddress(): EVMAddresses | null {
    return this.currentAddress;
  }

  getSigner(): ethers.JsonRpcSigner | null {
    return this.signer;
  }

  getProvider(): EthereumProvider | null {
    return this.provider;
  }

  // Private Methods
  private getEvmProvider(): EthereumProvider | null {
    if (typeof window === 'undefined') {
      return null;
    }

    // For multi-chain wallets, we need to access their EVM provider
    // This varies by wallet implementation
    switch (this.walletType) {
      case 'metamask':
        return window.ethereum?.isMetaMask ? window.ethereum : null;
      
      case 'eternl':
      case 'typhon':
      case 'nufi':
        // These wallets may expose EVM functionality differently
        // This would need to be implemented based on each wallet's API
        return window.ethereum;
      
      default:
        return window.ethereum;
    }
  }

  private setupEventListeners(): void {
    if (!this.provider) return;

    // Account change listener
    const handleAccountsChanged = (accounts: string[]) => {
      console.log(`🔄 [EVM Adapter] Accounts changed:`, accounts);
      
      if (accounts.length === 0) {
        // User disconnected
        if (this.disconnectHandler) {
          this.disconnectHandler();
        }
      } else if (this.currentAddress && accounts[0] !== this.currentAddress.address) {
        // Account switched
        this.currentAddress.address = accounts[0];
        if (this.accountsChangedHandler) {
          this.accountsChangedHandler(this.currentAddress);
        }
      }
    };

    // Chain change listener
    const handleChainChanged = (chainId: string) => {
      console.log(`🔄 [EVM Adapter] Chain changed:`, chainId);
      
      if (this.currentAddress) {
        this.currentAddress.chainId = parseInt(chainId, 16);
        if (this.accountsChangedHandler) {
          this.accountsChangedHandler(this.currentAddress);
        }
      }
    };

    // Disconnect listener
    const handleDisconnect = () => {
      console.log(`🔌 [EVM Adapter] Wallet disconnected`);
      if (this.disconnectHandler) {
        this.disconnectHandler();
      }
    };

    this.provider.on('accountsChanged', handleAccountsChanged);
    this.provider.on('chainChanged', handleChainChanged);
    this.provider.on('disconnect', handleDisconnect);
  }

  private removeEventListeners(): void {
    if (!this.provider) return;

    this.provider.removeListener('accountsChanged', () => {});
    this.provider.removeListener('chainChanged', () => {});
    this.provider.removeListener('disconnect', () => {});
  }

  // Static Utility Methods
  static isWalletInstalled(walletType: WalletType): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    switch (walletType) {
      case 'metamask':
        return !!window.ethereum?.isMetaMask;
      
      case 'eternl':
      case 'typhon':
      case 'nufi':
        // Multi-chain wallets - check if they have EVM support
        return !!window.ethereum;
      
      default:
        return !!window.ethereum;
    }
  }

  static async detectWallets(): Promise<WalletType[]> {
    if (typeof window === 'undefined') {
      return [];
    }

    const detected: WalletType[] = [];

    if (window.ethereum?.isMetaMask) {
      detected.push('metamask');
    }

    // For multi-chain wallets, we'd need to check their specific APIs
    // to determine EVM support
    
    console.log(`🔍 [EVM Adapter] Detected wallets: [${detected.join(', ')}]`);
    return detected;
  }

  static async getWalletInfo(walletType: WalletType): Promise<any> {
    if (!EVMWalletAdapter.isWalletInstalled(walletType)) {
      return null;
    }

    try {
      const provider = new EVMWalletAdapter(walletType).getEvmProvider();
      
      if (!provider) {
        return null;
      }

      return {
        name: walletType,
        chainId: provider.chainId,
        isMetaMask: provider.isMetaMask,
        selectedAddress: provider.selectedAddress
      };

    } catch (error) {
      console.warn(`⚠️ [EVM Adapter] Failed to get wallet info for ${walletType}:`, error);
      return null;
    }
  }
}