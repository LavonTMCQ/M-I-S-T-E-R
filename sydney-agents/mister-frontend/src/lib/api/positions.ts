import { apiClient } from './client';
import { ApiResponse, Position } from '@/types/api';

/**
 * Positions API Service
 * Integrates with ExecutionService for position management
 */
export class PositionsAPI {
  /**
   * Get all positions for a user
   */
  async getPositions(userId: string): Promise<ApiResponse<Position[]>> {
    console.log(`📈 Fetching positions for user ${userId}...`);
    
    return apiClient.get<Position[]>(`/api/positions?userId=${userId}`);
  }

  /**
   * Get a specific position by ID
   */
  async getPosition(positionId: string): Promise<ApiResponse<Position>> {
    console.log(`📈 Fetching position ${positionId}...`);
    
    return apiClient.get<Position>(`/api/positions/${positionId}`);
  }

  /**
   * Close a position
   * Calls ExecutionService to close position across all managed wallets
   */
  async closePosition(positionId: string, userId: string, reason?: string): Promise<ApiResponse<{
    positionId: string;
    txHash: string;
    closedAt: string;
    finalPnl: number;
    finalPnlPercent: number;
    closePrice: number;
    reason: string;
    status: string;
  }>> {
    console.log(`❌ Closing position ${positionId}...`);

    return apiClient.post(`/api/positions/${positionId}/close`, {
      userId,
      reason
    });
  }

  /**
   * Get close position preview
   */
  async getClosePreview(positionId: string): Promise<ApiResponse<{
    positionId: string;
    currentPrice: number;
    estimatedPnl: number;
    estimatedPnlPercent: number;
    estimatedFees: number;
    netPnl: number;
    slippage: number;
    estimatedClosePrice: number;
    canClose: boolean;
    warnings: string[];
  }>> {
    console.log(`🔍 Getting close preview for position ${positionId}...`);

    return apiClient.get(`/api/positions/${positionId}/close`);
  }

  /**
   * Update position parameters (stop loss, take profit)
   */
  async updatePosition(
    positionId: string, 
    updates: { 
      stopLoss?: number; 
      takeProfit?: number;
      size?: number;
    }
  ): Promise<ApiResponse<{ message: string }>> {
    console.log(`✏️ Updating position ${positionId}...`);
    
    return apiClient.put<{ message: string }>(`/api/positions/${positionId}`, updates);
  }

  /**
   * Get position history for a user
   */
  async getPositionHistory(userId: string, limit: number = 100): Promise<ApiResponse<Position[]>> {
    console.log(`📊 Fetching position history for user ${userId}...`);
    
    return apiClient.get<Position[]>(`/api/positions/history?userId=${userId}&limit=${limit}`);
  }

  /**
   * Calculate position metrics
   */
  calculatePositionMetrics(positions: Position[]): {
    totalPositions: number;
    openPositions: number;
    closedPositions: number;
    totalPnL: number;
    totalPnLPercent: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
  } {
    const openPositions = positions.filter(p => p.status === 'open');
    const closedPositions = positions.filter(p => p.status === 'closed');
    
    const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
    
    const totalInvested = positions.reduce((sum, pos) => {
      return sum + (pos.size * pos.entryPrice);
    }, 0);
    
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    
    const winningTrades = closedPositions.filter(p => p.pnl > 0);
    const losingTrades = closedPositions.filter(p => p.pnl < 0);
    
    const winRate = closedPositions.length > 0 ? (winningTrades.length / closedPositions.length) * 100 : 0;
    
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, pos) => sum + pos.pnl, 0) / winningTrades.length 
      : 0;
    
    const avgLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, pos) => sum + pos.pnl, 0) / losingTrades.length)
      : 0;

    return {
      totalPositions: positions.length,
      openPositions: openPositions.length,
      closedPositions: closedPositions.length,
      totalPnL,
      totalPnLPercent,
      winRate,
      avgWin,
      avgLoss,
    };
  }

  /**
   * Format position size for display
   */
  formatPositionSize(size: number, pair: string): string {
    return `${size.toLocaleString()} ${pair.split('/')[0]}`;
  }

  /**
   * Get position status color
   */
  getPositionStatusColor(status: string): string {
    switch (status) {
      case 'open':
        return 'text-blue-500';
      case 'closed':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  }

  /**
   * Get position type color
   */
  getPositionTypeColor(type: 'Long' | 'Short'): string {
    return type === 'Long' ? 'text-green-500' : 'text-red-500';
  }

  /**
   * Calculate position value
   */
  calculatePositionValue(position: Position): number {
    return position.size * position.currentPrice;
  }

  /**
   * Calculate position PnL percentage
   */
  calculatePnLPercentage(position: Position): number {
    const invested = position.size * position.entryPrice;
    return invested > 0 ? (position.pnl / invested) * 100 : 0;
  }
}

// Export singleton instance
export const positionsAPI = new PositionsAPI();
export default positionsAPI;
