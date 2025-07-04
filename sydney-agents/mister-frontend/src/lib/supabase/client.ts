/**
 * Supabase Client Configuration
 * Provides database client for production user data storage
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client (with RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Server-side Supabase client (bypasses RLS when needed)
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Set user context for RLS policies
 */
export async function setUserContext(userId: string) {
  const { error } = await supabase.rpc('set_current_user_id', {
    user_id_param: userId
  });
  
  if (error) {
    console.error('Failed to set user context:', error);
    throw error;
  }
}

/**
 * Database utility functions that mirror our localStorage interface
 */
export class SupabaseUserStorage {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Get user preference by key
   */
  async getItem(key: string): Promise<string | null> {
    try {
      // Set user context for RLS
      await setUserContext(this.userId);

      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', this.userId)
        .eq('preference_key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned, preference doesn't exist
          return null;
        }
        throw error;
      }

      return JSON.stringify(data.preference_value);
    } catch (error) {
      console.error(`Failed to get preference ${key}:`, error);
      return null;
    }
  }

  /**
   * Set user preference by key
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      // Set user context for RLS
      await setUserContext(this.userId);

      // Handle both JSON and plain string values
      let preferenceValue: any;
      try {
        // Try to parse as JSON first
        preferenceValue = JSON.parse(value);
      } catch (parseError) {
        // If parsing fails, store as plain string (for auth tokens, etc.)
        preferenceValue = value;
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: this.userId,
          preference_key: key,
          preference_value: preferenceValue,
        }, {
          onConflict: 'user_id,preference_key'
        });

      if (error) {
        throw error;
      }

      console.log(`✅ [DB] Saved preference ${key} for user ${this.userId}`);
    } catch (error) {
      console.error(`Failed to set preference ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove user preference by key
   */
  async removeItem(key: string): Promise<void> {
    try {
      // Set user context for RLS
      await setUserContext(this.userId);

      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', this.userId)
        .eq('preference_key', key);

      if (error) {
        throw error;
      }

      console.log(`🗑️ [DB] Removed preference ${key} for user ${this.userId}`);
    } catch (error) {
      console.error(`Failed to remove preference ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all user preference keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      // Set user context for RLS
      await setUserContext(this.userId);

      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_key')
        .eq('user_id', this.userId);

      if (error) {
        throw error;
      }

      return data.map(row => row.preference_key);
    } catch (error) {
      console.error('Failed to get all keys:', error);
      return [];
    }
  }

  /**
   * Clear all user preferences
   */
  async clear(): Promise<void> {
    try {
      // Set user context for RLS
      await setUserContext(this.userId);

      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', this.userId);

      if (error) {
        throw error;
      }

      console.log(`🧹 [DB] Cleared all preferences for user ${this.userId}`);
    } catch (error) {
      console.error('Failed to clear preferences:', error);
      throw error;
    }
  }

  /**
   * Get all user preferences as key-value pairs
   */
  async getAllPreferences(): Promise<Record<string, any>> {
    try {
      // Set user context for RLS
      await setUserContext(this.userId);

      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_key, preference_value')
        .eq('user_id', this.userId);

      if (error) {
        throw error;
      }

      const preferences: Record<string, any> = {};
      data.forEach(row => {
        preferences[row.preference_key] = row.preference_value;
      });

      return preferences;
    } catch (error) {
      console.error('Failed to get all preferences:', error);
      return {};
    }
  }
}

/**
 * Migration utilities for localStorage to database
 */
export class DatabaseMigrationUtils {
  /**
   * Migrate user data from localStorage to database
   */
  static async migrateUserFromLocalStorage(userId: string): Promise<void> {
    try {
      console.log(`🔄 [MIGRATION] Starting migration for user ${userId}`);

      const userStorage = new SupabaseUserStorage(userId);
      let migratedCount = 0;

      // Get all localStorage keys for this user
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(`_${userId}`)) {
          // Extract the preference key (remove user suffix)
          const preferenceKey = key.replace(`_${userId}`, '');
          const value = localStorage.getItem(key);

          if (value) {
            try {
              // Validate JSON
              JSON.parse(value);
              
              // Save to database
              await userStorage.setItem(preferenceKey, value);
              migratedCount++;

              console.log(`✅ [MIGRATION] Migrated ${preferenceKey} for user ${userId}`);
            } catch (parseError) {
              console.warn(`⚠️ [MIGRATION] Skipped invalid JSON for key ${preferenceKey}:`, parseError);
            }
          }
        }
      }

      console.log(`🎉 [MIGRATION] Completed migration for user ${userId}: ${migratedCount} preferences migrated`);
    } catch (error) {
      console.error(`❌ [MIGRATION] Failed to migrate user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Verify migration integrity
   */
  static async verifyMigration(userId: string): Promise<boolean> {
    try {
      const userStorage = new SupabaseUserStorage(userId);
      const dbPreferences = await userStorage.getAllPreferences();
      
      let localStorageCount = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(`_${userId}`)) {
          localStorageCount++;
        }
      }

      const dbCount = Object.keys(dbPreferences).length;
      const isValid = dbCount >= localStorageCount;

      console.log(`🔍 [VERIFICATION] User ${userId}: localStorage=${localStorageCount}, database=${dbCount}, valid=${isValid}`);
      
      return isValid;
    } catch (error) {
      console.error(`❌ [VERIFICATION] Failed to verify migration for user ${userId}:`, error);
      return false;
    }
  }
}

/**
 * Audit logging utilities
 */
export class AuditLogger {
  /**
   * Log user action for audit trail
   */
  static async logAction(
    userId: string,
    action: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action,
          new_values: details || {},
        });

      if (error) {
        console.error('Failed to log audit action:', error);
      }
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }
}
