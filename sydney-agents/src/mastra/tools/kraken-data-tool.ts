import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Kraken Data Tool - Reliable Crypto Data Alternative
 * 
 * Integrates with Kraken API to provide:
 * - Real-time crypto prices and ticker data
 * - Historical OHLCV data for backtesting
 * - ADA/USD, ADA/USDT and other crypto pairs
 * - Multiple timeframes (1m, 5m, 15m, 1h, 4h, 1d)
 * - More reliable than Phemex for consistent data access
 */

interface KrakenOHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vwap: number;
  volume: number;
  count: number;
}

interface KrakenTickerData {
  a: [string, string, string]; // ask [price, whole lot volume, lot volume]
  b: [string, string, string]; // bid [price, whole lot volume, lot volume]
  c: [string, string]; // last trade closed [price, lot volume]
  v: [string, string]; // volume [today, last 24 hours]
  p: [string, string]; // volume weighted average price [today, last 24 hours]
  t: [number, number]; // number of trades [today, last 24 hours]
  l: [string, string]; // low [today, last 24 hours]
  h: [string, string]; // high [today, last 24 hours]
  o: string; // today's opening price
}

export const krakenDataTool = createTool({
  id: 'kraken-data-tool',
  description: 'Fetch real-time and historical cryptocurrency data from Kraken API - reliable alternative to Phemex',
  inputSchema: z.object({
    action: z.enum(['historical', 'realtime', 'pairs']).describe('Type of data to fetch'),
    symbol: z.string().optional().describe('Crypto symbol (e.g., ADAUSD, XBTUSD, ETHUSD)'),
    timeframe: z.enum(['1', '5', '15', '30', '60', '240', '1440']).optional().describe('Timeframe in minutes for historical data'),
    startDate: z.string().optional().describe('Start date for historical data (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date for historical data (YYYY-MM-DD)'),
    limit: z.number().optional().default(720).describe('Number of data points to fetch (max 720)'),
  }),
  execute: async ({ context }) => {
    const { action, symbol, timeframe, startDate, endDate, limit } = context;

    try {
      console.log(`📡 Fetching ${action} data from Kraken API...`);

      if (action === 'pairs') {
        return await fetchKrakenPairs();
      }

      if (!symbol) {
        throw new Error('Symbol is required for historical and realtime data');
      }

      if (action === 'realtime') {
        return await fetchKrakenRealtime(symbol);
      }

      if (action === 'historical') {
        if (!timeframe) {
          throw new Error('Timeframe is required for historical data');
        }
        return await fetchKrakenHistorical(symbol, timeframe, startDate, endDate, limit);
      }

    } catch (error) {
      console.error('❌ Kraken API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: 'Check symbol format (e.g., ADAUSD, XBTUSD) and API availability'
      };
    }
  },
});

// Fetch available crypto pairs from Kraken
async function fetchKrakenPairs(): Promise<any> {
  try {
    console.log('📡 Fetching available pairs from Kraken API...');
    const response = await fetch('https://api.kraken.com/0/public/AssetPairs');
    
    if (!response.ok) {
      throw new Error(`Kraken API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(', ')}`);
    }

    const pairs = Object.entries(data.result).map(([key, value]: [string, any]) => ({
      symbol: key,
      altname: value.altname,
      base: value.base,
      quote: value.quote,
      status: value.status,
      ordermin: value.ordermin,
    }));

    // Filter for ADA pairs and popular pairs
    const adaPairs = pairs.filter((pair: any) => 
      pair.symbol.includes('ADA') || pair.altname.includes('ADA')
    );

    const popularPairs = pairs.filter((pair: any) => 
      ['XBTUSD', 'ETHUSD', 'ADAUSD', 'SOLUSD', 'DOTUSD', 'ADAUSDT'].includes(pair.altname)
    );

    console.log(`✅ Retrieved ${pairs.length} trading pairs from Kraken`);

    return {
      success: true,
      data: pairs,
      count: pairs.length,
      adaAvailable: adaPairs.length > 0,
      adaPairs: adaPairs,
      popularPairs: popularPairs,
      summary: `Found ${pairs.length} pairs, ${adaPairs.length} ADA pairs available`
    };

  } catch (error) {
    console.error('❌ Kraken pairs fetch error:', error);
    throw new Error(`Failed to fetch Kraken pairs: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Fetch real-time crypto data from Kraken
async function fetchKrakenRealtime(symbol: string): Promise<any> {
  try {
    console.log(`📊 Fetching real-time data for ${symbol} from Kraken...`);
    const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${symbol}`);
    
    if (!response.ok) {
      throw new Error(`Kraken API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(', ')}`);
    }

    const tickerKeys = Object.keys(data.result);
    if (tickerKeys.length === 0) {
      throw new Error(`No ticker data returned for symbol ${symbol}`);
    }

    const tickerKey = tickerKeys[0];
    const ticker = data.result[tickerKey];

    if (!ticker || !ticker.c || !Array.isArray(ticker.c)) {
      throw new Error(`Invalid ticker data format for symbol ${symbol}`);
    }

    // Kraken ticker format: c = last trade closed, h = high, l = low, v = volume, o = open
    const price = parseFloat(ticker.c[0]);
    const high24h = parseFloat(ticker.h[1]);
    const low24h = parseFloat(ticker.l[1]);
    const volume24h = parseFloat(ticker.v[1]);
    const openPrice = parseFloat(ticker.o);
    const change24h = price - openPrice;
    const changePercent24h = openPrice > 0 ? ((change24h / openPrice) * 100) : 0;
    
    console.log(`✅ Retrieved real-time data for ${symbol}: $${price.toFixed(6)}`);

    return {
      success: true,
      symbol: symbol,
      data: {
        price: price,
        change24h: change24h,
        changePercent24h: changePercent24h,
        high24h: high24h,
        low24h: low24h,
        volume24h: volume24h,
        openPrice: openPrice,
        timestamp: new Date().toISOString(),
        bid: parseFloat(ticker.b[0]),
        ask: parseFloat(ticker.a[0]),
        vwap: parseFloat(ticker.p[1])
      },
      formatted: `${symbol}: $${price.toFixed(6)} (${changePercent24h > 0 ? '+' : ''}${changePercent24h.toFixed(2)}%) | 24h High: $${high24h.toFixed(6)} | 24h Low: $${low24h.toFixed(6)}`,
      raw: ticker
    };

  } catch (error) {
    console.error(`❌ Real-time data fetch error for ${symbol}:`, error);
    throw new Error(`Failed to fetch real-time data for ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Fetch historical crypto data for backtesting from Kraken
async function fetchKrakenHistorical(
  symbol: string, 
  timeframe: string, 
  startDate?: string, 
  endDate?: string, 
  limit: number = 720
): Promise<any> {
  try {
    // Build Kraken API URL
    let url = `https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=${timeframe}`;
    
    // Add date filters if provided (Kraken uses Unix timestamps)
    if (startDate) {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      url += `&since=${startTimestamp}`;
    }

    console.log(`📊 Fetching ${timeframe}min historical data for ${symbol} from Kraken...`);
    console.log(`🔗 Kraken API URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Kraken API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(', ')}`);
    }

    const ohlcKey = Object.keys(data.result).find(key => key !== 'last');
    if (!ohlcKey || !data.result[ohlcKey]) {
      throw new Error(`No OHLC data returned for ${symbol}`);
    }

    // Process Kraken OHLC data - format: [timestamp, open, high, low, close, vwap, volume, count]
    const ohlcData = data.result[ohlcKey];
    const processedData = ohlcData.map((candle: any[]) => ({
      timestamp: candle[0],
      date: new Date(candle[0] * 1000),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      vwap: parseFloat(candle[5]),
      volume: parseFloat(candle[6]),
      count: candle[7]
    }));

    // Sort by timestamp (oldest first)
    const sortedData = processedData.sort((a: any, b: any) => a.timestamp - b.timestamp);

    // Filter by end date if provided
    let filteredData = sortedData;
    if (endDate) {
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      filteredData = sortedData.filter((candle: any) => candle.timestamp <= endTimestamp);
    }

    // Apply limit
    if (filteredData.length > limit) {
      filteredData = filteredData.slice(-limit);
    }
    
    console.log(`✅ Retrieved ${filteredData.length} ${timeframe}min candles for ${symbol} from Kraken`);

    if (filteredData.length === 0) {
      return {
        success: false,
        error: `No historical data available for ${symbol} in timeframe ${timeframe}min`,
        suggestion: 'Try a different symbol or timeframe'
      };
    }

    // Calculate basic statistics
    const prices = filteredData.map((k: any) => k.close);
    const volumes = filteredData.map((k: any) => k.volume);
    
    const stats = {
      count: filteredData.length,
      timeframe: `${timeframe}min`,
      symbol: symbol,
      dateRange: {
        start: filteredData[0]?.date.toISOString(),
        end: filteredData[filteredData.length - 1]?.date.toISOString()
      },
      priceStats: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        first: prices[0],
        last: prices[prices.length - 1],
        change: ((prices[prices.length - 1] - prices[0]) / prices[0] * 100).toFixed(2) + '%'
      },
      volumeStats: {
        total: volumes.reduce((sum: number, vol: number) => sum + vol, 0),
        average: volumes.reduce((sum: number, vol: number) => sum + vol, 0) / volumes.length,
        max: Math.max(...volumes)
      }
    };

    return {
      success: true,
      symbol: symbol,
      timeframe: `${timeframe}min`,
      data: filteredData,
      statistics: stats,
      summary: `${symbol} ${timeframe}min: ${filteredData.length} candles from ${stats.dateRange.start} to ${stats.dateRange.end}, ${stats.priceStats.change} change`,
      source: 'kraken_api'
    };

  } catch (error) {
    console.error(`❌ Historical data fetch error for ${symbol}:`, error);
    throw new Error(`Failed to fetch historical data for ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
  }
}