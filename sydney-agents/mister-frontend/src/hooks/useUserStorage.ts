/**
 * React Hook for User Storage Management
 * Provides easy access to user preferences with automatic sync between localStorage and Supabase
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserStorageManager, StorageConfig } from '../lib/storage/userStorageManager';
import { UserPreferences } from '../lib/supabase/types';

export interface UseUserStorageOptions {
  userId: string;
  mode?: 'localStorage' | 'database' | 'hybrid';
  autoSync?: boolean;
  syncInterval?: number;
  fallbackToLocalStorage?: boolean;
}

export interface UseUserStorageReturn<K extends keyof UserPreferences> {
  value: UserPreferences[K] | null;
  setValue: (value: UserPreferences[K]) => Promise<void>;
  removeValue: () => Promise<void>;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
}

export function useUserStorage<K extends keyof UserPreferences>(
  key: K,
  options: UseUserStorageOptions
): UseUserStorageReturn<K> {
  const [value, setValue] = useState<UserPreferences[K] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  const storageManagerRef = useRef<UserStorageManager | null>(null);

  // Initialize storage manager
  useEffect(() => {
    const config: StorageConfig = {
      mode: options.mode || 'hybrid',
      userId: options.userId,
      autoSync: options.autoSync ?? true,
      syncInterval: options.syncInterval || 30000, // 30 seconds
      fallbackToLocalStorage: options.fallbackToLocalStorage ?? true,
    };

    storageManagerRef.current = new UserStorageManager(config);

    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (storageManagerRef.current) {
        storageManagerRef.current.destroy();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [options.userId, options.mode, options.autoSync, options.syncInterval, options.fallbackToLocalStorage]);

  // Load initial value
  useEffect(() => {
    const loadValue = async () => {
      if (!storageManagerRef.current) return;

      try {
        setLoading(true);
        setError(null);
        setSyncStatus('syncing');

        const loadedValue = await storageManagerRef.current.getItem(key);
        setValue(loadedValue);
        setSyncStatus('synced');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load value';
        setError(errorMessage);
        setSyncStatus('error');
        console.error(`❌ [HOOK] Failed to load ${key}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadValue();
  }, [key]);

  // Set value function
  const setValueCallback = useCallback(async (newValue: UserPreferences[K]) => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      setError(null);
      setSyncStatus('syncing');

      await storageManagerRef.current.setItem(key, newValue);
      setValue(newValue);
      setSyncStatus('synced');

      console.log(`✅ [HOOK] Successfully set ${key}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set value';
      setError(errorMessage);
      setSyncStatus('error');
      console.error(`❌ [HOOK] Failed to set ${key}:`, err);
      throw err;
    }
  }, [key]);

  // Remove value function
  const removeValueCallback = useCallback(async () => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      setError(null);
      setSyncStatus('syncing');

      await storageManagerRef.current.removeItem(key);
      setValue(null);
      setSyncStatus('synced');

      console.log(`✅ [HOOK] Successfully removed ${key}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove value';
      setError(errorMessage);
      setSyncStatus('error');
      console.error(`❌ [HOOK] Failed to remove ${key}:`, err);
      throw err;
    }
  }, [key]);

  return {
    value,
    setValue: setValueCallback,
    removeValue: removeValueCallback,
    loading,
    error,
    isOnline,
    syncStatus,
  };
}

/**
 * Hook for managing all user preferences at once
 */
export function useAllUserPreferences(options: UseUserStorageOptions) {
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  const storageManagerRef = useRef<UserStorageManager | null>(null);

  // Initialize storage manager
  useEffect(() => {
    const config: StorageConfig = {
      mode: options.mode || 'hybrid',
      userId: options.userId,
      autoSync: options.autoSync ?? true,
      syncInterval: options.syncInterval || 30000,
      fallbackToLocalStorage: options.fallbackToLocalStorage ?? true,
    };

    storageManagerRef.current = new UserStorageManager(config);

    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (storageManagerRef.current) {
        storageManagerRef.current.destroy();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [options.userId, options.mode, options.autoSync, options.syncInterval, options.fallbackToLocalStorage]);

  // Load all preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!storageManagerRef.current) return;

      try {
        setLoading(true);
        setError(null);
        setSyncStatus('syncing');

        const allPreferences = await storageManagerRef.current.getAllPreferences();
        setPreferences(allPreferences);
        setSyncStatus('synced');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load preferences';
        setError(errorMessage);
        setSyncStatus('error');
        console.error('❌ [HOOK] Failed to load all preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Update specific preference
  const updatePreference = useCallback(async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      setError(null);
      setSyncStatus('syncing');

      await storageManagerRef.current.setItem(key, value);
      setPreferences(prev => ({ ...prev, [key]: value }));
      setSyncStatus('synced');

      console.log(`✅ [HOOK] Successfully updated ${key}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preference';
      setError(errorMessage);
      setSyncStatus('error');
      console.error(`❌ [HOOK] Failed to update ${key}:`, err);
      throw err;
    }
  }, []);

  // Remove specific preference
  const removePreference = useCallback(async <K extends keyof UserPreferences>(key: K) => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      setError(null);
      setSyncStatus('syncing');

      await storageManagerRef.current.removeItem(key);
      setPreferences(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      setSyncStatus('synced');

      console.log(`✅ [HOOK] Successfully removed ${key}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove preference';
      setError(errorMessage);
      setSyncStatus('error');
      console.error(`❌ [HOOK] Failed to remove ${key}:`, err);
      throw err;
    }
  }, []);

  // Clear all preferences
  const clearAllPreferences = useCallback(async () => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      setError(null);
      setSyncStatus('syncing');

      await storageManagerRef.current.clear();
      setPreferences({});
      setSyncStatus('synced');

      console.log('✅ [HOOK] Successfully cleared all preferences');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear preferences';
      setError(errorMessage);
      setSyncStatus('error');
      console.error('❌ [HOOK] Failed to clear all preferences:', err);
      throw err;
    }
  }, []);

  // Migrate to database
  const migrateToDatabase = useCallback(async () => {
    if (!storageManagerRef.current) {
      throw new Error('Storage manager not initialized');
    }

    try {
      setError(null);
      setSyncStatus('syncing');

      await storageManagerRef.current.migrateToDatabase();
      
      // Reload preferences after migration
      const allPreferences = await storageManagerRef.current.getAllPreferences();
      setPreferences(allPreferences);
      setSyncStatus('synced');

      console.log('✅ [HOOK] Successfully migrated to database');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to migrate to database';
      setError(errorMessage);
      setSyncStatus('error');
      console.error('❌ [HOOK] Failed to migrate to database:', err);
      throw err;
    }
  }, []);

  return {
    preferences,
    updatePreference,
    removePreference,
    clearAllPreferences,
    migrateToDatabase,
    loading,
    error,
    isOnline,
    syncStatus,
  };
}
