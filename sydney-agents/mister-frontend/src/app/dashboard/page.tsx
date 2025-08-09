"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Bot,
  Activity,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  X,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { useUserIdentity } from "@/hooks/useUserIdentity";
import { MisterLogo } from "@/components/ui/mister-logo";
import { dashboardAPI, positionsAPI, activityAPI, strikeAPI } from "@/lib/api";
import { tapToolsAPI } from "@/lib/api/taptools";
import { DashboardData, Position, AIActivity, AIStatus, MarketData, SignalStats } from "@/types/api";
import { useMarketData, usePortfolioUpdates, useAIActivity, useSystemStatus, usePositionUpdates } from "@/hooks/useWebSocket";
import { realTimeDataService } from "@/lib/realtime/dataService";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { PnLChart } from "@/components/charts/PnLChart";
import { WinLossChart } from "@/components/charts/WinLossChart";
import { EnhancedADAChart } from "@/components/charts/SingleADAChart";
import { DrawdownChart } from "@/components/charts/DrawdownChart";

// Real Data Components - Additional icons
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

export default function DashboardPage() {
  const auth = useAuth(); // Optional auth instead of required
  const { mainWallet, isLoading: walletLoading } = useWallet();
  const { userStorage } = useUserIdentity();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real data from backend services
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [aiActivity, setAIActivity] = useState<AIActivity[]>([]);
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [closingPositions, setClosingPositions] = useState<Set<string>>(new Set());
  const [signalHistory, setSignalHistory] = useState<any[]>([]);
  const [signalStats, setSignalStats] = useState<SignalStats | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [strikeHealth, setStrikeHealth] = useState<any>(null);
  const [portfolioPerformance, setPortfolioPerformance] = useState<any[]>([]);
  const [portfolioTimeframe, setPortfolioTimeframe] = useState<string>('30d');

  // Note: Removed automatic redirect - let the render method handle authentication/wallet checks

  // Real-time data hooks using connected wallet
  const { marketData: liveMarketData, lastUpdate: marketLastUpdate, isConnected: marketConnected } = useMarketData('ADA/USD');
  const { portfolioValue: livePortfolioValue, dailyChange: liveDailyChange, dailyChangePercent: liveDailyChangePercent, lastUpdate: portfolioLastUpdate } = usePortfolioUpdates(mainWallet?.stakeAddress || 'no_wallet');
  const { activities: liveAIActivities } = useAIActivity(mainWallet?.stakeAddress || 'no_wallet');
  const { positions: livePositions, lastUpdate: positionsLastUpdate } = usePositionUpdates(mainWallet?.stakeAddress || 'no_wallet');

  /**
   * Load all dashboard data from backend services
   */
  const loadDashboardData = useCallback(async () => {
    if (!mainWallet) {
      console.warn('No wallet available for dashboard data loading');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('📊 Loading dashboard data for wallet:', mainWallet.displayName);

      // Load data in parallel for better performance using the connected wallet
      const walletAddress = mainWallet.stakeAddress;
      console.log('🔗 Using wallet address for API calls:', walletAddress);

      const [dashboardResponse, positionsResponse, activityResponse, statusResponse, signalsResponse, marketResponse, healthResponse, tapToolsResponse] = await Promise.all([
        dashboardAPI.getDashboardData(walletAddress), // Use wallet address instead of user ID
        positionsAPI.getPositions(walletAddress), // Use wallet address instead of user ID
        activityAPI.getAIActivity(walletAddress, 20), // Use wallet address instead of user ID
        dashboardAPI.getAIStatus(),
        activityAPI.getSignalHistory(20),
        strikeAPI.getMarketData('ADA/USD'),
        strikeAPI.getHealthStatus(),
        tapToolsAPI.getWalletValueTrend(walletAddress, '30d', 'USD') // Get real portfolio data (30 days default)
      ]);

      // Handle TapTools real portfolio data first
      let realPortfolioData = null;
      if (tapToolsResponse.success && tapToolsResponse.data) {
        console.log('✅ Using real TapTools portfolio data with', Array.isArray(tapToolsResponse.data) ? tapToolsResponse.data.length : 'unknown', 'data points');
        console.log('📊 Raw TapTools data sample:', Array.isArray(tapToolsResponse.data) ? tapToolsResponse.data.slice(0, 3) : tapToolsResponse.data);

        // TapTools returns an array directly, not an object with values
        const chartData = Array.isArray(tapToolsResponse.data) ? tapToolsResponse.data.map((point: any, index: number) => ({
          date: new Date(point.time * 1000).toISOString().split('T')[0],
          portfolioValue: point.usd_value || point.value || 0,
          adaValue: point.ada_value || point.ada || mainWallet.balance,
          dailyReturn: index > 0 && Array.isArray(tapToolsResponse.data) ?
            ((point.usd_value - tapToolsResponse.data[index - 1].usd_value) / tapToolsResponse.data[index - 1].usd_value) * 100 : 0,
          cumulativeReturn: Array.isArray(tapToolsResponse.data) && tapToolsResponse.data.length > 0 ?
            ((point.usd_value - tapToolsResponse.data[0].usd_value) / tapToolsResponse.data[0].usd_value) * 100 : 0
        })) : [];

        console.log('📊 Converted chart data:', chartData.length, 'points');
        console.log('📊 Chart data sample:', chartData.slice(0, 3));
        setPortfolioPerformance(chartData);

        // Update dashboard data with real portfolio values
        const latestPoint = Array.isArray(tapToolsResponse.data) ? tapToolsResponse.data[tapToolsResponse.data.length - 1] : null;
        const firstPoint = Array.isArray(tapToolsResponse.data) ? tapToolsResponse.data[0] : null;
        const updatedDashboardData = createFallbackDashboardData();
        updatedDashboardData.portfolio = {
          totalValue: latestPoint?.usd_value || latestPoint?.value || mainWallet.balance * 0.45,
          dailyChange: (latestPoint?.usd_value || 0) - (firstPoint?.usd_value || 0),
          dailyChangePercent: firstPoint?.usd_value ? (((latestPoint?.usd_value || 0) - firstPoint.usd_value) / firstPoint.usd_value) * 100 : 0,
          availableBalance: mainWallet.balance,
          totalPnL: (latestPoint?.usd_value || 0) - (firstPoint?.usd_value || 0),
          totalPnLPercent: firstPoint?.usd_value ? (((latestPoint?.usd_value || 0) - firstPoint.usd_value) / firstPoint.usd_value) * 100 : 0
        };
        setDashboardData(updatedDashboardData);
      } else {
        console.warn('❌ TapTools REAL data not available - will show empty chart until real data loads');
        // Use fallback data with real wallet balance but NO FAKE TREND DATA
        const fallbackData = createFallbackDashboardData();
        // At least show the real wallet balance even if TapTools fails
        fallbackData.portfolio.availableBalance = mainWallet.balance;
        fallbackData.portfolio.totalValue = mainWallet.balance * 0.45; // Approximate USD value
        setDashboardData(fallbackData);

        // NO FAKE DATA - leave portfolio performance empty until we get REAL TapTools data
        setPortfolioPerformance([]);
        console.log('📊 No real portfolio trend data available - chart will be empty until TapTools API works');
        console.log('📊 Your wallet balance:', mainWallet.balance, 'ADA');
        console.log('📊 We need REAL trend data from TapTools API for your wallet:', mainWallet.stakeAddress);
      }

      // Handle positions
      if (positionsResponse.success && positionsResponse.data) {
        setPositions(positionsResponse.data);
      } else {
        console.warn('Positions data not available, using fallback');
        setPositions(createFallbackPositions());
      }

      // Handle AI activity
      if (activityResponse.success && activityResponse.data) {
        setAIActivity(activityResponse.data);
      } else {
        console.warn('AI activity data not available, using fallback');
        setAIActivity(createFallbackActivity());
      }

      // Handle AI status
      if (statusResponse.success && statusResponse.data) {
        setAIStatus(statusResponse.data);
      } else {
        console.warn('AI status not available, using fallback');
        setAIStatus(createFallbackAIStatus());
      }

      // Handle signal history
      if (signalsResponse.success && signalsResponse.data) {
        setSignalHistory(signalsResponse.data.signals);
        setSignalStats(signalsResponse.data.statistics);
      } else {
        console.warn('Signal history not available, using fallback');
        setSignalHistory(createFallbackSignalHistory());
        setSignalStats(createFallbackSignalStats());
      }

      // Handle market data
      if (marketResponse.success && marketResponse.data) {
        setMarketData({
          ...marketResponse.data,
          timestamp: new Date().toISOString()
        } as any);
      } else {
        console.warn('Market data not available, using fallback');
        setMarketData({
          ...createFallbackMarketData(),
          timestamp: new Date().toISOString()
        });
      }

      // Handle Strike Finance health
      if (healthResponse.success && healthResponse.data) {
        setStrikeHealth(healthResponse.data);
      } else {
        console.warn('Strike Finance health not available, using fallback');
        setStrikeHealth(createFallbackStrikeHealth());
      }

      console.log('✅ Dashboard data loaded successfully');

    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');

      // Use fallback data for demo
      setDashboardData(createFallbackDashboardData());
      setPositions(createFallbackPositions());
      setAIActivity(createFallbackActivity());
      setAIStatus(createFallbackAIStatus());
      setSignalHistory(createFallbackSignalHistory());
      setSignalStats(createFallbackSignalStats());
    } finally {
      setIsLoading(false);
    }
  }, [mainWallet?.stakeAddress]); // Depend on wallet so it reloads when wallet changes

  /**
   * Load portfolio performance data for specific timeframe
   */
  const loadPortfolioPerformance = useCallback(async (timeframe: string) => {
    if (!mainWallet) {
      console.warn('No wallet available for portfolio performance loading');
      return;
    }

    try {
      console.log(`📊 Loading portfolio performance for ${timeframe}...`);
      setPortfolioTimeframe(timeframe);

      const tapToolsResponse = await tapToolsAPI.getWalletValueTrend(mainWallet.stakeAddress, timeframe, 'USD');

      if (tapToolsResponse.success && tapToolsResponse.data) {
        console.log(`✅ Loaded ${tapToolsResponse.data.length} data points for ${timeframe}`);

        // Convert TapTools data to chart format
        const chartData = tapToolsResponse.data.map((point: any, index: number) => ({
          date: new Date(point.time * 1000).toISOString().split('T')[0],
          portfolioValue: point.usd_value || point.value || 0,
          adaValue: point.ada_value || point.ada || mainWallet.balance,
          dailyReturn: index > 0 ?
            ((point.usd_value - tapToolsResponse.data[index - 1].usd_value) / tapToolsResponse.data[index - 1].usd_value) * 100 : 0,
          cumulativeReturn: tapToolsResponse.data.length > 0 ?
            ((point.usd_value - tapToolsResponse.data[0].usd_value) / tapToolsResponse.data[0].usd_value) * 100 : 0
        }));

        setPortfolioPerformance(chartData);
        console.log(`📊 Updated portfolio performance chart with ${chartData.length} points for ${timeframe}`);
      } else {
        console.warn(`❌ Failed to load portfolio data for ${timeframe}`);
        setPortfolioPerformance([]);
      }
    } catch (error) {
      console.error(`❌ Error loading portfolio performance for ${timeframe}:`, error);
      setPortfolioPerformance([]);
    }
  }, [mainWallet]);

  /**
   * Refresh dashboard data
   */
  const refreshDashboardData = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  /**
   * Force AI signal check
   */
  const forceSignalCheck = async () => {
    try {
      console.log('🔧 Forcing AI signal check...');
      const response = await dashboardAPI.forceSignalCheck();

      if (response.success) {
        console.log('✅ Signal check completed:', response.data);
        // Refresh activity data to show new signal
        await loadDashboardData();
      } else {
        console.error('❌ Signal check failed:', response.error);
      }
    } catch (error) {
      console.error('❌ Error forcing signal check:', error);
    }
  };

  /**
   * Close a position
   */
  const closePosition = async (positionId: string) => {
    if (!mainWallet?.address) {
      console.error('No wallet available for closing position');
      return;
    }

    try {
      setClosingPositions(prev => new Set(prev).add(positionId));
      console.log(`❌ Closing position ${positionId}...`);

      const response = await positionsAPI.closePosition(positionId, mainWallet.address, 'Manual close');

      if (response.success) {
        console.log('✅ Position closed successfully:', response.data);

        // Update the position in the local state
        setPositions(prev => prev.map(pos =>
          pos.id === positionId
            ? { ...pos, status: 'closed' as const, updatedAt: new Date() }
            : pos
        ));

        // Simulate real-time position update
        realTimeDataService.simulatePositionUpdate(positionId, {
          status: 'closed',
          pnl: response.data?.finalPnl || 0,
          pnlPercent: response.data?.finalPnlPercent || 0,
          currentPrice: response.data?.closePrice || 0
        });

        // Refresh dashboard data to get updated portfolio values
        await loadDashboardData();
      } else {
        console.error('❌ Failed to close position:', response.error);
        setError(response.error || 'Failed to close position');
      }
    } catch (error) {
      console.error('❌ Error closing position:', error);
      setError(error instanceof Error ? error.message : 'Failed to close position');
    } finally {
      setClosingPositions(prev => {
        const newSet = new Set(prev);
        newSet.delete(positionId);
        return newSet;
      });
    }
  };

  // Load dashboard data on component mount
  useEffect(() => {
    if (!walletLoading) {
      if (mainWallet) {
        console.log('🔄 Loading dashboard data for connected wallet:', mainWallet.displayName);
      } else {
        console.log('🔄 Loading dashboard data without wallet connection');
      }
      loadDashboardData();
    }
  }, [mainWallet, walletLoading, loadDashboardData]);

  /**
   * Create empty dashboard data when no real data is available
   */
  const createFallbackDashboardData = (): DashboardData => ({
    portfolio: {
      totalValue: mainWallet?.balance || 0,
      dailyChange: 0,
      dailyChangePercent: 0,
      availableBalance: mainWallet?.balance || 0,
      totalPnL: 0,
      totalPnLPercent: 0
    },
    positions: [],
    aiActivity: [],
    aiStatus: createFallbackAIStatus(),
    wallet: {
      userId: mainWallet?.address || 'demo_user',
      bech32Address: mainWallet?.stakeAddress || '',
      createdAt: new Date(),
      isActive: true,
      balance: mainWallet?.balance || 0
    }
  });

  const createFallbackPositions = (): Position[] => [];

  const createFallbackActivity = (): AIActivity[] => [];

  const createFallbackAIStatus = (): AIStatus => ({
    isRunning: false,
    strategy: 'TITAN2K',
    lastCheck: new Date().toISOString(),
    nextCheck: new Date().toISOString(),
    totalSignals: 0,
    successfulTrades: 0,
    failedTrades: 0
  });

  const createFallbackSignalHistory = () => [
    {
      id: '1',
      action: 'Open',
      side: 'Long',
      leverage: 2,
      positionSize: 5000,
      confidence: 87,
      reasoning: 'Strong bullish momentum detected with RSI oversold recovery',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      action: 'Hold',
      confidence: 65,
      reasoning: 'Market conditions neutral, waiting for clearer signal',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      action: 'Close',
      confidence: 92,
      reasoning: 'Take profit target reached, risk/reward no longer favorable',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    }
  ];

  const createFallbackSignalStats = () => ({
    totalSignals: 47,
    openSignals: 18,
    closeSignals: 15,
    holdSignals: 14,
    avgConfidence: 78
  });

  const createFallbackMarketData = () => ({
    pair: 'ADA/USD',
    price: 0,
    change24h: 0,
    changePercent24h: 0,
    volume24h: 0,
    high24h: 0,
    low24h: 0,
    marketCap: 0,
    circulatingSupply: 0,
    lastUpdated: new Date().toISOString(),
    strikeData: {
      totalLiquidity: 0,
      openInterest: 0,
      fundingRate: 0,
      nextFundingTime: new Date().toISOString(),
      maxLeverage: 0,
      minPositionSize: 0,
      tradingFees: { maker: 0, taker: 0 }
    },
    technicalIndicators: {
      rsi: 0,
      macd: { macd: 0, signal: 0, histogram: 0 },
      bollinger: { upper: 0, middle: 0, lower: 0 },
      sma20: 0,
      sma50: 0,
      volume: 0
    }
  });

  const createFallbackStrikeHealth = () => ({
    isHealthy: true,
    status: 'operational',
    responseTime: 120,
    timestamp: new Date().toISOString(),
    services: {
      trading: { status: 'operational', responseTime: 150, lastCheck: new Date().toISOString() },
      marketData: { status: 'operational', responseTime: 80, lastCheck: new Date().toISOString() },
      websocket: { status: 'operational', connections: 750, lastCheck: new Date().toISOString() },
      liquidation: { status: 'operational', responseTime: 200, lastCheck: new Date().toISOString() }
    },
    apiLimits: { requestsPerMinute: 1000, currentUsage: 125, resetTime: new Date(Date.now() + 60 * 1000).toISOString() },
    network: { cardanoNetwork: 'mainnet', blockHeight: 10001234, networkLatency: 45, lastBlockTime: new Date(Date.now() - 20 * 1000).toISOString() },
    platformStats: { totalValueLocked: 750000000, activePositions: 8500, dailyVolume: 45000000, totalUsers: 125000 }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  // Only show loading state while wallet is actually loading (not API calls)
  if (walletLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Loading Dashboard</h2>
            <p className="text-muted-foreground">Connecting to your wallet...</p>
          </div>
        </div>
      </div>
    );
  }

  // Demo mode: show UI with mock data if no auth or wallet (like trading page)
  if (!auth.user || !mainWallet) {
    console.log('🔧 Demo mode: showing dashboard with mock data');
  }

  // Use mock wallet data if no wallet connected (for demo)
  const mockWallet = {
    address: 'addr1qy...demo',
    balance: 100,
    displayName: 'Demo Wallet'
  };

  const walletData = mainWallet || mockWallet;

  return (
    <div className="min-h-screen bg-background pt-8">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <MisterLogo size="lg" />
              <Badge variant={aiStatus?.isRunning ? "default" : "destructive"} className="ml-2">
                <Bot className="w-3 h-3 mr-1" />
                AI {aiStatus?.isRunning ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" disabled className="px-2">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Comprehensive insights into your trading performance and market signals
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Real-time connection status */}
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      marketConnected || portfolioLastUpdate ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`} />
                    <span className={`text-xs ${
                      marketConnected || portfolioLastUpdate ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {marketConnected || portfolioLastUpdate ? 'Live Data' : 'Static Data'}
                    </span>
                  </div>
                  {(marketLastUpdate || portfolioLastUpdate) && (
                    <div className="text-xs text-muted-foreground">
                      Last update: {formatTime((marketLastUpdate || portfolioLastUpdate)!.toISOString())}
                    </div>
                  )}
                </div>



                <Button
                  className="gap-2"
                  onClick={refreshDashboardData}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Real Data Metrics - Compact cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Portfolio Value - Real from wallet */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-600">
                    {livePortfolioValue && liveDailyChangePercent ? `${liveDailyChangePercent >= 0 ? '+' : ''}${liveDailyChangePercent.toFixed(2)}%` : '--'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">Portfolio Value</h3>
                  <p className="text-lg font-bold text-foreground">
                    ${livePortfolioValue ? livePortfolioValue.toFixed(2) : (walletData?.balance ? (walletData.balance * (marketData?.price || 0.75)).toFixed(2) : '--')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mainWallet?.balance?.toFixed(2) || '--'} ADA
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Daily P&L - Real from positions */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-medium text-red-600">
                    {liveDailyChangePercent ? `${liveDailyChangePercent.toFixed(2)}%` : '--'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">Daily P&L</h3>
                  <p className="text-lg font-bold text-foreground">
                    ${liveDailyChange ? liveDailyChange.toFixed(2) : '--'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    24h performance
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Active Positions - Real from Strike Finance */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-600">0%</span>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">Active Positions</h3>
                  <p className="text-lg font-bold text-foreground">
                    {livePositions?.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Open positions
                  </p>
                </div>
              </CardContent>
            </Card>


          </motion.div>

          {/* TapTools Account Balance Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  Wallet Overview
                  <span className="text-sm text-muted-foreground">
                    ({mainWallet?.address?.substring(0, 12)}...)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground">
                      {mainWallet?.balance?.toFixed(2) || '--'} ADA
                    </div>
                    <div className="text-lg text-muted-foreground">
                      ${mainWallet?.balance && marketData?.price ?
                        (mainWallet.balance * marketData.price).toFixed(2) :
                        '--'
                      } USD
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">ADA Price</div>
                      <div className="text-lg font-bold">
                        ${marketData?.price?.toFixed(4) || '--'}
                      </div>
                      <div className={`text-xs ${
                        (marketData?.changePercent24h || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {marketData?.changePercent24h !== undefined ?
                          `${marketData.changePercent24h >= 0 ? '+' : ''}${marketData.changePercent24h.toFixed(2)}%` :
                          'Loading...'
                        }
                      </div>
                    </div>

                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">Available</div>
                      <div className="text-lg font-bold text-green-600">
                        {mainWallet?.balance ? (mainWallet.balance - (livePositions?.reduce((sum, pos) => sum + (pos.collateralAmount || 0), 0) || 0)).toFixed(2) : '--'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Free ADA
                      </div>
                    </div>

                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">In Use</div>
                      <div className="text-lg font-bold text-orange-600">
                        {livePositions?.reduce((sum, pos) => sum + (pos.collateralAmount || 0), 0)?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Trading ADA
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ADA Price Chart - Moved to top for better visibility */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <EnhancedADAChart />
          </motion.div>

          {/* Real Analytics - Only show actual trading data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Placeholder for future real analytics */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">Advanced Analytics Coming Soon</h3>
                  <p className="text-sm">
                    Detailed performance analytics will be available when we have sufficient trading data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Future Features - Only show when real data is available */}
          {false && ( // TODO: Enable when real CNT signals API is ready
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    CNT Bot Signals
                    <Badge variant="outline">Coming Soon</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Live trading signals from the CNT bot will appear here when the Discord integration is complete.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-purple-600" />
                    Managed Wallets
                    <Badge variant="outline">Coming Soon</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Multiple wallet management will be available when the wallet creation agent is integrated.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Real Analytics - Only show actual trading data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Tabs defaultValue="positions" className="space-y-4">
              <TabsList className="grid w-full grid-cols-1 h-9">
                <TabsTrigger value="positions" className="text-sm py-1">Trading Positions</TabsTrigger>
              </TabsList>

              <TabsContent value="positions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Strike Finance Positions
                      <span className="text-sm text-muted-foreground">
                        ({livePositions?.length || 0} active)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {error && (
                      <div className="mb-4 p-4 border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 rounded-lg">
                        <div className="flex gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                              Data Loading Error
                            </h3>
                            <p className="text-sm text-red-700 dark:text-red-300">
                              {error}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                              Showing demo data. Try refreshing to reconnect to backend services.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Merge live positions with static positions */}
                      {(() => {
                        // Merge live positions with static positions, prioritizing live data
                        const mergedPositions = [...positions];
                        livePositions.forEach(livePos => {
                          const index = mergedPositions.findIndex(p => p.id === livePos.id);
                          if (index >= 0) {
                            mergedPositions[index] = { ...mergedPositions[index], ...livePos };
                          } else {
                            mergedPositions.push(livePos);
                          }
                        });
                        return mergedPositions;
                      })().length > 0 ? (
                        (() => {
                          const mergedPositions = [...positions];
                          livePositions.forEach(livePos => {
                            const index = mergedPositions.findIndex(p => p.id === livePos.id);
                            if (index >= 0) {
                              mergedPositions[index] = { ...mergedPositions[index], ...livePos };
                            } else {
                              mergedPositions.push(livePos);
                            }
                          });
                          return mergedPositions;
                        })().map((position) => (
                          <div key={position.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="font-semibold">{position.pair}</div>
                                <Badge variant={position.type === 'Long' ? 'default' : 'secondary'} className="text-xs">
                                  {position.type}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <div>Size: {position.size?.toLocaleString() || 0} ADA</div>
                                <div>Entry: ${typeof position.entryPrice === 'number' ? position.entryPrice.toFixed(4) : '--'}</div>
                                <div>Leverage: {position.leverage || 1}x</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className={`font-semibold ${(position.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {(position.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(position.pnl || 0)}
                                </div>
                                <div className={`text-sm ${(position.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {(position.pnl || 0) >= 0 ? '+' : ''}{typeof position.pnlPercent === 'number' ? position.pnlPercent.toFixed(2) : '0.00'}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Current: ${typeof position.currentPrice === 'number' ? position.currentPrice.toFixed(4) : '--'}
                                </div>
                                {/* Show live indicator if this position has real-time updates */}
                                {livePositions.some(lp => lp.id === position.id) && positionsLastUpdate && (
                                  <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                                    <span>Live PnL</span>
                                  </div>
                                )}
                              </div>
                              {position.status === 'open' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => closePosition(position.id)}
                                  disabled={closingPositions.has(position.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  {closingPositions.has(position.id) ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                  {closingPositions.has(position.id) ? 'Closing...' : 'Close'}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Open Positions</h3>
                          <p className="text-muted-foreground max-w-md mx-auto">
                            MISTER AI will automatically open positions when market conditions are favorable.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity tab removed - focusing on positions only */}

              {/* Removed signals tab - will be added back when real CNT signals are available */}

              {/* Removed analytics tab - will be added back when real performance data is available */}
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
