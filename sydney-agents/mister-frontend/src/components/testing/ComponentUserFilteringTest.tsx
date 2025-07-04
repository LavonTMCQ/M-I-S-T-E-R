/**
 * Component User Filtering Test
 * Tests all frontend components for proper user-specific localStorage usage
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import { USER_STORAGE_KEYS } from '@/lib/utils/userStorage';

interface ComponentTestResult {
  component: string;
  status: 'pass' | 'fail' | 'warning' | 'not_tested';
  message: string;
  userSpecificKeys: string[];
  globalKeys: string[];
}

export function ComponentUserFilteringTest() {
  const { userStorage, userId, userIdentity, isAuthenticated } = useUserIdentity();
  const [testResults, setTestResults] = useState<ComponentTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const components = [
    'Managed Wallets Page',
    'Managed Dashboard',
    'Trading Page',
    'Onboarding Page',
    'Wallet Setup Page',
    'Wallet Context',
    'Dashboard Page',
    'ManagedWalletCreation Component'
  ];

  /**
   * Test component for user-specific localStorage usage
   */
  const testComponent = async (componentName: string): Promise<ComponentTestResult> => {
    const result: ComponentTestResult = {
      component: componentName,
      status: 'not_tested',
      message: '',
      userSpecificKeys: [],
      globalKeys: []
    };

    try {
      // Scan localStorage for component-specific keys
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) allKeys.push(key);
      }

      const userSpecificKeys = allKeys.filter(key => 
        userId && key.endsWith(`_${userId}`)
      );
      
      const globalKeys = allKeys.filter(key => 
        Object.values(USER_STORAGE_KEYS).includes(key as any)
      );

      result.userSpecificKeys = userSpecificKeys;
      result.globalKeys = globalKeys;

      // Component-specific tests
      switch (componentName) {
        case 'Managed Wallets Page':
          if (userSpecificKeys.some(key => key.includes('wallet-archive-status'))) {
            result.status = 'pass';
            result.message = 'Using user-specific archive status storage';
          } else if (globalKeys.includes('wallet-archive-status')) {
            result.status = 'fail';
            result.message = 'Still using global archive status storage';
          } else {
            result.status = 'warning';
            result.message = 'No archive status data found';
          }
          break;

        case 'Managed Dashboard':
          if (userSpecificKeys.some(key => key.includes('selectedManagedWallet'))) {
            result.status = 'pass';
            result.message = 'Using user-specific wallet selection storage';
          } else if (globalKeys.includes('selectedManagedWallet')) {
            result.status = 'fail';
            result.message = 'Still using global wallet selection storage';
          } else {
            result.status = 'warning';
            result.message = 'No wallet selection data found';
          }
          break;

        case 'Trading Page':
          if (userSpecificKeys.some(key => key.includes('trading-preferences'))) {
            result.status = 'pass';
            result.message = 'Using user-specific trading preferences storage';
          } else {
            result.status = 'warning';
            result.message = 'No trading preferences data found (may not be set yet)';
          }
          break;

        case 'Onboarding Page':
          if (userSpecificKeys.some(key => key.includes('onboarding-progress'))) {
            result.status = 'pass';
            result.message = 'Using user-specific onboarding progress storage';
          } else {
            result.status = 'warning';
            result.message = 'No onboarding progress data found (may not be set yet)';
          }
          break;

        case 'Wallet Setup Page':
          if (userSpecificKeys.some(key => key.includes('wallet-creation-state'))) {
            result.status = 'pass';
            result.message = 'Using user-specific wallet creation state storage';
          } else {
            result.status = 'warning';
            result.message = 'No wallet creation state data found (may not be set yet)';
          }
          break;

        case 'Wallet Context':
          if (userSpecificKeys.some(key => key.includes('mainWallet'))) {
            result.status = 'pass';
            result.message = 'Using user-specific main wallet storage';
          } else if (globalKeys.includes('mainWallet')) {
            result.status = 'warning';
            result.message = 'Using global main wallet storage (fallback behavior)';
          } else {
            result.status = 'warning';
            result.message = 'No main wallet data found';
          }
          break;

        case 'Dashboard Page':
          if (userSpecificKeys.some(key => key.includes('dashboard-preferences'))) {
            result.status = 'pass';
            result.message = 'Using user-specific dashboard preferences storage';
          } else {
            result.status = 'warning';
            result.message = 'No dashboard preferences data found (may not be set yet)';
          }
          break;

        case 'ManagedWalletCreation Component':
          if (userSpecificKeys.some(key => key.includes('backup-confirmed'))) {
            result.status = 'pass';
            result.message = 'Using user-specific backup confirmation storage';
          } else {
            result.status = 'warning';
            result.message = 'No backup confirmation data found (may not be set yet)';
          }
          break;

        default:
          result.status = 'not_tested';
          result.message = 'Test not implemented for this component';
      }

    } catch (error) {
      result.status = 'fail';
      result.message = `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return result;
  };

  /**
   * Run all component tests
   */
  const runAllTests = async () => {
    if (!isAuthenticated) {
      console.warn('⚠️ User not authenticated - cannot run component tests');
      return;
    }

    setIsRunningTests(true);
    const results: ComponentTestResult[] = [];

    for (const component of components) {
      const result = await testComponent(component);
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  /**
   * Create test data for components
   */
  const createTestData = () => {
    if (!userStorage) {
      console.warn('⚠️ User storage not available');
      return;
    }

    // Create test data for each component
    userStorage.setItem(USER_STORAGE_KEYS.ARCHIVE_STATUS, JSON.stringify({ wallet1: true }));
    userStorage.setItem(USER_STORAGE_KEYS.SELECTED_WALLET, JSON.stringify({ id: 'test-wallet' }));
    userStorage.setItem(USER_STORAGE_KEYS.TRADING_PREFERENCES, JSON.stringify({ defaultSize: 100 }));
    userStorage.setItem(USER_STORAGE_KEYS.ONBOARDING_PROGRESS, JSON.stringify({ currentStep: 2 }));
    userStorage.setItem(USER_STORAGE_KEYS.WALLET_CREATION_STATE, JSON.stringify({ currentStep: 1 }));
    userStorage.setItem(USER_STORAGE_KEYS.DASHBOARD_PREFERENCES, JSON.stringify({ theme: 'dark' }));
    userStorage.setItem(USER_STORAGE_KEYS.BACKUP_CONFIRMED, JSON.stringify({ confirmed: true }));

    console.log('📝 Created test data for all components');
  };

  /**
   * Clear all test data
   */
  const clearTestData = () => {
    if (!userStorage) {
      console.warn('⚠️ User storage not available');
      return;
    }

    userStorage.clear();
    console.log('🧹 Cleared all test data');
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Please authenticate to test component user filtering
          </div>
        </CardContent>
      </Card>
    );
  }

  const passCount = testResults.filter(r => r.status === 'pass').length;
  const failCount = testResults.filter(r => r.status === 'fail').length;
  const warningCount = testResults.filter(r => r.status === 'warning').length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Component User Filtering Test
            <Badge variant={userId ? 'default' : 'secondary'}>
              {userId ? 'User Authenticated' : 'No User'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={runAllTests} 
              variant="default" 
              size="sm"
              disabled={isRunningTests || !userId}
            >
              {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            <Button onClick={createTestData} variant="outline" size="sm">
              Create Test Data
            </Button>
            <Button onClick={clearTestData} variant="destructive" size="sm">
              Clear Test Data
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{passCount}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{warningCount}</div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{failCount}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex-1">
                    <div className="font-medium">{result.component}</div>
                    <div className="text-sm text-muted-foreground">{result.message}</div>
                    {result.userSpecificKeys.length > 0 && (
                      <div className="text-xs text-blue-600 mt-1">
                        User keys: {result.userSpecificKeys.length}
                      </div>
                    )}
                  </div>
                  <Badge 
                    variant={
                      result.status === 'pass' ? 'default' :
                      result.status === 'fail' ? 'destructive' :
                      result.status === 'warning' ? 'secondary' : 'outline'
                    }
                  >
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
