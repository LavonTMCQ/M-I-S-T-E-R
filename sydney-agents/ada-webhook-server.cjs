#!/usr/bin/env node

/**
 * 🚀 ADA WEBHOOK MONITORING SERVER
 * 
 * Dedicated webhook server for real-time ADA trading signals and trade execution monitoring.
 * Integrates with TradingView alerts and provides voice announcements for all ADA activity.
 * 
 * Features:
 * - Real-time ADA signal processing
 * - TradingView Pine Script integration
 * - Voice announcements via Google TTS
 * - WebSocket support for live updates
 * - Trade execution monitoring
 * - Memory persistence for trading history
 */

const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ADA Webhook Server Configuration
const CONFIG = {
  port: 8080,
  voiceEnabled: true,
  adaSymbols: ['ADAUSD', 'ADAUSDT', 'ADA/USD', 'ADA/USDT'],
  endpoints: {
    signals: '/ada/signals',
    trades: '/ada/trades', 
    alerts: '/ada/alerts',
    health: '/health',
    status: '/ada/status'
  }
};

// In-memory ADA data storage
const adaData = {
  signals: [],
  trades: [],
  alerts: [],
  performance: {
    totalSignals: 0,
    totalTrades: 0,
    winningTrades: 0,
    totalProfit: 0,
    hitRate: 0,
    profitFactor: 0
  },
  subscribers: new Set(),
  startTime: new Date().toISOString()
};

// WebSocket clients
let wsServer = null;
let connectedClients = new Set();

// Initialize Express app
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get(CONFIG.endpoints.health, (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ADA Webhook Monitor',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    endpoints: Object.values(CONFIG.endpoints),
    adaData: {
      signals: adaData.signals.length,
      trades: adaData.trades.length,
      alerts: adaData.alerts.length,
      subscribers: adaData.subscribers.size
    }
  });
});

// ADA Status endpoint
app.get(CONFIG.endpoints.status, (req, res) => {
  res.json({
    success: true,
    service: 'ADA Webhook Monitor',
    performance: adaData.performance,
    recentSignals: adaData.signals.slice(-5),
    recentTrades: adaData.trades.slice(-3),
    connectedClients: connectedClients.size,
    timestamp: new Date().toISOString()
  });
});

// ADA Signals webhook endpoint
app.post(CONFIG.endpoints.signals, async (req, res) => {
  try {
    const signalData = req.body;
    const timestamp = new Date().toISOString();
    
    console.log(`📊 ADA SIGNAL RECEIVED:`, JSON.stringify(signalData, null, 2));

    // Validate ADA signal
    const validation = validateAdaSignal(signalData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ADA signal',
        errors: validation.errors,
        timestamp
      });
    }

    // Process ADA signal
    const processedSignal = await processAdaSignal(signalData, timestamp);
    
    // Store signal
    adaData.signals.push(processedSignal);
    adaData.performance.totalSignals++;
    
    // Voice announcement
    if (CONFIG.voiceEnabled && processedSignal.strength >= 0.7) {
      await announceAdaSignal(processedSignal);
    }

    // Broadcast to WebSocket clients
    broadcastToClients({
      type: 'ada_signal',
      data: processedSignal,
      timestamp
    });

    res.json({
      success: true,
      message: 'ADA signal processed successfully',
      signal: processedSignal,
      timestamp
    });

  } catch (error) {
    console.error('❌ ADA Signal processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ADA Trades webhook endpoint
app.post(CONFIG.endpoints.trades, async (req, res) => {
  try {
    const tradeData = req.body;
    const timestamp = new Date().toISOString();
    
    console.log(`💰 ADA TRADE RECEIVED:`, JSON.stringify(tradeData, null, 2));

    // Process ADA trade
    const processedTrade = await processAdaTrade(tradeData, timestamp);
    
    // Store trade
    adaData.trades.push(processedTrade);
    adaData.performance.totalTrades++;
    
    // Update performance metrics
    updateAdaPerformance(processedTrade);
    
    // Voice announcement
    if (CONFIG.voiceEnabled) {
      await announceAdaTrade(processedTrade);
    }

    // Broadcast to WebSocket clients
    broadcastToClients({
      type: 'ada_trade',
      data: processedTrade,
      timestamp
    });

    res.json({
      success: true,
      message: 'ADA trade processed successfully',
      trade: processedTrade,
      performance: adaData.performance,
      timestamp
    });

  } catch (error) {
    console.error('❌ ADA Trade processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ADA Alerts webhook endpoint
app.post(CONFIG.endpoints.alerts, async (req, res) => {
  try {
    const alertData = req.body;
    const timestamp = new Date().toISOString();
    
    console.log(`🚨 ADA ALERT RECEIVED:`, JSON.stringify(alertData, null, 2));

    // Process ADA alert
    const processedAlert = await processAdaAlert(alertData, timestamp);
    
    // Store alert
    adaData.alerts.push(processedAlert);
    
    // Voice announcement for critical alerts
    if (CONFIG.voiceEnabled && processedAlert.priority === 'high') {
      await announceAdaAlert(processedAlert);
    }

    // Broadcast to WebSocket clients
    broadcastToClients({
      type: 'ada_alert',
      data: processedAlert,
      timestamp
    });

    res.json({
      success: true,
      message: 'ADA alert processed successfully',
      alert: processedAlert,
      timestamp
    });

  } catch (error) {
    console.error('❌ ADA Alert processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Signal validation function
function validateAdaSignal(signal) {
  const errors = [];
  
  if (!signal.symbol || !CONFIG.adaSymbols.some(s => signal.symbol.toUpperCase().includes('ADA'))) {
    errors.push('Invalid or missing ADA symbol');
  }
  
  if (!signal.action || !['BUY', 'SELL', 'LONG', 'SHORT'].includes(signal.action.toUpperCase())) {
    errors.push('Invalid action');
  }
  
  if (!signal.price || typeof signal.price !== 'number' || signal.price <= 0) {
    errors.push('Invalid price');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Process ADA signal
async function processAdaSignal(signal, timestamp) {
  const strength = signal.strength || calculateSignalStrength(signal);
  
  return {
    id: `ada_signal_${Date.now()}`,
    symbol: signal.symbol.toUpperCase(),
    action: signal.action.toUpperCase(),
    price: signal.price,
    strength: strength,
    strategy: signal.strategy || 'Unknown',
    timeframe: signal.timeframe || '5m',
    indicators: signal.indicators || {},
    timestamp,
    processed: true,
    source: 'webhook'
  };
}

// Process ADA trade
async function processAdaTrade(trade, timestamp) {
  const profit = trade.profit || 0;
  const isWinning = profit > 0;
  
  return {
    id: `ada_trade_${Date.now()}`,
    symbol: trade.symbol.toUpperCase(),
    action: trade.action.toUpperCase(),
    entryPrice: trade.entryPrice || trade.price,
    exitPrice: trade.exitPrice,
    quantity: trade.quantity || 0,
    profit: profit,
    profitPercent: trade.profitPercent || 0,
    isWinning: isWinning,
    timestamp,
    processed: true,
    source: 'webhook'
  };
}

// Process ADA alert
async function processAdaAlert(alert, timestamp) {
  return {
    id: `ada_alert_${Date.now()}`,
    message: alert.message || 'ADA Alert',
    priority: alert.priority || 'medium',
    symbol: alert.symbol || 'ADA',
    data: alert.data || {},
    timestamp,
    processed: true,
    source: 'webhook'
  };
}

// Calculate signal strength
function calculateSignalStrength(signal) {
  let strength = 0.5; // Base strength
  
  // Adjust based on indicators
  if (signal.indicators) {
    if (signal.indicators.rsi) {
      const rsi = signal.indicators.rsi;
      if ((signal.action === 'BUY' && rsi < 30) || (signal.action === 'SELL' && rsi > 70)) {
        strength += 0.2;
      }
    }
    
    if (signal.indicators.macd && signal.indicators.macd > 0 && signal.action === 'BUY') {
      strength += 0.1;
    }
  }
  
  return Math.min(1, Math.max(0, strength));
}

// Update ADA performance metrics
function updateAdaPerformance(trade) {
  if (trade.isWinning) {
    adaData.performance.winningTrades++;
    adaData.performance.totalProfit += trade.profit;
  }
  
  adaData.performance.hitRate = adaData.performance.totalTrades > 0 ? 
    (adaData.performance.winningTrades / adaData.performance.totalTrades) * 100 : 0;
}

// Voice announcement functions
async function announceAdaSignal(signal) {
  const message = `ADA ${signal.action} signal detected at $${signal.price.toFixed(4)} with ${Math.round(signal.strength * 100)}% strength using ${signal.strategy} strategy`;
  await speakMessage(message);
}

async function announceAdaTrade(trade) {
  const result = trade.isWinning ? 'PROFIT' : 'LOSS';
  const message = `ADA trade completed: ${result} of $${Math.abs(trade.profit).toFixed(2)} on ${trade.symbol}`;
  await speakMessage(message);
}

async function announceAdaAlert(alert) {
  const message = `ADA Alert: ${alert.message}`;
  await speakMessage(message);
}

async function speakMessage(message) {
  if (!CONFIG.voiceEnabled) return;
  
  console.log(`🔊 ADA VOICE: ${message}`);
  
  // Use macOS say command for immediate voice output
  exec(`say "${message}"`, (error) => {
    if (error) {
      console.error('❌ Voice announcement failed:', error);
    } else {
      console.log('✅ ADA voice announcement completed');
    }
  });
}

// WebSocket broadcast function
function broadcastToClients(message) {
  if (!wsServer || connectedClients.size === 0) return;
  
  const messageStr = JSON.stringify(message);
  connectedClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(messageStr);
    }
  });
  console.log(`📡 Broadcasted ADA update to ${connectedClients.size} clients`);
}

// Start the server
function startAdaWebhookServer() {
  const server = createServer(app);
  
  // Setup WebSocket server
  wsServer = new WebSocketServer({ server });
  
  wsServer.on('connection', (ws, req) => {
    console.log(`🔌 ADA WebSocket client connected from ${req.socket.remoteAddress}`);
    connectedClients.add(ws);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to ADA Webhook Monitor',
      timestamp: new Date().toISOString(),
      endpoints: CONFIG.endpoints
    }));
    
    ws.on('close', () => {
      console.log('🔌 ADA WebSocket client disconnected');
      connectedClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('❌ ADA WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });
  
  // Start HTTP server
  server.listen(CONFIG.port, () => {
    console.log(`🚀 ADA Webhook Monitor started on port ${CONFIG.port}`);
    console.log(`📡 ADA Endpoints:`);
    Object.entries(CONFIG.endpoints).forEach(([name, endpoint]) => {
      console.log(`   ${name}: http://localhost:${CONFIG.port}${endpoint}`);
    });
    console.log(`🔌 WebSocket: ws://localhost:${CONFIG.port}`);
    
    // Voice announcement
    if (CONFIG.voiceEnabled) {
      speakMessage('ADA Webhook monitoring system is now online and ready to receive TradingView alerts');
    }
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ADA Webhook Monitor...');
  if (CONFIG.voiceEnabled) {
    speakMessage('ADA Webhook monitoring system is shutting down');
  }
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startAdaWebhookServer();
}

module.exports = { startAdaWebhookServer, CONFIG, adaData };
