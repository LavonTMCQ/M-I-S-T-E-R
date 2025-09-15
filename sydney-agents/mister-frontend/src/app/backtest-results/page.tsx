"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { Loader2, RefreshCw, BarChart3 } from "lucide-react";

// Minimal types aligned with CHART_POPULATION_GUIDE.md
interface TradeData {
  entry_timestamp?: string;
  exit_timestamp?: string;
  entry_price?: number;
  exit_price?: number;
  type?: "long" | "short";
  pnl?: number;
  // Legacy
  entryTime?: string;
  exitTime?: string;
  entryPrice?: number;
  exitPrice?: number;
  side?: "LONG" | "SHORT";
  netPnl?: number;
}

interface ChartCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface BacktestResponse {
  candles?: ChartCandle[];
  trades?: TradeData[];
  performance?: any;
  // Allow arbitrary fields from backend
  [key: string]: any;
}

const BRIDGE_BASE = "https://bridge-server-cjs-production.up.railway.app";

export default function BacktestResultsPage() {
  const [timeframe, setTimeframe] = useState<string>("15m");
  const [symbol, setSymbol] = useState<string>("ADAUSD");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BacktestResponse | null>(null);

  const fetchBacktest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BRIDGE_BASE}/api/backtest/ada-custom-algorithm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: "ADA Custom Algorithm", timeframe, symbol }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BacktestResponse = await res.json();

      // Minimal normalization to expected structures
      const normalized: BacktestResponse = {
        candles: (data.candles || data.ohlc || data.data || []).map((c: any) => ({
          timestamp: c.timestamp || c.time || c.t,
          open: Number(c.open ?? c.o),
          high: Number(c.high ?? c.h),
          low: Number(c.low ?? c.l),
          close: Number(c.close ?? c.c),
        })),
        trades: (data.trades || data.executions || []).map((t: any) => ({
          entry_timestamp: t.entry_timestamp || t.entryTime,
          exit_timestamp: t.exit_timestamp || t.exitTime,
          entry_price: Number(t.entry_price ?? t.entryPrice),
          exit_price: t.exit_price != null ? Number(t.exit_price) : undefined,
          type: t.type || (t.side ? String(t.side).toLowerCase() : undefined),
          pnl: t.pnl ?? t.netPnl,
        })),
        performance: data.performance || data.stats,
        ...data,
      };

      setResults(normalized);
    } catch (e: any) {
      console.warn("ADA backtest failed, showing error and leaving page usable.", e);
      setError(e?.message || "Backtest failed");
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, symbol]);

  const chartData = useMemo(() => {
    const candles = results?.candles || [];
    return candles.map((c) => ({
      time: new Date(c.timestamp).toISOString().slice(0, 19).replace("T", " "),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  }, [results]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> Backtest Results
        </h1>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Timeframe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="4h">4h</SelectItem>
              <SelectItem value="1d">1d</SelectItem>
            </SelectContent>
          </Select>
          <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-40" />
          <Button onClick={fetchBacktest} disabled={isLoading}>
            {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Running…</>) : (<><RefreshCw className="w-4 h-4 mr-2"/>Run Backtest</>)}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Price Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <TradingViewChart
            symbol={`${symbol.replace("/", "").toUpperCase()} (Backtest)`}
            data={chartData}
            showVolume={false}
            defaultTimeFrame={"1d"}
            height={520}
          />
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500">
          <CardHeader><CardTitle className="text-red-500">Backtest Error</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {results?.trades && results.trades.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Trades</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.trades.slice(0, 50).map((t, idx) => (
                <div key={idx} className="text-sm p-3 rounded-md bg-muted/30">
                  <div className="font-medium">{(t.type || t.side || "").toString().toUpperCase()} #{idx + 1}</div>
                  <div>Entry: {t.entry_timestamp || t.entryTime} @ {t.entry_price ?? t.entryPrice}</div>
                  { (t.exit_timestamp || t.exitTime) && (
                    <div>Exit: {t.exit_timestamp || t.exitTime} @ {t.exit_price ?? t.exitPrice}</div>
                  )}
                  { (t.pnl != null || t.netPnl != null) && (
                    <div>PNL: {t.pnl ?? t.netPnl}</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

