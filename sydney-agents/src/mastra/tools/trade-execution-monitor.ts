import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Trade execution database
const tradeDatabase = {
  activeTrades: new Map<string, any>(),
  completedTrades: [] as any[],
  performance: {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfit: 0,
    totalLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    avgWin: 0,
    avgLoss: 0,
    winRate: 0,
    profitFactor: 0,
    sharpeRatio: 0,
  },
  alerts: [] as any[],
};

export const tradeExecutionMonitor = createTool({
  id: "trade-execution-monitor",
  description: "Monitor and track live trade executions with real-time P&L, risk management, and performance analytics",
  inputSchema: z.object({
    action: z.enum(['monitor', 'execute', 'close', 'update', 'performance', 'alerts', 'risk']).describe("Trade monitoring action"),
    trade: z.object({
      id: z.string().optional().describe("Trade ID (auto-generated if not provided)"),
      symbol: z.string().describe("Trading symbol"),
      action: z.enum(['BUY', 'SELL', 'LONG', 'SHORT']).describe("Trade action"),
      quantity: z.number().describe("Trade quantity/size"),
      entryPrice: z.number().describe("Entry price"),
      stopLoss: z.number().optional().describe("Stop loss price"),
      takeProfit: z.number().optional().describe("Take profit price"),
      strategy: z.string().describe("Strategy that generated the trade"),
      timeframe: z.string().describe("Timeframe"),
      leverage: z.number().optional().default(1).describe("Leverage (for crypto/forex)"),
      metadata: z.record(z.any()).optional().describe("Additional trade metadata"),
    }).optional(),
    tradeId: z.string().optional().describe("Trade ID for updates/closes"),
    currentPrice: z.number().optional().describe("Current market price for P&L calculation"),
    riskParams: z.object({
      maxRiskPerTrade: z.number().optional().default(0.02).describe("Max risk per trade (2%)"),
      maxDailyLoss: z.number().optional().default(0.05).describe("Max daily loss (5%)"),
      maxDrawdown: z.number().optional().default(0.10).describe("Max drawdown (10%)"),
      positionSizing: z.enum(['fixed', 'percentage', 'volatility']).optional().default('percentage').describe("Position sizing method"),
    }).optional(),
    voiceAlerts: z.boolean().optional().default(true).describe("Enable voice alerts for trade events"),
  }),
  execute: async ({ context }) => {
    const { action, trade, tradeId, currentPrice, riskParams = {}, voiceAlerts = true } = context;

    try {
      switch (action) {
        case 'monitor':
          return await monitorActiveTrades(currentPrice, voiceAlerts);
        
        case 'execute':
          if (!trade) throw new Error('Trade data required for execution');
          return await executeTrade(trade, riskParams, voiceAlerts);
        
        case 'close':
          if (!tradeId) throw new Error('Trade ID required for closing');
          return await closeTrade(tradeId, currentPrice, voiceAlerts);
        
        case 'update':
          if (!tradeId) throw new Error('Trade ID required for update');
          return await updateTrade(tradeId, currentPrice, voiceAlerts);
        
        case 'performance':
          return await getPerformanceAnalytics();
        
        case 'alerts':
          return await getTradeAlerts();
        
        case 'risk':
          return await performRiskAnalysis(riskParams);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('❌ Trade execution monitor error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  },
});

async function executeTrade(trade: any, riskParams: any, voiceAlerts: boolean) {
  const tradeId = trade.id || `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  console.log(`💰 Executing trade: ${trade.action} ${trade.quantity} ${trade.symbol} at $${trade.entryPrice}`);

  // Risk validation
  const riskValidation = validateTradeRisk(trade, riskParams);
  if (!riskValidation.valid) {
    console.log(`❌ Trade rejected due to risk: ${riskValidation.reason}`);
    return {
      success: false,
      tradeId,
      error: 'Trade rejected due to risk management',
      reason: riskValidation.reason,
      timestamp,
    };
  }

  // Calculate position size based on risk parameters
  const positionSize = calculatePositionSize(trade, riskParams);
  
  // Create trade record
  const tradeRecord = {
    id: tradeId,
    ...trade,
    quantity: positionSize.quantity,
    positionValue: positionSize.value,
    riskAmount: positionSize.risk,
    status: 'ACTIVE',
    entryTime: timestamp,
    currentPrice: trade.entryPrice,
    unrealizedPnL: 0,
    realizedPnL: 0,
    commission: calculateCommission(trade, positionSize),
    updates: [],
  };

  // Store active trade
  tradeDatabase.activeTrades.set(tradeId, tradeRecord);

  // Voice announcement
  if (voiceAlerts) {
    const announcement = `Trade executed: ${trade.action} ${trade.symbol} at $${trade.entryPrice}`;
    console.log(`🔊 TRADE EXECUTION: ${announcement}`);
    // TODO: Integrate with voice system
  }

  // Create alert
  addTradeAlert({
    type: 'EXECUTION',
    tradeId,
    message: `Trade executed: ${trade.action} ${trade.quantity} ${trade.symbol}`,
    priority: 'medium',
    timestamp,
  });

  console.log(`✅ Trade executed successfully: ${tradeId}`);

  return {
    success: true,
    tradeId,
    trade: tradeRecord,
    positionSize,
    riskValidation,
    timestamp,
  };
}

async function monitorActiveTrades(currentPrice?: number, voiceAlerts: boolean = true) {
  const activeTrades = Array.from(tradeDatabase.activeTrades.values());
  const updates = [];

  for (const trade of activeTrades) {
    // Use provided price or simulate market price
    const marketPrice = currentPrice || simulateMarketPrice(trade.symbol, trade.currentPrice);
    
    // Update trade with current market data
    const updatedTrade = updateTradeMetrics(trade, marketPrice);
    tradeDatabase.activeTrades.set(trade.id, updatedTrade);
    
    // Check for stop loss/take profit triggers
    const triggers = checkTradeTriggers(updatedTrade, marketPrice);
    if (triggers.triggered) {
      await closeTrade(trade.id, marketPrice, voiceAlerts);
      updates.push({
        tradeId: trade.id,
        action: 'CLOSED',
        reason: triggers.reason,
        price: marketPrice,
        pnl: updatedTrade.unrealizedPnL,
      });
    } else {
      updates.push({
        tradeId: trade.id,
        action: 'UPDATED',
        price: marketPrice,
        pnl: updatedTrade.unrealizedPnL,
        change: ((marketPrice - trade.entryPrice) / trade.entryPrice * 100).toFixed(2) + '%',
      });
    }

    // Risk alerts
    if (Math.abs(updatedTrade.unrealizedPnL) > trade.riskAmount * 0.8) {
      addTradeAlert({
        type: 'RISK',
        tradeId: trade.id,
        message: `High risk: ${trade.symbol} P&L at ${updatedTrade.unrealizedPnL.toFixed(2)}`,
        priority: 'high',
        timestamp: new Date().toISOString(),
      });
    }
  }

  const summary = {
    activeTrades: activeTrades.length,
    totalUnrealizedPnL: activeTrades.reduce((sum, t) => sum + t.unrealizedPnL, 0),
    totalPositionValue: activeTrades.reduce((sum, t) => sum + t.positionValue, 0),
    totalRiskAmount: activeTrades.reduce((sum, t) => sum + t.riskAmount, 0),
  };

  return {
    success: true,
    summary,
    activeTrades: activeTrades.map(t => ({
      id: t.id,
      symbol: t.symbol,
      action: t.action,
      quantity: t.quantity,
      entryPrice: t.entryPrice,
      currentPrice: t.currentPrice,
      unrealizedPnL: t.unrealizedPnL,
      change: ((t.currentPrice - t.entryPrice) / t.entryPrice * 100).toFixed(2) + '%',
      status: t.status,
    })),
    updates,
    timestamp: new Date().toISOString(),
  };
}

async function closeTrade(tradeId: string, currentPrice?: number, voiceAlerts: boolean = true) {
  const trade = tradeDatabase.activeTrades.get(tradeId);
  if (!trade) {
    throw new Error(`Trade not found: ${tradeId}`);
  }

  const exitPrice = currentPrice || simulateMarketPrice(trade.symbol, trade.currentPrice);
  const exitTime = new Date().toISOString();
  
  // Calculate final P&L
  const finalPnL = calculatePnL(trade, exitPrice);
  const commission = trade.commission + calculateCommission(trade, { value: trade.positionValue });
  const netPnL = finalPnL - commission;

  // Update trade record
  const closedTrade = {
    ...trade,
    status: 'CLOSED',
    exitPrice,
    exitTime,
    realizedPnL: netPnL,
    unrealizedPnL: 0,
    totalCommission: commission,
    duration: new Date(exitTime).getTime() - new Date(trade.entryTime).getTime(),
  };

  // Move to completed trades
  tradeDatabase.activeTrades.delete(tradeId);
  tradeDatabase.completedTrades.push(closedTrade);

  // Update performance metrics
  updatePerformanceMetrics(closedTrade);

  // Voice announcement
  if (voiceAlerts) {
    const profit = netPnL > 0 ? 'PROFIT' : netPnL < 0 ? 'LOSS' : 'BREAKEVEN';
    const announcement = `Trade closed: ${profit} of $${Math.abs(netPnL).toFixed(2)} on ${trade.symbol}`;
    console.log(`🔊 TRADE CLOSED: ${announcement}`);
    // TODO: Integrate with voice system
  }

  // Create alert
  addTradeAlert({
    type: 'CLOSE',
    tradeId,
    message: `Trade closed: ${netPnL > 0 ? '+' : ''}$${netPnL.toFixed(2)} on ${trade.symbol}`,
    priority: Math.abs(netPnL) > trade.riskAmount ? 'high' : 'medium',
    timestamp: exitTime,
  });

  console.log(`✅ Trade closed: ${tradeId} with P&L: $${netPnL.toFixed(2)}`);

  return {
    success: true,
    tradeId,
    trade: closedTrade,
    finalPnL: netPnL,
    exitPrice,
    performance: tradeDatabase.performance,
    timestamp: exitTime,
  };
}

async function updateTrade(tradeId: string, currentPrice?: number, voiceAlerts: boolean = true) {
  const trade = tradeDatabase.activeTrades.get(tradeId);
  if (!trade) {
    throw new Error(`Trade not found: ${tradeId}`);
  }

  const marketPrice = currentPrice || simulateMarketPrice(trade.symbol, trade.currentPrice);
  const updatedTrade = updateTradeMetrics(trade, marketPrice);
  
  tradeDatabase.activeTrades.set(tradeId, updatedTrade);

  return {
    success: true,
    tradeId,
    trade: updatedTrade,
    priceChange: marketPrice - trade.currentPrice,
    pnlChange: updatedTrade.unrealizedPnL - trade.unrealizedPnL,
    timestamp: new Date().toISOString(),
  };
}

function validateTradeRisk(trade: any, riskParams: any): { valid: boolean; reason?: string } {
  const { maxRiskPerTrade = 0.02, maxDailyLoss = 0.05, maxDrawdown = 0.10 } = riskParams;
  
  // Calculate trade risk
  const tradeRisk = Math.abs(trade.entryPrice - (trade.stopLoss || trade.entryPrice * 0.95)) * trade.quantity;
  const accountValue = 100000; // This would come from account data
  const riskPercentage = tradeRisk / accountValue;
  
  if (riskPercentage > maxRiskPerTrade) {
    return { valid: false, reason: `Trade risk ${(riskPercentage * 100).toFixed(2)}% exceeds max ${(maxRiskPerTrade * 100).toFixed(2)}%` };
  }

  // Check daily loss limit
  const todayLoss = getTodayLoss();
  if (todayLoss / accountValue > maxDailyLoss) {
    return { valid: false, reason: `Daily loss limit exceeded: ${(todayLoss / accountValue * 100).toFixed(2)}%` };
  }

  return { valid: true };
}

function calculatePositionSize(trade: any, riskParams: any) {
  const { maxRiskPerTrade = 0.02, positionSizing = 'percentage' } = riskParams;
  const accountValue = 100000; // This would come from account data
  
  let quantity = trade.quantity;
  
  if (positionSizing === 'percentage') {
    const maxRiskAmount = accountValue * maxRiskPerTrade;
    const stopDistance = Math.abs(trade.entryPrice - (trade.stopLoss || trade.entryPrice * 0.95));
    quantity = Math.floor(maxRiskAmount / stopDistance);
  }
  
  const value = quantity * trade.entryPrice * (trade.leverage || 1);
  const risk = Math.abs(trade.entryPrice - (trade.stopLoss || trade.entryPrice * 0.95)) * quantity;
  
  return {
    quantity,
    value,
    risk,
    leverage: trade.leverage || 1,
  };
}

function calculateCommission(trade: any, positionSize: any): number {
  // Simplified commission calculation
  return positionSize.value * 0.001; // 0.1% commission
}

function updateTradeMetrics(trade: any, currentPrice: number) {
  const unrealizedPnL = calculatePnL(trade, currentPrice);
  
  return {
    ...trade,
    currentPrice,
    unrealizedPnL,
    updates: [...trade.updates, {
      price: currentPrice,
      pnl: unrealizedPnL,
      timestamp: new Date().toISOString(),
    }],
  };
}

function calculatePnL(trade: any, currentPrice: number): number {
  const direction = ['BUY', 'LONG'].includes(trade.action) ? 1 : -1;
  return (currentPrice - trade.entryPrice) * trade.quantity * direction;
}

function checkTradeTriggers(trade: any, currentPrice: number) {
  if (trade.stopLoss && 
      ((['BUY', 'LONG'].includes(trade.action) && currentPrice <= trade.stopLoss) ||
       (['SELL', 'SHORT'].includes(trade.action) && currentPrice >= trade.stopLoss))) {
    return { triggered: true, reason: 'STOP_LOSS' };
  }
  
  if (trade.takeProfit && 
      ((['BUY', 'LONG'].includes(trade.action) && currentPrice >= trade.takeProfit) ||
       (['SELL', 'SHORT'].includes(trade.action) && currentPrice <= trade.takeProfit))) {
    return { triggered: true, reason: 'TAKE_PROFIT' };
  }
  
  return { triggered: false };
}

function simulateMarketPrice(symbol: string, lastPrice: number): number {
  // Simulate price movement (±2% random walk)
  const change = (Math.random() - 0.5) * 0.04;
  return lastPrice * (1 + change);
}

function updatePerformanceMetrics(trade: any) {
  const perf = tradeDatabase.performance;
  
  perf.totalTrades++;
  
  if (trade.realizedPnL > 0) {
    perf.winningTrades++;
    perf.totalProfit += trade.realizedPnL;
    perf.largestWin = Math.max(perf.largestWin, trade.realizedPnL);
  } else if (trade.realizedPnL < 0) {
    perf.losingTrades++;
    perf.totalLoss += Math.abs(trade.realizedPnL);
    perf.largestLoss = Math.max(perf.largestLoss, Math.abs(trade.realizedPnL));
  }
  
  perf.winRate = perf.winningTrades / perf.totalTrades;
  perf.avgWin = perf.winningTrades > 0 ? perf.totalProfit / perf.winningTrades : 0;
  perf.avgLoss = perf.losingTrades > 0 ? perf.totalLoss / perf.losingTrades : 0;
  perf.profitFactor = perf.totalLoss > 0 ? perf.totalProfit / perf.totalLoss : 0;
}

function getTodayLoss(): number {
  const today = new Date().toDateString();
  return tradeDatabase.completedTrades
    .filter(t => new Date(t.exitTime).toDateString() === today && t.realizedPnL < 0)
    .reduce((sum, t) => sum + Math.abs(t.realizedPnL), 0);
}

function addTradeAlert(alert: any) {
  tradeDatabase.alerts.push(alert);
  // Keep only last 100 alerts
  if (tradeDatabase.alerts.length > 100) {
    tradeDatabase.alerts = tradeDatabase.alerts.slice(-100);
  }
}

async function getPerformanceAnalytics() {
  const recentTrades = tradeDatabase.completedTrades.slice(-50);
  
  return {
    success: true,
    performance: tradeDatabase.performance,
    recentTrades: recentTrades.length,
    activeTrades: tradeDatabase.activeTrades.size,
    analytics: {
      avgTradeLength: recentTrades.length > 0 ? 
        recentTrades.reduce((sum, t) => sum + t.duration, 0) / recentTrades.length / (1000 * 60) : 0, // minutes
      bestStrategy: getBestStrategy(recentTrades),
      worstStrategy: getWorstStrategy(recentTrades),
      profitBySymbol: getProfitBySymbol(recentTrades),
    },
    timestamp: new Date().toISOString(),
  };
}

async function getTradeAlerts() {
  return {
    success: true,
    alerts: tradeDatabase.alerts.slice(-20), // Last 20 alerts
    totalAlerts: tradeDatabase.alerts.length,
    timestamp: new Date().toISOString(),
  };
}

async function performRiskAnalysis(riskParams: any) {
  const activeTrades = Array.from(tradeDatabase.activeTrades.values());
  const totalRisk = activeTrades.reduce((sum, t) => sum + t.riskAmount, 0);
  const totalValue = activeTrades.reduce((sum, t) => sum + t.positionValue, 0);
  const accountValue = 100000; // This would come from account data
  
  return {
    success: true,
    riskAnalysis: {
      totalRisk,
      totalValue,
      riskPercentage: (totalRisk / accountValue * 100).toFixed(2) + '%',
      valuePercentage: (totalValue / accountValue * 100).toFixed(2) + '%',
      activeTrades: activeTrades.length,
      riskParams,
      recommendations: generateRiskRecommendations(totalRisk, totalValue, accountValue, riskParams),
    },
    timestamp: new Date().toISOString(),
  };
}

function getBestStrategy(trades: any[]) {
  const strategies = new Map();
  trades.forEach(t => {
    if (!strategies.has(t.strategy)) {
      strategies.set(t.strategy, { profit: 0, trades: 0 });
    }
    const s = strategies.get(t.strategy);
    s.profit += t.realizedPnL;
    s.trades++;
  });
  
  let best = { strategy: 'none', profit: 0, trades: 0 };
  strategies.forEach((data, strategy) => {
    if (data.profit > best.profit) {
      best = { strategy, ...data };
    }
  });
  
  return best;
}

function getWorstStrategy(trades: any[]) {
  const strategies = new Map();
  trades.forEach(t => {
    if (!strategies.has(t.strategy)) {
      strategies.set(t.strategy, { profit: 0, trades: 0 });
    }
    const s = strategies.get(t.strategy);
    s.profit += t.realizedPnL;
    s.trades++;
  });
  
  let worst = { strategy: 'none', profit: 0, trades: 0 };
  strategies.forEach((data, strategy) => {
    if (data.profit < worst.profit) {
      worst = { strategy, ...data };
    }
  });
  
  return worst;
}

function getProfitBySymbol(trades: any[]) {
  const symbols = new Map();
  trades.forEach(t => {
    if (!symbols.has(t.symbol)) {
      symbols.set(t.symbol, 0);
    }
    symbols.set(t.symbol, symbols.get(t.symbol) + t.realizedPnL);
  });
  
  return Array.from(symbols.entries()).map(([symbol, profit]) => ({ symbol, profit }));
}

function generateRiskRecommendations(totalRisk: number, totalValue: number, accountValue: number, riskParams: any) {
  const recommendations = [];
  
  const riskPercentage = totalRisk / accountValue;
  if (riskPercentage > (riskParams.maxRiskPerTrade || 0.02) * 3) {
    recommendations.push('Consider reducing position sizes - total risk is high');
  }
  
  const valuePercentage = totalValue / accountValue;
  if (valuePercentage > 0.8) {
    recommendations.push('High capital utilization - consider diversification');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Risk levels are within acceptable parameters');
  }
  
  return recommendations;
}
