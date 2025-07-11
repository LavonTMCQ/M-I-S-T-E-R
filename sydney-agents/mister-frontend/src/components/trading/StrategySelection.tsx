"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Zap,
  BarChart3,
  Activity,
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";

interface StrategyMetrics {
  totalTrades: number;
  winRate: number;
  avgReturn: number;
  maxDrawdown: number;
  profitFactor: number;
  sharpeRatio: number;
  lastUpdated: string;
}

interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'Technical' | 'Algorithmic' | 'AI-Driven';
  riskLevel: 'Low' | 'Medium' | 'High';
  leverage: number;
  minBalance: number;
  isActive: boolean;
  metrics: StrategyMetrics;
  features: string[];
}

interface StrategySelectionProps {
  onStrategySelect: (strategyId: string) => void;
  selectedStrategy?: string;
  walletBalance: number;
}

export function StrategySelection({ 
  onStrategySelect, 
  selectedStrategy,
  walletBalance 
}: StrategySelectionProps) {
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock strategy data (in production, fetch from API)
  useEffect(() => {
    const mockStrategies: TradingStrategy[] = [
      {
        id: 'fibonacci',
        name: 'Fibonacci Retracement',
        description: 'Professional Fibonacci retracement strategy using 38.2%, 61.8%, and 78.6% levels with RSI confirmation',
        icon: Target,
        category: 'Technical',
        riskLevel: 'Medium',
        leverage: 3,
        minBalance: 100,
        isActive: true,
        metrics: {
          totalTrades: 28,
          winRate: 67.9,
          avgReturn: 4.2,
          maxDrawdown: 6.8,
          profitFactor: 1.85,
          sharpeRatio: 2.1,
          lastUpdated: '2025-01-11T12:30:00Z'
        },
        features: [
          'Golden ratio analysis',
          'RSI confirmation',
          'Volume validation',
          '3x leverage optimization'
        ]
      },
      {
        id: 'rsi-divergence',
        name: 'RSI Divergence',
        description: 'Detects RSI divergences and momentum shifts for high-probability reversal trades',
        icon: TrendingUp,
        category: 'Technical',
        riskLevel: 'Medium',
        leverage: 2,
        minBalance: 80,
        isActive: false, // Coming soon
        metrics: {
          totalTrades: 0,
          winRate: 0,
          avgReturn: 0,
          maxDrawdown: 0,
          profitFactor: 0,
          sharpeRatio: 0,
          lastUpdated: ''
        },
        features: [
          'Bullish/bearish divergence detection',
          'Momentum confirmation',
          'Multi-timeframe analysis',
          'Dynamic stop losses'
        ]
      },
      {
        id: 'breakout',
        name: 'Breakout Strategy',
        description: 'Identifies price breakouts from consolidation patterns with volume confirmation',
        icon: Zap,
        category: 'Technical',
        riskLevel: 'High',
        leverage: 5,
        minBalance: 150,
        isActive: false, // Coming soon
        metrics: {
          totalTrades: 0,
          winRate: 0,
          avgReturn: 0,
          maxDrawdown: 0,
          profitFactor: 0,
          sharpeRatio: 0,
          lastUpdated: ''
        },
        features: [
          'Support/resistance breakouts',
          'Volume surge detection',
          'False breakout filtering',
          '5x leverage for momentum'
        ]
      },
      {
        id: 'crypto-backtesting',
        name: 'Enhanced Crypto Backtesting',
        description: 'Advanced multi-timeframe ADA strategy with proven 40%+ returns and sophisticated risk management',
        icon: BarChart3,
        category: 'AI-Driven',
        riskLevel: 'Medium',
        leverage: 10,
        minBalance: 200,
        isActive: false, // Needs upgrade
        metrics: {
          totalTrades: 45,
          winRate: 62.2,
          avgReturn: 8.7,
          maxDrawdown: 9.1,
          profitFactor: 2.3,
          sharpeRatio: 1.9,
          lastUpdated: '2025-01-10T15:45:00Z'
        },
        features: [
          'Multi-timeframe MACD analysis',
          '10x leverage optimization',
          'Real-time webhook integration',
          'Voice-enabled trade alerts'
        ]
      }
    ];

    setStrategies(mockStrategies);
    setLoading(false);
  }, []);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'Medium': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'High': return 'bg-red-500/10 text-red-700 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Technical': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'Algorithmic': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'AI-Driven': return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const formatLastUpdated = (timestamp: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Strategies...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Trading Strategies
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose an algorithmic trading strategy for automated ADA/USD leveraged trading
          </p>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {strategies.map((strategy) => {
          const Icon = strategy.icon;
          const isSelected = selectedStrategy === strategy.id;
          const canAfford = walletBalance >= strategy.minBalance;
          const isAvailable = strategy.isActive && canAfford;

          return (
            <Card 
              key={strategy.id} 
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:shadow-md hover:bg-muted/50'
              } ${!isAvailable ? 'opacity-60' : ''}`}
              onClick={() => isAvailable && onStrategySelect(strategy.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{strategy.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {strategy.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                    {!strategy.isActive && (
                      <Badge variant="outline" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Strategy Info */}
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline" className={getCategoryColor(strategy.category)}>
                    {strategy.category}
                  </Badge>
                  <Badge variant="outline" className={getRiskColor(strategy.riskLevel)}>
                    {strategy.riskLevel} Risk
                  </Badge>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{strategy.leverage}x Leverage</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>{strategy.minBalance} ADA min</span>
                  </div>
                </div>

                {/* Performance Metrics */}
                {strategy.metrics.totalTrades > 0 && (
                  <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">
                        {strategy.metrics.winRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">
                        {strategy.metrics.avgReturn.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Return</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-orange-600">
                        {strategy.metrics.profitFactor.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Profit Factor</div>
                    </div>
                  </div>
                )}

                {/* Features */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Key Features:</div>
                  <div className="grid grid-cols-2 gap-1">
                    {strategy.features.map((feature, index) => (
                      <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                        <div className="w-1 h-1 bg-primary rounded-full" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Updated {formatLastUpdated(strategy.metrics.lastUpdated)}</span>
                  </div>
                  
                  {!canAfford && strategy.isActive && (
                    <Badge variant="outline" className="text-xs text-red-600">
                      Insufficient Balance
                    </Badge>
                  )}
                  
                  {isAvailable && (
                    <Button 
                      size="sm" 
                      variant={isSelected ? "default" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStrategySelect(strategy.id);
                      }}
                    >
                      {isSelected ? 'Selected' : 'Select Strategy'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Strategy Comparison */}
      {selectedStrategy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Strategy Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {strategies.filter(s => s.metrics.totalTrades > 0).map(strategy => (
                <div key={strategy.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${strategy.id === selectedStrategy ? 'bg-primary' : 'bg-muted'}`} />
                    <span className="text-sm font-medium">{strategy.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600">{strategy.metrics.winRate.toFixed(1)}%</span>
                    <span className="text-blue-600">{strategy.metrics.avgReturn.toFixed(1)}%</span>
                    <span className="text-orange-600">{strategy.metrics.profitFactor.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
