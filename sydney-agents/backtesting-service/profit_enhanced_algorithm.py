#!/usr/bin/env python3
"""
Profit Enhanced ADA Algorithm
Small tweaks to maximize profits from winning trades while keeping losses controlled

Enhancements:
1. Dynamic take profit based on volatility
2. Trailing stop for big winners
3. Partial profit taking
4. Time-based exit optimization
5. Confidence-based position sizing
"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from real_data_integration import RealDataProvider

class ProfitEnhancedAlgorithm:
    """
    Enhanced version of our successful ADA algorithm with profit optimization
    """
    
    def __init__(self):
        # Core parameters (keep what works)
        self.rsi_oversold = 35
        self.rsi_overbought = 65
        self.volume_threshold = 1.4
        self.bb_distance = 0.2
        self.min_confidence = 70
        
        # ENHANCED: Dynamic risk management
        self.base_stop_loss = 0.04      # 4% base stop loss
        self.base_take_profit = 0.08    # 8% base take profit
        
        # NEW: Profit enhancement parameters
        self.volatility_multiplier = True   # Adjust TP based on volatility
        self.trailing_stop_enabled = True   # Enable trailing stops
        self.partial_profit_enabled = True  # Take partial profits
        self.confidence_sizing = True       # Size based on confidence
        
        # Volatility-based adjustments
        self.low_vol_tp_multiplier = 0.7    # Reduce TP in low vol (5.6%)
        self.high_vol_tp_multiplier = 1.5   # Increase TP in high vol (12%)
        self.vol_threshold_low = 0.03       # 3% daily vol threshold
        self.vol_threshold_high = 0.07      # 7% daily vol threshold
        
        # Trailing stop parameters
        self.trailing_start = 0.06          # Start trailing at 6% profit
        self.trailing_distance = 0.03       # Trail 3% behind peak
        
        # Partial profit parameters
        self.partial_profit_level = 0.05    # Take 50% profit at 5%
        self.partial_profit_amount = 0.5    # Take 50% of position
    
    def analyze_price_data(self, df: pd.DataFrame) -> List[Dict]:
        """Enhanced analysis with profit optimization"""
        signals = []
        
        # Add enhanced indicators
        df = self._add_enhanced_indicators(df)
        
        last_signal_idx = -10
        
        for i in range(30, len(df)):
            current_bar = df.iloc[i]
            
            # Basic filters
            if not self._basic_filters(current_bar, i, last_signal_idx):
                continue
            
            # Check for enhanced signals
            signal = self._check_enhanced_patterns(current_bar, df.iloc[i-20:i+1])
            
            if signal:
                signals.append(signal)
                last_signal_idx = i
        
        print(f"🎯 Generated {len(signals)} PROFIT-ENHANCED signals")
        return signals
    
    def _add_enhanced_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add indicators including volatility analysis"""
        df = df.copy()
        
        # Core indicators
        df['rsi'] = self._calculate_rsi(df['close'])
        
        # Bollinger Bands
        df['bb_middle'] = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # Volume
        df['volume_sma'] = df['volume'].rolling(window=15).mean()
        df['volume_ratio'] = df['volume'] / df['volume_sma']
        
        # ENHANCED: Volatility analysis
        df['returns'] = df['close'].pct_change()
        df['volatility_20'] = df['returns'].rolling(window=20).std() * np.sqrt(96)  # Daily vol
        df['volatility_regime'] = np.where(
            df['volatility_20'] > self.vol_threshold_high, 'high',
            np.where(df['volatility_20'] < self.vol_threshold_low, 'low', 'normal')
        )
        
        # Trend
        df['sma_20'] = df['close'].rolling(window=20).mean()
        df['trend'] = np.where(df['close'] > df['sma_20'], 'bullish', 'bearish')
        
        # Price action
        df['body_size'] = abs(df['close'] - df['open']) / df['open']
        df['is_bullish_candle'] = df['close'] > df['open']
        
        # Time and momentum
        df['hour'] = df['timestamp'].dt.hour
        df['momentum'] = df['close'].pct_change(3)
        
        # ENHANCED: Support/Resistance levels
        df['recent_high'] = df['high'].rolling(window=10).max()
        df['recent_low'] = df['low'].rolling(window=10).min()
        df['resistance_distance'] = (df['recent_high'] - df['close']) / df['close']
        df['support_distance'] = (df['close'] - df['recent_low']) / df['close']
        
        return df
    
    def _basic_filters(self, bar, current_idx, last_signal_idx) -> bool:
        """Basic quality filters"""
        # Avoid worst trading hours
        if bar['hour'] in [5, 23]:
            return False
        
        # Minimum gap between signals
        if (current_idx - last_signal_idx) < 4:
            return False
        
        # Minimum body size
        if bar['body_size'] < 0.002:
            return False
        
        return True
    
    def _check_enhanced_patterns(self, current_bar, window) -> Optional[Dict]:
        """Enhanced pattern detection with profit optimization"""
        
        rsi = current_bar['rsi']
        bb_position = current_bar['bb_position']
        volume_ratio = current_bar['volume_ratio']
        trend = current_bar['trend']
        is_bullish_candle = current_bar['is_bullish_candle']
        momentum = current_bar['momentum']
        price = current_bar['close']
        volatility_regime = current_bar['volatility_regime']
        resistance_distance = current_bar['resistance_distance']
        support_distance = current_bar['support_distance']
        
        # LONG PATTERN with enhanced profit targets
        if (rsi < self.rsi_oversold and
            bb_position < self.bb_distance and
            volume_ratio > self.volume_threshold and
            is_bullish_candle and
            momentum > -0.03):
            
            confidence = self._calculate_enhanced_confidence(
                rsi, bb_position, volume_ratio, trend, support_distance, 'long'
            )
            
            if confidence >= self.min_confidence:
                # ENHANCED: Dynamic profit targets
                enhanced_targets = self._calculate_enhanced_targets(
                    price, volatility_regime, resistance_distance, confidence, 'long'
                )
                
                return {
                    'timestamp': current_bar['timestamp'],
                    'type': 'long',
                    'price': price,
                    'confidence': confidence,
                    'rsi': rsi,
                    'bb_position': bb_position,
                    'volume_ratio': volume_ratio,
                    'trend': trend,
                    'volatility_regime': volatility_regime,
                    'pattern': 'Enhanced_Long_Pattern',
                    'stop_loss': enhanced_targets['stop_loss'],
                    'take_profit': enhanced_targets['take_profit'],
                    'partial_profit_level': enhanced_targets['partial_profit_level'],
                    'trailing_start': enhanced_targets['trailing_start'],
                    'reasoning': f"ENHANCED LONG: RSI {rsi:.1f}, Vol regime {volatility_regime}, Conf {confidence}%"
                }
        
        # SHORT PATTERN (similar enhancements)
        elif (rsi > self.rsi_overbought and
              bb_position > (1 - self.bb_distance) and
              volume_ratio > self.volume_threshold and
              not is_bullish_candle and
              momentum < 0.03):
            
            confidence = self._calculate_enhanced_confidence(
                100 - rsi, 1 - bb_position, volume_ratio, trend, resistance_distance, 'short'
            )
            
            if confidence >= self.min_confidence + 3:
                enhanced_targets = self._calculate_enhanced_targets(
                    price, volatility_regime, support_distance, confidence, 'short'
                )
                
                return {
                    'timestamp': current_bar['timestamp'],
                    'type': 'short',
                    'price': price,
                    'confidence': confidence,
                    'rsi': rsi,
                    'bb_position': bb_position,
                    'volume_ratio': volume_ratio,
                    'trend': trend,
                    'volatility_regime': volatility_regime,
                    'pattern': 'Enhanced_Short_Pattern',
                    'stop_loss': enhanced_targets['stop_loss'],
                    'take_profit': enhanced_targets['take_profit'],
                    'partial_profit_level': enhanced_targets['partial_profit_level'],
                    'trailing_start': enhanced_targets['trailing_start'],
                    'reasoning': f"ENHANCED SHORT: RSI {rsi:.1f}, Vol regime {volatility_regime}, Conf {confidence}%"
                }
        
        return None
    
    def _calculate_enhanced_targets(self, price: float, vol_regime: str, 
                                  distance_to_level: float, confidence: int, direction: str) -> Dict:
        """Calculate enhanced profit targets based on market conditions"""
        
        # Base targets
        base_stop = self.base_stop_loss
        base_tp = self.base_take_profit
        
        # ENHANCEMENT 1: Volatility-based adjustments
        if vol_regime == 'high':
            tp_multiplier = self.high_vol_tp_multiplier  # 1.5x = 12% TP
        elif vol_regime == 'low':
            tp_multiplier = self.low_vol_tp_multiplier   # 0.7x = 5.6% TP
        else:
            tp_multiplier = 1.0  # Normal 8% TP
        
        # ENHANCEMENT 2: Confidence-based adjustments
        confidence_bonus = (confidence - 70) / 100 * 0.3  # Up to 30% bonus for high confidence
        tp_multiplier += confidence_bonus
        
        # ENHANCEMENT 3: Distance to resistance/support
        if distance_to_level > 0.05:  # >5% room to move
            tp_multiplier += 0.2  # 20% bonus
        elif distance_to_level < 0.02:  # <2% room
            tp_multiplier -= 0.2  # 20% reduction
        
        # Calculate final targets
        adjusted_tp = base_tp * tp_multiplier
        adjusted_tp = max(0.06, min(0.15, adjusted_tp))  # Clamp between 6% and 15%
        
        if direction == 'long':
            stop_loss = price * (1 - base_stop)
            take_profit = price * (1 + adjusted_tp)
            partial_profit_level = price * (1 + adjusted_tp * 0.6)  # 60% of TP
            trailing_start = price * (1 + self.trailing_start)
        else:
            stop_loss = price * (1 + base_stop)
            take_profit = price * (1 - adjusted_tp)
            partial_profit_level = price * (1 - adjusted_tp * 0.6)
            trailing_start = price * (1 - self.trailing_start)
        
        return {
            'stop_loss': stop_loss,
            'take_profit': take_profit,
            'partial_profit_level': partial_profit_level,
            'trailing_start': trailing_start,
            'tp_multiplier': tp_multiplier,
            'adjusted_tp_pct': adjusted_tp * 100
        }
    
    def _calculate_enhanced_confidence(self, rsi_strength, bb_strength, volume_ratio, 
                                     trend, distance_to_level, direction) -> int:
        """Enhanced confidence calculation"""
        base_confidence = 60
        
        # RSI contribution
        rsi_bonus = min(25, rsi_strength * 1.0)
        
        # BB contribution
        bb_bonus = min(20, bb_strength * 30)
        
        # Volume contribution
        volume_bonus = min(15, (volume_ratio - 1.4) * 15)
        
        # Trend alignment
        trend_bonus = 0
        if ((direction == 'long' and trend == 'bullish') or
            (direction == 'short' and trend == 'bearish')):
            trend_bonus = 5
        
        # ENHANCED: Distance to resistance/support bonus
        distance_bonus = min(10, distance_to_level * 200)  # Up to 10 points
        
        total_confidence = (base_confidence + rsi_bonus + bb_bonus + 
                          volume_bonus + trend_bonus + distance_bonus)
        return min(95, max(50, int(total_confidence)))
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50)

class EnhancedTradeExecutor:
    """Enhanced trade execution with profit optimization"""
    
    def execute_enhanced_trade(self, signal: Dict, amount: float, df: pd.DataFrame) -> Dict:
        """Execute trade with enhanced profit-taking logic"""
        
        signal_time = pd.to_datetime(signal['timestamp'])
        signal_idx = df[df['timestamp'] >= signal_time].index[0] if len(df[df['timestamp'] >= signal_time]) > 0 else len(df) - 1
        
        entry_price = signal['price']
        stop_loss = signal['stop_loss']
        take_profit = signal['take_profit']
        partial_profit_level = signal['partial_profit_level']
        trailing_start = signal['trailing_start']
        
        # Track trade progress
        position_size = amount
        total_pnl = 0
        exit_reason = "time_exit"
        exit_price = None
        
        # Enhanced exit logic
        highest_profit = 0
        trailing_stop = None
        partial_taken = False
        
        for i in range(signal_idx + 1, min(signal_idx + 21, len(df))):
            bar = df.iloc[i]
            current_price = bar['close']
            
            if signal['type'] == 'long':
                current_profit_pct = (current_price - entry_price) / entry_price
                
                # Check stop loss
                if bar['low'] <= stop_loss:
                    exit_price = stop_loss
                    exit_reason = "stop_loss"
                    break
                
                # ENHANCEMENT: Partial profit taking
                if not partial_taken and current_price >= partial_profit_level:
                    # Take 50% profit
                    partial_pnl = (position_size * 0.5) * ((current_price - entry_price) / entry_price) * 10
                    total_pnl += partial_pnl
                    position_size *= 0.5  # Reduce position size
                    partial_taken = True
                    print(f"   📈 Partial profit taken: {partial_pnl:.1f} ADA at {current_profit_pct*100:.1f}%")
                
                # ENHANCEMENT: Trailing stop
                if current_price >= trailing_start:
                    if current_profit_pct > highest_profit:
                        highest_profit = current_profit_pct
                        trailing_stop = current_price * (1 - 0.03)  # 3% trailing distance
                    
                    if trailing_stop and bar['low'] <= trailing_stop:
                        exit_price = trailing_stop
                        exit_reason = "trailing_stop"
                        break
                
                # Check take profit
                if bar['high'] >= take_profit:
                    exit_price = take_profit
                    exit_reason = "take_profit"
                    break
            
            else:  # short
                current_profit_pct = (entry_price - current_price) / entry_price
                
                # Similar logic for shorts (inverted)
                if bar['high'] >= stop_loss:
                    exit_price = stop_loss
                    exit_reason = "stop_loss"
                    break
                
                if not partial_taken and current_price <= partial_profit_level:
                    partial_pnl = (position_size * 0.5) * ((entry_price - current_price) / entry_price) * 10
                    total_pnl += partial_pnl
                    position_size *= 0.5
                    partial_taken = True
                
                if bar['low'] <= take_profit:
                    exit_price = take_profit
                    exit_reason = "take_profit"
                    break
        
        # Final exit if no stop/target hit
        if exit_price is None:
            exit_idx = min(signal_idx + 20, len(df) - 1)
            exit_price = df.iloc[exit_idx]['close']
        
        # Calculate final P&L
        price_change = (exit_price - entry_price) / entry_price
        direction = 1 if signal['type'] == 'long' else -1
        leveraged_return = price_change * direction * 10
        
        final_pnl = position_size * leveraged_return - 3  # Remaining position + fees
        total_pnl += final_pnl
        
        return {
            'timestamp': signal['timestamp'],
            'type': signal['type'],
            'entry_price': entry_price,
            'exit_price': exit_price,
            'exit_reason': exit_reason,
            'amount': amount,
            'pnl': total_pnl,
            'pnl_percentage': (total_pnl / amount) * 100,
            'pattern': signal['pattern'],
            'confidence': signal['confidence'],
            'partial_taken': partial_taken,
            'trailing_used': trailing_stop is not None,
            'tp_multiplier': signal.get('tp_multiplier', 1.0),
            'volatility_regime': signal['volatility_regime']
        }

# Quick test function
async def test_enhanced_algorithm():
    """Test enhanced algorithm vs original"""
    print("🚀 TESTING PROFIT-ENHANCED ALGORITHM")
    print("=" * 60)
    
    from real_data_integration import RealDataProvider
    data_provider = RealDataProvider()
    
    # Get data
    df = await data_provider.fetch_real_ada_data(timeframe='15m', days=7)
    
    # Test enhanced algorithm
    enhanced_algo = ProfitEnhancedAlgorithm()
    enhanced_signals = enhanced_algo.analyze_price_data(df)
    
    print(f"Enhanced algorithm generated: {len(enhanced_signals)} signals")
    
    if enhanced_signals:
        executor = EnhancedTradeExecutor()
        
        total_pnl = 0
        wins = 0
        
        for signal in enhanced_signals:
            result = executor.execute_enhanced_trade(signal, 50, df)
            total_pnl += result['pnl']
            if result['pnl'] > 0:
                wins += 1
            
            print(f"Trade: {result['pnl']:.1f} ADA, Exit: {result['exit_reason']}, "
                  f"Partial: {result['partial_taken']}, TP Mult: {result['tp_multiplier']:.1f}x")
        
        win_rate = wins / len(enhanced_signals) * 100
        print(f"\nEnhanced Results: {win_rate:.1f}% win rate, {total_pnl:.1f} ADA total")

if __name__ == "__main__":
    asyncio.run(test_enhanced_algorithm())
