
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow.js';
import { soneResearchWorkflow, soneMainResearchWorkflow } from './workflows/sone-research-workflow.js';
import { weatherAgent } from './agents/weather-agent.js';
import { soneAgent } from './agents/sone-agent.js';
import { cashAgent } from './agents/cash-agent.js';
import { strikeAgent } from './agents/strike-agent';
import { cryptoBacktestingAgent } from './agents/crypto-backtesting-agent';
import { backtestingAgent } from './agents/backtesting-agent';
import { quantAgent } from './agents/quant-agent';
import { fibonacciAgent } from './agents/fibonacci-agent';
import { soneMCPServer } from './mcp/sone-mcp-server';

export const mastra = new Mastra({
  workflows: {
    weatherWorkflow,
    soneResearchWorkflow,
    soneMainResearchWorkflow
  },
  agents: { weatherAgent, soneAgent, cashAgent, strikeAgent, cryptoBacktestingAgent, backtestingAgent, quantAgent, fibonacciAgent },
  mcpServers: {
    soneMCPServer
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
