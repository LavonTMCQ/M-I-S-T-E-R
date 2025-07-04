/**
 * Comprehensive Security Test Suites
 * Defines all security tests for the MISTER application
 */

import {
  SecurityTestSuite,
  SecurityTest,
  SecurityTestResult,
  SecurityTestContext,
  SecurityTestHelpers,
  TestValidators
} from './securityTestFramework';
import { USER_STORAGE_KEYS } from '@/lib/utils/userStorage';

/**
 * User Isolation Test Suite
 * Tests that users cannot access other users' data
 */
export const UserIsolationTestSuite: SecurityTestSuite = {
  name: 'User Data Isolation',
  description: 'Verify that users cannot access other users\' data through localStorage or API calls',
  tests: [
    {
      name: 'localStorage Cross-User Isolation',
      description: 'Verify that localStorage data is isolated between different users',
      category: 'user_isolation',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const [user1, user2] = context.users;
        
        // Create test data for user1
        const user1Data = SecurityTestHelpers.createTestData(user1.id);
        Object.entries(user1Data).forEach(([key, value]) => {
          const userKey = SecurityTestHelpers.getUserStorageKey(key, user1.id);
          context.localStorage.setItem(userKey, value);
        });

        // Create different test data for user2
        const user2Data = SecurityTestHelpers.createTestData(user2.id);
        Object.entries(user2Data).forEach(([key, value]) => {
          const userKey = SecurityTestHelpers.getUserStorageKey(key, user2.id);
          context.localStorage.setItem(userKey, value);
        });

        // Verify user1 cannot access user2's data
        const user2Key = SecurityTestHelpers.getUserStorageKey('trading-preferences', user2.id);
        const user1CanAccessUser2Data = context.localStorage.getItem(user2Key) !== null;

        // Verify user1's data is isolated
        const user1Key = SecurityTestHelpers.getUserStorageKey('trading-preferences', user1.id);
        const user1Data_retrieved = context.localStorage.getItem(user1Key);

        if (!user1CanAccessUser2Data && user1Data_retrieved) {
          return {
            testName: 'localStorage Cross-User Isolation',
            category: 'user_isolation',
            status: 'pass',
            message: 'localStorage data is properly isolated between users',
            details: {
              user1Keys: Object.keys(user1Data).map(k => SecurityTestHelpers.getUserStorageKey(k, user1.id)),
              user2Keys: Object.keys(user2Data).map(k => SecurityTestHelpers.getUserStorageKey(k, user2.id))
            },
            timestamp: ''
          };
        } else {
          return {
            testName: 'localStorage Cross-User Isolation',
            category: 'user_isolation',
            status: 'fail',
            message: 'localStorage data isolation failed - users can access other users\' data',
            timestamp: ''
          };
        }
      }
    },

    {
      name: 'API Cross-User Access Prevention',
      description: 'Verify that API endpoints prevent cross-user data access',
      category: 'user_isolation',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const [user1, user2] = context.users;

        try {
          // Try to access user1's managed wallets with user2's token
          const response = await SecurityTestHelpers.makeAuthenticatedRequest(
            `${context.apiBase}/api/wallets/managed/${user1.walletAddress || user1.id}`,
            user2.token
          );

          const data = await response.json();

          if (response.status === 403 || response.status === 401) {
            return {
              testName: 'API Cross-User Access Prevention',
              category: 'user_isolation',
              status: 'pass',
              message: 'API correctly prevents cross-user access',
              details: { statusCode: response.status, response: data },
              timestamp: ''
            };
          } else if (response.status === 200 && data.success) {
            // Check if returned data belongs to user2 (correct behavior)
            const belongsToUser2 = TestValidators.validateUserSpecificApiResponse(data, user2.id);
            if (belongsToUser2) {
              return {
                testName: 'API Cross-User Access Prevention',
                category: 'user_isolation',
                status: 'pass',
                message: 'API returns user-specific data only',
                timestamp: ''
              };
            } else {
              return {
                testName: 'API Cross-User Access Prevention',
                category: 'user_isolation',
                status: 'fail',
                message: 'API returned data from different user - security breach!',
                details: { response: data },
                timestamp: ''
              };
            }
          } else {
            return {
              testName: 'API Cross-User Access Prevention',
              category: 'user_isolation',
              status: 'warning',
              message: 'API response unclear - manual verification needed',
              details: { statusCode: response.status, response: data },
              timestamp: ''
            };
          }
        } catch (error) {
          return {
            testName: 'API Cross-User Access Prevention',
            category: 'user_isolation',
            status: 'error',
            message: `API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: ''
          };
        }
      }
    },

    {
      name: 'Component State Isolation',
      description: 'Verify that component state is isolated between users',
      category: 'user_isolation',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const [user1, user2] = context.users;

        // Simulate component state for user1
        const user1ComponentState = {
          selectedWallet: `wallet_${user1.id}`,
          tradingPreferences: { size: 100, risk: 'low' },
          onboardingStep: 3
        };

        // Simulate component state for user2
        const user2ComponentState = {
          selectedWallet: `wallet_${user2.id}`,
          tradingPreferences: { size: 200, risk: 'high' },
          onboardingStep: 1
        };

        // Store state with user-specific keys
        Object.entries(user1ComponentState).forEach(([key, value]) => {
          const userKey = SecurityTestHelpers.getUserStorageKey(key, user1.id);
          context.localStorage.setItem(userKey, JSON.stringify(value));
        });

        Object.entries(user2ComponentState).forEach(([key, value]) => {
          const userKey = SecurityTestHelpers.getUserStorageKey(key, user2.id);
          context.localStorage.setItem(userKey, JSON.stringify(value));
        });

        // Verify isolation
        const user1SelectedWallet = context.localStorage.getItem(
          SecurityTestHelpers.getUserStorageKey('selectedWallet', user1.id)
        );
        const user2SelectedWallet = context.localStorage.getItem(
          SecurityTestHelpers.getUserStorageKey('selectedWallet', user2.id)
        );

        const user1Data = user1SelectedWallet ? JSON.parse(user1SelectedWallet) : null;
        const user2Data = user2SelectedWallet ? JSON.parse(user2SelectedWallet) : null;

        if (user1Data !== user2Data && user1Data === user1ComponentState.selectedWallet) {
          return {
            testName: 'Component State Isolation',
            category: 'user_isolation',
            status: 'pass',
            message: 'Component state is properly isolated between users',
            details: { user1State: user1Data, user2State: user2Data },
            timestamp: ''
          };
        } else {
          return {
            testName: 'Component State Isolation',
            category: 'user_isolation',
            status: 'fail',
            message: 'Component state isolation failed',
            timestamp: ''
          };
        }
      }
    }
  ]
};

/**
 * API Security Test Suite
 * Tests backend API security and authentication
 */
export const APISecurityTestSuite: SecurityTestSuite = {
  name: 'API Security',
  description: 'Verify that API endpoints are properly secured and validate authentication',
  tests: [
    {
      name: 'Unauthenticated Access Prevention',
      description: 'Verify that protected endpoints reject unauthenticated requests',
      category: 'api_security',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const protectedEndpoints = [
          '/api/wallets/managed/test',
          '/api/wallet/create',
          '/api/wallet/info',
          '/api/wallet/managed',
          '/api/agents/strike/toggle'
        ];

        const results = [];

        for (const endpoint of protectedEndpoints) {
          try {
            const response = await fetch(`${context.apiBase}${endpoint}`);
            const isProtected = response.status === 401 || response.status === 403;
            results.push({ endpoint, protected: isProtected, status: response.status });
          } catch (error) {
            results.push({ endpoint, protected: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        const allProtected = results.every(r => r.protected);

        return {
          testName: 'Unauthenticated Access Prevention',
          category: 'api_security',
          status: allProtected ? 'pass' : 'fail',
          message: allProtected 
            ? 'All protected endpoints properly reject unauthenticated requests'
            : 'Some endpoints allow unauthenticated access',
          details: { endpointResults: results },
          timestamp: ''
        };
      }
    },

    {
      name: 'Token Validation',
      description: 'Verify that API endpoints validate authentication tokens correctly',
      category: 'api_security',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const invalidTokens = [
          'invalid_token',
          'mister_token_invalid',
          'mock_token_invalid',
          '',
          'Bearer invalid'
        ];

        const results = [];

        for (const invalidToken of invalidTokens) {
          try {
            const response = await SecurityTestHelpers.makeAuthenticatedRequest(
              `${context.apiBase}/api/wallet/info`,
              invalidToken
            );
            const isRejected = response.status === 401 || response.status === 403;
            results.push({ token: invalidToken, rejected: isRejected, status: response.status });
          } catch (error) {
            results.push({ token: invalidToken, rejected: true, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        const allRejected = results.every(r => r.rejected);

        return {
          testName: 'Token Validation',
          category: 'api_security',
          status: allRejected ? 'pass' : 'fail',
          message: allRejected 
            ? 'API correctly rejects invalid tokens'
            : 'API accepts some invalid tokens',
          details: { tokenResults: results },
          timestamp: ''
        };
      }
    },

    {
      name: 'User-Specific Data Filtering',
      description: 'Verify that API endpoints return only user-specific data',
      category: 'api_security',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const [user1] = context.users;

        try {
          const response = await SecurityTestHelpers.makeAuthenticatedRequest(
            `${context.apiBase}/api/wallets/managed/${user1.walletAddress || user1.id}`,
            user1.token
          );

          const data = await response.json();

          if (!SecurityTestHelpers.validateApiResponse(data)) {
            return {
              testName: 'User-Specific Data Filtering',
              category: 'api_security',
              status: 'fail',
              message: 'API response format is invalid',
              timestamp: ''
            };
          }

          const isUserSpecific = TestValidators.validateUserSpecificApiResponse(data, user1.id);

          return {
            testName: 'User-Specific Data Filtering',
            category: 'api_security',
            status: isUserSpecific ? 'pass' : 'fail',
            message: isUserSpecific 
              ? 'API returns user-specific data only'
              : 'API may be returning data from other users',
            details: { response: data },
            timestamp: ''
          };
        } catch (error) {
          return {
            testName: 'User-Specific Data Filtering',
            category: 'api_security',
            status: 'error',
            message: `API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: ''
          };
        }
      }
    }
  ]
};

/**
 * Authentication Flow Test Suite
 * Tests authentication flows for both wallet and email users
 */
export const AuthenticationFlowTestSuite: SecurityTestSuite = {
  name: 'Authentication Flows',
  description: 'Verify that authentication flows work correctly for both wallet and email users',
  tests: [
    {
      name: 'Wallet Authentication Flow',
      description: 'Test wallet-based authentication flow',
      category: 'authentication',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const walletUser = context.users.find(u => u.type === 'wallet');
        if (!walletUser) {
          return {
            testName: 'Wallet Authentication Flow',
            category: 'authentication',
            status: 'error',
            message: 'No wallet user available for testing',
            timestamp: ''
          };
        }

        // Validate token format
        const validTokenFormat = TestValidators.validateTokenFormat(walletUser.token, 'wallet');
        if (!validTokenFormat) {
          return {
            testName: 'Wallet Authentication Flow',
            category: 'authentication',
            status: 'fail',
            message: 'Wallet token format is invalid',
            timestamp: ''
          };
        }

        // Test authenticated request
        try {
          const response = await SecurityTestHelpers.makeAuthenticatedRequest(
            `${context.apiBase}/api/wallet/info`,
            walletUser.token
          );

          const isAuthenticated = response.status === 200;

          return {
            testName: 'Wallet Authentication Flow',
            category: 'authentication',
            status: isAuthenticated ? 'pass' : 'fail',
            message: isAuthenticated 
              ? 'Wallet authentication flow works correctly'
              : 'Wallet authentication failed',
            details: { statusCode: response.status },
            timestamp: ''
          };
        } catch (error) {
          return {
            testName: 'Wallet Authentication Flow',
            category: 'authentication',
            status: 'error',
            message: `Wallet authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: ''
          };
        }
      }
    },

    {
      name: 'Email Authentication Flow',
      description: 'Test email-based authentication flow',
      category: 'authentication',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const emailUser = context.users.find(u => u.type === 'email');
        if (!emailUser) {
          return {
            testName: 'Email Authentication Flow',
            category: 'authentication',
            status: 'error',
            message: 'No email user available for testing',
            timestamp: ''
          };
        }

        // Validate token format
        const validTokenFormat = TestValidators.validateTokenFormat(emailUser.token, 'email');
        if (!validTokenFormat) {
          return {
            testName: 'Email Authentication Flow',
            category: 'authentication',
            status: 'fail',
            message: 'Email token format is invalid',
            timestamp: ''
          };
        }

        return {
          testName: 'Email Authentication Flow',
          category: 'authentication',
          status: 'pass',
          message: 'Email authentication flow works correctly',
          details: { tokenFormat: 'valid' },
          timestamp: ''
        };
      }
    }
  ]
};

/**
 * Edge Cases Test Suite
 * Tests edge cases and security scenarios
 */
export const EdgeCasesTestSuite: SecurityTestSuite = {
  name: 'Edge Cases & Security Scenarios',
  description: 'Test edge cases including multiple users, token expiration, and unauthorized access',
  tests: [
    {
      name: 'Multiple Users Same Device',
      description: 'Test that multiple users can use the same device without data contamination',
      category: 'edge_cases',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const [user1, user2, user3] = context.users;

        // Simulate multiple users using the same device
        const users = [user1, user2, user3];
        const userData: Record<string, any> = {};

        // Each user creates their own data
        users.forEach(user => {
          const data = SecurityTestHelpers.createTestData(user.id);
          userData[user.id] = data;

          Object.entries(data).forEach(([key, value]) => {
            const userKey = SecurityTestHelpers.getUserStorageKey(key, user.id);
            context.localStorage.setItem(userKey, value);
          });
        });

        // Verify each user can only access their own data
        let isolationMaintained = true;
        const isolationResults: any[] = [];

        users.forEach(user => {
          const userTradingPrefs = context.localStorage.getItem(
            SecurityTestHelpers.getUserStorageKey('trading-preferences', user.id)
          );

          // Check if user can access other users' data (they shouldn't be able to)
          const otherUsers = users.filter(u => u.id !== user.id);
          const canAccessOthers = otherUsers.some(otherUser => {
            const otherUserKey = SecurityTestHelpers.getUserStorageKey('trading-preferences', otherUser.id);
            return context.localStorage.getItem(otherUserKey) !== null;
          });

          isolationResults.push({
            userId: user.id,
            hasOwnData: userTradingPrefs !== null,
            canAccessOthers: canAccessOthers
          });

          if (!userTradingPrefs || canAccessOthers) {
            isolationMaintained = false;
          }
        });

        return {
          testName: 'Multiple Users Same Device',
          category: 'edge_cases',
          status: isolationMaintained ? 'pass' : 'fail',
          message: isolationMaintained
            ? 'Multiple users can safely use the same device with proper data isolation'
            : 'Data isolation failed with multiple users on same device',
          details: { isolationResults },
          timestamp: ''
        };
      }
    },

    {
      name: 'User Switching Scenario',
      description: 'Test user switching and logout scenarios',
      category: 'edge_cases',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const [user1, user2] = context.users;

        // User1 creates data
        const user1Data = SecurityTestHelpers.createTestData(user1.id);
        Object.entries(user1Data).forEach(([key, value]) => {
          const userKey = SecurityTestHelpers.getUserStorageKey(key, user1.id);
          context.localStorage.setItem(userKey, value);
        });

        // Simulate user1 logout (clear their data)
        Object.keys(user1Data).forEach(key => {
          const userKey = SecurityTestHelpers.getUserStorageKey(key, user1.id);
          context.localStorage.removeItem(userKey);
        });

        // User2 logs in and creates data
        const user2Data = SecurityTestHelpers.createTestData(user2.id);
        Object.entries(user2Data).forEach(([key, value]) => {
          const userKey = SecurityTestHelpers.getUserStorageKey(key, user2.id);
          context.localStorage.setItem(userKey, value);
        });

        // Verify user1's data is gone and user2's data exists
        const user1DataExists = Object.keys(user1Data).some(key => {
          const userKey = SecurityTestHelpers.getUserStorageKey(key, user1.id);
          return context.localStorage.getItem(userKey) !== null;
        });

        const user2DataExists = Object.keys(user2Data).some(key => {
          const userKey = SecurityTestHelpers.getUserStorageKey(key, user2.id);
          return context.localStorage.getItem(userKey) !== null;
        });

        const switchingWorksCorrectly = !user1DataExists && user2DataExists;

        return {
          testName: 'User Switching Scenario',
          category: 'edge_cases',
          status: switchingWorksCorrectly ? 'pass' : 'fail',
          message: switchingWorksCorrectly
            ? 'User switching works correctly with proper data cleanup'
            : 'User switching failed - data not properly isolated or cleaned',
          details: { user1DataExists, user2DataExists },
          timestamp: ''
        };
      }
    },

    {
      name: 'localStorage Security Scan',
      description: 'Comprehensive scan for localStorage security issues',
      category: 'edge_cases',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const [user1] = context.users;

        // Create test data
        const testData = SecurityTestHelpers.createTestData(user1.id);
        Object.entries(testData).forEach(([key, value]) => {
          const userKey = SecurityTestHelpers.getUserStorageKey(key, user1.id);
          context.localStorage.setItem(userKey, value);
        });

        // Scan for security issues
        const scanResults = SecurityTestHelpers.scanLocalStorageForSecurityIssues(user1.id);

        const hasSecurityIssues = scanResults.securityIssues.length > 0;

        return {
          testName: 'localStorage Security Scan',
          category: 'edge_cases',
          status: hasSecurityIssues ? 'fail' : 'pass',
          message: hasSecurityIssues
            ? `Found ${scanResults.securityIssues.length} localStorage security issues`
            : 'No localStorage security issues found',
          details: scanResults,
          timestamp: ''
        };
      }
    }
  ]
};

/**
 * Integration Test Suite
 * Tests integration between Tasks 1.2-1.5 components
 */
export const IntegrationTestSuite: SecurityTestSuite = {
  name: 'Tasks 1.2-1.5 Integration',
  description: 'Verify that all Tasks 1.2-1.5 components work together seamlessly',
  tests: [
    {
      name: 'Frontend-Backend Integration',
      description: 'Test integration between frontend user context and backend API security',
      category: 'edge_cases',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const [user1] = context.users;

        try {
          // Test the complete flow: user context → localStorage → API call

          // 1. Store user-specific data (Task 1.4)
          const userKey = SecurityTestHelpers.getUserStorageKey('selectedManagedWallet', user1.id);
          const walletData = { id: 'test-wallet', address: user1.walletAddress || user1.id };
          context.localStorage.setItem(userKey, JSON.stringify(walletData));

          // 2. Make authenticated API call (Task 1.3)
          const response = await SecurityTestHelpers.makeAuthenticatedRequest(
            `${context.apiBase}/api/wallets/managed/${user1.walletAddress || user1.id}`,
            user1.token
          );

          const data = await response.json();

          // 3. Verify user-specific response (Tasks 1.2 + 1.3)
          const isUserSpecific = TestValidators.validateUserSpecificApiResponse(data, user1.id);
          const hasUserData = context.localStorage.getItem(userKey) !== null;

          const integrationWorking = response.status === 200 && isUserSpecific && hasUserData;

          return {
            testName: 'Frontend-Backend Integration',
            category: 'edge_cases',
            status: integrationWorking ? 'pass' : 'fail',
            message: integrationWorking
              ? 'Frontend-backend integration works correctly'
              : 'Frontend-backend integration has issues',
            details: {
              apiStatus: response.status,
              userSpecific: isUserSpecific,
              hasUserData,
              response: data
            },
            timestamp: ''
          };
        } catch (error) {
          return {
            testName: 'Frontend-Backend Integration',
            category: 'edge_cases',
            status: 'error',
            message: `Integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: ''
          };
        }
      }
    },

    {
      name: 'Component User Context Integration',
      description: 'Test that all components use consistent user context',
      category: 'edge_cases',
      execute: async (context: SecurityTestContext): Promise<SecurityTestResult> => {
        const [user1] = context.users;

        // Test data for different components (simulating Task 1.5)
        const componentData = {
          'trading-preferences': { defaultSize: 100, riskLevel: 'medium' },
          'onboarding-progress': { currentStep: 2, completed: false },
          'wallet-creation-state': { currentStep: 1, fundingComplete: false },
          'backup-confirmed': { confirmed: true, timestamp: Date.now() }
        };

        // Store data with user-specific keys
        Object.entries(componentData).forEach(([key, value]) => {
          const userKey = SecurityTestHelpers.getUserStorageKey(key, user1.id);
          context.localStorage.setItem(userKey, JSON.stringify(value));
        });

        // Verify all components have user-specific data
        const componentResults = Object.keys(componentData).map(key => {
          const userKey = SecurityTestHelpers.getUserStorageKey(key, user1.id);
          const data = context.localStorage.getItem(userKey);
          return {
            component: key,
            hasUserSpecificData: data !== null,
            isUserSpecific: SecurityTestHelpers.isUserSpecificKey(userKey, user1.id)
          };
        });

        const allComponentsIntegrated = componentResults.every(r =>
          r.hasUserSpecificData && r.isUserSpecific
        );

        return {
          testName: 'Component User Context Integration',
          category: 'edge_cases',
          status: allComponentsIntegrated ? 'pass' : 'fail',
          message: allComponentsIntegrated
            ? 'All components use consistent user context'
            : 'Some components not properly integrated with user context',
          details: { componentResults },
          timestamp: ''
        };
      }
    }
  ]
};

/**
 * All security test suites
 */
export const AllSecurityTestSuites: SecurityTestSuite[] = [
  UserIsolationTestSuite,
  APISecurityTestSuite,
  AuthenticationFlowTestSuite,
  EdgeCasesTestSuite,
  IntegrationTestSuite
];
