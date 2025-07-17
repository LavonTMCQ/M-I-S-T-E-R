// agent_vault_tests.ak
//
// Comprehensive test suite for the Strike Finance Agent Vault smart contract
// 
// This file contains unit tests for all validator functions and edge cases
// to ensure the contract behaves correctly under all conditions.
//
// Test Categories:
// 1. Agent Trade Validation Tests
// 2. User Withdrawal Tests  
// 3. Trading Toggle Tests
// 4. Emergency Stop Tests
// 5. Configuration Update Tests
// 6. Security and Edge Case Tests
//
// Version: 1.0
// Date: 2025-01-16

use aiken/transaction.{ScriptContext, Spend, Transaction, ValidityRange, Bound, Finite}
use aiken/transaction/credential.{VerificationKey, Script}
use aiken/list
use agent_vault_strike.{Datum, Redeemer, agent_vault_strike}

//================================================================
//--- Test Data Setup ---
//================================================================

/// Test wallet addresses and keys
const TEST_OWNER_VKH: ByteArray = "owner123456789012345678901234567890123456789012345678901234"
const TEST_AGENT_VKH: ByteArray = "d8b73234d618228999a83852219c831b43983bb1b83130c2a295843b"
const TEST_UNAUTHORIZED_VKH: ByteArray = "unauthorized12345678901234567890123456789012345678901234567890"

/// Test Strike Finance contract addresses
const TEST_STRIKE_CONTRACT_1: ByteArray = "e58541289ab794860a0333a64d1f5843284a772626b9a2b534af914b"
const TEST_STRIKE_CONTRACT_2: ByteArray = "f733a30f3a6081e35a42ea1f66e857738325f05359c82c332213a1a4"
const TEST_INVALID_CONTRACT: ByteArray = "invalid123456789012345678901234567890123456789012345678901234"

/// Test timestamps
const TEST_CREATION_TIME: Int = 1705420800000 // 2025-01-16 12:00:00 UTC
const TEST_CURRENT_TIME: Int = 1705507200000  // 2025-01-17 12:00:00 UTC (24h later)
const TEST_EARLY_TIME: Int = 1705424400000    // 2025-01-16 13:00:00 UTC (1h later)

/// Helper function to create test datum
fn create_test_datum() -> Datum {
  Datum {
    owner: TEST_OWNER_VKH,
    created_at: TEST_CREATION_TIME,
    trading_enabled: True,
    emergency_stop: False,
    max_trade_amount: 50000000000, // 50,000 ADA
    trade_count: 0,
  }
}

/// Helper function to create test transaction context
fn create_test_context(signatories: List<ByteArray>, current_time: Int) -> ScriptContext {
  let validity_range = ValidityRange {
    lower_bound: Bound { bound_type: Finite(current_time - 3600000), is_inclusive: True },
    upper_bound: Bound { bound_type: Finite(current_time), is_inclusive: True }
  }
  
  let transaction = Transaction {
    inputs: [],
    reference_inputs: [],
    outputs: [],
    fee: 200000,
    mint: [],
    certificates: [],
    withdrawals: [],
    validity_range: validity_range,
    extra_signatories: signatories,
    redeemers: [],
    datums: [],
    id: "test_transaction_id"
  }
  
  ScriptContext {
    purpose: Spend("test_output_reference"),
    transaction: transaction
  }
}

//================================================================
//--- Agent Trade Tests ---
//================================================================

test test_agent_trade_success() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000, // 25,000 ADA
    destination_contract: TEST_STRIKE_CONTRACT_1 
  }
  let context = create_test_context([TEST_AGENT_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == True
}

test test_agent_trade_unauthorized_signer() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000,
    destination_contract: TEST_STRIKE_CONTRACT_1 
  }
  let context = create_test_context([TEST_UNAUTHORIZED_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}

test test_agent_trade_invalid_contract() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000,
    destination_contract: TEST_INVALID_CONTRACT 
  }
  let context = create_test_context([TEST_AGENT_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}

test test_agent_trade_amount_too_large() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 75000000000, // 75,000 ADA (exceeds max_trade_amount)
    destination_contract: TEST_STRIKE_CONTRACT_1 
  }
  let context = create_test_context([TEST_AGENT_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}

test test_agent_trade_trading_disabled() {
  let datum = Datum {
    ..create_test_datum(),
    trading_enabled: False
  }
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000,
    destination_contract: TEST_STRIKE_CONTRACT_1 
  }
  let context = create_test_context([TEST_AGENT_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}

test test_agent_trade_emergency_stop() {
  let datum = Datum {
    ..create_test_datum(),
    emergency_stop: True
  }
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000,
    destination_contract: TEST_STRIKE_CONTRACT_1 
  }
  let context = create_test_context([TEST_AGENT_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}

test test_agent_trade_vault_locked() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000,
    destination_contract: TEST_STRIKE_CONTRACT_1 
  }
  let context = create_test_context([TEST_AGENT_VKH], TEST_EARLY_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}

//================================================================
//--- User Withdrawal Tests ---
//================================================================

test test_user_withdraw_success() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserWithdraw { 
    withdrawal_amount: 10000000000 // 10,000 ADA
  }
  let context = create_test_context([TEST_OWNER_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == True
}

test test_user_withdraw_unauthorized() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserWithdraw { 
    withdrawal_amount: 10000000000
  }
  let context = create_test_context([TEST_UNAUTHORIZED_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}

test test_user_withdraw_zero_amount() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserWithdraw { 
    withdrawal_amount: 0
  }
  let context = create_test_context([TEST_OWNER_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}

test test_user_withdraw_emergency_override() {
  let datum = Datum {
    ..create_test_datum(),
    emergency_stop: True
  }
  let redeemer = Redeemer::UserWithdraw { 
    withdrawal_amount: 10000000000
  }
  let context = create_test_context([TEST_OWNER_VKH], TEST_EARLY_TIME)
  
  // Should succeed even with early time due to emergency stop
  agent_vault_strike(datum, redeemer, context) == True
}

//================================================================
//--- Trading Toggle Tests ---
//================================================================

test test_toggle_trading_enable() {
  let datum = Datum {
    ..create_test_datum(),
    trading_enabled: False
  }
  let redeemer = Redeemer::UserToggleTrading { enable: True }
  let context = create_test_context([TEST_OWNER_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == True
}

test test_toggle_trading_disable() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserToggleTrading { enable: False }
  let context = create_test_context([TEST_OWNER_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == True
}

test test_toggle_trading_unauthorized() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserToggleTrading { enable: False }
  let context = create_test_context([TEST_UNAUTHORIZED_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}

test test_toggle_trading_enable_during_emergency() {
  let datum = Datum {
    ..create_test_datum(),
    emergency_stop: True,
    trading_enabled: False
  }
  let redeemer = Redeemer::UserToggleTrading { enable: True }
  let context = create_test_context([TEST_OWNER_VKH], TEST_CURRENT_TIME)
  
  // Should fail - cannot enable trading during emergency stop
  agent_vault_strike(datum, redeemer, context) == False
}

//================================================================
//--- Emergency Stop Tests ---
//================================================================

test test_emergency_stop_success() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserEmergencyStop
  let context = create_test_context([TEST_OWNER_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == True
}

test test_emergency_stop_unauthorized() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserEmergencyStop
  let context = create_test_context([TEST_UNAUTHORIZED_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}

//================================================================
//--- Configuration Update Tests ---
//================================================================

test test_update_config_success() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserUpdateConfig { 
    new_max_trade_amount: 75000000000 // 75,000 ADA
  }
  let context = create_test_context([TEST_OWNER_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == True
}

test test_update_config_unauthorized() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserUpdateConfig { 
    new_max_trade_amount: 75000000000
  }
  let context = create_test_context([TEST_UNAUTHORIZED_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}

test test_update_config_invalid_amount() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserUpdateConfig { 
    new_max_trade_amount: 0 // Invalid amount
  }
  let context = create_test_context([TEST_OWNER_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}

test test_update_config_exceeds_global_limit() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserUpdateConfig { 
    new_max_trade_amount: 150000000000 // 150,000 ADA (exceeds MAX_TRADE_AMOUNT)
  }
  let context = create_test_context([TEST_OWNER_VKH], TEST_CURRENT_TIME)
  
  agent_vault_strike(datum, redeemer, context) == False
}
