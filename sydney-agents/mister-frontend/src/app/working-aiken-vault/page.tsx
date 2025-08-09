'use client';

import { useState } from 'react';

/**
 * Working Aiken Vault - Uses standalone Cardano service
 * This page calls the separate Node.js service that runs MeshJS
 */
export default function WorkingAikenVaultPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<any>(null);
  const [lockResult, setLockResult] = useState<any>(null);
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  const CARDANO_SERVICE_URL = process.env.NEXT_PUBLIC_CARDANO_SERVICE_URL || 'http://localhost:3001';

  // Generate wallet credentials
  const generateCredentials = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${CARDANO_SERVICE_URL}/generate-credentials`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCredentials(data);
        setResult(data);
      } else {
        setError(data.error || 'Failed to generate credentials');
      }
    } catch (err: any) {
      setError(`Service connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Lock funds to vault
  const lockFunds = async () => {
    if (!credentials?.seed) {
      setError('Generate credentials first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${CARDANO_SERVICE_URL}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: credentials.seed,
          amount: '1000000' // 1 ADA (meets minimum UTXO requirement)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLockResult(data);
        setResult(data);
      } else {
        setError(data.error || 'Failed to lock funds');
      }
    } catch (err: any) {
      setError(`Service connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Unlock funds from vault
  const unlockFunds = async () => {
    if (!credentials?.seed || !lockResult?.txHash) {
      setError('Need credentials and lock transaction hash');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${CARDANO_SERVICE_URL}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: credentials.seed,
          txHash: lockResult.txHash
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to unlock funds');
      }
    } catch (err: any) {
      setError(`Service connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Check service health
  const checkHealth = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${CARDANO_SERVICE_URL}/health`);
      const data = await response.json();
      
      setNetworkInfo(data);
      setResult(data);
    } catch (err: any) {
      setError(`Cannot connect to Cardano service at ${CARDANO_SERVICE_URL}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🎉 WORKING Aiken Vault!</h1>
      
      {/* Network Warning */}
      {networkInfo?.network === 'mainnet' && (
        <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4 mb-6">
          <h2 className="font-bold text-red-900 mb-2 text-lg">🚨 MAINNET MODE - USING REAL ADA!</h2>
          <ul className="text-sm text-red-800 space-y-1">
            <li>• ⚠️ This will use REAL ADA on Cardano mainnet</li>
            <li>• 💰 Safety limit: Maximum {networkInfo.mainnet_safety_limit} per transaction</li>
            <li>• 🔍 Always verify script address before sending funds</li>
            <li>• 📊 View transactions on CardanoScan.io</li>
          </ul>
        </div>
      )}
      
      <div className={`${networkInfo?.network === 'mainnet' ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-200'} border rounded-lg p-4 mb-6`}>
        <h2 className={`font-semibold ${networkInfo?.network === 'mainnet' ? 'text-yellow-900' : 'text-green-900'} mb-2`}>
          ✅ This Actually Works - No WASM Issues!
        </h2>
        <ul className={`text-sm ${networkInfo?.network === 'mainnet' ? 'text-yellow-800' : 'text-green-800'} space-y-1`}>
          <li>• Standalone Node.js service handles all Cardano operations</li>
          <li>• MeshJS v1.8.4 runs properly outside Next.js</li>
          <li>• Exact same pattern as Aiken hello_world example</li>
          <li>• Service running on port 3001, Next.js on 3000</li>
          {networkInfo && (
            <li>• Network: <strong>{networkInfo.network.toUpperCase()}</strong> (ID: {networkInfo.networkId})</li>
          )}
        </ul>
      </div>

      {/* Service Health Check */}
      <div className="mb-6 p-4 bg-white border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Service Status</h2>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
        >
          {loading ? 'Checking...' : 'Check Service Health'}
        </button>
      </div>

      {/* Step 1: Generate Credentials */}
      <div className="mb-6 p-4 bg-white border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">
          Step 1: Generate {networkInfo?.network === 'mainnet' ? 'MAINNET' : 'Test'} Wallet
        </h2>
        <button
          onClick={generateCredentials}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Generating...' : 'Generate Credentials'}
        </button>
        {credentials && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <p className="text-xs font-mono break-all">
              <strong>Address:</strong> {credentials.address?.substring(0, 30)}...
            </p>
            <p className={`text-xs mt-1 ${networkInfo?.network === 'mainnet' ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
              {networkInfo?.network === 'mainnet' 
                ? '🚨 MAINNET wallet - needs REAL ADA!' 
                : '⚠️ Test wallet - needs testnet ADA to work'}
            </p>
          </div>
        )}
      </div>

      {/* Step 2: Lock Funds */}
      {credentials && (
        <div className="mb-6 p-4 bg-white border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Step 2: Lock 1 ADA to Vault</h2>
          <button
            onClick={lockFunds}
            disabled={loading || !credentials}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Lock 1 ADA'}
          </button>
          <div className="mt-2 p-3 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-sm text-yellow-800 font-semibold mb-2">
              📋 Before locking, you MUST:
            </p>
            <ol className="text-xs text-yellow-700 space-y-1">
              <li>1. Copy the wallet address above</li>
              <li>2. Send 1-2 ADA from your existing wallet to this address</li>
              <li>3. Wait for transaction confirmation (~2 minutes)</li>
              <li>4. Then click "Lock 1 ADA" below</li>
            </ol>
          </div>
          {lockResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-xs font-mono break-all">
                <strong>TX Hash:</strong> {lockResult.txHash}
              </p>
              <p className="text-xs font-mono break-all">
                <strong>Script:</strong> {lockResult.scriptAddr?.substring(0, 30)}...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Unlock Funds */}
      {lockResult && (
        <div className="mb-6 p-4 bg-white border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Step 3: Unlock Funds</h2>
          <button
            onClick={unlockFunds}
            disabled={loading || !lockResult}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Unlock Funds'}
          </button>
          <p className="text-xs text-gray-600 mt-2">
            Uses "Hello, World!" as redeemer (same as Aiken example)
          </p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Latest Result</h3>
          <pre className="text-xs overflow-auto max-h-60">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Architecture Info */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Architecture</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Next.js Frontend</strong> (port 3000) - Simple UI, no WASM</li>
          <li>• <strong>Cardano Service</strong> (port 3001) - MeshJS operations</li>
          <li>• <strong>Communication</strong> - REST API calls between services</li>
          <li>• <strong>Pattern</strong> - Exact copy of Aiken hello_world example</li>
        </ul>
        <div className="mt-3 p-2 bg-yellow-100 rounded text-xs">
          <strong>Note:</strong> You need testnet ADA in the generated wallet to actually run transactions. 
          The service will show errors if the wallet has no funds.
        </div>
      </div>
    </div>
  );
}