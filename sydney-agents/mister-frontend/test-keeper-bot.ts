/**
 * Test script to verify keeper bot service initialization
 */

import { KeeperBotService } from './src/services/keeper-bot/keeper-bot.service';

async function testKeeperBot() {
  console.log('Testing Keeper Bot Service...\n');
  
  try {
    // Test 1: Create keeper bot instance
    console.log('✓ Test 1: Creating keeper bot instance...');
    const keeperBot = new KeeperBotService({
      hyperEvmRpc: 'https://api.hyperliquid-testnet.xyz/evm',
      chainId: 999,
      vaultAddresses: ['0x1234567890123456789012345678901234567890'],
      privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
      hyperliquidApiUrl: 'https://api.hyperliquid-testnet.xyz',
      hyperliquidPrivateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
      hyperliquidAccountAddress: '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
      pollIntervalMs: 5000,
      maxGasPrice: BigInt('10000000000'), // 10 gwei
      maxSlippageBps: 50,
      emergencyStopLoss: 20,
      performanceUpdateInterval: 60000,
      sharpeCalculationWindow: 86400000,
      maxPositionsPerVault: 5,
      maxTotalExposure: BigInt('1000000000000'), // 1M USDC
      requireConfirmations: 1,
    });
    console.log('✅ Keeper bot instance created successfully!\n');
    
    // Test 2: Check status
    console.log('✓ Test 2: Checking keeper bot status...');
    const status = keeperBot.getStatus();
    console.log('Status:', JSON.stringify(status, null, 2));
    console.log('✅ Status check successful!\n');
    
    // Test 3: Event listeners
    console.log('✓ Test 3: Testing event listeners...');
    keeperBot.on('started', () => {
      console.log('Event: Keeper bot started');
    });
    
    keeperBot.on('authorizationReceived', (auth) => {
      console.log('Event: Authorization received', auth);
    });
    
    keeperBot.on('tradeExecuted', (data) => {
      console.log('Event: Trade executed', data);
    });
    console.log('✅ Event listeners registered successfully!\n');
    
    console.log('🎉 All keeper bot tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testKeeperBot().catch(console.error);