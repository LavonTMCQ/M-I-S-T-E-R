"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartDataDebuggerProps {
  chartData: any[];
  trades: any[];
}

export function ChartDataDebugger({ chartData, trades }: ChartDataDebuggerProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">🔍 Chart Data Debugger</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div>
          <strong>Chart Data:</strong> {chartData?.length || 0} candles
          {chartData?.length > 0 && (
            <div className="ml-4 mt-1 space-y-1">
              <div>First: {JSON.stringify(chartData[0])}</div>
              <div>Last: {JSON.stringify(chartData[chartData.length - 1])}</div>
              <div>Sample keys: {Object.keys(chartData[0] || {}).join(', ')}</div>
            </div>
          )}
        </div>
        
        <div>
          <strong>Trades Data:</strong> {trades?.length || 0} trades
          {trades?.length > 0 && (
            <div className="ml-4 mt-1 space-y-1">
              <div>First: {JSON.stringify(trades[0])}</div>
              <div>Sample keys: {Object.keys(trades[0] || {}).join(', ')}</div>
            </div>
          )}
        </div>
        
        <div>
          <strong>Data Types:</strong>
          <div className="ml-4">
            Chart Data Type: {typeof chartData} (Array: {Array.isArray(chartData) ? 'Yes' : 'No'})
          </div>
          <div className="ml-4">
            Trades Type: {typeof trades} (Array: {Array.isArray(trades) ? 'Yes' : 'No'})
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
