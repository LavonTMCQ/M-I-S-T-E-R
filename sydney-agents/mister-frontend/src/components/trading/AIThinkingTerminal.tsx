"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  RefreshCw
} from "lucide-react";

interface ThinkingEntry {
  id: string;
  timestamp: string;
  type: 'analysis' | 'decision' | 'execution' | 'error' | 'info';
  content: string;
  data?: any;
}

interface AIThinkingTerminalProps {
  walletAddress: string;
  isActive?: boolean;
  onToggleTrading?: () => void;
  selectedStrategy?: string;
}

export function AIThinkingTerminal({
  walletAddress,
  isActive = false,
  onToggleTrading,
  selectedStrategy = 'fibonacci'
}: AIThinkingTerminalProps) {
  const [thinkingEntries, setThinkingEntries] = useState<ThinkingEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [thinkingEntries]);

  // Simulate AI thinking entries for demo
  useEffect(() => {
    if (!isActive) return;

    const addThinkingEntry = (entry: Omit<ThinkingEntry, 'id' | 'timestamp'>) => {
      const newEntry: ThinkingEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        ...entry
      };
      
      setThinkingEntries(prev => [...prev, newEntry]);
      setLastUpdate(new Date().toISOString());
    };

    // Initial connection
    setTimeout(() => {
      setIsConnected(true);
      addThinkingEntry({
        type: 'info',
        content: '🔗 Connected to Strike Agent - Initializing trading session...'
      });
    }, 1000);

    // Simulate periodic analysis based on selected strategy
    const analysisInterval = setInterval(() => {
      if (isActive && isConnected) {
        const strategyAnalysis = getStrategyAnalysis(selectedStrategy);
        const randomAnalysis = strategyAnalysis[Math.floor(Math.random() * strategyAnalysis.length)];
        addThinkingEntry(randomAnalysis);
      }
    }, 8000);

    return () => {
      clearInterval(analysisInterval);
      setIsConnected(false);
    };
  }, [isActive, isConnected]);

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'analysis': return <Brain className="h-4 w-4 text-blue-500" />;
      case 'decision': return <Target className="h-4 w-4 text-orange-500" />;
      case 'execution': return <Zap className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEntryBadgeColor = (type: string) => {
    switch (type) {
      case 'analysis': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'decision': return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'execution': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'error': return 'bg-red-500/10 text-red-700 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStrategyAnalysis = (strategy: string) => {
    const strategies: Record<string, any[]> = {
      fibonacci: [
        {
          type: 'analysis' as const,
          content: '🔢 Fibonacci Analysis: Identifying swing points...\n• Swing High: $0.7200 (Jan 11, 10:30)\n• Swing Low: $0.6500 (Jan 11, 08:15)\n• Key levels: 38.2% ($0.6933), 61.8% ($0.6767)'
        },
        {
          type: 'decision' as const,
          content: '🎯 Fibonacci Signal: LONG at 61.8% retracement\n• Entry: $0.6842 (near 61.8% level)\n• Target: $0.7100 (next Fibonacci extension)\n• Stop Loss: $0.6720 (below 78.6%)\n• Confidence: 78% | Risk-Reward: 2.1:1'
        },
        {
          type: 'execution' as const,
          content: '⚡ Executing Fibonacci trade...\n• Opening LONG position at 61.8% retracement\n• Size: 120 ADA | Leverage: 3x\n• RSI: 35.2 (oversold confirmation)\n• Volume: 125% above average'
        }
      ],
      'rsi-divergence': [
        {
          type: 'analysis' as const,
          content: '📈 RSI Divergence Scan: Detecting momentum shifts...\n• Price: Lower lows forming\n• RSI: Higher lows (bullish divergence)\n• Timeframe: 15m chart confirmation\n• Volume: Increasing on recent candles'
        },
        {
          type: 'decision' as const,
          content: '🎯 RSI Divergence Signal: LONG momentum reversal\n• Entry: $0.6845 (divergence confirmation)\n• Target: $0.7050 (+3.0%)\n• Stop Loss: $0.6720 (-1.8%)\n• Confidence: 72% | Divergence strength: Strong'
        }
      ],
      breakout: [
        {
          type: 'analysis' as const,
          content: '💥 Breakout Analysis: Monitoring consolidation patterns...\n• Resistance: $0.6900 (tested 3x)\n• Support: $0.6750 (holding strong)\n• Range: 2.2% (tight consolidation)\n• Volume: Building for breakout'
        },
        {
          type: 'decision' as const,
          content: '🎯 Breakout Signal: LONG above resistance\n• Entry: $0.6905 (breakout confirmation)\n• Target: $0.7200 (+4.3%)\n• Stop Loss: $0.6820 (-1.2%)\n• Confidence: 85% | Volume surge: 180%'
        }
      ]
    };

    return strategies[strategy] || strategies.fibonacci;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* AI Trading Control */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">MISTER Trading</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <Badge variant="outline" className="flex items-center gap-1 bg-green-500/10 text-green-700 border-green-500/20">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Connected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              AI agent managing trades for wallet: 
              <span className="font-mono text-primary ml-1">
                {walletAddress.substring(0, 12)}...
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={onToggleTrading}
                variant={isActive ? "destructive" : "default"}
                size="sm"
                className="flex items-center gap-2"
              >
                {isActive ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Stop Trading
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Trading
                  </>
                )}
              </Button>
              
              {lastUpdate && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last update: {formatTime(lastUpdate)}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Thinking Terminal */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              AI Thinking Terminal
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setThinkingEntries([])}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
          <ScrollArea className="flex-1 w-full" ref={scrollAreaRef}>
            <div className="space-y-3 pr-4">
              {thinkingEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {isActive ? 'AI agent is initializing...' : 'Start MISTER trading to see AI analysis'}
                  </p>
                </div>
              ) : (
                thinkingEntries.map((entry) => (
                  <div key={entry.id} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{formatTime(entry.timestamp)}</span>
                      <Badge variant="outline" className={`text-xs ${getEntryBadgeColor(entry.type)}`}>
                        {entry.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getEntryIcon(entry.type)}
                      </div>
                      <div className="flex-1 text-sm leading-relaxed whitespace-pre-line">
                        {entry.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
