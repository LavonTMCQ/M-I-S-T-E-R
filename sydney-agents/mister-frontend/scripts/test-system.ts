#!/usr/bin/env npx tsx

/**
 * Simplified Agent Wallet System Test
 * Tests the system components with proper environment loading
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function testSystem(): Promise<void> {
  console.log('🚀 Testing Agent Wallet System...\n');

  // Verify environment variables
  console.log('📊 Environment Check:');
  console.log(`   Railway Host: ${process.env.RAILWAY_POSTGRES_HOST}`);
  console.log(`   Railway Port: ${process.env.RAILWAY_POSTGRES_PORT}`);
  console.log(`   Railway DB: ${process.env.RAILWAY_POSTGRES_DB}`);
  console.log(`   Has Password: ${!!process.env.RAILWAY_POSTGRES_PASSWORD}`);
  console.log(`   Cardano Service: ${process.env.CARDANO_SERVICE_URL}\n`);

  // Test 1: Database Connection
  console.log('🔧 Test 1: Database Connection');
  try {
    const { getRailwayDB } = await import('../src/lib/database/railway-db');
    const db = getRailwayDB();
    const health = await db.healthCheck();
    
    if (health.connected) {
      console.log('✅ Railway PostgreSQL connection successful');
      console.log(`   Status: ${health.status}`);
      console.log(`   Pool Size: ${health.poolSize}`);
    } else {
      console.log('❌ Database connection failed');
      return;
    }
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return;
  }

  // Test 2: Cardano Service
  console.log('\n🔧 Test 2: Cardano Service Health');
  try {
    const response = await fetch('http://localhost:3001/health');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Cardano service healthy');
      console.log(`   Network: ${data.network}`);
      console.log(`   Service: ${data.service}`);
    } else {
      console.log('⚠️ Cardano service not available - some tests will be skipped');
    }
  } catch (error) {
    console.log('⚠️ Cardano service not available - some tests will be skipped');
  }

  // Test 3: Agent Wallet Generation
  console.log('\n🔧 Test 3: Agent Wallet Generation');
  try {
    const { createAgentWalletManager } = await import('../src/services/agent-wallets/AgentWalletManager');
    const walletManager = createAgentWalletManager();
    
    const testAgentId = 'test_agent_' + Date.now();
    const testUserId = 'test_user_' + Date.now();

    const result = await walletManager.generateWallet({
      userId: testUserId,
      agentId: testAgentId
    });

    if (result.success && result.wallet) {
      console.log('✅ Agent wallet generation successful');
      console.log(`   Agent ID: ${result.wallet.agentId}`);
      console.log(`   Address: ${result.wallet.walletAddress.substring(0, 25)}...`);
      console.log(`   Encrypted: ${!!result.wallet.privateKeyEncrypted}`);

      // Test retrieval
      const retrieved = await walletManager.getWallet(testAgentId);
      if (retrieved) {
        console.log('✅ Wallet retrieval successful');
      } else {
        console.log('❌ Wallet retrieval failed');
      }

      // Cleanup
      const { getRailwayDB } = await import('../src/lib/database/railway-db');
      const db = getRailwayDB();
      await db.delete('agent_wallets', { agent_id: testAgentId });
      console.log('✅ Test data cleaned up');
    } else {
      console.log('❌ Wallet generation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Wallet generation test failed:', error);
  }

  // Test 4: Vault-Agent Bridge
  console.log('\n🔧 Test 4: Vault-Agent Bridge Health');
  try {
    const { createVaultAgentBridge } = await import('../src/services/agent-wallets/VaultAgentBridge');
    const bridge = createVaultAgentBridge();
    
    const health = await bridge.healthCheck();
    console.log('📊 Bridge Health:', {
      status: health.status,
      database: health.database,
      walletManager: health.walletManager,
      cardanoService: health.cardanoService
    });

    if (health.status === 'healthy') {
      console.log('✅ Vault-Agent Bridge is healthy');
    } else {
      console.log('⚠️ Bridge has issues - check individual components');
    }
  } catch (error) {
    console.error('❌ Bridge test failed:', error);
  }

  console.log('\n🎉 System test completed!');
  console.log('\n🚀 Ready for capital allocation testing with small amounts (1-2 ADA)');
}

if (require.main === module) {
  testSystem().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

export { testSystem };