// Check wallet balance using Blockfrost directly
import { BlockfrostProvider, MeshWallet } from '@meshsdk/core';

const API_KEY = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
const NETWORK_ID = 1;

// Use your wallet mnemonic from the generated credentials
const mnemonic = "stuff tunnel tuition heavy index jungle horn miracle lunch jungle strategy chunk skull lawn fade prison hungry glass soldier spare educate style phrase monster";

async function checkBalance() {
  try {
    console.log('🔍 Checking wallet balance...');
    
    const provider = new BlockfrostProvider(API_KEY);
    const mnemonicWords = mnemonic.split(' ');
    
    const wallet = new MeshWallet({
      networkId: NETWORK_ID,
      fetcher: provider,
      submitter: provider,
      key: {
        type: 'mnemonic',
        words: mnemonicWords,
      },
    });

    const walletAddress = (await wallet.getUnusedAddresses())[0];
    console.log('📍 Wallet address:', walletAddress);

    // Get UTXOs
    const utxos = await wallet.getUtxos();
    console.log('📦 Total UTXOs:', utxos.length);
    
    if (utxos.length > 0) {
      let totalLovelace = 0;
      utxos.forEach((utxo, index) => {
        const lovelace = utxo.output.amount.find(asset => asset.unit === 'lovelace')?.quantity || '0';
        totalLovelace += parseInt(lovelace);
        console.log(`💰 UTXO ${index + 1}: ${parseInt(lovelace) / 1000000} ADA`);
      });
      
      console.log('💰 Total balance:', totalLovelace / 1000000, 'ADA');
    } else {
      console.log('❌ No UTXOs found');
      
      // Try direct Blockfrost API call
      console.log('🔍 Checking with Blockfrost API directly...');
      const response = await fetch(`https://cardano-mainnet.blockfrost.io/api/v0/addresses/${walletAddress}/utxos`, {
        headers: { 'project_id': API_KEY }
      });
      const apiUtxos = await response.json();
      console.log('🌐 Blockfrost API UTXOs:', apiUtxos);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBalance();