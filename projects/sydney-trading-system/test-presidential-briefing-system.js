/**
 * Comprehensive Test Suite for Presidential-Level Portfolio Briefing System
 * 
 * Tests all components of the news and intelligence system:
 * - Comprehensive news gathering
 * - Breaking news monitoring  
 * - Daily briefing workflow
 * - Enhanced portfolio agent with news integration
 */

import { mastra } from './sydney-agents/src/mastra/index.js';

// Test configuration
const PORTFOLIO_SYMBOLS = ['ETH', 'ADA', 'FET', 'ATOM'];
const TEST_DURATION_MS = 60000; // 1 minute for demo purposes

async function testComprehensiveNewsGathering() {
  console.log('\n🔍 Testing Comprehensive News Gathering...');
  console.log('=' .repeat(60));
  
  try {
    const agent = mastra.getAgent('phemexPortfolioAgent');
    
    console.log('📰 Gathering comprehensive news intelligence...');
    const newsResult = await agent.tools.comprehensiveNews.execute({
      context: {
        portfolioSymbols: PORTFOLIO_SYMBOLS,
        includeGlobal: true,
        includeSocialSentiment: true,
        maxArticles: 25
      }
    });
    
    if (newsResult.success) {
      console.log('✅ News gathering successful!');
      console.log(`📊 Executive Summary:`);
      console.log(`   - Total articles: ${newsResult.executive_summary.total_articles}`);
      console.log(`   - High impact: ${newsResult.executive_summary.high_impact_count}`);
      console.log(`   - Portfolio mentions: ${newsResult.executive_summary.portfolio_mentions}`);
      console.log(`   - Regulatory alerts: ${newsResult.executive_summary.regulatory_alerts}`);
      console.log(`   - Overall sentiment: ${newsResult.executive_summary.overall_sentiment}`);
      
      console.log(`\n🎯 Impact Analysis:`);
      if (newsResult.detailed_analysis.high_impact.length > 0) {
        console.log(`   High Impact News (${newsResult.detailed_analysis.high_impact.length} items):`);
        newsResult.detailed_analysis.high_impact.slice(0, 3).forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.title.substring(0, 80)}...`);
        });
      }
      
      if (newsResult.recommendations.length > 0) {
        console.log(`\n📋 Recommendations:`);
        newsResult.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. [${rec.priority}] ${rec.message}`);
        });
      }
    } else {
      console.log('❌ News gathering failed:', newsResult.error);
    }
    
    return newsResult.success;
  } catch (error) {
    console.error('❌ News gathering test failed:', error);
    return false;
  }
}

async function testBreakingNewsMonitoring() {
  console.log('\n🚨 Testing Breaking News Monitoring...');
  console.log('=' .repeat(60));
  
  try {
    const agent = mastra.getAgent('phemexPortfolioAgent');
    
    console.log('📡 Starting breaking news scan...');
    const monitorResult = await agent.tools.breakingNewsMonitor.execute({
      context: {
        portfolioSymbols: PORTFOLIO_SYMBOLS,
        alertThreshold: 'MEDIUM',
        includeVoiceAlert: false, // Disable for testing
        maxArticlesPerSource: 15
      }
    });
    
    if (monitorResult.success) {
      console.log('✅ Breaking news monitoring successful!');
      console.log(`📊 Monitoring Summary:`);
      console.log(`   - Articles scanned: ${monitorResult.summary.total_articles_scanned}`);
      console.log(`   - Alerts generated: ${monitorResult.summary.alerts_generated}`);
      console.log(`   - Critical alerts: ${monitorResult.summary.critical_alerts}`);
      console.log(`   - High alerts: ${monitorResult.summary.high_alerts}`);
      console.log(`   - Action required: ${monitorResult.summary.action_required_count}`);
      console.log(`   - Impacted symbols: ${monitorResult.summary.impacted_symbols.join(', ') || 'None'}`);
      
      if (monitorResult.alerts.length > 0) {
        console.log(`\n🚨 Recent Alerts:`);
        monitorResult.alerts.slice(0, 5).forEach((alert, index) => {
          console.log(`   ${index + 1}. [${alert.severity}] ${alert.title.substring(0, 70)}...`);
          if (alert.portfolioSymbols.length > 0) {
            console.log(`      Impact: ${alert.portfolioSymbols.join(', ')}`);
          }
        });
      }
      
      if (monitorResult.recommendations.length > 0) {
        console.log(`\n📋 Immediate Recommendations:`);
        monitorResult.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. [${rec.priority}] ${rec.action}`);
        });
      }
    } else {
      console.log('❌ Breaking news monitoring failed:', monitorResult.error);
    }
    
    return monitorResult.success;
  } catch (error) {
    console.error('❌ Breaking news monitoring test failed:', error);
    return false;
  }
}

async function testDailyBriefingWorkflow() {
  console.log('\n📋 Testing Daily Briefing Workflow...');
  console.log('=' .repeat(60));
  
  try {
    console.log('🚀 Starting daily briefing workflow...');
    const briefingWorkflow = mastra.getWorkflow('dailyBriefingWorkflow');
    const run = await briefingWorkflow.createRunAsync();
    
    const briefingDate = new Date().toISOString().split('T')[0];
    
    console.log(`📅 Generating briefing for: ${briefingDate}`);
    console.log(`🎯 Portfolio symbols: ${PORTFOLIO_SYMBOLS.join(', ')}`);
    
    const result = await run.start({
      inputData: {
        portfolioSymbols: PORTFOLIO_SYMBOLS,
        briefingDate: briefingDate
      }
    });
    
    if (result.status === 'success') {
      console.log('✅ Daily briefing workflow completed successfully!');
      console.log(`📊 Briefing Results:`);
      console.log(`   - Executive summary available: ${result.result.executiveSummary ? 'Yes' : 'No'}`);
      console.log(`   - Urgent actions: ${result.result.urgentActionCount}`);
      console.log(`   - Next briefing: ${new Date(result.result.nextBriefingTime).toLocaleString()}`);
      
      if (result.result.executiveSummary) {
        console.log(`\n📝 Executive Summary Preview:`);
        const summary = result.result.executiveSummary.substring(0, 300);
        console.log(`   ${summary}...`);
      }
      
      console.log(`\n📄 Full briefing document available in result.fullBriefing`);
      
    } else if (result.status === 'suspended') {
      console.log('⏸️ Briefing workflow suspended - waiting for external input');
      console.log(`   Suspended steps: ${result.suspended.join(', ')}`);
    } else if (result.status === 'failed') {
      console.log('❌ Daily briefing workflow failed:', result.error);
    }
    
    return result.status === 'success';
  } catch (error) {
    console.error('❌ Daily briefing workflow test failed:', error);
    return false;
  }
}

async function testEnhancedPortfolioAgent() {
  console.log('\n🤖 Testing Enhanced Portfolio Agent with News Integration...');
  console.log('=' .repeat(60));
  
  try {
    const agent = mastra.getAgent('phemexPortfolioAgent');
    
    console.log('💬 Testing agent with news-aware query...');
    const testQuery = `Please provide a comprehensive analysis of my portfolio considering:
1. Current market conditions for ETH, ADA, FET, and ATOM
2. Any recent news that might affect these positions
3. Risk assessment based on current global developments
4. Specific recommendations for position adjustments
5. Breaking news alerts that might impact my hedging strategy

Include your analysis of recent news sentiment and any geopolitical factors.`;

    console.log('🎯 Sending query to enhanced portfolio agent...');
    const response = await agent.generate(testQuery);
    
    console.log('✅ Agent response received!');
    console.log(`📝 Response length: ${response.text.length} characters`);
    
    // Check if tools were used
    if (response.toolResults && response.toolResults.length > 0) {
      console.log(`🔧 Tools used: ${response.toolResults.length}`);
      response.toolResults.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.toolName}: ${tool.result ? 'Success' : 'Failed'}`);
      });
    }
    
    // Show a preview of the response
    console.log(`\n📄 Response Preview:`);
    const preview = response.text.substring(0, 500);
    console.log(`${preview}...`);
    
    return true;
  } catch (error) {
    console.error('❌ Enhanced portfolio agent test failed:', error);
    return false;
  }
}

async function testMarketCharacterWithNews() {
  console.log('\n📈 Testing Market Character Analysis with News Context...');
  console.log('=' .repeat(60));
  
  try {
    const agent = mastra.getAgent('phemexPortfolioAgent');
    
    console.log('📊 Analyzing market character for portfolio symbols...');
    const marketResult = await agent.tools.marketCharacterAnalysis.execute({
      context: {
        symbols: PORTFOLIO_SYMBOLS.map(s => `${s}USDT`),
        timeframes: ['1h', '4h', '1d'],
        includeCorrelation: true
      }
    });
    
    if (marketResult.success) {
      console.log('✅ Market character analysis successful!');
      console.log(`📊 Overall Assessment: ${marketResult.overallAssessment.overall}`);
      console.log(`   Confidence: ${(marketResult.overallAssessment.confidence * 100).toFixed(1)}%`);
      
      console.log(`\n🎯 Symbol Analysis:`);
      PORTFOLIO_SYMBOLS.forEach(symbol => {
        const symbolData = marketResult.analysis[`${symbol}USDT`];
        if (symbolData) {
          console.log(`   ${symbol}:`);
          Object.entries(symbolData).forEach(([timeframe, analysis]) => {
            if (analysis.character && analysis.character !== 'data_unavailable') {
              console.log(`     ${timeframe}: ${analysis.character} (${(analysis.confidence * 100).toFixed(1)}%)`);
            }
          });
        }
      });
      
      if (marketResult.recommendations.length > 0) {
        console.log(`\n📋 Market Recommendations:`);
        marketResult.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. [${rec.urgency}] ${rec.message}`);
        });
      }
    } else {
      console.log('❌ Market character analysis failed:', marketResult.error);
    }
    
    return marketResult.success;
  } catch (error) {
    console.error('❌ Market character analysis test failed:', error);
    return false;
  }
}

async function runComprehensiveTests() {
  console.log('🏛️ PRESIDENTIAL PORTFOLIO BRIEFING SYSTEM - COMPREHENSIVE TEST SUITE');
  console.log('=' .repeat(80));
  console.log(`🎯 Portfolio: ${PORTFOLIO_SYMBOLS.join(', ')}`);
  console.log(`⏰ Test started: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(80));
  
  const results = {
    newsGathering: false,
    breakingNews: false,
    dailyBriefing: false,
    enhancedAgent: false,
    marketCharacter: false
  };
  
  try {
    // Test 1: Comprehensive News Gathering
    results.newsGathering = await testComprehensiveNewsGathering();
    
    // Test 2: Breaking News Monitoring
    results.breakingNews = await testBreakingNewsMonitoring();
    
    // Test 3: Market Character Analysis
    results.marketCharacter = await testMarketCharacterWithNews();
    
    // Test 4: Daily Briefing Workflow
    results.dailyBriefing = await testDailyBriefingWorkflow();
    
    // Test 5: Enhanced Portfolio Agent
    results.enhancedAgent = await testEnhancedPortfolioAgent();
    
  } catch (error) {
    console.error('❌ Test suite encountered an error:', error);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('=' .repeat(80));
  
  const testResults = [
    { name: 'Comprehensive News Gathering', status: results.newsGathering },
    { name: 'Breaking News Monitoring', status: results.breakingNews },
    { name: 'Market Character Analysis', status: results.marketCharacter },
    { name: 'Daily Briefing Workflow', status: results.dailyBriefing },
    { name: 'Enhanced Portfolio Agent', status: results.enhancedAgent }
  ];
  
  testResults.forEach(test => {
    const status = test.status ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.name}`);
  });
  
  const passCount = testResults.filter(t => t.status).length;
  const totalTests = testResults.length;
  
  console.log('=' .repeat(80));
  console.log(`🎯 OVERALL RESULT: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL - Presidential briefing system ready for deployment!');
    console.log(`\n📅 To start daily briefings at 9:30 AM, run:`);
    console.log(`   node start-daily-briefing-scheduler.js`);
    console.log(`\n🚨 To start continuous breaking news monitoring:`);
    console.log(`   Use the startBreakingNewsMonitoring tool with 15-minute intervals`);
  } else {
    console.log('⚠️ Some systems require attention before full deployment');
  }
  
  console.log('=' .repeat(80));
  console.log(`⏰ Test completed: ${new Date().toLocaleString()}`);
}

// Run the comprehensive test suite
runComprehensiveTests().catch(console.error);