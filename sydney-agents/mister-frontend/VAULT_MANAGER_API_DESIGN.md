# VAULT MANAGER API DESIGN

**AI Agent Capital Allocation & Management System**

## 🎯 Overview

The Vault Manager is the central service that coordinates between the proven Cardano vault system and AI trading agents. It provides controlled capital allocation, risk management, and performance tracking for autonomous trading operations.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Agents     │◄──►│  Vault Manager   │◄──►│ Cardano Service │
│ (ADA Trading)   │    │   (Capital       │    │ (Lock/Unlock)   │  
│                 │    │   Allocation)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Agent Wallets   │    │   PostgreSQL     │    │ Cardano Vault   │
│ (ADA Holdings)  │    │ (Allocations,    │    │ (ADA Locked)    │
│                 │    │  Performance)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Core Data Flow (ADA-Only Trading)

1. **Capital Request**: Agent requests ADA trading capital
2. **Risk Check**: System validates against limits
3. **ADA Unlock**: Unlock specified ADA from vault
4. **Agent Wallet**: Transfer ADA to agent's managed wallet
5. **ADA Trading**: Agent trades directly with ADA
6. **Performance Tracking**: Monitor ADA P&L in real-time
7. **Settlement**: Return ADA profits/losses to vault

## 🔌 API Endpoints

### Agent Management
```http
GET    /api/v1/agents                    # List all agents
POST   /api/v1/agents                    # Register new agent  
GET    /api/v1/agents/{id}               # Get agent details
PUT    /api/v1/agents/{id}/limits        # Update risk limits
DELETE /api/v1/agents/{id}               # Deactivate agent
```

### Capital Allocation
```http
POST   /api/v1/agents/{id}/capital/request    # Request trading capital
POST   /api/v1/agents/{id}/capital/return     # Return capital + P&L
GET    /api/v1/agents/{id}/allocations        # Current allocations
GET    /api/v1/agents/{id}/allocations/{id}   # Specific allocation
```

### Performance & Monitoring  
```http
GET    /api/v1/agents/{id}/performance        # Agent performance metrics
GET    /api/v1/vault/overview                 # Vault status overview
GET    /api/v1/system/health                  # System health check
```

### Risk Management
```http
POST   /api/v1/emergency/recall-all           # Emergency stop all trading
POST   /api/v1/agents/{id}/emergency/recall   # Recall specific agent
GET    /api/v1/risk/exposure                  # Current risk exposure
```

## 📋 Request/Response Examples

### Capital Request
```json
POST /api/v1/agents/fibonacci-1/capital/request
{
  "amount_ada": 10,
  "strategy": "fibonacci_retracements", 
  "max_duration_hours": 24,
  "reason": "ADA showing strong fibonacci support, expecting breakout",
  "risk_level": "medium"
}

Response:
{
  "success": true,
  "allocation_id": "alloc_abc123",
  "amount_allocated_ada": 10,
  "agent_wallet_address": "addr1qx...",
  "vault_unlock_tx": "abc123...",
  "expires_at": "2025-01-08T19:30:00Z",
  "risk_limits": {
    "max_drawdown_pct": 5,
    "max_position_size_ada": 3
  }
}
```

### Capital Return  
```json
POST /api/v1/agents/fibonacci-1/capital/return
{
  "allocation_id": "alloc_abc123",
  "return_amount_ada": 11.5,
  "pnl_ada": 1.5,
  "trades_executed": 3,
  "strategy_summary": {
    "entry_signals": 2,
    "exit_signals": 2, 
    "avg_hold_time_hours": 4.5,
    "win_rate": 0.67
  }
}

Response:
{
  "success": true,
  "pnl_ada": 1.5,
  "vault_deposit_tx": "def456...",
  "performance_score_delta": +0.05,
  "next_allocation_limit_ada": 12
}
```

## 🛡️ Risk Management System

### Per-Agent Limits
```json
{
  "agent_id": "fibonacci-1",
  "limits": {
    "max_allocation_ada": 50,
    "max_allocation_pct_of_vault": 5.0,
    "max_drawdown_pct": 10.0,
    "max_concurrent_allocations": 3,
    "max_position_size_ada": 15,
    "min_time_between_requests_hours": 1
  }
}
```

### System-Wide Limits
```json
{
  "vault_limits": {
    "max_total_allocated_pct": 80.0,
    "emergency_reserve_pct": 20.0,
    "max_ada_unlock_per_hour": 100,
    "max_concurrent_agents": 10
  }
}
```

## 📈 Performance Tracking

### Real-time Metrics
- Individual agent P&L in ADA (hourly, daily, weekly)
- Vault utilization percentage  
- Transaction costs (Cardano network fees)
- Average allocation duration
- Success rate by strategy type
- Risk-adjusted returns (Sharpe ratio)

### Automated Actions
- **Performance-based scaling**: Successful agents get increased limits
- **Drawdown protection**: Auto-recall if losses exceed threshold
- **Timeout protection**: Force-close allocations after max duration
- **Market volatility response**: Reduce limits during high volatility

## 🚀 Implementation Plan

### Phase 1: Core Infrastructure
- [ ] Vault Manager Express server setup
- [ ] PostgreSQL database schema
- [ ] Basic agent registration & authentication
- [ ] Integration with existing Cardano service

### Phase 2: Capital Allocation
- [ ] Capital request/return flow
- [ ] Agent wallet creation and management
- [ ] ADA transfer between vault and agent wallets
- [ ] Basic risk limits enforcement

### Phase 3: Advanced Features  
- [ ] Real-time performance tracking
- [ ] Automated risk management
- [ ] Multi-strategy portfolio optimization
- [ ] Discord notifications for major events

### Phase 4: Production Hardening
- [ ] Comprehensive monitoring & alerting
- [ ] Disaster recovery procedures
- [ ] Load testing & performance optimization
- [ ] Security audit & penetration testing

## 🔧 Technical Requirements

### Dependencies
- **Node.js** 18+ with TypeScript
- **PostgreSQL** 15+ for data persistence
- **Redis** for caching and rate limiting  
- **Express.js** for REST API
- **WebSocket** for real-time updates
- **Bull Queue** for background job processing

### External Integrations
- **Cardano Service** (existing working vault)
- **Agent Wallet Management** (individual ADA wallets per agent)
- **Cardano Network** (transaction monitoring)
- **Discord API** (notifications)
- **Monitoring** (Prometheus/Grafana)

This design provides the foundation for institutional-grade AI agent capital management built on the proven Cardano vault system! 🎉