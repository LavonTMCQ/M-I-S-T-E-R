#!/usr/bin/env python3
"""
Optimized Sizing Algorithm
Instead of changing exit strategy, optimize position sizing and entry quality

Key insight: Our algorithm works (62.5% win rate), but we can:
1. Size positions based on confidence
2. Only take the highest-quality signals
3. Optimize for 15-minute timeframe constraints
"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from ada_custom_algorithm import ADACustomAlgorithm

class OptimizedSizingAlgorithm(ADACustomAlgorithm):
    """
    Optimized version focusing on position sizing and signal quality
    """
    
    def __init__(self):
        super().__init__()
        
        # OPTIMIZATION 1: Higher confidence threshold for better signals
        self.min_confidence = 75  # Increased from 70
        
        # OPTIMIZATION 2: Dynamic position sizing
        self.base_position_size = 40  # Minimum Strike Finance amount
        self.max_position_size = 80   # Maximum position size
        self.confidence_multiplier = True
        
        # OPTIMIZATION 3: Better entry timing
        self.require_volume_confirmation = True
        self.volume_threshold = 1.6  # Higher volume requirement
        
        # OPTIMIZATION 4: Stricter RSI requirements
        self.rsi_oversold = 32  # Tighter range
        self.rsi_overbought = 68
        
        # Keep proven risk management
        self.stop_loss_pct = 0.04   # 4% stop loss (proven)
        self.take_profit_pct = 0.08 # 8% take profit (proven)
    
    def analyze_price_data(self, df: pd.DataFrame) -> List[Dict]:
        """
        Optimized analysis focusing on highest-quality signals
        """
        signals = []
        
        # Add indicators
        df = self._add_indicators(df)
        
        last_signal_idx = -8  # Increased gap between signals
        
        for i in range(30, len(df)):
            current_bar = df.iloc[i]
            
            # Enhanced filters
            if not self._enhanced_filters(current_bar, i, last_signal_idx):
                continue
            
            # Check for optimized signals
            signal = self._check_optimized_patterns(current_bar, df.iloc[i-20:i+1])
            
            if signal:
                # OPTIMIZATION: Calculate optimal position size
                optimal_size = self._calculate_optimal_position_size(signal)
                signal['optimal_position_size'] = optimal_size
                
                signals.append(signal)
                last_signal_idx = i
        
        print(f"🎯 Generated {len(signals)} OPTIMIZED signals (higher quality)")
        return signals
    
    def _enhanced_filters(self, bar, current_idx, last_signal_idx) -> bool:
        """Enhanced quality filters"""
        
        # Avoid worst trading hours
        if bar['hour'] in [5, 23]:
            return False
        
        # Increased gap between signals
        if (current_idx - last_signal_idx) < 8:
            return False
        
        # Higher body size requirement
        if bar['body_size'] < 0.003:
            return False
        
        # OPTIMIZATION: Volume pre-filter
        if self.require_volume_confirmation and bar['volume_ratio'] < 1.4:
            return False
        
        return True
    
    def _check_optimized_patterns(self, current_bar, window) -> Optional[Dict]:
        """
        Optimized pattern detection with stricter requirements
        """
        
        rsi = current_bar['rsi']
        bb_position = current_bar['bb_position']
        volume_ratio = current_bar['volume_ratio']
        trend = current_bar['trend']
        is_bullish_candle = current_bar['is_bullish_candle']
        momentum = current_bar['momentum']
        price = current_bar['close']
        
        # OPTIMIZED LONG PATTERN (stricter requirements)
        if (rsi < self.rsi_oversold and                    # Stricter RSI (32 vs 35)
            bb_position < self.bb_distance and            # Near BB lower
            volume_ratio > self.volume_threshold and      # Higher volume (1.6 vs 1.4)
            is_bullish_candle and                         # Bullish candle
            momentum > -0.02 and                          # Not falling too hard
            self._additional_quality_checks(current_bar, window, 'long')):  # Extra checks
            
            confidence = self._calculate_optimized_confidence(
                rsi, bb_position, volume_ratio, trend, 'long'
            )
            
            if confidence >= self.min_confidence:  # Higher threshold (75 vs 70)
                return {
                    'timestamp': current_bar['timestamp'],
                    'type': 'long',
                    'price': price,
                    'confidence': confidence,
                    'rsi': rsi,
                    'bb_position': bb_position,
                    'volume_ratio': volume_ratio,
                    'trend': trend,
                    'pattern': 'Optimized_Long_Pattern',
                    'stop_loss': price * (1 - self.stop_loss_pct),
                    'take_profit': price * (1 + self.take_profit_pct),
                    'reasoning': f"OPTIMIZED LONG: RSI {rsi:.1f}, BB {bb_position:.2f}, Vol {volume_ratio:.1f}x, Conf {confidence}%"
                }
        
        # OPTIMIZED SHORT PATTERN (even stricter)
        elif (rsi > self.rsi_overbought and
              bb_position > (1 - self.bb_distance) and
              volume_ratio > self.volume_threshold and
              not is_bullish_candle and
              momentum < 0.02 and
              self._additional_quality_checks(current_bar, window, 'short')):
            
            confidence = self._calculate_optimized_confidence(
                100 - rsi, 1 - bb_position, volume_ratio, trend, 'short'
            )
            
            # Even higher threshold for shorts
            if confidence >= self.min_confidence + 5:
                return {
                    'timestamp': current_bar['timestamp'],
                    'type': 'short',
                    'price': price,
                    'confidence': confidence,
                    'rsi': rsi,
                    'bb_position': bb_position,
                    'volume_ratio': volume_ratio,
                    'trend': trend,
                    'pattern': 'Optimized_Short_Pattern',
                    'stop_loss': price * (1 + self.stop_loss_pct),
                    'take_profit': price * (1 - self.take_profit_pct),
                    'reasoning': f"OPTIMIZED SHORT: RSI {rsi:.1f}, BB {bb_position:.2f}, Vol {volume_ratio:.1f}x, Conf {confidence}%"
                }
        
        return None
    
    def _additional_quality_checks(self, current_bar, window, direction) -> bool:
        """Additional quality checks for signal validation"""
        
        # Check recent price action
        recent_bars = window.tail(5)
        
        # QUALITY CHECK 1: Avoid choppy markets
        recent_volatility = recent_bars['close'].std() / recent_bars['close'].mean()
        if recent_volatility > 0.05:  # Too choppy
            return False
        
        # QUALITY CHECK 2: Volume consistency
        volume_consistency = recent_bars['volume_ratio'].mean()
        if volume_consistency < 1.0:  # Below average volume period
            return False
        
        # QUALITY CHECK 3: RSI not at extreme for too long
        rsi_values = recent_bars['rsi']
        if direction == 'long':
            if (rsi_values < 35).sum() > 3:  # RSI oversold for too long
                return False
        else:
            if (rsi_values > 65).sum() > 3:  # RSI overbought for too long
                return False
        
        return True
    
    def _calculate_optimal_position_size(self, signal: Dict) -> float:
        """
        Calculate optimal position size based on confidence and market conditions
        """
        if not self.confidence_multiplier:
            return self.base_position_size
        
        # Base size
        base_size = self.base_position_size
        
        # Confidence multiplier (75-95% confidence range)
        confidence = signal['confidence']
        confidence_factor = (confidence - 75) / 20  # 0 to 1 range
        
        # Volume multiplier
        volume_ratio = signal['volume_ratio']
        volume_factor = min(1.0, (volume_ratio - 1.6) / 1.0)  # 0 to 1 range
        
        # Calculate final size
        size_multiplier = 1.0 + (confidence_factor * 0.5) + (volume_factor * 0.3)
        optimal_size = base_size * size_multiplier
        
        # Clamp to limits
        optimal_size = max(self.base_position_size, min(self.max_position_size, optimal_size))
        
        return round(optimal_size)
    
    def _calculate_optimized_confidence(self, rsi_strength, bb_strength, volume_ratio, trend, direction) -> int:
        """
        Optimized confidence calculation with higher standards
        """
        base_confidence = 65  # Higher base
        
        # RSI contribution (higher weighting for proven pattern)
        rsi_bonus = min(20, rsi_strength * 1.2)
        
        # BB contribution (higher weighting for proven pattern)
        bb_bonus = min(20, bb_strength * 35)
        
        # Volume contribution (stricter requirements)
        volume_bonus = min(15, (volume_ratio - 1.6) * 20)
        
        # Trend alignment bonus
        trend_bonus = 0
        if ((direction == 'long' and trend == 'bullish') or
            (direction == 'short' and trend == 'bearish')):
            trend_bonus = 8
        
        total_confidence = base_confidence + rsi_bonus + bb_bonus + volume_bonus + trend_bonus
        return min(95, max(50, int(total_confidence)))

class OptimizedExecutor:
    """Executor that uses optimized position sizing"""
    
    def execute_optimized_trade(self, signal: Dict, df: pd.DataFrame) -> Dict:
        """Execute trade with optimized position size"""
        
        # Use the calculated optimal position size
        amount = signal['optimal_position_size']
        
        signal_time = pd.to_datetime(signal['timestamp'])
        signal_idx = df[df['timestamp'] >= signal_time].index[0] if len(df[df['timestamp'] >= signal_time]) > 0 else len(df) - 1
        
        entry_price = signal['price']
        stop_loss = signal['stop_loss']
        take_profit = signal['take_profit']
        
        # Standard execution (keep what works)
        exit_price = None
        exit_reason = "time_exit"
        
        for i in range(signal_idx + 1, min(signal_idx + 21, len(df))):
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
        
        # Time exit
        if exit_price is None:
            exit_idx = min(signal_idx + 20, len(df) - 1)
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
            'pattern': signal['pattern'],
            'confidence': signal['confidence'],
            'position_size_factor': amount / 40  # Show sizing factor
        }

async def test_optimized_algorithm():
    """Test optimized algorithm vs original"""
    print("🎯 TESTING OPTIMIZED SIZING ALGORITHM")
    print("=" * 70)
    
    from real_data_integration import RealDataProvider
    from ada_custom_algorithm import ADACustomBacktestEngine
    
    data_provider = RealDataProvider()
    df = await data_provider.fetch_real_ada_data(timeframe='15m', days=7)
    
    # Test original
    print("\n📊 ORIGINAL ALGORITHM:")
    original_algo = ADACustomAlgorithm()
    original_signals = original_algo.analyze_price_data(df)
    
    original_engine = ADACustomBacktestEngine()
    original_total_pnl = 0
    original_wins = 0
    
    for signal in original_signals:
        result = original_engine._execute_ada_trade(signal, 50, df)
        original_total_pnl += result['pnl']
        if result['pnl'] > 0:
            original_wins += 1
    
    original_win_rate = original_wins / len(original_signals) * 100 if original_signals else 0
    print(f"Original: {len(original_signals)} trades, {original_win_rate:.1f}% win rate, {original_total_pnl:.1f} ADA")
    
    # Test optimized
    print("\n🎯 OPTIMIZED SIZING ALGORITHM:")
    optimized_algo = OptimizedSizingAlgorithm()
    optimized_signals = optimized_algo.analyze_price_data(df)
    
    if optimized_signals:
        optimized_executor = OptimizedExecutor()
        optimized_total_pnl = 0
        optimized_wins = 0
        
        for signal in optimized_signals:
            result = optimized_executor.execute_optimized_trade(signal, df)
            optimized_total_pnl += result['pnl']
            if result['pnl'] > 0:
                optimized_wins += 1
            
            print(f"  Trade: {result['amount']:.0f} ADA (size factor {result['position_size_factor']:.1f}x), "
                  f"P&L: {result['pnl']:.1f} ADA, Exit: {result['exit_reason']}, Conf: {signal['confidence']}%")
        
        optimized_win_rate = optimized_wins / len(optimized_signals) * 100
        print(f"\nOptimized: {len(optimized_signals)} trades, {optimized_win_rate:.1f}% win rate, {optimized_total_pnl:.1f} ADA")
        
        # Compare
        if optimized_total_pnl > original_total_pnl:
            improvement = optimized_total_pnl - original_total_pnl
            print(f"✅ IMPROVEMENT: +{improvement:.1f} ADA")
        else:
            print(f"❌ No improvement achieved")
    else:
        print("No optimized signals generated (too strict)")

if __name__ == "__main__":
    asyncio.run(test_optimized_algorithm())
