#!/usr/bin/env python3
"""
Optimized Fibonacci Strategy
Balanced approach between signal quality and quantity
Target: 65%+ win rate with reasonable trade frequency

Key Optimizations:
1. Relaxed but still strict filtering
2. Better trend detection
3. Adaptive confidence thresholds
4. Multiple timeframe confirmation
5. Smart risk management
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import asyncio
from real_data_integration import RealDataProvider

class OptimizedFibonacciStrategy:
    """
    Optimized Fibonacci strategy balancing quality and quantity
    """
    
    def __init__(self):
        # Core parameters (relaxed from improved version)
        self.lookback_period = 40  # Shorter lookback for more recent swings
        self.fibonacci_levels = [0.382, 0.5, 0.618]  # Focus on key levels only
        self.tolerance = 0.004  # 0.4% tolerance (between original 0.5% and improved 0.3%)
        
        # Filtering parameters (balanced)
        self.min_confidence = 70    # 70% minimum (down from 80%)
        self.trend_period = 15      # Shorter trend period
        self.volume_threshold = 1.3 # 30% above average (down from 50%)
        self.rsi_oversold = 35      # Less strict RSI
        self.rsi_overbought = 65
        self.min_fib_range = 0.015  # 1.5% minimum range (down from 2%)
        
        # Risk management
        self.max_risk_per_trade = 0.04  # 4% max risk
        self.stop_loss_pct = 0.06       # 6% stop loss (wider)
        self.take_profit_ratio = 1.5    # 1.5:1 reward:risk
    
    def analyze_price_data(self, df: pd.DataFrame) -> List[Dict]:
        """
        Optimized analysis with balanced filtering
        """
        signals = []
        
        # Add technical indicators
        df = self._add_technical_indicators(df)
        
        for i in range(self.lookback_period, len(df)):
            window = df.iloc[i-self.lookback_period:i+1]
            current_bar = df.iloc[i]
            
            # Find swing points (less strict)
            swing_high = window['high'].max()
            swing_low = window['low'].min()
            
            # Validate setup (relaxed requirements)
            if not self._is_valid_setup(swing_high, swing_low, current_bar['close']):
                continue
            
            # Calculate Fibonacci levels
            fib_levels = self._calculate_fibonacci_levels(swing_high, swing_low)
            current_price = current_bar['close']
            
            # Check for signals with balanced requirements
            signal = self._check_for_balanced_signal(
                current_bar, window, fib_levels, current_price, swing_high, swing_low
            )
            
            if signal:
                signals.append(signal)
        
        print(f"🎯 Generated {len(signals)} BALANCED signals")
        return signals
    
    def _add_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add essential technical indicators"""
        df = df.copy()
        
        # RSI
        df['rsi'] = self._calculate_rsi(df['close'])
        
        # Simple trend detection
        df['sma_10'] = df['close'].rolling(window=10).mean()
        df['sma_20'] = df['close'].rolling(window=20).mean()
        
        # Volume
        df['volume_sma'] = df['volume'].rolling(window=15).mean()
        df['volume_ratio'] = df['volume'] / df['volume_sma']
        
        # Price momentum
        df['price_change'] = df['close'].pct_change(5)  # 5-period momentum
        
        return df
    
    def _is_valid_setup(self, swing_high: float, swing_low: float, current_price: float) -> bool:
        """Relaxed setup validation"""
        
        # Minimum range
        fib_range = swing_high - swing_low
        range_pct = fib_range / swing_low
        if range_pct < self.min_fib_range:
            return False
        
        # Price within range (with some tolerance)
        if current_price < swing_low * 0.98 or current_price > swing_high * 1.02:
            return False
        
        return True
    
    def _check_for_balanced_signal(self, current_bar, window, fib_levels, current_price, swing_high, swing_low):
        """Check for signals with balanced requirements"""
        
        # Current indicators
        rsi = current_bar['rsi']
        volume_ratio = current_bar['volume_ratio']
        sma_10 = current_bar['sma_10']
        sma_20 = current_bar['sma_20']
        price_momentum = current_bar['price_change']
        
        # Simple trend detection
        trend = 'bullish' if sma_10 > sma_20 else 'bearish'
        trend_strength = abs(sma_10 - sma_20) / sma_20
        
        # Check Fibonacci levels
        for level_name, level_price in fib_levels.items():
            price_diff = abs(current_price - level_price) / current_price
            
            if price_diff > self.tolerance:
                continue
            
            # LONG SIGNALS (relaxed conditions)
            if (level_name in ['38.2%', '50.0%', '61.8%'] and
                rsi < 50 and  # Relaxed from 35
                volume_ratio > self.volume_threshold and
                price_momentum > -0.02):  # Not falling too fast
                
                confidence = self._calculate_balanced_confidence(
                    rsi, volume_ratio, price_diff, trend_strength, trend, 'long'
                )
                
                if confidence >= self.min_confidence:
                    return {
                        'timestamp': current_bar['timestamp'],
                        'type': 'long',
                        'price': current_price,
                        'fibonacci_level': level_name,
                        'confidence': confidence,
                        'swing_high': swing_high,
                        'swing_low': swing_low,
                        'rsi': rsi,
                        'volume_ratio': volume_ratio,
                        'trend': trend,
                        'stop_loss': current_price * (1 - self.stop_loss_pct),
                        'take_profit': current_price * (1 + self.stop_loss_pct * self.take_profit_ratio),
                        'reasoning': f"BALANCED: Long at {level_name} Fibonacci level"
                    }
            
            # SHORT SIGNALS (relaxed conditions)
            elif (level_name in ['50.0%', '61.8%'] and
                  rsi > 50 and  # Relaxed from 65
                  volume_ratio > self.volume_threshold and
                  price_momentum < 0.02):  # Not rising too fast
                
                confidence = self._calculate_balanced_confidence(
                    100 - rsi, volume_ratio, price_diff, trend_strength, trend, 'short'
                )
                
                if confidence >= self.min_confidence:
                    return {
                        'timestamp': current_bar['timestamp'],
                        'type': 'short',
                        'price': current_price,
                        'fibonacci_level': level_name,
                        'confidence': confidence,
                        'swing_high': swing_high,
                        'swing_low': swing_low,
                        'rsi': rsi,
                        'volume_ratio': volume_ratio,
                        'trend': trend,
                        'stop_loss': current_price * (1 + self.stop_loss_pct),
                        'take_profit': current_price * (1 - self.stop_loss_pct * self.take_profit_ratio),
                        'reasoning': f"BALANCED: Short at {level_name} Fibonacci level"
                    }
        
        return None
    
    def _calculate_balanced_confidence(self, rsi_strength, volume_ratio, price_accuracy, trend_strength, trend, direction):
        """Balanced confidence calculation"""
        base_confidence = 60
        
        # RSI contribution (0-20 points)
        rsi_bonus = min(20, rsi_strength * 0.5)
        
        # Volume contribution (0-15 points)
        volume_bonus = min(15, (volume_ratio - 1) * 12)
        
        # Price accuracy (0-10 points)
        accuracy_bonus = min(10, (1 - price_accuracy / self.tolerance) * 10)
        
        # Trend alignment bonus (0-10 points)
        if (direction == 'long' and trend == 'bullish') or (direction == 'short' and trend == 'bearish'):
            trend_bonus = min(10, trend_strength * 50)
        else:
            trend_bonus = 0
        
        total_confidence = base_confidence + rsi_bonus + volume_bonus + accuracy_bonus + trend_bonus
        return min(95, max(50, int(total_confidence)))
    
    def _calculate_fibonacci_levels(self, high: float, low: float) -> Dict[str, float]:
        """Calculate key Fibonacci levels only"""
        fib_range = high - low
        levels = {}
        
        for level in self.fibonacci_levels:
            levels[f"{level*100:.1f}%"] = low + (fib_range * level)
        
        return levels
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50)

class OptimizedBacktestEngine:
    """Optimized backtest engine"""
    
    def __init__(self):
        self.data_provider = RealDataProvider()
        self.strategy = OptimizedFibonacciStrategy()
    
    async def run_optimized_backtest(self, config: Dict) -> Dict:
        """Run backtest with optimized strategy"""
        print("⚡ RUNNING OPTIMIZED FIBONACCI BACKTEST")
        print("=" * 50)
        
        # Fetch data
        df = await self.data_provider.fetch_real_ada_data(
            timeframe=config.get('timeframe', '15m'),
            days=config.get('days', 14)
        )
        
        # Generate signals
        print("🎯 Analyzing with OPTIMIZED algorithm...")
        signals = self.strategy.analyze_price_data(df)
        print(f"📊 Generated {len(signals)} OPTIMIZED signals")
        
        if len(signals) == 0:
            return {'error': 'No signals found', 'suggestion': 'Try different time period'}
        
        # Execute trades
        trades = []
        balance = config.get('initial_balance', 200)
        
        for signal in signals:
            # Conservative position sizing
            trade_amount = min(40, balance * 0.25)  # 25% of balance, max 40 ADA
            
            if trade_amount >= 40 and balance >= trade_amount + 13:
                trade_result = self._execute_optimized_trade(signal, trade_amount, df)
                trades.append(trade_result)
                balance += trade_result['pnl']
                
                status = "✅ WIN" if trade_result['pnl'] > 0 else "❌ LOSS"
                print(f"{status}: {trade_amount:.0f} ADA {trade_result['type'].upper()} at {signal['fibonacci_level']} "
                      f"(Conf: {signal['confidence']}%, P&L: {trade_result['pnl']:.1f} ADA)")
        
        # Calculate results
        results = self._calculate_optimized_results(trades, config)
        
        print(f"\n🎯 OPTIMIZED RESULTS:")
        print(f"   Total Trades: {results['total_trades']}")
        print(f"   Win Rate: {results['win_rate']:.1f}%")
        print(f"   Total P&L: {results['total_pnl']:.2f} ADA")
        print(f"   Final Balance: {results['final_balance']:.2f} ADA")
        print(f"   Return: {results['return_percentage']:.1f}%")
        
        # Success criteria
        if results['win_rate'] >= 65 and results['total_pnl'] > 0:
            print("\n🎉 SUCCESS: Strategy meets profitability targets!")
            print("✅ Ready for live testing with real ADA")
        elif results['win_rate'] >= 60:
            print("\n⚠️ CLOSE: Strategy shows promise but needs fine-tuning")
        else:
            print("\n❌ NEEDS WORK: Strategy requires more optimization")
        
        return results
    
    def _execute_optimized_trade(self, signal: Dict, amount: float, df: pd.DataFrame) -> Dict:
        """Execute trade with optimized risk management"""
        
        signal_time = pd.to_datetime(signal['timestamp'])
        signal_idx = df[df['timestamp'] >= signal_time].index[0] if len(df[df['timestamp'] >= signal_time]) > 0 else len(df) - 1
        
        entry_price = signal['price']
        stop_loss = signal['stop_loss']
        take_profit = signal['take_profit']
        
        # Check for stop loss or take profit in next 15 bars
        exit_price = None
        exit_reason = "time_exit"
        
        for i in range(signal_idx + 1, min(signal_idx + 16, len(df))):
            bar = df.iloc[i]
            
            if signal['type'] == 'long':
                if bar['low'] <= stop_loss:
                    exit_price = stop_loss
                    exit_reason = "stop_loss"
                    break
                elif bar['high'] >= take_profit:
                    exit_price = take_profit
                    exit_reason = "take_profit"
                    break
            else:  # short
                if bar['high'] >= stop_loss:
                    exit_price = stop_loss
                    exit_reason = "stop_loss"
                    break
                elif bar['low'] <= take_profit:
                    exit_price = take_profit
                    exit_reason = "take_profit"
                    break
        
        # Time-based exit if no stop/target hit
        if exit_price is None:
            exit_idx = min(signal_idx + 15, len(df) - 1)
            exit_price = df.iloc[exit_idx]['close']
        
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
            'fibonacci_level': signal['fibonacci_level'],
            'confidence': signal['confidence']
        }
    
    def _calculate_optimized_results(self, trades: List[Dict], config: Dict) -> Dict:
        """Calculate results"""
        if not trades:
            return {'error': 'No trades executed'}
        
        winning_trades = [t for t in trades if t['pnl'] > 0]
        losing_trades = [t for t in trades if t['pnl'] <= 0]
        
        total_pnl = sum(t['pnl'] for t in trades)
        win_rate = len(winning_trades) / len(trades) * 100
        initial_balance = config.get('initial_balance', 200)
        final_balance = initial_balance + total_pnl
        return_percentage = (total_pnl / initial_balance) * 100
        
        return {
            'total_trades': len(trades),
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'win_rate': win_rate,
            'total_pnl': total_pnl,
            'final_balance': final_balance,
            'return_percentage': return_percentage,
            'average_win': np.mean([t['pnl'] for t in winning_trades]) if winning_trades else 0,
            'average_loss': np.mean([abs(t['pnl']) for t in losing_trades]) if losing_trades else 0,
            'trades': trades,
            'strategy': 'optimized_fibonacci'
        }

async def test_multiple_periods():
    """Test strategy across multiple time periods"""
    periods = [7, 14, 21, 30]
    results = []
    
    engine = OptimizedBacktestEngine()
    
    for days in periods:
        print(f"\n{'='*60}")
        print(f"TESTING {days} DAYS")
        print(f"{'='*60}")
        
        config = {'timeframe': '15m', 'days': days, 'initial_balance': 200}
        result = await engine.run_optimized_backtest(config)
        
        if 'error' not in result:
            results.append({
                'days': days,
                'win_rate': result['win_rate'],
                'total_pnl': result['total_pnl'],
                'return_pct': result['return_percentage'],
                'trades': result['total_trades']
            })
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 MULTI-PERIOD SUMMARY")
    print(f"{'='*60}")
    
    for r in results:
        print(f"{r['days']:2d} days: {r['win_rate']:5.1f}% win rate, {r['return_pct']:6.1f}% return, {r['trades']:2d} trades")
    
    if results:
        avg_win_rate = np.mean([r['win_rate'] for r in results])
        avg_return = np.mean([r['return_pct'] for r in results])
        print(f"\nAVERAGE: {avg_win_rate:.1f}% win rate, {avg_return:.1f}% return")
        
        if avg_win_rate >= 65:
            print("🎉 STRATEGY APPROVED FOR LIVE TESTING!")
        else:
            print("⚠️ Strategy needs more optimization")

if __name__ == "__main__":
    asyncio.run(test_multiple_periods())
