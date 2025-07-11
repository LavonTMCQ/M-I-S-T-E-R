"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradingTypeSelector, TradingTypeConfig } from "./TradingTypeSelector";
import { TradingAnalysisPanel, TokenAnalysis } from "./TradingAnalysisPanel";
import { PaperTradingMode, PaperTrade } from "./PaperTradingMode";
import {
  Bot,
  TrendingUp,
  Activity,
  Wallet,
  RefreshCw,
  Target,
  Settings,
  Coins,
  AlertCircle,
  Brain,
  BarChart3
} from "lucide-react";

interface ManagedWallet {
  walletId: string;
  address: string;
  balance: number;
  userId: string;
}

interface TradingSession {
  sessionId: string;
  isActive: boolean;
  type: 'strike' | 'cnt';
  tradesExecuted: number;
  totalVolume: number;
  pnl: number;
  startedAt: string;
}

interface EnhancedManagedDashboardProps {
  managedWallet: ManagedWallet;
}

export function EnhancedManagedDashboard({ managedWallet }: EnhancedManagedDashboardProps) {
  const [tradingConfig, setTradingConfig] = useState<TradingTypeConfig | null>(null);
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analysis state
  const [currentAnalysis, setCurrentAnalysis] = useState<TokenAnalysis | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<TokenAnalysis[]>([]);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [lastAnalysisUpdate, setLastAnalysisUpdate] = useState<string | null>(null);

  // Paper trading state
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([]);
  const [isPaperMode, setIsPaperMode] = useState(managedWallet.balance < 10);

  // Load current trading status and analysis data
  useEffect(() => {
    loadTradingStatus();

    // Always load analysis data since it's available regardless of trading state
    loadAnalysisData();

    // Set up interval to refresh analysis every 30 seconds
    const analysisInterval = setInterval(loadAnalysisData, 30000);
    return () => clearInterval(analysisInterval);
  }, [managedWallet.walletId]);

  // Load real analysis data from API
  const loadAnalysisData = async () => {
    try {
      setIsAnalysisLoading(true);

      // Fetch current analysis from hosted Mastra Cloud Strike Agent
      const currentResponse = await fetch('https://substantial-scarce-magazin.mastra.cloud/api/agents/strikeAgent/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Use the getCurrentAnalysis tool to get the latest token analysis data'
            }
          ]
        })
      });
      let currentData = null;

      if (currentResponse.ok) {
        const agentResponse = await currentResponse.json();
        // Extract analysis data from agent response
        if (agentResponse.text && agentResponse.text.includes('analysis')) {
          // Parse the agent response to extract analysis data
          // For now, we'll use mock data until the agent response format is standardized
          currentData = { success: true, data: null };
        }
      }

      // If no current data from agent, fetch from backup endpoint
      if (!currentData) {
        const backupResponse = await fetch('https://cnt-trading-api-production.up.railway.app/api/analysis/current');
        if (backupResponse.ok) {
          currentData = await backupResponse.json();
          if (currentData.success) {
            setCurrentAnalysis(currentData.data);
            setLastAnalysisUpdate(new Date().toISOString());
          }
        }
      }

      // Fetch analysis history from backup endpoint
      const historyResponse = await fetch('https://cnt-trading-api-production.up.railway.app/api/analysis/history');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        if (historyData.success) {
          setAnalysisHistory(historyData.data);
        }
      }

      // Generate paper trade from current analysis (use already parsed data)
      if (currentData && currentData.success) {
        const analysis = currentData.data;
        const paperTrade: PaperTrade = {
          id: `trade_${Date.now()}`,
          timestamp: analysis.timestamp,
          ticker: analysis.ticker,
          action: analysis.decision.action,
          amount: analysis.decision.positionSize,
          price: analysis.currentPrice,
          reasoning: analysis.decision.reasoning.join('. '),
          confidence: analysis.decision.confidence,
          wouldHaveExecuted: analysis.decision.confidence >= 7 && managedWallet.balance >= 10
        };

        setPaperTrades(prev => [paperTrade, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Error loading analysis data:', error);
      // Fall back to mock data
      loadMockAnalysisData();
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  // Generate mock analysis data for demo (fallback)
  const loadMockAnalysisData = () => {
    const mockAnalysis: TokenAnalysis = {
      ticker: 'SNEK',
      timestamp: new Date().toISOString(),
      currentPrice: 0.001234,
      priceChange24h: 5.67,

      technicalAnalysis: {
        rsi: {
          '15m': 56.8,
          '1h': 73.2,
          '4h': 68.9,
          signal: 'neutral'
        },
        macd: {
          signal: 'bullish',
          histogram: 0.0023
        },
        bollinger: {
          position: 'middle',
          squeeze: false
        },
        support: 0.001180,
        resistance: 0.001290
      },

      sentiment: {
        twitter: {
          score: 0.72,
          volume: 156,
          trending: true
        },
        overall: 'bullish'
      },

      decision: {
        action: 'BUY',
        confidence: 8,
        reasoning: [
          'RSI showing neutral to bullish momentum across timeframes',
          'MACD crossover indicates bullish trend continuation',
          'Strong Twitter sentiment with increasing volume',
          'Price holding above key support level',
          'Good liquidity for position entry'
        ],
        targetPrice: 0.001350,
        stopLoss: 0.001150,
        positionSize: 75
      },

      risk: {
        level: 'medium',
        factors: [
          'Moderate volatility in recent sessions',
          'Some resistance at current levels'
        ],
        liquidityScore: 78
      }
    };

    setCurrentAnalysis(mockAnalysis);
    setAnalysisHistory(prev => [mockAnalysis, ...prev.slice(0, 9)]);

    // Generate mock paper trade
    const mockPaperTrade: PaperTrade = {
      id: `trade_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ticker: mockAnalysis.ticker,
      action: mockAnalysis.decision.action,
      amount: mockAnalysis.decision.positionSize,
      price: mockAnalysis.currentPrice,
      reasoning: mockAnalysis.decision.reasoning.join('. '),
      confidence: mockAnalysis.decision.confidence,
      wouldHaveExecuted: mockAnalysis.decision.confidence >= 7
    };

    setPaperTrades(prev => [mockPaperTrade, ...prev.slice(0, 9)]);
  };

  const loadTradingStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check for active CNT trading session from hosted CNT API
      const cntResponse = await fetch(`https://cnt-trading-api-production.up.railway.app/api/trading/status/${managedWallet.walletId}`);

      if (cntResponse.ok) {
        const cntData = await cntResponse.json();

        if (cntData.success && cntData.data.session?.isActive) {
          setTradingSession({
            sessionId: cntData.data.session.sessionId,
            isActive: true,
            type: 'cnt',
            tradesExecuted: cntData.data.stats?.tradesExecuted || 0,
            totalVolume: cntData.data.stats?.totalVolume || 0,
            pnl: cntData.data.stats?.pnl || 0,
            startedAt: cntData.data.session.startedAt
          });

          setTradingConfig({
            type: 'cnt',
            isActive: true,
            settings: cntData.data.session.settings
          });
          return;
        }
      } else if (cntResponse.status === 404) {
        // Wallet not found in CNT system - this is normal for existing wallets
        console.log(`[CNT] Wallet ${managedWallet.walletId} not found in CNT trading system`);
      }

      // Check for Strike Finance trading (existing API)
      // TODO: Integrate with existing Strike Finance status check

      // No active sessions found - set default to CNT trading
      setTradingSession(null);
      setTradingConfig({
        type: 'cnt',
        isActive: false,
        settings: {
          maxDailyTrades: 10,
          maxPositionSize: 100,
          riskLevel: 'moderate'
        }
      });

    } catch (error) {
      console.error('Error loading trading status:', error);
      // Don't show error for network issues - just set default state
      setTradingSession(null);
      setTradingConfig({
        type: 'cnt',
        isActive: false,
        settings: {
          maxDailyTrades: 10,
          maxPositionSize: 100,
          riskLevel: 'moderate'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (config: TradingTypeConfig) => {
    setTradingConfig(config);
  };

  const handleStartTrading = async (type: 'strike' | 'cnt') => {
    try {
      setIsLoading(true);
      setError(null);

      if (type === 'cnt') {
        // First, try to create/register the wallet in our CNT system if it doesn't exist
        try {
          const walletResponse = await fetch('https://cnt-trading-api-production.up.railway.app/api/wallets/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: managedWallet.userId,
              displayName: `Managed Wallet ${managedWallet.address.substring(0, 12)}`
            })
          });

          if (walletResponse.ok) {
            console.log('[CNT] Wallet registered in CNT trading system');
          }
        } catch (walletError) {
          // Wallet might already exist, continue with trading start
          console.log('[CNT] Wallet may already exist, continuing...');
        }

        // Start CNT trading using our hosted API
        const response = await fetch('https://cnt-trading-api-production.up.railway.app/api/trading/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: managedWallet.userId,
            walletId: managedWallet.walletId,
            settings: tradingConfig?.settings
          })
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to start CNT trading');
        }

        setTradingSession({
          sessionId: data.data.sessionId,
          isActive: true,
          type: 'cnt',
          tradesExecuted: 0,
          totalVolume: 0,
          pnl: 0,
          startedAt: data.data.startedAt
        });

      } else if (type === 'strike') {
        // Start Strike Finance trading (integrate with existing system)
        // TODO: Integrate with existing Strike Finance API
        console.log('Starting Strike Finance trading...');
      }

      // Update config to active
      if (tradingConfig) {
        setTradingConfig({
          ...tradingConfig,
          isActive: true
        });
      }

    } catch (error) {
      console.error('Error starting trading:', error);
      setError(error instanceof Error ? error.message : 'Failed to start trading');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTrading = async (type: 'strike' | 'cnt') => {
    try {
      setIsLoading(true);
      setError(null);

      if (type === 'cnt') {
        // Stop CNT trading using hosted API
        const response = await fetch('https://cnt-trading-api-production.up.railway.app/api/trading/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletId: managedWallet.walletId
          })
        });

        const data = await response.json();
        
        if (!data.success) {
          throw new Error('Failed to stop CNT trading');
        }

      } else if (type === 'strike') {
        // Stop Strike Finance trading
        // TODO: Integrate with existing Strike Finance API
        console.log('Stopping Strike Finance trading...');
      }

      // Update session and config
      setTradingSession(null);
      if (tradingConfig) {
        setTradingConfig({
          ...tradingConfig,
          isActive: false
        });
      }

    } catch (error) {
      console.error('Error stopping trading:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop trading');
    } finally {
      setIsLoading(false);
    }
  };

  const executeManualTrade = async (ticker: string, direction: 'buy' | 'sell', amount: number) => {
    try {
      setIsLoading(true);
      
      if (tradingConfig?.type === 'cnt') {
        // Execute CNT manual trade using hosted API
        const response = await fetch('https://cnt-trading-api-production.up.railway.app/api/trading/manual-trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletId: managedWallet.walletId,
            ticker,
            direction,
            amount: Math.round(amount)
          })
        });

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to execute trade');
        }

        // Refresh trading status
        await loadTradingStatus();
        
      } else if (tradingConfig?.type === 'strike') {
        // Execute Strike Finance trade
        // TODO: Integrate with existing Strike Finance API
        console.log('Executing Strike Finance trade...');
      }

    } catch (error) {
      console.error('Error executing manual trade:', error);
      setError(error instanceof Error ? error.message : 'Failed to execute trade');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streamlined Wallet Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Wallet className="h-5 w-5" />
            Wallet Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-sm font-medium text-blue-700 mb-1">Balance</div>
              <div className="text-2xl font-bold text-blue-900">{managedWallet.balance.toFixed(2)} ADA</div>
              <div className={`text-xs mt-1 ${managedWallet.balance < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                {managedWallet.balance < 10 ? 'Paper Trading Mode' : 'Live Trading Ready'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm font-medium text-blue-700 mb-1">Trading Status</div>
              <div className={`text-2xl font-bold ${tradingSession?.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                {tradingSession?.isActive ? 'Active' : 'Paused'}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {tradingSession?.type === 'cnt' ? 'CNT Trading' :
                 tradingSession?.type === 'strike' ? 'Strike Finance' : 'Ready to Start'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm font-medium text-blue-700 mb-1">Today's Activity</div>
              <div className="text-2xl font-bold text-blue-900">{tradingSession?.tradesExecuted || 0}</div>
              <div className="text-xs text-blue-600 mt-1">
                {tradingSession?.totalVolume || 0} ADA Volume
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simplified Interface - Just Analysis and Settings */}
      <Tabs defaultValue="analysis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analysis">
            <Brain className="h-4 w-4 mr-2" />
            🤖 Bot Analysis
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            ⚙️ Wallet Settings
          </TabsTrigger>
        </TabsList>

        {/* Removed trading tab - users see analysis directly and understand what's happening */}

        <TabsContent value="analysis" className="space-y-6">
          <TradingAnalysisPanel
            isActive={tradingSession?.isActive || false}
            currentAnalysis={currentAnalysis || undefined}
            analysisHistory={analysisHistory}
            onRefresh={loadAnalysisData}
            isLoading={isAnalysisLoading}
            lastUpdated={lastAnalysisUpdate || undefined}
            nextUpdate={lastAnalysisUpdate ? new Date(new Date(lastAnalysisUpdate).getTime() + 30000).toISOString() : undefined}
          />
        </TabsContent>

        {/* Removed paper mode tab - users see real analysis and understand the bot's decisions directly */}

        <TabsContent value="settings" className="space-y-6">
          {/* Simple Trading Control */}
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Bot className="h-5 w-5" />
                🤖 MISTER Trading Bot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${tradingSession?.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                    {tradingSession?.isActive ? '🟢 ACTIVE' : '⏸️ PAUSED'}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {managedWallet.balance < 10
                      ? '📊 Paper Trading Mode - Bot shows what it would do (no real trades)'
                      : '💰 Live Trading Mode - Bot can execute real trades'
                    }
                  </p>

                  <Button
                    onClick={() => {
                      if (tradingSession?.isActive) {
                        handleStopTrading('cnt');
                      } else {
                        handleStartTrading('cnt');
                      }
                    }}
                    variant={tradingSession?.isActive ? "destructive" : "default"}
                    size="lg"
                    className="w-full"
                  >
                    {tradingSession?.isActive ? '⏹️ Stop Bot' : '▶️ Start Bot'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                💼 Wallet Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Balance</h3>
                      <p className="text-2xl font-bold text-blue-600">{managedWallet.balance.toFixed(2)} ADA</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Trading Mode</h3>
                      <p className={`text-lg font-medium ${managedWallet.balance < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                        {managedWallet.balance < 10 ? '📊 Paper Trading' : '💰 Live Trading'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Wallet Address</h3>
                  <p className="text-sm text-gray-600 font-mono break-all bg-white p-2 rounded border">
                    {managedWallet.address}
                  </p>
                </div>

                {managedWallet.balance < 10 && (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <h3 className="font-medium text-orange-900 mb-2">💡 Want Live Trading?</h3>
                    <p className="text-sm text-orange-700 mb-3">
                      Add at least 10 ADA to your wallet to enable live trading. The bot will automatically switch from paper mode to live trading.
                    </p>
                    <p className="text-xs text-orange-600">
                      Send ADA to: {managedWallet.address}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
