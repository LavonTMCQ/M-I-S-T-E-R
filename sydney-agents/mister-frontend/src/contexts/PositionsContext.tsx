'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';

interface Position {
  id: string;
  side: 'Long' | 'Short';
  pair: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  pnl: number;
  pnlPercent: number;
  liquidationPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: Date;
}

interface PositionsContextType {
  positions: Position[];
  currentPrice: number;
  isLoading: boolean;
  lastUpdated: Date | null;
  refreshPositions: () => Promise<void>;
}

const PositionsContext = createContext<PositionsContextType | undefined>(undefined);

// Singleton instance to prevent multiple intervals
let globalInterval: NodeJS.Timeout | null = null;
let priceInterval: NodeJS.Timeout | null = null;
let contextInstanceCount = 0;
let lastPositionsFetch = 0;
let lastPriceFetch = 0;
let isCurrentlyFetching = false;
let isCurrentlyFetchingPrice = false;
const MIN_POSITIONS_INTERVAL = 30000; // Minimum 30 seconds between position calls
const MIN_PRICE_INTERVAL = 30000; // Minimum 30 seconds between price calls

export function PositionsProvider({ children }: { children: React.ReactNode }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0.5883); // Default fallback
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { mainWallet } = useWallet();

  // Fetch current market price with rate limiting
  const fetchMarketData = async () => {
    const now = Date.now();
    if (now - lastPriceFetch < MIN_PRICE_INTERVAL || isCurrentlyFetchingPrice) {
      console.log('⚡ [SHARED] Skipping price fetch due to rate limiting or in progress');
      return;
    }
    
    try {
      isCurrentlyFetchingPrice = true;
      lastPriceFetch = now;
      const response = await fetch('/api/market-data');
      const result = await response.json();
      if (result.success && result.data) {
        setCurrentPrice(result.data.price);
        console.log('📊 [SHARED] Updated current ADA price:', result.data.price);
      }
    } catch (error) {
      console.error('❌ [SHARED] Failed to fetch market data:', error);
    } finally {
      isCurrentlyFetchingPrice = false;
    }
  };

  const fetchPositions = async () => {
    const now = Date.now();
    if (now - lastPositionsFetch < MIN_POSITIONS_INTERVAL || isCurrentlyFetching) {
      console.log('⚡ [SHARED] Skipping positions fetch due to rate limiting or in progress');
      return;
    }
    
    try {
      if (!mainWallet?.address) {
        console.log('⚠️ [SHARED] No wallet address available for fetching positions');
        setIsLoading(false);
        return;
      }

      isCurrentlyFetching = true;
      lastPositionsFetch = now;
      console.log('📊 [SHARED] Fetching positions from Strike Finance...');

      // Fetch real positions from Strike Finance via local Next.js API route (avoids CORS)
      const response = await fetch(`/api/strike/positions?address=${encodeURIComponent(mainWallet.address)}`);
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        console.log('📊 [SHARED] Raw Strike Finance position data:', data.data);

        // Convert Strike Finance positions to our format
        const strikePositions: Position[] = data.data.map((pos: any, index: number) => {
          // Strike Finance position structure based on API docs
          const positionId = pos.outRef ? `${pos.outRef.txHash}_${pos.outRef.outputIndex}` : `pos_${Date.now()}_${index}`;
          const collateralAmount = pos.collateral?.amount || 0;
          const leverage = pos.leverage || 1;
          const entryPrice = pos.entryPrice || 0;

          // Use real-time current price from market data
          const realCurrentPrice = currentPrice; // Use state value from market data API

          // FIXED P&L calculation - use Strike Finance API position size directly
          const positionSize = pos.positionSize || (collateralAmount * leverage);

          // Calculate price difference correctly
          const priceDiff = pos.position === 'Long'
            ? (realCurrentPrice - entryPrice)
            : (entryPrice - realCurrentPrice);

          // Calculate P&L - this should be the profit/loss in USD
          const pnlRaw = priceDiff * positionSize;

          // Calculate percentage based on collateral invested
          const collateralValueUSD = collateralAmount * entryPrice;
          const pnlPercent = collateralValueUSD > 0 ? (pnlRaw / collateralValueUSD) * 100 : 0;

          return {
            id: positionId,
            side: pos.position || 'Long', // Strike Finance uses 'position' field
            pair: 'ADA/USD',
            size: positionSize, // Use correct position size from API
            entryPrice: entryPrice,
            currentPrice: realCurrentPrice, // Use real-time price
            leverage: leverage,
            pnl: pnlRaw,
            pnlPercent: pnlPercent,
            liquidationPrice: pos.liquidationPrice || 0,
            stopLoss: pos.stopLoss,
            takeProfit: pos.takeProfit,
            timestamp: new Date(pos.enteredPositionTime || Date.now())
          };
        });

        console.log('✅ [SHARED] Converted positions:', strikePositions);
        setPositions(strikePositions);
      } else {
        console.log('📭 [SHARED] No positions found or empty data');
        setPositions([]);
      }
    } catch (error) {
      console.error('❌ [SHARED] Failed to fetch positions:', error);
      // Show empty state on error
      setPositions([]);
    } finally {
      isCurrentlyFetching = false;
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  };

  const refreshPositions = async () => {
    setIsLoading(true);
    await fetchPositions();
  };

  useEffect(() => {
    // Prevent execution during SSR
    if (typeof window === 'undefined') return;
    
    contextInstanceCount++;
    console.log(`📊 [SHARED] PositionsProvider instance ${contextInstanceCount} mounted`);

    if (mainWallet?.address) {
      // Small delay to prevent hydration issues
      const initTimeout = setTimeout(() => {
        // Initial fetch
        fetchPositions();
        fetchMarketData();

        // Clear any existing intervals to prevent duplicates
        if (globalInterval) {
          clearInterval(globalInterval);
          console.log('🔄 [SHARED] Cleared existing positions interval');
        }
        if (priceInterval) {
          clearInterval(priceInterval);
          console.log('🔄 [SHARED] Cleared existing price interval');
        }

        // Set up new intervals (singleton approach)
        globalInterval = setInterval(fetchPositions, 300000); // Update positions every 5 minutes
        priceInterval = setInterval(fetchMarketData, 60000); // Update price every 1 minute

        console.log('✅ [SHARED] Set up singleton intervals - positions: 5min, price: 1min');
      }, 100); // Small delay to prevent hydration mismatch

      return () => {
        clearTimeout(initTimeout);
      };
    }

    // Cleanup function
    return () => {
      contextInstanceCount--;
      console.log(`📊 [SHARED] PositionsProvider instance unmounted, remaining: ${contextInstanceCount}`);
      
      // Only clear intervals if this is the last instance
      if (contextInstanceCount === 0) {
        if (globalInterval) {
          clearInterval(globalInterval);
          globalInterval = null;
          console.log('🧹 [SHARED] Cleaned up positions interval (last instance)');
        }
        if (priceInterval) {
          clearInterval(priceInterval);
          priceInterval = null;
          console.log('🧹 [SHARED] Cleaned up price interval (last instance)');
        }
      }
    };
  }, [mainWallet?.address]);

  const contextValue: PositionsContextType = {
    positions,
    currentPrice,
    isLoading,
    lastUpdated,
    refreshPositions
  };

  return (
    <PositionsContext.Provider value={contextValue}>
      {children}
    </PositionsContext.Provider>
  );
}

export function usePositions(): PositionsContextType {
  const context = useContext(PositionsContext);
  if (context === undefined) {
    throw new Error('usePositions must be used within a PositionsProvider');
  }
  return context;
}