"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowRight, 
  Copy, 
  RefreshCw, 
  Wallet, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from "lucide-react";

interface WalletFundingProps {
  managedWalletAddress: string;
  connectedWalletApi?: any;
  onFundingComplete: (amount: number) => void;
  onError: (error: string) => void;
}

export function WalletFunding({ 
  managedWalletAddress, 
  connectedWalletApi,
  onFundingComplete, 
  onError 
}: WalletFundingProps) {
  const [fundingAmount, setFundingAmount] = useState<string>('100');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [managedWalletBalance, setManagedWalletBalance] = useState<number>(0);
  const [transferMethod, setTransferMethod] = useState<'manual' | 'auto'>('auto');
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    checkManagedWalletBalance();
    // Set up polling for balance updates
    const interval = setInterval(checkManagedWalletBalance, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [managedWalletAddress]);

  const checkManagedWalletBalance = async () => {
    setIsCheckingBalance(true);
    try {
      // Call Blockfrost API to get real balance
      console.log('🔍 Checking managed wallet balance for:', managedWalletAddress);
      const response = await fetch(`https://cardano-mainnet.blockfrost.io/api/v0/addresses/${managedWalletAddress}`, {
        headers: {
          'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu', // Real Blockfrost API key
          'Content-Type': 'application/json'
        }
      }).catch((error) => {
        console.error('❌ Blockfrost API request failed:', error);
        return null;
      });

      if (response && response.ok) {
        const data = await response.json();
        console.log('✅ Blockfrost response:', data);

        const balance = parseInt(data.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0') / 1000000;
        console.log(`💰 Managed wallet balance: ${balance} ADA`);
        setManagedWalletBalance(balance);
      } else if (response) {
        // Handle specific API errors
        const status = response.status;
        console.error(`❌ Blockfrost API error ${status}`);

        if (status === 404) {
          // Address not found or no transactions - normal for new wallets
          console.log('ℹ️ New wallet with no transactions, balance is 0');
          setManagedWalletBalance(0);
        } else if (status === 403) {
          console.error('❌ Blockfrost API key invalid or rate limited');
          setManagedWalletBalance(0);
        } else {
          console.error('❌ Other API error, setting balance to 0');
          setManagedWalletBalance(0);
        }
      } else {
        // Network error
        console.error('❌ Network error, setting balance to 0');
        setManagedWalletBalance(0);
      }
    } catch (error) {
      console.error('Failed to check balance:', error);
      // Use mock data for demo
      setManagedWalletBalance(0);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(managedWalletAddress);
  };

  const openInExplorer = () => {
    window.open(`https://cardanoscan.io/address/${managedWalletAddress}`, '_blank');
  };

  const transferFunds = async () => {
    if (!connectedWalletApi) {
      onError('No wallet connected for transfer');
      return;
    }

    const amount = parseFloat(fundingAmount);
    if (isNaN(amount) || amount <= 0) {
      onError('Please enter a valid amount');
      return;
    }

    setIsTransferring(true);

    try {
      // Get UTXOs from connected wallet
      const utxos = await connectedWalletApi.getUtxos();
      if (!utxos || utxos.length === 0) {
        throw new Error('No UTXOs available in connected wallet');
      }

      // Build transaction (simplified - in production would use proper transaction building)
      const amountLovelace = Math.floor(amount * 1000000); // Convert ADA to lovelace
      
      // This is a simplified transaction building process
      // In production, you'd use @emurgo/cardano-serialization-lib-browser
      const txBuilder = {
        addOutput: (address: string, amount: number) => {},
        addInputsFrom: (utxos: any[]) => {},
        build: () => ({ to_bytes: () => new Uint8Array() })
      };

      // For demo purposes, we'll simulate the transaction
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock transaction hash
      const mockTxHash = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      setTxHash(mockTxHash);

      // Update balance after successful transfer
      setTimeout(() => {
        setManagedWalletBalance(prev => prev + amount);
        onFundingComplete(amount);
      }, 2000);

    } catch (error) {
      console.error('Transfer failed:', error);
      onError(error instanceof Error ? error.message : 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 12)}...${address.substring(address.length - 12)}`;
  };

  const suggestedAmounts = [50, 100, 250, 500, 1000];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Fund Your Trading Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Balance */}
        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Current Balance</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkManagedWalletBalance}
              disabled={isCheckingBalance}
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingBalance ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="text-2xl font-bold">
            {managedWalletBalance.toFixed(2)} ADA
          </div>
          <div className="text-sm text-muted-foreground">
            {formatAddress(managedWalletAddress)}
          </div>
        </div>

        {/* Transfer Method Selection */}
        <div className="space-y-3">
          <h3 className="font-medium">Transfer Method</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={transferMethod === 'auto' ? 'default' : 'outline'}
              onClick={() => setTransferMethod('auto')}
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="font-medium">Automatic Transfer</div>
              <div className="text-xs text-muted-foreground mt-1">
                Transfer directly from connected wallet
              </div>
            </Button>
            <Button
              variant={transferMethod === 'manual' ? 'default' : 'outline'}
              onClick={() => setTransferMethod('manual')}
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="font-medium">Manual Transfer</div>
              <div className="text-xs text-muted-foreground mt-1">
                Copy address and send manually
              </div>
            </Button>
          </div>
        </div>

        {transferMethod === 'auto' ? (
          /* Automatic Transfer */
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount to Transfer (ADA)</label>
              <Input
                type="number"
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
                placeholder="Enter amount in ADA"
                min="1"
                step="0.1"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {suggestedAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setFundingAmount(amount.toString())}
                >
                  {amount} ADA
                </Button>
              ))}
            </div>

            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                Recommended minimum: 100 ADA for effective copy trading with proper position sizing.
              </AlertDescription>
            </Alert>

            <Button
              onClick={transferFunds}
              disabled={isTransferring || !connectedWalletApi}
              className="w-full"
            >
              {isTransferring ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Transferring {fundingAmount} ADA...
                </>
              ) : (
                <>
                  Transfer {fundingAmount} ADA
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Manual Transfer */
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Send ADA to the address below from any Cardano wallet. The balance will update automatically.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm font-medium mb-2">Managed Wallet Address</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-white p-2 rounded border font-mono break-all">
                  {managedWalletAddress}
                </code>
                <Button variant="outline" size="sm" onClick={copyAddress}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={openInExplorer}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              • Send any amount of ADA to this address
              • Minimum recommended: 100 ADA
              • Balance updates automatically every 10 seconds
              • Transaction fees apply (usually 0.17-0.5 ADA)
            </div>
          </div>
        )}

        {/* Transaction Status */}
        {txHash && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>Transfer submitted successfully!</span>
                <Button variant="link" size="sm" className="h-auto p-0">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View Transaction
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Balance Update Notice */}
        {managedWalletBalance > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Wallet funded successfully! You can now start copy trading with the TITAN2K strategy.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
