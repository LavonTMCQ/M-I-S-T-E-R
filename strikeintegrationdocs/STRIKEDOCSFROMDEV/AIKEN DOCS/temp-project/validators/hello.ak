use aiken/transaction.{ScriptContext}

validator hello_world {
  spend(_datum: Data, _redeemer: Data, _context: ScriptContext) -> Bool {
    True
  }
}
