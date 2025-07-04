"use client";

import * as React from "react";
import { Pie, PieChart, Cell } from "recharts";
import { Target, TrendingUp, TrendingDown } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { winLossChartConfig } from "@/lib/charts/chartConfig";

// Empty win/loss data - will be populated with real wallet data
const emptyWinLossData: Array<{ name: string; value: number; percentage: number; color: string }> = [
  { name: "Winning Trades", value: 0, percentage: 0, color: "hsl(var(--chart-1))" },
  { name: "Losing Trades", value: 0, percentage: 0, color: "hsl(var(--chart-2))" },
  { name: "Breakeven", value: 0, percentage: 0, color: "hsl(var(--chart-3))" },
];

interface WinLossChartProps {
  data?: typeof emptyWinLossData;
  className?: string;
  isLoading?: boolean;
  error?: string | null;
  showPercentages?: boolean;
}

export function WinLossChart({
  data = emptyWinLossData,
  className = "",
  isLoading = false,
  error = null,
  showPercentages = true
}: WinLossChartProps) {
  
  // Calculate totals
  const totalTrades = data.reduce((sum, item) => sum + item.value, 0);
  const winningTrades = data.find(item => item.name === "Winning Trades")?.value || 0;
  const losingTrades = data.find(item => item.name === "Losing Trades")?.value || 0;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Win/Loss Ratio</CardTitle>
          <CardDescription>Loading trade statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Win/Loss Ratio</CardTitle>
          <CardDescription>Error loading trade statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-center">
            <div>
              <Target className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0 || totalTrades === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Win/Loss Ratio</CardTitle>
          <CardDescription>No trade data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-center">
            <div>
              <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Trade statistics will appear here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Win/Loss Ratio
          </CardTitle>
          <CardDescription>
            {winRate.toFixed(1)}% win rate • {totalTrades} total trades
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {winRate >= 60 ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600" />
          )}
          <span className={`text-sm font-medium ${winRate >= 60 ? "text-green-600" : "text-red-600"}`}>
            {winRate >= 60 ? "Strong" : winRate >= 50 ? "Good" : "Needs Improvement"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={winLossChartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={40}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    const item = data.find(d => d.name === name);
                    return [
                      `${value} trades (${item?.percentage.toFixed(1)}%)`,
                      name
                    ];
                  }}
                />
              }
            />
            <ChartLegend 
              content={<ChartLegendContent />}
              wrapperStyle={{ paddingTop: "20px" }}
            />
          </PieChart>
        </ChartContainer>
        
        {/* Win/Loss Summary */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {winningTrades}
            </div>
            <p className="text-xs text-muted-foreground">Winning Trades</p>
            <p className="text-xs text-green-600 font-medium">
              {data.find(item => item.name === "Winning Trades")?.percentage.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {losingTrades}
            </div>
            <p className="text-xs text-muted-foreground">Losing Trades</p>
            <p className="text-xs text-red-600 font-medium">
              {data.find(item => item.name === "Losing Trades")?.percentage.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {data.find(item => item.name === "Breakeven")?.value || 0}
            </div>
            <p className="text-xs text-muted-foreground">Breakeven</p>
            <p className="text-xs text-gray-600 font-medium">
              {data.find(item => item.name === "Breakeven")?.percentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Performance Rating:</span>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                winRate >= 70 ? "bg-green-500" : 
                winRate >= 60 ? "bg-yellow-500" : 
                winRate >= 50 ? "bg-orange-500" : "bg-red-500"
              }`} />
              <span className={`text-sm font-medium ${
                winRate >= 70 ? "text-green-600" : 
                winRate >= 60 ? "text-yellow-600" : 
                winRate >= 50 ? "text-orange-600" : "text-red-600"
              }`}>
                {winRate >= 70 ? "Excellent" : 
                 winRate >= 60 ? "Good" : 
                 winRate >= 50 ? "Average" : "Poor"}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  winRate >= 70 ? "bg-green-500" : 
                  winRate >= 60 ? "bg-yellow-500" : 
                  winRate >= 50 ? "bg-orange-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(winRate, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
