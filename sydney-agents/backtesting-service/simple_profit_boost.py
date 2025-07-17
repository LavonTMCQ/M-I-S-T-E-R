#!/usr/bin/env python3
"""
Simple Profit Boost
Minimal changes to our successful algorithm to extract more profit

Focus: Hold winners longer, exit losers faster
Keep the core algorithm that works (62.5% win rate) but optimize exits
"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from ada_custom_algorithm import ADACustomAlgorithm

class SimpleProfitBoost(ADACustomAlgorithm):
    """
    Simple enhancements to our proven algorithm
    """
    
    def __init__(self):
        super().__init__()
        
        # Keep all the working parameters exactly the same
        # Only change exit strategy
        
        # SIMPLE ENHANCEMENT 1: Extend holding period for winners
        self.max_hold_bars = 24  # 6 hours instead of 5 hours (20 bars)
        
        # SIMPLE ENHANCEMENT 2: Faster exit for clear losers
        self.quick_exit_threshold = -0.02  # Exit if down 2% quickly
        self.quick_exit_bars = 4  # Within 1 hour
        
        # SIMPLE ENHANCEMENT 3: Momentum-based take profit
        self.momentum_tp_enabled = True
        self.momentum_threshold = 0.01  # 1% momentum in our favor

class SimpleProfitBoostExecutor:
    """Simple enhanced execution focusing on holding winners longer"""
    
    def execute_simple_boost_trade(self, signal: Dict, amount: float, df: pd.DataFrame) -> Dict:
        """Execute trade with simple profit boosting"""
        
        signal_time = pd.to_datetime(signal['timestamp'])
        signal_idx = df[df['timestamp'] >= signal_time].index[0] if len(df[df['timestamp'] >= signal_time]) > 0 else len(df) - 1
        
        entry_price = signal['price']
        stop_loss = signal['stop_loss']
        take_profit = signal['take_profit']
        
        # Track for enhancements
        exit_price = None
        exit_reason = "time_exit"
        bars_held = 0
        
        # ENHANCEMENT: Extended holding period (24 bars = 6 hours)
        max_bars = 24
        
        for i in range(signal_idx + 1, min(signal_idx + max_bars + 1, len(df))):
            bar = df.iloc[i]
            bars_held = i - signal_idx
            
            if signal['type'] == 'long':
                current_profit_pct = (bar['close'] - entry_price) / entry_price
                
                # ENHANCEMENT 1: Quick exit for fast losers
                if bars_held <= 4 and current_profit_pct < -0.02:
                    exit_price = bar['close']
                    exit_reason = "quick_exit_loss"
                    break
                
                # Standard stop loss
                if bar['low'] <= stop_loss:
                    exit_price = stop_loss
                    exit_reason = "stop_loss"
                    break
                
                # ENHANCEMENT 2: Momentum-based early take profit
                if current_profit_pct > 0.04:  # If we're up 4%+
                    # Check if momentum is turning against us
                    if i + 1 < len(df):
                        next_bar = df.iloc[i + 1]
                        momentum = (next_bar['close'] - bar['close']) / bar['close']
                        if momentum < -0.005:  # Momentum turning negative
                            exit_price = bar['close']
                            exit_reason = "momentum_exit"
                            break
                
                # Standard take profit
                if bar['high'] >= take_profit:
                    exit_price = take_profit
                    exit_reason = "take_profit"
                    break
                
                # ENHANCEMENT 3: Extended time exit with profit protection
                if bars_held >= 20:  # After 5 hours
                    if current_profit_pct > 0.02:  # If profitable, hold longer
                        continue
                    else:  # If not profitable after 5 hours, exit
                        exit_price = bar['close']
                        exit_reason = "extended_time_exit"
                        break
            
            else:  # short
                current_profit_pct = (entry_price - bar['close']) / entry_price
                
                # Similar logic for shorts
                if bars_held <= 4 and current_profit_pct < -0.02:
                    exit_price = bar['close']
                    exit_reason = "quick_exit_loss"
                    break
                
                if bar['high'] >= stop_loss:
                    exit_price = stop_loss
                    exit_reason = "stop_loss"
                    break
                
                if current_profit_pct > 0.04:
                    if i + 1 < len(df):
                        next_bar = df.iloc[i + 1]
                        momentum = (bar['close'] - next_bar['close']) / bar['close']
                        if momentum < -0.005:
                            exit_price = bar['close']
                            exit_reason = "momentum_exit"
                            break
                
                if bar['low'] <= take_profit:
                    exit_price = take_profit
                    exit_reason = "take_profit"
                    break
                
                if bars_held >= 20:
                    if current_profit_pct > 0.02:
                        continue
                    else:
                        exit_price = bar['close']
                        exit_reason = "extended_time_exit"
                        break
        
        # Final time exit if nothing else triggered
        if exit_price is None:
            exit_idx = min(signal_idx + max_bars, len(df) - 1)
            exit_price = df.iloc[exit_idx]['close']
            exit_reason = "final_time_exit"
        
        # Calculate P&L
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
            'profit_at_exit': ((exit_price - entry_price) / entry_price) * 100 if signal['type'] == 'long' else ((entry_price - exit_price) / entry_price) * 100
        }

async def compare_algorithms():
    """Compare original vs simple profit boost"""
    print("🔄 COMPARING ORIGINAL vs SIMPLE PROFIT BOOST")
    print("=" * 70)
    
    from real_data_integration import RealDataProvider
    from ada_custom_algorithm import ADACustomBacktestEngine
    
    data_provider = RealDataProvider()
    df = await data_provider.fetch_real_ada_data(timeframe='15m', days=7)
    
    # Test original algorithm
    print("\n📊 ORIGINAL ALGORITHM:")
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
    
    print(f"Original: {len(original_signals)} trades, {original_win_rate:.1f}% win rate, {original_total_pnl:.1f} ADA")
    
    # Test simple boost algorithm
    print("\n🚀 SIMPLE PROFIT BOOST:")
    boost_algo = SimpleProfitBoost()
    boost_signals = boost_algo.analyze_price_data(df)
    
    boost_executor = SimpleProfitBoostExecutor()
    boost_results = []
    boost_total_pnl = 0
    boost_wins = 0
    
    for signal in boost_signals:
        result = boost_executor.execute_simple_boost_trade(signal, 50, df)
        boost_results.append(result)
        boost_total_pnl += result['pnl']
        if result['pnl'] > 0:
            boost_wins += 1
        
        print(f"  Trade: {result['pnl']:.1f} ADA, Exit: {result['exit_reason']}, "
              f"Held: {result['bars_held']} bars, Profit: {result['profit_at_exit']:.1f}%")
    
    boost_win_rate = boost_wins / len(boost_signals) * 100 if boost_signals else 0
    
    print(f"\nBoost: {len(boost_signals)} trades, {boost_win_rate:.1f}% win rate, {boost_total_pnl:.1f} ADA")
    
    # Compare results
    print(f"\n📈 COMPARISON:")
    print(f"Signal count: Original {len(original_signals)} vs Boost {len(boost_signals)}")
    print(f"Win rate: Original {original_win_rate:.1f}% vs Boost {boost_win_rate:.1f}%")
    print(f"Total P&L: Original {original_total_pnl:.1f} vs Boost {boost_total_pnl:.1f} ADA")
    
    if boost_total_pnl > original_total_pnl:
        improvement = boost_total_pnl - original_total_pnl
        print(f"✅ IMPROVEMENT: +{improvement:.1f} ADA ({improvement/abs(original_total_pnl)*100:.1f}% better)")
    else:
        decline = original_total_pnl - boost_total_pnl
        print(f"❌ DECLINE: -{decline:.1f} ADA ({decline/abs(original_total_pnl)*100:.1f}% worse)")
    
    # Analyze exit reasons
    print(f"\n🔍 EXIT REASON ANALYSIS:")
    exit_reasons = {}
    for result in boost_results:
        reason = result['exit_reason']
        if reason not in exit_reasons:
            exit_reasons[reason] = {'count': 0, 'total_pnl': 0}
        exit_reasons[reason]['count'] += 1
        exit_reasons[reason]['total_pnl'] += result['pnl']
    
    for reason, data in exit_reasons.items():
        avg_pnl = data['total_pnl'] / data['count']
        print(f"  {reason}: {data['count']} trades, {avg_pnl:.1f} ADA avg")

async def test_on_multiple_periods():
    """Test simple boost on multiple periods"""
    print("\n🧪 TESTING SIMPLE BOOST ON MULTIPLE PERIODS")
    print("=" * 70)
    
    from real_data_integration import RealDataProvider
    
    data_provider = RealDataProvider()
    periods = [7, 14, 21]
    
    for days in periods:
        print(f"\n📊 Testing {days} days:")
        
        try:
            df = await data_provider.fetch_real_ada_data(timeframe='15m', days=days)
            
            boost_algo = SimpleProfitBoost()
            boost_signals = boost_algo.analyze_price_data(df)
            
            if boost_signals:
                boost_executor = SimpleProfitBoostExecutor()
                total_pnl = 0
                wins = 0
                
                for signal in boost_signals:
                    result = boost_executor.execute_simple_boost_trade(signal, 50, df)
                    total_pnl += result['pnl']
                    if result['pnl'] > 0:
                        wins += 1
                
                win_rate = wins / len(boost_signals) * 100
                print(f"  {len(boost_signals)} trades, {win_rate:.1f}% win rate, {total_pnl:.1f} ADA")
            else:
                print(f"  No signals generated")
                
        except Exception as e:
            print(f"  Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(compare_algorithms())
    asyncio.run(test_on_multiple_periods())
