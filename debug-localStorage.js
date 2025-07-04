// Debug localStorage to find invalid address
console.log('🔍 DEBUGGING WALLET ADDRESS ISSUE');
console.log('=====================================');

// Check all localStorage keys
console.log('📋 All localStorage keys:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`- ${key}`);
}

console.log('\n🔍 Wallet-related localStorage data:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('wallet') || key.includes('auth') || key.includes('user'))) {
    const value = localStorage.getItem(key);
    console.log(`\n${key}:`);
    
    if (value) {
      try {
        const parsed = JSON.parse(value);
        console.log('Parsed data:', parsed);
        
        // Check for the problematic address
        const jsonStr = JSON.stringify(parsed, null, 2);
        if (jsonStr.includes('addr1q82j3cnhky8u0w4')) {
          console.log('🚨 FOUND INVALID ADDRESS!');
          console.log('Full JSON:', jsonStr);
          
          // Check if it ends with 'x'
          if (jsonStr.includes('n2nlx')) {
            console.log('❌ CONFIRMED: Address ends with "x" instead of "8"');
            console.log('This is the source of the Strike Finance API error!');
          }
        }
      } catch (e) {
        console.log('Raw value (not JSON):', value.substring(0, 200) + '...');
      }
    }
  }
}

console.log('\n🔍 Current wallet context state:');
if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  console.log('React internals available - checking component state...');
}

console.log('\n✅ Debug complete. Next: Clear invalid data and reconnect wallet.');