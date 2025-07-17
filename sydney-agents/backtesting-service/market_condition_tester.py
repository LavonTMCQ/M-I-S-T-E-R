#!/usr/bin/env python3
"""
Market Condition Tester
Test our ADA algorithm across different market conditions to find optimal periods

The recent period (July 9-17) was extremely volatile and trending.
Let's test on different market conditions to validate the algorithm.
"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List
from datetime import datetime, timedelta
from ada_custom_algorithm import ADACustomBacktestEngine, ADACustomAlgorithm

class MarketConditionTester:
    """Test algorithm across different market conditions"""
    
    def __init__(self):
        self.engine = ADACustomBacktestEngine()
    
    async def test_multiple_periods(self) -> Dict:
        """
        Test algorithm across multiple time periods to find optimal conditions
        """
        print("🧪 TESTING ADA ALGORITHM ACROSS MULTIPLE MARKET CONDITIONS")
        print("=" * 70)
        
        # Test different periods (simulating different market conditions)
        test_periods = [
            {'days': 7, 'name': 'Recent Week (High Vol)'},
            {'days': 14, 'name': 'Recent 2 Weeks (Mixed)'},
            {'days': 21, 'name': 'Recent 3 Weeks (Extended)'},
            {'days': 30, 'name': 'Recent Month (Full Cycle)'},
            {'days': 45, 'name': 'Extended Period'},
            {'days': 60, 'name': 'Full 2 Months'}
        ]
        
        results = []
        
        for period in test_periods:
            print(f"\n{'='*50}")
            print(f"TESTING: {period['name']} ({period['days']} days)")
            print(f"{'='*50}")
            
            config = {
                'timeframe': '15m',
                'days': period['days'],
                'initial_balance': 200
            }
            
            try:
                result = await self.engine.run_ada_custom_backtest(config)
                
                if 'error' not in result and result['total_trades'] > 0:
                    # Analyze market conditions for this period
                    market_analysis = await self._analyze_market_conditions(period['days'])
                    
                    period_result = {
                        'period': period['name'],
                        'days': period['days'],
                        'win_rate': result['win_rate'],
                        'return_pct': result['return_percentage'],
                        'total_trades': result['total_trades'],
                        'total_pnl': result['total_pnl'],
                        'avg_win': result['average_win'],
                        'avg_loss': result['average_loss'],
                        'market_conditions': market_analysis
                    }
                    results.append(period_result)
                    
                    print(f"✅ Results: {result['win_rate']:.1f}% win rate, {result['return_percentage']:.1f}% return")
                else:
                    print(f"❌ No trades or error: {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                print(f"❌ Error testing {period['name']}: {str(e)}")
        
        # Analyze results
        self._analyze_results(results)
        
        return results
    
    async def _analyze_market_conditions(self, days: int) -> Dict:
        """Analyze market conditions for a given period"""
        try:
            from real_data_integration import RealDataProvider
            data_provider = RealDataProvider()
            
            df = await data_provider.fetch_real_ada_data(timeframe='15m', days=days)
            
            if len(df) < 50:
                return {'error': 'Insufficient data'}
            
            # Calculate market characteristics
            price_range = (df['high'].max() - df['low'].min()) / df['low'].min()
            volatility = df['close'].pct_change().std() * np.sqrt(96)  # Daily volatility
            
            # Trend analysis
            sma_20 = df['close'].rolling(window=20).mean()
            trend_strength = abs(df['close'].iloc[-1] - sma_20.iloc[-1]) / sma_20.iloc[-1]
            
            # Determine market type
            if price_range > 0.25:  # >25% range
                market_type = 'High Volatility'
            elif price_range > 0.15:  # 15-25% range
                market_type = 'Medium Volatility'
            else:  # <15% range
                market_type = 'Low Volatility'
            
            if trend_strength > 0.05:  # >5% from SMA
                trend_type = 'Trending'
            else:
                trend_type = 'Ranging'
            
            return {
                'price_range_pct': price_range * 100,
                'daily_volatility_pct': volatility * 100,
                'trend_strength_pct': trend_strength * 100,
                'market_type': market_type,
                'trend_type': trend_type,
                'classification': f"{market_type} {trend_type}"
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def _analyze_results(self, results: List[Dict]):
        """Analyze results across different market conditions"""
        
        if not results:
            print("\n❌ No valid results to analyze")
            return
        
        print(f"\n{'='*70}")
        print("📊 COMPREHENSIVE RESULTS ANALYSIS")
        print(f"{'='*70}")
        
        # Sort by win rate
        results_by_win_rate = sorted(results, key=lambda x: x['win_rate'], reverse=True)
        
        print(f"\n🏆 BEST PERFORMING PERIODS:")
        for i, result in enumerate(results_by_win_rate[:3]):
            print(f"{i+1}. {result['period']}")
            print(f"   Win Rate: {result['win_rate']:.1f}%")
            print(f"   Return: {result['return_pct']:.1f}%")
            print(f"   Trades: {result['total_trades']}")
            if 'market_conditions' in result and 'classification' in result['market_conditions']:
                print(f"   Market: {result['market_conditions']['classification']}")
            print()
        
        # Find patterns
        profitable_periods = [r for r in results if r['return_pct'] > 0]
        high_win_rate_periods = [r for r in results if r['win_rate'] >= 65]
        
        print(f"📈 PERFORMANCE SUMMARY:")
        print(f"   Profitable periods: {len(profitable_periods)}/{len(results)}")
        print(f"   High win rate periods (≥65%): {len(high_win_rate_periods)}/{len(results)}")
        
        if profitable_periods:
            avg_profitable_win_rate = np.mean([r['win_rate'] for r in profitable_periods])
            avg_profitable_return = np.mean([r['return_pct'] for r in profitable_periods])
            print(f"   Average profitable win rate: {avg_profitable_win_rate:.1f}%")
            print(f"   Average profitable return: {avg_profitable_return:.1f}%")
        
        # Market condition analysis
        print(f"\n🌊 MARKET CONDITION INSIGHTS:")
        
        market_performance = {}
        for result in results:
            if 'market_conditions' in result and 'classification' in result['market_conditions']:
                market_type = result['market_conditions']['classification']
                if market_type not in market_performance:
                    market_performance[market_type] = []
                market_performance[market_type].append(result)
        
        for market_type, periods in market_performance.items():
            avg_win_rate = np.mean([p['win_rate'] for p in periods])
            avg_return = np.mean([p['return_pct'] for p in periods])
            print(f"   {market_type}: {avg_win_rate:.1f}% win rate, {avg_return:.1f}% return ({len(periods)} periods)")
        
        # Recommendations
        print(f"\n🎯 RECOMMENDATIONS:")
        
        if high_win_rate_periods:
            best_period = max(high_win_rate_periods, key=lambda x: x['win_rate'])
            print(f"✅ ALGORITHM WORKS BEST IN: {best_period['period']}")
            print(f"   Achieved: {best_period['win_rate']:.1f}% win rate, {best_period['return_pct']:.1f}% return")
            if 'market_conditions' in best_period:
                conditions = best_period['market_conditions']
                print(f"   Market conditions: {conditions.get('classification', 'Unknown')}")
                print(f"   Volatility: {conditions.get('daily_volatility_pct', 0):.1f}%")
        
        if len(profitable_periods) >= len(results) * 0.6:  # 60%+ profitable
            print(f"✅ ALGORITHM IS GENERALLY PROFITABLE")
            print(f"   Works in {len(profitable_periods)}/{len(results)} tested periods")
        else:
            print(f"⚠️ ALGORITHM NEEDS MARKET CONDITION FILTERING")
            print(f"   Only profitable in {len(profitable_periods)}/{len(results)} periods")
        
        # Final verdict
        overall_avg_win_rate = np.mean([r['win_rate'] for r in results])
        overall_avg_return = np.mean([r['return_pct'] for r in results])
        
        print(f"\n🎯 OVERALL ALGORITHM ASSESSMENT:")
        print(f"   Average win rate across all periods: {overall_avg_win_rate:.1f}%")
        print(f"   Average return across all periods: {overall_avg_return:.1f}%")
        
        if overall_avg_win_rate >= 65 and overall_avg_return > 0:
            print(f"🎉 ALGORITHM APPROVED FOR LIVE TESTING!")
            print(f"   Consistently profitable across market conditions")
        elif len(high_win_rate_periods) >= 2:
            print(f"⚠️ ALGORITHM APPROVED WITH CONDITIONS")
            print(f"   Works well in specific market conditions")
            print(f"   Recommend market condition filtering")
        else:
            print(f"❌ ALGORITHM NEEDS MORE OPTIMIZATION")
            print(f"   Consider different strategy or parameters")

async def main():
    """Run comprehensive market condition testing"""
    tester = MarketConditionTester()
    results = await tester.test_multiple_periods()
    
    print(f"\n{'='*70}")
    print("🎯 TESTING COMPLETE")
    print(f"{'='*70}")
    print(f"Tested {len(results)} different market periods")
    print(f"Ready for next steps based on results")

if __name__ == "__main__":
    asyncio.run(main())
