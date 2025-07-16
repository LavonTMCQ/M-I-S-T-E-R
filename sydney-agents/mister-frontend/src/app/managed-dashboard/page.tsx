"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Wallet,
  LogOut,
  RefreshCw,
  Copy,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useRequireAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { useManagedWalletIdentity } from "@/hooks/useUserIdentity";
import { USER_STORAGE_KEYS } from "@/lib/utils/userStorage";
import { EnhancedManagedDashboard } from "@/components/trading/EnhancedManagedDashboard";

interface ManagedWalletData {
  address: string;
  balance: number;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  positions: number;
  agentStatus: 'active' | 'paused' | 'stopped';
  lastActivity: string;
}

// TODO: Add TradingAlgorithm interface when algorithm functionality is implemented

export default function ManagedDashboardPage() {
  useRequireAuth(); // Ensure user is authenticated
  const { mainWallet, isLoading: walletLoading } = useWallet();

  // Enhanced user identification for secure localStorage
  const {
    userStorage,
    isAuthenticated,
    getUserDisplayName,
    refreshUserIdentity,
    userIdentity,
    isLoading: identityLoading,
  } = useManagedWalletIdentity();

  // Debug: Log wallet state from both contexts
  console.log('🔍 ManagedDashboard - Wallet from useWallet():', {
    hasMainWallet: !!mainWallet,
    isConnected: mainWallet?.isConnected,
    displayName: mainWallet?.displayName,
    address: mainWallet?.address?.substring(0, 20) + '...',
    walletLoading
  });

  // Debug: Log identity state
  console.log('🔍 ManagedDashboard - Identity from useManagedWalletIdentity():', {
    hasUserIdentity: !!userIdentity,
    identityType: userIdentity?.type,
    identityDisplayName: userIdentity?.displayName,
    isAuthenticated,
    identityLoading,
    getUserDisplayName: getUserDisplayName()
  });

  const [isLoading, setIsLoading] = useState(true);
  const [managedWallet, setManagedWallet] = useState<ManagedWalletData | null>(null);
  const [agentEnabled, setAgentEnabled] = useState(false);

  // Combined loading state - wait for both wallet and identity
  const isSystemLoading = walletLoading || identityLoading;
  const isSystemReady = !isSystemLoading && (mainWallet?.isConnected || isAuthenticated);

  /**
   * Try to migrate wallet data from other user authentication methods
   * This handles cases where a user created a wallet with email auth but is now using wallet auth
   */
  const tryMigrateWalletData = useCallback(async (): Promise<string | null> => {
    try {
      console.log('🔄 Attempting to migrate managed wallet data from other user types...');
      console.log('🔍 Current user:', getUserDisplayName());

      // Get all localStorage keys that contain managed wallet data
      const allKeys = Object.keys(localStorage);
      const walletKeys = allKeys.filter(key => key.includes('selectedManagedWallet_'));

      console.log(`🔍 Found ${walletKeys.length} potential managed wallet keys:`, walletKeys);

      // Sort keys by creation time (most recent first) to prioritize newer wallets
      const sortedKeys = walletKeys.sort((a, b) => {
        try {
          const dataA = localStorage.getItem(a);
          const dataB = localStorage.getItem(b);
          if (dataA && dataB) {
            const parsedA = JSON.parse(dataA);
            const parsedB = JSON.parse(dataB);
            const timeA = new Date(parsedA.createdAt || 0).getTime();
            const timeB = new Date(parsedB.createdAt || 0).getTime();
            return timeB - timeA; // Most recent first
          }
        } catch {
          // If parsing fails, maintain original order
        }
        return 0;
      });

      // Try each key to find valid wallet data
      for (const key of sortedKeys) {
        try {
          const walletData = localStorage.getItem(key);
          if (walletData) {
            const parsed = JSON.parse(walletData);
            if (parsed.address && (parsed.userId || parsed.id)) {
              console.log(`✅ Found valid managed wallet data in key: ${key}`);
              console.log(`📋 Wallet address: ${parsed.address.substring(0, 20)}...`);
              console.log(`📋 Original user: ${parsed.userId || parsed.id}`);
              console.log(`📋 Created: ${parsed.createdAt || 'Unknown'}`);

              // Store this wallet data for the current user
              userStorage.setItem(USER_STORAGE_KEYS.SELECTED_WALLET, walletData);
              console.log('💾 [SECURE] Migrated managed wallet data to current user');

              return walletData;
            }
          }
        } catch (parseError) {
          console.warn(`⚠️ Failed to parse wallet data from key ${key}:`, parseError);
        }
      }

      console.log('❌ No valid managed wallet data found for migration');
      return null;

    } catch (error) {
      console.error('❌ Error during wallet data migration:', error);
      return null;
    }
  }, [getUserDisplayName, userStorage]);

  const loadManagedWalletData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Ensure we have proper user identification before proceeding
      console.log('🔍 Authentication check:', {
        isAuthenticated,
        hasUserStorage: !!userStorage,
        userDisplayName: getUserDisplayName()
      });

      // For now, let's bypass the user display name check and just use userStorage
      // The real issue is that we need to store the wallet data properly after creation
      if (!userStorage) {
        console.log('⚠️ No userStorage available, skipping wallet data load');
        setIsLoading(false);
        return;
      }

      console.log('✅ Valid user context found, proceeding with wallet data load');

      const userDisplayName = getUserDisplayName();
      console.log('🔍 Loading managed wallet data for user:', userDisplayName);
      console.log('🔗 Wallet connected:', mainWallet?.isConnected ? 'Yes' : 'No');

      // If wallet is connected but user display name is still "Unknown User",
      // try using the wallet display name directly
      let effectiveUserName = userDisplayName;
      if (userDisplayName === 'Unknown User' && mainWallet?.isConnected && mainWallet.displayName) {
        effectiveUserName = mainWallet.displayName;
        console.log('🔄 Using wallet display name as fallback:', effectiveUserName);
      }

      console.log('🔍 Looking for storage key:', `selectedManagedWallet_${effectiveUserName}`);

      // Get the selected managed wallet from user-specific localStorage
      let selectedWallet = userStorage.getItem(USER_STORAGE_KEYS.SELECTED_WALLET);
      console.log('🔍 Found wallet data in storage:', selectedWallet ? 'Yes' : 'No');

      // If no wallet found with current user, try with effective user name
      if (!selectedWallet && effectiveUserName !== userDisplayName) {
        console.log('🔍 Trying fallback storage key with wallet name...');
        const fallbackKey = `selectedManagedWallet_${effectiveUserName}`;
        selectedWallet = localStorage.getItem(fallbackKey);
        console.log('🔍 Found wallet data with fallback key:', selectedWallet ? 'Yes' : 'No');
      }

      // If no wallet found for current user, try to migrate from other user types
      if (!selectedWallet) {
        console.log('🔍 No managed wallet found for current user, checking for migration opportunities...');

        // Debug: Show all localStorage keys
        const allKeys = Object.keys(localStorage);
        const walletKeys = allKeys.filter(key => key.includes('selectedManagedWallet_'));
        console.log('🔍 All wallet keys in localStorage:', walletKeys);

        selectedWallet = await tryMigrateWalletData();
      }

      if (selectedWallet) {
        const walletData = JSON.parse(selectedWallet);
        console.log('📱 [SECURE] Using selected managed wallet for user:', getUserDisplayName());

        // Use the real wallet data instead of mock data
        setManagedWallet({
          address: walletData.address,
          balance: walletData.balance || 0, // Real balance, not 1000 ADA
          totalValue: walletData.totalValue || 0,
          pnl: walletData.pnl || 0,
          pnlPercent: walletData.pnlPercent || 0,
          positions: walletData.positions || 0,
          agentStatus: walletData.agentStatus || 'paused',
          lastActivity: walletData.lastActivity || 'Never'
        });
        setAgentEnabled(walletData.agentStatus === 'active');

        // Load algorithms (this can still be from API)
        const authToken = userStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        console.log('🔑 Using auth token for API call:', authToken ? 'Found' : 'Missing');

        if (authToken) {
          const algoResponse = await fetch('https://substantial-scarce-magazin.mastra.cloud/api/wallet/managed', {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            }
          });

          if (algoResponse.ok) {
            const algoData = await algoResponse.json();
            // TODO: Handle algorithms when functionality is implemented
            console.log('📊 Algorithms data:', algoData.algorithms || []);
          }
        }
      } else {
        // Fallback to API if no selected wallet
        const authToken = userStorage.getItem('auth_token') || localStorage.getItem('auth_token');

        // For wallet users, they might not have auth tokens, so handle gracefully
        if (!authToken) {
          console.log('🔍 No auth token found - wallet user needs to create managed wallet');
          // Don't set managedWallet, let the component show "Create Managed Wallet" screen
        } else {
          const response = await fetch('https://substantial-scarce-magazin.mastra.cloud/api/wallet/managed', {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            }
          });

          if (response.ok) {
            const data = await response.json();
            setManagedWallet(data.wallet);
            // TODO: Handle algorithms when functionality is implemented
            console.log('📊 Algorithms data:', data.algorithms || []);
            setAgentEnabled(data.agentStatus === 'active');
          } else {
            console.error('Failed to load managed wallet data - API returned:', response.status);
            // Don't set managedWallet, let the component show "Create Managed Wallet" screen
          }
        }
      }
    } catch (error) {
      console.error('Error loading managed wallet:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userStorage, isAuthenticated, getUserDisplayName, mainWallet, tryMigrateWalletData]);

  useEffect(() => {
    // Skip the retry mechanism entirely - just load data when system is ready
    if (!isSystemLoading && isSystemReady) {
      console.log('✅ System ready, loading managed wallet data...');
      loadManagedWalletData();
    }
  }, [isSystemLoading, isSystemReady, loadManagedWalletData]); // React when loading states change

  // Also try to reload when wallet or auth state changes
  useEffect(() => {
    if (mainWallet?.isConnected && !isLoading) {
      console.log('🔄 Wallet connected, refreshing user identity...');
      refreshUserIdentity();
      // Small delay to let identity update, then reload
      setTimeout(() => {
        const userDisplayName = getUserDisplayName();
        if (userDisplayName !== 'Unknown User') {
          console.log('🔄 Reloading managed wallet data after wallet connection...');
          loadManagedWalletData();
        }
      }, 1000);
    }
  }, [mainWallet?.isConnected, mainWallet?.displayName, isLoading, refreshUserIdentity, getUserDisplayName, loadManagedWalletData]);

  const toggleAgent = async () => {
    try {
      const newStatus = agentEnabled ? 'paused' : 'active';
      const authToken = userStorage.getItem('auth_token') || localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4113/api/agents/strike/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setAgentEnabled(!agentEnabled);
      }
    } catch (error) {
      console.error('Failed to toggle agent:', error);
    }
  };

  // TODO: Implement algorithm toggle functionality when needed
  // const toggleAlgorithm = async (algorithmId: string) => { ... }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>Loading managed wallet...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!managedWallet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">No Managed Wallet Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              You don&apos;t have a managed wallet set up yet.
            </p>
            <Button onClick={() => window.location.href = '/managed-wallets'}>
              Create Managed Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">MISTER Managed Trading</h1>
              <Badge variant="outline" className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                AI Managed
              </Badge>
              {managedWallet && (
                <div className="flex items-center gap-2 text-sm">
                  <Wallet className="h-3 w-3 text-primary" />
                  <span className="font-mono text-primary font-medium">
                    {managedWallet.address}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-primary/10"
                    onClick={() => {
                      navigator.clipboard.writeText(managedWallet.address);
                      // Could add a toast notification here
                    }}
                    title="Copy managed wallet address"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Agent Status Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Agent:</span>
                <Switch
                  checked={agentEnabled}
                  onCheckedChange={toggleAgent}
                />
                <Badge variant={agentEnabled ? "default" : "secondary"}>
                  {agentEnabled ? "Active" : "Paused"}
                </Badge>
              </div>
              
              <Button variant="outline" size="sm" onClick={loadManagedWalletData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/managed-wallets'}
              >
                <Wallet className="h-4 w-4 mr-2" />
                View All Wallets
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Note: auth.logout() doesn't exist, need to use proper logout
                  window.location.href = '/';
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Enhanced Dashboard */}
      <div className="container mx-auto px-4 py-6 relative z-40">
        {/* Show enhanced dashboard only if we have a managed wallet */}
        {managedWallet ? (
          <EnhancedManagedDashboard
            managedWallet={{
              walletId: `managed_${managedWallet.address.substring(0, 12)}`, // Create a proper walletId
              address: managedWallet.address,
              balance: managedWallet.balance,
              userId: userIdentity?.id || `user_${managedWallet.address.substring(0, 12)}`
            }}
          />
        ) : (
          <div className="text-center py-8">
            <p>Loading managed wallet...</p>
          </div>
        )}
      </div>
    </div>
  );
}
