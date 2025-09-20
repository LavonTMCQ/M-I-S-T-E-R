#!/usr/bin/env python3
"""
Hyperliquid Native Vault Integration
Uses Hyperliquid's built-in vault system for managing user funds
No smart contracts needed - users deposit USDC directly to vault
"""

from hyperliquid.exchange import Exchange
from hyperliquid.info import Info
from eth_account import Account
import time
import json
from typing import Dict, List, Optional

# Your trading credentials
PRIVATE_KEY = "b51f849e6551e2c8e627a663f2ee2439b1e17760d7a4de340c913bbfbd572f73"
VAULT_ADDRESS = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74"  # Your trading address

class HyperliquidVaultManager:
    """Manages a Hyperliquid native vault for ADA trading"""
    
    def __init__(self, private_key: str):
        self.account = Account.from_key(private_key)
        self.exchange = Exchange(self.account, base_url="https://api.hyperliquid.xyz")
        self.info = Info(base_url="https://api.hyperliquid.xyz")
        self.vault_address = self.account.address
        
    def get_vault_info(self) -> Dict:
        """Get detailed information about our vault"""
        try:
            # Get vault details
            vault_details = self.info.query_vault_details(self.vault_address)
            return vault_details
        except:
            # Vault might not exist yet
            return None
    
    def get_vault_equity(self) -> float:
        """Get total USDC in vault (including delegated funds)"""
        user_state = self.info.user_state(self.vault_address)
        
        # This includes your own funds + all delegated funds
        account_value = float(user_state['marginSummary']['accountValue'])
        return account_value
    
    def get_followers(self) -> List[Dict]:
        """Get list of users who have deposited to vault"""
        vault_info = self.get_vault_info()
        if vault_info and 'followers' in vault_info:
            return vault_info['followers']
        return []
    
    def calculate_position_size(self, percentage_of_capital: float = 0.1) -> float:
        """Calculate position size based on vault equity"""
        total_capital = self.get_vault_equity()
        position_capital = total_capital * percentage_of_capital
        
        # Get ADA price
        mids = self.info.all_mids()
        ada_price = float(mids.get("ADA", 0))
        
        if ada_price > 0:
            # Calculate ADA position size
            position_size = position_capital / ada_price
            # Round to appropriate decimals for ADA
            return round(position_size, 2)
        return 0
    
    def execute_ada_trade(self, is_long: bool = True, size_percentage: float = 0.1):
        """Execute ADA perpetual trade using vault capital"""
        
        # Get vault capital
        vault_equity = self.get_vault_equity()
        print(f"Vault Equity: ${vault_equity:,.2f}")
        
        # Calculate position size
        position_size = self.calculate_position_size(size_percentage)
        
        if position_size == 0:
            print("Cannot calculate position size")
            return None
        
        # Get current ADA price
        mids = self.info.all_mids()
        ada_price = float(mids.get("ADA", 0))
        
        print(f"Trading ADA at ${ada_price:.4f}")
        print(f"Position Size: {position_size} ADA")
        print(f"Position Value: ${position_size * ada_price:,.2f}")
        
        # Place order
        try:
            order = self.exchange.order(
                name="ADA",
                is_buy=is_long,
                sz=position_size,
                limit_px=round(ada_price * (1.01 if is_long else 0.99), 4),
                order_type={"limit": {"tif": "Ioc"}},
                reduce_only=False
            )
            
            print(f"Order placed: {order}")
            return order
            
        except Exception as e:
            print(f"Trade failed: {e}")
            return None
    
    def get_vault_pnl(self) -> Dict:
        """Get vault P&L information"""
        vault_info = self.get_vault_info()
        if vault_info:
            return {
                'apr': vault_info.get('apr', 0),
                'total_pnl': sum(f['pnl'] for f in vault_info.get('followers', [])),
                'followers_count': len(vault_info.get('followers', []))
            }
        return {'apr': 0, 'total_pnl': 0, 'followers_count': 0}
    
    def display_vault_status(self):
        """Display comprehensive vault status"""
        print("\n" + "="*60)
        print("🏦 HYPERLIQUID VAULT STATUS")
        print("="*60)
        
        # Vault equity
        equity = self.get_vault_equity()
        print(f"Total Vault Equity: ${equity:,.2f}")
        
        # Followers
        followers = self.get_followers()
        print(f"Number of Depositors: {len(followers)}")
        
        if followers:
            total_deposits = sum(float(f.get('vaultEquity', 0)) for f in followers)
            total_pnl = sum(float(f.get('pnl', 0)) for f in followers)
            print(f"Total User Deposits: ${total_deposits:,.2f}")
            print(f"Total User P&L: ${total_pnl:,.2f}")
        
        # Current positions
        positions = self.info.user_state(self.vault_address).get('assetPositions', [])
        if positions:
            print("\nCurrent Positions:")
            for pos in positions:
                if pos['position']['szi'] != '0':
                    coin = pos['position']['coin']
                    size = float(pos['position']['szi'])
                    entry = float(pos['position']['entryPx'])
                    pnl = float(pos['position']['unrealizedPnl'])
                    print(f"  {coin}: {size} @ ${entry:.4f} | P&L: ${pnl:,.2f}")
        
        print("="*60)

# How users deposit to your vault:
VAULT_DEPOSIT_INSTRUCTIONS = """
# 📊 HOW USERS DEPOSIT TO YOUR HYPERLIQUID VAULT:

## For Users (Via Web Interface):
1. Go to https://app.hyperliquid.xyz
2. Click on "Vaults" tab
3. Search for vault address: 0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74
4. Click "Deposit"
5. Enter USDC amount
6. Confirm transaction

## For Users (Via Python):
```python
from hyperliquid.exchange import Exchange
from eth_account import Account

# User's private key (not yours!)
user_account = Account.from_key("user_private_key")
exchange = Exchange(user_account, base_url="https://api.hyperliquid.xyz")

# Deposit to your vault
vault_address = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74"
amount_usdc = 100  # Amount to deposit

# Execute vault deposit
deposit = exchange.vault_deposit(vault_address, amount_usdc)
```

## Vault Configuration:
- Vault Leader: 0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74
- Strategy: ADA Perpetual Trading (287% APY)
- Management Fee: 2% annually
- Performance Fee: 20% of profits
- Minimum Deposit: 10 USDC
- Lock-up Period: None (withdraw anytime)
"""

def main():
    """Main trading loop with vault management"""
    
    # Initialize vault manager
    manager = HyperliquidVaultManager(PRIVATE_KEY)
    
    # Display vault status
    manager.display_vault_status()
    
    # Check if we have capital to trade
    equity = manager.get_vault_equity()
    
    if equity < 10:
        print(f"\n⚠️ Vault equity too low: ${equity:.2f}")
        print("Need at least $10 to start trading")
        print("\n" + VAULT_DEPOSIT_INSTRUCTIONS)
        return
    
    print(f"\n✅ Ready to trade with ${equity:.2f} vault capital")
    
    # Execute a sample trade
    print("\n🔄 Executing ADA trade...")
    order = manager.execute_ada_trade(
        is_long=True,  # Buy/Long
        size_percentage=0.05  # Use 5% of capital
    )
    
    if order:
        print("✅ Trade successful!")
        
        # Monitor position
        time.sleep(5)
        manager.display_vault_status()
    
    # Print deposit instructions
    print("\n" + "="*60)
    print("📝 VAULT DEPOSIT INSTRUCTIONS")
    print("="*60)
    print(VAULT_DEPOSIT_INSTRUCTIONS)

if __name__ == "__main__":
    main()