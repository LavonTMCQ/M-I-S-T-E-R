import { apiClient } from './client';
import { ApiResponse, AIActivity, TradingDecision } from '@/types/api';

/**
 * Activity API Service
 * Integrates with SignalService and ExecutionService for AI activity tracking
 */
export class ActivityAPI {
  /**
   * Get AI activity feed for a user
   */
  async getAIActivity(userId: string, limit: number = 50): Promise<ApiResponse<AIActivity[]>> {
    console.log(`🤖 Fetching AI activity for user ${userId}...`);
    
    return apiClient.get<AIActivity[]>(`/api/ai-activity?userId=${userId}&limit=${limit}`);
  }

  /**
   * Get recent AI activity (last 24 hours)
   */
  async getRecentActivity(userId: string): Promise<ApiResponse<AIActivity[]>> {
    console.log(`🤖 Fetching recent AI activity for user ${userId}...`);
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return apiClient.get<AIActivity[]>(`/api/ai-activity?userId=${userId}&since=${twentyFourHoursAgo}`);
  }

  /**
   * Get AI activity by type
   */
  async getActivityByType(
    userId: string, 
    type: 'trade' | 'signal' | 'analysis' | 'error'
  ): Promise<ApiResponse<AIActivity[]>> {
    console.log(`🤖 Fetching ${type} activity for user ${userId}...`);
    
    return apiClient.get<AIActivity[]>(`/api/ai-activity?userId=${userId}&type=${type}`);
  }

  /**
   * Get AI signal history
   * Calls SignalService for historical signals
   */
  async getSignalHistory(limit: number = 100, action?: string): Promise<ApiResponse<{
    signals: (TradingDecision & { id: string; timestamp: string })[];
    statistics: {
      totalSignals: number;
      openSignals: number;
      closeSignals: number;
      holdSignals: number;
      avgConfidence: number;
    };
  }>> {
    console.log('📡 Fetching AI signal history...');

    const params = new URLSearchParams({ limit: limit.toString() });
    if (action) params.append('action', action);

    return apiClient.get(`/api/ai-signals?${params.toString()}`);
  }

  /**
   * Force AI signal check
   * Calls SignalService.forceSignalCheck()
   */
  async forceSignalCheck(immediate: boolean = false): Promise<ApiResponse<{
    decision: TradingDecision;
    timestamp: string;
    executionTime: number;
    marketConditions: {
      price: number;
      volatility: number;
      volume: number;
      trend: string;
    };
  }>> {
    console.log('🔧 Forcing AI signal check...');

    return apiClient.post('/api/ai-signals/force', { immediate });
  }

  /**
   * Get execution summary for recent trades
   */
  async getExecutionSummary(userId: string, days: number = 7): Promise<ApiResponse<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    totalVolume: number;
  }>> {
    console.log(`⚡ Fetching execution summary for user ${userId}...`);
    
    return apiClient.get(`/api/execution-summary?userId=${userId}&days=${days}`);
  }

  /**
   * Format activity timestamp for display
   */
  formatActivityTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Get activity status icon
   */
  getActivityStatusIcon(status: 'success' | 'info' | 'error' | 'pending'): string {
    switch (status) {
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      case 'error':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '📊';
    }
  }

  /**
   * Get activity status color
   */
  getActivityStatusColor(status: 'success' | 'info' | 'error' | 'pending'): string {
    switch (status) {
      case 'success':
        return 'text-green-500';
      case 'info':
        return 'text-blue-500';
      case 'error':
        return 'text-red-500';
      case 'pending':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  }

  /**
   * Format activity description
   */
  formatActivityDescription(activity: AIActivity): string {
    if (activity.description) return activity.description;
    
    // Generate description based on activity data
    if (activity.pair && activity.amount && activity.price) {
      return `${activity.action} ${activity.amount} ${activity.pair} at $${activity.price}`;
    }
    
    return activity.action;
  }

  /**
   * Group activities by date
   */
  groupActivitiesByDate(activities: AIActivity[]): Record<string, AIActivity[]> {
    return activities.reduce((groups, activity) => {
      const date = new Date(activity.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    }, {} as Record<string, AIActivity[]>);
  }

  /**
   * Filter activities by status
   */
  filterActivitiesByStatus(
    activities: AIActivity[], 
    status: 'success' | 'info' | 'error' | 'pending'
  ): AIActivity[] {
    return activities.filter(activity => activity.status === status);
  }

  /**
   * Get activity statistics
   */
  getActivityStatistics(activities: AIActivity[]): {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    successRate: number;
  } {
    const total = activities.length;
    const successful = activities.filter(a => a.status === 'success').length;
    const failed = activities.filter(a => a.status === 'error').length;
    const pending = activities.filter(a => a.status === 'pending').length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return {
      total,
      successful,
      failed,
      pending,
      successRate,
    };
  }
}

// Export singleton instance
export const activityAPI = new ActivityAPI();
export default activityAPI;
