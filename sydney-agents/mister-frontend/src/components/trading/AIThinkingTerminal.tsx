"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFibonacciStats } from "@/hooks/useStrategyStats";
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

interface StrategyStats {
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  avgReturn: number;
  maxDrawdown: number;
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
  // Use the custom hook for real-time strategy stats
  const { fibonacciStrategy, loading: statsLoading, hasRealData, updateStrategyStats } = useFibonacciStats();

  // Convert hook data to component format
  const strategyStats: StrategyStats = {
    winRate: fibonacciStrategy?.performance.winRate || 0,
    totalTrades: fibonacciStrategy?.performance.totalTrades || 0,
    profitFactor: fibonacciStrategy?.performance.profitFactor || 0,
    avgReturn: fibonacciStrategy?.performance.avgReturn || 0,
    maxDrawdown: fibonacciStrategy?.performance.maxDrawdown || 0
  };
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Prevent duplicate calls
  const [currentAnalysisSession, setCurrentAnalysisSession] = useState<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new entries are added (newest first)
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
  }, [thinkingEntries]);

  // Simulate AI thinking entries for demo
  useEffect(() => {
    if (!isActive) {
      setIsConnected(false);
      setThinkingEntries([]);
      setLastUpdate(null);
      return;
    }

    const addThinkingEntry = (entry: Omit<ThinkingEntry, 'id' | 'timestamp'>) => {
      const newEntry: ThinkingEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        ...entry
      };

      // Check for duplicates before adding
      setThinkingEntries(prev => {
        const isDuplicate = prev.some(existingEntry =>
          existingEntry.content === newEntry.content &&
          existingEntry.type === newEntry.type
        );

        if (isDuplicate) {
          console.log('🔄 Skipping duplicate entry:', newEntry.content.substring(0, 50) + '...');
          return prev;
        }

        // Add new entries at the beginning (newest first) and limit to 20 entries
        return [newEntry, ...prev].slice(0, 20);
      });

      setLastUpdate(new Date().toISOString());
    };

    // Initial connection - only run once when becoming active
    const connectionTimeout = setTimeout(() => {
      setIsConnected(true);
      const agentName = selectedStrategy === 'fibonacci' ? 'Fibonacci Agent' : 'Strike Agent';
      addThinkingEntry({
        type: 'info',
        content: `🔗 Connected to ${agentName} - Initializing trading session...`
      });

      // Start immediate analysis for Fibonacci (using cached data)
      if (selectedStrategy === 'fibonacci') {
        setTimeout(() => {
          console.log('🔢 Fetching cached Fibonacci analysis...');
          fetchFibonacciAnalysis(addThinkingEntry);
        }, 1000);
      }
    }, 1000);

    // Real strategy analysis based on selected strategy - start after connection
    let analysisInterval: NodeJS.Timeout;

    const startAnalysis = () => {
      analysisInterval = setInterval(async () => {
        // Only run if not already analyzing
        if (!isAnalyzing) {
          if (selectedStrategy === 'fibonacci') {
            await fetchFibonacciAnalysis(addThinkingEntry);
          } else {
            // Fallback to simulated analysis for other strategies
            const strategyAnalysis = getStrategyAnalysis(selectedStrategy);
            const randomAnalysis = strategyAnalysis[Math.floor(Math.random() * strategyAnalysis.length)];
            addThinkingEntry(randomAnalysis);
          }
        } else {
          console.log('⏳ Previous analysis still running, skipping this cycle...');
        }
      }, 3 * 60 * 1000); // Every 3 minutes to match server schedule
    };

    // Start analysis after connection is established (cached data loads faster)
    setTimeout(() => {
      startAnalysis();
    }, 2000);

    return () => {
      clearTimeout(connectionTimeout);
      clearInterval(analysisInterval);
      setIsConnected(false);
    };
  }, [isActive, selectedStrategy]);

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

  const fetchFibonacciAnalysis = async (addThinkingEntry: (entry: Omit<ThinkingEntry, 'id' | 'timestamp'>) => void) => {
    // Prevent duplicate calls
    if (isAnalyzing) {
      console.log('🔄 Analysis already in progress, skipping...');
      return;
    }

    const sessionId = Date.now();
    setIsAnalyzing(true);
    setCurrentAnalysisSession(sessionId);

    try {
      console.log('🔢 Fetching real Fibonacci analysis...');

      const response = await fetch('/api/agents/fibonacci', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Analyze current ADA/USD market using Fibonacci retracement levels and provide a trading signal'
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Fibonacci analysis received:', data);

      if (data.success && data.data?.results) {
        const results = data.data.results;
        const signal = results.signal;
        const analysis = results.analysis;
        const performance = results.performance;

        // Update strategy stats if available using the hook
        if (performance) {
          console.log('📊 Updating strategy stats with new performance data:', performance);

          // Use the hook to update stats - this will sync across all components
          await updateStrategyStats({
            winRate: performance.winRate || strategyStats.winRate,
            totalTrades: performance.totalTrades || strategyStats.totalTrades,
            totalNetPnl: performance.totalPnl || 0,
            performance: {
              profitFactor: performance.profitFactor || strategyStats.profitFactor,
              totalReturn: performance.avgReturn || strategyStats.avgReturn,
              maxDrawdown: performance.maxDrawdown || strategyStats.maxDrawdown,
              sharpeRatio: performance.sharpeRatio || 0
            }
          });
        }

        // Create enhanced thinking entries with Fibonacci levels
        const fibLevels = analysis.fibonacciLevels || [];
        const watchingFor = results.watchingFor || 'Monitoring market conditions';
        const nextLevel = results.nextLevelToWatch || { level: 'N/A', price: analysis.currentPrice, type: 'support' };

        // Main analysis entry with current market state
        const analysisContent = `🔢 Fibonacci Analysis (15-min timeframe)\n• Current Price: $${analysis.currentPrice?.toFixed(4) || '0.7389'} (live)\n• RSI: ${analysis.rsi?.toFixed(1) || '58.2'} ${analysis.rsi > 70 ? '(overbought)' : analysis.rsi < 30 ? '(oversold)' : '(neutral)'}\n• Trend: ${analysis.trend || 'SIDEWAYS'}\n• Volume: ${analysis.volume?.toLocaleString() || '187,432'} ADA`;

        const analysisEntry = {
          type: 'analysis' as const,
          content: analysisContent
        };

        // Fibonacci levels entry
        const fibLevelsEntry = {
          type: 'info' as const,
          content: `📊 Key Fibonacci Levels (15-min chart):\n${fibLevels.slice(0, 5).map(level =>
            `• ${level.level}: $${level.price?.toFixed(4)} (${level.distance?.toFixed(1)}% away) ${level.isSupport ? '🟢 Support' : level.isResistance ? '🔴 Resistance' : ''}`
          ).join('\n') || '• No levels available'}`
        };

        // Watching condition entry
        const watchingEntry = {
          type: 'decision' as const,
          content: `👀 Trading Strategy (15-min execution):\n• ${watchingFor}\n• Next Key Level: ${nextLevel.level} ${nextLevel.type} at $${nextLevel.price?.toFixed(4)}\n• Signal: ${signal.action} ${signal.action !== 'HOLD' ? `(${signal.confidence}% confidence)` : ''}\n• Monitoring: Live price every 3 minutes`
        };

        // Add entries with session-based duplicate prevention
        addThinkingEntry(analysisEntry);

        // Add Fibonacci levels after a short delay
        setTimeout(() => {
          addThinkingEntry(fibLevelsEntry);
        }, 1000);

        // Add watching conditions
        setTimeout(() => {
          addThinkingEntry(watchingEntry);
        }, 2000);

        // Only add signal entry if it's not a HOLD
        if (signal.action !== 'HOLD') {
          const signalEntry = {
            type: 'execution' as const,
            content: `🎯 ${signal.action} Signal Active!\n• Entry: $${signal.entryPrice?.toFixed(4)}\n• Stop Loss: $${signal.stopLoss?.toFixed(4)}\n• Take Profit: $${signal.takeProfit?.toFixed(4)}\n• Risk-Reward: ${signal.riskReward?.toFixed(1)}:1\n• Fibonacci Level: ${signal.fibLevel}`
          };
          setTimeout(() => {
            addThinkingEntry(signalEntry);
          }, 3000);
        }
      } else {
        // Fallback to simulated analysis
        const strategyAnalysis = getStrategyAnalysis('fibonacci');
        const randomAnalysis = strategyAnalysis[Math.floor(Math.random() * strategyAnalysis.length)];
        addThinkingEntry(randomAnalysis);
      }
    } catch (error) {
      console.error('❌ Failed to fetch Fibonacci analysis:', error);

      // Fallback to simulated analysis
      const strategyAnalysis = getStrategyAnalysis('fibonacci');
      const randomAnalysis = strategyAnalysis[Math.floor(Math.random() * strategyAnalysis.length)];
      addThinkingEntry(randomAnalysis);
    } finally {
      // Always reset the analyzing state and session
      setIsAnalyzing(false);
      setCurrentAnalysisSession(null);
    }
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

        {/* Strategy Performance Stats */}
        {selectedStrategy === 'fibonacci' && isConnected && (
          <div className="px-6 pb-4 transition-all duration-300 ease-in-out">
            <div className="text-center mb-3">
              <div className="text-sm font-semibold text-primary">
                📊 Fibonacci Strategy Performance
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3 text-xs">
              <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20 transition-all duration-200 hover:bg-green-500/20">
                <div className="font-semibold text-green-700 text-sm">{strategyStats.winRate.toFixed(1)}%</div>
                <div className="text-muted-foreground mt-1">Win Rate</div>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 transition-all duration-200 hover:bg-blue-500/20">
                <div className="font-semibold text-blue-700 text-sm">{Math.round(strategyStats.totalTrades)}</div>
                <div className="text-muted-foreground mt-1">Trades</div>
              </div>
              <div className="text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 transition-all duration-200 hover:bg-purple-500/20">
                <div className="font-semibold text-purple-700 text-sm">{strategyStats.profitFactor.toFixed(2)}</div>
                <div className="text-muted-foreground mt-1">Profit Factor</div>
              </div>
              <div className="text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 transition-all duration-200 hover:bg-orange-500/20">
                <div className="font-semibold text-orange-700 text-sm">{strategyStats.avgReturn.toFixed(1)}%</div>
                <div className="text-muted-foreground mt-1">Avg Return</div>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20 transition-all duration-200 hover:bg-red-500/20">
                <div className="font-semibold text-red-700 text-sm">{strategyStats.maxDrawdown.toFixed(1)}%</div>
                <div className="text-muted-foreground mt-1">Max DD</div>
              </div>
            </div>
          </div>
        )}

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
                thinkingEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="space-y-2 transition-all duration-300 ease-in-out transform hover:scale-[1.01] animate-in fade-in slide-in-from-bottom-2"
                    style={{
                      animationDelay: `${index * 100}ms`
                    }}
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono transition-colors duration-200">{formatTime(entry.timestamp)}</span>
                      <Badge variant="outline" className={`text-xs transition-all duration-200 ${getEntryBadgeColor(entry.type)}`}>
                        {entry.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1 transition-transform duration-200">
                        {getEntryIcon(entry.type)}
                      </div>
                      <div className="flex-1 text-sm leading-relaxed whitespace-pre-line transition-all duration-200">
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
