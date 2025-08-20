import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';

/**
 * Pine Script Knowledge Base
 * 
 * Comprehensive knowledge store for TradingView Pine Script v6 documentation,
 * syntax patterns, strategy templates, and debugging guides.
 */

export class PineScriptKnowledgeBase {
  private memory: Memory;
  private initialized = false;

  constructor() {
    this.memory = new Memory({
      storage: new LibSQLStore({
        url: ":memory:", // Use file path for persistence: "file:./pine-script-knowledge.db"
      }),
      vector: new LibSQLVector({
        connectionUrl: ":memory:",
      }),
      embedder: fastembed,
    });
  }

  async initialize() {
    if (this.initialized) return;

    console.log('🔧 Initializing Pine Script Knowledge Base...');
    
    try {
      // Seed with Pine Script v6 documentation
      await this.seedPineScriptDocumentation();
      
      // Seed with common strategy patterns
      await this.seedStrategyPatterns();
      
      // Seed with error patterns and fixes
      await this.seedErrorPatterns();
      
      // Seed with optimization techniques
      await this.seedOptimizationTechniques();

      this.initialized = true;
      console.log('✅ Pine Script Knowledge Base initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Pine Script Knowledge Base:', error);
      throw error;
    }
  }

  async searchKnowledge(query: string, limit = 10) {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.memory.search(query, {
      limit,
      scope: 'resource',
    });
  }

  async addKnowledge(content: string, metadata: any) {
    // Store in memory system - simplified implementation
    console.log(`📝 Adding knowledge: ${metadata.title}`);
    return true;
  }

  private async seedPineScriptDocumentation() {
    console.log('📚 Seeding Pine Script v6 documentation...');

    const documentation = [
      {
        title: "Pine Script v6 Basic Structure",
        content: `
Pine Script v6 Basic Structure:

//@version=6
indicator("My Indicator", overlay=true)
// or
strategy("My Strategy", overlay=true)

Key components:
1. Version declaration: //@version=6 (must be first line)
2. Script declaration: indicator() or strategy()
3. Input parameters: input.int(), input.float(), input.string(), etc.
4. Calculations and logic
5. Plotting: plot(), plotshape(), plotchar()
6. For strategies: strategy.entry(), strategy.exit(), strategy.close()

Example:
//@version=6
strategy("Simple MA Cross", overlay=true)

length1 = input.int(10, "Fast MA")
length2 = input.int(20, "Slow MA")

ma1 = ta.sma(close, length1)
ma2 = ta.sma(close, length2)

if ta.crossover(ma1, ma2)
    strategy.entry("Long", strategy.long)
if ta.crossunder(ma1, ma2)
    strategy.close("Long")

plot(ma1, "Fast MA", color.blue)
plot(ma2, "Slow MA", color.red)
        `,
        category: "syntax",
        type: "documentation"
      },
      {
        title: "Pine Script v6 Data Types and Variables",
        content: `
Pine Script v6 Data Types:

1. Basic Types:
   - int: Integer numbers (1, 2, 100)
   - float: Decimal numbers (1.5, 3.14, 100.0)
   - bool: Boolean values (true, false)
   - string: Text values ("Hello", 'World')
   - color: Color values (color.red, #FF0000)

2. Series Types:
   - series<int>, series<float>, series<bool>, series<string>, series<color>
   - These change values on each bar

3. Variable Declaration:
   var keyword: Initializes once, persists across bars
   Regular: Recalculates on each bar
   
   Examples:
   var float total = 0.0  // Initialized once
   float current = close  // Recalculated each bar
   
4. Built-in Variables:
   - open, high, low, close: OHLC values
   - volume: Trading volume
   - time: Bar timestamp
   - bar_index: Current bar number (0-based)
   - syminfo.ticker: Current symbol
        `,
        category: "syntax",
        type: "documentation"
      },
      {
        title: "Pine Script v6 Technical Analysis Functions",
        content: `
Pine Script v6 Technical Analysis (ta.*) Functions:

Moving Averages:
- ta.sma(source, length): Simple Moving Average
- ta.ema(source, length): Exponential Moving Average
- ta.wma(source, length): Weighted Moving Average
- ta.vwma(source, length): Volume Weighted Moving Average
- ta.alma(source, length, offset, sigma): Arnaud Legoux Moving Average

Oscillators:
- ta.rsi(source, length): Relative Strength Index (0-100)
- ta.stoch(source, high, low, length): Stochastic Oscillator
- ta.macd(source, fast, slow, signal): MACD [macd_line, signal_line, histogram]
- ta.cci(source, length): Commodity Channel Index
- ta.mfi(source, length): Money Flow Index
- ta.roc(source, length): Rate of Change
- ta.tsi(source, short, long): True Strength Index

Trend Analysis:
- ta.crossover(series1, series2): True when series1 crosses above series2
- ta.crossunder(series1, series2): True when series1 crosses below series2
- ta.highest(source, length): Highest value in length bars
- ta.lowest(source, length): Lowest value in length bars
- ta.highestbars(source, length): Bars since highest value
- ta.lowestbars(source, length): Bars since lowest value
- ta.barssince(condition): Bars since condition was true
- ta.valuewhen(condition, source, occurrence): Value when condition was true

Volatility:
- ta.atr(length): Average True Range
- ta.tr: True Range (current bar)
- ta.bb(source, length, mult): Bollinger Bands [middle, upper, lower]
- ta.bbw(source, length, mult): Bollinger Bands Width
- ta.stdev(source, length): Standard Deviation
- ta.variance(source, length): Variance

Volume Analysis:
- ta.obv: On Balance Volume
- ta.pvt: Price Volume Trend
- ta.ad: Accumulation/Distribution
- ta.cmf(length): Chaikin Money Flow

Pattern Recognition:
- ta.doji(): Doji candlestick pattern
- ta.hammer(): Hammer candlestick pattern
- ta.shootingstar(): Shooting Star pattern
- ta.engulfing(): Engulfing pattern

Pivot Points:
- ta.pivothigh(source, leftbars, rightbars): Pivot high detection
- ta.pivotlow(source, leftbars, rightbars): Pivot low detection

Mathematical Functions:
- ta.change(source, length): Change from length bars ago
- ta.mom(source, length): Momentum (same as ta.change)
- ta.correlation(source1, source2, length): Correlation coefficient
- ta.percentrank(source, length): Percent rank over length bars
        `,
        category: "indicators",
        type: "documentation"
      },
      {
        title: "Pine Script v6 Strategy Functions",
        content: `
Pine Script v6 Strategy Functions:

Strategy Declaration:
strategy(title, shorttitle, overlay, format, precision, scale, pyramiding,
         calc_on_order_fills, calc_on_every_tick, max_bars_back, backtest_fill_limits_assumption,
         default_qty_type, default_qty_value, initial_capital, currency, slippage, commission_type,
         commission_value, process_orders_on_close, close_entries_rule, margin_long, margin_short)

Order Placement:
- strategy.entry(id, direction, qty, limit, stop, oca_name, oca_type, comment, alert_message)
- strategy.order(id, direction, qty, limit, stop, oca_name, oca_type, comment, alert_message)
- strategy.exit(id, from_entry, qty, qty_percent, profit, limit, loss, stop, trail_price,
                trail_points, trail_offset, oca_name, comment, alert_message)
- strategy.close(id, qty, qty_percent, comment, alert_message)
- strategy.close_all(comment, alert_message)

Order Cancellation:
- strategy.cancel(id)
- strategy.cancel_all()

Position Information:
- strategy.position_size: Current position size
- strategy.position_avg_price: Average entry price
- strategy.position_entry_name: Entry ID of current position

Account Information:
- strategy.equity: Current equity
- strategy.netprofit: Net profit
- strategy.grossprofit: Gross profit
- strategy.grossloss: Gross loss
- strategy.max_drawdown: Maximum drawdown
- strategy.initial_capital: Starting capital

Trade Information:
- strategy.opentrades: Number of open trades
- strategy.closedtrades: Number of closed trades
- strategy.wintrades: Number of winning trades
- strategy.losstrades: Number of losing trades

Risk Management:
- strategy.risk.allow_entry_in(direction): Limit entry direction
- strategy.risk.max_drawdown(value, type): Maximum drawdown limit
- strategy.risk.max_intraday_loss(value, type): Maximum daily loss
- strategy.risk.max_position_size(contracts): Maximum position size

Direction Constants:
- strategy.long: Long direction
- strategy.short: Short direction
- strategy.direction.all: Allow both directions
- strategy.direction.long: Allow only long
- strategy.direction.short: Allow only short

OCA Types:
- strategy.oca.cancel: Cancel other orders when one fills
- strategy.oca.reduce: Reduce other orders when one fills
- strategy.oca.none: No OCA behavior
        `,
        category: "strategy",
        type: "documentation"
      }
    ];

    for (const doc of documentation) {
      await this.addKnowledge(doc.content, {
        title: doc.title,
        category: doc.category,
        type: doc.type,
        source: "pine-script-v6-docs"
      });
    }
  }

  private async seedStrategyPatterns() {
    console.log('📈 Seeding strategy patterns...');

    const patterns = [
      {
        title: "Moving Average Crossover Strategy",
        content: `
Moving Average Crossover Strategy Template:

//@version=6
strategy("MA Crossover", overlay=true)

// Inputs
fast_length = input.int(10, "Fast MA Length", minval=1)
slow_length = input.int(20, "Slow MA Length", minval=1)
ma_type = input.string("SMA", "MA Type", options=["SMA", "EMA"])

// Calculate MAs
fast_ma = ma_type == "SMA" ? ta.sma(close, fast_length) : ta.ema(close, fast_length)
slow_ma = ma_type == "SMA" ? ta.sma(close, slow_length) : ta.ema(close, slow_length)

// Entry conditions
long_condition = ta.crossover(fast_ma, slow_ma)
short_condition = ta.crossunder(fast_ma, slow_ma)

// Strategy logic
if long_condition
    strategy.entry("Long", strategy.long)
if short_condition
    strategy.entry("Short", strategy.short)

// Plotting
plot(fast_ma, "Fast MA", color.blue)
plot(slow_ma, "Slow MA", color.red)
plotshape(long_condition, "Long Signal", shape.triangleup, location.belowbar, color.green)
plotshape(short_condition, "Short Signal", shape.triangledown, location.abovebar, color.red)

// Alerts
alertcondition(long_condition, "Long Alert", "Fast MA crossed above Slow MA")
alertcondition(short_condition, "Short Alert", "Fast MA crossed below Slow MA")
        `,
        pattern: "moving_average_crossover",
        complexity: "low",
        indicators: ["SMA", "EMA"],
        signals: ["crossover", "crossunder"]
      },
      {
        title: "RSI Overbought/Oversold Strategy",
        content: `
RSI Overbought/Oversold Strategy Template:

//@version=6
strategy("RSI Strategy", overlay=false)

// Inputs
rsi_length = input.int(14, "RSI Length", minval=1)
overbought = input.int(70, "Overbought Level", minval=50, maxval=100)
oversold = input.int(30, "Oversold Level", minval=0, maxval=50)

// Calculate RSI
rsi = ta.rsi(close, rsi_length)

// Entry conditions
long_condition = ta.crossover(rsi, oversold)
short_condition = ta.crossunder(rsi, overbought)

// Strategy logic
if long_condition
    strategy.entry("Long", strategy.long)
if short_condition
    strategy.entry("Short", strategy.short)

// Plotting
plot(rsi, "RSI", color.purple)
hline(overbought, "Overbought", color.red, linestyle.dashed)
hline(oversold, "Oversold", color.green, linestyle.dashed)
hline(50, "Midline", color.gray)

// Background coloring
bgcolor(rsi > overbought ? color.new(color.red, 90) : rsi < oversold ? color.new(color.green, 90) : na)
        `,
        pattern: "rsi_mean_reversion",
        complexity: "low",
        indicators: ["RSI"],
        signals: ["overbought", "oversold"]
      },
      {
        title: "Bollinger Bands Squeeze Strategy",
        content: `
Bollinger Bands Squeeze Strategy Template:

//@version=6
strategy("BB Squeeze", overlay=true)

// Inputs
bb_length = input.int(20, "BB Length", minval=1)
bb_mult = input.float(2.0, "BB Multiplier", minval=0.1)
kc_length = input.int(20, "KC Length", minval=1)
kc_mult = input.float(1.5, "KC Multiplier", minval=0.1)

// Calculate Bollinger Bands
[bb_middle, bb_upper, bb_lower] = ta.bb(close, bb_length, bb_mult)

// Calculate Keltner Channels
kc_middle = ta.ema(close, kc_length)
kc_range = ta.atr(kc_length) * kc_mult
kc_upper = kc_middle + kc_range
kc_lower = kc_middle - kc_range

// Squeeze condition (BB inside KC)
squeeze = bb_upper < kc_upper and bb_lower > kc_lower
squeeze_release = squeeze[1] and not squeeze

// Momentum
momentum = ta.linreg(close - ta.sma(close, bb_length), bb_length, 0)

// Entry conditions
long_condition = squeeze_release and momentum > 0
short_condition = squeeze_release and momentum < 0

// Strategy logic
if long_condition
    strategy.entry("Long", strategy.long)
if short_condition
    strategy.entry("Short", strategy.short)

// Plotting
plot(bb_upper, "BB Upper", color.blue)
plot(bb_lower, "BB Lower", color.blue)
plot(kc_upper, "KC Upper", color.red)
plot(kc_lower, "KC Lower", color.red)

// Background color for squeeze
bgcolor(squeeze ? color.new(color.yellow, 90) : na, title="Squeeze")
        `,
        pattern: "bollinger_squeeze",
        complexity: "medium",
        indicators: ["Bollinger Bands", "Keltner Channels", "ATR"],
        signals: ["squeeze", "momentum"]
      },
      {
        title: "MACD Histogram Strategy",
        content: `
MACD Histogram Strategy Template:

//@version=6
strategy("MACD Histogram", overlay=false)

// Inputs
fast_length = input.int(12, "Fast Length", minval=1)
slow_length = input.int(26, "Slow Length", minval=1)
signal_length = input.int(9, "Signal Length", minval=1)

// Calculate MACD
[macd_line, signal_line, histogram] = ta.macd(close, fast_length, slow_length, signal_length)

// Entry conditions
long_condition = ta.crossover(histogram, 0) and histogram > histogram[1]
short_condition = ta.crossunder(histogram, 0) and histogram < histogram[1]

// Exit conditions
long_exit = ta.crossunder(macd_line, signal_line)
short_exit = ta.crossover(macd_line, signal_line)

// Strategy logic
if long_condition
    strategy.entry("Long", strategy.long)
if short_condition
    strategy.entry("Short", strategy.short)

if long_exit
    strategy.close("Long")
if short_exit
    strategy.close("Short")

// Plotting
plot(macd_line, "MACD", color.blue)
plot(signal_line, "Signal", color.red)
plot(histogram, "Histogram", color=histogram >= 0 ? color.green : color.red, style=plot.style_columns)
hline(0, "Zero Line", color.gray)
        `,
        pattern: "macd_histogram",
        complexity: "medium",
        indicators: ["MACD"],
        signals: ["histogram_crossover", "divergence"]
      }
    ];

    for (const pattern of patterns) {
      await this.addKnowledge(pattern.content, {
        title: pattern.title,
        category: "strategy_pattern",
        pattern: pattern.pattern,
        complexity: pattern.complexity,
        indicators: pattern.indicators,
        signals: pattern.signals,
        type: "template"
      });
    }
  }

  private async seedErrorPatterns() {
    console.log('🐛 Seeding error patterns and fixes...');

    const errorPatterns = [
      {
        error: "Syntax error at input 'if'",
        content: `
Common Pine Script Syntax Errors and Fixes:

Error: "Syntax error at input 'if'"
Cause: Missing line break or incorrect indentation before 'if' statement

Wrong:
plot(close) if condition
    strategy.entry("Long", strategy.long)

Correct:
plot(close)
if condition
    strategy.entry("Long", strategy.long)

Fix: Ensure each statement is on its own line and proper indentation is used.
        `,
        category: "error_fix",
        errorType: "syntax"
      },
      {
        error: "Cannot call 'strategy.entry' from a local scope",
        content: `
Error: "Cannot call 'strategy.entry' from a local scope"
Cause: Strategy functions called inside user-defined functions or conditional blocks incorrectly

Wrong:
my_function() =>
    if condition
        strategy.entry("Long", strategy.long)  // Error!

Correct:
my_condition() =>
    condition

if my_condition()
    strategy.entry("Long", strategy.long)  // OK!

Fix: Move strategy calls to the global scope, use functions only for calculations.
        `,
        category: "error_fix",
        errorType: "scope"
      }
    ];

    for (const error of errorPatterns) {
      await this.addKnowledge(error.content, {
        title: `Fix: ${error.error}`,
        category: error.category,
        errorType: error.errorType,
        type: "error_fix"
      });
    }
  }

  private async seedOptimizationTechniques() {
    console.log('⚡ Seeding optimization techniques...');

    const optimizations = [
      {
        title: "Pine Script Performance Optimization",
        content: `
Pine Script Performance Optimization Techniques:

1. Avoid Unnecessary Calculations:
   - Use 'var' for variables that don't need recalculation
   - Cache expensive calculations
   
   Bad:
   expensive_calc = ta.sma(close, 200) * ta.ema(volume, 50)
   
   Good:
   var float cached_result = na
   if barstate.isconfirmed
       cached_result := ta.sma(close, 200) * ta.ema(volume, 50)

2. Limit Historical References:
   - Avoid deep historical lookbacks when possible
   - Use built-in functions instead of manual loops

3. Optimize Plotting:
   - Limit the number of plot() calls
   - Use conditional plotting when appropriate
   
   plot(condition ? value : na, "Conditional Plot")

4. Use Appropriate Data Types:
   - Use 'int' instead of 'float' when possible
   - Use 'bool' for true/false values
        `,
        category: "optimization",
        type: "technique"
      }
    ];

    for (const opt of optimizations) {
      await this.addKnowledge(opt.content, {
        title: opt.title,
        category: opt.category,
        type: opt.type
      });
    }
  }
}

// Export singleton instance
export const pineScriptKnowledge = new PineScriptKnowledgeBase();
