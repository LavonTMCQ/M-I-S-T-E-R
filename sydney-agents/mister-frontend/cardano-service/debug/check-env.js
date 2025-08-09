import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Environment Variables:');
console.log('CARDANO_NETWORK:', process.env.CARDANO_NETWORK);
console.log('BLOCKFROST_MAINNET_PROJECT_ID:', process.env.BLOCKFROST_MAINNET_PROJECT_ID);
console.log('BLOCKFROST_TESTNET_PROJECT_ID:', process.env.BLOCKFROST_TESTNET_PROJECT_ID);

// Show the calculated network
const NETWORK = process.env.CARDANO_NETWORK === 'mainnet' ? 'mainnet' : 'preprod';
console.log('Calculated NETWORK:', NETWORK);