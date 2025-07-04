import { createTool } from '@mastra/core';
import { z } from 'zod';
import { WalletManager } from '../services/wallet-manager';
import { SignalService } from '../services/signal-service';
import { ExecutionService } from '../services/execution-service';
import { UnifiedExecutionService } from '../services/unified-execution-service';
import { StrikeFinanceAPI } from '../services/strike-finance-api';

// Initialize services
const walletManager = WalletManager.getInstance();
const signalService = SignalService.getInstance();
const executionService = ExecutionService.getInstance();
const strikeAPI = new StrikeFinanceAPI();

/**
 * Tool for creating a new managed wallet
 */
export const createManagedWallet = createTool({
  id: 'create_managed_wallet',
  description: 'Creates a new managed Cardano wallet for copy trading on Strike Finance',
  inputSchema: z.object({
    userId: z.string().optional().describe('Optional user ID for the wallet')
  }),
  execute: async ({ context }) => {
    const { userId } = context;
    try {
      console.log('🆕 Creating new managed wallet...');

      const result = await walletManager.createNewWallet(userId);

      return {
        success: true,
        data: {
          address: result.bech32Address,
          userId: result.userId,
          mnemonic: result.mnemonic,
          message: 'Managed wallet created successfully. Please backup your mnemonic phrase securely!'
        }
      };
    } catch (error) {
      console.error('❌ Failed to create managed wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for getting wallet information
 */
export const getWalletInfo = createTool({
  id: 'get_wallet_info',
  description: 'Gets information about a managed wallet including balance and positions',
  inputSchema: z.object({
    address: z.string().describe('The bech32 address of the wallet')
  }),
  execute: async ({ context }) => {
    const { address } = context;
    try {
      if (!address) {
        return {
          success: false,
          error: 'Wallet address is required'
        };
      }

      console.log(`📊 Getting wallet info for: ${address.substring(0, 20)}...`);

      const walletInfo = walletManager.getWalletInfo(address);
      if (!walletInfo) {
        return {
          success: false,
          error: 'Wallet not found'
        };
      }

      // Get positions from Strike Finance
      const positions = await strikeAPI.getPositions(address);

      return {
        success: true,
        data: {
          address: walletInfo.bech32Address,
          userId: walletInfo.userId,
          createdAt: walletInfo.createdAt,
          isActive: walletInfo.isActive,
          positions: positions,
          positionCount: positions.length
        }
      };
    } catch (error) {
      console.error('❌ Failed to get wallet info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for getting all active managed wallets
 */
export const getActiveManagedWallets = createTool({
  id: 'get_active_managed_wallets',
  description: 'Gets a list of all active managed wallets',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      console.log('📋 Getting all active managed wallets...');

      const activeWallets = walletManager.getActiveWallets();
      const stats = walletManager.getWalletStats();

      return {
        success: true,
        data: {
          activeWallets,
          stats,
          count: activeWallets.length
        }
      };
    } catch (error) {
      console.error('❌ Failed to get active wallets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for starting the copy trading service
 */
export const startCopyTrading = createTool({
  id: 'start_copy_trading',
  description: 'Starts the copy trading service (signal generation and execution)',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      console.log('🚀 Starting copy trading service...');

      // Start signal service
      signalService.start();

      // Start execution service
      executionService.start();

      return {
        success: true,
        data: {
          message: 'Copy trading service started successfully',
          signalServiceStatus: signalService.getStatus(),
          executionServiceStatus: executionService.getStatus()
        }
      };
    } catch (error) {
      console.error('❌ Failed to start copy trading service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for stopping the copy trading service
 */
export const stopCopyTrading = createTool({
  id: 'stop_copy_trading',
  description: 'Stops the copy trading service',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      console.log('🛑 Stopping copy trading service...');

      // Stop services
      signalService.stop();
      executionService.stop();

      return {
        success: true,
        data: {
          message: 'Copy trading service stopped successfully'
        }
      };
    } catch (error) {
      console.error('❌ Failed to stop copy trading service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for getting copy trading service status
 */
export const getCopyTradingStatus = createTool({
  id: 'get_copy_trading_status',
  description: 'Gets the current status of the copy trading service',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      console.log('📊 Getting copy trading service status...');

      const signalStatus = signalService.getStatus();
      const executionStatus = executionService.getStatus();
      const walletStats = walletManager.getWalletStats();

      return {
        success: true,
        data: {
          signalService: signalStatus,
          executionService: executionStatus,
          walletStats,
          isRunning: signalStatus.isRunning && executionStatus.isRunning
        }
      };
    } catch (error) {
      console.error('❌ Failed to get service status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for forcing a manual signal check
 */
export const forceSignalCheck = createTool({
  id: 'force_signal_check',
  description: 'Forces a manual trading signal check using the TITAN2K strategy',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      console.log('🔧 Forcing manual signal check...');

      const decision = await signalService.forceSignalCheck();

      return {
        success: true,
        data: {
          decision,
          message: `Signal check completed: ${decision.action} - ${decision.reason}`
        }
      };
    } catch (error) {
      console.error('❌ Failed to force signal check:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for getting Strike Finance market information
 */
export const getMarketInfo = createTool({
  id: 'get_market_info',
  description: 'Gets current Strike Finance market information including long/short interest',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      console.log('📊 Getting Strike Finance market info...');

      const marketInfo = await strikeAPI.getOverallInfo();
      const poolInfo = await strikeAPI.getPoolInfoV2();

      return {
        success: true,
        data: {
          market: marketInfo.data,
          pool: poolInfo.data,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('❌ Failed to get market info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for getting wallet positions
 */
export const getWalletPositions = createTool({
  id: 'get_wallet_positions',
  description: 'Gets all active positions for a specific wallet address',
  inputSchema: z.object({
    address: z.string().describe('The bech32 address of the wallet')
  }),
  execute: async ({ context }) => {
    const { address } = context;
    try {
      if (!address) {
        return {
          success: false,
          error: 'Wallet address is required'
        };
      }

      console.log(`📈 Getting positions for wallet: ${address.substring(0, 20)}...`);

      const positions = await strikeAPI.getPositions(address);

      return {
        success: true,
        data: {
          address,
          positions,
          positionCount: positions.length,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('❌ Failed to get wallet positions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for getting wallet transaction history
 */
export const getWalletHistory = createTool({
  id: 'get_wallet_history',
  description: 'Gets transaction history for a specific wallet address',
  inputSchema: z.object({
    address: z.string().describe('The bech32 address of the wallet')
  }),
  execute: async ({ context }) => {
    const { address } = context;
    try {
      console.log(`📜 Getting transaction history for wallet: ${address.substring(0, 20)}...`);

      const history = await strikeAPI.getPerpetualHistory(address);

      return {
        success: true,
        data: {
          address,
          transactions: history.transactions,
          transactionCount: history.transactions.length,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('❌ Failed to get wallet history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for deactivating a managed wallet
 */
export const deactivateManagedWallet = createTool({
  id: 'deactivate_managed_wallet',
  description: 'Deactivates a managed wallet (stops it from receiving copy trades)',
  inputSchema: z.object({
    address: z.string().describe('The bech32 address of the wallet to deactivate')
  }),
  execute: async ({ context }) => {
    const { address } = context;
    try {
      console.log(`🔒 Deactivating managed wallet: ${address.substring(0, 20)}...`);

      const success = await walletManager.deactivateWallet(address);

      if (success) {
        return {
          success: true,
          data: {
            address,
            message: 'Wallet deactivated successfully'
          }
        };
      } else {
        return {
          success: false,
          error: 'Failed to deactivate wallet - wallet not found'
        };
      }
    } catch (error) {
      console.error('❌ Failed to deactivate wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for checking Strike Finance API health
 */
export const checkStrikeAPIHealth = createTool({
  id: 'check_strike_api_health',
  description: 'Checks if the Strike Finance API is healthy and responding',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      console.log('🏥 Checking Strike Finance API health...');

      const isHealthy = await strikeAPI.healthCheck();

      return {
        success: true,
        data: {
          isHealthy,
          status: isHealthy ? 'API is healthy' : 'API is not responding',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('❌ Failed to check API health:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for executing manual trades through the unified execution service
 */
export const executeManualTrade = createTool({
  id: 'execute_manual_trade',
  description: 'Executes a manual trade using the unified execution service (supports both managed and connected wallets)',
  inputSchema: z.object({
    walletAddress: z.string().describe('The wallet address to trade from'),
    walletType: z.enum(['managed', 'connected']).describe('Type of wallet (managed or connected)'),
    action: z.enum(['Open', 'Close', 'Update']).describe('Trading action to perform'),
    side: z.enum(['Long', 'Short']).optional().describe('Position side (required for Open action)'),
    pair: z.string().describe('Trading pair (e.g., ADA/USD)'),
    leverage: z.number().optional().describe('Leverage multiplier (default: 5)'),
    collateralAmount: z.number().optional().describe('Collateral amount in lovelace'),
    positionSize: z.number().optional().describe('Position size in lovelace'),
    stopLoss: z.number().optional().describe('Stop loss price'),
    takeProfit: z.number().optional().describe('Take profit price'),
    positionId: z.string().optional().describe('Position ID (required for Close/Update actions)')
  }),
  execute: async ({ context }) => {
    try {
      // Validate required parameters
      if (!context.walletAddress) {
        return {
          success: false,
          error: 'Wallet address is required for trade execution'
        };
      }

      console.log(`🎯 Executing manual trade:`, {
        wallet: context.walletAddress.substring(0, 20) + '...',
        type: context.walletType,
        action: context.action,
        side: context.side,
        pair: context.pair
      });

      const unifiedExecution = UnifiedExecutionService.getInstance();

      const result = await unifiedExecution.executeManualTrade({
        walletAddress: context.walletAddress,
        walletType: context.walletType,
        action: context.action,
        side: context.side,
        pair: context.pair,
        leverage: context.leverage,
        collateralAmount: context.collateralAmount,
        positionSize: context.positionSize,
        stopLoss: context.stopLoss,
        takeProfit: context.takeProfit,
        positionId: context.positionId
      });

      // Check if this is a connected wallet that needs frontend signing
      if (result.success && typeof result.txHash === 'string' && result.txHash.startsWith('FRONTEND_SIGNING_REQUIRED:')) {
        const cbor = result.txHash.replace('FRONTEND_SIGNING_REQUIRED:', '');

        return {
          success: true,
          data: {
            requiresFrontendSigning: true,
            cbor: cbor,
            tradeDetails: {
              action: context.action,
              side: context.side,
              pair: context.pair,
              collateralAmount: context.collateralAmount,
              leverage: context.leverage,
              walletType: context.walletType
            },
            message: `Trade prepared successfully. Transaction ready for wallet signing.`,
            timestamp: new Date()
          }
        };
      }

      return {
        success: result.success,
        data: {
          executionResult: result,
          message: result.success
            ? `Successfully executed ${context.action} trade for ${context.walletType} wallet`
            : `Failed to execute ${context.action} trade: ${result.error}`,
          timestamp: new Date()
        },
        error: result.success ? undefined : result.error
      };
    } catch (error) {
      console.error('❌ Manual trade execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for registering a connected wallet for trading
 */
export const registerConnectedWallet = createTool({
  id: 'register_connected_wallet',
  description: 'Registers a connected wallet with the unified execution service for direct trading',
  inputSchema: z.object({
    address: z.string().describe('Wallet address'),
    stakeAddress: z.string().optional().describe('Stake address'),
    walletType: z.string().describe('Wallet type (e.g., vespr, nami, eternl)'),
    balance: z.number().optional().describe('Wallet balance in ADA'),
    handle: z.string().optional().describe('ADA handle if available')
  }),
  execute: async ({ context }) => {
    try {
      // Validate required parameters
      if (!context.address) {
        return {
          success: false,
          error: 'Wallet address is required for registration'
        };
      }

      console.log(`🔗 Registering connected wallet:`, {
        address: context.address.substring(0, 20) + '...',
        type: context.walletType,
        balance: context.balance
      });

      const unifiedExecution = UnifiedExecutionService.getInstance();

      unifiedExecution.registerConnectedWallet({
        address: context.address,
        stakeAddress: context.stakeAddress,
        walletType: context.walletType,
        balance: context.balance || 0,
        handle: context.handle
      });

      return {
        success: true,
        data: {
          message: `Connected wallet registered successfully`,
          walletAddress: context.address,
          walletType: context.walletType,
          registeredAt: new Date()
        }
      };
    } catch (error) {
      console.error('❌ Failed to register connected wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Tool for getting all available wallets for trading
 */
export const getAvailableWallets = createTool({
  id: 'get_available_wallets',
  description: 'Gets all available wallets for trading (both managed and connected)',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      console.log('🏦 Getting all available wallets...');

      const unifiedExecution = UnifiedExecutionService.getInstance();
      const availableWallets = unifiedExecution.getAllAvailableWallets();

      return {
        success: true,
        data: {
          wallets: availableWallets,
          totalCount: availableWallets.length,
          managedCount: availableWallets.filter(w => w.type === 'managed').length,
          connectedCount: availableWallets.filter(w => w.type === 'connected').length,
          hasWallets: unifiedExecution.hasAvailableWallets(),
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('❌ Failed to get available wallets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

// Export all tools as an object for Mastra agent registration
export const strikeFinanceTools = {
  createManagedWallet,
  getWalletInfo,
  getActiveManagedWallets,
  startCopyTrading,
  stopCopyTrading,
  getCopyTradingStatus,
  forceSignalCheck,
  getMarketInfo,
  getWalletPositions,
  getWalletHistory,
  deactivateManagedWallet,
  checkStrikeAPIHealth,
  // New unified execution tools
  executeManualTrade,
  registerConnectedWallet,
  getAvailableWallets
};