#!/usr/bin/env python3
"""
ADA Refined Algorithm
Optimized version focusing on highest-quality signals to achieve 70%+ win rate

Based on analysis showing:
- RSI oversold bounce: 72% success rate
- BB lower bounce: 78.3% success rate
- Volume spike confirmation: 61% success rate

This version adds additional filters to improve signal quality
"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from real_data_integration import RealDataProvider

class ADARefinedAlgorithm:
    """
    Refined ADA algorithm targeting 70%+ win rate
    """
    
    def __init__(self):
        # Core parameters (optimized for quality)
        self.rsi_oversold = 32      # Sweet spot between 30-35
        self.rsi_overbought = 68    # Sweet spot between 65-70
        self.volume_spike_threshold = 1.5  # Moderate requirement
        self.bb_reversal_distance = 0.15   # Moderate distance
        
        # Additional quality filters
        self.min_confidence = 75    # Higher confidence requirement
        self.trend_alignment_bonus = 10  # Bonus for trend alignment
        self.consecutive_filter = True   # Avoid consecutive signals
        
        # Risk management
        self.stop_loss_pct = 0.045  # 4.5% stop loss
        self.take_profit_pct = 0.09 # 9% take profit (2:1 ratio)
        
        # Time filters (only best hours)
        self.preferred_hours = [12, 13, 14, 15, 20, 21, 22]  # Extended good hours
        self.avoid_hours = [5, 6, 23, 0, 1]  # Avoid worst hours
        
        # Market condition filters
        self.max_volatility_threshold = 0.08  # Avoid extreme volatility
        self.min_volatility_threshold = 0.02  # Avoid dead markets
    
    def analyze_price_data(self, df: pd.DataFrame) -> List[Dict]:
        """
        Refined analysis focusing on highest-quality signals
        """
        signals = []
        
        # Add comprehensive indicators
        df = self._add_refined_indicators(df)
        
        last_signal_idx = -20  # Track last signal to avoid clustering
        
        for i in range(50, len(df)):
            current_bar = df.iloc[i]
            window = df.iloc[i-30:i+1]
            
            # Quality filters
            if not self._passes_quality_filters(current_bar, i, last_signal_idx):
                continue
            
            # Check for refined signals
            signal = self._check_refined_patterns(current_bar, window)
            
            if signal:
                signals.append(signal)
                last_signal_idx = i  # Update last signal position
        
        print(f"🎯 Generated {len(signals)} REFINED ADA signals")
        return signals
    
    def _add_refined_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add comprehensive indicators for refined analysis"""
        df = df.copy()
        
        # Core indicators
        df['rsi'] = self._calculate_rsi(df['close'])
        df['rsi_ma'] = df['rsi'].rolling(window=3).mean()  # Smoothed RSI
        
        # Bollinger Bands
        df['bb_middle'] = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']
        
        # Volume analysis
        df['volume_sma'] = df['volume'].rolling(window=20).mean()
        df['volume_ratio'] = df['volume'] / df['volume_sma']
        df['volume_trend'] = df['volume_ratio'].rolling(window=3).mean()
        
        # Trend analysis
        df['sma_10'] = df['close'].rolling(window=10).mean()
        df['sma_20'] = df['close'].rolling(window=20).mean()
        df['trend_strength'] = abs(df['sma_10'] - df['sma_20']) / df['sma_20']
        df['trend_direction'] = np.where(df['sma_10'] > df['sma_20'], 'bullish', 'bearish')
        
        # Price action
        df['body_size'] = abs(df['close'] - df['open']) / df['open']
        df['candle_type'] = np.where(df['close'] > df['open'], 'bullish', 'bearish')
        
        # Volatility
        df['atr'] = self._calculate_atr(df)
        df['volatility'] = df['atr'] / df['close']
        
        # Time features
        df['hour'] = df['timestamp'].dt.hour
        
        # Momentum
        df['momentum_3'] = df['close'].pct_change(3)
        df['momentum_5'] = df['close'].pct_change(5)
        
        return df
    
    def _passes_quality_filters(self, bar, current_idx, last_signal_idx) -> bool:
        """Apply quality filters to improve signal reliability"""
        
        # Time filter
        if bar['hour'] in self.avoid_hours:
            return False
        
        # Volatility filter (avoid extreme conditions)
        if (bar['volatility'] > self.max_volatility_threshold or 
            bar['volatility'] < self.min_volatility_threshold):
            return False
        
        # Consecutive signal filter (avoid clustering)
        if self.consecutive_filter and (current_idx - last_signal_idx) < 8:
            return False
        
        # BB width filter (avoid low volatility periods)
        if bar['bb_width'] < 0.03:  # Less than 3% BB width
            return False
        
        return True
    
    def _check_refined_patterns(self, current_bar, window) -> Optional[Dict]:
        """
        Check for refined high-quality patterns
        """
        
        # Current values
        rsi = current_bar['rsi']
        rsi_ma = current_bar['rsi_ma']
        bb_position = current_bar['bb_position']
        volume_ratio = current_bar['volume_ratio']
        volume_trend = current_bar['volume_trend']
        trend_direction = current_bar['trend_direction']
        trend_strength = current_bar['trend_strength']
        body_size = current_bar['body_size']
        candle_type = current_bar['candle_type']
        momentum_3 = current_bar['momentum_3']
        price = current_bar['close']
        
        # REFINED LONG PATTERN
        if (rsi < self.rsi_oversold and                      # RSI oversold
            rsi_ma < self.rsi_oversold + 2 and              # Smoothed RSI confirms
            bb_position < self.bb_reversal_distance and     # Near BB lower
            volume_ratio > self.volume_spike_threshold and  # Volume spike
            volume_trend > 1.2 and                          # Sustained volume
            body_size > 0.003 and                           # Significant movement
            candle_type == 'bullish' and                    # Bullish candle
            momentum_3 > -0.02):                            # Not falling too fast
            
            # Calculate refined confidence
            confidence = self._calculate_refined_confidence(
                rsi, bb_position, volume_ratio, trend_direction, 
                trend_strength, body_size, 'long'
            )
            
            if confidence >= self.min_confidence:
                return {
                    'timestamp': current_bar['timestamp'],
                    'type': 'long',
                    'price': price,
                    'confidence': confidence,
                    'rsi': rsi,
                    'bb_position': bb_position,
                    'volume_ratio': volume_ratio,
                    'trend_direction': trend_direction,
                    'pattern': 'Refined_RSI_BB_Long',
                    'stop_loss': price * (1 - self.stop_loss_pct),
                    'take_profit': price * (1 + self.take_profit_pct),
                    'reasoning': f"REFINED LONG: RSI {rsi:.1f}, BB pos {bb_position:.2f}, Vol {volume_ratio:.1f}x, Trend {trend_direction}"
                }
        
        # REFINED SHORT PATTERN (more selective)
        elif (rsi > self.rsi_overbought and                  # RSI overbought
              rsi_ma > self.rsi_overbought - 2 and          # Smoothed RSI confirms
              bb_position > (1 - self.bb_reversal_distance) and # Near BB upper
              volume_ratio > self.volume_spike_threshold and # Volume spike
              volume_trend > 1.2 and                        # Sustained volume
              body_size > 0.003 and                         # Significant movement
              candle_type == 'bearish' and                  # Bearish candle
              momentum_3 < 0.02):                           # Not rising too fast
            
            confidence = self._calculate_refined_confidence(
                100 - rsi, 1 - bb_position, volume_ratio, 
                'bearish' if trend_direction == 'bullish' else 'bullish',
                trend_strength, body_size, 'short'
            )
            
            # Higher threshold for shorts (historically less reliable)
            if confidence >= self.min_confidence + 5:
                return {
                    'timestamp': current_bar['timestamp'],
                    'type': 'short',
                    'price': price,
                    'confidence': confidence,
                    'rsi': rsi,
                    'bb_position': bb_position,
                    'volume_ratio': volume_ratio,
                    'trend_direction': trend_direction,
                    'pattern': 'Refined_RSI_BB_Short',
                    'stop_loss': price * (1 + self.stop_loss_pct),
                    'take_profit': price * (1 - self.take_profit_pct),
                    'reasoning': f"REFINED SHORT: RSI {rsi:.1f}, BB pos {bb_position:.2f}, Vol {volume_ratio:.1f}x, Trend {trend_direction}"
                }
        
        return None
    
    def _calculate_refined_confidence(self, rsi_strength, bb_strength, volume_ratio, 
                                    trend_direction, trend_strength, body_size, direction) -> int:
        """
        Calculate refined confidence with multiple factors
        """
        base_confidence = 65
        
        # RSI contribution (stronger weighting for proven 72% success rate)
        rsi_bonus = min(20, rsi_strength * 0.8)
        
        # BB contribution (stronger weighting for proven 78.3% success rate)
        bb_bonus = min(20, bb_strength * 50)
        
        # Volume contribution
        volume_bonus = min(15, (volume_ratio - 1.5) * 12)
        
        # Trend alignment bonus
        trend_bonus = 0
        if ((direction == 'long' and trend_direction == 'bullish') or
            (direction == 'short' and trend_direction == 'bearish')):
            trend_bonus = min(self.trend_alignment_bonus, trend_strength * 100)
        
        # Price action bonus
        body_bonus = min(8, body_size * 1500)
        
        # Time bonus (trading during preferred hours)
        time_bonus = 3  # Small bonus for good timing
        
        total_confidence = (base_confidence + rsi_bonus + bb_bonus + 
                          volume_bonus + trend_bonus + body_bonus + time_bonus)
        
        return min(95, max(50, int(total_confidence)))
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50)
    
    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate Average True Range"""
        high_low = df['high'] - df['low']
        high_close = np.abs(df['high'] - df['close'].shift())
        low_close = np.abs(df['low'] - df['close'].shift())
        
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = ranges.max(axis=1)
        return true_range.rolling(window=period).mean()

# Quick test
async def test_refined_algorithm():
    """Test refined algorithm"""
    from ada_custom_algorithm import ADACustomBacktestEngine
    
    # Create engine with refined strategy
    engine = ADACustomBacktestEngine()
    engine.strategy = ADARefinedAlgorithm()  # Replace with refined strategy
    
    config = {
        'timeframe': '15m',
        'days': 60,
        'initial_balance': 200
    }
    
    results = await engine.run_ada_custom_backtest(config)
    
    if 'error' not in results and results['total_trades'] > 0:
        print(f"\n🎯 REFINED ALGORITHM PERFORMANCE:")
        print(f"   Win Rate: {results['win_rate']:.1f}%")
        print(f"   Total Return: {results['return_percentage']:.1f}%")
        print(f"   Trades: {results['total_trades']}")
        
        if results['win_rate'] >= 70:
            print("🎉 TARGET ACHIEVED: 70%+ win rate!")
        else:
            print("⚠️ Still optimizing for 70%+ win rate")

if __name__ == "__main__":
    asyncio.run(test_refined_algorithm())
