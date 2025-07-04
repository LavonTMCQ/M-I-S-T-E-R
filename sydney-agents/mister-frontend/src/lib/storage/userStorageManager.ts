/**
 * Unified User Storage Manager
 * Handles both localStorage and Supabase database operations with automatic sync
 */

import { SupabaseUserStorage, DatabaseMigrationUtils, AuditLogger } from '../supabase/client';
import { UserPreferences } from '../supabase/types';

export type StorageMode = 'localStorage' | 'database' | 'hybrid';

export interface StorageConfig {
  mode: StorageMode;
  userId: string;
  autoSync: boolean;
  syncInterval?: number; // milliseconds
  fallbackToLocalStorage: boolean;
}

export class UserStorageManager {
  private config: StorageConfig;
  private supabaseStorage: SupabaseUserStorage | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;

  constructor(config: StorageConfig) {
    this.config = config;
    
    if (config.mode === 'database' || config.mode === 'hybrid') {
      this.supabaseStorage = new SupabaseUserStorage(config.userId);
    }

    // Monitor online status
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.handleOnlineStatusChange();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.handleOnlineStatusChange();
      });
    }

    // Start auto-sync if enabled
    if (config.autoSync && config.syncInterval) {
      this.startAutoSync();
    }
  }

  /**
   * Get item with automatic fallback logic
   */
  async getItem<K extends keyof UserPreferences>(key: K): Promise<UserPreferences[K] | null> {
    try {
      switch (this.config.mode) {
        case 'localStorage':
          return this.getFromLocalStorage(key);

        case 'database':
          if (!this.isOnline && this.config.fallbackToLocalStorage) {
            console.warn(`🔄 [STORAGE] Offline, falling back to localStorage for ${key}`);
            return this.getFromLocalStorage(key);
          }
          return await this.getFromDatabase(key);

        case 'hybrid':
          // Try database first, fallback to localStorage
          try {
            if (this.isOnline) {
              const dbValue = await this.getFromDatabase(key);
              if (dbValue !== null) {
                return dbValue;
              }
            }
            return this.getFromLocalStorage(key);
          } catch (error) {
            console.warn(`🔄 [STORAGE] Database error, falling back to localStorage for ${key}:`, error);
            return this.getFromLocalStorage(key);
          }

        default:
          throw new Error(`Invalid storage mode: ${this.config.mode}`);
      }
    } catch (error) {
      console.error(`❌ [STORAGE] Failed to get ${key}:`, error);
      return null;
    }
  }

  /**
   * Set item with automatic sync logic
   */
  async setItem<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): Promise<void> {
    try {
      switch (this.config.mode) {
        case 'localStorage':
          this.setToLocalStorage(key, value);
          break;

        case 'database':
          if (!this.isOnline && this.config.fallbackToLocalStorage) {
            console.warn(`🔄 [STORAGE] Offline, saving to localStorage for ${key}`);
            this.setToLocalStorage(key, value);
            // Mark for sync when online
            this.markForSync(key);
          } else {
            await this.setToDatabase(key, value);
          }
          break;

        case 'hybrid':
          // Save to both localStorage and database
          this.setToLocalStorage(key, value);
          if (this.isOnline) {
            try {
              await this.setToDatabase(key, value);
            } catch (error) {
              console.warn(`🔄 [STORAGE] Database save failed for ${key}, will retry on sync:`, error);
              this.markForSync(key);
            }
          } else {
            this.markForSync(key);
          }
          break;

        default:
          throw new Error(`Invalid storage mode: ${this.config.mode}`);
      }

      // Log the action for audit
      await AuditLogger.logAction(this.config.userId, 'preference_updated', {
        key,
        value,
        mode: this.config.mode,
        online: this.isOnline
      });

    } catch (error) {
      console.error(`❌ [STORAGE] Failed to set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem<K extends keyof UserPreferences>(key: K): Promise<void> {
    try {
      switch (this.config.mode) {
        case 'localStorage':
          this.removeFromLocalStorage(key);
          break;

        case 'database':
          if (!this.isOnline && this.config.fallbackToLocalStorage) {
            this.removeFromLocalStorage(key);
            this.markForSync(key, 'delete');
          } else {
            await this.removeFromDatabase(key);
          }
          break;

        case 'hybrid':
          this.removeFromLocalStorage(key);
          if (this.isOnline) {
            try {
              await this.removeFromDatabase(key);
            } catch (error) {
              console.warn(`🔄 [STORAGE] Database remove failed for ${key}:`, error);
              this.markForSync(key, 'delete');
            }
          } else {
            this.markForSync(key, 'delete');
          }
          break;
      }

      await AuditLogger.logAction(this.config.userId, 'preference_removed', {
        key,
        mode: this.config.mode,
        online: this.isOnline
      });

    } catch (error) {
      console.error(`❌ [STORAGE] Failed to remove ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all preferences
   */
  async getAllPreferences(): Promise<Partial<UserPreferences>> {
    try {
      switch (this.config.mode) {
        case 'localStorage':
          return this.getAllFromLocalStorage();

        case 'database':
          if (!this.isOnline && this.config.fallbackToLocalStorage) {
            return this.getAllFromLocalStorage();
          }
          return await this.getAllFromDatabase();

        case 'hybrid':
          if (this.isOnline) {
            try {
              return await this.getAllFromDatabase();
            } catch (error) {
              console.warn('🔄 [STORAGE] Database error, falling back to localStorage:', error);
              return this.getAllFromLocalStorage();
            }
          }
          return this.getAllFromLocalStorage();

        default:
          throw new Error(`Invalid storage mode: ${this.config.mode}`);
      }
    } catch (error) {
      console.error('❌ [STORAGE] Failed to get all preferences:', error);
      return {};
    }
  }

  /**
   * Migrate from localStorage to database
   */
  async migrateToDatabase(): Promise<void> {
    if (!this.supabaseStorage) {
      throw new Error('Database storage not initialized');
    }

    console.log('🔄 [MIGRATION] Starting migration to database...');
    await DatabaseMigrationUtils.migrateUserFromLocalStorage(this.config.userId);
    
    const isValid = await DatabaseMigrationUtils.verifyMigration(this.config.userId);
    if (isValid) {
      console.log('✅ [MIGRATION] Migration completed successfully');
      // Update mode to database
      this.config.mode = 'database';
    } else {
      throw new Error('Migration verification failed');
    }
  }

  /**
   * Sync localStorage with database
   */
  async syncWithDatabase(): Promise<void> {
    if (!this.supabaseStorage || !this.isOnline) {
      return;
    }

    try {
      console.log('🔄 [SYNC] Starting sync with database...');
      
      // Get pending sync items
      const pendingSync = this.getPendingSyncItems();
      
      for (const item of pendingSync) {
        try {
          if (item.operation === 'delete') {
            await this.supabaseStorage.removeItem(item.key);
          } else {
            const localValue = this.getFromLocalStorage(item.key);
            if (localValue !== null) {
              await this.supabaseStorage.setItem(item.key, JSON.stringify(localValue));
            }
          }
          this.removePendingSyncItem(item.key);
        } catch (error) {
          console.error(`❌ [SYNC] Failed to sync ${item.key}:`, error);
        }
      }

      console.log('✅ [SYNC] Sync completed');
    } catch (error) {
      console.error('❌ [SYNC] Sync failed:', error);
    }
  }

  /**
   * Clear all user data
   */
  async clear(): Promise<void> {
    try {
      // Clear localStorage
      this.clearLocalStorage();

      // Clear database if available
      if (this.supabaseStorage && this.isOnline) {
        await this.supabaseStorage.clear();
      }

      // Clear pending sync items
      this.clearPendingSyncItems();

      await AuditLogger.logAction(this.config.userId, 'preferences_cleared', {
        mode: this.config.mode,
        online: this.isOnline
      });

    } catch (error) {
      console.error('❌ [STORAGE] Failed to clear storage:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineStatusChange);
      window.removeEventListener('offline', this.handleOnlineStatusChange);
    }
  }

  // Private helper methods
  private getFromLocalStorage<K extends keyof UserPreferences>(key: K): UserPreferences[K] | null {
    try {
      const storageKey = `${key}_${this.config.userId}`;
      const value = localStorage.getItem(storageKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`❌ [LOCALSTORAGE] Failed to get ${key}:`, error);
      return null;
    }
  }

  private setToLocalStorage<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void {
    try {
      const storageKey = `${key}_${this.config.userId}`;
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      console.error(`❌ [LOCALSTORAGE] Failed to set ${key}:`, error);
      throw error;
    }
  }

  private removeFromLocalStorage<K extends keyof UserPreferences>(key: K): void {
    try {
      const storageKey = `${key}_${this.config.userId}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error(`❌ [LOCALSTORAGE] Failed to remove ${key}:`, error);
    }
  }

  private getAllFromLocalStorage(): Partial<UserPreferences> {
    const preferences: Partial<UserPreferences> = {};
    const userSuffix = `_${this.config.userId}`;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(userSuffix)) {
          const preferenceKey = key.replace(userSuffix, '') as keyof UserPreferences;
          const value = localStorage.getItem(key);
          if (value) {
            try {
              preferences[preferenceKey] = JSON.parse(value);
            } catch (parseError) {
              console.warn(`⚠️ [LOCALSTORAGE] Invalid JSON for ${preferenceKey}:`, parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ [LOCALSTORAGE] Failed to get all preferences:', error);
    }

    return preferences;
  }

  private clearLocalStorage(): void {
    const userSuffix = `_${this.config.userId}`;
    const keysToRemove: string[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(userSuffix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('❌ [LOCALSTORAGE] Failed to clear localStorage:', error);
    }
  }

  private async getFromDatabase<K extends keyof UserPreferences>(key: K): Promise<UserPreferences[K] | null> {
    if (!this.supabaseStorage) {
      throw new Error('Database storage not initialized');
    }

    try {
      const value = await this.supabaseStorage.getItem(key as string);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`❌ [DATABASE] Failed to get ${key}:`, error);
      throw error;
    }
  }

  private async setToDatabase<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): Promise<void> {
    if (!this.supabaseStorage) {
      throw new Error('Database storage not initialized');
    }

    try {
      await this.supabaseStorage.setItem(key as string, JSON.stringify(value));
    } catch (error) {
      console.error(`❌ [DATABASE] Failed to set ${key}:`, error);
      throw error;
    }
  }

  private async removeFromDatabase<K extends keyof UserPreferences>(key: K): Promise<void> {
    if (!this.supabaseStorage) {
      throw new Error('Database storage not initialized');
    }

    try {
      await this.supabaseStorage.removeItem(key as string);
    } catch (error) {
      console.error(`❌ [DATABASE] Failed to remove ${key}:`, error);
      throw error;
    }
  }

  private async getAllFromDatabase(): Promise<Partial<UserPreferences>> {
    if (!this.supabaseStorage) {
      throw new Error('Database storage not initialized');
    }

    try {
      return await this.supabaseStorage.getAllPreferences();
    } catch (error) {
      console.error('❌ [DATABASE] Failed to get all preferences:', error);
      throw error;
    }
  }

  private markForSync(key: string, operation: 'set' | 'delete' = 'set'): void {
    try {
      const syncKey = `_pendingSync_${this.config.userId}`;
      const existing = localStorage.getItem(syncKey);
      const pendingItems = existing ? JSON.parse(existing) : [];

      // Remove existing entry for this key
      const filtered = pendingItems.filter((item: any) => item.key !== key);

      // Add new entry
      filtered.push({ key, operation, timestamp: Date.now() });

      localStorage.setItem(syncKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('❌ [SYNC] Failed to mark for sync:', error);
    }
  }

  private getPendingSyncItems(): Array<{ key: string; operation: 'set' | 'delete'; timestamp: number }> {
    try {
      const syncKey = `_pendingSync_${this.config.userId}`;
      const existing = localStorage.getItem(syncKey);
      return existing ? JSON.parse(existing) : [];
    } catch (error) {
      console.error('❌ [SYNC] Failed to get pending sync items:', error);
      return [];
    }
  }

  private removePendingSyncItem(key: string): void {
    try {
      const syncKey = `_pendingSync_${this.config.userId}`;
      const existing = localStorage.getItem(syncKey);
      if (existing) {
        const pendingItems = JSON.parse(existing);
        const filtered = pendingItems.filter((item: any) => item.key !== key);
        localStorage.setItem(syncKey, JSON.stringify(filtered));
      }
    } catch (error) {
      console.error('❌ [SYNC] Failed to remove pending sync item:', error);
    }
  }

  private clearPendingSyncItems(): void {
    try {
      const syncKey = `_pendingSync_${this.config.userId}`;
      localStorage.removeItem(syncKey);
    } catch (error) {
      console.error('❌ [SYNC] Failed to clear pending sync items:', error);
    }
  }

  private startAutoSync(): void {
    if (this.config.syncInterval) {
      this.syncTimer = setInterval(() => {
        if (this.isOnline) {
          this.syncWithDatabase().catch(error => {
            console.error('❌ [AUTO-SYNC] Auto sync failed:', error);
          });
        }
      }, this.config.syncInterval);
    }
  }

  private handleOnlineStatusChange = (): void => {
    if (this.isOnline && this.config.mode === 'hybrid') {
      // Sync when coming back online
      this.syncWithDatabase().catch(error => {
        console.error('❌ [ONLINE-SYNC] Online sync failed:', error);
      });
    }
  };
}
