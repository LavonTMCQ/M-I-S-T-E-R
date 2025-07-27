/**
 * Signal Card Component
 * 
 * Displays individual trading signals with one-click execution
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Shield, 
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

import { TradingSignal } from '@/services/signal-execution/SignalExecutor';

interface SignalCardProps {
  signal: TradingSignal;
  onExecute: (signal: TradingSignal) => void;
  onCancel: (signalId: string) => void;
  isExecuting: boolean;
  canExecute: boolean;
  sufficientBalance: boolean;
}

export default function SignalCard({ 
  signal, 
  onExecute, 
  onCancel, 
  isExecuting, 
  canExecute,
  sufficientBalance 
}: SignalCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(signal.expires_at);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        setIsExpired(true);
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${minutes}m ${seconds}s`);
      setIsExpired(false);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [signal.expires_at]);

  const isLong = signal.type === 'long';
  const confidenceColor = signal.confidence >= 80 ? 'text-green-600' : 
                         signal.confidence >= 70 ? 'text-yellow-600' : 'text-red-600';

  const canExecuteSignal = canExecute && !isExpired && sufficientBalance && signal.status === 'active';

  return (
    <Card className={`mb-4 transition-all duration-200 hover:shadow-lg border-l-4 ${
      isLong ? 'border-l-green-500' : 'border-l-red-500'
    } ${isExpired ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${
              isLong ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isLong ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">
                {isLong ? 'LONG' : 'SHORT'} ADA/USD
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {signal.pattern.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <Badge variant={isExpired ? 'destructive' : 'secondary'} className="flex items-center space-x-1 mb-1">
              <Clock className="h-3 w-3" />
              <span>{timeRemaining}</span>
            </Badge>
            <div className={`text-sm font-semibold ${confidenceColor}`}>
              {signal.confidence}% confidence
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price and Confidence */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Entry Price</div>
            <div className="text-xl font-bold">${signal.price.toFixed(4)}</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Position Size</div>
            <div className="text-xl font-bold">{signal.risk.position_size.toFixed(0)} ADA</div>
          </div>
        </div>

        {/* Confidence Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Algorithm Confidence</span>
            <span className={confidenceColor}>{signal.confidence}%</span>
          </div>
          <Progress value={signal.confidence} className="h-2" />
        </div>

        <Separator />

        {/* Risk Management */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="font-medium">Risk Management</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stop Loss:</span>
              <span className="font-medium text-red-600">${signal.risk.stop_loss.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Take Profit:</span>
              <span className="font-medium text-green-600">${signal.risk.take_profit.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Risk:</span>
              <span className="font-medium">{signal.risk.max_risk.toFixed(1)} ADA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risk/Reward:</span>
              <span className="font-medium">
                1:{((signal.risk.take_profit - signal.price) / (signal.price - signal.risk.stop_loss)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Reasoning */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="font-medium">Analysis</span>
          </div>
          <p className="text-sm text-muted-foreground italic">
            "{signal.reasoning}"
          </p>
        </div>

        {/* Balance Warning */}
        {!sufficientBalance && canExecute && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 font-medium">
                Insufficient Balance
              </span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Need {signal.risk.position_size + 5} ADA (position + fees)
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={() => onExecute(signal)}
            disabled={!canExecuteSignal || isExecuting}
            className={`flex-1 ${isLong ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            size="lg"
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : isExpired ? (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Expired
              </>
            ) : !canExecute ? (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Connect Wallet
              </>
            ) : !sufficientBalance ? (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Insufficient Balance
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Execute {isLong ? 'LONG' : 'SHORT'}
              </>
            )}
          </Button>

          {signal.status === 'active' && !isExpired && (
            <Button
              variant="outline"
              onClick={() => onCancel(signal.id)}
              disabled={isExecuting}
              size="lg"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
          {signal.status === 'executed' ? (
            <>
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Executed</span>
            </>
          ) : signal.status === 'expired' ? (
            <>
              <XCircle className="h-3 w-3 text-red-600" />
              <span>Expired</span>
            </>
          ) : signal.status === 'cancelled' ? (
            <>
              <XCircle className="h-3 w-3 text-gray-600" />
              <span>Cancelled</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Active Signal</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
