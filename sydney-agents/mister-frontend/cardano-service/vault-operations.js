/**
 * Vault Operations - EXACT copy of Aiken hello_world pattern
 * This runs as standalone Node.js, no Next.js/webpack issues
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
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables before using them
dotenv.config();

// Use the REAL compiled Aiken validator - January 2025
const HELLO_WORLD_BLUEPRINT = {
  "validators": [
    {
      "title": "hello_world.hello_world.spend",
      "compiledCode": "59010901010032323232323225333002323232323253330073370e900118041baa0011323322533300a3370e900018059baa00513232533300f3011002132533300d3370e900018071baa004132533300e002100114a06644646600200200644a66602800229404cc894ccc04ccdc78010028a51133004004001375c602a002602c0026eb0c044c048c048c048c048c048c048c048c048c03cdd50049bae3011300f37546022601e6ea801058cdc79bae3010300e375400e91010d48656c6c6f2c20576f726c64210016375c601e00260186ea801458c030004c030c034004c024dd50008b1805180580198048011804001180400098021baa00114984d9595cd2ab9d5573caae7d5d0aba21",
      "hash": "7bbeec2f6febb7b6c92df6e9891c34759e642b66e82f2769cb498504"
    }
  ]
};

// Network configuration
export const NETWORK = process.env.CARDANO_NETWORK === 'mainnet' ? 'mainnet' : 'preprod';
export const NETWORK_ID = NETWORK === 'mainnet' ? 1 : 0;

// Safety limit for mainnet testing (max 5 ADA)
export const MAINNET_MAX_ADA = 5000000; // 5 ADA in lovelace

// Initialize Blockfrost provider
export function getProvider(apiKey) {
  console.log(`🌐 Using network: ${NETWORK}`);
  
  // MeshJS v1.8.4 - just pass the API key
  // The network is determined by the API key itself (mainnet vs testnet key)
  const provider = new BlockfrostProvider(apiKey);
  
  // Log to verify
  console.log(`🔑 Provider initialized with API key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NO'}`);
  
  return provider;
}

// Get script address - using REAL compiled Aiken validator with proper network
export function getScriptAddress() {
  const scriptCbor = applyParamsToScript(
    HELLO_WORLD_BLUEPRINT.validators[0].compiledCode,
    []
  );
  
  // MeshJS serializePlutusScript with network specification
  // For mainnet, we need to specify the network parameter differently
  const scriptAddr = serializePlutusScript(
    { code: scriptCbor, version: "V3" },
    undefined, // no parameters
    NETWORK_ID  // network ID: 0 = testnet, 1 = mainnet
  ).address;
  
  console.log(`🏗️  Generated script address for ${NETWORK} (network ID: ${NETWORK_ID}): ${scriptAddr}`);
  console.log(`📋  Script hash: ${HELLO_WORLD_BLUEPRINT.validators[0].hash}`);
  return { scriptCbor, scriptAddr };
}

// Generate new wallet credentials (like generate-credentials.ts)
export async function generateCredentials() {
  const isTestnet = NETWORK !== 'mainnet';
  const mnemonic = MeshWallet.brew(isTestnet);
  
  const wallet = new MeshWallet({
    networkId: NETWORK_ID,
    key: {
      type: 'mnemonic',
      words: mnemonic,
    },
  });
  
  return {
    seed: mnemonic.join(' '), // Return as space-separated string
    mnemonic: mnemonic, // Also return as array for internal use
    address: (await wallet.getUnusedAddresses())[0],
    stakeAddress: (await wallet.getRewardAddresses())[0] || null,
  };
}

// Lock funds (exactly like lock.ts)
export async function lockFunds(provider, walletSeed, amount = '1000000') {
  // Safety check for mainnet
  if (NETWORK === 'mainnet' && parseInt(amount) > MAINNET_MAX_ADA) {
    throw new Error(`Safety limit: Maximum ${MAINNET_MAX_ADA / 1000000} ADA allowed for mainnet testing`);
  }
  
  // Create wallet from mnemonic seed
  const mnemonicWords = walletSeed.split(' ');
  const wallet = new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: provider,
    submitter: provider,
    key: {
      type: 'mnemonic',
      words: mnemonicWords,
    },
  });

  const assets = [
    {
      unit: "lovelace",
      quantity: amount,
    },
  ];

  const walletAddress = (await wallet.getUsedAddresses())[0];
  console.log('Fetching UTXOs for:', walletAddress);
  
  // Try direct provider fetch since wallet.getUtxos() isn't working
  let utxos = await wallet.getUtxos();
  
  // If wallet.getUtxos() returns empty, try direct provider fetch
  if (!utxos || utxos.length === 0) {
    console.log('Wallet.getUtxos() returned empty, trying provider.fetchAddressUTxOs()');
    utxos = await provider.fetchAddressUTxOs(walletAddress);
  }
  
  // Check if wallet has funds
  if (!utxos || utxos.length === 0) {
    throw new Error(`Wallet has no UTXOs. Please fund the wallet first: ${walletAddress}`);
  }
  
  console.log(`Found ${utxos.length} UTXOs`)
  
  // Debug: Log UTXO details
  console.log('UTXO details:');
  utxos.forEach((utxo, i) => {
    console.log(`UTXO ${i}:`, JSON.stringify(utxo, null, 2));
  });
  
  const { scriptAddr } = getScriptAddress();
  const signerHash = deserializeAddress(walletAddress).pubKeyHash;

  const txBuilder = new MeshTxBuilder({
    fetcher: provider,
    submitter: provider,
  });

  // Add UTXOs as inputs explicitly
  for (const utxo of utxos) {
    txBuilder.txIn(
      utxo.input.txHash,
      utxo.input.outputIndex,
      utxo.output.amount,
      utxo.output.address
    );
  }
  
  await txBuilder
    .txOut(scriptAddr, assets)
    .txOutDatumHashValue(mConStr0([signerHash]))
    .changeAddress(walletAddress)
    .setNetwork(NETWORK)
    .complete();

  const unsignedTx = txBuilder.txHex;
  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);
  
  return { txHash, scriptAddr, amount };
}

// Unlock funds (exactly like unlock.ts)
export async function unlockFunds(provider, walletSeed, depositTxHash) {
  // Create wallet from mnemonic seed
  const mnemonicWords = walletSeed.split(' ');
  const wallet = new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: provider,
    submitter: provider,
    key: {
      type: 'mnemonic',
      words: mnemonicWords,
    },
  });

  const utxos = await wallet.getUtxos();
  const walletAddress = (await wallet.getUsedAddresses())[0];
  
  // Get collateral - may not exist on mainnet
  let collateral;
  try {
    const collaterals = await wallet.getCollateral();
    collateral = collaterals?.[0];
    console.log('Found collateral:', collateral);
  } catch (error) {
    console.log('No collateral available, will use regular UTXO');
  }

  const { scriptCbor } = getScriptAddress();
  const signerHash = deserializeAddress(walletAddress).pubKeyHash;
  const message = "Hello, World!";

  // Get the UTXO from the deposit transaction
  console.log('Fetching UTXOs for transaction:', depositTxHash);
  const scriptUtxos = await provider.fetchUTxOs(depositTxHash);
  console.log('Found script UTXOs:', scriptUtxos);
  
  if (!scriptUtxos || scriptUtxos.length === 0) {
    throw new Error('No UTXO found from deposit transaction');
  }
  
  // Find the UTXO that was sent to the script address
  const { scriptAddr } = getScriptAddress();
  const scriptUtxo = scriptUtxos.find(utxo => utxo.output.address === scriptAddr);
  
  if (!scriptUtxo) {
    throw new Error(`No UTXO found at script address ${scriptAddr}`);
  }
  
  console.log('Using script UTXO:', scriptUtxo);

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
    .changeAddress(walletAddress);

  // Add collateral if available
  if (collateral) {
    txBuilder.txInCollateral(
      collateral.input.txHash,
      collateral.input.outputIndex,
      collateral.output.amount,
      collateral.output.address
    );
  } else {
    // Use first regular UTXO as collateral if none available
    if (utxos && utxos.length > 0) {
      txBuilder.txInCollateral(
        utxos[0].input.txHash,
        utxos[0].input.outputIndex,
        utxos[0].output.amount,
        utxos[0].output.address
      );
    }
  }

  await txBuilder
    .selectUtxosFrom(utxos)
    .setNetwork(NETWORK)
    .complete();

  const unsignedTx = txBuilder.txHex;
  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);
  
  return { txHash };
}