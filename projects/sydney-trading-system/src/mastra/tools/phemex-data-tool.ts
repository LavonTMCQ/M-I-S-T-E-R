import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Phemex Data Tool - Fetch Real-time and Historical Crypto Data
 * 
 * Integrates with Phemex API to provide:
 * - Real-time crypto prices
 * - Historical OHLCV data for backtesting
 * - ADA/USDT and other crypto pairs
 * - Multiple timeframes (1m, 5m, 15m, 1h, 4h, 1d)
 */

interface PhemexKlineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PhemexTickerData {
  symbol: string;
  lastPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export const phemexDataTool = createTool({
  id: 'phemex-data-tool',
  description: 'Fetch real-time and historical cryptocurrency data from Phemex API for backtesting and analysis',
  inputSchema: z.object({
    action: z.enum(['historical', 'realtime', 'symbols']).describe('Type of data to fetch'),
    symbol: z.string().optional().describe('Crypto symbol (e.g., ADAUSDT, BTCUSDT)'),
    timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d']).optional().describe('Timeframe for historical data'),
    startDate: z.string().optional().describe('Start date for historical data (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date for historical data (YYYY-MM-DD)'),
    limit: z.number().optional().default(1000).describe('Number of data points to fetch (max 1000)'),
  }),
  execute: async ({ context }) => {
    const { action, symbol, timeframe, startDate, endDate, limit } = context;
    try {
      console.log(`📡 Fetching ${action} data from Phemex API...`);

      if (action === 'symbols') {
        return await fetchPhemexSymbols();
      }

      if (!symbol) {
        throw new Error('Symbol is required for historical and realtime data');
      }

      if (action === 'realtime') {
        return await fetchPhemexRealtime(symbol);
      }

      if (action === 'historical') {
        if (!timeframe) {
          throw new Error('Timeframe is required for historical data');
        }
        return await fetchPhemexHistorical(symbol, timeframe, startDate, endDate, limit);
      }

    } catch (error) {
      console.error('❌ Phemex API error:', error);
      return {
        success: false,
        error: error.message,
        suggestion: 'Check symbol format (e.g., ADAUSDT) and API availability'
      };
    }
  },
});

// Fetch available crypto symbols from Phemex
async function fetchPhemexSymbols(): Promise<any> {
  try {
    console.log('📡 Fetching available symbols from Phemex API...');
    const response = await fetch('https://api.phemex.com/public/products');

    if (!response.ok) {
      throw new Error(`Phemex API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`Phemex API error: ${data.msg || 'Unknown error'}`);
    }

    // Filter for spot trading pairs that are actively listed
    const allProducts = data.data?.products || [];
    const spotPairs = allProducts.filter((product: any) =>
      product.type === 'Spot' &&
      product.status === 'Listed' &&
      product.symbol // Ensure symbol exists
    );

    const cryptoPairs = spotPairs.map((pair: any) => ({
      symbol: pair.symbol,
      baseCurrency: pair.baseCurrency,
      quoteCurrency: pair.quoteCurrency,
      status: pair.status,
      priceScale: pair.priceScale,
      qtyScale: pair.qtyScale,
      minOrderQty: pair.minOrderQty,
      maxOrderQty: pair.maxOrderQty,
    }));

    console.log(`✅ Retrieved ${cryptoPairs.length} spot trading pairs from Phemex`);

    // Check for ADA availability
    const adaPairs = cryptoPairs.filter((pair: any) =>
      pair.symbol.includes('ADA') || pair.baseCurrency === 'ADA'
    );

    const popularPairs = cryptoPairs.filter((pair: any) =>
      ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT', 'ADAUSD'].includes(pair.symbol)
    );

    return {
      success: true,
      data: cryptoPairs,
      count: cryptoPairs.length,
      adaAvailable: adaPairs.length > 0,
      adaPairs: adaPairs,
      popularPairs: popularPairs,
      summary: `Found ${cryptoPairs.length} spot pairs, ${adaPairs.length} ADA pairs available`
    };

  } catch (error) {
    console.error('❌ Phemex symbols fetch error:', error);
    throw new Error(`Failed to fetch Phemex symbols: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Fetch real-time crypto data
async function fetchPhemexRealtime(symbol: string): Promise<any> {
  try {
    console.log(`📊 Fetching real-time data for ${symbol} from Phemex...`);
    const response = await fetch(`https://api.phemex.com/md/ticker/24hr?symbol=${symbol}`);

    if (!response.ok) {
      throw new Error(`Phemex API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`Phemex API error: ${data.msg || 'Unknown error'}`);
    }

    const ticker = data.result;

    if (!ticker) {
      throw new Error(`No ticker data returned for symbol ${symbol}`);
    }

    // Phemex returns scaled values, need to handle properly
    const priceScale = 8; // Default scale, should get from products endpoint
    const price = ticker.lastEp ? ticker.lastEp / Math.pow(10, priceScale) : 0;
    const high24h = ticker.highEp ? ticker.highEp / Math.pow(10, priceScale) : 0;
    const low24h = ticker.lowEp ? ticker.lowEp / Math.pow(10, priceScale) : 0;
    const volume24h = ticker.volumeEv ? ticker.volumeEv / Math.pow(10, 8) : 0;

    console.log(`✅ Retrieved real-time data for ${symbol}: $${price.toFixed(6)}`);

    return {
      success: true,
      symbol: symbol,
      data: {
        price: price,
        high24h: high24h,
        low24h: low24h,
        volume24h: volume24h,
        timestamp: new Date().toISOString(),
        openEp: ticker.openEp,
        lastEp: ticker.lastEp,
        markEp: ticker.markEp
      },
      formatted: `${symbol}: $${price.toFixed(6)} | 24h High: $${high24h.toFixed(6)} | 24h Low: $${low24h.toFixed(6)} | Volume: ${volume24h.toFixed(2)}`,
      raw: ticker
    };

  } catch (error) {
    console.error(`❌ Real-time data fetch error for ${symbol}:`, error);
    throw new Error(`Failed to fetch real-time data for ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Fetch historical crypto data for backtesting
async function fetchPhemexHistorical(
  symbol: string,
  timeframe: string,
  startDate?: string,
  endDate?: string,
  limit: number = 1000
): Promise<any> {
  try {
    // Convert timeframe to Phemex format (seconds)
    const phemexTimeframe = convertTimeframe(timeframe);

    // Build API URL for Phemex kline endpoint
    let url = `https://api.phemex.com/md/kline?symbol=${symbol}&resolution=${phemexTimeframe}`;

    // Add date filters if provided (Phemex uses Unix timestamps)
    if (startDate && endDate) {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      url += `&from=${startTimestamp}&to=${endTimestamp}`;
    } else {
      // If no date range, use limit
      url += `&limit=${Math.min(limit, 1000)}`; // Phemex max is 1000
    }

    console.log(`📊 Fetching ${timeframe} historical data for ${symbol}...`);
    console.log(`🔗 API URL: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Phemex API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`Phemex API error: ${data.msg || 'Unknown error'}`);
    }

    if (!data.result || !Array.isArray(data.result)) {
      throw new Error(`Invalid kline data format from Phemex API`);
    }

    // Process kline data - Phemex format: [timestamp, open, high, low, close, volume, turnover]
    const klines = data.result.map((kline: any[]) => {
      if (!Array.isArray(kline) || kline.length < 6) {
        throw new Error(`Invalid kline format: ${JSON.stringify(kline)}`);
      }

      // Get price scale for this symbol (default to 8 if not available)
      const priceScale = 8; // Should get from products endpoint for accuracy

      return {
        timestamp: kline[0], // Unix timestamp
        date: new Date(kline[0] * 1000),
        open: kline[1] / Math.pow(10, priceScale),
        high: kline[2] / Math.pow(10, priceScale),
        low: kline[3] / Math.pow(10, priceScale),
        close: kline[4] / Math.pow(10, priceScale),
        volume: kline[5] / Math.pow(10, 8), // Volume scale
        turnover: kline[6] ? kline[6] / Math.pow(10, 8) : 0
      };
    });

    // Sort by timestamp (oldest first)
    klines.sort((a: any, b: any) => a.timestamp - b.timestamp);

    console.log(`✅ Retrieved ${klines.length} ${timeframe} candles for ${symbol}`);

    if (klines.length === 0) {
      return {
        success: false,
        error: `No historical data available for ${symbol} in timeframe ${timeframe}`,
        suggestion: 'Try a different symbol or timeframe'
      };
    }

    // Calculate basic statistics
    const prices = klines.map((k: any) => k.close);
    const volumes = klines.map((k: any) => k.volume);

    const stats = {
      count: klines.length,
      timeframe: timeframe,
      symbol: symbol,
      dateRange: {
        start: klines[0]?.date.toISOString(),
        end: klines[klines.length - 1]?.date.toISOString()
      },
      priceStats: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        first: prices[0],
        last: prices[prices.length - 1],
        change: ((prices[prices.length - 1] - prices[0]) / prices[0] * 100).toFixed(2) + '%'
      },
      volumeStats: {
        total: volumes.reduce((sum, vol) => sum + vol, 0),
        average: volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length,
        max: Math.max(...volumes)
      }
    };

    return {
      success: true,
      symbol: symbol,
      timeframe: timeframe,
      data: klines,
      statistics: stats,
      summary: `${symbol} ${timeframe}: ${klines.length} candles from ${stats.dateRange.start} to ${stats.dateRange.end}, ${stats.priceStats.change} change`
    };

  } catch (error) {
    console.error(`❌ Historical data fetch error for ${symbol}:`, error);
    throw new Error(`Failed to fetch historical data for ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Convert standard timeframe to Phemex format
function convertTimeframe(timeframe: string): number {
  const timeframeMap: { [key: string]: number } = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
  };
  
  return timeframeMap[timeframe] || 3600; // Default to 1h
}
