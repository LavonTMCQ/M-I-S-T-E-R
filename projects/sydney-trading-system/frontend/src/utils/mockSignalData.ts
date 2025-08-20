/**
 * Mock Signal Data Generator
 * Creates realistic signal history for testing the Advanced Signal Analytics Dashboard
 */

import { SignalData, SignalPerformance } from '@/types/tradingview';

/**
 * Generate mock signal history with realistic performance data
 */
export function generateMockSignalHistory(count: number = 50): SignalPerformance[] {
  const signals: SignalPerformance[] = [];
  const now = new Date();
  
  // Base SPY price around $580
  let basePrice = 580;
  
  for (let i = 0; i < count; i++) {
    // Generate timestamp (last 30 days, market hours only)
    const daysBack = Math.floor(Math.random() * 30);
    const hoursBack = Math.floor(Math.random() * 6.5) + 9.5; // 9:30 AM to 4:00 PM
    const minutesBack = Math.floor(Math.random() * 60);
    
    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - daysBack);
    timestamp.setHours(Math.floor(hoursBack), minutesBack, 0, 0);
    
    // Generate signal type (slightly favor long signals in bull market)
    const signalType: 'long' | 'short' = Math.random() > 0.45 ? 'long' : 'short';
    
    // Generate price with some volatility
    const priceVariation = (Math.random() - 0.5) * 20; // ±$10 variation
    const signalPrice = basePrice + priceVariation;
    
    // Generate confidence (higher confidence for better signals)
    const baseConfidence = Math.random() * 800 + 200; // 200-1000 range
    
    // Generate MACD and EMA values
    const macdValue = (Math.random() - 0.5) * 0.02; // -0.01 to 0.01
    const emaValue = signalPrice + (Math.random() - 0.5) * 5; // ±$2.50 from signal price
    
    // Create signal
    const signal: SignalData = {
      timestamp,
      type: signalType,
      price: signalPrice,
      confidence: baseConfidence,
      reason: `MACD histogram ${signalType === 'long' ? 'bullish' : 'bearish'} crossover + EMA-9 trend filter (Market Hours)`,
      macdValue,
      emaValue,
      id: `${signalType}_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Generate performance outcome
    const performance = generateSignalPerformance(signal, baseConfidence);
    
    signals.push(performance);
    
    // Slight price drift for next signal
    basePrice += (Math.random() - 0.5) * 2;
  }
  
  // Sort by timestamp (oldest first)
  return signals.sort((a, b) => a.signal.timestamp.getTime() - b.signal.timestamp.getTime());
}

/**
 * Generate realistic performance data for a signal
 */
function generateSignalPerformance(signal: SignalData, baseConfidence: number): SignalPerformance {
  const signalId = signal.id || `${signal.type}_${signal.timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine if signal should be pending (10% chance for recent signals)
  const hoursSinceSignal = (Date.now() - signal.timestamp.getTime()) / (1000 * 60 * 60);
  const isPending = hoursSinceSignal < 2 && Math.random() < 0.1;
  
  if (isPending) {
    return {
      signalId,
      signal,
      outcome: 'pending'
    };
  }
  
  // Calculate win probability based on confidence and signal type
  // Higher confidence = higher win probability
  const confidenceBonus = (baseConfidence - 500) / 1000; // -0.3 to 0.5
  const baseWinRate = 0.46; // Our validated win rate
  const winProbability = Math.max(0.1, Math.min(0.8, baseWinRate + confidenceBonus * 0.2));
  
  const isWin = Math.random() < winProbability;
  const outcome: 'win' | 'loss' = isWin ? 'win' : 'loss';
  
  // Generate exit time (30 minutes to 2 hours later)
  const holdingMinutes = Math.random() * 90 + 30; // 30-120 minutes
  const exitTime = new Date(signal.timestamp.getTime() + holdingMinutes * 60 * 1000);
  
  // Generate exit price based on outcome and market volatility
  let exitPrice: number;
  let pnl: number;
  
  if (isWin) {
    // Winning trades: 0.5% to 2.5% profit
    const profitPercent = Math.random() * 0.02 + 0.005; // 0.5% to 2.5%
    exitPrice = signal.type === 'long' 
      ? signal.price * (1 + profitPercent)
      : signal.price * (1 - profitPercent);
  } else {
    // Losing trades: 0.3% to 1.5% loss
    const lossPercent = Math.random() * 0.012 + 0.003; // 0.3% to 1.5%
    exitPrice = signal.type === 'long'
      ? signal.price * (1 - lossPercent)
      : signal.price * (1 + lossPercent);
  }
  
  // Calculate P&L (assuming 100 contracts)
  const positionSize = 100;
  pnl = signal.type === 'long'
    ? (exitPrice - signal.price) * positionSize
    : (signal.price - exitPrice) * positionSize;
  
  // Calculate P&L in pips (SPY: 1 pip = $0.01)
  const pnlPips = signal.type === 'long'
    ? (exitPrice - signal.price) * 100
    : (signal.price - exitPrice) * 100;
  
  // Generate max runup/drawdown during trade
  const maxRunup = isWin ? Math.abs(pnl) * (1 + Math.random() * 0.5) : Math.abs(pnl) * Math.random() * 0.3;
  const maxDrawdown = isWin ? Math.abs(pnl) * Math.random() * 0.2 : Math.abs(pnl) * (1 + Math.random() * 0.3);
  
  // Calculate risk-reward ratio (simplified)
  const riskAmount = signal.price * 0.01 * positionSize; // 1% risk
  const riskRewardRatio = Math.abs(pnl) / riskAmount;
  
  return {
    signalId,
    signal,
    outcome,
    pnl,
    pnlPips,
    holdingPeriod: holdingMinutes,
    exitPrice,
    exitTime,
    maxRunup,
    maxDrawdown,
    riskRewardRatio
  };
}

/**
 * Initialize mock data in localStorage for testing
 */
export function initializeMockSignalData(): void {
  // Only run on client side
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Check if data already exists
    const existing = localStorage.getItem('signalAnalytics');
    if (existing) {
      console.log('📊 Signal analytics data already exists in localStorage');
      return;
    }
    
    // Generate mock signal history
    const mockHistory = generateMockSignalHistory(75); // 75 signals over 30 days
    
    const data = {
      signalHistory: mockHistory,
      marketConditions: []
    };
    
    localStorage.setItem('signalAnalytics', JSON.stringify(data));
    
    console.log(`📊 Initialized ${mockHistory.length} mock signals in localStorage`);
    console.log(`✅ Win Rate: ${(mockHistory.filter(s => s.outcome === 'win').length / mockHistory.filter(s => s.outcome !== 'pending').length * 100).toFixed(1)}%`);
    console.log(`💰 Total P&L: $${mockHistory.reduce((sum, s) => sum + (s.pnl || 0), 0).toFixed(2)}`);
    
  } catch (error) {
    console.warn('⚠️ Failed to initialize mock signal data:', error);
  }
}

/**
 * Clear all signal analytics data (for testing)
 */
export function clearSignalData(): void {
  // Only run on client side
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem('signalAnalytics');
    console.log('🗑️ Cleared all signal analytics data');
  } catch (error) {
    console.warn('⚠️ Failed to clear signal data:', error);
  }
}

/**
 * Add a few recent signals for real-time testing
 */
export function addRecentTestSignals(): void {
  // Only run on client side
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const existing = localStorage.getItem('signalAnalytics');
    const data = existing ? JSON.parse(existing) : { signalHistory: [], marketConditions: [] };
    
    const now = new Date();
    const recentSignals = [];
    
    // Add 3 recent signals (last 2 hours)
    for (let i = 0; i < 3; i++) {
      const minutesAgo = i * 40 + 10; // 10, 50, 90 minutes ago
      const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000);
      
      const signal: SignalData = {
        timestamp,
        type: Math.random() > 0.5 ? 'long' : 'short',
        price: 580 + (Math.random() - 0.5) * 10,
        confidence: Math.random() * 600 + 400,
        reason: 'MACD histogram crossover + EMA-9 trend filter (Market Hours)',
        macdValue: (Math.random() - 0.5) * 0.01,
        emaValue: 580 + (Math.random() - 0.5) * 5,
        id: `test_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      const performance = generateSignalPerformance(signal, signal.confidence);
      recentSignals.push(performance);
    }
    
    data.signalHistory.push(...recentSignals);
    localStorage.setItem('signalAnalytics', JSON.stringify(data));
    
    console.log(`📊 Added ${recentSignals.length} recent test signals`);
    
  } catch (error) {
    console.warn('⚠️ Failed to add recent test signals:', error);
  }
}
