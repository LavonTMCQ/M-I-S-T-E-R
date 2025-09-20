/**
 * MisterLabs220 Algorithm Service Client
 * Production URL: https://misterlabs220-production.up.railway.app
 * WebSocket: wss://misterlabs220-production.up.railway.app/ws
 * API Key required for write operations
 */

// Simple EventEmitter for browser compatibility
class EventEmitter {
  private events: { [key: string]: Array<(...args: any[]) => void> } = {};

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event: string, ...args: any[]): void {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  removeAllListeners(): void {
    this.events = {};
  }
}

// Types
export interface SignalData {
  longScore: number;
  shortScore: number;
  readinessStatus: 'READY_LONG' | 'READY_SHORT' | 'NOT_READY' | 'CONFLICTING';
  missingConditions: string[];
  signals: {
    long: Record<string, boolean>;
    short: Record<string, boolean>;
  };
}

export interface PositionDetails {
  type: 'LONG' | 'SHORT' | 'FLAT';
  entryPrice: number;
  currentPrice: number;
  pnlPercentage: number;
  pnlUSD: number;
  size: number;
  exitDistances: {
    smaDistance: number;
    rsiLevel: number;
    stopLossDistance: number;
    takeProfitDistance: number;
  };
}

export interface AccountData {
  balance: number;
  tradingEnabled: boolean;
  positionStatus: 'LONG' | 'SHORT' | 'FLAT';
}

export interface PerformanceSummary {
  winRate: number;
  avgPnL: number;
  totalTrades: number;
  bestTrade: number;
  worstTrade: number;
}

export interface GatekeeperAnalysis {
  topBlockers: Array<{ condition: string; count: number }>;
  neverTrigger: string[];
  currentStates: Record<string, boolean>;
}

export interface WebSocketMessage {
  type: 'update' | 'error' | 'connected';
  signals?: SignalData;
  account?: AccountData;
  position?: PositionDetails;
  timestamp?: string;
}

export class MisterLabs220Service extends EventEmitter {
  private baseUrl: string;
  private wsUrl: string;
  private apiKey: string;
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(apiKey?: string) {
    super();
    this.baseUrl = process.env.NEXT_PUBLIC_ALGO_API_URL || 'https://misterlabs220-production.up.railway.app';
    this.wsUrl = process.env.NEXT_PUBLIC_ALGO_WS_URL || 'wss://misterlabs220-production.up.railway.app/ws';
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_API_KEY || 'mister_labs_220_tQm8Kx9pL3nR7vB2';
  }

  // WebSocket Management
  public connectWebSocket(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    try {
      console.log('🔌 Connecting to WebSocket:', this.wsUrl);
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Start ping to keep connection alive
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message:', data.type);
          
          this.emit('message', data);
          
          if (data.signals) {
            this.emit('signals', data.signals);
          }
          if (data.account) {
            this.emit('account', data.account);
          }
          if (data.position) {
            this.emit('position', data.position);
          }
        } catch (error) {
          console.error('❌ WebSocket message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.emit('disconnected');
        this.stopPing();
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      this.emit('error', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public disconnectWebSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopPing();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // REST API Methods
  private async fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Get Methods
  public async getSignals(): Promise<SignalData> {
    return this.fetchAPI<SignalData>('/signals');
  }

  public async getAccount(): Promise<AccountData> {
    return this.fetchAPI<AccountData>('/account');
  }

  public async getPositionDetails(): Promise<PositionDetails> {
    return this.fetchAPI<PositionDetails>('/position/details');
  }

  public async getPerformanceSummary(): Promise<PerformanceSummary> {
    return this.fetchAPI<PerformanceSummary>('/performance/summary');
  }

  public async getGatekeeperAnalysis(): Promise<GatekeeperAnalysis> {
    return this.fetchAPI<GatekeeperAnalysis>('/gatekeeper/analysis');
  }

  public async downloadPerformanceCSV(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/performance/download`, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download CSV: ${response.status}`);
    }

    return response.blob();
  }

  public async getHealthDetailed(): Promise<any> {
    return this.fetchAPI('/health/detailed');
  }

  public async getConfig(): Promise<any> {
    return this.fetchAPI('/config');
  }

  // Post Methods
  public async enableTrading(): Promise<any> {
    return this.fetchAPI('/trading/enable', {
      method: 'POST',
    });
  }

  public async disableTrading(): Promise<any> {
    return this.fetchAPI('/trading/disable', {
      method: 'POST',
    });
  }

  public async closePosition(reason?: string): Promise<any> {
    return this.fetchAPI('/position/close', {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Manual close' }),
    });
  }

  public async updateLeverage(leverage: number): Promise<any> {
    return this.fetchAPI('/config/leverage', {
      method: 'POST',
      body: JSON.stringify({ leverage }),
    });
  }

  // Utility Methods
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getConnectionState(): string {
    if (!this.ws) return 'DISCONNECTED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'CONNECTED';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'DISCONNECTED';
      default:
        return 'UNKNOWN';
    }
  }

  // Cleanup
  public destroy(): void {
    this.disconnectWebSocket();
    this.removeAllListeners();
  }
}

// Singleton instance
let serviceInstance: MisterLabs220Service | null = null;

export function getMisterLabs220Service(): MisterLabs220Service {
  if (!serviceInstance) {
    serviceInstance = new MisterLabs220Service();
  }
  return serviceInstance;
}

export function destroyMisterLabs220Service(): void {
  if (serviceInstance) {
    serviceInstance.destroy();
    serviceInstance = null;
  }
}