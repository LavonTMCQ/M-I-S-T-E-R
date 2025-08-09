// Recover the correct wallet that has the ADA
import { MeshWallet, BlockfrostProvider } from '@meshsdk/core';

const API_KEY = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
const NETWORK_ID = 1;
const TARGET_ADDRESS = 'addr1q8dxemepum00ydhf4j7w547ztry7zqf8c6za8lkddlznt8dc7upmv6282k0npx8yfad5q7jzg2tpdsjzlh5ytgr9gups2vk38e';

// The original mnemonic from your first generation
const ORIGINAL_MNEMONIC = "stuff tunnel tuition heavy index jungle horn miracle lunch jungle strategy chunk skull lawn fade prison hungry glass soldier spare educate style phrase monster";

async function recoverWallet() {
  try {
    console.log('🔧 Recovering wallet...');
    const provider = new BlockfrostProvider(API_KEY);
    
    const wallet = new MeshWallet({
      networkId: NETWORK_ID,
      fetcher: provider,
      submitter: provider,
      key: {
        type: 'mnemonic',
        words: ORIGINAL_MNEMONIC.split(' '),
      },
    });

    const addresses = await wallet.getUnusedAddresses();
    const usedAddresses = await wallet.getUsedAddresses();
    
    console.log('🏠 Unused addresses:', addresses);
    console.log('🏠 Used addresses:', usedAddresses);
    
    // Check if any match our target
    const allAddresses = [...addresses, ...usedAddresses];
    const matchingAddress = allAddresses.find(addr => addr === TARGET_ADDRESS);
    
    if (matchingAddress) {
      console.log('✅ Found matching address!', matchingAddress);
      const utxos = await wallet.getUtxos();
      console.log('💰 UTXOs:', utxos.length);
      
      if (utxos.length > 0) {
        let total = 0;
        utxos.forEach(utxo => {
          const lovelace = utxo.output.amount.find(asset => asset.unit === 'lovelace')?.quantity || '0';
          total += parseInt(lovelace);
        });
        console.log('💰 Total balance:', total / 1000000, 'ADA');
        
        // Return the correct credentials
        return {
          seed: ORIGINAL_MNEMONIC,
          address: matchingAddress,
          balance: total
        };
      }
    } else {
      console.log('❌ Address mismatch. The mnemonic doesn\'t generate the correct address.');
      console.log('Target:', TARGET_ADDRESS);
      console.log('Generated:', addresses[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

recoverWallet();