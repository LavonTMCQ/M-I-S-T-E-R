'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Activity, Bot, Brain, User, Zap, Settings, Loader2, Vault, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';
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
// import VaultOperationsSeamless from '@/components/VaultOperationsSeamless';

interface WalletRegistrationInfo {
  walletAddress: string;
  stakeAddress: string;
  walletType: string;
  balance: number;
  handle?: string | null;
}

export default function AgentVaultV2Page() {
  const auth = useRequireAuth();
  const { mainWallet, isLoading: walletLoading, refreshWalletData } = useWallet();

  // Enhanced user identification for secure localStorage
  const {
    userStorage,
    isAuthenticated,
    getUserDisplayName,
  } = useUserIdentity();

  // Ref to track if preferences have been loaded to prevent infinite loops
  const preferencesLoadedRef = useRef(false);
  // Ref to track if market data fetch has been initialized
  const marketDataInitRef = useRef(false);

  // NEW: Signal trading mode toggle
  const [signalMode, setSignalMode] = useState(false);

  // NEW: Agent Vault mode toggle - ALWAYS ENABLED FOR THIS PAGE
  const [vaultMode, setVaultMode] = useState(true);


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

  // Removed duplicate refresh - handled by WalletContext initialization

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
    if (auth.user && mainWallet && !marketDataInitRef.current) {
      marketDataInitRef.current = true;
      
      // Register wallet for direct trading (with 5-second timeout)
      const initWallet = async () => {
        console.log('📊 Registering wallet for trading...');
        registerWalletForTrading({
          walletAddress: mainWallet.address,
          stakeAddress: mainWallet.stakeAddress,
          walletType: 'direct',
          balance: mainWallet.balance * 1_000_000, // Convert to lovelace
          handle: mainWallet.handle
        });
      };
      
      initWallet();

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
      // Reduced polling frequency to prevent Strike Finance rate limiting
      const interval = setInterval(fetchMarketData, 120000); // Update every 2 minutes instead of 30 seconds

      return () => {
        clearInterval(interval);
        marketDataInitRef.current = false; // Reset on cleanup
      };
    }
  }, [auth.user, mainWallet]);

  const registerWalletForTrading = async (walletInfo: WalletRegistrationInfo) => {
    try {
      // Add timeout to prevent 76-second cold start delays
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('https://bridge-server-cjs-production.up.railway.app/api/wallet/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(walletInfo),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('✅ Wallet registered for trading');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('⏱️ Wallet registration skipped (server cold start)');
      } else {
        console.error('❌ Failed to register wallet for trading:', error);
      }
    }
  };

  // Show loading state while auth or wallet is loading
  if (!auth.user || walletLoading) {
    // For demo purposes, let's show the UI with mock data
    // console.log('🔧 Demo mode: showing UI with mock data'); // Removed to prevent spam
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

  // Agent Vault State
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
  const [customFundingAmount, setCustomFundingAmount] = useState(5); // User-specified funding amount (minimum 5 ADA)
  
  // Railway service URL (production)
  const CARDANO_SERVICE_URL = process.env.NEXT_PUBLIC_CARDANO_SERVICE_URL || 'https://friendly-reprieve-production.up.railway.app';

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
      
      // GET THE ACTUAL SMART CONTRACT ADDRESS!
      const scriptResponse = await fetch(`${CARDANO_SERVICE_URL}/script-address`);
      const scriptData = await scriptResponse.json();
      
      if (scriptData.success && scriptData.scriptAddress) {
        // Use the REAL smart contract vault address
        const vaultData = {
          success: true,
          address: scriptData.scriptAddress, // This is the SMART CONTRACT address!
          isSmartContract: true,
          contractType: 'Aiken Vault V1',
          network: networkInfo?.network || 'mainnet'
        };
        
        setVaultCredentials(vaultData);
        console.log('🏦 Using SMART CONTRACT vault:', vaultData.address?.substring(0, 20) + '...');
        console.log('✅ This is the REAL Aiken smart contract deployed on mainnet!');
        
        // Create new vault object
        const newVault = {
          id: `vault_${Date.now()}`,
          name: `Smart Contract Vault ${userVaultCount + 1}`,
          credentials: vaultData,
          isActive: false,
          createdAt: new Date().toISOString(),
          network: networkInfo?.network || 'mainnet',
          balance: 0,
          isSmartContract: true
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

  // Check vault balance on blockchain using Blockfrost
  const checkVaultBalance = async (addressOverride?: string) => {
    const targetAddress = addressOverride || vaultCredentials?.address;
    if (!targetAddress) return;
    
    try {
      console.log('🔍 Checking vault balance for:', targetAddress);
      
      // Use Blockfrost API directly to check UTXOs at the smart contract address
      // FORCE MAINNET - we're on mainnet with real ADA
      const blockfrostUrl = 'https://cardano-mainnet.blockfrost.io/api/v0';
      const apiKey = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
      
      const response = await fetch(`${blockfrostUrl}/addresses/${targetAddress}/utxos`, {
        headers: {
          'project_id': apiKey
        }
      });
      
      if (response.ok) {
        const utxos = await response.json();
        console.log(`📍 Found ${utxos.length} UTXOs at vault address`);
        
        // Calculate total balance
        const totalLovelace = utxos.reduce((sum: number, utxo: any) => {
          const lovelaceAmount = utxo.amount?.find((a: any) => a.unit === 'lovelace');
          return sum + parseInt(lovelaceAmount?.quantity || '0');
        }, 0);
        
        const balanceInAda = totalLovelace / 1_000_000;
        setVaultBalance(balanceInAda);
        console.log(`💰 Vault balance: ${balanceInAda} ADA`);
        
        // Store the UTXOs for withdrawal later
        if (utxos.length > 0) {
          localStorage.setItem('vault-utxos', JSON.stringify(utxos));
          setIsVaultActive(true);
        } else {
          setIsVaultActive(false);
        }
        
        return balanceInAda;
      } else if (response.status === 404) {
        // No UTXOs found - vault is empty
        setVaultBalance(0);
        setIsVaultActive(false);
        console.log('📦 Vault is empty (no UTXOs)');
        return 0;
      } else {
        // Fallback to Cardano service if Blockfrost fails
        const response = await fetch(`${CARDANO_SERVICE_URL}/check-balance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: targetAddress
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          const newBalance = data.balanceAda || 0;
          setVaultBalance(newBalance);
          
          // If vault is funded and not yet active, activate it permanently
          if (newBalance > 0 && !isVaultActive) {
            setIsVaultActive(true);
            
            // Save permanent active state
            localStorage.setItem('mister-vault-state', JSON.stringify({
              isActive: true,
              activatedAt: new Date().toISOString(),
              initialBalance: newBalance
            }));
            
            console.log('🎉 Vault activated permanently! Balance:', newBalance, 'ADA');
          }
        }
      }
    } catch (err: any) {
      console.error('Balance check error:', err);
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

  // Delete vault function
  const deleteVault = async (vaultId: string) => {
    const vaultToDelete = userVaults.find(v => v.id === vaultId);
    if (!vaultToDelete) return;
    
    const confirmed = window.confirm(`Delete ${vaultToDelete.name}? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
      setVaultLoading(true);
      
      // Remove from vaults array
      const updatedVaults = userVaults.filter(v => v.id !== vaultId);
      setUserVaults(updatedVaults);
      localStorage.setItem('mister-user-vaults', JSON.stringify(updatedVaults));
      
      // Update vault count and limit
      setUserVaultCount(updatedVaults.length);
      setMaxVaultsReached(updatedVaults.length >= 2);
      
      // If we deleted the current vault, switch to another or clear
      if (currentVaultId === vaultId) {
        if (updatedVaults.length > 0) {
          // Switch to first available vault
          const nextVault = updatedVaults[0];
          setCurrentVaultId(nextVault.id);
          setVaultCredentials(nextVault.credentials);
          setIsVaultActive(nextVault.isActive);
          localStorage.setItem('mister-current-vault-id', nextVault.id);
          console.log('🔄 Switched to:', nextVault.name);
        } else {
          // No vaults left, clear everything
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

  // Initialize vault health check - ALWAYS RUN FOR THIS PAGE
  useEffect(() => {
    checkVaultHealth();
    
    // Load all user vaults (maximum 2)
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
  }, []);

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
                <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <Vault className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    Agent Vault V2
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Working Cardano Smart Contract System
                  </p>
                </div>
                <Badge variant="outline" className="flex items-center gap-1 bg-orange-500/5 border-orange-500/20 text-orange-600">
                  <Activity className="h-3 w-3" />
                  Live Vault
                </Badge>
              </div>
            </div>

            {/* Trading Mode Toggles - VAULT MODE ALWAYS ACTIVE */}
            <div className="flex items-center gap-6">
              {/* Signal Trading Toggle */}
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


              {/* Agent Vault Status - ALWAYS ACTIVE */}
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="flex items-center gap-1 bg-gradient-to-r from-orange-500/10 to-red-600/10 border-orange-500/20 text-orange-700">
                  <Vault className="h-3 w-3" />
                  Vault Mode
                </Badge>
                <Badge variant="secondary" className={`${networkInfo?.network === 'mainnet' ? 'bg-red-500/10 text-red-700 border-red-500/20' : 'bg-green-500/10 text-green-700 border-green-500/20'}`}>
                  {networkInfo?.network?.toUpperCase() || 'LOADING'}
                </Badge>
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

          {/* Left Panel - Agent Vault Interface (ALWAYS ACTIVE) */}
          <div className="col-span-3 space-y-4" style={{ maxHeight: 'calc(100vh - 16rem)', overflowY: 'auto' }}>
            {signalMode ? (
              /* Signal Trading Interface */
              <Card className="h-full shadow-lg border-border/50 bg-gradient-to-br from-card to-card/95">
                <CardHeader className="pb-3 border-b border-border/30">
                  <CardTitle className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Zap className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-semibold">Vault Signal Trading</span>
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
                        Generate Vault Signal
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
                          Generate signals to trade with vault funds
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
              /* Agent Vault Interface - DEFAULT FOR THIS PAGE */
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
                <CardContent className="space-y-4 h-[calc(100vh-14rem)] overflow-y-auto overflow-x-hidden p-4">
                  
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
                  <div className="grid grid-cols-2 gap-2 text-center">
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
                  </div>

                  {/* Vault Management UI */}
                  {userVaults.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Your Vaults ({userVaults.length}/2)</h4>
                        {!maxVaultsReached && (
                          <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Can create {2 - userVaults.length} more
                          </Badge>
                        )}
                        {maxVaultsReached && (
                          <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            Limit reached
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {userVaults.map((vault) => (
                          <div
                            key={vault.id}
                            className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                              vault.id === currentVaultId
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/30 cursor-pointer'
                            }`}
                            onClick={() => vault.id !== currentVaultId && switchVault(vault.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${vault.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                <span className="font-medium text-sm">{vault.name}</span>
                                {vault.id === currentVaultId && (
                                  <Badge variant="outline" className="text-xs">Current</Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {vault.balance?.toFixed(2) || '0.00'} ADA
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteVault(vault.id);
                                  }}
                                  disabled={vaultLoading}
                                >
                                  🗑️
                                </Button>
                              </div>
                            </div>
                            
                            <div className="text-xs text-muted-foreground mt-1">
                              {vault.credentials?.address?.substring(0, 25)}...
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Created: {new Date(vault.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generate Vault Wallet - Hidden, using seamless component */}
                  {/* Show withdrawal UI for stuck funds */}
                  <div className="w-full space-y-4">
                    {/* Show existing 5 ADA stuck in vault */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h3 className="font-semibold text-amber-900 mb-2">⚠️ Existing Vault Balance</h3>
                      <p className="text-2xl font-bold text-amber-900">5.00 ADA</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Locked without datum - needs special recovery
                      </p>
                    </div>

                    {/* Withdraw button with browser wallet signing */}
                    <Button 
                      className="w-full"
                      variant="default"
                      onClick={async () => {
                        setVaultLoading(true);
                        setVaultError('');
                        try {
                          // Check if wallet is connected
                          if (!mainWallet || !mainWallet.address) {
                            setVaultError('❌ Please connect your wallet first');
                            setVaultLoading(false);
                            return;
                          }

                          console.log('🔓 Starting withdrawal with browser wallet signing...');
                          
                          // Step 1: Find the stuck UTXO (we know it's 5 ADA)
                          // The actual stuck TX hash from mainnet
                          const stuckTxHash = '1ffc705e7e278a63302c04b05e8ac50297ed4e100f96e92b87655147b08730ae';
                          
                          // Step 2: Build unsigned transaction via API
                          console.log('📝 Building unsigned transaction...');
                          console.log('   User address:', mainWallet.address);
                          console.log('   Stuck TX hash:', stuckTxHash);
                          
                          const buildResponse = await fetch(`${CARDANO_SERVICE_URL}/build-unlock-tx`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              userAddress: mainWallet.address,
                              depositTxHash: stuckTxHash,  // First endpoint uses depositTxHash
                              message: "Hello, World!"     // Add the redeemer message
                            })
                          });
                          
                          const buildData = await buildResponse.json();
                          if (!buildData.success) {
                            throw new Error(buildData.error || 'Failed to build transaction');
                          }
                          
                          console.log('✅ Transaction built, CBOR:', buildData.cbor.substring(0, 50) + '...');
                          
                          // Step 3: Sign with browser wallet
                          console.log('🔏 Requesting wallet signature...');
                          const walletApi = window.cardano?.[mainWallet.walletType || 'eternl'];
                          if (!walletApi) {
                            throw new Error('Wallet API not available');
                          }
                          
                          const api = await walletApi.enable();
                          // IMPORTANT: Use false for partialSign to get full signed transaction
                          // true returns only witness set, false returns complete signed tx
                          const signedTx = await api.signTx(buildData.cbor, false);
                          
                          console.log('✅ Transaction signed by wallet (full transaction)');
                          
                          // Step 4: Submit signed transaction
                          console.log('📤 Submitting signed transaction...');
                          const submitResponse = await fetch(`${CARDANO_SERVICE_URL}/submit-signed-tx`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              signedTx,
                              unsignedTx: buildData.cbor  // Send the unsigned TX too in case we need to assemble
                            })
                          });
                          
                          const submitData = await submitResponse.json();
                          if (!submitData.success) {
                            throw new Error(submitData.error || 'Failed to submit transaction');
                          }
                          
                          console.log('🎉 Withdrawal successful! TX:', submitData.txHash);
                          setVaultError('✅ Withdrawal successful! TX: ' + submitData.txHash?.substring(0, 10) + '...');
                          
                          // Refresh after 5 seconds
                          setTimeout(() => window.location.reload(), 5000);
                          
                        } catch (err: any) {
                          console.error('❌ Withdrawal failed:', err);
                          setVaultError('❌ ' + err.message);
                        } finally {
                          setVaultLoading(false);
                        }
                      }}
                      disabled={vaultLoading || !mainWallet?.address}
                    >
                      {vaultLoading ? 'Processing...' : 
                       !mainWallet?.address ? 'Connect Wallet First' : 
                       'Withdraw 5 ADA with Wallet Signature'}
                    </Button>

                    {vaultError && (
                      <div className={`p-3 rounded text-sm ${
                        vaultError.startsWith('✅') ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
                      }`}>
                        {vaultError}
                      </div>
                    )}
                  </div>
                  
                  {/* Entire old vault section hidden - using seamless component instead */}
                  {false ? (
                    <>
                    {!vaultCredentials ? (
                    <Button
                      onClick={generateVaultCredentials}
                      disabled={vaultLoading || !networkInfo || maxVaultsReached}
                      className={`w-full ${
                        maxVaultsReached 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-orange-600 hover:bg-orange-700'
                      }`}
                      size="lg"
                    >
                      {vaultLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : maxVaultsReached ? (
                        <>
                          <Vault className="mr-2 h-4 w-4" />
                          Maximum 2 Vaults Reached
                        </>
                      ) : (
                        <>
                          <Vault className="mr-2 h-4 w-4" />
                          Deploy Smart Contract Vault ({userVaultCount + 1}/2)
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      {/* Wallet Info */}
                      <div className="p-3 bg-muted rounded">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1">
                            <p className="text-xs font-semibold mb-1">Vault Address:</p>
                            <p className="text-xs font-mono break-all">
                              {vaultCredentials?.address || 'Not generated'}
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              if (vaultCredentials?.address) {
                                navigator.clipboard.writeText(vaultCredentials.address);
                                console.log('✅ Vault address copied to clipboard');
                                alert('Vault address copied to clipboard!');
                              }
                            }}
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-8 px-2"
                          >
                            📋 Copy
                          </Button>
                        </div>
                        <p className={`text-xs ${networkInfo?.network === 'mainnet' ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                          {vaultCredentials?.isSmartContract 
                            ? '🔐 SMART CONTRACT VAULT - Protected by Aiken on-chain rules!'
                            : networkInfo?.network === 'mainnet' 
                              ? '🚨 MAINNET wallet - needs REAL ADA!' 
                              : '✅ Testnet wallet - needs testnet ADA'}
                        </p>
                      </div>

                      {/* Simple Deposit/Withdraw UI that works with existing Railway API */}
                      <div className="w-full space-y-4">
                        {/* Show existing 5 ADA stuck in vault */}
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <h3 className="font-semibold text-amber-900 mb-2">⚠️ Existing Vault Balance</h3>
                          <p className="text-2xl font-bold text-amber-900">5.00 ADA</p>
                          <p className="text-sm text-amber-700 mt-1">
                            Locked without datum - needs special recovery
                          </p>
                        </div>

                        {/* Withdraw button for stuck funds */}
                        <Button 
                          className="w-full"
                          variant="default"
                          onClick={async () => {
                            setVaultLoading(true);
                            setVaultError('');
                            try {
                              // Use the existing unlock endpoint with proper datum
                              const response = await fetch(`${CARDANO_SERVICE_URL}/unlock`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  mnemonic: vaultCredentials?.mnemonic || '',
                                  message: "Hello, World!" // Datum for unlock
                                })
                              });
                              const data = await response.json();
                              if (data.success) {
                                setVaultError('✅ Withdrawal successful! TX: ' + data.txHash?.substring(0, 10) + '...');
                                setTimeout(() => window.location.reload(), 3000);
                              } else {
                                setVaultError('❌ ' + (data.error || 'Withdrawal failed'));
                              }
                            } catch (err: any) {
                              setVaultError('❌ ' + err.message);
                            } finally {
                              setVaultLoading(false);
                            }
                          }}
                          disabled={vaultLoading || !vaultCredentials?.mnemonic}
                        >
                          {vaultLoading ? 'Processing...' : 'Withdraw 5 ADA from Vault'}
                        </Button>

                        {vaultError && (
                          <div className={`p-3 rounded text-sm ${
                            vaultError.startsWith('✅') ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
                          }`}>
                            {vaultError}
                          </div>
                        )}
                      </div>
                      
                      {/* Keep old UI hidden for reference (can be removed later) */}
                      {false && vaultBalance === 0 && (
                        <div className="space-y-3">
                          <div className="p-3 bg-blue-50 rounded border border-blue-200">
                            <h4 className="font-semibold text-blue-900 mb-2">💰 Fund Your Smart Contract:</h4>
                            <p className="text-xs text-blue-700 mb-3">
                              Lock ADA in the smart contract vault. Only YOU can unlock it with your wallet signature!
                            </p>
                            
                            {/* Show current wallet balance */}
                            <div className="p-2 bg-white rounded border border-blue-100 mb-3">
                              <p className="text-xs text-gray-600">Current wallet balance:</p>
                              <p className="text-sm font-semibold text-gray-900">{mainWallet?.balance?.toFixed(2) || '0.00'} ADA</p>
                            </div>
                            
                            {/* Funding Amount Input */}
                            <div className="p-2 bg-white rounded border border-blue-100 mb-3">
                              <label className="text-xs text-gray-600 block mb-1">Amount to send (minimum 5 ADA):</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="5"
                                  step="1"
                                  value={customFundingAmount}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (value >= 5) {
                                      setCustomFundingAmount(value);
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm font-semibold">ADA</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Fees (~0.2 ADA) will be added automatically
                              </p>
                            </div>
                            
                            {/* One-Click Vault Funding */}
                            <Button
                              onClick={async () => {
                                try {
                                  setVaultLoading(true);
                                  setVaultError('');
                                  
                                  // Use the already connected wallet (mainWallet)
                                  console.log('💰 Connected wallet info:', {
                                    address: mainWallet?.address,
                                    balance: mainWallet?.balance,
                                    walletType: mainWallet?.walletType
                                  });
                                  
                                  // Check if we have a connected wallet
                                  if (!mainWallet || !mainWallet.address) {
                                    setVaultError('No wallet connected. Please connect your wallet first.');
                                    return;
                                  }
                                  
                                  // Force refresh wallet balance before checking
                                  await refreshWalletData();
                                  
                                  // Fetch the balance directly from API to ensure we have the latest
                                  let actualBalance = mainWallet.balance;
                                  try {
                                    const balanceResponse = await fetch(`/api/address/${mainWallet.address}/balance?force=true&t=${Date.now()}`);
                                    if (balanceResponse.ok) {
                                      const balanceData = await balanceResponse.json();
                                      if (balanceData.success && balanceData.balance !== undefined) {
                                        actualBalance = balanceData.balance;
                                        console.log('💰 Fresh balance fetched directly:', actualBalance, 'ADA');
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Failed to fetch fresh balance:', error);
                                  }
                                  
                                  console.log('💰 Using wallet balance for check:', actualBalance, 'ADA');
                                  
                                  // Check if user has enough balance in their connected wallet
                                  const requiredADA = customFundingAmount + 0.2; // User amount + fees
                                  
                                  if (actualBalance < requiredADA) {
                                    setVaultError(`Insufficient balance: Need ${requiredADA} ADA but wallet has ${actualBalance.toFixed(2)} ADA`);
                                    return;
                                  }
                                  
                                  // Try to use the connected wallet's API
                                  const walletType = mainWallet.walletType || 'eternl'; // fallback to eternl
                                  if (!window.cardano?.[walletType]) {
                                    setVaultError(`${walletType} wallet API not available. Please ensure your wallet is properly connected.`);
                                    return;
                                  }
                                  
                                  // Enable wallet API
                                  const walletApi = await window.cardano[walletType].enable();
                                  
                                  // Get user's current address  
                                  const addresses = await walletApi.getUsedAddresses();
                                  if (!addresses.length) {
                                    setVaultError(`No addresses found in ${walletType} wallet.`);
                                    return;
                                  }
                                  
                                  // Build funding transaction with user-specified amount
                                  const fundingAmount = customFundingAmount; // ADA from user input
                                  const fundingAmountLovelace = (fundingAmount * 1_000_000).toString();
                                  
                                  // Use connected wallet for simple wallet-to-wallet funding
                                  // Build a simple transaction using wallet's built-in transaction builder
                                  const utxos = await walletApi.getUtxos();
                                  if (!utxos || utxos.length === 0) {
                                    setVaultError(`No UTXOs available in ${walletType} wallet`);
                                    return;
                                  }
                                  
                                  // For now, skip UTXO parsing since we already checked balance
                                  // The UTXOs are in CBOR hex format which needs special parsing
                                  // We already verified the balance is 92.359 ADA above
                                  console.log(`📊 Found ${utxos.length} UTXOs in wallet (CBOR format)`);
                                  
                                  // We already checked balance above (actualBalance)
                                  // No need to re-check here since we verified 92.359 ADA
                                  console.log(`💰 Balance already confirmed: ${actualBalance} ADA`);
                                  console.log(`🎯 Sending ${fundingAmount} ADA to vault: ${vaultCredentials.address}`);
                                  
                                  // Use Lucid to build the transaction properly
                                  console.log('🔧 Building transaction with Lucid...');
                                  
                                  try {
                                    // Import Lucid for transaction building
                                    const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');
                                    
                                    // Initialize Lucid
                                    const lucid = await Lucid(
                                      new Blockfrost(
                                        networkInfo?.network === 'mainnet' 
                                          ? 'https://cardano-mainnet.blockfrost.io/api/v0'
                                          : 'https://cardano-preprod.blockfrost.io/api/v0',
                                        process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
                                      ),
                                      networkInfo?.network === 'mainnet' ? 'Mainnet' : 'Preprod'
                                    );
                                    
                                    // Use the wallet API
                                    lucid.selectWallet.fromAPI(walletApi);
                                    
                                    // Build the transaction
                                    const tx = await lucid
                                      .newTx()
                                      .pay.ToAddress(vaultCredentials.address, { lovelace: BigInt(fundingAmount * 1_000_000) })
                                      .complete();
                                    
                                    // Sign the transaction
                                    console.log('✍️ Please sign the transaction in your wallet...');
                                    const signedTx = await tx.sign.withWallet().complete();
                                    
                                    // Submit the transaction
                                    console.log('📤 Submitting transaction...');
                                    const txHash = await signedTx.submit();
                                    
                                    console.log('✅ Vault funded! TX Hash:', txHash);
                                    
                                    // Show success message
                                    alert(`✅ Smart Contract Vault funded successfully!\n\nTransaction Hash: ${txHash}\n\nThe funds are now locked in the smart contract. Only you can unlock them with your wallet signature.`);
                                    
                                    // Start checking balance after a delay (for blockchain confirmation)
                                    console.log('⏳ Waiting for blockchain confirmation...');
                                    setTimeout(() => {
                                      checkVaultBalance();
                                    }, 3000); // Initial check after 3 seconds
                                    
                                    // Check periodically for 2 minutes
                                    const checkInterval = setInterval(() => {
                                      checkVaultBalance();
                                    }, 10000); // Check every 10 seconds
                                    
                                    // Clear after 2 minutes
                                    setTimeout(() => {
                                      clearInterval(checkInterval);
                                      console.log('🚫 Stopped auto-checking balance');
                                    }, 120000);
                                  } catch (txError: any) {
                                    console.error('❌ Transaction failed:', txError);
                                    if (txError.message?.includes('User declined')) {
                                      setVaultError('Transaction cancelled by user');
                                    } else {
                                      setVaultError(`Transaction failed: ${txError.message || 'Unknown error'}`);
                                    }
                                  }
                                  
                                } catch (error: any) {
                                  console.error('❌ Wallet funding error:', error);
                                  if (error.code === -1) {
                                    setVaultError('Transaction cancelled by user');
                                  } else if (error.code === -2) {
                                    setVaultError('Insufficient funds in wallet');
                                  } else {
                                    setVaultError(`Funding failed: ${error.message || 'Unknown error'}`);
                                  }
                                } finally {
                                  setVaultLoading(false);
                                }
                              }}
                              disabled={vaultLoading}
                              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                              size="lg"
                            >
                              {vaultLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Wallet className="mr-2 h-4 w-4" />
                                  Fund Vault ({customFundingAmount} ADA)
                                </>
                              )}
                            </Button>
                            
                            <p className="text-xs text-blue-600 text-center mt-2">
                              This will send 5 ADA from your connected wallet to activate the vault
                            </p>
                          </div>
                          
                          {/* Manual instructions as fallback */}
                          <details className="text-xs text-muted-foreground">
                            <summary className="cursor-pointer hover:text-foreground transition-colors">Manual funding instructions</summary>
                            <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                              <div>1. Copy vault address above</div>
                              <div>2. Send ADA from any wallet</div>
                              <div>3. Wait for confirmation (~2 minutes)</div>
                              <div>4. Vault will auto-activate</div>
                            </div>
                          </details>
                        </div>
                      )}

                      {/* Vault Balance Display - Hidden, using seamless component */}
                      {false && vaultCredentials && (
                        <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg mb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-purple-900">🎰 Smart Contract Balance</h4>
                              <p className="text-2xl font-bold text-purple-700">{vaultBalance.toFixed(6)} ADA</p>
                              <p className="text-xs text-purple-600 mt-1">
                                {vaultBalance > 0 ? 'Funds locked in contract' : 'Vault empty'}
                              </p>
                            </div>
                            <Button
                              onClick={() => checkVaultBalance()}
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3"
                              disabled={vaultLoading}
                            >
                              🔄 Refresh
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Active Vault Operations - Show when funded */}
                      {false && (vaultBalance > 0) && (
                        <div className="space-y-3">
                          {/* Vault Active Status */}
                          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <h4 className="font-semibold text-green-900">🚀 Vault Active</h4>
                              </div>
                              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                                LIVE
                              </Badge>
                            </div>
                            <p className="text-xs text-green-700">
                              Agent trading system is operational. The AI can now execute trades automatically using vault funds.
                            </p>
                            <div className="mt-2 flex items-center gap-4 text-xs text-green-600">
                              <span>💰 Balance: {vaultBalance.toFixed(2)} ADA</span>
                              {isVaultActive && <span>⚡ Auto-Trading: Enabled</span>}
                            </div>
                          </div>
                          
                          <Button
                            onClick={async () => {
                              try {
                                setVaultLoading(true);
                                setVaultError('');
                                
                                // Build transaction CBOR for vault deposit
                                const response = await fetch(`${CARDANO_SERVICE_URL}/build-vault-transaction`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    fromAddress: vaultCredentials.address,
                                    amount: (1 * 1_000_000).toString(), // 1 ADA in lovelace
                                    operation: 'lock'
                                  })
                                });
                                
                                const data = await response.json();
                                
                                if (data.success && data.cbor) {
                                  // Copy CBOR to clipboard for wallet signing
                                  await navigator.clipboard.writeText(data.cbor);
                                  
                                  // Show success message
                                  console.log('✅ Transaction CBOR copied to clipboard for wallet signing');
                                  setVaultError(''); // Clear any previous error
                                  
                                  // You could also trigger wallet directly if their API supports it
                                  // window.open(`wallet://sign?cbor=${data.cbor}`, '_blank');
                                } else {
                                  setVaultError(data.error || 'Failed to build transaction');
                                }
                              } catch (err: any) {
                                setVaultError(`Transaction building failed: ${err.message}`);
                              } finally {
                                setVaultLoading(false);
                              }
                            }}
                            disabled={vaultLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all duration-200"
                            size="lg"
                          >
                            {vaultLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Building Transaction...
                              </>
                            ) : (
                              <>
                                <Vault className="mr-2 h-4 w-4" />
                                Build & Copy Transaction
                              </>
                            )}
                          </Button>
                          
                          {/* Agent Trading Controls */}
                          <div className="space-y-2">
                            <h5 className="font-medium text-sm text-green-900">Agent Trading Controls:</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-green-500/30 text-green-600 hover:bg-green-50 text-xs"
                                onClick={() => {
                                  // Start AI trading session
                                  console.log('🤖 Starting AI trading session...');
                                }}
                              >
                                <Bot className="mr-1 h-3 w-3" />
                                Start Trading
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-orange-500/30 text-orange-600 hover:bg-orange-50 text-xs"
                                onClick={() => {
                                  // Pause AI trading
                                  console.log('⏸️ Pausing AI trading...');
                                }}
                              >
                                ⏸️ Pause
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-500/30 text-blue-600 hover:bg-blue-50 text-xs"
                                onClick={checkVaultBalance}
                              >
                                🔄 Refresh
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-purple-500/30 text-purple-600 hover:bg-purple-50 text-xs"
                                onClick={() => {
                                  // View trading history
                                  console.log('📊 Viewing trading history...');
                                }}
                              >
                                📊 History
                              </Button>
                            </div>
                          </div>
                          
                          {/* Manual fund addition */}
                          <Button
                            onClick={() => lockFundsToVault('1')}
                            disabled={vaultLoading}
                            variant="outline"
                            className="w-full border-green-500/30 text-green-600 hover:bg-green-50 text-xs"
                            size="sm"
                          >
                            <ArrowUpCircle className="mr-2 h-3 w-3" />
                            Add More Funds (1 ADA)
                          </Button>
                        </div>
                      )}

                      {/* Vault Operations - Hidden, using seamless component now */}
                      {false && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Vault Operations</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={async () => {
                              try {
                                setVaultLoading(true);
                                console.log('🔒 Starting PROPER deposit with datum...');
                                
                                // Import Lucid for deposit
                                const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');
                                const LucidLib = await import('@lucid-evolution/lucid');
                                const { Constr, Data, getAddressDetails } = LucidLib;
                                
                                // Initialize Lucid
                                const lucid = await Lucid(
                                  new Blockfrost(
                                    'https://cardano-mainnet.blockfrost.io/api/v0',
                                    process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
                                  ),
                                  'Mainnet'
                                );
                                
                                // Connect wallet
                                const walletType = mainWallet?.walletType || 'eternl';
                                if (!window.cardano?.[walletType]) {
                                  throw new Error(`${walletType} wallet not found`);
                                }
                                const api = await window.cardano[walletType].enable();
                                lucid.selectWallet.fromAPI(api);
                                
                                // Get user's public key hash for datum
                                const userAddress = await lucid.wallet().address();
                                const addressDetails = getAddressDetails(userAddress);
                                const userPubKeyHash = addressDetails.paymentCredential?.hash;
                                
                                if (!userPubKeyHash) {
                                  throw new Error('Could not get user public key hash');
                                }
                                
                                console.log('👤 User public key hash for datum:', userPubKeyHash);
                                
                                // Build the datum - MUST include owner's pubkey hash
                                const datum = Data.to(new Constr(0, [userPubKeyHash]));
                                console.log('📝 Datum to be included:', datum);
                                
                                // Build deposit transaction WITH datum
                                const tx = await lucid
                                  .newTx()
                                  .pay.ToContractWithData(
                                    vaultCredentials.address,
                                    { kind: "inline", value: datum }, // Include datum inline
                                    { lovelace: 2000000n } // Deposit 2 ADA for testing
                                  )
                                  .complete();
                                
                                console.log('✅ Deposit transaction built with datum');
                                
                                // Sign and submit
                                const signedTx = await tx.sign.withWallet().complete();
                                const txHash = await signedTx.submit();
                                
                                console.log('🎉 Deposit successful with datum!');
                                console.log('📦 Transaction hash:', txHash);
                                alert(`✅ Deposited 2 ADA with proper datum!\n\nTx: ${txHash}\n\nYou can now test withdrawal!`);
                                
                                // Refresh balance after 5 seconds
                                setTimeout(() => checkVaultBalance(), 5000);
                              } catch (error: any) {
                                console.error('❌ Deposit failed:', error);
                                setVaultError(`Deposit failed: ${error.message}`);
                              } finally {
                                setVaultLoading(false);
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <ArrowUpCircle className="mr-1 h-3 w-3" />
                            Deposit 2 ADA (Proper)
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              try {
                                setVaultLoading(true);
                                setVaultError('');
                                
                                console.log('🎰 Starting withdrawal from vault...');
                                
                                // Get stored UTXOs
                                const storedUtxos = localStorage.getItem('vault-utxos');
                                if (!storedUtxos) {
                                  setVaultError('No UTXOs found. Please refresh balance first.');
                                  return;
                                }
                                
                                const rawUtxos = JSON.parse(storedUtxos);
                                console.log(`📦 Found ${rawUtxos.length} UTXOs to withdraw`);
                                
                                // Import Lucid for withdrawal
                                const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');
                                
                                // Initialize Lucid
                                const lucid = await Lucid(
                                  new Blockfrost(
                                    'https://cardano-mainnet.blockfrost.io/api/v0', // FORCE MAINNET
                                    process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
                                  ),
                                  'Mainnet' // FORCE MAINNET
                                );
                                
                                // Connect wallet
                                const walletType = mainWallet?.walletType || 'eternl';
                                if (!window.cardano?.[walletType]) {
                                  setVaultError('Wallet not available');
                                  return;
                                }
                                
                                const walletApi = await window.cardano[walletType].enable();
                                lucid.selectWallet.fromAPI(walletApi);
                                
                                // Build proper withdrawal transaction with script validation
                                console.log('🔧 Building withdrawal transaction...');
                                
                                // Get the script CBOR from our contract (verified working)
                                const scriptCBOR = "59010901010032323232323225333002323232323253330073370e900118041baa0011323322533300a3370e900018059baa00513232533300f3011002132533300d3370e900018071baa004132533300e002100114a06644646600200200644a66602800229404cc894ccc04ccdc78010028a51133004004001375c602a002602c0026eb0c044c048c048c048c048c048c048c048c048c03cdd50049bae3011300f37546022601e6ea801058cdc79bae3010300e375400e91010d48656c6c6f2c20576f726c64210016375c601e00260186ea801458c030004c030c034004c024dd50008b1805180580198048011804001180400098021baa00114984d9595cd2ab9d5573caae7d5d0aba21";
                                
                                // Create the validator (spending script)
                                const LucidLib = await import('@lucid-evolution/lucid');
                                const { Script, Data, Constr, getAddressDetails, fromText } = LucidLib;
                                
                                const validator: Script = {
                                  type: "PlutusV3",  // Back to V3 - this is what the validator was compiled as
                                  script: scriptCBOR
                                };
                                
                                // Get user's public key hash for datum verification
                                const userAddress = await lucid.wallet().address();
                                const addressDetails = getAddressDetails(userAddress);
                                const userPubKeyHash = addressDetails.paymentCredential?.hash;
                                
                                if (!userPubKeyHash) {
                                  throw new Error('Could not get user public key hash');
                                }
                                
                                console.log('👤 User public key hash:', userPubKeyHash);
                                
                                // Build the redeemer - Aiken expects a record with msg field
                                // type Redeemer { msg: ByteArray } where msg = "Hello, World!"
                                const redeemer = Data.to(new Constr(0, [fromText("Hello, World!")]));
                                console.log('🔑 Redeemer built:', redeemer);
                                
                                // Build the datum - MUST MATCH EXACTLY what was used during deposit
                                // The deposit used mConStr0([signerHash]) which is constructor 0 with pubkey hash
                                const datum = Data.to(new Constr(0, [userPubKeyHash]));
                                console.log('📝 Datum (Constr 0 with pubkey hash):', datum);
                                
                                // Fetch UTXOs directly through Lucid for proper formatting
                                console.log('🔍 Fetching UTXOs from script address via Lucid...');
                                const scriptUtxos = await lucid.utxosAt(vaultCredentials.address);
                                
                                console.log(`📦 Found ${scriptUtxos.length} UTXOs at script address`);
                                
                                if (scriptUtxos.length === 0) {
                                  throw new Error('No UTXOs found at script address');
                                }
                                
                                // Log the first UTXO to see its structure
                                console.log('📋 UTXO structure:', scriptUtxos[0]);
                                
                                // Add the datum to each UTXO since they don't have it inline
                                // The datum must match what was used during deposit
                                const utxosWithDatum = scriptUtxos.map(utxo => ({
                                  ...utxo,
                                  datum: datum // Provide the datum that was used when locking
                                }));
                                
                                // Calculate total available
                                const totalAvailable = scriptUtxos.reduce((sum, utxo) => {
                                  return sum + Number(utxo.assets.lovelace || 0n);
                                }, 0);
                                
                                console.log(`💰 Total available in vault: ${totalAvailable / 1_000_000} ADA`);
                                
                                // Get wallet UTXOs for collateral
                                console.log('💰 Getting wallet UTXOs for collateral...');
                                const walletUtxos = await lucid.wallet().getUtxos();
                                console.log(`Found ${walletUtxos.length} wallet UTXOs`);
                                
                                // Build the withdrawal transaction
                                // IMPORTANT: The UTXO has no datum, so we need to provide it explicitly
                                console.log('🔨 Building transaction with explicit datum...');
                                console.log('⚠️ CRITICAL: The deposited UTXO has NO DATUM HASH!');
                                console.log('⚠️ The funds were deposited incorrectly and CANNOT be withdrawn');
                                console.log('⚠️ The validator requires a datum but none exists on the UTXO');
                                
                                // Try with the raw UTXOs and provide datum separately
                                const tx = await lucid
                                  .newTx()
                                  .collectFrom(scriptUtxos, redeemer) // Use raw UTXOs without added datum
                                  .attach.SpendingValidator(validator) // Attach the spending validator
                                  .addSigner(userAddress) // Add user as required signer
                                  .complete();
                                
                                console.log('📝 Transaction built successfully');
                                console.log('📄 Transaction details:', tx);
                                
                                // Try to get the transaction CBOR to debug
                                try {
                                  const txCbor = tx.toCBOR();
                                  console.log('📦 Transaction CBOR length:', txCbor.length);
                                } catch (e) {
                                  console.log('⚠️ Could not get CBOR:', e);
                                }
                                
                                // Sign the transaction with wallet
                                const signedTx = await tx.sign.withWallet().complete();
                                console.log('✍️ Transaction signed');
                                
                                // Submit the transaction
                                const txHash = await signedTx.submit();
                                console.log('🚀 Transaction submitted:', txHash);
                                
                                alert(`✅ Withdrawal successful!\n\nTransaction hash: ${txHash}\n\nYour ${vaultBalance} ADA will arrive in your wallet shortly.`);
                                
                                // Clear stored UTXOs
                                localStorage.removeItem('vault-utxos');
                                
                                // Reset vault state
                                setVaultBalance(0);
                                setIsVaultActive(false);
                                
                                // Auto-refresh: Update balances after blockchain confirmation
                                console.log('⏱️ Auto-refresh: Waiting 5 seconds for blockchain confirmation...');
                                setTimeout(async () => {
                                  console.log('🔄 Auto-refresh: Updating wallet balance...');
                                  await refreshWalletData();
                                  console.log('🔄 Auto-refresh: Checking vault balance...');
                                  await checkVaultBalance();
                                  console.log('✅ Auto-refresh: Complete!');
                                }, 5000);
                                
                              } catch (error: any) {
                                console.error('❌ Withdrawal failed:', error);
                                setVaultError(`Withdrawal failed: ${error.message}`);
                              } finally {
                                setVaultLoading(false);
                              }
                            }}
                            disabled={vaultBalance === 0}
                          >
                            <ArrowDownCircle className="mr-1 h-3 w-3" />
                            Withdraw
                          </Button>
                          <Button variant="outline" size="sm" onClick={checkVaultBalance}>
                            Refresh
                          </Button>
                        </div>
                      </div>
                      )}
                    </div>
                  )}
                    </>
                  ) : null}

                  {/* Error Display */}
                  {vaultError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs text-red-800">{vaultError}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
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
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-sm"></div>
                  <span className="text-sm font-medium text-foreground">Agent Vault Active</span>
                </div>

                <div className="h-4 w-px bg-border/50"></div>

                <span className="text-sm text-muted-foreground">© 2025 MISTER Agent Vault</span>

                {signalMode && (
                  <>
                    <div className="h-4 w-px bg-border/50"></div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600">Signal Mode Active</span>
                    </div>
                  </>
                )}

                {/* Vault mode is always active for this page */}
                <div className="h-4 w-px bg-border/50"></div>
                <div className="flex items-center gap-2">
                  <Vault className="w-3 h-3 text-orange-500" />
                  <span className="text-sm font-medium text-orange-600">Working Vault System</span>
                  {networkInfo?.network === 'mainnet' && (
                    <span className="text-xs text-red-600 font-semibold">MAINNET</span>
                  )}
                </div>
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
                  v2.0.0
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