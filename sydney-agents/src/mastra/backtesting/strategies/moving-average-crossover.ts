import {
  BaseStrategy,
  IStrategy,
  StrategySignal,
  StrategyContext,
  StrategyState,
  StrategyParameters,
  StrategyValidator,
  StrategyUtils
} from '../strategy-interface';
import { OHLVC } from '../data-structures';

/**
 * Moving Average Crossover Strategy
 * 
 * This strategy implements a classic moving average crossover system as specified
 * in stockbacktestdesign.txt. It generates buy signals when the fast MA crosses
 * above the slow MA and sell signals when the fast MA crosses below the slow MA.
 * 
 * Key Features:
 * - Configurable fast and slow MA periods
 * - Multiple MA types (SMA, EMA)
 * - Trend confirmation with additional filters
 * - Dynamic stop loss and take profit levels
 * - Risk management with position sizing
 * - Market hours awareness for day trading
 */

export interface MovingAverageCrossoverParameters extends StrategyParameters {
  fastPeriod: number;           // Fast MA period (default: 10)
  slowPeriod: number;           // Slow MA period (default: 20)
  maType: 'SMA' | 'EMA';       // Moving average type (default: EMA)
  confirmationBars: number;     // Bars to confirm crossover (default: 1)
  stopLossPercent: number;      // Stop loss percentage (default: 2%)
  takeProfitPercent: number;    // Take profit percentage (default: 4%)
  minTrendStrength: number;     // Minimum trend strength 0-1 (default: 0.3)
  volumeConfirmation: boolean;  // Require volume confirmation (default: true)
  volumeMultiplier: number;     // Volume multiplier for confirmation (default: 1.2)
  maxPositionTime: number;      // Max time to hold position in minutes (default: 480)
  exitBeforeClose: number;      // Exit N minutes before market close (default: 30)
}

export class MovingAverageCrossoverStrategy extends BaseStrategy {
  readonly name = 'Moving Average Crossover';
  readonly description = 'Classic MA crossover strategy with trend confirmation and risk management';
  readonly category = 'day-trading' as const;
  readonly requiredHistory = 50; // Need sufficient history for slow MA

  readonly parameters: MovingAverageCrossoverParameters = {
    fastPeriod: 5,               // Very short for frequent signals
    slowPeriod: 10,              // Short for frequent crossovers
    maType: 'EMA',
    confirmationBars: 1,
    stopLossPercent: 0.01,       // 1% stop loss
    takeProfitPercent: 0.02,     // 2% take profit
    minTrendStrength: 0.001,     // Very low threshold to allow more trades
    volumeConfirmation: false,   // Disable volume confirmation
    volumeMultiplier: 1.1,       // Lower if used
    maxPositionTime: 60,         // 1 hour for faster exits
    exitBeforeClose: 30
  };

  private fastMA: number[] = [];
  private slowMA: number[] = [];
  private averageVolume = 0;
  private lastCrossoverType: 'bullish' | 'bearish' | 'none' = 'none';
  private crossoverConfirmationCount = 0;

  async onBar(context: StrategyContext, state: StrategyState): Promise<StrategySignal> {
    this.ensureInitialized();

    const { currentBar, previousBars, marketHours } = context;

    // Update indicators
    this.updateIndicators(previousBars, currentBar);

    // Check if we have enough data
    if (this.fastMA.length === 0 || this.slowMA.length === 0) {
      return this.createHoldSignal('Insufficient data for MA calculation');
    }

    // Check if we should exit before market close
    if (this.shouldExitBeforeClose(context, state)) {
      return this.createExitSignal('Exit before market close');
    }

    // Check if we should exit due to time limit
    if (this.shouldExitDueToTimeLimit(context, state)) {
      return this.createExitSignal('Maximum position time reached');
    }

    // Check existing position exit conditions
    const exitSignal = this.shouldExit(context, state);
    if (exitSignal) {
      return exitSignal;
    }

    // Generate entry signals if not in position
    if (!state.currentPosition) {
      return this.checkForCrossoverSignal(currentBar, context);
    }

    return this.createHoldSignal('Monitoring existing position');
  }

  private updateIndicators(previousBars: OHLVC[], currentBar: OHLVC): void {
    if (previousBars.length < this.parameters.slowPeriod) return;

    // Combine previous bars with current bar for calculation
    const allBars = [...previousBars, currentBar];
    const closes = allBars.map(bar => bar.close);

    // Calculate moving averages
    if (this.parameters.maType === 'SMA') {
      this.fastMA = this.calculateSMA(closes, this.parameters.fastPeriod);
      this.slowMA = this.calculateSMA(closes, this.parameters.slowPeriod);
    } else {
      this.fastMA = this.calculateEMA(closes, this.parameters.fastPeriod);
      this.slowMA = this.calculateEMA(closes, this.parameters.slowPeriod);
    }

    // Calculate average volume (last 20 bars)
    const recentBars = allBars.slice(-20);
    this.averageVolume = recentBars.reduce((sum, bar) => sum + bar.volume, 0) / recentBars.length;
  }

  private checkForCrossoverSignal(currentBar: OHLVC, context: StrategyContext): StrategySignal {
    if (this.fastMA.length < 2 || this.slowMA.length < 2) {
      return this.createHoldSignal('Insufficient MA data');
    }

    const currentFastMA = this.fastMA[this.fastMA.length - 1];
    const currentSlowMA = this.slowMA[this.slowMA.length - 1];
    const previousFastMA = this.fastMA[this.fastMA.length - 2];
    const previousSlowMA = this.slowMA[this.slowMA.length - 2];

    // Detect crossover
    const crossoverType = this.detectCrossover(
      previousFastMA, previousSlowMA,
      currentFastMA, currentSlowMA
    );

    if (crossoverType === 'none') {
      this.crossoverConfirmationCount = 0;
      return this.createHoldSignal('No crossover detected');
    }

    // Handle crossover confirmation
    if (crossoverType === this.lastCrossoverType) {
      this.crossoverConfirmationCount++;
    } else {
      this.lastCrossoverType = crossoverType;
      this.crossoverConfirmationCount = 1;
    }

    // Check if we have enough confirmation bars
    if (this.crossoverConfirmationCount < this.parameters.confirmationBars) {
      return this.createHoldSignal(`Waiting for crossover confirmation (${this.crossoverConfirmationCount}/${this.parameters.confirmationBars})`);
    }

    // Validate signal strength
    if (!this.isSignalStrong(currentFastMA, currentSlowMA, currentBar)) {
      return this.createHoldSignal('Signal strength insufficient');
    }

    // Generate appropriate signal
    if (crossoverType === 'bullish') {
      return this.createBuySignal(currentBar, context, currentFastMA, currentSlowMA);
    } else {
      return this.createSellSignal(currentBar, context, currentFastMA, currentSlowMA);
    }
  }

  private detectCrossover(
    prevFast: number, prevSlow: number,
    currFast: number, currSlow: number
  ): 'bullish' | 'bearish' | 'none' {
    // Bullish crossover: fast MA crosses above slow MA
    if (prevFast <= prevSlow && currFast > currSlow) {
      return 'bullish';
    }

    // Bearish crossover: fast MA crosses below slow MA
    if (prevFast >= prevSlow && currFast < currSlow) {
      return 'bearish';
    }

    return 'none';
  }

  private isSignalStrong(fastMA: number, slowMA: number, currentBar: OHLVC): boolean {
    // Calculate trend strength based on MA separation
    const separation = Math.abs(fastMA - slowMA) / ((fastMA + slowMA) / 2);
    
    if (separation < this.parameters.minTrendStrength) {
      return false;
    }

    // Volume confirmation if required
    if (this.parameters.volumeConfirmation) {
      if (currentBar.volume < this.averageVolume * this.parameters.volumeMultiplier) {
        return false;
      }
    }

    return true;
  }

  private createBuySignal(
    currentBar: OHLVC, 
    context: StrategyContext,
    fastMA: number,
    slowMA: number
  ): StrategySignal {
    const entryPrice = currentBar.close;
    const stopLoss = entryPrice * (1 - this.parameters.stopLossPercent);
    const takeProfit = entryPrice * (1 + this.parameters.takeProfitPercent);

    const separation = ((fastMA - slowMA) / slowMA * 100).toFixed(2);

    return {
      type: 'BUY',
      strength: 'STRONG',
      price: entryPrice,
      stopLoss,
      takeProfit,
      reason: `Bullish MA crossover: Fast ${this.parameters.maType}(${this.parameters.fastPeriod}) crossed above Slow ${this.parameters.maType}(${this.parameters.slowPeriod}). Separation: ${separation}%`,
      confidence: 0.75,
      timestamp: currentBar.timestamp,
      metadata: {
        fastMA: fastMA,
        slowMA: slowMA,
        separation: parseFloat(separation),
        volume: currentBar.volume,
        avgVolume: this.averageVolume,
        confirmationBars: this.crossoverConfirmationCount
      }
    };
  }

  private createSellSignal(
    currentBar: OHLVC, 
    context: StrategyContext,
    fastMA: number,
    slowMA: number
  ): StrategySignal {
    const entryPrice = currentBar.close;
    const stopLoss = entryPrice * (1 + this.parameters.stopLossPercent);
    const takeProfit = entryPrice * (1 - this.parameters.takeProfitPercent);

    const separation = ((slowMA - fastMA) / slowMA * 100).toFixed(2);

    return {
      type: 'SELL',
      strength: 'STRONG',
      price: entryPrice,
      stopLoss,
      takeProfit,
      reason: `Bearish MA crossover: Fast ${this.parameters.maType}(${this.parameters.fastPeriod}) crossed below Slow ${this.parameters.maType}(${this.parameters.slowPeriod}). Separation: ${separation}%`,
      confidence: 0.75,
      timestamp: currentBar.timestamp,
      metadata: {
        fastMA: fastMA,
        slowMA: slowMA,
        separation: parseFloat(separation),
        volume: currentBar.volume,
        avgVolume: this.averageVolume,
        confirmationBars: this.crossoverConfirmationCount
      }
    };
  }

  private createHoldSignal(reason: string): StrategySignal {
    return {
      type: 'HOLD',
      strength: 'WEAK',
      reason,
      confidence: 0.5,
      timestamp: new Date()
    };
  }

  private createExitSignal(reason: string): StrategySignal {
    return {
      type: 'CLOSE',
      strength: 'STRONG',
      reason,
      confidence: 1.0,
      timestamp: new Date()
    };
  }

  private shouldExitBeforeClose(context: StrategyContext, state: StrategyState): boolean {
    if (!state.currentPosition) return false;
    return context.marketHours.timeToClose <= this.parameters.exitBeforeClose;
  }

  private shouldExitDueToTimeLimit(context: StrategyContext, state: StrategyState): boolean {
    if (!state.currentPosition) return false;
    
    const positionAge = Date.now() - state.currentPosition.entryTime.getTime();
    const maxAgeMs = this.parameters.maxPositionTime * 60 * 1000;
    
    return positionAge >= maxAgeMs;
  }

  shouldExit(context: StrategyContext, state: StrategyState): StrategySignal | null {
    // Use the base class exit logic for stop loss and take profit
    const baseExit = super.shouldExit(context, state);
    if (baseExit) return baseExit;

    // Additional exit logic: opposite crossover
    if (state.currentPosition && this.fastMA.length >= 2 && this.slowMA.length >= 2) {
      const currentFastMA = this.fastMA[this.fastMA.length - 1];
      const currentSlowMA = this.slowMA[this.slowMA.length - 1];
      const previousFastMA = this.fastMA[this.fastMA.length - 2];
      const previousSlowMA = this.slowMA[this.slowMA.length - 2];

      const crossoverType = this.detectCrossover(
        previousFastMA, previousSlowMA,
        currentFastMA, currentSlowMA
      );

      // Exit long position on bearish crossover
      if (state.currentPosition.side === 'LONG' && crossoverType === 'bearish') {
        return {
          type: 'CLOSE',
          strength: 'MEDIUM',
          reason: 'Bearish MA crossover - exit long position',
          confidence: 0.7,
          timestamp: new Date()
        };
      }

      // Exit short position on bullish crossover
      if (state.currentPosition.side === 'SHORT' && crossoverType === 'bullish') {
        return {
          type: 'CLOSE',
          strength: 'MEDIUM',
          reason: 'Bullish MA crossover - exit short position',
          confidence: 0.7,
          timestamp: new Date()
        };
      }
    }

    return null;
  }

  async onSessionEnd(state: StrategyState): Promise<StrategySignal[]> {
    // Reset crossover tracking for next session
    this.lastCrossoverType = 'none';
    this.crossoverConfirmationCount = 0;
    return super.onSessionEnd(state);
  }

  validateParameters(): { valid: boolean; errors: string[] } {
    const schema = {
      fastPeriod: { type: 'number', required: true, min: 2, max: 50 },
      slowPeriod: { type: 'number', required: true, min: 5, max: 200 },
      maType: { type: 'string', required: true, enum: ['SMA', 'EMA'] },
      confirmationBars: { type: 'number', required: true, min: 1, max: 5 },
      stopLossPercent: { type: 'number', required: true, min: 0.005, max: 0.1 },
      takeProfitPercent: { type: 'number', required: true, min: 0.01, max: 0.2 },
      minTrendStrength: { type: 'number', required: true, min: 0.001, max: 1.0 },
      volumeConfirmation: { type: 'boolean', required: true },
      volumeMultiplier: { type: 'number', required: true, min: 1.0, max: 3.0 },
      maxPositionTime: { type: 'number', required: true, min: 30, max: 1440 },
      exitBeforeClose: { type: 'number', required: true, min: 5, max: 60 }
    };

    const baseValidation = StrategyValidator.validateParameters(this.parameters, schema);
    
    // Additional validation: fast period must be less than slow period
    if (this.parameters.fastPeriod >= this.parameters.slowPeriod) {
      baseValidation.errors.push('Fast period must be less than slow period');
      baseValidation.valid = false;
    }

    return baseValidation;
  }

  getRequiredIndicators(): string[] {
    return [this.parameters.maType, 'Volume'];
  }

  clone(): IStrategy {
    const cloned = new MovingAverageCrossoverStrategy();
    Object.assign(cloned.parameters, this.parameters);
    return cloned;
  }
}