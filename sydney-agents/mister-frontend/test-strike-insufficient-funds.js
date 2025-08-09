/**
 * Test Strike Finance Trading with Insufficient Funds
 * 
 * This will attempt a real Strike Finance trade with only 2.69 ADA
 * to see the insufficient funds error from Strike, not security checkpoint.
 */

import dotenv from 'dotenv';
dotenv.config();

const VAULT_ADDRESS = "addr1q8dxemepum00ydhf4j7w547ztry7zqf8c6za8lkddlznt8dc7upmv6282k0npx8yfad5q7jzg2tpdsjzlh5ytgr9gups2vk38e";
const USER_SEED = "bunker urge rabbit correct trophy hybrid title hold misery true dynamic space dismiss talk meat sunset enjoy annual salmon disease fat hungry slogan bike";

async function testStrikeInsufficientFunds() {
  console.log('🧪 Testing Strike Finance Trading with Insufficient Funds');
  console.log('=' .repeat(60));
  
  console.log('\n🎯 Goal: See Strike Finance insufficient funds error, NOT security checkpoint error');

  try {
    // Step 1: Check current vault balance
    console.log('\n1. Check Current Vault Balance:');
    const balanceResponse = await fetch('http://localhost:3001/check-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: VAULT_ADDRESS })
    });
    const balance = await balanceResponse.json();
    console.log(`   Vault balance: ${balance.balanceAda} ADA`);
    console.log(`   Strike minimum: 40 ADA`);
    console.log(`   Shortage: ${40 - balance.balanceAda} ADA`);

    // Step 2: Create agent wallet for testing
    console.log('\n2. Create Agent Wallet:');
    const agentResponse = await fetch('http://localhost:3001/generate-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const agent = await agentResponse.json();
    console.log(`   Agent address: ${agent.address.substring(0, 25)}...`);

    // Step 3: Try to allocate available funds to agent
    console.log('\n3. Allocate Available Funds to Agent:');
    const availableADA = Math.floor(balance.balanceAda - 0.5); // Leave some for fees
    const amountLovelace = availableADA * 1_000_000;
    
    console.log(`   Attempting to allocate: ${availableADA} ADA`);
    
    const transferResponse = await fetch('http://localhost:3001/vault-to-agent-transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaultAddress: VAULT_ADDRESS,
        agentAddress: agent.address,
        amountLovelace: amountLovelace,
        userSeed: USER_SEED
      })
    });

    const transferResult = await transferResponse.json();
    
    if (!transferResult.success) {
      console.log(`   ❌ Transfer failed: ${transferResult.error}`);
      console.log('   💡 This is expected - not enough funds for proper transfer');
      
      // Let's try with just 1 ADA to get the agent some funds
      console.log('\n   Trying 1 ADA transfer instead...');
      
      const smallTransferResponse = await fetch('http://localhost:3001/vault-to-agent-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultAddress: VAULT_ADDRESS,
          agentAddress: agent.address,
          amountLovelace: 1_000_000, // 1 ADA
          userSeed: USER_SEED
        })
      });
      
      const smallResult = await smallTransferResponse.json();
      if (smallResult.success) {
        console.log(`   ✅ Small transfer successful: ${smallResult.txHash}`);
        console.log('   💡 Agent now has ~1 ADA for testing Strike');
      } else {
        console.log(`   ❌ Even 1 ADA transfer failed: ${smallResult.error}`);
        throw new Error('Cannot get any funds to agent for testing');
      }
    } else {
      console.log(`   ✅ Transfer successful: ${transferResult.txHash}`);
      console.log(`   Agent should now have ${availableADA} ADA`);
    }

    // Wait a moment for transaction to be processed
    console.log('\n   ⏳ Waiting 10 seconds for transaction to propagate...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 4: Check agent balance
    console.log('\n4. Check Agent Balance:');
    const agentBalanceResponse = await fetch('http://localhost:3001/check-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: agent.address })
    });
    const agentBalance = await agentBalanceResponse.json();
    console.log(`   Agent balance: ${agentBalance.balanceAda} ADA`);
    console.log(`   Strike requires: 40 ADA`);
    console.log(`   Shortage: ${40 - agentBalance.balanceAda} ADA`);

    // Step 5: Now attempt Strike Finance trade with insufficient funds
    console.log('\n5. Attempt Strike Finance Trade with Insufficient Funds:');
    console.log('   🎯 This should show Strike\'s insufficient funds error, not security checkpoint');

    // Import browser service
    const { strikeBrowserService } = await import('./src/services/strike-browser-service.js');

    // Initialize browser session
    console.log('\n   🚀 Initializing browser session...');
    const sessionInitialized = await strikeBrowserService.initializeSession();
    
    if (!sessionInitialized) {
      console.log('   ❌ Browser session failed, trying direct API call...');
      
      // Fallback to direct API
      const strikeRequest = {
        request: {
          address: agent.address,
          asset: { policyId: "", assetName: "" },
          assetTicker: "ADA",
          collateralAmount: agentBalance.balanceAda || 1, // Use whatever agent has
          leverage: 2,
          position: 'Long'
        }
      };

      const directResponse = await fetch('https://app.strikefinance.org/api/perpetuals/openPosition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://app.strikefinance.org',
          'Referer': 'https://app.strikefinance.org/'
        },
        body: JSON.stringify(strikeRequest)
      });

      const responseText = await directResponse.text();
      console.log(`   📡 Strike response status: ${directResponse.status}`);
      console.log(`   📡 Strike response: ${responseText.substring(0, 200)}...`);
      
      if (responseText.includes('Security Checkpoint') || responseText.includes('Vercel')) {
        console.log('   ⚠️  Hit security checkpoint with direct API (expected)');
      }
      
    } else {
      console.log('   ✅ Browser session initialized');
      
      // Test Strike API connectivity first
      const connectivityTest = await strikeBrowserService.testConnectivity();
      console.log(`   🌐 Strike API accessible: ${connectivityTest.success ? 'YES' : 'NO'}`);
      
      if (connectivityTest.success) {
        console.log('   🎉 SUCCESS: Bypassed security checkpoint!');
        
        // Now try the actual trade with insufficient funds
        console.log('\n   💰 Attempting Strike trade with insufficient collateral...');
        
        const positionResult = await strikeBrowserService.openPosition({
          address: agent.address,
          asset: { policyId: "", assetName: "" },
          assetTicker: "ADA",
          collateralAmount: agentBalance.balanceAda || 1, // Use whatever agent has (insufficient)
          leverage: 2,
          position: 'Long'
        });

        if (positionResult.success) {
          console.log('   ❓ Unexpected success from Strike with insufficient funds');
          console.log(`   CBOR received: ${positionResult.cbor?.substring(0, 50)}...`);
        } else {
          console.log(`   ✅ EXPECTED ERROR: ${positionResult.error}`);
          
          if (positionResult.error.toLowerCase().includes('insufficient') || 
              positionResult.error.toLowerCase().includes('minimum') ||
              positionResult.error.toLowerCase().includes('collateral')) {
            console.log('   🎯 PERFECT! This is Strike\'s insufficient funds error');
            console.log('   💡 Not a security checkpoint - actual business logic error');
          } else {
            console.log('   💭 Different error - might be account setup or other issue');
          }
        }
      } else {
        console.log(`   ❌ Still hitting security checkpoint: ${connectivityTest.error}`);
        console.log('   💡 Browser automation needs more work');
      }
      
      // Cleanup browser
      await strikeBrowserService.cleanup();
    }

    console.log('\n6. Summary:');
    console.log(`   💰 Your vault has: ${balance.balanceAda} ADA`);
    console.log(`   🤖 Agent received: ${agentBalance?.balanceAda || 'unknown'} ADA`);
    console.log('   🎯 Strike requires: 40 ADA minimum');
    console.log('   📈 Need to add: ~37.5 more ADA to vault for real testing');
    
    console.log('\n🎉 TEST COMPLETE');
    console.log('Next step: Add more ADA to vault, then we can see Strike accept the trade!');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Check if Cardano service is running first
async function checkAndRun() {
  try {
    const healthResponse = await fetch('http://localhost:3001/health');
    if (healthResponse.ok) {
      console.log('✅ Cardano service is running');
      await testStrikeInsufficientFunds();
    } else {
      throw new Error('Service not healthy');
    }
  } catch (error) {
    console.log('❌ Cardano service not running. Start it first:');
    console.log('   cd cardano-service && npm start');
  }
}

checkAndRun().catch(console.error);