import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

interface AgentVaultWithdrawalTestProps {
  connectedWallet: any;
  onBack: () => void;
}

// 🔥 FINAL PRODUCTION CONTRACT CONFIGURATION - VERIFIED WORKING CONTRACT
const AGENT_VAULT_CONFIG = {
  contractAddress: 'addr1wyq32c96u0u04s54clgeqtjk6ffd56pcxnrmu4jzn57zj3sy9gwyk' // ✅ FINAL PRODUCTION CONTRACT - DEPLOYED & VERIFIED
};

export default function AgentVaultWithdrawalTest({ connectedWallet, onBack }: AgentVaultWithdrawalTestProps) {
  const [withdrawalAmount, setWithdrawalAmount] = useState('5'); // Default 5 ADA
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'configure' | 'processing' | 'complete' | 'error'>('configure');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [vaultBalance, setVaultBalance] = useState<number | null>(null);

  // Check vault balance
  const checkVaultBalance = async () => {
    try {
      console.log('🔍 Checking vault balance...');
      
      const response = await fetch('/api/cardano/build-withdrawal-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: connectedWallet.address,
          toAddress: connectedWallet.address,
          amount: 1000000, // 1 ADA (just for balance check)
          contractAddress: AGENT_VAULT_CONFIG.contractAddress,
          redeemer: {
            constructor: 1,
            fields: [{ int: '1000000' }]
          }
        })
      });

      const result = await response.json();
      
      if (result.success && result.details) {
        setVaultBalance(result.details.totalVaultBalance);
        console.log(`💰 Vault balance: ${result.details.totalVaultBalance} ADA`);
      } else {
        console.log('⚠️ Could not determine vault balance');
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
      
      const submitResponse = await fetch('/api/cardano/submit-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cborHex: signedTx
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

  // Check balance on component mount
  React.useEffect(() => {
    if (connectedWallet) {
      checkVaultBalance();
    }
  }, [connectedWallet]);

  if (step === 'complete') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
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
            <Button onClick={onBack} variant="outline" className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agent Vault
            </Button>
            <Button 
              onClick={() => {
                setStep('configure');
                setTxHash('');
                setError('');
                checkVaultBalance();
              }}
              className="flex-1"
            >
              Test Another Withdrawal
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'error') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
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
            <Button onClick={onBack} variant="outline" className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agent Vault
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
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🏦 Test Agent Vault Withdrawal</CardTitle>
        <CardDescription>
          Test withdrawing your ADA from the Agent Vault smart contract
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
          <Button onClick={onBack} variant="outline" className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
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
  );
}
