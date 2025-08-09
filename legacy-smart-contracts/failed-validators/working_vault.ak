// WORKING VAULT - Based on proven Aiken patterns
// Ultra simple version that always succeeds for testing

use cardano/transaction.{OutputReference, Transaction}

// The simplest possible spend validator - always succeeds
validator ultra_simple {
  spend(_datum: Option<Data>, _redeemer: Data, _own_ref: OutputReference, _tx: Transaction) -> Bool {
    // Always succeed for testing
    True
  }
}

// Alternative syntax - else handler (simplest form)
validator simple_vault {
  else(_) -> Bool {
    // Always succeed
    True
  }
}