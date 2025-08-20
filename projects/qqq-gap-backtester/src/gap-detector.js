export class GapDetector {
  constructor(config = {}) {
    this.minGapPercent = config.minGapPercent || 1.5;
    this.lookbackBars = config.lookbackBars || 390; // 1 trading day in minutes
    this.fillTimeLimit = config.fillTimeLimit || 120; // 2 hours in minutes
  }

  detectContractGaps(data) {
    const gaps = [];
    
    for (let i = 1; i < data.length; i++) {
      const prevDay = data[i - 1];
      const currentDay = data[i];
      
      if (!prevDay || !currentDay) continue;
      
      const prevClose = prevDay.close;
      const currentOpen = currentDay.open;
      const gapPercent = ((currentOpen - prevClose) / prevClose) * 100;
      
      if (Math.abs(gapPercent) >= this.minGapPercent) {
        const gap = {
          date: currentDay.timestamp,
          prevClose,
          openPrice: currentOpen,
          gapSize: Math.abs(gapPercent),
          gapDirection: gapPercent > 0 ? 'UP' : 'DOWN',
          fillTarget: prevClose,
          filled: false,
          fillTime: null,
          fillPrice: null,
          maxAdverse: 0,
          maxFavorable: 0
        };
        
        // Check if gap filled during the day
        const fillResult = this.checkGapFill(currentDay, gap);
        Object.assign(gap, fillResult);
        
        gaps.push(gap);
      }
    }
    
    return gaps;
  }

  checkGapFill(dayData, gap) {
    const result = {
      filled: false,
      fillTime: null,
      fillPrice: null,
      maxAdverse: 0,
      maxFavorable: 0
    };
    
    // For minute data within the day
    if (dayData.bars && Array.isArray(dayData.bars)) {
      let maxMove = 0;
      let minMove = Infinity;
      
      for (let i = 0; i < dayData.bars.length && i < this.fillTimeLimit; i++) {
        const bar = dayData.bars[i];
        
        // Track max favorable and adverse moves
        if (gap.gapDirection === 'DOWN') {
          maxMove = Math.max(maxMove, bar.high);
          minMove = Math.min(minMove, bar.low);
          
          // Check if gap filled (price went back up to previous close)
          if (bar.high >= gap.fillTarget) {
            result.filled = true;
            result.fillTime = i + 1; // Minutes after open
            result.fillPrice = Math.min(bar.high, gap.fillTarget);
            break;
          }
        } else {
          // UP gap
          maxMove = Math.max(maxMove, bar.high);
          minMove = Math.min(minMove, bar.low);
          
          // Check if gap filled (price went back down to previous close)
          if (bar.low <= gap.fillTarget) {
            result.filled = true;
            result.fillTime = i + 1;
            result.fillPrice = Math.max(bar.low, gap.fillTarget);
            break;
          }
        }
      }
      
      // Calculate max moves
      if (gap.gapDirection === 'DOWN') {
        result.maxFavorable = ((maxMove - gap.openPrice) / gap.openPrice) * 100;
        result.maxAdverse = ((gap.openPrice - minMove) / gap.openPrice) * 100;
      } else {
        result.maxFavorable = ((gap.openPrice - minMove) / gap.openPrice) * 100;
        result.maxAdverse = ((maxMove - gap.openPrice) / gap.openPrice) * 100;
      }
    }
    
    return result;
  }

  analyzeGapStatistics(gaps) {
    const stats = {
      totalGaps: gaps.length,
      upGaps: gaps.filter(g => g.gapDirection === 'UP').length,
      downGaps: gaps.filter(g => g.gapDirection === 'DOWN').length,
      filledGaps: gaps.filter(g => g.filled).length,
      fillRate: 0,
      avgFillTime: 0,
      avgGapSize: 0,
      fillRateBySize: {},
      fillRateByDirection: {
        UP: 0,
        DOWN: 0
      },
      bestTimeToEnter: null,
      avgMaxFavorable: 0,
      avgMaxAdverse: 0
    };
    
    if (gaps.length === 0) return stats;
    
    // Calculate fill rate
    stats.fillRate = (stats.filledGaps / stats.totalGaps) * 100;
    
    // Average gap size
    stats.avgGapSize = gaps.reduce((sum, g) => sum + g.gapSize, 0) / gaps.length;
    
    // Fill rate by direction
    const upGapsFilled = gaps.filter(g => g.gapDirection === 'UP' && g.filled).length;
    const downGapsFilled = gaps.filter(g => g.gapDirection === 'DOWN' && g.filled).length;
    
    if (stats.upGaps > 0) {
      stats.fillRateByDirection.UP = (upGapsFilled / stats.upGaps) * 100;
    }
    if (stats.downGaps > 0) {
      stats.fillRateByDirection.DOWN = (downGapsFilled / stats.downGaps) * 100;
    }
    
    // Average fill time for filled gaps
    const filledGaps = gaps.filter(g => g.filled);
    if (filledGaps.length > 0) {
      stats.avgFillTime = filledGaps.reduce((sum, g) => sum + g.fillTime, 0) / filledGaps.length;
    }
    
    // Fill rate by gap size buckets
    const sizeBuckets = [
      { min: 0, max: 2, label: '0-2%' },
      { min: 2, max: 3, label: '2-3%' },
      { min: 3, max: 5, label: '3-5%' },
      { min: 5, max: 100, label: '>5%' }
    ];
    
    for (const bucket of sizeBuckets) {
      const bucketGaps = gaps.filter(g => g.gapSize >= bucket.min && g.gapSize < bucket.max);
      const bucketFilled = bucketGaps.filter(g => g.filled).length;
      
      if (bucketGaps.length > 0) {
        stats.fillRateBySize[bucket.label] = {
          count: bucketGaps.length,
          fillRate: (bucketFilled / bucketGaps.length) * 100
        };
      }
    }
    
    // Average max favorable and adverse moves
    stats.avgMaxFavorable = gaps.reduce((sum, g) => sum + g.maxFavorable, 0) / gaps.length;
    stats.avgMaxAdverse = gaps.reduce((sum, g) => sum + g.maxAdverse, 0) / gaps.length;
    
    // Determine best time to enter (when most gaps fill)
    const fillTimeDistribution = {};
    for (const gap of filledGaps) {
      const timeBucket = Math.floor(gap.fillTime / 15) * 15; // 15-minute buckets
      fillTimeDistribution[timeBucket] = (fillTimeDistribution[timeBucket] || 0) + 1;
    }
    
    let maxFills = 0;
    for (const [time, count] of Object.entries(fillTimeDistribution)) {
      if (count > maxFills) {
        maxFills = count;
        stats.bestTimeToEnter = `${time}-${parseInt(time) + 15} minutes after open`;
      }
    }
    
    return stats;
  }

  generateTradingRules(stats) {
    const rules = [];
    
    // Rule 1: Direction bias
    if (stats.fillRateByDirection.DOWN > stats.fillRateByDirection.UP) {
      rules.push({
        name: 'Direction Bias',
        rule: 'Focus on DOWN gaps - they fill more often',
        confidence: stats.fillRateByDirection.DOWN
      });
    } else {
      rules.push({
        name: 'Direction Bias',
        rule: 'Focus on UP gaps - they fill more often',
        confidence: stats.fillRateByDirection.UP
      });
    }
    
    // Rule 2: Optimal gap size
    let bestSizeBucket = null;
    let bestFillRate = 0;
    
    for (const [size, data] of Object.entries(stats.fillRateBySize)) {
      if (data.fillRate > bestFillRate && data.count > 10) {
        bestFillRate = data.fillRate;
        bestSizeBucket = size;
      }
    }
    
    if (bestSizeBucket) {
      rules.push({
        name: 'Optimal Gap Size',
        rule: `Trade gaps in the ${bestSizeBucket} range`,
        confidence: bestFillRate
      });
    }
    
    // Rule 3: Entry timing
    if (stats.avgFillTime < 60) {
      rules.push({
        name: 'Entry Timing',
        rule: 'Enter positions immediately at open - gaps fill quickly',
        confidence: 85
      });
    } else {
      rules.push({
        name: 'Entry Timing',
        rule: `Wait ${Math.floor(stats.avgFillTime / 4)} minutes after open for better entry`,
        confidence: 75
      });
    }
    
    // Rule 4: Stop loss
    if (stats.avgMaxAdverse > 3) {
      rules.push({
        name: 'Stop Loss',
        rule: `Set stop loss at ${stats.avgMaxAdverse.toFixed(1)}% adverse move`,
        confidence: 90
      });
    }
    
    // Rule 5: Profit target
    rules.push({
      name: 'Profit Target',
      rule: `Target ${stats.avgMaxFavorable.toFixed(1)}% favorable move or gap fill`,
      confidence: stats.fillRate
    });
    
    return rules;
  }
}