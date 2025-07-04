/**
 * User-Specific localStorage Utilities
 * Prevents cross-user data contamination by using user-specific keys
 */

export interface UserStorageManager {
  setItem: (key: string, value: string) => void;
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  clear: () => void;
  getAllKeys: () => string[];
  migrateGlobalData: (globalKey: string, userKey: string) => void;
}

/**
 * Create user-specific localStorage manager
 */
export function createUserStorage(userId: string | null): UserStorageManager {
  const getUserKey = (key: string): string => {
    if (!userId) {
      console.warn('⚠️ No user ID provided for localStorage operation');
      return key; // Fallback to global key (not ideal)
    }
    return `${key}_${userId}`;
  };

  return {
    /**
     * Set user-specific localStorage item
     */
    setItem: (key: string, value: string): void => {
      const userKey = getUserKey(key);
      try {
        localStorage.setItem(userKey, value);
      } catch (error) {
        console.error('❌ Failed to set localStorage item:', error);
      }
    },

    /**
     * Get user-specific localStorage item
     */
    getItem: (key: string): string | null => {
      const userKey = getUserKey(key);
      try {
        return localStorage.getItem(userKey);
      } catch (error) {
        console.error('❌ Failed to get localStorage item:', error);
        return null;
      }
    },

    /**
     * Remove user-specific localStorage item
     */
    removeItem: (key: string): void => {
      const userKey = getUserKey(key);
      try {
        localStorage.removeItem(userKey);
      } catch (error) {
        console.error('❌ Failed to remove localStorage item:', error);
      }
    },

    /**
     * Clear all user-specific localStorage items
     */
    clear: (): void => {
      if (!userId) {
        console.warn('⚠️ Cannot clear user storage without user ID');
        return;
      }

      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.endsWith(`_${userId}`)) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 Cleared ${keysToRemove.length} user-specific localStorage items`);
      } catch (error) {
        console.error('❌ Failed to clear user localStorage:', error);
      }
    },

    /**
     * Get all user-specific localStorage keys
     */
    getAllKeys: (): string[] => {
      if (!userId) {
        return [];
      }

      try {
        const userKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.endsWith(`_${userId}`)) {
            // Remove the user suffix to get the original key
            const originalKey = key.substring(0, key.length - userId.length - 1);
            userKeys.push(originalKey);
          }
        }
        return userKeys;
      } catch (error) {
        console.error('❌ Failed to get user localStorage keys:', error);
        return [];
      }
    },

    /**
     * Migrate data from global key to user-specific key
     * Useful for upgrading existing localStorage data
     */
    migrateGlobalData: (globalKey: string, userKey: string): void => {
      if (!userId) {
        console.warn('⚠️ Cannot migrate data without user ID');
        return;
      }

      try {
        const globalData = localStorage.getItem(globalKey);
        if (globalData) {
          const userSpecificKey = getUserKey(userKey);
          
          // Only migrate if user-specific data doesn't already exist
          if (!localStorage.getItem(userSpecificKey)) {
            localStorage.setItem(userSpecificKey, globalData);
            console.log(`📦 Migrated data from '${globalKey}' to '${userSpecificKey}'`);
          }
          
          // Optionally remove global data after migration
          // localStorage.removeItem(globalKey);
        }
      } catch (error) {
        console.error('❌ Failed to migrate localStorage data:', error);
      }
    }
  };
}

/**
 * User-Specific localStorage keys for all MISTER components
 * NOTE: These keys will be automatically prefixed with user ID
 */
export const USER_STORAGE_KEYS = {
  // Managed Wallet Keys
  ARCHIVE_STATUS: 'wallet-archive-status',
  SELECTED_WALLET: 'selectedManagedWallet',
  WALLET_GROUPS: 'wallet-groups',
  BULK_SELECTION: 'bulk-wallet-selection',
  VIEW_PREFERENCES: 'managed-wallet-view-preferences',

  // Dashboard Keys
  DASHBOARD_PREFERENCES: 'dashboard-preferences',
  CHART_SETTINGS: 'chart-settings',
  WIDGET_LAYOUT: 'widget-layout',

  // Trading Keys
  TRADING_PREFERENCES: 'trading-preferences',
  POSITION_FILTERS: 'position-filters',
  CHART_TIMEFRAME: 'chart-timeframe',
  TRADING_LAYOUT: 'trading-layout',

  // Onboarding Keys
  ONBOARDING_PROGRESS: 'onboarding-progress',
  WALLET_CREATION_STATE: 'wallet-creation-state',
  BACKUP_CONFIRMED: 'backup-confirmed',

  // Authentication Keys (user-specific)
  USER_PREFERENCES: 'user-preferences',
  THEME_SETTINGS: 'theme-settings',
  NOTIFICATION_SETTINGS: 'notification-settings',

  // Algorithm/Agent Keys
  ALGORITHM_PREFERENCES: 'algorithm-preferences',
  AGENT_SETTINGS: 'agent-settings',
  STRATEGY_CONFIGS: 'strategy-configs',
} as const;

/**
 * @deprecated Use USER_STORAGE_KEYS instead
 * Kept for backward compatibility during migration
 */
export const MANAGED_WALLET_STORAGE_KEYS = {
  ARCHIVE_STATUS: USER_STORAGE_KEYS.ARCHIVE_STATUS,
  SELECTED_WALLET: USER_STORAGE_KEYS.SELECTED_WALLET,
  WALLET_GROUPS: USER_STORAGE_KEYS.WALLET_GROUPS,
  BULK_SELECTION: USER_STORAGE_KEYS.BULK_SELECTION,
  VIEW_PREFERENCES: USER_STORAGE_KEYS.VIEW_PREFERENCES,
} as const;

/**
 * Helper function to get user storage with error handling
 */
export function getUserStorage(userId: string | null): UserStorageManager {
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return {
      setItem: () => {},
      getItem: () => null,
      removeItem: () => {},
      clear: () => {},
      getAllKeys: () => [],
      migrateGlobalData: () => {},
    };
  }

  return createUserStorage(userId);
}

/**
 * Migration utility for existing localStorage data
 * Migrates all user-specific data from global keys to user-specific keys
 */
export function migrateExistingUserData(userId: string): void {
  if (!userId || typeof window === 'undefined') {
    return;
  }

  const userStorage = createUserStorage(userId);

  // Migrate all user-specific storage keys
  Object.values(USER_STORAGE_KEYS).forEach(key => {
    userStorage.migrateGlobalData(key, key);
  });

  // Migrate legacy global keys that might exist
  const legacyKeys = [
    'auth_token',
    'user_data',
    'refresh_token',
    'connectedWallet',
    'dashboard-layout',
    'trading-settings',
    'algorithm-status',
  ];

  legacyKeys.forEach(key => {
    userStorage.migrateGlobalData(key, key);
  });

  console.log('📦 Completed comprehensive user data migration for user:', userId.substring(0, 12) + '...');
}

/**
 * @deprecated Use migrateExistingUserData instead
 * Kept for backward compatibility
 */
export function migrateExistingManagedWalletData(userId: string): void {
  migrateExistingUserData(userId);
}
