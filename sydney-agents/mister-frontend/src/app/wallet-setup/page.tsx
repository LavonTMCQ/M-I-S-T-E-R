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
import { ManagedWalletCreation } from "@/components/wallet/ManagedWalletCreation";
import { WalletFunding } from "@/components/wallet/WalletFunding";
import { useWallet } from "@/contexts/WalletContext";
import { useUserIdentity } from "@/hooks/useUserIdentity";
import { USER_STORAGE_KEYS } from "@/lib/utils/userStorage";

interface ConnectedWalletInfo {
  address: string;
  stakeAddress?: string;
  walletType: string;
  balance: number;
  handle: string | null;
  displayName: string;
  walletApi?: any;
}

interface ManagedWalletInfo {
  address: string;
  userId: string;
  mnemonic: string;
}

export default function WalletSetupPage() {
  const { mainWallet, connectWallet, isLoading: walletLoading } = useWallet();

  // Enhanced user identification for secure localStorage
  const {
    userStorage,
    isAuthenticated,
    getUserDisplayName,
  } = useUserIdentity();

  const [currentStep, setCurrentStep] = useState(1); // Start with managed wallet creation
  const [managedWallet, setManagedWallet] = useState<ManagedWalletInfo | null>(null);
  const [tradingMode, setTradingMode] = useState<'managed' | 'direct' | null>('managed'); // This page is specifically for managed wallets
  const [fundingComplete, setFundingComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user-specific wallet creation state
  useEffect(() => {
    if (isAuthenticated && userStorage) {
      const savedState = userStorage.getItem(USER_STORAGE_KEYS.WALLET_CREATION_STATE);
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          setCurrentStep(state.currentStep || 1);
          setFundingComplete(state.fundingComplete || false);
          console.log('🔧 [SECURE] Loaded wallet creation state for user:', getUserDisplayName());
        } catch (error) {
          console.warn('⚠️ Failed to parse wallet creation state:', error);
        }
      }
    }
  }, [isAuthenticated, userStorage]);

  // Save wallet creation state when it changes
  useEffect(() => {
    if (isAuthenticated && userStorage) {
      const state = {
        currentStep,
        fundingComplete,
        lastUpdated: new Date().toISOString()
      };
      userStorage.setItem(USER_STORAGE_KEYS.WALLET_CREATION_STATE, JSON.stringify(state));
    }
  }, [currentStep, fundingComplete, isAuthenticated, userStorage]);

  // Check if user already has managed wallets and offer to skip
  useEffect(() => {
    console.log('🔧 Wallet setup page loaded for managed wallet creation');

    // Check if user already has managed wallets
    if (mainWallet?.address) {
      checkExistingManagedWallets();
    }
  }, [mainWallet]);

  const checkExistingManagedWallets = async () => {
    try {
      const response = await fetch(`http://localhost:4113/api/wallets/managed/${mainWallet?.address}`);
      const data = await response.json();

      if (data.success && data.data.managedWallets.length > 0) {
        console.log('✅ User already has managed wallets, offering to skip setup');
        setError(`You already have ${data.data.managedWallets.length} managed wallet(s). You can skip this setup and go directly to your managed wallets.`);
      }
    } catch (error) {
      console.log('Could not check existing managed wallets:', error);
    }
  };

  const skipToManagedWallets = () => {
    window.location.href = '/managed-wallets';
  };

  // Show loading while wallet context is initializing
  if (walletLoading) {
    return (
      <div className="min-h-screen bg-background pt-32 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading wallet...</div>
          <div className="text-sm text-muted-foreground">Checking wallet connection</div>
        </div>
      </div>
    );
  }

  // For managed wallet creation, we don't need a connected wallet
  // This page creates a new managed wallet independently

  const steps = [
    { id: 1, title: 'Create Managed Wallet', description: 'Generate a new wallet for trading' },
    { id: 2, title: 'Backup Recovery Phrase', description: 'Secure your wallet recovery phrase' },
    { id: 3, title: 'Fund Trading Wallet', description: 'Transfer ADA to your trading wallet' },
    { id: 4, title: 'Complete Setup', description: 'Ready for automated trading' }
  ];

  const handleManagedWalletCreated = (walletInfo: ManagedWalletInfo) => {
    setManagedWallet(walletInfo);
    setError(null);
    setCurrentStep(2); // Go to backup step
  };

  const handleFundingComplete = (amount: number) => {
    setFundingComplete(true);
    setError(null);
    setCurrentStep(4); // Go to completion step
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const startTrading = () => {
    // Navigate to managed dashboard for managed wallets
    window.location.href = '/managed-dashboard';
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Set Up MISTER Trading
          </h1>
          <p className="text-gray-600">
            Choose your trading setup for automated copy trading on Cardano perpetual swaps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Navigation */}
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex flex-col items-center text-center ${
                index + 1 <= currentStep ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  index + 1 < currentStep
                    ? 'bg-primary text-white'
                    : index + 1 === currentStep
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {index + 1 < currentStep ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="text-xs font-medium">{step.title}</div>
              <div className="text-xs text-gray-500 hidden sm:block">{step.description}</div>
            </div>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              {error}
              {error.includes('already have') && (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={skipToManagedWallets}
                    className="bg-white"
                  >
                    Go to My Managed Wallets
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setError(null)}
                    className="bg-white"
                  >
                    Create Another Wallet
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === 1 && mainWallet && (
            <ManagedWalletCreation
              connectedWallet={{
                address: mainWallet.address,
                stakeAddress: mainWallet.stakeAddress,
                walletType: mainWallet.walletType,
                balance: mainWallet.balance,
                handle: mainWallet.handle,
                displayName: mainWallet.displayName
              }}
              onWalletCreated={handleManagedWalletCreated}
              onError={handleError}
            />
          )}

          {currentStep === 2 && managedWallet && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Backup Your Wallet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Write down your recovery phrase and store it safely.
                    This is the only way to recover your wallet if you lose access.
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Your Recovery Phrase:</h3>
                  <div className="grid grid-cols-3 gap-2 text-sm font-mono bg-white p-4 rounded border">
                    {managedWallet.mnemonic.split(' ').map((word, index) => (
                      <div key={index} className="p-2 border rounded text-center">
                        <span className="text-gray-500 text-xs">{index + 1}.</span> {word}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Security Checklist:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Write down all 24 words in order</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Store in a secure, offline location</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Never share with anyone</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Consider making multiple copies</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setCurrentStep(3)}
                  className="w-full"
                  size="lg"
                >
                  I've Backed Up My Wallet
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && mainWallet && tradingMode === 'managed' && (
            <ManagedWalletCreation
              connectedWallet={{
                address: mainWallet.address,
                stakeAddress: mainWallet.stakeAddress,
                walletType: mainWallet.walletType,
                balance: mainWallet.balance,
                handle: mainWallet.handle,
                displayName: mainWallet.displayName
              }}
              onWalletCreated={handleManagedWalletCreated}
              onError={handleError}
            />
          )}



          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Setup Complete!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Your MISTER Setup is Complete!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {tradingMode === 'direct'
                      ? 'You can now start copy trading directly with your connected wallet using the TITAN2K AI strategy'
                      : 'Your managed wallet is ready! You can now start copy trading with the TITAN2K AI strategy'
                    }
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-800 mb-2">
                      {tradingMode === 'direct' ? 'Trading Wallet (Connected)' : 'Main Wallet'}
                    </h3>
                    {mainWallet?.handle ? (
                      <div>
                        <p className="text-lg font-bold text-blue-700 mb-1">
                          {mainWallet.handle}
                        </p>
                        <p className="text-xs text-blue-500 mb-1">
                          {mainWallet.address.substring(0, 20)}...
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-blue-600 mb-1">
                        {mainWallet?.address.substring(0, 20)}...
                      </p>
                    )}
                    <p className="text-sm text-blue-600 mb-2">
                      Balance: {mainWallet?.balance.toFixed(2)} ADA
                    </p>
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      {tradingMode === 'direct' ? 'Ready for Trading' : 'Connected'}
                    </Badge>
                  </div>

                  {tradingMode === 'managed' && managedWallet && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h3 className="font-medium text-green-800 mb-2">Managed Trading Wallet</h3>
                      <p className="text-sm text-green-600">
                        {managedWallet.address.substring(0, 20)}...
                      </p>
                      <Badge variant="outline" className="mt-2 text-green-700 border-green-300">
                        Created
                      </Badge>
                      <p className="text-xs text-green-600 mt-2">
                        Fund this wallet to start trading
                      </p>
                    </div>
                  )}

                  {tradingMode === 'direct' && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h3 className="font-medium text-purple-800 mb-2">Trading Mode</h3>
                      <p className="text-sm text-purple-600 mb-2">
                        Direct wallet trading enabled
                      </p>
                      <Badge variant="outline" className="text-purple-700 border-purple-300">
                        Instant Setup
                      </Badge>
                      <p className="text-xs text-purple-600 mt-2">
                        No transfers needed - trade immediately
                      </p>
                    </div>
                  )}
                </div>

                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    {tradingMode === 'direct'
                      ? 'The Tomorrow Labs v.1 AI strategy will now monitor markets and execute trades directly with your connected wallet based on your settings.'
                      : 'The Tomorrow Labs v.1 AI strategy will monitor markets and execute trades with your managed wallet once funded.'
                    }
                  </AlertDescription>
                </Alert>

                {tradingMode === 'managed' && managedWallet && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>Next Step:</strong> Fund your managed wallet to start trading. You can do this from the dashboard or manually transfer ADA to: {managedWallet.address.substring(0, 20)}...
                    </AlertDescription>
                  </Alert>
                )}

                <Button onClick={startTrading} className="w-full" size="lg">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="text-sm text-gray-500">
            Need help? <a href="/support" className="text-primary hover:underline">Contact Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
