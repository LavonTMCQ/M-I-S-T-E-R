# Vault Transaction Building Architecture and Issues (January 2025)

## Current Transaction Building Approach

### Client-Side Transaction Construction
The current Agent Vault V2 implementation attempts to build transactions using client-side wallet APIs:

```javascript
// Current pattern in vault services
const txBuilder = await wallet.buildTx({
  outputs: [output],
  utxos: selectedUtxos,
  changeAddress: changeAddress
});
```

### Identified Limitations

1. **Wallet API Inconsistencies**
   - Different wallets implement CIP-30 with variations
   - UTXO structure differences between wallet providers
   - Inconsistent transaction building parameters

2. **WASM Compatibility Issues**
   - MeshJS and Lucid Evolution cannot run directly in Next.js
   - WebAssembly module conflicts in browser environments
   - Requires separate Node.js service for Cardano operations

3. **Error Handling Challenges**
   - Wallet-specific error formats
   - Insufficient error details for debugging
   - Limited fallback options when transaction building fails

## Proposed Solution: Server-Side Transaction Builder

### Architecture Overview
Move transaction building to the Cardano Service (port 3001) for reliability and consistency:

```javascript
// Proposed API endpoint structure
POST /api/build-transaction
{
  "walletType": "eternl",
  "outputs": [...],
  "utxos": [...],
  "changeAddress": "addr1...",
  "metadata": {...}
}

// Response
{
  "success": true,
  "tx": "84a400818258...", // CBOR hex
  "txHash": "...",
  "fee": 170000
}
```

### Benefits of Server-Side Approach

1. **Consistent Transaction Building**
   - Single implementation handles all wallet types
   - Standardized UTXO selection algorithms
   - Unified error handling and logging

2. **Enhanced Reliability**
   - No browser WASM conflicts
   - Better error recovery mechanisms
   - Comprehensive transaction validation

3. **Improved Debugging**
   - Server-side logging for transaction issues
   - Better error messages and diagnostics
   - Transaction simulation capabilities

## Implementation Strategy

### Phase 1: Basic Transaction Builder
```javascript
// cardano-service/transaction-builder.js
class UniversalTransactionBuilder {
  constructor(blockfrostApi) {
    this.blockfrost = blockfrostApi;
  }

  async buildTransaction(params) {
    // 1. Validate inputs
    // 2. Select UTXOs intelligently
    // 3. Calculate fees
    // 4. Build CBOR transaction
    // 5. Return for client signing
  }

  async selectUtxos(availableUtxos, requiredAmount) {
    // Implement coin selection algorithm
    // Handle different UTXO structures from various wallets
  }
}
```

### Phase 2: Wallet Adapter Layer
```javascript
// Standardize different wallet APIs
class WalletAdapter {
  static adaptUtxos(walletType, rawUtxos) {
    switch(walletType) {
      case 'eternl': return this.adaptEternlUtxos(rawUtxos);
      case 'nami': return this.adaptNamiUtxos(rawUtxos);
      case 'vespr': return this.adaptVesprUtxos(rawUtxos);
      default: throw new Error(`Unsupported wallet: ${walletType}`);
    }
  }
}
```

### Phase 3: Transaction Validation
```javascript
// Pre-flight transaction validation
async function validateTransaction(txParams) {
  // Check balance sufficiency
  // Validate addresses
  // Verify UTXO availability
  // Calculate accurate fees
  // Return detailed validation results
}
```

## Wallet-Specific Considerations

### Eternl Wallet
- Robust UTXO structure
- Reliable transaction building API
- Good error reporting

### Nami Wallet
- Simpler UTXO format
- Limited transaction customization
- Basic error messages

### Vespr Wallet
- Advanced features support
- Complex UTXO handling
- Detailed transaction control

## Error Handling Strategy

### Transaction Building Errors
```javascript
const ERROR_TYPES = {
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  INVALID_UTXOS: 'invalid_utxos',
  FEE_CALCULATION_FAILED: 'fee_calculation_failed',
  NETWORK_ERROR: 'network_error',
  WALLET_CONNECTION_LOST: 'wallet_connection_lost'
};

class TransactionError extends Error {
  constructor(type, message, details) {
    super(message);
    this.type = type;
    this.details = details;
  }
}
```

### Recovery Mechanisms
1. **UTXO Refresh**: Fetch fresh UTXO set if stale
2. **Fee Adjustment**: Automatic fee recalculation
3. **Alternative UTXO Selection**: Try different coin selection strategies
4. **Wallet Reconnection**: Prompt for wallet reconnection if needed

## Testing Strategy

### Unit Tests
- Transaction builder logic
- UTXO selection algorithms
- Fee calculation accuracy
- Error handling scenarios

### Integration Tests
- End-to-end transaction flows
- Multi-wallet compatibility
- Network error simulation
- Transaction signing validation

### Performance Tests
- Large UTXO set handling
- Concurrent transaction building
- Memory usage optimization

## Migration Plan

1. **Current State**: Client-side transaction building with reliability issues
2. **Phase 1**: Implement basic server-side transaction builder
3. **Phase 2**: Add wallet adapter layer for consistency
4. **Phase 3**: Comprehensive error handling and validation
5. **Phase 4**: Performance optimization and advanced features

## Success Metrics

- Transaction success rate > 95%
- Error resolution time < 30 seconds
- Support for all major Cardano wallets
- Consistent user experience across wallet types

This architecture will provide a robust foundation for reliable vault transactions while maintaining the user-friendly interface of Agent Vault V2.