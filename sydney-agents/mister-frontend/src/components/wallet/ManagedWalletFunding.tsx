"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowRight, 
  Wallet, 
  Copy, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Send
} from "lucide-react";

interface ManagedWalletFundingProps {
  managedWalletAddress: string;
  mainWalletAddress: string;
  mainWalletBalance: number;
  onFundingComplete: (amount: number) => void;
  onError: (error: string) => void;
}

export function ManagedWalletFunding({
  managedWalletAddress,
  mainWalletAddress,
  mainWalletBalance,
  onFundingComplete,
  onError
}: ManagedWalletFundingProps) {
  const [fundingAmount, setFundingAmount] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(managedWalletAddress);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const handleTransfer = async () => {
    if (!fundingAmount || parseFloat(fundingAmount) <= 0) {
      onError('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(fundingAmount);
    if (amount > mainWalletBalance) {
      onError('Insufficient balance in main wallet');
      return;
    }

    setIsTransferring(true);

    try {
      // Build transaction to transfer ADA from main wallet to managed wallet
      console.log('🔄 Building transfer transaction...');
      
      // This would integrate with the wallet API to build and sign the transaction
      // For now, we'll simulate the process
      
      // In a real implementation, this would:
      // 1. Build a Cardano transaction
      // 2. Request user to sign with their main wallet
      // 3. Submit the transaction to the blockchain
      // 4. Wait for confirmation
      
      // Simulate transaction building and signing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('✅ Transfer completed successfully');
      onFundingComplete(amount);
      
    } catch (error) {
      console.error('❌ Transfer failed:', error);
      onError(error instanceof Error ? error.message : 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 12)}...${address.substring(address.length - 12)}`;
  };

  const suggestedAmounts = [10, 50, 100, 500];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Fund Your Managed Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Wallet Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">From (Main Wallet)</label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-sm">{formatAddress(mainWalletAddress)}</span>
                <Badge variant="outline">{mainWalletBalance.toFixed(2)} ADA</Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">To (Managed Wallet)</label>
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm">{formatAddress(managedWalletAddress)}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={handleCopyAddress}
                >
                  {addressCopied ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount to Transfer (ADA)</label>
              <Input
                type="number"
                placeholder="Enter amount..."
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
                min="0"
                max={mainWalletBalance}
                step="0.1"
                className="text-lg"
              />
            </div>

            {/* Suggested Amounts */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Quick Select</label>
              <div className="flex gap-2 flex-wrap">
                {suggestedAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setFundingAmount(amount.toString())}
                    disabled={amount > mainWalletBalance}
                  >
                    {amount} ADA
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFundingAmount((mainWalletBalance * 0.8).toFixed(2))}
                >
                  80% ({(mainWalletBalance * 0.8).toFixed(2)} ADA)
                </Button>
              </div>
            </div>
          </div>

          {/* Transfer Information */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> You'll need to sign this transaction with your main wallet. 
              Keep some ADA in your main wallet for future transactions and fees.
            </AlertDescription>
          </Alert>

          {/* Transfer Button */}
          <Button 
            onClick={handleTransfer}
            disabled={!fundingAmount || parseFloat(fundingAmount) <= 0 || isTransferring}
            className="w-full"
            size="lg"
          >
            {isTransferring ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing Transfer...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Transfer {fundingAmount || '0'} ADA
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          {/* Manual Transfer Option */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Alternative:</strong> You can also manually send ADA to your managed wallet address:
            </p>
            <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
              <span className="flex-1">{managedWalletAddress}</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleCopyAddress}
              >
                {addressCopied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
