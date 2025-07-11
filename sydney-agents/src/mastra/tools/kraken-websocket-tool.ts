import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import WebSocket from 'ws';

/**
 * Kraken WebSocket Tool for Real-time ADA Price Data
 * 
 * Provides live price feeds and historical data for ADA/USD trading:
 * - Real-time ticker updates via WebSocket
 * - OHLCV candlestick data for backtesting
 * - Order book depth for liquidity analysis
 * - Trade history for volume analysis
 * - Optimized for Strike Finance ADA/USD leveraged trading
 */

interface KrakenTicker {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume24h: number;
  change24h: number;
  change24hPercent: number;
  high24h: number;
  low24h: number;
  timestamp: string;
}

interface KrakenCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
}

interface KrakenOrderBook {
  bids: Array<[number, number]>; // [price, volume]
  asks: Array<[number, number]>; // [price, volume]
  timestamp: string;
}

// Global WebSocket connection for real-time data
let krakenWS: WebSocket | null = null;
let priceCache: Map<string, KrakenTicker> = new Map();
let isConnected = false;

// Initialize WebSocket connection
function initializeKrakenWebSocket() {
  if (krakenWS && krakenWS.readyState === WebSocket.OPEN) {
    return;
  }

  console.log('🔌 Connecting to Kraken WebSocket...');
  
  krakenWS = new WebSocket('wss://ws.kraken.com');

  krakenWS.on('open', () => {
    console.log('✅ Kraken WebSocket connected');
    isConnected = true;

    // Subscribe to ADA/USD ticker
    const subscribeMessage = {
      event: 'subscribe',
      pair: ['ADA/USD'],
      subscription: {
        name: 'ticker'
      }
    };

    krakenWS?.send(JSON.stringify(subscribeMessage));
    console.log('📡 Subscribed to ADA/USD ticker feed');
  });

  krakenWS.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      // Skip system messages and heartbeats
      if (!Array.isArray(message) || message.length < 4) {
        console.log('📡 Kraken system message:', message);
        return;
      }

      // Handle ticker updates
      if (message[1] && message[2] === 'ticker') {
        const tickerData = message[1];
        const symbol = message[3]; // ADA/USD

        // Validate ticker data structure
        if (!tickerData || !tickerData.c || !tickerData.b || !tickerData.a) {
          console.warn('⚠️ Invalid ticker data structure:', tickerData);
          return;
        }

        const ticker: KrakenTicker = {
          symbol,
          price: parseFloat(tickerData.c[0]) || 0, // Last trade price
          bid: parseFloat(tickerData.b[0]) || 0,   // Best bid
          ask: parseFloat(tickerData.a[0]) || 0,   // Best ask
          volume24h: parseFloat(tickerData.v?.[1]) || 0, // 24h volume
          change24h: parseFloat(tickerData.p?.[1]) || 0, // 24h price change
          change24hPercent: parseFloat(tickerData.P?.[1]) || 0, // 24h percentage change
          high24h: parseFloat(tickerData.h?.[1]) || 0, // 24h high
          low24h: parseFloat(tickerData.l?.[1]) || 0,  // 24h low
          timestamp: new Date().toISOString()
        };

        priceCache.set(symbol, ticker);
        console.log(`💰 ADA/USD: $${ticker.price.toFixed(4)} (${ticker.change24hPercent > 0 ? '+' : ''}${ticker.change24hPercent.toFixed(2)}%)`);
      }
    } catch (error) {
      console.error('❌ Error parsing Kraken WebSocket message:', error);
    }
  });

  krakenWS.on('error', (error) => {
    console.error('❌ Kraken WebSocket error:', error);
    isConnected = false;
  });

  krakenWS.on('close', () => {
    console.log('🔌 Kraken WebSocket disconnected');
    isConnected = false;
    
    // Reconnect after 5 seconds
    setTimeout(() => {
      console.log('🔄 Reconnecting to Kraken WebSocket...');
      initializeKrakenWebSocket();
    }, 5000);
  });
}

export const krakenWebSocketTool = createTool({
  id: 'kraken-websocket',
  description: 'Get real-time ADA/USD price data from Kraken WebSocket feed for trading decisions',
  inputSchema: z.object({
    action: z.enum(['ticker', 'historical', 'orderbook']).describe('Type of data to retrieve'),
    symbol: z.string().default('ADA/USD').describe('Trading pair symbol'),
    timeframe: z.string().default('1m').describe('Timeframe for historical data (1m, 5m, 15m, 1h, 1d)'),
    limit: z.number().default(100).describe('Number of historical candles to retrieve'),
    speakResults: z.boolean().default(false).describe('Whether to announce price updates via voice')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.union([
      z.object({
        ticker: z.object({
          symbol: z.string(),
          price: z.number(),
          bid: z.number(),
          ask: z.number(),
          volume24h: z.number(),
          change24h: z.number(),
          change24hPercent: z.number(),
          high24h: z.number(),
          low24h: z.number(),
          timestamp: z.string()
        })
      }),
      z.object({
        candles: z.array(z.object({
          time: z.string(),
          open: z.number(),
          high: z.number(),
          low: z.number(),
          close: z.number(),
          volume: z.number(),
          trades: z.number()
        }))
      }),
      z.object({
        orderbook: z.object({
          bids: z.array(z.tuple([z.number(), z.number()])),
          asks: z.array(z.tuple([z.number(), z.number()])),
          timestamp: z.string()
        })
      })
    ]),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    const { action, symbol, timeframe, limit, speakResults } = context;

    try {
      // Initialize WebSocket connection if not connected
      if (!isConnected) {
        initializeKrakenWebSocket();
        
        // Wait for connection
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      switch (action) {
        case 'ticker':
          return await getRealtimeTicker(symbol, speakResults);
        
        case 'historical':
          return await getHistoricalData(symbol, timeframe, limit);
        
        case 'orderbook':
          return await getOrderBook(symbol);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }

    } catch (error) {
      console.error('❌ Kraken WebSocket tool error:', error);
      
      return {
        success: false,
        data: { ticker: null, candles: [], orderbook: null },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

async function getRealtimeTicker(symbol: string, speakResults: boolean) {
  const ticker = priceCache.get(symbol);
  
  if (!ticker) {
    // If no cached data, fetch from REST API as fallback
    const restData = await fetchKrakenREST(`https://api.kraken.com/0/public/Ticker?pair=${symbol.replace('/', '')}`);
    
    if (restData && restData.result) {
      const pairKey = Object.keys(restData.result)[0];
      const tickerData = restData.result[pairKey];
      
      const fallbackTicker: KrakenTicker = {
        symbol,
        price: parseFloat(tickerData.c[0]),
        bid: parseFloat(tickerData.b[0]),
        ask: parseFloat(tickerData.a[0]),
        volume24h: parseFloat(tickerData.v[1]),
        change24h: parseFloat(tickerData.p[1]),
        change24hPercent: parseFloat(tickerData.P[1]),
        high24h: parseFloat(tickerData.h[1]),
        low24h: parseFloat(tickerData.l[1]),
        timestamp: new Date().toISOString()
      };

      if (speakResults) {
        console.log(`🔊 KRAKEN PRICE: ADA/USD at $${fallbackTicker.price.toFixed(4)}, ${fallbackTicker.change24hPercent > 0 ? 'up' : 'down'} ${Math.abs(fallbackTicker.change24hPercent).toFixed(2)}% today`);
      }

      return {
        success: true,
        data: { ticker: fallbackTicker }
      };
    }
    
    throw new Error('No ticker data available');
  }

  if (speakResults) {
    console.log(`🔊 KRAKEN PRICE: ADA/USD at $${ticker.price.toFixed(4)}, ${ticker.change24hPercent > 0 ? 'up' : 'down'} ${Math.abs(ticker.change24hPercent).toFixed(2)}% today`);
  }

  return {
    success: true,
    data: { ticker }
  };
}

async function getHistoricalData(symbol: string, timeframe: string, limit: number) {
  // Convert timeframe to Kraken format
  const krakenTimeframe = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
    '1d': 1440
  }[timeframe] || 15;

  const pairName = symbol.replace('/', '');
  const url = `https://api.kraken.com/0/public/OHLC?pair=${pairName}&interval=${krakenTimeframe}&count=${limit}`;
  
  const data = await fetchKrakenREST(url);
  
  if (!data || !data.result) {
    throw new Error('Failed to fetch historical data');
  }

  const pairKey = Object.keys(data.result).find(key => key !== 'last');
  if (!pairKey) {
    throw new Error('No OHLC data found');
  }

  const ohlcData = data.result[pairKey];
  const candles: KrakenCandle[] = ohlcData.map((candle: any[]) => ({
    time: new Date(candle[0] * 1000).toISOString(),
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[6]),
    trades: parseInt(candle[7])
  }));

  console.log(`📊 Retrieved ${candles.length} ${timeframe} candles for ${symbol}`);

  return {
    success: true,
    data: { candles }
  };
}

async function getOrderBook(symbol: string) {
  const pairName = symbol.replace('/', '');
  const url = `https://api.kraken.com/0/public/Depth?pair=${pairName}&count=10`;
  
  const data = await fetchKrakenREST(url);
  
  if (!data || !data.result) {
    throw new Error('Failed to fetch order book');
  }

  const pairKey = Object.keys(data.result)[0];
  const bookData = data.result[pairKey];

  const orderbook: KrakenOrderBook = {
    bids: bookData.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
    asks: bookData.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
    timestamp: new Date().toISOString()
  };

  return {
    success: true,
    data: { orderbook }
  };
}

async function fetchKrakenREST(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('❌ Kraken REST API error:', error);
    throw error;
  }
}

// Initialize WebSocket connection when module loads
initializeKrakenWebSocket();
