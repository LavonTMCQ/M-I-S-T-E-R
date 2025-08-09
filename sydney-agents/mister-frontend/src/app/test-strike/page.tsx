'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';

// Extend Window interface for Cardano wallet
declare global {
  interface Window {
    cardano?: {
      [key: string]: {
        enable(): Promise<{
          signTx(cbor: string, partialSign?: boolean): Promise<string>;
          submitTx(cbor: string): Promise<string>;
        }>;
      };
    };
  }
}

interface TestResult {
  endpoint: string;
  method: string;
  status: 'success' | 'error' | 'loading';
  response?: any;
  error?: string;
  timestamp: string;
}

export default function ComprehensiveStrikeTestPage() {
  const { toast } = useToast();
  const { mainWallet } = useWallet();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tradeSize, setTradeSize] = useState('10');

  // Form states for different endpoints
  const [openPositionForm, setOpenPositionForm] = useState({
    collateralAmount: '50',
    leverage: '2',
    position: 'Long' as 'Long' | 'Short',
    assetTicker: 'ADA',
    stopLossPrice: '',
    takeProfitPrice: ''
  });

  const [closePositionForm, setClosePositionForm] = useState({
    txHash: '',
    outputIndex: '0',
    assetTicker: 'ADA'
  });

  const [updatePositionForm, setUpdatePositionForm] = useState({
    txHash: '',
    outputIndex: '0',
    stopLossPrice: '0.4',
    takeProfitPrice: '0.6',
    assetTicker: 'ADA'
  });

  const [liquidityForm, setLiquidityForm] = useState({
    amount: '1000',
    assetTicker: 'ADA'
  });

  const addTestResult = (result: TestResult) => {
    console.log(`${result.method} ${result.endpoint}:`, result);
    setTestResults(prev => [result, ...prev]);
  };

  const makeStrikeAPICall = async (
    endpoint: string,
    method: 'GET' | 'POST',
    data?: any
  ): Promise<TestResult> => {
    const timestamp = new Date().toISOString();
    const testResult: TestResult = {
      endpoint,
      method,
      status: 'loading',
      timestamp
    };

    try {
      // Use our Railway proxy instead of direct Strike Finance calls
      const url = `https://friendly-reprieve-production.up.railway.app/api/strike${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (data && method === 'POST') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const responseData = await response.text();

      // Try to parse as JSON, fallback to text
      let parsedData;
      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = responseData;
      }

      if (response.ok) {
        testResult.status = 'success';
        testResult.response = parsedData;
      } else {
        testResult.status = 'error';
        testResult.error = `HTTP ${response.status}: ${response.statusText}`;
        testResult.response = parsedData;
      }
    } catch (error) {
      testResult.status = 'error';
      testResult.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return testResult;
  };

  // Test individual API endpoints
  const testGetPositions = async () => {
    if (!mainWallet?.address) {
      toast({ title: "No Wallet", description: "Connect wallet first", variant: "destructive" });
      return;
    }

    const result = await makeStrikeAPICall(
      `/api/perpetuals/getPositions?address=${mainWallet.address}`,
      'GET'
    );
    addTestResult(result);
  };

  const testGetOverallInfo = async () => {
    const result = await makeStrikeAPICall('/api/perpetuals/getOverallInfo', 'GET');
    addTestResult(result);
  };

  const testGetPoolInfo = async () => {
    const result = await makeStrikeAPICall('/api/perpetuals/getPoolInfo', 'GET');
    addTestResult(result);
  };

  const testGetPoolInfoV2 = async () => {
    const result = await makeStrikeAPICall('/api/perpetuals/getPoolInfoV2', 'GET');
    addTestResult(result);
  };

  const testGetLPProfit = async () => {
    const result = await makeStrikeAPICall('/api/perpetuals/getLPProfit', 'GET');
    addTestResult(result);
  };

  const testGetPerpetualHistory = async () => {
    if (!mainWallet?.address) {
      toast({ title: "No Wallet", description: "Connect wallet first", variant: "destructive" });
      return;
    }

    const result = await makeStrikeAPICall(
      `/api/perpetuals/getPerpetualHistory?address=${mainWallet.address}`,
      'GET'
    );
    addTestResult(result);
  };

  const testGetLiquidityHistory = async () => {
    if (!mainWallet?.address) {
      toast({ title: "No Wallet", description: "Connect wallet first", variant: "destructive" });
      return;
    }

    const result = await makeStrikeAPICall(
      `/api/perpetuals/getLiquidityHistoryTransactions?address=${mainWallet.address}`,
      'GET'
    );
    addTestResult(result);
  };

  const testGetTradeHistory = async () => {
    const result = await makeStrikeAPICall('/api/perpetuals/getTradeHistory', 'GET');
    addTestResult(result);
  };

  const testGetOpenOrders = async () => {
    const result = await makeStrikeAPICall('/api/perpetuals/getOpenOrders', 'GET');
    addTestResult(result);
  };

  const testOpenPosition = async () => {
    if (!mainWallet?.address) {
      toast({ title: "No Wallet", description: "Connect wallet first", variant: "destructive" });
      return;
    }

    const requestData = {
      request: {
        address: mainWallet.address,
        asset: {
          policyId: "",
          assetName: ""
        },
        assetTicker: openPositionForm.assetTicker,
        collateralAmount: parseFloat(openPositionForm.collateralAmount),
        leverage: parseFloat(openPositionForm.leverage),
        position: openPositionForm.position,
        enteredPositionTime: Math.floor(Date.now() / 1000),
        ...(openPositionForm.stopLossPrice && { stopLossPrice: parseFloat(openPositionForm.stopLossPrice) }),
        ...(openPositionForm.takeProfitPrice && { takeProfitPrice: parseFloat(openPositionForm.takeProfitPrice) })
      }
    };

    const result = await makeStrikeAPICall('/api/perpetuals/openPosition', 'POST', requestData);
    addTestResult(result);
  };

  const testClosePosition = async () => {
    if (!mainWallet?.address) {
      toast({ title: "No Wallet", description: "Connect wallet first", variant: "destructive" });
      return;
    }

    const requestData = {
      request: {
        address: mainWallet.address,
        asset: {
          policyId: "",
          assetName: ""
        },
        assetTicker: closePositionForm.assetTicker,
        outRef: {
          txHash: closePositionForm.txHash,
          outputIndex: parseInt(closePositionForm.outputIndex)
        },
        enteredPositionTime: Math.floor(Date.now() / 1000)
      }
    };

    const result = await makeStrikeAPICall('/api/perpetuals/closePosition', 'POST', requestData);
    addTestResult(result);
  };

  const testUpdatePosition = async () => {
    if (!mainWallet?.address) {
      toast({ title: "No Wallet", description: "Connect wallet first", variant: "destructive" });
      return;
    }

    const requestData = {
      request: {
        address: mainWallet.address,
        asset: {
          policyId: "",
          assetName: ""
        },
        assetTicker: updatePositionForm.assetTicker,
        outRef: {
          txHash: updatePositionForm.txHash,
          outputIndex: parseInt(updatePositionForm.outputIndex)
        },
        stopLossPrice: parseFloat(updatePositionForm.stopLossPrice),
        takeProfitPrice: parseFloat(updatePositionForm.takeProfitPrice)
      }
    };

    const result = await makeStrikeAPICall('/api/perpetuals/updatePosition', 'POST', requestData);
    addTestResult(result);
  };

  const testProvideLiquidity = async () => {
    if (!mainWallet?.address) {
      toast({ title: "No Wallet", description: "Connect wallet first", variant: "destructive" });
      return;
    }

    const requestData = {
      request: {
        address: mainWallet.address,
        asset: {
          policyId: "",
          assetName: ""
        },
        amount: parseFloat(liquidityForm.amount) * 1000000 // Convert to lovelace
      }
    };

    const result = await makeStrikeAPICall('/api/perpetuals/provideLiquidity', 'POST', requestData);
    addTestResult(result);
  };

  const testWithdrawLiquidity = async () => {
    if (!mainWallet?.address) {
      toast({ title: "No Wallet", description: "Connect wallet first", variant: "destructive" });
      return;
    }

    const requestData = {
      request: {
        address: mainWallet.address,
        asset: {
          policyId: "",
          assetName: ""
        },
        amount: parseFloat(liquidityForm.amount) * 1000000 // Convert to lovelace
      }
    };

    const result = await makeStrikeAPICall('/api/perpetuals/withdrawLiquidity', 'POST', requestData);
    addTestResult(result);
  };

  const testAllReadOnlyEndpoints = async () => {
    setIsLoading(true);
    toast({ title: "Testing All Read-Only Endpoints", description: "Running comprehensive tests..." });

    const tests = [
      testGetOverallInfo,
      testGetPoolInfo,
      testGetPoolInfoV2,
      testGetLPProfit,
      testGetTradeHistory,
      testGetOpenOrders,
      testGetPositions,
      testGetPerpetualHistory,
      testGetLiquidityHistory
    ];

    for (const test of tests) {
      await test();
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
    }

    setIsLoading(false);
    toast({ title: "Complete", description: "All read-only endpoint tests finished" });
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testStrikeIntegration = async () => {
    if (!mainWallet?.address) {
      toast({
        title: "No Wallet Connected",
        description: "Please connect a wallet first",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTestResults([]);

    try {
      const addLog = (message: string) => {
        console.log(message);
        setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
      };

      addLog('🚀 Starting Strike Finance integration test...');
      addLog(`📍 Using wallet address: ${mainWallet.address.substring(0, 20)}...`);

      // Test Strike Finance API endpoints
      addLog('📡 Testing Strike Finance API endpoints...');

      // Test getPositions via proxy
      try {
        const response = await fetch(`https://friendly-reprieve-production.up.railway.app/api/strike/perpetuals/getPositions?address=${mainWallet.address}`);
        const data = await response.text();

        if (response.ok) {
          addLog('✅ getPositions API successful (via proxy)');
          addLog(`📊 Response: ${data.substring(0, 100)}...`);
        } else {
          addLog(`❌ getPositions failed: ${response.status} ${response.statusText}`);
          addLog(`📄 Response: ${data.substring(0, 200)}...`);
        }
      } catch (error) {
        addLog(`❌ getPositions error: ${error}`);
      }

      // Test getOverallInfo via proxy
      try {
        const response = await fetch('https://friendly-reprieve-production.up.railway.app/api/strike/perpetuals/getOverallInfo');
        const data = await response.text();

        if (response.ok) {
          addLog('✅ getOverallInfo API successful (via proxy)');
          addLog(`📊 Response: ${data.substring(0, 100)}...`);
        } else {
          addLog(`❌ getOverallInfo failed: ${response.status} ${response.statusText}`);
          addLog(`📄 Response: ${data.substring(0, 200)}...`);
        }
      } catch (error) {
        addLog(`❌ getOverallInfo error: ${error}`);
      }

      addLog('🎯 Strike Finance API test completed. Check comprehensive test page for detailed testing.');

      toast({
        title: "Test Complete",
        description: "Check the comprehensive test page for detailed API testing",
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Test error:', error);

      toast({
        title: "Test Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Strike Finance Integration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tradeSize">Trade Size (ADA)</Label>
            <Input
              id="tradeSize"
              type="number"
              value={tradeSize}
              onChange={(e) => setTradeSize(e.target.value)}
              placeholder="10"
              min="1"
              max="100"
            />
          </div>

          <Button 
            onClick={testStrikeIntegration}
            disabled={isLoading || !mainWallet?.address}
            className="w-full"
          >
            {isLoading ? 'Testing...' : 'Test Strike Integration'}
          </Button>

          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div key={index}>{result}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
