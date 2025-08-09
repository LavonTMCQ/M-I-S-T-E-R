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
    <Card className="w-full h-full bg-gradient-to-br from-card via-card to-card/95 border shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/3 via-primary/5 to-primary/3 border-b p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-primary/12 rounded shadow-sm">
              <DollarSign className="h-3 w-3 text-primary" />
            </div>
            <CardTitle className="text-sm font-bold text-foreground">
              Manual Trading
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-primary/8 border-primary/25 text-primary text-xs px-1.5 py-0.5">
            {walletType}
          </Badge>
        </div>

        <div className="pt-1.5 border-t border-primary/8">
          <div className="text-center mb-1">
            <div className="text-sm font-bold text-primary">Balance</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-primary">{balance.toFixed(2)} ADA</div>
            <div className="text-xs text-muted-foreground">${(balance * currentPrice).toFixed(2)}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-2 overflow-hidden">
        {/* Compact Trading Form */}
        <form onSubmit={handleTradeSubmit} className="space-y-2">
          <div className="text-center mb-2 py-1.5 bg-gradient-to-r from-primary/5 to-primary/10 rounded-md border border-primary/20">
            <div className="flex items-center justify-center gap-1.5">
              <Target className="h-3 w-3 text-primary" />
              <span className="font-semibold text-sm text-primary">Trading Parameters</span>
            </div>
          </div>

          {/* Side Selection */}
          <div className="space-y-1">
            <Label htmlFor="side" className="text-xs font-medium">Position Side</Label>
            <Select
              value={tradeForm.side}
              onValueChange={(value: 'Long' | 'Short') =>
                setTradeForm({...tradeForm, side: value})
              }
            >
              <SelectTrigger className={`bg-background/50 border h-8 text-sm transition-colors ${
                tradeForm.side === 'Long'
                  ? 'border-green-500/50 hover:border-green-500'
                  : 'border-red-500/50 hover:border-red-500'
              }`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Long">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="font-medium text-xs">Long</span>
                  </div>
                </SelectItem>
                <SelectItem value="Short">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="font-medium text-xs">Short</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Trading Pair - Simplified */}
          <div className="space-y-1">
            <Label htmlFor="pair" className="text-xs font-medium">Trading Pair</Label>
            <div className="bg-background/50 border rounded-md px-2 py-1.5 h-8 flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center mr-1.5">
                <span className="text-white text-xs font-bold">₳</span>
              </div>
              <span className="text-xs font-medium">ADA/USD</span>
            </div>
          </div>

          {/* Size & Leverage - Compact Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="space-y-1">
              <Label htmlFor="size" className="text-xs font-medium">Size (ADA)</Label>
              <Input
                id="size"
                type="number"
                placeholder="0.00"
                value={tradeForm.size}
                onChange={(e) => setTradeForm({...tradeForm, size: e.target.value})}
                min="0"
                max={balance}
                step="0.01"
                className="bg-background/50 h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="leverage" className="text-xs font-medium">Leverage</Label>
              <Select
                value={tradeForm.leverage}
                onValueChange={(value) => setTradeForm({...tradeForm, leverage: value})}
              >
                <SelectTrigger className="bg-background/50 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1"><span className="text-xs">1x</span></SelectItem>
                  <SelectItem value="1.1"><span className="text-xs">1.1x</span></SelectItem>
                  <SelectItem value="1.3"><span className="text-xs">1.3x</span></SelectItem>
                  <SelectItem value="2"><span className="text-xs">2x</span></SelectItem>
                  <SelectItem value="2.5"><span className="text-xs">2.5x</span></SelectItem>
                  <SelectItem value="3"><span className="text-xs">3x</span></SelectItem>
                  <SelectItem value="5"><span className="text-xs text-orange-500">5x</span></SelectItem>
                  <SelectItem value="7"><span className="text-xs text-orange-500">7x</span></SelectItem>
                  <SelectItem value="10"><span className="text-xs text-red-500">10x</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stop Loss & Take Profit - Compact */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="space-y-1">
              <Label htmlFor="stopLoss" className="text-xs font-medium text-red-600">Stop Loss ($)</Label>
              <Input
                id="stopLoss"
                type="number"
                placeholder="Optional"
                value={tradeForm.stopLoss}
                onChange={(e) => setTradeForm({...tradeForm, stopLoss: e.target.value})}
                step="0.0001"
                className="bg-background/50 h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="takeProfit" className="text-xs font-medium text-green-600">Take Profit ($)</Label>
              <Input
                id="takeProfit"
                type="number"
                placeholder="Optional"
                value={tradeForm.takeProfit}
                onChange={(e) => setTradeForm({...tradeForm, takeProfit: e.target.value})}
                step="0.0001"
                className="bg-background/50 h-8 text-sm"
              />
            </div>
          </div>


          {/* Minimal Risk Warning */}
          <div className="flex items-center gap-1 px-1.5 py-1 bg-yellow-50/50 dark:bg-yellow-900/10 rounded border border-yellow-200/50 dark:border-yellow-800/30">
            <AlertTriangle className="h-2.5 w-2.5 text-yellow-600 flex-shrink-0" />
            <p className="text-xs text-yellow-700 dark:text-yellow-300">Beta - Risk involved</p>
          </div>

          {/* Compact Submit Button */}
          <Button
            type="submit"
            className={`w-full h-8 text-xs font-semibold transition-all duration-200 ${
              tradeForm.side === 'Long'
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
            }`}
            disabled={isExecuting || !tradeSize || tradeSize <= 0}
          >
            {isExecuting ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Executing...
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {tradeForm.side === 'Long' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {`Open ${tradeForm.side}`}
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
