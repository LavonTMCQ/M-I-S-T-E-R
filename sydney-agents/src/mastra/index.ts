
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow.js';
import { soneResearchWorkflow, soneMainResearchWorkflow } from './workflows/sone-research-workflow.js';
import { weatherAgent } from './agents/weather-agent.js';
import { soneAgent } from './agents/sone-agent.js';

export const mastra = new Mastra({
  workflows: {
    weatherWorkflow,
    soneResearchWorkflow,
    soneMainResearchWorkflow
  },
  agents: { weatherAgent, soneAgent },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),

});
