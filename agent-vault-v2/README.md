# 🏦 Agent Vault V2 - Secure 2x Leverage Trading

A secure smart contract system for automated ADA trading with 2x leverage through Strike Finance integration.

## 🎯 **Key Features**

- **🔒 User Control**: Users maintain full control over their funds
- **⚡ 2x Leverage**: Enforced maximum 2x leverage for risk management
- **🤖 Agent Trading**: Authorized agent can execute trades automatically
- **🛡️ Emergency Stop**: Users can halt all trading instantly
- **💰 Strike Finance**: Direct integration with Strike Finance perpetuals
- **📊 Balance Tracking**: Precise tracking of deposits and available funds

## 🏗️ **Architecture**

### Smart Contract Components

1. **VaultDatum**: On-chain state tracking user deposits and settings
2. **VaultRedeemer**: Operations (deposit, withdraw, trade, emergency stop)
3. **Validation Logic**: Multi-layer security with signature verification
4. **Strike Finance Integration**: Direct CBOR transaction validation

### Security Model

- **User Operations**: Require user signature (deposit, withdraw, emergency stop)
- **Agent Operations**: Require agent signature + authorization checks
- **Balance Protection**: Prevents overdraft and unauthorized access
- **Leverage Limits**: Hard-coded 2x maximum leverage enforcement

## 🚀 **Quick Start**

### Prerequisites

```bash
# Install Aiken
curl -sSfL https://install.aiken-lang.org | bash

# Install Cardano CLI
# Follow instructions at: https://developers.cardano.org/docs/get-started/installing-cardano-cli
```

### Build and Deploy

```bash
# Navigate to project directory
cd agent-vault-v2

# Build the contract
aiken build

# Deploy to mainnet (or testnet)
./deploy.sh
```

### Integration

```typescript
import { AGENT_VAULT_V2_CONFIG } from './deployments/agent-vault-v2-config';

// Create vault transaction
const vaultTx = await createVaultTransaction({
  contractAddress: AGENT_VAULT_V2_CONFIG.contractAddress,
  operation: 'UserDeposit',
  amount: 50_000_000, // 50 ADA
  userVkh: userVerificationKeyHash
});
```

## 📋 **Operations**

### User Operations

#### Deposit ADA
```typescript
const depositRedeemer = {
  type: 'UserDeposit',
  amount: 50_000_000 // 50 ADA in lovelace
};
```

#### Withdraw ADA
```typescript
const withdrawRedeemer = {
  type: 'UserWithdraw',
  amount: 25_000_000 // 25 ADA in lovelace
};
```

#### Emergency Stop
```typescript
const emergencyRedeemer = {
  type: 'EmergencyStop'
};
```

### Agent Operations

#### Execute Trade
```typescript
const tradeRedeemer = {
  type: 'AgentTrade',
  amount: 40_000_000,    // 40 ADA (Strike Finance minimum)
  leverage: 2,           // 2x leverage
  position: 'Long',      // 'Long' or 'Short'
  strikeCbor: '...'      // Strike Finance transaction CBOR
};
```

## 🔧 **Configuration**

### Contract Constants

```aiken
const agent_vkh: ByteArray = #"34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d"
const strike_contract: ByteArray = #"be7544ca7d42c903268caecae465f3f8b5a7e7607d09165e471ac8b5"
const min_strike_trade: Int = 40_000_000  // 40 ADA minimum
const max_leverage: Int = 2               // 2x leverage maximum
const min_vault_balance: Int = 5_000_000  // 5 ADA minimum
```

### Vault Settings (User Configurable)

- **Max Trade Amount**: Maximum ADA per single trade
- **Leverage Limit**: User can set lower than 2x if desired
- **Agent Authorization**: Enable/disable agent trading
- **Emergency Stop**: Immediate halt of all trading

## 🛡️ **Security Features**

### Multi-Layer Validation

1. **Signature Verification**: User vs agent operations
2. **Balance Checks**: Prevent overdraft and unauthorized access
3. **Leverage Limits**: Hard-coded 2x maximum
4. **Amount Validation**: Minimum/maximum trade amounts
5. **Emergency Controls**: User can stop trading anytime

### Risk Management

- **Conservative Leverage**: 2x maximum (vs industry 10x+)
- **User Control**: Full withdrawal and stop capabilities
- **Balance Tracking**: Precise accounting of all funds
- **Strike Finance Validation**: CBOR transaction verification

## 🧪 **Testing**

### Run Tests

```bash
# Run Aiken tests
aiken test

# Run specific test
aiken test test_user_deposit
```

### Test Coverage

- ✅ User deposit validation
- ✅ User withdrawal validation
- ✅ Agent trade execution
- ✅ Leverage limit enforcement
- ✅ Emergency stop functionality
- ✅ Unauthorized access prevention

## 📊 **Monitoring**

### Vault State Tracking

```typescript
interface VaultDatum {
  owner: string;              // User's verification key hash
  agentAuthorized: boolean;   // Trading enabled/disabled
  totalDeposited: number;     // Total ADA deposited
  availableBalance: number;   // Available for trading
  maxTradeAmount: number;     // Maximum single trade
  leverageLimit: number;      // Maximum leverage (≤2)
  emergencyStop: boolean;     // Emergency halt status
  createdAt: number;         // Creation timestamp
  lastTradeAt: number;       // Last trading activity
  tradeCount: number;        // Number of trades executed
}
```

## 🔗 **Integration Points**

### Strike Finance API

- **Open Position**: 2x leverage long/short positions
- **Close Position**: Automated position management
- **CBOR Validation**: Transaction verification
- **Minimum Amount**: 40 ADA requirement handling

### Frontend Integration

- **Wallet Connection**: Cardano wallet integration
- **Transaction Building**: CBOR transaction construction
- **State Monitoring**: Real-time vault status
- **User Controls**: Deposit, withdraw, emergency stop

## 📈 **Roadmap**

### Phase 1: Core Contract ✅
- Basic vault functionality
- User deposit/withdrawal
- Agent trading framework

### Phase 2: Strike Finance Integration (In Progress)
- CBOR validation implementation
- 2x leverage enforcement
- Position management

### Phase 3: Advanced Features
- Multi-asset support
- Advanced risk management
- Performance optimization

### Phase 4: Production Hardening
- Security audits
- Stress testing
- Documentation completion

## 🆘 **Support**

For issues, questions, or contributions:

1. Check the test suite for examples
2. Review the architecture documentation
3. Test with small amounts first
4. Contact the development team

## ⚠️ **Disclaimer**

This is experimental software. Use at your own risk. Always test with small amounts first. The 2x leverage limit is enforced for risk management, but trading involves inherent risks.
