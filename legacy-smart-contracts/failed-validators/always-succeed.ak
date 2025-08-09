// Always succeed script for recovery operations

validator always_succeed {
  else(_) -> Bool {
    True
  }
}