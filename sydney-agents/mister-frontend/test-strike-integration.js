/**
 * Test Strike Finance Integration with Agent Wallets
 * 
 * This script tests the complete flow:
 * 1. Check agent wallet system health
 * 2. Test Strike Finance API connectivity
 * 3. Test agent trading signal execution
 * 4. Verify 40 ADA minimum handling
 */

import { agentStrikeTrader } from './src/services/agent-wallets/AgentStrikeTrader.ts';

const TEST_USER_VAULT_ADDRESS = process.env.LIVE_TEST_VAULT_ADDRESS || 'addr1q8dxemepum00ydhf4j7w547ztry7zqf8c6za8lkddlznt8dc7upmv6282k0npx8yfad5q7jzg2tpdsjzlh5ytgr9gups2vk38e';

async function testStrikeIntegration() {
  console.log('🤖 Testing Strike Finance Integration with Agent Wallets\n');

  try {
    // 1. Health Check
    console.log('🏥 Running health checks...');
    const health = await agentStrikeTrader.healthCheck();
    console.log('Health Status:', JSON.stringify(health, null, 2));

    if (health.status !== 'healthy') {
      console.error('❌ System not healthy, stopping test');
      return;
    }

    // 2. Test Trading Signal Execution (below minimum)
    console.log('\n💰 Testing with insufficient balance (5 ADA)...');
    const smallSignal = {
      agentId: 'momentum-trader-1',
      signal: 'buy',
      confidence: 0.75,
      reasoning: 'Strong momentum detected in ADA/USD',
      maxPositionSize: 5 // Below 40 ADA minimum
    };

    const smallResult = await agentStrikeTrader.executeTradingSignal(
      TEST_USER_VAULT_ADDRESS,
      smallSignal
    );

    console.log('Small Signal Result:', JSON.stringify(smallResult, null, 2));

    if (smallResult.success) {
      console.log('⚠️  Small signal should have failed due to insufficient funds');
    }

    // 3. Test Trading Signal Execution (sufficient balance)
    console.log('\n💰 Testing with sufficient balance (45 ADA)...');
    const largeSignal = {
      agentId: 'momentum-trader-1', 
      signal: 'buy',
      confidence: 0.85,
      reasoning: 'Strong bullish momentum with high volume',
      maxPositionSize: 45 // Above 40 ADA minimum
    };

    const largeResult = await agentStrikeTrader.executeTradingSignal(
      TEST_USER_VAULT_ADDRESS,
      largeSignal
    );

    console.log('Large Signal Result:', JSON.stringify(largeResult, null, 2));

    if (!largeResult.success) {
      console.error('❌ Large signal should have succeeded');
      console.error('Error:', largeResult.error);
    } else {
      console.log('✅ Successfully opened position:', largeResult.positionId);
      
      // 4. Test Position Closing
      if (largeResult.positionId) {
        console.log('\n🔄 Testing position closure...');
        const closeResult = await agentStrikeTrader.closePosition(
          'momentum-trader-1',
          largeResult.positionId,
          'Test closure'
        );
        
        console.log('Close Result:', JSON.stringify(closeResult, null, 2));
        
        if (closeResult.success) {
          console.log('✅ Successfully closed position');
          if (closeResult.estimatedPnL) {
            const pnlStatus = closeResult.estimatedPnL > 0 ? 'PROFIT' : 'LOSS';
            console.log(`💹 P&L: ${closeResult.estimatedPnL} ADA (${pnlStatus})`);
          }
        }
      }
    }

    console.log('\n✅ Strike Finance integration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testStrikeIntegration().catch(console.error);