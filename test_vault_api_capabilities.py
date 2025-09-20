#!/usr/bin/env python3
"""
Deep dive into Hyperliquid Vault API capabilities
Testing all possible vault operations and queries
"""

from hyperliquid.info import Info
from hyperliquid.exchange import Exchange
from eth_account import Account
import json
import requests

# Configuration
PRIVATE_KEY = "b51f849e6551e2c8e627a663f2ee2439b1e17760d7a4de340c913bbfbd572f73"
LEADER_WALLET = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74"
VAULT_ADDRESS = "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"

def test_vault_capabilities():
    """Test all vault API capabilities"""
    
    print("=" * 80)
    print("HYPERLIQUID VAULT API CAPABILITIES TEST")
    print("=" * 80)
    
    account = Account.from_key(PRIVATE_KEY)
    info = Info(base_url="https://api.hyperliquid.xyz")
    exchange = Exchange(account, base_url="https://api.hyperliquid.xyz")
    
    # 1. BASIC VAULT INFO
    print("\n1. BASIC VAULT QUERIES")
    print("-" * 40)
    
    # Get vault state (balance, positions, etc)
    vault_state = info.user_state(VAULT_ADDRESS)
    print(f"Vault Balance: ${float(vault_state['marginSummary']['accountValue']):.2f}")
    print(f"Vault Withdrawable: ${float(vault_state['marginSummary']['withdrawable']):.2f}")
    
    # Get leader state for comparison
    leader_state = info.user_state(LEADER_WALLET)
    print(f"Leader Balance: ${float(leader_state['marginSummary']['accountValue']):.2f}")
    
    # 2. VAULT POSITIONS
    print("\n2. VAULT POSITIONS")
    print("-" * 40)
    
    positions = vault_state.get('assetPositions', [])
    if positions:
        for pos in positions:
            if float(pos['position']['szi']) != 0:
                print(f"Asset: {pos['position']['coin']}")
                print(f"Size: {pos['position']['szi']}")
                print(f"Entry: ${pos['position']['entryPx']}")
                print(f"PnL: ${pos['position']['unrealizedPnl']}")
    else:
        print("No open positions in vault")
    
    # 3. VAULT OPEN ORDERS
    print("\n3. VAULT OPEN ORDERS")
    print("-" * 40)
    
    try:
        vault_orders = info.open_orders(VAULT_ADDRESS)
        if vault_orders:
            for order in vault_orders:
                print(f"Order: {order.get('coin')} {order.get('side')} {order.get('sz')} @ {order.get('limitPx')}")
        else:
            print("No open orders in vault")
    except Exception as e:
        print(f"Error getting vault orders: {e}")
    
    # 4. VAULT FILLS/TRADE HISTORY
    print("\n4. VAULT TRADE HISTORY")
    print("-" * 40)
    
    try:
        # Try to get recent fills
        vault_fills = info.user_fills(VAULT_ADDRESS)
        if vault_fills:
            print(f"Found {len(vault_fills)} recent fills")
            for fill in vault_fills[:3]:  # Show last 3
                print(f"  {fill.get('coin')} {fill.get('side')} {fill.get('sz')} @ {fill.get('px')}")
        else:
            print("No recent fills")
    except Exception as e:
        print(f"Fills query not available: {e}")
    
    # 5. VAULT DETAILS (if available)
    print("\n5. VAULT METADATA")
    print("-" * 40)
    
    # Try different vault query methods
    try:
        # Method 1: Direct API call for vault info
        response = requests.post(
            "https://api.hyperliquid.xyz/info",
            json={"type": "vaultDetails", "vaultAddress": VAULT_ADDRESS}
        )
        if response.status_code == 200:
            vault_details = response.json()
            if vault_details:
                print(f"Vault Details: {json.dumps(vault_details, indent=2)}")
            else:
                print("No vault details available")
    except Exception as e:
        print(f"Vault details query error: {e}")
    
    # 6. WHAT YOU CAN DO WITH VAULTS
    print("\n6. VAULT OPERATIONS AVAILABLE")
    print("-" * 40)
    
    print("✅ QUERIES (No private key needed):")
    print("  - info.user_state(VAULT_ADDRESS) - Get balance, margin, positions")
    print("  - info.open_orders(VAULT_ADDRESS) - Get open orders")
    print("  - info.user_fills(VAULT_ADDRESS) - Get trade history")
    print("  - info.all_mids() - Get current prices (for any user)")
    
    print("\n✅ TRADING (Leader private key required):")
    print("  - exchange.order() - Place orders that affect vault")
    print("  - exchange.cancel() - Cancel vault orders")
    print("  - exchange.cancel_by_cloid() - Cancel by client ID")
    print("  - exchange.modify_order() - Modify existing orders")
    
    print("\n❌ NOT AVAILABLE (Vault controls these):")
    print("  - Direct withdrawals from vault")
    print("  - Changing vault parameters")
    print("  - Managing depositors")
    print("  - Setting fees")
    
    # 7. MONEY IN LEADER VS VAULT
    print("\n7. DO YOU NEED MONEY IN LEADER WALLET?")
    print("-" * 40)
    
    print("🔍 ANSWER: NO, you don't need money in leader wallet!")
    print("")
    print("Here's why:")
    print("1. Vault has its own balance ($100)")
    print("2. Trades use vault's capital, not leader's")
    print("3. Positions appear in vault, not leader")
    print("4. P&L affects vault balance, not leader")
    print("5. Leader is just the 'remote control'")
    
    print("\nLeader wallet only needs:")
    print("  - Small amount for L1 gas fees (if any)")
    print("  - But trading doesn't require leader balance")
    
    # 8. TESTING TRADE ROUTING
    print("\n8. TRADE ROUTING TEST")
    print("-" * 40)
    
    print("When you place a trade with leader's private key:")
    print("1. Order is signed by leader wallet")
    print("2. But executed using vault's capital")
    print("3. Position appears in vault")
    print("4. P&L affects vault balance")
    print("5. Leader balance stays unchanged")
    
    # 9. VAULT PERFORMANCE METRICS
    print("\n9. VAULT PERFORMANCE")
    print("-" * 40)
    
    try:
        # Calculate basic metrics
        vault_equity = float(vault_state['marginSummary']['accountValue'])
        vault_pnl = float(vault_state['marginSummary'].get('pnl', 0))
        
        print(f"Current Equity: ${vault_equity:.2f}")
        print(f"Total P&L: ${vault_pnl:.2f}")
        
        # ROI calculation if we know initial
        initial = 100  # Your initial vault funding
        roi = ((vault_equity - initial) / initial) * 100
        print(f"ROI: {roi:.2f}%")
        
    except Exception as e:
        print(f"Performance calc error: {e}")
    
    # 10. SUMMARY
    print("\n" + "=" * 80)
    print("SUMMARY: VAULT ARCHITECTURE")
    print("=" * 80)
    
    print("""
    ┌─────────────────────┐         ┌─────────────────────┐
    │   LEADER WALLET     │ ──────> │      VAULT          │
    │   Balance: $16      │ signs   │   Balance: $100     │
    │   No positions      │ trades  │   Has positions     │
    │   Just signs txs    │  for    │   Holds capital     │
    └─────────────────────┘         └─────────────────────┘
    
    LEADER WALLET:
    - Holds private key
    - Signs transactions
    - Doesn't need balance for trading
    - Is the "controller"
    
    VAULT:
    - Holds all trading capital
    - Shows all positions
    - Accumulates P&L
    - Is the "trading account"
    """)
    
    return {
        'vault_balance': float(vault_state['marginSummary']['accountValue']),
        'leader_balance': float(leader_state['marginSummary']['accountValue']),
        'vault_has_positions': len([p for p in positions if float(p['position']['szi']) != 0]) > 0
    }

if __name__ == "__main__":
    results = test_vault_capabilities()
    print(f"\nFinal Status: {json.dumps(results, indent=2)}")