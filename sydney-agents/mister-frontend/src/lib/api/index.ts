// API Client and Services
export { apiClient, ApiClient } from './client';

// Individual API Services
export { walletAPI, WalletAPI } from './wallet';
export { dashboardAPI, DashboardAPI } from './dashboard';
export { positionsAPI, PositionsAPI } from './positions';
export { activityAPI, ActivityAPI } from './activity';
export { strikeAPI, StrikeAPI } from './strike';

// Authentication
export { authService, AuthService } from '../auth/auth';

// Types
export * from '../../types/api';

// Import for convenience object
import { walletAPI } from './wallet';
import { dashboardAPI } from './dashboard';
import { positionsAPI } from './positions';
import { activityAPI } from './activity';
import { strikeAPI } from './strike';
import { authService } from '../auth/auth';
import { apiClient } from './client';

// Convenience exports for common operations
export const api = {
  wallet: walletAPI,
  dashboard: dashboardAPI,
  positions: positionsAPI,
  activity: activityAPI,
  strike: strikeAPI,
  auth: authService,
  client: apiClient,
};

export default api;
