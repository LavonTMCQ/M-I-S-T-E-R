import { ApiResponse, ApiError } from '@/types/api';

/**
 * Authenticated API Client for MISTER Backend Services
 * Handles all communication with WalletManager, SignalService, ExecutionService, and StrikeFinanceAPI
 */
export class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'https://substantial-scarce-magazin.mastra.cloud') {
    this.baseUrl = baseUrl;
    this.loadAuthToken();
  }

  /**
   * Load authentication token from localStorage
   */
  private loadAuthToken(): void {
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('mister_auth_token');
    }
  }

  /**
   * Save authentication token to localStorage
   */
  private saveAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mister_auth_token', token);
      this.authToken = token;
    }
  }

  /**
   * Remove authentication token
   */
  private clearAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mister_auth_token');
      this.authToken = null;
    }
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          code: `HTTP_${response.status}`,
          message: data.error || data.message || `HTTP ${response.status}`,
          details: data,
          timestamp: new Date(),
        };

        // Handle authentication errors
        if (response.status === 401) {
          this.clearAuthToken();
          // Optionally redirect to login
        }

        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          error: error,
          responseData: data
        });
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('✅ API Success:', endpoint);
      console.log('🔍 API Response data:', data);

      // Handle different response structures
      let responseData = data;
      if (data.success && data.data) {
        // Bridge server format: { success: true, data: {...} }
        responseData = data.data;
      } else if (data.data) {
        // Other format: { data: {...} }
        responseData = data.data;
      }

      return {
        success: true,
        data: responseData,
      };

    } catch (error) {
      // Handle connection refused errors more gracefully
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.warn('⚠️ Backend API unavailable, using fallback mode');
        return {
          success: false,
          error: 'Backend API unavailable',
        };
      }

      console.error('❌ Network Error:', {
        url: url,
        method: config.method || 'GET',
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.saveAuthToken(token);
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearAuthToken();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: Date }>> {
    return this.get('/health');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
