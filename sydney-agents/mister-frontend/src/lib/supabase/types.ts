/**
 * Supabase Database Types
 * Generated types for type-safe database operations
 */

export interface Database {
  public: {
    Tables: {
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          preference_key: string;
          preference_value: any; // JSONB
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preference_key: string;
          preference_value: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preference_key?: string;
          preference_value?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      managed_wallets: {
        Row: {
          id: string;
          user_id: string;
          wallet_address: string;
          wallet_name: string | null;
          mnemonic_encrypted: string | null;
          created_at: string;
          updated_at: string;
          is_archived: boolean;
          wallet_group: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_address: string;
          wallet_name?: string | null;
          mnemonic_encrypted?: string | null;
          created_at?: string;
          updated_at?: string;
          is_archived?: boolean;
          wallet_group?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          wallet_address?: string;
          wallet_name?: string | null;
          mnemonic_encrypted?: string | null;
          created_at?: string;
          updated_at?: string;
          is_archived?: boolean;
          wallet_group?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          table_name: string | null;
          record_id: string | null;
          old_values: any | null; // JSONB
          new_values: any | null; // JSONB
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          table_name?: string | null;
          record_id?: string | null;
          old_values?: any | null;
          new_values?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          table_name?: string | null;
          record_id?: string | null;
          old_values?: any | null;
          new_values?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      set_current_user_id: {
        Args: {
          user_id_param: string;
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

/**
 * User preference types that map to our existing USER_STORAGE_KEYS
 */
export interface UserPreferences {
  // Managed wallet preferences
  'wallet-archive-status': Record<string, boolean>;
  'selectedManagedWallet': {
    id: string;
    address: string;
    name?: string;
  };
  
  // Trading preferences
  'trading-preferences': {
    defaultSize: number;
    autoClose: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    chartTimeframe: string;
    layout: string;
  };
  
  // Onboarding progress
  'onboarding-progress': {
    currentStep: number;
    completed: boolean;
    confirmationChecks: {
      saved: boolean;
      secure: boolean;
      understand: boolean;
    };
    lastUpdated: string;
  };
  
  // Wallet creation state
  'wallet-creation-state': {
    currentStep: number;
    fundingComplete: boolean;
    lastUpdated: string;
  };
  
  // Dashboard preferences
  'dashboard-preferences': {
    theme: 'light' | 'dark';
    layout: 'grid' | 'list';
    defaultTab: string;
  };
  
  // Backup confirmation
  'backup-confirmed': {
    confirmed: boolean;
    walletAddress: string;
    timestamp: number;
  };
  
  // User preferences
  'user-preferences': {
    notifications: boolean;
    sound: boolean;
    language: string;
    timezone: string;
  };
  
  // Main wallet data
  'mainWallet': {
    address: string;
    stakeAddress: string;
    walletType: string;
    balance: number;
    handle: string | null;
    displayName: string;
  };
}

/**
 * Managed wallet data structure
 */
export interface ManagedWalletData {
  id: string;
  userId: string;
  walletAddress: string;
  walletName?: string;
  mnemonicEncrypted?: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  walletGroup: string;
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  tableName: string | null;
  recordId: string | null;
  oldValues: any | null;
  newValues: any | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/**
 * Migration status tracking
 */
export interface MigrationStatus {
  userId: string;
  migrationStarted: string;
  migrationCompleted?: string;
  localStorageCount: number;
  databaseCount: number;
  migrationErrors: string[];
  verificationPassed: boolean;
}

/**
 * Database operation result types
 */
export interface DatabaseOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * User storage interface that matches our existing localStorage interface
 */
export interface UserStorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * Migration utilities interface
 */
export interface MigrationUtilsInterface {
  migrateUserFromLocalStorage(userId: string): Promise<void>;
  verifyMigration(userId: string): Promise<boolean>;
  getMigrationStatus(userId: string): Promise<MigrationStatus | null>;
  rollbackMigration(userId: string): Promise<void>;
}
