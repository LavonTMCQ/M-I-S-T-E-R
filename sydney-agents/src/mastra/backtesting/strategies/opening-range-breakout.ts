import { 
  BaseStrategy, 
  IStrategy, 
  StrategySignal, 
  StrategyContext, 
  StrategyState, 
  StrategyParameters,
  StrategyValidator,
  StrategyUtils
} from '../strategy-interface.js';

/**
 * Opening Range Breakout Strategy
 * 
 * This strategy implements the Opening Range Breakout pattern as specified
 * in stockbacktestdesign.txt. It identifies the high and low of the first
 * N minutes of trading and generates signals when price breaks above or
 * below this range with sufficient volume confirmation.
 * 
 * Key Features:
 * - Configurable opening range period (default: 30 minutes)
 * - Volume confirmation for breakouts
 * - Dynamic stop loss based on ATR
 * - Time-based exit for day trading
 * - Risk management with position sizing
 */

export interface OpeningRangeBreakoutParameters extends StrategyParameters {
  rangePeriodMinutes: number;    // Opening range period (default: 30)
  breakoutThreshold: number;     // Minimum breakout percentage (default: 0.1%)
  volumeMultiplier: number;      // Volume confirmation multiplier (default: 1.5x)
  stopLossATRMultiplier: number; // Stop loss as multiple of ATR (default: 2.0)
  takeProfitRatio: number;       // Take profit ratio vs stop loss (default: 2.0)
  maxPositionTime: number;       // Max time to hold position in minutes (default: 240)
  minRangeSize: number;          // Minimum range size as % of price (default: 0.2%)
  exitBeforeClose: number;       // Exit N minutes before market close (default: 30)
}

export class OpeningRangeBreakoutStrategy extends BaseStrategy {
  readonly name = 'Opening Range Breakout';
  readonly description = 'Trades breakouts from the opening range with volume confirmation and ATR-based stops';
  readonly category = 'day-trading' as const;
  readonly requiredHistory = 50; // Need history for ATR calculation

  readonly parameters: OpeningRangeBreakoutParameters = {
    rangePeriodMinutes: 30,
    breakoutThreshold: 0.001,      // 0.1%
    volumeMultiplier: 1.5,
    stopLossATRMultiplier: 2.0,
    takeProfitRatio: 2.0,
    maxPositionTime: 240,          // 4 hours
    minRangeSize: 0.002,           // 0.2%
    exitBeforeClose: 30
  };

  private openingRange: {
    high: number;
    low: number;
    volume: number;
    established: boolean;
    startTime?: Date;
    endTime?: Date;
  } = {
    high: 0,
    low: 0,
    volume: 0,
    established: false
  };

  private averageVolume = 0;
  private atrValue = 0;

  async onBar(context: StrategyContext, state: StrategyState): Promise<StrategySignal> {
    this.ensureInitialized();

    const { currentBar, previousBars, marketHours } = context;
    const currentTime = currentBar.timestamp;

    // Update indicators
    this.updateIndicators(previousBars, currentBar);

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

    // Establish opening range if market just opened
    if (this.isMarketOpeningPeriod(currentTime, marketHours)) {
      this.updateOpeningRange(currentBar);
      return this.createHoldSignal('Establishing opening range');
    }

    // Generate breakout signals if range is established and we're not in position
    if (this.openingRange.established && !state.currentPosition) {
      return this.checkForBreakout(currentBar, context);
    }

    return this.createHoldSignal('Monitoring for opportunities');
  }

  private updateIndicators(previousBars: OHLVC[], currentBar: OHLVC): void {
    if (previousBars.length < this.requiredHistory) return;

    // Calculate average volume (last 20 bars)
    const recentBars = previousBars.slice(-20);
    this.averageVolume = recentBars.reduce((sum, bar) => sum + bar.volume, 0) / recentBars.length;

    // Calculate ATR
    const highs = previousBars.map(bar => bar.high);
    const lows = previousBars.map(bar => bar.low);
    const closes = previousBars.map(bar => bar.close);
    
    const atrValues = StrategyUtils.calculateATR(highs, lows, closes, 14);
    this.atrValue = atrValues.length > 0 ? atrValues[atrValues.length - 1] : 0;
  }

  private isMarketOpeningPeriod(currentTime: Date, marketHours: any): boolean {
    // Check if we're within the opening range period
    const timeStr = currentTime.toTimeString().substring(0, 5);
    const marketOpenTime = '09:30'; // Assuming US market hours
    
    if (!this.openingRange.startTime && timeStr === marketOpenTime) {
      this.openingRange.startTime = new Date(currentTime);
      this.openingRange.endTime = new Date(currentTime.getTime() + this.parameters.rangePeriodMinutes * 60 * 1000);
      return true;
    }

    return this.openingRange.endTime ? currentTime <= this.openingRange.endTime : false;
  }

  private updateOpeningRange(currentBar: OHLVC): void {
    if (!this.openingRange.established) {
      if (this.openingRange.high === 0) {
        // First bar of the range
        this.openingRange.high = currentBar.high;
        this.openingRange.low = currentBar.low;
        this.openingRange.volume = currentBar.volume;
      } else {
        // Update range with new bar
        this.openingRange.high = Math.max(this.openingRange.high, currentBar.high);
        this.openingRange.low = Math.min(this.openingRange.low, currentBar.low);
        this.openingRange.volume += currentBar.volume;
      }

      // Check if range period is complete
      if (this.openingRange.endTime && currentBar.timestamp >= this.openingRange.endTime) {
        this.finalizeOpeningRange();
      }
    }
  }

  private finalizeOpeningRange(): void {
    const rangeSize = this.openingRange.high - this.openingRange.low;
    const rangeSizePercent = rangeSize / ((this.openingRange.high + this.openingRange.low) / 2);

    // Validate range size
    if (rangeSizePercent >= this.parameters.minRangeSize) {
      this.openingRange.established = true;
      console.log(`📊 Opening range established: $${this.openingRange.low.toFixed(2)} - $${this.openingRange.high.toFixed(2)} (${(rangeSizePercent * 100).toFixed(2)}%)`);
    } else {
      console.log(`⚠️ Opening range too small: ${(rangeSizePercent * 100).toFixed(2)}% < ${(this.parameters.minRangeSize * 100).toFixed(2)}%`);
      this.resetOpeningRange();
    }
  }

  private checkForBreakout(currentBar: OHLVC, context: StrategyContext): StrategySignal {
    if (!this.openingRange.established) {
      return this.createHoldSignal('Opening range not established');
    }

    const { high, low } = this.openingRange;
    const currentPrice = currentBar.close;
    const currentVolume = currentBar.volume;

    // Check for bullish breakout
    if (currentPrice > high * (1 + this.parameters.breakoutThreshold)) {
      if (this.isVolumeConfirmed(currentVolume)) {
        return this.createBuySignal(currentBar, context);
      }
    }

    // Check for bearish breakout
    if (currentPrice < low * (1 - this.parameters.breakoutThreshold)) {
      if (this.isVolumeConfirmed(currentVolume)) {
        return this.createSellSignal(currentBar, context);
      }
    }

    return this.createHoldSignal('No valid breakout detected');
  }

  private isVolumeConfirmed(currentVolume: number): boolean {
    return currentVolume >= this.averageVolume * this.parameters.volumeMultiplier;
  }

  private createBuySignal(currentBar: OHLVC, context: StrategyContext): StrategySignal {
    const entryPrice = currentBar.close;
    const stopLoss = entryPrice - (this.atrValue * this.parameters.stopLossATRMultiplier);
    const takeProfit = entryPrice + ((entryPrice - stopLoss) * this.parameters.takeProfitRatio);

    return {
      type: 'BUY',
      strength: 'STRONG',
      price: entryPrice,
      stopLoss,
      takeProfit,
      reason: `Bullish breakout above opening range high ($${this.openingRange.high.toFixed(2)}) with volume confirmation`,
      confidence: 0.8,
      timestamp: currentBar.timestamp,
      metadata: {
        openingRangeHigh: this.openingRange.high,
        openingRangeLow: this.openingRange.low,
        atr: this.atrValue,
        volume: currentBar.volume,
        avgVolume: this.averageVolume
      }
    };
  }

  private createSellSignal(currentBar: OHLVC, context: StrategyContext): StrategySignal {
    const entryPrice = currentBar.close;
    const stopLoss = entryPrice + (this.atrValue * this.parameters.stopLossATRMultiplier);
    const takeProfit = entryPrice - ((stopLoss - entryPrice) * this.parameters.takeProfitRatio);

    return {
      type: 'SELL',
      strength: 'STRONG',
      price: entryPrice,
      stopLoss,
      takeProfit,
      reason: `Bearish breakout below opening range low ($${this.openingRange.low.toFixed(2)}) with volume confirmation`,
      confidence: 0.8,
      timestamp: currentBar.timestamp,
      metadata: {
        openingRangeHigh: this.openingRange.high,
        openingRangeLow: this.openingRange.low,
        atr: this.atrValue,
        volume: currentBar.volume,
        avgVolume: this.averageVolume
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

  private resetOpeningRange(): void {
    this.openingRange = {
      high: 0,
      low: 0,
      volume: 0,
      established: false,
      startTime: undefined,
      endTime: undefined
    };
  }

  async onSessionEnd(state: StrategyState): Promise<StrategySignal[]> {
    // Reset opening range for next session
    this.resetOpeningRange();
    return super.onSessionEnd(state);
  }

  validateParameters(): { valid: boolean; errors: string[] } {
    const schema = {
      rangePeriodMinutes: { type: 'number', required: true, min: 5, max: 120 },
      breakoutThreshold: { type: 'number', required: true, min: 0, max: 0.05 },
      volumeMultiplier: { type: 'number', required: true, min: 1.0, max: 5.0 },
      stopLossATRMultiplier: { type: 'number', required: true, min: 0.5, max: 5.0 },
      takeProfitRatio: { type: 'number', required: true, min: 1.0, max: 5.0 },
      maxPositionTime: { type: 'number', required: true, min: 30, max: 480 },
      minRangeSize: { type: 'number', required: true, min: 0.001, max: 0.02 },
      exitBeforeClose: { type: 'number', required: true, min: 5, max: 60 }
    };

    return StrategyValidator.validateParameters(this.parameters, schema);
  }

  getRequiredIndicators(): string[] {
    return ['ATR', 'Volume'];
  }

  clone(): IStrategy {
    const cloned = new OpeningRangeBreakoutStrategy();
    Object.assign(cloned.parameters, this.parameters);
    return cloned;
  }
}
