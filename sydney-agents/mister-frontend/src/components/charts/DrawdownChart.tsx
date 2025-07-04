"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingDown, AlertTriangle, Shield } from "lucide-react";

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
import { drawdownChartConfig } from "@/lib/charts/chartConfig";

// Empty drawdown data - will be populated with real wallet data
const emptyDrawdownData: Array<{ date: string; drawdown: number; peak: number; recovery: number }> = [];

interface DrawdownChartProps {
  data?: typeof emptyDrawdownData;
  className?: string;
  isLoading?: boolean;
  error?: string | null;
  showRecovery?: boolean;
}

export function DrawdownChart({
  data = emptyDrawdownData,
  className = "",
  isLoading = false,
  error = null,
  showRecovery = true
}: DrawdownChartProps) {
  
  // Calculate drawdown metrics
  const maxDrawdown = Math.min(...data.map(item => item.drawdown));
  const currentDrawdown = data[data.length - 1]?.drawdown || 0;
  const drawdownPeriods = data.filter(item => item.drawdown < 0).length;
  const recoveryRate = data.filter(item => item.recovery > 0).length / data.length * 100;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Drawdown Analysis</CardTitle>
          <CardDescription>Loading drawdown data...</CardDescription>
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
          <CardTitle>Drawdown Analysis</CardTitle>
          <CardDescription>Error loading drawdown data</CardDescription>
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

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Drawdown Analysis</CardTitle>
          <CardDescription>No drawdown data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-center">
            <div>
              <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Drawdown analysis will appear here</p>
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
            {Math.abs(maxDrawdown) > 5 ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : (
              <Shield className="w-5 h-5 text-green-600" />
            )}
            Drawdown Analysis
          </CardTitle>
          <CardDescription>
            Max drawdown: {maxDrawdown.toFixed(2)}% • Recovery rate: {recoveryRate.toFixed(1)}%
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            Math.abs(maxDrawdown) <= 2 ? "bg-green-500" :
            Math.abs(maxDrawdown) <= 5 ? "bg-yellow-500" :
            Math.abs(maxDrawdown) <= 10 ? "bg-orange-500" : "bg-red-500"
          }`} />
          <span className={`text-sm font-medium ${
            Math.abs(maxDrawdown) <= 2 ? "text-green-600" :
            Math.abs(maxDrawdown) <= 5 ? "text-yellow-600" :
            Math.abs(maxDrawdown) <= 10 ? "text-orange-600" : "text-red-600"
          }`}>
            {Math.abs(maxDrawdown) <= 2 ? "Low Risk" :
             Math.abs(maxDrawdown) <= 5 ? "Moderate Risk" :
             Math.abs(maxDrawdown) <= 10 ? "High Risk" : "Very High Risk"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={drawdownChartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillDrawdown" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-drawdown)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-drawdown)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              {showRecovery && (
                <linearGradient id="fillRecovery" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-recovery)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-recovery)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              )}
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
              tickFormatter={(value) => `${value}%`}
            />
            {showRecovery && (
              <YAxis
                yAxisId="recovery"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}%`}
              />
            )}
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
                    if (name === "drawdown") {
                      return [`${Number(value).toFixed(2)}%`, "Drawdown"];
                    }
                    if (name === "recovery") {
                      return [`${Number(value).toFixed(0)}%`, "Recovery"];
                    }
                    return [value, name];
                  }}
                />
              }
            />
            <Area
              dataKey="drawdown"
              type="natural"
              fill="url(#fillDrawdown)"
              stroke="var(--color-drawdown)"
              strokeWidth={2}
            />
            {showRecovery && (
              <Area
                dataKey="recovery"
                type="natural"
                fill="url(#fillRecovery)"
                stroke="var(--color-recovery)"
                strokeWidth={2}
                yAxisId="recovery"
              />
            )}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
        
        {/* Drawdown Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {maxDrawdown.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Max Drawdown</p>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${currentDrawdown < 0 ? "text-red-600" : "text-green-600"}`}>
              {currentDrawdown.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Current Drawdown</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {drawdownPeriods}
            </div>
            <p className="text-xs text-muted-foreground">Drawdown Periods</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {recoveryRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Recovery Rate</p>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Risk Level:</span>
            <span className={`text-sm font-medium ${
              Math.abs(maxDrawdown) <= 2 ? "text-green-600" :
              Math.abs(maxDrawdown) <= 5 ? "text-yellow-600" :
              Math.abs(maxDrawdown) <= 10 ? "text-orange-600" : "text-red-600"
            }`}>
              {Math.abs(maxDrawdown) <= 2 ? "Conservative" :
               Math.abs(maxDrawdown) <= 5 ? "Moderate" :
               Math.abs(maxDrawdown) <= 10 ? "Aggressive" : "Very Aggressive"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {Math.abs(maxDrawdown) <= 2 ? "Low volatility strategy with minimal drawdowns" :
             Math.abs(maxDrawdown) <= 5 ? "Balanced approach with acceptable risk levels" :
             Math.abs(maxDrawdown) <= 10 ? "Higher risk strategy requiring careful monitoring" :
             "High-risk strategy with significant drawdown potential"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
