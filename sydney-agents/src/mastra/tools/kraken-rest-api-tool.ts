import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Kraken REST API Tool for Historical Data and Market Analysis
 * 
 * Provides comprehensive access to Kraken's REST API for:
 * - Historical OHLCV candlestick data
 * - Order book depth analysis
 * - Recent trades and volume data
 * - Asset information and trading pairs
 * - Server time and system status
 * 
 * Optimized for ADA/USD trading analysis and backtesting
 */

interface KrakenCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
}

interface KrakenTrade {
  price: number;
  volume: number;
  time: string;
  side: 'buy' | 'sell';
}

interface KrakenOrderBook {
  bids: Array<[number, number, number]>; // [price, volume, timestamp]
  asks: Array<[number, number, number]>; // [price, volume, timestamp]
}

export const krakenRestApiTool = createTool({
  id: 'kraken-rest-api',
  description: 'Access Kraken REST API for historical data, order books, trades, and market analysis',
  inputSchema: z.object({
    endpoint: z.enum([
      'ohlc',      // Historical OHLCV data
      'ticker',    // Current ticker information
      'depth',     // Order book depth
      'trades',    // Recent trades
      'spread',    // Bid/ask spread data
      'assets',    // Asset information
      'time'       // Server time
    ]).describe('Kraken API endpoint to call'),
    pair: z.string().default('ADAUSD').describe('Trading pair (Kraken format: ADAUSD)'),
    interval: z.number().default(15).describe('OHLC interval in minutes (1, 5, 15, 30, 60, 240, 1440)'),
    since: z.number().optional().describe('Return data since this timestamp'),
    count: z.number().default(100).describe('Number of data points to return (max 720)'),
    speakResults: z.boolean().default(false).describe('Whether to announce results via voice')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    endpoint: z.string(),
    pair: z.string(),
    data: z.union([
      z.array(z.object({
        time: z.string(),
        open: z.number(),
        high: z.number(),
        low: z.number(),
        close: z.number(),
        volume: z.number(),
        trades: z.number()
      })),
      z.object({
        price: z.number(),
        bid: z.number(),
        ask: z.number(),
        volume24h: z.number(),
        change24h: z.number(),
        high24h: z.number(),
        low24h: z.number()
      }),
      z.object({
        bids: z.array(z.tuple([z.number(), z.number(), z.number()])),
        asks: z.array(z.tuple([z.number(), z.number(), z.number()]))
      }),
      z.array(z.object({
        price: z.number(),
        volume: z.number(),
        time: z.string(),
        side: z.enum(['buy', 'sell'])
      })),
      z.any()
    ]),
    timestamp: z.string(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    const { endpoint, pair, interval, since, count, speakResults } = context;

    console.log(`🔍 Kraken REST API: Fetching ${endpoint} data for ${pair}`);

    try {
      let url: string;
      let processedData: any;

      switch (endpoint) {
        case 'ohlc':
          url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}&count=${count}`;
          if (since) url += `&since=${since}`;
          processedData = await fetchOHLCData(url, pair);
          break;

        case 'ticker':
          url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
          processedData = await fetchTickerData(url, pair);
          break;

        case 'depth':
          url = `https://api.kraken.com/0/public/Depth?pair=${pair}&count=${Math.min(count, 500)}`;
          processedData = await fetchDepthData(url, pair);
          break;

        case 'trades':
          url = `https://api.kraken.com/0/public/Trades?pair=${pair}&count=${Math.min(count, 1000)}`;
          if (since) url += `&since=${since}`;
          processedData = await fetchTradesData(url, pair);
          break;

        case 'spread':
          url = `https://api.kraken.com/0/public/Spread?pair=${pair}&count=${Math.min(count, 1000)}`;
          if (since) url += `&since=${since}`;
          processedData = await fetchSpreadData(url, pair);
          break;

        case 'assets':
          url = `https://api.kraken.com/0/public/Assets`;
          processedData = await fetchAssetsData(url);
          break;

        case 'time':
          url = `https://api.kraken.com/0/public/Time`;
          processedData = await fetchTimeData(url);
          break;

        default:
          throw new Error(`Unknown endpoint: ${endpoint}`);
      }

      // Voice announcement if enabled
      if (speakResults) {
        let announcement = '';
        if (endpoint === 'ohlc' && Array.isArray(processedData)) {
          const latest = processedData[processedData.length - 1];
          announcement = `Retrieved ${processedData.length} ${interval}-minute candles for ${pair}. Latest price: $${latest?.close?.toFixed(4)}`;
        } else if (endpoint === 'ticker' && processedData.price) {
          announcement = `${pair} ticker: $${processedData.price.toFixed(4)}, 24h change: ${processedData.change24h > 0 ? '+' : ''}${processedData.change24h.toFixed(2)}%`;
        } else {
          announcement = `Retrieved ${endpoint} data for ${pair}`;
        }
        
        console.log(`🔊 KRAKEN REST: ${announcement}`);
      }

      console.log(`✅ Kraken REST API: Successfully fetched ${endpoint} data for ${pair}`);

      return {
        success: true,
        endpoint,
        pair,
        data: processedData,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Kraken REST API error for ${endpoint}:`, error);
      
      return {
        success: false,
        endpoint,
        pair,
        data: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

// Helper functions for processing different endpoint responses

async function fetchOHLCData(url: string, pair: string): Promise<KrakenCandle[]> {
  const response = await fetchKrakenAPI(url);
  
  if (!response.result) {
    throw new Error('No OHLC data in response');
  }

  // Find the correct pair key (Kraken returns modified pair names)
  const pairKey = Object.keys(response.result).find(key => key !== 'last');
  if (!pairKey) {
    throw new Error('No OHLC data found for pair');
  }

  const ohlcArray = response.result[pairKey];
  
  return ohlcArray.map((candle: any[]) => ({
    time: new Date(candle[0] * 1000).toISOString(),
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[6]),
    trades: parseInt(candle[7])
  }));
}

async function fetchTickerData(url: string, pair: string) {
  const response = await fetchKrakenAPI(url);
  
  if (!response.result) {
    throw new Error('No ticker data in response');
  }

  const pairKey = Object.keys(response.result)[0];
  const ticker = response.result[pairKey];

  return {
    price: parseFloat(ticker.c[0]),
    bid: parseFloat(ticker.b[0]),
    ask: parseFloat(ticker.a[0]),
    volume24h: parseFloat(ticker.v[1]),
    change24h: parseFloat(ticker.p[1]),
    high24h: parseFloat(ticker.h[1]),
    low24h: parseFloat(ticker.l[1])
  };
}

async function fetchDepthData(url: string, pair: string): Promise<KrakenOrderBook> {
  const response = await fetchKrakenAPI(url);
  
  if (!response.result) {
    throw new Error('No depth data in response');
  }

  const pairKey = Object.keys(response.result)[0];
  const depth = response.result[pairKey];

  return {
    bids: depth.bids.map((bid: string[]) => [
      parseFloat(bid[0]), // price
      parseFloat(bid[1]), // volume
      parseInt(bid[2])    // timestamp
    ]),
    asks: depth.asks.map((ask: string[]) => [
      parseFloat(ask[0]), // price
      parseFloat(ask[1]), // volume
      parseInt(ask[2])    // timestamp
    ])
  };
}

async function fetchTradesData(url: string, pair: string): Promise<KrakenTrade[]> {
  const response = await fetchKrakenAPI(url);
  
  if (!response.result) {
    throw new Error('No trades data in response');
  }

  const pairKey = Object.keys(response.result).find(key => key !== 'last');
  if (!pairKey) {
    throw new Error('No trades data found for pair');
  }

  const trades = response.result[pairKey];

  return trades.map((trade: any[]) => ({
    price: parseFloat(trade[0]),
    volume: parseFloat(trade[1]),
    time: new Date(trade[2] * 1000).toISOString(),
    side: trade[3] === 'b' ? 'buy' : 'sell'
  }));
}

async function fetchSpreadData(url: string, pair: string) {
  const response = await fetchKrakenAPI(url);
  
  if (!response.result) {
    throw new Error('No spread data in response');
  }

  const pairKey = Object.keys(response.result).find(key => key !== 'last');
  if (!pairKey) {
    throw new Error('No spread data found for pair');
  }

  return response.result[pairKey].map((spread: any[]) => ({
    time: new Date(spread[0] * 1000).toISOString(),
    bid: parseFloat(spread[1]),
    ask: parseFloat(spread[2])
  }));
}

async function fetchAssetsData(url: string) {
  const response = await fetchKrakenAPI(url);
  return response.result || {};
}

async function fetchTimeData(url: string) {
  const response = await fetchKrakenAPI(url);
  return {
    unixtime: response.result?.unixtime || 0,
    rfc1123: response.result?.rfc1123 || new Date().toUTCString()
  };
}

async function fetchKrakenAPI(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'MISTER-Trading-Bot/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error && data.error.length > 0) {
    throw new Error(`Kraken API error: ${data.error.join(', ')}`);
  }

  return data;
}
