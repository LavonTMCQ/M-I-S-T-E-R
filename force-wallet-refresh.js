// Force wallet refresh by clearing stored data and reconnecting
console.log('🔄 Forcing wallet refresh...');

// Clear all wallet-related localStorage
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('wallet') || key.includes('auth') || key.includes('user'))) {
    keysToRemove.push(key);
  }
}

console.log('🧹 Clearing stored wallet data:', keysToRemove);
keysToRemove.forEach(key => {
  localStorage.removeItem(key);
});

console.log('✅ Stored data cleared. Please refresh the page and reconnect your wallet.');
console.log('🔍 This will trigger the Blockfrost address fetching to get the correct address.');

// Also trigger a page refresh
setTimeout(() => {
  window.location.reload();
}, 2000);