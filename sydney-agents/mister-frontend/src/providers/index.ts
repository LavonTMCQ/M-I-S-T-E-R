/**
 * Providers Module - Main Entry Point
 * 
 * Centralized exports for the entire provider system including interfaces,
 * implementations, and the provider manager.
 */

// Core Provider Manager
export { ProviderManager } from './ProviderManager';

// Provider Implementations
export { StrikeProvider } from './implementations/StrikeProvider';
export { MockProvider } from './implementations/MockProvider';

// Interfaces and Types - Re-export everything from interfaces
export * from './interfaces';

// Convenience function to get the provider manager instance
export const getProviderManager = () => ProviderManager.getInstance();

// Provider system initialization
export const initializeProviderSystem = () => {
  console.log('🚀 [Providers] Initializing provider system...');
  const manager = ProviderManager.getInstance();
  console.log('✅ [Providers] Provider system initialized');
  return manager;
};

// Clean shutdown
export const shutdownProviderSystem = () => {
  console.log('🛑 [Providers] Shutting down provider system...');
  const manager = ProviderManager.getInstance();
  manager.destroy();
  console.log('✅ [Providers] Provider system shut down');
};