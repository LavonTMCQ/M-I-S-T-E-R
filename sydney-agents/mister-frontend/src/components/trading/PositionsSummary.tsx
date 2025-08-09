'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, X, Settings, DollarSign } from 'lucide-react';
import { usePositions } from '@/contexts/PositionsContext';

export function PositionsSummary() {
  const { positions, isLoading, refreshPositions } = usePositions();

  const handleClosePosition = async (positionId: string) => {
    try {
      console.log('🔄 Closing position:', positionId);
      console.log('🔍 Auth token:', (typeof window !== 'undefined' && localStorage.getItem('mister_auth_token')) ? 'Present' : 'Missing');

      // Step 1: Get the close position CBOR from our Next.js API route
      console.log('🌐 Making close position API request...');
      const response = await fetch('/api/positions/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('mister_auth_token') : ''}`
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
        refreshPositions();

      } else {
        console.log('✅ Position closed successfully (no signing required):', result.data);
        refreshPositions();
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
      <CardHeader className="pb-2">
        <div className="text-center py-1.5 bg-gradient-to-r from-primary/5 to-primary/10 rounded-md border border-primary/20">
          <div className="flex items-center justify-center gap-1.5">
            <DollarSign className="h-3 w-3 text-primary" />
            <span className="font-semibold text-sm text-primary">Positions ({positions.length})</span>
          </div>
          {positions.length > 0 && totalPnL !== 0 && (
            <div className={`text-xs font-bold mt-1 ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(1)} P&L
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-2">
        {/* Positions List */}
        {positions.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-xs text-muted-foreground">No open positions</div>
          </div>
        ) : (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {positions.map((position) => (
              <div key={position.id} className="border rounded p-2 space-y-1">
                {/* Compact Position Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant={position.side === 'Long' ? 'default' : 'destructive'}
                      className="text-xs px-1 py-0 h-4"
                    >
                      {position.side === 'Long' ? (
                        <TrendingUp className="h-2 w-2 mr-0.5" />
                      ) : (
                        <TrendingDown className="h-2 w-2 mr-0.5" />
                      )}
                      {position.side}
                    </Badge>
                    <span className="text-xs font-medium">{position.pair}</span>
                    <Badge variant="outline" className="text-xs px-1 py-0 h-4">{position.leverage}x</Badge>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleClosePosition(position.id)}
                    className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
                    title="Close Position"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Compact Position Details */}
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div>
                    <div className="text-muted-foreground">Size</div>
                    <div className="font-medium">{position.size.toFixed(0)} ADA</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Entry</div>
                    <div className="font-medium">${position.entryPrice.toFixed(3)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">P&L</div>
                    <div className={`font-medium ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Single Close Button */}
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full h-6 text-xs bg-red-500 hover:bg-red-600"
                  onClick={() => handleClosePosition(position.id)}
                >
                  <X className="h-2 w-2 mr-1" />
                  Close
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
