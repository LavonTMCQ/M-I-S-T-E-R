'use client';

import React, { useState } from 'react';
// Removed WASM dependency - using server-side signing API instead

// Extend Window interface for Cardano wallet
declare global {
  interface Window {
    cardano?: {
      [key: string]: {
        enable(): Promise<{
          signTx(cbor: string, partialSign?: boolean): Promise<string>;
          submitTx(cbor: string): Promise<string>;
        }>;
      };
    };
  }
}
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Activity, Target, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { strikeAPI } from '@/lib/api/strike';
import { useWallet } from '@/contexts/WalletContext';

/**
 * Submit signed transaction with wallet API and Blockfrost fallback
 */
async function submitSignedTransaction(
  signedTxCbor: string,
  walletApi: any
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    console.log('📡 Attempting transaction submission via wallet...');

    // Try wallet submission first
    try {
      const txHash = await walletApi.submitTx(signedTxCbor);
      console.log('✅ Transaction submitted successfully via wallet:', txHash);
      return { success: true, txHash };
    } catch (walletError) {
      console.log('⚠️ Wallet submission failed, trying Blockfrost fallback...', walletError);

      // Fallback to Blockfrost
      const response = await fetch('https://cardano-mainnet.blockfrost.io/api/v0/tx/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/cbor',
          'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
        },
        body: new Uint8Array(signedTxCbor.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [])
      });

      if (response.ok) {
        const txHash = await response.text();
        console.log('✅ Transaction submitted successfully via Blockfrost:', txHash);
        return { success: true, txHash };
      } else {
        const errorText = await response.text();
        console.error('❌ Blockfrost submission failed:', errorText);
        return { success: false, error: `Blockfrost error: ${errorText}` };
      }
    }
  } catch (error) {
    console.error('❌ Transaction submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown submission error'
    };
  }
}

// Note: Cardano WASM library causes Next.js build issues
// Using alternative approach based on CIP-30 specification

interface ManualTradingInterfaceProps {
  walletAddress: string;
  walletType: 'managed' | 'connected';
  balance: number;
  currentPrice: number;
}



// DEPRECATED: Removed complex witness combination function - now using full signing instead

export function ManualTradingInterface({
  walletAddress,
  walletType,
  balance,
  currentPrice
}: ManualTradingInterfaceProps) {
  const { toast } = useToast();
  const { mainWallet } = useWallet();
  const [isExecuting, setIsExecuting] = useState(false);

  // Trade form state - simplified for opening positions only
  const [tradeForm, setTradeForm] = useState({
    side: 'Long' as 'Long' | 'Short',
    pair: 'ADA/USD',
    size: '',
    leverage: '1.1',
    stopLoss: '',
    takeProfit: ''
  });

  // Calculate trade details
  const tradeSize = parseFloat(tradeForm.size) || 0;
  const leverage = parseFloat(tradeForm.leverage) || 1.1;
  const positionValue = tradeSize * leverage;
  const liquidationPrice = tradeForm.side === 'Long'
    ? currentPrice * (1 - 1/leverage * 0.9)
    : currentPrice * (1 + 1/leverage * 0.9);

  const handleTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tradeSize || tradeSize <= 0) {
      toast({
        title: "Invalid Trade Size",
        description: "Please enter a valid trade size",
        variant: "destructive"
      });
      return;
    }

    if (tradeSize > balance) {
      toast({
        title: "Insufficient Balance",
        description: `Trade size (${tradeSize} ADA) exceeds available balance (${balance} ADA)`,
        variant: "destructive"
      });
      return;
    }

    setIsExecuting(true);

    try {
      // Use the global wallet address (should be bech32 format)
      const tradingAddress = mainWallet?.address || walletAddress;

      console.log('🎯 Executing trade with address:', tradingAddress.substring(0, 20) + '...');

      const result = await strikeAPI.executeTrade({
        userId: 'current_user', // Would get from auth context
        walletAddress: tradingAddress, // Use global wallet bech32 address
        walletType: 'direct', // Direct trading mode
        action: 'open', // Lowercase to match corrected backend API
        side: tradeForm.side,
        pair: tradeForm.pair,
        size: tradeSize,
        leverage: leverage,
        stopLoss: parseFloat(tradeForm.stopLoss) || undefined,
        takeProfit: parseFloat(tradeForm.takeProfit) || undefined
      });

      if (result.success && result.data) {
        // Check if we got CBOR data that needs signing
        if (result.data.cbor) {
          console.log('📝 CBOR transaction received, requesting wallet signature...');

          // Validate CBOR format before proceeding
          const cborHex = result.data.cbor;
          console.log('🔍 CBOR validation - Length:', cborHex.length);
          console.log('🔍 CBOR validation - First 20 chars:', cborHex.substring(0, 20));
          console.log('🔍 CBOR validation - Last 20 chars:', cborHex.substring(cborHex.length - 20));

          // Check if CBOR starts with valid Cardano transaction prefix
          if (!cborHex.match(/^[0-9a-fA-F]+$/)) {
            throw new Error('Invalid CBOR format: Contains non-hexadecimal characters');
          }

          if (cborHex.length < 100) {
            throw new Error('Invalid CBOR format: Transaction too short');
          }

          // Log CBOR structure analysis
          console.log('🔍 CBOR structure analysis:');
          console.log('  - Starts with:', cborHex.substring(0, 8));
          console.log('  - Expected Cardano TX should start with patterns like: 84, 85, 86, etc.');
          console.log('  - Current CBOR starts with:', cborHex.substring(0, 2));

          if (!cborHex.startsWith('84') && !cborHex.startsWith('85') && !cborHex.startsWith('86')) {
            console.warn('⚠️ CBOR may not be a standard Cardano transaction format');
            console.warn('⚠️ This might explain the submission failures');
          }

          console.log('✅ CBOR format validation completed');

          // Get wallet API for signing
          if (!window.cardano || !window.cardano[mainWallet?.walletType || 'eternl']) {
            throw new Error('Wallet not available for signing');
          }

          const walletApi = await window.cardano[mainWallet?.walletType || 'eternl'].enable();

          try {
            // SERVER-SIDE API APPROACH: Use backend for proper CBOR handling
            console.log('🔧 Using Server-Side API approach for transaction signing...');
            console.log('📋 Strike Finance CBOR length:', result.data.cbor.length);

            // Step 1: Get wallet signature (witness set)
            console.log('🔐 Requesting wallet signature (partial signing)...');
            const witnessSetCbor = await walletApi.signTx(result.data.cbor, true);
            console.log('✅ Wallet signature received, length:', witnessSetCbor.length);

            // Step 2: Use server-side API to properly combine transaction with witness set
            console.log('🔧 Sending to server for proper CBOR combination...');
            console.log('📋 Request payload:', {
              txCborLength: result.data.cbor.length,
              witnessSetCborLength: witnessSetCbor.length,
              txCborEnd: result.data.cbor.substring(result.data.cbor.length - 10),
              witnessSetCborStart: witnessSetCbor.substring(0, 10)
            });

            const serverSigningResponse = await fetch('/api/cardano/sign-transaction', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                txCbor: result.data.cbor,
                witnessSetCbor: witnessSetCbor
              })
            });

            console.log('📡 Server response status:', serverSigningResponse.status);
            console.log('📡 Server response headers:', Object.fromEntries(serverSigningResponse.headers.entries()));

            if (!serverSigningResponse.ok) {
              const errorText = await serverSigningResponse.text();
              console.error('❌ Server signing error response:', errorText);
              throw new Error(`Server signing failed (${serverSigningResponse.status}): ${errorText}`);
            }

            const serverSigningResult = await serverSigningResponse.json();
            console.log('📋 Server signing result:', serverSigningResult);

            if (!serverSigningResult.success) {
              throw new Error(`Server signing failed: ${serverSigningResult.error}`);
            }

            const completeTransaction = serverSigningResult.signedTxCbor;
            console.log('✅ Server: Transaction signed successfully, length:', completeTransaction.length);

            // Step 3: Submit the properly signed transaction
            console.log('📡 Submitting signed transaction...');
            const submissionResult = await submitSignedTransaction(
              completeTransaction,
              walletApi
            );

            if (!submissionResult.success) {
              throw new Error(`Transaction submission failed: ${submissionResult.error}`);
            }

            const txHash = submissionResult.txHash!;
            console.log('🎉 WASM: Transaction successfully submitted! Hash:', txHash);

            toast({
              title: "Position Opened Successfully",
              description: `${tradeForm.side} position opened for ${tradeSize} ADA. TX: ${txHash.substring(0, 16)}...`,
            });
          } catch (error: unknown) {
            console.error('❌ Transaction error details:', error);

            const errorObj = error as { code?: number; info?: string; message?: string };
            console.error('❌ Error code:', errorObj?.code);
            console.error('❌ Error info:', errorObj?.info);
            console.error('❌ Error message:', errorObj?.message);

            // Check if it's a signing error or submission error
            if (errorObj?.code === -2) {
              throw new Error(`Transaction submission failed: ${errorObj?.info || 'Network error during submission'}`);
            } else if (errorObj?.code === -1) {
              throw new Error(`Transaction signing failed: ${errorObj?.info || 'User rejected or signing error'}`);
            } else {
              throw new Error(`Transaction failed: ${errorObj?.info || errorObj?.message || 'Unknown error'}`);
            }
          }
        } else {
          // No CBOR data, treat as successful mock trade
          toast({
            title: "Trade Prepared Successfully",
            description: `${tradeForm.side} position prepared for ${tradeSize} ADA`,
          });
        }

        // Reset form
        setTradeForm({
          ...tradeForm,
          size: '',
          stopLoss: '',
          takeProfit: ''
        });
      } else {
        throw new Error(result.error || 'Trade execution failed');
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      toast({
        title: "Trade Execution Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-gradient-to-br from-card via-card to-card/80 border-2 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b p-4 pb-3">
        <CardTitle className="flex items-center gap-3 text-lg mb-1">
          <div className="p-2 bg-primary/10 rounded-lg">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-bold">Manual Trading</div>
            <div className="text-xs text-muted-foreground font-normal">Professional Trading Interface</div>
          </div>
        </CardTitle>
        <CardDescription className="flex items-center gap-2 mt-1">
          <Wallet className="h-4 w-4" />
          Execute trades directly from your <Badge variant="outline" className="ml-1">{walletType}</Badge> wallet
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        {/* Enhanced Wallet Info */}
        <div className="bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 p-4 rounded-xl border space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Wallet Overview</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-center p-2 bg-background/50 rounded-lg">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Wallet Type
              </span>
              <Badge variant={walletType === 'connected' ? 'default' : 'secondary'} className="font-medium">
                {walletType}
              </Badge>
            </div>

            <div className="flex justify-between items-center p-2 bg-background/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <span className="font-bold text-primary">{balance.toFixed(2)} ADA</span>
            </div>

            <div className="flex justify-between items-center p-2 bg-background/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Current Price</span>
              <span className="font-bold">${currentPrice.toFixed(4)}</span>
            </div>
          </div>
        </div>

        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Enhanced Trading Form */}
        <form onSubmit={handleTradeSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Trading Parameters</span>
          </div>

          {/* Side Selection Only */}
          <div className="space-y-1.5">
            <Label htmlFor="side" className="text-sm font-medium">Position Side</Label>
            <Select
              value={tradeForm.side}
              onValueChange={(value: 'Long' | 'Short') =>
                setTradeForm({...tradeForm, side: value})
              }
            >
              <SelectTrigger className={`bg-background/50 border-2 transition-colors ${
                tradeForm.side === 'Long'
                  ? 'border-green-500/50 hover:border-green-500'
                  : 'border-red-500/50 hover:border-red-500'
              }`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Long">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Long</span>
                  </div>
                </SelectItem>
                <SelectItem value="Short">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="font-medium">Short</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Trading Pair */}
          <div className="space-y-1.5">
            <Label htmlFor="pair" className="text-sm font-medium">Trading Pair</Label>
            <Select
              value={tradeForm.pair}
              onValueChange={(value) => setTradeForm({...tradeForm, pair: value})}
            >
              <SelectTrigger className="bg-background/50 border-2 hover:border-primary/50 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADA/USD">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">₳</span>
                    </div>
                    <span className="font-medium">ADA/USD</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Size & Leverage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="size" className="text-sm font-medium">Size (ADA)</Label>
              <Input
                id="size"
                type="number"
                placeholder="0.00"
                value={tradeForm.size}
                onChange={(e) => setTradeForm({...tradeForm, size: e.target.value})}
                min="0"
                max={balance}
                step="0.01"
                className="bg-background/50 border-2 hover:border-primary/50 focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leverage" className="text-sm font-medium">Leverage</Label>
              <Select
                value={tradeForm.leverage}
                onValueChange={(value) => setTradeForm({...tradeForm, leverage: value})}
              >
                <SelectTrigger className="bg-background/50 border-2 hover:border-primary/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    <span className="font-medium">1x</span>
                  </SelectItem>
                  <SelectItem value="1.1">
                    <span className="font-medium">1.1x</span>
                  </SelectItem>
                  <SelectItem value="1.3">
                    <span className="font-medium">1.3x</span>
                  </SelectItem>
                  <SelectItem value="2">
                    <span className="font-medium">2x</span>
                  </SelectItem>
                  <SelectItem value="2.5">
                    <span className="font-medium">2.5x</span>
                  </SelectItem>
                  <SelectItem value="3">
                    <span className="font-medium">3x</span>
                  </SelectItem>
                  <SelectItem value="5">
                    <span className="font-medium">5x</span>
                  </SelectItem>
                  <SelectItem value="7">
                    <span className="font-medium text-orange-500">7x</span>
                  </SelectItem>
                  <SelectItem value="9">
                    <span className="font-medium text-orange-500">9x</span>
                  </SelectItem>
                  <SelectItem value="10">
                    <span className="font-medium text-orange-500">10x</span>
                  </SelectItem>
                  <SelectItem value="12">
                    <span className="font-medium text-red-500">12x</span>
                  </SelectItem>
                  <SelectItem value="15">
                    <span className="font-medium text-red-500">15x</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="stopLoss" className="text-sm font-medium text-red-600">Stop Loss ($)</Label>
              <Input
                id="stopLoss"
                type="number"
                placeholder="Optional"
                value={tradeForm.stopLoss}
                onChange={(e) => setTradeForm({...tradeForm, stopLoss: e.target.value})}
                step="0.0001"
                className="bg-background/50 border-2 hover:border-red-500/50 focus:border-red-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="takeProfit" className="text-sm font-medium text-green-600">Take Profit ($)</Label>
              <Input
                id="takeProfit"
                type="number"
                placeholder="Optional"
                value={tradeForm.takeProfit}
                onChange={(e) => setTradeForm({...tradeForm, takeProfit: e.target.value})}
                step="0.0001"
                className="bg-background/50 border-2 hover:border-green-500/50 focus:border-green-500 transition-colors"
              />
            </div>
          </div>

          {/* Enhanced Trade Summary */}
          {tradeSize > 0 && (
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 rounded-xl border-2 border-primary/20 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Trade Summary</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-background/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Position Value:</span>
                  <span className="font-bold text-primary">{positionValue.toFixed(2)} ADA</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-background/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Liquidation Price:</span>
                  <span className="font-bold text-orange-500">${liquidationPrice.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-background/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Est. Open Fee:</span>
                  <span className="font-bold">{(tradeSize * leverage * 0.001).toFixed(4)} ADA</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-background/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Batcher Fee:</span>
                  <span className="font-bold">1.5 ADA</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-background/30 rounded-lg border-t border-primary/20">
                  <span className="text-sm text-muted-foreground font-semibold">Total Fees:</span>
                  <span className="font-bold text-primary">{((tradeSize * leverage * 0.001) + 1.5).toFixed(4)} ADA</span>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Risk Warning */}
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-yellow-50 via-yellow-100/50 to-yellow-50 dark:from-yellow-900/20 dark:via-yellow-900/30 dark:to-yellow-900/20 rounded-xl border-2 border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Risk Warning
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Leveraged trading involves significant risk. You may lose more than your initial investment.
              </p>
            </div>
          </div>

          {/* Enhanced Submit Button */}
          <Button
            type="submit"
            className={`w-full h-12 text-base font-semibold transition-all duration-200 ${
              tradeForm.side === 'Long'
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-green-500/25'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-red-500/25'
            }`}
            disabled={isExecuting || !tradeSize || tradeSize <= 0}
          >
            {isExecuting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Executing Trade...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {tradeForm.side === 'Long' ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                {`Open ${tradeForm.side} Position`}
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
