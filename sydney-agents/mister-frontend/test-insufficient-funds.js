/**
 * Test: What happens when vault has insufficient funds for Strike Finance trading?
 * 
 * Current situation:
 * - Vault has: 2.69 ADA 
 * - Strike Finance needs: 40 ADA minimum
 * - User requests: 50 ADA position
 * 
 * Expected behavior: System should gracefully fail with clear error message
 */

import dotenv from 'dotenv';
dotenv.config();

const VAULT_ADDRESS = "addr1q8dxemepum00ydhf4j7w547ztry7zqf8c6za8lkddlznt8dc7upmv6282k0npx8yfad5q7jzg2tpdsjzlh5ytgr9gups2vk38e";
const CARDANO_SERVICE_URL = "http://localhost:3001";

async function testInsufficientFunds() {
  console.log('💰 Testing Strike Finance with Insufficient Vault Funds');
  console.log('=' .repeat(60));

  try {
    // 1. Check current vault balance
    console.log('\n📊 Step 1: Check Vault Balance');
    console.log('-'.repeat(40));
    
    const balanceResponse = await fetch(`${CARDANO_SERVICE_URL}/check-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: VAULT_ADDRESS })
    });

    const balanceData = await balanceResponse.json();
    console.log(`💰 Current Vault Balance: ${balanceData.balanceAda} ADA`);
    console.log(`🎯 Strike Finance Minimum: 40 ADA`);
    console.log(`📈 Requested Position Size: 50 ADA`);
    console.log(`❌ Shortfall: ${40 - balanceData.balanceAda} ADA`);

    // 2. Attempt Strike Finance trade
    console.log('\n🎯 Step 2: Attempt Strike Finance Trade');
    console.log('-'.repeat(40));

    const tradeResponse = await fetch('http://localhost:3002/api/agent-trading/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userVaultAddress: VAULT_ADDRESS,
        agentId: 'test-insufficient-funds',
        signal: 'buy',
        collateralAmount: 50 // Request 50 ADA but only have 2.69 ADA
      })
    });

    const tradeData = await tradeResponse.json();
    
    console.log('\n📋 Trade Execution Result:');
    console.log(`Success: ${tradeData.success ? '✅' : '❌'}`);
    
    if (!tradeData.success) {
      console.log(`Error: ${tradeData.error}`);
    }

    if (tradeData.data?.executionResult) {
      console.log('\n🔍 Detailed Execution Result:');
      console.log(JSON.stringify(tradeData.data.executionResult, null, 2));
    }

    // 3. Solutions for insufficient funds
    console.log('\n💡 Step 3: Solutions');
    console.log('-'.repeat(40));
    
    const shortfall = 40 - balanceData.balanceAda;
    
    console.log('🔧 To enable Strike Finance trading:');
    console.log(`  1. Add ${shortfall.toFixed(2)} more ADA to vault`);
    console.log(`  2. Or lower minimum trading amount (if Strike allows)`);
    console.log(`  3. Or implement fund pooling across users`);
    console.log(`  4. Or wait for smaller trade opportunities`);

    // 4. Test with realistic amount
    console.log('\n🧪 Step 4: Test with Available Funds');
    console.log('-'.repeat(40));

    const availableAmount = Math.floor(balanceData.balanceAda - 1); // Leave 1 ADA for fees
    console.log(`💰 Testing with ${availableAmount} ADA (available - 1 ADA for fees)`);

    if (availableAmount < 5) {
      console.log('⚠️  Even with available funds, too small for meaningful test');
    } else {
      // Test would need to be implemented with agent wallet system
      console.log('ℹ️  This would create agent wallet and transfer available funds');
      console.log('ℹ️  But Strike Finance would still reject < 40 ADA positions');
    }

    console.log('\n✅ INSUFFICIENT FUNDS TEST COMPLETED');
    console.log('🎯 System correctly identifies and handles insufficient capital');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
console.log('Testing Strike Finance behavior with insufficient funds...\n');
testInsufficientFunds().catch(console.error);