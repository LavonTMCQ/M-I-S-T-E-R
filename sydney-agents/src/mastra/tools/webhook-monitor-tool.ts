import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Global webhook server state
let webhookServer: any = null;
let wsServer: WebSocketServer | null = null;
let connectedClients: Set<any> = new Set();

// In-memory storage for real-time data
const realtimeData = {
  signals: [] as any[],
  trades: [] as any[],
  alerts: [] as any[],
  subscribers: new Set<string>(),
};

export const webhookMonitorTool = createTool({
  id: "webhook-monitor",
  description: "Set up webhook monitoring for real-time trading signals, trade execution, and alerts with WebSocket support",
  inputSchema: z.object({
    action: z.enum(['start', 'stop', 'status', 'configure']).describe("Webhook server action"),
    port: z.number().optional().default(8080).describe("Port for webhook server"),
    endpoints: z.array(z.string()).optional().default(['/signals', '/trades', '/alerts']).describe("Webhook endpoints to create"),
    enableWebSocket: z.boolean().optional().default(true).describe("Enable WebSocket for real-time updates"),
    voiceAlerts: z.boolean().optional().default(true).describe("Enable voice announcements for critical events"),
    filters: z.object({
      minSignalStrength: z.number().optional().default(0.7).describe("Minimum signal strength to process"),
      symbols: z.array(z.string()).optional().describe("Filter by specific symbols"),
      strategies: z.array(z.string()).optional().describe("Filter by specific strategies"),
    }).optional(),
  }),
  execute: async ({ context }) => {
    const { action, port = 8080, endpoints = ['/signals', '/trades', '/alerts'], enableWebSocket = true, voiceAlerts = true, filters = {} } = context;

    try {
      switch (action) {
        case 'start':
          return await startWebhookServer(port, endpoints, enableWebSocket, voiceAlerts, filters);
        
        case 'stop':
          return await stopWebhookServer();
        
        case 'status':
          return getWebhookStatus();
        
        case 'configure':
          return await configureWebhooks(filters);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('❌ Webhook monitor error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  },
});

async function startWebhookServer(port: number, endpoints: string[], enableWebSocket: boolean, voiceAlerts: boolean, filters: any) {
  if (webhookServer) {
    return {
      success: false,
      error: "Webhook server already running",
      port: webhookServer.port,
      status: "already_running",
    };
  }

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
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      endpoints: endpoints,
      websocket: enableWebSocket,
      voiceAlerts: voiceAlerts,
    });
  });

  // Dynamic webhook endpoints
  endpoints.forEach(endpoint => {
    app.post(endpoint, async (req, res) => {
      try {
        const data = req.body;
        const timestamp = new Date().toISOString();
        
        console.log(`📡 Webhook received on ${endpoint}:`, JSON.stringify(data, null, 2));

        // Process based on endpoint type
        let processedData;
        if (endpoint.includes('signal')) {
          processedData = await processSignal(data, filters, voiceAlerts);
          realtimeData.signals.push({ ...processedData, timestamp, endpoint });
        } else if (endpoint.includes('trade')) {
          processedData = await processTrade(data, filters, voiceAlerts);
          realtimeData.trades.push({ ...processedData, timestamp, endpoint });
        } else if (endpoint.includes('alert')) {
          processedData = await processAlert(data, filters, voiceAlerts);
          realtimeData.alerts.push({ ...processedData, timestamp, endpoint });
        } else {
          processedData = { ...data, processed: true };
        }

        // Broadcast to WebSocket clients
        if (enableWebSocket && wsServer) {
          broadcastToClients({
            type: endpoint.replace('/', ''),
            data: processedData,
            timestamp,
          });
        }

        res.json({
          success: true,
          message: `Webhook processed successfully`,
          endpoint,
          timestamp,
          processed: processedData,
        });

      } catch (error) {
        console.error(`❌ Error processing webhook ${endpoint}:`, error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          endpoint,
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  // Start HTTP server
  const server = createServer(app);
  
  // Setup WebSocket if enabled
  if (enableWebSocket) {
    wsServer = new WebSocketServer({ server });
    
    wsServer.on('connection', (ws, req) => {
      console.log(`🔌 WebSocket client connected from ${req.socket.remoteAddress}`);
      connectedClients.add(ws);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to Sydney Trading Webhook Monitor',
        timestamp: new Date().toISOString(),
        endpoints: endpoints,
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('📨 WebSocket message received:', data);
          
          // Handle client commands
          if (data.type === 'subscribe') {
            realtimeData.subscribers.add(data.clientId || 'anonymous');
            ws.send(JSON.stringify({
              type: 'subscribed',
              message: 'Successfully subscribed to real-time updates',
              timestamp: new Date().toISOString(),
            }));
          }
        } catch (error) {
          console.error('❌ WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        connectedClients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        connectedClients.delete(ws);
      });
    });
  }

  return new Promise((resolve) => {
    server.listen(port, () => {
      webhookServer = { server, app, port, endpoints, enableWebSocket, voiceAlerts };
      console.log(`🚀 Webhook server started on port ${port}`);
      console.log(`📡 Endpoints: ${endpoints.map(e => `http://localhost:${port}${e}`).join(', ')}`);
      if (enableWebSocket) {
        console.log(`🔌 WebSocket server enabled on ws://localhost:${port}`);
      }

      resolve({
        success: true,
        message: "Webhook server started successfully",
        port,
        endpoints: endpoints.map(e => `http://localhost:${port}${e}`),
        websocket: enableWebSocket ? `ws://localhost:${port}` : null,
        healthCheck: `http://localhost:${port}/health`,
        voiceAlerts,
        timestamp: new Date().toISOString(),
      });
    });
  });
}

async function stopWebhookServer() {
  if (!webhookServer) {
    return {
      success: false,
      error: "No webhook server running",
      status: "not_running",
    };
  }

  return new Promise((resolve) => {
    // Close WebSocket server
    if (wsServer) {
      connectedClients.forEach(client => {
        client.close();
      });
      connectedClients.clear();
      wsServer.close();
      wsServer = null;
    }

    // Close HTTP server
    webhookServer.server.close(() => {
      const port = webhookServer.port;
      webhookServer = null;
      
      console.log(`🛑 Webhook server stopped on port ${port}`);
      
      resolve({
        success: true,
        message: "Webhook server stopped successfully",
        port,
        timestamp: new Date().toISOString(),
      });
    });
  });
}

function getWebhookStatus() {
  if (!webhookServer) {
    return {
      success: true,
      status: "stopped",
      server: null,
      realtimeData: {
        signalsCount: realtimeData.signals.length,
        tradesCount: realtimeData.trades.length,
        alertsCount: realtimeData.alerts.length,
        subscribersCount: realtimeData.subscribers.size,
      },
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: true,
    status: "running",
    server: {
      port: webhookServer.port,
      endpoints: webhookServer.endpoints,
      websocket: webhookServer.enableWebSocket,
      voiceAlerts: webhookServer.voiceAlerts,
      connectedClients: connectedClients.size,
    },
    realtimeData: {
      signalsCount: realtimeData.signals.length,
      tradesCount: realtimeData.trades.length,
      alertsCount: realtimeData.alerts.length,
      subscribersCount: realtimeData.subscribers.size,
      recentSignals: realtimeData.signals.slice(-5),
      recentTrades: realtimeData.trades.slice(-5),
      recentAlerts: realtimeData.alerts.slice(-5),
    },
    timestamp: new Date().toISOString(),
  };
}

async function configureWebhooks(filters: any) {
  // Update filters and configuration
  console.log('⚙️ Configuring webhook filters:', filters);
  
  return {
    success: true,
    message: "Webhook configuration updated",
    filters,
    timestamp: new Date().toISOString(),
  };
}

async function processSignal(data: any, filters: any, voiceAlerts: boolean) {
  console.log('📊 Processing trading signal:', data);
  
  // Apply filters
  if (filters.minSignalStrength && data.strength < filters.minSignalStrength) {
    console.log(`⚠️ Signal strength ${data.strength} below threshold ${filters.minSignalStrength}`);
    return { ...data, filtered: true, reason: 'strength_too_low' };
  }

  if (filters.symbols && !filters.symbols.includes(data.symbol)) {
    console.log(`⚠️ Symbol ${data.symbol} not in filter list`);
    return { ...data, filtered: true, reason: 'symbol_not_allowed' };
  }

  // Voice alert for strong signals
  if (voiceAlerts && data.strength >= 0.8) {
    console.log(`🔊 SIGNAL ALERT: ${data.action} ${data.symbol} at ${data.price} (Strength: ${data.strength})`);
    // TODO: Integrate with voice system
  }

  return {
    ...data,
    processed: true,
    filtered: false,
    processedAt: new Date().toISOString(),
  };
}

async function processTrade(data: any, _filters: any, voiceAlerts: boolean) {
  console.log('💰 Processing trade execution:', data);
  
  // Voice alert for trade execution
  if (voiceAlerts) {
    const profit = data.profit || 0;
    const status = profit > 0 ? 'PROFIT' : profit < 0 ? 'LOSS' : 'BREAKEVEN';
    console.log(`🔊 TRADE ${status}: ${data.action} ${data.symbol} - ${profit > 0 ? '+' : ''}$${profit}`);
    // TODO: Integrate with voice system
  }

  return {
    ...data,
    processed: true,
    processedAt: new Date().toISOString(),
  };
}

async function processAlert(data: any, _filters: any, voiceAlerts: boolean) {
  console.log('🚨 Processing alert:', data);
  
  // Voice alert for critical alerts
  if (voiceAlerts && data.priority === 'high') {
    console.log(`🔊 CRITICAL ALERT: ${data.message}`);
    // TODO: Integrate with voice system
  }

  return {
    ...data,
    processed: true,
    processedAt: new Date().toISOString(),
  };
}

function broadcastToClients(message: any) {
  const messageStr = JSON.stringify(message);
  connectedClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(messageStr);
    }
  });
  console.log(`📡 Broadcasted to ${connectedClients.size} WebSocket clients`);
}