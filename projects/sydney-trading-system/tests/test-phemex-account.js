const crypto = require('crypto');

// Your secure Phemex READ-ONLY API credentials
const PHEMEX_API_KEY = '26be9f42-458d-4800-9b9e-3ac487f90c48';
const PHEMEX_SECRET = '31xtEzKvyVPRzAY1mk64FcEJz7YhxlRuy2BCrH6qN6k5ZjI3OTg4OC1lZTY1LTQ5NDgtYWM4Yi02OGQ3MjljYzIxY2I';
const PHEMEX_BASE_URL = 'https://api.phemex.com';

// Helper function to create Phemex signature
function createPhemexSignature(path, queryString, body, expiry) {
  // Phemex signature format: PATH + QUERY_STRING + EXPIRY + BODY
  const message = path + queryString + expiry + body;
  console.log(`🔐 Signature Message: "${message}"`);
  const signature = crypto.createHmac('sha256', PHEMEX_SECRET).update(message).digest('hex');
  console.log(`🔑 Generated Signature: ${signature}`);
  return signature;
}

// Helper function to make authenticated Phemex API calls
async function makePhemexRequest(method, endpoint, params = {}) {
  // Use expiry time (current time + 1 minute) as per Phemex docs
  const expiry = Math.floor(Date.now() / 1000) + 60; // Unix timestamp in seconds + 1 minute
  console.log(`⏰ Request expiry: ${expiry} (${new Date(expiry * 1000).toISOString()})`);

  const queryString = method === 'GET' ? new URLSearchParams(params).toString() : '';
  const body = method !== 'GET' ? JSON.stringify(params) : '';

  // For signature, use the endpoint path without query string
  const signature = createPhemexSignature(endpoint, queryString, body, expiry);

  // For the actual request URL, include query string
  const path = endpoint + (queryString ? '?' + queryString : '');
  
  const headers = {
    'x-phemex-access-token': PHEMEX_API_KEY,
    'x-phemex-request-signature': signature,
    'x-phemex-request-expiry': expiry.toString(),
    'Content-Type': 'application/json',
  };

  const url = PHEMEX_BASE_URL + path;
  
  console.log(`🔗 Making ${method} request to: ${endpoint}`);
  console.log(`📊 Expiry: ${expiry}`);
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? body : undefined,
    });

    console.log(`📈 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error Response: ${errorText}`);
      throw new Error(`Phemex API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Phemex API request failed:', error.message);
    throw error;
  }
}

// Test public API first
async function testPublicAPI() {
  console.log('🌐 Testing Phemex Public API...');
  try {
    // Try different symbol formats
    const symbols = ['ADAUSD', 'uADAUSD', '.ADAUSD'];
    for (const symbol of symbols) {
      console.log(`🔍 Trying symbol: ${symbol}`);
      const response = await fetch(`https://api.phemex.com/md/ticker/24hr?symbol=${symbol}`);
      const data = await response.json();
      if (data.code === 0) {
        console.log('✅ Public API working with symbol:', symbol);
        return true;
      }
    }
    console.log('⚠️ Public API symbol format issues, but API is reachable');
    return false;
  } catch (error) {
    console.error('❌ Public API failed:', error.message);
    return false;
  }
}

// Test account access
async function testAccountAccess() {
  console.log('🏦 Testing Phemex Account Access...');
  console.log('🔐 API Key:', PHEMEX_API_KEY.substring(0, 8) + '...');
  console.log('🔒 Secret:', PHEMEX_SECRET.substring(0, 8) + '...');
  console.log('');

  // First test public API
  const publicWorking = await testPublicAPI();
  if (!publicWorking) {
    console.log('⚠️ Public API had issues, but proceeding with authenticated API test...');
  }
  console.log('');

  try {
    // Test 1: Get USDM perpetual contract positions (Linear perps settled in USDT)
    console.log('📊 Test 1: Getting USDM perpetual contract positions...');
    console.log('🎯 Looking for ADAUSDT, ETHUSDT, TOMUSDT, FETUSDT positions...');

    let accountData = null;
    let workingCurrency = null;

    // Try USDM perp positions endpoint first
    try {
      console.log('🔍 Trying USDM perp positions with USDT currency...');
      // Use /g-accounts/positions for USDM perps with unrealized PnL
      accountData = await makePhemexRequest('GET', '/g-accounts/positions', { currency: 'USDT' });
      if (accountData.code === 0) {
        workingCurrency = 'USDT';
        console.log(`✅ Found USDM perp account data with USDT currency`);
      }
    } catch (error) {
      console.log(`⚠️ USDM USDT failed: ${error.message}`);
    }

    // If USDM didn't work, try regular perp positions
    if (!accountData || accountData.code !== 0) {
      console.log('🔄 Trying regular perp positions...');
      const currencies = ['BTC', 'USD', 'ETH'];

      for (const currency of currencies) {
        try {
          console.log(`🔍 Trying regular PERP positions with ${currency} currency...`);
          accountData = await makePhemexRequest('GET', '/accounts/positions', { currency });
          if (accountData.code === 0) {
            workingCurrency = currency;
            console.log(`✅ Found regular perp account data with ${currency} currency`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ ${currency} failed: ${error.message}`);
        }
      }
    }

    if (!accountData || accountData.code !== 0) {
      console.log('❌ Could not access any perp account data');
      return;
    }
    
    if (accountData.code !== 0) {
      console.error(`❌ API Error: ${accountData.msg}`);
      return;
    }

    const account = accountData.data.account;
    const positions = accountData.data.positions || [];
    const openPositions = positions.filter(pos => parseFloat(pos.size) !== 0);

    console.log('✅ Account Access Successful!');
    console.log('');
    console.log('💰 ACCOUNT SUMMARY:');
    console.log(`   Total Equity: $${(parseFloat(account.accountBalanceEv) / 10000).toFixed(2)}`);
    console.log(`   Available Balance: $${(parseFloat(account.totalUsedBalanceEv) / 10000).toFixed(2)}`);
    console.log(`   Currency: ${account.currency}`);
    console.log(`   Account ID: ${account.accountId}`);
    console.log('');

    console.log('📈 OPEN POSITIONS:');
    if (openPositions.length === 0) {
      console.log('   No open positions found.');
    } else {
      console.log(`   Found ${openPositions.length} open position(s):`);
      console.log('');
      
      openPositions.forEach((pos, index) => {
        // Handle both regular perps and USDM perps field formats
        const size = parseFloat(pos.size || pos.sizeRq || 0);
        const side = size > 0 ? 'LONG' : 'SHORT';

        // USDM perps use different field names and scaling
        const entryPrice = parseFloat(pos.avgEntryPrice || pos.avgEntryPriceRp || 0);
        const markPrice = parseFloat(pos.markPrice || pos.markPriceRp || 0);
        const unrealizedPnl = parseFloat(pos.unrealisedPnlEv || pos.unRealisedPnlRv || 0) / (pos.unrealisedPnlEv ? 10000 : 1);
        const unrealizedPnlPercent = parseFloat(pos.unrealisedPnlPercEv || 0) / 10000;
        const leverage = Math.abs(parseFloat(pos.leverage || pos.leverageRr || 0));
        const liquidationPrice = parseFloat(pos.liquidationPrice || pos.liquidationPriceRp || 0);

        // Debug: log the raw position data for first few positions
        if (index < 3) {
          console.log(`\n🔍 DEBUG Position ${index + 1} (${pos.symbol}):`, JSON.stringify(pos, null, 2).substring(0, 500) + '...');
        }
        
        console.log(`   ${index + 1}. ${pos.symbol}`);
        console.log(`      Side: ${side}`);
        console.log(`      Size: ${Math.abs(size)}`);
        console.log(`      Entry Price: $${entryPrice.toFixed(4)}`);
        console.log(`      Mark Price: $${markPrice.toFixed(4)}`);
        console.log(`      Unrealized P&L: $${unrealizedPnl.toFixed(2)} (${unrealizedPnlPercent.toFixed(2)}%)`);
        console.log(`      Leverage: ${leverage}x`);
        console.log(`      Liquidation Price: $${liquidationPrice.toFixed(4)}`);
        
        // Calculate distance to liquidation
        const distanceToLiquidation = Math.abs((markPrice - liquidationPrice) / markPrice) * 100;
        let riskLevel = 'LOW';
        if (distanceToLiquidation < 10) riskLevel = '🚨 CRITICAL';
        else if (distanceToLiquidation < 20) riskLevel = '🟡 HIGH';
        else if (distanceToLiquidation < 40) riskLevel = '🟠 MEDIUM';
        else riskLevel = '🟢 LOW';
        
        console.log(`      Risk Level: ${riskLevel} (${distanceToLiquidation.toFixed(1)}% to liquidation)`);
        console.log('');
      });
      
      // Calculate total unrealized P&L
      const totalUnrealizedPnl = openPositions.reduce((sum, pos) => 
        sum + (parseFloat(pos.unrealisedPnlEv) / 10000), 0);
      
      console.log(`💼 PORTFOLIO SUMMARY:`);
      console.log(`   Total Unrealized P&L: $${totalUnrealizedPnl.toFixed(2)}`);
      console.log(`   Number of Positions: ${openPositions.length}`);
      
      // Risk assessment
      const criticalPositions = openPositions.filter(pos => {
        const markPrice = parseFloat(pos.markPrice) / 10000;
        const liquidationPrice = parseFloat(pos.liquidationPrice) / 10000;
        const distanceToLiquidation = Math.abs((markPrice - liquidationPrice) / markPrice) * 100;
        return distanceToLiquidation < 10;
      });
      
      if (criticalPositions.length > 0) {
        console.log(`   🚨 CRITICAL: ${criticalPositions.length} position(s) near liquidation!`);
      }
    }

    console.log('');
    console.log('🎯 PROFESSIONAL ANALYSIS:');

    const totalUnrealizedPnl = openPositions.reduce((sum, pos) =>
      sum + (parseFloat(pos.unrealisedPnlEv) / 10000), 0);

    if (totalUnrealizedPnl < 0) {
      console.log('   📊 Portfolio is currently negative - this aligns with your hedging strategy');
      console.log('   💡 Focus on identifying optimal lower entry points for scaling');
      console.log('   🎯 Monitor for market character change signals');
      console.log('   ⚖️ Consider risk management for positions near liquidation');
    } else {
      console.log('   📈 Portfolio showing positive unrealized P&L');
      console.log('   💰 Consider taking partial profits on winning positions');
    }
    
    console.log('');
    // Test 2: Check all currencies for positions
    console.log('');
    console.log('🔍 COMPREHENSIVE ACCOUNT SCAN:');
    console.log('Checking all possible currencies for positions...');

    const allCurrencies = ['BTC', 'USD', 'ETH', 'USDT', 'USDC'];
    for (const curr of allCurrencies) {
      try {
        console.log(`\n📊 Checking ${curr} account...`);
        const currData = await makePhemexRequest('GET', '/accounts/accountPositions', { currency: curr });

        if (currData.code === 0) {
          const currAccount = currData.data.account;
          const currPositions = currData.data.positions || [];
          const currOpenPositions = currPositions.filter(pos => parseFloat(pos.size) !== 0);

          console.log(`   💰 ${curr} Equity: $${(parseFloat(currAccount.accountBalanceEv) / 10000).toFixed(2)}`);
          console.log(`   📈 Open Positions: ${currOpenPositions.length}`);

          if (currOpenPositions.length > 0) {
            console.log(`   🎯 FOUND POSITIONS IN ${curr} ACCOUNT:`);
            currOpenPositions.forEach((pos, index) => {
              const size = parseFloat(pos.size);
              const side = size > 0 ? 'LONG' : 'SHORT';
              const unrealizedPnl = parseFloat(pos.unrealisedPnlEv) / 10000;
              console.log(`      ${index + 1}. ${pos.symbol} - ${side} ${Math.abs(size)} - P&L: $${unrealizedPnl.toFixed(2)}`);
            });
          }
        } else {
          console.log(`   ❌ ${curr}: ${currData.msg}`);
        }
      } catch (error) {
        console.log(`   ⚠️ ${curr}: ${error.message}`);
      }
    }

    // Test 3: Check spot trading accounts
    console.log('');
    console.log('🔍 CHECKING SPOT TRADING ACCOUNTS:');

    try {
      console.log('📊 Checking spot wallets...');
      const spotData = await makePhemexRequest('GET', '/exchange/spot/order');
      console.log('✅ Spot API accessible');
      console.log('📊 Spot data:', JSON.stringify(spotData, null, 2));
    } catch (error) {
      console.log('⚠️ Spot API error:', error.message);
    }

    // Test 4: Try different contract endpoints
    console.log('');
    console.log('🔍 CHECKING ALTERNATIVE ENDPOINTS:');

    const endpoints = [
      '/accounts/positions',
      '/exchange/order/list',
      '/accounts/accountPositions?currency=BTC',
      '/phemex-user/users/children'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`📊 Trying ${endpoint}...`);
        const data = await makePhemexRequest('GET', endpoint);
        if (data.code === 0 && data.data) {
          console.log(`✅ ${endpoint} - Success:`, JSON.stringify(data.data, null, 2).substring(0, 200) + '...');
        } else {
          console.log(`⚠️ ${endpoint} - Code: ${data.code}, Message: ${data.msg}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
      }
    }

    console.log('');
    console.log('✅ Phemex Account Test Completed Successfully!');
    console.log('🔐 Your API credentials are working correctly');
    console.log('📊 Ready to integrate with Mastra Portfolio Agent');
    console.log('');
    console.log('💡 NOTE: If you have positions but they\'re not showing:');
    console.log('   1. Check if you\'re using testnet vs mainnet API');
    console.log('   2. Verify the API keys are for the correct account');
    console.log('   3. Your positions might be in spot trading rather than futures');
    console.log('   4. The account might use a different base currency');

  } catch (error) {
    console.error('❌ Account test failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Check if API key and secret are correct');
    console.log('   2. Verify IP whitelist includes: 173.49.85.151');
    console.log('   3. Ensure API has read permissions for account data');
    console.log('   4. Check if Phemex API is accessible from your network');
  }
}

// Run the test
testAccountAccess();
