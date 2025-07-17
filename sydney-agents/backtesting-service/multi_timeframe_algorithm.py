#!/usr/bin/env python3
"""
Multi-Timeframe ADA Algorithm
Combines 15-minute entries with hourly trend analysis for better hit rates and longer holds

Key Enhancements:
1. Hourly data for trend confirmation and longer-term targets
2. Multi-timeframe signal validation
3. Extended holding periods based on hourly momentum
4. Dynamic take profits based on hourly resistance levels
5. Better hit rate through hourly trend filtering
"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from real_data_integration import RealDataProvider

class MultiTimeframeAlgorithm:
    """
    Enhanced algorithm using both 15m and 1h timeframes
    """
    
    def __init__(self):
        # 15-minute parameters (for entries)
        self.rsi_oversold_15m = 35
        self.rsi_overbought_15m = 65
        self.volume_threshold_15m = 1.4
        self.bb_distance_15m = 0.2
        self.min_confidence = 70
        
        # Hourly parameters (for trend and exits) - RELAXED
        self.rsi_oversold_1h = 50    # More relaxed on hourly
        self.rsi_overbought_1h = 50  # More relaxed on hourly
        self.trend_confirmation_required = False  # Don't require strict alignment
        
        # Enhanced risk management
        self.base_stop_loss = 0.04      # 4% base stop
        self.base_take_profit = 0.08    # 8% base take profit
        self.extended_take_profit = 0.12 # 12% for strong hourly trends
        self.max_hold_hours = 12        # Up to 12 hours (vs 5 hours before)
        
        # Multi-timeframe filters
        self.require_hourly_alignment = True
        self.hourly_momentum_threshold = 0.02  # 2% hourly momentum
    
    async def analyze_multi_timeframe_data(self, days: int = 7) -> List[Dict]:
        """
        Analyze using both 15m and 1h data for better signals
        """
        print("📊 FETCHING MULTI-TIMEFRAME DATA")
        print("=" * 50)
        
        data_provider = RealDataProvider()
        
        # Fetch both timeframes
        df_15m = await data_provider.fetch_real_ada_data(timeframe='15m', days=days)
        df_1h = await data_provider.fetch_real_ada_data(timeframe='1h', days=days)
        
        print(f"📈 15-minute data: {len(df_15m)} bars")
        print(f"📈 Hourly data: {len(df_1h)} bars")
        
        # Add indicators to both timeframes
        df_15m = self._add_15m_indicators(df_15m)
        df_1h = self._add_1h_indicators(df_1h)
        
        # Generate multi-timeframe signals
        signals = self._generate_multi_timeframe_signals(df_15m, df_1h)
        
        print(f"🎯 Generated {len(signals)} MULTI-TIMEFRAME signals")
        return signals, df_15m, df_1h
    
    def _add_15m_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add 15-minute indicators for entry signals"""
        df = df.copy()
        
        # Core 15m indicators
        df['rsi_15m'] = self._calculate_rsi(df['close'])
        
        # Bollinger Bands
        df['bb_middle_15m'] = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['bb_upper_15m'] = df['bb_middle_15m'] + (bb_std * 2)
        df['bb_lower_15m'] = df['bb_middle_15m'] - (bb_std * 2)
        df['bb_position_15m'] = (df['close'] - df['bb_lower_15m']) / (df['bb_upper_15m'] - df['bb_lower_15m'])
        
        # Volume
        df['volume_sma_15m'] = df['volume'].rolling(window=15).mean()
        df['volume_ratio_15m'] = df['volume'] / df['volume_sma_15m']
        
        # Price action
        df['body_size_15m'] = abs(df['close'] - df['open']) / df['open']
        df['is_bullish_15m'] = df['close'] > df['open']
        
        # Short-term momentum
        df['momentum_15m'] = df['close'].pct_change(3)
        
        return df
    
    def _add_1h_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add hourly indicators for trend confirmation and exits"""
        df = df.copy()
        
        # Hourly RSI
        df['rsi_1h'] = self._calculate_rsi(df['close'])
        
        # Hourly trend
        df['sma_20_1h'] = df['close'].rolling(window=20).mean()
        df['sma_50_1h'] = df['close'].rolling(window=50).mean()
        df['trend_1h'] = np.where(df['sma_20_1h'] > df['sma_50_1h'], 'bullish', 'bearish')
        df['trend_strength_1h'] = abs(df['sma_20_1h'] - df['sma_50_1h']) / df['sma_50_1h']
        
        # Hourly momentum
        df['momentum_1h'] = df['close'].pct_change(4)  # 4-hour momentum
        
        # Hourly support/resistance
        df['resistance_1h'] = df['high'].rolling(window=24).max()  # 24-hour high
        df['support_1h'] = df['low'].rolling(window=24).min()     # 24-hour low
        df['resistance_distance_1h'] = (df['resistance_1h'] - df['close']) / df['close']
        df['support_distance_1h'] = (df['close'] - df['support_1h']) / df['close']
        
        # Hourly volatility
        df['volatility_1h'] = df['close'].pct_change().rolling(window=24).std()
        
        return df
    
    def _generate_multi_timeframe_signals(self, df_15m: pd.DataFrame, df_1h: pd.DataFrame) -> List[Dict]:
        """Generate signals using multi-timeframe analysis"""
        signals = []
        
        # Align timeframes (match 15m bars to hourly bars)
        df_15m['hour_timestamp'] = df_15m['timestamp'].dt.floor('H')
        df_1h['hour_timestamp'] = df_1h['timestamp'].dt.floor('H')
        
        # Merge dataframes
        df_merged = df_15m.merge(df_1h[['hour_timestamp', 'rsi_1h', 'trend_1h', 'trend_strength_1h', 
                                       'momentum_1h', 'resistance_distance_1h', 'support_distance_1h',
                                       'volatility_1h']], 
                                on='hour_timestamp', how='left')
        
        # Forward fill hourly data
        df_merged = df_merged.fillna(method='ffill')
        
        last_signal_idx = -10
        
        for i in range(50, len(df_merged)):  # Start after indicator warmup
            current_bar = df_merged.iloc[i]
            
            # Basic filters
            if not self._multi_timeframe_filters(current_bar, i, last_signal_idx):
                continue
            
            # Check for multi-timeframe signals
            signal = self._check_multi_timeframe_patterns(current_bar, df_merged.iloc[i-20:i+1])
            
            if signal:
                signals.append(signal)
                last_signal_idx = i
        
        return signals
    
    def _multi_timeframe_filters(self, bar, current_idx, last_signal_idx) -> bool:
        """Multi-timeframe quality filters"""
        
        # Time filter
        if bar['timestamp'].hour in [5, 23]:
            return False
        
        # Gap between signals
        if (current_idx - last_signal_idx) < 8:
            return False
        
        # Minimum body size
        if bar['body_size_15m'] < 0.002:
            return False
        
        # Hourly volatility filter (avoid dead markets)
        if bar['volatility_1h'] < 0.01:
            return False
        
        return True
    
    def _check_multi_timeframe_patterns(self, current_bar, window) -> Optional[Dict]:
        """Check for multi-timeframe confirmed patterns"""
        
        # 15-minute values
        rsi_15m = current_bar['rsi_15m']
        bb_position_15m = current_bar['bb_position_15m']
        volume_ratio_15m = current_bar['volume_ratio_15m']
        is_bullish_15m = current_bar['is_bullish_15m']
        momentum_15m = current_bar['momentum_15m']
        
        # Hourly values
        rsi_1h = current_bar['rsi_1h']
        trend_1h = current_bar['trend_1h']
        trend_strength_1h = current_bar['trend_strength_1h']
        momentum_1h = current_bar['momentum_1h']
        resistance_distance_1h = current_bar['resistance_distance_1h']
        support_distance_1h = current_bar['support_distance_1h']
        
        price = current_bar['close']
        
        # ENHANCED LONG PATTERN with hourly confirmation
        if (rsi_15m < self.rsi_oversold_15m and                    # 15m oversold
            bb_position_15m < self.bb_distance_15m and            # 15m near BB lower
            volume_ratio_15m > self.volume_threshold_15m and      # 15m volume
            is_bullish_15m and                                    # 15m bullish candle
            momentum_15m > -0.03 and                              # 15m not falling hard
            # HOURLY CONFIRMATIONS (RELAXED):
            rsi_1h < 60 and                                       # 1h not too overbought
            momentum_1h > -0.05 and                               # 1h not falling too hard
            support_distance_1h > 0.005):                         # 1h above support (relaxed)
            
            confidence = self._calculate_multi_timeframe_confidence(
                rsi_15m, bb_position_15m, volume_ratio_15m, trend_1h, 
                trend_strength_1h, resistance_distance_1h, 'long'
            )
            
            if confidence >= self.min_confidence:
                # Enhanced targets based on hourly analysis
                enhanced_targets = self._calculate_enhanced_targets(
                    price, trend_1h, trend_strength_1h, resistance_distance_1h, 'long'
                )
                
                return {
                    'timestamp': current_bar['timestamp'],
                    'type': 'long',
                    'price': price,
                    'confidence': confidence,
                    'rsi_15m': rsi_15m,
                    'rsi_1h': rsi_1h,
                    'trend_1h': trend_1h,
                    'trend_strength_1h': trend_strength_1h,
                    'resistance_distance_1h': resistance_distance_1h,
                    'pattern': 'Multi_Timeframe_Long',
                    'stop_loss': enhanced_targets['stop_loss'],
                    'take_profit': enhanced_targets['take_profit'],
                    'extended_target': enhanced_targets['extended_target'],
                    'max_hold_bars': enhanced_targets['max_hold_bars'],
                    'reasoning': f"MTF LONG: 15m RSI {rsi_15m:.1f}, 1h trend {trend_1h}, resistance {resistance_distance_1h:.2f}"
                }
        
        # ENHANCED SHORT PATTERN with hourly confirmation
        elif (rsi_15m > self.rsi_overbought_15m and
              bb_position_15m > (1 - self.bb_distance_15m) and
              volume_ratio_15m > self.volume_threshold_15m and
              not is_bullish_15m and
              momentum_15m < 0.03 and
              # HOURLY CONFIRMATIONS (RELAXED):
              rsi_1h > 40 and                                    # 1h not too oversold
              momentum_1h < 0.05 and                             # 1h not rising too hard
              resistance_distance_1h < 0.08):                    # Near hourly resistance (relaxed)
            
            confidence = self._calculate_multi_timeframe_confidence(
                100 - rsi_15m, 1 - bb_position_15m, volume_ratio_15m, trend_1h,
                trend_strength_1h, support_distance_1h, 'short'
            )
            
            if confidence >= self.min_confidence + 5:  # Higher threshold for shorts
                enhanced_targets = self._calculate_enhanced_targets(
                    price, trend_1h, trend_strength_1h, support_distance_1h, 'short'
                )
                
                return {
                    'timestamp': current_bar['timestamp'],
                    'type': 'short',
                    'price': price,
                    'confidence': confidence,
                    'rsi_15m': rsi_15m,
                    'rsi_1h': rsi_1h,
                    'trend_1h': trend_1h,
                    'trend_strength_1h': trend_strength_1h,
                    'support_distance_1h': support_distance_1h,
                    'pattern': 'Multi_Timeframe_Short',
                    'stop_loss': enhanced_targets['stop_loss'],
                    'take_profit': enhanced_targets['take_profit'],
                    'extended_target': enhanced_targets['extended_target'],
                    'max_hold_bars': enhanced_targets['max_hold_bars'],
                    'reasoning': f"MTF SHORT: 15m RSI {rsi_15m:.1f}, 1h trend {trend_1h}, support {support_distance_1h:.2f}"
                }
        
        return None
    
    def _calculate_enhanced_targets(self, price: float, trend_1h: str, trend_strength_1h: float, 
                                  distance_to_level: float, direction: str) -> Dict:
        """Calculate enhanced targets using hourly analysis"""
        
        base_stop = self.base_stop_loss
        base_tp = self.base_take_profit
        extended_tp = self.extended_take_profit
        
        # Adjust based on hourly trend strength
        if trend_strength_1h > 0.03:  # Strong hourly trend
            tp_multiplier = 1.5  # 12% take profit
            max_hold_bars = 48   # 12 hours
        elif trend_strength_1h > 0.015:  # Medium trend
            tp_multiplier = 1.25  # 10% take profit
            max_hold_bars = 32    # 8 hours
        else:  # Weak trend
            tp_multiplier = 1.0   # 8% take profit
            max_hold_bars = 20    # 5 hours
        
        # Adjust based on distance to resistance/support
        if distance_to_level > 0.08:  # Far from level
            tp_multiplier += 0.25
        elif distance_to_level < 0.03:  # Close to level
            tp_multiplier -= 0.15
        
        # Calculate final targets
        adjusted_tp = base_tp * tp_multiplier
        adjusted_tp = max(0.06, min(0.15, adjusted_tp))  # Clamp between 6% and 15%
        
        if direction == 'long':
            stop_loss = price * (1 - base_stop)
            take_profit = price * (1 + adjusted_tp)
            extended_target = price * (1 + extended_tp)
        else:
            stop_loss = price * (1 + base_stop)
            take_profit = price * (1 - adjusted_tp)
            extended_target = price * (1 - extended_tp)
        
        return {
            'stop_loss': stop_loss,
            'take_profit': take_profit,
            'extended_target': extended_target,
            'max_hold_bars': max_hold_bars,
            'tp_multiplier': tp_multiplier
        }
    
    def _calculate_multi_timeframe_confidence(self, rsi_strength, bb_strength, volume_ratio, 
                                            trend_1h, trend_strength_1h, distance_to_level, direction) -> int:
        """Calculate confidence using multi-timeframe factors"""
        base_confidence = 65
        
        # 15m factors
        rsi_bonus = min(20, rsi_strength * 0.8)
        bb_bonus = min(15, bb_strength * 30)
        volume_bonus = min(10, (volume_ratio - 1.4) * 10)
        
        # Hourly factors (NEW)
        trend_bonus = 0
        if ((direction == 'long' and trend_1h == 'bullish') or
            (direction == 'short' and trend_1h == 'bearish')):
            trend_bonus = min(15, trend_strength_1h * 300)  # Up to 15 points
        
        distance_bonus = min(10, distance_to_level * 100)  # Up to 10 points
        
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

class MultiTimeframeExecutor:
    """Execute trades with multi-timeframe logic"""
    
    def execute_multi_timeframe_trade(self, signal: Dict, amount: float, df_15m: pd.DataFrame) -> Dict:
        """Execute trade with extended holding and dynamic exits"""
        
        signal_time = pd.to_datetime(signal['timestamp'])
        signal_idx = df_15m[df_15m['timestamp'] >= signal_time].index[0] if len(df_15m[df_15m['timestamp'] >= signal_time]) > 0 else len(df_15m) - 1
        
        entry_price = signal['price']
        stop_loss = signal['stop_loss']
        take_profit = signal['take_profit']
        extended_target = signal['extended_target']
        max_hold_bars = signal['max_hold_bars']
        
        exit_price = None
        exit_reason = "time_exit"
        bars_held = 0
        
        # ENHANCED: Extended holding with multiple targets
        for i in range(signal_idx + 1, min(signal_idx + max_hold_bars + 1, len(df_15m))):
            bar = df_15m.iloc[i]
            bars_held = i - signal_idx
            
            if signal['type'] == 'long':
                current_profit_pct = (bar['close'] - entry_price) / entry_price
                
                # Stop loss
                if bar['low'] <= stop_loss:
                    exit_price = stop_loss
                    exit_reason = "stop_loss"
                    break
                
                # First take profit (partial exit could be implemented here)
                if bar['high'] >= take_profit and bars_held >= 8:  # At least 2 hours
                    exit_price = take_profit
                    exit_reason = "take_profit"
                    break
                
                # Extended target for strong trends
                if bar['high'] >= extended_target and bars_held >= 16:  # At least 4 hours
                    exit_price = extended_target
                    exit_reason = "extended_target"
                    break
                
                # Time-based exit with profit protection
                if bars_held >= max_hold_bars * 0.8:  # 80% of max hold time
                    if current_profit_pct > 0.03:  # If profitable, continue
                        continue
                    else:
                        exit_price = bar['close']
                        exit_reason = "time_exit_unprofitable"
                        break
            
            else:  # short - similar logic
                current_profit_pct = (entry_price - bar['close']) / entry_price
                
                if bar['high'] >= stop_loss:
                    exit_price = stop_loss
                    exit_reason = "stop_loss"
                    break
                
                if bar['low'] <= take_profit and bars_held >= 8:
                    exit_price = take_profit
                    exit_reason = "take_profit"
                    break
                
                if bar['low'] <= extended_target and bars_held >= 16:
                    exit_price = extended_target
                    exit_reason = "extended_target"
                    break
                
                if bars_held >= max_hold_bars * 0.8:
                    if current_profit_pct > 0.03:
                        continue
                    else:
                        exit_price = bar['close']
                        exit_reason = "time_exit_unprofitable"
                        break
        
        # Final exit
        if exit_price is None:
            exit_idx = min(signal_idx + max_hold_bars, len(df_15m) - 1)
            exit_price = df_15m.iloc[exit_idx]['close']
            exit_reason = "final_time_exit"
        
        # Calculate P&L with 10x leverage
        price_change = (exit_price - entry_price) / entry_price
        direction = 1 if signal['type'] == 'long' else -1
        leveraged_return = price_change * direction * 10  # 10x leverage confirmed
        
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
            'hours_held': bars_held / 4,  # 15m bars to hours
            'max_hold_bars': max_hold_bars,
            'trend_1h': signal['trend_1h'],
            'tp_multiplier': signal.get('tp_multiplier', 1.0)
        }

async def test_multi_timeframe():
    """Test multi-timeframe algorithm"""
    print("🚀 TESTING MULTI-TIMEFRAME ALGORITHM")
    print("=" * 70)
    
    algo = MultiTimeframeAlgorithm()
    signals, df_15m, df_1h = await algo.analyze_multi_timeframe_data(days=7)
    
    if signals:
        executor = MultiTimeframeExecutor()
        total_pnl = 0
        wins = 0
        
        print(f"\n📊 EXECUTING {len(signals)} MULTI-TIMEFRAME TRADES:")
        
        for signal in signals:
            result = executor.execute_multi_timeframe_trade(signal, 50, df_15m)
            total_pnl += result['pnl']
            if result['pnl'] > 0:
                wins += 1
            
            status = "✅ WIN" if result['pnl'] > 0 else "❌ LOSS"
            print(f"{status}: {result['pnl']:.1f} ADA, Held: {result['hours_held']:.1f}h, "
                  f"Exit: {result['exit_reason']}, 1h Trend: {result['trend_1h']}, "
                  f"TP Mult: {result['tp_multiplier']:.1f}x")
        
        win_rate = wins / len(signals) * 100
        print(f"\n🎯 MULTI-TIMEFRAME RESULTS:")
        print(f"   Trades: {len(signals)}")
        print(f"   Win Rate: {win_rate:.1f}%")
        print(f"   Total P&L: {total_pnl:.1f} ADA")
        print(f"   Average Hold Time: {np.mean([r['hours_held'] for r in [executor.execute_multi_timeframe_trade(s, 50, df_15m) for s in signals]]):.1f} hours")
        
        # Compare with original
        print(f"\n📈 COMPARISON WITH ORIGINAL:")
        print(f"   Original: 8 trades, 62.5% win rate, 43.9 ADA (5h max hold)")
        print(f"   Multi-TF: {len(signals)} trades, {win_rate:.1f}% win rate, {total_pnl:.1f} ADA (up to 12h hold)")
        
        if win_rate > 62.5 and total_pnl > 43.9:
            print(f"🎉 IMPROVEMENT ACHIEVED!")
        elif win_rate > 62.5:
            print(f"✅ Better hit rate achieved!")
        elif total_pnl > 43.9:
            print(f"✅ Better profit achieved!")
        else:
            print(f"⚠️ Mixed results - needs refinement")
    
    else:
        print("No multi-timeframe signals generated")

if __name__ == "__main__":
    asyncio.run(test_multi_timeframe())
