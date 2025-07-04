import { apiClient } from '@/lib/api/client';
import { ApiResponse, AuthToken, User } from '@/types/api';

/**
 * Authentication Service
 * Handles user authentication and session management
 */
export class AuthService {
  private currentUser: User | null = null;

  /**
   * Initialize authentication service
   */
  async initialize(): Promise<void> {
    const token = apiClient.getAuthToken();
    if (token) {
      try {
        const validation = await this.validateToken();
        if (!validation.success && validation.error === 'Backend API unavailable') {
          console.log('🔄 Backend unavailable, keeping existing auth state');
          return;
        }
        if (!validation.success) {
          console.warn('Token validation failed, clearing auth state');
          this.logout();
        }
      } catch {
        console.warn('Token validation failed, clearing auth state');
        this.logout();
      }
    }
  }

  /**
   * Authenticate user with wallet connection
   * Sends complete wallet info including stake address for TapTools API
   */
  async authenticateWithWallet(walletAddress: string, walletInfo?: {
    stakeAddress?: string;
    walletType?: string;
    balance?: number;
    handle?: string;
  }): Promise<ApiResponse<AuthToken>> {
    console.log('🔐 Authenticating with wallet...');

    const response = await apiClient.post<AuthToken>('/api/auth/wallet', {
      walletAddress,
      stakeAddress: walletInfo?.stakeAddress,
      walletType: walletInfo?.walletType,
      balance: walletInfo?.balance,
      handle: walletInfo?.handle,
    });

    if (response.success && response.data) {
      apiClient.setAuthToken(response.data.token);
      console.log('✅ Wallet authentication token set successfully');

      // ⚠️ CRITICAL TODO: Database storage temporarily disabled - using memory storage for now
      //
      // ISSUE: Supabase RLS (Row Level Security) policies are blocking inserts to user_preferences table
      // ERROR: "new row violates row-level security policy for table 'user_preferences'"
      //
      // SOLUTION NEEDED:
      // 1. Fix RLS policies in Supabase to allow authenticated users to insert their own data
      // 2. Ensure setUserContext() function properly sets user context for RLS
      // 3. Test database storage with proper authentication
      //
      // PRIORITY: HIGH - Required for production deployment
      //
      // TODO: Re-enable database storage once RLS policies are properly configured
      console.log('📝 Using memory storage for authentication (database storage disabled)');

      // Store authentication in database for production use (DISABLED)
      // try {
      //   const { SupabaseUserStorage } = await import('../supabase/client');
      //   const userId = walletInfo?.handle || walletAddress;
      //   const userStorage = new SupabaseUserStorage(userId);
      //
      //   // Store authentication info in database
      //   await userStorage.setItem('auth_token', response.data.token);
      //   await userStorage.setItem('wallet_info', JSON.stringify(walletInfo));
      //
      //   console.log('✅ Wallet authentication stored in database');
      // } catch (dbError) {
      //   console.warn('⚠️ Failed to store auth in database, continuing with memory storage:', dbError);
      // }

      // Try to get current user, but don't fail the authentication if this fails
      try {
        await this.getCurrentUser();
        console.log('✅ Current user fetched after wallet authentication');
      } catch (userError) {
        console.warn('⚠️ Failed to fetch current user after wallet auth, but authentication succeeded:', userError);
        // Don't fail the authentication - the token is valid
      }
    }

    return response;
  }

  /**
   * Authenticate user with user ID (temporary solution)
   */
  async authenticateWithUserId(userId: string): Promise<ApiResponse<AuthToken>> {
    console.log('🔐 Authenticating with user ID...');
    
    const response = await apiClient.post<AuthToken>('/api/auth/user', {
      userId,
    });

    if (response.success && response.data) {
      apiClient.setAuthToken(response.data.token);
      await this.getCurrentUser();
    }

    return response;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    if (!apiClient.isAuthenticated()) {
      console.log('🔐 No auth token available, skipping getCurrentUser API call');
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    console.log('🔐 Fetching current user from API...');
    const response = await apiClient.get<User>('/api/auth/me');

    if (response.success && response.data) {
      this.currentUser = response.data;
      console.log('✅ Current user fetched successfully');
    } else {
      console.log('⚠️ Failed to fetch current user:', response.error);
    }

    return response;
  }

  /**
   * Validate current token
   */
  async validateToken(): Promise<ApiResponse<{ valid: boolean }>> {
    return apiClient.get<{ valid: boolean }>('/api/auth/validate');
  }

  /**
   * Logout user and clear all data
   */
  async logout(): Promise<void> {
    console.log('🔐 Logging out...');

    try {
      // Call backend logout endpoint to clear user data
      if (apiClient.isAuthenticated()) {
        await apiClient.post('/api/auth/logout', {});
      }
    } catch (error) {
      console.warn('Backend logout failed:', error);
    } finally {
      // Always clear local data regardless of backend response
      apiClient.logout();
      this.currentUser = null;

      // Clear any cached data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        sessionStorage.clear();
      }
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  }

  /**
   * Get current user (cached)
   */
  getUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get user ID
   */
  getUserId(): string | null {
    return this.currentUser?.id || null;
  }

  /**
   * Generate temporary user ID for demo purposes
   */
  generateTempUserId(): string {
    return `temp_user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Auto-authenticate for demo purposes - DISABLED FOR PRODUCTION
   * This creates a temporary user session without requiring wallet connection
   */
  async autoAuthenticate(): Promise<ApiResponse<AuthToken>> {
    console.log('🚫 Auto-authentication disabled - users must connect wallet or use email auth');

    return {
      success: false,
      error: 'Auto-authentication disabled - please connect wallet or use email authentication',
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
