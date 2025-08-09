-- =====================================================
-- VAULT MANAGER DATABASE SCHEMA
-- Multi-Agent Capital Management for Cardano Vault
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- VAULT MANAGEMENT
-- =====================================================

-- Main vault information
CREATE TABLE vaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    script_address TEXT NOT NULL UNIQUE,
    script_hash TEXT NOT NULL UNIQUE,
    network VARCHAR(20) NOT NULL DEFAULT 'mainnet',
    total_ada_locked DECIMAL(20,6) NOT NULL DEFAULT 0,
    available_ada DECIMAL(20,6) NOT NULL DEFAULT 0,
    allocated_ada DECIMAL(20,6) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vault transaction history
CREATE TABLE vault_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES vaults(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'lock', 'unlock', 'allocation', 'return'
    amount_ada DECIMAL(20,6) NOT NULL,
    cardano_tx_hash TEXT,
    from_address TEXT,
    to_address TEXT,
    agent_id UUID NULL, -- NULL for direct vault ops, set for agent allocations
    allocation_id UUID NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
    block_height BIGINT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE NULL
);

-- =====================================================
-- AGENT MANAGEMENT
-- =====================================================

-- AI Trading Agents
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    strategy_type VARCHAR(100) NOT NULL, -- 'fibonacci', 'momentum', 'dca', etc.
    wallet_address TEXT NOT NULL UNIQUE,
    wallet_seed_encrypted TEXT NOT NULL, -- Encrypted mnemonic
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    performance_score DECIMAL(5,3) NOT NULL DEFAULT 0.000,
    total_allocations INTEGER DEFAULT 0,
    total_pnl_ada DECIMAL(20,6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent risk limits and configuration
CREATE TABLE agent_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    max_allocation_ada DECIMAL(20,6) NOT NULL,
    max_allocation_pct_of_vault DECIMAL(5,2) NOT NULL,
    max_drawdown_pct DECIMAL(5,2) NOT NULL,
    max_concurrent_allocations INTEGER NOT NULL DEFAULT 1,
    max_position_size_ada DECIMAL(20,6) NOT NULL,
    min_time_between_requests_hours INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id)
);

-- =====================================================
-- CAPITAL ALLOCATION
-- =====================================================

-- Active capital allocations to agents
CREATE TABLE agent_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    vault_id UUID NOT NULL REFERENCES vaults(id),
    amount_allocated_ada DECIMAL(20,6) NOT NULL,
    unlock_tx_hash TEXT NOT NULL,
    strategy VARCHAR(100) NOT NULL,
    reason TEXT,
    risk_level VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'returned', 'expired', 'recalled'
    
    -- Time management
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    returned_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Performance tracking
    current_balance_ada DECIMAL(20,6) NULL,
    pnl_ada DECIMAL(20,6) DEFAULT 0,
    max_drawdown_pct DECIMAL(5,2) DEFAULT 0,
    trades_executed INTEGER DEFAULT 0,
    
    -- Return information
    return_tx_hash TEXT NULL,
    return_amount_ada DECIMAL(20,6) NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent trading performance history
CREATE TABLE agent_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    allocation_id UUID NOT NULL REFERENCES agent_allocations(id),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'allocation'
    
    -- Financial metrics
    starting_ada DECIMAL(20,6) NOT NULL,
    ending_ada DECIMAL(20,6) NOT NULL,
    pnl_ada DECIMAL(20,6) NOT NULL,
    pnl_pct DECIMAL(8,4) NOT NULL,
    
    -- Trading metrics  
    trades_count INTEGER NOT NULL DEFAULT 0,
    winning_trades INTEGER NOT NULL DEFAULT 0,
    losing_trades INTEGER NOT NULL DEFAULT 0,
    win_rate DECIMAL(5,3) NOT NULL DEFAULT 0,
    avg_trade_duration_hours DECIMAL(8,2) NULL,
    max_drawdown_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    
    -- Risk metrics
    sharpe_ratio DECIMAL(8,4) NULL,
    volatility DECIMAL(8,4) NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual trade records
CREATE TABLE agent_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    allocation_id UUID NOT NULL REFERENCES agent_allocations(id),
    
    -- Trade details
    symbol VARCHAR(20) NOT NULL, -- 'ADA/USD', 'ADA/BTC', etc.
    side VARCHAR(10) NOT NULL, -- 'buy', 'sell'
    quantity_ada DECIMAL(20,6) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    total_value_ada DECIMAL(20,6) NOT NULL,
    
    -- Trade lifecycle
    signal_type VARCHAR(50), -- 'fibonacci_support', 'momentum_breakout', etc.
    entry_reason TEXT,
    exit_reason TEXT,
    
    -- Execution details
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cardano_tx_hash TEXT NULL,
    fees_ada DECIMAL(20,6) DEFAULT 0,
    
    -- P&L calculation
    pnl_ada DECIMAL(20,6) NULL,
    pnl_pct DECIMAL(8,4) NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- RISK MANAGEMENT & MONITORING
-- =====================================================

-- Risk events and alerts
CREATE TABLE risk_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NULL REFERENCES agents(id),
    allocation_id UUID NULL REFERENCES agent_allocations(id),
    event_type VARCHAR(50) NOT NULL, -- 'drawdown_limit', 'allocation_timeout', 'emergency_recall'
    severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
    description TEXT NOT NULL,
    action_taken TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System configuration and settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Vault transactions
CREATE INDEX idx_vault_transactions_vault_id ON vault_transactions(vault_id);
CREATE INDEX idx_vault_transactions_type ON vault_transactions(transaction_type);
CREATE INDEX idx_vault_transactions_status ON vault_transactions(status);
CREATE INDEX idx_vault_transactions_created_at ON vault_transactions(created_at);

-- Agent allocations  
CREATE INDEX idx_agent_allocations_agent_id ON agent_allocations(agent_id);
CREATE INDEX idx_agent_allocations_status ON agent_allocations(status);
CREATE INDEX idx_agent_allocations_expires_at ON agent_allocations(expires_at);
CREATE INDEX idx_agent_allocations_allocated_at ON agent_allocations(allocated_at);

-- Performance tracking
CREATE INDEX idx_agent_performance_agent_id ON agent_performance(agent_id);
CREATE INDEX idx_agent_performance_period ON agent_performance(period_type, period_start, period_end);

-- Agent trades
CREATE INDEX idx_agent_trades_agent_id ON agent_trades(agent_id);
CREATE INDEX idx_agent_trades_allocation_id ON agent_trades(allocation_id);
CREATE INDEX idx_agent_trades_executed_at ON agent_trades(executed_at);

-- Risk events
CREATE INDEX idx_risk_events_agent_id ON risk_events(agent_id);
CREATE INDEX idx_risk_events_resolved ON risk_events(resolved);
CREATE INDEX idx_risk_events_created_at ON risk_events(created_at);

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- Current vault status summary
CREATE VIEW vault_status AS
SELECT 
    v.id,
    v.name,
    v.script_address,
    v.total_ada_locked,
    v.available_ada,
    v.allocated_ada,
    COALESCE(active_agents.count, 0) as active_agents,
    COALESCE(active_allocations.count, 0) as active_allocations,
    ROUND((v.allocated_ada / NULLIF(v.total_ada_locked, 0)) * 100, 2) as utilization_pct
FROM vaults v
LEFT JOIN (
    SELECT vault_id, COUNT(*) as count 
    FROM agent_allocations 
    WHERE status = 'active' 
    GROUP BY vault_id
) active_allocations ON v.id = active_allocations.vault_id
LEFT JOIN (
    SELECT COUNT(DISTINCT agent_id) as count
    FROM agent_allocations aa
    WHERE aa.status = 'active'
) active_agents ON true;

-- Agent performance summary
CREATE VIEW agent_performance_summary AS
SELECT 
    a.id,
    a.name,
    a.strategy_type,
    a.status,
    a.performance_score,
    a.total_pnl_ada,
    COALESCE(recent_perf.pnl_30d, 0) as pnl_30d_ada,
    COALESCE(recent_perf.trades_30d, 0) as trades_30d,
    COALESCE(recent_perf.win_rate_30d, 0) as win_rate_30d,
    COALESCE(active_alloc.active_allocations, 0) as active_allocations,
    COALESCE(active_alloc.allocated_ada, 0) as current_allocated_ada
FROM agents a
LEFT JOIN (
    SELECT 
        agent_id,
        SUM(pnl_ada) as pnl_30d,
        SUM(trades_count) as trades_30d,
        AVG(win_rate) as win_rate_30d
    FROM agent_performance 
    WHERE period_start >= NOW() - INTERVAL '30 days'
    GROUP BY agent_id
) recent_perf ON a.id = recent_perf.agent_id
LEFT JOIN (
    SELECT 
        agent_id,
        COUNT(*) as active_allocations,
        SUM(amount_allocated_ada) as allocated_ada
    FROM agent_allocations
    WHERE status = 'active'
    GROUP BY agent_id
) active_alloc ON a.id = active_alloc.agent_id;

-- =====================================================
-- SAMPLE DATA (for development/testing)
-- =====================================================

-- Insert default vault
INSERT INTO vaults (name, script_address, script_hash, total_ada_locked, available_ada) 
VALUES (
    'Main AI Trading Vault',
    'addr1w9amamp0dl4m0dkf9hmwnzgux36eueptvm5z7fmfedyc2pqhlafmz',
    '7bbeec2f6febb7b6c92df6e9891c34759e642b66e82f2769cb498504',
    6.0,
    6.0
);

-- Insert system settings
INSERT INTO system_settings (key, value, description) VALUES 
('max_total_allocated_pct', '80.0', 'Maximum percentage of vault that can be allocated'),
('emergency_reserve_pct', '20.0', 'Minimum percentage kept as emergency reserve'),
('max_ada_unlock_per_hour', '100', 'Maximum ADA that can be unlocked per hour'),
('max_concurrent_agents', '10', 'Maximum number of concurrent active agents'),
('performance_calculation_interval_minutes', '60', 'How often to calculate performance metrics');

-- =====================================================
-- STORED PROCEDURES (Future Enhancement)
-- =====================================================

-- Function to calculate agent performance score
-- Function to check allocation limits before approval
-- Function to handle emergency recalls
-- Function to update vault balances after transactions

COMMIT;