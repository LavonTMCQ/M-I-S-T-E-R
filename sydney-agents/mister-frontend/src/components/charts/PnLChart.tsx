"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pnlChartConfig } from "@/lib/charts/chartConfig";

// Empty P&L data - will be populated with real wallet data
const emptyPnLData: Array<{ date: string; profit: number; loss: number; net: number }> = [];

interface PnLChartProps {
  data?: typeof emptyPnLData;
  className?: string;
  isLoading?: boolean;
  error?: string | null;
  timeframe?: "daily" | "weekly" | "monthly";
}

export function PnLChart({
  data = emptyPnLData,
  className = "",
  isLoading = false,
  error = null,
  timeframe = "daily"
}: PnLChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = React.useState(timeframe);

  // Process data based on timeframe
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // For now, just return the data as-is for daily view
    // In a real implementation, you'd aggregate by week/month for other timeframes
    return data;
  }, [data, selectedTimeframe]);

  // Calculate summary metrics
  const totalProfit = processedData.reduce((sum, item) => sum + Math.max(0, item.net), 0);
  const totalLoss = processedData.reduce((sum, item) => sum + Math.min(0, item.net), 0);
  const netPnL = totalProfit + totalLoss;
  const winRate = processedData.length > 0 
    ? (processedData.filter(item => item.net > 0).length / processedData.length) * 100 
    : 0;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Profit & Loss</CardTitle>
          <CardDescription>Loading P&L data...</CardDescription>
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
          <CardTitle>Profit & Loss</CardTitle>
          <CardDescription>Error loading P&L data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-center">
            <div>
              <TrendingDown className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
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
            <DollarSign className="w-5 h-5" />
            Profit & Loss
          </CardTitle>
          <CardDescription>
            {netPnL >= 0 ? "Net profit" : "Net loss"} of ${Math.abs(netPnL).toLocaleString()} 
            • {winRate.toFixed(1)}% win rate
          </CardDescription>
        </div>
        <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select timeframe"
          >
            <SelectValue placeholder="Daily" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="daily" className="rounded-lg">
              Daily
            </SelectItem>
            <SelectItem value="weekly" className="rounded-lg">
              Weekly
            </SelectItem>
            <SelectItem value="monthly" className="rounded-lg">
              Monthly
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={pnlChartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <BarChart data={processedData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${value}`}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                  formatter={(value, name) => {
                    const numValue = Number(value);
                    if (name === "net") {
                      return [
                        `${numValue >= 0 ? "+" : ""}$${Math.abs(numValue).toLocaleString()}`,
                        "Net P&L"
                      ];
                    }
                    return [`$${Math.abs(numValue).toLocaleString()}`, name === "profit" ? "Profit" : "Loss"];
                  }}
                />
              }
            />
            <Bar
              dataKey="net"
              fill={(entry: any) => entry.net >= 0 ? "var(--color-profit)" : "var(--color-loss)"}
              radius={[2, 2, 0, 0]}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
        
        {/* P&L Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${totalProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total Profit</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              ${Math.abs(totalLoss).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total Loss</p>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${netPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {netPnL >= 0 ? "+" : ""}${netPnL.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Net P&L</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {winRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
