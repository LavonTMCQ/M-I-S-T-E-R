import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import crypto from 'crypto';

// Phemex API Configuration - SECURE READ-ONLY CREDENTIALS (Updated)
const PHEMEX_API_KEY = '26be9f42-458d-4800-9b9e-3ac487f90c48';
const PHEMEX_SECRET = '31xtEzKvyVPRzAY1mk64FcEJz7YhxlRuy2BCrH6qN6k5ZjI3OTg4OC1lZTY1LTQ5NDgtYWM4Yi02OGQ3MjljYzIxY2I';
const PHEMEX_BASE_URL = 'https://api.phemex.com';

// Helper function to create Phemex signature
function createPhemexSignature(path: string, queryString: string, body: string, expiry: number): string {
  // Phemex signature format: PATH + QUERY_STRING + EXPIRY + BODY
  const message = path + queryString + expiry + body;
  return crypto.createHmac('sha256', PHEMEX_SECRET).update(message).digest('hex');
}

// Helper function to make authenticated Phemex API calls
async function makePhemexRequest(method: string, endpoint: string, params: any = {}) {
  // Use expiry time (current time + 1 minute) as per Phemex docs
  const expiry = Math.floor(Date.now() / 1000) + 60; // Unix timestamp in seconds + 1 minute
  const queryString = method === 'GET' ? new URLSearchParams(params).toString() : '';
  const body = method !== 'GET' ? JSON.stringify(params) : '';
  const path = endpoint + (queryString ? '?' + queryString : '');

  const signature = createPhemexSignature(endpoint, queryString, body, expiry);

  const headers = {
    'x-phemex-access-token': PHEMEX_API_KEY,
    'x-phemex-request-signature': signature,
    'x-phemex-request-expiry': expiry.toString(),
    'Content-Type': 'application/json',
  };

  const url = PHEMEX_BASE_URL + path;
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? body : undefined,
    });

    if (!response.ok) {
      throw new Error(`Phemex API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Phemex API request failed:', error);
    throw error;
  }
}

export const getAccountInfoTool = new Tool({
  id: 'getAccountInfo',
  description: 'Get current account balance, equity, and margin information from Phemex USDM perpetual account',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // Try multiple endpoints to get complete account information
      console.log('🔍 Fetching account equity and balance information...');

      // Primary endpoint for USDM perpetual contracts
      const accountData = await makePhemexRequest('GET', '/g-accounts/accountPositions', { currency: 'USDT' });

      if (accountData.code !== 0) {
        throw new Error(`Phemex API error: ${accountData.msg}`);
      }

      const account = accountData.data.account;
      const positions = accountData.data.positions || [];

      console.log('📊 Raw account data:', JSON.stringify(account, null, 2));

      // Calculate total equity and margin usage for USDM contracts
      const totalEquity = parseFloat(account.accountBalanceRv || account.accountBalanceEv || 0) / (account.accountBalanceEv ? 10000 : 1);
      const usedBalance = parseFloat(account.totalUsedBalanceRv || account.totalUsedBalanceEv || 0) / (account.totalUsedBalanceEv ? 10000 : 1);
      const availableBalance = totalEquity - usedBalance;
      const marginRatio = totalEquity > 0 ? (usedBalance / totalEquity) : 0;

      return {
        success: true,
        data: {
          totalEquity: totalEquity,
          availableBalance: availableBalance,
          marginUsed: usedBalance,
          marginRatio: marginRatio,
          marginUtilization: (marginRatio * 100).toFixed(2) + '%',
          currency: account.currency || 'USDT',
          accountId: account.accountId,
          positionCount: positions.length,
          accountStatus: account.status || 'Normal',
          timestamp: new Date().toISOString(),
          debug: {
            rawEquity: account.accountBalanceRv || account.accountBalanceEv,
            rawUsedBalance: account.totalUsedBalanceRv || account.totalUsedBalanceEv,
            conversionFactor: account.accountBalanceEv ? 10000 : 1,
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get account info: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

// Dedicated tool for getting account equity - backup method
export const getAccountEquityTool = new Tool({
  id: 'getAccountEquity',
  description: 'Get detailed account equity, balance, and financial summary for USDM perpetual trading',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      console.log('💰 Fetching detailed account equity information...');

      // Try the wallet endpoint for balance information
      const walletData = await makePhemexRequest('GET', '/phemex-user/wallets/v2/depositAddress', { currency: 'USDT' });

      // Also get positions for complete picture
      const positionsData = await makePhemexRequest('GET', '/g-accounts/positions', { currency: 'USDT' });

      if (positionsData.code !== 0) {
        throw new Error(`Phemex positions API error: ${positionsData.msg}`);
      }

      const positions = positionsData.data.positions || [];
      const openPositions = positions.filter((pos: any) => parseFloat(pos.sizeRq || pos.size || 0) !== 0);

      // Calculate total unrealized PnL
      const totalUnrealizedPnl = openPositions.reduce((sum: number, pos: any) => {
        const pnl = parseFloat(pos.unRealisedPnlRv || pos.unrealisedPnlEv || 0) / (pos.unrealisedPnlEv ? 10000 : 1);
        return sum + pnl;
      }, 0);

      // Calculate total margin used
      const totalMarginUsed = openPositions.reduce((sum: number, pos: any) => {
        const margin = parseFloat(pos.usedBalanceRv || pos.usedBalanceEv || 0) / (pos.usedBalanceEv ? 10000 : 1);
        return sum + margin;
      }, 0);

      return {
        success: true,
        data: {
          totalUnrealizedPnl: totalUnrealizedPnl,
          totalMarginUsed: totalMarginUsed,
          openPositionsCount: openPositions.length,
          positionsSummary: openPositions.map((pos: any) => ({
            symbol: pos.symbol,
            side: pos.posSide === 'Long' ? 'LONG' : 'SHORT',
            unrealizedPnl: parseFloat(pos.unRealisedPnlRv || pos.unrealisedPnlEv || 0) / (pos.unrealisedPnlEv ? 10000 : 1),
            marginUsed: parseFloat(pos.usedBalanceRv || pos.usedBalanceEv || 0) / (pos.usedBalanceEv ? 10000 : 1),
          })),
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      console.error('❌ Account equity fetch failed:', error);
      return {
        success: false,
        error: `Failed to fetch account equity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

export const getCurrentPositionsTool = new Tool({
  id: 'getCurrentPositions',
  description: 'Get all current open positions with P&L, size, and margin details',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // Try both endpoints to get complete position data
      console.log('🔍 DEBUG: Trying /g-accounts/positions endpoint...');
      const accountData = await makePhemexRequest('GET', '/g-accounts/positions', { currency: 'USDT' });

      console.log('🔍 DEBUG: Trying /g-accounts/accountPositions endpoint...');
      const accountData2 = await makePhemexRequest('GET', '/g-accounts/accountPositions', { currency: 'USDT' });

      if (accountData.code !== 0) {
        throw new Error(`Phemex API error: ${accountData.msg}`);
      }

      console.log('🔍 DEBUG: Raw Phemex API response:', JSON.stringify(accountData, null, 2));

      const positions = accountData.data.positions || [];
      console.log(`🔍 DEBUG: Total positions found: ${positions.length}`);

      // Log all positions before filtering
      positions.forEach((pos: any, index: number) => {
        const size = parseFloat(pos.sizeRq || pos.size || 0);
        console.log(`🔍 DEBUG: Position ${index + 1}: ${pos.symbol}, size: ${size}, sizeRq: ${pos.sizeRq}, size: ${pos.size}`);
      });

      const openPositions = positions.filter((pos: any) => parseFloat(pos.sizeRq || pos.size || 0) !== 0);
      console.log(`🔍 DEBUG: Open positions after filtering: ${openPositions.length}`);

      const formattedPositions = openPositions.map((pos: any) => {
        // Handle hedged positions properly - use posSide for accurate side detection
        const size = parseFloat(pos.sizeRq || pos.size || 0);

        // Determine side based on Phemex hedged mode structure
        let side: string;
        if (pos.posSide) {
          // Hedged mode: use posSide field
          side = pos.posSide === 'Long' ? 'LONG' : 'SHORT';
        } else {
          // Fallback: use size direction
          side = size > 0 ? 'LONG' : 'SHORT';
        }

        const entryPrice = parseFloat(pos.avgEntryPriceRp || pos.avgEntryPrice || 0);
        const markPrice = parseFloat(pos.markPriceRp || pos.markPrice || 0);
        const unrealizedPnl = parseFloat(pos.unRealisedPnlRv || pos.unrealisedPnlEv || 0) / (pos.unrealisedPnlEv ? 10000 : 1);
        const leverage = Math.abs(parseFloat(pos.leverageRr || pos.leverage || 0));
        const liquidationPrice = parseFloat(pos.liquidationPriceRp || pos.liquidationPrice || 0);
        const marginUsed = parseFloat(pos.usedBalanceRv || pos.usedBalanceEv || 0) / (pos.usedBalanceEv ? 10000 : 1);

        return {
          symbol: pos.symbol,
          side,
          size: Math.abs(size),
          entryPrice,
          markPrice,
          unrealizedPnl,
          unrealizedPnlPercent: entryPrice > 0 ? (unrealizedPnl / (entryPrice * Math.abs(size))) * 100 : 0,
          leverage,
          marginUsed,
          liquidationPrice,
          riskLevel: liquidationPrice > 0 && markPrice > 0 ? Math.abs((markPrice - liquidationPrice) / markPrice) * 100 : 100,
          // Add debug info
          rawSide: pos.side,
          posSide: pos.posSide,
          posMode: pos.posMode,
        };
      });

      return {
        success: true,
        data: {
          positions: formattedPositions,
          totalPositions: formattedPositions.length,
          totalUnrealizedPnl: formattedPositions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0),
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get positions: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

export const analyzeRiskExposureTool = new Tool({
  id: 'analyzeRiskExposure',
  description: 'Analyze current risk exposure and margin usage',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // Get account and positions data
      const accountData = await makePhemexRequest('GET', '/accounts/accountPositions', { currency: 'USD' });

      if (accountData.code !== 0) {
        throw new Error(`Phemex API error: ${accountData.msg}`);
      }

      const account = accountData.data.account;
      const positions = accountData.data.positions || [];
      const openPositions = positions.filter((pos: any) => parseFloat(pos.size) !== 0);

      const totalEquity = parseFloat(account.accountBalanceEv) / 10000;
      const totalMarginUsed = openPositions.reduce((sum: number, pos: any) =>
        sum + (parseFloat(pos.usedBalanceEv) / 10000), 0);

      const marginUtilization = (totalMarginUsed / totalEquity) * 100;

      // Calculate risk metrics for each position
      const riskAnalysis = openPositions.map((pos: any) => {
        const size = Math.abs(parseFloat(pos.size));
        const entryPrice = parseFloat(pos.avgEntryPrice) / 10000;
        const markPrice = parseFloat(pos.markPrice) / 10000;
        const liquidationPrice = parseFloat(pos.liquidationPrice) / 10000;
        const unrealizedPnl = parseFloat(pos.unrealisedPnlEv) / 10000;

        // Calculate distance to liquidation
        const distanceToLiquidation = Math.abs((markPrice - liquidationPrice) / markPrice) * 100;

        // Risk level based on multiple factors
        let riskLevel = 'LOW';
        if (distanceToLiquidation < 10) riskLevel = 'CRITICAL';
        else if (distanceToLiquidation < 20) riskLevel = 'HIGH';
        else if (distanceToLiquidation < 40) riskLevel = 'MEDIUM';

        return {
          symbol: pos.symbol,
          riskLevel,
          distanceToLiquidation: distanceToLiquidation.toFixed(2) + '%',
          unrealizedPnl,
          leverage: parseFloat(pos.leverage),
          marginUsed: parseFloat(pos.usedBalanceEv) / 10000,
        };
      });

      // Overall portfolio risk assessment
      let portfolioRisk = 'LOW';
      if (marginUtilization > 80) portfolioRisk = 'CRITICAL';
      else if (marginUtilization > 60) portfolioRisk = 'HIGH';
      else if (marginUtilization > 40) portfolioRisk = 'MEDIUM';

      return {
        success: true,
        data: {
          portfolioRisk,
          marginUtilization: marginUtilization.toFixed(2) + '%',
          totalEquity,
          totalMarginUsed,
          availableMargin: totalEquity - totalMarginUsed,
          positionRisks: riskAnalysis,
          recommendations: generateRiskRecommendations(portfolioRisk, marginUtilization, riskAnalysis),
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to analyze risk exposure: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

function generateRiskRecommendations(portfolioRisk: string, marginUtilization: number, positionRisks: any[]) {
  const recommendations = [];

  if (portfolioRisk === 'CRITICAL') {
    recommendations.push('🚨 URGENT: Consider reducing position sizes immediately to avoid margin calls');
    recommendations.push('💡 Close or reduce positions with highest risk levels first');
  } else if (portfolioRisk === 'HIGH') {
    recommendations.push('⚠️ High margin utilization detected - consider reducing leverage');
    recommendations.push('📊 Monitor positions closely for any adverse price movements');
  }

  // Position-specific recommendations
  const criticalPositions = positionRisks.filter(pos => pos.riskLevel === 'CRITICAL');
  if (criticalPositions.length > 0) {
    recommendations.push(`🔴 ${criticalPositions.length} position(s) near liquidation - immediate attention required`);
  }

  const highRiskPositions = positionRisks.filter(pos => pos.riskLevel === 'HIGH');
  if (highRiskPositions.length > 0) {
    recommendations.push(`🟡 ${highRiskPositions.length} position(s) at high risk - consider partial closure`);
  }

  if (marginUtilization < 30) {
    recommendations.push('✅ Good margin management - you have room for additional positions if opportunities arise');
  }

  return recommendations;
}

export const getOrderHistoryTool = new Tool({
  id: 'getOrderHistory',
  description: 'Get recent order history to understand trading patterns',
  inputSchema: z.object({
    limit: z.number().optional().describe('Number of recent orders to fetch (default: 50)'),
    symbol: z.string().optional().describe('Filter by specific symbol'),
  }),
  execute: async ({ limit = 50, symbol }) => {
    try {
      const params: any = { limit };
      if (symbol) params.symbol = symbol;

      const orderData = await makePhemexRequest('GET', '/exchange/order/list', params);
      
      if (orderData.code !== 0) {
        throw new Error(`Phemex API error: ${orderData.msg}`);
      }

      const orders = orderData.data.rows || [];
      const formattedOrders = orders.map((order: any) => ({
        orderId: order.orderID,
        symbol: order.symbol,
        side: order.side,
        orderType: order.ordType,
        quantity: parseFloat(order.orderQty),
        price: parseFloat(order.price) / 10000,
        status: order.ordStatus,
        filledQuantity: parseFloat(order.cumQty || 0),
        avgFillPrice: order.avgPx ? parseFloat(order.avgPx) / 10000 : 0,
        createTime: new Date(order.createTime).toISOString(),
        updateTime: new Date(order.updateTime).toISOString(),
      }));

      return {
        success: true,
        data: {
          orders: formattedOrders,
          totalOrders: formattedOrders.length,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get order history: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  },
});
