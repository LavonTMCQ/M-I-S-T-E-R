#!/usr/bin/env tsx

/**
 * MISTER Startup Script
 * Starts the MISTER API server alongside the existing Mastra system
 * This provides the backend API that the MISTER frontend expects
 */

import { misterServer } from './server/mister-server.js';
import { mastra } from './index.js';

async function startMisterSystem() {
  console.log('🤖 MISTER - Managed Wallet Copy Trading System');
  console.log('=' .repeat(60));
  console.log('🎯 Integrating with existing Mastra agent system');
  console.log('🔐 Non-custodial • 🤖 AI-powered • ⚡ Lightning-fast\n');

  try {
    // Verify Mastra system is available
    console.log('🔍 Checking Mastra system...');
    const availableAgents = Object.keys(mastra.agents);
    console.log(`   Available agents: ${availableAgents.join(', ')}`);
    
    if (!availableAgents.includes('strikeAgent')) {
      throw new Error('Strike agent not found in Mastra system');
    }
    
    console.log('   ✅ Mastra system ready');

    // Start MISTER API server
    console.log('\n🚀 Starting MISTER API server...');
    await misterServer.start();
    console.log('   ✅ MISTER API server running on port 4113');

    // Test Strike agent connectivity
    console.log('\n🧪 Testing Strike agent connectivity...');
    try {
      const strikeAgent = mastra.agents.strikeAgent;
      const healthCheck = await strikeAgent.generate(
        'Use the checkStrikeAPIHealth tool to check if Strike Finance API is available',
        {
          tools: { checkStrikeAPIHealth: strikeAgent.tools.checkStrikeAPIHealth }
        }
      );
      console.log('   ✅ Strike agent responding');
    } catch (error) {
      console.log('   ⚠️ Strike agent test failed, but server will continue');
    }

    // Display system status
    console.log('\n📊 MISTER System Status:');
    console.log('   🌐 Mastra Playground: http://localhost:4112');
    console.log('   🔗 MISTER API: http://localhost:4113');
    console.log('   📊 Health Check: http://localhost:4113/health');
    console.log('   🤖 Agents API: http://localhost:4113/api/agents');
    console.log('   🔌 WebSocket: ws://localhost:4113');

    console.log('\n🎯 Frontend Integration:');
    console.log('   Update frontend API_URL to: http://localhost:4113');
    console.log('   Update WebSocket URL to: ws://localhost:4113');

    console.log('\n📋 Available API Endpoints:');
    const endpoints = [
      'POST /api/auth/wallet - Wallet authentication',
      'GET  /api/auth/me - Get current user',
      'GET  /api/dashboard - Dashboard data',
      'GET  /api/positions - Trading positions',
      'GET  /api/ai-activity - AI activity feed',
      'POST /api/wallet/create - Create managed wallet',
      'GET  /api/wallet/:address - Get wallet info',
      'GET  /api/market-data/price/:pair - Market data',
      'POST /api/trading/start - Start copy trading',
      'POST /api/trading/stop - Stop copy trading',
      'GET  /api/trading/status - Trading status',
    ];
    
    endpoints.forEach(endpoint => {
      console.log(`   ${endpoint}`);
    });

    console.log('\n🛡️ Security Features:');
    console.log('   ✅ CORS configured for frontend origins');
    console.log('   ✅ Request logging and error handling');
    console.log('   ✅ Integration with Mastra agent security');
    console.log('   ✅ WebSocket connection management');

    console.log('\n🔄 Real-time Features:');
    console.log('   ✅ WebSocket server for live updates');
    console.log('   ✅ Price update broadcasting');
    console.log('   ✅ Position change notifications');
    console.log('   ✅ AI activity streaming');

    // Setup graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        await misterServer.stop();
        console.log('✅ MISTER server stopped');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    console.log('\n🎉 MISTER System Ready!');
    console.log('=' .repeat(60));
    console.log('💡 The frontend can now connect to the integrated backend');
    console.log('🚀 Ready for copy trading on Cardano perpetual swaps!');
    console.log('\nPress Ctrl+C to stop the server');

    // Keep the process alive
    process.stdin.resume();

  } catch (error) {
    console.error('\n❌ Failed to start MISTER system:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the system
startMisterSystem();
