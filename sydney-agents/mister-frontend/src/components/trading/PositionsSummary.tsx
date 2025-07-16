'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, X, Settings, DollarSign } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

interface Position {
  id: string;
  side: 'Long' | 'Short';
  pair: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  pnl: number;
  pnlPercent: number;
  liquidationPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: Date;
}

export function PositionsSummary() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number>(0.5883); // Default fallback
  const { mainWallet } = useWallet();

  // Fetch current market price
  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market-data');
      const result = await response.json();
      if (result.success && result.data) {
        setCurrentPrice(result.data.price);
        console.log('📊 Updated current ADA price:', result.data.price);
      }
    } catch (error) {
      console.error('❌ Failed to fetch market data:', error);
    }
  };

  useEffect(() => {
    if (mainWallet?.address) {
      fetchPositions();
      fetchMarketData(); // Fetch market data immediately
      const positionsInterval = setInterval(fetchPositions, 10000); // Update positions every 10 seconds
      const priceInterval = setInterval(fetchMarketData, 5000); // Update price every 5 seconds
      return () => {
        clearInterval(positionsInterval);
        clearInterval(priceInterval);
      };
    }
  }, [mainWallet?.address]);

  // Recalculate positions when current price changes
  useEffect(() => {
    if (mainWallet?.address && currentPrice > 0) {
      fetchPositions(); // Recalculate P&L with new price
    }
  }, [currentPrice]);

  const fetchPositions = async () => {
    try {
      if (!mainWallet?.address) {
        console.log('⚠️ No wallet address available for fetching positions');
        setIsLoading(false);
        return;
      }

      // Fetch real positions from Strike Finance via bridge server with wallet address
      const response = await fetch(`http://localhost:4113/api/strike/positions?walletAddress=${encodeURIComponent(mainWallet.address)}`);
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        console.log('📊 Raw Strike Finance position data:', data.data);

        // Convert Strike Finance positions to our format
        const strikePositions: Position[] = data.data.map((pos: any, index: number) => {
          // Strike Finance position structure based on API docs
          const positionId = pos.outRef ? `${pos.outRef.txHash}_${pos.outRef.outputIndex}` : `pos_${Date.now()}_${index}`;
          const collateralAmount = pos.collateral?.amount || 0;
          const leverage = pos.leverage || 1;
          const entryPrice = pos.entryPrice || 0;

          // Use real-time current price from market data
          const realCurrentPrice = currentPrice; // Use state value from market data API

          // FIXED P&L calculation - use Strike Finance API position size directly
          const positionSize = pos.positionSize || (collateralAmount * leverage);

          // Calculate price difference correctly
          const priceDiff = pos.position === 'Long'
            ? (realCurrentPrice - entryPrice)
            : (entryPrice - realCurrentPrice);

          // Calculate P&L - this should be the profit/loss in USD
          const pnlRaw = priceDiff * positionSize;

          // Calculate percentage based on collateral invested
          const collateralValueUSD = collateralAmount * entryPrice;
          const pnlPercent = collateralValueUSD > 0 ? (pnlRaw / collateralValueUSD) * 100 : 0;

          // Enhanced debugging for P&L calculation
          console.log(`🔍 P&L Debug - Position ${index + 1}:`, {
            positionId,
            side: pos.position,
            collateralAmount,
            leverage,
            positionSize,
            entryPrice,
            currentPrice: realCurrentPrice,
            priceDiff,
            pnlRaw,
            pnlPercent,
            collateralValueUSD,
            calculation: {
              formula: pos.position === 'Long' ? '(current - entry) * size' : '(entry - current) * size',
              step1: `(${pos.position === 'Long' ? realCurrentPrice : entryPrice} - ${pos.position === 'Long' ? entryPrice : realCurrentPrice})`,
              step2: `${priceDiff} * ${positionSize}`,
              result: `$${pnlRaw.toFixed(2)}`
            },
            timestamp: new Date().toISOString()
          });

          return {
            id: positionId,
            side: pos.position || 'Long', // Strike Finance uses 'position' field
            pair: 'ADA/USD',
            size: positionSize, // Use correct position size from API
            entryPrice: entryPrice,
            currentPrice: realCurrentPrice, // Use real-time price
            leverage: leverage,
            pnl: pnlRaw,
            pnlPercent: pnlPercent,
            liquidationPrice: pos.liquidationPrice || 0,
            stopLoss: pos.stopLoss,
            takeProfit: pos.takeProfit,
            timestamp: new Date(pos.enteredPositionTime || Date.now())
          };
        });

        console.log('✅ Converted positions:', strikePositions);
        setPositions(strikePositions);
      } else {
        console.log('📭 No positions found or empty data');
        setPositions([]);
      }
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      // Show empty state on error
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClosePosition = async (positionId: string) => {
    try {
      console.log('🔄 Closing position:', positionId);
      console.log('🔍 Auth token:', localStorage.getItem('mister_auth_token') ? 'Present' : 'Missing');

      // Step 1: Get the close position CBOR from our Next.js API route
      console.log('🌐 Making close position API request...');
      const response = await fetch('/api/positions/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mister_auth_token')}`
        },
        body: JSON.stringify({
          positionId: positionId,
          userId: 'current_user',
          reason: 'Manual close from trading interface'
        })
      });
      console.log('🌐 Close position API response status:', response.status);

      if (!response.ok) {
        console.error('❌ HTTP error closing position:', response.status);
        return;
      }

      const result = await response.json();
      console.log('🔍 Close position API response:', result);

      if (!result.success) {
        console.error('❌ Failed to close position:', result.error);
        return;
      }

      if (result.data?.requiresSigning && result.data?.cbor) {
        console.log('📝 CBOR transaction received for position close, requesting wallet signature...');

        // Step 2: Get wallet API for signing (need to enable first)
        const walletType = 'vespr'; // TODO: Get from wallet context
        const wallet = (window as any).cardano?.[walletType];
        if (!wallet) {
          console.error('❌ Wallet not available for signing');
          return;
        }

        // Enable the wallet to get the API
        const walletApi = await wallet.enable();
        if (!walletApi) {
          console.error('❌ Failed to enable wallet for signing');
          return;
        }

        // Step 3: Request wallet signature (PARTIAL signing - per documentation)
        let witnessSetCbor;
        try {
          console.log('🔐 Requesting wallet signature (PARTIAL signing - per Strike Finance docs)...');
          witnessSetCbor = await walletApi.signTx(result.data.cbor, true); // TRUE = partial signing
          console.log('✅ Wallet signature received for close position, length:', witnessSetCbor.length);
        } catch (signError) {
          console.error('❌ Wallet signing failed:', signError);
          return;
        }

        // Step 4: Send to server for proper CBOR combination using CSL (per documentation)
        console.log('🔧 Sending to server for CSL transaction combination (per Strike Finance docs)...');
        const signingResponse = await fetch('/api/cardano/sign-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            txCbor: result.data.cbor,
            witnessSetCbor: witnessSetCbor
          })
        });

        if (!signingResponse.ok) {
          console.error('❌ Server CSL signing failed:', signingResponse.status);
          return;
        }

        const signingResult = await signingResponse.json();

        if (!signingResult.success) {
          console.error('❌ Server CSL signing error:', signingResult.error);
          return;
        }

        console.log('✅ Server: CSL transaction combination successful, length:', signingResult.signedTxCbor.length);

        // Step 5: Server-side submission (EXACTLY like Strike Finance - NO wallet submitTx!)
        console.log('🚀 Submitting transaction server-side (Strike Finance approach - NO wallet submitTx)...');
        console.log('🔍 Final transaction CBOR length:', signingResult.signedTxCbor.length);

        const submissionResponse = await fetch('/api/cardano/submit-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signedTxCbor: signingResult.signedTxCbor
          })
        });

        if (!submissionResponse.ok) {
          console.error('❌ Server submission failed:', submissionResponse.status);
          return;
        }

        const submissionResult = await submissionResponse.json();

        if (!submissionResult.success) {
          console.error('❌ Server submission error:', submissionResult.error);
          return;
        }

        console.log('✅ Close position transaction submitted server-side! Hash:', submissionResult.txHash);

        // Step 6: Refresh positions to show updated state
        fetchPositions();

      } else {
        console.log('✅ Position closed successfully (no signing required):', result.data);
        fetchPositions();
      }
    } catch (error) {
      console.error('❌ Failed to close position:', error);
      console.error('❌ Close position error details:', JSON.stringify(error, null, 2));
      console.error('❌ Close position error message:', error.message);
      console.error('❌ Close position error stack:', error.stack);
    }
  };

  const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const totalPnLPercent = positions.length > 0 
    ? positions.reduce((sum, pos) => sum + pos.pnlPercent, 0) / positions.length 
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Positions ({positions.length})
          </div>
          {positions.length > 0 && (
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Total P&L Summary */}
        {positions.length > 0 && (
          <>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total P&L</span>
                <div className={`text-right ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  <div className="font-medium">
                    {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                  </div>
                  <div className="text-xs">
                    {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Positions List */}
        {positions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-2">No open positions</div>
            <div className="text-sm text-muted-foreground">
              Execute your first trade to see positions here
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((position) => (
              <div key={position.id} className="border rounded-lg p-3 space-y-3">
                {/* Position Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={position.side === 'Long' ? 'default' : 'destructive'}
                      className="flex items-center gap-1"
                    >
                      {position.side === 'Long' ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {position.side}
                    </Badge>
                    <span className="font-medium">{position.pair}</span>
                    <Badge variant="outline">{position.leverage}x</Badge>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleClosePosition(position.id)}
                    className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
                    title="Close Position"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Position Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Size</div>
                    <div className="font-medium">{position.size.toFixed(2)} ADA</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Entry</div>
                    <div className="font-medium">${position.entryPrice.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Current</div>
                    <div className="font-medium">${position.currentPrice.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">P&L</div>
                    <div className={`font-medium ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Risk Management */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Liquidation</span>
                    <span className="text-red-500">${position.liquidationPrice.toFixed(4)}</span>
                  </div>
                  
                  {position.stopLoss && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Stop Loss</span>
                      <span className="text-orange-500">${position.stopLoss.toFixed(4)}</span>
                    </div>
                  )}
                  
                  {position.takeProfit && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Take Profit</span>
                      <span className="text-green-500">${position.takeProfit.toFixed(4)}</span>
                    </div>
                  )}
                </div>

                {/* Enhanced Position Actions */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    Modify
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                    onClick={() => handleClosePosition(position.id)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Close Position
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {positions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                Close All Positions
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                Set Stop Loss for All
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
