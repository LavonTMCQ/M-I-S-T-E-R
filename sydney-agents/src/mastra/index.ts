
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow.js';
import { soneResearchWorkflow, soneMainResearchWorkflow } from './workflows/sone-research-workflow.js';
import { weatherAgent } from './agents/weather-agent.js';
import { soneAgent } from './agents/sone-agent.js';
import { backtestingAgent } from './agents/backtesting-agent.js';
import { backtestingKnowledgeStore } from './backtesting/knowledge-store.js';
import { dataManager } from './backtesting/data-manager.js';

export const mastra = new Mastra({
  workflows: {
    weatherWorkflow,
    soneResearchWorkflow,
    soneMainResearchWorkflow
  },
  agents: { weatherAgent, soneAgent, backtestingAgent },
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

// Initialize on startup
initializeBacktestingSystem();
