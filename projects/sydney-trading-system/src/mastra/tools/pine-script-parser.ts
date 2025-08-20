import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Pine Script Parser Tool for Backtesting Agent
 * 
 * This tool parses Pine Script strategies and converts them into 
 * backtesting-compatible format for the Alpha Vantage backtesting system.
 */

export const parsePineScriptTool = createTool({
  id: 'parse-pine-script',
  description: 'Parse Pine Script strategy code and extract trading logic for backtesting. Converts Pine Script indicators and conditions into Alpha Vantage compatible backtesting parameters.',
  inputSchema: z.object({
    pineScriptCode: z.string().describe('The complete Pine Script strategy code to parse'),
    symbol: z.string().default('SPY').describe('Stock symbol to backtest (e.g., SPY, QQQ, AAPL)'),
    timeframe: z.string().default('5min').describe('Timeframe for backtesting (1min, 5min, 15min, 30min, 60min, daily)'),
    startDate: z.string().optional().describe('Start date for backtesting (YYYY-MM-DD format)'),
    endDate: z.string().optional().describe('End date for backtesting (YYYY-MM-DD format)'),
    initialCapital: z.number().default(10000).describe('Initial capital for backtesting'),
  }),
  execute: async ({ context }): Promise<any> => {
    const { 
      pineScriptCode, 
      symbol, 
      timeframe, 
      startDate, 
      endDate, 
      initialCapital 
    } = context;

    try {
      console.log(`🔍 Parsing Pine Script strategy for ${symbol} on ${timeframe} timeframe...`);
      
      // Parse the Pine Script code
      const parsedStrategy = await parsePineScriptStrategy(pineScriptCode);
      
      // Convert to backtesting format
      const backtestingStrategy = await convertToBacktestingFormat(
        parsedStrategy, 
        symbol, 
        timeframe, 
        startDate, 
        endDate, 
        initialCapital
      );

      return {
        success: true,
        originalCode: pineScriptCode,
        parsedStrategy,
        backtestingStrategy,
        symbol,
        timeframe,
        instructions: [
          "1. Pine Script strategy has been parsed successfully",
          "2. Trading logic extracted and converted to backtesting format", 
          "3. Ready to run backtest with Alpha Vantage data",
          "4. Use the backtesting agent to execute the strategy"
        ],
        metadata: {
          strategyName: parsedStrategy.name,
          indicators: parsedStrategy.indicators,
          entryConditions: parsedStrategy.entryConditions,
          exitConditions: parsedStrategy.exitConditions,
          riskManagement: parsedStrategy.riskManagement
        }
      };
    } catch (error) {
      console.error('❌ Pine Script parsing failed:', error);
      return {
        success: false,
        error: error.message,
        suggestion: "Please provide valid Pine Script v6 strategy code. Ensure the code includes strategy() declaration and trading logic."
      };
    }
  }
});

// Helper function to parse Pine Script strategy
async function parsePineScriptStrategy(code: string) {
  const strategy = {
    name: 'Parsed Strategy',
    version: 'v6',
    indicators: [],
    entryConditions: [],
    exitConditions: [],
    riskManagement: [],
    inputs: {},
    overlay: true
  };

  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Extract strategy name
    if (trimmed.includes('strategy(')) {
      const nameMatch = trimmed.match(/strategy\s*\(\s*["']([^"']+)["']/);
      if (nameMatch) {
        strategy.name = nameMatch[1];
      }
    }
    
    // Extract indicators
    if (trimmed.includes('ta.sma(') || trimmed.includes('ta.ema(')) {
      strategy.indicators.push('moving_average');
    }
    if (trimmed.includes('ta.rsi(')) {
      strategy.indicators.push('rsi');
    }
    if (trimmed.includes('ta.macd(')) {
      strategy.indicators.push('macd');
    }
    if (trimmed.includes('ta.bb(')) {
      strategy.indicators.push('bollinger_bands');
    }
    if (trimmed.includes('ta.atr(')) {
      strategy.indicators.push('atr');
    }
    
    // Extract entry conditions
    if (trimmed.includes('ta.crossover(')) {
      strategy.entryConditions.push('crossover');
    }
    if (trimmed.includes('ta.crossunder(')) {
      strategy.entryConditions.push('crossunder');
    }
    if (trimmed.includes('strategy.entry(')) {
      const entryMatch = trimmed.match(/strategy\.entry\s*\(\s*["']([^"']+)["']\s*,\s*strategy\.(long|short)/);
      if (entryMatch) {
        strategy.entryConditions.push({
          id: entryMatch[1],
          direction: entryMatch[2]
        });
      }
    }
    
    // Extract exit conditions
    if (trimmed.includes('strategy.exit(') || trimmed.includes('strategy.close(')) {
      strategy.exitConditions.push('exit_signal');
    }
    
    // Extract risk management
    if (trimmed.includes('stop=') || trimmed.includes('loss=')) {
      strategy.riskManagement.push('stop_loss');
    }
    if (trimmed.includes('limit=') || trimmed.includes('profit=')) {
      strategy.riskManagement.push('take_profit');
    }
    
    // Extract inputs
    if (trimmed.includes('input.int(') || trimmed.includes('input.float(')) {
      const inputMatch = trimmed.match(/(\w+)\s*=\s*input\.(int|float)\s*\(\s*([^,]+)/);
      if (inputMatch) {
        strategy.inputs[inputMatch[1]] = {
          type: inputMatch[2],
          defaultValue: inputMatch[3].replace(/["']/g, '')
        };
      }
    }
  }
  
  // Remove duplicates
  strategy.indicators = [...new Set(strategy.indicators)];
  strategy.entryConditions = [...new Set(strategy.entryConditions.filter(c => typeof c === 'string'))];
  
  return strategy;
}

// Helper function to convert to backtesting format
async function convertToBacktestingFormat(
  parsedStrategy: any, 
  symbol: string, 
  timeframe: string, 
  startDate?: string, 
  endDate?: string, 
  initialCapital: number = 10000
) {
  // Convert Pine Script logic to backtesting strategy
  const backtestingStrategy = {
    name: parsedStrategy.name,
    symbol,
    timeframe,
    initialCapital,
    startDate: startDate || getDefaultStartDate(),
    endDate: endDate || getDefaultEndDate(),
    
    // Convert indicators
    indicators: convertIndicators(parsedStrategy.indicators, parsedStrategy.inputs),
    
    // Convert entry/exit logic
    entryRules: convertEntryRules(parsedStrategy.entryConditions),
    exitRules: convertExitRules(parsedStrategy.exitConditions),
    
    // Risk management
    riskManagement: {
      stopLoss: parsedStrategy.riskManagement.includes('stop_loss') ? 0.02 : null, // 2% default
      takeProfit: parsedStrategy.riskManagement.includes('take_profit') ? 0.04 : null, // 4% default
      maxPositionSize: 1.0, // 100% of capital
      commission: 1.0, // $1 per trade
      slippage: 0.001 // 0.1%
    },
    
    // Backtesting parameters
    backtestingParams: {
      dataSource: 'alpha_vantage',
      marketHours: true,
      includeWeekends: false,
      currency: 'USD'
    }
  };
  
  return backtestingStrategy;
}

// Helper functions
function getDefaultStartDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 3); // 3 months ago
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

function convertIndicators(indicators: string[], inputs: any) {
  const converted = [];
  
  if (indicators.includes('moving_average')) {
    converted.push({
      type: 'SMA',
      period: inputs.fast_length?.defaultValue || 10,
      source: 'close'
    });
    converted.push({
      type: 'SMA', 
      period: inputs.slow_length?.defaultValue || 20,
      source: 'close'
    });
  }
  
  if (indicators.includes('rsi')) {
    converted.push({
      type: 'RSI',
      period: inputs.rsi_length?.defaultValue || 14,
      source: 'close'
    });
  }
  
  if (indicators.includes('macd')) {
    converted.push({
      type: 'MACD',
      fastPeriod: inputs.macd_fast?.defaultValue || 12,
      slowPeriod: inputs.macd_slow?.defaultValue || 26,
      signalPeriod: inputs.macd_signal?.defaultValue || 9
    });
  }
  
  return converted;
}

function convertEntryRules(entryConditions: string[]) {
  const rules = [];
  
  if (entryConditions.includes('crossover')) {
    rules.push({
      type: 'crossover',
      condition: 'SMA_10 > SMA_20',
      action: 'buy'
    });
  }
  
  if (entryConditions.includes('crossunder')) {
    rules.push({
      type: 'crossunder', 
      condition: 'SMA_10 < SMA_20',
      action: 'sell'
    });
  }
  
  return rules;
}

function convertExitRules(exitConditions: string[]) {
  const rules = [];
  
  if (exitConditions.includes('exit_signal')) {
    rules.push({
      type: 'opposite_signal',
      description: 'Exit when opposite entry signal occurs'
    });
  }
  
  return rules;
}
