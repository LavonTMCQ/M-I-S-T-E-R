import { mastra } from './src/mastra/index';

/**
 * Test Script for Natural Language to ADA Backtesting Workflow
 * 
 * This script demonstrates how users can describe trading strategies in plain English
 * and get fully backtested ADA trading results with Pine Script generation.
 */

async function testNaturalLanguageBacktesting() {
  console.log('🚀 Testing Natural Language to ADA Backtesting Workflow...\n');

  try {
    // Get the workflow
    const workflow = mastra.getWorkflow('naturalLanguageAdaBacktestingWorkflow');
    
    if (!workflow) {
      throw new Error('Workflow not found! Make sure it\'s registered in mastra/index.ts');
    }

    // Create a run instance
    const run = await workflow.createRunAsync();

    // Example natural language strategy descriptions
    const testStrategies = [
      {
        name: 'RSI Mean Reversion',
        description: 'Buy ADA when RSI goes below 30 and sell when it goes above 70. Use 14-period RSI with 2% stop loss and 4% take profit.',
        timeframe: '15m'
      },
      {
        name: 'Moving Average Crossover',
        description: 'Buy ADA when 20-period EMA crosses above 50-period EMA. Sell when 20-period EMA crosses below 50-period EMA. Add volume confirmation.',
        timeframe: '1h'
      },
      {
        name: 'Bollinger Band Breakout',
        description: 'Buy ADA when price breaks above upper Bollinger Band with high volume. Sell when price touches middle Bollinger Band. Use 20-period BB with 2 standard deviations.',
        timeframe: '15m'
      }
    ];

    // Test the first strategy
    const testStrategy = testStrategies[0];
    
    console.log(`📝 Testing Strategy: ${testStrategy.name}`);
    console.log(`📋 Description: ${testStrategy.description}`);
    console.log(`⏱️ Timeframe: ${testStrategy.timeframe}\n`);

    // Run the workflow
    console.log('🔄 Starting workflow execution...\n');
    
    const result = await run.start({
      inputData: {
        strategyDescription: testStrategy.description,
        timeframe: testStrategy.timeframe,
        includeAlerts: true,
        initialCapital: 10000,
        riskPerTrade: 0.02,
        // Use last 30 days for testing
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }
    });

    console.log('\n🎉 WORKFLOW COMPLETED!\n');
    console.log('📊 RESULTS:');
    console.log('='.repeat(50));
    
    if (result.status === 'success' && result.result) {
      const report = result.result.report;
      
      console.log('\n📈 PERFORMANCE SUMMARY:');
      console.log(report.summary);
      
      console.log('\n💡 KEY INSIGHTS:');
      report.insights.forEach((insight: string, index: number) => {
        console.log(`${index + 1}. ${insight}`);
      });
      
      console.log('\n🔧 RECOMMENDATIONS:');
      report.recommendations.forEach((rec: string, index: number) => {
        console.log(`${index + 1}. ${rec}`);
      });
      
      console.log('\n📜 GENERATED PINE SCRIPT:');
      console.log('```pinescript');
      console.log(report.pineScriptCode);
      console.log('```');
      
      console.log('\n✅ SUCCESS: Natural language strategy successfully converted to backtested ADA trading system!');
      
    } else {
      console.log('❌ Workflow failed or returned unexpected results');
      console.log('Status:', result.status);
      console.log('Result:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Error running natural language backtesting workflow:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Additional test function for Tomorrow Labs Network Agent integration
async function testNetworkAgentIntegration() {
  console.log('\n🌐 Testing Tomorrow Labs Network Agent Integration...\n');

  try {
    const networkAgent = mastra.getAgent('tomorrowLabsNetworkAgent');
    
    if (!networkAgent) {
      throw new Error('Tomorrow Labs Network Agent not found!');
    }

    const response = await networkAgent.generate([
      {
        role: 'user',
        content: 'I want to create a trading strategy that buys ADA when the price is oversold according to RSI and sells when it becomes overbought. Can you help me backtest this strategy?'
      }
    ]);

    console.log('🤖 Network Agent Response:');
    console.log(response.text);
    
  } catch (error) {
    console.error('❌ Error testing network agent integration:', error);
  }
}

// Run the tests
async function runAllTests() {
  console.log('🧪 NATURAL LANGUAGE TO ADA BACKTESTING - COMPREHENSIVE TEST\n');
  console.log('This test demonstrates the complete workflow from natural language to backtested ADA strategies.\n');
  
  // Test 1: Direct workflow execution
  await testNaturalLanguageBacktesting();
  
  // Test 2: Network agent integration
  await testNetworkAgentIntegration();
  
  console.log('\n🏁 All tests completed!');
}

// Execute if run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { testNaturalLanguageBacktesting, testNetworkAgentIntegration, runAllTests };
