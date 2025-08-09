/**
 * Test the updated reference script approach for Agent Vault V2 withdrawal
 */

import { AgentVaultV2LucidClient } from './src/services/agent-vault-v2-lucid-client.ts';

// Mock Vespr wallet for testing
class MockVesprWallet {
  constructor() {
    this.addresses = ['addr1qxtkdjl87894tg6juz20jzyjqy3uyn02pr9xtq7mlh0gm2ss5dpkcny95dktp5qmyyrx82t68sge4m94qwxyrfr8f86qh5unyc'];
  }

  async getUsedAddresses() {
    return this.addresses;
  }

  async signTx(txCbor, partialSign = false) {
    console.log(`📝 Mock wallet signing (${txCbor.length} chars, partial: ${partialSign})`);
    
    if (partialSign) {
      return '825820' + '0'.repeat(64) + '5840' + '0'.repeat(128);
    } else {
      return txCbor + '825820' + '0'.repeat(64);
    }
  }

  async submitTx(signedTx) {
    console.log(`📤 Mock submitting transaction (${signedTx.length} chars)`);
    return 'a'.repeat(64); // Mock transaction hash
  }
}

async function testUpdatedWithdrawal() {
  console.log('🧪 Testing updated Agent Vault V2 withdrawal with reference script approach...\n');
  
  try {
    const lucidClient = new AgentVaultV2LucidClient();
    const mockWallet = new MockVesprWallet();
    
    const vaultState = {
      ownerPubKeyHash: '34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d',
      isEmergencyStopped: false,
      withdrawalLimit: BigInt(100_000_000), // 100 ADA
      minimumBalance: BigInt(5_000_000)     // 5 ADA
    };
    
    console.log('🔧 Starting withdrawal test...');
    
    const result = await lucidClient.withdraw(mockWallet, 7.5, vaultState);
    
    if (result.success) {
      console.log(`\n✅ WITHDRAWAL TEST PASSED! 🎉`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log('   Reference script approach successfully implemented');
    } else {
      console.log(`\n❌ Withdrawal test failed: ${result.error}`);
      
      // Analyze the error type
      if (result.error?.includes('MISSING_SCRIPT')) {
        console.log('🔍 Still getting MISSING_SCRIPT error');
        console.log('   This suggests the reference script approach needs refinement');
      } else if (result.error?.includes('Cannot read properties')) {
        console.log('🔍 API compatibility issue detected');
        console.log('   Lucid Evolution API might have changed');
      }
    }
    
  } catch (error) {
    console.error(`\n❌ Test error: ${error.message}`);
    console.error(`   Error type: ${error.name}`);
    
    if (error.stack) {
      console.error(`   Stack trace: ${error.stack.split('\n')[1]}`);
    }
  }
}

// Run the test
testUpdatedWithdrawal().catch(console.error);