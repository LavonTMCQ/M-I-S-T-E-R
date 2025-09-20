# 🔥 URGENT: Production Algorithm Vault Fix

## 🔴 CURRENT ISSUE
**The production algorithm is using the WRONG balance!**
- **Currently using**: Leader wallet balance = $16.37
- **Should be using**: Vault balance = $100.00
- **Impact**: Algorithm is severely under-utilizing available capital

## ✅ THE FIX (Deploy to Railway)

### In `misterlabs-algo-service/algorithm_core.py`:

#### 1. Add Vault Address to `__init__`:
```python
def __init__(self, private_key: str, webhook_url: str = None):
    # Existing code...
    self.account = Account.from_key(private_key)
    self.address = self.account.address
    
    # ADD THIS LINE:
    self.vault_address = "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"  # MISTERLABS Vault
    
    # Rest of existing code...
```

#### 2. Update `get_account_value()`:
```python
def get_account_value(self) -> float:
    """Get account value in USDC from vault, not leader wallet"""
    try:
        # CHANGE FROM: self.address
        # CHANGE TO: self.vault_address
        user_state = self.info.user_state(self.vault_address)
        return float(user_state["marginSummary"]["accountValue"])
    except Exception as e:
        logger.error(f"Error getting vault value: {e}")
        # Fallback to leader wallet if vault query fails
        user_state = self.info.user_state(self.address)
        return float(user_state["marginSummary"]["accountValue"])
```

#### 3. Update `get_position()`:
```python
def get_position(self) -> Optional[Dict]:
    """Get open position from vault"""
    try:
        # CHANGE FROM: self.address
        # CHANGE TO: self.vault_address
        user_state = self.info.user_state(self.vault_address)
        positions = user_state["assetPositions"]
        
        for position_data in positions:
            pos = position_data["position"]
            if float(pos["szi"]) != 0:  # Has open position
                return {
                    "coin": pos["coin"],
                    "size": float(pos["szi"]),
                    "entryPx": float(pos["entryPx"]),
                    "positionValue": float(pos["positionValue"]),
                    "unrealizedPnl": float(pos["unrealizedPnl"]),
                    "returnOnEquity": float(pos["returnOnEquity"])
                }
        return None
    except Exception as e:
        logger.error(f"Error getting vault position: {e}")
        return None
```

#### 4. Update `check_stop_loss()` and `check_take_profit()`:
```python
def check_stop_loss(self) -> Dict:
    """Check stop loss orders in vault"""
    try:
        # CHANGE FROM: self.address
        # CHANGE TO: self.vault_address
        open_orders = self.info.open_orders(self.vault_address)
        # Rest of code stays the same...
```

## 🚀 DEPLOYMENT STEPS

### 1. Update the code in GitHub:
```bash
cd misterlabs-algo-service
# Make the changes above to algorithm_core.py
git add algorithm_core.py
git commit -m "Fix: Query vault address for balance instead of leader wallet"
git push origin main
```

### 2. Railway will auto-deploy (wait 2-3 minutes)

### 3. Verify the fix:
```bash
# Check that balance now shows $100 instead of $16
curl -H "X-API-Key: mister_labs_220_tQm8Kx9pL3nR7vB2" \
  https://misterlabs220-production.up.railway.app/account
```

## 📊 EXPECTED RESULTS AFTER FIX

### Before Fix (Current):
```json
{
  "balance": 16.366968,  // Leader wallet
  "position": null
}
```

### After Fix (Expected):
```json
{
  "balance": 100.00,  // Vault balance
  "position": null    // Or vault positions if any
}
```

## ⚠️ IMPORTANT NOTES

1. **Trading still uses leader's private key** - This doesn't change
2. **Orders are signed by leader** - But affect vault positions
3. **Monitor vault positions** - Not leader positions
4. **Dynamic sizing will now work correctly** - Based on $100 not $16

## 🔍 HOW IT WORKS

```
Leader Wallet (0x8B25b3c7...)
    ↓ Signs transactions
    ↓ Uses private key
    ↓
Vault Account (0xf22e1753...)
    ↓ Holds the funds ($100)
    ↓ Shows the positions
    ↓ Tracks P&L
```

## 🎯 KEY INSIGHT

**The leader wallet is like a "remote control" for the vault:**
- Leader signs with their private key
- But queries vault for balance/positions
- Trades execute on vault, not leader
- This is how Hyperliquid vault architecture works!

## 📈 IMPACT OF THIS FIX

### Current (Broken):
- Algorithm sees: $16.37
- Position size: ~15-20 ADA
- Capital utilization: 16% of available

### After Fix:
- Algorithm sees: $100.00
- Position size: ~100-150 ADA
- Capital utilization: 100% of available
- **6x larger positions!**

## 🔄 TESTING THE FIX

After deployment, the algorithm should:
1. Report $100 balance (not $16)
2. Calculate positions based on $100
3. Place trades that affect vault (not leader)
4. Show positions in vault account

## 🚨 URGENT ACTION REQUIRED

**Deploy this fix immediately to:**
1. Properly utilize the $100 in vault capital
2. Trade with correct position sizes
3. Track positions in the right account
4. Enable proper vault trading

---

**This is a critical fix that will 6x your trading capacity!**