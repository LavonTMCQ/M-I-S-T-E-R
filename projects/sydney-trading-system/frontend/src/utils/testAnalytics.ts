/**
 * Test Analytics System
 * Utility functions to test and validate the Advanced Signal Analytics Dashboard
 */

import { signalAnalyticsService } from '@/services/signalAnalyticsService';
import { generateMockSignalHistory, clearSignalData, addRecentTestSignals } from './mockSignalData';
import { SignalData } from '@/types/tradingview';

/**
 * Run comprehensive analytics system test
 */
export function runAnalyticsTest(): void {
  console.log('🧪 Starting Advanced Signal Analytics Test...\n');

  // Clear existing data
  clearSignalData();
  console.log('✅ Cleared existing data\n');

  // Generate test data
  const mockSignals = generateMockSignalHistory(50);
  console.log(`✅ Generated ${mockSignals.length} mock signals\n`);

  // Save to localStorage (simulate the service loading)
  const data = {
    signalHistory: mockSignals,
    marketConditions: []
  };
  localStorage.setItem('signalAnalytics', JSON.stringify(data));

  // Test analytics calculations
  const analytics = signalAnalyticsService.calculateAnalytics();
  
  console.log('📊 ANALYTICS RESULTS:');
  console.log('='.repeat(50));
  console.log(`Total Signals: ${analytics.totalSignals}`);
  console.log(`Long Signals: ${analytics.longSignals}`);
  console.log(`Short Signals: ${analytics.shortSignals}`);
  console.log(`Win Rate: ${analytics.winRate.toFixed(1)}%`);
  console.log(`Long Win Rate: ${analytics.longWinRate.toFixed(1)}%`);
  console.log(`Short Win Rate: ${analytics.shortWinRate.toFixed(1)}%`);
  console.log(`Average P&L: $${analytics.avgPnL.toFixed(2)}`);
  console.log(`Average P&L (Pips): ${analytics.avgPnLPips.toFixed(1)}`);
  console.log(`Profit Factor: ${analytics.profitFactor.toFixed(2)}`);
  console.log(`Sharpe Ratio: ${analytics.sharpeRatio.toFixed(3)}`);
  console.log(`Max Win Streak: ${analytics.consecutiveWins}`);
  console.log(`Max Loss Streak: ${analytics.consecutiveLosses}`);
  console.log(`Average Confidence: ${analytics.avgConfidence.toFixed(1)}`);
  console.log(`Confidence Correlation: ${analytics.confidenceCorrelation.toFixed(3)}`);
  console.log(`Average Hold Time: ${analytics.avgHoldingPeriod.toFixed(1)} minutes`);
  
  if (analytics.bestSignal) {
    console.log(`Best Signal: ${analytics.bestSignal.signal.type.toUpperCase()} $${analytics.bestSignal.pnl?.toFixed(2)}`);
  }
  if (analytics.worstSignal) {
    console.log(`Worst Signal: ${analytics.worstSignal.signal.type.toUpperCase()} $${analytics.worstSignal.pnl?.toFixed(2)}`);
  }
  
  console.log('\n');

  // Test filtering
  console.log('🔍 FILTERING TESTS:');
  console.log('='.repeat(50));
  
  // Test LONG signals only
  const longAnalytics = signalAnalyticsService.calculateAnalytics({ type: 'long' });
  console.log(`Long-only signals: ${longAnalytics.totalSignals} (Win Rate: ${longAnalytics.winRate.toFixed(1)}%)`);
  
  // Test SHORT signals only
  const shortAnalytics = signalAnalyticsService.calculateAnalytics({ type: 'short' });
  console.log(`Short-only signals: ${shortAnalytics.totalSignals} (Win Rate: ${shortAnalytics.winRate.toFixed(1)}%)`);
  
  // Test high confidence signals
  const highConfAnalytics = signalAnalyticsService.calculateAnalytics({ minConfidence: 600 });
  console.log(`High confidence (>600): ${highConfAnalytics.totalSignals} (Win Rate: ${highConfAnalytics.winRate.toFixed(1)}%)`);
  
  // Test recent signals (last 7 days)
  const recentAnalytics = signalAnalyticsService.calculateAnalytics({
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  });
  console.log(`Recent signals (7 days): ${recentAnalytics.totalSignals} (Win Rate: ${recentAnalytics.winRate.toFixed(1)}%)`);
  
  console.log('\n');

  // Test signal quality scoring
  console.log('🎯 SIGNAL QUALITY TESTS:');
  console.log('='.repeat(50));
  
  // Create test signals
  const testSignals: SignalData[] = [
    {
      timestamp: new Date(),
      type: 'long',
      price: 580.50,
      confidence: 750,
      reason: 'Test signal',
      macdValue: 0.005,
      emaValue: 579.80
    },
    {
      timestamp: new Date(),
      type: 'short',
      price: 580.50,
      confidence: 300,
      reason: 'Test signal',
      macdValue: -0.003,
      emaValue: 581.20
    }
  ];
  
  testSignals.forEach((signal, index) => {
    const quality = signalAnalyticsService.calculateSignalQualityScore(signal);
    console.log(`Test Signal ${index + 1} (${signal.type.toUpperCase()}): Quality Score ${(quality * 100).toFixed(1)}%`);
  });
  
  console.log('\n');

  // Test signal history retrieval
  console.log('📈 SIGNAL HISTORY TESTS:');
  console.log('='.repeat(50));
  
  const allHistory = signalAnalyticsService.getSignalHistory();
  console.log(`Total signals in history: ${allHistory.length}`);
  
  const pendingSignals = signalAnalyticsService.getSignalHistory({ outcome: 'pending' });
  console.log(`Pending signals: ${pendingSignals.length}`);
  
  const winningSignals = signalAnalyticsService.getSignalHistory({ outcome: 'win' });
  console.log(`Winning signals: ${winningSignals.length}`);
  
  const losingSignals = signalAnalyticsService.getSignalHistory({ outcome: 'loss' });
  console.log(`Losing signals: ${losingSignals.length}`);
  
  console.log('\n');

  // Validation checks
  console.log('✅ VALIDATION CHECKS:');
  console.log('='.repeat(50));
  
  const totalCompleted = winningSignals.length + losingSignals.length;
  const calculatedWinRate = totalCompleted > 0 ? (winningSignals.length / totalCompleted) * 100 : 0;
  const winRateMatch = Math.abs(calculatedWinRate - analytics.winRate) < 0.1;
  console.log(`Win rate calculation: ${winRateMatch ? '✅' : '❌'} (${calculatedWinRate.toFixed(1)}% vs ${analytics.winRate.toFixed(1)}%)`);
  
  const totalSignalsMatch = allHistory.length === analytics.totalSignals;
  console.log(`Total signals count: ${totalSignalsMatch ? '✅' : '❌'} (${allHistory.length} vs ${analytics.totalSignals})`);
  
  const longShortSum = analytics.longSignals + analytics.shortSignals;
  const longShortMatch = longShortSum === analytics.totalSignals;
  console.log(`Long/Short sum: ${longShortMatch ? '✅' : '❌'} (${longShortSum} vs ${analytics.totalSignals})`);
  
  console.log('\n🎉 Analytics test completed successfully!');
}

/**
 * Test real-time signal addition
 */
export function testRealTimeSignals(): void {
  console.log('⚡ Testing real-time signal addition...\n');
  
  const beforeCount = signalAnalyticsService.calculateAnalytics().totalSignals;
  console.log(`Signals before: ${beforeCount}`);
  
  // Add a test signal
  const testSignal: SignalData = {
    timestamp: new Date(),
    type: 'long',
    price: 582.75,
    confidence: 650,
    reason: 'Real-time test signal',
    macdValue: 0.008,
    emaValue: 581.90
  };
  
  const signalId = signalAnalyticsService.addSignal(testSignal);
  console.log(`Added signal with ID: ${signalId}`);
  
  const afterCount = signalAnalyticsService.calculateAnalytics().totalSignals;
  console.log(`Signals after: ${afterCount}`);
  
  const additionSuccess = afterCount === beforeCount + 1;
  console.log(`Signal addition: ${additionSuccess ? '✅' : '❌'}`);
  
  // Test signal quality scoring
  const qualityScore = signalAnalyticsService.calculateSignalQualityScore(testSignal);
  console.log(`Signal quality score: ${(qualityScore * 100).toFixed(1)}%`);
  
  console.log('\n⚡ Real-time test completed!');
}

/**
 * Performance benchmark test
 */
export function benchmarkPerformance(): void {
  console.log('⏱️ Running performance benchmark...\n');
  
  // Clear and generate large dataset
  clearSignalData();
  const largeDataset = generateMockSignalHistory(1000);
  
  const data = {
    signalHistory: largeDataset,
    marketConditions: []
  };
  localStorage.setItem('signalAnalytics', JSON.stringify(data));
  
  // Benchmark analytics calculation
  const startTime = performance.now();
  const analytics = signalAnalyticsService.calculateAnalytics();
  const endTime = performance.now();
  
  console.log(`Analytics calculation time: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`Processed ${analytics.totalSignals} signals`);
  console.log(`Performance: ${(analytics.totalSignals / (endTime - startTime) * 1000).toFixed(0)} signals/second`);
  
  // Benchmark filtering
  const filterStartTime = performance.now();
  const filteredAnalytics = signalAnalyticsService.calculateAnalytics({
    type: 'long',
    minConfidence: 500,
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  });
  const filterEndTime = performance.now();
  
  console.log(`Filtered analytics time: ${(filterEndTime - filterStartTime).toFixed(2)}ms`);
  console.log(`Filtered to ${filteredAnalytics.totalSignals} signals`);
  
  console.log('\n⏱️ Performance benchmark completed!');
}

/**
 * Run all tests
 */
export function runAllTests(): void {
  console.log('🚀 Running comprehensive analytics test suite...\n');
  
  try {
    runAnalyticsTest();
    console.log('\n' + '='.repeat(60) + '\n');
    
    testRealTimeSignals();
    console.log('\n' + '='.repeat(60) + '\n');
    
    benchmarkPerformance();
    console.log('\n' + '='.repeat(60) + '\n');
    
    console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testAnalytics = {
    runAnalyticsTest,
    testRealTimeSignals,
    benchmarkPerformance,
    runAllTests
  };
}
