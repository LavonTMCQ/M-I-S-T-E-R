/**
 * TradingView Chart Types for Sydney's Trading System
 * Based on locked optimal MACD strategy configuration
 */

// OHLCV Data Structure (matches our backtesting format)
export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// TradingView Bar Format
export interface TradingViewBar {
  time: number;  // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// MACD Data Structure (from our locked optimal strategy)
export interface MACDData {
  timestamp: Date;
  macd: number;
  signal: number;
  histogram: number;
}

// Signal Data for Chart Overlay
export interface SignalData {
  timestamp: Date;
  type: 'long' | 'short';
  price: number;
  confidence: number;
  reason: string;
  macdValue: number;
  emaValue: number;
}

// Chart Configuration
export interface ChartConfig {
  symbol: string;
  interval: string;
  theme: 'light' | 'dark';
  height: number;
  width: number;
  timezone: string;
  locale: string;
}

// Locked Optimal MACD Configuration (from our strategy)
export interface OptimalMACDConfig {
  fastPeriod: 5;
  slowPeriod: 15;
  signalPeriod: 5;
  minHistogramChange: 0.002;
  useTrendFilter: true;
  trendFilterPeriod: 9;
  usePartialProfits: true;
  firstProfitTarget: 1.5;
  secondProfitTarget: 2.5;
  trailingStopATR: 1.0;
  maxPositionSize: 100;
  marketOpen: "10:00";
  marketClose: "15:00";
}

// Real-time Data Feed Interface
export interface DataFeedConfig {
  name: string;
  description: string;
  type: 'udf';
  session: string;
  timezone: string;
  ticker: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  intraday_multipliers: string[];
  supported_resolutions: string[];
  volume_precision: number;
  data_status: string;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'price_update' | 'signal_update' | 'error';
  data: any;
  timestamp: number;
}

// Performance Metrics (real-time)
export interface PerformanceMetrics {
  totalPnL: number;
  dailyPnL: number;
  winRate: number;
  totalTrades: number;
  currentPosition: 'long' | 'short' | 'flat';
  unrealizedPnL: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

// Chart Study Configuration
export interface StudyConfig {
  id: string;
  name: string;
  inputs: Record<string, any>;
  styles: Record<string, any>;
  enabled: boolean;
}

// TradingView Widget Configuration
export interface WidgetConfig {
  symbol: string;
  interval: string;
  container: string;
  datafeed: any;
  library_path: string;
  locale: string;
  disabled_features: string[];
  enabled_features: string[];
  charts_storage_url?: string;
  charts_storage_api_version?: string;
  client_id?: string;
  user_id?: string;
  fullscreen?: boolean;
  autosize?: boolean;
  studies_overrides?: Record<string, any>;
  theme?: 'light' | 'dark';
  custom_css_url?: string;
  loading_screen?: { backgroundColor: string; foregroundColor: string };
  overrides?: Record<string, any>;
  studies_access?: {
    type: 'black' | 'white';
    tools: Array<{ name: string; grayed?: boolean }>;
  };
  drawings_access?: {
    type: 'black' | 'white';
    tools: Array<{ name: string; grayed?: boolean }>;
  };
}

// Chart API Methods
export interface ChartAPI {
  onChartReady: (callback: () => void) => void;
  createStudy: (name: string, forceOverlay: boolean, lock: boolean, inputs?: any[], callback?: (studyId: string) => void) => void;
  removeStudy: (studyId: string) => void;
  createShape: (point: any, options: any) => string;
  removeEntity: (entityId: string) => void;
  setSymbol: (symbol: string, interval: string, callback?: () => void) => void;
  getTimezone: () => string;
  setTimezone: (timezone: string) => void;
}

// Data Feed Interface (TradingView UDF)
export interface UDFDataFeed {
  onReady: (callback: (config: any) => void) => void;
  searchSymbols: (userInput: string, exchange: string, symbolType: string, onResultReadyCallback: (symbols: any[]) => void) => void;
  resolveSymbol: (symbolName: string, onSymbolResolvedCallback: (symbolInfo: any) => void, onResolveErrorCallback: (reason: string) => void) => void;
  getBars: (symbolInfo: any, resolution: string, periodParams: any, onHistoryCallback: (bars: TradingViewBar[], meta?: any) => void, onErrorCallback: (reason: string) => void) => void;
  subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: (bar: TradingViewBar) => void, subscriberUID: string, onResetCacheNeededCallback: () => void) => void;
  unsubscribeBars: (subscriberUID: string) => void;
}

export default {
  OHLCV,
  TradingViewBar,
  MACDData,
  SignalData,
  ChartConfig,
  OptimalMACDConfig,
  DataFeedConfig,
  WebSocketMessage,
  PerformanceMetrics,
  StudyConfig,
  WidgetConfig,
  ChartAPI,
  UDFDataFeed
};
