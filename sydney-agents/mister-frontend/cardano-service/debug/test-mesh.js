// Simple test to debug MeshJS WASM issues
import { MeshWallet, BlockfrostProvider } from '@meshsdk/core';

console.log('Testing MeshJS initialization...');

try {
  console.log('1. Testing MeshWallet.brew()...');
  const mnemonic = MeshWallet.brew(false); // false for mainnet
  console.log('✅ MeshWallet.brew() successful');
  console.log('Mnemonic type:', typeof mnemonic);
  console.log('Mnemonic length:', mnemonic.length);
  console.log('First few words:', mnemonic.slice(0, 3).join(' ') + '...');
  
  console.log('2. Testing wallet creation with mnemonic...');
  const wallet = new MeshWallet({
    networkId: 1, // mainnet
    key: {
      type: 'mnemonic',
      words: mnemonic,
    },
  });
  console.log('✅ Wallet creation successful');
  
  console.log('3. Testing address generation...');
  const addresses = await wallet.getUnusedAddresses();
  console.log('✅ Address generation successful');
  console.log('Address:', addresses[0]);
  
  // Return both mnemonic and address for testing
  console.log('\n=== RESULTS ===');
  console.log('Mnemonic:', mnemonic.join(' '));
  console.log('Address:', addresses[0]);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}