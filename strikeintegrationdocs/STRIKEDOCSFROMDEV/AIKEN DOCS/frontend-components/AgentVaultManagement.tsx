'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft,
  Settings,
  Activity,
  DollarSign,
  BarChart3
} from "lucide-react";

interface VaultStatus {
  address: string;
  balance: number;
  tradingEnabled: boolean;
  maxTradeAmount: number;
  totalTrades: number;
  lastActivity: string | null;
  emergencyStop: boolean;
}

interface AgentVaultManagementProps {
  vaultAddress: string;
  userWallet: any;
  onError: (error: string) => void;
}

export function AgentVaultManagement({
  vaultAddress,
  userWallet,
  onError
}: AgentVaultManagementProps) {
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [newMaxTrade, setNewMaxTrade] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load vault status
  useEffect(() => {
    loadVaultStatus();
    const interval = setInterval(loadVaultStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [vaultAddress]);

  const loadVaultStatus = async () => {
    try {
      setIsLoading(true);
      const status = await queryVaultStatus(vaultAddress);
      setVaultStatus(status);
    } catch (error) {
      console.error('Failed to load vault status:', error);
      onError('Failed to load vault status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!vaultStatus || !withdrawAmount) return;

    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || amount > vaultStatus.balance) {
      onError('Invalid withdrawal amount');
      return;
    }

    setIsProcessing(true);
    try {
      const redeemer = {
        constructor: 1, // UserWithdraw
        fields: [{ int: (amount * 1000000).toString() }] // Convert to lovelace
      };

      const transaction = await buildVaultTransaction({
        vaultAddress,
        redeemer,
        userWallet,
        action: 'withdraw',
        amount: amount * 1000000
      });

      const walletApi = await (window as any).cardano[userWallet.walletType].enable();
      const signedTx = await walletApi.signTx(transaction.cborHex);
      const txHash = await walletApi.submitTx(signedTx);

      console.log('Withdrawal successful:', txHash);
      setWithdrawAmount('');
      await loadVaultStatus(); // Refresh status

    } catch (error) {
      console.error('Withdrawal failed:', error);
      onError(error instanceof Error ? error.message : 'Withdrawal failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleTrading = async () => {
    if (!vaultStatus) return;

    setIsProcessing(true);
    try {
      const redeemer = {
        constructor: 2, // UserToggleTrading
        fields: [{ constructor: vaultStatus.tradingEnabled ? 0 : 1, fields: [] }]
      };

      const transaction = await buildVaultTransaction({
        vaultAddress,
        redeemer,
        userWallet,
        action: 'toggle-trading'
      });

      const walletApi = await (window as any).cardano[userWallet.walletType].enable();
      const signedTx = await walletApi.signTx(transaction.cborHex);
      const txHash = await walletApi.submitTx(signedTx);

      console.log('Trading toggle successful:', txHash);
      await loadVaultStatus(); // Refresh status

    } catch (error) {
      console.error('Trading toggle failed:', error);
      onError(error instanceof Error ? error.message : 'Failed to toggle trading');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmergencyStop = async () => {
    if (!vaultStatus) return;

    const confirmed = window.confirm(
      'Are you sure you want to activate emergency stop? This will halt all automated trading immediately.'
    );

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const redeemer = {
        constructor: 3, // UserEmergencyStop
        fields: []
      };

      const transaction = await buildVaultTransaction({
        vaultAddress,
        redeemer,
        userWallet,
        action: 'emergency-stop'
      });

      const walletApi = await (window as any).cardano[userWallet.walletType].enable();
      const signedTx = await walletApi.signTx(transaction.cborHex);
      const txHash = await walletApi.submitTx(signedTx);

      console.log('Emergency stop activated:', txHash);
      await loadVaultStatus(); // Refresh status

    } catch (error) {
      console.error('Emergency stop failed:', error);
      onError(error instanceof Error ? error.message : 'Failed to activate emergency stop');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Agent Vault Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading vault status...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!vaultStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Vault Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Could not load vault status. Please check the vault address and try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vault Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Agent Vault Status
            <Button
              variant="ghost"
              size="sm"
              onClick={loadVaultStatus}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <h3 className="font-semibold">{vaultStatus.balance.toFixed(2)} ADA</h3>
              <p className="text-sm text-muted-foreground">Vault Balance</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <Badge variant={vaultStatus.tradingEnabled ? "default" : "secondary"}>
                {vaultStatus.tradingEnabled ? "Active" : "Disabled"}
              </Badge>
              <p className="text-sm text-muted-foreground">Trading Status</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <h3 className="font-semibold">{vaultStatus.maxTradeAmount.toLocaleString()} ADA</h3>
              <p className="text-sm text-muted-foreground">Max Trade</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Activity className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <h3 className="font-semibold">{vaultStatus.totalTrades}</h3>
              <p className="text-sm text-muted-foreground">Total Trades</p>
            </div>
          </div>

          {vaultStatus.emergencyStop && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Emergency Stop Active:</strong> All automated trading is halted. 
                You can still withdraw funds.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Vault Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Withdraw Funds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5" />
              Withdraw Funds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="withdraw-amount">Amount (ADA)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                max={vaultStatus.balance}
                min="0.1"
                step="0.1"
                placeholder="Enter amount"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Available: {vaultStatus.balance.toFixed(2)} ADA
              </p>
            </div>
            <Button
              onClick={handleWithdraw}
              disabled={!withdrawAmount || isProcessing || parseFloat(withdrawAmount) <= 0}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-4 h-4 mr-2" />
                  Withdraw Funds
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Trading Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Trading Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Automated Trading</h4>
                <p className="text-sm text-muted-foreground">
                  {vaultStatus.tradingEnabled ? 'Currently enabled' : 'Currently disabled'}
                </p>
              </div>
              <Button
                variant={vaultStatus.tradingEnabled ? "destructive" : "default"}
                onClick={handleToggleTrading}
                disabled={isProcessing || vaultStatus.emergencyStop}
              >
                {vaultStatus.tradingEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button
                variant="destructive"
                onClick={handleEmergencyStop}
                disabled={isProcessing || vaultStatus.emergencyStop}
                className="w-full"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Emergency Stop
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Immediately halts all automated trading. You can still withdraw funds.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vault Information */}
      <Card>
        <CardHeader>
          <CardTitle>Vault Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Contract Address:</span>
              <span className="text-sm font-mono">{vaultAddress.substring(0, 20)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Last Activity:</span>
              <span className="text-sm">{vaultStatus.lastActivity || 'No recent activity'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Security:</span>
              <Badge variant="outline">Smart Contract Protected</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions (would be implemented in separate utility files)
async function queryVaultStatus(vaultAddress: string): Promise<VaultStatus> {
  // This would query the actual vault status from the blockchain
  // For now, return mock data
  return {
    address: vaultAddress,
    balance: 150.5,
    tradingEnabled: true,
    maxTradeAmount: 50000,
    totalTrades: 12,
    lastActivity: '2 hours ago',
    emergencyStop: false
  };
}

async function buildVaultTransaction(params: any): Promise<any> {
  // This would build the actual Cardano transaction for vault operations
  // For now, return a placeholder structure
  return {
    cborHex: "placeholder_cbor_hex"
  };
}
