# 🏦 Agent Vault V2 Architecture - 2x Leverage Trading

## 🎯 **Core Requirements**
- **User Deposits**: Secure ADA deposits with individual balance tracking
- **2x Leverage Trading**: Automated trading with Strike Finance at 2x leverage only
- **Agent Authorization**: Cryptographic verification of agent trading permissions
- **User Control**: Users can withdraw funds and stop trading anytime
- **Safety Limits**: Maximum trade amounts and emergency controls

## 🏗️ **Smart Contract Architecture**

### **1. Datum Structure**
```aiken
// Vault state stored on-chain
type VaultDatum {
  owner: ByteArray,           // User's verification key hash (28 bytes)
  agent_authorized: Bool,     // Whether agent trading is enabled
  total_deposited: Int,       // Total ADA deposited (lovelace)
  available_balance: Int,     // Available for trading (lovelace)
  max_trade_amount: Int,      // Maximum single trade (lovelace)
  leverage_limit: Int,        // Maximum leverage (2 for 2x)
  emergency_stop: Bool,       // Emergency trading halt
  created_at: Int,           // Creation timestamp
  last_trade_at: Int,        // Last trading activity
  trade_count: Int           // Number of trades executed
}
```

### **2. Redeemer Operations**
```aiken
// Operations that can be performed on vault
type VaultRedeemer {
  UserDeposit { amount: Int }
  UserWithdraw { amount: Int }
  AgentTrade { 
    amount: Int,
    leverage: Int,
    position: ByteArray,      // "Long" or "Short"
    strike_cbor: ByteArray    // Strike Finance transaction CBOR
  }
  EmergencyStop
  UpdateSettings { 
    max_trade_amount: Int,
    leverage_limit: Int 
  }
}
```

### **3. Validation Logic**

#### **User Operations**
- **Deposit**: Always allowed, updates balance
- **Withdraw**: Requires user signature, checks available balance
- **Emergency Stop**: User can halt all trading immediately
- **Settings Update**: User can modify trading parameters

#### **Agent Operations**
- **Trade Execution**: Requires agent signature + validation:
  - Amount ≤ max_trade_amount
  - Leverage ≤ leverage_limit (2x max)
  - Available balance ≥ amount + fees
  - Strike Finance CBOR validation
  - Emergency stop not active

## 🔐 **Security Model**

### **Multi-Signature Validation**
```aiken
fn validate_signatures(context: ScriptContext, datum: VaultDatum, redeemer: VaultRedeemer) -> Bool {
  when redeemer is {
    UserDeposit(_) | UserWithdraw(_) | EmergencyStop | UpdateSettings(_) -> {
      // User operations require user signature
      must_be_signed_by(context.transaction, datum.owner)
    }
    AgentTrade(_) -> {
      // Agent operations require agent signature
      must_be_signed_by(context.transaction, agent_vkh) &&
      datum.agent_authorized &&
      !datum.emergency_stop
    }
  }
}
```

### **Balance Management**
```aiken
fn validate_balance_changes(inputs: List<TxOut>, outputs: List<TxOut>, redeemer: VaultRedeemer) -> Bool {
  let input_ada = get_vault_ada_amount(inputs)
  let output_ada = get_vault_ada_amount(outputs)
  
  when redeemer is {
    UserDeposit(amount) -> {
      // Deposit increases vault balance
      output_ada == input_ada + amount
    }
    UserWithdraw(amount) -> {
      // Withdrawal decreases vault balance
      output_ada == input_ada - amount &&
      amount <= get_available_balance(inputs)
    }
    AgentTrade(amount, _, _, _) -> {
      // Trading moves funds to Strike Finance
      validate_strike_finance_output(outputs, amount)
    }
    _ -> True
  }
}
```

## 🎯 **Strike Finance Integration**

### **2x Leverage Enforcement**
```aiken
fn validate_agent_trade(trade: AgentTrade, datum: VaultDatum, context: ScriptContext) -> Bool {
  // Enforce 2x leverage limit
  trade.leverage <= 2 &&
  trade.leverage <= datum.leverage_limit &&
  
  // Enforce amount limits
  trade.amount >= min_strike_trade &&  // 40 ADA minimum
  trade.amount <= datum.max_trade_amount &&
  trade.amount <= datum.available_balance &&
  
  // Validate Strike Finance transaction
  validate_strike_cbor(trade.strike_cbor, trade.amount, trade.leverage, trade.position) &&
  
  // Ensure proper output to Strike Finance contract
  has_output_to_strike_contract(context.transaction.outputs, trade.amount)
}
```

### **Strike Finance CBOR Validation**
```aiken
fn validate_strike_cbor(cbor: ByteArray, amount: Int, leverage: Int, position: ByteArray) -> Bool {
  // Parse Strike Finance CBOR to verify:
  // 1. Correct collateral amount
  // 2. Correct leverage setting
  // 3. Valid position type (Long/Short)
  // 4. Proper Strike Finance contract address
  
  let parsed = parse_strike_cbor(cbor)
  parsed.collateral_amount == amount &&
  parsed.leverage == leverage &&
  parsed.position == position &&
  parsed.contract_address == strike_contract_hash
}
```

## 🛡️ **Safety Controls**

### **Emergency Mechanisms**
1. **User Emergency Stop**: Immediate halt of all trading
2. **Maximum Trade Limits**: Per-trade and daily limits
3. **Balance Validation**: Prevent overdraft and unauthorized access
4. **Time Locks**: Optional cooling-off periods for large withdrawals

### **Risk Management**
1. **2x Leverage Cap**: Hard-coded maximum leverage
2. **Minimum Balance**: Ensure sufficient funds for Strike Finance
3. **Fee Reserves**: Account for transaction and trading fees
4. **Position Tracking**: Monitor open positions and exposure

## 📊 **Implementation Phases**

### **Phase 1: Core Contract** (Current Task)
- Basic vault with deposit/withdraw
- User signature validation
- Simple balance tracking

### **Phase 2: Agent Integration**
- Agent signature validation
- Basic trading functionality
- Strike Finance integration

### **Phase 3: Advanced Features**
- 2x leverage enforcement
- CBOR validation
- Emergency controls

### **Phase 4: Production Hardening**
- Comprehensive testing
- Security audits
- Performance optimization

## 🔧 **Technical Specifications**

### **Constants**
```aiken
const agent_vkh: ByteArray = #"34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d"
const strike_contract: ByteArray = #"be7544ca7d42c903268caecae465f3f8b5a7e7607d09165e471ac8b5"
const min_strike_trade: Int = 40_000_000  // 40 ADA in lovelace
const max_leverage: Int = 2               // 2x leverage maximum
const min_vault_balance: Int = 5_000_000  // 5 ADA minimum
```

### **Error Codes**
- `E001`: Insufficient balance
- `E002`: Unauthorized signature
- `E003`: Leverage limit exceeded
- `E004`: Emergency stop active
- `E005`: Invalid Strike Finance CBOR
- `E006`: Amount below minimum
- `E007`: Invalid vault datum

This architecture provides a secure, user-controlled vault system with proper 2x leverage enforcement and Strike Finance integration.
