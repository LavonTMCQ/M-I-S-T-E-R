'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Activity, Bot, Brain, User, Zap, Settings, Loader2, Vault, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { ManualTradingInterface } from '@/components/trading/ManualTradingInterface';
import { TradingChart } from '@/components/trading/TradingChart';
import { AITradingChat } from '@/components/trading/AITradingChat';
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

  // NEW: Agent Vault mode toggle
  const [vaultMode, setVaultMode] = useState(false);

  // Check URL parameters for auto-enabling modes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('vault') === 'true') {
        setVaultMode(true);
        setSignalMode(false);
      }
    }
  }, []);

  const [marketData, setMarketData] = useState({
    price: 0.80,
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

  // Fetch real market data (independent of authentication)
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        console.log('📊 Fetching real market data from Kraken API...');
        const response = await fetch('/api/market-data');
        const data = await response.json();
        if (data.success && data.data) {
          console.log('📊 Real market data received:', data.data.price);
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
    // Reduced polling frequency to prevent rate limiting
    const interval = setInterval(fetchMarketData, 120000); // Update every 2 minutes

    return () => clearInterval(interval);
  }, []); // No dependencies - always fetch market data

  // Register wallet when authenticated
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

  // Agent Vault State - USING SAME SYSTEM AS AGENT-VAULT-V2 PAGE
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultError, setVaultError] = useState('');
  const [vaultCredentials, setVaultCredentials] = useState<any>(null);
  const [vaultBalance, setVaultBalance] = useState(0);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [isVaultActive, setIsVaultActive] = useState(false); // Persistent vault state
  const [userVaultCount, setUserVaultCount] = useState(0); // Track user's vault count
  const [maxVaultsReached, setMaxVaultsReached] = useState(false); // Vault limit enforcement
  const [userVaults, setUserVaults] = useState<any[]>([]); // All user's vaults
  const [currentVaultId, setCurrentVaultId] = useState<string | null>(null);

  const CARDANO_SERVICE_URL = process.env.NEXT_PUBLIC_CARDANO_SERVICE_URL || 'http://localhost:3001';

  // Agent Vault Functions
  const checkVaultHealth = async () => {
    try {
      setVaultLoading(true);
      setVaultError('');
      
      const response = await fetch(`${CARDANO_SERVICE_URL}/health`);
      const data = await response.json();
      
      setNetworkInfo(data);
      console.log('🏦 Vault service health:', data);
    } catch (err: any) {
      setVaultError(`Cannot connect to Cardano service at ${CARDANO_SERVICE_URL}`);
    } finally {
      setVaultLoading(false);
    }
  };

  const generateVaultCredentials = async () => {
    // Check vault limit before generating
    if (maxVaultsReached) {
      setVaultError('Maximum 2 vaults reached. Delete an existing vault to create a new one.');
      return;
    }

    try {
      setVaultLoading(true);
      setVaultError('');
      
      const response = await fetch(`${CARDANO_SERVICE_URL}/generate-credentials`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setVaultCredentials(data);
        console.log('🏦 Generated vault credentials:', data.address?.substring(0, 20) + '...');
        
        // Create new vault object
        const newVault = {
          id: `vault_${Date.now()}`,
          name: `Vault ${userVaultCount + 1}`,
          credentials: data,
          isActive: false,
          createdAt: new Date().toISOString(),
          network: networkInfo?.network || 'mainnet',
          balance: 0
        };
        
        // Add to user vaults array
        const updatedVaults = [...userVaults, newVault];
        setUserVaults(updatedVaults);
        localStorage.setItem('mister-user-vaults', JSON.stringify(updatedVaults));
        localStorage.setItem('mister-current-vault-id', newVault.id);
        
        // Update state
        setCurrentVaultId(newVault.id);
        setUserVaultCount(updatedVaults.length);
        setMaxVaultsReached(updatedVaults.length >= 2);
        
        console.log(`✅ Vault ${newVault.name} created (${updatedVaults.length}/2)`);
      } else {
        setVaultError(data.error || 'Failed to generate vault credentials');
      }
    } catch (err: any) {
      setVaultError(`Service connection error: ${err.message}`);
    } finally {
      setVaultLoading(false);
    }
  };

  const checkVaultBalance = async (addressOverride?: string) => {
    const targetAddress = addressOverride || vaultCredentials?.address;
    if (!targetAddress) return;
    
    try {
      const response = await fetch(`${CARDANO_SERVICE_URL}/check-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: targetAddress
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setVaultBalance(data.balanceAda || 0);
        
        // Update vault balance in localStorage if this is the current vault
        if (currentVaultId) {
          const savedVaults = JSON.parse(localStorage.getItem('mister-user-vaults') || '[]');
          const updatedVaults = savedVaults.map((vault: any) => 
            vault.id === currentVaultId 
              ? { ...vault, balance: data.balanceAda || 0 }
              : vault
          );
          setUserVaults(updatedVaults);
          localStorage.setItem('mister-user-vaults', JSON.stringify(updatedVaults));
        }
      }
    } catch (err: any) {
      console.error('Balance check error:', err);
    }
  };

  // Switch active vault function
  const switchVault = async (vaultId: string) => {
    const vault = userVaults.find(v => v.id === vaultId);
    if (!vault || vault.id === currentVaultId) return;
    
    try {
      setCurrentVaultId(vaultId);
      setVaultCredentials(vault.credentials);
      setIsVaultActive(vault.isActive);
      localStorage.setItem('mister-current-vault-id', vaultId);
      
      // Check balance for switched vault
      if (vault.credentials?.address) {
        setTimeout(() => checkVaultBalance(vault.credentials.address), 500);
      }
      
      console.log('🔄 Switched to vault:', vault.name);
    } catch (error) {
      console.error('❌ Error switching vault:', error);
      setVaultError('Failed to switch vault');
    }
  };

  // Delete vault function
  const deleteVault = async (vaultId: string) => {
    if (!vaultId) return;
    
    try {
      setVaultLoading(true);
      setVaultError('');
      
      const vaultToDelete = userVaults.find(v => v.id === vaultId);
      if (!vaultToDelete) {
        setVaultError('Vault not found');
        return;
      }
      
      // Remove from array
      const updatedVaults = userVaults.filter(v => v.id !== vaultId);
      setUserVaults(updatedVaults);
      setUserVaultCount(updatedVaults.length);
      setMaxVaultsReached(updatedVaults.length >= 2);
      localStorage.setItem('mister-user-vaults', JSON.stringify(updatedVaults));
      
      // Handle current vault deletion
      if (vaultId === currentVaultId) {
        if (updatedVaults.length > 0) {
          // Switch to the first available vault
          const newCurrentVault = updatedVaults[0];
          setCurrentVaultId(newCurrentVault.id);
          setVaultCredentials(newCurrentVault.credentials);
          setIsVaultActive(newCurrentVault.isActive);
          localStorage.setItem('mister-current-vault-id', newCurrentVault.id);
          console.log('🔄 Switched to vault:', newCurrentVault.name);
        } else {
          // No vaults left
          setCurrentVaultId(null);
          setVaultCredentials(null);
          setIsVaultActive(false);
          setVaultBalance(0);
          localStorage.removeItem('mister-current-vault-id');
          console.log('🗑️ All vaults deleted');
        }
      }
      
      console.log(`🗑️ Vault ${vaultToDelete.name} deleted. Remaining: ${updatedVaults.length}/2`);
    } catch (error) {
      console.error('❌ Error deleting vault:', error);
      setVaultError('Failed to delete vault');
    } finally {
      setVaultLoading(false);
    }
  };

  const lockFundsToVault = async (amount: string) => {
    if (!vaultCredentials?.seed) {
      setVaultError('Generate vault credentials first');
      return;
    }

    try {
      setVaultLoading(true);
      setVaultError('');
      
      const response = await fetch(`${CARDANO_SERVICE_URL}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: vaultCredentials.seed,
          amount: (parseFloat(amount) * 1_000_000).toString() // Convert to lovelace
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Funds locked to vault:', data.txHash);
        // Refresh balance after successful lock
        setTimeout(() => checkVaultBalance(), 3000);
      } else {
        setVaultError(data.error || 'Failed to lock funds to vault');
      }
    } catch (err: any) {
      setVaultError(`Service connection error: ${err.message}`);
    } finally {
      setVaultLoading(false);
    }
  };

  // Initialize vault health check when vault mode is enabled - PERSISTENT VAULT SYSTEM
  useEffect(() => {
    if (vaultMode) {
      checkVaultHealth();
      
      // Load all user vaults (maximum 2) - SAME AS AGENT-VAULT-V2
      const savedVaults = JSON.parse(localStorage.getItem('mister-user-vaults') || '[]');
      setUserVaults(savedVaults);
      setUserVaultCount(savedVaults.length);
      setMaxVaultsReached(savedVaults.length >= 2);
      
      console.log(`👤 User has ${savedVaults.length}/2 vaults`);
      
      // Load current vault if it exists
      const savedCurrentVaultId = localStorage.getItem('mister-current-vault-id');
      if (savedCurrentVaultId && savedVaults.length > 0) {
        const currentVault = savedVaults.find((v: any) => v.id === savedCurrentVaultId);
        if (currentVault) {
          setCurrentVaultId(savedCurrentVaultId);
          setVaultCredentials(currentVault.credentials);
          setIsVaultActive(currentVault.isActive);
          console.log('🏦 Restored current vault:', currentVault.name);
          
          // Check current balance
          setTimeout(() => {
            if (currentVault.credentials?.address) {
              checkVaultBalance(currentVault.credentials.address);
            }
          }, 1000);
        }
      }
    }
  }, [vaultMode]);

  // Check balance when credentials are available
  useEffect(() => {
    if (vaultCredentials?.address) {
      const interval = setInterval(checkVaultBalance, 10000); // Check every 10 seconds
      checkVaultBalance(); // Initial check
      return () => clearInterval(interval);
    }
  }, [vaultCredentials]);

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


              {/* NEW: Agent Vault Mode Toggle */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className={`font-medium ${!vaultMode ? 'text-primary' : 'text-muted-foreground'}`}>
                    Trading
                  </span>
                </div>

                <Switch
                  checked={vaultMode}
                  onCheckedChange={(checked) => {
                    console.log('🔄 Vault mode toggled:', checked);
                    setVaultMode(checked);
                    // Disable other modes when vault is active
                    if (checked) {
                      setSignalMode(false);
                    }
                  }}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:to-red-600"
                />

                <div className="flex items-center gap-2 text-sm">
                  <Vault className="h-4 w-4 text-muted-foreground" />
                  <span className={`font-medium ${vaultMode ? 'text-primary' : 'text-muted-foreground'}`}>
                    Agent Vault
                  </span>
                </div>

                {vaultMode && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-gradient-to-r from-orange-500/10 to-red-600/10 border-orange-500/20 text-orange-700">
                    <Vault className="h-3 w-3" />
                    Vault Mode
                  </Badge>
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
          <div className="col-span-3 flex flex-col gap-4" style={{ height: 'calc(100vh - 16rem)' }}>
            {vaultMode ? (
              /* NEW: Agent Vault Interface */
              <Card className="h-full shadow-lg border-border/50 bg-gradient-to-br from-card to-card/95">
                <CardHeader className="pb-3 border-b border-border/30">
                  <CardTitle className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <Vault className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="font-semibold">Agent Vault</span>
                    <Badge variant="secondary" className={`${networkInfo?.network === 'mainnet' ? 'bg-red-500/10 text-red-700 border-red-500/20' : 'bg-green-500/10 text-green-700 border-green-500/20'}`}>
                      {networkInfo?.network?.toUpperCase() || 'LOADING'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto">
                  
                  {/* Network Warning */}
                  {networkInfo?.network === 'mainnet' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <h3 className="font-semibold text-red-900 mb-1 flex items-center gap-2">
                        🚨 MAINNET MODE
                      </h3>
                      <p className="text-xs text-red-800">Using REAL ADA! Max: {networkInfo.mainnet_safety_limit}</p>
                    </div>
                  )}

                  {/* Service Status */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-muted rounded">
                      <div className={`font-semibold ${networkInfo ? 'text-green-600' : 'text-gray-500'}`}>
                        {networkInfo ? 'ONLINE' : 'OFFLINE'}
                      </div>
                      <div className="text-xs text-muted-foreground">Service</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-semibold">{vaultBalance.toFixed(2)} ADA</div>
                      <div className="text-xs text-muted-foreground">Balance</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-semibold">{userVaultCount}/2</div>
                      <div className="text-xs text-muted-foreground">Vaults</div>
                    </div>
                  </div>

                  {/* Vault Selector - SAME AS AGENT-VAULT-V2 */}
                  {userVaults.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Your Vaults</h4>
                      <div className="space-y-1">
                        {userVaults.map((vault) => (
                          <div
                            key={vault.id}
                            className={`p-2 rounded border cursor-pointer transition-colors ${
                              vault.id === currentVaultId
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-border hover:bg-muted'
                            }`}
                            onClick={() => vault.id !== currentVaultId && switchVault(vault.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {vault.id === currentVaultId && (
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                )}
                                <span className="text-sm font-medium">{vault.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {vault.balance?.toFixed(2) || '0.00'} ADA
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generate Vault Wallet - WITH 2 VAULT LIMIT */}
                  {!vaultCredentials ? (
                    <div className="space-y-2">
                      <Button
                        onClick={generateVaultCredentials}
                        disabled={vaultLoading || !networkInfo || maxVaultsReached}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        size="lg"
                      >
                        {vaultLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Vault className="mr-2 h-4 w-4" />
                            {maxVaultsReached ? 'Maximum Vaults Reached' : `Generate Vault ${userVaultCount + 1}`}
                          </>
                        )}
                      </Button>
                      {maxVaultsReached && (
                        <p className="text-xs text-orange-600 text-center">
                          You have reached the maximum of 2 vaults. Switch between existing vaults above.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Wallet Info */}
                      <div className="p-3 bg-muted rounded">
                        <p className="text-xs font-mono break-all mb-1">
                          <strong>Address:</strong> {vaultCredentials.address?.substring(0, 30)}...
                        </p>
                        <p className={`text-xs ${networkInfo?.network === 'mainnet' ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                          {networkInfo?.network === 'mainnet' 
                            ? '🚨 MAINNET wallet - needs REAL ADA!' 
                            : '✅ Testnet wallet - needs testnet ADA'}
                        </p>
                      </div>

                      {/* Deposit Instructions */}
                      {vaultBalance === 0 && (
                        <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                          <h4 className="font-semibold text-yellow-900 mb-2">📋 Deposit Instructions:</h4>
                          <ol className="text-xs text-yellow-700 space-y-1">
                            <li>1. Copy wallet address above</li>
                            <li>2. Send ADA from your main wallet</li>
                            <li>3. Wait for confirmation (~2 minutes)</li>
                            <li>4. Use "Lock to Vault" below</li>
                          </ol>
                        </div>
                      )}

                      {/* Lock Funds Button */}
                      {vaultBalance > 0 && (
                        <Button
                          onClick={() => lockFundsToVault('1')}
                          disabled={vaultLoading}
                          className="w-full bg-green-600 hover:bg-green-700"
                          size="lg"
                        >
                          {vaultLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Locking...
                            </>
                          ) : (
                            <>
                              <ArrowUpCircle className="mr-2 h-4 w-4" />
                              Lock 1 ADA to Vault
                            </>
                          )}
                        </Button>
                      )}

                      {/* Vault Operations */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Vault Operations</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" disabled>
                            <ArrowDownCircle className="mr-1 h-3 w-3" />
                            Withdraw
                          </Button>
                          <Button variant="outline" size="sm" onClick={checkVaultBalance}>
                            Refresh
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {vaultError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs text-red-800">{vaultError}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : signalMode ? (
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
            ) : (
              /* Manual Trading Interface */
              <>
                <div className="flex-1 min-h-0">
                  <ManualTradingInterface
                    walletAddress={walletData.address}
                    walletType="connected"
                    balance={walletData.balance}
                    currentPrice={marketData.price}
                  />
                </div>

                {/* Positions Summary - Fixed Height */}
                <div className="flex-shrink-0">
                  <PositionsSummary />
                </div>
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

                {vaultMode && (
                  <>
                    <div className="h-4 w-px bg-border/50"></div>
                    <div className="flex items-center gap-2">
                      <Vault className="w-3 h-3 text-orange-500" />
                      <span className="text-sm font-medium text-orange-600">Agent Vault Active</span>
                      {networkInfo?.network === 'mainnet' && (
                        <span className="text-xs text-red-600 font-semibold">MAINNET</span>
                      )}
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
