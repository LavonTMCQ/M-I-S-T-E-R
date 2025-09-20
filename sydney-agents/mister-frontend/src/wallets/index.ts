/**
 * Wallets Module - Main Entry Point
 * 
 * Centralized exports for the wallet system including the main connector,
 * adapters, and utility functions for multi-chain wallet management.
 */

// Main Wallet Connector
export {
  UniversalWalletConnector,
  MultiChainWalletAdapter,
  getWalletAdapter,
  detectAvailableWallets,
  connectWallet,
  connectBestWallet
} from './WalletConnector';

// Wallet Adapters
export { CardanoWalletAdapter } from './adapters/CardanoWalletAdapter';
export { EVMWalletAdapter } from './adapters/EVMWalletAdapter';

// Re-export wallet interfaces and types
export type {
  IWalletConnector,
  IMultiChainWalletAdapter,
  TransactionPayload,
  CardanoTxPayload,
  EvmTxPayload,
  EIP712TypedData,
  WalletConnectionResult,
  WalletAddresses,
  SignatureResult,
  WalletInfo,
  AvailableWallet,
  WalletType,
  WalletPreferences,
  CardanoWalletApi,
  EthereumProvider
} from '../providers/interfaces/IWalletConnector';

export {
  WalletError,
  UnsupportedChainError,
  WalletNotInstalledError
} from '../providers/interfaces/IWalletConnector';

// Convenience functions for wallet management
export const initializeWalletSystem = async () => {
  console.log('🚀 [Wallets] Initializing wallet system...');
  
  const adapter = getWalletAdapter();
  const availableWallets = await adapter.detectWallets();
  
  console.log('✅ [Wallets] Wallet system initialized');
  console.log(`🔍 [Wallets] Detected ${availableWallets.length} wallets`);
  
  return { adapter, availableWallets };
};

// Helper function to check if a specific wallet type is available
export const isWalletAvailable = async (walletType: WalletType): Promise<boolean> => {
  const availableWallets = await detectAvailableWallets();
  return availableWallets.some(wallet => wallet.type === walletType && wallet.isInstalled);
};

// Helper function to get recommended wallet for user
export const getRecommendedWallet = async (preferences?: WalletPreferences): Promise<AvailableWallet | null> => {
  const availableWallets = await detectAvailableWallets();
  const installedWallets = availableWallets.filter(w => w.isInstalled);
  
  if (installedWallets.length === 0) {
    return null;
  }
  
  // If preferences specified, filter accordingly
  if (preferences) {
    if (preferences.requireMultiChain) {
      const multiChainWallets = installedWallets.filter(w => w.supportedChains.length > 1);
      if (multiChainWallets.length > 0) {
        return multiChainWallets[0];
      }
    }
    
    if (preferences.preferredWalletTypes.length > 0) {
      const preferredWallet = installedWallets.find(w => 
        preferences.preferredWalletTypes.includes(w.type)
      );
      if (preferredWallet) {
        return preferredWallet;
      }
    }
  }
  
  // Default recommendation: prioritize multi-chain wallets
  const multiChainWallets = installedWallets.filter(w => w.supportedChains.length > 1);
  if (multiChainWallets.length > 0) {
    return multiChainWallets[0];
  }
  
  // Fallback to first available wallet
  return installedWallets[0];
};