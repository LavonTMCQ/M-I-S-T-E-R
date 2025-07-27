'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Activity,
  Lock,
  Unlock,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { agentVaultV2Service, AGENT_VAULT_V2_CONFIG, VaultState } from '@/services/agent-vault-v2-service';
import { useWallet } from '@/contexts/WalletContext';
import { useRequireAuth } from '@/contexts/AuthContext';
import { TransactionStatus } from '@/components/transaction-status';
import ComingSoonOverlay from '@/components/ui/coming-soon-overlay';

export default function AgentVaultV2Component() {
  // Use existing wallet context instead of creating new connection
  const { mainWallet, isLoading: walletLoading, connectWallet: connectExistingWallet, refreshWalletData } = useWallet();
  const { user } = useRequireAuth();

  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [maxTradeAmount, setMaxTradeAmount] = useState('50');
  const [leverageLimit, setLeverageLimit] = useState('2');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load vault state function (reusable)
  const loadVaultState = async () => {
    if (mainWallet?.address) {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔄 Refreshing vault state from blockchain...');

        // Store the wallet address globally for withdrawal use
        if (typeof window !== 'undefined') {
          (window as any).mainWalletAddress = mainWallet.address;
          console.log(`🌐 Stored wallet address globally: ${mainWallet.address}`);
        }

        // Load vault state from blockchain using existing wallet
        const state = await agentVaultV2Service.getVaultState(mainWallet.address);
        if (state) {
          setVaultState(state);
          console.log(`✅ Vault state loaded: ${state.totalDeposited / 1_000_000} ADA total`);
        }

        // Also refresh wallet balance
        console.log('🔄 Refreshing wallet balance...');
        await refreshWalletData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vault state');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Load vault state when wallet is connected
  useEffect(() => {
    loadVaultState();
  }, [mainWallet?.address]);

  // Handle wallet connection using existing system
  const handleConnectWallet = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try Vespr first, then fallback to other wallets
      const walletTypes = ['vespr', 'nami', 'eternl', 'flint', 'typhon'];
      let connected = false;

      for (const walletType of walletTypes) {
        try {
          console.log(`🔍 Trying to connect ${walletType} wallet...`);
          const success = await connectExistingWallet(walletType);
          if (success) {
            console.log(`✅ Successfully connected ${walletType} wallet`);
            connected = true;
            break;
          }
        } catch (err) {
          console.log(`❌ Failed to connect ${walletType}:`, err);
          continue;
        }
      }

      if (!connected) {
        throw new Error('No compatible wallet found. Please install Vespr, Nami, Eternl, Flint, or Typhon wallet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  // Deposit ADA to vault using real service
  const handleDeposit = async () => {
    if (!mainWallet || !depositAmount) return;

    const amount = parseFloat(depositAmount);
    if (amount < AGENT_VAULT_V2_CONFIG.minVaultBalance / 1_000_000) {
      setError(`Minimum deposit is ${AGENT_VAULT_V2_CONFIG.minVaultBalance / 1_000_000} ADA`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get wallet API for the connected wallet (use exact wallet type)
      console.log(`🔗 Getting wallet API for: ${mainWallet.walletType}`);
      const walletApi = await agentVaultV2Service.getWalletApi(mainWallet.walletType);
      if (!walletApi) {
        throw new Error(`Failed to access ${mainWallet.walletType} wallet API`);
      }
      console.log(`✅ Got ${mainWallet.walletType} wallet API successfully`);

      // CRITICAL FIX: Pass the correct address from wallet context
      console.log(`🏦 Using wallet context address: ${mainWallet.address}`);

      // Store the wallet address globally for withdrawal use
      if (typeof window !== 'undefined') {
        (window as any).mainWalletAddress = mainWallet.address;
      }

      const result = await agentVaultV2Service.depositWithAddress(walletApi, amount, mainWallet.address);

      if (result.success) {
        setTxHash(result.txHash || 'success');
        setDepositAmount('');

        // Refresh vault state from blockchain after successful deposit
        console.log('✅ Deposit successful, refreshing vault state...');
        setTimeout(() => {
          loadVaultState(); // Reload real balance from blockchain
        }, 2000); // Wait 2 seconds for transaction to be confirmed
      } else {
        setError(result.error || 'Deposit failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Withdraw ADA from vault using real service
  const handleWithdraw = async () => {
    if (!mainWallet || !withdrawAmount || !vaultState) return;

    const amount = parseFloat(withdrawAmount);
    if (amount * 1_000_000 > vaultState.availableBalance) {
      setError('Insufficient balance');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get wallet API for the connected wallet
      const walletApi = await agentVaultV2Service.getWalletApi(mainWallet.walletType);
      if (!walletApi) {
        throw new Error('Failed to access wallet API');
      }

      const result = await agentVaultV2Service.withdraw(walletApi, amount, vaultState);

      if (result.success) {
        setTxHash(result.txHash || 'success');
        setWithdrawAmount('');

        // Refresh vault state from blockchain after successful withdrawal
        console.log('✅ Withdrawal successful, refreshing vault state...');
        setTimeout(() => {
          loadVaultState(); // Reload real balance from blockchain
        }, 2000); // Wait 2 seconds for transaction to be confirmed
      } else {
        setError(result.error || 'Withdrawal failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle emergency stop using real service
  const handleEmergencyStop = async () => {
    if (!mainWallet || !vaultState) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get wallet API for the connected wallet
      const walletApi = await agentVaultV2Service.getWalletApi(mainWallet.walletType);
      if (!walletApi) {
        throw new Error('Failed to access wallet API');
      }

      const result = await agentVaultV2Service.toggleEmergencyStop(walletApi, vaultState);

      if (result.success) {
        setVaultState(prev => prev ? {
          ...prev,
          emergencyStop: !prev.emergencyStop
        } : null);
        setTxHash(result.txHash || 'success');
      } else {
        setError(result.error || 'Failed to toggle emergency stop');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle emergency stop');
    } finally {
      setIsLoading(false);
    }
  };

  // Update vault settings using real service
  const handleUpdateSettings = async () => {
    if (!mainWallet || !vaultState) return;

    const maxTrade = parseFloat(maxTradeAmount);
    const leverage = parseFloat(leverageLimit);

    if (leverage > AGENT_VAULT_V2_CONFIG.maxLeverage) {
      setError(`Maximum leverage is ${AGENT_VAULT_V2_CONFIG.maxLeverage}x`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get wallet API for the connected wallet
      const walletApi = await agentVaultV2Service.getWalletApi(mainWallet.walletType);
      if (!walletApi) {
        throw new Error('Failed to access wallet API');
      }

      const result = await agentVaultV2Service.updateSettings(walletApi, maxTrade, leverage, vaultState);

      if (result.success) {
        setVaultState(prev => prev ? {
          ...prev,
          maxTradeAmount: maxTrade * 1_000_000,
          leverageLimit: leverage
        } : null);
        setTxHash(result.txHash || 'success');
      } else {
        setError(result.error || 'Failed to update settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Modern Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 border border-blue-200/50 dark:border-blue-800/50">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative px-8 py-12 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Agent Vault V2
              </h1>
            </div>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The most secure way to trade with <span className="font-semibold text-blue-600">2x leverage</span> through
              smart contracts. Powered by Strike Finance with full user control.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Badge variant="outline" className="text-green-600 border-green-600 px-4 py-2 text-sm font-medium">
                <CheckCircle className="h-4 w-4 mr-2" />
                TESTED & DEPLOYED
              </Badge>
              <Badge variant="outline" className="text-blue-600 border-blue-600 px-4 py-2 text-sm font-medium">
                <Shield className="h-4 w-4 mr-2" />
                SMART CONTRACT SECURED
              </Badge>
              <Badge variant="outline" className="text-purple-600 border-purple-600 px-4 py-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 mr-2" />
                2X LEVERAGE MAX
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Smart Contract Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="font-semibold">Contract Address:</Label>
              <p className="font-mono text-xs break-all">{AGENT_VAULT_V2_CONFIG.contractAddress}</p>
            </div>
            <div>
              <Label className="font-semibold">Script Hash:</Label>
              <p className="font-mono text-xs break-all">{AGENT_VAULT_V2_CONFIG.scriptHash}</p>
            </div>
            <div>
              <Label className="font-semibold">Max Leverage:</Label>
              <Badge variant="secondary">{AGENT_VAULT_V2_CONFIG.maxLeverage}x (Enforced)</Badge>
            </div>
            <div>
              <Label className="font-semibold">Network:</Label>
              <Badge variant="outline">{AGENT_VAULT_V2_CONFIG.network}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Connection */}
      {!mainWallet ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                <p className="text-muted-foreground">Connect your Cardano wallet to start using Agent Vault V2</p>
              </div>
              <Button onClick={handleConnectWallet} disabled={isLoading || walletLoading} className="w-full max-w-sm">
                {isLoading || walletLoading ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Connected Wallet Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-semibold">Wallet Connected</p>
                    <p className="text-sm text-muted-foreground">
                      {mainWallet.displayName} ({mainWallet.walletType})
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {mainWallet.address.substring(0, 20)}...{mainWallet.address.substring(mainWallet.address.length - 10)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="font-semibold">{(mainWallet.balance / 1_000_000).toFixed(2)} ADA</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vault Status */}
          {vaultState && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Vault Status</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadVaultState}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Balance
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Deposited</p>
                      <p className="text-2xl font-bold">{(vaultState.totalDeposited / 1_000_000).toFixed(2)} ADA</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                      <p className="text-2xl font-bold">{(vaultState.availableBalance / 1_000_000).toFixed(2)} ADA</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Agent Status</p>
                      <p className="text-lg font-semibold">
                        {vaultState.agentAuthorized && !vaultState.emergencyStop ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    {vaultState.agentAuthorized && !vaultState.emergencyStop ? 
                      <CheckCircle className="h-8 w-8 text-green-600" /> : 
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    }
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Trades Executed</p>
                      <p className="text-2xl font-bold">{vaultState.tradeCount}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
            </>
          )}

          {/* Main Interface */}
          <Tabs defaultValue="deposit" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="deposit">Deposit</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
            </TabsList>

            {/* Deposit Tab */}
            <TabsContent value="deposit">
              <ComingSoonOverlay
                title="Deposit Coming Soon"
                description="Deposit functionality is being finalized for maximum security. Full functionality available in development mode."
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUpCircle className="h-5 w-5 text-green-600" />
                      Deposit ADA
                    </CardTitle>
                    <CardDescription>
                      Deposit ADA to your Agent Vault V2 (Minimum: {AGENT_VAULT_V2_CONFIG.minVaultBalance / 1_000_000} ADA)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deposit-amount">Amount (ADA)</Label>
                      <Input
                        id="deposit-amount"
                        type="number"
                        placeholder={`Minimum ${AGENT_VAULT_V2_CONFIG.minVaultBalance / 1_000_000} ADA`}
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        min={AGENT_VAULT_V2_CONFIG.minVaultBalance / 1_000_000}
                        step="0.1"
                      />
                    </div>
                    <Button
                      onClick={handleDeposit}
                      disabled={isLoading || !depositAmount}
                      className="w-full"
                    >
                      {isLoading ? 'Processing...' : 'Deposit ADA'}
                    </Button>
                  </CardContent>
                </Card>
              </ComingSoonOverlay>
            </TabsContent>

            {/* Withdraw Tab */}
            <TabsContent value="withdraw">
              <ComingSoonOverlay
                title="Withdrawal Coming Soon"
                description="Withdrawal functionality is being finalized for maximum security. Full functionality available in development mode."
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowDownCircle className="h-5 w-5 text-blue-600" />
                      Withdraw ADA
                    </CardTitle>
                    <CardDescription>
                      Withdraw ADA from your Agent Vault V2
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="withdraw-amount">Amount (ADA)</Label>
                      <Input
                        id="withdraw-amount"
                        type="number"
                        placeholder={`Max: ${((vaultState?.availableBalance || 0) / 1_000_000).toFixed(2)} ADA`}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        max={(vaultState?.availableBalance || 0) / 1_000_000}
                        step="0.1"
                      />
                    </div>
                    <Button
                      onClick={handleWithdraw}
                      disabled={isLoading || !withdrawAmount || !vaultState?.availableBalance}
                      className="w-full"
                      variant="outline"
                    >
                      {isLoading ? 'Processing...' : 'Withdraw ADA'}
                    </Button>
                  </CardContent>
                </Card>
              </ComingSoonOverlay>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Vault Settings</CardTitle>
                  <CardDescription>
                    Configure your Agent Vault V2 trading parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max-trade">Max Trade Amount (ADA)</Label>
                      <Input
                        id="max-trade"
                        type="number"
                        value={maxTradeAmount}
                        onChange={(e) => setMaxTradeAmount(e.target.value)}
                        min="40"
                        step="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leverage-limit">Leverage Limit (Max: 2x)</Label>
                      <Input
                        id="leverage-limit"
                        type="number"
                        value={leverageLimit}
                        onChange={(e) => setLeverageLimit(e.target.value)}
                        min="1"
                        max="2"
                        step="0.1"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleUpdateSettings} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Updating...' : 'Update Settings'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Emergency Tab */}
            <TabsContent value="emergency">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Emergency Controls
                  </CardTitle>
                  <CardDescription>
                    Emergency stop will immediately halt all agent trading
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {vaultState?.emergencyStop ? 
                        <Lock className="h-5 w-5 text-red-600" /> : 
                        <Unlock className="h-5 w-5 text-green-600" />
                      }
                      <div>
                        <p className="font-semibold">
                          Emergency Stop: {vaultState?.emergencyStop ? 'ACTIVE' : 'INACTIVE'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {vaultState?.emergencyStop ? 
                            'All agent trading is halted' : 
                            'Agent trading is allowed'
                          }
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleEmergencyStop}
                      disabled={isLoading}
                      variant={vaultState?.emergencyStop ? "default" : "destructive"}
                    >
                      {isLoading ? 'Processing...' : 
                       vaultState?.emergencyStop ? 'Deactivate' : 'Emergency Stop'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Enhanced Transaction Status */}
          <TransactionStatus
            txHash={txHash}
            error={error}
            isLoading={isLoading}
            onDismiss={() => {
              setTxHash(null);
              setError(null);
            }}
          />
        </>
      )}
    </div>
  );
}
