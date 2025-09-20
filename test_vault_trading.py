#!/usr/bin/env python3
"""
Test script to understand Hyperliquid vault trading mechanics
"""

from hyperliquid.exchange import Exchange
from hyperliquid.info import Info
from eth_account import Account
import json

# Your private key (leader wallet)
PRIVATE_KEY = "b51f849e6551e2c8e627a663f2ee2439b1e17760d7a4de340c913bbfbd572f73"

# Addresses
LEADER_WALLET = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74"
VAULT_ADDRESS = "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"

def test_vault_architecture():
    """Test and understand vault architecture"""
    
    print("=" * 80)
    print("HYPERLIQUID VAULT ARCHITECTURE TEST")
    print("=" * 80)
    
    # Initialize with leader private key
    account = Account.from_key(PRIVATE_KEY)
    info = Info(base_url="https://api.hyperliquid.xyz")
    
    print(f"\nLeader Wallet: {account.address}")
    print(f"Vault Address: {VAULT_ADDRESS}")
    
    # Test 1: Get balances
    print("\n" + "=" * 40)
    print("TEST 1: BALANCE QUERIES")
    print("=" * 40)
    
    # Leader balance
    leader_state = info.user_state(account.address)
    leader_balance = float(leader_state['marginSummary']['accountValue'])
    print(f"Leader Balance: ${leader_balance:.2f}")
    
    # Vault balance
    vault_state = info.user_state(VAULT_ADDRESS)
    vault_balance = float(vault_state['marginSummary']['accountValue'])
    print(f"Vault Balance: ${vault_balance:.2f}")
    
    # Test 2: Get positions
    print("\n" + "=" * 40)
    print("TEST 2: POSITION QUERIES")
    print("=" * 40)
    
    leader_positions = leader_state.get('assetPositions', [])
    vault_positions = vault_state.get('assetPositions', [])
    
    print(f"Leader Positions: {len(leader_positions)}")
    for pos in leader_positions:
        if float(pos['position']['szi']) != 0:
            print(f"  - {pos['position']['coin']}: {pos['position']['szi']}")
    
    print(f"Vault Positions: {len(vault_positions)}")
    for pos in vault_positions:
        if float(pos['position']['szi']) != 0:
            print(f"  - {pos['position']['coin']}: {pos['position']['szi']}")
    
    # Test 3: Vault details
    print("\n" + "=" * 40)
    print("TEST 3: VAULT DETAILS")
    print("=" * 40)
    
    # Query vault details
    vault_details_response = info._post("/info", {"type": "vaultDetails", "vaultAddress": VAULT_ADDRESS})
    
    if vault_details_response:
        print(f"Vault Name: {vault_details_response.get('name', 'N/A')}")
        print(f"Vault Leader: {vault_details_response.get('leader', 'N/A')}")
        print(f"Description: {vault_details_response.get('description', 'N/A')}")
        
        # Check if leader matches
        if vault_details_response.get('leader', '').lower() == account.address.lower():
            print("✅ You are the vault leader!")
        else:
            print("❌ Leader mismatch!")
    
    # Test 4: Trading approach
    print("\n" + "=" * 40)
    print("TEST 4: TRADING APPROACH")
    print("=" * 40)
    
    print("\nBased on Hyperliquid architecture:")
    print("1. Vault is a SEPARATE account with its own address")
    print("2. Vault has its own balance and positions")
    print("3. Leader wallet controls the vault")
    print("\nTRADING OPTIONS:")
    print("\nOPTION A: Direct vault trading (unlikely)")
    print("  - Would need vault's private key")
    print("  - Hyperliquid likely doesn't expose this")
    
    print("\nOPTION B: Leader trades FOR vault (most likely)")
    print("  - Leader signs with their private key")
    print("  - Specify vault as the trading account")
    print("  - Positions appear in vault, not leader")
    
    print("\nOPTION C: Mirror trading")
    print("  - Leader trades in their account")
    print("  - Vault automatically mirrors (copy trading)")
    print("  - Both accounts would have positions")
    
    # Check current situation
    print("\n" + "=" * 40)
    print("CURRENT SITUATION ANALYSIS")
    print("=" * 40)
    
    if leader_balance < 20 and vault_balance > 50:
        print("✅ Vault has more funds than leader (expected)")
    
    if len(leader_positions) == 0 and len(vault_positions) == 0:
        print("✅ No positions in either account (clean slate)")
    elif len(leader_positions) > 0 and len(vault_positions) == 0:
        print("⚠️ Leader has positions but vault doesn't")
        print("   This suggests vault is NOT mirroring leader trades")
    elif len(leader_positions) == 0 and len(vault_positions) > 0:
        print("⚠️ Vault has positions but leader doesn't")
        print("   This suggests leader can trade FOR vault")
    
    # Solution
    print("\n" + "=" * 40)
    print("RECOMMENDED SOLUTION")
    print("=" * 40)
    
    print("\n1. UPDATE get_account_value() to use vault:")
    print("   vault_state = info.user_state(VAULT_ADDRESS)")
    print("   return vault_state['marginSummary']['accountValue']")
    
    print("\n2. UPDATE get_position() to use vault:")
    print("   vault_state = info.user_state(VAULT_ADDRESS)")
    print("   return vault_state['assetPositions']")
    
    print("\n3. TRADING remains the same:")
    print("   exchange = Exchange(leader_account, ...)")
    print("   exchange.order(...) # This likely affects vault")
    
    print("\n4. TEST with small trade to confirm")
    
    return {
        'leader_balance': leader_balance,
        'vault_balance': vault_balance,
        'leader_positions': len(leader_positions),
        'vault_positions': len(vault_positions)
    }

if __name__ == "__main__":
    results = test_vault_architecture()
    
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)
    print(json.dumps(results, indent=2))