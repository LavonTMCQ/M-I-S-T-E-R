'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { strikeAPI } from '@/lib/api/strike';
import { useWallet } from '@/contexts/WalletContext';

// Extend Window interface for Cardano wallet
declare global {
  interface Window {
    cardano?: {
      [key: string]: {
        enable(): Promise<{
          signTx(cbor: string, partialSign?: boolean): Promise<string>;
          submitTx(cbor: string): Promise<string>;
        }>;
      };
    };
  }
}

export default function TestStrikePage() {
  const { toast } = useToast();
  const { mainWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [tradeSize, setTradeSize] = useState('10');

  const addLog = (message: string) => {
    console.log(message);
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testStrikeIntegration = async () => {
    if (!mainWallet?.address) {
      toast({
        title: "No Wallet Connected",
        description: "Please connect a wallet first",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTestResults([]);
    
    try {
      addLog('🚀 Starting Strike Finance integration test...');
      addLog(`📍 Using wallet address: ${mainWallet.address.substring(0, 20)}...`);
      
      // Step 1: Call Strike Finance API
      addLog('📡 Step 1: Calling Strike Finance API...');
      const result = await strikeAPI.openPosition({
        address: mainWallet.address,
        side: 'Long',
        collateralAmount: parseFloat(tradeSize),
        enteredPositionTime: Math.floor(Date.now() / 1000)
      });

      if (!result.success || !result.data) {
        addLog(`❌ Strike API failed: ${result.error}`);
        return;
      }

      addLog('✅ Strike Finance API successful');
      addLog(`🔍 CBOR length: ${result.data.cbor.length}`);
      addLog(`🔍 CBOR starts: ${result.data.cbor.substring(0, 40)}`);
      addLog(`🔍 CBOR ends: ${result.data.cbor.substring(result.data.cbor.length - 40)}`);

      // Step 2: Analyze the CBOR structure
      addLog('🔍 Step 2: Analyzing CBOR structure...');
      const originalCbor = result.data.cbor;
      
      // Look for witness set patterns
      if (originalCbor.includes('a0')) {
        addLog('🔍 Found empty witness set (a0) in original CBOR');
      }
      
      const witnessPattern = /a1[0-9a-f]{2,}/gi;
      const witnessMatches = originalCbor.match(witnessPattern);
      if (witnessMatches) {
        addLog(`🔍 Found ${witnessMatches.length} witness set patterns: ${witnessMatches.map(m => m.substring(0, 10)).join(', ')}`);
      }

      // Step 3: Get wallet API
      addLog('🔍 Step 3: Getting wallet API...');
      if (!window.cardano || !window.cardano[mainWallet?.walletType || 'eternl']) {
        addLog('❌ Wallet not available');
        return;
      }

      const walletApi = await window.cardano[mainWallet?.walletType || 'eternl'].enable();
      addLog('✅ Wallet API obtained');

      // Step 4: Sign with partial signing
      addLog('🔍 Step 4: Signing with partial signing...');
      const ourWitnessSet = await walletApi.signTx(originalCbor, true);
      addLog(`✅ Signing successful, witness set length: ${ourWitnessSet.length}`);
      addLog(`🔍 Our witness set: ${ourWitnessSet}`);
      
      // Analyze our witness set
      if (ourWitnessSet.startsWith('a10081')) {
        addLog('🔍 Our witness set format: a10081... (correct format)');
        const vkeyWitness = ourWitnessSet.substring(6);
        addLog(`🔍 VKey witness: ${vkeyWitness.substring(0, 50)}...`);
      }

      // Step 5: Try different combination approaches
      addLog('🔍 Step 5: Testing witness set combination approaches...');
      
      // Approach 1: Replace a0 with our witness set
      if (originalCbor.includes('a0')) {
        const combined1 = originalCbor.replace('a0', ourWitnessSet);
        addLog(`🔧 Approach 1 (replace a0): ${combined1.length} chars`);
        
        // Test this combination
        try {
          addLog('📡 Testing Approach 1 via Blockfrost...');
          const response = await fetch('https://cardano-mainnet.blockfrost.io/api/v0/tx/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/cbor',
              'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
            },
            body: Buffer.from(combined1, 'hex')
          });
          
          if (response.ok) {
            const txHash = await response.text();
            addLog(`🎉 SUCCESS! Transaction submitted: ${txHash}`);
            toast({
              title: "Success!",
              description: `Transaction submitted: ${txHash.substring(0, 16)}...`,
            });
            return;
          } else {
            const errorText = await response.text();
            addLog(`❌ Approach 1 failed: ${errorText}`);
          }
        } catch (error) {
          addLog(`❌ Approach 1 error: ${error}`);
        }
      }

      // Approach 2: Replace existing witness sets
      if (witnessMatches && witnessMatches.length > 0) {
        for (let i = 0; i < witnessMatches.length; i++) {
          const combined2 = originalCbor.replace(witnessMatches[i], ourWitnessSet);
          addLog(`🔧 Approach 2.${i+1} (replace ${witnessMatches[i].substring(0, 10)}): ${combined2.length} chars`);
          
          try {
            addLog(`📡 Testing Approach 2.${i+1} via Blockfrost...`);
            const response = await fetch('https://cardano-mainnet.blockfrost.io/api/v0/tx/submit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/cbor',
                'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
              },
              body: Buffer.from(combined2, 'hex')
            });
            
            if (response.ok) {
              const txHash = await response.text();
              addLog(`🎉 SUCCESS! Transaction submitted: ${txHash}`);
              toast({
                title: "Success!",
                description: `Transaction submitted: ${txHash.substring(0, 16)}...`,
              });
              return;
            } else {
              const errorText = await response.text();
              addLog(`❌ Approach 2.${i+1} failed: ${errorText}`);
            }
          } catch (error) {
            addLog(`❌ Approach 2.${i+1} error: ${error}`);
          }
        }
      }

      // Approach 3: Try submitting original CBOR directly
      addLog('🔧 Approach 3: Submitting original CBOR directly...');
      try {
        const response = await fetch('https://cardano-mainnet.blockfrost.io/api/v0/tx/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/cbor',
            'project_id': 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'
          },
          body: Buffer.from(originalCbor, 'hex')
        });
        
        if (response.ok) {
          const txHash = await response.text();
          addLog(`🎉 SUCCESS! Original CBOR worked: ${txHash}`);
          toast({
            title: "Success!",
            description: `Transaction submitted: ${txHash.substring(0, 16)}...`,
          });
          return;
        } else {
          const errorText = await response.text();
          addLog(`❌ Approach 3 failed: ${errorText}`);
        }
      } catch (error) {
        addLog(`❌ Approach 3 error: ${error}`);
      }

      addLog('❌ All approaches failed. Need to investigate further.');

    } catch (error) {
      addLog(`❌ Test failed: ${error}`);
      console.error('Test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Strike Finance Integration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tradeSize">Trade Size (ADA)</Label>
            <Input
              id="tradeSize"
              type="number"
              value={tradeSize}
              onChange={(e) => setTradeSize(e.target.value)}
              placeholder="10"
              min="1"
              max="100"
            />
          </div>

          <Button 
            onClick={testStrikeIntegration}
            disabled={isLoading || !mainWallet?.address}
            className="w-full"
          >
            {isLoading ? 'Testing...' : 'Test Strike Integration'}
          </Button>

          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div key={index}>{result}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
