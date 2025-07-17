"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Wallet,
  Shield,
  TrendingUp,
  ArrowLeft
} from "lucide-react";
import { WalletConnection } from "@/components/wallet/WalletConnection";
import { AgentVaultCreation } from "@/components/wallet/AgentVaultCreation";
import { useWallet } from "@/contexts/WalletContext";

interface ConnectedWalletInfo {
  address: string;
  walletType: string;
  balance: number;
  handle: string | null;
  displayName: string;
}

interface AgentVaultInfo {
  contractAddress: string;
  userVkh: string;
  initialDeposit: number;
  maxTradeAmount: number;
  tradingEnabled: boolean;
}

export default function AgentVaultSetupPage() {
  const { mainWallet, connectWallet, isLoading } = useWallet();
  const [currentStep, setCurrentStep] = useState<'connect' | 'create' | 'complete'>('connect');
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWalletInfo | null>(null);
  const [agentVault, setAgentVault] = useState<AgentVaultInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Update progress based on current step
  useEffect(() => {
    switch (currentStep) {
      case 'connect':
        setProgress(mainWallet ? 33 : 0);
        break;
      case 'create':
        setProgress(66);
        break;
      case 'complete':
        setProgress(100);
        break;
    }
  }, [currentStep, mainWallet]);

  // Auto-advance when wallet is connected
  useEffect(() => {
    if (mainWallet && currentStep === 'connect') {
      setConnectedWallet({
        address: mainWallet.address,
        walletType: mainWallet.walletType,
        balance: mainWallet.balance,
        handle: mainWallet.handle,
        displayName: mainWallet.displayName
      });
      setCurrentStep('create');
    }
  }, [mainWallet, currentStep]);

  const handleWalletConnected = (walletInfo: ConnectedWalletInfo) => {
    setConnectedWallet(walletInfo);
    setCurrentStep('create');
    setError(null);
  };

  const handleVaultCreated = (vaultInfo: AgentVaultInfo) => {
    setAgentVault(vaultInfo);
    setCurrentStep('complete');
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const goToTrading = () => {
    window.location.href = '/trading';
  };

  const goBack = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={goBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Agent Vault Setup</h1>
            <p className="text-muted-foreground">
              Enhanced security for automated trading with smart contracts
            </p>
          </div>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className={currentStep === 'connect' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                Connect Wallet
              </span>
              <span className={currentStep === 'create' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                Create Vault
              </span>
              <span className={currentStep === 'complete' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                Complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="max-w-2xl mx-auto mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          {currentStep === 'connect' && (
            <div className="space-y-6">
              {/* Benefits Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Why Agent Vault?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <h3 className="font-semibold">Enhanced Security</h3>
                      <p className="text-sm text-muted-foreground">
                        Smart contracts instead of managed wallets
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Wallet className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                      <h3 className="font-semibold">Full Control</h3>
                      <p className="text-sm text-muted-foreground">
                        You keep your private keys
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                      <h3 className="font-semibold">Automated Trading</h3>
                      <p className="text-sm text-muted-foreground">
                        AI trades with your permission
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Connection */}
              <WalletConnection
                onWalletConnected={handleWalletConnected}
                onError={handleError}
              />
            </div>
          )}

          {currentStep === 'create' && connectedWallet && (
            <AgentVaultCreation
              connectedWallet={connectedWallet}
              onVaultCreated={handleVaultCreated}
              onError={handleError}
            />
          )}

          {currentStep === 'complete' && agentVault && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Agent Vault Created Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your secure Agent Vault is now ready for automated trading.
                  </AlertDescription>
                </Alert>

                {/* Vault Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">{agentVault.initialDeposit} ADA</h3>
                    <p className="text-sm text-muted-foreground">Initial Deposit</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">{agentVault.maxTradeAmount.toLocaleString()} ADA</h3>
                    <p className="text-sm text-muted-foreground">Max Trade Amount</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">Contract Address</h4>
                    <p className="text-sm font-mono bg-muted p-2 rounded">
                      {agentVault.contractAddress}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Trading Status</span>
                    <Badge variant={agentVault.tradingEnabled ? "default" : "secondary"}>
                      {agentVault.tradingEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="space-y-4">
                  <h4 className="font-medium">What's Next?</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <span className="text-sm">Your Agent Vault is deployed and secure</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <span className="text-sm">AI agents can now trade on your behalf</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <span className="text-sm">You maintain full control over your funds</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={goToTrading}
                  className="w-full"
                  size="lg"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Start Trading with Agent Vault
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>
            Agent Vault uses Cardano smart contracts for enhanced security.
            <br />
            Your private keys never leave your wallet.
          </p>
        </div>
      </div>
    </div>
  );
}
