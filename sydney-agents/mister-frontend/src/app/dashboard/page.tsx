"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Shield,
  Globe,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Layers,
  Coins,
  LineChart,
  PieChart,
  Target,
  Trophy,
  Flame,
  Star,
  Lock,
  Unlock,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/contexts/WalletContext";
import { cn } from "@/lib/utils";
import { hyperliquidClient, type HyperliquidVaultInfo, type HyperliquidPosition } from "@/services/hyperliquid/hyperliquid-client";

// Market data state
interface MarketData {
  adaPrice: number;
  ada24hChange: number;
  lastUpdate: Date;
}

// Subtle dark mode gradient backgrounds
const gradientClasses = {
  purple: "bg-gradient-to-br from-purple-900/20 via-purple-800/15 to-pink-900/10",
  blue: "bg-gradient-to-br from-blue-900/20 via-blue-800/15 to-cyan-900/10",
  green: "bg-gradient-to-br from-green-900/20 via-green-800/15 to-emerald-900/10",
  gold: "bg-gradient-to-br from-amber-900/20 via-amber-800/15 to-orange-900/10",
  dark: "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700",
};

// Animated number component with improved formatting
const AnimatedNumber = ({ value, prefix = "", suffix = "", decimals = 2, format }: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  decimals?: number;
  format?: (v: number) => string;
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const stepValue = (value - displayValue) / steps;
    let current = displayValue;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current += stepValue;
      
      if (step >= steps) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [value]);

  const formatValue = (v: number) => {
    if (format) return format(v);
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toFixed(decimals);
  };

  return (
    <span className="tabular-nums font-mono">
      {prefix}{formatValue(displayValue)}{suffix}
    </span>
  );
};

// Luxury Card Component
const LuxuryCard = ({ 
  children, 
  gradient, 
  className,
  glow = false 
}: { 
  children: React.ReactNode; 
  gradient?: keyof typeof gradientClasses;
  className?: string;
  glow?: boolean;
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        glow && "shadow-2xl shadow-purple-500/20",
        className
      )}
    >
      {gradient && (
        <div className={cn(
          "absolute inset-0",
          gradientClasses[gradient],
          "opacity-100"
        )} />
      )}
      <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl">
        {children}
      </div>
    </motion.div>
  );
};

export default function DashboardPage() {
  const { mainWallet, isLoading: walletLoading, connectWallet } = useWallet();
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Hyperliquid shared vault data
  const [vaultInfo, setVaultInfo] = useState<HyperliquidVaultInfo | null>(null);
  const [positions, setPositions] = useState<HyperliquidPosition[]>([]);
  const [marketData, setMarketData] = useState<MarketData>({
    adaPrice: 0.85,
    ada24hChange: 2.34,
    lastUpdate: new Date()
  });
  
  // Fetch real market data
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch('/api/kraken/ohlc?interval=1h');
        const data = await response.json();
        if (data.success && data.data) {
          setMarketData({
            adaPrice: data.data.latestPrice || 0.85,
            ada24hChange: data.data.priceChangePercent || 0,
            lastUpdate: new Date()
          });
        }
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    };
    
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);
  
  // Fetch Hyperliquid vault data
  useEffect(() => {
    const fetchVaultData = async () => {
      try {
        const [vaultData, vaultPositions] = await Promise.all([
          hyperliquidClient.getSharedVaultInfo(),
          hyperliquidClient.getVaultPositions()
        ]);
        setVaultInfo(vaultData);
        setPositions(vaultPositions);
      } catch (error) {
        console.error('Failed to fetch Hyperliquid data:', error);
      }
    };
    
    fetchVaultData();
  }, []);

  // Calculate real portfolio metrics
  const userADAValue = (mainWallet?.balance || 0) * marketData.adaPrice;
  const totalPnL = vaultInfo?.totalPnL24h || 0;
  const totalVolume = vaultInfo?.totalVolume24h || 0;
  const winRate = vaultInfo?.winRate || 0;

  const refreshData = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  if (walletLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-12 h-12 text-purple-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-gray-800/50 backdrop-blur-xl bg-gray-900/80 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-8 h-8 text-purple-500" />
                </motion.div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                    MISTER Trading Hub
                  </h1>
                  <p className="text-sm text-gray-500">AI-Powered Trading Platform</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="bg-gray-800/50 hover:bg-gray-800/70 backdrop-blur-xl border border-gray-700/50 text-gray-300"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
                  Refresh
                </Button>
                
                {mainWallet ? (
                  <div className="flex flex-col items-end gap-1">
                    {mainWallet.handle && (
                      <div className="text-sm font-semibold text-purple-400">
                        ${mainWallet.handle}
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/50 rounded-xl border border-gray-700/50">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-sm text-gray-300">{mainWallet.address.slice(0, 6)}...{mainWallet.address.slice(-4)}</span>
                      <span className="text-xs text-gray-500">|</span>
                      <span className="text-sm text-emerald-400">{mainWallet.balance.toFixed(2)} ADA</span>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => connectWallet('vespr')}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
                  >
                    Connect Wallet
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Enhanced Stats Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-300">Portfolio Performance</h2>
              <Tabs value={selectedTimeframe} onValueChange={setSelectedTimeframe} className="bg-transparent">
                <TabsList className="bg-white/5 border border-white/10">
                  <TabsTrigger value="24h" className="data-[state=active]:bg-white/10">24H</TabsTrigger>
                  <TabsTrigger value="7d" className="data-[state=active]:bg-white/10">7D</TabsTrigger>
                  <TabsTrigger value="30d" className="data-[state=active]:bg-white/10">30D</TabsTrigger>
                  <TabsTrigger value="all" className="data-[state=active]:bg-white/10">ALL</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Performance Overview Cards with enhanced styling */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <LuxuryCard gradient="purple" glow>
              <CardContent className="p-6 relative overflow-hidden">
                {/* Animated background particles */}
                <div className="absolute inset-0">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-purple-400 rounded-full opacity-50"
                      animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                      }}
                      transition={{
                        duration: 10 + i * 2,
                        repeat: Infinity,
                        delay: i * 0.5,
                      }}
                      style={{ left: `${20 + i * 30}%`, top: "50%" }}
                    />
                  ))}
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 bg-gray-800/50 rounded-xl">
                      <DollarSign className="w-6 h-6 text-gray-400" />
                    </div>
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-800/30">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        +12.4%
                      </Badge>
                    </motion.div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Your ADA Value</p>
                    <p className="text-3xl font-bold text-gray-100">
                      <AnimatedNumber value={userADAValue} prefix="$" decimals={2} />
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {mainWallet?.balance || 0} ADA @ ${marketData.adaPrice.toFixed(4)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </LuxuryCard>

            <LuxuryCard gradient="green">
              <CardContent className="p-6 relative overflow-hidden">
                {/* Subtle animated pulse */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 to-emerald-800/5"
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 bg-gray-800/50 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-emerald-400" />
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-800/30">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
                        LIVE
                      </Badge>
                    </motion.div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Vault 24H P&L</p>
                    <p className="text-3xl font-bold text-emerald-400">
                      <AnimatedNumber value={totalPnL} prefix={totalPnL >= 0 ? "+$" : "-$"} decimals={2} />
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-emerald-500/50"
                          initial={{ width: 0 }}
                          animate={{ width: "65%" }}
                          transition={{ duration: 1.5, delay: 0.5 }}
                        />
                      </div>
                      <span className="text-xs text-emerald-400">65%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </LuxuryCard>

            <LuxuryCard gradient="blue">
              <CardContent className="p-6 relative overflow-hidden">
                {/* Animated chart lines */}
                <svg className="absolute inset-0 w-full h-full opacity-10">
                  <motion.path
                    d="M0,50 Q50,30 100,45 T200,40"
                    stroke="url(#blueGradient)"
                    strokeWidth="2"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <defs>
                    <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </svg>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 bg-gray-800/50 rounded-xl">
                      <Activity className="w-6 h-6 text-blue-400" />
                    </div>
                    <Badge className="bg-blue-900/30 text-blue-400 border-blue-800/30">
                      {positions.length} Active
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Win Rate</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-gray-100">
                        <AnimatedNumber value={winRate} suffix="%" decimals={1} />
                      </p>
                      <span className="text-xs text-blue-400">▲ 3.2%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {Math.floor(winRate * positions.length / 100)} winning trades
                    </p>
                  </div>
                </div>
              </CardContent>
            </LuxuryCard>

            <LuxuryCard gradient="gold">
              <CardContent className="p-6 relative overflow-hidden">
                {/* Animated trophy glow */}
                <motion.div
                  className="absolute top-1/2 left-1/2 w-32 h-32 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    background: "radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)",
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 bg-gray-800/50 rounded-xl">
                      <Trophy className="w-6 h-6 text-amber-500" />
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="cursor-pointer"
                    >
                      <Badge className="bg-amber-900/30 text-amber-500 border-amber-800/30">
                        <Star className="w-3 h-3 mr-1" />
                        Rank #42
                      </Badge>
                    </motion.div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Total Volume</p>
                    <p className="text-3xl font-bold text-gray-100">
                      <AnimatedNumber value={totalVolume} prefix="$" />
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Flame className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-gray-500">Top 5% of traders</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </LuxuryCard>
          </div>

          {/* Community Vault Overview */}
          <LuxuryCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                MISTER Community Vault
              </h2>
              <Badge className="bg-purple-900/30 text-purple-400 border-purple-800/30">
                Shared Pool
              </Badge>
            </div>
            
            <div className="mb-6 p-4 bg-purple-900/10 rounded-xl border border-purple-800/30">
              <p className="text-sm text-gray-400 mb-2">
                This is a shared community vault where all MISTER users pool their capital for collective trading.
                The AI manages positions for maximum returns while minimizing risk.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-500">Total Vault Value</p>
                  <p className="text-lg font-bold text-gray-100">
                    ${vaultInfo?.totalBalance.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Contributors</p>
                  <p className="text-lg font-bold text-gray-100">147</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Your Contribution */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-gray-800/30 rounded-xl border border-gray-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800/50 rounded-lg">
                      <Wallet className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Your Contribution</h3>
                      <p className="text-xs text-gray-400">To Community Vault</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-800/30 text-xs">
                    Active
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Your Deposit:</span>
                    <span className="font-semibold">Not Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pool Share:</span>
                    <span className="font-semibold">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Est. Returns:</span>
                    <span className="font-semibold">-</span>
                  </div>
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full mt-3 bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 border border-purple-800/30"
                  onClick={() => window.location.href = '/agent-vault-v2'}
                >
                  Contribute to Vault
                </Button>
              </motion.div>

              {/* Vault Performance */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-gray-800/30 rounded-xl border border-gray-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800/50 rounded-lg">
                      <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Hyperliquid Trading</h3>
                      <p className="text-xs text-gray-400">Perpetual Futures</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-emerald-400">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Live
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Rate:</span>
                    <span className="font-semibold text-emerald-400">{vaultInfo?.winRate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sharpe Ratio:</span>
                    <span className="font-semibold">{vaultInfo?.sharpeRatio || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Drawdown:</span>
                    <span className="font-semibold text-amber-400">{vaultInfo?.maxDrawdown || 0}%</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </LuxuryCard>


          {/* Performance Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chart */}
            <div className="lg:col-span-2">
              <LuxuryCard className="p-6 h-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-blue-400" />
                    Performance Chart
                  </h2>
                  <div className="flex gap-2">
                    {["1H", "4H", "1D", "1W"].map((period) => (
                      <Button
                        key={period}
                        size="sm"
                        variant="ghost"
                        className="text-xs hover:bg-white/10 data-[active=true]:bg-white/20"
                        data-active={period === "1D"}
                      >
                        {period}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Simulated Chart */}
                <div className="h-64 relative">
                  <svg className="w-full h-full">
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Animated line chart */}
                    <motion.path
                      d="M10,180 Q50,160 90,140 T170,120 Q210,110 250,90 T330,85 Q370,80 410,75 T490,70"
                      stroke="url(#purpleGradient)"
                      strokeWidth="3"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, ease: "easeOut" }}
                    />
                    <motion.path
                      d="M10,180 Q50,160 90,140 T170,120 Q210,110 250,90 T330,85 Q370,80 410,75 T490,70 L490,240 L10,240 Z"
                      fill="url(#chartGradient)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                    
                    <defs>
                      <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#A78BFA" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Chart metrics */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-2">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>24:00</span>
                  </div>
                </div>
              </LuxuryCard>
            </div>
            
            {/* Quick Stats */}
            <div className="space-y-4">
              <LuxuryCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Daily High</span>
                    <span className="text-sm font-semibold text-green-400">$45,892</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Daily Low</span>
                    <span className="text-sm font-semibold text-red-400">$44,120</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Volume</span>
                    <span className="text-sm font-semibold">$128.5K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Trades</span>
                    <span className="text-sm font-semibold">342</span>
                  </div>
                </div>
              </LuxuryCard>
              
              <LuxuryCard className="p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Risk Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Exposure</span>
                      <span className="text-sm font-semibold">65%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: "65%" }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Max DD</span>
                      <span className="text-sm font-semibold text-amber-400">-8.2%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                        initial={{ width: 0 }}
                        animate={{ width: "25%" }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                </div>
              </LuxuryCard>
            </div>
          </div>

          {/* AI Trading Signals with Enhanced Animations */}
          <LuxuryCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 180, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </motion.div>
                AI Trading Intelligence
              </h2>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30 backdrop-blur-sm">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-2 animate-pulse" />
                  MisterLabs220 Active
                </Badge>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Enhanced Signal Cards */}
              <motion.div
                whileHover={{ scale: 1.03, y: -4 }}
                className="relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-emerald-600/10 animate-pulse" />
                <div className="relative p-4 rounded-xl border border-green-500/30 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="p-2 bg-gradient-to-br from-green-500/30 to-green-600/20 rounded-lg"
                    >
                      <ArrowUpRight className="w-4 h-4 text-green-300" />
                    </motion.div>
                    <span className="font-semibold text-green-300">Long Signal</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Strong bullish momentum on ADA</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Confidence</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: "87%" }}
                            transition={{ duration: 1.5 }}
                          />
                        </div>
                        <span className="font-semibold text-green-400">87%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Entry</span>
                      <span className="font-mono text-green-400">$0.9156</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.03, y: -4 }}
                className="relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-600/10" />
                <div className="relative p-4 rounded-xl border border-blue-500/30 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="p-2 bg-gradient-to-br from-blue-500/30 to-blue-600/20 rounded-lg"
                    >
                      <LineChart className="w-4 h-4 text-blue-300" />
                    </motion.div>
                    <span className="font-semibold text-blue-300">Market Analysis</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">SMA220 filter confirmed uptrend</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Trend</span>
                      <Badge className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5">
                        Bullish
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Next Check</span>
                      <motion.span
                        className="font-mono text-blue-400"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        2:45
                      </motion.span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.03, y: -4 }}
                className="relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-orange-600/10"
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <div className="relative p-4 rounded-xl border border-amber-500/30 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="p-2 bg-gradient-to-br from-amber-500/30 to-amber-600/20 rounded-lg"
                    >
                      <Flame className="w-4 h-4 text-amber-300" />
                    </motion.div>
                    <span className="font-semibold text-amber-300">Hot Sectors</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">AI & Gaming tokens momentum</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Opportunities</span>
                      <span className="font-semibold text-amber-400">12 Active</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Avg Gain</span>
                      <span className="font-mono text-amber-400">+15.3%</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </LuxuryCard>
        </main>
      </div>
    </div>
  );
}