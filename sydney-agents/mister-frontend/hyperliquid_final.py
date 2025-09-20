#!/usr/bin/env python3
"""
HYPERLIQUID COMPLETE TRADING DEMONSTRATION - FINAL
"""

from hyperliquid.exchange import Exchange
from hyperliquid.info import Info
from eth_account import Account
import time
import json

PRIVATE_KEY = "b51f849e6551e2c8e627a663f2ee2439b1e17760d7a4de340c913bbfbd572f73"

def main():
    print("🚀 HYPERLIQUID AUTONOMOUS TRADING DEMONSTRATION")
    print("="*50 + "\n")
    
    # Initialize with proper wallet object
    account = Account.from_key(PRIVATE_KEY)
    wallet = account.address
    
    # Exchange needs the account object, not the private key string
    exchange = Exchange(account, base_url="https://api.hyperliquid.xyz")
    info = Info(base_url="https://api.hyperliquid.xyz")
    print(f"📍 Wallet: {wallet}")
    
    # Check balance
    state = info.user_state(wallet)
    margin = state.get("marginSummary", {})
    print(f"💰 Balance: ${margin.get('accountValue', '0')}")
    print(f"💵 Available: ${margin.get('totalRawUsd', '0')}")
    
    # Get SOL price  
    mids = info.all_mids()
    sol_price = float(mids.get("SOL", 0))
    print(f"📈 SOL Price: ${sol_price:.2f}")
    
    # Calculate size - SOL requires 2 decimal places (szDecimals: 2)
    # Buy 0.25 SOL for demonstration (~$50 worth)
    size = 0.25
    
    print(f"\n{'='*50}")
    print("PLACING BUY ORDER")
    print(f"{'='*50}")
    print(f"Size: {size} SOL (~${size * sol_price:.2f})")
    
    # Place buy order using correct parameter name
    try:
        # Round price to 2 decimals for proper validation
        limit_price = round(sol_price * 1.01, 2)
        
        buy = exchange.order(
            name="SOL",  # Changed from 'coin' to 'name'
            is_buy=True,
            sz=size,
            limit_px=limit_price,
            order_type={"limit": {"tif": "Ioc"}},
            reduce_only=False
        )
        print(f"\nResult: {json.dumps(buy, indent=2)}")
        
        if buy.get("status") == "ok":
            print("✅ BUY SUCCESSFUL!")
            
            time.sleep(3)
            
            # Check position
            state = info.user_state(wallet)
            positions = state.get("assetPositions", [])
            
            for p in positions:
                pos = p["position"]
                if pos["coin"] == "SOL" and float(pos["szi"]) != 0:
                    sz = float(pos["szi"])
                    print(f"\n📊 SOL Position:")
                    print(f"  Size: {abs(sz):.4f}")
                    print(f"  Entry: ${pos['entryPx']}")
                    print(f"  PnL: ${pos['unrealizedPnl']}")
                    
                    # Close position
                    print(f"\n{'='*50}")
                    print("CLOSING POSITION")
                    print(f"{'='*50}")
                    
                    # Round size to 2 decimals as required
                    close_size = round(abs(sz), 2)
                    close_price = round(sol_price * 0.99, 2)
                    
                    close = exchange.order(
                        name="SOL",  # Changed from 'coin' to 'name'
                        is_buy=False,
                        sz=close_size,
                        limit_px=close_price,
                        order_type={"limit": {"tif": "Ioc"}},
                        reduce_only=False
                    )
                    print(f"\nResult: {json.dumps(close, indent=2)}")
                    
                    if close.get("status") == "ok":
                        print("✅ POSITION CLOSED!")
                        
                        time.sleep(3)
                        
                        # Final check
                        final = info.user_state(wallet)
                        final_margin = final.get("marginSummary", {})
                        print(f"\n💰 Final: ${final_margin.get('accountValue', '0')}")
                        
                        print(f"\n{'='*50}")
                        print("🎉 COMPLETE SUCCESS!")
                        print("✅ Opened position")
                        print("✅ Viewed position")
                        print("✅ Closed position")
                        print("\n🚀 AUTONOMOUS TRADING PROVEN!")
                    break
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()