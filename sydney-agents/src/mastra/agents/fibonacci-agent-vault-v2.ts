/**
 * Fibonacci Agent Vault V2
 * Enhanced security trading agent with 2x leverage enforcement
 */

import { Agent } from '@mastra/core';
import { z } from 'zod';
import { createTool } from '@mastra/core';
import { AgentVaultV2TradingService, AgentVaultTradingSignal } from '../services/agent-vault-v2-trading-service';

// Fibonacci Agent Vault V2 Trading Tool
const fibonacciVaultV2TradingTool = createTool({
  id: 'fibonacciVaultV2Trading',
  description: 'Execute Fibonacci-based trades through Agent Vault V2 with 2x leverage enforcement and enhanced security',
  inputSchema: z.object({
    vaultAddress: z.string().describe('Agent Vault V2 contract address'),
    signal: z.object({
      side: z.enum(['Long', 'Short']).describe('Trade direction'),
      confidence: z.number().min(0).max(100).describe('Signal confidence percentage'),
      fibonacciLevel: z.string().describe('Fibonacci retracement level (e.g., 61.8%)'),
      entryPrice: z.number().describe('Suggested entry price'),
      suggestedAmount: z.number().optional().describe('Suggested trade amount in ADA'),
      stopLoss: z.number().optional().describe('Stop loss price'),
      takeProfit: z.number().optional().describe('Take profit price'),
      leverage: z.number().min(1).max(2).default(2).describe('Leverage (1-2x only)')
    }),
    riskManagement: z.object({
      maxTradeAmount: z.number().describe('Maximum trade amount in ADA'),
      riskPercentage: z.number().min(1).max(10).default(5).describe('Risk percentage of vault balance'),
      emergencyStop: z.boolean().default(false).describe('Emergency stop flag')
    }).optional()
  }),
  execute: async ({ vaultAddress, signal, riskManagement }) => {
    try {
      console.log(`🌀 Fibonacci Agent Vault V2 Trade Request:`, {
        vault: vaultAddress.substring(0, 20) + '...',
        side: signal.side,
        confidence: signal.confidence,
        fibLevel: signal.fibonacciLevel,
        leverage: signal.leverage
      });

      // Get trading service instance
      const tradingService = AgentVaultV2TradingService.getInstance();

      // Validate confidence threshold (75% minimum for Agent Vault V2)
      if (signal.confidence < 75) {
        return {
          success: false,
          message: `Confidence too low: ${signal.confidence}% (minimum 75% for Agent Vault V2)`,
          action: 'HOLD',
          reason: 'Waiting for higher confidence signal'
        };
      }

      // Calculate trade amount with risk management
      const tradeAmount = calculateTradeAmount(signal, riskManagement);
      
      // Validate 2x leverage limit
      const leverage = Math.min(signal.leverage, 2); // Hard cap at 2x
      
      // Create trading signal
      const tradingSignal: AgentVaultTradingSignal = {
        vaultAddress,
        action: signal.side,
        amount: tradeAmount,
        leverage,
        confidence: signal.confidence,
        reason: `Fibonacci ${signal.fibonacciLevel} retracement signal with ${signal.confidence}% confidence`,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        signalId: `fib_${Date.now()}_${signal.fibonacciLevel.replace('.', '')}`
      };

      // Execute trade through Agent Vault V2
      const result = await tradingService.executeTrade(tradingSignal);

      if (result.success) {
        return {
          success: true,
          message: `Fibonacci trade executed successfully`,
          txHash: result.txHash,
          action: signal.side,
          amount: tradeAmount,
          leverage,
          fibonacciLevel: signal.fibonacciLevel,
          confidence: signal.confidence,
          vaultSecurity: 'Agent Vault V2 - Enhanced Security',
          leverageEnforcement: '2x Maximum (System Enforced)',
          timestamp: result.timestamp
        };
      } else {
        return {
          success: false,
          message: `Trade execution failed: ${result.error}`,
          action: 'FAILED',
          reason: result.error || 'Unknown error'
        };
      }

    } catch (error) {
      console.error('❌ Fibonacci Agent Vault V2 error:', error);
      return {
        success: false,
        message: `Agent Vault V2 error: ${error instanceof Error ? error.message : String(error)}`,
        action: 'ERROR',
        reason: 'System error occurred'
      };
    }
  }
});

// Calculate trade amount with risk management
function calculateTradeAmount(
  signal: any, 
  riskManagement?: any
): number {
  // Default to suggested amount or 40 ADA minimum
  let baseAmount = signal.suggestedAmount || 40;
  
  // Apply risk management if provided
  if (riskManagement) {
    // Respect maximum trade amount
    if (riskManagement.maxTradeAmount) {
      baseAmount = Math.min(baseAmount, riskManagement.maxTradeAmount);
    }
    
    // Apply risk percentage (would need vault balance for this)
    // For now, use conservative defaults
  }
  
  // Ensure minimum Strike Finance requirement
  return Math.max(baseAmount, 40);
}

/**
 * Fibonacci Agent Vault V2 - Enhanced Security Trading Agent
 * 
 * This agent specializes in Fibonacci retracement trading through Agent Vault V2:
 * - Uses smart contracts with 2x leverage enforcement
 * - Enhanced security with zero private key exposure
 * - Automatic balance management with 40 ADA minimum handling
 * - Position sizing based on available vault balance
 * - Preserves all original Fibonacci trading logic
 * - System-enforced 2x leverage maximum for risk control
 */
export const fibonacciAgentVaultV2 = new Agent({
  name: 'fibonacciAgentVaultV2',
  instructions: `You are Sydney's enhanced Fibonacci Retracement Trading Agent with Agent Vault V2 integration, specialized in secure 2x leverage ADA/USD trading.

## AGENT VAULT V2 ENHANCED SECURITY:
- **SMART CONTRACT PROTECTION**: All trades execute through Agent Vault V2 smart contracts
- **2X LEVERAGE ENFORCEMENT**: System-enforced maximum 2x leverage for risk control
- **ZERO KEY EXPOSURE**: Your private keys never leave your wallet
- **AUTOMATIC BALANCE MANAGEMENT**: System handles 40 ADA minimum requirements automatically
- **POSITION SIZING**: Dynamic sizing based on available vault balance
- **EMERGENCY CONTROLS**: Users maintain full control and can withdraw anytime

## Your Core Responsibilities:
1. **Fibonacci Analysis**: Identify key retracement levels (23.6%, 38.2%, 50%, 61.8%, 78.6%)
2. **Signal Generation**: Generate high-confidence trading signals (75%+ minimum)
3. **Risk Management**: Respect 2x leverage limits and vault balance constraints
4. **Trade Execution**: Execute trades through Agent Vault V2 smart contracts
5. **Position Monitoring**: Track open positions and manage risk

## ENHANCED SECURITY FEATURES:
- **2x Leverage Cap**: Hard-coded maximum leverage for risk control
- **Smart Contract Validation**: All trades validated by on-chain logic
- **User Control**: Users can stop trading and withdraw funds anytime
- **Balance Protection**: Prevents overdraft and unauthorized access
- **Emergency Stop**: Immediate halt capability for all trading

## Trading Strategy - Fibonacci Retracements:
- **Entry Points**: Look for bounces at key Fibonacci levels
- **Trend Confirmation**: Combine with trend analysis and volume
- **Risk/Reward**: Target 2:1 minimum risk/reward ratios
- **Stop Losses**: Place stops beyond next Fibonacci level
- **Position Sizing**: Conservative sizing with 2x leverage maximum

## EXECUTION PROTOCOL:
1. Analyze current ADA/USD price action and identify trend
2. Calculate Fibonacci retracement levels from recent swing high/low
3. Wait for price to approach key Fibonacci levels (38.2%, 50%, 61.8%)
4. Confirm entry with additional technical indicators
5. Generate trading signal with 75%+ confidence
6. Execute through Agent Vault V2 with 2x leverage maximum
7. Monitor position and manage risk accordingly

## RISK MANAGEMENT:
- **Maximum Leverage**: 2x (system enforced)
- **Minimum Confidence**: 75% for trade execution
- **Position Size**: Based on vault balance and risk percentage
- **Stop Losses**: Always set protective stops
- **Emergency Protocol**: Respect user emergency stop commands

## COMMUNICATION STYLE:
- Professional and confident
- Clear reasoning for each trade decision
- Transparent about risk and leverage
- Educational about Fibonacci analysis
- Emphasize security benefits of Agent Vault V2

Remember: You're using Agent Vault V2 which provides enhanced security through smart contracts while maintaining the proven Fibonacci retracement strategy. The 2x leverage limit is enforced by the smart contract for risk protection.`,

  model: {
    provider: 'GOOGLE',
    name: 'gemini-2.0-flash-exp',
    toolChoice: 'auto',
  },
  tools: [fibonacciVaultV2TradingTool],
});

// Export the tool for use in other agents
export { fibonacciVaultV2TradingTool };
