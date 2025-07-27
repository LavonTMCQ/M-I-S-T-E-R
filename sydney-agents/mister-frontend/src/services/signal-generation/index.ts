/**
 * Signal Generation Service - Quick Implementation
 */

import { TradingSignal, SignalServiceStatus, SignalGenerationResponse } from '@/types/signals';

class MockSignalService {
  private listeners: ((signal: TradingSignal) => void)[] = [];
  private status: SignalServiceStatus = {
    running: true,
    last_signal_time: null,
    signals_today: 3,
    health: 'healthy',
    errors: [],
    uptime_seconds: 3600,
  };

  addSignalListener(callback: (signal: TradingSignal) => void) {
    this.listeners.push(callback);
  }

  removeSignalListener(callback: (signal: TradingSignal) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) this.listeners.splice(index, 1);
  }

  getStatus(): SignalServiceStatus {
    return { ...this.status };
  }

  async generateSignalNow(): Promise<SignalGenerationResponse> {
    const mockSignal: TradingSignal = {
      id: `signal_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: Math.random() > 0.5 ? 'long' : 'short',
      price: 0.7234,
      confidence: 87,
      pattern: 'RSI_Oversold_BB_Bounce',
      reasoning: 'RSI oversold + Bollinger Band bounce detected',
      indicators: { rsi: 28.5, bb_position: 0.15, volume_ratio: 1.8, price: 0.7234 },
      risk: { stop_loss: 0.7100, take_profit: 0.7800, position_size: 75, max_risk: 10.05 },
      algorithm: { algorithm_name: 'ADA Custom Algorithm', version: '2.1.0', timeframe: '15m', historical_win_rate: 62.5 },
      status: 'pending',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    this.status.last_signal_time = mockSignal.timestamp;
    this.status.signals_today += 1;
    this.listeners.forEach(listener => listener(mockSignal));

    return { success: true, signal: mockSignal, timestamp: new Date().toISOString() };
  }
}

let serviceInstance: MockSignalService | null = null;

export function getSignalGenerationService(): MockSignalService {
  if (!serviceInstance) serviceInstance = new MockSignalService();
  return serviceInstance;
}

export function initializeSignalService(config?: any): MockSignalService {
  return getSignalGenerationService();
}