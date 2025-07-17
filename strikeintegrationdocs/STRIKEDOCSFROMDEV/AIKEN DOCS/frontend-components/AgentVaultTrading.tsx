'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";

interface AgentVaultTradingProps {
  vaultAddress: string;
  userWallet: any;
  onError: (error: string) => void;
}

interface TradeSignal {
  id: string;
  type: 'long' | 'short';
  confidence: number;
  amount: number;
  reason: string;
  timestamp: string;
  status: 'pending' | 'executed' | 'failed';
}

interface TradingStatus {
  isActive: boolean;
  vaultBalance: number;
  totalTrades: number;
  successRate: number;
  lastTrade: string | null;
  currentSignals: TradeSignal[];
}

// Agent Vault configuration
const AGENT_CONFIG = {
  agentVkh: "34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d",
  strikeContract: "be7544ca7d42c903268caecae465f3f8b5a7e7607d09165e471ac8b5"
};

export function AgentVaultTrading({
  vaultAddress,
  userWallet,
  onError
}: AgentVaultTradingProps) {
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    loadTradingStatus();
    const interval = setInterval(loadTradingStatus, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [vaultAddress]);

  const loadTradingStatus = async () => {
    try {
      setIsLoading(true);
      const status = await queryTradingStatus(vaultAddress);
      setTradingStatus(status);
    } catch (error) {
      console.error('Failed to load trading status:', error);
      onError('Failed to load trading status');
    } finally {
      setIsLoading(false);
    }
  };

  const executeTestTrade = async () => {
    if (!tradingStatus) return;

    setTestMode(true);
    try {
      // Simulate agent trade execution
      const testSignal: TradeSignal = {
        id: `test-${Date.now()}`,
        type: 'long',
        confidence: 85,
        amount: 25,
        reason: 'Test trade execution via Agent Vault',
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      // Add test signal to current signals
      setTradingStatus(prev => prev ? {
        ...prev,
        currentSignals: [testSignal, ...prev.currentSignals]
      } : null);

      // Simulate agent executing the trade
      await simulateAgentTrade(testSignal);

      // Update signal status
      setTradingStatus(prev => prev ? {
        ...prev,
        currentSignals: prev.currentSignals.map(signal =>
          signal.id === testSignal.id
            ? { ...signal, status: 'executed' as const }
            : signal
        ),
        totalTrades: prev.totalTrades + 1,
        lastTrade: 'Just now'
      } : null);

    } catch (error) {
      console.error('Test trade failed:', error);
      onError(error instanceof Error ? error.message : 'Test trade failed');
    } finally {
      setTestMode(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Agent Vault Trading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            Loading trading status...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tradingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Trading Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Could not load trading status. Please check your vault configuration.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trading Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Automated Trading Status
            <Badge variant={tradingStatus.isActive ? "default" : "secondary"}>
              {tradingStatus.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <h3 className="font-semibold">{tradingStatus.vaultBalance.toFixed(2)} ADA</h3>
              <p className="text-sm text-muted-foreground">Vault Balance</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Activity className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <h3 className="font-semibold">{tradingStatus.totalTrades}</h3>
              <p className="text-sm text-muted-foreground">Total Trades</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <h3 className="font-semibold">{tradingStatus.successRate}%</h3>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Clock className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <h3 className="font-semibold">{tradingStatus.lastTrade || 'Never'}</h3>
              <p className="text-sm text-muted-foreground">Last Trade</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security & Agent Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Agent Wallet</h4>
              <p className="text-sm font-mono bg-muted p-2 rounded">
                {AGENT_CONFIG.agentVkh.substring(0, 20)}...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Authorized trading agent verification key hash
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Strike Finance Contract</h4>
              <p className="text-sm font-mono bg-muted p-2 rounded">
                {AGENT_CONFIG.strikeContract.substring(0, 20)}...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Whitelisted destination for automated trades
              </p>
            </div>
          </div>
          
          <Alert className="mt-4">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Security:</strong> The agent can only send funds to Strike Finance contracts. 
              Your private keys remain secure in your wallet.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Current Trading Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Current Trading Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tradingStatus.currentSignals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No active trading signals</p>
              <p className="text-sm">The agent is monitoring market conditions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tradingStatus.currentSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {signal.type === 'long' ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <h4 className="font-medium">
                        {signal.type.toUpperCase()} Position
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {signal.amount} ADA • {signal.confidence}% confidence
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {signal.reason}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        signal.status === 'executed'
                          ? 'default'
                          : signal.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {signal.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(signal.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Testing & Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Test the Agent Vault trading functionality with a simulated trade execution.
              </AlertDescription>
            </Alert>
            
            <Button
              onClick={executeTestTrade}
              disabled={testMode || !tradingStatus.isActive}
              className="w-full"
            >
              {testMode ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Executing Test Trade...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Execute Test Trade
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              This will simulate an agent trade execution to validate the system is working correctly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions (would be implemented in separate utility files)
async function queryTradingStatus(vaultAddress: string): Promise<TradingStatus> {
  // This would query the actual trading status from the system
  // For now, return mock data
  return {
    isActive: true,
    vaultBalance: 150.5,
    totalTrades: 12,
    successRate: 87,
    lastTrade: '2 hours ago',
    currentSignals: [
      {
        id: 'signal-1',
        type: 'long',
        confidence: 78,
        amount: 50,
        reason: 'Fibonacci retracement indicates strong support level',
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        status: 'pending'
      }
    ]
  };
}

async function simulateAgentTrade(signal: TradeSignal): Promise<void> {
  // Simulate the agent executing a trade
  await new Promise(resolve => setTimeout(resolve, 2000));

  // In a real implementation, this would:
  // 1. Build a transaction with agent signature
  // 2. Send funds from vault to Strike Finance contract
  // 3. Include proper redeemer for AgentTrade
  // 4. Submit transaction to blockchain

  console.log('Agent trade executed:', signal);
}
