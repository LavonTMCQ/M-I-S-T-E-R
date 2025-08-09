// Test lock function with the correct funded wallet
import { lockFunds, getProvider } from './vault-operations.js';

const API_KEY = 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
const CORRECT_MNEMONIC = "bunker urge rabbit correct trophy hybrid title hold misery true dynamic space dismiss talk meat sunset enjoy annual salmon disease fat hungry slogan bike";

async function testLock() {
  try {
    console.log('🔒 Testing lock function with correct wallet...');
    console.log('📍 Target address: addr1q8dxemepum00ydhf4j7w547ztry7zqf8c6za8lkddlznt8dc7upmv6282k0npx8yfad5q7jzg2tpdsjzlh5ytgr9gups2vk38e');
    
    const provider = getProvider(API_KEY);
    
    console.log('💰 Attempting to lock 1 ADA...');
    const result = await lockFunds(provider, CORRECT_MNEMONIC, '1000000');
    
    console.log('✅ Lock successful!');
    console.log('📄 Transaction Hash:', result.txHash);
    console.log('🏗️ Script Address:', result.scriptAddr);
    console.log('💰 Amount Locked:', result.amount / 1000000, 'ADA');
    
  } catch (error) {
    console.error('❌ Lock failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testLock();