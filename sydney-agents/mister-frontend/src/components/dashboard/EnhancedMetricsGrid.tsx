"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Target,
  Zap,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface MetricData {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color: string;
  description: string;
  trend: number[];
}

interface EnhancedMetricsGridProps {
  className?: string;
}

export function EnhancedMetricsGrid({ className = "" }: EnhancedMetricsGridProps) {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock data - will be replaced with real API data
    const mockMetrics: MetricData[] = [
      {
        id: 'portfolio-value',
        title: 'Portfolio Value',
        value: '$326.45',
        change: 2.34,
        changeType: 'increase',
        icon: <DollarSign className="w-5 h-5" />,
        color: 'text-green-600 bg-green-50 border-green-200',
        description: 'Total portfolio value across all wallets',
        trend: [100, 105, 103, 108, 112, 109, 115]
      },
      {
        id: 'daily-pnl',
        title: 'Daily P&L',
        value: '-$2.01',
        change: -6.91,
        changeType: 'decrease',
        icon: <TrendingDown className="w-5 h-5" />,
        color: 'text-red-600 bg-red-50 border-red-200',
        description: 'Profit/Loss for the last 24 hours',
        trend: [0, -1, -0.5, -1.5, -2.5, -1.8, -2.01]
      },
      {
        id: 'active-positions',
        title: 'Active Positions',
        value: '0',
        change: 0,
        changeType: 'neutral',
        icon: <Activity className="w-5 h-5" />,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        description: 'Currently open trading positions',
        trend: [2, 1, 3, 2, 1, 0, 0]
      },
      {
        id: 'win-rate',
        title: 'Win Rate',
        value: '68.5%',
        change: 4.2,
        changeType: 'increase',
        icon: <Target className="w-5 h-5" />,
        color: 'text-purple-600 bg-purple-50 border-purple-200',
        description: 'Percentage of profitable trades',
        trend: [60, 62, 65, 67, 66, 69, 68.5]
      },
      {
        id: 'total-trades',
        title: 'Total Trades',
        value: '23',
        change: 2,
        changeType: 'increase',
        icon: <BarChart3 className="w-5 h-5" />,
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        description: 'Total number of executed trades',
        trend: [15, 17, 19, 20, 21, 21, 23]
      },
      {
        id: 'avg-confidence',
        title: 'Avg Confidence',
        value: '7.2/10',
        change: 0.3,
        changeType: 'increase',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        description: 'Average AI confidence in trading signals',
        trend: [6.8, 7.0, 6.9, 7.1, 7.3, 7.0, 7.2]
      }
    ];

    setTimeout(() => {
      setMetrics(mockMetrics);
      setIsLoading(false);
    }, 500);
  }, []);

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <ArrowUpRight className="w-3 h-3 text-green-600" />;
      case 'decrease':
        return <ArrowDownRight className="w-3 h-3 text-red-600" />;
      case 'neutral':
        return <Minus className="w-3 h-3 text-gray-600" />;
      default:
        return <Minus className="w-3 h-3 text-gray-600" />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatChange = (change: number, changeType: string) => {
    if (changeType === 'neutral') return '0%';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // Mini sparkline component
  const MiniSparkline = ({ data, color }: { data: number[], color: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 60;
      const y = 20 - ((value - min) / range) * 20;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="60" height="20" className="opacity-60">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={color.split(' ')[0]}
        />
      </svg>
    );
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {isLoading ? (
        // Loading skeleton
        Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))
      ) : (
        metrics.map((metric, index) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${metric.color}`}>
                    {metric.icon}
                  </div>
                  <div className="flex items-center gap-1">
                    {getChangeIcon(metric.changeType)}
                    <span className={`text-sm font-medium ${getChangeColor(metric.changeType)}`}>
                      {formatChange(metric.change, metric.changeType)}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </h3>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-bold text-foreground">
                      {metric.value}
                    </p>
                    <MiniSparkline data={metric.trend} color={metric.color} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </div>

                {/* Hover effect indicator */}
                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Badge variant="outline" className="text-xs">
                    Click for details
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
}
