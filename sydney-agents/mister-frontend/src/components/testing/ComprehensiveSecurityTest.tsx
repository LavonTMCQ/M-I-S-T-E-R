/**
 * Comprehensive Security Testing Component
 * Provides UI for running all security tests and viewing results
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Play,
  RotateCcw,
  Download
} from 'lucide-react';

import { 
  SecurityTestFramework, 
  SecurityTestResult, 
  SecurityTestContext,
  SecurityTestHelpers 
} from '@/lib/testing/securityTestFramework';
import { AllSecurityTestSuites } from '@/lib/testing/securityTestSuites';
import { useUserIdentity } from '@/hooks/useUserIdentity';

interface TestProgress {
  current: number;
  total: number;
  currentTest: string;
}

export function ComprehensiveSecurityTest() {
  const { userStorage, userId, userIdentity, isAuthenticated } = useUserIdentity();
  const [testResults, setTestResults] = useState<SecurityTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testProgress, setTestProgress] = useState<TestProgress>({ current: 0, total: 0, currentTest: '' });
  const [selectedSuite, setSelectedSuite] = useState<string>('all');

  /**
   * Run security tests
   */
  const runSecurityTests = async (suiteFilter?: string) => {
    if (!isAuthenticated) {
      console.warn('⚠️ User not authenticated - cannot run security tests');
      return;
    }

    setIsRunningTests(true);
    setTestResults([]);

    try {
      // Create test context
      const testUsers = SecurityTestHelpers.createTestUsers();
      const context: SecurityTestContext = {
        users: testUsers,
        apiBase: 'https://bridge-server-cjs-production.up.railway.app',
        currentUser: testUsers[0],
        localStorage: window.localStorage,
        fetch: window.fetch
      };

      // Create test framework
      const framework = new SecurityTestFramework(context);

      // Filter test suites if specified
      const suitesToRun = suiteFilter === 'all' 
        ? AllSecurityTestSuites 
        : AllSecurityTestSuites.filter(suite => suite.name.toLowerCase().includes(suiteFilter?.toLowerCase() || ''));

      // Calculate total tests
      const totalTests = suitesToRun.reduce((sum, suite) => sum + suite.tests.length, 0);
      setTestProgress({ current: 0, total: totalTests, currentTest: '' });

      let currentTestIndex = 0;

      // Run test suites
      for (const suite of suitesToRun) {
        console.log(`🔒 Running test suite: ${suite.name}`);
        
        for (const test of suite.tests) {
          setTestProgress({ 
            current: currentTestIndex + 1, 
            total: totalTests, 
            currentTest: test.name 
          });

          const result = await framework.runTest(test);
          setTestResults(prev => [...prev, result]);

          currentTestIndex++;
          
          // Small delay between tests for UI updates
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log('✅ Security testing completed');
    } catch (error) {
      console.error('❌ Security testing failed:', error);
    } finally {
      setIsRunningTests(false);
      setTestProgress({ current: 0, total: 0, currentTest: '' });
    }
  };

  /**
   * Clear test results
   */
  const clearResults = () => {
    setTestResults([]);
  };

  /**
   * Export test results
   */
  const exportResults = () => {
    const summary = getTestSummary();
    const exportData = {
      timestamp: new Date().toISOString(),
      summary,
      results: testResults
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mister-security-test-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Get test results summary
   */
  const getTestSummary = () => {
    const total = testResults.length;
    const passed = testResults.filter(r => r.status === 'pass').length;
    const failed = testResults.filter(r => r.status === 'fail').length;
    const warnings = testResults.filter(r => r.status === 'warning').length;
    const errors = testResults.filter(r => r.status === 'error').length;

    return {
      total,
      passed,
      failed,
      warnings,
      errors,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0
    };
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: SecurityTestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-700" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  /**
   * Get status badge variant
   */
  const getStatusBadgeVariant = (status: SecurityTestResult['status']) => {
    switch (status) {
      case 'pass':
        return 'default';
      case 'fail':
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Please authenticate to run comprehensive security tests
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = getTestSummary();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Comprehensive Security Testing
            <Badge variant={userId ? 'default' : 'secondary'}>
              {userId ? 'User Authenticated' : 'No User'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Comprehensive security testing for user isolation, API security, authentication flows, and edge cases.
            Tests verify that Tasks 1.2-1.5 work together seamlessly.
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => runSecurityTests('all')} 
              variant="default" 
              size="sm"
              disabled={isRunningTests}
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            
            <Button 
              onClick={() => runSecurityTests('isolation')} 
              variant="outline" 
              size="sm"
              disabled={isRunningTests}
            >
              User Isolation
            </Button>
            
            <Button 
              onClick={() => runSecurityTests('api')} 
              variant="outline" 
              size="sm"
              disabled={isRunningTests}
            >
              API Security
            </Button>
            
            <Button 
              onClick={() => runSecurityTests('authentication')} 
              variant="outline" 
              size="sm"
              disabled={isRunningTests}
            >
              Authentication
            </Button>
            
            <Button 
              onClick={() => runSecurityTests('edge')} 
              variant="outline" 
              size="sm"
              disabled={isRunningTests}
            >
              Edge Cases
            </Button>

            <Button onClick={clearResults} variant="ghost" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>

            {testResults.length > 0 && (
              <Button onClick={exportResults} variant="ghost" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>

          {isRunningTests && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Running: {testProgress.currentTest}</span>
                <span>{testProgress.current} / {testProgress.total}</span>
              </div>
              <Progress 
                value={(testProgress.current / testProgress.total) * 100} 
                className="w-full"
              />
            </div>
          )}

          {testResults.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{summary.passed}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{summary.warnings}</div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{summary.passRate}%</div>
                <div className="text-sm text-muted-foreground">Pass Rate</div>
              </div>
            </div>
          )}

          {summary.failed > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {summary.failed} security test(s) failed. Please review the results and address any security issues before production deployment.
              </AlertDescription>
            </Alert>
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
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.testName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {result.category.replace('_', ' ')}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(result.status)}>
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    {result.message}
                  </div>

                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}

                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(result.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
