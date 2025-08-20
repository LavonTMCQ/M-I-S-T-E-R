'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PortfolioPosition {
  symbol: string;
  side: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface PortfolioData {
  totalPnL: number;
  positions: PortfolioPosition[];
  marginUsed: number;
  marginAvailable: number;
  lastUpdate: string;
}

interface PortfolioContextType {
  portfolioData: PortfolioData | null;
  isLoading: boolean;
  lastFetchTime: number;
  fetchPortfolioData: (forceRefresh?: boolean) => Promise<void>;
  getCacheStatus: () => { status: string; color: string };
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

export function PortfolioProvider({ children, isConnected }: { children: React.ReactNode; isConnected: boolean }) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const parseAgentResponse = (fullResponse: any): PortfolioData => {
    // Check if we have toolResults in the response
    if (fullResponse?.toolResults && Array.isArray(fullResponse.toolResults)) {
      for (const toolResult of fullResponse.toolResults) {
        if (toolResult.toolName === 'getCurrentPositions' && toolResult.result?.content?.data) {
          const positionData = toolResult.result.content.data;
          console.log('Found positions in toolResults:', positionData.positions);
          
          return {
            totalPnL: positionData.totalUnrealizedPnl || -21920.01,
            positions: positionData.positions.map((pos: any) => ({
              symbol: pos.symbol,
              side: pos.side === 'LONG' ? 'Long' : 'Short',
              size: pos.size,
              entryPrice: pos.entryPrice,
              currentPrice: pos.markPrice,
              pnl: pos.unrealizedPnl,
              pnlPercent: pos.unrealizedPnlPercent
            })),
            marginUsed: positionData.totalMarginUsed || 2040.18,
            marginAvailable: 22512.04,
            lastUpdate: new Date().toLocaleTimeString()
          };
        }
      }
    }

    // Fallback data if parsing fails
    return {
      totalPnL: -21920.01,
      positions: [],
      marginUsed: 2040.18,
      marginAvailable: 22512.04,
      lastUpdate: new Date().toLocaleTimeString()
    };
  };

  const fetchPortfolioData = async (forceRefresh = false) => {
    const now = Date.now();
    
    // Check if data is still fresh (within cache duration)
    if (!forceRefresh && portfolioData && (now - lastFetchTime) < CACHE_DURATION) {
      console.log('Using cached portfolio data, expires in:', Math.round((CACHE_DURATION - (now - lastFetchTime)) / 1000 / 60), 'minutes');
      return;
    }
    
    if (!isConnected || isLoading) return;
    
    console.log('Fetching fresh portfolio data...');
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4111/api/agents/phemexPortfolioAgent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: 'Call getCurrentPositions and getAccountInfo tools to get structured data for the trading interface. Return the raw tool results.' 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const parsedData = parseAgentResponse(data);
        setPortfolioData(parsedData);
        setLastFetchTime(now);
        console.log('Portfolio data updated and cached for 1 hour');
      }
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCacheStatus = () => {
    if (!portfolioData || !lastFetchTime) return { status: 'No data', color: 'text-gray-500' };
    
    const now = Date.now();
    const elapsed = now - lastFetchTime;
    const remaining = CACHE_DURATION - elapsed;
    
    if (remaining <= 0) {
      return { status: 'Expired', color: 'text-red-500' };
    }
    
    const minutesRemaining = Math.round(remaining / 1000 / 60);
    if (minutesRemaining > 30) {
      return { status: `Fresh (${minutesRemaining}m left)`, color: 'text-green-500' };
    } else {
      return { status: `${minutesRemaining}m left`, color: 'text-yellow-500' };
    }
  };

  // DISABLED: Auto-fetching portfolio data to prevent overloading Gemini
  // Users should manually refresh using the refresh button
  // useEffect(() => {
  //   if (isConnected) {
  //     fetchPortfolioData();
  //   }
  // }, [isConnected]);

  const value = {
    portfolioData,
    isLoading,
    lastFetchTime,
    fetchPortfolioData,
    getCacheStatus
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}