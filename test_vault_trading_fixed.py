#!/usr/bin/env python3
"""
Test script to verify Hyperliquid vault trading mechanics
"""

from hyperliquid.exchange import Exchange
from hyperliquid.info import Info
from eth_account import Account
import json
import time

# Your private key (leader wallet)
PRIVATE_KEY = "b51f849e6551e2c8e627a663f2ee2439b1e17760d7a4de340c913bbfbd572f73"

# Addresses
LEADER_WALLET = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74"
VAULT_ADDRESS = "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"

def test_vault_trading():
    """Test actual trading through vault"""
    
    print("=" * 80)
    print("HYPERLIQUID VAULT TRADING TEST")
    print("=" * 80)
    
    # Initialize with leader private key
    account = Account.from_key(PRIVATE_KEY)
    info = Info(base_url="https://api.hyperliquid.xyz")
    exchange = Exchange(account, base_url="https://api.hyperliquid.xyz")
    
    print(f"\nLeader Wallet: {account.address}")
    print(f"Vault Address: {VAULT_ADDRESS}")
    
    # Get initial balances
    print("\n" + "=" * 40)
    print("INITIAL BALANCES")
    print("=" * 40)
    
    leader_state = info.user_state(account.address)
    vault_state = info.user_state(VAULT_ADDRESS)
    
    leader_balance = float(leader_state['marginSummary']['accountValue'])
    vault_balance = float(vault_state['marginSummary']['accountValue'])
    
    print(f"Leader Balance: ${leader_balance:.2f}")
    print(f"Vault Balance: ${vault_balance:.2f}")
    
    # Test trading
    print("\n" + "=" * 40)
    print("TRADING TEST")
    print("=" * 40)
    
    # Get ADA price
    mids = info.all_mids()
    ada_price = float(mids.get("ADA", 0))
    
    if ada_price == 0:
        print("❌ Could not get ADA price")
        return
    
    print(f"Current ADA Price: ${ada_price:.4f}")
    
    # Calculate tiny position (10 ADA)
    test_size = 10.0  # Small test position
    
    print(f"\nAttempting to place test trade:")
    print(f"  - Size: {test_size} ADA")
    print(f"  - Value: ${test_size * ada_price:.2f}")
    print(f"  - Direction: Long (Buy)")
    
    # Try to place a test order
    try:
        # First approach: Standard order from leader
        print("\n1. Testing standard order from leader...")
        order = exchange.order(
            name="ADA",
            is_buy=True,
            sz=test_size,
            limit_px=round(ada_price * 1.01, 4),  # 1% above market
            order_type={"limit": {"tif": "Ioc"}},
            reduce_only=False
        )
        
        print(f"Order response: {json.dumps(order, indent=2)}")
        
        # Wait a moment for order to process
        time.sleep(2)
        
        # Check where the position appears
        print("\n" + "=" * 40)
        print("POST-TRADE POSITION CHECK")
        print("=" * 40)
        
        # Check leader positions
        leader_state_after = info.user_state(account.address)
        leader_positions_after = leader_state_after.get('assetPositions', [])
        
        print(f"Leader Positions: {len(leader_positions_after)}")
        for pos in leader_positions_after:
            if float(pos['position']['szi']) != 0:
                print(f"  - {pos['position']['coin']}: {pos['position']['szi']}")
        
        # Check vault positions
        vault_state_after = info.user_state(VAULT_ADDRESS)
        vault_positions_after = vault_state_after.get('assetPositions', [])
        
        print(f"Vault Positions: {len(vault_positions_after)}")
        for pos in vault_positions_after:
            if float(pos['position']['szi']) != 0:
                print(f"  - {pos['position']['coin']}: {pos['position']['szi']}")
        
        # Analysis
        print("\n" + "=" * 40)
        print("ANALYSIS")
        print("=" * 40)
        
        leader_has_position = any(float(p['position']['szi']) != 0 for p in leader_positions_after)
        vault_has_position = any(float(p['position']['szi']) != 0 for p in vault_positions_after)
        
        if leader_has_position and not vault_has_position:
            print("✅ Position appeared in LEADER wallet")
            print("⚠️ This means standard trading affects leader, not vault")
            print("📝 Solution: Need to specify vault as trading account")
        elif vault_has_position and not leader_has_position:
            print("✅ Position appeared in VAULT")
            print("✅ Leader successfully traded for vault!")
        elif leader_has_position and vault_has_position:
            print("⚠️ Positions in BOTH accounts")
            print("📝 This suggests copy trading mechanism")
        else:
            print("❌ No positions found")
            print("📝 Trade may have failed or been too small")
        
        # Clean up - close any positions
        print("\n" + "=" * 40)
        print("CLEANUP")
        print("=" * 40)
        
        # Close leader position if exists
        for pos in leader_positions_after:
            if float(pos['position']['szi']) != 0:
                size = abs(float(pos['position']['szi']))
                print(f"Closing leader position: {size} ADA")
                exchange.order(
                    name="ADA",
                    is_buy=False,  # Sell to close long
                    sz=size,
                    limit_px=round(ada_price * 0.99, 4),
                    order_type={"limit": {"tif": "Ioc"}},
                    reduce_only=True
                )
        
        # Note: We can't directly close vault position without vault's private key
        
    except Exception as e:
        print(f"❌ Trade failed: {e}")
        print("\nThis error might indicate:")
        print("1. Insufficient balance in the account")
        print("2. API permission issues")
        print("3. Need different approach for vault trading")
    
    # Final recommendation
    print("\n" + "=" * 80)
    print("RECOMMENDED SOLUTION")
    print("=" * 80)
    
    print("\nBased on testing, the solution is:")
    print("\n1. UPDATE algorithm to query VAULT for balance:")
    print("   vault_state = info.user_state(VAULT_ADDRESS)")
    print("   balance = vault_state['marginSummary']['accountValue']")
    
    print("\n2. TRADING approach depends on test results:")
    print("   - If position appeared in leader: Need vault trading method")
    print("   - If position appeared in vault: Current approach works!")
    print("   - If no position: Check for errors or permissions")
    
    print("\n3. MONITOR positions in VAULT, not leader:")
    print("   positions = info.user_state(VAULT_ADDRESS)['assetPositions']")

if __name__ == "__main__":
    test_vault_trading()