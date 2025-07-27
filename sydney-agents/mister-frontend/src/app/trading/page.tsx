'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Activity, Bot, Brain, User, Zap, Settings, Loader2 } from 'lucide-react';
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
import { useSignalExecution } from '@/hooks/useSignalExecution';
import SignalCard from '@/components/trading/SignalCard';

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

  // NEW: Signal trading mode toggle
  const [signalMode, setSignalMode] = useState(false);

  // MISTER Trading mode state
  const [isMisterMode, setIsMisterMode] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('ada_custom_algorithm');
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

  // Timestamp state to fix hydration
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update timestamp on client side only
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };

    updateTime(); // Set initial time
    const interval = setInterval(updateTime, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  // Load user-specific trading preferences
  useEffect(() => {
    if (isAuthenticated && userStorage && !preferencesLoadedRef.current) {
      const savedPreferences = userStorage.getItem(USER_STORAGE_KEYS.TRADING_PREFERENCES);
      const savedSignalMode = userStorage.getItem('SIGNAL_MODE');

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

      // Load signal mode preference
      if (savedSignalMode) {
        setSignalMode(savedSignalMode === 'true');
      }
    }
  }, [isAuthenticated, userStorage, getUserDisplayName]);

  // Save trading preferences when they change
  useEffect(() => {
    if (isAuthenticated && userStorage) {
      userStorage.setItem(USER_STORAGE_KEYS.TRADING_PREFERENCES, JSON.stringify(tradingPreferences));
      userStorage.setItem('SIGNAL_MODE', signalMode.toString());
    }
  }, [tradingPreferences, signalMode, isAuthenticated, userStorage]);

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

  const registerWalletForTrading = async (walletInfo: WalletRegistrationInfo) => {
    try {
      const response = await fetch('https://bridge-server-cjs-production.up.railway.app/api/wallet/register', {
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
    // For demo purposes, let's show the UI with mock data
    console.log('🔧 Demo mode: showing UI with mock data');
  }

  // Use mock wallet data if no wallet connected (for demo)
  const mockWallet = {
    address: 'addr1qy...demo',
    balance: 100,
  };

  const walletData = mainWallet || mockWallet;

  // Signal execution hook
  const {
    activeSignals,
    executionHistory,
    executionStats,
    isExecuting,
    isGenerating,
    generateTestSignal,
    executeSignal,
    cancelSignal,
    checkSufficientBalance,
    walletConnected
  } = useSignalExecution();

  return (
    <div className="min-h-screen bg-background flex flex-col pt-8">
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

            {/* Trading Mode Toggles */}
            <div className="flex items-center gap-6">
              {/* NEW: Signal Trading Toggle */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className={`font-medium ${!signalMode ? 'text-primary' : 'text-muted-foreground'}`}>
                    Classic
                  </span>
                </div>

                <Switch
                  checked={signalMode}
                  onCheckedChange={(checked) => {
                    console.log('🔄 Signal mode toggled:', checked);
                    setSignalMode(checked);
                  }}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-blue-600"
                />

                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className={`font-medium ${signalMode ? 'text-primary' : 'text-muted-foreground'}`}>
                    Signals
                  </span>
                </div>

                {signalMode && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-gradient-to-r from-green-500/10 to-blue-600/10 border-green-500/20 text-green-700">
                    <Zap className="h-3 w-3" />
                    Signal Mode
                  </Badge>
                )}
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
                    console.log('🔄 MISTER mode toggled:', checked);
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
          </div>

          {/* Market Info Row */}
          <div className="py-3">
            <MarketInfoBar marketData={marketData} />
          </div>
        </div>
      </div>

      {/* Main Trading Interface */}
      <div className="container mx-auto px-4 py-4 flex-1">
        <div className="grid grid-cols-12 gap-4" style={{ minHeight: 'calc(100vh - 16rem)' }}>

          {/* Left Panel - Trading Controls */}
          <div className="col-span-3 space-y-4" style={{ maxHeight: 'calc(100vh - 16rem)', overflowY: 'auto' }}>
            {signalMode ? (
              /* NEW: Signal Trading Interface */
              <Card className="h-full shadow-lg border-border/50 bg-gradient-to-br from-card to-card/95">
                <CardHeader className="pb-3 border-b border-border/30">
                  <CardTitle className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Zap className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-semibold">ADA Signal Trading</span>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
                      LIVE
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto">
                  {/* Performance Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-muted rounded">
                      <div className="font-semibold">{executionStats.active_signals}</div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-semibold text-green-600">{executionStats.success_rate.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Success</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-semibold">{executionStats.total_executions}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>

                  {/* Generate Signal Button */}
                  <Button
                    onClick={() => generateTestSignal(marketData.price)}
                    disabled={isGenerating}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Market...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Generate LIVE Signal
                      </>
                    )}
                  </Button>

                  <Separator />

                  {/* Active Signals */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Active Signals</h4>
                      {activeSignals.length > 0 && (
                        <Badge variant="secondary">{activeSignals.length}</Badge>
                      )}
                    </div>

                    {activeSignals.length === 0 ? (
                      <div className="text-center py-6">
                        <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No active signals</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Generate a test signal to see the execution interface
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeSignals.map((signal) => (
                          <SignalCard
                            key={signal.id}
                            signal={signal}
                            onExecute={executeSignal}
                            onCancel={cancelSignal}
                            isExecuting={isExecuting}
                            canExecute={walletConnected}
                            sufficientBalance={checkSufficientBalance(signal)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : isMisterMode ? (
              /* MISTER AI Trading Terminal */
              showStrategySelection ? (
                <StrategySelection
                  onStrategySelect={(strategyId) => {
                    setSelectedStrategy(strategyId);
                    setShowStrategySelection(false);
                  }}
                  selectedStrategy={selectedStrategy}
                  walletBalance={walletData.balance}
                />
              ) : (
                <AIThinkingTerminal
                  walletAddress={walletData.address}
                  selectedStrategy={selectedStrategy}
                  isActive={isMisterMode}
                  onToggleTrading={() => {
                    setIsMisterMode(!isMisterMode);
                    console.log('Toggle MISTER trading');
                  }}
                />
              )
            ) : (
              /* Manual Trading Interface */
              <>
                <ManualTradingInterface
                  walletAddress={walletData.address}
                  walletType="connected"
                  balance={walletData.balance}
                  currentPrice={marketData.price}
                />

                {/* Positions Summary */}
                <PositionsSummary />
              </>
            )}
          </div>

          {/* Center Panel - Chart */}
          <div className="col-span-6">
            <Card
              className="shadow-lg border-border/50 bg-gradient-to-br from-card to-card/95 overflow-hidden"
              style={{ height: 'calc(100vh - 16rem)' }}
            >
              <CardContent className="p-0 h-full relative">
                {/* Chart container with professional edges */}
                <div className="h-full relative">
                  <TradingChart />

                  {/* Professional corner accents */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-primary/20 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-primary/20 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-primary/20 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-primary/20 rounded-br-lg"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - AI Chat */}
          <div className="col-span-3" style={{ maxHeight: 'calc(100vh - 16rem)', overflowY: 'auto' }}>
            {/* Signal Activity Panel (when in signal mode) */}
            {signalMode && (
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Execution History</span>
                    {executionHistory.length > 0 && (
                      <Badge variant="secondary">{executionHistory.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {executionHistory.length === 0 ? (
                    <div className="text-center py-3">
                      <Activity className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No executions yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Execute a signal to see history
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {executionHistory.slice(0, 5).map((execution, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                          <div className="flex items-center space-x-2">
                            {execution.success ? (
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            ) : (
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            )}
                            <span className="font-medium">
                              {execution.signal.type.toUpperCase()} {execution.signal.risk.position_size.toFixed(0)} ADA
                            </span>
                          </div>
                          <span className="text-muted-foreground">
                            {new Date(execution.signal.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* AI Trading Chat */}
            <div style={{ height: signalMode ? 'calc(100vh - 22rem)' : 'calc(100vh - 16rem)' }}>
              <AITradingChat />
            </div>
          </div>
        </div>
      </div>

      {/* Professional Footer */}
      <div className="relative mt-8">
        {/* Gradient separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

        {/* Main footer */}
        <div className="bg-gradient-to-r from-card/95 via-card to-card/95 backdrop-blur-md border-t border-border/50 shadow-lg">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left section */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                  <span className="text-sm font-medium text-foreground">Live Trading</span>
                </div>

                <div className="h-4 w-px bg-border/50"></div>

                <span className="text-sm text-muted-foreground">© 2025 MISTER Trading</span>

                {signalMode && (
                  <>
                    <div className="h-4 w-px bg-border/50"></div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600">Signal Mode Active</span>
                    </div>
                  </>
                )}
              </div>

              {/* Right section */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Updated {currentTime}</span>
                </div>

                <div className="h-4 w-px bg-border/50"></div>

                <Badge
                  variant="outline"
                  className="text-xs font-medium bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                >
                  v1.0.0
                </Badge>
              </div>
            </div>
          </div>

          {/* Bottom gradient edge */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent"></div>
        </div>
      </div>
    </div>
  );
}
