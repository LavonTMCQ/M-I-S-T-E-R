# 📚 HYPERLIQUID VAULT - COMPLETE API REFERENCE
**Last Updated**: January 28, 2025  
**Vault Address**: `0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0`  
**Leader Wallet**: `0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74`

---

## 🔑 CRITICAL INFORMATION

### Vault Details
- **Vault Address**: `0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0`
- **Type**: Hyperliquid Native Vault
- **Leader**: `0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74` (your wallet)
- **Current Balance**: ~$100 (all funds moved here)
- **API Base URL**: `https://api.hyperliquid.xyz`

### How to Connect
```python
from hyperliquid.info import Info
from hyperliquid.exchange import Exchange
from eth_account import Account

# For READING vault data (no private key needed)
info = Info(base_url="https://api.hyperliquid.xyz")

# For TRADING through vault (needs leader private key)
account = Account.from_key("your_private_key_here")
exchange = Exchange(account, base_url="https://api.hyperliquid.xyz")

# The vault address to query
VAULT_ADDRESS = "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"
```

---

## 📊 READ-ONLY ENDPOINTS (No Auth Required)

### 1. Get Vault State (Balance, Margin, Positions)
```python
# Python SDK
vault_state = info.user_state("0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0")

# Direct API Call
curl -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "clearinghouseState", "user": "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"}'
```

**Returns:**
```json
{
  "marginSummary": {
    "accountValue": "100.0",        // Total vault equity
    "totalNtlPos": "0",             // Total notional position
    "totalRawUsd": "100.0",         // Raw USD balance
    "totalMarginUsed": "0",         // Margin currently used
    "accountLeverage": "0"          // Current leverage
  },
  "assetPositions": [               // Array of positions
    {
      "position": {
        "coin": "ADA",
        "szi": "0",                 // Position size (0 = no position)
        "entryPx": "0",             // Entry price
        "positionValue": "0",       // Current position value
        "unrealizedPnl": "0",       // Unrealized P&L
        "returnOnEquity": "0"       // ROE percentage
      }
    }
  ],
  "crossMarginSummary": {...}        // Cross margin details
}
```

### 2. Get Vault Open Orders
```python
# Python SDK
vault_orders = info.open_orders("0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0")

# Direct API Call
curl -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "openOrders", "user": "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"}'
```

**Returns:**
```json
[
  {
    "coin": "ADA",
    "side": "B",                    // B=Buy, A=Sell
    "limitPx": "0.8700",           // Limit price
    "sz": "100.0",                  // Order size
    "oid": 123456789,               // Order ID
    "timestamp": 1706500000000,     // Unix timestamp
    "origSz": "100.0",              // Original size
    "cloid": null                   // Client order ID
  }
]
```

### 3. Get Vault Trade History (Fills)
```python
# Python SDK
vault_fills = info.user_fills("0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0")

# Direct API Call
curl -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "userFills", "user": "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"}'
```

**Returns:**
```json
[
  {
    "coin": "ADA",
    "px": "0.8695",                 // Fill price
    "sz": "100.0",                  // Fill size
    "side": "B",                    // Buy/Sell
    "time": 1706500000000,          // Unix timestamp
    "startPosition": "0",           // Position before fill
    "dir": "Open",                  // Open/Close/Flip
    "closedPnl": "0",              // Realized P&L if closing
    "hash": "0x...",               // Transaction hash
    "oid": 123456789,              // Order ID
    "crossed": false,               // Crossed with own order
    "fee": "0.05"                  // Trading fee
  }
]
```

### 4. Get Vault Funding History
```python
# Python SDK
funding = info.user_funding("0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0")

# Direct API Call
curl -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "userFunding", "user": "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"}'
```

### 5. Get Current Prices (Any User Can Call)
```python
# Python SDK
all_prices = info.all_mids()
ada_price = all_prices["ADA"]

# Direct API Call
curl -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "allMids"}'
```

### 6. Get Order Book for Asset
```python
# Python SDK
book = info.l2_book("ADA")

# Direct API Call
curl -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "l2Book", "coin": "ADA"}'
```

### 7. Get Recent Trades for Asset
```python
# Python SDK
trades = info.trades("ADA")

# Direct API Call
curl -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "trades", "coin": "ADA"}'
```

---

## 🔐 TRADING ENDPOINTS (Requires Leader Private Key)

### 1. Place Order (Uses Vault Capital)
```python
# Python SDK
from eth_account import Account
from hyperliquid.exchange import Exchange

account = Account.from_key("your_private_key")
exchange = Exchange(account, base_url="https://api.hyperliquid.xyz")

# Place market order
market_order = exchange.order(
    name="ADA",
    is_buy=True,
    sz=100.0,                        # Uses vault's capital
    limit_px=0,                      # 0 for market order
    order_type={"market": {}},
    reduce_only=False
)

# Place limit order
limit_order = exchange.order(
    name="ADA",
    is_buy=True,
    sz=100.0,
    limit_px=0.8700,
    order_type={"limit": {"tif": "Gtc"}},  # Good till cancelled
    reduce_only=False
)

# Place stop-loss order
stop_loss = exchange.order(
    name="ADA",
    is_buy=False,
    sz=100.0,
    limit_px=0.8500,
    order_type={
        "trigger": {
            "triggerPx": 0.8500,
            "isMarket": True,
            "tpsl": "sl"
        }
    },
    reduce_only=True
)
```

### 2. Cancel Order
```python
# Cancel by order ID
result = exchange.cancel(
    name="ADA",
    oid=123456789
)

# Cancel by client order ID
result = exchange.cancel_by_cloid(
    name="ADA",
    cloid="my_order_123"
)
```

### 3. Modify Order
```python
result = exchange.modify_order(
    oid=123456789,
    name="ADA",
    is_buy=True,
    sz=150.0,                        # New size
    limit_px=0.8800                 # New price
)
```

### 4. Update Leverage
```python
result = exchange.update_leverage(
    name="ADA",
    leverage=5,                      # 5x leverage
    is_cross=True                    # Use cross margin
)
```

### 5. Update Isolated Margin
```python
result = exchange.update_isolated_margin(
    name="ADA",
    amount=50.0                      # Add $50 margin
)
```

---

## 🚀 PRODUCTION API ENDPOINTS (Your Deployed Service)

### Base URL
```
https://misterlabs220-production.up.railway.app
```

### Authentication
```
Header: X-API-Key: mister_labs_220_tQm8Kx9pL3nR7vB2
```

### Available Endpoints

#### 1. Get Account Info
```bash
curl -H "X-API-Key: mister_labs_220_tQm8Kx9pL3nR7vB2" \
  https://misterlabs220-production.up.railway.app/account
```
**Returns:**
```json
{
  "balance": 100.0,      // Now shows vault balance
  "position": null,      // Or position details if open
  "trading_enabled": true
}
```

#### 2. Get Trading Signals
```bash
curl -H "X-API-Key: mister_labs_220_tQm8Kx9pL3nR7vB2" \
  https://misterlabs220-production.up.railway.app/signals
```

#### 3. Get Position Details
```bash
curl -H "X-API-Key: mister_labs_220_tQm8Kx9pL3nR7vB2" \
  https://misterlabs220-production.up.railway.app/position/details
```

#### 4. Enable/Disable Trading
```bash
# Enable
curl -X POST -H "X-API-Key: mister_labs_220_tQm8Kx9pL3nR7vB2" \
  https://misterlabs220-production.up.railway.app/trading/enable

# Disable
curl -X POST -H "X-API-Key: mister_labs_220_tQm8Kx9pL3nR7vB2" \
  https://misterlabs220-production.up.railway.app/trading/disable
```

#### 5. Get Configuration
```bash
curl -H "X-API-Key: mister_labs_220_tQm8Kx9pL3nR7vB2" \
  https://misterlabs220-production.up.railway.app/config
```

#### 6. WebSocket Real-time Updates
```javascript
const ws = new WebSocket('wss://misterlabs220-production.up.railway.app/ws');
ws.send(JSON.stringify({type: 'auth', apiKey: 'mister_labs_220_tQm8Kx9pL3nR7vB2'}));
```

---

## 🔍 MONITORING YOUR VAULT

### Complete Monitoring Script
```python
#!/usr/bin/env python3
from hyperliquid.info import Info
import json
from datetime import datetime

VAULT = "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"
info = Info(base_url="https://api.hyperliquid.xyz")

def get_complete_vault_status():
    """Get all vault information"""
    
    # 1. Basic state
    state = info.user_state(VAULT)
    balance = float(state['marginSummary']['accountValue'])
    
    # 2. Positions
    positions = []
    for pos in state['assetPositions']:
        if float(pos['position']['szi']) != 0:
            positions.append({
                'coin': pos['position']['coin'],
                'size': float(pos['position']['szi']),
                'entry': float(pos['position']['entryPx']),
                'pnl': float(pos['position']['unrealizedPnl']),
                'value': float(pos['position']['positionValue'])
            })
    
    # 3. Open orders
    orders = info.open_orders(VAULT) or []
    
    # 4. Recent fills
    try:
        fills = info.user_fills(VAULT) or []
        recent_fills = fills[:5]  # Last 5 trades
    except:
        recent_fills = []
    
    return {
        'timestamp': datetime.now().isoformat(),
        'vault_address': VAULT,
        'balance': balance,
        'positions': positions,
        'open_orders': len(orders),
        'recent_trades': len(recent_fills),
        'leverage': float(state['marginSummary']['accountLeverage']),
        'margin_used': float(state['marginSummary']['totalMarginUsed'])
    }

# Run monitoring
status = get_complete_vault_status()
print(json.dumps(status, indent=2))
```

---

## 📈 VAULT PERFORMANCE TRACKING

### Calculate ROI and Performance
```python
def calculate_vault_performance():
    INITIAL_DEPOSIT = 100.0  # Your initial funding
    
    state = info.user_state(VAULT)
    current_value = float(state['marginSummary']['accountValue'])
    
    # Calculate metrics
    pnl_dollar = current_value - INITIAL_DEPOSIT
    pnl_percent = (pnl_dollar / INITIAL_DEPOSIT) * 100
    
    # Get position metrics if any
    position_value = 0
    unrealized_pnl = 0
    for pos in state['assetPositions']:
        if float(pos['position']['szi']) != 0:
            position_value += abs(float(pos['position']['positionValue']))
            unrealized_pnl += float(pos['position']['unrealizedPnl'])
    
    return {
        'initial_capital': INITIAL_DEPOSIT,
        'current_value': current_value,
        'total_pnl': pnl_dollar,
        'roi_percent': pnl_percent,
        'position_value': position_value,
        'unrealized_pnl': unrealized_pnl,
        'realized_pnl': pnl_dollar - unrealized_pnl
    }
```

---

## ⚠️ IMPORTANT NOTES

### What You CAN'T Do via API:
1. **Withdraw funds** - Must use Hyperliquid UI
2. **Change vault settings** - Fees, name, etc. via UI only
3. **View depositor list** - Not exposed via API
4. **Transfer leadership** - UI only
5. **Create new vaults** - UI only

### Security Considerations:
1. **Never share your private key**
2. **Vault address is public** - Anyone can view balance/positions
3. **Only leader can trade** - Requires your private key
4. **API key for production** - Keep secure: `mister_labs_220_tQm8Kx9pL3nR7vB2`

### Rate Limits:
- Info API: ~100 requests/second
- Exchange API: ~10 orders/second
- WebSocket: 1 connection per IP

---

## 🎯 QUICK REFERENCE

```python
# Essential addresses and endpoints
VAULT_ADDRESS = "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"
LEADER_WALLET = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74"
HYPERLIQUID_API = "https://api.hyperliquid.xyz"
PRODUCTION_API = "https://misterlabs220-production.up.railway.app"
API_KEY = "mister_labs_220_tQm8Kx9pL3nR7vB2"

# Quick check vault status
from hyperliquid.info import Info
info = Info(base_url=HYPERLIQUID_API)
state = info.user_state(VAULT_ADDRESS)
print(f"Vault Balance: ${state['marginSummary']['accountValue']}")
```

---

**This document contains EVERY API endpoint and method available for interacting with your Hyperliquid vault.**