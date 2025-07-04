import { apiClient } from './client';
import { ApiResponse, DashboardData, Position, AIActivity, AIStatus, PortfolioData } from '@/types/api';

/**
 * Dashboard API Service
 * Integrates with SignalService, ExecutionService, and WalletManager
 */
export class DashboardAPI {
  /**
   * Get complete dashboard data for a user
   * Aggregates data from multiple backend services
   */
  async getDashboardData(userId: string): Promise<ApiResponse<DashboardData>> {
    console.log(`📊 Fetching dashboard data for user ${userId}...`);
    
    return apiClient.get<DashboardData>(`/api/dashboard?userId=${userId}`);
  }

  /**
   * Get portfolio data
   * Calls WalletManager and calculates portfolio metrics
   */
  async getPortfolioData(userId: string): Promise<ApiResponse<PortfolioData>> {
    console.log(`💰 Fetching portfolio data for user ${userId}...`);
    
    return apiClient.get<PortfolioData>(`/api/portfolio?userId=${userId}`);
  }

  /**
   * Get active positions
   * Calls ExecutionService to get position data
   */
  async getPositions(userId: string): Promise<ApiResponse<Position[]>> {
    console.log(`📈 Fetching positions for user ${userId}...`);
    
    return apiClient.get<Position[]>(`/api/positions?userId=${userId}`);
  }

  /**
   * Get AI activity feed
   * Calls SignalService and ExecutionService for recent activity
   */
  async getAIActivity(userId: string, limit: number = 50): Promise<ApiResponse<AIActivity[]>> {
    console.log(`🤖 Fetching AI activity for user ${userId}...`);
    
    return apiClient.get<AIActivity[]>(`/api/ai-activity?userId=${userId}&limit=${limit}`);
  }

  /**
   * Get AI status
   * Calls SignalService for current AI status
   */
  async getAIStatus(): Promise<ApiResponse<AIStatus>> {
    console.log('🤖 Fetching AI status...');
    
    return apiClient.get<AIStatus>('/api/ai-status');
  }

  /**
   * Force AI signal check
   * Calls SignalService.forceSignalCheck()
   */
  async forceSignalCheck(): Promise<ApiResponse<{ decision: Record<string, unknown>; timestamp: Date }>> {
    console.log('🔧 Forcing AI signal check...');

    return apiClient.post<{ decision: Record<string, unknown>; timestamp: Date }>('/api/ai-signal/force');
  }

  /**
   * Close a position
   * Calls ExecutionService to close position
   */
  async closePosition(positionId: string): Promise<ApiResponse<{ txHash: string; message: string }>> {
    console.log(`❌ Closing position ${positionId}...`);
    
    return apiClient.post<{ txHash: string; message: string }>(`/api/positions/${positionId}/close`);
  }

  /**
   * Update position (modify stop loss, take profit, etc.)
   */
  async updatePosition(
    positionId: string, 
    updates: { stopLoss?: number; takeProfit?: number }
  ): Promise<ApiResponse<{ message: string }>> {
    console.log(`✏️ Updating position ${positionId}...`);
    
    return apiClient.put<{ message: string }>(`/api/positions/${positionId}`, updates);
  }

  /**
   * Get real-time market data
   * Calls StrikeFinanceAPI for current market info
   */
  async getMarketData(): Promise<ApiResponse<{ price: number; change24h: number; volume: number }>> {
    console.log('📊 Fetching market data...');
    
    return apiClient.get<{ price: number; change24h: number; volume: number }>('/api/market-data');
  }

  /**
   * Calculate portfolio metrics
   */
  calculatePortfolioMetrics(positions: Position[]): {
    totalValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    openPositions: number;
  } {
    const openPositions = positions.filter(p => p.status === 'open');
    
    const totalValue = openPositions.reduce((sum, pos) => {
      return sum + (pos.size * pos.currentPrice);
    }, 0);

    const totalPnL = openPositions.reduce((sum, pos) => sum + pos.pnl, 0);
    
    const totalInvested = openPositions.reduce((sum, pos) => {
      return sum + (pos.size * pos.entryPrice);
    }, 0);

    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    return {
      totalValue,
      totalPnL,
      totalPnLPercent,
      openPositions: openPositions.length,
    };
  }

  /**
   * Format currency values
   */
  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  /**
   * Format percentage values
   */
  formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  /**
   * Get color for PnL display
   */
  getPnLColor(value: number): string {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-gray-500';
  }
}

// Export singleton instance
export const dashboardAPI = new DashboardAPI();
export default dashboardAPI;
