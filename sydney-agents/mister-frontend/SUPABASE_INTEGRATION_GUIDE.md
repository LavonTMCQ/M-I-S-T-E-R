# 🚀 Supabase User Preferences Integration Guide

This guide shows how to integrate the new Supabase + localStorage sync system into your MISTER application.

## 📋 What's Been Set Up

### ✅ Database
- **Table**: `user_preferences` created in Supabase
- **Columns**: `id`, `user_id`, `preference_key`, `preference_value` (JSONB), `created_at`, `updated_at`
- **Constraints**: Unique constraint on `(user_id, preference_key)`

### ✅ Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://bdhmvezqfrgceinysjpi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ✅ Core Components
- **UserStorageManager**: Unified storage with localStorage/database sync
- **useUserStorage**: React hook for individual preferences
- **useAllUserPreferences**: React hook for managing all preferences
- **UserPreferencesManager**: UI component for preference management

## 🎯 Quick Start

### 1. Using Individual Preferences

```tsx
import { useUserStorage } from '@/hooks/useUserStorage';

function TradingComponent({ userId }: { userId: string }) {
  const {
    value: tradingPrefs,
    setValue: setTradingPrefs,
    loading,
    error,
    syncStatus
  } = useUserStorage('trading-preferences', {
    userId,
    mode: 'hybrid', // localStorage + database
    autoSync: true,
    syncInterval: 30000, // 30 seconds
  });

  const updateRiskLevel = async (level: 'low' | 'medium' | 'high') => {
    const newPrefs = {
      ...tradingPrefs,
      riskLevel: level
    };
    await setTradingPrefs(newPrefs);
  };

  if (loading) return <div>Loading preferences...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Trading Preferences</h3>
      <p>Risk Level: {tradingPrefs?.riskLevel || 'Not set'}</p>
      <p>Sync Status: {syncStatus}</p>
      <button onClick={() => updateRiskLevel('high')}>
        Set High Risk
      </button>
    </div>
  );
}
```

### 2. Using All Preferences

```tsx
import { useAllUserPreferences } from '@/hooks/useUserStorage';

function SettingsComponent({ userId }: { userId: string }) {
  const {
    preferences,
    updatePreference,
    loading,
    error,
    syncStatus
  } = useAllUserPreferences({
    userId,
    mode: 'hybrid',
    autoSync: true,
  });

  const toggleNotifications = async () => {
    const userPrefs = preferences['user-preferences'] || {
      notifications: false,
      sound: false,
      language: 'en',
      timezone: 'UTC',
    };

    await updatePreference('user-preferences', {
      ...userPrefs,
      notifications: !userPrefs.notifications,
    });
  };

  return (
    <div>
      <h3>All Preferences</h3>
      <pre>{JSON.stringify(preferences, null, 2)}</pre>
      <button onClick={toggleNotifications}>
        Toggle Notifications
      </button>
    </div>
  );
}
```

## 🔧 Storage Modes

### localStorage Only
```tsx
const storage = useUserStorage('key', {
  userId: 'user123',
  mode: 'localStorage', // Fast, local only
});
```

### Database Only
```tsx
const storage = useUserStorage('key', {
  userId: 'user123',
  mode: 'database', // Persistent, synced
});
```

### Hybrid (Recommended)
```tsx
const storage = useUserStorage('key', {
  userId: 'user123',
  mode: 'hybrid', // Best of both worlds
  fallbackToLocalStorage: true, // Fallback when offline
});
```

## 🔄 Migration from Existing localStorage

### Automatic Migration
```tsx
import { useAllUserPreferences } from '@/hooks/useUserStorage';

function MigrationComponent({ userId }: { userId: string }) {
  const { migrateToDatabase } = useAllUserPreferences({ userId });

  const handleMigration = async () => {
    try {
      await migrateToDatabase();
      alert('✅ Migration completed!');
    } catch (error) {
      alert('❌ Migration failed: ' + error.message);
    }
  };

  return (
    <button onClick={handleMigration}>
      Migrate to Database
    </button>
  );
}
```

### Manual Migration
```tsx
import { UserStorageManager } from '@/lib/storage/userStorageManager';

const migrateUser = async (userId: string) => {
  const manager = new UserStorageManager({
    mode: 'hybrid',
    userId,
    autoSync: true,
    fallbackToLocalStorage: true,
  });

  await manager.migrateToDatabase();
  console.log('✅ Migration completed');
};
```

## 📊 Available Preference Types

The system supports all existing preference types:

```typescript
interface UserPreferences {
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
  
  // Dashboard preferences
  'dashboard-preferences': {
    theme: 'light' | 'dark';
    layout: 'grid' | 'list';
    defaultTab: string;
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
  
  // And more...
}
```

## 🎨 UI Components

### Full Preferences Manager
```tsx
import { UserPreferencesManager } from '@/components/storage/UserPreferencesManager';

<UserPreferencesManager 
  userId={userId} 
  mode="hybrid"
  className="max-w-4xl mx-auto"
/>
```

### Demo Page
Visit `/preferences` to see the full demo with:
- Storage mode switching
- Real-time sync status
- Individual preference examples
- Migration tools

## 🔍 Getting User ID

The system automatically detects user ID from:

1. **Auth Token**: `mock_token_` or `mister_token_` prefixes
2. **Main Wallet**: Uses wallet address as user ID
3. **Fallback**: Generates anonymous user ID

```tsx
const getUserId = () => {
  const authToken = localStorage.getItem('auth_token');
  if (authToken?.startsWith('mock_token_')) {
    return authToken.replace('mock_token_', '');
  }
  
  const mainWallet = localStorage.getItem('mainWallet');
  if (mainWallet) {
    const walletData = JSON.parse(mainWallet);
    return walletData.address;
  }
  
  return 'anonymous_user';
};
```

## 🚨 Error Handling

The system includes comprehensive error handling:

```tsx
const { value, error, syncStatus } = useUserStorage('key', { userId });

// Check for errors
if (error) {
  console.error('Storage error:', error);
}

// Monitor sync status
switch (syncStatus) {
  case 'syncing':
    // Show loading indicator
    break;
  case 'synced':
    // Show success indicator
    break;
  case 'error':
    // Show error indicator
    break;
}
```

## 🔧 Advanced Configuration

### Custom Sync Intervals
```tsx
const storage = useUserStorage('key', {
  userId,
  mode: 'hybrid',
  autoSync: true,
  syncInterval: 60000, // 1 minute
});
```

### Offline Handling
```tsx
const storage = useUserStorage('key', {
  userId,
  mode: 'database',
  fallbackToLocalStorage: true, // Use localStorage when offline
});
```

### Manual Sync
```tsx
const manager = new UserStorageManager(config);
await manager.syncWithDatabase(); // Manual sync
```

## 🎯 Next Steps

1. **Test the Demo**: Visit `/preferences` to see the system in action
2. **Integrate Gradually**: Start with one preference type and expand
3. **Monitor Performance**: Check sync status and error rates
4. **Migrate Users**: Use the migration tools for existing users

## 🆘 Troubleshooting

### Common Issues

1. **Environment Variables**: Ensure Supabase keys are set correctly
2. **User ID**: Verify user identification is working
3. **Network**: Check online/offline handling
4. **Permissions**: Verify Supabase RLS policies (currently disabled)

### Debug Mode
```tsx
// Enable detailed logging
localStorage.setItem('debug_storage', 'true');
```

The system will log all operations to the console for debugging.
