/**
 * API Configuration for MISTER Frontend
 * Handles environment-specific API endpoints
 */

interface ApiConfig {
  MASTRA_API_URL: string;
  MISTER_API_URL: string;
  STRIKE_API_URL: string;
  CNT_API_URL: string;
  ADA_ALGORITHM_API_URL: string;
}

const API_CONFIG: Record<string, ApiConfig> = {
  development: {
    MASTRA_API_URL: 'https://substantial-scarce-magazin.mastra.cloud',
    MISTER_API_URL: 'https://substantial-scarce-magazin.mastra.cloud',
    STRIKE_API_URL: 'https://substantial-scarce-magazin.mastra.cloud', // Use hosted Mastra Cloud for Strike Agent
    CNT_API_URL: 'https://cnt-trading-api-production.up.railway.app',
    ADA_ALGORITHM_API_URL: 'https://ada-backtesting-service-production.up.railway.app',
  },
  production: {
    MASTRA_API_URL: 'https://substantial-scarce-magazin.mastra.cloud',
    MISTER_API_URL: 'https://substantial-scarce-magazin.mastra.cloud',
    STRIKE_API_URL: 'https://strike-bridge-server-production.up.railway.app',
    CNT_API_URL: 'https://cnt-trading-api-production.up.railway.app',
    ADA_ALGORITHM_API_URL: 'https://ada-backtesting-service-production.up.railway.app',
  }
};

// Get current environment
const env = process.env.NODE_ENV || 'development';

// Export the configuration for the current environment
export const apiConfig = API_CONFIG[env];

// Export individual URLs for convenience
export const {
  MASTRA_API_URL,
  MISTER_API_URL,
  STRIKE_API_URL,
  CNT_API_URL,
  ADA_ALGORITHM_API_URL
} = apiConfig;

// Default export
export default apiConfig;

// Environment check helper
export const isDevelopment = env === 'development';
export const isProduction = env === 'production';

// Console log for debugging
if (typeof window !== 'undefined') {
  console.log(`🔧 API Config loaded for ${env} environment:`, apiConfig);
}
