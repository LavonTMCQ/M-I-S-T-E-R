# 🚀 MISTERLABS Hyperliquid Production API Documentation

## Overview
This document details our custom-built production API that wraps the Hyperliquid trading bot (`ada_5x_professional.py`). The API provides comprehensive monitoring, analytics, control, and management capabilities for our autonomous trading system.

**Base URL**: `https://misterlabs220-production.up.railway.app`  
**Version**: v1.0.6  
**Status**: ✅ LIVE & OPERATIONAL (Verified September 5, 2025)

## 🔍 Live API Status Check
**Last Verified**: September 5, 2025 00:10 UTC
- ✅ **Health Endpoint**: OPERATIONAL
- ✅ **Algorithm Running**: TRUE  
- ✅ **Trading Enabled**: TRUE
- 🔐 **API Key Required**: For protected endpoints
- ⚠️ **Health/Detailed**: Has timestamp error (non-critical)

## 🏗️ Architecture

```
┌─────────────────────────┐
│   Frontend Dashboard    │
│   (Next.js/React)       │
└───────────┬─────────────┘
            │ HTTP/WebSocket
            ▼
┌─────────────────────────┐
│   Production API        │
│   (FastAPI/Python)      │
│   - Analytics           │
│   - Monitoring          │
│   - Control             │
│   - WebSocket Updates   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Trading Bot Core      │
│   ada_5x_professional   │
│   - Signal Generation   │
│   - Order Execution     │
│   - Risk Management     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Hyperliquid L1        │
│   Exchange API          │
└─────────────────────────┘
```

## 📊 Core API Endpoints

### Health & Monitoring

#### `GET /health`
Basic health check endpoint.
```json
Response:
{
  "status": "healthy",
  "timestamp": "2025-01-28T10:30:45Z"
}
```

#### `GET /health/detailed`
Comprehensive system health with uptime tracking.
```json
Response:
{
  "status": "healthy",
  "uptime_seconds": 86400,
  "uptime_human": "1 day, 0:00:00",
  "start_time": "2025-01-27T10:30:45Z",
  "connections": {
    "hyperliquid": true,
    "kraken": true,
    "database": true
  },
  "last_heartbeat": "2025-01-28T10:30:45Z"
}
```

### Account Management

#### `GET /account`
Retrieve current account balance and margin information.
```json
Response:
{
  "balance": 1547.23,
  "margin_used": 154.72,
  "margin_available": 1392.51,
  "leverage": 5,
  "positions": 1,
  "open_orders": 2
}
```

### Position Management

#### `GET /position/details`
Get current position with exit distance monitoring.
```json
Response:
{
  "position": {
    "coin": "ADA",
    "size": 154.0,
    "entry_price": 0.9164,
    "current_price": 0.9178,
    "pnl": 2.16,
    "pnl_percentage": 0.15
  },
  "exit_distances": {
    "stop_loss": {
      "price": 0.8888,
      "distance_pct": 3.01,
      "status": "✅ SAFE"
    },
    "take_profit": {
      "price": 0.9989,
      "distance_pct": 8.85,
      "status": "✅ SAFE"
    },
    "trailing_stop": {
      "activated": false,
      "current_stop": null,
      "highest_price": 0.9178
    }
  }
}
```

#### `POST /position/close`
Manually close the current position.
```json
Request:
{
  "confirm": true,
  "reason": "Manual intervention"
}

Response:
{
  "success": true,
  "message": "Position closed",
  "final_pnl": 2.16,
  "close_price": 0.9178
}
```

### Trading Signals

#### `GET /signals`
Real-time trading signal status with gatekeeper analysis.
```json
Response:
{
  "timestamp": "2025-01-28T10:30:45Z",
  "price": 0.9178,
  "recommendation": "HOLD",
  "signals": {
    "sma_20": true,
    "sma_50": true,
    "rsi": false,
    "volume": true,
    "macd": true,
    "volatility": false
  },
  "gatekeepers": ["rsi", "volatility"],
  "signal_strength": 4,
  "total_signals": 6
}
```

### Analytics & Performance

#### `GET /performance/summary`
Trading performance statistics.
```json
Response:
{
  "total_trades": 47,
  "winning_trades": 31,
  "losing_trades": 16,
  "win_rate": 65.96,
  "total_pnl": 234.56,
  "average_win": 12.45,
  "average_loss": -8.23,
  "profit_factor": 1.51,
  "sharpe_ratio": 1.24,
  "max_drawdown": -45.67,
  "current_streak": 3
}
```

#### `GET /performance/download`
Download complete trade history as CSV.
```
Response: CSV file
trade_id,timestamp,type,size,entry_price,exit_price,pnl,pnl_pct
1,2025-01-15T10:30:45Z,LONG,154.0,0.9164,0.9432,41.27,2.92
2,2025-01-16T14:22:13Z,LONG,158.0,0.9356,0.9267,-14.06,-0.95
...
```

### Gatekeeper Analysis

#### `GET /gatekeeper/analysis`
Analyze which signal conditions are blocking trades.
```json
Response:
{
  "analysis_period": "24h",
  "total_checks": 288,
  "blocked_trades": 156,
  "blocking_percentage": 54.17,
  "gatekeepers": [
    {
      "signal": "rsi",
      "blocks": 89,
      "percentage": 57.05,
      "current_value": 72.4,
      "threshold": 70,
      "status": "BLOCKING"
    },
    {
      "signal": "volatility",
      "blocks": 67,
      "percentage": 42.95,
      "current_value": 0.008,
      "threshold": 0.01,
      "status": "ALLOWING"
    }
  ],
  "recommendations": [
    "RSI is the primary gatekeeper - consider adjusting threshold",
    "Volatility filter may be too restrictive"
  ]
}
```

### Configuration Management

#### `GET /config`
View current bot configuration.
```json
Response:
{
  "leverage": 5,
  "position_size_ada": 154.0,
  "stop_loss_pct": 0.03,
  "take_profit_pct": 0.09,
  "trailing_activation_pct": 0.06,
  "trailing_distance_pct": 0.02,
  "signal_thresholds": {
    "rsi_oversold": 30,
    "rsi_overbought": 70,
    "volume_spike": 1.5,
    "volatility_min": 0.01
  }
}
```

#### `POST /config/leverage`
Update leverage and position sizing.
```json
Request:
{
  "leverage": 3,
  "position_size_ada": 100.0
}

Response:
{
  "success": true,
  "message": "Configuration updated",
  "new_config": {...}
}
```

### Trading Control

#### `POST /trading/enable`
Enable automated trading.
```json
Response:
{
  "success": true,
  "message": "Trading enabled",
  "status": "ACTIVE"
}
```

#### `POST /trading/disable`
Disable automated trading (keeps monitoring).
```json
Response:
{
  "success": true,
  "message": "Trading disabled",
  "status": "MONITORING_ONLY"
}
```

## 🔄 WebSocket Real-Time Updates

### `WS /ws`
WebSocket connection for real-time updates.

#### Connection
```javascript
const ws = new WebSocket('wss://misterlabs220-production.up.railway.app/ws');
```

#### Message Types

**Price Update**
```json
{
  "type": "price_update",
  "data": {
    "coin": "ADA",
    "price": 0.9178,
    "timestamp": "2025-01-28T10:30:45Z"
  }
}
```

**Signal Update**
```json
{
  "type": "signal_update",
  "data": {
    "signals": {...},
    "recommendation": "BUY",
    "strength": 5
  }
}
```

**Position Update**
```json
{
  "type": "position_update",
  "data": {
    "position": {...},
    "pnl": 12.45,
    "exit_distances": {...}
  }
}
```

**Trade Execution**
```json
{
  "type": "trade_executed",
  "data": {
    "action": "BUY",
    "size": 154.0,
    "price": 0.9164,
    "order_id": "142739461800"
  }
}
```

## 🛡️ Security Features

### Authentication
- API key authentication for all endpoints
- Rate limiting: 100 requests per minute
- IP whitelisting available

### Headers Required
```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

## 📈 Advanced Features

### Signal Timing Patterns (v1.0.5+)
The API tracks when each signal condition turns ON/OFF, identifying bottleneck patterns:
- Hourly analysis of signal activation patterns
- Identification of consistently blocking conditions
- Recommendations for threshold adjustments

### Exit Distance Monitoring (v1.0.4+)
Real-time monitoring of how close positions are to exit triggers:
- ✅ SAFE: >5% away from trigger
- ⚠️ CLOSE: 2-5% away from trigger  
- 🔴 DANGER: <2% away from trigger

### Numpy Serialization (v1.0.6+)
Automatic conversion of numpy types for JSON responses:
- Handles bool_, int64, float32, etc.
- Ensures frontend compatibility
- No manual conversion needed

## 🔧 Error Handling

### Standard Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Detailed error information",
  "timestamp": "2025-01-28T10:30:45Z"
}
```

### Common Error Codes
- `NO_POSITION`: No active position to operate on
- `INSUFFICIENT_BALANCE`: Not enough funds for operation
- `API_RATE_LIMIT`: Hyperliquid API rate limit hit
- `INVALID_PARAMETERS`: Request parameters invalid
- `CONNECTION_ERROR`: Cannot connect to Hyperliquid

## 📝 Usage Examples

### Python Client
```python
import requests

API_URL = "https://misterlabs220-production.up.railway.app"
API_KEY = "your-api-key"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Get signals
response = requests.get(f"{API_URL}/signals", headers=headers)
signals = response.json()

# Close position manually
response = requests.post(
    f"{API_URL}/position/close",
    headers=headers,
    json={"confirm": True}
)
```

### JavaScript/TypeScript Client
```typescript
const API_URL = 'https://misterlabs220-production.up.railway.app';
const API_KEY = 'your-api-key';

// Get account info
const response = await fetch(`${API_URL}/account`, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});
const account = await response.json();

// WebSocket connection
const ws = new WebSocket(`wss://misterlabs220-production.up.railway.app/ws`);
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

## 🚀 Deployment

### Environment Variables
```bash
# Required
HYPERLIQUID_PRIVATE_KEY=your_private_key
API_KEY=your_api_key
DATABASE_URL=postgresql://...

# Optional
KRAKEN_API_KEY=...
KRAKEN_API_SECRET=...
REDIS_URL=redis://...
DISCORD_WEBHOOK=...
```

### Docker Deployment
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Railway/Vercel Config
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT"
  }
}
```

## 📊 Monitoring & Observability

### Metrics Tracked
- Request latency (p50, p95, p99)
- Error rates by endpoint
- WebSocket connection count
- Trade execution times
- Signal calculation duration
- Hyperliquid API response times

### Logging
- Structured JSON logging
- Log levels: DEBUG, INFO, WARNING, ERROR
- Trade execution audit trail
- Error stack traces
- Performance profiling data

## 🔄 Version History

- **v1.0.6**: Analytics API, CSV export, manual controls
- **v1.0.5**: Signal timing patterns, gatekeeper analysis
- **v1.0.4**: Exit distance monitoring, visual warnings
- **v1.0.3**: WebSocket real-time updates
- **v1.0.2**: Configuration management
- **v1.0.1**: Basic monitoring endpoints
- **v1.0.0**: Initial release

## 📞 Support

For issues or questions about the API:
- Check `/health/detailed` for system status
- Review error responses for troubleshooting
- Monitor WebSocket for real-time diagnostics
- Contact: [your-support-email]

---

**Last Updated**: January 2025  
**API Version**: v1.0.6  
**Bot Version**: ada_5x_professional.py