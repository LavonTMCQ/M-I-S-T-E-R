# 🏦 HYPERLIQUID VAULT API - COMPLETE GUIDE

## 🎯 YOUR KEY QUESTIONS ANSWERED

### 1. ❌ Do you need money in the leader wallet?
**NO!** You don't need trading capital in the leader wallet.
- Leader wallet only needs tiny amounts for L1 gas (if any)
- All trading capital stays in the vault ($100)
- Leader is just the "signing key" not the "money holder"

### 2. ✅ Will trades show in the vault?
**YES!** All trades and positions appear in the vault, NOT in the leader wallet.
- When you trade, positions appear in vault account
- P&L accumulates in vault balance
- Leader wallet shows no positions or P&L

### 3. 🔍 How the Architecture Works

```
LEADER WALLET (0x8B25b3c7...)     VAULT (0xf22e1753...)
├── Balance: $16.38               ├── Balance: $100.00
├── Positions: NONE               ├── Positions: ALL HERE
├── Role: Signs trades            ├── Role: Holds capital
└── Private Key: YOU HAVE         └── Private Key: HYPERLIQUID HAS
```

**The Flow:**
1. Your algo uses leader's private key to sign
2. But queries vault for balance/positions
3. Trades execute using vault's capital
4. Positions appear in vault
5. P&L affects vault balance

---

## 📊 VAULT API ENDPOINTS - WHAT YOU CAN DO

### ✅ QUERIES (No Private Key Needed - Anyone Can Query)

#### 1. **Get Vault Balance & Margin**
```python
vault_state = info.user_state("0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0")
balance = float(vault_state["marginSummary"]["accountValue"])
```
Returns:
- `accountValue`: Total vault equity ($100)
- `totalMarginUsed`: Margin used for positions
- `totalNtlPos`: Total notional position
- `totalRawUsd`: Raw USD balance

#### 2. **Get Vault Positions**
```python
positions = vault_state["assetPositions"]
for pos in positions:
    if float(pos["position"]["szi"]) != 0:
        print(f"{pos['position']['coin']}: {pos['position']['szi']}")
```
Returns for each position:
- `coin`: Asset (e.g., "ADA")
- `szi`: Position size
- `entryPx`: Entry price
- `unrealizedPnl`: Current P&L
- `returnOnEquity`: ROE percentage

#### 3. **Get Vault Open Orders**
```python
vault_orders = info.open_orders("0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0")
```
Returns all pending orders in vault

#### 4. **Get Vault Trade History**
```python
vault_fills = info.user_fills("0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0")
```
Returns recent fills/trades

#### 5. **Get Vault Funding History**
```python
funding = info.user_funding("0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0")
```
Returns funding payments for perpetuals

---

### ✅ TRADING OPERATIONS (Leader Private Key Required)

#### 1. **Place Orders (Affects Vault)**
```python
# YOU sign with leader key, but trade affects VAULT
exchange = Exchange(leader_account, base_url="https://api.hyperliquid.xyz")
order = exchange.order(
    name="ADA",
    is_buy=True,
    sz=100.0,  # Uses vault's $100, not leader's $16
    limit_px=0.87,
    order_type={"limit": {"tif": "Ioc"}}
)
```

#### 2. **Cancel Orders (In Vault)**
```python
# Cancel vault's orders using leader's signature
exchange.cancel(name="ADA", oid=order_id)
```

#### 3. **Modify Orders**
```python
exchange.modify_order(
    oid=order_id,
    name="ADA",
    is_buy=True,
    sz=100.0,
    limit_px=0.88
)
```

#### 4. **Update Leverage**
```python
exchange.update_leverage(
    name="ADA",
    leverage=5,
    is_cross=True  # Cross margin mode
)
```

---

### ❌ WHAT YOU CANNOT DO VIA API

These require Hyperliquid UI or special permissions:

1. **Withdraw from Vault** - Must use Hyperliquid UI
2. **Change Vault Parameters** - Management fee, performance fee, etc.
3. **Accept/Reject Depositors** - If vault has restrictions
4. **Transfer Vault Leadership** - Cannot change who controls vault
5. **Access Vault Private Key** - Hyperliquid controls this
6. **Direct Vault Creation** - Must use UI to create new vaults

---

## 🔄 PRACTICAL EXAMPLES

### Example 1: Check Vault Health
```python
from hyperliquid.info import Info

info = Info(base_url="https://api.hyperliquid.xyz")
vault = "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"

# Get everything about vault
state = info.user_state(vault)

print(f"Balance: ${state['marginSummary']['accountValue']}")
print(f"Positions: {len([p for p in state['assetPositions'] if float(p['position']['szi']) != 0])}")
print(f"Open Orders: {len(info.open_orders(vault) or [])}")
```

### Example 2: Monitor Vault P&L
```python
# Track vault performance
initial_balance = 100.0  # What you started with
current = float(info.user_state(vault)['marginSummary']['accountValue'])
pnl = current - initial_balance
roi = (pnl / initial_balance) * 100

print(f"Vault P&L: ${pnl:.2f} ({roi:.2f}%)")
```

### Example 3: Trade with Vault Capital
```python
from eth_account import Account
from hyperliquid.exchange import Exchange

# Use LEADER key to trade VAULT capital
leader_key = "your_private_key"
account = Account.from_key(leader_key)
exchange = Exchange(account, base_url="https://api.hyperliquid.xyz")

# This trade uses vault's $100, not leader's $16
order = exchange.order(
    name="ADA",
    is_buy=True,
    sz=100.0,  # Can trade up to vault balance
    limit_px=0.87,
    order_type={"limit": {"tif": "Ioc"}}
)

# Position appears in VAULT, not leader
```

---

## 📈 VAULT MONITORING ENDPOINTS

### For Your Dashboard/Monitoring:

```python
def get_vault_metrics():
    vault = "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"
    state = info.user_state(vault)
    
    return {
        "balance": float(state['marginSummary']['accountValue']),
        "positions": [{
            "coin": p['position']['coin'],
            "size": float(p['position']['szi']),
            "entry": float(p['position']['entryPx']),
            "pnl": float(p['position']['unrealizedPnl'])
        } for p in state['assetPositions'] if float(p['position']['szi']) != 0],
        "open_orders": len(info.open_orders(vault) or []),
        "margin_used": float(state['marginSummary']['totalMarginUsed']),
        "account_leverage": float(state['marginSummary']['accountLeverage'])
    }
```

---

## 🎯 KEY INSIGHTS

### The Vault Model is PERFECT for Your Use Case:

1. **Separation of Concerns**
   - Leader: Just signs (needs minimal balance)
   - Vault: Holds capital and positions
   - Clean separation between control and capital

2. **Security**
   - Your private key never touches vault funds directly
   - Vault is isolated from your personal trading
   - Clear audit trail

3. **Scalability**
   - Vault can grow to millions without affecting leader
   - Other users can deposit without touching your wallet
   - Performance tracked independently

4. **The Money Flow**
   ```
   Depositors → VAULT ($100+) → Your Algo Trades → P&L in VAULT
                  ↑
            Leader just signs
           (doesn't need money)
   ```

---

## 🚀 WHAT THIS MEANS FOR YOU

### NOW (With Fix Deployed):
- ✅ Your algo queries vault for $100 balance
- ✅ Trades execute with vault capital
- ✅ Positions appear in vault
- ✅ P&L accumulates in vault
- ✅ Leader wallet can stay empty (except gas)

### YOU DON'T NEED TO:
- ❌ Keep money in leader wallet for trading
- ❌ Transfer between leader and vault
- ❌ Worry about leader balance

### THE VAULT HANDLES:
- ✅ All trading capital
- ✅ All positions
- ✅ All P&L
- ✅ All trade history

---

## 📊 COMPLETE API REFERENCE

### Info API (Queries)
```python
info.user_state(vault_address)          # Balance, positions, margin
info.open_orders(vault_address)         # Pending orders
info.user_fills(vault_address)          # Trade history
info.user_funding(vault_address)        # Funding payments
info.all_mids()                         # Current prices (any user)
info.l2_book("ADA")                     # Order book depth
info.trades("ADA")                      # Recent trades
```

### Exchange API (Trading - Requires Leader Key)
```python
exchange.order(...)                     # Place order
exchange.cancel(...)                    # Cancel order
exchange.cancel_by_cloid(...)          # Cancel by client ID
exchange.modify_order(...)             # Modify existing order
exchange.update_leverage(...)          # Change leverage
exchange.update_isolated_margin(...)   # Adjust margin
```

### Vault-Specific Queries (No standard API yet)
- Vault metadata (name, description, fees) - Limited
- Depositor list - Not available via API
- Historical performance - Calculate from user_state
- Vault creation/modification - UI only

---

## 🎉 BOTTOM LINE

**Your vault setup is now PERFECT:**
1. Leader wallet signs but doesn't need money
2. Vault holds all capital ($100)
3. All trades affect vault, not leader
4. You can monitor everything via API
5. The fix we deployed makes this work correctly

**The vault IS your trading account. The leader is just the remote control!**