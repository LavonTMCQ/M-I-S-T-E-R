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
      `/perpetuals/getPositions?address=${mainWallet.address}`,
      'GET'
    );
    addTestResult(result);
  };

  const testGetOverallInfo = async () => {
    const result = await makeStrikeAPICall('/perpetuals/getOverallInfo', 'GET');
    addTestResult(result);
  };

  const testGetPoolInfo = async () => {
    const result = await makeStrikeAPICall('/perpetuals/getPoolInfo', 'GET');
    addTestResult(result);
  };

  const testGetPoolInfoV2 = async () => {
    const result = await makeStrikeAPICall('/perpetuals/getPoolInfoV2', 'GET');
    addTestResult(result);
  };

  const testGetLPProfit = async () => {
    const result = await makeStrikeAPICall('/perpetuals/getLPProfit', 'GET');
    addTestResult(result);
  };

  const testGetPerpetualHistory = async () => {
    if (!mainWallet?.address) {
      toast({ title: "No Wallet", description: "Connect wallet first", variant: "destructive" });
      return;
    }

    const result = await makeStrikeAPICall(
      `/perpetuals/getPerpetualHistory?address=${mainWallet.address}`,
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
      `/perpetuals/getLiquidityHistoryTransactions?address=${mainWallet.address}`,
      'GET'
    );
    addTestResult(result);
  };

  const testGetTradeHistory = async () => {
    const result = await makeStrikeAPICall('/perpetuals/getTradeHistory', 'GET');
    addTestResult(result);
  };

  const testGetOpenOrders = async () => {
    const result = await makeStrikeAPICall('/perpetuals/getOpenOrders', 'GET');
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

    const result = await makeStrikeAPICall('/perpetuals/openPosition', 'POST', requestData);
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

    const result = await makeStrikeAPICall('/perpetuals/closePosition', 'POST', requestData);
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

    const result = await makeStrikeAPICall('/perpetuals/updatePosition', 'POST', requestData);
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

    const result = await makeStrikeAPICall('/perpetuals/provideLiquidity', 'POST', requestData);
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

    const result = await makeStrikeAPICall('/perpetuals/withdrawLiquidity', 'POST', requestData);
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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            🎯 Comprehensive Strike Finance API Test Suite
            <Badge variant="outline">
              {mainWallet?.address ? `Connected: ${mainWallet.address.slice(0, 8)}...` : 'No Wallet'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button onClick={testAllReadOnlyEndpoints} disabled={isLoading}>
              {isLoading ? 'Testing...' : 'Test All Read-Only Endpoints'}
            </Button>
            <Button onClick={clearResults} variant="outline">
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - API Tests */}
        <div className="space-y-6">
          <Tabs defaultValue="read-only" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="read-only">Read-Only</TabsTrigger>
              <TabsTrigger value="trading">Trading</TabsTrigger>
              <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="read-only" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>📊 Market Data & Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={testGetOverallInfo} className="w-full justify-start">
                    📈 Get Overall Info
                  </Button>
                  <Button onClick={testGetPoolInfo} className="w-full justify-start">
                    🏊 Get Pool Info
                  </Button>
                  <Button onClick={testGetPoolInfoV2} className="w-full justify-start">
                    🏊 Get Pool Info V2
                  </Button>
                  <Button onClick={testGetLPProfit} className="w-full justify-start">
                    💰 Get LP Profit
                  </Button>
                  <Button onClick={testGetTradeHistory} className="w-full justify-start">
                    📜 Get Trade History
                  </Button>
                  <Button onClick={testGetOpenOrders} className="w-full justify-start">
                    📋 Get Open Orders
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>👤 User-Specific Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={testGetPositions} className="w-full justify-start" disabled={!mainWallet?.address}>
                    🎯 Get My Positions
                  </Button>
                  <Button onClick={testGetPerpetualHistory} className="w-full justify-start" disabled={!mainWallet?.address}>
                    📊 Get My Perpetual History
                  </Button>
                  <Button onClick={testGetLiquidityHistory} className="w-full justify-start" disabled={!mainWallet?.address}>
                    💧 Get My Liquidity History
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trading" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>🚀 Open Position</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Collateral Amount (ADA)</Label>
                      <Input
                        type="number"
                        value={openPositionForm.collateralAmount}
                        onChange={(e) => setOpenPositionForm(prev => ({ ...prev, collateralAmount: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Leverage</Label>
                      <Select value={openPositionForm.leverage} onValueChange={(value) => setOpenPositionForm(prev => ({ ...prev, leverage: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1x</SelectItem>
                          <SelectItem value="2">2x</SelectItem>
                          <SelectItem value="3">3x</SelectItem>
                          <SelectItem value="5">5x</SelectItem>
                          <SelectItem value="10">10x</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Position</Label>
                      <Select value={openPositionForm.position} onValueChange={(value: 'Long' | 'Short') => setOpenPositionForm(prev => ({ ...prev, position: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Long">🟢 Long</SelectItem>
                          <SelectItem value="Short">🔴 Short</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Asset</Label>
                      <Select value={openPositionForm.assetTicker} onValueChange={(value) => setOpenPositionForm(prev => ({ ...prev, assetTicker: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADA">ADA</SelectItem>
                          <SelectItem value="BTC">BTC</SelectItem>
                          <SelectItem value="ETH">ETH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Stop Loss Price (Optional)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={openPositionForm.stopLossPrice}
                        onChange={(e) => setOpenPositionForm(prev => ({ ...prev, stopLossPrice: e.target.value }))}
                        placeholder="0.40"
                      />
                    </div>
                    <div>
                      <Label>Take Profit Price (Optional)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={openPositionForm.takeProfitPrice}
                        onChange={(e) => setOpenPositionForm(prev => ({ ...prev, takeProfitPrice: e.target.value }))}
                        placeholder="0.60"
                      />
                    </div>
                  </div>
                  <Button onClick={testOpenPosition} className="w-full" disabled={!mainWallet?.address}>
                    🚀 Test Open Position
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>❌ Close Position</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Transaction Hash</Label>
                    <Input
                      value={closePositionForm.txHash}
                      onChange={(e) => setClosePositionForm(prev => ({ ...prev, txHash: e.target.value }))}
                      placeholder="Enter transaction hash of position to close"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Output Index</Label>
                      <Input
                        type="number"
                        value={closePositionForm.outputIndex}
                        onChange={(e) => setClosePositionForm(prev => ({ ...prev, outputIndex: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Asset</Label>
                      <Select value={closePositionForm.assetTicker} onValueChange={(value) => setClosePositionForm(prev => ({ ...prev, assetTicker: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADA">ADA</SelectItem>
                          <SelectItem value="BTC">BTC</SelectItem>
                          <SelectItem value="ETH">ETH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={testClosePosition} className="w-full" disabled={!mainWallet?.address}>
                    ❌ Test Close Position
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="liquidity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>💧 Liquidity Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Amount (ADA)</Label>
                      <Input
                        type="number"
                        value={liquidityForm.amount}
                        onChange={(e) => setLiquidityForm(prev => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Asset</Label>
                      <Select value={liquidityForm.assetTicker} onValueChange={(value) => setLiquidityForm(prev => ({ ...prev, assetTicker: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADA">ADA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Button onClick={testProvideLiquidity} disabled={!mainWallet?.address}>
                      ➕ Test Provide Liquidity
                    </Button>
                    <Button onClick={testWithdrawLiquidity} disabled={!mainWallet?.address}>
                      ➖ Test Withdraw Liquidity
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>🔧 Update Position</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Transaction Hash</Label>
                    <Input
                      value={updatePositionForm.txHash}
                      onChange={(e) => setUpdatePositionForm(prev => ({ ...prev, txHash: e.target.value }))}
                      placeholder="Enter transaction hash of position to update"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Output Index</Label>
                      <Input
                        type="number"
                        value={updatePositionForm.outputIndex}
                        onChange={(e) => setUpdatePositionForm(prev => ({ ...prev, outputIndex: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Stop Loss Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={updatePositionForm.stopLossPrice}
                        onChange={(e) => setUpdatePositionForm(prev => ({ ...prev, stopLossPrice: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Take Profit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={updatePositionForm.takeProfitPrice}
                        onChange={(e) => setUpdatePositionForm(prev => ({ ...prev, takeProfitPrice: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button onClick={testUpdatePosition} className="w-full" disabled={!mainWallet?.address}>
                    🔧 Test Update Position
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Results */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                📊 Test Results
                <Badge variant="secondary">{testResults.length} tests</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[800px] overflow-y-auto">
                {testResults.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No tests run yet. Click any test button to start.
                  </div>
                ) : (
                  testResults.map((result, index) => (
                    <Card key={index} className={`border-l-4 ${
                      result.status === 'success' ? 'border-l-green-500' :
                      result.status === 'error' ? 'border-l-red-500' :
                      'border-l-yellow-500'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              result.status === 'success' ? 'default' :
                              result.status === 'error' ? 'destructive' :
                              'secondary'
                            }>
                              {result.method}
                            </Badge>
                            <span className="font-mono text-sm">{result.endpoint}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </Badge>
                        </div>

                        {result.status === 'success' && (
                          <div className="bg-green-50 p-3 rounded text-sm">
                            <div className="font-semibold text-green-800 mb-1">✅ Success</div>
                            <pre className="text-green-700 whitespace-pre-wrap overflow-x-auto">
                              {typeof result.response === 'string'
                                ? result.response.length > 200
                                  ? result.response.substring(0, 200) + '...'
                                  : result.response
                                : JSON.stringify(result.response, null, 2).substring(0, 300) + '...'
                              }
                            </pre>
                          </div>
                        )}

                        {result.status === 'error' && (
                          <div className="bg-red-50 p-3 rounded text-sm">
                            <div className="font-semibold text-red-800 mb-1">❌ Error</div>
                            <div className="text-red-700">{result.error}</div>
                            {result.response && (
                              <pre className="text-red-600 mt-2 whitespace-pre-wrap overflow-x-auto">
                                {typeof result.response === 'string'
                                  ? result.response.length > 200
                                    ? result.response.substring(0, 200) + '...'
                                    : result.response
                                  : JSON.stringify(result.response, null, 2).substring(0, 300) + '...'
                                }
                              </pre>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
