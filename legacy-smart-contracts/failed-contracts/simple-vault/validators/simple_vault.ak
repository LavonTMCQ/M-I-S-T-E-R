// ULTRA SIMPLE VAULT - Always succeeds  
// Purpose: Prove basic deposit/withdrawal works before adding complexity

validator simple_vault {
  spend(_datum: Data, _redeemer: Data) -> Bool {
    // Always allows spending - no validation needed for basic test
    True
  }
}