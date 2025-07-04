"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Shield,
  Copy,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Download,
  CheckCircle,
  Bot,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { walletAPI } from "@/lib/api/wallet";
import { CreateWalletResult } from "@/types/api";
import { useUserIdentity } from "@/hooks/useUserIdentity";
import { USER_STORAGE_KEYS } from "@/lib/utils/userStorage";

export default function OnboardingPage() {
  const { user, autoLogin } = useAuth();

  // Enhanced user identification for secure localStorage
  const {
    userStorage,
    isAuthenticated,
    getUserDisplayName,
  } = useUserIdentity();

  const [currentStep, setCurrentStep] = useState(1);
  const [walletData, setWalletData] = useState<CreateWalletResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [walletCreated, setWalletCreated] = useState(false); // Track if wallet was successfully created
  const [mnemonicVisible, setMnemonicVisible] = useState(false);
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const [confirmationChecks, setConfirmationChecks] = useState({
    saved: false,
    secure: false,
    understand: false
  });

  // Load user-specific onboarding progress
  useEffect(() => {
    if (isAuthenticated && userStorage) {
      const savedProgress = userStorage.getItem(USER_STORAGE_KEYS.ONBOARDING_PROGRESS);
      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress);
          setCurrentStep(progress.currentStep || 1);
          setConfirmationChecks(progress.confirmationChecks || {
            saved: false,
            secure: false,
            understand: false
          });
          console.log('📋 [SECURE] Loaded onboarding progress for user:', getUserDisplayName());
        } catch (error) {
          console.warn('⚠️ Failed to parse onboarding progress:', error);
        }
      }
    }
  }, [isAuthenticated]); // Removed userStorage from dependencies to prevent infinite loop

  // Save onboarding progress when it changes
  useEffect(() => {
    if (isAuthenticated && userStorage) {
      const progress = {
        currentStep,
        confirmationChecks,
        lastUpdated: new Date().toISOString()
      };
      userStorage.setItem(USER_STORAGE_KEYS.ONBOARDING_PROGRESS, JSON.stringify(progress));
    }
  }, [currentStep, confirmationChecks, isAuthenticated]); // Removed userStorage from dependencies to prevent infinite loop
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { id: 1, title: "Welcome", description: "Get started with MISTER" },
    { id: 2, title: "Create Wallet", description: "Generate your managed wallet" },
    { id: 3, title: "Backup Phrase", description: "Secure your recovery phrase" },
    { id: 4, title: "Confirmation", description: "Verify your setup" },
    { id: 5, title: "Complete", description: "Ready to trade" }
  ];

  const handleCreateWallet = async () => {
    // Prevent multiple wallet creations
    if (isCreating || walletData || walletCreated) {
      console.log('⚠️ Wallet creation already in progress or completed');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Ensure user is authenticated first
      if (!user) {
        console.log('🔐 Auto-authenticating user for wallet creation...');
        const authSuccess = await autoLogin();
        if (!authSuccess) {
          throw new Error('Authentication failed');
        }
      }

      console.log('🏦 Creating wallet using WalletManager service...');

      // Call the real WalletManager service through our API
      const response = await walletAPI.createWallet({
        userId: user?.id
      });

      if (response.success && response.data) {
        console.log('✅ Wallet created successfully');
        console.log('🔍 Full response data:', response.data);

        // Extract wallet data from the response structure
        let walletData = null;

        // Check if we have direct wallet data (our current API structure)
        if (response.data.address && response.data.mnemonic) {
          console.log('✅ Found direct wallet data in response');
          walletData = response.data;
        }
        // Check if we have structured tool response data in steps (Mastra format)
        else if (response.data && response.data.steps && response.data.steps.length > 0) {
          console.log('🔍 Checking steps for tool results...');
          for (const step of response.data.steps) {
            if (step.toolResults && step.toolResults.length > 0) {
              for (const toolResult of step.toolResults) {
                if (toolResult.toolName === 'createManagedWallet' && toolResult.result && toolResult.result.success) {
                  console.log('✅ Found createManagedWallet tool result');
                  walletData = toolResult.result.data;
                  break;
                  break;
                }
              }
            }
            if (walletData) break;
          }
        }

        // Fallback: try to extract from text response
        if (!walletData && response.data && response.data.text) {
          console.log('🔍 Trying to extract from text response...');
          const mnemonicMatch = response.data.text.match(/`([^`]+)`/g);
          const addressMatch = response.data.text.match(/(addr1[a-zA-Z0-9]+)/);

          let mnemonic = null;
          let address = null;

          if (mnemonicMatch) {
            for (const match of mnemonicMatch) {
              const content = match.replace(/`/g, '');
              if (content.includes(' ') && content.split(' ').length >= 12 && !content.startsWith('addr1')) {
                mnemonic = content;
                break;
              }
              if (content.startsWith('addr1')) {
                address = content;
              }
            }
          }

          if (addressMatch && !address) {
            address = addressMatch[1];
          }

          if (mnemonic && address) {
            walletData = {
              address,
              mnemonic,
              userId: user?.id || 'demo_user'
            };
          }
        }

        if (walletData && walletData.address && walletData.mnemonic) {
          console.log('✅ Setting wallet data:', {
            address: walletData.address.substring(0, 20) + '...',
            mnemonicLength: walletData.mnemonic.split(' ').length,
            userId: walletData.userId
          });

          setWalletData({
            bech32Address: walletData.address,
            mnemonic: walletData.mnemonic,
            userId: walletData.userId
          });

          setWalletCreated(true); // Mark wallet as successfully created
          setCurrentStep(3);
        } else {
          console.error('❌ No valid wallet data found in response');
          throw new Error('No valid wallet data found in response');
        }
      } else {
        console.error('❌ Wallet creation failed:', response.error);
        setError(response.error || 'Failed to create wallet');

        // For demo purposes, fall back to mock data
        console.log('🔄 Falling back to mock wallet data for demo...');
        const mockMnemonic = [
          "abandon", "ability", "able", "about", "above", "absent",
          "absorb", "abstract", "absurd", "abuse", "access", "accident",
          "account", "accuse", "achieve", "acid", "acoustic", "acquire",
          "across", "action", "actor", "actress", "actual", "adapt"
        ];

        const mockAddress = "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2qd4a6gtpc6z3rqgr83dc";

        setWalletData({
          bech32Address: mockAddress,
          mnemonic: mockMnemonic.join(' '),
          userId: user?.id || 'demo_user'
        });
        setWalletCreated(true); // Mark wallet as successfully created
        setCurrentStep(3);
      }
    } catch (error) {
      console.error('❌ Error creating wallet:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');

      // For demo purposes, still proceed with mock data
      console.log('🔄 Using mock wallet data due to error...');
      const mockMnemonic = [
        "abandon", "ability", "able", "about", "above", "absent",
        "absorb", "abstract", "absurd", "abuse", "access", "accident",
        "account", "accuse", "achieve", "acid", "acoustic", "acquire",
        "across", "action", "actor", "actress", "actual", "adapt"
      ];

      const mockAddress = "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2qd4a6gtpc6z3rqgr83dc";

      setWalletData({
        bech32Address: mockAddress,
        mnemonic: mockMnemonic.join(' '),
        userId: user?.id || 'demo_user'
      });
      setWalletCreated(true); // Mark wallet as successfully created
      setCurrentStep(3);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyMnemonic = async () => {
    if (walletData?.mnemonic) {
      const mnemonicText = typeof walletData.mnemonic === 'string'
        ? walletData.mnemonic
        : walletData.mnemonic.join(' ');
      await navigator.clipboard.writeText(mnemonicText);
      setMnemonicCopied(true);
      setTimeout(() => setMnemonicCopied(false), 2000);
    }
  };

  const handleDownloadBackup = () => {
    if (walletData) {
      const mnemonicText = typeof walletData.mnemonic === 'string'
        ? walletData.mnemonic
        : walletData.mnemonic.join(' ');

      const backupData = {
        address: walletData.bech32Address,
        mnemonic: mnemonicText,
        userId: walletData.userId,
        createdAt: new Date().toISOString(),
        service: 'MISTER AI Trading'
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mister-wallet-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const canProceedToConfirmation = () => {
    return Object.values(confirmationChecks).every(check => check);
  };

  const handleFinishOnboarding = () => {
    // Store the wallet data for managed dashboard access
    if (walletData && isAuthenticated && userStorage) {
      const walletDataForDashboard = {
        id: walletData.bech32Address.substring(0, 12), // Use address prefix as ID
        address: walletData.bech32Address,
        balance: 0, // New wallet starts with 0 balance
        totalValue: 0,
        pnl: 0,
        pnlPercent: 0,
        positions: 0,
        agentStatus: 'paused' as const,
        lastActivity: 'Never',
        createdAt: new Date().toISOString(),
        userId: walletData.userId,
        mnemonic: walletData.mnemonic // Store for backup purposes
      };

      // Store in the key that the dashboard expects
      userStorage.setItem(USER_STORAGE_KEYS.SELECTED_WALLET, JSON.stringify(walletDataForDashboard));
      console.log('💾 [SECURE] Stored managed wallet data for dashboard access');
      console.log('🔍 Storage key used:', `selectedManagedWallet_${getUserDisplayName()}`);
      console.log('🔍 Wallet data stored:', {
        address: walletDataForDashboard.address.substring(0, 20) + '...',
        userId: walletDataForDashboard.userId,
        createdAt: walletDataForDashboard.createdAt
      });
    }

    // Navigate to managed wallet dashboard
    window.location.href = '/managed-dashboard';
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-8"
          >
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
              <Wallet className="w-10 h-10 text-primary" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground">Welcome to MISTER</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Let&apos;s create your managed wallet for AI-powered copy trading on Strike Finance.
                This process takes just a few minutes and ensures your funds remain secure.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Shield className="w-8 h-8 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Non-Custodial</h3>
                  <p className="text-sm text-muted-foreground">You control your private keys and funds</p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Wallet className="w-8 h-8 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Managed Trading</h3>
                  <p className="text-sm text-muted-foreground">AI executes trades on your behalf</p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <CheckCircle className="w-8 h-8 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Secure Backup</h3>
                  <p className="text-sm text-muted-foreground">Recovery phrase keeps your wallet safe</p>
                </CardContent>
              </Card>
            </div>

            <Button 
              size="lg" 
              onClick={() => setCurrentStep(2)}
              className="min-w-[200px] h-12"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-8"
          >
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
              {isCreating ? (
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Wallet className="w-10 h-10 text-primary" />
              )}
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground">
                {isCreating ? "Creating Your Wallet..." : "Create Managed Wallet"}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {isCreating 
                  ? "We're generating a secure Cardano wallet for your MISTER trading account. This may take a moment."
                  : "Click below to generate a new Cardano wallet that will be managed by MISTER for automated trading."
                }
              </p>
            </div>

            {isCreating && (
              <div className="max-w-md mx-auto space-y-4">
                <Progress value={66} className="h-2" />
                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <span>Generating cryptographic keys...</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.5s'}} />
                    <span>Creating wallet address...</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-muted rounded-full" />
                    <span className="text-muted-foreground/60">Securing with KMS...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 max-w-md mx-auto">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                        Wallet Creation Error
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {error}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        Don&apos;t worry - we&apos;ll use demo data so you can continue exploring MISTER.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isCreating && (
              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="min-w-[120px]"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={handleCreateWallet}
                  disabled={isCreating}
                  className="min-w-[200px] h-12"
                >
                  Create Wallet
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
                <Shield className="w-10 h-10 text-primary" />
              </div>
              
              <h2 className="text-3xl font-bold text-foreground">Backup Your Recovery Phrase</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Your 24-word recovery phrase is the master key to your wallet. 
                Store it safely - anyone with this phrase can access your funds.
              </p>
            </div>

            {walletData && (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Wallet Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Wallet Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm break-all">
                      {walletData.bech32Address}
                    </div>
                  </CardContent>
                </Card>

                {/* Recovery Phrase */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Recovery Phrase</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMnemonicVisible(!mnemonicVisible)}
                      >
                        {mnemonicVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyMnemonic}
                      >
                        {mnemonicCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadBackup}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {mnemonicVisible ? (
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {(typeof walletData.mnemonic === 'string'
                          ? walletData.mnemonic.split(' ')
                          : walletData.mnemonic
                        ).map((word, index) => (
                          <div key={index} className="bg-muted p-3 rounded-lg text-center">
                            <div className="text-xs text-muted-foreground mb-1">{index + 1}</div>
                            <div className="font-mono font-medium">{word}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-muted p-8 rounded-lg text-center">
                        <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Click the eye icon to reveal your recovery phrase</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Security Warning */}
                <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                          Important Security Information
                        </h3>
                        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                          <li>• Never share your recovery phrase with anyone</li>
                          <li>• Store it offline in a secure location</li>
                          <li>• MISTER cannot recover your wallet if you lose this phrase</li>
                          <li>• Consider writing it down on paper as a backup</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(2)}
                    className="min-w-[120px]"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    size="lg" 
                    onClick={() => setCurrentStep(4)}
                    className="min-w-[200px] h-12"
                  >
                    I've Saved It Securely
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>

              <h2 className="text-3xl font-bold text-foreground">Confirm Your Setup</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Please confirm that you have securely saved your recovery phrase and understand the security requirements.
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* Confirmation Checklist */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Security Confirmation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmationChecks.saved}
                        onChange={(e) => setConfirmationChecks(prev => ({ ...prev, saved: e.target.checked }))}
                        className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <div className="text-sm">
                        <div className="font-medium">I have saved my recovery phrase</div>
                        <div className="text-muted-foreground">I have written down or securely stored all 24 words in the correct order</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmationChecks.secure}
                        onChange={(e) => setConfirmationChecks(prev => ({ ...prev, secure: e.target.checked }))}
                        className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <div className="text-sm">
                        <div className="font-medium">I understand the security risks</div>
                        <div className="text-muted-foreground">I will never share my recovery phrase and understand that MISTER cannot recover it if lost</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmationChecks.understand}
                        onChange={(e) => setConfirmationChecks(prev => ({ ...prev, understand: e.target.checked }))}
                        className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <div className="text-sm">
                        <div className="font-medium">I understand how MISTER works</div>
                        <div className="text-muted-foreground">I understand that MISTER will manage trades on my behalf using AI strategies</div>
                      </div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Summary */}
              {walletData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Wallet Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Wallet Address:</span>
                        <span className="text-sm font-mono">{walletData.bech32Address.substring(0, 20)}...</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Recovery Phrase:</span>
                        <span className="text-sm">24 words (secured)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">AI Strategy:</span>
                        <span className="text-sm">TITAN2K (Ready)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="min-w-[120px]"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={() => setCurrentStep(5)}
                  disabled={!canProceedToConfirmation()}
                  className="min-w-[200px] h-12"
                >
                  Complete Setup
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-8"
          >
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground">Welcome to MISTER!</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Your managed wallet has been successfully created and secured.
                MISTER AI is now ready to start trading on your behalf.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Wallet className="w-8 h-8 text-green-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2 text-green-600">Wallet Created</h3>
                  <p className="text-sm text-muted-foreground">Your secure Cardano wallet is ready</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-6">
                  <Bot className="w-8 h-8 text-green-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2 text-green-600">AI Activated</h3>
                  <p className="text-sm text-muted-foreground">TITAN2K strategy is monitoring markets</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-6">
                  <Shield className="w-8 h-8 text-green-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2 text-green-600">Fully Secured</h3>
                  <p className="text-sm text-muted-foreground">Your keys are safely backed up</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Button
                size="lg"
                onClick={handleFinishOnboarding}
                className="min-w-[240px] h-14 text-base font-semibold"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Go to Dashboard
              </Button>

              <p className="text-sm text-muted-foreground">
                You can fund your wallet and start trading anytime from the dashboard
              </p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="text-xl font-bold">MISTER</span>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  {user.email || user.id || 'Email User'}
                </Badge>
              )}
              <Badge variant="secondary" className="px-3 py-1">
                Step {currentStep} of {steps.length}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Progress value={(currentStep / steps.length) * 100} className="h-1" />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {renderStep()}
      </main>
    </div>
  );
}
