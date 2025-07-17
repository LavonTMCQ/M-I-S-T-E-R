'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Wallet, 
  Lock, 
  TrendingUp,
  ArrowRight,
  Info
} from "lucide-react";

interface ConnectedWalletInfo {
  address: string;
  walletType: string;
  balance: number;
  handle: string | null;
  displayName: string;
}

interface AgentVaultCreationProps {
  connectedWallet: ConnectedWalletInfo;
  onVaultCreated: (vaultInfo: AgentVaultInfo) => void;
  onError: (error: string) => void;
}

interface AgentVaultInfo {
  contractAddress: string;
  userVkh: string;
  initialDeposit: number;
  maxTradeAmount: number;
  tradingEnabled: boolean;
}

// Agent Vault configuration from deployment
const AGENT_VAULT_CONFIG = {
  contractAddress: "addr1wyq32c96u0u04s54clgeqtjk6ffd56pcxnrmu4jzn57zj3sy9gwyk",
  scriptHash: "011560bae3f8fac295c7d1902e56d252da683834c7be56429d3c2946",
  agentVkh: "34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d",
  strikeContract: "be7544ca7d42c903268caecae465f3f8b5a7e7607d09165e471ac8b5"
};

export function AgentVaultCreation({
  connectedWallet,
  onVaultCreated,
  onError
}: AgentVaultCreationProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [initialDeposit, setInitialDeposit] = useState('100');
  const [maxTradeAmount, setMaxTradeAmount] = useState('50000');
  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [understandsRisks, setUnderstandsRisks] = useState(false);
  const [step, setStep] = useState<'configure' | 'confirm' | 'creating'>('configure');

  const createAgentVault = async () => {
    if (!understandsRisks) {
      onError('Please confirm you understand the risks');
      return;
    }

    const depositAmount = parseFloat(initialDeposit);
    const maxTrade = parseFloat(maxTradeAmount);

    if (depositAmount < 10) {
      onError('Minimum deposit is 10 ADA');
      return;
    }

    if (maxTrade < depositAmount) {
      onError('Max trade amount cannot be less than initial deposit');
      return;
    }

    setIsCreating(true);
    setStep('creating');

    try {
      // Get user's verification key hash
      const walletApi = await (window as any).cardano[connectedWallet.walletType].enable();
      const changeAddress = await walletApi.getChangeAddress();
      const userVkh = await getUserVkh(changeAddress);

      // Create vault datum
      const vaultDatum = {
        constructor: 0,
        fields: [
          { bytes: userVkh },
          { constructor: tradingEnabled ? 1 : 0, fields: [] },
          { int: (maxTrade * 1000000).toString() } // Convert to lovelace
        ]
      };

      // Build vault creation transaction
      const transaction = await buildVaultCreationTransaction({
        userAddress: connectedWallet.address,
        contractAddress: AGENT_VAULT_CONFIG.contractAddress,
        depositAmount: depositAmount * 1000000, // Convert to lovelace
        datum: vaultDatum,
        walletApi
      });

      // Sign and submit transaction
      const signedTx = await walletApi.signTx(transaction.cborHex);
      const txHash = await walletApi.submitTx(signedTx);

      const vaultInfo: AgentVaultInfo = {
        contractAddress: AGENT_VAULT_CONFIG.contractAddress,
        userVkh,
        initialDeposit: depositAmount,
        maxTradeAmount: maxTrade,
        tradingEnabled
      };

      onVaultCreated(vaultInfo);

    } catch (error) {
      console.error('Vault creation failed:', error);
      onError(error instanceof Error ? error.message : 'Failed to create Agent Vault');
      setStep('configure');
    } finally {
      setIsCreating(false);
    }
  };

  if (step === 'creating') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 animate-pulse" />
            Creating Agent Vault
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Deploying Your Secure Agent Vault</h3>
            <p className="text-muted-foreground">
              Creating smart contract with your security preferences...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'confirm') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Confirm Agent Vault Creation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Review your Agent Vault configuration before deployment.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Initial Deposit</Label>
                <p className="text-lg font-semibold">{initialDeposit} ADA</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Max Trade Amount</Label>
                <p className="text-lg font-semibold">{maxTradeAmount} ADA</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Trading Status</Label>
              <Badge variant={tradingEnabled ? "default" : "secondary"}>
                {tradingEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>

            <div>
              <Label className="text-sm font-medium">Contract Address</Label>
              <p className="text-sm font-mono bg-muted p-2 rounded">
                {AGENT_VAULT_CONFIG.contractAddress}
              </p>
            </div>
          </div>

          <div className="space-y-4">
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
                I understand that this creates a smart contract vault where only I control my funds
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep('configure')}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={createAgentVault}
              disabled={!understandsRisks || isCreating}
              className="flex-1"
            >
              Create Agent Vault
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Create Agent Vault
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Enhanced Security:</strong> Agent Vault uses smart contracts instead of managed wallets. 
            You maintain full control while enabling automated trading.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <Lock className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <h3 className="font-semibold">Your Keys</h3>
            <p className="text-sm text-muted-foreground">You keep full control</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <h3 className="font-semibold">Automated Trading</h3>
            <p className="text-sm text-muted-foreground">AI trades for you</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <Shield className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <h3 className="font-semibold">Smart Contract</h3>
            <p className="text-sm text-muted-foreground">On-chain security</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="initial-deposit">Initial Deposit (ADA)</Label>
            <Input
              id="initial-deposit"
              type="number"
              value={initialDeposit}
              onChange={(e) => setInitialDeposit(e.target.value)}
              min="10"
              max="10000"
              placeholder="100"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Minimum 10 ADA required for vault creation
            </p>
          </div>

          <div>
            <Label htmlFor="max-trade">Maximum Trade Amount (ADA)</Label>
            <Input
              id="max-trade"
              type="number"
              value={maxTradeAmount}
              onChange={(e) => setMaxTradeAmount(e.target.value)}
              min="10"
              max="100000"
              placeholder="50000"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Maximum amount the agent can trade in a single transaction
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trading-enabled"
              checked={tradingEnabled}
              onCheckedChange={(checked) => setTradingEnabled(checked as boolean)}
            />
            <Label htmlFor="trading-enabled">Enable automated trading</Label>
          </div>
        </div>

        <Button
          onClick={() => setStep('confirm')}
          className="w-full"
          disabled={!initialDeposit || !maxTradeAmount}
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Review Configuration
        </Button>
      </CardContent>
    </Card>
  );
}

// Helper functions (would be implemented in separate utility files)
async function getUserVkh(address: string): Promise<string> {
  // This would extract the verification key hash from the user's address
  // For now, return a placeholder
  return "user_vkh_placeholder_64_chars_1234567890abcdef1234567890abcdef";
}

async function buildVaultCreationTransaction(params: any): Promise<any> {
  // This would build the actual Cardano transaction for vault creation
  // For now, return a placeholder structure
  return {
    cborHex: "placeholder_cbor_hex"
  };
}
