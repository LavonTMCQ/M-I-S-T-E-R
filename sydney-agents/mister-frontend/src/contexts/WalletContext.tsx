'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getWalletInfo } from '@/utils/handleUtils';
import { useAuth } from '@/contexts/AuthContext';
import { getUserStorage, USER_STORAGE_KEYS } from '@/lib/utils/userStorage';

interface MainWalletInfo {
  address: string;
  stakeAddress: string;
  walletType: string;
  balance: number;
  handle: string | null;
  displayName: string;
  isConnected: boolean;
}

interface WalletContextType {
  mainWallet: MainWalletInfo | null;
  isLoading: boolean;
  connectWallet: (walletType: string) => Promise<boolean>;
  refreshWalletData: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [mainWallet, setMainWallet] = useState<MainWalletInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Note: AuthContext integration will be handled by useUserIdentity hook
  // to avoid circular dependencies and initialization order issues

  /**
   * Get user-specific storage when available, fallback to global storage
   * This ensures wallet data is user-specific when user is authenticated
   */
  const getWalletStorage = () => {
    // Try to get user ID from localStorage (set by AuthContext)
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      let userId = null;
      if (authToken.startsWith('mock_token_')) {
        userId = authToken.replace('mock_token_', '');
      } else if (authToken.startsWith('mister_token_')) {
        // For wallet tokens, we'll use the wallet address as user ID
        // This will be enhanced when full user context is available
        userId = 'wallet_user';
      }

      if (userId) {
        return getUserStorage(userId);
      }
    }

    // Fallback to global storage for backward compatibility
    return {
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      getItem: (key: string) => localStorage.getItem(key),
      removeItem: (key: string) => localStorage.removeItem(key),
      clear: () => {},
      getAllKeys: () => [],
      migrateGlobalData: () => {},
    };
  };

  /**
   * Initialize wallet context - check for existing connection
   */
  const initializeWallet = async () => {
    try {
      console.log('🔍 Initializing global wallet context...');

      // Check for stored wallet data first (user-specific when possible)
      const walletStorage = getWalletStorage();
      const storedWallet = walletStorage.getItem('mainWallet');
      if (storedWallet) {
        try {
          const walletData = JSON.parse(storedWallet);
          console.log('🔄 Found stored wallet data:', walletData.displayName);
          setMainWallet(walletData);

          // Authenticate the stored wallet with backend
          try {
            const { authService } = await import('@/lib/auth/auth');
            await authService.authenticateWithWallet(walletData.address, {
              stakeAddress: walletData.stakeAddress,
              walletType: walletData.walletType,
              balance: walletData.balance,
              handle: walletData.handle
            });
            console.log('🔐 Stored wallet authenticated with backend');
          } catch (authError) {
            console.warn('⚠️ Stored wallet authentication failed:', authError);
            // Continue anyway - wallet is still connected locally
          }

          // Refresh the stored wallet data in background
          await refreshStoredWalletData(walletData);
          return;
        } catch (error) {
          console.warn('⚠️ Failed to parse stored wallet data:', error);
          walletStorage.removeItem('mainWallet');
        }
      }

      console.log('🔄 No stored wallet found, wallet connection requires user action...');
      console.log('⚠️ No wallet connection found - user must manually connect');
    } catch (error) {
      console.error('❌ Failed to initialize wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Connect to a specific wallet
   */
  const connectToWallet = async (walletType: string): Promise<MainWalletInfo | null> => {
    try {
      console.log(`🔗 Connecting to ${walletType} wallet...`);

      if (!window.cardano || !window.cardano[walletType]) {
        throw new Error(`${walletType} wallet not found`);
      }

      const api = await window.cardano[walletType].enable();
      const addresses = await api.getUsedAddresses();
      const rewardAddresses = await api.getRewardAddresses();
      const balance = await api.getBalance();

      // Require signature authentication to prove wallet ownership
      console.log('🔐 Requesting wallet signature for authentication...');
      const authMessage = `MISTER Authentication\nTimestamp: ${Date.now()}\nWallet: ${walletType}`;
      const authMessageHex = Buffer.from(authMessage, 'utf8').toString('hex');

      try {
        const signAddress = addresses[0] || await api.getChangeAddress();
        const signature = await api.signData(signAddress, authMessageHex);
        console.log('✅ Wallet signature verified');
      } catch (signError) {
        console.error('❌ Wallet signature failed:', signError);
        throw new Error('Wallet signature required for authentication');
      }

      const balanceInAda = parseInt(balance) / 1_000_000;
      const rawStakeAddr = rewardAddresses[0];
      const paymentAddr = addresses[0];

      console.log(`📊 ${walletType} wallet data:`, {
        paymentAddress: paymentAddr,
        rawStakeAddress: rawStakeAddr,
        balance: balanceInAda
      });

      // Convert hex stake address to bech32 format for API calls
      const { normalizeAddress } = await import('@/utils/addressUtils');
      let normalizedStakeAddr = rawStakeAddr; // Fallback to original

      try {
        normalizedStakeAddr = await normalizeAddress(rawStakeAddr);
        console.log('🔧 Address conversion:', {
          raw: rawStakeAddr.substring(0, 20) + '...',
          normalized: normalizedStakeAddr.substring(0, 20) + '...'
        });
      } catch (addressError) {
        console.error('❌ Failed to normalize stake address:', addressError);
        console.log('🔧 Using original stake address as fallback');
        // Continue with original address
      }

      // Get real wallet info including handle and balance using the proper API
      console.log('🔍 Fetching real wallet info for address:', normalizedStakeAddr);

      let handle = null;
      let displayName = `${normalizedStakeAddr.substring(0, 8)}...${normalizedStakeAddr.substring(normalizedStakeAddr.length - 4)}`;
      let realBalance = balanceInAda; // Start with wallet balance

      // Fetch handle using the proper API with normalized address
      try {
        const handleResponse = await fetch(`/api/address/${normalizedStakeAddr}/handles`);
        if (handleResponse.ok) {
          const handleData = await handleResponse.json();
          if (handleData.success && handleData.handle) {
            handle = handleData.handle; // API already includes $ prefix
            displayName = handle;
            console.log('✅ Handle resolved:', handle);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch handle:', error);
      }

      // Fetch real balance using our API with normalized address
      try {
        const balanceResponse = await fetch(`/api/address/${normalizedStakeAddr}/balance`);
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          if (balanceData.success && balanceData.balance !== undefined) {
            realBalance = balanceData.balance;
            console.log('💰 Real balance fetched:', realBalance, 'ADA');
          }
        }
      } catch (error) {
        console.warn('Failed to fetch real balance, using wallet balance:', error);
      }

      // Get correct payment address from Blockfrost API using stake address
      let bech32PaymentAddr = normalizedStakeAddr; // Fallback to stake address
      try {
        console.log('🔧 Fetching correct payment address from Blockfrost for stake address:', normalizedStakeAddr.substring(0, 20) + '...');
        const addressResponse = await fetch(`https://cardano-mainnet.blockfrost.io/api/v0/accounts/${normalizedStakeAddr}/addresses`, {
          headers: {
            'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
          }
        });

        if (addressResponse.ok) {
          const addresses = await addressResponse.json();
          if (addresses && addresses.length > 0) {
            // Use the first payment address (usually the main one)
            bech32PaymentAddr = addresses[0].address;
            console.log('✅ Correct payment address fetched from Blockfrost:', bech32PaymentAddr.substring(0, 20) + '...');
            console.log('🔍 Full address:', bech32PaymentAddr);
          } else {
            console.log('⚠️ No addresses found for stake address, using stake address as fallback');
          }
        } else {
          console.error('❌ Failed to fetch addresses from Blockfrost:', addressResponse.status);
          console.log('🔧 Using stake address as fallback for payment address');
        }
      } catch (error) {
        console.error('❌ Error fetching payment address from Blockfrost:', error);
        console.log('🔧 Using stake address as fallback for payment address');
      }

      const mainWalletData: MainWalletInfo = {
        address: bech32PaymentAddr, // Use bech32 payment address for Strike Finance
        stakeAddress: normalizedStakeAddr, // Use normalized bech32 address
        walletType: walletType,
        balance: realBalance,
        handle: handle,
        displayName: displayName,
        isConnected: true
      };

      setMainWallet(mainWalletData);

      // Store in user-specific localStorage for persistence
      const walletStorage = getWalletStorage();
      walletStorage.setItem('mainWallet', JSON.stringify(mainWalletData));

      // Authenticate with the backend using wallet address
      try {
        const { authService } = await import('@/lib/auth/auth');
        await authService.authenticateWithWallet(mainWalletData.address, {
          stakeAddress: mainWalletData.stakeAddress,
          walletType: mainWalletData.walletType,
          balance: mainWalletData.balance,
          handle: mainWalletData.handle
        });
        console.log('🔐 Wallet authenticated with backend');
      } catch (authError) {
        console.warn('⚠️ Wallet authentication failed:', authError);
        // Continue anyway - wallet is still connected locally
      }

      console.log(`✅ ${walletType} wallet connected as main wallet`);
      return mainWalletData;
    } catch (error) {
      console.error(`❌ Failed to connect to ${walletType}:`, error);
      return null;
    }
  };

  /**
   * Refresh wallet data for stored wallet
   */
  const refreshStoredWalletData = async (storedWallet: MainWalletInfo) => {
    try {
      if (!storedWallet.stakeAddress) return;

      console.log('🔄 Refreshing stored wallet data...');
      const walletInfo = await getWalletInfo(storedWallet.stakeAddress);

      // Get correct payment address from Blockfrost API using stake address
      let correctPaymentAddr = storedWallet.address; // Fallback to current address
      try {
        console.log('🔧 Fetching correct payment address from Blockfrost for stake address:', storedWallet.stakeAddress.substring(0, 20) + '...');
        const addressResponse = await fetch(`https://cardano-mainnet.blockfrost.io/api/v0/accounts/${storedWallet.stakeAddress}/addresses`, {
          headers: {
            'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
          }
        });

        if (addressResponse.ok) {
          const addresses = await addressResponse.json();
          if (addresses && addresses.length > 0) {
            // Use the first payment address (usually the main one)
            correctPaymentAddr = addresses[0].address;
            console.log('✅ Correct payment address fetched from Blockfrost:', correctPaymentAddr.substring(0, 20) + '...');
            console.log('🔍 Full address:', correctPaymentAddr);

            // Check if this fixes the 'x' vs '8' issue
            if (correctPaymentAddr !== storedWallet.address) {
              console.log('🔄 Address updated from:', storedWallet.address.substring(0, 20) + '...');
              console.log('🔄 Address updated to:', correctPaymentAddr.substring(0, 20) + '...');
            }
          } else {
            console.log('⚠️ No addresses found for stake address, keeping current address');
          }
        } else {
          console.error('❌ Failed to fetch addresses from Blockfrost:', addressResponse.status);
        }
      } catch (error) {
        console.error('❌ Error fetching payment address from Blockfrost:', error);
      }

      const updatedWallet: MainWalletInfo = {
        ...storedWallet,
        address: correctPaymentAddr, // Update with correct payment address
        balance: walletInfo.balance,
        handle: walletInfo.handle,
        displayName: walletInfo.displayName
      };

      setMainWallet(updatedWallet);
      const walletStorage = getWalletStorage();
      walletStorage.setItem('mainWallet', JSON.stringify(updatedWallet));

      console.log('✅ Wallet data refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh wallet data:', error);
    }
  };

  /**
   * Public method to connect wallet
   */
  const connectWallet = async (walletType: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await connectToWallet(walletType);
      return result !== null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh current wallet data
   */
  const refreshWalletData = async () => {
    if (!mainWallet) return;
    
    setIsLoading(true);
    try {
      await refreshStoredWalletData(mainWallet);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Disconnect wallet and clear ALL stored data
   */
  const disconnectWallet = () => {
    setMainWallet(null);

    // Clear user-specific wallet data
    const walletStorage = getWalletStorage();
    walletStorage.removeItem('mainWallet');
    walletStorage.removeItem('connectedWallet');
    walletStorage.removeItem('auth_token');
    walletStorage.removeItem('user_data');
    walletStorage.removeItem('refresh_token');

    // Also clear global storage for backward compatibility
    localStorage.removeItem('mainWallet');
    localStorage.removeItem('connectedWallet');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('refresh_token');

    // Clear any other potential stored data (global cleanup)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('wallet') || key.includes('auth') || key.includes('user'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log('🔌 Main wallet disconnected and all data cleared (user-specific and global)');
  };

  // Initialize on mount
  useEffect(() => {
    initializeWallet();
  }, []);

  const value: WalletContextType = {
    mainWallet,
    isLoading,
    connectWallet,
    refreshWalletData,
    disconnectWallet
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * Hook to use wallet context
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

/**
 * Hook that requires wallet to be connected
 */
export function useRequireWallet() {
  const wallet = useWallet();
  
  if (!wallet.mainWallet) {
    // Redirect to wallet setup if no wallet connected
    if (typeof window !== 'undefined') {
      window.location.href = '/wallet-setup';
    }
    throw new Error('Wallet connection required');
  }
  
  return wallet;
}
