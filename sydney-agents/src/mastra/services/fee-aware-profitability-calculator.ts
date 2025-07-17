/**
 * Fee-Aware Profitability Calculator
 * Ensures trading algorithms are profitable after all fees
 * 
 * This calculator helps determine:
 * - Minimum win rate needed for profitability
 * - Optimal trade sizing considering fees
 * - Break-even analysis for different strategies
 * - Fee impact on overall returns
 */

interface FeeStructure {
  cardanoTxFee: number;        // ADA per transaction
  strikeTradingFee: number;    // Percentage of trade amount
  strikeWithdrawalFee: number; // ADA per withdrawal
  agentVaultFee: number;       // ADA per vault operation
}

interface TradeScenario {
  tradeAmount: number;         // ADA
  winRate: number;            // Percentage (0-100)
  averageWinPercent: number;  // Average win as % of trade amount
  averageLossPercent: number; // Average loss as % of trade amount
  tradesPerDay: number;       // Trading frequency
  leverage: number;           // Strike Finance leverage
}

interface ProfitabilityAnalysis {
  scenario: TradeScenario;
  fees: FeeStructure;
  results: {
    grossProfitPerTrade: number;
    feesPerTrade: number;
    netProfitPerTrade: number;
    dailyNetProfit: number;
    monthlyNetProfit: number;
    breakEvenWinRate: number;
    profitMargin: number;
    isProfitable: boolean;
    recommendedMinTradeSize: number;
  };
  recommendations: string[];
}

export class FeeAwareProfitabilityCalculator {
  private readonly defaultFees: FeeStructure = {
    cardanoTxFee: 3.0,           // 3 ADA per transaction (conservative estimate)
    strikeTradingFee: 0.001,     // 0.1% trading fee (estimated)
    strikeWithdrawalFee: 2.0,    // 2 ADA withdrawal fee (estimated)
    agentVaultFee: 1.0           // 1 ADA vault operation fee
  };

  constructor(private customFees?: Partial<FeeStructure>) {
    if (customFees) {
      this.defaultFees = { ...this.defaultFees, ...customFees };
    }
  }

  /**
   * Calculate comprehensive profitability analysis
   */
  analyzeProfitability(scenario: TradeScenario, fees?: FeeStructure): ProfitabilityAnalysis {
    const feeStructure = fees || this.defaultFees;
    
    console.log(`📊 Analyzing profitability for ${scenario.tradeAmount} ADA trades at ${scenario.winRate}% win rate`);

    // Calculate fees per trade
    const feesPerTrade = this.calculateFeesPerTrade(scenario.tradeAmount, feeStructure);
    
    // Calculate expected profit per trade
    const grossProfitPerTrade = this.calculateGrossProfitPerTrade(scenario);
    const netProfitPerTrade = grossProfitPerTrade - feesPerTrade;
    
    // Calculate daily and monthly projections
    const dailyNetProfit = netProfitPerTrade * scenario.tradesPerDay;
    const monthlyNetProfit = dailyNetProfit * 30;
    
    // Calculate break-even win rate
    const breakEvenWinRate = this.calculateBreakEvenWinRate(scenario, feeStructure);
    
    // Calculate profit margin
    const profitMargin = grossProfitPerTrade > 0 ? (netProfitPerTrade / grossProfitPerTrade) * 100 : 0;
    
    // Determine if profitable
    const isProfitable = netProfitPerTrade > 0 && scenario.winRate > breakEvenWinRate;
    
    // Calculate recommended minimum trade size
    const recommendedMinTradeSize = this.calculateMinTradeSize(scenario, feeStructure);
    
    const results = {
      grossProfitPerTrade,
      feesPerTrade,
      netProfitPerTrade,
      dailyNetProfit,
      monthlyNetProfit,
      breakEvenWinRate,
      profitMargin,
      isProfitable,
      recommendedMinTradeSize
    };

    const recommendations = this.generateRecommendations(scenario, results, feeStructure);

    console.log(`💰 Net profit per trade: ${netProfitPerTrade.toFixed(2)} ADA`);
    console.log(`📈 Break-even win rate: ${breakEvenWinRate.toFixed(1)}%`);
    console.log(`✅ Profitable: ${isProfitable ? 'YES' : 'NO'}`);

    return {
      scenario,
      fees: feeStructure,
      results,
      recommendations
    };
  }

  /**
   * Calculate total fees per trade
   */
  private calculateFeesPerTrade(tradeAmount: number, fees: FeeStructure): number {
    const cardanoFees = fees.cardanoTxFee * 2; // Open + close position
    const strikeFees = tradeAmount * fees.strikeTradingFee;
    const vaultFees = fees.agentVaultFee;
    
    return cardanoFees + strikeFees + vaultFees;
  }

  /**
   * Calculate expected gross profit per trade
   */
  private calculateGrossProfitPerTrade(scenario: TradeScenario): number {
    const winProbability = scenario.winRate / 100;
    const lossProbability = 1 - winProbability;
    
    const averageWin = scenario.tradeAmount * (scenario.averageWinPercent / 100) * scenario.leverage;
    const averageLoss = scenario.tradeAmount * (scenario.averageLossPercent / 100) * scenario.leverage;
    
    return (winProbability * averageWin) - (lossProbability * averageLoss);
  }

  /**
   * Calculate break-even win rate considering fees
   */
  private calculateBreakEvenWinRate(scenario: TradeScenario, fees: FeeStructure): number {
    const feesPerTrade = this.calculateFeesPerTrade(scenario.tradeAmount, fees);
    const averageWin = scenario.tradeAmount * (scenario.averageWinPercent / 100) * scenario.leverage;
    const averageLoss = scenario.tradeAmount * (scenario.averageLossPercent / 100) * scenario.leverage;
    
    // Break-even equation: (winRate * averageWin) - ((1 - winRate) * averageLoss) = feesPerTrade
    // Solving for winRate
    const breakEvenWinRate = (averageLoss + feesPerTrade) / (averageWin + averageLoss);
    
    return Math.min(100, Math.max(0, breakEvenWinRate * 100));
  }

  /**
   * Calculate minimum trade size for profitability
   */
  private calculateMinTradeSize(scenario: TradeScenario, fees: FeeStructure): number {
    // Minimum trade size where fees don't exceed 10% of expected profit
    const maxFeeRatio = 0.10; // 10% maximum fee ratio
    
    let minTradeSize = 40; // Strike Finance minimum
    let testSize = minTradeSize;
    
    while (testSize <= 1000) { // Test up to 1000 ADA
      const testScenario = { ...scenario, tradeAmount: testSize };
      const grossProfit = this.calculateGrossProfitPerTrade(testScenario);
      const feesPerTrade = this.calculateFeesPerTrade(testSize, fees);
      
      if (grossProfit > 0 && (feesPerTrade / grossProfit) <= maxFeeRatio) {
        return testSize;
      }
      
      testSize += 10;
    }
    
    return minTradeSize; // Fallback to Strike minimum
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    scenario: TradeScenario, 
    results: any, 
    fees: FeeStructure
  ): string[] {
    const recommendations: string[] = [];

    if (!results.isProfitable) {
      recommendations.push('❌ CRITICAL: Strategy is not profitable with current parameters');
      recommendations.push(`📈 Increase win rate to at least ${results.breakEvenWinRate.toFixed(1)}% for break-even`);
    }

    if (results.profitMargin < 20) {
      recommendations.push('⚠️ WARNING: Low profit margin - fees consume significant portion of profits');
      recommendations.push('💡 Consider increasing trade size or improving win rate');
    }

    if (scenario.tradeAmount < results.recommendedMinTradeSize) {
      recommendations.push(`📏 Increase minimum trade size to ${results.recommendedMinTradeSize} ADA for better fee efficiency`);
    }

    if (scenario.tradesPerDay > 10) {
      recommendations.push('🔄 High trading frequency increases fee burden - consider reducing trade frequency');
    }

    if (results.feesPerTrade > scenario.tradeAmount * 0.05) {
      recommendations.push('💸 Fees exceed 5% of trade amount - consider larger position sizes');
    }

    if (results.monthlyNetProfit < 50) {
      recommendations.push('📊 Monthly profit projection is low - consider strategy optimization');
    }

    if (results.isProfitable) {
      recommendations.push('✅ Strategy is profitable with current parameters');
      recommendations.push(`💰 Expected monthly profit: ${results.monthlyNetProfit.toFixed(2)} ADA`);
    }

    return recommendations;
  }

  /**
   * Compare multiple scenarios
   */
  compareScenarios(scenarios: TradeScenario[], fees?: FeeStructure): {
    analyses: ProfitabilityAnalysis[];
    bestScenario: ProfitabilityAnalysis;
    comparison: string[];
  } {
    const analyses = scenarios.map(scenario => this.analyzeProfitability(scenario, fees));
    
    // Find best scenario by monthly net profit
    const bestScenario = analyses.reduce((best, current) => 
      current.results.monthlyNetProfit > best.results.monthlyNetProfit ? current : best
    );

    const comparison = [
      '📊 SCENARIO COMPARISON:',
      ...analyses.map((analysis, index) => 
        `${index + 1}. ${analysis.scenario.tradeAmount} ADA @ ${analysis.scenario.winRate}% win rate: ` +
        `${analysis.results.monthlyNetProfit.toFixed(2)} ADA/month ` +
        `(${analysis.results.isProfitable ? '✅ Profitable' : '❌ Not Profitable'})`
      ),
      '',
      `🏆 BEST SCENARIO: ${bestScenario.scenario.tradeAmount} ADA trades at ${bestScenario.scenario.winRate}% win rate`,
      `💰 Expected monthly profit: ${bestScenario.results.monthlyNetProfit.toFixed(2)} ADA`
    ];

    return { analyses, bestScenario, comparison };
  }

  /**
   * Generate testing recommendations for different ADA amounts
   */
  generateTestingRecommendations(): {
    scenarios: TradeScenario[];
    recommendations: string[];
  } {
    const baseScenario: TradeScenario = {
      tradeAmount: 50,
      winRate: 65,
      averageWinPercent: 8,  // 8% average win
      averageLossPercent: 5, // 5% average loss
      tradesPerDay: 3,
      leverage: 10
    };

    const testingScenarios = [
      { ...baseScenario, tradeAmount: 40 },  // Minimum Strike Finance
      { ...baseScenario, tradeAmount: 60 },  // Basic testing
      { ...baseScenario, tradeAmount: 100 }, // Comprehensive testing
      { ...baseScenario, tradeAmount: 200 }  // Production testing
    ];

    const comparison = this.compareScenarios(testingScenarios);

    const recommendations = [
      '🧪 TESTING RECOMMENDATIONS:',
      '',
      '💰 ADA Requirements:',
      '• 60 ADA: Basic functionality testing (1-2 trades)',
      '• 200 ADA: Comprehensive testing (5-10 trades)',
      '• 500 ADA: Production validation (20+ trades)',
      '',
      '📈 Profitability Targets:',
      '• Minimum 65% win rate for profitability',
      '• Target 8%+ average wins, 5%- average losses',
      '• Aim for 20%+ profit margin after fees',
      '',
      '⚡ Optimization Strategies:',
      '• Use larger trade sizes (100+ ADA) for better fee efficiency',
      '• Limit trading frequency to 2-4 trades per day',
      '• Focus on high-confidence signals (70%+ win rate)',
      '• Monitor fee impact - should not exceed 10% of gross profit',
      '',
      ...comparison.comparison
    ];

    return {
      scenarios: testingScenarios,
      recommendations
    };
  }
}

// Export factory function
export const createProfitabilityCalculator = (customFees?: Partial<FeeStructure>) => {
  return new FeeAwareProfitabilityCalculator(customFees);
};

// Example usage and testing scenarios
export const TESTING_SCENARIOS = {
  conservative: {
    tradeAmount: 50,
    winRate: 60,
    averageWinPercent: 6,
    averageLossPercent: 4,
    tradesPerDay: 2,
    leverage: 10
  },
  aggressive: {
    tradeAmount: 100,
    winRate: 70,
    averageWinPercent: 10,
    averageLossPercent: 6,
    tradesPerDay: 4,
    leverage: 10
  },
  optimal: {
    tradeAmount: 75,
    winRate: 65,
    averageWinPercent: 8,
    averageLossPercent: 5,
    tradesPerDay: 3,
    leverage: 10
  }
};
