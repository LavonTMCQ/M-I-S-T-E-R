"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

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
import { performanceChartConfig } from "@/lib/charts/chartConfig";

// Empty performance data - will be populated with real wallet data
const emptyPerformanceData: Array<{ date: string; portfolioValue: number; dailyReturn: number; cumulativeReturn: number }> = [];

interface PerformanceChartProps {
  data?: typeof emptyPerformanceData;
  className?: string;
  isLoading?: boolean;
  error?: string | null;
  onTimeframeChange?: (timeframe: string) => void;
  currentTimeframe?: string;
}

export function PerformanceChart({
  data = emptyPerformanceData,
  className = "",
  isLoading = false,
  error = null,
  onTimeframeChange,
  currentTimeframe = "30d"
}: PerformanceChartProps) {
  const [timeRange, setTimeRange] = React.useState(currentTimeframe);

  // Handle timeframe changes
  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeRange(newTimeframe);
    if (onTimeframeChange) {
      console.log(`📊 Portfolio chart timeframe changed to: ${newTimeframe}`);
      onTimeframeChange(newTimeframe);
    }
  };

  // Use all data since we fetch the correct timeframe from TapTools API
  const filteredData = React.useMemo(() => {
    return data || [];
  }, [data]);

  // Calculate performance metrics
  const latestData = filteredData[filteredData.length - 1];
  const firstData = filteredData[0];
  const totalReturn = latestData ? latestData.cumulativeReturn : 0;
  const isPositive = totalReturn >= 0;
  const portfolioChange = latestData && firstData
    ? latestData.portfolioValue - firstData.portfolioValue
    : 0;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>Loading performance data...</CardDescription>
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
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>Error loading chart data</CardDescription>
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
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            Portfolio Performance
          </CardTitle>
          <CardDescription>
            {isPositive ? "Trending up" : "Trending down"} by {Math.abs(totalReturn).toFixed(2)}%
            {filteredData.length > 0 && (
              <span className="ml-2">
                • {new Date(firstData?.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(latestData?.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={handleTimeframeChange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select time range"
          >
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={performanceChartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-portfolioValue)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-portfolioValue)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
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
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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
                    if (name === "portfolioValue") {
                      return [`$${Number(value).toLocaleString()}`, "Portfolio Value"];
                    }
                    if (name === "cumulativeReturn") {
                      return [`${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(2)}%`, "Total Return"];
                    }
                    return [value, name];
                  }}
                />
              }
            />
            <Area
              dataKey="portfolioValue"
              type="natural"
              fill="url(#fillPortfolio)"
              stroke="var(--color-portfolioValue)"
              strokeWidth={2}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>


        {/* Performance Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {latestData ? `$${latestData.portfolioValue.toLocaleString()}` : "--"}
            </div>
            <p className="text-xs text-muted-foreground">Current Value</p>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${portfolioChange >= 0 ? "text-green-600" : "text-red-600"}`}>
              {portfolioChange >= 0 ? "+" : ""}${Math.abs(portfolioChange).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Period Change</p>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Total Return</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {filteredData.length}
            </div>
            <p className="text-xs text-muted-foreground">Data Points</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
