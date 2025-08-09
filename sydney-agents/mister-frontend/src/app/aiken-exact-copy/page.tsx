'use client';

import { useState, useEffect } from 'react';
import { 
  BlockfrostProvider,
  MeshTxBuilder,
  MeshWallet,
  BrowserWallet,
  serializePlutusScript,
  deserializeAddress,
  mConStr0,
  stringToHex,
  type UTxO,
  type Asset
} from '@meshsdk/core';
import { applyParamsToScript } from '@meshsdk/core-csl';

// The simplest possible validator - always succeeds
const SIMPLE_VAULT_CBOR = '5901850101003232323232322533300232323232325332330083001300937540042646644646464a66601c60060022a66602260206ea80240085854ccc038c01c00454ccc044c040dd50048010b0a99980719b87480100044c8c94ccc04cc05400854ccc040c014c044dd5000899191919299980b980c8010040b1bad30170013017002375c602a00260246ea80045858c04c004c040dd50048b18071baa0081533300c3001300d375400426464646464a666022600c0022660040086eb8c00cc04cdd50028a99980898050008998010021bae301530163013375400a2646600600a6eb8c010c050dd5003180a98099baa00c3011375401644646600200200644a66602c00229404cc894ccc054cdc78010028a51133004004001375c602e0026030002460260026eb0c044c048c048c048c048c048c048c048c048c03cdd5004980818071baa00216370e900018068009806980700098051baa002370e90010b1805180580198048011804001180400098021baa00114984d9595cd2ab9d5573caae7d5d0aba201';

export default function AikenExactCopyPage() {
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [scriptAddress, setScriptAddress] = useState('');
  const [provider, setProvider] = useState<BlockfrostProvider | null>(null);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize on mount
  useEffect(() => {
    // Get Blockfrost API key
    const apiKey = process.env.NEXT_PUBLIC_BLOCKFROST_TESTNET_PROJECT_ID || '';
    if (apiKey) {
      const blockfrostProvider = new BlockfrostProvider(apiKey);
      setProvider(blockfrostProvider);

      // Calculate script address
      const scriptCbor = applyParamsToScript(SIMPLE_VAULT_CBOR, []);
      const addr = serializePlutusScript(
        { code: scriptCbor, version: "V3" },
        0 // testnet
      ).address;
      setScriptAddress(addr);
    }
  }, []);

  const connectWallet = async () => {
    try {
      setError('');
      setLoading(true);

      // Enable wallet - EXACTLY like Aiken example
      const walletInstance = await BrowserWallet.enable('vespr');
      setWallet(walletInstance);

      const addresses = await walletInstance.getUsedAddresses();
      if (addresses.length > 0) {
        setWalletAddress(addresses[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const lockFunds = async () => {
    if (!wallet || !provider) {
      setError('Wallet or provider not initialized');
      return;
    }

    try {
      setError('');
      setLoading(true);

      // EXACTLY like lock.ts from Aiken example
      const assets: Asset[] = [
        {
          unit: "lovelace",
          quantity: "1000000", // 1 ADA
        },
      ];

      const utxos = await wallet.getUtxos();
      const walletAddr = (await wallet.getUsedAddresses())[0];
      
      const scriptCbor = applyParamsToScript(SIMPLE_VAULT_CBOR, []);
      const scriptAddr = serializePlutusScript(
        { code: scriptCbor, version: "V3" },
        0 // testnet
      ).address;

      const signerHash = deserializeAddress(walletAddr).pubKeyHash;

      const txBuilder = new MeshTxBuilder({
        fetcher: provider,
        submitter: provider,
      });

      await txBuilder
        .txOut(scriptAddr, assets)
        .txOutDatumHashValue(mConStr0([signerHash]))
        .changeAddress(walletAddr)
        .selectUtxosFrom(utxos)
        .setNetwork('preprod')
        .complete();

      const unsignedTx = txBuilder.txHex;
      const signedTx = await wallet.signTx(unsignedTx);
      const hash = await wallet.submitTx(signedTx);
      
      setTxHash(hash);
      console.log('Transaction submitted:', hash);
    } catch (err: any) {
      setError(err.message || 'Failed to lock funds');
    } finally {
      setLoading(false);
    }
  };

  const unlockFunds = async () => {
    if (!wallet || !provider || !txHash) {
      setError('Missing requirements for unlock');
      return;
    }

    try {
      setError('');
      setLoading(true);

      // EXACTLY like unlock.ts from Aiken example
      const utxos = await wallet.getUtxos();
      const walletAddr = (await wallet.getUsedAddresses())[0];
      const collateral = (await wallet.getCollateral())[0];

      const scriptCbor = applyParamsToScript(SIMPLE_VAULT_CBOR, []);
      const signerHash = deserializeAddress(walletAddr).pubKeyHash;
      const message = "Hello, World!";

      // Get the UTXO from the previous transaction
      const scriptUtxos = await provider.fetchUTxOs(txHash);
      if (!scriptUtxos || scriptUtxos.length === 0) {
        throw new Error('No UTXOs found from deposit transaction');
      }
      const scriptUtxo = scriptUtxos[0];

      const txBuilder = new MeshTxBuilder({
        fetcher: provider,
        submitter: provider,
      });

      await txBuilder
        .spendingPlutusScript("V3")
        .txIn(
          scriptUtxo.input.txHash,
          scriptUtxo.input.outputIndex,
          scriptUtxo.output.amount,
          scriptUtxo.output.address
        )
        .txInScript(scriptCbor)
        .txInRedeemerValue(mConStr0([stringToHex(message)]))
        .txInDatumValue(mConStr0([signerHash]))
        .requiredSignerHash(signerHash)
        .changeAddress(walletAddr)
        .txInCollateral(
          collateral.input.txHash,
          collateral.input.outputIndex,
          collateral.output.amount,
          collateral.output.address
        )
        .selectUtxosFrom(utxos)
        .setNetwork('preprod')
        .complete();

      const unsignedTx = txBuilder.txHex;
      const signedTx = await wallet.signTx(unsignedTx);
      const hash = await wallet.submitTx(signedTx);
      
      console.log('Unlock transaction submitted:', hash);
      setTxHash(hash);
    } catch (err: any) {
      setError(err.message || 'Failed to unlock funds');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Aiken Hello World - Exact Copy</h1>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-green-900 mb-2">✅ Exact Copy of Aiken Example</h2>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Using MeshJS v1.8.4 (same as Aiken example)</li>
          <li>• Following lock.ts and unlock.ts patterns exactly</li>
          <li>• Using Preprod testnet</li>
          <li>• Simple validator that always succeeds</li>
        </ul>
      </div>

      {/* Script Address */}
      {scriptAddress && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium">Script Address:</p>
          <p className="text-xs font-mono break-all">{scriptAddress}</p>
        </div>
      )}

      {/* Wallet Connection */}
      <div className="mb-6 p-4 bg-white border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Step 1: Connect Wallet</h2>
        {!wallet ? (
          <button
            onClick={connectWallet}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Connecting...' : 'Connect Vespr Wallet'}
          </button>
        ) : (
          <div>
            <p className="text-sm text-green-600">✓ Wallet Connected</p>
            <p className="text-xs font-mono break-all mt-2">{walletAddress}</p>
          </div>
        )}
      </div>

      {/* Lock Funds */}
      {wallet && (
        <div className="mb-6 p-4 bg-white border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Step 2: Lock 1 ADA</h2>
          <button
            onClick={lockFunds}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Lock 1 ADA'}
          </button>
        </div>
      )}

      {/* Unlock Funds */}
      {wallet && txHash && (
        <div className="mb-6 p-4 bg-white border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Step 3: Unlock Funds</h2>
          <button
            onClick={unlockFunds}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Unlock Funds'}
          </button>
        </div>
      )}

      {/* Transaction Hash */}
      {txHash && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Transaction Hash</h3>
          <p className="text-xs font-mono break-all">{txHash}</p>
          <a
            href={`https://preprod.cardanoscan.io/transaction/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline mt-2 inline-block"
          >
            View on Explorer →
          </a>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}