// Comprehensive Test Suite for Secure Agent Vault Smart Contract
// 
// This test suite covers all security scenarios to ensure the contract is bulletproof:
// 1. Valid Agent Trade Tests
// 2. Invalid Agent Trade Tests (security violations)
// 3. User Withdrawal Tests
// 4. Emergency Stop Tests
// 5. Edge Cases and Attack Scenarios
//
// All tests must pass before deployment to mainnet

use aiken/transaction.{ScriptContext, Spend, Transaction, OutputReference, TransactionId}
use aiken/transaction/credential.{VerificationKey}
use aiken/interval.{Finite, Interval, IntervalBound}
use secure_agent_vault.{Datum, Redeemer, secure_agent_vault}

// Test Constants
const TEST_USER_VKH: ByteArray = #"user123456789012345678901234567890123456789012345678901234"
const TEST_AGENT_VKH: ByteArray = #"34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d"
const TEST_UNAUTHORIZED_VKH: ByteArray = #"unauthorized12345678901234567890123456789012345678901234567890"
const TEST_STRIKE_CONTRACT: ByteArray = #"be7544ca7d42c903268caecae465f3f8b5a7e7607d09165e471ac8b5"
const TEST_INVALID_CONTRACT: ByteArray = #"invalid123456789012345678901234567890123456789012345678901234"

// Test Timestamps
const VAULT_CREATION_TIME: Int = 1705420800000  // 2025-01-16 12:00:00 UTC
const VALID_TRADE_TIME: Int = 1705507200000     // 2025-01-17 12:00:00 UTC (24h later)
const TOO_EARLY_TIME: Int = 1705424400000       // 2025-01-16 13:00:00 UTC (1h later)

// Helper function to create test datum
fn create_test_datum() -> Datum {
  Datum {
    owner: TEST_USER_VKH,
    created_at: VAULT_CREATION_TIME,
    trading_enabled: True,
    emergency_stop: False,
    max_trade_amount: 50000000000,  // 50,000 ADA
    trade_count: 0,
  }
}

// Helper function to create test context
fn create_test_context(signers: List<ByteArray>, time: Int) -> ScriptContext {
  ScriptContext {
    transaction: Transaction {
      extra_signatories: signers,
      validity_range: Interval {
        lower_bound: IntervalBound { bound_type: Finite(time), is_inclusive: True },
        upper_bound: IntervalBound { bound_type: Finite(time), is_inclusive: True }
      },
      ..transaction.placeholder()
    },
    purpose: Spend(OutputReference { 
      transaction_id: TransactionId { hash: #"" }, 
      output_index: 0 
    })
  }
}

//================================================================
//--- VALID AGENT TRADE TESTS ---
//================================================================

test test_valid_agent_trade() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000,  // 25,000 ADA (within limit)
    destination_contract: TEST_STRIKE_CONTRACT 
  }
  let context = create_test_context([TEST_AGENT_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == True
}

test test_agent_trade_at_max_limit() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 50000000000,  // Exactly at max limit
    destination_contract: TEST_STRIKE_CONTRACT 
  }
  let context = create_test_context([TEST_AGENT_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == True
}

//================================================================
//--- INVALID AGENT TRADE TESTS (Security Violations) ---
//================================================================

test test_agent_trade_unauthorized_signer() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000,
    destination_contract: TEST_STRIKE_CONTRACT 
  }
  let context = create_test_context([TEST_UNAUTHORIZED_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}

test test_agent_trade_no_signature() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000,
    destination_contract: TEST_STRIKE_CONTRACT 
  }
  let context = create_test_context([], VALID_TRADE_TIME)  // No signers
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}

test test_agent_trade_amount_exceeds_limit() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 75000000000,  // 75,000 ADA (exceeds 50,000 limit)
    destination_contract: TEST_STRIKE_CONTRACT 
  }
  let context = create_test_context([TEST_AGENT_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}

test test_agent_trade_zero_amount() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 0,  // Invalid amount
    destination_contract: TEST_STRIKE_CONTRACT 
  }
  let context = create_test_context([TEST_AGENT_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}

test test_agent_trade_negative_amount() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: -1000000000,  // Negative amount
    destination_contract: TEST_STRIKE_CONTRACT 
  }
  let context = create_test_context([TEST_AGENT_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}

test test_agent_trade_invalid_destination() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000,
    destination_contract: TEST_INVALID_CONTRACT  // Not whitelisted
  }
  let context = create_test_context([TEST_AGENT_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}

test test_agent_trade_trading_disabled() {
  let datum = Datum {
    ..create_test_datum(),
    trading_enabled: False  // Trading disabled
  }
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000,
    destination_contract: TEST_STRIKE_CONTRACT 
  }
  let context = create_test_context([TEST_AGENT_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}

test test_agent_trade_emergency_stop() {
  let datum = Datum {
    ..create_test_datum(),
    emergency_stop: True  // Emergency stop active
  }
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000,
    destination_contract: TEST_STRIKE_CONTRACT 
  }
  let context = create_test_context([TEST_AGENT_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}

test test_agent_trade_too_early() {
  let datum = create_test_datum()
  let redeemer = Redeemer::AgentTrade { 
    trade_amount: 25000000000,
    destination_contract: TEST_STRIKE_CONTRACT 
  }
  let context = create_test_context([TEST_AGENT_VKH], TOO_EARLY_TIME)  // Before lock time
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}

//================================================================
//--- USER WITHDRAWAL TESTS ---
//================================================================

test test_valid_user_withdrawal() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserWithdraw { 
    withdrawal_amount: 10000000000  // 10,000 ADA
  }
  let context = create_test_context([TEST_USER_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == True
}

test test_user_withdrawal_full_amount() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserWithdraw { 
    withdrawal_amount: 100000000000  // 100,000 ADA (more than max trade)
  }
  let context = create_test_context([TEST_USER_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == True  // User can withdraw any amount
}

test test_user_withdrawal_during_emergency() {
  let datum = Datum {
    ..create_test_datum(),
    emergency_stop: True  // Emergency stop active
  }
  let redeemer = Redeemer::UserWithdraw { 
    withdrawal_amount: 10000000000
  }
  let context = create_test_context([TEST_USER_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == True  // User can always withdraw
}

test test_user_withdrawal_unauthorized() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserWithdraw { 
    withdrawal_amount: 10000000000
  }
  let context = create_test_context([TEST_UNAUTHORIZED_VKH], VALID_TRADE_TIME)  // Wrong signer
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}

test test_user_withdrawal_zero_amount() {
  let datum = create_test_datum()
  let redeemer = Redeemer::UserWithdraw { 
    withdrawal_amount: 0  // Invalid amount
  }
  let context = create_test_context([TEST_USER_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}

//================================================================
//--- EMERGENCY STOP TESTS ---
//================================================================

test test_valid_emergency_stop() {
  let datum = create_test_datum()
  let redeemer = Redeemer::EmergencyStop
  let context = create_test_context([TEST_USER_VKH], VALID_TRADE_TIME)
  
  secure_agent_vault.spend(datum, redeemer, context) == True
}

test test_emergency_stop_unauthorized() {
  let datum = create_test_datum()
  let redeemer = Redeemer::EmergencyStop
  let context = create_test_context([TEST_UNAUTHORIZED_VKH], VALID_TRADE_TIME)  // Wrong signer
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}

test test_emergency_stop_agent_cannot_trigger() {
  let datum = create_test_datum()
  let redeemer = Redeemer::EmergencyStop
  let context = create_test_context([TEST_AGENT_VKH], VALID_TRADE_TIME)  // Agent cannot emergency stop
  
  secure_agent_vault.spend(datum, redeemer, context) == False
}
