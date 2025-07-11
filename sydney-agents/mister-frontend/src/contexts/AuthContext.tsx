'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '@/lib/auth/auth';
import { User } from '@/types/api';

// Enhanced user identification interface
export interface UserIdentity {
  id: string;                    // Unique user identifier
  type: 'wallet' | 'email';      // Authentication method
  walletAddress?: string;        // For wallet-authenticated users
  stakeAddress?: string;         // For TapTools API integration
  email?: string;                // For email-authenticated users
  handle?: string;               // ADA handle if available
  displayName: string;           // User-friendly display name
}

interface AuthContextType {
  user: User | null;
  userIdentity: UserIdentity | null;  // Enhanced user identification
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (walletAddress?: string) => Promise<boolean>;
  logout: () => void;
  autoLogin: () => Promise<boolean>;
  getUserId: () => string | null;     // Consistent user ID getter
  getUserStorageKey: (key: string) => string; // User-specific localStorage keys
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  /**
   * Initialize authentication on app start
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Get consistent user ID for the current user
   */
  const getUserId = (): string | null => {
    if (userIdentity) {
      return userIdentity.id;
    }
    return null;
  };

  /**
   * Generate user-specific localStorage key
   */
  const getUserStorageKey = (key: string): string => {
    const userId = getUserId();
    if (!userId) {
      console.warn('⚠️ No user ID available for localStorage key generation');
      return key; // Fallback to global key (not ideal)
    }
    return `${key}_${userId}`;
  };

  /**
   * Create UserIdentity from wallet connection data
   */
  const createWalletUserIdentity = (walletData: any): UserIdentity => {
    const walletAddress = walletData.address || walletData.walletAddress;
    const stakeAddress = walletData.stakeAddress;
    const handle = walletData.handle;

    // Use wallet address as primary identifier for wallet users
    const userId = walletAddress;

    // Create user-friendly display name
    let displayName = '';
    if (handle) {
      displayName = handle;
    } else if (walletAddress) {
      displayName = `${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 6)}`;
    } else {
      displayName = 'Wallet User';
    }

    return {
      id: userId,
      type: 'wallet',
      walletAddress,
      stakeAddress,
      handle,
      displayName
    };
  };

  /**
   * Create UserIdentity from email authentication data
   */
  const createEmailUserIdentity = (userData: User): UserIdentity => {
    // Use user.id as primary identifier for email users
    const userId = userData.id;

    // Create user-friendly display name
    const displayName = userData.email || `User ${userId.substring(0, 8)}`;

    return {
      id: userId,
      type: 'email',
      email: userData.email,
      displayName
    };
  };

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Initialize auth service
      await authService.initialize();
      
      // Check if user is already authenticated
      if (authService.isAuthenticated()) {
        console.log('🔐 Found existing auth token, validating...');
        const userResponse = await authService.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          setUser(userResponse.data);

          // Create UserIdentity for existing authenticated user
          // Note: For wallet users, this will be enhanced when WalletContext connects
          const emailIdentity = createEmailUserIdentity(userResponse.data);
          setUserIdentity(emailIdentity);

          console.log('✅ User authenticated from stored token');
        } else if (userResponse.error === 'Backend API unavailable') {
          // Backend is unavailable, but don't auto-authenticate
          console.log('🔄 Backend unavailable, waiting for user action...');
        } else {
          // Token is invalid, clear it but don't auto-login
          console.log('⚠️ Stored token invalid, clearing and waiting for user action...');
          authService.logout();
        }
      } else {
        // No existing auth found - don't auto-authenticate
        // Let users choose between wallet connection or email auth
        console.log('🔐 No existing auth found - waiting for user action (wallet connect or email auth)');
      }
    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
      authService.logout();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login with wallet address
   */
  const login = async (walletAddress?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      let authResponse;
      
      if (walletAddress) {
        // Authenticate with wallet
        authResponse = await authService.authenticateWithWallet(walletAddress);
      } else {
        // For demo purposes, use auto-authentication
        authResponse = await authService.autoAuthenticate();
      }

      if (authResponse.success) {
        const userResponse = await authService.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          setUser(userResponse.data);

          // Create UserIdentity based on authentication method
          if (walletAddress) {
            // Wallet authentication - need to get wallet data from WalletContext
            // For now, create basic identity, will be enhanced when wallet connects
            const walletIdentity = createWalletUserIdentity({ address: walletAddress });
            setUserIdentity(walletIdentity);
          } else {
            // Email authentication
            const emailIdentity = createEmailUserIdentity(userResponse.data);
            setUserIdentity(emailIdentity);
          }

          console.log('✅ User logged in successfully');
          return true;
        }
      }

      console.error('❌ Login failed:', authResponse.error);
      return false;
    } catch (error) {
      console.error('❌ Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Auto-login for demo purposes
   */
  const autoLogin = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const authResponse = await authService.autoAuthenticate();

      if (authResponse.success && authResponse.data) {
        // Get the updated user from the backend
        const userResponse = await authService.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          setUser(userResponse.data);

          // Create email-based UserIdentity for auto-login
          const emailIdentity = createEmailUserIdentity(userResponse.data);
          setUserIdentity(emailIdentity);

          console.log('✅ Auto-login successful');
          return true;
        } else {
          // Fallback to local user data
          const localUser = authService.getUser();
          setUser(localUser);

          if (localUser) {
            const emailIdentity = createEmailUserIdentity(localUser);
            setUserIdentity(emailIdentity);
          }

          console.log('✅ Auto-login successful (fallback)');
          return true;
        }
      }

      console.error('❌ Auto-login failed:', authResponse.error);
      return false;
    } catch (error) {
      console.error('❌ Auto-login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setUserIdentity(null);
      console.log('✅ User logged out');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Force logout even if backend fails
      setUser(null);
      setUserIdentity(null);
    }
  };

  const value: AuthContextType = {
    user,
    userIdentity,
    isAuthenticated,
    isLoading,
    login,
    logout,
    autoLogin,
    getUserId,
    getUserStorageKey,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to require authentication
 */
export function useRequireAuth(): AuthContextType {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Don't auto-login - let users choose authentication method
      console.log('🔐 Authentication required - please connect wallet or use email authentication');
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  return auth;
}
