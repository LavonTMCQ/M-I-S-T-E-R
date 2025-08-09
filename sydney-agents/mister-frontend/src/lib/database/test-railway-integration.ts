/**
 * Railway PostgreSQL Integration Test
 * 
 * Tests complete database integration with agent wallet system
 */

import { getRailwayDB, testDatabaseConnection } from './railway-db';
import { runAgentWalletMigrations, testAgentWalletSchema } from './migrations';
import { createAgentWalletManager } from '@/services/agent-wallets/AgentWalletManager';

async function testRailwayIntegration(): Promise<boolean> {
  console.log('🚀 Testing Railway PostgreSQL Integration...\n');

  let success = true;

  try {
    // Step 1: Test database connection
    console.log('📡 Step 1: Testing Railway PostgreSQL connection...');
    const connectionOk = await testDatabaseConnection();
    if (!connectionOk) {
      console.error('❌ Database connection failed');
      return false;
    }
    console.log('✅ Database connection successful\n');

    // Step 2: Run database migrations
    console.log('🏗️ Step 2: Running database migrations...');
    await runAgentWalletMigrations();
    console.log('✅ Database migrations completed\n');

    // Step 3: Test database schema
    console.log('🧪 Step 3: Testing database schema...');
    const schemaOk = await testAgentWalletSchema();
    if (!schemaOk) {
      console.error('❌ Schema test failed');
      success = false;
    } else {
      console.log('✅ Schema test passed\n');
    }

    // Step 4: Test AgentWalletManager integration
    console.log('👛 Step 4: Testing AgentWalletManager with Railway...');
    const walletManager = createAgentWalletManager();
    
    // Health check
    const health = await walletManager.healthCheck();
    console.log('🔍 Health check result:', {
      status: health.status,
      cardanoService: health.cardanoService,
      database: health.database
    });

    if (health.status !== 'healthy') {
      console.error('❌ AgentWalletManager health check failed');
      success = false;
    } else {
      console.log('✅ AgentWalletManager health check passed\n');
    }

    // Step 5: Test wallet generation (if cardano service is available)
    if (health.cardanoService) {
      console.log('🔧 Step 5: Testing end-to-end wallet generation...');
      
      const testRequest = {
        userId: 'railway_test_user',
        agentId: 'railway_test_agent_' + Date.now()
      };

      const result = await walletManager.generateWallet(testRequest);
      
      if (result.success && result.wallet) {
        console.log('✅ Wallet generation successful:', {
          walletId: result.wallet.id,
          agentId: result.wallet.agentId,
          address: result.wallet.walletAddress.substring(0, 25) + '...',
          encrypted: !!result.wallet.privateKeyEncrypted
        });

        // Test wallet retrieval
        const retrievedWallet = await walletManager.getWallet(testRequest.agentId);
        if (retrievedWallet) {
          console.log('✅ Wallet retrieval successful');
          
          // Clean up test data
          const db = getRailwayDB();
          await db.delete('agent_wallets', { agent_id: testRequest.agentId });
          console.log('✅ Test data cleaned up');
        } else {
          console.error('❌ Wallet retrieval failed');
          success = false;
        }
      } else {
        console.error('❌ Wallet generation failed:', result.error);
        success = false;
      }
    } else {
      console.log('⚠️ Skipping wallet generation test (cardano service unavailable)\n');
    }

    // Step 6: Test database views
    console.log('👁️ Step 6: Testing database views...');
    const db = getRailwayDB();
    
    try {
      const summaryResult = await db.query('SELECT COUNT(*) as count FROM agent_wallet_summary');
      console.log('✅ agent_wallet_summary view accessible');
      
      const userSummaryResult = await db.query('SELECT COUNT(*) as count FROM user_agent_summary');
      console.log('✅ user_agent_summary view accessible');
    } catch (error) {
      console.error('❌ View test failed:', error);
      success = false;
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    success = false;
  }

  return success;
}

/**
 * Quick connection test (minimal setup required)
 */
export async function quickConnectionTest(): Promise<void> {
  console.log('⚡ Quick Railway PostgreSQL Connection Test...');
  
  try {
    const db = getRailwayDB();
    const health = await db.healthCheck();
    
    console.log('📊 Connection Status:', {
      status: health.status,
      connected: health.connected,
      poolSize: health.poolSize,
      idleCount: health.idleCount
    });

    if (health.connected) {
      console.log('✅ Railway PostgreSQL connection is working!');
    } else {
      console.log('❌ Railway PostgreSQL connection failed');
      console.log('💡 Make sure to set your Railway database credentials in .env.local:');
      console.log('   RAILWAY_POSTGRES_HOST=your-db-host.railway.app');
      console.log('   RAILWAY_POSTGRES_PASSWORD=your-password');
    }

  } catch (error) {
    console.error('❌ Quick connection test failed:', error);
    console.log('💡 Check your Railway PostgreSQL environment variables');
  }
}

// Run test if called directly
if (require.main === module) {
  const testType = process.argv[2] || 'full';
  
  if (testType === 'quick') {
    quickConnectionTest()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    testRailwayIntegration()
      .then(success => {
        console.log(success ? '\n✅ All Railway integration tests passed!' : '\n❌ Some tests failed!');
        process.exit(success ? 0 : 1);
      })
      .catch(error => {
        console.error('\n❌ Test runner failed:', error);
        process.exit(1);
      });
  }
}

export { testRailwayIntegration };