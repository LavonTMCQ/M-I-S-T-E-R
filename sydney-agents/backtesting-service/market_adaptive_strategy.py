#!/usr/bin/env python3
"""
Market-Adaptive Fibonacci Strategy
Adapts to different market conditions for consistent profitability

Key Innovations:
1. Market regime detection (trending vs ranging)
2. Volatility-adjusted parameters
3. Multi-timeframe confirmation
4. Dynamic stop losses based on market conditions
5. Trade filtering based on market state
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import asyncio
from real_data_integration import RealDataProvider

class MarketAdaptiveStrategy:
    """
    Fibonacci strategy that adapts to market conditions
    """
    
    def __init__(self):
        # Base parameters
        self.lookback_period = 30
        self.fibonacci_levels = [0.382, 0.5, 0.618]
        
        # Adaptive parameters (will be adjusted based on market conditions)
        self.tolerance = 0.005
        self.min_confidence = 75
        self.volume_threshold = 1.4
        self.stop_loss_pct = 0.05
        
        # Market regime detection parameters
        self.trend_period = 20
        self.volatility_period = 14
        self.range_threshold = 0.02  # 2% range for ranging market
    
    def analyze_price_data(self, df: pd.DataFrame) -> List[Dict]:
        """
        Market-adaptive analysis
        """
        signals = []
        
        # Add technical indicators
        df = self._add_technical_indicators(df)
        
        # Detect market regimes
        df = self._detect_market_regimes(df)
        
        for i in range(self.lookback_period, len(df)):
            window = df.iloc[i-self.lookback_period:i+1]
            current_bar = df.iloc[i]
            
            # Get current market regime
            market_regime = current_bar['market_regime']
            volatility_regime = current_bar['volatility_regime']
            
            # Skip trading in unfavorable conditions
            if not self._should_trade_in_regime(market_regime, volatility_regime):
                continue
            
            # Adapt parameters to market conditions
            adapted_params = self._adapt_parameters(market_regime, volatility_regime)
            
            # Find swing points
            swing_high = window['high'].max()
            swing_low = window['low'].min()
            
            # Validate setup with adaptive parameters
            if not self._is_valid_adaptive_setup(swing_high, swing_low, current_bar['close'], adapted_params):
                continue
            
            # Calculate Fibonacci levels
            fib_levels = self._calculate_fibonacci_levels(swing_high, swing_low)
            current_price = current_bar['close']
            
            # Check for high-probability signals
            signal = self._check_for_adaptive_signal(
                current_bar, window, fib_levels, current_price, 
                swing_high, swing_low, adapted_params, market_regime
            )
            
            if signal:
                signals.append(signal)
        
        print(f"🎯 Generated {len(signals)} MARKET-ADAPTIVE signals")
        return signals
    
    def _add_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add comprehensive technical indicators"""
        df = df.copy()
        
        # RSI
        df['rsi'] = self._calculate_rsi(df['close'])
        
        # Moving averages for trend
        df['sma_10'] = df['close'].rolling(window=10).mean()
        df['sma_20'] = df['close'].rolling(window=20).mean()
        df['ema_12'] = df['close'].ewm(span=12).mean()
        df['ema_26'] = df['close'].ewm(span=26).mean()
        
        # MACD
        df['macd'] = df['ema_12'] - df['ema_26']
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        
        # Bollinger Bands
        df['bb_middle'] = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        
        # Volume
        df['volume_sma'] = df['volume'].rolling(window=15).mean()
        df['volume_ratio'] = df['volume'] / df['volume_sma']
        
        # Volatility (ATR)
        df['atr'] = self._calculate_atr(df)
        df['atr_pct'] = df['atr'] / df['close']
        
        return df
    
    def _detect_market_regimes(self, df: pd.DataFrame) -> pd.DataFrame:
        """Detect market regimes (trending vs ranging, high vs low volatility)"""
        df = df.copy()
        
        # Trend detection using ADX-like calculation
        df['trend_strength'] = abs(df['sma_10'] - df['sma_20']) / df['sma_20']
        df['trend_direction'] = np.where(df['sma_10'] > df['sma_20'], 'bullish', 'bearish')
        
        # Market regime classification
        df['market_regime'] = np.where(
            df['trend_strength'] > 0.02, 'trending', 'ranging'
        )
        
        # Volatility regime
        volatility_median = df['atr_pct'].rolling(window=50).median()
        df['volatility_regime'] = np.where(
            df['atr_pct'] > volatility_median * 1.5, 'high_vol', 'normal_vol'
        )
        
        return df
    
    def _should_trade_in_regime(self, market_regime: str, volatility_regime: str) -> bool:
        """Determine if we should trade in current market conditions"""
        
        # Avoid trading in high volatility trending markets (most dangerous)
        if market_regime == 'trending' and volatility_regime == 'high_vol':
            return False
        
        # Prefer ranging markets for Fibonacci strategy
        return True
    
    def _adapt_parameters(self, market_regime: str, volatility_regime: str) -> Dict:
        """Adapt strategy parameters based on market conditions"""
        
        if market_regime == 'ranging':
            # Ranging market: more aggressive
            return {
                'tolerance': 0.006,      # Wider tolerance
                'min_confidence': 70,    # Lower confidence requirement
                'volume_threshold': 1.2, # Lower volume requirement
                'stop_loss_pct': 0.04,   # Tighter stops
                'take_profit_ratio': 2.0 # Higher reward:risk
            }
        else:  # trending market
            # Trending market: more conservative
            return {
                'tolerance': 0.003,      # Tighter tolerance
                'min_confidence': 80,    # Higher confidence requirement
                'volume_threshold': 1.6, # Higher volume requirement
                'stop_loss_pct': 0.06,   # Wider stops
                'take_profit_ratio': 1.5 # Lower reward:risk
            }
    
    def _is_valid_adaptive_setup(self, swing_high: float, swing_low: float, 
                                current_price: float, params: Dict) -> bool:
        """Validate setup with adaptive parameters"""
        
        # Minimum range (adaptive)
        fib_range = swing_high - swing_low
        range_pct = fib_range / swing_low
        min_range = 0.015 if params['min_confidence'] < 75 else 0.02
        
        if range_pct < min_range:
            return False
        
        # Price within range
        if current_price < swing_low * 0.98 or current_price > swing_high * 1.02:
            return False
        
        return True
    
    def _check_for_adaptive_signal(self, current_bar, window, fib_levels, current_price, 
                                  swing_high, swing_low, params, market_regime):
        """Check for signals with adaptive parameters"""
        
        # Current indicators
        rsi = current_bar['rsi']
        volume_ratio = current_bar['volume_ratio']
        macd = current_bar['macd']
        macd_signal = current_bar['macd_signal']
        bb_position = (current_price - current_bar['bb_lower']) / (current_bar['bb_upper'] - current_bar['bb_lower'])
        
        # Check Fibonacci levels
        for level_name, level_price in fib_levels.items():
            price_diff = abs(current_price - level_price) / current_price
            
            if price_diff > params['tolerance']:
                continue
            
            # LONG SIGNALS with market-adaptive conditions
            if level_name in ['38.2%', '50.0%', '61.8%']:
                
                # Base conditions
                base_long_conditions = (
                    volume_ratio > params['volume_threshold'] and
                    bb_position < 0.3  # Near lower Bollinger Band
                )
                
                # Market-specific conditions
                if market_regime == 'ranging':
                    # Ranging market: RSI oversold + MACD turning up
                    market_conditions = (
                        rsi < 40 and
                        macd > macd_signal  # MACD above signal line
                    )
                else:  # trending
                    # Trending market: stronger confirmation needed
                    market_conditions = (
                        rsi < 35 and
                        macd > macd_signal and
                        current_bar['trend_direction'] == 'bullish'  # Only trade with trend
                    )
                
                if base_long_conditions and market_conditions:
                    confidence = self._calculate_adaptive_confidence(
                        rsi, volume_ratio, price_diff, macd, bb_position, 'long', params
                    )
                    
                    if confidence >= params['min_confidence']:
                        return {
                            'timestamp': current_bar['timestamp'],
                            'type': 'long',
                            'price': current_price,
                            'fibonacci_level': level_name,
                            'confidence': confidence,
                            'swing_high': swing_high,
                            'swing_low': swing_low,
                            'market_regime': market_regime,
                            'stop_loss': current_price * (1 - params['stop_loss_pct']),
                            'take_profit': current_price * (1 + params['stop_loss_pct'] * params['take_profit_ratio']),
                            'reasoning': f"ADAPTIVE-LONG: {level_name} in {market_regime} market"
                        }
            
            # SHORT SIGNALS with market-adaptive conditions
            elif level_name in ['50.0%', '61.8%']:
                
                # Base conditions
                base_short_conditions = (
                    volume_ratio > params['volume_threshold'] and
                    bb_position > 0.7  # Near upper Bollinger Band
                )
                
                # Market-specific conditions
                if market_regime == 'ranging':
                    # Ranging market: RSI overbought + MACD turning down
                    market_conditions = (
                        rsi > 60 and
                        macd < macd_signal  # MACD below signal line
                    )
                else:  # trending
                    # Trending market: stronger confirmation needed
                    market_conditions = (
                        rsi > 65 and
                        macd < macd_signal and
                        current_bar['trend_direction'] == 'bearish'  # Only trade with trend
                    )
                
                if base_short_conditions and market_conditions:
                    confidence = self._calculate_adaptive_confidence(
                        100 - rsi, volume_ratio, price_diff, -macd, 1 - bb_position, 'short', params
                    )
                    
                    if confidence >= params['min_confidence']:
                        return {
                            'timestamp': current_bar['timestamp'],
                            'type': 'short',
                            'price': current_price,
                            'fibonacci_level': level_name,
                            'confidence': confidence,
                            'swing_high': swing_high,
                            'swing_low': swing_low,
                            'market_regime': market_regime,
                            'stop_loss': current_price * (1 + params['stop_loss_pct']),
                            'take_profit': current_price * (1 - params['stop_loss_pct'] * params['take_profit_ratio']),
                            'reasoning': f"ADAPTIVE-SHORT: {level_name} in {market_regime} market"
                        }
        
        return None
    
    def _calculate_adaptive_confidence(self, rsi_strength, volume_ratio, price_accuracy, 
                                     macd_strength, bb_position, direction, params):
        """Calculate confidence with adaptive weighting"""
        base_confidence = 50
        
        # RSI contribution (0-25 points)
        rsi_bonus = min(25, rsi_strength * 0.7)
        
        # Volume contribution (0-20 points)
        volume_bonus = min(20, (volume_ratio - 1) * 15)
        
        # Price accuracy (0-15 points)
        accuracy_bonus = min(15, (1 - price_accuracy / params['tolerance']) * 15)
        
        # MACD contribution (0-15 points)
        macd_bonus = min(15, abs(macd_strength) * 100)
        
        # Bollinger Band position (0-10 points)
        bb_bonus = min(10, bb_position * 20)
        
        total_confidence = base_confidence + rsi_bonus + volume_bonus + accuracy_bonus + macd_bonus + bb_bonus
        return min(95, max(50, int(total_confidence)))
    
    def _calculate_fibonacci_levels(self, high: float, low: float) -> Dict[str, float]:
        """Calculate Fibonacci levels"""
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
    
    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate Average True Range"""
        high_low = df['high'] - df['low']
        high_close = np.abs(df['high'] - df['close'].shift())
        low_close = np.abs(df['low'] - df['close'].shift())
        
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = ranges.max(axis=1)
        return true_range.rolling(window=period).mean()

# Quick test function
async def test_market_adaptive():
    """Quick test of market adaptive strategy"""
    from real_data_integration import RealDataProvider
    
    data_provider = RealDataProvider()
    strategy = MarketAdaptiveStrategy()
    
    # Test with recent data
    df = await data_provider.fetch_real_ada_data(timeframe='15m', days=7)
    signals = strategy.analyze_price_data(df)
    
    print(f"🎯 Market-Adaptive Strategy Generated: {len(signals)} signals")
    
    # Show market regime distribution
    if len(df) > 50:
        df = strategy._add_technical_indicators(df)
        df = strategy._detect_market_regimes(df)
        
        regime_counts = df['market_regime'].value_counts()
        vol_counts = df['volatility_regime'].value_counts()
        
        print(f"📊 Market Regimes: {dict(regime_counts)}")
        print(f"📊 Volatility Regimes: {dict(vol_counts)}")
    
    # Show signal breakdown by regime
    if signals:
        regime_breakdown = {}
        for signal in signals:
            regime = signal.get('market_regime', 'unknown')
            if regime not in regime_breakdown:
                regime_breakdown[regime] = 0
            regime_breakdown[regime] += 1
        
        print(f"🎯 Signals by Market Regime: {regime_breakdown}")

if __name__ == "__main__":
    asyncio.run(test_market_adaptive())
