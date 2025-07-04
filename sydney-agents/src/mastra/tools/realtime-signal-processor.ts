import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Real-time signal storage and processing
const signalDatabase = {
  signals: [] as any[],
  strategies: new Map<string, any>(),
  performance: new Map<string, any>(),
  subscribers: new Set<string>(),
};

export const realtimeSignalProcessor = createTool({
  id: "realtime-signal-processor",
  description: "Process and analyze real-time trading signals with advanced filtering, validation, and performance tracking",
  inputSchema: z.object({
    action: z.enum(['process', 'analyze', 'filter', 'subscribe', 'performance', 'history']).describe("Signal processing action"),
    signal: z.object({
      symbol: z.string().describe("Trading symbol (e.g., SPY, AAPL, ADAUSDT)"),
      action: z.enum(['BUY', 'SELL', 'LONG', 'SHORT', 'HOLD']).describe("Trading action"),
      price: z.number().describe("Signal price"),
      strength: z.number().min(0).max(1).describe("Signal strength (0-1)"),
      strategy: z.string().describe("Strategy name that generated the signal"),
      timeframe: z.string().describe("Timeframe (1m, 5m, 15m, 1h, 1d)"),
      indicators: z.record(z.any()).optional().describe("Technical indicators data"),
      metadata: z.record(z.any()).optional().describe("Additional signal metadata"),
    }).optional(),
    filters: z.object({
      minStrength: z.number().optional().default(0.6).describe("Minimum signal strength"),
      symbols: z.array(z.string()).optional().describe("Allowed symbols"),
      strategies: z.array(z.string()).optional().describe("Allowed strategies"),
      timeframes: z.array(z.string()).optional().describe("Allowed timeframes"),
      marketHours: z.boolean().optional().default(true).describe("Only during market hours"),
    }).optional(),
    analysis: z.object({
      lookbackPeriods: z.number().optional().default(100).describe("Periods to analyze"),
      includePerformance: z.boolean().optional().default(true).describe("Include performance metrics"),
      groupBy: z.enum(['symbol', 'strategy', 'timeframe', 'hour']).optional().default('strategy').describe("Group analysis by"),
    }).optional(),
    voiceAnnouncement: z.boolean().optional().default(true).describe("Enable voice announcements"),
  }),
  execute: async ({ context }) => {
    const { action, signal, filters = {}, analysis = {}, voiceAnnouncement = true } = context;

    try {
      switch (action) {
        case 'process':
          if (!signal) throw new Error('Signal data required for processing');
          return await processSignal(signal, filters, voiceAnnouncement);
        
        case 'analyze':
          return await analyzeSignals(analysis);
        
        case 'filter':
          return await filterSignals(filters);
        
        case 'subscribe':
          return await subscribeToSignals();
        
        case 'performance':
          return await getPerformanceMetrics(analysis);
        
        case 'history':
          return await getSignalHistory(analysis);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('❌ Real-time signal processor error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  },
});

async function processSignal(signal: any, filters: any, voiceAnnouncement: boolean) {
  const timestamp = new Date().toISOString();
  const signalId = `${signal.symbol}_${signal.strategy}_${Date.now()}`;
  
  console.log(`📊 Processing real-time signal: ${signal.action} ${signal.symbol} at $${signal.price}`);

  // Validate signal
  const validation = validateSignal(signal);
  if (!validation.valid) {
    console.log(`❌ Signal validation failed: ${validation.errors.join(', ')}`);
    return {
      success: false,
      signalId,
      error: 'Signal validation failed',
      errors: validation.errors,
      timestamp,
    };
  }

  // Apply filters
  const filterResult = applyFilters(signal, filters);
  if (!filterResult.passed) {
    console.log(`🚫 Signal filtered out: ${filterResult.reason}`);
    return {
      success: true,
      signalId,
      filtered: true,
      reason: filterResult.reason,
      signal: { ...signal, timestamp },
      timestamp,
    };
  }

  // Check market hours if required
  if (filters.marketHours && !isMarketHours(signal.symbol)) {
    console.log(`🕐 Signal outside market hours for ${signal.symbol}`);
    return {
      success: true,
      signalId,
      filtered: true,
      reason: 'outside_market_hours',
      signal: { ...signal, timestamp },
      timestamp,
    };
  }

  // Enrich signal with additional data
  const enrichedSignal = await enrichSignal(signal);

  // Store signal
  const storedSignal = {
    id: signalId,
    ...enrichedSignal,
    timestamp,
    processed: true,
  };
  
  signalDatabase.signals.push(storedSignal);

  // Update strategy performance
  updateStrategyPerformance(signal.strategy, storedSignal);

  // Voice announcement for strong signals
  if (voiceAnnouncement && signal.strength >= 0.8) {
    const announcement = generateVoiceAnnouncement(storedSignal);
    console.log(`🔊 SIGNAL ANNOUNCEMENT: ${announcement}`);
    // TODO: Integrate with voice system
  }

  // Real-time analysis
  const realtimeAnalysis = await performRealtimeAnalysis(storedSignal);

  console.log(`✅ Signal processed successfully: ${signalId}`);

  return {
    success: true,
    signalId,
    signal: storedSignal,
    analysis: realtimeAnalysis,
    performance: getStrategyPerformance(signal.strategy),
    recommendation: generateRecommendation(storedSignal, realtimeAnalysis),
    timestamp,
  };
}

function validateSignal(signal: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!signal.symbol || typeof signal.symbol !== 'string') {
    errors.push('Invalid or missing symbol');
  }

  if (!['BUY', 'SELL', 'LONG', 'SHORT', 'HOLD'].includes(signal.action)) {
    errors.push('Invalid action');
  }

  if (typeof signal.price !== 'number' || signal.price <= 0) {
    errors.push('Invalid price');
  }

  if (typeof signal.strength !== 'number' || signal.strength < 0 || signal.strength > 1) {
    errors.push('Invalid strength (must be 0-1)');
  }

  if (!signal.strategy || typeof signal.strategy !== 'string') {
    errors.push('Invalid or missing strategy');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function applyFilters(signal: any, filters: any): { passed: boolean; reason?: string } {
  if (filters.minStrength && signal.strength < filters.minStrength) {
    return { passed: false, reason: `Strength ${signal.strength} below minimum ${filters.minStrength}` };
  }

  if (filters.symbols && !filters.symbols.includes(signal.symbol)) {
    return { passed: false, reason: `Symbol ${signal.symbol} not in allowed list` };
  }

  if (filters.strategies && !filters.strategies.includes(signal.strategy)) {
    return { passed: false, reason: `Strategy ${signal.strategy} not in allowed list` };
  }

  if (filters.timeframes && !filters.timeframes.includes(signal.timeframe)) {
    return { passed: false, reason: `Timeframe ${signal.timeframe} not in allowed list` };
  }

  return { passed: true };
}

function isMarketHours(symbol: string): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  // Crypto markets are 24/7
  if (symbol.includes('USDT') || symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('ADA')) {
    return true;
  }

  // US stock market hours (9:30 AM - 4:00 PM EST, Monday-Friday)
  if (day === 0 || day === 6) return false; // Weekend
  return hour >= 9 && hour < 16; // Simplified market hours check
}

async function enrichSignal(signal: any) {
  // Add market context, volatility, volume, etc.
  const enrichment = {
    marketContext: await getMarketContext(signal.symbol),
    volatility: await getVolatility(signal.symbol),
    volume: await getVolume(signal.symbol),
    technicalLevels: await getTechnicalLevels(signal.symbol),
    sentiment: await getMarketSentiment(signal.symbol),
  };

  return {
    ...signal,
    enrichment,
  };
}

async function getMarketContext(_symbol: string) {
  // Simplified market context
  return {
    trend: 'bullish', // This would come from real market data
    support: 0,
    resistance: 0,
    atr: 0,
  };
}

async function getVolatility(_symbol: string) {
  // Simplified volatility calculation
  return Math.random() * 0.1; // This would come from real market data
}

async function getVolume(_symbol: string) {
  // Simplified volume data
  return Math.floor(Math.random() * 1000000); // This would come from real market data
}

async function getTechnicalLevels(_symbol: string) {
  // Simplified technical levels
  return {
    support: [],
    resistance: [],
    pivots: [],
  };
}

async function getMarketSentiment(_symbol: string) {
  // Simplified sentiment analysis
  return {
    score: Math.random() * 2 - 1, // -1 to 1
    confidence: Math.random(),
  };
}

function updateStrategyPerformance(strategy: string, signal: any) {
  if (!signalDatabase.performance.has(strategy)) {
    signalDatabase.performance.set(strategy, {
      totalSignals: 0,
      avgStrength: 0,
      symbols: new Set(),
      timeframes: new Set(),
      lastSignal: null,
    });
  }

  const perf = signalDatabase.performance.get(strategy);
  perf.totalSignals++;
  perf.avgStrength = (perf.avgStrength * (perf.totalSignals - 1) + signal.strength) / perf.totalSignals;
  perf.symbols.add(signal.symbol);
  perf.timeframes.add(signal.timeframe);
  perf.lastSignal = signal.timestamp;
}

async function performRealtimeAnalysis(signal: any) {
  // Analyze signal in context of recent signals
  const recentSignals = signalDatabase.signals
    .filter(s => s.symbol === signal.symbol)
    .slice(-10);

  const analysis = {
    signalCount: recentSignals.length,
    avgStrength: recentSignals.reduce((sum, s) => sum + s.strength, 0) / recentSignals.length,
    trend: analyzeTrend(recentSignals),
    consistency: analyzeConsistency(recentSignals),
    timing: analyzeTiming(signal),
  };

  return analysis;
}

function analyzeTrend(signals: any[]) {
  if (signals.length < 2) return 'insufficient_data';
  
  const buySignals = signals.filter(s => ['BUY', 'LONG'].includes(s.action)).length;
  const sellSignals = signals.filter(s => ['SELL', 'SHORT'].includes(s.action)).length;
  
  if (buySignals > sellSignals * 1.5) return 'bullish';
  if (sellSignals > buySignals * 1.5) return 'bearish';
  return 'neutral';
}

function analyzeConsistency(signals: any[]) {
  if (signals.length < 3) return 0;
  
  const strategies = new Set(signals.map(s => s.strategy));
  const timeframes = new Set(signals.map(s => s.timeframe));
  
  // Higher consistency if fewer strategies/timeframes are generating signals
  return Math.max(0, 1 - (strategies.size + timeframes.size) / (signals.length * 2));
}

function analyzeTiming(_signal: any) {
  const hour = new Date().getHours();

  // Market opening/closing times are typically high-activity periods
  if (hour >= 9 && hour <= 10) return 'market_open';
  if (hour >= 15 && hour <= 16) return 'market_close';
  if (hour >= 11 && hour <= 14) return 'midday';
  return 'off_hours';
}

function generateVoiceAnnouncement(signal: any): string {
  const action = signal.action.toLowerCase();
  const strength = Math.round(signal.strength * 100);
  
  return `${action} signal for ${signal.symbol} at $${signal.price.toFixed(2)}, strength ${strength}%, strategy ${signal.strategy}`;
}

function generateRecommendation(signal: any, analysis: any) {
  let confidence = signal.strength;
  
  // Adjust confidence based on analysis
  if (analysis.consistency > 0.7) confidence += 0.1;
  if (analysis.trend === 'bullish' && ['BUY', 'LONG'].includes(signal.action)) confidence += 0.1;
  if (analysis.trend === 'bearish' && ['SELL', 'SHORT'].includes(signal.action)) confidence += 0.1;
  
  confidence = Math.min(1, confidence);
  
  let recommendation = 'NEUTRAL';
  if (confidence >= 0.8) recommendation = 'STRONG';
  else if (confidence >= 0.6) recommendation = 'MODERATE';
  else if (confidence >= 0.4) recommendation = 'WEAK';
  
  return {
    action: recommendation,
    confidence: Math.round(confidence * 100),
    reasoning: generateReasoning(signal, analysis, confidence),
  };
}

function generateReasoning(signal: any, analysis: any, _confidence: number): string {
  const reasons = [];
  
  if (signal.strength >= 0.8) reasons.push('high signal strength');
  if (analysis.consistency > 0.7) reasons.push('consistent strategy signals');
  if (analysis.trend !== 'neutral') reasons.push(`${analysis.trend} trend alignment`);
  if (analysis.timing === 'market_open' || analysis.timing === 'market_close') {
    reasons.push('optimal market timing');
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'standard signal criteria';
}

function getStrategyPerformance(strategy: string) {
  const perf = signalDatabase.performance.get(strategy);
  if (!perf) return null;
  
  return {
    ...perf,
    symbols: Array.from(perf.symbols),
    timeframes: Array.from(perf.timeframes),
  };
}

async function analyzeSignals(analysis: any) {
  const { lookbackPeriods = 100, includePerformance: _includePerformance = true, groupBy = 'strategy' } = analysis;
  
  const recentSignals = signalDatabase.signals.slice(-lookbackPeriods);
  
  // Group signals
  const grouped = new Map();
  recentSignals.forEach(signal => {
    const key = signal[groupBy] || 'unknown';
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(signal);
  });
  
  // Analyze each group
  const results = Array.from(grouped.entries()).map(([key, signals]) => ({
    [groupBy]: key,
    count: signals.length,
    avgStrength: signals.reduce((sum: number, s: any) => sum + s.strength, 0) / signals.length,
    actions: signals.reduce((acc: Record<string, number>, s: any) => {
      acc[s.action] = (acc[s.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    timeRange: {
      start: signals[0]?.timestamp,
      end: signals[signals.length - 1]?.timestamp,
    },
  }));
  
  return {
    success: true,
    analysis: {
      totalSignals: recentSignals.length,
      lookbackPeriods,
      groupBy,
      groups: results,
      summary: {
        avgStrength: recentSignals.reduce((sum, s) => sum + s.strength, 0) / recentSignals.length,
        mostActiveStrategy: results.sort((a, b) => b.count - a.count)[0]?.[groupBy],
        strongestSignals: recentSignals.filter(s => s.strength >= 0.8).length,
      },
    },
    timestamp: new Date().toISOString(),
  };
}

async function filterSignals(filters: any) {
  const filteredSignals = signalDatabase.signals.filter(signal => {
    const filterResult = applyFilters(signal, filters);
    return filterResult.passed;
  });
  
  return {
    success: true,
    totalSignals: signalDatabase.signals.length,
    filteredSignals: filteredSignals.length,
    filters,
    signals: filteredSignals.slice(-20), // Return last 20 filtered signals
    timestamp: new Date().toISOString(),
  };
}

async function subscribeToSignals() {
  const subscriberId = `subscriber_${Date.now()}`;
  signalDatabase.subscribers.add(subscriberId);
  
  return {
    success: true,
    subscriberId,
    message: 'Subscribed to real-time signals',
    currentSignals: signalDatabase.signals.length,
    timestamp: new Date().toISOString(),
  };
}

async function getPerformanceMetrics(_analysis: any) {
  const strategies = Array.from(signalDatabase.performance.entries()).map(([name, perf]) => ({
    strategy: name,
    ...perf,
    symbols: Array.from(perf.symbols),
    timeframes: Array.from(perf.timeframes),
  }));
  
  return {
    success: true,
    strategies,
    totalStrategies: strategies.length,
    totalSignals: signalDatabase.signals.length,
    timestamp: new Date().toISOString(),
  };
}

async function getSignalHistory(analysis: any) {
  const { lookbackPeriods = 50 } = analysis;
  const recentSignals = signalDatabase.signals.slice(-lookbackPeriods);
  
  return {
    success: true,
    signals: recentSignals,
    count: recentSignals.length,
    totalInDatabase: signalDatabase.signals.length,
    timestamp: new Date().toISOString(),
  };
}