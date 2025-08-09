-- MRSTRIKE Agent Wallet Database Schema
-- Create tables for agent wallet management system
-- Compatible with PostgreSQL/Supabase

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agent wallets table (core wallet storage)
CREATE TABLE IF NOT EXISTS agent_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL, -- User identifier (can be wallet address, email, etc.)
    agent_id VARCHAR(255) UNIQUE NOT NULL, -- Unique agent identifier
    
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
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_wallets_user_id ON agent_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_wallets_agent_id ON agent_wallets(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_wallets_address ON agent_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_agent_wallets_status ON agent_wallets(status);

-- Vault-Agent capital allocations table
CREATE TABLE IF NOT EXISTS vault_agent_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_vault_address TEXT NOT NULL, -- User's vault address
    agent_wallet_address TEXT NOT NULL REFERENCES agent_wallets(wallet_address) ON DELETE CASCADE,
    
    -- Allocation details
    amount_lovelace BIGINT NOT NULL CHECK (amount_lovelace > 0),
    amount_ada DECIMAL(20,6) GENERATED ALWAYS AS (amount_lovelace / 1000000.0) STORED,
    purpose VARCHAR(255) NOT NULL, -- Why this allocation was made
    
    -- Transaction tracking
    allocation_tx_hash TEXT, -- Transaction hash for vault -> agent transfer
    allocation_tx_confirmed BOOLEAN DEFAULT FALSE,
    return_tx_hash TEXT NULL, -- Transaction hash for agent -> vault return
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
);

-- Indexes for allocations
CREATE INDEX IF NOT EXISTS idx_allocations_user_vault ON vault_agent_allocations(user_vault_address);
CREATE INDEX IF NOT EXISTS idx_allocations_agent_wallet ON vault_agent_allocations(agent_wallet_address);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON vault_agent_allocations(status);
CREATE INDEX IF NOT EXISTS idx_allocations_allocated_at ON vault_agent_allocations(allocated_at);

-- Agent positions table (for Strike Finance positions)
CREATE TABLE IF NOT EXISTS agent_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_wallet_address TEXT NOT NULL REFERENCES agent_wallets(wallet_address) ON DELETE CASCADE,
    allocation_id UUID REFERENCES vault_agent_allocations(id) ON DELETE SET NULL,
    
    -- Strike Finance details
    strike_position_id TEXT, -- Strike Finance position ID
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
    
    -- P&L tracking (updated in real-time)
    current_price_usd DECIMAL(10,4) DEFAULT 0,
    current_pnl_lovelace BIGINT DEFAULT 0,
    current_pnl_ada DECIMAL(20,6) GENERATED ALWAYS AS (current_pnl_lovelace / 1000000.0) STORED,
    realized_pnl_lovelace BIGINT NULL,
    realized_pnl_ada DECIMAL(20,6) GENERATED ALWAYS AS (realized_pnl_lovelace / 1000000.0) STORED,
    
    -- Strike Finance transaction references
    open_tx_hash TEXT, -- Opening transaction hash
    close_tx_hash TEXT, -- Closing transaction hash
    
    -- Additional metadata
    strategy VARCHAR(100), -- Trading strategy used
    confidence_score DECIMAL(3,2), -- AI confidence (0.00-1.00)
    created_by VARCHAR(100) DEFAULT 'agent' -- 'agent', 'manual', etc.
);

-- Indexes for positions
CREATE INDEX IF NOT EXISTS idx_positions_agent_wallet ON agent_positions(agent_wallet_address);
CREATE INDEX IF NOT EXISTS idx_positions_allocation ON agent_positions(allocation_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON agent_positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_opened_at ON agent_positions(opened_at);
CREATE INDEX IF NOT EXISTS idx_positions_strike_id ON agent_positions(strike_position_id);

-- Agent wallet transactions table (for audit trail)
CREATE TABLE IF NOT EXISTS agent_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_wallet_address TEXT NOT NULL REFERENCES agent_wallets(wallet_address) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'allocation_received', 'allocation_returned', 'trading_fee', 'network_fee',
        'strike_deposit', 'strike_withdrawal', 'pnl_settlement', 'other'
    )),
    amount_lovelace BIGINT NOT NULL, -- Can be negative for outgoing
    amount_ada DECIMAL(20,6) GENERATED ALWAYS AS (amount_lovelace / 1000000.0) STORED,
    
    -- Reference information
    tx_hash TEXT, -- Cardano transaction hash
    related_allocation_id UUID REFERENCES vault_agent_allocations(id),
    related_position_id UUID REFERENCES agent_positions(id),
    
    -- Additional context
    description TEXT,
    metadata JSONB, -- Additional structured data
    
    -- Timing
    occurred_at TIMESTAMP DEFAULT NOW(),
    block_height BIGINT,
    confirmation_count INTEGER DEFAULT 0
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_agent_wallet ON agent_wallet_transactions(agent_wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON agent_wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON agent_wallet_transactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON agent_wallet_transactions(tx_hash);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to agent_wallets
DROP TRIGGER IF EXISTS update_agent_wallets_updated_at ON agent_wallets;
CREATE TRIGGER update_agent_wallets_updated_at 
    BEFORE UPDATE ON agent_wallets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create helpful views for reporting
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
GROUP BY aw.id, aw.user_id, aw.agent_id, aw.wallet_address, aw.current_balance_ada, aw.status, aw.created_at;

-- Create user summary view
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
GROUP BY user_id;

-- Insert sample data (for testing)
-- Note: This would not be used in production
/*
INSERT INTO agent_wallets (user_id, agent_id, wallet_address, private_key_encrypted, encryption_key_hash, mnemonic_encrypted) VALUES
('test_user_1', 'momentum_agent_1', 'addr1test123...', '{"encrypted": "sample"}', 'hash123', '{"encrypted": "sample_mnemonic"}'),
('test_user_2', 'conservative_agent_1', 'addr1test456...', '{"encrypted": "sample2"}', 'hash456', '{"encrypted": "sample_mnemonic2"}');
*/

-- Create database permissions (for production)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mrstrike_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mrstrike_app;

COMMENT ON TABLE agent_wallets IS 'Core agent wallet storage with encrypted credentials';
COMMENT ON TABLE vault_agent_allocations IS 'Capital allocations from user vaults to agent wallets';
COMMENT ON TABLE agent_positions IS 'Strike Finance trading positions opened by agents';
COMMENT ON TABLE agent_wallet_transactions IS 'Audit trail of all agent wallet transactions';

COMMENT ON VIEW agent_wallet_summary IS 'Comprehensive summary of agent wallet status and performance';
COMMENT ON VIEW user_agent_summary IS 'User-level summary of agent wallet usage';

-- Display table creation summary
SELECT 
    'agent_wallets' as table_name, 
    COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'agent_wallets'
UNION ALL
SELECT 
    'vault_agent_allocations' as table_name, 
    COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'vault_agent_allocations'
UNION ALL
SELECT 
    'agent_positions' as table_name, 
    COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'agent_positions'
UNION ALL
SELECT 
    'agent_wallet_transactions' as table_name, 
    COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'agent_wallet_transactions';