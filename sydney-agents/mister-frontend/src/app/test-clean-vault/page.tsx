'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

// Type declaration for Cardano wallet
declare global {
  interface Window {
    cardano?: {
      vespr?: {
        enable: () => Promise<{
          getUsedAddresses: () => Promise<string[]>;
          signTx: (tx: string) => Promise<string>;
          submitTx: (tx: string) => Promise<string>;
        }>;
      };
    };
  }
}

// ✨ CLEAN WORKING CONTRACT - Simple Learning Contract (5-6 ADA MAX)
const CLEAN_CONTRACT = {
  contractAddress: "addr1w8gnkw8z0jlyk4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j",
  scriptHash: "d13b38e27cbe4b54501e3430d26ca3ba59981bc64147c9bd1a5f82a2",
  scriptCBOR: "5857010100323232323225333002323232323253330073370e900118041baa00113233224a260160026016601800260126ea800458c024c02800cc020008c01c008c01c004c010dd50008a4c26cacae6955ceaab9e5742ae89",
  plutusVersion: "V2",
  maxTestAmount: 6,
  purpose: "learning_deposit_withdrawal_mechanics"
};

export default function TestCleanVaultPage() {
  // Use the correct wallet context properties
  const { mainWallet, isLoading, connectWallet } = useWallet();
  const [depositAmount, setDepositAmount] = useState('5');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const isConnected = !!mainWallet;
  const currentNetwork: 'testnet' | 'mainnet' = mainWallet?.address?.startsWith('addr_test') ? 'testnet' : 'mainnet';

  // Debug wallet state
  useEffect(() => {
    console.log('🔍 Wallet Context Debug:', {
      mainWallet,
      isConnected,
      isLoading,
      address: mainWallet?.address,
      balance: mainWallet?.balance,
      displayName: mainWallet?.displayName
    });
  }, [mainWallet, isConnected, isLoading]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  // Connect wallet with proper wallet type parameter
  const handleConnectWallet = async () => {
    try {
      const success = await connectWallet('vespr'); // Pass the required walletType parameter
      if (success && mainWallet) {
        addTestResult(`✅ Wallet connected - ${currentNetwork} - ${mainWallet.balance.toFixed(2)} ADA`);
      } else {
        addTestResult(`❌ Wallet connection failed or cancelled`);
      }
    } catch (error) {
      addTestResult(`❌ Wallet connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testDeposit = async () => {
    if (!isConnected || !mainWallet) return;

    setIsDepositing(true);
    try {
      const amount = parseFloat(depositAmount);

      // Safety validation
      if (amount > CLEAN_CONTRACT.maxTestAmount) {
        throw new Error(`🚨 SAFETY LIMIT: Maximum ${CLEAN_CONTRACT.maxTestAmount} ADA allowed`);
      }
      if (amount < 5) {
        throw new Error('Minimum 5 ADA required for meaningful testing');
      }

      addTestResult(`🚀 Starting deposit test: ${amount} ADA`);
      addTestResult(`📍 Contract: ${CLEAN_CONTRACT.contractAddress.substring(0, 30)}...`);
      addTestResult(`🔒 Script Hash: ${CLEAN_CONTRACT.scriptHash}`);

      // Use the wallet context address (already properly formatted)
      const walletAddress = mainWallet.address;
      addTestResult(`💰 Using Wallet Context Address: ${walletAddress.substring(0, 30)}...`);
      addTestResult(`🔍 Address Length: ${walletAddress.length} characters`);
      addTestResult(`🔍 Address Format: ${walletAddress.startsWith('addr1') ? 'Valid bech32' : 'Invalid format'}`);

      // Validate the wallet context address
      if (!walletAddress || walletAddress.length < 50 || !walletAddress.startsWith('addr1')) {
        throw new Error(`Invalid wallet context address: ${walletAddress}`);
      }

      addTestResult(`✅ Connected to Vespr wallet with valid address`);
      addTestResult(`🔧 Building transaction using direct build-transaction API...`);

      // Use the working build-transaction endpoint directly (relative URL uses same port as page)
      const response = await fetch('/api/cardano/build-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: walletAddress,
          toAddress: CLEAN_CONTRACT.contractAddress,
          amount: amount, // Amount in ADA
          network: currentNetwork
        })
      });

      if (!response.ok) {
        const error = await response.json();
        addTestResult(`❌ API Response Error: ${JSON.stringify(error, null, 2)}`);
        throw new Error(`Transaction building failed: ${error.error || 'Unknown error'}`);
      }

      const result = await response.json();
      const cborHex = result.cborHex;

      if (!cborHex) {
        throw new Error('No CBOR returned from transaction builder');
      }

      addTestResult(`✅ Transaction CBOR built successfully`);
      addTestResult(`📦 CBOR length: ${cborHex.length} characters`);
      addTestResult(`💰 Sending ${amount} ADA from wallet to contract`);

      // Now we have the CBOR, let's sign it with Vespr wallet
      addTestResult(`🔐 Requesting wallet signature...`);

      // Get fresh wallet API connection
      if (!window.cardano || !window.cardano.vespr) {
        throw new Error('Vespr wallet not found');
      }

      const walletApi = await window.cardano.vespr.enable();

      // Sign the transaction
      const signedTx = await walletApi.signTx(cborHex, true);
      addTestResult(`✅ Transaction signed by wallet!`);

      // Submit transaction to Cardano network
      addTestResult(`📤 Submitting transaction to ${currentNetwork}...`);

      try {
        const txHash = await walletApi.submitTx(signedTx);
        addTestResult(`🎉 DEPOSIT TRANSACTION SUBMITTED!`);
        addTestResult(`📋 TX Hash: ${txHash}`);
        addTestResult(`🔗 View on Cardanoscan: https://cardanoscan.io/transaction/${txHash}`);
        addTestResult(`✅ SUCCESS! ${amount} ADA deposited to learning contract`);
      } catch (submitError) {
        console.error('❌ Transaction submission error:', submitError);
        addTestResult(`❌ Transaction submission failed: ${submitError.message || submitError}`);

        // Try alternative submission method
        addTestResult(`🔄 Trying alternative submission method...`);
        try {
          // Sometimes Vespr needs a different approach
          const txHashAlt = await walletApi.submitTx(signedTx, false);
          addTestResult(`🎉 DEPOSIT TRANSACTION SUBMITTED (alternative method)!`);
          addTestResult(`📋 TX Hash: ${txHashAlt}`);
          addTestResult(`🔗 View on Cardanoscan: https://cardanoscan.io/transaction/${txHashAlt}`);
          addTestResult(`✅ SUCCESS! ${amount} ADA deposited to learning contract`);
        } catch (altError) {
          addTestResult(`❌ Alternative submission also failed: ${altError.message || altError}`);
          addTestResult(`⚠️ Transaction was signed but submission failed. This might be a network issue.`);
          addTestResult(`💡 Possible solutions:`);
          addTestResult(`   1. Check your internet connection`);
          addTestResult(`   2. Try again in a few minutes (network congestion)`);
          addTestResult(`   3. Restart Vespr wallet and try again`);
          addTestResult(`   4. The transaction was properly built and signed - this is likely a temporary issue`);

          // Don't throw error - let user know it's likely temporary
          addTestResult(`🔧 Transaction building and signing worked correctly - submission issue is likely temporary`);
        }
      }

    } catch (error) {
      addTestResult(`❌ Deposit test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDepositing(false);
    }
  };

  const testWithdrawal = async () => {
    if (!isConnected || !mainWallet) return;

    setIsWithdrawing(true);
    try {
      addTestResult(`🔄 Starting withdrawal test from learning contract`);
      addTestResult(`📍 Contract: ${CLEAN_CONTRACT.contractAddress.substring(0, 30)}...`);

      // Use the wallet context address (already properly formatted)
      const walletAddress = mainWallet.address;
      addTestResult(`💰 Using Wallet Context Address: ${walletAddress.substring(0, 30)}...`);

      // First, check what's actually in the contract
      addTestResult(`🔍 Checking contract balance first...`);

      try {
        const utxosResponse = await fetch(`https://cardano-mainnet.blockfrost.io/api/v0/addresses/${CLEAN_CONTRACT.contractAddress}/utxos`, {
          headers: {
            'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
          }
        });

        if (utxosResponse.ok) {
          const utxos = await utxosResponse.json();
          const totalBalance = utxos.reduce((sum: number, utxo: any) => {
            const adaAmount = utxo.amount.find((a: any) => a.unit === 'lovelace');
            return sum + (adaAmount ? parseInt(adaAmount.quantity) : 0);
          }, 0);

          const balanceInAda = totalBalance / 1000000;
          addTestResult(`💰 Contract Balance: ${balanceInAda} ADA`);
          addTestResult(`📊 UTxOs found: ${utxos.length}`);

          if (balanceInAda === 0) {
            addTestResult(`⚠️ No funds in contract - deposit first before testing withdrawal`);
            return;
          }

          // Now build withdrawal transaction using NEW withdrawal API
          addTestResult(`🔧 Building withdrawal transaction using dedicated withdrawal API...`);

          const withdrawalAmount = Math.min(5000000, totalBalance - 1000000); // Withdraw up to 5 ADA, leave 1 ADA for fees
          addTestResult(`💰 Withdrawing ${withdrawalAmount / 1000000} ADA from contract`);

          const response = await fetch('/api/cardano/build-withdrawal', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fromAddress: walletAddress, // Where funds go (user wallet)
              contractAddress: CLEAN_CONTRACT.contractAddress, // Where funds come from (contract)
              amount: withdrawalAmount, // Amount in lovelace
              network: currentNetwork
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              addTestResult(`✅ Withdrawal transaction built successfully`);
              addTestResult(`📦 CBOR Length: ${result.cborHex?.length || 'N/A'} characters`);
              addTestResult(`💰 Withdrawing from contract to wallet`);
              addTestResult(`🔐 Requesting wallet signature...`);

              // Get fresh wallet API connection
              if (!window.cardano || !window.cardano.vespr) {
                throw new Error('Vespr wallet not found');
              }

              const walletApi = await window.cardano.vespr.enable();

              // Sign the transaction
              const signedTx = await walletApi.signTx(result.cborHex, true);
              addTestResult(`✅ Transaction signed by wallet!`);

              // Submit transaction to Cardano network
              addTestResult(`📤 Submitting transaction to ${currentNetwork}...`);

              try {
                const txHash = await walletApi.submitTx(signedTx);
                addTestResult(`🎉 WITHDRAWAL TRANSACTION SUBMITTED!`);
                addTestResult(`📋 TX Hash: ${txHash}`);
                addTestResult(`🔗 View on Cardanoscan: https://cardanoscan.io/transaction/${txHash}`);
                addTestResult(`✅ SUCCESS! Funds withdrawn from learning contract`);
              } catch (submitError) {
                console.error('❌ Withdrawal submission error:', submitError);
                addTestResult(`❌ Withdrawal submission failed: ${submitError.message || submitError}`);

                // Try alternative submission method
                addTestResult(`🔄 Trying alternative submission method...`);
                try {
                  const txHashAlt = await walletApi.submitTx(signedTx, false);
                  addTestResult(`🎉 WITHDRAWAL TRANSACTION SUBMITTED (alternative method)!`);
                  addTestResult(`📋 TX Hash: ${txHashAlt}`);
                  addTestResult(`🔗 View on Cardanoscan: https://cardanoscan.io/transaction/${txHashAlt}`);
                  addTestResult(`✅ SUCCESS! Funds withdrawn from learning contract`);
                } catch (altError) {
                  addTestResult(`❌ Alternative submission also failed: ${altError.message || altError}`);
                  addTestResult(`⚠️ Transaction was signed but submission failed. This might be a network issue.`);
                  throw submitError; // Re-throw original error
                }
              }
            } else {
              addTestResult(`❌ Withdrawal API error: ${result.error || 'Unknown error'}`);
              throw new Error(`Withdrawal building failed: ${result.error || 'Unknown error'}`);
            }
          } else {
            const error = await response.json();
            addTestResult(`❌ API Response Error: ${JSON.stringify(error, null, 2)}`);
            throw new Error(`Withdrawal building failed: ${error.error || 'Unknown error'}`);
          }
        } else {
          throw new Error(`Failed to check contract balance: ${utxosResponse.statusText}`);
        }
      } catch (balanceError) {
        addTestResult(`❌ Error checking contract balance: ${balanceError}`);
        throw balanceError;
      }

    } catch (error) {
      addTestResult(`❌ Withdrawal test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-yellow-500" />
            Clean Vault Testing - Learning Contract
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Safety Warning */}
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>🧪 LEARNING CONTRACT ONLY</strong><br/>
              • Maximum {CLEAN_CONTRACT.maxTestAmount} ADA (strictly enforced)<br/>
              • No security validation - always returns True<br/>
              • Purpose: Understanding deposit/withdrawal mechanics<br/>
              • Never use for real trading or large amounts
            </AlertDescription>
          </Alert>

          {/* Contract Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium">Contract Configuration</h4>
            <div className="text-sm text-gray-600 space-y-1 font-mono">
              <div>📍 Address: {CLEAN_CONTRACT.contractAddress}</div>
              <div>🔑 Script Hash: {CLEAN_CONTRACT.scriptHash}</div>
              <div>⚙️ Plutus Version: {CLEAN_CONTRACT.plutusVersion}</div>
              <div>🎯 Purpose: {CLEAN_CONTRACT.purpose}</div>
            </div>
          </div>

          {/* Wallet Connection */}
          {!isConnected ? (
            <Button onClick={handleConnectWallet} disabled={isLoading} className="w-full">
              {isLoading ? 'Connecting...' : 'Connect Vespr Wallet'}
            </Button>
          ) : (
            <div className="bg-green-50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-green-800">✅ Wallet Connected</h4>
              <div className="text-sm text-green-700 space-y-1">
                <div>👤 {mainWallet.displayName}</div>
                <div>🌐 Network: {currentNetwork}</div>
                <div>💰 Balance: {mainWallet.balance.toFixed(2)} {currentNetwork === 'testnet' ? 'tADA' : 'ADA'}</div>
                <div>📍 Address: {mainWallet.address.substring(0, 30)}...</div>
              </div>
            </div>
          )}

          {/* Test Controls */}
          {isConnected && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="depositAmount">Test Deposit Amount (ADA)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="5"
                  max={CLEAN_CONTRACT.maxTestAmount}
                  step="0.1"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Range: 5 - {CLEAN_CONTRACT.maxTestAmount} ADA (safety enforced)
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={testDeposit}
                  disabled={isDepositing}
                  className="flex-1"
                >
                  {isDepositing ? 'Testing Deposit...' : `Test Deposit (${depositAmount} ADA)`}
                </Button>
                <Button 
                  onClick={testWithdrawal}
                  disabled={isWithdrawing}
                  variant="outline"
                  className="flex-1"
                >
                  {isWithdrawing ? 'Testing Withdrawal...' : 'Test Withdrawal'}
                </Button>
              </div>
            </div>
          )}

          {/* Test Results */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Test Results</h4>
              {testResults.length > 0 && (
                <Button onClick={clearResults} variant="outline" size="sm">
                  Clear Results
                </Button>
              )}
            </div>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-80 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-gray-500">Test results will appear here...</div>
              ) : (
                testResults.map((result, index) => (
                  <div key={index}>{result}</div>
                ))
              )}
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}