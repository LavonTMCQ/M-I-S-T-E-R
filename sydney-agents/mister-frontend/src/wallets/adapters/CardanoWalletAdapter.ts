/**
 * CardanoWalletAdapter - Cardano CIP-30 Wallet Adapter
 * 
 * This adapter handles Cardano wallet connections using the CIP-30 standard.
 * It provides a unified interface for interacting with Cardano wallets
 * (Eternl, Typhon, Nufi, Nami, Flint, etc.).
 */

import {
  CardanoTxPayload,
  SignatureResult,
  WalletType,
  CardanoWalletApi,
  WalletError
} from '../../providers/interfaces/IWalletConnector';

export interface CardanoAddresses {
  mainAddress: string;
  stakeAddress?: string;
  changeAddress?: string;
}

export class CardanoWalletAdapter {
  private walletType: WalletType;
  private walletApi: CardanoWalletApi | null = null;
  private currentAddresses: CardanoAddresses | null = null;

  constructor(walletType: WalletType) {
    this.walletType = walletType;
  }

  async connect(): Promise<CardanoAddresses> {
    try {
      console.log(`🟦 [Cardano Adapter] Connecting to ${this.walletType}...`);

      // Get wallet from window.cardano
      const walletObject = this.getWalletObject();
      if (!walletObject) {
        throw new WalletError(
          `Cardano wallet ${this.walletType} not found`,
          'connection',
          this.walletType
        );
      }

      // Enable wallet (this triggers user permission)
      this.walletApi = await walletObject.enable();
      
      // Get addresses
      const usedAddresses = await this.walletApi.getUsedAddresses();
      const unusedAddresses = await this.walletApi.getUnusedAddresses();
      const changeAddress = await this.walletApi.getChangeAddress();
      const rewardAddresses = await this.walletApi.getRewardAddresses();

      // Use the first used address, or first unused if no used addresses
      const mainAddress = usedAddresses.length > 0 
        ? this.hexToAddress(usedAddresses[0])
        : this.hexToAddress(unusedAddresses[0]);

      const stakeAddress = rewardAddresses.length > 0 
        ? this.hexToAddress(rewardAddresses[0])
        : undefined;

      this.currentAddresses = {
        mainAddress,
        stakeAddress,
        changeAddress: this.hexToAddress(changeAddress)
      };

      console.log(`✅ [Cardano Adapter] Connected to ${this.walletType}:`, this.currentAddresses);
      
      return this.currentAddresses;

    } catch (error) {
      console.error(`❌ [Cardano Adapter] Connection failed for ${this.walletType}:`, error);
      throw new WalletError(
        `Failed to connect to ${this.walletType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'connection',
        this.walletType,
        error
      );
    }
  }

  async disconnect(): Promise<void> {
    console.log(`🔌 [Cardano Adapter] Disconnecting from ${this.walletType}...`);
    
    this.walletApi = null;
    this.currentAddresses = null;
    
    // Note: CIP-30 doesn't have a standard disconnect method
    // The wallet stays "connected" until user manually disconnects
    
    console.log(`✅ [Cardano Adapter] Disconnected from ${this.walletType}`);
  }

  async sign(payload: CardanoTxPayload): Promise<SignatureResult> {
    try {
      if (!this.walletApi) {
        throw new WalletError('Wallet not connected', 'connection', this.walletType);
      }

      console.log(`✍️ [Cardano Adapter] Signing transaction with ${this.walletType}...`);

      // Sign the transaction CBOR
      const witnessSet = await this.walletApi.signTx(
        payload.cbor, 
        payload.isPartialSign || false
      );

      console.log(`✅ [Cardano Adapter] Transaction signed successfully`);

      return {
        success: true,
        signature: witnessSet,
        signedData: witnessSet // For Cardano, signature and signedData are the same
      };

    } catch (error) {
      console.error(`❌ [Cardano Adapter] Signing failed:`, error);

      // Check if user rejected the transaction
      const isUserRejection = error instanceof Error && (
        error.message.includes('user') ||
        error.message.includes('cancel') ||
        error.message.includes('reject') ||
        error.message.includes('denied')
      );

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

  async getBalance(): Promise<string> {
    try {
      if (!this.walletApi) {
        throw new WalletError('Wallet not connected', 'connection', this.walletType);
      }

      const balance = await this.walletApi.getBalance();
      return balance;

    } catch (error) {
      console.error(`❌ [Cardano Adapter] Balance retrieval failed:`, error);
      throw new WalletError(
        'Failed to retrieve balance',
        'network',
        this.walletType,
        error
      );
    }
  }

  async getUtxos(): Promise<string[]> {
    try {
      if (!this.walletApi) {
        throw new WalletError('Wallet not connected', 'connection', this.walletType);
      }

      const utxos = await this.walletApi.getUtxos();
      return utxos;

    } catch (error) {
      console.error(`❌ [Cardano Adapter] UTXOs retrieval failed:`, error);
      throw new WalletError(
        'Failed to retrieve UTXOs',
        'network',
        this.walletType,
        error
      );
    }
  }

  async getNetworkId(): Promise<number> {
    try {
      if (!this.walletApi) {
        throw new WalletError('Wallet not connected', 'connection', this.walletType);
      }

      const networkId = await this.walletApi.getNetworkId();
      return networkId;

    } catch (error) {
      console.error(`❌ [Cardano Adapter] Network ID retrieval failed:`, error);
      throw new WalletError(
        'Failed to retrieve network ID',
        'network',
        this.walletType,
        error
      );
    }
  }

  // Event Handlers
  onAccountsChanged(callback: (addresses: CardanoAddresses) => void): void {
    // CIP-30 doesn't have a standard account change event
    // Would need to poll or use wallet-specific APIs
    console.log(`⚠️ [Cardano Adapter] Account change monitoring not available for ${this.walletType}`);
  }

  onDisconnect(callback: () => void): void {
    // CIP-30 doesn't have a standard disconnect event
    // Would need to use wallet-specific APIs
    console.log(`⚠️ [Cardano Adapter] Disconnect monitoring not available for ${this.walletType}`);
  }

  // Helper Methods
  isConnected(): boolean {
    return this.walletApi !== null && this.currentAddresses !== null;
  }

  getAddresses(): CardanoAddresses | null {
    return this.currentAddresses;
  }

  getWalletApi(): CardanoWalletApi | null {
    return this.walletApi;
  }

  // Private Methods
  private getWalletObject(): CardanoWalletApi | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const cardano = window.cardano;
    if (!cardano) {
      return null;
    }

    // Map wallet types to cardano object properties
    const walletMap: { [key in WalletType]?: string } = {
      eternl: 'eternl',
      typhon: 'typhon',
      nufi: 'nufi',
      nami: 'nami',
      flint: 'flint'
    };

    const walletKey = walletMap[this.walletType];
    if (!walletKey) {
      return null;
    }

    return cardano[walletKey] || null;
  }

  private hexToAddress(hex: string): string {
    try {
      // Convert hex address to bech32 if needed
      // For now, return as-is since proper conversion requires additional libraries
      return hex;
    } catch (error) {
      console.warn(`⚠️ [Cardano Adapter] Address conversion failed:`, error);
      return hex;
    }
  }

  // Static Utility Methods
  static async detectWallets(): Promise<WalletType[]> {
    if (typeof window === 'undefined') {
      return [];
    }

    const cardano = window.cardano;
    if (!cardano) {
      return [];
    }

    const detected: WalletType[] = [];
    const walletChecks: { [key in WalletType]?: string } = {
      eternl: 'eternl',
      typhon: 'typhon',
      nufi: 'nufi',
      nami: 'nami',
      flint: 'flint'
    };

    for (const [walletType, key] of Object.entries(walletChecks)) {
      if (cardano[key]) {
        detected.push(walletType as WalletType);
      }
    }

    console.log(`🔍 [Cardano Adapter] Detected wallets: [${detected.join(', ')}]`);
    return detected;
  }

  static isWalletInstalled(walletType: WalletType): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const cardano = window.cardano;
    if (!cardano) {
      return false;
    }

    const walletMap: { [key in WalletType]?: string } = {
      eternl: 'eternl',
      typhon: 'typhon', 
      nufi: 'nufi',
      nami: 'nami',
      flint: 'flint'
    };

    const walletKey = walletMap[walletType];
    return walletKey ? !!cardano[walletKey] : false;
  }

  static async getWalletInfo(walletType: WalletType): Promise<any> {
    if (!CardanoWalletAdapter.isWalletInstalled(walletType)) {
      return null;
    }

    try {
      const adapter = new CardanoWalletAdapter(walletType);
      const walletObject = adapter.getWalletObject();
      
      if (!walletObject) {
        return null;
      }

      // Get wallet metadata if available
      return {
        name: walletType,
        icon: walletObject.icon || undefined,
        version: walletObject.apiVersion || undefined,
        isEnabled: await walletObject.isEnabled()
      };

    } catch (error) {
      console.warn(`⚠️ [Cardano Adapter] Failed to get wallet info for ${walletType}:`, error);
      return null;
    }
  }
}