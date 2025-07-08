"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  Twitter,
  Target,
  Clock,
  BarChart3,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  RefreshCw
} from "lucide-react";

export interface TokenAnalysis {
  ticker: string;
  timestamp: string;
  currentPrice: number;
  priceChange24h: number;
  
  // Technical Analysis
  technicalAnalysis: {
    rsi: {
      '15m': number;
      '1h': number;
      '4h': number;
      signal: 'oversold' | 'neutral' | 'overbought';
    };
    macd: {
      signal: 'bullish' | 'bearish' | 'neutral';
      histogram: number;
    };
    bollinger: {
      position: 'upper' | 'middle' | 'lower';
      squeeze: boolean;
    };
    support: number;
    resistance: number;
  };
  
  // Sentiment Analysis
  sentiment: {
    twitter: {
      score: number;
      volume: number;
      trending: boolean;
    };
    overall: 'bullish' | 'bearish' | 'neutral';
  };
  
  // Trading Decision
  decision: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string[];
    targetPrice?: number;
    stopLoss?: number;
    positionSize: number;
  };
  
  // Risk Assessment
  risk: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    liquidityScore: number;
  };
}

interface TradingAnalysisPanelProps {
  isActive: boolean;
  currentAnalysis?: TokenAnalysis;
  analysisHistory: TokenAnalysis[];
  onRefresh?: () => void;
  isLoading?: boolean;
  lastUpdated?: string;
  nextUpdate?: string;
}

export function TradingAnalysisPanel({
  isActive,
  currentAnalysis,
  analysisHistory,
  onRefresh,
  isLoading = false,
  lastUpdated,
  nextUpdate
}: TradingAnalysisPanelProps) {
  const [showNewDataNotification, setShowNewDataNotification] = useState(false);
  const [previousAnalysisId, setPreviousAnalysisId] = useState<string | null>(null);

  // Show notification when new analysis data arrives
  useEffect(() => {
    if (currentAnalysis && currentAnalysis.timestamp !== previousAnalysisId) {
      if (previousAnalysisId !== null) {
        setShowNewDataNotification(true);
        setTimeout(() => setShowNewDataNotification(false), 3000);
      }
      setPreviousAnalysisId(currentAnalysis.timestamp);
    }
  }, [currentAnalysis, previousAnalysisId]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<TokenAnalysis | null>(null);

  useEffect(() => {
    if (currentAnalysis) {
      setSelectedAnalysis(currentAnalysis);
    }
  }, [currentAnalysis]);

  const analysis = selectedAnalysis || currentAnalysis;

  const getDecisionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'text-green-500';
      case 'SELL': return 'text-red-500';
      case 'HOLD': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getDecisionIcon = (action: string) => {
    switch (action) {
      case 'BUY': return <TrendingUp className="h-4 w-4" />;
      case 'SELL': return <TrendingDown className="h-4 w-4" />;
      case 'HOLD': return <Pause className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-500 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-500 bg-red-50 border-red-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  // Show analysis data if available, regardless of trading state
  // Only show placeholder if no analysis data is available

  if (!analysis) {
    return (
      <div className="space-y-6">
        {/* Loading State */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 animate-pulse text-blue-600" />
              MISTER Analysis Engine
              <Badge variant="outline" className="ml-auto border-blue-300 text-blue-700">
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                Analyzing Markets...
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Scanning Cardano Ecosystem</h3>
              <p className="text-blue-600 mb-1">Analyzing technical indicators across multiple timeframes</p>
              <p className="text-sm text-blue-500">Gathering sentiment data from social media</p>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-blue-600">Technical Analysis</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Twitter className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-blue-600">Sentiment Analysis</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-blue-600">Risk Assessment</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-blue-600">Decision Engine</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New Data Notification */}
      {showNewDataNotification && (
        <Card className="border-green-400 bg-gradient-to-r from-green-100 to-emerald-100 animate-pulse">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
              <div>
                <p className="text-sm font-medium text-green-900">
                  🎉 New Analysis Available!
                </p>
                <p className="text-xs text-green-700">
                  Fresh market analysis and trading decision just arrived
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Update Status */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {isLoading ? 'Updating Analysis...' : 'Analysis Current'}
                </p>
                <p className="text-xs text-blue-700">
                  {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : 'Loading...'}
                  {nextUpdate && !isLoading && (
                    <span className="ml-2">• Next update: {new Date(nextUpdate).toLocaleTimeString()}</span>
                  )}
                </p>
                {/* Progress bar for next update */}
                {nextUpdate && lastUpdated && !isLoading && (
                  <div className="mt-2">
                    <div className="w-full bg-blue-200 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, ((new Date().getTime() - new Date(lastUpdated).getTime()) / 30000) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-blue-600"></div>
              )}
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Updating...' : 'Refresh'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discord-Style Analysis Card */}
      <Card className={`border-l-4 ${
        analysis.decision.action === 'BUY' ? 'border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50' :
        analysis.decision.action === 'SELL' ? 'border-l-red-500 bg-gradient-to-r from-red-50 to-rose-50' :
        'border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50'
      } shadow-lg ${isLoading ? 'opacity-75' : ''}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                analysis.decision.action === 'BUY' ? 'bg-green-100' :
                analysis.decision.action === 'SELL' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                <Brain className={`h-6 w-6 ${
                  analysis.decision.action === 'BUY' ? 'text-green-600' :
                  analysis.decision.action === 'SELL' ? 'text-red-600' : 'text-yellow-600'
                }`} />
              </div>
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  🤖 MISTER Analysis: ${analysis.ticker}
                  <Badge className={`${
                    analysis.decision.action === 'BUY' ? 'bg-green-500 hover:bg-green-600' :
                    analysis.decision.action === 'SELL' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-yellow-500 hover:bg-yellow-600'
                  } text-white font-bold px-3 py-1`}>
                    {getDecisionIcon(analysis.decision.action)}
                    {analysis.decision.action}
                  </Badge>
                  {/* Show NEW badge if analysis is less than 2 minutes old */}
                  {new Date().getTime() - new Date(analysis.timestamp).getTime() < 120000 && (
                    <Badge className="bg-blue-500 text-white text-xs px-2 py-1 animate-pulse">
                      NEW
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {new Date(analysis.timestamp).toLocaleString()}
                  <span className="mx-2">•</span>
                  <span className="font-medium">Confidence: {analysis.decision.confidence}/10</span>
                </p>
              </div>
            </div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Discord-Style Price & Decision Overview */}
          <div className="bg-white/50 rounded-lg p-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Price Section */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">CURRENT PRICE</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  ${analysis.currentPrice.toFixed(4)}
                </div>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                  analysis.priceChange24h >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {analysis.priceChange24h >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {analysis.priceChange24h >= 0 ? '+' : ''}{analysis.priceChange24h.toFixed(2)}%
                </div>
              </div>

              {/* Decision Section */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    analysis.decision.action === 'BUY' ? 'bg-green-500' :
                    analysis.decision.action === 'SELL' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-600">TRADING SIGNAL</span>
                </div>
                <div className={`text-3xl font-bold mb-1 flex items-center justify-center gap-2 ${
                  analysis.decision.action === 'BUY' ? 'text-green-600' :
                  analysis.decision.action === 'SELL' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {getDecisionIcon(analysis.decision.action)}
                  {analysis.decision.action}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <div className="flex">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full mx-0.5 ${
                          i < analysis.decision.confidence
                            ? analysis.decision.action === 'BUY' ? 'bg-green-500' :
                              analysis.decision.action === 'SELL' ? 'bg-red-500' : 'bg-yellow-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 ml-2">
                    {analysis.decision.confidence}/10
                  </span>
                </div>
              </div>

              {/* Risk Section */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    analysis.risk.level === 'low' ? 'bg-green-500' :
                    analysis.risk.level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-600">RISK LEVEL</span>
                </div>
                <div className={`text-2xl font-bold mb-1 ${
                  analysis.risk.level === 'low' ? 'text-green-600' :
                  analysis.risk.level === 'medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {analysis.risk.level.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600">
                  Liquidity: <span className="font-medium">{analysis.risk.liquidityScore}/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Discord-Style Technical Analysis */}
          <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
            <CardHeader className="bg-slate-100 border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <BarChart3 className="h-5 w-5 text-slate-600" />
                📊 Technical Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* RSI Multi-timeframe */}
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold mb-3 text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    RSI (Relative Strength Index)
                  </h4>
                  <div className="space-y-3">
                    {[
                      { timeframe: '15m', value: analysis.technicalAnalysis.rsi['15m'] },
                      { timeframe: '1h', value: analysis.technicalAnalysis.rsi['1h'] },
                      { timeframe: '4h', value: analysis.technicalAnalysis.rsi['4h'] }
                    ].map(({ timeframe, value }) => (
                      <div key={timeframe} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">{timeframe}:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                value > 70 ? 'bg-red-500' :
                                value < 30 ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold min-w-[40px] ${
                            value > 70 ? 'text-red-600' :
                            value < 30 ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {value.toFixed(1)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            value > 70 ? 'bg-red-100 text-red-700' :
                            value < 30 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {value > 70 ? 'Overbought' : value < 30 ? 'Oversold' : 'Neutral'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Support & Resistance */}
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold mb-3 text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Key Levels & Signals
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-sm font-medium text-green-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Support:
                      </span>
                      <span className="text-sm font-bold text-green-600">
                        ${analysis.technicalAnalysis.support.toFixed(4)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                      <span className="text-sm font-medium text-red-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Resistance:
                      </span>
                      <span className="text-sm font-bold text-red-600">
                        ${analysis.technicalAnalysis.resistance.toFixed(4)}
                      </span>
                    </div>

                    <div className={`flex items-center justify-between p-2 rounded-lg border ${
                      analysis.technicalAnalysis.macd.signal === 'bullish' ? 'bg-green-50 border-green-200' :
                      analysis.technicalAnalysis.macd.signal === 'bearish' ? 'bg-red-50 border-red-200' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <span className={`text-sm font-medium flex items-center gap-2 ${
                        analysis.technicalAnalysis.macd.signal === 'bullish' ? 'text-green-700' :
                        analysis.technicalAnalysis.macd.signal === 'bearish' ? 'text-red-700' :
                        'text-gray-700'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          analysis.technicalAnalysis.macd.signal === 'bullish' ? 'bg-green-500' :
                          analysis.technicalAnalysis.macd.signal === 'bearish' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}></div>
                        MACD:
                      </span>
                      <span className={`text-sm font-bold capitalize ${
                        analysis.technicalAnalysis.macd.signal === 'bullish' ? 'text-green-600' :
                        analysis.technicalAnalysis.macd.signal === 'bearish' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {analysis.technicalAnalysis.macd.signal}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Twitter className="h-4 w-4" />
                Sentiment Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Twitter Sentiment</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Score:</span>
                      <span className={`text-sm font-medium ${analysis.sentiment.twitter.score > 0.6 ? 'text-green-500' : analysis.sentiment.twitter.score < 0.4 ? 'text-red-500' : 'text-gray-500'}`}>
                        {(analysis.sentiment.twitter.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Volume:</span>
                      <span className="text-sm font-medium">{analysis.sentiment.twitter.volume} tweets</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Trending:</span>
                      <span className={`text-sm font-medium ${analysis.sentiment.twitter.trending ? 'text-green-500' : 'text-gray-500'}`}>
                        {analysis.sentiment.twitter.trending ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Overall Sentiment</h4>
                  <div className={`text-lg font-bold px-3 py-2 rounded border ${
                    analysis.sentiment.overall === 'bullish' ? 'text-green-500 bg-green-50 border-green-200' :
                    analysis.sentiment.overall === 'bearish' ? 'text-red-500 bg-red-50 border-red-200' :
                    'text-gray-500 bg-gray-50 border-gray-200'
                  }`}>
                    {analysis.sentiment.overall.toUpperCase()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discord-Style Decision Reasoning */}
          <Card className={`border-l-4 ${
            analysis.decision.action === 'BUY' ? 'border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50' :
            analysis.decision.action === 'SELL' ? 'border-l-red-500 bg-gradient-to-r from-red-50 to-rose-50' :
            'border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50'
          } shadow-lg`}>
            <CardHeader className={`${
              analysis.decision.action === 'BUY' ? 'bg-green-100 border-b border-green-200' :
              analysis.decision.action === 'SELL' ? 'bg-red-100 border-b border-red-200' :
              'bg-yellow-100 border-b border-yellow-200'
            }`}>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className={`h-5 w-5 ${
                  analysis.decision.action === 'BUY' ? 'text-green-600' :
                  analysis.decision.action === 'SELL' ? 'text-red-600' : 'text-yellow-600'
                }`} />
                🎯 Trading Decision & Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Trading Targets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {analysis.decision.targetPrice && (
                  <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-700">TARGET PRICE</span>
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      ${analysis.decision.targetPrice.toFixed(4)}
                    </div>
                  </div>
                )}

                {analysis.decision.stopLoss && (
                  <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm font-medium text-red-700">STOP LOSS</span>
                    </div>
                    <div className="text-xl font-bold text-red-600">
                      ${analysis.decision.stopLoss.toFixed(4)}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-700">POSITION SIZE</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {analysis.decision.positionSize} ADA
                  </div>
                </div>
              </div>

              {/* Bot Reasoning */}
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm mb-4">
                <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  🤖 Bot Analysis & Reasoning:
                </h4>
                <div className="space-y-2">
                  {analysis.decision.reasoning.map((reason, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 bg-green-50 rounded-lg border border-green-100">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-green-800 font-medium">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Factors */}
              {analysis.risk.factors.length > 0 && (
                <div className="bg-white rounded-lg p-5 border border-red-200 shadow-sm">
                  <h4 className="font-semibold mb-3 text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    ⚠️ Risk Factors to Consider:
                  </h4>
                  <div className="space-y-2">
                    {analysis.risk.factors.map((factor, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 bg-red-50 rounded-lg border border-red-100">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-red-800 font-medium">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Analysis History */}
      {analysisHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Analysis History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {analysisHistory.slice(0, 10).map((historyItem, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedAnalysis?.timestamp === historyItem.timestamp ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedAnalysis(historyItem)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{historyItem.ticker}</span>
                        <Badge variant={historyItem.decision.action === 'BUY' ? 'default' : historyItem.decision.action === 'SELL' ? 'destructive' : 'secondary'}>
                          {historyItem.decision.action}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(historyItem.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ${historyItem.currentPrice.toFixed(4)} • {historyItem.decision.confidence}/10 confidence
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
