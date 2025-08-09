use aiken/builtin
use aiken/collection/dict
use aiken/crypto.{Blake2b_224, Hash, VerificationKey}
use aiken/collection/list
use aiken/option
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction,
}
use cardano/script_context.{ScriptContext, Spending}
use cardano/address.{Address, Credential, Script}
use cardano/assets

/// Vault datum that stores owner and admin information
/// Following CIP-32 for inline datums
pub type VaultDatum {
  /// Owner who can deposit and withdraw normally
  owner: Hash<Blake2b_224, VerificationKey>,
  /// Admin who can perform emergency withdrawals
  admin: Hash<Blake2b_224, VerificationKey>,
  /// Optional metadata for tracking purposes
  metadata: Option<ByteArray>,
}

/// Redeemer for different vault operations
pub type VaultRedeemer {
  /// User withdraws their own funds
  UserWithdraw
  /// Admin performs emergency withdrawal
  AdminWithdraw
  /// Agent executes a trade (for future use with CIP-31 reference inputs)
  AgentTrade { oracle_ref: OutputReference }
}

/// Main validator function
validator agent_vault_v2 {
  spend(
    datum_opt: Option<VaultDatum>,
    redeemer: VaultRedeemer,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    // Expect inline datum (CIP-32)
    expect Some(datum) = datum_opt

    // Get transaction info
    let extra_signatories = tx.extra_signatories

    // Check redeemer conditions
    when redeemer is {
      UserWithdraw -> {
        // Owner must sign the transaction
        list.has(extra_signatories, datum.owner)
      }
      
      AdminWithdraw -> {
        // Admin must sign the transaction (emergency recovery)
        list.has(extra_signatories, datum.admin)
      }
      
      AgentTrade { oracle_ref } -> {
        // For future implementation with CIP-31 reference inputs
        // This will check oracle price feeds without consuming them
        // For now, require owner signature as placeholder
        list.has(extra_signatories, datum.owner)
      }
    }
  }
}

/// Helper function to create initial vault datum
pub fn create_vault_datum(
  owner: Hash<Blake2b_224, VerificationKey>,
  admin: Hash<Blake2b_224, VerificationKey>,
) -> VaultDatum {
  VaultDatum {
    owner: owner,
    admin: admin,
    metadata: None,
  }
}

/// Test for owner withdrawal
test owner_can_withdraw() {
  let owner_pkh = #"1234567890abcdef1234567890abcdef1234567890abcdef12345678"
  let admin_pkh = #"abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
  
  let datum = VaultDatum {
    owner: owner_pkh,
    admin: admin_pkh,
    metadata: None,
  }
  
  let redeemer = UserWithdraw
  
  let tx = Transaction { ..transaction.placeholder, extra_signatories: [owner_pkh] }
  
  let own_ref = OutputReference { transaction_id: #"", output_index: 0 }
  
  agent_vault_v2.spend(Some(datum), redeemer, own_ref, tx)
}

/// Test for admin emergency withdrawal
test admin_can_emergency_withdraw() {
  let owner_pkh = #"1234567890abcdef1234567890abcdef1234567890abcdef12345678"
  let admin_pkh = #"abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
  
  let datum = VaultDatum {
    owner: owner_pkh,
    admin: admin_pkh,
    metadata: None,
  }
  
  let redeemer = AdminWithdraw
  
  let tx = Transaction { ..transaction.placeholder, extra_signatories: [admin_pkh] }
  
  let own_ref = OutputReference { transaction_id: #"", output_index: 0 }
  
  agent_vault_v2.spend(Some(datum), redeemer, own_ref, tx)
}

/// Test that unauthorized withdrawal fails
test unauthorized_withdrawal_fails() fail {
  let owner_pkh = #"1234567890abcdef1234567890abcdef1234567890abcdef12345678"
  let admin_pkh = #"abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
  let other_pkh = #"fedcba0987654321fedcba0987654321fedcba0987654321fedcba09"
  
  let datum = VaultDatum {
    owner: owner_pkh,
    admin: admin_pkh,
    metadata: None,
  }
  
  let redeemer = UserWithdraw
  
  // Transaction signed by someone else
  let tx = Transaction { ..transaction.placeholder, extra_signatories: [other_pkh] }
  
  let own_ref = OutputReference { transaction_id: #"", output_index: 0 }
  
  agent_vault_v2.spend(Some(datum), redeemer, own_ref, tx)
}