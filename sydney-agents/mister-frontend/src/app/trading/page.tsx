'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Activity, Bot, Brain, User } from 'lucide-react';
import { ManualTradingInterface } from '@/components/trading/ManualTradingInterface';
import { TradingChart } from '@/components/trading/TradingChart';
import { AITradingChat } from '@/components/trading/AITradingChat';
import { AIThinkingTerminal } from '@/components/trading/AIThinkingTerminal';
import { StrategySelection } from '@/components/trading/StrategySelection';
import { PositionsSummary } from '@/components/trading/PositionsSummary';
import { MarketInfoBar } from '@/components/trading/MarketInfoBar';
import { MisterLogo } from '@/components/ui/mister-logo';
import { useRequireAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import { USER_STORAGE_KEYS } from '@/lib/utils/userStorage';

interface WalletRegistrationInfo {
  walletAddress: string;
  stakeAddress: string;
  walletType: string;
  balance: number;
  handle?: string | null;
}

export default function TradingPage() {
  const auth = useRequireAuth();
  const { mainWallet, isLoading: walletLoading } = useWallet();

  // Enhanced user identification for secure localStorage
  const {
    userStorage,
    isAuthenticated,
    getUserDisplayName,
  } = useUserIdentity();

  // Ref to track if preferences have been loaded to prevent infinite loops
  const preferencesLoadedRef = useRef(false);

  // MISTER Trading mode state
  const [isMisterMode, setIsMisterMode] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('fibonacci');
  const [showStrategySelection, setShowStrategySelection] = useState(false);

  const [marketData, setMarketData] = useState({
    price: 0.47,
    change24h: 0.025,
    change24hPercent: 5.6,
    volume24h: 1250000,
    longInterest: 1777163.53,
    shortInterest: 19694.99
  });

  // User-specific trading preferences
  const [tradingPreferences, setTradingPreferences] = useState({
    defaultSize: 100,
    autoClose: false,
    riskLevel: 'medium',
    chartTimeframe: '15m',
    layout: 'standard'
  });

  // Load user-specific trading preferences
  useEffect(() => {
    if (isAuthenticated && userStorage && !preferencesLoadedRef.current) {
      const savedPreferences = userStorage.getItem(USER_STORAGE_KEYS.TRADING_PREFERENCES);
      if (savedPreferences) {
        try {
          const preferences = JSON.parse(savedPreferences);
          setTradingPreferences(prev => ({ ...prev, ...preferences }));
          console.log('📊 [SECURE] Loaded trading preferences for user:', getUserDisplayName());
          preferencesLoadedRef.current = true;
        } catch (error) {
          console.warn('⚠️ Failed to parse trading preferences:', error);
        }
      } else {
        preferencesLoadedRef.current = true;
      }
    }
  }, [isAuthenticated, userStorage, getUserDisplayName]);

  // Save trading preferences when they change
  useEffect(() => {
    if (isAuthenticated && userStorage) {
      userStorage.setItem(USER_STORAGE_KEYS.TRADING_PREFERENCES, JSON.stringify(tradingPreferences));
    }
  }, [tradingPreferences, isAuthenticated, userStorage]);

  useEffect(() => {
    if (auth.user && mainWallet) {
      // Register wallet for direct trading
      registerWalletForTrading({
        walletAddress: mainWallet.address,
        stakeAddress: mainWallet.stakeAddress,
        walletType: 'direct',
        balance: mainWallet.balance * 1_000_000, // Convert to lovelace
        handle: mainWallet.handle
      });

      // Fetch real market data
      const fetchMarketData = async () => {
        try {
          const response = await fetch('/api/market-data');
          const data = await response.json();
          if (data.success && data.data) {
            setMarketData(prev => ({
              ...prev,
              price: data.data.price || prev.price,
              change24h: data.data.change24h || prev.change24h,
              change24hPercent: data.data.change24hPercentage || prev.change24hPercent,
              volume24h: data.data.volume24h || prev.volume24h
            }));
          }
        } catch (error) {
          console.error('Failed to fetch market data:', error);
          // Keep existing default values on error
        }
      };

      fetchMarketData();
      const interval = setInterval(fetchMarketData, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [auth.user, mainWallet]);

  // All wallet data now comes from global wallet context - no need for local loading

  const registerWalletForTrading = async (walletInfo: WalletRegistrationInfo) => {
    try {
      const response = await fetch('http://localhost:4113/api/wallet/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(walletInfo)
      });

      if (response.ok) {
        console.log('✅ Wallet registered for trading');
      }
    } catch (error) {
      console.error('❌ Failed to register wallet for trading:', error);
    }
  };

  // Show loading state while auth or wallet is loading
  if (!auth.user || walletLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Loading Trading Interface</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Preparing your trading environment...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show wallet connection requirement for direct trading
  if (!mainWallet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Wallet Connection Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Direct trading requires a connected Cardano wallet. Connect your wallet or try managed trading instead.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.href = '/'}>
                Connect Wallet
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/managed-dashboard'}>
                Managed Trading
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Combined Header & Market Info */}
      <div className="border-b bg-gradient-to-r from-card via-card/95 to-card flex-shrink-0 shadow-sm">
        <div className="container mx-auto px-4">
          {/* Top Header Row */}
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="flex items-center gap-4">
              {/* MISTER Logo on the left */}
              <MisterLogo size="lg" />
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  Trading
                </h1>
                <Badge variant="outline" className="flex items-center gap-1 bg-primary/5 border-primary/20 text-primary">
                  <Activity className="h-3 w-3" />
                  Live Trading
                </Badge>
              </div>
            </div>

            {/* MISTER Trading Mode Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className={`font-medium ${!isMisterMode ? 'text-primary' : 'text-muted-foreground'}`}>
                  Manual
                </span>
              </div>

              <Switch
                checked={isMisterMode}
                onCheckedChange={(checked) => {
                  setIsMisterMode(checked);
                  if (checked) {
                    setShowStrategySelection(true);
                  }
                }}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600"
              />

              <div className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <span className={`font-medium ${isMisterMode ? 'text-primary' : 'text-muted-foreground'}`}>
                  MISTER
                </span>
              </div>

              {isMisterMode && (
                <>
                  <Badge variant="secondary" className="flex items-center gap-1 bg-gradient-to-r from-blue-500/10 to-purple-600/10 border-blue-500/20 text-blue-700">
                    <Brain className="h-3 w-3" />
                    AI Trading
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStrategySelection(!showStrategySelection)}
                    className="text-xs"
                  >
                    {showStrategySelection ? 'Back to Terminal' : 'Change Strategy'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Market Info Row */}
          <div className="py-3">
            <MarketInfoBar marketData={marketData} />
          </div>
        </div>
      </div>

      {/* Main Trading Interface */}
      <div className="container mx-auto px-4 py-4 flex-1 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-11rem)]">

          {/* Left Panel - Trading Controls */}
          <div className="col-span-3 space-y-4 overflow-y-auto">
            {isMisterMode ? (
              /* MISTER AI Trading Terminal */
              showStrategySelection ? (
                <StrategySelection
                  onStrategySelect={(strategyId) => {
                    setSelectedStrategy(strategyId);
                    setShowStrategySelection(false);
                  }}
                  selectedStrategy={selectedStrategy}
                  walletBalance={mainWallet.balance}
                />
              ) : (
                <AIThinkingTerminal
                  walletAddress={mainWallet.address}
                  selectedStrategy={selectedStrategy}
                  isActive={false} // Will be controlled by the terminal's own toggle
                  onToggleTrading={() => {
                    // TODO: Implement MISTER trading start/stop logic
                    console.log('Toggle MISTER trading');
                  }}
                />
              )
            ) : (
              /* Manual Trading Interface */
              <>
                <ManualTradingInterface
                  walletAddress={mainWallet.address}
                  walletType="connected"
                  balance={mainWallet.balance}
                  currentPrice={marketData.price}
                />

                {/* Positions Summary */}
                <PositionsSummary />
              </>
            )}
          </div>

          {/* Center Panel - Chart (Back to original width) */}
          <div className="col-span-6 overflow-hidden">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                <TradingChart />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - AI Chat */}
          <div className="col-span-3 overflow-hidden">
            {/* Full-Height AI Trading Chat */}
            <div className="h-full">
              <AITradingChat />
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="border-t bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>© 2025 MISTER Trading</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Connected</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
              <Badge variant="outline" className="text-xs">
                v1.0.0
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
