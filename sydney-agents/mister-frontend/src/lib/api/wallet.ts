import { apiClient } from './client';
import { ApiResponse, CreateWalletResult, WalletInfo, CreateWalletRequest } from '@/types/api';

/**
 * Wallet API Service
 * Integrates with WalletManager backend service
 */
export class WalletAPI {
  /**
   * Create a new managed wallet
   * Calls WalletManager.createNewWallet()
   */
  async createWallet(request: CreateWalletRequest = {}): Promise<ApiResponse<CreateWalletResult>> {
    console.log('🏦 Creating new managed wallet...');
    
    return apiClient.post<CreateWalletResult>('/api/wallet/create', request);
  }

  /**
   * Get wallet information by address
   * Calls WalletManager.getWalletInfo()
   */
  async getWalletInfo(address: string): Promise<ApiResponse<WalletInfo>> {
    console.log(`🏦 Fetching wallet info for ${address.substring(0, 20)}...`);
    
    return apiClient.get<WalletInfo>(`/api/wallet/${address}`);
  }

  /**
   * Get all active managed wallets
   * Calls WalletManager.getActiveWallets()
   */
  async getActiveWallets(): Promise<ApiResponse<{ wallets: string[]; count: number }>> {
    console.log('🏦 Fetching active managed wallets...');
    
    return apiClient.get<{ wallets: string[]; count: number }>('/api/wallet/active');
  }

  /**
   * Deactivate a managed wallet
   * Calls WalletManager.deactivateWallet()
   */
  async deactivateWallet(address: string): Promise<ApiResponse<{ message: string }>> {
    console.log(`🏦 Deactivating wallet ${address.substring(0, 20)}...`);
    
    return apiClient.post<{ message: string }>(`/api/wallet/${address}/deactivate`);
  }

  /**
   * Get wallet balance and UTXOs
   * This would integrate with Cardano blockchain APIs
   */
  async getWalletBalance(address: string): Promise<ApiResponse<{ balance: number; utxos: Record<string, unknown>[] }>> {
    console.log(`🏦 Fetching wallet balance for ${address.substring(0, 20)}...`);

    return apiClient.get<{ balance: number; utxos: Record<string, unknown>[] }>(`/api/wallet/${address}/balance`);
  }

  /**
   * Get wallet transaction history
   */
  async getWalletHistory(address: string): Promise<ApiResponse<{ transactions: Record<string, unknown>[] }>> {
    console.log(`🏦 Fetching wallet history for ${address.substring(0, 20)}...`);

    return apiClient.get<{ transactions: Record<string, unknown>[] }>(`/api/wallet/${address}/history`);
  }

  /**
   * Validate wallet address format
   */
  validateAddress(address: string): boolean {
    // Basic Cardano address validation
    return address.startsWith('addr1') && address.length >= 50;
  }

  /**
   * Format wallet address for display
   */
  formatAddress(address: string, length: number = 20): string {
    if (address.length <= length) return address;
    return `${address.substring(0, length)}...`;
  }
}

// Export singleton instance
export const walletAPI = new WalletAPI();
export default walletAPI;
