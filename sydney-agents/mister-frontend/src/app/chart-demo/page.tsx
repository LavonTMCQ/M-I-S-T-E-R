"use client";

import React from 'react';
import { EnhancedADAChart, CompactADAChart } from '@/components/charts/SingleADAChart';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Zap, Settings } from "lucide-react";

export default function ChartDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
            <BarChart3 className="w-10 h-10 text-blue-500" />
            Enhanced Chart Features
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Interactive ADA/USD charts with timeframe selection, chart types, technical indicators, and more.
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <Settings className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold text-white mb-1">Timeframe Control</h3>
              <p className="text-sm text-gray-400">1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold text-white mb-1">Chart Types</h3>
              <p className="text-sm text-gray-400">Candles, Bars, Line, Area</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="font-semibold text-white mb-1">Indicators</h3>
              <p className="text-sm text-gray-400">RSI, MACD, Volume</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Chart */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-blue-600">
              Enhanced
            </Badge>
            <h2 className="text-xl font-semibold text-white">Full-Featured Chart</h2>
          </div>
          <EnhancedADAChart />
        </div>

        {/* Compact Chart */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Compact
            </Badge>
            <h2 className="text-xl font-semibold text-white">Trading Page Chart</h2>
          </div>
          <CompactADAChart />
        </div>

        {/* Instructions */}
        <Card className="bg-gray-800/30 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-300">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <p className="font-medium">Timeframe Selection</p>
                <p className="text-sm text-gray-400">Use the dropdown to switch between different timeframes (1m to 1W)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <p className="font-medium">Chart Type</p>
                <p className="text-sm text-gray-400">Toggle between Candles, Bars, Line, and Area chart styles</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <p className="font-medium">Technical Indicators</p>
                <p className="text-sm text-gray-400">Enable/disable RSI, MACD, and Volume indicators</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <div>
                <p className="font-medium">Fullscreen Mode</p>
                <p className="text-sm text-gray-400">Click the maximize button for fullscreen chart viewing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
