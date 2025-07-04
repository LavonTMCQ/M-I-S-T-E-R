// Debug script to check wallet connection issues
console.log('=== WALLET DEBUG SCRIPT ===');

// Check if Cardano wallets are available
if (typeof window !== 'undefined' && window.cardano) {
  console.log('✅ window.cardano is available');
  console.log('Available wallets:', Object.keys(window.cardano));
  
  // Check each wallet
  ['vespr', 'nami', 'eternl', 'flint'].forEach(async (walletName) => {
    if (window.cardano[walletName]) {
      console.log(`✅ ${walletName} wallet found`);
      try {
        const isEnabled = await window.cardano[walletName].isEnabled();
        console.log(`${walletName} enabled:`, isEnabled);
      } catch (error) {
        console.log(`❌ Error checking ${walletName}:`, error);
      }
    } else {
      console.log(`❌ ${walletName} wallet not found`);
    }
  });
} else {
  console.log('❌ window.cardano not available');
}

// Check localStorage
console.log('LocalStorage contents:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('wallet') || key.includes('auth'))) {
    console.log(`${key}:`, localStorage.getItem(key));
  }
}