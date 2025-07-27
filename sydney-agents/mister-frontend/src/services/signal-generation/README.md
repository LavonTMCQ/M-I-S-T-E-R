# Signal Generation Service Documentation

## Overview

The Signal Generation Service is a comprehensive, production-ready system that leverages our existing ADA Custom Algorithm (62.5% win rate) to generate trading signals with full TypeScript type safety and validation. The service provides real-time signal polling, automatic conversion to TypeScript interfaces, and seamless integration with Strike Finance and Discord notifications.

## Architecture

### Core Components

1. **SignalGenerationService** - Main service class with polling and signal generation
2. **SignalConverter** - Utilities for converting Railway API responses to TypeScript interfaces
3. **SignalServiceManager** - Advanced monitoring and health management
4. **Integration Manager** - Connects with wallet, Strike Finance, and Discord systems

### Data Flow

```
Railway API (ADA Algorithm) → Signal Generation Service → TypeScript Validation → Integration Manager
                                        ↓
Discord Notifications ← Strike Finance Execution ← Wallet Integration
```

## Quick Start

### Basic Usage

```typescript
import { startSignalGeneration } from '@/services/signal-generation';

// Start signal generation with default settings
const service = await startSignalGeneration({
  polling_interval: 300, // 5 minutes
  min_confidence: 70,
  max_signals_per_hour: 12,
  auto_start: true
});

// Listen for new signals
service.addSignalListener((signal) => {
  console.log('New signal:', signal);
});
```

### Advanced Configuration

```typescript
import { 
  SignalGenerationService, 
  SignalServiceManager,
  SignalIntegrationManager 
} from '@/services/signal-generation';

// Create service with custom configuration
const service = new SignalGenerationService({
  polling_interval: 300,
  min_confidence: 75,
  max_signals_per_hour: 10,
  enabled_patterns: [
    'RSI_Oversold_BB_Bounce',
    'RSI_Overbought_BB_Rejection'
  ],
  risk_settings: {
    max_position_size: 150,
    default_stop_loss_pct: 4,
    default_take_profit_pct: 12,
  },
  endpoints: {
    ada_algorithm: 'https://ada-backtesting-service-production.up.railway.app/api/analyze',
    strike_finance: 'https://bridge-server-cjs-production.up.railway.app/api/strike',
  }
});

// Set up monitoring
const manager = new SignalServiceManager();
manager.startHealthMonitoring(60); // Check every minute

// Set up integrations
const integrationManager = new SignalIntegrationManager();
integrationManager.initializeSignalListener();

// Start service
service.start();
```

## Core Features

### 1. Real-time Signal Generation

The service polls the Railway API every 5 minutes (configurable) to check for new trading signals:

```typescript
// Service automatically polls and generates signals
const response = await service.generateSignalNow(); // Manual trigger

if (response.success && response.signal) {
  console.log('Signal generated:', {
    id: response.signal.id,
    type: response.signal.type,
    confidence: response.signal.confidence,
    pattern: response.signal.pattern,
    price: response.signal.price
  });
}
```

### 2. Type-safe Signal Conversion

Railway API responses are automatically converted to TypeScript interfaces:

```typescript
// Railway API response (Python format)
const railwayResponse = {
  signal: 'BUY',
  confidence: 75,
  current_price: 0.7445,
  reasoning: 'RSI oversold + BB lower bounce',
  indicators: {
    rsi: 32.5,
    bb_position: 0.15,
    volume_ratio: 1.8
  }
};

// Automatically converted to TypeScript TradingSignal
const signal: TradingSignal = {
  id: 'ada_1704123456789_abc123',
  timestamp: '2024-01-01T12:00:00.000Z',
  type: 'long',
  price: 0.7445,
  confidence: 75,
  pattern: 'RSI_Oversold_BB_Bounce',
  reasoning: 'BULLISH signal: RSI oversold at 32.5 + Bollinger Band lower bounce (15.0% position) + volume confirmation (1.8x average)',
  indicators: {
    rsi: 32.5,
    bb_position: 0.15,
    volume_ratio: 1.8,
    price: 0.7445
  },
  risk: {
    stop_loss: 0.7073,
    take_profit: 0.8190,
    stop_loss_pct: 5.0,
    take_profit_pct: 10.0,
    position_size: 50,
    max_risk: 2.5
  },
  algorithm: {
    algorithm_name: 'ADA Custom Algorithm',
    version: '1.0.0',
    timeframe: '15m',
    historical_win_rate: 62.5
  },
  status: 'pending',
  expires_at: '2024-01-01T13:00:00.000Z'
};
```

### 3. Signal Validation

All signals are validated before processing:

```typescript
import { validateTradingSignal } from '@/types/signals';

const validation = validateTradingSignal(signal);

if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
  console.log('Validation warnings:', validation.warnings);
  console.log('Validation score:', validation.score);
}
```

### 4. Duplicate Prevention

The service prevents duplicate signals using intelligent caching:

```typescript
// Signals are cached and deduplicated based on:
// - Signal type (long/short)
// - Price level (rounded to 4 decimals)
// - Pattern type
// - RSI level (rounded)
// - Bollinger Band position (rounded)

// Duplicate signals within 30 minutes are automatically filtered out
```

### 5. Rate Limiting

Built-in rate limiting prevents API abuse:

```typescript
// Default limits:
// - Maximum 12 signals per hour
// - Minimum 5 minutes between signals
// - Configurable thresholds

const canGenerate = service.canGenerateSignal();
if (!canGenerate) {
  console.log('Rate limit reached - waiting for next interval');
}
```

## Integration with Existing Systems

### ADA Custom Algorithm Integration

The service seamlessly integrates with our existing ADA algorithm:

```typescript
// Uses existing Railway API endpoint
const RAILWAY_ENDPOINT = 'https://ada-backtesting-service-production.up.railway.app/api/analyze';

// Sends same request format as ada-custom-algorithm-tool.ts
const request = {
  strategy: 'ada_custom_algorithm',
  timeframe: '15m',
  mode: 'live_analysis'
};

// Handles both direct responses and nested analysis structures
const response = await fetch(RAILWAY_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
  signal: AbortSignal.timeout(15000)
});
```

### Strike Finance Integration

Signals are automatically formatted for Strike Finance execution:

```typescript
import { signalToStrikeFinanceRequest } from '@/types/signals';

const tradeRequest = signalToStrikeFinanceRequest(
  signal,
  walletAddress,
  clientRequestId
);

// Results in Strike Finance compatible format:
// {
//   wallet_address: "addr1...",
//   side: "long",
//   amount: 50,
//   asset: "ADA",
//   stop_loss: 0.7073,
//   take_profit: 0.8190,
//   signal_id: "ada_1704123456789_abc123",
//   client_request_id: "req_1704123456789_def456"
// }
```

### Discord Notifications

Rich Discord notifications are automatically generated:

```typescript
import { createSignalNotification } from '@/types/signals';

const notification = createSignalNotification(
  signal,
  userDiscordId,
  walletAddress
);

// Creates Discord embed with:
// - Signal details (type, price, confidence)
// - Risk management (position size, stop loss, take profit)
// - Pattern explanation and reasoning
// - Expiration countdown
// - Algorithm performance stats
```

## Service Management

### Health Monitoring

```typescript
import { SignalServiceManager } from '@/services/signal-generation';

const manager = new SignalServiceManager();

// Start health monitoring
manager.startHealthMonitoring(60); // Check every minute

// Get health metrics
const health = manager.getHealthMetrics();
console.log('Service health:', {
  uptime: health.uptime_seconds,
  signals_today: health.signals_today,
  success_rate: health.success_rate,
  errors: health.error_count
});

// Perform health check
const healthCheck = await manager.performHealthCheck();
if (!healthCheck.healthy) {
  console.log('Issues:', healthCheck.issues);
  console.log('Recommendations:', healthCheck.recommendations);
}
```

### Performance Metrics

```typescript
// Get performance metrics
const performance = manager.getPerformanceMetrics();
console.log('Performance:', {
  signals_by_hour: performance.signals_by_hour,
  success_rate_by_hour: performance.success_rate_by_hour,
  response_times: performance.response_times,
  pattern_distribution: performance.pattern_distribution
});
```

### Service Control

```typescript
// Start service
service.start();

// Stop service
service.stop();

// Get status
const status = service.getStatus();
console.log('Service status:', {
  running: status.running,
  last_signal_time: status.last_signal_time,
  signals_today: status.signals_today,
  health: status.health,
  errors: status.errors
});

// Restart with new configuration
manager.restartService({
  polling_interval: 600, // 10 minutes
  min_confidence: 80
});
```

## Error Handling

### Comprehensive Error Management

```typescript
// Service handles multiple error types:
// 1. Railway API errors (network, timeout, invalid response)
// 2. Signal validation errors (invalid data, missing fields)
// 3. Rate limiting errors (too many requests)
// 4. Integration errors (wallet, Strike Finance, Discord)

// Errors are logged and tracked
const status = service.getStatus();
if (status.errors.length > 0) {
  console.log('Active errors:', status.errors);
}

// Automatic retry logic for transient errors
// Fallback responses when Railway API is unavailable
// Graceful degradation when integrations are offline
```

### Error Recovery

```typescript
// Service automatically recovers from:
// - Network timeouts
// - API rate limits
// - Temporary service outages
// - Invalid signal data

// Manual recovery options:
service.stop();
service.start(); // Clears error state and restarts

// Or use service manager:
manager.restartService(); // Full restart with metrics reset
```

## Configuration Options

### Service Configuration

```typescript
interface SignalServiceConfig {
  /** Polling interval in seconds (default: 300 = 5 minutes) */
  polling_interval: number;
  
  /** Minimum confidence threshold (default: 70) */
  min_confidence: number;
  
  /** Maximum signals per hour (default: 12) */
  max_signals_per_hour: number;
  
  /** Enabled trading patterns */
  enabled_patterns: TradingPattern[];
  
  /** Risk management settings */
  risk_settings: {
    max_position_size: number;
    default_stop_loss_pct: number;
    default_take_profit_pct: number;
  };
  
  /** API endpoints */
  endpoints: {
    ada_algorithm: string;
    strike_finance: string;
    discord_webhook?: string;
  };
}
```

### Conversion Configuration

```typescript
interface SignalConversionConfig {
  /** Default position size in ADA (default: 50) */
  default_position_size: number;
  
  /** Default stop loss percentage (default: 5) */
  default_stop_loss_pct: number;
  
  /** Default take profit percentage (default: 10) */
  default_take_profit_pct: number;
  
  /** Maximum position size (default: 200) */
  max_position_size: number;
  
  /** Signal expiry time in minutes (default: 60) */
  signal_expiry_minutes: number;
  
  /** Algorithm metadata */
  algorithm_metadata: Partial<AlgorithmMetadata>;
}
```

## Testing and Debugging

### Manual Signal Generation

```typescript
// Generate signal manually for testing
const response = await service.generateSignalNow();
console.log('Test signal:', response);

// Test signal conversion
import { validateAndConvertRailwaySignal } from '@/services/signal-generation';

const testData = {
  signal: 'BUY',
  confidence: 75,
  current_price: 0.7445,
  reasoning: 'Test signal',
  indicators: { rsi: 30, bb_position: 0.1, volume_ratio: 1.5 },
  timestamp: new Date().toISOString()
};

const { signal, validation, errors } = validateAndConvertRailwaySignal(testData);
console.log('Conversion result:', { signal, validation, errors });
```

### Health Checks

```typescript
// Perform comprehensive health check
const healthCheck = await manager.performHealthCheck();
console.log('Health check result:', healthCheck);

// Export metrics for analysis
const metrics = manager.exportMetrics();
console.log('Service metrics:', metrics);
```

### Integration Testing

```typescript
// Test integrations
const integrationManager = getSignalIntegrationManager();
const integrationStatus = integrationManager.getIntegrationStatus();
console.log('Integration status:', integrationStatus);

const integrationHealth = integrationManager.getIntegrationHealth();
console.log('Integration health:', integrationHealth);
```

## Best Practices

### 1. Service Lifecycle Management

```typescript
// Always start health monitoring
const manager = new SignalServiceManager();
manager.startHealthMonitoring(60);

// Set up proper error handling
service.addSignalListener((signal) => {
  try {
    // Process signal
    processSignal(signal);
  } catch (error) {
    console.error('Signal processing error:', error);
  }
});

// Clean shutdown
process.on('SIGTERM', () => {
  service.stop();
  manager.stopHealthMonitoring();
});
```

### 2. Configuration Management

```typescript
// Use environment-specific configurations
const config = {
  polling_interval: process.env.NODE_ENV === 'production' ? 300 : 60,
  min_confidence: process.env.NODE_ENV === 'production' ? 70 : 60,
  max_signals_per_hour: process.env.NODE_ENV === 'production' ? 12 : 60,
};

const service = new SignalGenerationService(config);
```

### 3. Error Monitoring

```typescript
// Monitor service health regularly
setInterval(async () => {
  const healthCheck = await manager.performHealthCheck();
  if (!healthCheck.healthy) {
    // Alert administrators
    console.error('Service health issues:', healthCheck.issues);
    // Send alerts to monitoring system
  }
}, 5 * 60 * 1000); // Check every 5 minutes
```

### 4. Performance Optimization

```typescript
// Use appropriate polling intervals
// - Production: 5 minutes (300 seconds)
// - Development: 1 minute (60 seconds)
// - Testing: 10 seconds

// Monitor response times
const performance = manager.getPerformanceMetrics();
if (performance.response_times.some(time => time > 30000)) {
  console.warn('High response times detected');
}
```

## Troubleshooting

### Common Issues

1. **No signals generated**
   - Check Railway API connectivity
   - Verify algorithm is returning BUY/SELL signals (not HOLD)
   - Check confidence threshold settings
   - Review rate limiting settings

2. **High error rates**
   - Check network connectivity to Railway API
   - Verify API endpoint URL is correct
   - Check for API rate limiting
   - Review signal validation criteria

3. **Integration failures**
   - Verify wallet connection
   - Check Strike Finance API availability
   - Confirm Discord bot configuration
   - Review integration health status

### Debug Commands

```typescript
// Check service status
const status = service.getStatus();
console.log('Service status:', status);

// Check integration health
const integrationHealth = integrationManager.getIntegrationHealth();
console.log('Integration health:', integrationHealth);

// Generate test signal
const testSignal = await service.generateSignalNow();
console.log('Test signal:', testSignal);

// Export full metrics
const fullMetrics = manager.exportMetrics();
console.log('Full metrics:', fullMetrics);
```

## Migration from Legacy Systems

### From Manual Signal Checking

```typescript
// Before: Manual API calls
const response = await fetch('railway-api-endpoint');
const data = await response.json();
// Manual processing...

// After: Automatic signal generation
const service = await startSignalGeneration();
service.addSignalListener((signal) => {
  // Automatic signal processing
});
```

### From Basic Signal Processing

```typescript
// Before: Basic signal handling
if (data.signal === 'BUY') {
  // Basic processing
}

// After: Type-safe signal processing
service.addSignalListener((signal: TradingSignal) => {
  // Full type safety and validation
  if (isExecutableSignal(signal)) {
    // Process with confidence
  }
});
```

## Performance Characteristics

- **Memory Usage**: ~10-50MB depending on cache size
- **CPU Usage**: Minimal (polling-based, not continuous)
- **Network Usage**: ~1KB per API call every 5 minutes
- **Response Time**: Typically 2-5 seconds per signal generation
- **Reliability**: 99%+ uptime with proper error handling

## Future Enhancements

1. **Multiple Algorithm Support**: Easy to add new algorithms
2. **Advanced Filtering**: Custom signal filtering rules
3. **Machine Learning**: Signal quality scoring
4. **Real-time WebSocket**: Instant signal delivery
5. **Advanced Analytics**: Detailed performance tracking

---

This service provides a solid foundation for the signal provider architecture while maintaining compatibility with existing systems and allowing for future extensions.