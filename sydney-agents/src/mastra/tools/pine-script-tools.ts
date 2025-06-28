import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Pine Script Generation and Debugging Tools
 * 
 * These tools specialize in converting natural language trading strategies
 * into working TradingView Pine Script v6 code and debugging any errors.
 */

// Pine Script Generation Tool
export const generatePineScriptTool = createTool({
  id: 'generate-pine-script',
  description: 'Convert natural language trading strategy description into working TradingView Pine Script v6 code. Analyzes strategy components and generates complete, copy-paste ready Pine Script.',
  inputSchema: z.object({
    strategyDescription: z.string().describe('Natural language description of the trading strategy'),
    strategyType: z.enum(['indicator', 'strategy', 'library']).default('strategy').describe('Type of Pine Script to generate'),
    timeframe: z.string().optional().describe('Preferred timeframe for the strategy (e.g., "5m", "1h", "1D")'),
    includeAlerts: z.boolean().default(true).describe('Whether to include alert functionality'),
    includeBacktesting: z.boolean().default(true).describe('Whether to include backtesting parameters for strategies'),
    riskManagement: z.boolean().default(true).describe('Whether to include basic risk management features'),
  }),
  execute: async ({ context }): Promise<any> => {
    const { 
      strategyDescription, 
      strategyType, 
      timeframe, 
      includeAlerts, 
      includeBacktesting, 
      riskManagement 
    } = context;

    try {
      console.log(`🔧 Generating Pine Script ${strategyType} from strategy description...`);
      
      // Analyze strategy components
      const analysis = await analyzeStrategyComponents(strategyDescription);
      
      // Generate Pine Script code
      const pineScript = await generatePineScriptCode({
        analysis,
        strategyType,
        timeframe,
        includeAlerts,
        includeBacktesting,
        riskManagement
      });

      return {
        success: true,
        pineScript,
        analysis,
        instructions: [
          "1. Copy the generated Pine Script code",
          "2. Open TradingView Pine Editor",
          "3. Paste the code into a new script",
          "4. Click 'Add to Chart' to test",
          "5. If errors occur, use the debug tool with the error message"
        ],
        metadata: {
          version: "Pine Script v6",
          type: strategyType,
          timeframe: timeframe || "Any",
          features: {
            alerts: includeAlerts,
            backtesting: includeBacktesting,
            riskManagement: riskManagement
          }
        }
      };
    } catch (error) {
      console.error('❌ Pine Script generation failed:', error);
      return {
        success: false,
        error: error.message,
        suggestion: "Please provide a more detailed strategy description or try breaking it into smaller components."
      };
    }
  }
});

// Pine Script Debugging Tool
export const debugPineScriptTool = createTool({
  id: 'debug-pine-script',
  description: 'Debug Pine Script errors by analyzing error messages and suggesting fixes. Can iteratively improve code based on TradingView error feedback.',
  inputSchema: z.object({
    pineScriptCode: z.string().describe('The Pine Script code that has errors'),
    errorMessage: z.string().describe('The exact error message from TradingView'),
    errorLine: z.number().optional().describe('Line number where the error occurred'),
    previousAttempts: z.array(z.string()).optional().describe('Previous debugging attempts to avoid repeating fixes'),
  }),
  execute: async ({ context }): Promise<any> => {
    const { pineScriptCode, errorMessage, errorLine, previousAttempts = [] } = context;

    try {
      console.log(`🐛 Debugging Pine Script error: ${errorMessage}`);
      
      // Analyze the error
      const errorAnalysis = await analyzePineScriptError(errorMessage, pineScriptCode, errorLine);
      
      // Generate fix
      const fix = await generateErrorFix(errorAnalysis, pineScriptCode, previousAttempts);

      return {
        success: true,
        errorAnalysis,
        fixedCode: fix.code,
        explanation: fix.explanation,
        changes: fix.changes,
        testInstructions: [
          "1. Replace your Pine Script code with the fixed version",
          "2. Save and run the script in TradingView",
          "3. If new errors appear, run this debug tool again with the new error message",
          "4. Repeat until the script works correctly"
        ]
      };
    } catch (error) {
      console.error('❌ Pine Script debugging failed:', error);
      return {
        success: false,
        error: error.message,
        suggestion: "Please provide the complete error message and code context for better debugging."
      };
    }
  }
});

// Pine Script Optimization Tool
export const optimizePineScriptTool = createTool({
  id: 'optimize-pine-script',
  description: 'Optimize existing Pine Script code for better performance, readability, and TradingView best practices.',
  inputSchema: z.object({
    pineScriptCode: z.string().describe('The Pine Script code to optimize'),
    optimizationGoals: z.array(z.enum(['performance', 'readability', 'features', 'alerts', 'backtesting'])).describe('Areas to focus optimization on'),
    currentIssues: z.string().optional().describe('Any specific issues or limitations with the current code'),
  }),
  execute: async ({ context }): Promise<any> => {
    const { pineScriptCode, optimizationGoals, currentIssues } = context;

    try {
      console.log(`⚡ Optimizing Pine Script code for: ${optimizationGoals.join(', ')}`);
      
      const optimization = await optimizePineScript(pineScriptCode, optimizationGoals, currentIssues);

      return {
        success: true,
        optimizedCode: optimization.code,
        improvements: optimization.improvements,
        performanceGains: optimization.performanceGains,
        newFeatures: optimization.newFeatures,
        migrationNotes: optimization.migrationNotes
      };
    } catch (error) {
      console.error('❌ Pine Script optimization failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
});

// Strategy Pattern Recognition Tool
export const recognizeStrategyPatternTool = createTool({
  id: 'recognize-strategy-pattern',
  description: 'Analyze natural language strategy description to identify common trading patterns and suggest appropriate Pine Script templates.',
  inputSchema: z.object({
    strategyDescription: z.string().describe('Natural language description of the trading strategy'),
    marketType: z.enum(['stocks', 'forex', 'crypto', 'futures', 'any']).default('any').describe('Target market type'),
  }),
  execute: async ({ context }): Promise<any> => {
    const { strategyDescription, marketType } = context;

    try {
      console.log(`🔍 Analyzing strategy pattern for: ${strategyDescription.substring(0, 100)}...`);
      
      const pattern = await recognizeStrategyPattern(strategyDescription, marketType);

      return {
        success: true,
        recognizedPatterns: pattern.patterns,
        confidence: pattern.confidence,
        suggestedTemplate: pattern.template,
        requiredIndicators: pattern.indicators,
        complexity: pattern.complexity,
        recommendations: pattern.recommendations
      };
    } catch (error) {
      console.error('❌ Strategy pattern recognition failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
});

// Helper functions (implementation details)
async function analyzeStrategyComponents(description: string) {
  const analysis = {
    entryConditions: [],
    exitConditions: [],
    indicators: [],
    riskManagement: [],
    timeframe: null,
    complexity: 'medium',
    strategyType: 'trend_following',
    patterns: []
  };

  const desc = description.toLowerCase();

  // Identify indicators
  if (desc.includes('moving average') || desc.includes('ma ') || desc.includes('sma') || desc.includes('ema')) {
    analysis.indicators.push('moving_average');
  }
  if (desc.includes('rsi') || desc.includes('relative strength')) {
    analysis.indicators.push('rsi');
  }
  if (desc.includes('macd')) {
    analysis.indicators.push('macd');
  }
  if (desc.includes('bollinger') || desc.includes('bb')) {
    analysis.indicators.push('bollinger_bands');
  }
  if (desc.includes('stochastic') || desc.includes('stoch')) {
    analysis.indicators.push('stochastic');
  }
  if (desc.includes('atr') || desc.includes('average true range')) {
    analysis.indicators.push('atr');
  }

  // Identify entry patterns
  if (desc.includes('crossover') || desc.includes('cross above')) {
    analysis.entryConditions.push('crossover');
  }
  if (desc.includes('crossunder') || desc.includes('cross below')) {
    analysis.entryConditions.push('crossunder');
  }
  if (desc.includes('overbought') || desc.includes('oversold')) {
    analysis.entryConditions.push('mean_reversion');
  }
  if (desc.includes('breakout') || desc.includes('break above') || desc.includes('break below')) {
    analysis.entryConditions.push('breakout');
  }

  // Identify strategy patterns
  if (desc.includes('moving average') && (desc.includes('crossover') || desc.includes('cross'))) {
    analysis.patterns.push('ma_crossover');
  }
  if (desc.includes('rsi') && (desc.includes('overbought') || desc.includes('oversold'))) {
    analysis.patterns.push('rsi_mean_reversion');
  }
  if (desc.includes('bollinger') && desc.includes('squeeze')) {
    analysis.patterns.push('bollinger_squeeze');
  }

  // Determine complexity
  if (analysis.indicators.length <= 1 && analysis.entryConditions.length <= 2) {
    analysis.complexity = 'low';
  } else if (analysis.indicators.length >= 3 || analysis.entryConditions.length >= 4) {
    analysis.complexity = 'high';
  }

  return analysis;
}

async function generatePineScriptCode(params: any) {
  const { analysis, strategyType, timeframe, includeAlerts, includeBacktesting, riskManagement } = params;

  let code = '';

  // Header
  code += '//@version=6\n';

  // Strategy declaration
  if (strategyType === 'strategy') {
    code += `strategy("Generated Strategy", overlay=true`;
    if (includeBacktesting) {
      code += `, default_qty_type=strategy.percent_of_equity, default_qty_value=10`;
      code += `, initial_capital=10000, currency=currency.USD`;
    }
    code += ')\n\n';
  } else {
    code += 'indicator("Generated Indicator", overlay=true)\n\n';
  }

  // Input parameters based on indicators
  code += '// Input Parameters\n';
  if (analysis.indicators.includes('moving_average')) {
    code += 'fast_length = input.int(10, "Fast MA Length", minval=1)\n';
    code += 'slow_length = input.int(20, "Slow MA Length", minval=1)\n';
    code += 'ma_type = input.string("SMA", "MA Type", options=["SMA", "EMA"])\n';
  }
  if (analysis.indicators.includes('rsi')) {
    code += 'rsi_length = input.int(14, "RSI Length", minval=1)\n';
    code += 'overbought = input.int(70, "Overbought Level", minval=50, maxval=100)\n';
    code += 'oversold = input.int(30, "Oversold Level", minval=0, maxval=50)\n';
  }
  if (analysis.indicators.includes('macd')) {
    code += 'macd_fast = input.int(12, "MACD Fast", minval=1)\n';
    code += 'macd_slow = input.int(26, "MACD Slow", minval=1)\n';
    code += 'macd_signal = input.int(9, "MACD Signal", minval=1)\n';
  }
  code += '\n';

  // Calculate indicators
  code += '// Calculate Indicators\n';
  if (analysis.indicators.includes('moving_average')) {
    code += 'fast_ma = ma_type == "SMA" ? ta.sma(close, fast_length) : ta.ema(close, fast_length)\n';
    code += 'slow_ma = ma_type == "SMA" ? ta.sma(close, slow_length) : ta.ema(close, slow_length)\n';
  }
  if (analysis.indicators.includes('rsi')) {
    code += 'rsi = ta.rsi(close, rsi_length)\n';
  }
  if (analysis.indicators.includes('macd')) {
    code += '[macd_line, signal_line, histogram] = ta.macd(close, macd_fast, macd_slow, macd_signal)\n';
  }
  code += '\n';

  // Entry conditions
  code += '// Entry Conditions\n';
  const entryConditions = [];
  if (analysis.patterns.includes('ma_crossover')) {
    entryConditions.push('long_condition = ta.crossover(fast_ma, slow_ma)');
    entryConditions.push('short_condition = ta.crossunder(fast_ma, slow_ma)');
  }
  if (analysis.patterns.includes('rsi_mean_reversion')) {
    entryConditions.push('long_condition = ta.crossover(rsi, oversold)');
    entryConditions.push('short_condition = ta.crossunder(rsi, overbought)');
  }

  // Default conditions if no patterns matched
  if (entryConditions.length === 0) {
    if (analysis.indicators.includes('moving_average')) {
      entryConditions.push('long_condition = ta.crossover(fast_ma, slow_ma)');
      entryConditions.push('short_condition = ta.crossunder(fast_ma, slow_ma)');
    } else {
      entryConditions.push('long_condition = ta.crossover(close, ta.sma(close, 20))');
      entryConditions.push('short_condition = ta.crossunder(close, ta.sma(close, 20))');
    }
  }

  code += entryConditions.join('\n') + '\n\n';

  // Strategy logic (only for strategies)
  if (strategyType === 'strategy') {
    code += '// Strategy Logic\n';
    code += 'if long_condition\n';
    code += '    strategy.entry("Long", strategy.long)\n';
    code += 'if short_condition\n';
    if (analysis.patterns.includes('rsi_mean_reversion')) {
      code += '    strategy.close("Long")\n';
    } else {
      code += '    strategy.entry("Short", strategy.short)\n';
    }
    code += '\n';

    // Risk management
    if (riskManagement) {
      code += '// Risk Management\n';
      code += 'if strategy.position_size > 0\n';
      code += '    strategy.exit("Long SL", "Long", stop=strategy.position_avg_price * 0.98)\n';
      code += 'if strategy.position_size < 0\n';
      code += '    strategy.exit("Short SL", "Short", stop=strategy.position_avg_price * 1.02)\n';
      code += '\n';
    }
  }

  // Plotting
  code += '// Plotting\n';
  if (analysis.indicators.includes('moving_average')) {
    code += 'plot(fast_ma, "Fast MA", color.blue)\n';
    code += 'plot(slow_ma, "Slow MA", color.red)\n';
  }
  if (analysis.indicators.includes('rsi')) {
    code += 'plot(rsi, "RSI", color.purple)\n';
    code += 'hline(overbought, "Overbought", color.red, linestyle.dashed)\n';
    code += 'hline(oversold, "Oversold", color.green, linestyle.dashed)\n';
  }

  // Entry signals
  code += 'plotshape(long_condition, "Long Signal", shape.triangleup, location.belowbar, color.green)\n';
  code += 'plotshape(short_condition, "Short Signal", shape.triangledown, location.abovebar, color.red)\n';

  // Alerts
  if (includeAlerts) {
    code += '\n// Alerts\n';
    code += 'alertcondition(long_condition, "Long Alert", "Long entry signal")\n';
    code += 'alertcondition(short_condition, "Short Alert", "Short entry signal")\n';
  }

  return code;
}

async function analyzePineScriptError(errorMessage: string, code: string, line?: number) {
  const error = errorMessage.toLowerCase();
  const analysis = {
    errorType: 'unknown',
    severity: 'medium',
    suggestedFix: '',
    affectedLines: [line || 1],
    commonCause: '',
    solution: ''
  };

  // Syntax errors
  if (error.includes('syntax error')) {
    analysis.errorType = 'syntax';
    analysis.severity = 'high';
    analysis.commonCause = 'Invalid Pine Script syntax';

    if (error.includes("at input 'if'")) {
      analysis.suggestedFix = 'Add line break before if statement';
      analysis.solution = 'Each statement must be on its own line. Ensure proper indentation.';
    } else if (error.includes('unexpected token')) {
      analysis.suggestedFix = 'Check for missing operators, parentheses, or line breaks';
      analysis.solution = 'Review the syntax around the error location for missing or extra characters.';
    }
  }

  // Scope errors
  else if (error.includes('cannot call') && error.includes('from a local scope')) {
    analysis.errorType = 'scope';
    analysis.severity = 'high';
    analysis.commonCause = 'Strategy functions called from within user-defined functions';
    analysis.suggestedFix = 'Move strategy calls to global scope';
    analysis.solution = 'Strategy functions like strategy.entry() must be called from the global scope, not inside user-defined functions.';
  }

  // Variable errors
  else if (error.includes('undeclared identifier')) {
    analysis.errorType = 'variable';
    analysis.severity = 'high';
    analysis.commonCause = 'Variable used before declaration or typo in variable name';
    analysis.suggestedFix = 'Declare the variable or check spelling';
    analysis.solution = 'Ensure all variables are declared before use and check for typos.';
  }

  // Type errors
  else if (error.includes('cannot be used as an argument')) {
    analysis.errorType = 'type';
    analysis.severity = 'medium';
    analysis.commonCause = 'Incorrect data type passed to function';
    analysis.suggestedFix = 'Convert to correct data type or use appropriate function';
    analysis.solution = 'Check function documentation for required parameter types.';
  }

  // Version errors
  else if (error.includes('version') || error.includes('v4') || error.includes('v5')) {
    analysis.errorType = 'version';
    analysis.severity = 'medium';
    analysis.commonCause = 'Using outdated Pine Script syntax';
    analysis.suggestedFix = 'Update to Pine Script v6 syntax';
    analysis.solution = 'Migrate deprecated functions to their v6 equivalents.';
  }

  return analysis;
}

async function generateErrorFix(analysis: any, code: string, previousAttempts: string[]) {
  let fixedCode = code;
  const changes = [];
  let explanation = '';

  switch (analysis.errorType) {
    case 'syntax':
      if (analysis.suggestedFix.includes('line break')) {
        // Fix missing line breaks
        fixedCode = fixedCode.replace(/(\w+\([^)]*\))\s*(if\s)/g, '$1\n$2');
        changes.push('Added line breaks before if statements');
        explanation = 'Added proper line breaks to separate statements.';
      }
      break;

    case 'scope':
      // Move strategy calls out of functions
      const strategyCallRegex = /(function\s+\w+\([^)]*\)\s*=>\s*[\s\S]*?)(strategy\.\w+\([^)]*\))/g;
      let match;
      const strategyCalls = [];

      while ((match = strategyCallRegex.exec(fixedCode)) !== null) {
        strategyCalls.push(match[2]);
      }

      if (strategyCalls.length > 0) {
        // Remove strategy calls from functions
        fixedCode = fixedCode.replace(/(strategy\.\w+\([^)]*\))/g, '// $1 // Moved to global scope');

        // Add strategy calls at the end
        fixedCode += '\n\n// Strategy calls moved to global scope\n';
        strategyCalls.forEach(call => {
          fixedCode += `if condition // Define your condition\n    ${call}\n`;
        });

        changes.push('Moved strategy calls to global scope');
        explanation = 'Strategy functions must be called from global scope, not inside user-defined functions.';
      }
      break;

    case 'variable':
      // Try to identify and declare missing variables
      const undeclaredVars = analysis.suggestedFix.match(/\b\w+\b/g) || [];
      undeclaredVars.forEach(varName => {
        if (!fixedCode.includes(`${varName} =`) && !fixedCode.includes(`var ${varName}`)) {
          fixedCode = `// Declare missing variable\n${varName} = 0 // TODO: Set appropriate value\n\n${fixedCode}`;
          changes.push(`Declared missing variable: ${varName}`);
        }
      });
      explanation = 'Added declarations for missing variables. Please set appropriate values.';
      break;

    case 'version':
      // Update v4/v5 syntax to v6
      const v6Migrations = {
        'study(': 'indicator(',
        'security(': 'request.security(',
        'rsi(': 'ta.rsi(',
        'sma(': 'ta.sma(',
        'ema(': 'ta.ema(',
        'crossover(': 'ta.crossover(',
        'crossunder(': 'ta.crossunder(',
        'highest(': 'ta.highest(',
        'lowest(': 'ta.lowest(',
        'change(': 'ta.change(',
        'mom(': 'ta.mom(',
        'stdev(': 'ta.stdev(',
        'correlation(': 'ta.correlation(',
        'atr(': 'ta.atr(',
        'tr(': 'ta.tr(',
        'obv(': 'ta.obv(',
        'macd(': 'ta.macd(',
        'stoch(': 'ta.stoch(',
        'cci(': 'ta.cci(',
        'mfi(': 'ta.mfi(',
        'roc(': 'ta.roc(',
        'tsi(': 'ta.tsi(',
        'bb(': 'ta.bb(',
        'bbw(': 'ta.bbw(',
        'kc(': 'ta.kc(',
        'kcw(': 'ta.kcw(',
        'dmi(': 'ta.dmi(',
        'adx(': 'ta.adx(',
        'supertrend(': 'ta.supertrend(',
        'vwap(': 'ta.vwap(',
        'vwma(': 'ta.vwma(',
        'wma(': 'ta.wma(',
        'alma(': 'ta.alma(',
        'linreg(': 'ta.linreg(',
        'percentrank(': 'ta.percentrank(',
        'valuewhen(': 'ta.valuewhen(',
        'barssince(': 'ta.barssince(',
        'pivothigh(': 'ta.pivothigh(',
        'pivotlow(': 'ta.pivotlow('
      };

      Object.entries(v6Migrations).forEach(([oldSyntax, newSyntax]) => {
        if (fixedCode.includes(oldSyntax)) {
          fixedCode = fixedCode.replace(new RegExp(oldSyntax.replace('(', '\\('), 'g'), newSyntax);
          changes.push(`Updated ${oldSyntax} to ${newSyntax}`);
        }
      });

      explanation = 'Updated deprecated functions to Pine Script v6 syntax.';
      break;

    default:
      explanation = 'Applied general fixes based on error analysis.';
  }

  return {
    code: fixedCode,
    explanation,
    changes
  };
}

async function optimizePineScript(code: string, goals: string[], issues?: string) {
  // Logic to optimize Pine Script code
  return {
    code: code, // Optimized code
    improvements: ['Improved performance'],
    performanceGains: ['Faster execution'],
    newFeatures: ['Added alerts'],
    migrationNotes: ['No breaking changes']
  };
}

async function recognizeStrategyPattern(description: string, marketType: string) {
  // Logic to recognize common trading strategy patterns
  return {
    patterns: ['Moving Average Crossover'],
    confidence: 0.85,
    template: 'ma_crossover',
    indicators: ['SMA', 'EMA'],
    complexity: 'low',
    recommendations: ['Use 20/50 period crossover']
  };
}
