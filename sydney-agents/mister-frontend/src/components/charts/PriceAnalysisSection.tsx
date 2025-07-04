"use client";

import React, { useState } from 'react';
import { CleanADAPriceAnalysis } from './SingleADAChart';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Target,
  AlertTriangle,
  Info
} from "lucide-react";

interface PriceAnalysisSectionProps {
  className?: string;
}

// Technical indicators data (mock)
const technicalIndicators = {
  rsi: { value: 65.4, signal: 'neutral', description: 'Relative Strength Index' },
  macd: { value: 0.0023, signal: 'bullish', description: 'MACD Signal Line' },
  sma20: { value: 0.4892, signal: 'bullish', description: '20-day Simple Moving Average' },
  sma50: { value: 0.4756, signal: 'bullish', description: '50-day Simple Moving Average' },
  bollinger: { upper: 0.5234, middle: 0.4892, lower: 0.4550, signal: 'neutral' },
  volume: { value: 1250000, avgVolume: 980000, signal: 'bullish' }
};

// Support and resistance levels
const supportResistance = {
  resistance: [0.5300, 0.5150, 0.5050],
  support: [0.4750, 0.4650, 0.4500],
  current: 0.4920
};

// Market sentiment data
const marketSentiment = {
  overall: 'bullish',
  fear_greed: 72,
  social_sentiment: 'positive',
  whale_activity: 'accumulating'
};

export function PriceAnalysisSection({ className = '' }: PriceAnalysisSectionProps) {
  return (
    <CleanADAPriceAnalysis className={className} />
  );
}

// Keep the old implementation as backup
export function PriceAnalysisSectionLegacy({ className = '' }: PriceAnalysisSectionProps) {

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'bullish': return 'text-green-600 bg-green-100';
      case 'bearish': return 'text-red-600 bg-red-100';
      case 'neutral': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'bullish': return <TrendingUp className="w-3 h-3" />;
      case 'bearish': return <TrendingDown className="w-3 h-3" />;
      case 'neutral': return <Activity className="w-3 h-3" />;
      default: return <Info className="w-3 h-3" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Legacy implementation with mock data */}

      {/* Analysis Tabs */}
      <Tabs defaultValue="technical" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="technical">Technical Analysis</TabsTrigger>
          <TabsTrigger value="levels">Support & Resistance</TabsTrigger>
          <TabsTrigger value="sentiment">Market Sentiment</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Technical Analysis Tab */}
        <TabsContent value="technical" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* RSI */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  RSI (14)
                  <Badge className={getSignalColor(technicalIndicators.rsi.signal)}>
                    {getSignalIcon(technicalIndicators.rsi.signal)}
                    {technicalIndicators.rsi.signal}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{technicalIndicators.rsi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {technicalIndicators.rsi.description}
                </p>
              </CardContent>
            </Card>

            {/* MACD */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  MACD
                  <Badge className={getSignalColor(technicalIndicators.macd.signal)}>
                    {getSignalIcon(technicalIndicators.macd.signal)}
                    {technicalIndicators.macd.signal}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{technicalIndicators.macd.value.toFixed(4)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {technicalIndicators.macd.description}
                </p>
              </CardContent>
            </Card>

            {/* SMA 20 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  SMA 20
                  <Badge className={getSignalColor(technicalIndicators.sma20.signal)}>
                    {getSignalIcon(technicalIndicators.sma20.signal)}
                    {technicalIndicators.sma20.signal}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${technicalIndicators.sma20.value.toFixed(4)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {technicalIndicators.sma20.description}
                </p>
              </CardContent>
            </Card>

            {/* SMA 50 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  SMA 50
                  <Badge className={getSignalColor(technicalIndicators.sma50.signal)}>
                    {getSignalIcon(technicalIndicators.sma50.signal)}
                    {technicalIndicators.sma50.signal}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${technicalIndicators.sma50.value.toFixed(4)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {technicalIndicators.sma50.description}
                </p>
              </CardContent>
            </Card>

            {/* Bollinger Bands */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  Bollinger Bands
                  <Badge className={getSignalColor(technicalIndicators.bollinger.signal)}>
                    {getSignalIcon(technicalIndicators.bollinger.signal)}
                    {technicalIndicators.bollinger.signal}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Upper:</span>
                    <span className="font-medium">${technicalIndicators.bollinger.upper.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Middle:</span>
                    <span className="font-medium">${technicalIndicators.bollinger.middle.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lower:</span>
                    <span className="font-medium">${technicalIndicators.bollinger.lower.toFixed(4)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Volume */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  Volume
                  <Badge className={getSignalColor(technicalIndicators.volume.signal)}>
                    {getSignalIcon(technicalIndicators.volume.signal)}
                    {technicalIndicators.volume.signal}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(technicalIndicators.volume.value / 1000000).toFixed(2)}M
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {(technicalIndicators.volume.avgVolume / 1000000).toFixed(2)}M
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Support & Resistance Tab */}
        <TabsContent value="levels" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resistance Levels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-500" />
                  Resistance Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {supportResistance.resistance.map((level, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span className="text-sm font-medium">R{index + 1}</span>
                      <span className="font-bold text-red-600">${level.toFixed(4)}</span>
                      <span className="text-xs text-muted-foreground">
                        {((level - supportResistance.current) / supportResistance.current * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Support Levels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  Support Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {supportResistance.support.map((level, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm font-medium">S{index + 1}</span>
                      <span className="font-bold text-green-600">${level.toFixed(4)}</span>
                      <span className="text-xs text-muted-foreground">
                        {((supportResistance.current - level) / supportResistance.current * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Price Position */}
          <Card>
            <CardHeader>
              <CardTitle>Current Price Position</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-4 bg-blue-50 rounded">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ${supportResistance.current.toFixed(4)}
                  </div>
                  <p className="text-sm text-muted-foreground">Current ADA/USD Price</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Sentiment Tab */}
        <TabsContent value="sentiment" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Sentiment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Overall Sentiment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-lg font-bold capitalize text-green-600">
                    {marketSentiment.overall}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Fear & Greed Index */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Fear & Greed Index</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {marketSentiment.fear_greed}
                </div>
                <p className="text-xs text-muted-foreground">Greed</p>
              </CardContent>
            </Card>

            {/* Social Sentiment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Social Sentiment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="font-bold capitalize text-blue-600">
                    {marketSentiment.social_sentiment}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Whale Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Whale Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <span className="font-bold capitalize text-purple-600">
                    {marketSentiment.whale_activity}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Market Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <h4 className="font-semibold text-green-800 mb-2">Bullish Signals</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Price above 20-day and 50-day moving averages</li>
                    <li>• MACD showing bullish crossover</li>
                    <li>• Volume above average indicating strong interest</li>
                    <li>• Overall market sentiment remains positive</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="font-semibold text-yellow-800 mb-2">Watch Points</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• RSI approaching overbought territory (65.4)</li>
                    <li>• Key resistance at $0.5300 level</li>
                    <li>• Monitor for any bearish divergence signals</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-semibold text-blue-800 mb-2">Key Levels to Watch</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Next Resistance:</span>
                      <span className="ml-2 font-bold">$0.5050</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Key Support:</span>
                      <span className="ml-2 font-bold">$0.4750</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
