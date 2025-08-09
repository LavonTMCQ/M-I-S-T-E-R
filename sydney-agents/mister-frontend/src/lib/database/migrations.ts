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