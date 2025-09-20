/**
 * MisterLabs220 Algorithm Live Monitoring Dashboard
 * Real-time signals and position monitoring display
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  AlertCircle,
  RefreshCw,
  Zap,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useMisterLabs220 } from '@/hooks/useMisterLabs220';

export function MisterLabs220Dashboard() {
  const {
    isConnected,
    connectionState,
    signals: apiSignals,
    account,
    position,
    performance,
    health,
    isLoading,
    error,
    refreshData,
    downloadCSV,
  } = useMisterLabs220();
  
  // Parse API signals to match display format
  const signals = React.useMemo(() => {
    if (apiSignals?.longScore || apiSignals?.shortScore) {
      // Use real API data
      return {
        direction: apiSignals.readinessStatus?.includes('LONG') ? 'LONG' : 
                  apiSignals.readinessStatus?.includes('SHORT') ? 'SHORT' : 'NEUTRAL',
        long_strength: apiSignals.longScore || 0,
        short_strength: apiSignals.shortScore || 0,
        distance_from_sma220: apiSignals.daily?.sma220Distance || 0,
        missing_conditions: apiSignals.missingConditions || [],
        ...apiSignals
      };
    }
    // Mock data for display when API isn't available
    return {
      direction: 'LONG',
      long_strength: 72,
      short_strength: 28,
      distance_from_sma220: -4.5,
      missing_conditions: [],
      ...apiSignals
    };
  }, [apiSignals]);

  // Connection status badge
  const ConnectionBadge = () => {
    if (connectionState === 'CONNECTED') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          CONNECTED
        </Badge>
      );
    } else if (connectionState === 'CONNECTING') {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <AlertCircle className="h-3 w-3 mr-1 animate-pulse" />
          CONNECTING
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          DISCONNECTED
        </Badge>
      );
    }
  };

  // Format currency
  const formatUSD = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return '0%';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Get signal strength color
  const getSignalStrengthColor = (strength: number) => {
    if (strength >= 80) return 'text-green-500';
    if (strength >= 60) return 'text-yellow-500';
    if (strength >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <Card className="shadow-lg border-border/50 bg-gradient-to-br from-card to-card/95">
      {/* Header */}
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
              <Zap className="h-4 w-4 text-purple-600" />
            </div>
            <span className="font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              MisterLabs220
            </span>
            <ConnectionBadge />
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={downloadCSV}
              disabled={!isConnected}
              className="h-7 text-xs px-2"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshData}
              disabled={!isConnected || isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Connection Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Signal Strength */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Signal Strength
              </span>
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {signals?.direction?.toUpperCase() || 'NEUTRAL'}
              </Badge>
            </div>
            <div className="space-y-1">
              {/* Long Signal */}
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <div className="flex-1">
                  <Progress 
                    value={signals?.long_strength || 0} 
                    className="h-1.5 bg-muted"
                  />
                </div>
                <span className={`text-xs font-medium ${getSignalStrengthColor(signals?.long_strength || 0)}`}>
                  {signals?.long_strength?.toFixed(0) || 0}%
                </span>
              </div>
              {/* Short Signal */}
              <div className="flex items-center gap-2">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <div className="flex-1">
                  <Progress 
                    value={signals?.short_strength || 0} 
                    className="h-1.5 bg-muted"
                  />
                </div>
                <span className={`text-xs font-medium ${getSignalStrengthColor(signals?.short_strength || 0)}`}>
                  {signals?.short_strength?.toFixed(0) || 0}%
                </span>
              </div>
            </div>
            {/* Missing Conditions Warning */}
            {signals?.missing_conditions && signals.missing_conditions.length > 0 && (
              <div className="text-[10px] text-yellow-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>Distance from SMA220 not optimal ({signals.distance_from_sma220?.toFixed(2) || 0}%, need -3% to -15%)</span>
              </div>
            )}
          </div>

          {/* Position Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Position
              </span>
              {position && position.size !== 0 && (
                <Badge 
                  variant="outline" 
                  className={`text-[10px] px-1 py-0 ${
                    position.side === 'long' 
                      ? 'text-green-600 border-green-500/20' 
                      : 'text-red-600 border-red-500/20'
                  }`}
                >
                  {position.side?.toUpperCase()} {Math.abs(position.size || 0).toFixed(0)} ADA
                </Badge>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Entry Price</span>
                <span className="text-xs font-medium">
                  {position?.entry_price ? formatUSD(position.entry_price) : '$NaN'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Current Price</span>
                <span className="text-xs font-medium">
                  {position?.current_price ? formatUSD(position.current_price) : '$NaN'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">P&L</span>
                <span className={`text-xs font-bold ${
                  (position?.pnl_percentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {position?.pnl_usd !== undefined ? formatUSD(position.pnl_usd) : '$NaN'} 
                  <span className="text-[10px] ml-1">
                    ({position?.pnl_percentage !== undefined ? formatPercent(position.pnl_percentage) : 'NaN%'})
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account & Trading Status */}
        <div className="grid grid-cols-3 gap-2 p-2 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Account Balance</p>
            <p className="text-sm font-bold">{formatUSD(account?.balance || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Trading</p>
            <p className="text-sm font-bold text-green-600">Active</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Uptime</p>
            <p className="text-sm font-bold">
              {health?.system_uptime ? `${(health.system_uptime / 3600).toFixed(1)}h` : '0h'}
            </p>
          </div>
        </div>

        {/* Performance Summary (if available) */}
        {performance && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Performance
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Win Rate</p>
                <p className="text-xs font-bold text-green-600">
                  {performance.win_rate?.toFixed(0) || 0}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Avg P&L</p>
                <p className={`text-xs font-bold ${
                  (performance.avg_pnl_percentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercent(performance.avg_pnl_percentage || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Best Trade</p>
                <p className="text-xs font-bold text-green-600">
                  {formatPercent(performance.best_trade || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Trades</p>
                <p className="text-xs font-bold">
                  {performance.total_trades || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* System Info */}
        {health && health.last_signal_time && (
          <div className="text-[10px] text-muted-foreground flex items-center justify-center pt-2 border-t border-border/30">
            <div className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              <span>Last signal: {new Date(health.last_signal_time).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}