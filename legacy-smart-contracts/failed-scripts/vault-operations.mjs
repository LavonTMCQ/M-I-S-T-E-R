#!/usr/bin/env node

/**
 * Standalone vault operations using MeshJS
 * This runs outside of Next.js to avoid WASM issues
 */

import {
  BlockfrostProvider,
  MeshTxBuilder,
  MeshWallet,
  serializePlutusScript,
  deserializeAddress,
  mConStr0,
  stringToHex,
} from '@meshsdk/core';
import { applyParamsToScript } from '@meshsdk/core-csl';

// Simple validator CBOR
const SIMPLE_VAULT_CBOR = '5901850101003232323232322533300232323232325332330083001300937540042646644646464a66601c60060022a66602260206ea80240085854ccc038c01c00454ccc044c040dd50048010b0a99980719b87480100044c8c94ccc04cc05400854ccc040c014c044dd5000899191919299980b980c8010040b1bad30170013017002375c602a00260246ea80045858c04c004c040dd50048b18071baa0081533300c3001300d375400426464646464a666022600c0022660040086eb8c00cc04cdd50028a99980898050008998010021bae301530163013375400a2646600600a6eb8c010c050dd5003180a98099baa00c3011375401644646600200200644a66602c00229404cc894ccc054cdc78010028a51133004004001375c602e0026030002460260026eb0c044c048c048c048c048c048c048c048c03cdd5004980818071baa00216370e900018068009806980700098051baa002370e90010b1805180580198048011804001180400098021baa00114984d9595cd2ab9d5573caae7d5d0aba201';

// Get script address
export function getScriptAddress(network = 'preprod') {
  const networkId = network === 'mainnet' ? 1 : 0;
  const scriptCbor = applyParamsToScript(SIMPLE_VAULT_CBOR, []);
  
  const scriptAddr = serializePlutusScript(
    { code: scriptCbor, version: "V3" },
    networkId
  ).address;
  
  return scriptAddr;
}

// Lock funds to the vault
export async function lockFunds(walletSeed, amount = '1000000', network = 'preprod') {
  try {
    const apiKey = process.env.BLOCKFROST_PROJECT_ID || process.env.NEXT_PUBLIC_BLOCKFROST_TESTNET_PROJECT_ID;
    if (!apiKey) {
      throw new Error('Blockfrost API key not found');
    }

    const blockfrostProvider = new BlockfrostProvider(apiKey);
    
    // Create wallet from seed
    const wallet = new MeshWallet({
      networkId: network === 'mainnet' ? 1 : 0,
      fetcher: blockfrostProvider,
      submitter: blockfrostProvider,
      key: {
        type: 'root',
        bech32: walletSeed,
      },
    });

    const assets = [
      {
        unit: "lovelace",
        quantity: amount,
      },
    ];

    const utxos = await wallet.getUtxos();
    const walletAddress = (await wallet.getUsedAddresses())[0];
    const scriptAddr = getScriptAddress(network);
    const signerHash = deserializeAddress(walletAddress).pubKeyHash;

    const txBuilder = new MeshTxBuilder({
      fetcher: blockfrostProvider,
      submitter: blockfrostProvider,
    });

    await txBuilder
      .txOut(scriptAddr, assets)
      .txOutDatumHashValue(mConStr0([signerHash]))
      .changeAddress(walletAddress)
      .selectUtxosFrom(utxos)
      .setNetwork(network)
      .complete();

    const unsignedTx = txBuilder.txHex;
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);
    
    return {
      success: true,
      txHash,
      scriptAddress: scriptAddr,
      amount: (parseInt(amount) / 1000000).toString() + ' ADA'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Unlock funds from the vault
export async function unlockFunds(walletSeed, depositTxHash, network = 'preprod') {
  try {
    const apiKey = process.env.BLOCKFROST_PROJECT_ID || process.env.NEXT_PUBLIC_BLOCKFROST_TESTNET_PROJECT_ID;
    if (!apiKey) {
      throw new Error('Blockfrost API key not found');
    }

    const blockfrostProvider = new BlockfrostProvider(apiKey);
    
    // Create wallet from seed
    const wallet = new MeshWallet({
      networkId: network === 'mainnet' ? 1 : 0,
      fetcher: blockfrostProvider,
      submitter: blockfrostProvider,
      key: {
        type: 'root',
        bech32: walletSeed,
      },
    });

    const utxos = await wallet.getUtxos();
    const walletAddress = (await wallet.getUsedAddresses())[0];
    const collateral = (await wallet.getCollateral())[0];

    const scriptCbor = applyParamsToScript(SIMPLE_VAULT_CBOR, []);
    const signerHash = deserializeAddress(walletAddress).pubKeyHash;
    const message = "Hello, World!";

    // Get the UTXO from the deposit transaction
    const scriptUtxos = await blockfrostProvider.fetchUTxOs(depositTxHash);
    if (!scriptUtxos || scriptUtxos.length === 0) {
      throw new Error('No UTXOs found from deposit transaction');
    }
    const scriptUtxo = scriptUtxos[0];

    const txBuilder = new MeshTxBuilder({
      fetcher: blockfrostProvider,
      submitter: blockfrostProvider,
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
      .changeAddress(walletAddress)
      .txInCollateral(
        collateral.input.txHash,
        collateral.input.outputIndex,
        collateral.output.amount,
        collateral.output.address
      )
      .selectUtxosFrom(utxos)
      .setNetwork(network)
      .complete();

    const unsignedTx = txBuilder.txHex;
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);
    
    return {
      success: true,
      txHash,
      message: 'Funds unlocked successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Command line interface
if (process.argv[2]) {
  const command = process.argv[2];
  
  if (command === 'get-address') {
    const network = process.argv[3] || 'preprod';
    console.log('Script Address:', getScriptAddress(network));
  } else if (command === 'lock') {
    const seed = process.argv[3];
    const amount = process.argv[4] || '1000000';
    const network = process.argv[5] || 'preprod';
    
    if (!seed) {
      console.error('Usage: node vault-operations.mjs lock <wallet-seed> [amount] [network]');
      process.exit(1);
    }
    
    lockFunds(seed, amount, network).then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    });
  } else if (command === 'unlock') {
    const seed = process.argv[3];
    const txHash = process.argv[4];
    const network = process.argv[5] || 'preprod';
    
    if (!seed || !txHash) {
      console.error('Usage: node vault-operations.mjs unlock <wallet-seed> <deposit-tx-hash> [network]');
      process.exit(1);
    }
    
    unlockFunds(seed, txHash, network).then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    });
  } else {
    console.log('Available commands:');
    console.log('  get-address [network]                          - Get the script address');
    console.log('  lock <wallet-seed> [amount] [network]          - Lock funds to vault');
    console.log('  unlock <wallet-seed> <tx-hash> [network]       - Unlock funds from vault');
  }
}