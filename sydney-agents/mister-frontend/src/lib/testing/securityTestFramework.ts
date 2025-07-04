/**
 * Comprehensive Security Testing Framework
 * Tests user isolation, authentication, and API security across the entire MISTER application
 */

export interface SecurityTestResult {
  testName: string;
  category: 'user_isolation' | 'api_security' | 'authentication' | 'edge_cases';
  status: 'pass' | 'fail' | 'warning' | 'error';
  message: string;
  details?: any;
  timestamp: string;
}

export interface TestUser {
  id: string;
  type: 'wallet' | 'email';
  token: string;
  walletAddress?: string;
  stakeAddress?: string;
  email?: string;
  handle?: string;
}

export interface SecurityTestSuite {
  name: string;
  description: string;
  tests: SecurityTest[];
}

export interface SecurityTest {
  name: string;
  description: string;
  category: SecurityTestResult['category'];
  execute: (context: SecurityTestContext) => Promise<SecurityTestResult>;
}

export interface SecurityTestContext {
  users: TestUser[];
  apiBase: string;
  currentUser?: TestUser;
  localStorage: Storage;
  fetch: typeof fetch;
}

/**
 * Security Test Framework Class
 */
export class SecurityTestFramework {
  private context: SecurityTestContext;
  private results: SecurityTestResult[] = [];

  constructor(context: SecurityTestContext) {
    this.context = context;
  }

  /**
   * Run a single security test
   */
  async runTest(test: SecurityTest): Promise<SecurityTestResult> {
    try {
      console.log(`🧪 Running security test: ${test.name}`);
      const result = await test.execute(this.context);
      result.timestamp = new Date().toISOString();
      this.results.push(result);
      return result;
    } catch (error) {
      const errorResult: SecurityTestResult = {
        testName: test.name,
        category: test.category,
        status: 'error',
        message: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
      this.results.push(errorResult);
      return errorResult;
    }
  }

  /**
   * Run a test suite
   */
  async runTestSuite(suite: SecurityTestSuite): Promise<SecurityTestResult[]> {
    console.log(`🔒 Running security test suite: ${suite.name}`);
    const suiteResults: SecurityTestResult[] = [];

    for (const test of suite.tests) {
      const result = await this.runTest(test);
      suiteResults.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return suiteResults;
  }

  /**
   * Run all test suites
   */
  async runAllTests(suites: SecurityTestSuite[]): Promise<SecurityTestResult[]> {
    console.log('🔐 Starting comprehensive security testing...');
    this.results = [];

    for (const suite of suites) {
      await this.runTestSuite(suite);
    }

    return this.results;
  }

  /**
   * Get test results summary
   */
  getTestSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const errors = this.results.filter(r => r.status === 'error').length;

    return {
      total,
      passed,
      failed,
      warnings,
      errors,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      results: this.results
    };
  }

  /**
   * Clear test results
   */
  clearResults() {
    this.results = [];
  }
}

/**
 * Helper functions for security testing
 */
export const SecurityTestHelpers = {
  /**
   * Create test users for testing
   */
  createTestUsers(): TestUser[] {
    return [
      {
        id: 'addr1qy267ne8rajf6qdx4r9y2ue6rd9fzn4af8thekjf5w92csqtjnzjg7j355nndjvaefaw5u98zcrx0kt2euvwer9asx5stz0t90',
        type: 'wallet',
        token: 'mister_token_1234567890_test1',
        walletAddress: 'addr1qy267ne8rajf6qdx4r9y2ue6rd9fzn4af8thekjf5w92csqtjnzjg7j355nndjvaefaw5u98zcrx0kt2euvwer9asx5stz0t90',
        stakeAddress: 'stake1u9nskqht2mv36p90a5cf5kr8j99undr7mkhq0jntdj7pntgqfpmzy',
        handle: '$testuser1'
      },
      {
        id: 'temp_user_1234567890_test2',
        type: 'email',
        token: 'mock_token_temp_user_1234567890_test2',
        email: 'testuser2@example.com'
      },
      {
        id: 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2qd4a6gtpc6z3rqgr83dc',
        type: 'wallet',
        token: 'mister_token_0987654321_test3',
        walletAddress: 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2qd4a6gtpc6z3rqgr83dc',
        stakeAddress: 'stake1u8abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef',
        handle: '$testuser3'
      }
    ];
  },

  /**
   * Generate user-specific localStorage key
   */
  getUserStorageKey(key: string, userId: string): string {
    return `${key}_${userId}`;
  },

  /**
   * Create test data for localStorage
   */
  createTestData(userId: string) {
    return {
      'wallet-archive-status': JSON.stringify({ wallet1: true, wallet2: false }),
      'selectedManagedWallet': JSON.stringify({ id: `wallet_${userId}`, address: `addr_${userId}` }),
      'trading-preferences': JSON.stringify({ defaultSize: 100, riskLevel: 'medium' }),
      'onboarding-progress': JSON.stringify({ currentStep: 2, completed: false }),
      'dashboard-preferences': JSON.stringify({ theme: 'dark', layout: 'grid' }),
      'user-preferences': JSON.stringify({ notifications: true, sound: false })
    };
  },

  /**
   * Make authenticated API request
   */
  async makeAuthenticatedRequest(
    url: string, 
    token: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });
  },

  /**
   * Validate API response format
   */
  validateApiResponse(response: any): boolean {
    return (
      typeof response === 'object' &&
      response !== null &&
      typeof response.success === 'boolean'
    );
  },

  /**
   * Check if localStorage key is user-specific
   */
  isUserSpecificKey(key: string, userId: string): boolean {
    return key.endsWith(`_${userId}`);
  },

  /**
   * Scan localStorage for security issues
   */
  scanLocalStorageForSecurityIssues(userId: string): {
    userSpecificKeys: string[];
    globalKeys: string[];
    securityIssues: string[];
  } {
    const userSpecificKeys: string[] = [];
    const globalKeys: string[] = [];
    const securityIssues: string[] = [];

    // Known sensitive keys that should be user-specific
    const sensitiveKeys = [
      'wallet-archive-status',
      'selectedManagedWallet',
      'trading-preferences',
      'onboarding-progress',
      'dashboard-preferences',
      'user-preferences',
      'mainWallet',
      'auth_token'
    ];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (this.isUserSpecificKey(key, userId)) {
          userSpecificKeys.push(key);
        } else if (sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey))) {
          globalKeys.push(key);
          securityIssues.push(`Global key found: ${key} (should be user-specific)`);
        }
      }
    }

    return { userSpecificKeys, globalKeys, securityIssues };
  }
};

/**
 * Test result validation helpers
 */
export const TestValidators = {
  /**
   * Validate that API returns user-specific data only
   */
  validateUserSpecificApiResponse(response: any, expectedUserId: string): boolean {
    if (!response || !response.success) {
      return false;
    }

    // Check if response contains data that should be user-specific
    if (response.data) {
      // For managed wallets, check that all wallets belong to the user
      if (response.data.managedWallets) {
        return response.data.managedWallets.every((wallet: any) => 
          wallet.userId === expectedUserId || wallet.mainWalletAddress === expectedUserId
        );
      }

      // For user data, check that it matches the expected user
      if (response.data.userId) {
        return response.data.userId === expectedUserId;
      }
    }

    return true; // If no user-specific data to validate, consider it valid
  },

  /**
   * Validate that localStorage is properly isolated
   */
  validateLocalStorageIsolation(userId: string): boolean {
    const scan = SecurityTestHelpers.scanLocalStorageForSecurityIssues(userId);
    return scan.securityIssues.length === 0;
  },

  /**
   * Validate authentication token format
   */
  validateTokenFormat(token: string, userType: 'wallet' | 'email'): boolean {
    if (userType === 'wallet') {
      return token.startsWith('mister_token_');
    } else {
      return token.startsWith('mock_token_');
    }
  }
};
