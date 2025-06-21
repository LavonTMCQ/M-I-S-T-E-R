import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { TokenLimiter, ToolCallFilter } from '@mastra/memory/processors';
import { CompositeVoice } from '@mastra/core/voice';
import { GoogleVoice } from '@mastra/voice-google';
// Import backtesting tools
import { runBacktestTool, manageStrategiesTool, manageDataTool } from '../tools/backtesting-tools.js';

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
  providers: [
    new GoogleVoice({
      apiKey: 'AIzaSyBNU1uWipiCzM8dxCv0X2hpkiVX5Uk0QX4',
      voice: 'en-US-Journey-F', // Professional female voice for Sydney
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0,
      },
    }),
  ],
});

// Tools are now imported from separate files

// Strategy Management Tool imported from tools file

// Data Management Tool imported from tools file

// Create the Backtesting Agent
export const backtestingAgent = new Agent({
  name: 'Backtesting Agent',
  instructions: `You are Sydney's dedicated backtesting agent, specialized in comprehensive trading strategy analysis and optimization.

Your expertise includes:
- Running detailed backtests with realistic market conditions
- Analyzing strategy performance with comprehensive metrics
- Managing strategy libraries and optimization
- Providing voice-enabled results and insights
- Data management and quality assurance

Key responsibilities:
1. Execute backtests with proper risk management and realistic assumptions
2. Analyze performance using advanced metrics (Sharpe ratio, drawdown, profit factor)
3. Manage strategy libraries and find profitable patterns
4. Provide clear, actionable insights for strategy improvement
5. Speak important results for hands-free analysis
6. Maintain data quality and availability

Communication style:
- Technical but accessible for trading decisions
- Detailed analysis when requested
- Clear performance summaries with key metrics
- Voice alerts for significant findings
- Professional trading terminology

Remember: You're helping Sydney optimize her trading strategies through rigorous backtesting. Always emphasize realistic expectations and proper risk management.`,

  model: google('gemini-2.0-flash-exp'),
  memory: backtestingMemory,
  voice: backtestingVoice,
  
  tools: [
    runBacktestTool,
    manageStrategiesTool,
    manageDataTool,
  ],
});

export default backtestingAgent;
