// Debug the lock function step by step
import { MeshWallet, BlockfrostProvider } from '@meshsdk/core';

const API_KEY = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
const NETWORK_ID = 1;

console.log('Testing lock function step by step...');

const mnemonic = "stuff tunnel tuition heavy index jungle horn miracle lunch jungle strategy chunk skull lawn fade prison hungry glass soldier spare educate style phrase monster";

try {
  console.log('1. Testing provider creation...');
  const provider = new BlockfrostProvider(API_KEY);
  console.log('✅ Provider created');
  
  console.log('2. Testing wallet creation...');
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
  console.log('✅ Wallet created');
  
  console.log('3. Testing wallet UTXOs...');
  const utxos = await wallet.getUtxos();
  console.log('✅ UTXOs fetched:', utxos.length);
  
  console.log('4. Testing wallet address...');
  const walletAddress = (await wallet.getUsedAddresses())[0];
  console.log('✅ Wallet address:', walletAddress);
  
  // The problematic part is likely the script address
  console.log('5. Skipping script address for now...');
  console.log('✅ All basic wallet operations work');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}