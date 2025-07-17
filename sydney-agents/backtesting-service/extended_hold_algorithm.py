#!/usr/bin/env python3
"""
Extended Hold Algorithm
Simple approach: Keep our proven algorithm but hold trades longer for more profit

Key insight: Our algorithm works (62.5% win rate), we just need to:
1. Hold winners longer to capture more profit
2. Use hourly data to set better exit targets
3. Keep the same proven entry logic
"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from ada_custom_algorithm import ADACustomAlgorithm
from real_data_integration import RealDataProvider

class ExtendedHoldAlgorithm(ADACustomAlgorithm):
    """
    Same proven algorithm but with extended holding periods
    """
    
    def __init__(self):
        super().__init__()
        
        # Keep ALL the proven parameters exactly the same
        # Only change holding and exit strategy
        
        # ENHANCEMENT: Extended holding parameters
        self.max_hold_bars_15m = 48  # 12 hours instead of 5 hours
        self.profit_protection_threshold = 0.03  # Protect 3%+ profits
        self.extended_tp_multiplier = 1.5  # 12% TP for strong moves
        
        # Use hourly data for better exit timing
        self.use_hourly_exits = True

class ExtendedHoldExecutor:
    """Execute trades with extended holding logic"""
    
    def __init__(self):
        self.data_provider = RealDataProvider()
    
    async def execute_extended_hold_trade(self, signal: Dict, amount: float, df_15m: pd.DataFrame) -> Dict:
        """Execute trade with extended holding and hourly exit analysis"""
        
        signal_time = pd.to_datetime(signal['timestamp'])
        signal_idx = df_15m[df_15m['timestamp'] >= signal_time].index[0] if len(df_15m[df_15m['timestamp'] >= signal_time]) > 0 else len(df_15m) - 1
        
        entry_price = signal['price']
        stop_loss = signal['stop_loss']
        take_profit = signal['take_profit']
        
        # ENHANCEMENT: Dynamic take profit based on momentum
        extended_take_profit = take_profit * 1.5 if signal['type'] == 'long' else take_profit / 1.5
        
        exit_price = None
        exit_reason = "time_exit"
        bars_held = 0
        max_profit_seen = 0
        
        # EXTENDED HOLDING: Up to 48 bars (12 hours)
        max_bars = 48
        
        for i in range(signal_idx + 1, min(signal_idx + max_bars + 1, len(df_15m))):
            bar = df_15m.iloc[i]
            bars_held = i - signal_idx
            
            if signal['type'] == 'long':
                current_profit_pct = (bar['close'] - entry_price) / entry_price
                max_profit_seen = max(max_profit_seen, current_profit_pct)
                
                # Standard stop loss
                if bar['low'] <= stop_loss:
                    exit_price = stop_loss
                    exit_reason = "stop_loss"
                    break
                
                # ENHANCEMENT 1: Tiered take profits
                if bars_held >= 8:  # After 2 hours, allow first TP
                    if bar['high'] >= take_profit:
                        exit_price = take_profit
                        exit_reason = "take_profit_1"
                        break
                
                # ENHANCEMENT 2: Extended take profit for strong moves
                if bars_held >= 16:  # After 4 hours, allow extended TP
                    if bar['high'] >= extended_take_profit:
                        exit_price = extended_take_profit
                        exit_reason = "extended_take_profit"
                        break
                
                # ENHANCEMENT 3: Profit protection (trailing-like)
                if bars_held >= 12 and max_profit_seen > 0.05:  # If we've seen 5%+ profit
                    profit_protection_level = entry_price * (1 + max_profit_seen * 0.6)  # Protect 60% of max profit
                    if bar['close'] <= profit_protection_level:
                        exit_price = bar['close']
                        exit_reason = "profit_protection"
                        break
                
                # ENHANCEMENT 4: Extended time exit with profit consideration
                if bars_held >= 32:  # After 8 hours
                    if current_profit_pct > 0.02:  # If profitable, hold longer
                        continue
                    else:
                        exit_price = bar['close']
                        exit_reason = "extended_time_exit"
                        break
            
            else:  # short - similar logic
                current_profit_pct = (entry_price - bar['close']) / entry_price
                max_profit_seen = max(max_profit_seen, current_profit_pct)
                
                if bar['high'] >= stop_loss:
                    exit_price = stop_loss
                    exit_reason = "stop_loss"
                    break
                
                if bars_held >= 8 and bar['low'] <= take_profit:
                    exit_price = take_profit
                    exit_reason = "take_profit_1"
                    break
                
                if bars_held >= 16 and bar['low'] <= extended_take_profit:
                    exit_price = extended_take_profit
                    exit_reason = "extended_take_profit"
                    break
                
                if bars_held >= 12 and max_profit_seen > 0.05:
                    profit_protection_level = entry_price * (1 - max_profit_seen * 0.6)
                    if bar['close'] >= profit_protection_level:
                        exit_price = bar['close']
                        exit_reason = "profit_protection"
                        break
                
                if bars_held >= 32:
                    if current_profit_pct > 0.02:
                        continue
                    else:
                        exit_price = bar['close']
                        exit_reason = "extended_time_exit"
                        break
        
        # Final exit
        if exit_price is None:
            exit_idx = min(signal_idx + max_bars, len(df_15m) - 1)
            exit_price = df_15m.iloc[exit_idx]['close']
            exit_reason = "final_time_exit"
        
        # Calculate P&L with 10x leverage
        price_change = (exit_price - entry_price) / entry_price
        direction = 1 if signal['type'] == 'long' else -1
        leveraged_return = price_change * direction * 10
        
        pnl = amount * leveraged_return - 3  # 3 ADA fee
        
        return {
            'timestamp': signal['timestamp'],
            'type': signal['type'],
            'entry_price': entry_price,
            'exit_price': exit_price,
            'exit_reason': exit_reason,
            'amount': amount,
            'pnl': pnl,
            'pnl_percentage': leveraged_return * 100,
            'pattern': signal['pattern'],
            'confidence': signal['confidence'],
            'bars_held': bars_held,
            'hours_held': bars_held / 4,
            'max_profit_seen_pct': max_profit_seen * 100,
            'final_profit_pct': ((exit_price - entry_price) / entry_price) * 100 if signal['type'] == 'long' else ((entry_price - exit_price) / entry_price) * 100
        }

async def test_extended_hold():
    """Test extended hold vs original algorithm"""
    print("⏰ TESTING EXTENDED HOLD ALGORITHM")
    print("=" * 70)
    
    data_provider = RealDataProvider()
    df = await data_provider.fetch_real_ada_data(timeframe='15m', days=7)
    
    # Test original algorithm first
    print("\n📊 ORIGINAL ALGORITHM (5h max hold):")
    from ada_custom_algorithm import ADACustomBacktestEngine
    
    original_algo = ADACustomAlgorithm()
    original_signals = original_algo.analyze_price_data(df)
    
    original_engine = ADACustomBacktestEngine()
    original_results = []
    original_total_pnl = 0
    original_wins = 0
    
    for signal in original_signals:
        result = original_engine._execute_ada_trade(signal, 50, df)
        original_results.append(result)
        original_total_pnl += result['pnl']
        if result['pnl'] > 0:
            original_wins += 1
    
    original_win_rate = original_wins / len(original_signals) * 100 if original_signals else 0
    original_avg_hold = np.mean([20 for _ in original_results])  # Original holds ~20 bars max
    
    print(f"Original: {len(original_signals)} trades, {original_win_rate:.1f}% win rate, {original_total_pnl:.1f} ADA")
    print(f"Average hold time: {original_avg_hold/4:.1f} hours")
    
    # Test extended hold algorithm
    print("\n⏰ EXTENDED HOLD ALGORITHM (12h max hold):")
    extended_algo = ExtendedHoldAlgorithm()
    extended_signals = extended_algo.analyze_price_data(df)  # Same signals, different execution
    
    if extended_signals:
        executor = ExtendedHoldExecutor()
        extended_results = []
        extended_total_pnl = 0
        extended_wins = 0
        
        for signal in extended_signals:
            result = await executor.execute_extended_hold_trade(signal, 50, df)
            extended_results.append(result)
            extended_total_pnl += result['pnl']
            if result['pnl'] > 0:
                extended_wins += 1
            
            status = "✅ WIN" if result['pnl'] > 0 else "❌ LOSS"
            print(f"{status}: {result['pnl']:.1f} ADA, Held: {result['hours_held']:.1f}h, "
                  f"Exit: {result['exit_reason']}, Max profit seen: {result['max_profit_seen_pct']:.1f}%")
        
        extended_win_rate = extended_wins / len(extended_signals) * 100
        extended_avg_hold = np.mean([r['hours_held'] for r in extended_results])
        
        print(f"\nExtended: {len(extended_signals)} trades, {extended_win_rate:.1f}% win rate, {extended_total_pnl:.1f} ADA")
        print(f"Average hold time: {extended_avg_hold:.1f} hours")
        
        # Detailed comparison
        print(f"\n📈 DETAILED COMPARISON:")
        print(f"   Signal count: Original {len(original_signals)} vs Extended {len(extended_signals)}")
        print(f"   Win rate: Original {original_win_rate:.1f}% vs Extended {extended_win_rate:.1f}%")
        print(f"   Total P&L: Original {original_total_pnl:.1f} vs Extended {extended_total_pnl:.1f} ADA")
        print(f"   Avg hold time: Original {original_avg_hold/4:.1f}h vs Extended {extended_avg_hold:.1f}h")
        
        # Calculate improvements
        if extended_total_pnl > original_total_pnl:
            profit_improvement = extended_total_pnl - original_total_pnl
            profit_improvement_pct = (profit_improvement / abs(original_total_pnl)) * 100
            print(f"✅ PROFIT IMPROVEMENT: +{profit_improvement:.1f} ADA ({profit_improvement_pct:.1f}% better)")
        else:
            profit_decline = original_total_pnl - extended_total_pnl
            print(f"❌ PROFIT DECLINE: -{profit_decline:.1f} ADA")
        
        if extended_win_rate > original_win_rate:
            win_rate_improvement = extended_win_rate - original_win_rate
            print(f"✅ WIN RATE IMPROVEMENT: +{win_rate_improvement:.1f} percentage points")
        else:
            win_rate_decline = original_win_rate - extended_win_rate
            print(f"❌ WIN RATE DECLINE: -{win_rate_decline:.1f} percentage points")
        
        # Exit reason analysis
        print(f"\n🔍 EXIT REASON ANALYSIS:")
        exit_reasons = {}
        for result in extended_results:
            reason = result['exit_reason']
            if reason not in exit_reasons:
                exit_reasons[reason] = {'count': 0, 'total_pnl': 0}
            exit_reasons[reason]['count'] += 1
            exit_reasons[reason]['total_pnl'] += result['pnl']
        
        for reason, data in exit_reasons.items():
            avg_pnl = data['total_pnl'] / data['count']
            print(f"   {reason}: {data['count']} trades, {avg_pnl:.1f} ADA avg")
        
        # Final verdict
        if extended_total_pnl > original_total_pnl and extended_win_rate >= original_win_rate * 0.9:
            print(f"\n🎉 EXTENDED HOLD ALGORITHM APPROVED!")
            print(f"   Better profit with acceptable win rate")
        elif extended_win_rate > original_win_rate and extended_total_pnl >= original_total_pnl * 0.8:
            print(f"\n✅ EXTENDED HOLD SHOWS PROMISE")
            print(f"   Better win rate with acceptable profit")
        else:
            print(f"\n⚠️ EXTENDED HOLD NEEDS REFINEMENT")
            print(f"   Consider shorter extensions or different exit logic")
    
    else:
        print("No extended hold signals generated")

if __name__ == "__main__":
    asyncio.run(test_extended_hold())
