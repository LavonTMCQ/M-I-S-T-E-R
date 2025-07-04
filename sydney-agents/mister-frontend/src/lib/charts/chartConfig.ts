/**
 * Chart Configuration for MISTER Analytics
 * ShadCN Chart components with consistent theming and MISTER branding
 */

import { type ChartConfig } from "@/components/ui/chart";

// MISTER Analytics Chart Configuration
export const performanceChartConfig = {
  portfolioValue: {
    label: "Portfolio Value",
    color: "hsl(var(--chart-1))",
  },
  dailyReturn: {
    label: "Daily Return",
    color: "hsl(var(--chart-2))",
  },
  cumulativeReturn: {
    label: "Total Return",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export const pnlChartConfig = {
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-1))",
  },
  loss: {
    label: "Loss",
    color: "hsl(var(--chart-2))",
  },
  net: {
    label: "Net P&L",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export const winLossChartConfig = {
  wins: {
    label: "Winning Trades",
    color: "hsl(var(--chart-1))",
  },
  losses: {
    label: "Losing Trades",
    color: "hsl(var(--chart-2))",
  },
  breakeven: {
    label: "Breakeven",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export const drawdownChartConfig = {
  drawdown: {
    label: "Drawdown",
    color: "hsl(var(--chart-2))",
  },
  recovery: {
    label: "Recovery",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

// ShadCN Chart Utility Functions

// Utility Functions
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

// Responsive breakpoints for ShadCN charts
export const getResponsiveChartHeight = (width: number) => {
  if (width < 640) return 250; // mobile
  if (width < 1024) return 300; // tablet
  return 400; // desktop
};

// Chart Data Types
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface PerformanceDataPoint extends ChartDataPoint {
  portfolioValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
}

export interface PnLDataPoint extends ChartDataPoint {
  profit: number;
  loss: number;
  net: number;
  date: string;
}

export interface WinLossDataPoint {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface DrawdownDataPoint extends ChartDataPoint {
  drawdown: number;
  peak: number;
  recovery: number;
}

export interface StrategyDataPoint extends ChartDataPoint {
  strategy: string;
  performance: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

// Chart Component Props Types
export interface BaseChartProps {
  data: any[];
  width?: number | string;
  height?: number;
  className?: string;
  isLoading?: boolean;
  error?: string | null;
}

export interface PerformanceChartProps extends BaseChartProps {
  data: PerformanceDataPoint[];
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
}

export interface PnLChartProps extends BaseChartProps {
  data: PnLDataPoint[];
  timeframe?: 'daily' | 'weekly' | 'monthly';
}

export interface WinLossChartProps extends BaseChartProps {
  data: WinLossDataPoint[];
  showPercentages?: boolean;
}

export interface DrawdownChartProps extends BaseChartProps {
  data: DrawdownDataPoint[];
  showRecovery?: boolean;
}

export interface StrategyChartProps extends BaseChartProps {
  data: StrategyDataPoint[];
  compareStrategies?: boolean;
}
