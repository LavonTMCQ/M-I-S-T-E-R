# Signal Types Documentation

## Overview

This directory contains comprehensive TypeScript interfaces and types for the MRSTRIKE signal provider system. The type definitions are based on our production-ready ADA Custom Algorithm (62.5% win rate) and designed for seamless integration across all system components.

## Architecture

The signal type system is organized into five main modules:

### 1. Core Types (`core.ts`)
**Purpose**: Fundamental signal structures and interfaces

**Key Types**:
- `TradingSignal` - Main signal interface with all required properties
- `SignalExecution` - Execution tracking and results
- `TechnicalIndicators` - RSI, Bollinger Bands, volume data
- `RiskParameters` - Stop loss, take profit, position sizing
- `AlgorithmMetadata` - Algorithm performance and versioning

**Usage**:
```typescript
import { TradingSignal, SignalType, isExecutableSignal } from '@/types/signals';

const signal: TradingSignal = {
  id: 'signal_123',
  timestamp: new Date().toISOString(),
  type: 'long',
  price: 0.7445,
  confidence: 75,
  // ... other required fields
};

if (isExecutableSignal(signal)) {
  // Signal is ready for execution
}
```

### 2. Strike Finance Integration (`strike-finance.ts`)
**Purpose**: Types for one-click execution with Strike Finance API

**Key Types**:
- `StrikeFinanceTradeRequest` - Trade execution request format
- `StrikeFinanceTradeResponse` - API response with transaction details
- `OneClickExecutionRequest` - Complete execution workflow
- `PreExecutionValidation` - Balance and risk checks

**Usage**:
```typescript
import { signalToStrikeFinanceRequest, OneClickExecutionRequest } from '@/types/signals';

const tradeRequest = signalToStrikeFinanceRequest(
  signal,
  walletAddress,
  clientRequestId
);

const executionRequest: OneClickExecutionRequest = {
  signal,
  wallet_address: walletAddress,
  user_confirmed: true,
};
```

### 3. Discord Notifications (`notifications.ts`)
**Purpose**: Discord bot integration for signal alerts and confirmations

**Key Types**:
- `DiscordNotification` - Base notification structure
- `SignalGeneratedNotification` - New signal alerts
- `SignalExecutedNotification` - Execution confirmations
- `UserNotificationPreferences` - User settings

**Usage**:
```typescript
import { createSignalNotification, DISCORD_COLORS } from '@/types/signals';

const notification = createSignalNotification(
  signal,
  userDiscordId,
  walletAddress
);

// Notification includes formatted Discord embed with signal details
```

### 4. Dashboard UI (`dashboard.ts`)
**Purpose**: Types for signal dashboard, performance tracking, and UI components

**Key Types**:
- `SignalDashboardFilters` - Filter options for signal lists
- `SignalPerformanceMetrics` - Win rate, P&L, performance data
- `SignalListItem` - Formatted signal data for UI display
- `DashboardWidget` - Configurable dashboard components

**Usage**:
```typescript
import { SignalDashboardFilters, SignalPerformanceMetrics } from '@/types/signals';

const filters: SignalDashboardFilters = {
  time_range: '1d',
  status: 'executed',
  min_confidence: 70,
  patterns: 'all',
  algorithms: ['ADA Custom Algorithm'],
};
```

### 5. Validation (`validation.ts`)
**Purpose**: Data validation, sanitization, and integrity checks

**Key Types**:
- `ValidationResult` - Validation outcome with errors and warnings
- `SignalValidationConstraints` - Validation rules and limits
- `ValidationError` - Detailed error information

**Usage**:
```typescript
import { validateTradingSignal, DEFAULT_VALIDATION_CONSTRAINTS } from '@/types/signals';

const validation = validateTradingSignal(signal);

if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
  console.log('Validation warnings:', validation.warnings);
  console.log('Validation score:', validation.score);
}
```

## Integration with Existing Systems

### ADA Custom Algorithm Compatibility
The types are designed to match the existing ADA algorithm output:

```python
# Python algorithm output (ada_custom_algorithm.py)
signal = {
    'timestamp': current_bar['timestamp'],
    'type': 'long',
    'price': price,
    'confidence': confidence,
    'rsi': rsi,
    'bb_position': bb_position,
    'volume_ratio': volume_ratio,
    'pattern': 'RSI_Oversold_BB_Bounce',
    'stop_loss': price * (1 - self.stop_loss_pct),
    'take_profit': price * (1 + self.take_profit_pct),
    'reasoning': f"ADA Pattern: RSI oversold ({rsi:.1f}) + BB lower bounce + volume spike ({volume_ratio:.1f}x)"
}
```

```typescript
// TypeScript interface matches exactly
const signal: TradingSignal = {
  id: generateSignalId(),
  timestamp: pythonSignal.timestamp,
  type: pythonSignal.type,
  price: pythonSignal.price,
  confidence: pythonSignal.confidence,
  pattern: pythonSignal.pattern,
  reasoning: pythonSignal.reasoning,
  indicators: {
    rsi: pythonSignal.rsi,
    bb_position: pythonSignal.bb_position,
    volume_ratio: pythonSignal.volume_ratio,
    price: pythonSignal.price,
  },
  risk: {
    stop_loss: pythonSignal.stop_loss,
    take_profit: pythonSignal.take_profit,
    position_size: calculatePositionSize(pythonSignal.confidence),
    // ... calculated fields
  },
  // ... other required fields
};
```

### Strike Finance API Compatibility
Types match Strike Finance API requirements:

```typescript
// Converts signal to Strike Finance format
const strikeRequest: StrikeFinanceTradeRequest = {
  wallet_address: "addr1...",
  side: signal.type, // 'long' or 'short'
  amount: signal.risk.position_size,
  asset: "ADA",
  stop_loss: signal.risk.stop_loss,
  take_profit: signal.risk.take_profit,
  signal_id: signal.id,
  client_request_id: generateRequestId(),
};
```

## Type Safety Features

### Strict TypeScript Compliance
All types are designed for TypeScript strict mode:

```typescript
// Compile-time type checking
function executeSignal(signal: TradingSignal): Promise<SignalExecution> {
  // TypeScript ensures all required fields are present
  // and types are correct
}

// Runtime type guards
if (isTradingSignal(data)) {
  // TypeScript knows 'data' is a valid TradingSignal
  console.log(data.confidence); // Type-safe access
}
```

### Validation Integration
Types work seamlessly with validation:

```typescript
const signal = sanitizeSignal(rawSignalData);
const validation = validateTradingSignal(signal);

if (validation.valid && isSignalExecutable(signal)) {
  await executeSignal(signal);
}
```

## Extension Points

### Adding New Algorithm Types
```typescript
// Extend TradingPattern for new algorithms
export type TradingPattern = 
  | 'RSI_Oversold_BB_Bounce'
  | 'RSI_Overbought_BB_Rejection'
  | 'Volume_Spike_Reversal'
  | 'Multi_Indicator_Confluence'
  | 'Custom_Pattern'
  | 'NEW_ALGORITHM_PATTERN'; // Add new patterns here

// Extend AlgorithmMetadata for new algorithms
interface NewAlgorithmMetadata extends AlgorithmMetadata {
  custom_parameters: {
    // Algorithm-specific parameters
  };
}
```

### Adding New Notification Types
```typescript
// Extend NotificationType
export type NotificationType = 
  | 'signal_generated'
  | 'signal_executed'
  | 'signal_failed'
  | 'signal_expired'
  | 'position_update'
  | 'system_alert'
  | 'NEW_NOTIFICATION_TYPE'; // Add new types here
```

## Best Practices

### 1. Always Use Type Guards
```typescript
// Good
if (isTradingSignal(data)) {
  processSignal(data);
}

// Bad
processSignal(data as TradingSignal);
```

### 2. Validate Before Processing
```typescript
// Good
const validation = validateTradingSignal(signal);
if (validation.valid) {
  await executeSignal(signal);
} else {
  handleValidationErrors(validation.errors);
}

// Bad
await executeSignal(signal); // No validation
```

### 3. Use Utility Types
```typescript
// Good - Use provided utility types
const partialUpdate: PartialSignalUpdate = {
  status: 'executed',
  execution: executionData,
};

// Bad - Manual partial types
const update: Partial<TradingSignal> = { ... };
```

### 4. Leverage Type Inference
```typescript
// Good - Let TypeScript infer types
const notification = createSignalNotification(signal, userId, walletAddress);

// Bad - Explicit typing when not needed
const notification: SignalGeneratedNotification = createSignalNotification(...);
```

## Testing Types

### Unit Test Examples
```typescript
import { TradingSignal, validateTradingSignal, isTradingSignal } from '@/types/signals';

describe('Signal Types', () => {
  it('should validate correct signal', () => {
    const signal: TradingSignal = createTestSignal();
    const validation = validateTradingSignal(signal);
    expect(validation.valid).toBe(true);
  });

  it('should identify valid trading signals', () => {
    const signal = createTestSignal();
    expect(isTradingSignal(signal)).toBe(true);
  });
});
```

## Migration Guide

### From Legacy Code
If migrating from existing signal code:

1. **Import new types**: Replace old interfaces with new signal types
2. **Update validation**: Use new validation functions
3. **Add type guards**: Use provided type guards for runtime safety
4. **Update API calls**: Use new Strike Finance and Discord types

### Example Migration
```typescript
// Before
interface OldSignal {
  price: number;
  direction: string;
  confidence: number;
}

// After
import { TradingSignal, SignalType } from '@/types/signals';

const signal: TradingSignal = {
  // ... all required fields with proper types
};
```

## Performance Considerations

### Type Checking Performance
- All types are designed for fast compilation
- Minimal use of complex conditional types
- Efficient type guards with early returns

### Runtime Performance
- Type guards use simple property checks
- Validation functions are optimized for common cases
- Minimal object creation in utility functions

## Version Compatibility

**Current Version**: 1.0.0

**Breaking Changes**: None (initial version)

**Backward Compatibility**: N/A (initial implementation)

**Future Versions**: Will maintain backward compatibility for core interfaces

---

## Quick Reference

### Most Common Imports
```typescript
import {
  TradingSignal,
  SignalType,
  SignalStatus,
  TradingPattern,
  validateTradingSignal,
  isExecutableSignal,
  createSignalNotification,
  signalToStrikeFinanceRequest,
} from '@/types/signals';
```

### Most Common Type Guards
```typescript
if (isTradingSignal(data)) { /* ... */ }
if (isExecutableSignal(signal)) { /* ... */ }
if (isSignalGeneratedNotification(notification)) { /* ... */ }
```

### Most Common Validation
```typescript
const validation = validateTradingSignal(signal);
if (!validation.valid) {
  console.error('Signal validation failed:', validation.errors);
}
```

This type system provides a solid foundation for the signal provider architecture while maintaining compatibility with existing systems and allowing for future extensions.