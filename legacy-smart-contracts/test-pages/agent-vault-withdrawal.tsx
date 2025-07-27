'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, CheckCircle, AlertTriangle, TestTube } from 'lucide-react';

interface ConnectedWalletInfo {
  address: string;
  walletType: string;
  balance: number;
  handle?: string;
}

// 🎉 NEW WORKING AGENT VAULT CONFIGURATION - REGISTRY TRACKED
const AGENT_VAULT_CONFIG = {
  contractAddress: 'addr1w8gnkw8z0jlyk4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j' // ✅ NEW WORKING CONTRACT - REGISTRY TRACKED
};

export default function AgentVaultWithdrawalPage() {
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWalletInfo | null>(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState('5'); // Default 5 ADA
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'connect' | 'configure' | 'processing' | 'complete' | 'error'>('connect');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [vaultBalance, setVaultBalance] = useState<number | null>(null);

  // Check for connected wallet on page load
  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).cardano) {
        // Check for Vespr wallet (most likely to be connected)
        if ((window as any).cardano.vespr) {
          const isEnabled = await (window as any).cardano.vespr.isEnabled();
          if (isEnabled) {
            const walletApi = await (window as any).cardano.vespr.enable();
            const addresses = await walletApi.getUsedAddresses();
            const balance = await walletApi.getBalance();
            
            if (addresses.length > 0) {
              // Convert hex address to bech32
              const hexAddress = addresses[0];
              const bech32Address = await convertHexToBech32(hexAddress);
              
              setConnectedWallet({
                address: bech32Address,
                walletType: 'vespr',
                balance: parseInt(balance) / 1000000 // Convert to ADA
              });
              setStep('configure');
              checkVaultBalance();
            }
          }
        }
      }
    } catch (error) {
      console.log('No wallet connected or error checking connection:', error);
    }
  };

  const convertHexToBech32 = async (hexAddress: string): Promise<string> => {
    try {
      const response = await fetch('/api/cardano/convert-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hexAddress })
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.bech32Address || hexAddress;
      }
    } catch (error) {
      console.log('Address conversion failed:', error);
    }
    return hexAddress;
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).cardano?.vespr) {
        const walletApi = await (window as any).cardano.vespr.enable();
        const addresses = await walletApi.getUsedAddresses();
        const balance = await walletApi.getBalance();
        
        if (addresses.length > 0) {
          const hexAddress = addresses[0];
          const bech32Address = await convertHexToBech32(hexAddress);
          
          setConnectedWallet({
            address: bech32Address,
            walletType: 'vespr',
            balance: parseInt(balance) / 1000000
          });
          setStep('configure');
          checkVaultBalance();
        }
      } else {
        setError('Vespr wallet not found. Please install Vespr wallet extension.');
      }
    } catch (error) {
      setError('Failed to connect wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Check vault balance
  const checkVaultBalance = async () => {
    try {
      console.log('🔍 Checking vault balance...');
      
      // FIXED: Query vault UTxOs directly instead of building withdrawal transaction
      const response = await fetch(`https://cardano-mainnet.blockfrost.io/api/v0/addresses/${AGENT_VAULT_CONFIG.contractAddress}/utxos`, {
        headers: { 'project_id': process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu' }
      });

      if (response.ok) {
        const utxos = await response.json();
        const totalBalance = utxos.reduce((sum: number, utxo: any) => {
          const adaAmount = utxo.amount.find((a: any) => a.unit === 'lovelace');
          return sum + (adaAmount ? parseInt(adaAmount.quantity) : 0);
        }, 0);

        const balanceInAda = totalBalance / 1000000;
        setVaultBalance(balanceInAda);
        console.log(`✅ Vault balance: ${balanceInAda} ADA`);
      } else {
        console.log('⚠️ Could not check vault balance');
      }
    } catch (error) {
      console.log('⚠️ Error checking vault balance:', error);
    }
  };

  // Execute withdrawal
  const executeWithdrawal = async () => {
    if (!connectedWallet) {
      setError('No wallet connected');
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    setIsProcessing(true);
    setStep('processing');
    setError('');

    try {
      console.log('🏦 Starting Agent Vault withdrawal test...');
      console.log(`💰 Amount: ${amount} ADA`);
      console.log(`📍 Contract: ${AGENT_VAULT_CONFIG.contractAddress}`);
      console.log(`👤 User: ${connectedWallet.address}`);

      // Get wallet API
      const walletApi = await (window as any).cardano[connectedWallet.walletType].enable();
      
      // Build UserWithdraw redeemer
      const userWithdrawRedeemer = {
        constructor: 1, // UserWithdraw
        fields: [
          { int: (amount * 1000000).toString() } // Convert to lovelace
        ]
      };

      console.log('🔨 Building withdrawal transaction...');

      // Build withdrawal transaction
      const buildResponse = await fetch('/api/cardano/build-withdrawal-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: connectedWallet.address,
          toAddress: connectedWallet.address,
          amount: amount * 1000000, // Convert to lovelace
          contractAddress: AGENT_VAULT_CONFIG.contractAddress,
          redeemer: userWithdrawRedeemer
        })
      });

      if (!buildResponse.ok) {
        const errorText = await buildResponse.text();
        throw new Error(`Failed to build withdrawal transaction: ${errorText}`);
      }

      const buildResult = await buildResponse.json();

      if (!buildResult.success) {
        throw new Error(buildResult.error || 'Failed to build withdrawal transaction');
      }

      console.log('✅ Withdrawal transaction built successfully');
      console.log('🔍 Transaction CBOR length:', buildResult.cborHex.length);

      // Sign transaction
      console.log('🔐 Signing withdrawal transaction...');
      const signedTx = await walletApi.signTx(buildResult.cborHex, true);
      
      console.log('✅ Transaction signed successfully');

      // Submit transaction using our Blockfrost endpoint
      console.log('📤 Submitting withdrawal transaction...');
      console.log('🔍 Unsigned CBOR length:', buildResult.cborHex.length);
      console.log('🔍 Witness set length:', signedTx.length);

      const submitResponse = await fetch('/api/cardano/submit-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unsignedTxHex: buildResult.cborHex,  // Original unsigned transaction
          witnessSetHex: signedTx              // Witness set from Vespr wallet
        })
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        throw new Error(`Transaction submission failed: ${errorData.error || 'Unknown error'}`);
      }

      const submitResult = await submitResponse.json();

      if (!submitResult.success) {
        throw new Error(submitResult.error || 'Transaction submission failed');
      }

      console.log('✅ Withdrawal transaction submitted successfully!');
      console.log('🔗 Transaction hash:', submitResult.txHash);

      setTxHash(submitResult.txHash);
      setStep('complete');

    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      setError(error instanceof Error ? error.message : 'Withdrawal failed');
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === 'connect') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-6 w-6" />
              Agent Vault Withdrawal Test
            </CardTitle>
            <CardDescription>
              Test withdrawing ADA from your Agent Vault smart contract
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will test withdrawing real ADA from the Agent Vault smart contract on Cardano mainnet.
              </AlertDescription>
            </Alert>

            <Button onClick={connectWallet} className="w-full">
              Connect Vespr Wallet
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Withdrawal Successful!
            </CardTitle>
            <CardDescription>
              Your ADA has been successfully withdrawn from the Agent Vault
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="font-medium">✅ Transaction Hash:</p>
              <p className="text-sm font-mono break-all text-green-700">{txHash}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                🔗 You can verify this transaction on:
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://cardanoscan.io/transaction/${txHash}`, '_blank')}
                >
                  CardanoScan
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://cexplorer.io/tx/${txHash}`, '_blank')}
                >
                  CExplorer
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={() => window.location.href = '/trading'} className="flex-1">
                Go to Trading
              </Button>
              <Button 
                onClick={() => {
                  setStep('configure');
                  setTxHash('');
                  setError('');
                  checkVaultBalance();
                }}
                variant="outline"
                className="flex-1"
              >
                Test Another Withdrawal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              Withdrawal Failed
            </CardTitle>
            <CardDescription>
              There was an error processing your withdrawal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={() => window.location.href = '/trading'} variant="outline" className="flex-1">
                Go to Trading
              </Button>
              <Button 
                onClick={() => {
                  setStep('configure');
                  setError('');
                }}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-6 w-6" />
            🏦 Test Agent Vault Withdrawal
          </CardTitle>
          <CardDescription>
            Test withdrawing your ADA from the Agent Vault smart contract
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {connectedWallet && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-medium">💳 Connected Wallet:</p>
              <p className="text-sm font-mono">{connectedWallet.address.slice(0, 20)}...</p>
              <p className="text-sm">Balance: {connectedWallet.balance.toFixed(2)} ADA</p>
            </div>
          )}

          {vaultBalance !== null && (
            <Alert>
              <AlertDescription>
                💰 Current vault balance: <strong>{vaultBalance} ADA</strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="withdrawal-amount">Withdrawal Amount (ADA)</Label>
            <Input
              id="withdrawal-amount"
              type="number"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
              placeholder="Enter amount to withdraw"
              min="0.1"
              step="0.1"
              disabled={isProcessing}
            />
            <p className="text-sm text-gray-500">
              This will withdraw ADA from your Agent Vault back to your wallet
            </p>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>⚠️ REAL TRANSACTION WARNING:</strong><br />
              This will execute a real withdrawal transaction on Cardano mainnet. 
              Make sure you want to withdraw the specified amount.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              onClick={() => window.location.href = '/trading'} 
              variant="outline" 
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Trading
            </Button>
            <Button 
              onClick={executeWithdrawal}
              disabled={isProcessing || !withdrawalAmount}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Execute Withdrawal'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
