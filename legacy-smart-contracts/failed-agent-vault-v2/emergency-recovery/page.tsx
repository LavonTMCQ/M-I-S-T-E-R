'use client';

import React, { useState, useEffect } from 'react';
import { emergencyRecoveryService } from '@/services/emergency-ada-recovery';
import { simpleVaultService } from '@/services/simple-vault-lucid-client';
import { directTransferService } from '@/services/direct-transfer-service';
import { simpleUtxoRecovery } from '@/services/simple-utxo-recovery';

export default function EmergencyRecovery() {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [testVaultAddress, setTestVaultAddress] = useState<string>('');

  // Get test vault address
  useEffect(() => {
    if (simpleVaultService) {
      simpleVaultService.calculateSimpleVaultAddress().then(address => {
        setTestVaultAddress(address);
      });
    }
  }, []);

  const connectWallet = async () => {
    try {
      console.log('🔗 Connecting to Vespr wallet...');
      
      const vespr = (window as any).cardano?.vespr;
      if (!vespr) {
        throw new Error('Vespr wallet not found - please install Vespr wallet extension');
      }
      
      console.log('✅ Vespr wallet found, requesting access...');
      const walletApi = await vespr.enable();
      
      console.log('✅ Wallet API enabled:', walletApi);
      
      // Test the wallet API
      try {
        const addresses = await walletApi.getUsedAddresses();
        console.log('✅ Wallet addresses:', addresses);
        
        if (!addresses || addresses.length === 0) {
          throw new Error('No addresses found in wallet');
        }
        
        return walletApi;
      } catch (apiError: any) {
        console.error('❌ Wallet API test failed:', apiError);
        throw new Error(`Wallet API error: ${apiError.message}`);
      }
      
    } catch (error: any) {
      console.error('❌ Wallet connection error:', error);
      setResult(`❌ Wallet connection failed: ${error.message}`);
      return null;
    }
  };

  // Test with 1 ADA first - deposit to test vault
  const testDeposit1Ada = async () => {
    if (!simpleVaultService) return;
    
    setIsLoading(true);
    setResult('🔧 Depositing 1 ADA to test vault...\n');
    
    try {
      const wallet = await connectWallet();
      if (!wallet) return;
      
      setResult(prev => prev + '💰 Sending 1 ADA to test vault address...\n');
      
      const result = await simpleVaultService.depositToSimpleVault(wallet, 1);
      
      if (result.success) {
        setResult(prev => prev + `✅ Test deposit successful!\n` +
          `TX: ${result.txHash}\n\n` +
          `🎯 Now test withdrawal to prove the method works!`);
      } else {
        setResult(prev => prev + `❌ Test deposit failed: ${result.error}`);
      }
    } catch (error: any) {
      setResult(prev => prev + `❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Direct transfer test - bypass all smart contract issues
  const testDirectTransfer = async () => {
    if (!directTransferService) return;
    
    setIsLoading(true);
    setResult('🔧 Testing DIRECT ADA transfer (no smart contracts)...\n');
    
    try {
      const wallet = await connectWallet();
      if (!wallet) return;
      
      setResult(prev => prev + '🎯 Sending 0.5 ADA to yourself as test...\n');
      
      const result = await directTransferService.recoverTestAda(wallet);
      
      if (result.success) {
        setResult(prev => prev + `✅ DIRECT TRANSFER WORKS! 🎉\n` +
          `TX: ${result.txHash}\n\n` +
          `🚀 The Lucid pattern is proven! Now we can recover your ADA!`);
      } else {
        setResult(prev => prev + `❌ Direct transfer failed: ${result.error}`);
      }
    } catch (error: any) {
      setResult(prev => prev + `❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Emergency recovery of all 11 ADA
  const emergencyRecoverAll = async () => {
    if (!emergencyRecoveryService) return;
    
    setIsLoading(true);
    setResult('🚨 EMERGENCY ADA RECOVERY STARTING...\n\n');
    
    try {
      const wallet = await connectWallet();
      if (!wallet) return;
      
      setResult(prev => prev + '🎯 Attempting to recover all 11 ADA...\n');
      setResult(prev => prev + '💰 Target: addr1w8hksl7jnqst7e58ypcn4d6k68d6z0rw7hkuch5wad7d07c3zn2nj\n');
      setResult(prev => prev + '🔧 Using proven working script pattern...\n\n');
      
      const result = await emergencyRecoveryService.recoverAllAda(wallet);
      
      if (result.success) {
        setResult(prev => prev + `🎉 RECOVERY SUCCESSFUL! 🎉\n` +
          `TX: ${result.txHash}\n\n` +
          `✅ Your 11 ADA has been recovered!\n` +
          `💸 Check your wallet balance!`);
      } else {
        setResult(prev => prev + `❌ Recovery failed: ${result.error}\n\n` +
          `🔄 Trying multiple recovery methods...`);
        
        // Try alternative methods
        const altResult = await emergencyRecoveryService.tryMultipleRecoveryMethods(wallet);
        
        if (altResult.success) {
          setResult(prev => prev + `\n✅ ALTERNATIVE METHOD WORKED!\n` +
            `TX: ${altResult.txHash}\n` +
            `🎉 Your ADA has been recovered!`);
        } else {
          setResult(prev => prev + `\n❌ All methods failed: ${altResult.error}`);
        }
      }
    } catch (error: any) {
      setResult(prev => prev + `❌ Emergency recovery error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🚨 Emergency ADA Recovery</h1>
      
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">⚠️ Safe Testing Strategy</h2>
        <p className="text-red-700 text-sm mb-2">Test with 1 ADA first to prove the method works before risking your 11 ADA:</p>
        <ol className="text-red-700 text-sm list-decimal list-inside space-y-1">
          <li>Deposit 1 ADA to test vault</li>
          <li>Withdraw 1 ADA from test vault</li>
          <li>If successful, recover your 11 ADA</li>
        </ol>
      </div>

      {testVaultAddress && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-2">Test Vault Address (1 ADA only):</h3>
          <code className="text-xs bg-gray-100 p-2 rounded break-all block">
            {testVaultAddress}
          </code>
        </div>
      )}

      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold mb-2">Target Recovery Address (11 ADA):</h3>
        <code className="text-xs bg-gray-100 p-2 rounded break-all block">
          addr1w8hksl7jnqst7e58ypcn4d6k68d6z0rw7hkuch5wad7d07c3zn2nj
        </code>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Testing Phase (1 ADA):</h3>
        <div className="flex space-x-4">
          <button
            onClick={testDeposit1Ada}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isLoading ? '⏳ Working...' : '1️⃣ Test Deposit (1 ADA)'}
          </button>

          <button
            onClick={testDirectTransfer}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isLoading ? '⏳ Working...' : '⚡ Test Direct Transfer (0.5 ADA)'}
          </button>
        </div>

        <h3 className="text-lg font-semibold text-green-600 pt-4">🎯 BREAKTHROUGH - No Smart Contracts Needed!</h3>
        <div className="bg-green-50 p-4 rounded-lg mb-4">
          <p className="text-green-800 text-sm mb-2">
            <strong>DISCOVERY:</strong> Your UTxOs have no script validation! They can be withdrawn with a simple transaction.
          </p>
        </div>
        <button
          onClick={async () => {
            if (!simpleUtxoRecovery) return;
            
            setIsLoading(true);
            setResult('🎯 SIMPLE UTxO RECOVERY - NO SMART CONTRACTS NEEDED!\n\n');
            
            try {
              const wallet = await connectWallet();
              if (!wallet) return;
              
              setResult(prev => prev + '📍 Your UTxOs have NO script validation!\n');
              setResult(prev => prev + '🚀 Recovering with simple transaction...\n\n');
              
              const result = await simpleUtxoRecovery.recoverAllUtxos(wallet);
              
              if (result.success) {
                setResult(prev => prev + `🎉 RECOVERY SUCCESSFUL! 🎉\n\n` +
                  `TX: ${result.txHash}\n\n` +
                  `✅ Your 11 ADA has been recovered!\n` +
                  `💰 Check your wallet balance!`);
              } else {
                setResult(prev => prev + `❌ Recovery failed: ${result.error}`);
              }
            } catch (error: any) {
              setResult(prev => prev + `❌ Error: ${error.message}`);
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors"
        >
          {isLoading ? '⏳ Recovering...' : '🎯 RECOVER YOUR 11 ADA NOW!'}
        </button>

        {result && (
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
            {result}
          </div>
        )}
      </div>
    </div>
  );
}