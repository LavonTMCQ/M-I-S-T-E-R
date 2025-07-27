/**
 * Signal Panel Component
 * 
 * Displays active trading signals from the Signal Generation Service
 * with one-click execution capabilities. Integrates seamlessly with
 * the existing trading page layout.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { useSignalServices } from '@/hooks/useSignalServices';

import {
  TradingSignal,
  TradingPattern,
  SignalStatus
} from '@/types/signals';

import {
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  BarChart3,
  DollarSign
} from 'lucide-react';

/**
 * Signal Card Component - Individual signal display
 */
interface SignalCardProps {
  signal: TradingSignal;
  onExecute: (signal: TradingSignal) => void;
  isExecuting: boolean;
  canExecute: boolean;
}

function SignalCard({ signal, onExecute, isExecuting, canExecute }: SignalCardProps) {
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

  // Get pattern display info
  const getPatternInfo = (pattern: TradingPattern) => {
    const patternMap = {
      'RSI_Oversold_BB_Bounce': { label: 'RSI Oversold + BB Bounce', color: 'bg-green-500' },
      'RSI_Overbought_BB_Rejection': { label: 'RSI Overbought + BB Rejection', color: 'bg-red-500' },
      'Volume_Spike_Reversal': { label: 'Volume Spike Reversal', color: 'bg-blue-500' },
      'Multi_Indicator_Confluence': { label: 'Multi-Indicator Confluence', color: 'bg-purple-500' },
      'Custom_Pattern': { label: 'Custom Pattern', color: 'bg-gray-500' },
    };
    return patternMap[pattern] || { label: pattern, color: 'bg-gray-500' };
  };

  const patternInfo = getPatternInfo(signal.pattern);
  const isLong = signal.type === 'long';
  const confidenceColor = signal.confidence >= 80 ? 'text-green-600' : 
                         signal.confidence >= 70 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Card className={`mb-4 transition-all duration-200 hover:shadow-md ${isExpired ? 'opacity-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isLong ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <CardTitle className="text-lg">
              {isLong ? 'LONG' : 'SHORT'} Signal
            </CardTitle>
          </div>
          <Badge variant={isExpired ? 'destructive' : 'secondary'} className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{timeRemaining}</span>
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${patternInfo.color}`}></div>
          <span className="text-sm text-muted-foreground">{patternInfo.label}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price and Confidence */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Entry Price</div>
            <div className="text-lg font-semibold">${signal.price.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Confidence</div>
            <div className={`text-lg font-semibold ${confidenceColor}`}>
              {signal.confidence}%
            </div>
          </div>
        </div>

        {/* Confidence Progress Bar */}
        <div className="space-y-1">
          <Progress value={signal.confidence} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            Algorithm Confidence Level
          </div>
        </div>

        <Separator />

        {/* Risk Parameters */}
        <div className="space-y-3">
          <div className="text-sm font-medium flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Risk Management</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Position Size:</span>
              <span className="font-medium">{signal.risk.position_size} ADA</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Max Risk:</span>
              <span className="font-medium text-red-600">{signal.risk.max_risk.toFixed(1)} ADA</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stop Loss:</span>
              <span className="font-medium">${signal.risk.stop_loss.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Take Profit:</span>
              <span className="font-medium text-green-600">${signal.risk.take_profit.toFixed(4)}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Technical Indicators */}
        <div className="space-y-3">
          <div className="text-sm font-medium flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Technical Analysis</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">RSI</div>
              <div className={signal.indicators.rsi < 30 ? 'text-green-600' : 
                            signal.indicators.rsi > 70 ? 'text-red-600' : 'text-muted-foreground'}>
                {signal.indicators.rsi.toFixed(1)}
              </div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">BB Pos</div>
              <div className="text-muted-foreground">
                {(signal.indicators.bb_position * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">Volume</div>
              <div className="text-muted-foreground">
                {signal.indicators.volume_ratio.toFixed(1)}x
              </div>
            </div>
          </div>
        </div>

        {/* Algorithm Info */}
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          <div className="flex items-center justify-between">
            <span>{signal.algorithm.algorithm_name}</span>
            <span>{signal.algorithm.historical_win_rate}% Win Rate</span>
          </div>
        </div>

        {/* Reasoning */}
        <div className="text-sm text-muted-foreground italic">
          "{signal.reasoning}"
        </div>

        {/* Execute Button */}
        <Button
          onClick={() => onExecute(signal)}
          disabled={!canExecute || isExpired || isExecuting}
          className={`w-full ${isLong ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
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
              Signal Expired
            </>
          ) : !canExecute ? (
            <>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Wallet Required
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Execute {isLong ? 'LONG' : 'SHORT'} ({signal.risk.position_size} ADA)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Main Signal Panel Component
 */
export default function SignalPanel() {
  const { mainWallet } = useWallet();
  const { toast } = useToast();
  const { signals, execution, health } = useSignalServices();
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);

  // Handle signal execution
  const handleExecuteSignal = async (signal: TradingSignal) => {
    if (!mainWallet?.isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to execute signals",
        variant: "destructive",
      });
      return;
    }

    try {
      setSelectedSignal(signal);
      await execution.executeSignal(signal);
    } catch (error) {
      console.error('Signal execution failed:', error);
    } finally {
      setSelectedSignal(null);
    }
  };

  // Generate test signal (for development)
  const handleGenerateTestSignal = async () => {
    try {
      await signals.generateSignalNow();
      toast({
        title: "Test Signal Generated",
        description: "A test signal has been generated for demonstration",
      });
    } catch (error) {
      toast({
        title: "Signal Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const canExecute = mainWallet?.isConnected && health.isHealthy;
  const isExecuting = execution.isExecuting && selectedSignal !== null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Trading Signals</h2>
          <Badge variant={health.isHealthy ? 'default' : 'destructive'}>
            {health.isHealthy ? 'Active' : 'Issues'}
          </Badge>
        </div>
        
        {/* Service Status */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          {signals.serviceStatus?.running ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <span>{signals.serviceStatus?.signals_today || 0} today</span>
        </div>
      </div>

      {/* Service Status Bar */}
      {!health.isHealthy && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Signal services are experiencing issues. Some features may be limited.
            </span>
          </div>
        </div>
      )}

      {/* Wallet Connection Prompt */}
      {!mainWallet?.isConnected && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <div>
              <div className="font-medium text-blue-900">Connect Wallet to Execute Signals</div>
              <div className="text-sm text-blue-700">
                Connect your Cardano wallet to enable one-click signal execution
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Signals */}
      <div className="flex-1 overflow-y-auto">
        {signals.isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading signals...</span>
          </div>
        ) : signals.activeSignals.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Active Signals</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The ADA Custom Algorithm is monitoring the market for trading opportunities.
            </p>
            <Button 
              onClick={handleGenerateTestSignal}
              variant="outline"
              size="sm"
            >
              Generate Test Signal
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {signals.activeSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onExecute={handleExecuteSignal}
                isExecuting={isExecuting && selectedSignal?.id === signal.id}
                canExecute={canExecute}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {signals.serviceStatus && (
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">{signals.serviceStatus.signals_today}</div>
              <div className="text-muted-foreground">Signals Today</div>
            </div>
            <div className="text-center">
              <div className="font-medium">
                {signals.serviceStatus.health === 'healthy' ? '✅' : '⚠️'}
              </div>
              <div className="text-muted-foreground">Service Status</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}