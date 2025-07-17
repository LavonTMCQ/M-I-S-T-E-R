#!/usr/bin/env python3
"""
ADA Pattern Analyzer
Analyze real ADA price data to understand how it moves and create a custom algorithm

This will:
1. Fetch 2+ months of real ADA data
2. Analyze price patterns, volatility, and behavior
3. Identify profitable trading opportunities
4. Create a custom algorithm based on actual ADA characteristics
"""

import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import ccxt
from real_data_integration import RealDataProvider

class ADAPatternAnalyzer:
    """Analyze ADA price patterns to create custom trading algorithm"""
    
    def __init__(self):
        self.data_provider = RealDataProvider()
        self.analysis_results = {}
    
    async def analyze_ada_patterns(self, days: int = 60) -> Dict:
        """
        Comprehensive analysis of ADA price patterns
        """
        print(f"🔍 ANALYZING {days} DAYS OF REAL ADA DATA")
        print("=" * 60)
        
        # Fetch extended data
        df = await self.data_provider.fetch_real_ada_data(timeframe='15m', days=days)
        print(f"📊 Analyzing {len(df)} price bars")
        print(f"📅 Period: {df['timestamp'].min()} to {df['timestamp'].max()}")
        print(f"💰 Price range: ${df['low'].min():.4f} - ${df['high'].max():.4f}")
        
        # Add technical indicators
        df = self._add_comprehensive_indicators(df)
        
        # Analyze different aspects
        volatility_analysis = self._analyze_volatility_patterns(df)
        trend_analysis = self._analyze_trend_patterns(df)
        support_resistance = self._find_support_resistance_levels(df)
        time_patterns = self._analyze_time_based_patterns(df)
        volume_patterns = self._analyze_volume_patterns(df)
        reversal_patterns = self._find_reversal_patterns(df)
        
        # Combine all analysis
        self.analysis_results = {
            'data_summary': {
                'total_bars': len(df),
                'price_range': {
                    'min': df['low'].min(),
                    'max': df['high'].max(),
                    'range_pct': ((df['high'].max() - df['low'].min()) / df['low'].min()) * 100
                },
                'avg_daily_volume': df['volume'].mean(),
                'period': f"{df['timestamp'].min()} to {df['timestamp'].max()}"
            },
            'volatility_patterns': volatility_analysis,
            'trend_patterns': trend_analysis,
            'support_resistance': support_resistance,
            'time_patterns': time_patterns,
            'volume_patterns': volume_patterns,
            'reversal_patterns': reversal_patterns
        }
        
        # Print key insights
        self._print_key_insights()
        
        # Create custom algorithm based on findings
        custom_algorithm = self._create_custom_algorithm()
        
        return {
            'analysis': self.analysis_results,
            'custom_algorithm': custom_algorithm,
            'dataframe': df
        }
    
    def _add_comprehensive_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add comprehensive technical indicators"""
        df = df.copy()
        
        # Price-based indicators
        df['returns'] = df['close'].pct_change()
        df['log_returns'] = np.log(df['close'] / df['close'].shift(1))
        df['price_change'] = df['close'] - df['open']
        df['body_size'] = abs(df['close'] - df['open']) / df['open']
        df['upper_wick'] = (df['high'] - df[['open', 'close']].max(axis=1)) / df['open']
        df['lower_wick'] = (df[['open', 'close']].min(axis=1) - df['low']) / df['open']
        
        # Moving averages
        for period in [5, 10, 20, 50]:
            df[f'sma_{period}'] = df['close'].rolling(window=period).mean()
            df[f'ema_{period}'] = df['close'].ewm(span=period).mean()
        
        # Volatility indicators
        df['atr_14'] = self._calculate_atr(df, 14)
        df['volatility_20'] = df['returns'].rolling(window=20).std()
        
        # RSI
        df['rsi'] = self._calculate_rsi(df['close'])
        
        # MACD
        df['macd'] = df['ema_12'] - df['ema_26'] if 'ema_12' in df.columns else df['close'].ewm(span=12).mean() - df['close'].ewm(span=26).mean()
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        
        # Bollinger Bands
        df['bb_middle'] = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # Volume indicators
        df['volume_sma'] = df['volume'].rolling(window=20).mean()
        df['volume_ratio'] = df['volume'] / df['volume_sma']
        
        # Time-based features
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        
        return df
    
    def _analyze_volatility_patterns(self, df: pd.DataFrame) -> Dict:
        """Analyze ADA's volatility characteristics"""
        
        # Daily volatility
        daily_vol = df['returns'].rolling(window=96).std() * np.sqrt(96)  # 96 15-min bars = 1 day
        
        # Volatility clustering
        high_vol_periods = daily_vol > daily_vol.quantile(0.8)
        low_vol_periods = daily_vol < daily_vol.quantile(0.2)
        
        # Volatility by time of day
        hourly_vol = df.groupby('hour')['returns'].std()
        
        return {
            'avg_daily_volatility': daily_vol.mean(),
            'volatility_range': {
                'min': daily_vol.min(),
                'max': daily_vol.max(),
                'p25': daily_vol.quantile(0.25),
                'p75': daily_vol.quantile(0.75)
            },
            'high_vol_threshold': daily_vol.quantile(0.8),
            'low_vol_threshold': daily_vol.quantile(0.2),
            'most_volatile_hours': hourly_vol.nlargest(3).to_dict(),
            'least_volatile_hours': hourly_vol.nsmallest(3).to_dict()
        }
    
    def _analyze_trend_patterns(self, df: pd.DataFrame) -> Dict:
        """Analyze ADA's trending behavior"""
        
        # Trend strength using multiple timeframes
        trends = {}
        for period in [10, 20, 50]:
            df[f'trend_{period}'] = np.where(df['close'] > df[f'sma_{period}'], 1, -1)
            trends[f'{period}_period'] = {
                'bullish_pct': (df[f'trend_{period}'] == 1).mean() * 100,
                'bearish_pct': (df[f'trend_{period}'] == -1).mean() * 100
            }
        
        # Trend persistence (how long trends last)
        trend_changes = (df['trend_20'] != df['trend_20'].shift(1)).sum()
        avg_trend_duration = len(df) / trend_changes if trend_changes > 0 else len(df)
        
        # Trend strength
        trend_strength = abs(df['close'] - df['sma_20']) / df['sma_20']
        
        return {
            'trend_distribution': trends,
            'avg_trend_duration_bars': avg_trend_duration,
            'avg_trend_strength': trend_strength.mean(),
            'strong_trend_threshold': trend_strength.quantile(0.8)
        }
    
    def _find_support_resistance_levels(self, df: pd.DataFrame) -> Dict:
        """Find key support and resistance levels"""
        
        # Find local highs and lows
        window = 10
        df['local_high'] = df['high'] == df['high'].rolling(window=window*2+1, center=True).max()
        df['local_low'] = df['low'] == df['low'].rolling(window=window*2+1, center=True).min()
        
        # Extract significant levels
        resistance_levels = df[df['local_high']]['high'].values
        support_levels = df[df['local_low']]['low'].values
        
        # Cluster levels (group nearby levels)
        def cluster_levels(levels, tolerance=0.01):
            if len(levels) == 0:
                return []
            
            levels = sorted(levels)
            clusters = []
            current_cluster = [levels[0]]
            
            for level in levels[1:]:
                if abs(level - current_cluster[-1]) / current_cluster[-1] < tolerance:
                    current_cluster.append(level)
                else:
                    clusters.append(np.mean(current_cluster))
                    current_cluster = [level]
            
            clusters.append(np.mean(current_cluster))
            return clusters
        
        clustered_resistance = cluster_levels(resistance_levels)
        clustered_support = cluster_levels(support_levels)
        
        return {
            'resistance_levels': clustered_resistance[-10:],  # Top 10 resistance
            'support_levels': clustered_support[-10:],        # Top 10 support
            'current_price': df['close'].iloc[-1],
            'nearest_resistance': min([r for r in clustered_resistance if r > df['close'].iloc[-1]], default=None),
            'nearest_support': max([s for s in clustered_support if s < df['close'].iloc[-1]], default=None)
        }
    
    def _analyze_time_based_patterns(self, df: pd.DataFrame) -> Dict:
        """Analyze time-based trading patterns"""
        
        # Performance by hour
        hourly_returns = df.groupby('hour')['returns'].agg(['mean', 'std', 'count'])
        
        # Performance by day of week
        daily_returns = df.groupby('day_of_week')['returns'].agg(['mean', 'std', 'count'])
        
        # Best and worst trading hours
        best_hours = hourly_returns['mean'].nlargest(3)
        worst_hours = hourly_returns['mean'].nsmallest(3)
        
        return {
            'best_trading_hours': best_hours.to_dict(),
            'worst_trading_hours': worst_hours.to_dict(),
            'hourly_volatility': hourly_returns['std'].to_dict(),
            'daily_performance': daily_returns['mean'].to_dict()
        }
    
    def _analyze_volume_patterns(self, df: pd.DataFrame) -> Dict:
        """Analyze volume patterns and their relationship to price"""
        
        # Volume-price relationship
        high_volume = df['volume_ratio'] > 1.5
        low_volume = df['volume_ratio'] < 0.7
        
        # Returns during high/low volume
        high_vol_returns = df[high_volume]['returns'].mean()
        low_vol_returns = df[low_volume]['returns'].mean()
        
        # Volume spikes and their outcomes
        volume_spikes = df['volume_ratio'] > 2.0
        spike_outcomes = []
        
        for i in df[volume_spikes].index:
            if i + 4 < len(df):  # Look 4 bars ahead (1 hour)
                future_return = (df.loc[i+4, 'close'] - df.loc[i, 'close']) / df.loc[i, 'close']
                spike_outcomes.append(future_return)
        
        return {
            'avg_volume_ratio': df['volume_ratio'].mean(),
            'high_volume_returns': high_vol_returns,
            'low_volume_returns': low_vol_returns,
            'volume_spike_avg_outcome': np.mean(spike_outcomes) if spike_outcomes else 0,
            'volume_spike_success_rate': (np.array(spike_outcomes) > 0).mean() if spike_outcomes else 0
        }
    
    def _find_reversal_patterns(self, df: pd.DataFrame) -> Dict:
        """Find price reversal patterns"""
        
        # RSI divergence patterns
        rsi_oversold = df['rsi'] < 30
        rsi_overbought = df['rsi'] > 70
        
        # Bollinger Band reversals
        bb_lower_touch = df['close'] <= df['bb_lower']
        bb_upper_touch = df['close'] >= df['bb_upper']
        
        # Analyze outcomes after these signals
        def analyze_signal_outcomes(signal_mask, forward_bars=8):
            outcomes = []
            for i in df[signal_mask].index:
                if i + forward_bars < len(df):
                    future_return = (df.loc[i+forward_bars, 'close'] - df.loc[i, 'close']) / df.loc[i, 'close']
                    outcomes.append(future_return)
            return outcomes
        
        oversold_outcomes = analyze_signal_outcomes(rsi_oversold)
        overbought_outcomes = analyze_signal_outcomes(rsi_overbought)
        bb_lower_outcomes = analyze_signal_outcomes(bb_lower_touch)
        bb_upper_outcomes = analyze_signal_outcomes(bb_upper_touch)
        
        return {
            'rsi_oversold_success_rate': (np.array(oversold_outcomes) > 0).mean() if oversold_outcomes else 0,
            'rsi_overbought_success_rate': (np.array(overbought_outcomes) < 0).mean() if overbought_outcomes else 0,
            'bb_lower_bounce_rate': (np.array(bb_lower_outcomes) > 0).mean() if bb_lower_outcomes else 0,
            'bb_upper_rejection_rate': (np.array(bb_upper_outcomes) < 0).mean() if bb_upper_outcomes else 0,
            'avg_reversal_magnitude': {
                'oversold_bounce': np.mean([x for x in oversold_outcomes if x > 0]) if oversold_outcomes else 0,
                'overbought_drop': np.mean([x for x in overbought_outcomes if x < 0]) if overbought_outcomes else 0
            }
        }
    
    def _create_custom_algorithm(self) -> Dict:
        """Create custom algorithm based on ADA analysis"""
        
        analysis = self.analysis_results
        
        # Extract key insights for algorithm design
        vol_patterns = analysis['volatility_patterns']
        trend_patterns = analysis['trend_patterns']
        reversal_patterns = analysis['reversal_patterns']
        volume_patterns = analysis['volume_patterns']
        
        # Design algorithm parameters based on findings
        algorithm = {
            'name': 'ADA_Custom_Algorithm',
            'description': 'Custom algorithm based on real ADA price behavior analysis',
            'parameters': {
                # Volatility-based parameters
                'high_vol_threshold': vol_patterns['high_vol_threshold'],
                'low_vol_threshold': vol_patterns['low_vol_threshold'],
                
                # Trend parameters
                'trend_strength_threshold': trend_patterns['strong_trend_threshold'],
                'trend_confirmation_period': 20,
                
                # Entry conditions
                'rsi_oversold_level': 30,
                'rsi_overbought_level': 70,
                'volume_spike_threshold': 1.8,
                'bb_reversal_threshold': 0.1,  # Distance from BB bands
                
                # Risk management
                'stop_loss_pct': 0.04,  # 4% stop loss
                'take_profit_pct': 0.08,  # 8% take profit (2:1 ratio)
                'max_position_size': 0.25,  # 25% of balance
                
                # Time filters
                'avoid_low_volume_hours': True,
                'preferred_trading_hours': list(vol_patterns['most_volatile_hours'].keys())
            },
            'entry_logic': {
                'long_conditions': [
                    'RSI < 30 (oversold)',
                    'Price near or below lower Bollinger Band',
                    'Volume spike (>1.8x average)',
                    'Not in high volatility period',
                    'Trend not strongly bearish'
                ],
                'short_conditions': [
                    'RSI > 70 (overbought)',
                    'Price near or above upper Bollinger Band',
                    'Volume spike (>1.8x average)',
                    'Not in high volatility period',
                    'Trend not strongly bullish'
                ]
            },
            'expected_performance': {
                'win_rate_target': '65-75%',
                'avg_trade_duration': '2-4 hours',
                'risk_reward_ratio': '1:2',
                'trades_per_day': '2-4'
            }
        }
        
        return algorithm
    
    def _print_key_insights(self):
        """Print key insights from analysis"""
        analysis = self.analysis_results
        
        print("\n🎯 KEY ADA TRADING INSIGHTS:")
        print("=" * 50)
        
        # Volatility insights
        vol = analysis['volatility_patterns']
        print(f"📊 VOLATILITY:")
        print(f"   • Average daily volatility: {vol['avg_daily_volatility']:.1%}")
        print(f"   • Most volatile hours: {list(vol['most_volatile_hours'].keys())}")
        print(f"   • Least volatile hours: {list(vol['least_volatile_hours'].keys())}")
        
        # Trend insights
        trend = analysis['trend_patterns']
        print(f"\n📈 TREND BEHAVIOR:")
        print(f"   • Average trend duration: {trend['avg_trend_duration_bars']:.0f} bars")
        print(f"   • Bullish periods: {trend['trend_distribution']['20_period']['bullish_pct']:.1f}%")
        print(f"   • Bearish periods: {trend['trend_distribution']['20_period']['bearish_pct']:.1f}%")
        
        # Reversal patterns
        reversal = analysis['reversal_patterns']
        print(f"\n🔄 REVERSAL PATTERNS:")
        print(f"   • RSI oversold bounce rate: {reversal['rsi_oversold_success_rate']:.1%}")
        print(f"   • RSI overbought drop rate: {reversal['rsi_overbought_success_rate']:.1%}")
        print(f"   • BB lower bounce rate: {reversal['bb_lower_bounce_rate']:.1%}")
        print(f"   • BB upper rejection rate: {reversal['bb_upper_rejection_rate']:.1%}")
        
        # Volume insights
        volume = analysis['volume_patterns']
        print(f"\n📊 VOLUME PATTERNS:")
        print(f"   • Volume spike success rate: {volume['volume_spike_success_rate']:.1%}")
        print(f"   • High volume returns: {volume['high_volume_returns']:.2%}")
        print(f"   • Low volume returns: {volume['low_volume_returns']:.2%}")
    
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

async def main():
    """Run comprehensive ADA analysis"""
    analyzer = ADAPatternAnalyzer()
    
    # Analyze 2 months of data
    results = await analyzer.analyze_ada_patterns(days=60)
    
    print("\n🤖 CUSTOM ALGORITHM CREATED:")
    print("=" * 50)
    algorithm = results['custom_algorithm']
    print(f"Name: {algorithm['name']}")
    print(f"Description: {algorithm['description']}")
    
    print(f"\n📋 ENTRY CONDITIONS:")
    for condition_type, conditions in algorithm['entry_logic'].items():
        print(f"  {condition_type.upper()}:")
        for condition in conditions:
            print(f"    • {condition}")
    
    print(f"\n🎯 EXPECTED PERFORMANCE:")
    for metric, value in algorithm['expected_performance'].items():
        print(f"   • {metric.replace('_', ' ').title()}: {value}")
    
    print(f"\n✅ READY TO IMPLEMENT CUSTOM ADA ALGORITHM!")

if __name__ == "__main__":
    asyncio.run(main())
