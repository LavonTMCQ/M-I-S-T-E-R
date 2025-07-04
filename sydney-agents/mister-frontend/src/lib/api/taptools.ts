/**
 * TapTools API Integration
 * For real wallet portfolio data and trends
 */

const TAPTOOLS_API_KEY = 'WghkJaZlDWYdQFsyt3uiLdTIOYnR5uhO';
const TAPTOOLS_BASE_URL = 'https://openapi.taptools.io/api/v1';

export interface TapToolsWalletValue {
  time: number;
  value: number;
  ada_value: number;
  usd_value: number;
}

export interface TapToolsWalletTrend {
  stake_address: string;
  values: TapToolsWalletValue[];
  total_value: number;
  total_ada: number;
  total_usd: number;
  change_24h: number;
  change_24h_percent: number;
}

export interface TapToolsPortfolioData {
  success: boolean;
  data: TapToolsWalletTrend;
}

/**
 * TapTools API Service
 */
export class TapToolsAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = TAPTOOLS_API_KEY;
    this.baseUrl = TAPTOOLS_BASE_URL;
  }

  /**
   * Get wallet value trend data
   * @param stakeAddress - Cardano stake address (bech32 format)
   * @param timeframe - Timeframe for trend data (1d, 7d, 30d, 90d, 1y)
   * @param quoteCurrency - Quote currency (ADA or USD)
   */
  async getWalletValueTrend(
    stakeAddress: string,
    timeframe: string = '7d',
    quoteCurrency: string = 'USD'
  ): Promise<TapToolsPortfolioData> {
    try {
      console.log(`📊 Fetching TapTools portfolio data for ${stakeAddress.substring(0, 20)}...`);
      console.log(`📊 Parameters: timeframe=${timeframe}, quote=${quoteCurrency}`);

      // TapTools API expects 'address' parameter (not 'stake_address')
      const attempts = [
        // WORKING FORMAT: Use 'address' parameter with uppercase currency
        {
          url: `${this.baseUrl}/wallet/value/trended`,
          params: { address: stakeAddress, timeframe, quote_currency: quoteCurrency.toUpperCase() }
        }
      ];

      for (const attempt of attempts) {
        try {
          const method = attempt.method || 'GET';
          let fullUrl = attempt.url;
          let fetchOptions: RequestInit = {
            method: method,
            headers: {
              'X-API-Key': this.apiKey,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          };

          if (method === 'GET') {
            const params = new URLSearchParams(attempt.params);
            fullUrl = `${attempt.url}?${params.toString()}`;
          } else {
            fetchOptions.body = JSON.stringify(attempt.params);
          }

          console.log(`📊 Trying ${method} ${fullUrl}`);
          if (method === 'POST') {
            console.log(`📊 POST body:`, attempt.params);
          }

          const response = await fetch(fullUrl, fetchOptions);
          console.log(`📊 Response status: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            console.log('✅ TapTools REAL portfolio data received:', data);

            // Validate that we got actual trend data
            if (data && (data.values || data.data || Array.isArray(data))) {
              return {
                success: true,
                data: data
              };
            } else {
              console.warn('❌ Response format unexpected:', data);
            }
          } else {
            const errorText = await response.text();
            console.warn(`❌ ${method} attempt failed: ${response.status} - ${errorText}`);
          }
        } catch (attemptError) {
          console.warn(`❌ Attempt failed with error:`, attemptError);
        }
      }

      throw new Error('All TapTools API attempts failed');

    } catch (error) {
      console.error('❌ TapTools API error:', error);

      // Return fallback data with actual wallet balance
      return {
        success: false,
        data: {
          stake_address: stakeAddress,
          values: [],
          total_value: 0,
          total_ada: 0,
          total_usd: 0,
          change_24h: 0,
          change_24h_percent: 0
        }
      };
    }
  }

  /**
   * Get current wallet value
   * @param stakeAddress - Cardano stake address (bech32 format)
   * @param quoteCurrency - Quote currency (ADA or USD)
   */
  async getCurrentWalletValue(
    stakeAddress: string, 
    quoteCurrency: string = 'USD'
  ): Promise<{ value: number; ada_value: number; usd_value: number }> {
    try {
      const trendData = await this.getWalletValueTrend(stakeAddress, '1d', quoteCurrency);
      
      if (trendData.success && trendData.data.values.length > 0) {
        const latestValue = trendData.data.values[trendData.data.values.length - 1];
        return {
          value: latestValue.value,
          ada_value: latestValue.ada_value,
          usd_value: latestValue.usd_value
        };
      }
      
      return { value: 0, ada_value: 0, usd_value: 0 };
    } catch (error) {
      console.error('❌ Error getting current wallet value:', error);
      return { value: 0, ada_value: 0, usd_value: 0 };
    }
  }

  /**
   * Convert TapTools data to dashboard format
   */
  convertToPortfolioPerformance(tapToolsData: TapToolsWalletTrend): any[] {
    if (!tapToolsData.values || tapToolsData.values.length === 0) {
      return [];
    }

    return tapToolsData.values.map((point, index) => ({
      date: new Date(point.time * 1000).toISOString().split('T')[0],
      portfolioValue: point.usd_value,
      adaValue: point.ada_value,
      dailyReturn: index > 0 ?
        ((point.usd_value - tapToolsData.values[index - 1].usd_value) / tapToolsData.values[index - 1].usd_value) * 100 : 0,
      cumulativeReturn: tapToolsData.values.length > 0 ?
        ((point.usd_value - tapToolsData.values[0].usd_value) / tapToolsData.values[0].usd_value) * 100 : 0
    }));
  }

  /**
   * Generate fallback portfolio performance data based on wallet balance
   */
  generateFallbackPerformanceData(walletBalance: number, days: number = 30): any[] {
    const data = [];
    const baseValue = walletBalance * 0.45; // Approximate USD value (ADA ~$0.45)

    console.log(`📊 Generating ${days} days of fallback data with base value $${baseValue.toFixed(2)}`);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Generate some realistic variation with a slight upward trend
      const trendFactor = (days - i) / days * 0.05; // 5% upward trend over the period
      const randomVariation = (Math.random() - 0.5) * 0.08; // ±4% daily variation
      const dailyValue = baseValue * (1 + trendFactor + randomVariation);

      // Calculate daily return (compared to previous day)
      const previousValue = i === days - 1 ? baseValue : data[data.length - 1]?.portfolioValue || baseValue;
      const dailyReturn = ((dailyValue - previousValue) / previousValue) * 100;

      data.push({
        date: date.toISOString().split('T')[0],
        portfolioValue: Math.max(dailyValue, 0), // Ensure no negative values
        adaValue: walletBalance,
        dailyReturn: dailyReturn,
        cumulativeReturn: ((dailyValue - baseValue) / baseValue) * 100
      });
    }

    console.log(`📊 Generated fallback data: ${data.length} points, range $${data[0]?.portfolioValue.toFixed(2)} to $${data[data.length-1]?.portfolioValue.toFixed(2)}`);
    return data;
  }
}

// Export singleton instance
export const tapToolsAPI = new TapToolsAPI();
