#!/usr/bin/env node

console.log('🧹 Clearing wallet cache from localStorage...');

const clearWalletScript = `
// Clear all wallet-related data from localStorage
localStorage.removeItem('mainWallet');
localStorage.removeItem('connectedWallet');
localStorage.removeItem('auth_token');
localStorage.removeItem('user_data');
localStorage.removeItem('refresh_token');

// Clear any user-specific wallet data
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('wallet') || key.includes('auth') || key.includes('user'))) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach(key => localStorage.removeItem(key));

console.log('✅ Wallet cache cleared! Please reconnect your wallet.');
window.location.href = '/wallet-setup';
`;

console.log(`
📋 Instructions to clear wallet cache:

1. Open your browser to http://localhost:3000
2. Open the browser console (F12 or right-click -> Inspect -> Console)
3. Paste and run this script:

${clearWalletScript}

4. The page will redirect to wallet setup
5. Connect your wallet with 92.359 ADA
6. Go back to /agent-vault-v2 page

Your wallet balance should now show correctly!
`);