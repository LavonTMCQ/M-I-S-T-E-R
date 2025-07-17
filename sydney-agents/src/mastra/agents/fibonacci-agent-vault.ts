import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { TokenLimiter, ToolCallFilter } from '@mastra/memory/processors';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';

// Import Agent Vault services
import { createAgentVaultBalanceManager, DEFAULT_AGENT_VAULT_CONFIG } from '../services/agent-vault-balance-manager';
import { agentVaultTransactionBuilder } from '../services/agent-vault-transaction-builder';

// Import existing tools (reuse from original fibonacci agent)
import { fibonacciStrategyTool } from '../tools/fibonacci-strategy-tool';
import { krakenWebSocketTool } from '../tools/kraken-websocket-tool';
import { krakenRestApiTool } from '../tools/kraken-rest-api-tool';

// Create Agent Vault Balance Manager instance
const vaultBalanceManager = createAgentVaultBalanceManager(DEFAULT_AGENT_VAULT_CONFIG);

// Agent Vault Fibonacci Trading Tool
const fibonacciVaultTradingTool = createTool({
  id: 'fibonacciVaultTrading',
  description: 'Execute Fibonacci-based trades through Agent Vault with automatic balance management and 40 ADA minimum handling',
  inputSchema: z.object({
    vaultAddress: z.string().describe('Agent Vault contract address'),
    signal: z.object({
      side: z.enum(['Long', 'Short']).describe('Trade direction'),
      confidence: z.number().min(0).max(100).describe('Signal confidence percentage'),
      fibonacciLevel: z.string().describe('Fibonacci retracement level (e.g., 61.8%)'),
      entryPrice: z.number().describe('Suggested entry price'),
      suggestedAmount: z.number().optional().describe('Suggested trade amount in ADA (will be adjusted based on vault balance)'),
      reason: z.string().describe('Detailed reasoning for the trade signal')
    })
  }),
  outputSchema: z.object({
    success: z.boolean(),
    executed: z.boolean(),
    actualAmount: z.number().optional(),
    adjustedFromOriginal: z.boolean().optional(),
    reason: z.string(),
    vaultBalance: z.number().optional(),
    txHash: z.string().optional(),
    error: z.string().optional()
  })
}, async ({ vaultAddress, signal }) => {
  try {
    console.log(`🎯 Fibonacci Vault Trading Signal: ${signal.side} at ${signal.fibonacciLevel} level`);

    // Step 1: Get vault balance and trading recommendations
    const recommendations = await vaultBalanceManager.getTradingRecommendations(vaultAddress);
    
    if (!recommendations.canTrade) {
      return {
        success: false,
        executed: false,
        reason: `Cannot trade: ${recommendations.warnings.join(', ')}`,
        vaultBalance: recommendations.balance.totalBalance
      };
    }

    // Step 2: Determine trade amount (use suggested or recommended)
    const tradeAmount = signal.suggestedAmount || Math.min(50, recommendations.recommendedSize); // Default 50 ADA or recommended size
    
    // Step 3: Evaluate trade execution
    const execution = await vaultBalanceManager.evaluateTradeExecution(vaultAddress, {
      type: signal.side.toLowerCase() as 'long' | 'short',
      suggestedAmount: tradeAmount,
      confidence: signal.confidence,
      strategy: 'Fibonacci',
      timestamp: new Date().toISOString(),
      reason: signal.reason
    });

    if (!execution.canExecute) {
      return {
        success: false,
        executed: false,
        reason: execution.reason,
        vaultBalance: recommendations.balance.totalBalance
      };
    }

    // Step 4: Execute trade through Agent Vault
    const tradeResult = await agentVaultTransactionBuilder.executeAgentTrade(
      vaultAddress,
      execution.actualAmount,
      signal.side.toLowerCase() as 'long' | 'short',
      DEFAULT_AGENT_VAULT_CONFIG.contractAddress
    );

    // Step 5: Log trading activity
    vaultBalanceManager.logTradingActivity(vaultAddress, {
      type: signal.side.toLowerCase() as 'long' | 'short',
      suggestedAmount: tradeAmount,
      confidence: signal.confidence,
      strategy: 'Fibonacci',
      timestamp: new Date().toISOString(),
      reason: signal.reason
    }, execution);

    if (tradeResult.success) {
      console.log(`✅ Fibonacci Vault Trade Executed: ${execution.actualAmount} ADA ${signal.side}`);
      
      return {
        success: true,
        executed: true,
        actualAmount: execution.actualAmount,
        adjustedFromOriginal: execution.adjustedFromOriginal,
        reason: `Trade executed successfully. ${execution.reason}`,
        vaultBalance: recommendations.balance.totalBalance,
        txHash: tradeResult.txHash
      };
    } else {
      return {
        success: false,
        executed: false,
        reason: `Trade execution failed: ${tradeResult.error}`,
        vaultBalance: recommendations.balance.totalBalance,
        error: tradeResult.error
      };
    }

  } catch (error) {
    console.error('❌ Fibonacci Vault Trading Error:', error);
    return {
      success: false,
      executed: false,
      reason: 'Internal error during trade execution',
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

// Vault Status Tool
const vaultStatusTool = createTool({
  id: 'vaultStatus',
  description: 'Check Agent Vault balance, trading capacity, and recommendations',
  inputSchema: z.object({
    vaultAddress: z.string().describe('Agent Vault contract address')
  }),
  outputSchema: z.object({
    balance: z.object({
      totalBalance: z.number(),
      availableForTrading: z.number(),
      reservedForFees: z.number()
    }),
    tradingCapacity: z.number(),
    status: z.enum(['healthy', 'low', 'critical']),
    recommendations: z.array(z.string()),
    canTrade: z.boolean()
  })
}, async ({ vaultAddress }) => {
  try {
    const statistics = await vaultBalanceManager.getVaultStatistics(vaultAddress);
    
    return {
      balance: statistics.balance,
      tradingCapacity: statistics.tradingCapacity,
      status: statistics.status,
      recommendations: statistics.recommendations,
      canTrade: statistics.status !== 'critical'
    };
  } catch (error) {
    console.error('❌ Vault Status Error:', error);
    throw error;
  }
});

// Voice announcement tool (simplified for vault trading)
const speakFibonacciVaultResultsTool = createTool({
  id: 'speakFibonacciVaultResults',
  description: 'Announce Fibonacci Agent Vault trading results via voice',
  inputSchema: z.object({
    text: z.string().describe('Text to speak about vault trading results')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional()
  })
}, async ({ text }) => {
  try {
    console.log(`🔊 FIBONACCI VAULT VOICE: ${text}`);
    
    // Use system say command as fallback
    exec(`say "${text}"`, (error) => {
      if (error) {
        console.error('❌ Voice announcement failed:', error);
      } else {
        console.log('✅ Fibonacci vault voice announcement completed');
      }
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Voice announcement error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

// Create Fibonacci Vault trading tools object
const fibonacciVaultTradingTools: any = {
  fibonacciStrategyTool,
  fibonacciVaultTradingTool,
  vaultStatusTool,
  krakenWebSocketTool,
  krakenRestApiTool,
  speakFibonacciVaultResultsTool,
};

// Enhanced memory system for Fibonacci Vault trading data
const fibonacciVaultTradingMemory = new Memory({
  storage: new LibSQLStore({
    url: 'file:./fibonacci-vault-agent-memory.db',
  }) as any,
  vector: new LibSQLVector({
    connectionUrl: 'file:./fibonacci-vault-agent-memory.db',
  }),
  embedder: fastembed,
  options: {
    lastMessages: 25,
    semanticRecall: {
      topK: 8,
      messageRange: {
        before: 4,
        after: 2,
      },
      scope: 'resource',
    },
  },
  processors: [
    new TokenLimiter(40000),
    new ToolCallFilter({ exclude: [] }),
  ],
});

/**
 * Fibonacci Agent Vault - Enhanced Security Trading Agent
 *
 * This agent specializes in Fibonacci retracement trading through Agent Vault:
 * - Uses smart contracts instead of managed wallets for enhanced security
 * - Automatic balance management with 40 ADA minimum handling
 * - Position sizing based on available vault balance
 * - Preserves all original Fibonacci trading logic
 * - Enhanced security with zero private key exposure
 */
export const fibonacciAgentVault = new Agent({
  name: 'fibonacciAgentVault',
  instructions: `You are Sydney's enhanced Fibonacci Retracement Trading Agent with Agent Vault integration, specialized in secure leveraged ADA/USD trading.

## AGENT VAULT ENHANCED SECURITY:
- **SMART CONTRACT PROTECTION**: All trades execute through Agent Vault smart contracts
- **ZERO KEY EXPOSURE**: Your private keys never leave your wallet
- **AUTOMATIC BALANCE MANAGEMENT**: System handles 40 ADA minimum requirements automatically
- **POSITION SIZING**: Dynamic sizing based on available vault balance
- **EMERGENCY CONTROLS**: Users maintain full control and can withdraw anytime

## Your Core Responsibilities:

### 🔸 Fibonacci Analysis (UNCHANGED):
- **PRIMARY STRATEGY**: Identify swing highs and lows for accurate Fibonacci level calculation
- **KEY LEVELS**: Focus on 38.2%, 50%, 61.8%, and 78.6% retracement levels
- **ENTRY SIGNALS**: Look for price bounces or rejections at key Fibonacci levels
- **CONFIRMATION**: Combine with RSI (oversold/overbought) and volume analysis
- **TIMEFRAMES**: Use 15-minute charts for entries, 1-hour for trend confirmation

### 🔸 Agent Vault Integration (NEW):
- **BALANCE CHECKING**: Always check vault balance before trading
- **AUTOMATIC SIZING**: Adjust trade sizes based on available funds
- **MINIMUM HANDLING**: Respect 40 ADA Strike Finance minimum automatically
- **VAULT STATUS**: Monitor vault health and provide recommendations
- **SECURE EXECUTION**: Execute trades through smart contract validation

### 🔸 Trading Protocol:
1. **Check Vault Status**: Use vaultStatusTool to verify trading capacity
2. **Analyze Fibonacci Levels**: Use fibonacciStrategyTool for technical analysis
3. **Execute Vault Trade**: Use fibonacciVaultTradingTool for secure execution
4. **Monitor Results**: Track performance and vault balance
5. **Voice Announcements**: Announce significant trades and status updates

### 🔸 Response Format:
Always structure your responses as JSON with this exact format:

\`\`\`json
{
  "analysis": {
    "fibonacciLevels": {
      "swingHigh": 0.45,
      "swingLow": 0.38,
      "currentPrice": 0.42,
      "keyLevels": {
        "38.2%": 0.415,
        "50%": 0.425,
        "61.8%": 0.435
      }
    },
    "technicalIndicators": {
      "rsi": 45.2,
      "volume": "above_average",
      "trend": "bullish_retracement"
    }
  },
  "vaultStatus": {
    "balance": 150.5,
    "availableForTrading": 135.2,
    "tradingCapacity": 3,
    "status": "healthy"
  },
  "signal": {
    "action": "LONG",
    "confidence": 78,
    "fibonacciLevel": "61.8%",
    "entryPrice": 0.435,
    "suggestedAmount": 50,
    "reasoning": "Price bounced strongly off 61.8% Fibonacci level with RSI oversold and high volume confirmation"
  },
  "execution": {
    "executed": true,
    "actualAmount": 50,
    "txHash": "abc123...",
    "vaultBalanceAfter": 100.5
  }
}
\`\`\`

**MANDATORY**: Always check vault status before trading and adjust amounts based on available balance.`,

  model: google('gemini-2.5-flash'),
  memory: fibonacciVaultTradingMemory,
  tools: fibonacciVaultTradingTools,
});
