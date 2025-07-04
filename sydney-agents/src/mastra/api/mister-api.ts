import { Router } from 'express';
import { mastra } from '../index.js';

/**
 * MISTER API Bridge Layer
 * Connects the MISTER frontend to the existing Mastra agent system
 * Translates REST API calls to Mastra agent tool calls
 */

const router = Router();

// Helper function to call Mastra agents using the correct API format
async function callAgent(agentName: string, toolName: string, input: any = {}) {
  try {
    const agent = mastra.agents[agentName];
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    // Create the message to request tool usage
    const inputStr = Object.keys(input).length > 0 ? ` with input: ${JSON.stringify(input)}` : '';
    const message = `Use the ${toolName} tool${inputStr}`;

    const result = await agent.generate(
      [{ role: 'user', content: message }],
      {
        tools: { [toolName]: agent.tools[toolName] }
      }
    );

    // Extract the tool result from the response
    if (result.toolResults && result.toolResults.length > 0) {
      const toolResult = result.toolResults[0];
      return {
        success: true,
        data: toolResult.result,
      };
    }

    return {
      success: true,
      data: result.text || result,
    };
  } catch (error) {
    console.error(`Error calling ${agentName}.${toolName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Authentication endpoints
router.post('/auth/wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // For now, create a simple JWT token
    const token = `mister_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      success: true,
      data: {
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        userId: walletAddress.substring(0, 12), // Use first 12 chars as user ID
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

router.get('/auth/me', async (req, res) => {
  // Simple auth check - in production this would validate JWT
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  res.json({
    success: true,
    data: {
      id: 'demo_user',
      createdAt: new Date(),
      lastLogin: new Date(),
    }
  });
});

// Dashboard endpoints
router.get('/dashboard', async (req, res) => {
  try {
    // Get wallet stats and market info from Strike agent
    const [walletStats, marketInfo, copyTradingStatus] = await Promise.all([
      callAgent('strikeAgent', 'getActiveManagedWallets'),
      callAgent('strikeAgent', 'getMarketInfo'),
      callAgent('strikeAgent', 'getCopyTradingStatus'),
    ]);

    // Mock dashboard data structure expected by frontend
    const dashboardData = {
      totalBalance: 1250.75,
      totalPnL: 125.50,
      totalPnLPercentage: 11.2,
      activePositions: 3,
      todaysPnL: 45.25,
      todaysPnLPercentage: 3.8,
      winRate: 68.5,
      totalTrades: 47,
      managedWallets: walletStats.success ? walletStats.data : [],
      marketInfo: marketInfo.success ? marketInfo.data : null,
      serviceStatus: copyTradingStatus.success ? copyTradingStatus.data : { isRunning: false },
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

// Positions endpoints
router.get('/positions', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Get active wallets and their positions
    const walletsResult = await callAgent('strikeAgent', 'getActiveManagedWallets');
    
    if (!walletsResult.success) {
      return res.json({
        success: true,
        data: [] // Return empty array if no wallets
      });
    }

    // Mock positions data - in production this would fetch real positions
    const positions = [
      {
        id: 'pos_1',
        pair: 'ADA/USD',
        side: 'Long',
        size: 1000,
        leverage: 5,
        entryPrice: 0.45,
        currentPrice: 0.47,
        pnl: 100,
        pnlPercentage: 4.4,
        openTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'Open'
      }
    ];

    res.json({
      success: true,
      data: positions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch positions'
    });
  }
});

// AI Activity endpoints
router.get('/ai-activity', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    // Mock AI activity data - in production this would come from agent memory
    const activities = [
      {
        id: 'activity_1',
        type: 'signal',
        message: 'TITAN2K generated Long signal for ADA/USD',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        data: {
          pair: 'ADA/USD',
          action: 'Open',
          side: 'Long',
          confidence: 0.85
        }
      },
      {
        id: 'activity_2', 
        type: 'trade',
        message: 'Executed Long position on ADA/USD',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        data: {
          pair: 'ADA/USD',
          size: 1000,
          price: 0.45
        }
      }
    ];

    res.json({
      success: true,
      data: activities.slice(0, Number(limit))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI activity'
    });
  }
});

// Wallet management endpoints
router.post('/wallet/create', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const result = await callAgent('strikeAgent', 'createManagedWallet', { userId });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create wallet'
    });
  }
});

router.get('/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const result = await callAgent('strikeAgent', 'getWalletInfo', { address });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet info'
    });
  }
});

// Market data endpoints (public)
router.get('/market-data/price/:pair', async (req, res) => {
  try {
    const { pair } = req.params;

    if (!pair) {
      return res.status(400).json({
        success: false,
        error: 'Trading pair is required'
      });
    }

    const marketInfo = await callAgent('strikeAgent', 'getMarketInfo');

    // Mock price data - in production this would be real market data
    const priceData = {
      pair,
      price: 0.47,
      change24h: 0.025,
      change24hPercentage: 5.6,
      volume24h: 1250000,
      timestamp: new Date()
    };

    res.json({
      success: true,
      data: priceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data'
    });
  }
});

// Trading control endpoints
router.post('/trading/start', async (req, res) => {
  try {
    const result = await callAgent('strikeAgent', 'startCopyTrading');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start copy trading'
    });
  }
});

router.post('/trading/stop', async (req, res) => {
  try {
    const result = await callAgent('strikeAgent', 'stopCopyTrading');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop copy trading'
    });
  }
});

router.get('/trading/status', async (req, res) => {
  try {
    const result = await callAgent('strikeAgent', 'getCopyTradingStatus');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get trading status'
    });
  }
});

export { router as misterApiRouter };
