/**
 * Database Migrations for Agent Wallet System
 * 
 * Sets up complete schema on Railway PostgreSQL
 */

import { getRailwayDB } from './railway-db';

export async function runAgentWalletMigrations(): Promise<void> {
  const db = getRailwayDB();
  
  console.log('🚀 Starting Agent Wallet database migrations...');

  try {
    // Enable UUID extension
    console.log('📦 Enabling UUID extension...');
    await db.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create agent_wallets table
    console.log('👛 Creating agent_wallets table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS agent_wallets (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id VARCHAR(255) NOT NULL,
          agent_id VARCHAR(255) UNIQUE NOT NULL,
          
          -- Wallet credentials (encrypted)
          wallet_address TEXT UNIQUE NOT NULL,
          private_key_encrypted TEXT NOT NULL,
          encryption_key_hash TEXT NOT NULL,
          mnemonic_encrypted TEXT NOT NULL,
          
          -- Balance tracking
          current_balance_lovelace BIGINT DEFAULT 0,
          current_balance_ada DECIMAL(20,6) GENERATED ALWAYS AS (current_balance_lovelace / 1000000.0) STORED,
          last_balance_check TIMESTAMP DEFAULT NOW(),
          
          -- Status tracking
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled', 'error')),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for agent_wallets
    console.log('📊 Creating agent_wallets indexes...');
    await db.query('CREATE INDEX IF NOT EXISTS idx_agent_wallets_user_id ON agent_wallets(user_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_agent_wallets_agent_id ON agent_wallets(agent_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_agent_wallets_address ON agent_wallets(wallet_address)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_agent_wallets_status ON agent_wallets(status)');

    // Create vault_agent_allocations table
    console.log('💰 Creating vault_agent_allocations table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS vault_agent_allocations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_vault_address TEXT NOT NULL,
          agent_wallet_address TEXT NOT NULL REFERENCES agent_wallets(wallet_address) ON DELETE CASCADE,
          
          -- Allocation details
          amount_lovelace BIGINT NOT NULL CHECK (amount_lovelace > 0),
          amount_ada DECIMAL(20,6) GENERATED ALWAYS AS (amount_lovelace / 1000000.0) STORED,
          purpose VARCHAR(255) NOT NULL,
          
          -- Transaction tracking
          allocation_tx_hash TEXT,
          allocation_tx_confirmed BOOLEAN DEFAULT FALSE,
          return_tx_hash TEXT NULL,
          return_tx_confirmed BOOLEAN DEFAULT FALSE,
          
          -- Status tracking
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'returned', 'failed', 'lost')),
          allocated_at TIMESTAMP DEFAULT NOW(),
          returned_at TIMESTAMP NULL,
          
          -- P&L tracking
          returned_amount_lovelace BIGINT NULL,
          net_pnl_lovelace BIGINT GENERATED ALWAYS AS (
              COALESCE(returned_amount_lovelace, 0) - amount_lovelace
          ) STORED,
          net_pnl_ada DECIMAL(20,6) GENERATED ALWAYS AS (
              (COALESCE(returned_amount_lovelace, 0) - amount_lovelace) / 1000000.0
          ) STORED
      )
    `);

    // Create indexes for allocations
    console.log('📊 Creating allocation indexes...');
    await db.query('CREATE INDEX IF NOT EXISTS idx_allocations_user_vault ON vault_agent_allocations(user_vault_address)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_allocations_agent_wallet ON vault_agent_allocations(agent_wallet_address)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_allocations_status ON vault_agent_allocations(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_allocations_allocated_at ON vault_agent_allocations(allocated_at)');

    // Create agent_positions table
    console.log('📈 Creating agent_positions table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS agent_positions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          agent_wallet_address TEXT NOT NULL REFERENCES agent_wallets(wallet_address) ON DELETE CASCADE,
          allocation_id UUID REFERENCES vault_agent_allocations(id) ON DELETE SET NULL,
          
          -- Strike Finance details
          strike_position_id TEXT,
          position_type VARCHAR(10) NOT NULL CHECK (position_type IN ('Long', 'Short')),
          collateral_lovelace BIGINT NOT NULL,
          collateral_ada DECIMAL(20,6) GENERATED ALWAYS AS (collateral_lovelace / 1000000.0) STORED,
          leverage DECIMAL(4,2) NOT NULL CHECK (leverage >= 1.0 AND leverage <= 50.0),
          position_size_lovelace BIGINT GENERATED ALWAYS AS (collateral_lovelace * leverage) STORED,
          entry_price_usd DECIMAL(10,4) NOT NULL,
          
          -- Risk management
          stop_loss_usd DECIMAL(10,4),
          take_profit_usd DECIMAL(10,4),
          liquidation_price_usd DECIMAL(10,4),
          
          -- Status tracking
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'closed', 'liquidated', 'failed')),
          opened_at TIMESTAMP DEFAULT NOW(),
          closed_at TIMESTAMP NULL,
          
          -- P&L tracking
          current_price_usd DECIMAL(10,4) DEFAULT 0,
          current_pnl_lovelace BIGINT DEFAULT 0,
          current_pnl_ada DECIMAL(20,6) GENERATED ALWAYS AS (current_pnl_lovelace / 1000000.0) STORED,
          realized_pnl_lovelace BIGINT NULL,
          realized_pnl_ada DECIMAL(20,6) GENERATED ALWAYS AS (realized_pnl_lovelace / 1000000.0) STORED,
          
          -- Strike Finance transaction references
          open_tx_hash TEXT,
          close_tx_hash TEXT,
          
          -- Additional metadata
          strategy VARCHAR(100),
          confidence_score DECIMAL(3,2),
          created_by VARCHAR(100) DEFAULT 'agent'
      )
    `);

    // Create indexes for positions
    console.log('📊 Creating position indexes...');
    await db.query('CREATE INDEX IF NOT EXISTS idx_positions_agent_wallet ON agent_positions(agent_wallet_address)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_positions_allocation ON agent_positions(allocation_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_positions_status ON agent_positions(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_positions_opened_at ON agent_positions(opened_at)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_positions_strike_id ON agent_positions(strike_position_id)');

    // Create agent_wallet_transactions table
    console.log('📝 Creating agent_wallet_transactions table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS agent_wallet_transactions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          agent_wallet_address TEXT NOT NULL REFERENCES agent_wallets(wallet_address) ON DELETE CASCADE,
          
          -- Transaction details
          transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
              'allocation_received', 'allocation_returned', 'trading_fee', 'network_fee',
              'strike_deposit', 'strike_withdrawal', 'pnl_settlement', 'other'
          )),
          amount_lovelace BIGINT NOT NULL,
          amount_ada DECIMAL(20,6) GENERATED ALWAYS AS (amount_lovelace / 1000000.0) STORED,
          
          -- Reference information
          tx_hash TEXT,
          related_allocation_id UUID REFERENCES vault_agent_allocations(id),
          related_position_id UUID REFERENCES agent_positions(id),
          
          -- Additional context
          description TEXT,
          metadata JSONB,
          
          -- Timing
          occurred_at TIMESTAMP DEFAULT NOW(),
          block_height BIGINT,
          confirmation_count INTEGER DEFAULT 0
      )
    `);

    // Create indexes for transactions
    console.log('📊 Creating transaction indexes...');
    await db.query('CREATE INDEX IF NOT EXISTS idx_transactions_agent_wallet ON agent_wallet_transactions(agent_wallet_address)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_transactions_type ON agent_wallet_transactions(transaction_type)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON agent_wallet_transactions(occurred_at)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON agent_wallet_transactions(tx_hash)');

    // Create updated_at trigger function
    console.log('⚡ Creating trigger functions...');
    await db.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Apply updated_at trigger to agent_wallets
    await db.query('DROP TRIGGER IF EXISTS update_agent_wallets_updated_at ON agent_wallets');
    await db.query(`
      CREATE TRIGGER update_agent_wallets_updated_at 
          BEFORE UPDATE ON agent_wallets 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `);

    // Create helpful views for reporting
    console.log('👁️ Creating reporting views...');
    await db.query(`
      CREATE OR REPLACE VIEW agent_wallet_summary AS
      SELECT 
          aw.id,
          aw.user_id,
          aw.agent_id,
          aw.wallet_address,
          aw.current_balance_ada,
          aw.status,
          aw.created_at,
          
          -- Allocation summary
          COUNT(ava.id) AS total_allocations,
          COALESCE(SUM(ava.amount_ada) FILTER (WHERE ava.status = 'active'), 0) AS active_allocation_ada,
          COALESCE(SUM(ava.net_pnl_ada), 0) AS total_pnl_ada,
          
          -- Position summary
          COUNT(ap.id) AS total_positions,
          COUNT(ap.id) FILTER (WHERE ap.status = 'active') AS active_positions,
          COALESCE(SUM(ap.current_pnl_ada) FILTER (WHERE ap.status = 'active'), 0) AS current_trading_pnl_ada
          
      FROM agent_wallets aw
      LEFT JOIN vault_agent_allocations ava ON aw.wallet_address = ava.agent_wallet_address
      LEFT JOIN agent_positions ap ON aw.wallet_address = ap.agent_wallet_address
      GROUP BY aw.id, aw.user_id, aw.agent_id, aw.wallet_address, aw.current_balance_ada, aw.status, aw.created_at
    `);

    await db.query(`
      CREATE OR REPLACE VIEW user_agent_summary AS
      SELECT 
          user_id,
          COUNT(DISTINCT agent_id) AS agent_count,
          COUNT(DISTINCT wallet_address) AS wallet_count,
          COALESCE(SUM(current_balance_ada), 0) AS total_agent_balance_ada,
          COUNT(*) FILTER (WHERE status = 'active') AS active_agents,
          COUNT(*) FILTER (WHERE status = 'paused') AS paused_agents,
          MIN(created_at) AS first_agent_created,
          MAX(created_at) AS latest_agent_created
      FROM agent_wallets
      GROUP BY user_id
    `);

    // Add table comments
    console.log('📋 Adding table documentation...');
    await db.query(`COMMENT ON TABLE agent_wallets IS 'Core agent wallet storage with encrypted credentials'`);
    await db.query(`COMMENT ON TABLE vault_agent_allocations IS 'Capital allocations from user vaults to agent wallets'`);
    await db.query(`COMMENT ON TABLE agent_positions IS 'Strike Finance trading positions opened by agents'`);
    await db.query(`COMMENT ON TABLE agent_wallet_transactions IS 'Audit trail of all agent wallet transactions'`);

    console.log('✅ All Agent Wallet migrations completed successfully!');

    // Display summary
    const tables = await db.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('agent_wallets', 'vault_agent_allocations', 'agent_positions', 'agent_wallet_transactions')
      ORDER BY table_name
    `);

    console.log('📊 Migration Summary:');
    tables.rows.forEach(table => {
      console.log(`  ✅ ${table.table_name}: ${table.column_count} columns`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Test the database schema by inserting and retrieving test data
 */
export async function testAgentWalletSchema(): Promise<boolean> {
  const db = getRailwayDB();
  
  try {
    console.log('🧪 Testing agent wallet schema...');

    // Test inserting a test wallet
    const testWallet = {
      user_id: 'test_user_schema',
      agent_id: 'test_agent_schema',
      wallet_address: 'addr1test_schema_' + Date.now(),
      private_key_encrypted: JSON.stringify({test: 'encrypted_key'}),
      encryption_key_hash: 'test_hash_' + Date.now(),
      mnemonic_encrypted: JSON.stringify({test: 'encrypted_mnemonic'})
    };

    const insertedWallet = await db.insert('agent_wallets', testWallet);
    console.log('✅ Test wallet inserted:', insertedWallet.id);

    // Test selecting the wallet
    const selectedWallets = await db.select('agent_wallets', { agent_id: 'test_agent_schema' });
    console.log('✅ Test wallet retrieved:', selectedWallets.length > 0);

    // Test updating the wallet
    const updatedWallet = await db.update(
      'agent_wallets', 
      { status: 'paused' }, 
      { agent_id: 'test_agent_schema' }
    );
    console.log('✅ Test wallet updated:', updatedWallet.status === 'paused');

    // Clean up test data
    await db.delete('agent_wallets', { agent_id: 'test_agent_schema' });
    console.log('✅ Test data cleaned up');

    return true;

  } catch (error) {
    console.error('❌ Schema test failed:', error);
    return false;
  }
}

/**
 * Drop all agent wallet tables (use with caution!)
 */
export async function dropAgentWalletTables(): Promise<void> {
  const db = getRailwayDB();
  
  console.log('⚠️ Dropping all agent wallet tables...');
  
  try {
    await db.query('DROP VIEW IF EXISTS user_agent_summary CASCADE');
    await db.query('DROP VIEW IF EXISTS agent_wallet_summary CASCADE');
    await db.query('DROP TABLE IF EXISTS agent_wallet_transactions CASCADE');
    await db.query('DROP TABLE IF EXISTS agent_positions CASCADE');
    await db.query('DROP TABLE IF EXISTS vault_agent_allocations CASCADE');
    await db.query('DROP TABLE IF EXISTS agent_wallets CASCADE');
    await db.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
    
    console.log('✅ All agent wallet tables dropped');
  } catch (error) {
    console.error('❌ Failed to drop tables:', error);
    throw error;
  }
}

/**
 * Multi-Provider Support Migration
 * 
 * Adds support for multiple trading providers (Strike Finance, Hyperliquid, etc.)
 * This migration is designed to be NON-BREAKING and additive only.
 */
export async function runMultiProviderMigration(): Promise<void> {
  const db = getRailwayDB();
  
  console.log('🚀 Starting Multi-Provider migration...');

  try {
    // Add provider column to agent_positions table (NON-BREAKING)
    console.log('📈 Adding provider column to agent_positions...');
    
    // Check if provider column already exists
    const providerColumnExists = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agent_positions' 
      AND column_name = 'provider'
    `);

    if (providerColumnExists.rows.length === 0) {
      // Add provider column with default value 'strike' for backward compatibility
      await db.query(`
        ALTER TABLE agent_positions 
        ADD COLUMN provider VARCHAR(50) DEFAULT 'strike' 
        CHECK (provider IN ('strike', 'hyperliquid', 'mock'))
      `);
      
      // Create index for the new column
      await db.query('CREATE INDEX IF NOT EXISTS idx_positions_provider ON agent_positions(provider)');
      
      console.log('✅ Provider column added to agent_positions');
    } else {
      console.log('✅ Provider column already exists in agent_positions');
    }

    // Create provider_configurations table
    console.log('⚙️ Creating provider_configurations table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS provider_configurations (
          id SERIAL PRIMARY KEY,
          provider_name VARCHAR(50) UNIQUE NOT NULL,
          display_name VARCHAR(100) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          chain_type VARCHAR(20) NOT NULL CHECK (chain_type IN ('cardano', 'evm')),
          base_api_url VARCHAR(255),
          min_position_size_usd DECIMAL(18, 8) DEFAULT 0,
          max_position_size_usd DECIMAL(18, 8),
          
          -- Fee structure (stored as JSON for flexibility)
          fee_structure JSONB DEFAULT '{}',
          
          -- Provider limits and features
          limits_and_features JSONB DEFAULT '{}',
          
          -- Rate limiting configuration
          rate_limit_config JSONB DEFAULT '{}',
          
          -- Provider-specific metadata
          metadata JSONB DEFAULT '{}',
          
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for provider_configurations
    await db.query('CREATE INDEX IF NOT EXISTS idx_provider_configs_name ON provider_configurations(provider_name)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_provider_configs_active ON provider_configurations(is_active)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_provider_configs_chain ON provider_configurations(chain_type)');

    // Create provider_execution_metrics table
    console.log('📊 Creating provider_execution_metrics table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS provider_execution_metrics (
          id BIGSERIAL PRIMARY KEY,
          trade_id UUID,
          provider_name VARCHAR(50) NOT NULL,
          asset_symbol VARCHAR(20),
          
          -- Execution metrics
          execution_latency_ms INTEGER,
          predicted_slippage_pct DECIMAL(10, 8),
          actual_slippage_pct DECIMAL(10, 8),
          fee_usd DECIMAL(18, 8),
          total_cost_usd DECIMAL(18, 8),
          
          -- Execution context
          order_size_usd DECIMAL(18, 8),
          order_type VARCHAR(20),
          was_failover BOOLEAN DEFAULT FALSE,
          routing_score DECIMAL(5, 4),
          
          -- Success tracking
          execution_successful BOOLEAN,
          error_type VARCHAR(50),
          error_message TEXT,
          
          created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for execution metrics
    await db.query('CREATE INDEX IF NOT EXISTS idx_execution_metrics_provider ON provider_execution_metrics(provider_name)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_execution_metrics_asset ON provider_execution_metrics(asset_symbol)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_execution_metrics_created_at ON provider_execution_metrics(created_at)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_execution_metrics_success ON provider_execution_metrics(execution_successful)');

    // Create shadow_mode_logs table for testing and validation
    console.log('👤 Creating shadow_mode_logs table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS shadow_mode_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          log_id VARCHAR(100) UNIQUE NOT NULL,
          
          -- Original execution details
          actual_provider VARCHAR(50) NOT NULL,
          actual_cost_usd DECIMAL(18, 8),
          actual_latency_ms INTEGER,
          actual_success BOOLEAN,
          
          -- Order details
          asset_symbol VARCHAR(20) NOT NULL,
          order_type VARCHAR(20),
          order_size_usd DECIMAL(18, 8),
          order_side VARCHAR(10),
          
          -- Shadow execution results (stored as JSON for flexibility)
          shadow_executions JSONB NOT NULL DEFAULT '[]',
          
          -- Analysis results
          best_alternative VARCHAR(50),
          potential_savings_usd DECIMAL(18, 8) DEFAULT 0,
          potential_savings_pct DECIMAL(8, 4) DEFAULT 0,
          recommendation_confidence DECIMAL(5, 4) DEFAULT 0,
          risk_assessment VARCHAR(20) DEFAULT 'low',
          
          -- Metadata
          session_id VARCHAR(100),
          user_agent TEXT,
          strategy_context VARCHAR(100),
          
          created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for shadow mode logs
    await db.query('CREATE INDEX IF NOT EXISTS idx_shadow_logs_provider ON shadow_mode_logs(actual_provider)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_shadow_logs_asset ON shadow_mode_logs(asset_symbol)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_shadow_logs_created_at ON shadow_mode_logs(created_at)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_shadow_logs_savings ON shadow_mode_logs(potential_savings_usd)');

    // Insert default provider configurations
    console.log('📝 Inserting default provider configurations...');
    
    // Strike Finance configuration
    await db.query(`
      INSERT INTO provider_configurations (
        provider_name, display_name, is_active, chain_type, base_api_url,
        min_position_size_usd, max_position_size_usd,
        fee_structure, limits_and_features, rate_limit_config
      ) VALUES (
        'strike', 'Strike Finance', true, 'cardano',
        'https://friendly-reprieve-production.up.railway.app',
        40, 100000,
        '{"makerRate": 0.001, "takerRate": 0.002, "withdrawalFee": 2}',
        '{"maxLeverage": 10, "supportsStopLoss": true, "supportsTakeProfit": true}',
        '{"requestsPerSecond": 5, "requestsPerMinute": 100, "burstLimit": 10}'
      ) ON CONFLICT (provider_name) DO NOTHING
    `);

    // Hyperliquid configuration (disabled by default)
    await db.query(`
      INSERT INTO provider_configurations (
        provider_name, display_name, is_active, chain_type, base_api_url,
        min_position_size_usd, max_position_size_usd,
        fee_structure, limits_and_features, rate_limit_config
      ) VALUES (
        'hyperliquid', 'Hyperliquid', false, 'evm',
        'https://api.hyperliquid.xyz',
        10, 1000000,
        '{"makerRate": 0.0002, "takerRate": 0.0005, "withdrawalFee": 0}',
        '{"maxLeverage": 20, "supportsStopLoss": true, "supportsTakeProfit": true, "supportsTrailingStop": true}',
        '{"requestsPerSecond": 20, "requestsPerMinute": 1000, "burstLimit": 50}'
      ) ON CONFLICT (provider_name) DO NOTHING
    `);

    // Mock provider configuration (development only)
    await db.query(`
      INSERT INTO provider_configurations (
        provider_name, display_name, is_active, chain_type, base_api_url,
        min_position_size_usd, max_position_size_usd,
        fee_structure, limits_and_features, rate_limit_config
      ) VALUES (
        'mock', 'Mock Provider (Testing)', false, 'evm',
        'mock://localhost',
        1, 10000,
        '{"makerRate": 0.001, "takerRate": 0.002, "withdrawalFee": 0}',
        '{"maxLeverage": 10, "supportsStopLoss": true, "supportsTakeProfit": true, "supportsTrailingStop": true}',
        '{"requestsPerSecond": 100, "requestsPerMinute": 5000, "burstLimit": 200}'
      ) ON CONFLICT (provider_name) DO NOTHING
    `);

    // Create updated view that includes provider information
    console.log('👁️ Updating reporting views with provider data...');
    await db.query(`
      CREATE OR REPLACE VIEW agent_position_summary AS
      SELECT 
          ap.id,
          ap.agent_wallet_address,
          ap.provider,
          ap.position_type,
          ap.collateral_ada,
          ap.leverage,
          ap.entry_price_usd,
          ap.current_price_usd,
          ap.current_pnl_ada,
          ap.status,
          ap.opened_at,
          ap.closed_at,
          ap.strategy,
          
          -- Provider details
          pc.display_name as provider_display_name,
          pc.chain_type as provider_chain_type,
          
          -- Risk metrics
          CASE 
              WHEN ap.current_price_usd > 0 AND ap.liquidation_price_usd > 0 THEN
                  ABS(ap.current_price_usd - ap.liquidation_price_usd) / ap.current_price_usd
              ELSE NULL
          END as liquidation_distance_pct
          
      FROM agent_positions ap
      LEFT JOIN provider_configurations pc ON ap.provider = pc.provider_name
    `);

    // Add trigger for updating timestamps
    await db.query(`
      CREATE OR REPLACE FUNCTION update_provider_configs_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await db.query(`
      DROP TRIGGER IF EXISTS update_provider_configurations_updated_at ON provider_configurations
    `);

    await db.query(`
      CREATE TRIGGER update_provider_configurations_updated_at 
          BEFORE UPDATE ON provider_configurations 
          FOR EACH ROW 
          EXECUTE FUNCTION update_provider_configs_updated_at()
    `);

    // Add table comments
    await db.query(`COMMENT ON TABLE provider_configurations IS 'Configuration and metadata for trading providers'`);
    await db.query(`COMMENT ON TABLE provider_execution_metrics IS 'Performance metrics and execution data for each provider'`);
    await db.query(`COMMENT ON TABLE shadow_mode_logs IS 'Shadow mode testing logs for validation and cost comparison'`);

    console.log('✅ Multi-Provider migration completed successfully!');

    // Display summary
    const newTables = await db.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('provider_configurations', 'provider_execution_metrics', 'shadow_mode_logs')
      ORDER BY table_name
    `);

    console.log('📊 Multi-Provider Migration Summary:');
    console.log('  ✅ agent_positions: Added provider column');
    newTables.rows.forEach(table => {
      console.log(`  ✅ ${table.table_name}: ${table.column_count} columns`);
    });

    // Check that provider column was added successfully
    const positionsColumns = await db.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'agent_positions' 
      AND column_name = 'provider'
    `);

    if (positionsColumns.rows.length > 0) {
      console.log(`  ✅ agent_positions.provider: ${positionsColumns.rows[0].data_type} (default: ${positionsColumns.rows[0].column_default})`);
    }

  } catch (error) {
    console.error('❌ Multi-Provider migration failed:', error);
    throw error;
  }
}