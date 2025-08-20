import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { TokenLimiter, ToolCallFilter } from '@mastra/memory/processors';
import { CompositeVoice } from '@mastra/core/voice';
import { GoogleVoice } from '@mastra/voice-google';
// Import backtesting tools
import { runBacktestTool, manageStrategiesTool, manageDataTool, macdHistogramBacktest } from '../tools/backtesting-tools.js';

// Import Pine Script parser tool
import { parsePineScriptTool } from '../tools/pine-script-parser.js';

// Import First Candle Strategy tools
import { firstCandleStrategyTool } from '../tools/first-candle-strategy.js';
import { tomorrowLabsOrbTool } from '../tools/real-first-candle-strategy.js';
import { tomorrowLabsOrbMonitorTool } from '../tools/tomorrow-labs-orb-monitor.js';
import { autoStartOrbMonitorTool } from '../tools/auto-start-orb-monitor.js';
import { startTradingTool } from '../tools/start-trading.js';

// Import Webhook Monitoring tools
import { webhookMonitorTool } from '../tools/webhook-monitor-tool.js';
import { realtimeSignalProcessor } from '../tools/realtime-signal-processor.js';
import { tradeExecutionMonitor } from '../tools/trade-execution-monitor.js';
import { tradingViewWebhookIntegration } from '../tools/tradingview-webhook-integration.js';

// Create backtesting tools object following Sone agent pattern
const backtestingTools: any = {
  runBacktestTool,
  manageStrategiesTool,
  manageDataTool,
  macdHistogramBacktest,
  parsePineScriptTool,
  firstCandleStrategyTool,
  tomorrowLabsOrbTool,
  tomorrowLabsOrbMonitorTool,
  autoStartOrbMonitorTool,
  startTradingTool,
  // Webhook Monitoring Tools
  webhookMonitorTool,
  realtimeSignalProcessor,
  tradeExecutionMonitor,
  tradingViewWebhookIntegration,
};

/**
 * Dedicated Backtesting Agent for Sydney's Trading Analysis
 * 
 * This agent is specifically designed for Sydney's backtesting workflow with:
 * - Voice-enabled backtesting commands and results reporting
 * - Integration with all backtesting tools and systems
 * - Clean separation of concerns from the main Sone agent
 * - Advanced strategy management and optimization
 * - Comprehensive performance analysis and reporting
 */

// Enhanced memory system for backtesting-specific data
const backtestingMemory = new Memory({
  storage: new LibSQLStore({
    url: 'file:../backtesting-agent-memory.db',
  }),
  vector: new LibSQLVector({
    connectionUrl: 'file:../backtesting-agent-memory.db',
  }),
  embedder: fastembed,
  options: {
    lastMessages: 30, // More context for backtesting conversations
    semanticRecall: {
      topK: 10, // More relevant backtesting memories
      messageRange: {
        before: 5,
        after: 3,
      },
      scope: 'resource',
    },
    workingMemory: {
      enabled: true,
      template: `
# Sydney's Backtesting Session

## Current Focus
- **Active Strategy**: [Strategy being tested]
- **Target Symbol**: [Symbol being analyzed]
- **Time Period**: [Date range for backtesting]
- **Performance Goal**: [Target metrics]

## Strategy Library
- **Profitable Strategies**: [Strategies with >60% hit rate]
- **Testing Queue**: [Strategies to test next]
- **Optimization Targets**: [Parameters to optimize]

## Recent Results
- **Best Hit Rate**: 0%
- **Best Profit Factor**: 0.0
- **Best Sharpe Ratio**: 0.0
- **Total Strategies Tested**: 0

## Data Status
- **Available Symbols**: SPY, QQQ, [others]
- **Data Coverage**: [Date ranges available]
- **Last Data Update**: [Timestamp]

## Performance Tracking
- **Session Backtests**: 0
- **Profitable Strategies Found**: 0
- **Average Performance**: [Metrics]
- **Optimization Progress**: [Status]

## Next Actions
- [ ] Test strategy variations
- [ ] Optimize parameters
- [ ] Analyze results
- [ ] Save profitable strategies
`,
    },
    threads: {
      generateTitle: true,
    },
  },
  processors: [
    new ToolCallFilter({ exclude: ['verboseDebugTool'] }),
    new TokenLimiter(150000),
  ],
});

// Voice system for backtesting results
const backtestingVoice = new CompositeVoice({
  speakProvider: new GoogleVoice({
    speechModel: {
      apiKey: 'AIzaSyBNU1uWipiCzM8dxCv0X2hpkiVX5Uk0QX4',
    },
    speaker: 'en-US-Journey-F', // Professional female voice for Sydney
  }),
});

// Tools are now imported from separate files

// Strategy Management Tool imported from tools file

// Data Management Tool imported from tools file

// Create the Backtesting Agent
export const backtestingAgent = new Agent({
  name: 'Backtesting Agent',
  instructions: `You are Sydney's dedicated backtesting agent, specialized in comprehensive trading strategy analysis and optimization with Pine Script integration.

Your expertise includes:
- Running detailed backtests with realistic market conditions
- Analyzing strategy performance with comprehensive metrics
- Managing strategy libraries and optimization
- Providing voice-enabled results and insights
- Data management and quality assurance
- **Pine Script Strategy Integration**: Parse and backtest TradingView Pine Script strategies

Key responsibilities:
1. Execute backtests with proper risk management and realistic assumptions
2. Analyze performance using advanced metrics (Sharpe ratio, drawdown, profit factor)
3. **Parse Pine Script strategies** from natural language or code and convert them to backtesting format
4. Manage strategy libraries and find profitable patterns
5. Provide clear, actionable insights for strategy improvement
6. Speak important results for hands-free analysis
7. Maintain data quality and availability

## Pine Script Integration Workflow:
When Sydney provides a Pine Script strategy (either as code or natural language description):
1. **Parse the strategy** using parsePineScriptTool to extract trading logic
2. **Convert indicators and conditions** to Alpha Vantage compatible format
3. **Run comprehensive backtests** on specified symbols (SPY, QQQ, etc.)
4. **Analyze results** and provide detailed performance metrics
5. **Speak key findings** for hands-free analysis

Communication style:
- Technical but accessible for trading decisions
- Detailed analysis when requested
- Clear performance summaries with key metrics
- Voice alerts for significant findings
- Professional trading terminology
- **Pine Script aware**: Understand TradingView syntax and trading logic

Remember: You're helping Sydney optimize her trading strategies through rigorous backtesting. Always emphasize realistic expectations and proper risk management. When working with Pine Script strategies, ensure proper conversion to backtesting format while maintaining the original trading logic.`,

  model: google('gemini-2.5-pro'),
  memory: backtestingMemory,
  voice: backtestingVoice,
  
  tools: backtestingTools,
});

export default backtestingAgent;
