'use client';

import { useState, useEffect, useCallback } from 'react';

interface Position {
  symbol: string;
  side: 'Long' | 'Short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface PortfolioData {
  totalPnL: number;
  totalPositions: number;
  marginUsed: number;
  marginAvailable: number;
  positions: Position[];
  lastUpdate: Date;
}

interface MarketData {
  [symbol: string]: {
    price: number;
    change24h: number;
    volume: number;
  };
}

export function useTradingData(isConnected: boolean) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [marketData, setMarketData] = useState<MarketData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolioData = useCallback(async () => {
    if (!isConnected || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:4111/api/agents/phemexPortfolioAgent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: 'Quick portfolio overview - show current positions, P&L, and margin status' 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const responseText = data.text || '';
        
        // Parse the response for portfolio data
        const parsedData = parsePortfolioResponse(responseText);
        setPortfolioData({
          ...parsedData,
          lastUpdate: new Date(),
        });
      } else {
        throw new Error(`Agent error: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio data');
      console.error('Portfolio fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, isLoading]);

  // Parse portfolio response from agent
  const parsePortfolioResponse = (text: string): Omit<PortfolioData, 'lastUpdate'> => {
    // Mock parsing - in real implementation, you'd parse the actual agent response
    // This would extract position data, P&L, margins, etc. from the agent's text response
    
    // For now, return mock data that looks realistic
    return {
      totalPnL: -21935.79, // This matches what we see in the header
      totalPositions: 2,
      marginUsed: 3500,
      marginAvailable: 6500,
      positions: [
        {
          symbol: 'ADA/USDT',
          side: 'Long',
          size: 10000,
          entryPrice: 0.45,
          currentPrice: 0.42,
          pnl: -300.00,
          pnlPercent: -6.67
        },
        {
          symbol: 'ETH/USDT',
          side: 'Short',
          size: 2.5,
          entryPrice: 2500,
          currentPrice: 2450,
          pnl: 125.00,
          pnlPercent: 2.00
        }
      ]
    };
  };

  // Fetch market data (could be from external API or agent)
  const fetchMarketData = useCallback(async () => {
    try {
      // Mock market data - in real implementation, this would fetch from market APIs
      setMarketData({
        'ADA/USDT': { price: 0.42, change24h: -5.2, volume: 15600000 },
        'ETH/USDT': { price: 2450, change24h: -2.1, volume: 8900000 },
        'BTC/USDT': { price: 42100, change24h: 1.8, volume: 25400000 },
      });
    } catch (err) {
      console.error('Market data fetch error:', err);
    }
  }, []);

  // DISABLED: Auto-refresh to prevent overloading Gemini
  // Users should manually refresh using the refresh button
  // useEffect(() => {
  //   if (isConnected) {
  //     fetchPortfolioData();
  //     fetchMarketData();
  //     
  //     // Refresh every 30 seconds
  //     const interval = setInterval(() => {
  //       fetchPortfolioData();
  //       fetchMarketData();
  //     }, 30000);
  //     
  //     return () => clearInterval(interval);
  //   }
  // }, [isConnected, fetchPortfolioData, fetchMarketData]);

  return {
    portfolioData,
    marketData,
    isLoading,
    error,
    refetch: fetchPortfolioData,
  };
}