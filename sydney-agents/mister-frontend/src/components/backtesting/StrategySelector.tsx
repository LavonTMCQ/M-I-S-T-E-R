'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  Clock,
  Zap,
  Activity
} from 'lucide-react';

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  timeframe: string;
  type: 'technical' | 'algorithmic' | 'hybrid';
  status: 'active' | 'beta' | 'coming-soon';
  performance: {
    winRate: number;
    totalTrades: number;
    profitFactor: number;
    avgReturn: number;
    maxDrawdown: number;
  };
  features: string[];
  icon: React.ReactNode;
}

const strategies: TradingStrategy[] = [
  {
    id: 'ada_custom_algorithm',
    name: 'ADA Custom Algorithm',
    description: 'Tomorrow Labs Strategy - Advanced 15-minute ADA trading with proven 62.5% win rate',
    timeframe: '15m',
    type: 'algorithmic',
    status: 'active',
    performance: {
      winRate: 62.5,
      totalTrades: 8,
      profitFactor: 1.85,
      avgReturn: 11.01,
      maxDrawdown: 4.2
    },
    features: ['Real-time Analysis', 'Kraken API Data', 'TradingView Charts', 'Production Ready'],
    icon: <Zap className="w-5 h-5" />
  },
  {
    id: 'multi-timeframe-ada',
    name: 'Multi-Timeframe ADA Strategy',
    description: 'Advanced multi-timeframe analysis with RSI and momentum indicators for ADA trading',
    timeframe: '15m',
    type: 'technical',
    status: 'active',
    performance: {
      winRate: 66.67,
      totalTrades: 45,
      profitFactor: 2.30,
      avgReturn: 8.2,
      maxDrawdown: 8.2
    },
    features: ['RSI Analysis', 'Multi-Timeframe', 'Momentum Detection', 'Risk Management'],
    icon: <BarChart3 className="w-5 h-5" />
  },
  {
    id: 'fibonacci-retracement',
    name: 'Fibonacci Retracement Strategy',
    description: 'Professional 15-minute Fibonacci analysis with real-time swing point detection',
    timeframe: '15m',
    type: 'technical',
    status: 'active',
    performance: {
      winRate: 71.0,
      totalTrades: 31,
      profitFactor: 2.1,
      avgReturn: 4.8,
      maxDrawdown: 5.2
    },
    features: ['Dynamic Fibonacci Levels', 'Swing Point Detection', 'Real-time Analysis', 'Support/Resistance'],
    icon: <Target className="w-5 h-5" />
  },
  {
    id: 'ai-sentiment-fusion',
    name: 'AI Sentiment Fusion',
    description: 'Combines technical analysis with AI-powered sentiment analysis from social media',
    timeframe: '1h',
    type: 'hybrid',
    status: 'beta',
    performance: {
      winRate: 0,
      totalTrades: 0,
      profitFactor: 0,
      avgReturn: 0,
      maxDrawdown: 0
    },
    features: ['AI Sentiment', 'Social Media Analysis', 'Technical Fusion', 'News Integration'],
    icon: <Activity className="w-5 h-5" />
  }
];

interface StrategySelectorProps {
  selectedStrategy: string | null;
  onStrategySelect: (strategy: TradingStrategy) => void;
  className?: string;
}

export function StrategySelector({ selectedStrategy, onStrategySelect, className = '' }: StrategySelectorProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'beta': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'coming-soon': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'technical': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'algorithmic': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'hybrid': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Select Trading Strategy</h2>
        <Badge variant="outline" className="text-sm">
          {strategies.filter(s => s.status === 'active').length} Active Strategies
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((strategy) => (
          <Card 
            key={strategy.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedStrategy === strategy.id 
                ? 'ring-2 ring-primary border-primary' 
                : 'hover:border-primary/50'
            } ${strategy.status === 'coming-soon' ? 'opacity-60' : ''}`}
            onClick={() => strategy.status !== 'coming-soon' && onStrategySelect(strategy)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {strategy.icon}
                  <CardTitle className="text-lg">{strategy.name}</CardTitle>
                </div>
                <div className="flex flex-col gap-1">
                  <Badge className={`text-xs ${getStatusColor(strategy.status)}`}>
                    {strategy.status.replace('-', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${getTypeColor(strategy.type)}`}>
                    {strategy.type.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {strategy.description}
              </p>

              {strategy.status !== 'coming-soon' && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center p-2 bg-green-50 rounded border">
                    <div className="font-semibold text-green-700">{strategy.performance.winRate}%</div>
                    <div className="text-xs text-muted-foreground">Win Rate</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded border">
                    <div className="font-semibold text-blue-700">{strategy.performance.totalTrades}</div>
                    <div className="text-xs text-muted-foreground">Trades</div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded border">
                    <div className="font-semibold text-purple-700">{strategy.performance.profitFactor}</div>
                    <div className="text-xs text-muted-foreground">Profit Factor</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded border">
                    <div className="font-semibold text-orange-700">{strategy.performance.avgReturn}%</div>
                    <div className="text-xs text-muted-foreground">Avg Return</div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Features:</div>
                <div className="flex flex-wrap gap-1">
                  {strategy.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {strategy.timeframe}
                </div>
                {strategy.status !== 'coming-soon' && (
                  <Button 
                    size="sm" 
                    variant={selectedStrategy === strategy.id ? "default" : "outline"}
                    className="text-xs"
                  >
                    {selectedStrategy === strategy.id ? 'Selected' : 'Select'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
