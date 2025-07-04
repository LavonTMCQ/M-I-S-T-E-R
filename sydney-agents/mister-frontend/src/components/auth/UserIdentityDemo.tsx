/**
 * User Identity Demo Component
 * Demonstrates the enhanced user identification system
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserIdentity, useManagedWalletIdentity } from '@/hooks/useUserIdentity';
import { MANAGED_WALLET_STORAGE_KEYS } from '@/lib/utils/userStorage';

export function UserIdentityDemo() {
  const {
    userIdentity,
    userId,
    isAuthenticated,
    isLoading,
    userStorage,
    getUserDisplayName,
    getUserIdentifier,
  } = useUserIdentity();

  const {
    canCreateManagedWallets,
    getManagedWalletApiIdentifier,
    getUserType,
    hasWalletConnected,
  } = useManagedWalletIdentity();

  const handleTestStorage = () => {
    // Test user-specific localStorage
    userStorage.setItem(MANAGED_WALLET_STORAGE_KEYS.ARCHIVE_STATUS, JSON.stringify({
      'wallet1': true,
      'wallet2': false,
    }));
    
    const data = userStorage.getItem(MANAGED_WALLET_STORAGE_KEYS.ARCHIVE_STATUS);
    console.log('📦 User-specific storage test:', data);
  };

  const handleClearUserData = () => {
    userStorage.clear();
    console.log('🧹 Cleared all user-specific data');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading user identity...</div>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Please authenticate to see user identity information
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            User Identity Information
            <Badge variant={userIdentity?.type === 'wallet' ? 'default' : 'secondary'}>
              {userIdentity?.type || 'unknown'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <div className="font-mono text-sm bg-muted p-2 rounded">
                {userId || 'Not available'}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Display Name</label>
              <div className="font-medium">
                {getUserDisplayName()}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">API Identifier</label>
              <div className="font-mono text-sm bg-muted p-2 rounded">
                {getUserIdentifier() || 'Not available'}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Managed Wallet API ID</label>
              <div className="font-mono text-sm bg-muted p-2 rounded">
                {getManagedWalletApiIdentifier() || 'Not available'}
              </div>
            </div>
          </div>

          {userIdentity?.type === 'wallet' && (
            <div className="space-y-2">
              <h4 className="font-medium">Wallet Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
                  <div className="font-mono text-xs bg-muted p-2 rounded break-all">
                    {userIdentity.walletAddress}
                  </div>
                </div>
                
                {userIdentity.stakeAddress && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Stake Address</label>
                    <div className="font-mono text-xs bg-muted p-2 rounded break-all">
                      {userIdentity.stakeAddress}
                    </div>
                  </div>
                )}

                {userIdentity.handle && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ADA Handle</label>
                    <div className="font-medium">
                      {userIdentity.handle}
                    </div>
                  </div>
                )}

                {userIdentity.isWalletConnected && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Wallet Status</label>
                    <Badge variant="default">Connected</Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {userIdentity?.type === 'email' && userIdentity.email && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <div className="font-medium">
                {userIdentity.email}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capabilities & Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Can Create Managed Wallets</span>
            <Badge variant={canCreateManagedWallets() ? 'default' : 'secondary'}>
              {canCreateManagedWallets() ? 'Yes' : 'No'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Has Wallet Connected</span>
            <Badge variant={hasWalletConnected() ? 'default' : 'secondary'}>
              {hasWalletConnected() ? 'Yes' : 'No'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>User Type</span>
            <Badge variant="outline">
              {getUserType() || 'Unknown'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User-Specific Storage Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Test user-specific localStorage to ensure data isolation between users.
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleTestStorage} variant="outline" size="sm">
              Test Storage
            </Button>
            <Button onClick={handleClearUserData} variant="outline" size="sm">
              Clear User Data
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">User Storage Keys</label>
            <div className="font-mono text-xs bg-muted p-2 rounded">
              {userStorage.getAllKeys().join(', ') || 'No user-specific data'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
