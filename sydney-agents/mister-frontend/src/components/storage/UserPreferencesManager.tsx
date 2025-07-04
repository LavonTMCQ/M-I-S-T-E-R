/**
 * User Preferences Manager Component
 * Provides UI for managing user preferences with localStorage/Supabase sync
 */

'use client';

import React, { useState } from 'react';
import { useAllUserPreferences } from '../../hooks/useUserStorage';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { AlertCircle, CheckCircle, Loader2, Wifi, WifiOff, Database, HardDrive, RefreshCw } from 'lucide-react';

interface UserPreferencesManagerProps {
  userId: string;
  mode?: 'localStorage' | 'database' | 'hybrid';
  className?: string;
}

export function UserPreferencesManager({ 
  userId, 
  mode = 'hybrid',
  className 
}: UserPreferencesManagerProps) {
  const [showRawData, setShowRawData] = useState(false);
  
  const {
    preferences,
    updatePreference,
    removePreference,
    clearAllPreferences,
    migrateToDatabase,
    loading,
    error,
    isOnline,
    syncStatus,
  } = useAllUserPreferences({
    userId,
    mode,
    autoSync: true,
    syncInterval: 30000,
    fallbackToLocalStorage: true,
  });

  const handleToggleNotifications = async () => {
    const currentPrefs = preferences['user-preferences'] || {
      notifications: false,
      sound: false,
      language: 'en',
      timezone: 'UTC',
    };

    await updatePreference('user-preferences', {
      ...currentPrefs,
      notifications: !currentPrefs.notifications,
    });
  };

  const handleToggleSound = async () => {
    const currentPrefs = preferences['user-preferences'] || {
      notifications: false,
      sound: false,
      language: 'en',
      timezone: 'UTC',
    };

    await updatePreference('user-preferences', {
      ...currentPrefs,
      sound: !currentPrefs.sound,
    });
  };

  const handleMigrateToDatabase = async () => {
    try {
      await migrateToDatabase();
      alert('✅ Successfully migrated to database!');
    } catch (err) {
      alert(`❌ Migration failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all preferences? This action cannot be undone.')) {
      try {
        await clearAllPreferences();
        alert('✅ All preferences cleared!');
      } catch (err) {
        alert(`❌ Failed to clear preferences: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-400" />;
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'localStorage':
        return <HardDrive className="h-4 w-4" />;
      case 'hybrid':
        return (
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            <Database className="h-3 w-3" />
          </div>
        );
    }
  };

  const userPrefs = preferences['user-preferences'] || {
    notifications: false,
    sound: false,
    language: 'en',
    timezone: 'UTC',
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                User Preferences Manager
                {getModeIcon()}
              </CardTitle>
              <CardDescription>
                Manage your preferences with automatic sync between localStorage and Supabase
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge variant="outline" className="text-green-600">
                  <Wifi className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1">
                {getSyncStatusIcon()}
                {syncStatus}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">User ID</Label>
              <p className="font-mono text-xs truncate">{userId}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Storage Mode</Label>
              <p className="capitalize">{mode}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Preferences Count</Label>
              <p>{Object.keys(preferences).length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading preferences...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Preferences */}
      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle>User Settings</CardTitle>
            <CardDescription>Configure your application preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications about trading activities
                </p>
              </div>
              <Switch
                id="notifications"
                checked={userPrefs.notifications}
                onCheckedChange={handleToggleNotifications}
                disabled={loading || syncStatus === 'syncing'}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound">Sound Effects</Label>
                <p className="text-sm text-muted-foreground">
                  Play sound effects for notifications and actions
                </p>
              </div>
              <Switch
                id="sound"
                checked={userPrefs.sound}
                onCheckedChange={handleToggleSound}
                disabled={loading || syncStatus === 'syncing'}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Language</Label>
                <p>{userPrefs.language}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Timezone</Label>
                <p>{userPrefs.timezone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Management</CardTitle>
          <CardDescription>Manage your data storage and synchronization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {mode !== 'database' && (
              <Button
                variant="outline"
                onClick={handleMigrateToDatabase}
                disabled={loading || syncStatus === 'syncing'}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Migrate to Database
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => setShowRawData(!showRawData)}
              className="flex items-center gap-2"
            >
              {showRawData ? 'Hide' : 'Show'} Raw Data
            </Button>

            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={loading || syncStatus === 'syncing'}
              className="flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Raw Data Display */}
      {showRawData && (
        <Card>
          <CardHeader>
            <CardTitle>Raw Preferences Data</CardTitle>
            <CardDescription>JSON representation of all stored preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96">
              {JSON.stringify(preferences, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
