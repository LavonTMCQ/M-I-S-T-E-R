
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow.js';
import { soneResearchWorkflow, soneMainResearchWorkflow } from './workflows/sone-research-workflow.js';
import { dailyBriefingWorkflow } from './workflows/daily-briefing-workflow.js';
import { weatherAgent } from './agents/weather-agent.js';
import { soneAgent } from './agents/sone-agent.js';
import { backtestingAgent } from './agents/backtesting-agent.js';
import { quantAgent, initializeQuantAgent } from './agents/quant-agent.js';
import { cryptoBacktestingAgent, initializeCryptoBacktestingSystem } from './agents/crypto-backtesting-agent.js';
import { phemexPortfolioAgent } from './agents/phemex-portfolio-agent.js';
import { phemexPortfolioAgentSimple } from './agents/phemex-portfolio-agent-simple.js';
import { backtestingKnowledgeStore } from './backtesting/knowledge-store.js';
import { dataManager } from './backtesting/data-manager.js';
import initializeOrbAutoStart from './startup/orb-auto-start.js';
import { tradingIntelligenceNetwork } from './networks/trading-intelligence-network.js';

export const mastra = new Mastra({
  workflows: {
    weatherWorkflow,
    soneResearchWorkflow,
    soneMainResearchWorkflow,
    dailyBriefingWorkflow
  },
  agents: { weatherAgent, soneAgent, backtestingAgent, quantAgent, cryptoBacktestingAgent, phemexPortfolioAgent, phemexPortfolioAgentSimple },
  
  // Register Agent Networks for intelligent orchestration
  vnext_networks: {
    tradingIntelligence: tradingIntelligenceNetwork,
  },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),

});

// Initialize backtesting system components
async function initializeBacktestingSystem() {
  try {
    console.log('🔧 Initializing backtesting system...');
    await backtestingKnowledgeStore.initialize();
    await dataManager.initialize();
    console.log('✅ Backtesting system initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize backtesting system:', error);
  }
}

// Initialize Quant agent system
async function initializeQuantSystem() {
  try {
    console.log('🔧 Initializing Quant agent system...');
    await initializeQuantAgent();
    console.log('✅ Quant agent system initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Quant agent system:', error);
  }
}

// Initialize Tomorrow Labs ORB monitoring system
async function initializeOrbSystem() {
  try {
    console.log('🎯 Initializing Tomorrow Labs ORB monitoring system...');
    await initializeOrbAutoStart();
    console.log('✅ Tomorrow Labs ORB system initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize ORB system:', error);
  }
}



// Initialize crypto backtesting system
async function initializeCryptoSystem() {
  try {
    console.log('🔧 Initializing crypto backtesting system...');
    await initializeCryptoBacktestingSystem();
    console.log('✅ Crypto backtesting system initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize crypto backtesting system:', error);
  }
}

// Initialize all systems on startup
async function initializeAllSystems() {
  await initializeBacktestingSystem();
  await initializeQuantSystem();
  await initializeCryptoSystem();
  // DISABLED: ORB monitoring system - was starting automatically
  // await initializeOrbSystem();
}

initializeAllSystems();

// Trading intelligence functions temporarily disabled
