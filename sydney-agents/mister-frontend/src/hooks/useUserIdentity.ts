/**
 * Enhanced User Identity Hook
 * Provides unified user identification across wallet and email authentication
 */

import { useEffect, useState } from 'react';
import { useAuth, UserIdentity } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { getUserStorage, migrateExistingUserData } from '@/lib/utils/userStorage';

export interface EnhancedUserIdentity extends UserIdentity {
  isWalletConnected: boolean;
  walletBalance?: number;
  walletType?: string;
}

export interface UserIdentityManager {
  userIdentity: EnhancedUserIdentity | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userStorage: ReturnType<typeof getUserStorage>;
  refreshUserIdentity: () => void;
  getUserDisplayName: () => string;
  getUserIdentifier: () => string | null;
}

/**
 * Hook that provides complete user identity management
 * Combines AuthContext and WalletContext for unified user identification
 */
export function useUserIdentity(): UserIdentityManager {
  const { user, userIdentity, isAuthenticated, isLoading: authLoading, getUserId } = useAuth();
  const { mainWallet, isLoading: walletLoading } = useWallet();
  const [enhancedIdentity, setEnhancedIdentity] = useState<EnhancedUserIdentity | null>(null);
  const [hasRunMigration, setHasRunMigration] = useState(false);

  const userId = getUserId();
  const userStorage = getUserStorage(userId);
  const isLoading = authLoading || walletLoading;

  /**
   * Create enhanced user identity by combining auth and wallet data
   */
  const createEnhancedIdentity = (): EnhancedUserIdentity | null => {
    // Debug wallet state
    console.log('🔍 createEnhancedIdentity - Wallet state:', {
      hasMainWallet: !!mainWallet,
      isConnected: mainWallet?.isConnected,
      displayName: mainWallet?.displayName,
      address: mainWallet?.address,
      handle: mainWallet?.handle
    });

    console.log('🔍 createEnhancedIdentity - Auth state:', {
      hasUserIdentity: !!userIdentity,
      userIdentityType: userIdentity?.type,
      userIdentityDisplayName: userIdentity?.displayName,
      isAuthenticated
    });

    // PRIORITY 1: If wallet is connected, always use wallet-based identity
    if (mainWallet && mainWallet.isConnected) {
      console.log('🔗 Using wallet-based user identity:', mainWallet.displayName);
      return {
        id: mainWallet.address, // Use wallet address as primary ID
        type: 'wallet',
        walletAddress: mainWallet.address,
        stakeAddress: mainWallet.stakeAddress,
        handle: mainWallet.handle || undefined,
        displayName: mainWallet.displayName,
        email: userIdentity?.type === 'email' ? userIdentity.email : undefined,
        isWalletConnected: true,
        walletBalance: mainWallet.balance,
        walletType: mainWallet.walletType,
      };
    }

    // PRIORITY 2: Fall back to auth identity if no wallet connected
    if (!userIdentity) return null;

    // Email-only authentication
    if (userIdentity.type === 'email') {
      console.log('📧 Using email-based user identity:', userIdentity.displayName);
      return {
        ...userIdentity,
        isWalletConnected: false,
      };
    }

    // Wallet authentication without active connection
    return {
      ...userIdentity,
      isWalletConnected: false,
    };
  };

  /**
   * Update enhanced identity when auth or wallet state changes
   */
  useEffect(() => {
    const newIdentity = createEnhancedIdentity();
    setEnhancedIdentity(newIdentity);

    // Run comprehensive data migration once when user identity is established
    if (newIdentity && !hasRunMigration) {
      migrateExistingUserData(newIdentity.id);
      setHasRunMigration(true);
    }
  }, [userIdentity, mainWallet, hasRunMigration]);

  /**
   * Refresh user identity (useful after wallet connection changes)
   */
  const refreshUserIdentity = () => {
    const newIdentity = createEnhancedIdentity();
    setEnhancedIdentity(newIdentity);
  };

  /**
   * Get user-friendly display name
   */
  const getUserDisplayName = (): string => {
    if (enhancedIdentity) {
      return enhancedIdentity.displayName;
    }
    if (userIdentity) {
      return userIdentity.displayName;
    }
    return 'Unknown User';
  };

  /**
   * Get consistent user identifier for API calls
   */
  const getUserIdentifier = (): string | null => {
    if (enhancedIdentity) {
      return enhancedIdentity.id;
    }
    return userId;
  };

  return {
    userIdentity: enhancedIdentity,
    userId,
    isAuthenticated,
    isLoading,
    userStorage,
    refreshUserIdentity,
    getUserDisplayName,
    getUserIdentifier,
  };
}

/**
 * Hook for managed wallet specific operations
 */
export function useManagedWalletIdentity() {
  const identity = useUserIdentity();
  
  return {
    ...identity,
    
    /**
     * Check if user can create managed wallets
     */
    canCreateManagedWallets: (): boolean => {
      return identity.isAuthenticated;
    },

    /**
     * Get identifier for managed wallet API calls
     */
    getManagedWalletApiIdentifier: (): string | null => {
      // Use the enhanced identity (userIdentity property)
      if (identity.userIdentity?.type === 'wallet') {
        // Try walletAddress first, then fallback to id (which contains the wallet address)
        return identity.userIdentity.walletAddress || identity.userIdentity.id || null;
      }
      if (identity.userIdentity?.type === 'email') {
        return identity.userIdentity.id;
      }

      // Debug logging to help troubleshoot
      console.log('🔍 getManagedWalletApiIdentifier - No valid identifier found:', {
        hasUserIdentity: !!identity.userIdentity,
        userIdentityType: identity.userIdentity?.type,
        walletAddress: identity.userIdentity?.walletAddress,
        id: identity.userIdentity?.id
      });

      return null;
    },

    /**
     * Get user type for managed wallet operations
     */
    getUserType: (): 'wallet' | 'email' | null => {
      return identity.userIdentity?.type || null;
    },

    /**
     * Check if user has wallet connected (for direct trading)
     */
    hasWalletConnected: (): boolean => {
      return identity.userIdentity?.isWalletConnected || false;
    },
  };
}
