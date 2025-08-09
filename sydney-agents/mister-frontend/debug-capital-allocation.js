/**
 * Debug: Capital Allocation Flow with Insufficient Funds
 * 
 * Let's trace exactly what happens when we try to allocate 40 ADA 
 * but only have 2.69 ADA in the vault.
 */

import dotenv from 'dotenv';
dotenv.config();

const VAULT_ADDRESS = "addr1q8dxemepum00ydhf4j7w547ztry7zqf8c6za8lkddlznt8dc7upmv6282k0npx8yfad5q7jzg2tpdsjzlh5ytgr9gups2vk38e";

async function debugCapitalAllocation() {
  console.log('🔍 Debugging Capital Allocation Flow');
  console.log('=' .repeat(50));

  try {
    console.log('\n1. Check Vault Balance:');
    const balanceResponse = await fetch('http://localhost:3001/check-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: VAULT_ADDRESS })
    });
    const balance = await balanceResponse.json();
    console.log(`   Vault has: ${balance.balanceAda} ADA`);

    console.log('\n2. Generate Agent Wallet:');
    const agentResponse = await fetch('http://localhost:3001/generate-credentials');
    const agent = await agentResponse.json();
    console.log(`   Agent address: ${agent.address.substring(0, 25)}...`);

    console.log('\n3. Attempt Capital Transfer (40 ADA):');
    const transferResponse = await fetch('http://localhost:3001/vault-to-agent-transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaultAddress: VAULT_ADDRESS,
        agentAddress: agent.address,
        amountLovelace: 40_000_000, // 40 ADA
        userSeed: "bunker urge rabbit correct trophy hybrid title hold misery true dynamic space dismiss talk meat sunset enjoy annual salmon disease fat hungry slogan bike"
      })
    });

    const transferResult = await transferResponse.json();
    console.log(`   Transfer success: ${transferResult.success}`);
    
    if (!transferResult.success) {
      console.log(`   ❌ Error: ${transferResult.error}`);
      
      if (transferResult.details) {
        console.log('\n📊 Transfer Details:');
        console.log(`   Available: ${transferResult.details.availableADA} ADA`);
        console.log(`   Requested: ${transferResult.details.requestedADA} ADA`);
        console.log(`   Fee: ${transferResult.details.estimatedFee} ADA`);
        console.log(`   Shortage: ${transferResult.details.shortageADA} ADA`);
      }
      
      console.log('\n✅ EXPECTED: This should fail - vault has insufficient funds');
    } else {
      console.log(`   ✅ Unexpected success: ${transferResult.message}`);
      console.log(`   TX Hash: ${transferResult.txHash}`);
    }

    console.log('\n4. What This Means for Strike Finance:');
    if (!transferResult.success) {
      console.log('   🎯 Agent wallet will not have 40 ADA');
      console.log('   🎯 Strike Finance trade should be blocked at agent balance check');
      console.log('   🎯 User will get clear error about insufficient vault funds');
    }

    console.log('\n5. Test with Available Amount (1 ADA):');
    const smallTransferResponse = await fetch('http://localhost:3001/vault-to-agent-transfer', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaultAddress: VAULT_ADDRESS,
        agentAddress: agent.address,
        amountLovelace: 1_000_000, // 1 ADA
        userSeed: "bunker urge rabbit correct trophy hybrid title hold misery true dynamic space dismiss talk meat sunset enjoy annual salmon disease fat hungry slogan bike"
      })
    });

    const smallResult = await smallTransferResponse.json();
    console.log(`   1 ADA transfer success: ${smallResult.success}`);
    
    if (smallResult.success) {
      console.log(`   ✅ Success: ${smallResult.message}`);
      console.log(`   TX Hash: ${smallResult.txHash}`);
      console.log('   🎯 This proves the system works with available funds');
    } else {
      console.log(`   ❌ Failed: ${smallResult.error}`);
    }

    console.log('\n🎉 DEBUGGING COMPLETE');
    console.log('Now we understand exactly what happens with insufficient funds!');

  } catch (error) {
    console.error('\n❌ DEBUG FAILED');
    console.error('Error:', error.message);
  }
}

debugCapitalAllocation().catch(console.error);