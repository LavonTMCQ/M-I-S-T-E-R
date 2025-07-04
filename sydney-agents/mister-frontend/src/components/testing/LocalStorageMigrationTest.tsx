/**
 * localStorage Migration Test Component
 * Tests and demonstrates the user-specific localStorage migration system
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import { USER_STORAGE_KEYS, migrateExistingUserData } from '@/lib/utils/userStorage';

interface StorageTestData {
  globalKeys: string[];
  userKeys: string[];
  migratedKeys: string[];
  testData: Record<string, any>;
}

export function LocalStorageMigrationTest() {
  const { userStorage, userId, userIdentity, isAuthenticated } = useUserIdentity();
  const [testData, setTestData] = useState<StorageTestData>({
    globalKeys: [],
    userKeys: [],
    migratedKeys: [],
    testData: {}
  });
  const [isRunningTest, setIsRunningTest] = useState(false);

  useEffect(() => {
    refreshStorageData();
  }, [userId]);

  /**
   * Refresh storage data display
   */
  const refreshStorageData = () => {
    const globalKeys: string[] = [];
    const userKeys: string[] = [];
    const testData: Record<string, any> = {};

    // Scan all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        testData[key] = value;

        if (userId && key.endsWith(`_${userId}`)) {
          userKeys.push(key);
        } else if (Object.values(USER_STORAGE_KEYS).includes(key as any)) {
          globalKeys.push(key);
        }
      }
    }

    setTestData({
      globalKeys,
      userKeys,
      migratedKeys: userKeys.map(key => key.replace(`_${userId}`, '')),
      testData
    });
  };

  /**
   * Create test data in global localStorage
   */
  const createTestData = () => {
    const testValues = {
      [USER_STORAGE_KEYS.ARCHIVE_STATUS]: JSON.stringify({ wallet1: true, wallet2: false }),
      [USER_STORAGE_KEYS.SELECTED_WALLET]: JSON.stringify({ id: 'test-wallet', address: 'addr1test...' }),
      [USER_STORAGE_KEYS.DASHBOARD_PREFERENCES]: JSON.stringify({ theme: 'dark', layout: 'compact' }),
      [USER_STORAGE_KEYS.TRADING_PREFERENCES]: JSON.stringify({ defaultSize: 100, autoClose: true }),
      [USER_STORAGE_KEYS.USER_PREFERENCES]: JSON.stringify({ notifications: true, sound: false }),
      'auth_token': 'test_token_12345',
      'user_data': JSON.stringify({ name: 'Test User', email: 'test@example.com' }),
    };

    Object.entries(testValues).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    console.log('📦 Created test data in global localStorage');
    refreshStorageData();
  };

  /**
   * Run migration test
   */
  const runMigrationTest = async () => {
    if (!userId) {
      console.warn('⚠️ No user ID available for migration test');
      return;
    }

    setIsRunningTest(true);
    
    try {
      console.log('🧪 Starting migration test for user:', userId.substring(0, 12) + '...');
      
      // Run the migration
      migrateExistingUserData(userId);
      
      // Wait a moment for migration to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh data display
      refreshStorageData();
      
      console.log('✅ Migration test completed');
    } catch (error) {
      console.error('❌ Migration test failed:', error);
    } finally {
      setIsRunningTest(false);
    }
  };

  /**
   * Test user-specific storage operations
   */
  const testUserStorage = () => {
    if (!userStorage) {
      console.warn('⚠️ User storage not available');
      return;
    }

    // Test setting user-specific data
    userStorage.setItem(USER_STORAGE_KEYS.USER_PREFERENCES, JSON.stringify({
      theme: 'light',
      notifications: true,
      testTimestamp: Date.now()
    }));

    userStorage.setItem(USER_STORAGE_KEYS.DASHBOARD_PREFERENCES, JSON.stringify({
      layout: 'grid',
      widgets: ['portfolio', 'positions', 'activity']
    }));

    console.log('📝 Set user-specific test data');
    refreshStorageData();
  };

  /**
   * Clear all test data
   */
  const clearTestData = () => {
    // Clear global test data
    Object.values(USER_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');

    // Clear user-specific data
    if (userStorage) {
      userStorage.clear();
    }

    console.log('🧹 Cleared all test data');
    refreshStorageData();
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Please authenticate to test localStorage migration
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            localStorage Migration Test
            <Badge variant={userId ? 'default' : 'secondary'}>
              {userId ? 'User Authenticated' : 'No User'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <div className="font-mono text-sm bg-muted p-2 rounded">
                {userId ? userId.substring(0, 20) + '...' : 'Not available'}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">User Type</label>
              <div className="font-medium">
                {userIdentity?.type || 'Unknown'}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={createTestData} variant="outline" size="sm">
              Create Test Data
            </Button>
            <Button 
              onClick={runMigrationTest} 
              variant="default" 
              size="sm"
              disabled={isRunningTest || !userId}
            >
              {isRunningTest ? 'Running...' : 'Run Migration'}
            </Button>
            <Button onClick={testUserStorage} variant="outline" size="sm">
              Test User Storage
            </Button>
            <Button onClick={clearTestData} variant="destructive" size="sm">
              Clear Test Data
            </Button>
            <Button onClick={refreshStorageData} variant="ghost" size="sm">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="global">Global Keys</TabsTrigger>
          <TabsTrigger value="user">User Keys</TabsTrigger>
          <TabsTrigger value="raw">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Migration Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">{testData.globalKeys.length}</div>
                  <div className="text-sm text-muted-foreground">Global Keys</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{testData.userKeys.length}</div>
                  <div className="text-sm text-muted-foreground">User-Specific Keys</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{testData.migratedKeys.length}</div>
                  <div className="text-sm text-muted-foreground">Migrated Keys</div>
                </div>
              </div>

              {testData.migratedKeys.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Successfully Migrated</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {testData.migratedKeys.map(key => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="global">
          <Card>
            <CardHeader>
              <CardTitle>Global localStorage Keys</CardTitle>
            </CardHeader>
            <CardContent>
              {testData.globalKeys.length > 0 ? (
                <div className="space-y-2">
                  {testData.globalKeys.map(key => (
                    <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="font-mono text-sm">{key}</span>
                      <Badge variant="outline">Global</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No global keys found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user">
          <Card>
            <CardHeader>
              <CardTitle>User-Specific localStorage Keys</CardTitle>
            </CardHeader>
            <CardContent>
              {testData.userKeys.length > 0 ? (
                <div className="space-y-2">
                  {testData.userKeys.map(key => (
                    <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="font-mono text-sm">{key}</span>
                      <Badge variant="default">User-Specific</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No user-specific keys found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw">
          <Card>
            <CardHeader>
              <CardTitle>Raw localStorage Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(testData.testData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
