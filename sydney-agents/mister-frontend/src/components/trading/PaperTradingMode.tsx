"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  Play, 
  Pause, 
  TrendingUp, 
  TrendingDown,
  Info,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  BarChart3
} from "lucide-react";

export interface PaperTrade {
  id: string;
  timestamp: string;
  ticker: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount: number;
  price: number;
  reasoning: string;
  confidence: number;
  wouldHaveExecuted: boolean;
}

interface PaperTradingModeProps {
  walletBalance: number;
  isActive: boolean;
  paperTrades: PaperTrade[];
  onTogglePaperTrading: () => void;
  onUpgradeToLive: () => void;
}

export function PaperTradingMode({
  walletBalance,
  isActive,
  paperTrades,
  onTogglePaperTrading,
  onUpgradeToLive
}: PaperTradingModeProps) {
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const isPaperMode = walletBalance < 10; // Less than 10 ADA = paper mode
  const totalPaperValue = paperTrades.reduce((sum, trade) => {
    return sum + (trade.action === 'BUY' ? trade.amount : 0);
  }, 0);

  const successfulTrades = paperTrades.filter(trade => trade.wouldHaveExecuted);
  const winRate = paperTrades.length > 0 ? (successfulTrades.length / paperTrades.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Paper Trading Status */}
      {isPaperMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-blue-800">Paper Trading Mode Active</strong>
                    <p className="text-sm mt-1 text-blue-700">
                      Wallet balance too low for live trading. Bot will show what trades it would make.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUpgradePrompt(true)}
                    className="ml-4"
                  >
                    Fund Wallet
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade to Live Trading Prompt */}
      {showUpgradePrompt && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="space-y-3 flex-1">
                <div>
                  <strong className="text-green-800">Ready to Go Live?</strong>
                  <p className="text-sm mt-1 text-green-700">
                    Add at least 10 ADA to your wallet to enable live trading with real funds.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={onUpgradeToLive}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Fund Wallet & Go Live
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUpgradePrompt(false)}
                  >
                    Continue Paper Trading
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paper Trading Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {isPaperMode ? 'Paper Trading' : 'Live Trading'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={isPaperMode ? "secondary" : "default"}>
                {isPaperMode ? 'Paper Mode' : 'Live Mode'}
              </Badge>
              <Button
                variant={isActive ? "destructive" : "default"}
                size="sm"
                onClick={onTogglePaperTrading}
              >
                {isActive ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Trading
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Trading
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {paperTrades.length}
              </div>
              <div className="text-sm text-muted-foreground">
                {isPaperMode ? 'Paper Trades' : 'Total Trades'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {totalPaperValue.toFixed(0)} ADA
              </div>
              <div className="text-sm text-muted-foreground">
                {isPaperMode ? 'Paper Volume' : 'Total Volume'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {walletBalance.toFixed(2)} ADA
              </div>
              <div className="text-sm text-muted-foreground">Wallet Balance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Paper Trades */}
      {paperTrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {isPaperMode ? 'Simulated Trades' : 'Recent Trades'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paperTrades.slice(0, 5).map((trade) => (
                <div 
                  key={trade.id}
                  className={`p-4 rounded-lg border ${
                    isPaperMode ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          trade.action === 'BUY' ? 'default' : 
                          trade.action === 'SELL' ? 'destructive' : 
                          'secondary'
                        }
                      >
                        {trade.action}
                      </Badge>
                      <span className="font-medium">{trade.ticker}</span>
                      <span className="text-sm text-muted-foreground">
                        {trade.amount} ADA @ ${trade.price.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {trade.confidence}/10
                      </span>
                      {isPaperMode && (
                        <Badge variant="outline" className="text-xs">
                          {trade.wouldHaveExecuted ? 'Would Execute' : 'Would Skip'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <strong>Reasoning:</strong> {trade.reasoning}
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(trade.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paper Trading Benefits */}
      {isPaperMode && !isActive && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Info className="h-5 w-5" />
              Paper Trading Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Learn Without Risk</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• See real trading decisions</li>
                  <li>• Understand bot reasoning</li>
                  <li>• Test strategies safely</li>
                  <li>• Build confidence</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Real Market Data</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Live price analysis</li>
                  <li>• Actual technical indicators</li>
                  <li>• Real sentiment data</li>
                  <li>• Market timing practice</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Ready to go live?</strong> Add at least 10 ADA to your wallet and the bot will automatically switch to live trading mode.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funding Instructions */}
      {isPaperMode && showUpgradePrompt && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Wallet className="h-5 w-5" />
              Fund Your Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Send ADA to your wallet:</h4>
                <div className="p-3 bg-gray-100 rounded font-mono text-sm break-all">
                  {/* This would be the actual wallet address */}
                  addr1q82j3cnhky8u0w4wa0ntsgeypraf24jxz5qr6wgwcy97u7t8pvpwk4ker5z2lmfsjlvx0y2tex68ahdwql9xkm9urxks9n2nl8
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Minimum Requirements:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Minimum: 10 ADA</li>
                    <li>• Recommended: 50+ ADA</li>
                    <li>• For best results: 100+ ADA</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">What Happens Next:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Auto-switch to live mode</li>
                    <li>• Real trades executed</li>
                    <li>• Same analysis & reasoning</li>
                    <li>• Full transparency</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
