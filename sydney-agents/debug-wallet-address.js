// Debug script to clear invalid wallet address and force fresh connection
console.log('🔍 Debugging wallet address issue...');

// Check what's currently stored
console.log('📋 Current localStorage contents:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('wallet') || key.includes('auth') || key.includes('user'))) {
    const value = localStorage.getItem(key);
    console.log(`${key}:`, value ? value.substring(0, 200) + '...' : 'null');

    // Check specifically for the invalid address
    if (value && value.includes('addr1q82j3cnhky8u0w4')) {
      console.log('🚨 FOUND INVALID ADDRESS in', key);
      console.log('Full value:', value);

      // Check if it ends with 'x' instead of '8'
      if (value.includes('n2nlx')) {
        console.log('❌ CONFIRMED: Address ends with "x" instead of "8"');
      }
    }
  }
}

// Clear all wallet-related data
console.log('🧹 Clearing all wallet-related localStorage data...');
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('wallet') || key.includes('auth') || key.includes('user'))) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  console.log(`Removing: ${key}`);
  localStorage.removeItem(key);
});

console.log('✅ localStorage cleared. Please refresh the page and reconnect your wallet.');
console.log('🔍 After reconnection, check the console for address conversion logs.');

// Also check if there's a wallet context available
if (window.cardano) {
  console.log('🔍 Available wallets:', Object.keys(window.cardano));
} else {
  console.log('⚠️ No cardano object found in window');
}
