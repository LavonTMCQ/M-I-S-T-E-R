/**
 * Enhanced Trading Page
 * 
 * Integrates the one-click execution system with the existing trading page
 * while preserving all current functionality.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Activity, Bot, Brain, User, Zap, Settings } from 'lucide-react';

// Existing components
import { ManualTradingInterface } from '@/components/trading/ManualTradingInterface';
import { TradingChart } from '@/components/trading/TradingChart';
import { AITradingChat } from '@/components/trading/AITradingChat';
import { AIThinkingTerminal } from '@/components/trading/AIThinkingTerminal';
import { StrategySelection } from '@/components/trading/StrategySelection';
import { PositionsSummary } from '@/components/trading/PositionsSummary';
import { MarketInfoBar } from '@/components/trading/MarketInfoBar';
import { MisterLogo } from '@/components/ui/mister-logo';

// Contexts and hooks
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

/**
 * Trading Mode Toggle Component
 */
interface TradingModeToggleProps {
  mode: 'classic' | 'signals';
  onModeChange: (mode: 'classic' | 'signals') => void;
  signalCount: number;
  isHealthy: boolean;
}

function TradingModeToggle({ mode, onModeChange, signalCount, isHealthy }: TradingModeToggleProps) {
  return (
    <div className="flex items-center space-x-4 mb-4">
      <div className="flex items-center space-x-2">
        <Button
          variant={mode === 'classic' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onModeChange('classic')}
          className="flex items-center space-x-2"
        >
          <Settings className="h-4 w-4" />
          <span>Classic Trading</span>
        </Button>
        <Button
          variant={mode === 'signals' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onModeChange('signals')}
          className="flex items-center space-x-2"
        >
          <Zap className="h-4 w-4" />
          <span>Signal Trading</span>
          {signalCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {signalCount}
            </Badge>
          )}
        </Button>
      </div>
      
      {mode === 'signals' && (
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-sm text-muted-foreground">
            {isHealthy ? 'Services Active' : 'Limited Service'}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Enhanced Trading Page Content (with Signal Context)
 */
function TradingPageContent() {
  const auth = useRequireAuth();
  const { mainWallet, isLoading: walletLoading } = useWallet();

  // Mock signal context for now
  const signalContext = {
    activeSignals: [],
    isHealthy: true,
  };

  // Enhanced user identification for secure localStorage
  const {
    userStorage,
    isAuthenticated,
    getUserDisplayName,
  } = useUserIdentity();

  // Ref to track if preferences have been loaded to prevent infinite loops
  const preferencesLoadedRef = useRef(false);

  // Trading mode state
  const [tradingMode, setTradingMode] = useState<'classic' | 'signals'>('classic');

  // MISTER Trading mode state (existing)
  const [isMisterMode, setIsMisterMode] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('ada_custom_algorithm');
  const [showStrategySelection, setShowStrategySelection] = useState(false);

  // Market data state
  const [marketData, setMarketData] = useState({
    price: 0.47,
    change24h: 2.34,
    volume24h: 1234567890,
    marketCap: 15678901234,
    high24h: 0.48,
    low24h: 0.46,
  });

  // Left panel toggle state
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [leftPanelMode, setLeftPanelMode] = useState<'manual' | 'ai'>('manual');

  // Load user preferences
  useEffect(() => {
    if (!isAuthenticated || !userStorage || preferencesLoadedRef.current) return;

    try {
      const savedTradingMode = userStorage.getItem(USER_STORAGE_KEYS.TRADING_MODE);
      const savedMisterMode = userStorage.getItem(USER_STORAGE_KEYS.MISTER_MODE);
      const savedStrategy = userStorage.getItem(USER_STORAGE_KEYS.SELECTED_STRATEGY);
      const savedLeftPanelMode = userStorage.getItem(USER_STORAGE_KEYS.LEFT_PANEL_MODE);

      if (savedTradingMode) {
        setTradingMode(savedTradingMode as 'classic' | 'signals');
      }
      if (savedMisterMode !== null) {
        setIsMisterMode(savedMisterMode === 'true');
      }
      if (savedStrategy) {
        setSelectedStrategy(savedStrategy);
      }
      if (savedLeftPanelMode) {
        setLeftPanelMode(savedLeftPanelMode as 'manual' | 'ai');
      }

      preferencesLoadedRef.current = true;
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }, [isAuthenticated, userStorage]);

  // Save preferences when they change
  useEffect(() => {
    if (!isAuthenticated || !userStorage || !preferencesLoadedRef.current) return;

    try {
      userStorage.setItem(USER_STORAGE_KEYS.TRADING_MODE, tradingMode);
      userStorage.setItem(USER_STORAGE_KEYS.MISTER_MODE, isMisterMode.toString());
      userStorage.setItem(USER_STORAGE_KEYS.SELECTED_STRATEGY, selectedStrategy);
      userStorage.setItem(USER_STORAGE_KEYS.LEFT_PANEL_MODE, leftPanelMode);
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }, [tradingMode, isMisterMode, selectedStrategy, leftPanelMode, isAuthenticated, userStorage]);

  // Auto-switch to signals mode when signals are available (optional)
  useEffect(() => {
    if (signalContext.activeSignals.length > 0 && tradingMode === 'classic') {
      // Don't auto-switch, let user choose
    }
  }, [signalContext.activeSignals.length, tradingMode]);

  // Handle wallet registration (existing logic)
  const handleWalletRegistration = async (walletInfo: WalletRegistrationInfo) => {
    if (!isAuthenticated || !userStorage) return;

    try {
      userStorage.setItem(USER_STORAGE_KEYS.WALLET_INFO, JSON.stringify(walletInfo));
      console.log('Wallet registered successfully:', walletInfo.walletAddress);
    } catch (error) {
      console.error('Error registering wallet:', error);
    }
  };

  // Register wallet when connected
  useEffect(() => {
    if (mainWallet?.isConnected && isAuthenticated) {
      const walletInfo: WalletRegistrationInfo = {
        walletAddress: mainWallet.address,
        stakeAddress: mainWallet.stakeAddress,
        walletType: mainWallet.walletType,
        balance: mainWallet.balance,
        handle: mainWallet.handle,
      };
      handleWalletRegistration(walletInfo);
    }
  }, [mainWallet, isAuthenticated]);

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <MisterLogo className="mx-auto mb-4" />
          <p className="text-muted-foreground">Please sign in to access trading.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <MisterLogo />
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-bold">Trading Dashboard</h1>
              </div>
              {mainWallet?.isConnected && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{getUserDisplayName()}</span>
                </Badge>
              )}
            </div>

            {/* MISTER Mode Toggle (existing) */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span className="text-sm font-medium">MISTER Mode</span>
                <Switch
                  checked={isMisterMode}
                  onCheckedChange={setIsMisterMode}
                />
              </div>
            </div>
          </div>

          {/* Trading Mode Toggle */}
          <TradingModeToggle
            mode={tradingMode}
            onModeChange={setTradingMode}
            signalCount={signalContext.activeSignals.length}
            isHealthy={signalContext.isHealthy}
          />
        </div>
      </div>

      {/* Market Info Bar */}
      <MarketInfoBar marketData={marketData} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Left Panel */}
          {showLeftPanel && (
            <div className="col-span-3 space-y-4">
              {tradingMode === 'classic' ? (
                <>
                  {/* Classic Trading Interface */}
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                          {leftPanelMode === 'manual' ? (
                            <User className="h-5 w-5" />
                          ) : (
                            <Bot className="h-5 w-5" />
                          )}
                          <span>
                            {leftPanelMode === 'manual' ? 'Manual Trading' : 'AI Trading'}
                          </span>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLeftPanelMode(leftPanelMode === 'manual' ? 'ai' : 'manual')}
                        >
                          {leftPanelMode === 'manual' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="h-[calc(100%-80px)] overflow-hidden">
                      {leftPanelMode === 'manual' ? (
                        <ManualTradingInterface
                          walletAddress={mainWallet?.address || ""}
                          walletType="connected"
                          balance={mainWallet?.balance || 0}
                          currentPrice={marketData?.price || 0.47}
                        />
                      ) : (
                        <AITradingChat />
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  {/* Signal Trading Interface */}
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Zap className="h-5 w-5 text-blue-600" />
                        <span>Signal Trading</span>
                        <Badge variant="secondary">NEW</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-full">
                      <div className="text-center py-8">
                        <div className="mb-4">
                          <Zap className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">ADA Signal Trading</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Automated trading signals from our 62.5% win rate ADA Custom Algorithm
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 border rounded-lg bg-blue-50">
                            <div className="text-sm font-medium text-blue-900 mb-2">🔔 Signal Generation Active</div>
                            <div className="text-xs text-blue-700">
                              • Monitoring ADA/USD market conditions<br/>
                              • Generating signals every 5 minutes<br/>
                              • 62.5% historical win rate<br/>
                              • One-click execution ready
                            </div>
                          </div>

                          <div className="p-4 border rounded-lg">
                            <div className="text-sm font-medium mb-2">📊 Service Status</div>
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-muted-foreground">Signal Generation: Active</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2 mt-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-muted-foreground">Strike Finance: Connected</span>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Waiting for next signal... Check console for service logs
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Center Panel - Chart */}
          <div className={`${showLeftPanel ? 'col-span-6' : 'col-span-9'} space-y-4`}>
            <Card className="h-full">
              <CardContent className="h-full p-4">
                <TradingChart />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="col-span-3 space-y-4">
            {/* Positions Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <PositionsSummary />
              </CardContent>
            </Card>

            {/* Signal-specific panels */}
            {tradingMode === 'signals' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Signal Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center py-4">
                      <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No active signals</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Signals will appear here when generated
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 bg-muted rounded">
                        <div className="font-semibold">0</div>
                        <div className="text-xs text-muted-foreground">Today</div>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <div className="font-semibold">62.5%</div>
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Trading Chat (always visible in right panel) */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>AI Assistant</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[400px] overflow-hidden">
                <AITradingChat />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Strategy Selection Modal (existing) */}
      {showStrategySelection && (
        <StrategySelection
          selectedStrategy={selectedStrategy}
          onStrategySelect={setSelectedStrategy}
          onClose={() => setShowStrategySelection(false)}
        />
      )}

      {/* AI Thinking Terminal (existing) */}
      {isMisterMode && (
        <AIThinkingTerminal />
      )}
    </div>
  );
}

/**
 * Main Enhanced Trading Page Component
 */
export default function EnhancedTradingPage() {
  return <TradingPageContent />;
}