/**
 * User Preferences Demo Page
 * Demonstrates the new Supabase + localStorage sync system
 */

'use client';

import React, { useState, useEffect } from 'react';
import { UserPreferencesManager } from '../../components/storage/UserPreferencesManager';
import { useUserStorage } from '../../hooks/useUserStorage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Separator } from '../../components/ui/separator';
import { 
  Settings, 
  Database, 
  HardDrive, 
  Shuffle, 
  User, 
  Wallet,
  Info
} from 'lucide-react';

export default function PreferencesPage() {
  const [userId, setUserId] = useState<string>('');
  const [storageMode, setStorageMode] = useState<'localStorage' | 'database' | 'hybrid'>('hybrid');

  // Get user ID from auth context or wallet
  useEffect(() => {
    const getUserId = () => {
      // Try to get user ID from auth token
      const authToken = localStorage.getItem('auth_token');
      if (authToken) {
        if (authToken.startsWith('mock_token_')) {
          return authToken.replace('mock_token_', '');
        } else if (authToken.startsWith('mister_token_')) {
          return 'wallet_user';
        }
      }

      // Try to get from main wallet
      const mainWallet = localStorage.getItem('mainWallet');
      if (mainWallet) {
        try {
          const walletData = JSON.parse(mainWallet);
          return walletData.address || 'anonymous_user';
        } catch (error) {
          console.warn('Failed to parse wallet data:', error);
        }
      }

      // Fallback to anonymous user
      return 'demo_user_' + Date.now().toString().slice(-6);
    };

    const id = getUserId();
    setUserId(id);
    console.log('🔍 [PREFERENCES] Using user ID:', id);
  }, []);

  // Demo: Trading preferences
  const {
    value: tradingPrefs,
    setValue: setTradingPrefs,
    loading: tradingLoading,
    error: tradingError,
    syncStatus: tradingSyncStatus
  } = useUserStorage('trading-preferences', {
    userId,
    mode: storageMode,
    autoSync: true,
    syncInterval: 30000,
  });

  // Demo: Dashboard preferences
  const {
    value: dashboardPrefs,
    setValue: setDashboardPrefs,
    loading: dashboardLoading,
    syncStatus: dashboardSyncStatus
  } = useUserStorage('dashboard-preferences', {
    userId,
    mode: storageMode,
    autoSync: true,
  });

  const handleUpdateTradingPrefs = async () => {
    const newPrefs = {
      defaultSize: Math.floor(Math.random() * 1000) + 100,
      autoClose: Math.random() > 0.5,
      riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
      chartTimeframe: ['1m', '5m', '15m', '1h', '4h', '1d'][Math.floor(Math.random() * 6)],
      layout: ['grid', 'list'][Math.floor(Math.random() * 2)],
    };

    try {
      await setTradingPrefs(newPrefs);
      console.log('✅ Updated trading preferences:', newPrefs);
    } catch (error) {
      console.error('❌ Failed to update trading preferences:', error);
    }
  };

  const handleUpdateDashboardPrefs = async () => {
    const newPrefs = {
      theme: ['light', 'dark'][Math.floor(Math.random() * 2)] as 'light' | 'dark',
      layout: ['grid', 'list'][Math.floor(Math.random() * 2)] as 'grid' | 'list',
      defaultTab: ['overview', 'trading', 'portfolio'][Math.floor(Math.random() * 3)],
    };

    try {
      await setDashboardPrefs(newPrefs);
      console.log('✅ Updated dashboard preferences:', newPrefs);
    } catch (error) {
      console.error('❌ Failed to update dashboard preferences:', error);
    }
  };

  if (!userId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Loading User Context...</h2>
            <p className="text-muted-foreground">Initializing user preferences system</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            User Preferences Demo
          </h1>
          <p className="text-muted-foreground mt-2">
            Demonstration of localStorage + Supabase sync system
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {userId.length > 20 ? `${userId.slice(0, 20)}...` : userId}
          </Badge>
        </div>
      </div>

      {/* Storage Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Mode
          </CardTitle>
          <CardDescription>
            Choose how preferences are stored and synchronized
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={storageMode === 'localStorage' ? 'default' : 'outline'}
              onClick={() => setStorageMode('localStorage')}
              className="flex items-center gap-2"
            >
              <HardDrive className="h-4 w-4" />
              localStorage Only
            </Button>
            <Button
              variant={storageMode === 'database' ? 'default' : 'outline'}
              onClick={() => setStorageMode('database')}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Database Only
            </Button>
            <Button
              variant={storageMode === 'hybrid' ? 'default' : 'outline'}
              onClick={() => setStorageMode('hybrid')}
              className="flex items-center gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Hybrid (Recommended)
            </Button>
          </div>
          
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Hybrid mode</strong> uses localStorage for fast access and Supabase for persistence and sync across devices.
              It automatically falls back to localStorage when offline.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Demo Tabs */}
      <Tabs defaultValue="manager" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manager">Preferences Manager</TabsTrigger>
          <TabsTrigger value="trading">Trading Demo</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard Demo</TabsTrigger>
        </TabsList>

        {/* Full Preferences Manager */}
        <TabsContent value="manager">
          <UserPreferencesManager 
            userId={userId} 
            mode={storageMode}
          />
        </TabsContent>

        {/* Trading Preferences Demo */}
        <TabsContent value="trading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Preferences Demo</CardTitle>
              <CardDescription>
                Example of using individual preference hooks for trading settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Current Trading Preferences</h4>
                  <p className="text-sm text-muted-foreground">
                    Sync Status: <Badge variant="outline">{tradingSyncStatus}</Badge>
                  </p>
                </div>
                <Button 
                  onClick={handleUpdateTradingPrefs}
                  disabled={tradingLoading}
                  className="flex items-center gap-2"
                >
                  <Shuffle className="h-4 w-4" />
                  Randomize Settings
                </Button>
              </div>

              <Separator />

              {tradingError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-600">
                    {tradingError}
                  </AlertDescription>
                </Alert>
              )}

              {tradingPrefs && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Default Size:</span>
                    <p className="font-medium">{tradingPrefs.defaultSize} ADA</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Auto Close:</span>
                    <p className="font-medium">{tradingPrefs.autoClose ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Risk Level:</span>
                    <p className="font-medium capitalize">{tradingPrefs.riskLevel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Chart Timeframe:</span>
                    <p className="font-medium">{tradingPrefs.chartTimeframe}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Layout:</span>
                    <p className="font-medium capitalize">{tradingPrefs.layout}</p>
                  </div>
                </div>
              )}

              {!tradingPrefs && !tradingLoading && (
                <p className="text-muted-foreground text-center py-4">
                  No trading preferences set. Click "Randomize Settings" to create some.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Preferences Demo */}
        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Preferences Demo</CardTitle>
              <CardDescription>
                Example of using individual preference hooks for dashboard settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Current Dashboard Preferences</h4>
                  <p className="text-sm text-muted-foreground">
                    Sync Status: <Badge variant="outline">{dashboardSyncStatus}</Badge>
                  </p>
                </div>
                <Button 
                  onClick={handleUpdateDashboardPrefs}
                  disabled={dashboardLoading}
                  className="flex items-center gap-2"
                >
                  <Shuffle className="h-4 w-4" />
                  Randomize Settings
                </Button>
              </div>

              <Separator />

              {dashboardPrefs && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Theme:</span>
                    <p className="font-medium capitalize">{dashboardPrefs.theme}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Layout:</span>
                    <p className="font-medium capitalize">{dashboardPrefs.layout}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Default Tab:</span>
                    <p className="font-medium capitalize">{dashboardPrefs.defaultTab}</p>
                  </div>
                </div>
              )}

              {!dashboardPrefs && !dashboardLoading && (
                <p className="text-muted-foreground text-center py-4">
                  No dashboard preferences set. Click "Randomize Settings" to create some.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
