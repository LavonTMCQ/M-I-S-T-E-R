"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, Shield, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { getWalletInfo } from "@/utils/handleUtils";
import { normalizeAddress, isValidCardanoAddress } from "@/utils/addressUtils";

interface WalletConnectionProps {
  onWalletConnected: (walletInfo: ConnectedWalletInfo) => void;
  onError: (error: string) => void;
}

interface ConnectedWalletInfo {
  address: string;
  stakeAddress?: string; // Add stake address for TapTools API
  walletType: string;
  balance: number;
  handle: string | null;
  displayName: string;
  walletApi?: any; // Add wallet API to the interface
}

interface CardanoWallet {
  name: string;
  icon: string;
  key: string;
  isInstalled: boolean;
  api?: any;
}

export function WalletConnection({ onWalletConnected, onError }: WalletConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWalletInfo | null>(null);
  const [availableWallets, setAvailableWallets] = useState<CardanoWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [isLoadingWalletInfo, setIsLoadingWalletInfo] = useState(false);

  // Supported Cardano wallets
  const supportedWallets: CardanoWallet[] = [
    { name: 'Nami', icon: '🦎', key: 'nami', isInstalled: false },
    { name: 'Eternl', icon: '♾️', key: 'eternl', isInstalled: false },
    { name: 'Flint', icon: '🔥', key: 'flint', isInstalled: false },
    { name: 'Vespr', icon: '👻', key: 'vespr', isInstalled: false },
    { name: 'Typhon', icon: '🌊', key: 'typhoncip30', isInstalled: false },
    { name: 'GeroWallet', icon: '⚡', key: 'gerowallet', isInstalled: false },
    { name: 'NuFi', icon: '🔷', key: 'nufi', isInstalled: false },
    { name: 'Yoroi', icon: '🏛️', key: 'yoroi', isInstalled: false },
    { name: 'Lace', icon: '🎭', key: 'lace', isInstalled: false },
  ];

  // Check for installed wallets on component mount
  useEffect(() => {
    checkInstalledWallets();
  }, []);

  const checkInstalledWallets = () => {
    if (typeof window === 'undefined') return;

    const installedWallets = supportedWallets.map(wallet => ({
      ...wallet,
      isInstalled: !!(window as any).cardano?.[wallet.key]
    }));

    setAvailableWallets(installedWallets);
  };

  const connectWallet = async (walletKey: string) => {
    if (typeof window === 'undefined') return;

    setIsConnecting(true);
    setSelectedWallet(walletKey);

    try {
      const cardano = (window as any).cardano;
      
      if (!cardano || !cardano[walletKey]) {
        throw new Error(`${walletKey} wallet not found. Please install the wallet extension.`);
      }

      // Enable the wallet
      const walletApi = await cardano[walletKey].enable();
      
      if (!walletApi) {
        throw new Error('Failed to enable wallet');
      }

      // Get wallet address - try multiple methods to get bech32 format
      console.log('🔍 Available wallet API methods:', Object.keys(walletApi));

      let rawAddress = null;

      // Try to get addresses in different formats
      try {
        const addresses = await walletApi.getUsedAddresses();
        if (addresses && addresses.length > 0) {
          rawAddress = addresses[0];
          console.log('🔍 Raw address from getUsedAddresses:', rawAddress);
          console.log('🔍 getUsedAddresses returned', addresses.length, 'addresses');

          // Log all addresses to see if any are in bech32 format
          addresses.forEach((addr, index) => {
            console.log(`🔍 Address ${index}:`, addr);
          });
        }
      } catch (error) {
        console.log('❌ getUsedAddresses failed:', error);
      }

      // Try getUnusedAddresses to see if they're in different format
      if (walletApi.getUnusedAddresses) {
        try {
          const unusedAddresses = await walletApi.getUnusedAddresses();
          if (unusedAddresses && unusedAddresses.length > 0) {
            console.log('🔍 getUnusedAddresses returned', unusedAddresses.length, 'addresses');
            unusedAddresses.forEach((addr, index) => {
              console.log(`🔍 Unused Address ${index}:`, addr);
            });

            // If we don't have a used address, try the first unused one
            if (!rawAddress) {
              rawAddress = unusedAddresses[0];
              console.log('🔍 Using first unused address:', rawAddress);
            }
          }
        } catch (error) {
          console.log('❌ getUnusedAddresses failed:', error);
        }
      }

      // Try getChangeAddress if available
      if (walletApi.getChangeAddress) {
        try {
          const changeAddress = await walletApi.getChangeAddress();
          console.log('🔍 Raw address from getChangeAddress:', changeAddress);

          // If we don't have an address yet, use change address
          if (!rawAddress) {
            rawAddress = changeAddress;
          }
        } catch (error) {
          console.log('❌ getChangeAddress failed:', error);
        }
      }

      // Try getRewardAddresses if available
      if (walletApi.getRewardAddresses) {
        try {
          const rewardAddresses = await walletApi.getRewardAddresses();
          if (rewardAddresses && rewardAddresses.length > 0) {
            console.log('🔍 getRewardAddresses returned', rewardAddresses.length, 'addresses');
            rewardAddresses.forEach((addr, index) => {
              console.log(`🔍 Reward Address ${index}:`, addr);
            });
          }
        } catch (error) {
          console.log('❌ getRewardAddresses failed:', error);
        }
      }

      if (!rawAddress) {
        throw new Error('No addresses found in wallet');
      }

      // 🎯 EXTRACT BOTH PAYMENT AND STAKE ADDRESSES
      // Payment address for general use, stake address for TapTools API
      let addressForAPI = rawAddress;
      let stakeAddress = null;

      // Always try to get stake address for TapTools API integration
      if (walletApi.getRewardAddresses) {
        try {
          const rewardAddresses = await walletApi.getRewardAddresses();
          if (rewardAddresses && rewardAddresses.length > 0) {
            const rewardHex = rewardAddresses[0];
            console.log('🎯 Extracting stake address hex:', rewardHex);
            console.log('🎯 Stake address length:', rewardHex.length);

            // Convert stake address to bech32
            if (rewardHex.length === 58 || rewardHex.length === 56) {
              try {
                const stakeBech32 = await normalizeAddress(rewardHex);
                console.log('🎯 Stake address converts to:', stakeBech32);

                if (stakeBech32.startsWith('stake1')) {
                  stakeAddress = stakeBech32;
                  console.log('✅ Extracted stake address for TapTools API:', stakeBech32);

                  // For long payment addresses, use stake address for handle/balance resolution too
                  if (rawAddress.length === 114) {
                    addressForAPI = stakeBech32;
                    console.log('✅ Using stake address for handle/balance resolution (payment address too long)');
                  }
                } else {
                  console.log('⚠️ Stake address conversion failed');
                }
              } catch (stakeError) {
                console.error('❌ Failed to convert stake address:', stakeError);
                console.log('🔧 Continuing without stake address conversion');
              }
            }
          }
        } catch (error) {
          console.log('❌ Failed to get stake address:', error);
        }
      }

      // Validate the address format
      if (!isValidCardanoAddress(rawAddress)) {
        throw new Error('Invalid address format received from wallet');
      }

      // Convert to proper bech32 format for API calls (use stake address if available)
      let normalizedAddress = addressForAPI; // Fallback to original
      try {
        normalizedAddress = await normalizeAddress(addressForAPI);
        console.log('🔍 Normalized address for API calls:', normalizedAddress);
      } catch (normalizeError) {
        console.error('❌ Failed to normalize address for API calls:', normalizeError);
        console.log('🔧 Using original address for API calls:', addressForAPI);
        // Continue with original address
      }

      setIsLoadingWalletInfo(true);

      // Get real wallet info including handle and balance using the best address
      const walletInfo = await getWalletInfo(normalizedAddress);

      const connectedWalletInfo: ConnectedWalletInfo = {
        address: walletInfo.address,
        stakeAddress: stakeAddress, // Include stake address for TapTools API
        walletType: walletKey,
        balance: walletInfo.balance,
        handle: walletInfo.handle,
        displayName: walletInfo.displayName,
        walletApi: walletApi // Include the wallet API
      };

      console.log('✅ Wallet info retrieved:', connectedWalletInfo);

      setConnectedWallet(connectedWalletInfo);
      onWalletConnected(connectedWalletInfo);

    } catch (error) {
      console.error('Wallet connection failed:', error);
      onError(error instanceof Error ? error.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
      setSelectedWallet(null);
      setIsLoadingWalletInfo(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      // Clear local wallet state
      setConnectedWallet(null);

      // Clear authentication and redirect to wallet setup
      const { authService } = await import('@/lib/auth/auth');
      authService.logout();

      // Redirect to wallet setup to start fresh
      window.location.href = '/wallet-setup';
    } catch (error) {
      console.error('Error during disconnect:', error);
      // Fallback: just clear local state and reload
      setConnectedWallet(null);
      window.location.reload();
    }
  };

  const refreshWalletInfo = async () => {
    if (!connectedWallet) return;

    setIsLoadingWalletInfo(true);
    try {
      const walletInfo = await getWalletInfo(connectedWallet.address);

      const updatedWalletInfo: ConnectedWalletInfo = {
        ...connectedWallet,
        balance: walletInfo.balance,
        handle: walletInfo.handle,
        displayName: walletInfo.displayName
      };

      setConnectedWallet(updatedWalletInfo);
    } catch (error) {
      console.error('Failed to refresh wallet info:', error);
    } finally {
      setIsLoadingWalletInfo(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  if (connectedWallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Wallet Connected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="font-medium text-green-800">
                  {supportedWallets.find(w => w.key === connectedWallet.walletType)?.name || connectedWallet.walletType}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshWalletInfo}
                  disabled={isLoadingWalletInfo}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingWalletInfo ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Display handle prominently if available */}
              {connectedWallet.handle ? (
                <div className="text-lg font-bold text-blue-600 mb-1">
                  {connectedWallet.handle}
                </div>
              ) : (
                <div className="text-sm text-green-600 mb-1">
                  {formatAddress(connectedWallet.address)}
                </div>
              )}

              {/* Always show address if we have a handle */}
              {connectedWallet.handle && (
                <div className="text-xs text-green-500 mb-1">
                  {formatAddress(connectedWallet.address)}
                </div>
              )}

              <div className="text-sm font-medium text-green-700">
                Balance: {isLoadingWalletInfo ? (
                  <span className="inline-flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  `${connectedWallet.balance.toFixed(2)} ADA`
                )}
              </div>
            </div>
            <Badge variant="outline" className="text-green-700 border-green-300">
              Connected
            </Badge>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your main wallet is connected for identification only. A separate managed wallet will be created for trading.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={disconnectWallet}
              className="flex-1"
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Connect Cardano Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Connect your main Cardano wallet for identification. We'll create a separate managed wallet for trading.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {availableWallets.map((wallet) => (
            <Button
              key={wallet.key}
              variant={wallet.isInstalled ? "outline" : "ghost"}
              className={`h-16 flex flex-col items-center justify-center gap-1 ${
                !wallet.isInstalled ? 'opacity-50 cursor-not-allowed' : ''
              } ${selectedWallet === wallet.key ? 'border-primary' : ''}`}
              onClick={() => wallet.isInstalled && connectWallet(wallet.key)}
              disabled={!wallet.isInstalled || isConnecting}
            >
              <div className="text-2xl">{wallet.icon}</div>
              <div className="text-sm font-medium">{wallet.name}</div>
              {!wallet.isInstalled && (
                <div className="text-xs text-muted-foreground">Not Installed</div>
              )}
              {selectedWallet === wallet.key && isConnecting && (
                <div className="text-xs text-primary">Connecting...</div>
              )}
            </Button>
          ))}
        </div>

        {availableWallets.filter(w => !w.isInstalled).length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Some wallets are not installed.</span>
              <Button variant="link" size="sm" className="h-auto p-0">
                <ExternalLink className="w-3 h-3 mr-1" />
                Install Wallets
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isConnecting && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Connecting to wallet...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
