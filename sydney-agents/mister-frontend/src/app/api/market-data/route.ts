import { NextRequest, NextResponse } from 'next/server';

// This would import our actual backend services
// import { StrikeFinanceAPI } from '@/backend/services/strike-finance-api';

/**
 * GET /api/market-data
 * Get current market data from Strike Finance
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pair = searchParams.get('pair') || 'ADA/USD';

    console.log(`📊 Fetching market data for ${pair}...`);

    // In production, this would integrate with StrikeFinanceAPI:
    // const strikeAPI = new StrikeFinanceAPI();
    // const marketData = await strikeAPI.getMarketData(pair);
    // const overallInfo = await strikeAPI.getOverallInfo();

    // Get real market data from Kraken
    let realMarketData;
    try {
      const krakenResponse = await fetch('https://api.kraken.com/0/public/Ticker?pair=ADAUSD');
      const krakenData = await krakenResponse.json();

      if (krakenData.result && krakenData.result.ADAUSD) {
        const ticker = krakenData.result.ADAUSD;
        const currentPrice = parseFloat(ticker.c[0]); // Last trade price
        const openPrice = parseFloat(ticker.o); // Open price
        const change24h = currentPrice - openPrice;
        const changePercent24h = (change24h / openPrice) * 100;

        realMarketData = {
          pair,
          price: currentPrice,
          change24h: change24h,
          changePercent24h: changePercent24h,
          volume24h: parseFloat(ticker.v[1]), // 24h volume
          high24h: parseFloat(ticker.h[1]), // 24h high
          low24h: parseFloat(ticker.l[1]), // 24h low
          marketCap: currentPrice * 35000000000, // Approximate market cap
          circulatingSupply: 35000000000,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        throw new Error('Invalid Kraken response');
      }
    } catch (error) {
      console.error('Failed to fetch from Kraken, using fallback data:', error);
      // Fallback to mock data
      const basePrice = 0.80;
      const priceVariation = (Math.random() - 0.5) * 0.05;
      const currentPrice = basePrice + priceVariation;

      realMarketData = {
        pair,
        price: currentPrice,
        change24h: priceVariation,
        changePercent24h: (priceVariation / basePrice) * 100,
        volume24h: Math.floor(Math.random() * 10000000) + 5000000,
        high24h: currentPrice + Math.random() * 0.02,
        low24h: currentPrice - Math.random() * 0.02,
        marketCap: Math.floor(Math.random() * 1000000000) + 15000000000,
        circulatingSupply: 35000000000,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Get current price from real market data
    const currentPrice = realMarketData.price;

    const mockMarketData = {
      ...realMarketData,

      // Strike Finance specific data
      strikeData: {
        totalLiquidity: Math.floor(Math.random() * 50000000) + 100000000,
        openInterest: Math.floor(Math.random() * 25000000) + 50000000,
        fundingRate: (Math.random() - 0.5) * 0.001, // ±0.1%
        nextFundingTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
        maxLeverage: 10,
        minPositionSize: 100,
        tradingFees: {
          maker: 0.0005, // 0.05%
          taker: 0.001   // 0.1%
        }
      },

      // Technical indicators
      technicalIndicators: {
        rsi: Math.floor(Math.random() * 40) + 30, // 30-70
        macd: {
          macd: (Math.random() - 0.5) * 0.01,
          signal: (Math.random() - 0.5) * 0.01,
          histogram: (Math.random() - 0.5) * 0.005
        },
        bollinger: {
          upper: currentPrice + 0.02,
          middle: currentPrice,
          lower: currentPrice - 0.02
        },
        sma20: currentPrice + (Math.random() - 0.5) * 0.01,
        sma50: currentPrice + (Math.random() - 0.5) * 0.02,
        volume: Math.floor(Math.random() * 5000000) + 2000000
      }
    };

    console.log(`✅ Market data retrieved for ${pair}: $${currentPrice.toFixed(4)}`);

    return NextResponse.json({
      success: true,
      data: mockMarketData
    });

  } catch (error) {
    console.error('❌ Error fetching market data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch market data. Please try again.' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/market-data
 * Subscribe to real-time market data updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pairs, interval } = body;

    if (!pairs || !Array.isArray(pairs)) {
      return NextResponse.json(
        { success: false, error: 'Pairs array is required' },
        { status: 400 }
      );
    }

    console.log(`📊 Subscribing to market data for pairs: ${pairs.join(', ')}...`);

    // In production, this would set up WebSocket subscriptions:
    // const strikeAPI = new StrikeFinanceAPI();
    // const subscriptionId = await strikeAPI.subscribeToMarketData(pairs, interval);

    // Mock subscription response
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    console.log(`✅ Market data subscription created: ${subscriptionId}`);

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId,
        pairs,
        interval: interval || '1s',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error creating market data subscription:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create market data subscription. Please try again.' 
      },
      { status: 500 }
    );
  }
}
