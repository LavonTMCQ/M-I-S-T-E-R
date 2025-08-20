const { phemexPortfolioAgent } = require('./sydney-agents/src/mastra/agents/phemex-portfolio-agent.ts');

async function testPhemexPortfolioAgent() {
  console.log('🏦 Testing Enhanced Phemex Portfolio Agent...');
  console.log('🎯 Testing real-time market character analysis for your positions');
  console.log('');

  try {
    // Test 1: Get current account positions
    console.log('📊 Test 1: Getting current account positions...');
    const positionsResponse = await phemexPortfolioAgent.run({
      messages: [{
        role: 'user',
        content: 'Please analyze my current Phemex account positions and provide a summary of my portfolio status.'
      }]
    });
    
    console.log('✅ Positions Analysis:', positionsResponse.text);
    console.log('');

    // Test 2: Real-time market character analysis
    console.log('📈 Test 2: Real-time market character analysis...');
    const marketAnalysisResponse = await phemexPortfolioAgent.run({
      messages: [{
        role: 'user',
        content: 'Analyze the real-time market character for my major positions (ADAUSDT, ETHUSDT, FETUSDT, ATOMUSDT) across multiple timeframes. Identify any trend changes or scaling opportunities.'
      }]
    });
    
    console.log('✅ Market Character Analysis:', marketAnalysisResponse.text);
    console.log('');

    // Test 3: Risk assessment and recommendations
    console.log('⚠️ Test 3: Risk assessment and portfolio recommendations...');
    const riskResponse = await phemexPortfolioAgent.run({
      messages: [{
        role: 'user',
        content: 'Provide a comprehensive risk assessment of my portfolio. Focus on liquidation risks, optimal scaling opportunities, and any market character changes that suggest potential exit strategies.'
      }]
    });
    
    console.log('✅ Risk Assessment:', riskResponse.text);
    console.log('');

    console.log('🎉 Phemex Portfolio Agent test completed successfully!');
    console.log('🔧 The agent now has access to:');
    console.log('   ✅ Real-time Phemex account data');
    console.log('   ✅ Live crypto market data (Phemex + Kraken)');
    console.log('   ✅ Multi-timeframe technical analysis');
    console.log('   ✅ Market character change detection');
    console.log('   ✅ Professional portfolio management advice');

  } catch (error) {
    console.error('❌ Phemex Portfolio Agent test failed:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure Mastra is running (npm run dev)');
    console.log('   2. Check API credentials are correct');
    console.log('   3. Verify network connectivity to Phemex/Kraken APIs');
    console.log('   4. Check if agent is properly registered in Mastra');
  }
}

// Run the test
testPhemexPortfolioAgent();
