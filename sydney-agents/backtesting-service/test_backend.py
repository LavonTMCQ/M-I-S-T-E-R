#!/usr/bin/env python3
"""
Test Backend Integration
Quick test to verify the backend service works correctly
"""

import asyncio
import json
from frontend_integration import FrontendBacktestService

async def test_backend():
    """Test the backend service"""
    print("🧪 TESTING BACKEND SERVICE")
    print("=" * 50)
    
    service = FrontendBacktestService()
    
    # Test configuration
    config = {
        'strategy': 'ada_custom_algorithm',
        'timeframe': '15m',
        'days': 7,
        'initial_balance': 200
    }
    
    print(f"📊 Running backtest with config: {config}")
    
    # Run backtest
    result = await service.run_backtest_for_frontend(config)
    
    # Display results
    if result.get('success'):
        print(f"✅ SUCCESS!")
        
        perf = result['performance']
        print(f"\n📈 PERFORMANCE:")
        print(f"   Win Rate: {perf['win_rate']:.1f}%")
        print(f"   Total P&L: {perf['total_pnl']:.1f} ADA")
        print(f"   Return: {perf['return_percentage']:.1f}%")
        print(f"   Trades: {perf['total_trades']}")
        print(f"   Wins: {perf['winning_trades']}")
        print(f"   Losses: {perf['losing_trades']}")
        
        print(f"\n📊 CHART DATA:")
        chart_data = result['chart_data']
        print(f"   Candlestick points: {len(chart_data['candlestick'])}")
        print(f"   Entry markers: {len(chart_data['entry_markers'])}")
        print(f"   Exit markers: {len(chart_data['exit_markers'])}")
        print(f"   Support/Resistance lines: {len(chart_data['support_resistance'])}")
        
        print(f"\n🎯 STRATEGY INFO:")
        strategy = result['strategy_info']
        print(f"   Name: {strategy['name']}")
        print(f"   Type: {strategy['type']}")
        print(f"   Indicators: {', '.join(strategy['indicators'])}")
        
        print(f"\n💰 SAMPLE TRADES:")
        for i, trade in enumerate(result['trades'][:3]):  # Show first 3 trades
            status = "WIN" if trade['pnl'] > 0 else "LOSS"
            print(f"   Trade {i+1}: {status} - {trade['pnl']:.1f} ADA ({trade['type'].upper()}, Conf: {trade['confidence']}%)")
        
        print(f"\n🎉 BACKEND SERVICE IS READY FOR FRONTEND INTEGRATION!")
        
    else:
        print(f"❌ FAILED!")
        print(f"   Error: {result.get('error', 'Unknown error')}")
        print(f"   Suggestion: {result.get('suggestion', 'Check logs')}")

if __name__ == "__main__":
    asyncio.run(test_backend())
