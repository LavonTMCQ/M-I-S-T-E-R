#!/usr/bin/env python3
"""
Fee Calculator Testing Script
Test different scenarios for Agent Vault trading profitability

This script tests various trading scenarios to determine:
- Optimal trade sizes for fee efficiency
- Required win rates for profitability
- Impact of trading frequency on returns
- Break-even analysis for different strategies
"""

import asyncio
import json
from dataclasses import dataclass, asdict
from typing import List, Dict
import pandas as pd
import numpy as np

@dataclass
class FeeScenario:
    name: str
    trade_amount: float
    win_rate: float
    avg_win_percent: float
    avg_loss_percent: float
    trades_per_day: float
    leverage: int = 10
    cardano_fee: float = 3.0
    strike_fee_percent: float = 0.1

class FeeCalculatorTester:
    """Test fee calculator with various scenarios"""
    
    def __init__(self):
        self.scenarios = self._create_test_scenarios()
    
    def _create_test_scenarios(self) -> List[FeeScenario]:
        """Create comprehensive test scenarios"""
        return [
            # Conservative scenarios
            FeeScenario(
                name="Conservative - 40 ADA",
                trade_amount=40,
                win_rate=60,
                avg_win_percent=6,
                avg_loss_percent=4,
                trades_per_day=2
            ),
            FeeScenario(
                name="Conservative - 60 ADA",
                trade_amount=60,
                win_rate=60,
                avg_win_percent=6,
                avg_loss_percent=4,
                trades_per_day=2
            ),
            
            # Moderate scenarios
            FeeScenario(
                name="Moderate - 50 ADA",
                trade_amount=50,
                win_rate=65,
                avg_win_percent=8,
                avg_loss_percent=5,
                trades_per_day=3
            ),
            FeeScenario(
                name="Moderate - 100 ADA",
                trade_amount=100,
                win_rate=65,
                avg_win_percent=8,
                avg_loss_percent=5,
                trades_per_day=3
            ),
            
            # Aggressive scenarios
            FeeScenario(
                name="Aggressive - 75 ADA",
                trade_amount=75,
                win_rate=70,
                avg_win_percent=10,
                avg_loss_percent=6,
                trades_per_day=4
            ),
            FeeScenario(
                name="Aggressive - 150 ADA",
                trade_amount=150,
                win_rate=70,
                avg_win_percent=10,
                avg_loss_percent=6,
                trades_per_day=4
            ),
            
            # High-frequency scenarios
            FeeScenario(
                name="High Freq - 40 ADA",
                trade_amount=40,
                win_rate=75,
                avg_win_percent=5,
                avg_loss_percent=3,
                trades_per_day=8
            ),
            FeeScenario(
                name="High Freq - 100 ADA",
                trade_amount=100,
                win_rate=75,
                avg_win_percent=5,
                avg_loss_percent=3,
                trades_per_day=8
            )
        ]
    
    def calculate_scenario_profitability(self, scenario: FeeScenario) -> Dict:
        """Calculate profitability for a specific scenario"""
        
        # Calculate expected profit per trade (before fees)
        win_prob = scenario.win_rate / 100
        loss_prob = 1 - win_prob
        
        avg_win_amount = scenario.trade_amount * (scenario.avg_win_percent / 100) * scenario.leverage
        avg_loss_amount = scenario.trade_amount * (scenario.avg_loss_percent / 100) * scenario.leverage
        
        expected_gross_profit = (win_prob * avg_win_amount) - (loss_prob * avg_loss_amount)
        
        # Calculate fees per trade
        cardano_fees = scenario.cardano_fee * 2  # Open + close
        strike_fees = scenario.trade_amount * (scenario.strike_fee_percent / 100)
        total_fees_per_trade = cardano_fees + strike_fees
        
        # Net profit per trade
        net_profit_per_trade = expected_gross_profit - total_fees_per_trade
        
        # Daily and monthly projections
        daily_net_profit = net_profit_per_trade * scenario.trades_per_day
        monthly_net_profit = daily_net_profit * 30
        
        # Calculate break-even win rate
        break_even_win_rate = self._calculate_break_even_win_rate(scenario, total_fees_per_trade)
        
        # Fee efficiency metrics
        fee_percentage = (total_fees_per_trade / expected_gross_profit * 100) if expected_gross_profit > 0 else 100
        
        return {
            'scenario_name': scenario.name,
            'trade_amount': scenario.trade_amount,
            'win_rate': scenario.win_rate,
            'trades_per_day': scenario.trades_per_day,
            'expected_gross_profit': expected_gross_profit,
            'total_fees_per_trade': total_fees_per_trade,
            'net_profit_per_trade': net_profit_per_trade,
            'daily_net_profit': daily_net_profit,
            'monthly_net_profit': monthly_net_profit,
            'break_even_win_rate': break_even_win_rate,
            'fee_percentage': fee_percentage,
            'is_profitable': net_profit_per_trade > 0 and scenario.win_rate > break_even_win_rate,
            'profit_margin': (net_profit_per_trade / expected_gross_profit * 100) if expected_gross_profit > 0 else -100
        }
    
    def _calculate_break_even_win_rate(self, scenario: FeeScenario, fees_per_trade: float) -> float:
        """Calculate minimum win rate needed for break-even"""
        avg_win = scenario.trade_amount * (scenario.avg_win_percent / 100) * scenario.leverage
        avg_loss = scenario.trade_amount * (scenario.avg_loss_percent / 100) * scenario.leverage
        
        # Break-even equation: (win_rate * avg_win) - ((1 - win_rate) * avg_loss) = fees
        # Solving for win_rate: win_rate = (avg_loss + fees) / (avg_win + avg_loss)
        break_even_rate = (avg_loss + fees_per_trade) / (avg_win + avg_loss)
        
        return min(100, max(0, break_even_rate * 100))
    
    def run_all_scenarios(self) -> List[Dict]:
        """Run all test scenarios and return results"""
        results = []
        
        print("🧪 RUNNING FEE CALCULATOR TESTS")
        print("=" * 50)
        
        for scenario in self.scenarios:
            result = self.calculate_scenario_profitability(scenario)
            results.append(result)
            
            # Print results
            status = "✅ PROFITABLE" if result['is_profitable'] else "❌ NOT PROFITABLE"
            print(f"\n📊 {scenario.name}")
            print(f"   Trade Size: {result['trade_amount']} ADA")
            print(f"   Win Rate: {result['win_rate']}% (Break-even: {result['break_even_win_rate']:.1f}%)")
            print(f"   Net Profit/Trade: {result['net_profit_per_trade']:.2f} ADA")
            print(f"   Monthly Profit: {result['monthly_net_profit']:.2f} ADA")
            print(f"   Fee Impact: {result['fee_percentage']:.1f}% of gross profit")
            print(f"   Status: {status}")
        
        return results
    
    def generate_recommendations(self, results: List[Dict]) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        # Find best performing scenarios
        profitable_scenarios = [r for r in results if r['is_profitable']]
        if not profitable_scenarios:
            recommendations.append("❌ CRITICAL: No scenarios are profitable with current parameters")
            recommendations.append("📈 Increase win rates or reduce trading frequency")
            return recommendations
        
        best_scenario = max(profitable_scenarios, key=lambda x: x['monthly_net_profit'])
        
        recommendations.append("🎯 OPTIMAL CONFIGURATION:")
        recommendations.append(f"   • Trade Size: {best_scenario['trade_amount']} ADA")
        recommendations.append(f"   • Win Rate Target: {best_scenario['win_rate']}%+")
        recommendations.append(f"   • Trading Frequency: {best_scenario['trades_per_day']} trades/day")
        recommendations.append(f"   • Expected Monthly Profit: {best_scenario['monthly_net_profit']:.2f} ADA")
        
        # Fee efficiency analysis
        low_fee_scenarios = [r for r in results if r['fee_percentage'] < 15]
        if low_fee_scenarios:
            recommendations.append("\n💡 FEE EFFICIENCY INSIGHTS:")
            recommendations.append("   • Larger trade sizes (100+ ADA) are more fee-efficient")
            recommendations.append("   • Keep fee impact below 15% of gross profit")
        
        # Win rate requirements
        min_win_rate = min(r['break_even_win_rate'] for r in results)
        max_win_rate = max(r['break_even_win_rate'] for r in results)
        recommendations.append(f"\n📊 WIN RATE REQUIREMENTS:")
        recommendations.append(f"   • Minimum: {min_win_rate:.1f}% (40 ADA trades)")
        recommendations.append(f"   • Maximum: {max_win_rate:.1f}% (high frequency)")
        recommendations.append(f"   • Target: 65%+ for consistent profitability")
        
        # Testing recommendations
        recommendations.append("\n🧪 TESTING RECOMMENDATIONS:")
        recommendations.append("   • Start with 60 ADA for basic testing")
        recommendations.append("   • Use 200 ADA for comprehensive validation")
        recommendations.append("   • Target 3-4 trades/day maximum")
        recommendations.append("   • Monitor fee impact closely")
        
        return recommendations
    
    def export_results(self, results: List[Dict], filename: str = "fee_analysis_results.json"):
        """Export results to JSON file"""
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n💾 Results exported to {filename}")

def main():
    """Main testing function"""
    tester = FeeCalculatorTester()
    
    # Run all scenarios
    results = tester.run_all_scenarios()
    
    # Generate recommendations
    recommendations = tester.generate_recommendations(results)
    
    print("\n" + "=" * 50)
    print("🎯 RECOMMENDATIONS")
    print("=" * 50)
    for rec in recommendations:
        print(rec)
    
    # Export results
    tester.export_results(results)
    
    # Summary statistics
    profitable_count = sum(1 for r in results if r['is_profitable'])
    print(f"\n📈 SUMMARY: {profitable_count}/{len(results)} scenarios are profitable")
    
    if profitable_count > 0:
        best_monthly = max(r['monthly_net_profit'] for r in results if r['is_profitable'])
        print(f"💰 Best monthly profit potential: {best_monthly:.2f} ADA")

if __name__ == "__main__":
    main()
