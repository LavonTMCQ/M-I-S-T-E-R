"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Shield, 
  Key, 
  Copy, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  Wallet
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useUserIdentity } from "@/hooks/useUserIdentity";
import { USER_STORAGE_KEYS } from "@/lib/utils/userStorage";

interface ConnectedWalletInfo {
  address: string;
  walletType: string;
  balance: number;
  handle: string | null;
  displayName: string;
}

interface ManagedWalletCreationProps {
  connectedWallet: ConnectedWalletInfo;
  onWalletCreated: (walletInfo: ManagedWalletInfo) => void;
  onError: (error: string) => void;
}

interface ManagedWalletInfo {
  address: string;
  userId: string;
  mnemonic: string;
}

export function ManagedWalletCreation({
  connectedWallet,
  onWalletCreated,
  onError
}: ManagedWalletCreationProps) {
  // Enhanced user identification for secure localStorage
  const {
    userStorage,
    isAuthenticated,
    getUserDisplayName,
  } = useUserIdentity();

  const [isCreating, setIsCreating] = useState(false);
  const [managedWallet, setManagedWallet] = useState<ManagedWalletInfo | null>(null);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonicBackedUp, setMnemonicBackedUp] = useState(false);
  const [understandsRisks, setUnderstandsRisks] = useState(false);
  const [step, setStep] = useState<'create' | 'backup' | 'confirm'>('create');

  // Save backup confirmation state when it changes
  useEffect(() => {
    if (isAuthenticated && userStorage && managedWallet) {
      const backupState = {
        mnemonicBackedUp,
        understandsRisks,
        walletAddress: managedWallet.address,
        lastUpdated: new Date().toISOString()
      };
      userStorage.setItem(USER_STORAGE_KEYS.BACKUP_CONFIRMED, JSON.stringify(backupState));
    }
  }, [mnemonicBackedUp, understandsRisks, managedWallet, isAuthenticated, userStorage]);

  const createManagedWallet = async () => {
    setIsCreating(true);

    try {
      // Call the API bridge to create a managed wallet
      const response = await apiClient.post('/api/wallet/create', {
        userAddress: connectedWallet.address,
        userHandle: connectedWallet.handle,
        walletType: connectedWallet.walletType,
        userId: `user_${connectedWallet.address.substring(0, 12)}`
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create managed wallet');
      }

      // Parse the Mastra agent response to extract wallet info
      console.log('🔍 Raw agent response:', response);
      console.log('🔍 Response.data:', response.data);
      console.log('🔍 Response.data.data:', response.data?.data);
      console.log('🔍 Response structure check:', {
        hasData: !!response.data,
        dataType: typeof response.data,
        hasDataData: !!(response.data && response.data.data),
        hasSteps: !!(response.data && response.data.steps),
        hasText: !!(response.data && response.data.text)
      });

      let walletData;

      // First check if we have structured tool response data
      if (response.data && response.data.steps && response.data.steps.length > 0) {
        console.log('🔍 Checking steps for tool results...');
        // Look for the tool result in the steps
        for (const step of response.data.steps) {
          if (step.toolResults && step.toolResults.length > 0) {
            console.log('🔍 Found toolResults in step:', step.toolResults);
            for (const toolResult of step.toolResults) {
              console.log('🔍 Checking toolResult:', toolResult);
              // Check for createManagedWallet tool result
              if (toolResult.toolName === 'createManagedWallet' && toolResult.result && toolResult.result.success) {
                console.log('✅ Found createManagedWallet tool result');
                walletData = toolResult.result.data;
                break;
              }
              // Also check for tool results without toolName (some responses don't include it)
              else if (toolResult.result && toolResult.result.success && toolResult.result.data &&
                       toolResult.result.data.address && toolResult.result.data.mnemonic) {
                console.log('✅ Found wallet data in tool result without toolName');
                walletData = toolResult.result.data;
                break;
              }
            }
          }
          if (walletData) break;
        }
      }
      // Fallback: Parse the text response from the Mastra agent
      else if (response.data && response.data.text) {
        // Parse text response from agent
        const agentText = response.data.text;
        console.log('🔍 Agent response text:', agentText);

        // Extract real wallet info from agent text response
        try {
          // Extract mnemonic phrase (look for the long phrase with multiple words)
          const mnemonicMatches = agentText.match(/`([^`]+)`/g);
          let mnemonic = null;
          let address = null;

          if (mnemonicMatches) {
            // Find the mnemonic (should be the longest match with multiple words)
            for (const match of mnemonicMatches) {
              const content = match.replace(/`/g, '');

              // Check if this looks like a mnemonic (multiple words, not an address or user ID)
              if (content.includes(' ') && content.split(' ').length >= 12 && !content.startsWith('addr1') && !content.startsWith('user_')) {
                mnemonic = content;
              }

              // Check if this is an address
              if (content.startsWith('addr1')) {
                address = content;
              }
            }
          }

          // Fallback: try to find address without backticks
          if (!address) {
            const addressMatch = agentText.match(/(addr1[a-zA-Z0-9]+)/);
            address = addressMatch ? addressMatch[1] : null;
          }

          console.log('🔍 Extracted mnemonic:', mnemonic);
          console.log('🔍 Extracted address:', address);

          if (address) {
            // We have the address, but need to handle missing mnemonic
            if (mnemonic) {
              walletData = {
                address: address,
                userId: `user_${connectedWallet.address.substring(0, 12)}`,
                mnemonic: mnemonic
              };
              console.log('✅ Successfully extracted real wallet data from agent response');
            } else {
              // Address found but no mnemonic - agent might not be including it
              console.log('⚠️ Address found but mnemonic missing from agent response');
              console.log('🔧 This might be a security feature - checking if agent has mnemonic stored securely');

              // For now, create a placeholder that indicates the issue
              walletData = {
                address: address,
                userId: `user_${connectedWallet.address.substring(0, 12)}`,
                mnemonic: 'MNEMONIC_NOT_PROVIDED_BY_AGENT'
              };

              // We'll need to fix the agent to include the mnemonic
              console.log('❌ Agent created wallet but did not provide mnemonic phrase');
              throw new Error('Wallet created successfully but mnemonic phrase not provided by agent. Please check agent configuration.');
            }
          } else {
            // Try to find JSON in the response as fallback
            const jsonMatch = agentText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              walletData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('Could not extract wallet address from agent response');
            }
          }
        } catch (parseError) {
          console.error('❌ Failed to parse agent response:', parseError);
          throw new Error('Invalid response format from wallet creation agent');
        }
      }
      // Handle direct object response (fallback)
      else if (response.data && typeof response.data === 'object') {
        console.log('🔍 Using direct object response');
        // Check if response.data has the wallet data directly
        if (response.data.address && response.data.mnemonic) {
          walletData = response.data;
        }
        // Check if response.data.data has the wallet data (our API structure)
        else if (response.data.data && response.data.data.address && response.data.data.mnemonic) {
          console.log('🔍 Found wallet data in response.data.data');
          walletData = response.data.data;
        } else {
          console.error('❌ No wallet data found in object response:', response.data);
          throw new Error('Wallet data not found in response object');
        }
      } else {
        throw new Error('Invalid response format from wallet creation service');
      }

      // Validate wallet data
      if (!walletData) {
        throw new Error('No wallet data found in response');
      }

      if (!walletData.address || !walletData.mnemonic) {
        console.error('❌ Missing wallet data:', {
          hasAddress: !!walletData.address,
          hasMnemonic: !!walletData.mnemonic,
          walletData: walletData
        });
        throw new Error('Invalid wallet data received from agent - missing address or mnemonic');
      }

      const walletInfo: ManagedWalletInfo = {
        address: walletData.address,
        userId: walletData.userId || `user_${connectedWallet?.address?.substring(0, 12) || 'demo'}`,
        mnemonic: walletData.mnemonic
      };

      console.log('🔍 Setting managed wallet:', walletInfo);
      setManagedWallet(walletInfo);
      setStep('backup');

    } catch (error) {
      console.error('Failed to create managed wallet:', error);
      onError(error instanceof Error ? error.message : 'Failed to create managed wallet');
    } finally {
      setIsCreating(false);
    }
  };

  const copyMnemonic = () => {
    if (managedWallet?.mnemonic) {
      navigator.clipboard.writeText(managedWallet.mnemonic);
    }
  };

  const downloadMnemonic = () => {
    if (!managedWallet?.mnemonic) return;

    const content = `MISTER Managed Wallet Recovery Phrase
    
Wallet Address: ${managedWallet.address}
User ID: ${managedWallet.userId}
Created: ${new Date().toISOString()}

Recovery Phrase (24 words):
${managedWallet.mnemonic}

IMPORTANT SECURITY NOTES:
- Keep this phrase secure and private
- Never share it with anyone
- Store it in a safe place offline
- This phrase can recover your wallet and funds
- MISTER cannot recover your wallet without this phrase

For support: https://mister.finance/support`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mister-wallet-recovery-${managedWallet.address.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const confirmBackup = () => {
    if (!mnemonicBackedUp || !understandsRisks) {
      onError('Please confirm you have backed up your mnemonic phrase and understand the risks');
      return;
    }

    if (managedWallet && isAuthenticated && userStorage) {
      // Store the managed wallet data for dashboard access
      const walletDataForDashboard = {
        id: managedWallet.address.substring(0, 12), // Use address prefix as ID
        address: managedWallet.address,
        balance: 0, // New wallet starts with 0 balance
        totalValue: 0,
        pnl: 0,
        pnlPercent: 0,
        positions: 0,
        agentStatus: 'paused' as const,
        lastActivity: 'Never',
        createdAt: new Date().toISOString(),
        userId: managedWallet.userId,
        mnemonic: managedWallet.mnemonic // Store for backup purposes
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

      onWalletCreated(managedWallet);
      setStep('confirm');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 12)}...${address.substring(address.length - 12)}`;
  };

  const mnemonicWords = managedWallet?.mnemonic ? managedWallet.mnemonic.split(' ') : [];

  if (step === 'confirm') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Managed Wallet Created Successfully
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="font-medium text-green-800 mb-2">Your Trading Wallet is Ready!</div>
            <div className="text-sm text-green-600">
              Address: {formatAddress(managedWallet?.address || '')}
            </div>
            <div className="text-sm text-green-600">
              User ID: {managedWallet?.userId}
            </div>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your managed wallet has been created and is ready for funding. You can now transfer ADA to start copy trading.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (step === 'backup' && managedWallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Backup Your Recovery Phrase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Critical:</strong> Write down these 24 words in order. This is the ONLY way to recover your wallet if something goes wrong.
            </AlertDescription>
          </Alert>

          {/* Wallet Address Section */}
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-2">Your Wallet Address</h3>
              <div className="font-mono text-sm text-blue-700 break-all">
                {managedWallet?.address || 'Loading...'}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Recovery Phrase (24 words)</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMnemonic(!showMnemonic)}
                >
                  {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showMnemonic ? 'Hide' : 'Show'}
                </Button>
                <Button variant="outline" size="sm" onClick={copyMnemonic}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={downloadMnemonic}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg border">
              {mnemonicWords.map((word, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-white rounded border text-sm"
                >
                  <span className="text-gray-400 w-6">{index + 1}.</span>
                  <span className="font-mono">
                    {showMnemonic ? word : '•••••'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="mnemonic-backed-up"
                checked={mnemonicBackedUp}
                onCheckedChange={(checked) => setMnemonicBackedUp(checked as boolean)}
              />
              <label
                htmlFor="mnemonic-backed-up"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I have securely backed up my 24-word recovery phrase
              </label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="understands-risks"
                checked={understandsRisks}
                onCheckedChange={(checked) => setUnderstandsRisks(checked as boolean)}
              />
              <label
                htmlFor="understands-risks"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand that losing this phrase means losing access to my funds permanently
              </label>
            </div>
          </div>

          <Button
            onClick={confirmBackup}
            disabled={!mnemonicBackedUp || !understandsRisks}
            className="w-full"
          >
            I've Backed Up My Recovery Phrase
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Create Managed Trading Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="font-medium text-blue-800 mb-2">Connected Main Wallet</div>

          {/* Display handle prominently if available */}
          {connectedWallet.handle ? (
            <div>
              <div className="text-lg font-bold text-blue-700 mb-1">
                {connectedWallet.handle}
              </div>
              <div className="text-xs text-blue-500 mb-1">
                {formatAddress(connectedWallet.address)}
              </div>
            </div>
          ) : (
            <div className="text-sm text-blue-600 mb-1">
              {formatAddress(connectedWallet.address)}
            </div>
          )}

          {/* Show balance */}
          <div className="text-sm font-medium text-blue-700">
            Balance: {connectedWallet.balance.toFixed(2)} ADA
          </div>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            We'll create a separate managed wallet for copy trading. This keeps your main wallet secure while allowing automated trading.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h3 className="font-medium">How it works:</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">1</Badge>
              <span>We create a new Cardano wallet specifically for trading</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">2</Badge>
              <span>You'll receive a 24-word recovery phrase to backup securely</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">3</Badge>
              <span>Transfer ADA from your main wallet to fund trading</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">4</Badge>
              <span>TITAN2K AI strategy executes trades automatically</span>
            </div>
          </div>
        </div>

        <Button
          onClick={createManagedWallet}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Creating Managed Wallet...
            </>
          ) : (
            'Create Managed Trading Wallet'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
