/**
 * Simple test script for Agent Wallet Manager
 * Tests wallet generation and encryption without database
 */

import { createAgentWalletManager } from './AgentWalletManager';
import { WalletGenerationRequest } from '@/types/agent-wallets/types';

async function testAgentWalletGeneration() {
  console.log('🧪 Testing Agent Wallet Generation...\n');

  // Create wallet manager (without database for testing)
  const walletManager = createAgentWalletManager();

  try {
    // Test wallet generation
    console.log('🔧 Generating test agent wallet...');
    const request: WalletGenerationRequest = {
      userId: 'test_user_123',
      agentId: 'test_agent_456'
    };

    const result = await walletManager.generateWallet(request);

    if (result.success && result.wallet && result.credentials) {
      console.log('✅ Wallet generation successful!');
      console.log('📊 Results:', {
        walletId: result.wallet.id,
        userId: result.wallet.userId,
        agentId: result.wallet.agentId,
        address: result.credentials.address.substring(0, 25) + '...',
        hasPrivateKey: !!result.credentials.privateKey,
        hasMnemonic: !!result.credentials.mnemonic,
        isEncrypted: !!result.wallet.privateKeyEncrypted
      });

      // Test credential recovery
      console.log('\n🔐 Testing credential recovery...');
      const recoveryResult = await walletManager.getWalletCredentials(
        request.agentId,
        'test_password' // This won't work since we used deterministic password
      );

      if (!recoveryResult.success) {
        console.log('⚠️ Recovery failed as expected (wrong password)');
      }

      // Test balance checking
      console.log('\n💰 Testing balance checking...');
      const balanceResult = await walletManager.checkBalance(result.credentials.address);
      console.log('📊 Balance check result:', {
        address: balanceResult.address.substring(0, 25) + '...',
        balanceAda: balanceResult.balanceAda,
        utxoCount: balanceResult.utxos.length
      });

      return true;
    } else {
      console.error('❌ Wallet generation failed:', result.error);
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test if called directly
if (require.main === module) {
  testAgentWalletGeneration()
    .then(success => {
      console.log(success ? '\n✅ All tests passed!' : '\n❌ Tests failed!');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ Test runner failed:', error);
      process.exit(1);
    });
}

export { testAgentWalletGeneration };