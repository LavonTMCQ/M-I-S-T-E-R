import { NextRequest, NextResponse } from 'next/server';

interface KrakenOHLCResponse {
  error: string[];
  result: {
    [key: string]: any[][];
    last?: number;
  };
}

interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
  count?: number;
}

/**
 * GET /api/kraken/ohlc
 * Fetch OHLC (candlestick) data from Kraken
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || '60'; // Default 1 hour
    let since = searchParams.get('since') || ''; // Unix timestamp
    
    // Map common intervals to Kraken intervals (in minutes)
    const intervalMap: Record<string, string> = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '4h': '240',
      '1d': '1440',
      '1w': '10080'
    };

    const krakenInterval = intervalMap[interval] || interval;
    
    // If no since parameter, default to 2 years ago for more historical data
    if (!since) {
      const twoYearsAgo = Math.floor(Date.now() / 1000) - (730 * 24 * 60 * 60); // 730 days ago from TODAY
      since = twoYearsAgo.toString();
    }
    
    console.log(`📊 Fetching Kraken OHLC data - Interval: ${krakenInterval} minutes, Since: ${new Date(parseInt(since) * 1000).toLocaleDateString()}`);
    
    // Build Kraken API URL
    let url = `https://api.kraken.com/0/public/OHLC?pair=ADAUSD&interval=${krakenInterval}`;
    if (since) {
      url += `&since=${since}`;
    }

    const response = await fetch(url);
    const data: KrakenOHLCResponse = await response.json();

    if (data.error && data.error.length > 0) {
      console.error('❌ Kraken API error:', data.error);
      return NextResponse.json(
        { success: false, error: data.error[0] },
        { status: 400 }
      );
    }

    // Parse OHLC data
    const ohlcRaw = data.result?.ADAUSD || data.result?.XADAUSD || [];
    
    const ohlcData: OHLCData[] = ohlcRaw.map((candle: any[]) => ({
      time: parseInt(candle[0]) * 1000, // Convert to milliseconds
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[6]),
      vwap: parseFloat(candle[5]),
      count: parseInt(candle[7])
    }));

    // Calculate additional metrics
    const latestPrice = ohlcData.length > 0 ? ohlcData[ohlcData.length - 1].close : 0;
    const firstPrice = ohlcData.length > 0 ? ohlcData[0].open : 0;
    const priceChange = latestPrice - firstPrice;
    const priceChangePercent = firstPrice !== 0 ? (priceChange / firstPrice) * 100 : 0;

    console.log(`✅ Fetched ${ohlcData.length} candles. Latest: $${latestPrice.toFixed(4)}`);

    return NextResponse.json({
      success: true,
      data: {
        ohlc: ohlcData,
        interval: interval,
        pair: 'ADA/USD',
        latestPrice,
        priceChange,
        priceChangePercent,
        dataPoints: ohlcData.length,
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching Kraken OHLC data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch OHLC data. Please try again.' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kraken/ohlc
 * Process OHLC data with technical indicators
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ohlc, indicators = ['sma220'] } = body;

    if (!ohlc || !Array.isArray(ohlc)) {
      return NextResponse.json(
        { success: false, error: 'OHLC data is required' },
        { status: 400 }
      );
    }

    console.log(`📈 Processing ${ohlc.length} candles with indicators: ${indicators.join(', ')}`);

    const processedData = ohlc.map((candle: OHLCData, index: number) => {
      const result: any = { ...candle, indicators: {} };

      // Calculate SMA220
      if (indicators.includes('sma220') && index >= 219) {
        const sma220Values = ohlc.slice(index - 219, index + 1).map(c => c.close);
        const sma220 = sma220Values.reduce((sum, val) => sum + val, 0) / 220;
        result.indicators.sma220 = sma220;
      }

      // Calculate SMA20
      if (indicators.includes('sma20') && index >= 19) {
        const sma20Values = ohlc.slice(index - 19, index + 1).map(c => c.close);
        const sma20 = sma20Values.reduce((sum, val) => sum + val, 0) / 20;
        result.indicators.sma20 = sma20;
      }

      // Calculate SMA50
      if (indicators.includes('sma50') && index >= 49) {
        const sma50Values = ohlc.slice(index - 49, index + 1).map(c => c.close);
        const sma50 = sma50Values.reduce((sum, val) => sum + val, 0) / 50;
        result.indicators.sma50 = sma50;
      }

      return result;
    });

    console.log(`✅ Processed OHLC data with ${indicators.length} indicators`);

    return NextResponse.json({
      success: true,
      data: processedData
    });

  } catch (error) {
    console.error('❌ Error processing OHLC data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process OHLC data. Please try again.' 
      },
      { status: 500 }
    );
  }
}