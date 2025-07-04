import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { simpleMisterApiRouter } from '../api/simple-mister-api.js';
import { mastra } from '../index.js';

/**
 * MISTER Server Extension for Mastra
 * Adds Express API routes and WebSocket support to the existing Mastra system
 * Runs alongside the Mastra playground on port 4112
 */

export class MisterServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer | null = null;
  private port: number;

  constructor(port: number = 4113) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: [
        'http://localhost:3000',  // Next.js frontend
        'http://localhost:3001',  // Alternative frontend port
        'http://localhost:4112',  // Mastra playground
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'MISTER API Server',
        timestamp: new Date().toISOString(),
        mastraAgents: Object.keys(mastra.agents),
      });
    });

    // MISTER API routes
    this.app.use('/api', simpleMisterApiRouter);

    // Mastra agent proxy (for direct agent access)
    this.app.get('/api/agents', (req, res) => {
      const agentInfo = Object.keys(mastra.agents).reduce((acc, agentName) => {
        const agent = mastra.agents[agentName];
        acc[agentName] = {
          name: agent.name || agentName,
          tools: Object.keys(agent.tools || {}),
          instructions: agent.instructions ? agent.instructions.substring(0, 200) + '...' : 'No instructions',
        };
        return acc;
      }, {} as any);

      res.json({
        success: true,
        data: agentInfo,
      });
    });

    // Direct Strike agent tool execution (simplified)
    this.app.post('/api/strike/createWallet', async (req, res) => {
      try {
        const { userId } = req.body;
        const agent = mastra.agents.strikeAgent;

        const result = await agent.generate(
          [{ role: 'user', content: `Use the createManagedWallet tool with userId: ${userId || 'demo_user'}` }]
        );

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.get('/api/strike/wallets', async (req, res) => {
      try {
        const agent = mastra.agents.strikeAgent;

        const result = await agent.generate(
          [{ role: 'user', content: 'Use the getActiveManagedWallets tool to get all active wallets' }]
        );

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.get('/api/strike/status', async (req, res) => {
      try {
        const agent = mastra.agents.strikeAgent;

        const result = await agent.generate(
          [{ role: 'user', content: 'Use the getCopyTradingStatus tool to check the trading service status' }]
        );

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: [
          'GET /health',
          'GET /api/agents',
          'POST /api/agents/:agentName/tools/:toolName',
          'POST /api/auth/wallet',
          'GET /api/auth/me',
          'GET /api/dashboard',
          'GET /api/positions',
          'GET /api/ai-activity',
          'POST /api/wallet/create',
          'GET /api/wallet/:address',
          'GET /api/market-data/price/:pair',
          'POST /api/trading/start',
          'POST /api/trading/stop',
          'GET /api/trading/status',
        ],
      });
    });

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Server error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    });
  }

  private setupWebSocket() {
    if (!this.server) {
      console.error('HTTP server not initialized');
      return;
    }

    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      console.log(`🔌 WebSocket client connected from ${req.socket.remoteAddress}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        data: {
          message: 'Connected to MISTER WebSocket server',
          timestamp: new Date().toISOString(),
          supportedChannels: [
            'price_update',
            'position_update',
            'ai_activity',
            'system_status',
            'portfolio_update'
          ]
        }
      }));

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' }
          }));
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log('🌐 WebSocket server initialized');
  }

  private handleWebSocketMessage(ws: any, message: any) {
    const { type, data } = message;

    switch (type) {
      case 'subscribe':
        // Handle subscription to specific channels
        console.log(`📡 Client subscribed to: ${data.channel}`);
        ws.send(JSON.stringify({
          type: 'subscription_confirmed',
          data: { channel: data.channel, timestamp: new Date().toISOString() }
        }));
        break;

      case 'unsubscribe':
        // Handle unsubscription
        console.log(`📡 Client unsubscribed from: ${data.channel}`);
        break;

      case 'ping':
        // Handle ping/pong for connection health
        ws.send(JSON.stringify({
          type: 'pong',
          data: { timestamp: new Date().toISOString() }
        }));
        break;

      default:
        console.log(`❓ Unknown WebSocket message type: ${type}`);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: `Unknown message type: ${type}` }
        }));
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app);
        
        this.server.listen(this.port, () => {
          console.log(`🚀 MISTER API Server running on port ${this.port}`);
          console.log(`📊 Dashboard: http://localhost:${this.port}/health`);
          console.log(`🔗 API Base: http://localhost:${this.port}/api`);
          console.log(`🤖 Agents: http://localhost:${this.port}/api/agents`);
          
          // Setup WebSocket after HTTP server is running
          this.setupWebSocket();
          
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`❌ Port ${this.port} is already in use`);
            reject(new Error(`Port ${this.port} is already in use`));
          } else {
            console.error('❌ Server error:', error);
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          console.log('🔌 WebSocket server closed');
        });
      }

      if (this.server) {
        this.server.close(() => {
          console.log('🛑 MISTER API Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public broadcast(message: any): void {
    if (!this.wss) return;

    const messageStr = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(messageStr);
      }
    });
  }
}

// Export singleton instance
export const misterServer = new MisterServer();
