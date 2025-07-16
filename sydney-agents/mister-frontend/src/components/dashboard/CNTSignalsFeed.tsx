"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Bot, 
  ExternalLink, 
  Twitter, 
  MessageCircle,
  Zap,
  Clock,
  Target,
  BarChart3
} from 'lucide-react';

interface CNTSignal {
  id: string;
  ticker: string;
  unit: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timestamp: string;
  reasoning: string[];
  socialLinks?: {
    twitter?: string;
    discord?: string;
    website?: string;
  };
  policyId?: string;
  tapToolsUrl?: string;
}

interface CNTSignalsFeedProps {
  className?: string;
}

export function CNTSignalsFeed({ className = "" }: CNTSignalsFeedProps) {
  const [signals, setSignals] = useState<CNTSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Mock data for now - will be replaced with real CNT bot API
  useEffect(() => {
    const mockSignals: CNTSignal[] = [
      {
        id: '1',
        ticker: 'SNEK',
        unit: '279c909f348e533da5808898f87f9a14bb2c3dfbbacccd631d927a3f534e454b',
        action: 'BUY',
        confidence: 8.5,
        price: 0.001234,
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 min ago
        reasoning: ['Strong bullish momentum', 'High volume breakout', 'RSI oversold recovery'],
        socialLinks: {
          twitter: 'https://twitter.com/snek',
          discord: 'https://discord.gg/snek'
        },
        policyId: '279c909f348e533da5808898f87f9a14bb2c3dfbbacccd631d927a3f',
        tapToolsUrl: 'https://www.taptools.io/charts/token?unit=279c909f348e533da5808898f87f9a14bb2c3dfbbacccd631d927a3f534e454b'
      },
      {
        id: '2',
        ticker: 'MILK',
        unit: 'af2e27f580f7f08e93190a81f72462f153026d06450924726645891b4d494c4b',
        action: 'HOLD',
        confidence: 6.2,
        price: 0.000567,
        timestamp: new Date(Date.now() - 900000).toISOString(), // 15 min ago
        reasoning: ['Sideways consolidation', 'Low volume', 'Waiting for breakout'],
        socialLinks: {
          twitter: 'https://twitter.com/MuesliSwapTeam'
        },
        policyId: 'af2e27f580f7f08e93190a81f72462f153026d06450924726645891b4d494c4b',
        tapToolsUrl: 'https://www.taptools.io/charts/token?unit=af2e27f580f7f08e93190a81f72462f153026d06450924726645891b4d494c4b'
      }
    ];

    setTimeout(() => {
      setSignals(mockSignals);
      setIsLoading(false);
      setLastUpdate(new Date());
    }, 1000);
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'text-green-600 bg-green-50 border-green-200';
      case 'SELL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HOLD': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BUY': return <TrendingUp className="w-4 h-4" />;
      case 'SELL': return <TrendingDown className="w-4 h-4" />;
      case 'HOLD': return <Target className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            CNT Bot Signals
            <Badge variant="outline" className="ml-2">
              <Zap className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </CardTitle>
          {lastUpdate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Updated {formatTimeAgo(lastUpdate.toISOString())}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-100 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {signals.map((signal, index) => (
                <motion.div
                  key={signal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getActionColor(signal.action)} flex items-center gap-1`}>
                        {getActionIcon(signal.action)}
                        {signal.action}
                      </Badge>
                      <div>
                        <h4 className="font-semibold text-lg">{signal.ticker}</h4>
                        <p className="text-sm text-muted-foreground">
                          ${signal.price.toFixed(6)} • {signal.confidence}/10 confidence
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimeAgo(signal.timestamp)}
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground mb-2">Analysis:</p>
                    <ul className="text-sm space-y-1">
                      {signal.reasoning.map((reason, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {signal.tapToolsUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={signal.tapToolsUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Trade
                        </a>
                      </Button>
                    )}
                    {signal.socialLinks?.twitter && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={signal.socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                          <Twitter className="w-3 h-3 mr-1" />
                          Follow
                        </a>
                      </Button>
                    )}
                    {signal.socialLinks?.discord && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={signal.socialLinks.discord} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Discord
                        </a>
                      </Button>
                    )}
                    {signal.policyId && (
                      <Badge variant="secondary" className="text-xs font-mono">
                        {signal.policyId.substring(0, 8)}...
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
