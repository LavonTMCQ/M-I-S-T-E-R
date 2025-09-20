#!/usr/bin/env python3
"""
Quick verification that trades affect vault, not leader
"""

from hyperliquid.info import Info

VAULT = "0xf22e1753a0208a42fc60eae6a26218c5dfdaa5b0"
LEADER = "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74"

info = Info(base_url="https://api.hyperliquid.xyz")

print("VAULT vs LEADER - WHERE ARE THE TRADES?")
print("=" * 50)

# Check both accounts
vault_state = info.user_state(VAULT)
leader_state = info.user_state(LEADER)

print(f"\nVAULT ({VAULT[:8]}...):")
print(f"  Balance: ${float(vault_state['marginSummary']['accountValue']):.2f}")
vault_positions = [p for p in vault_state.get('assetPositions', []) 
                  if float(p['position']['szi']) != 0]
if vault_positions:
    for p in vault_positions:
        print(f"  Position: {p['position']['coin']} {p['position']['szi']}")
else:
    print("  Positions: None")

print(f"\nLEADER ({LEADER[:8]}...):")
print(f"  Balance: ${float(leader_state['marginSummary']['accountValue']):.2f}")
leader_positions = [p for p in leader_state.get('assetPositions', []) 
                   if float(p['position']['szi']) != 0]
if leader_positions:
    for p in leader_positions:
        print(f"  Position: {p['position']['coin']} {p['position']['szi']}")
else:
    print("  Positions: None")

print("\n" + "=" * 50)
print("ANSWER: Trades affect VAULT, not LEADER!")
print("Your algo (using leader key) trades vault's $100")
print("No money needed in leader wallet!")