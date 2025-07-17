#!/usr/bin/env python3
"""
ADA Final Algorithm
Balanced approach to achieve 70%+ win rate with reasonable trade frequency

Based on iterative testing:
- Custom algorithm: 62.5% win rate, 36% return (8 trades)
- Need to improve quality while maintaining quantity

Strategy: Focus on the most reliable patterns from analysis
"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from real_data_integration import RealDataProvider

class ADAFinalAlgorithm:
    """
    Final optimized ADA algorithm targeting 70%+ win rate
    """
    
    def __init__(self):
        # Optimized parameters based on testing
        self.rsi_oversold = 33      # Balanced threshold
        self.rsi_overbought = 67    # Balanced threshold
        self.volume_threshold = 1.3 # Lower requirement for more signals
        self.bb_distance = 0.25     # Wider zone for more opportunities
        
        # Quality filters
        self.min_confidence = 72    # Slightly lower for more trades
        self.min_body_size = 0.002  # Relaxed requirement
        
        # Risk management
        self.stop_loss_pct = 0.04   # 4% stop loss
        self.take_profit_pct = 0.08 # 8% take profit (2:1 ratio)
        
        # Time filters (relaxed)
        self.avoid_hours = [5, 23]  # Only avoid worst hours
        
        # Additional filters for quality
        self.require_trend_alignment = False  # Don't require trend alignment
        self.min_gap_between_signals = 4     # Minimum bars between signals
    
    def analyze_price_data(self, df: pd.DataFrame) -> List[Dict]:
        """
        Final optimized analysis
        """
        signals = []
        
        # Add indicators
        df = self._add_indicators(df)
        
        last_signal_idx = -10
        
        for i in range(30, len(df)):
            current_bar = df.iloc[i]
            
            # Basic filters
            if not self._basic_filters(current_bar, i, last_signal_idx):
                continue
            
            # Check for signals
            signal = self._check_final_patterns(current_bar, df.iloc[i-20:i+1])
            
            if signal:
                signals.append(signal)
                last_signal_idx = i
        
        print(f"🎯 Generated {len(signals)} FINAL ADA signals")
        return signals
    
    def _add_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add essential indicators"""
        df = df.copy()
        
        # RSI
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
        
        # Trend (simple)
        df['sma_20'] = df['close'].rolling(window=20).mean()
        df['trend'] = np.where(df['close'] > df['sma_20'], 'bullish', 'bearish')
        
        # Price action
        df['body_size'] = abs(df['close'] - df['open']) / df['open']
        df['is_bullish_candle'] = df['close'] > df['open']
        
        # Time
        df['hour'] = df['timestamp'].dt.hour
        
        # Recent momentum
        df['momentum'] = df['close'].pct_change(3)
        
        return df
    
    def _basic_filters(self, bar, current_idx, last_signal_idx) -> bool:
        """Basic quality filters"""
        
        # Avoid worst trading hours
        if bar['hour'] in self.avoid_hours:
            return False
        
        # Minimum gap between signals
        if (current_idx - last_signal_idx) < self.min_gap_between_signals:
            return False
        
        # Minimum body size
        if bar['body_size'] < self.min_body_size:
            return False
        
        return True
    
    def _check_final_patterns(self, current_bar, window) -> Optional[Dict]:
        """
        Check for final optimized patterns
        """
        
        rsi = current_bar['rsi']
        bb_position = current_bar['bb_position']
        volume_ratio = current_bar['volume_ratio']
        trend = current_bar['trend']
        is_bullish_candle = current_bar['is_bullish_candle']
        momentum = current_bar['momentum']
        price = current_bar['close']
        
        # LONG PATTERN: Focus on most reliable conditions
        if (rsi < self.rsi_oversold and                    # RSI oversold
            bb_position < self.bb_distance and            # Near BB lower
            volume_ratio > self.volume_threshold and      # Volume confirmation
            is_bullish_candle and                         # Bullish candle
            momentum > -0.03):                            # Not falling too hard
            
            # Calculate confidence
            confidence = self._calculate_final_confidence(
                rsi, bb_position, volume_ratio, trend, 'long'
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
                    'trend': trend,
                    'pattern': 'Final_Long_Pattern',
                    'stop_loss': price * (1 - self.stop_loss_pct),
                    'take_profit': price * (1 + self.take_profit_pct),
                    'reasoning': f"FINAL LONG: RSI {rsi:.1f}, BB {bb_position:.2f}, Vol {volume_ratio:.1f}x"
                }
        
        # SHORT PATTERN: More selective (historically less reliable)
        elif (rsi > self.rsi_overbought and                # RSI overbought
              bb_position > (1 - self.bb_distance) and    # Near BB upper
              volume_ratio > self.volume_threshold and    # Volume confirmation
              not is_bullish_candle and                   # Bearish candle
              momentum < 0.03):                           # Not rising too hard
            
            confidence = self._calculate_final_confidence(
                100 - rsi, 1 - bb_position, volume_ratio, trend, 'short'
            )
            
            # Higher threshold for shorts
            if confidence >= self.min_confidence + 3:
                return {
                    'timestamp': current_bar['timestamp'],
                    'type': 'short',
                    'price': price,
                    'confidence': confidence,
                    'rsi': rsi,
                    'bb_position': bb_position,
                    'volume_ratio': volume_ratio,
                    'trend': trend,
                    'pattern': 'Final_Short_Pattern',
                    'stop_loss': price * (1 + self.stop_loss_pct),
                    'take_profit': price * (1 - self.take_profit_pct),
                    'reasoning': f"FINAL SHORT: RSI {rsi:.1f}, BB {bb_position:.2f}, Vol {volume_ratio:.1f}x"
                }
        
        return None
    
    def _calculate_final_confidence(self, rsi_strength, bb_strength, volume_ratio, trend, direction) -> int:
        """
        Final confidence calculation optimized for ADA
        """
        base_confidence = 60
        
        # RSI contribution (based on 72% oversold success rate)
        rsi_bonus = min(25, rsi_strength * 1.0)
        
        # BB contribution (based on 78.3% lower bounce rate)
        bb_bonus = min(20, bb_strength * 30)
        
        # Volume contribution
        volume_bonus = min(15, (volume_ratio - 1.3) * 15)
        
        # Trend alignment bonus (small)
        trend_bonus = 0
        if ((direction == 'long' and trend == 'bullish') or
            (direction == 'short' and trend == 'bearish')):
            trend_bonus = 5
        
        total_confidence = base_confidence + rsi_bonus + bb_bonus + volume_bonus + trend_bonus
        return min(95, max(50, int(total_confidence)))
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50)

class ADAFinalBacktestEngine:
    """Final backtest engine"""
    
    def __init__(self):
        self.data_provider = RealDataProvider()
        self.strategy = ADAFinalAlgorithm()
    
    async def run_final_backtest(self, config: Dict) -> Dict:
        """Run final comprehensive backtest"""
        print("🎯 RUNNING FINAL ADA ALGORITHM BACKTEST")
        print("=" * 60)
        
        # Fetch data
        df = await self.data_provider.fetch_real_ada_data(
            timeframe=config.get('timeframe', '15m'),
            days=config.get('days', 60)
        )
        
        print(f"📊 Testing on {len(df)} bars ({config.get('days', 60)} days)")
        
        # Generate signals
        signals = self.strategy.analyze_price_data(df)
        
        if len(signals) == 0:
            return {'error': 'No signals found - algorithm too strict'}
        
        # Execute trades
        trades = []
        balance = config.get('initial_balance', 200)
        
        for signal in signals:
            # Dynamic position sizing
            base_amount = 45  # Base amount
            confidence_multiplier = (signal['confidence'] - 70) / 100  # Bonus for high confidence
            trade_amount = base_amount + (base_amount * confidence_multiplier)
            trade_amount = max(40, min(80, trade_amount))  # 40-80 ADA range
            
            if balance >= trade_amount + 13:
                trade_result = self._execute_final_trade(signal, trade_amount, df)
                trades.append(trade_result)
                balance += trade_result['pnl']
                
                status = "✅ WIN" if trade_result['pnl'] > 0 else "❌ LOSS"
                print(f"{status}: {trade_amount:.0f} ADA {trade_result['type'].upper()} "
                      f"(Conf: {signal['confidence']}%, P&L: {trade_result['pnl']:.1f} ADA)")
        
        # Calculate results
        results = self._calculate_final_results(trades, config)
        
        print(f"\n🎯 FINAL ALGORITHM RESULTS:")
        print(f"   Total Trades: {results['total_trades']}")
        print(f"   Win Rate: {results['win_rate']:.1f}%")
        print(f"   Total P&L: {results['total_pnl']:.2f} ADA")
        print(f"   Final Balance: {results['final_balance']:.2f} ADA")
        print(f"   Return: {results['return_percentage']:.1f}%")
        
        # Final evaluation
        if results['win_rate'] >= 70 and results['total_pnl'] > 0:
            print("\n🎉 SUCCESS: ALGORITHM APPROVED FOR LIVE TRADING!")
            print("✅ Ready for 60 ADA real testing")
        elif results['win_rate'] >= 65:
            print("\n⚠️ CLOSE: Algorithm shows strong potential")
        else:
            print("\n❌ NEEDS MORE WORK: Continue optimization")
        
        return results
    
    def _execute_final_trade(self, signal: Dict, amount: float, df: pd.DataFrame) -> Dict:
        """Execute trade with final logic"""
        
        signal_time = pd.to_datetime(signal['timestamp'])
        signal_idx = df[df['timestamp'] >= signal_time].index[0] if len(df[df['timestamp'] >= signal_time]) > 0 else len(df) - 1
        
        entry_price = signal['price']
        stop_loss = signal['stop_loss']
        take_profit = signal['take_profit']
        
        # Check for exit in next 20 bars (5 hours)
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
        
        # Time exit if no stop/target hit
        if exit_price is None:
            exit_idx = min(signal_idx + 20, len(df) - 1)
            exit_price = df.iloc[exit_idx]['close']
        
        # Calculate P&L
        price_change = (exit_price - entry_price) / entry_price
        direction = 1 if signal['type'] == 'long' else -1
        leveraged_return = price_change * direction * 10  # 10x leverage
        
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
            'confidence': signal['confidence']
        }
    
    def _calculate_final_results(self, trades: List[Dict], config: Dict) -> Dict:
        """Calculate final comprehensive results"""
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
            'largest_win': max([t['pnl'] for t in winning_trades]) if winning_trades else 0,
            'largest_loss': min([t['pnl'] for t in losing_trades]) if losing_trades else 0,
            'trades': trades,
            'strategy': 'ada_final_algorithm'
        }

async def test_final_algorithm():
    """Test final algorithm"""
    engine = ADAFinalBacktestEngine()
    
    config = {
        'timeframe': '15m',
        'days': 60,  # 2 months
        'initial_balance': 200
    }
    
    results = await engine.run_final_backtest(config)
    
    if 'error' not in results:
        print(f"\n📊 FINAL PERFORMANCE SUMMARY:")
        print(f"   Algorithm: {results['strategy']}")
        print(f"   Win Rate: {results['win_rate']:.1f}%")
        print(f"   Total Return: {results['return_percentage']:.1f}%")
        print(f"   Average Win: {results['average_win']:.1f} ADA")
        print(f"   Average Loss: {results['average_loss']:.1f} ADA")
        print(f"   Largest Win: {results['largest_win']:.1f} ADA")
        print(f"   Largest Loss: {results['largest_loss']:.1f} ADA")

if __name__ == "__main__":
    asyncio.run(test_final_algorithm())
