"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight,
  Wallet,
  Shield,
  TrendingUp,
  ArrowLeft,
  Bot,
  Zap,
  Lock
} from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function TradingModePage() {
  const { mainWallet, isLoading: walletLoading } = useWallet();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'managed' | 'direct' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if no wallet connected after loading is complete
  useEffect(() => {
    if (!walletLoading && !mainWallet) {
      console.log('❌ No wallet connected, redirecting to landing page');
      router.push('/');
    }
  }, [mainWallet, walletLoading, router]);

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

  // Show redirect message if no wallet after loading
  if (!mainWallet) {
    return (
      <div className="min-h-screen bg-background pt-32 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Redirecting...</div>
          <div className="text-sm text-muted-foreground">Please connect your wallet first</div>
        </div>
      </div>
    );
  }

  const handleModeSelection = async (mode: 'managed' | 'direct') => {
    setSelectedMode(mode);
    setIsLoading(true);

    try {
      if (mode === 'managed') {
        // Check if user already has managed wallets
        console.log('🔍 Checking for existing managed wallets...');

        if (!mainWallet?.address) {
          throw new Error('No main wallet connected');
        }

        const response = await fetch(`http://localhost:4113/api/wallets/managed/${mainWallet.address}`);
        const data = await response.json();

        if (data.success && data.data.managedWallets.length > 0) {
          console.log('✅ Found existing managed wallets:', data.data.managedWallets.length);
          // User has existing managed wallets, show selection page
          router.push('/managed-wallets');
          return;
        } else {
          console.log('📝 No existing managed wallets found, starting onboarding...');
          // No existing managed wallets, go to onboarding
          router.push('/onboarding');
          return;
        }
      } else if (mode === 'direct') {
        // For direct trading, check if already authenticated
        console.log('🔐 Setting up direct trading with main wallet...');

        if (isAuthenticated && user) {
          console.log('✅ User already authenticated, proceeding to dashboard');
          router.push('/dashboard');
          return;
        }

        // Only authenticate if not already authenticated
        console.log('🔐 Authenticating with main wallet for direct trading...');
        const { authService } = await import('@/lib/auth/auth');
        const authResponse = await authService.authenticateWithWallet(
          mainWallet.address,
          {
            stakeAddress: mainWallet.stakeAddress,
            walletType: mainWallet.walletType,
            balance: mainWallet.balance,
            handle: mainWallet.handle,
          }
        );

        if (!authResponse.success) {
          throw new Error(authResponse.error || 'Authentication failed');
        }

        console.log('✅ Direct trading authentication successful');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error setting up trading mode:', error);
      // Still navigate but show error
      if (mode === 'direct') {
        router.push('/dashboard');
      } else {
        router.push('/wallet-setup');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="px-4 py-2 text-sm font-medium mb-6">
            <Bot className="w-4 h-4 mr-2" />
            Choose Your Trading Mode
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            How Would You Like to Trade?
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose between direct trading with your connected wallet or create a managed wallet for enhanced security.
          </p>
        </div>

        {/* Connected Profile Wallet Info */}
        <div className="mb-8">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-green-800">
                      Profile Wallet: {mainWallet.displayName}
                    </div>
                    <div className="text-sm text-green-600">
                      Balance: {mainWallet.balance.toFixed(2)} ADA • {mainWallet.walletType}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-700 border-green-300">
                  Connected
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trading Mode Options */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Direct Trading */}
          <Card className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
            selectedMode === 'direct' ? 'ring-2 ring-primary border-primary' : ''
          }`}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Direct Trading</CardTitle>
                  <Badge variant="secondary" className="mt-1">Recommended</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Trade directly from your connected wallet. Simple, fast, and secure.
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Use your existing wallet</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span>Instant setup</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Lock className="w-4 h-4 text-green-500" />
                  <span>You control all keys</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={() => handleModeSelection('direct')}
                disabled={isLoading}
              >
                {isLoading && selectedMode === 'direct' ? 'Setting up...' : 'Start Direct Trading'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Managed Wallet */}
          <Card className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
            selectedMode === 'managed' ? 'ring-2 ring-primary border-primary' : ''
          }`}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Managed Wallet</CardTitle>
                  <Badge variant="outline">Advanced</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Create a separate trading wallet managed by MISTER for automated strategies.
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Bot className="w-4 h-4 text-green-500" />
                  <span>AI-managed trading</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>Advanced strategies</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Isolated trading funds</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleModeSelection('managed')}
                disabled={isLoading}
              >
                {isLoading && selectedMode === 'managed' ? 'Setting up...' : 'Create Managed Wallet'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
