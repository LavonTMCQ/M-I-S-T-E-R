import { GapDetector } from './gap-detector.js';
import { PolygonDataProvider } from './data-providers/polygon-provider.js';

export class QQQGapBacktester {
  constructor(config = {}) {
    this.symbol = 'QQQ';
    this.startDate = config.startDate || '2024-01-01';
    this.endDate = config.endDate || new Date().toISOString().split('T')[0];
    this.initialCapital = config.initialCapital || 10000;
    this.positionSize = config.positionSize || 0.1; // 10% per trade
    this.maxRiskPerTrade = config.maxRiskPerTrade || 100;
    this.dataProvider = new PolygonDataProvider();
    this.gapDetector = new GapDetector();
    
    this.trades = [];
    this.equity = this.initialCapital;
    this.peakEquity = this.initialCapital;
    this.drawdown = 0;
  }

  async run() {
    console.log(`Starting QQQ Gap Fill Backtest from ${this.startDate} to ${this.endDate}`);
    console.log(`Initial Capital: $${this.initialCapital}`);
    console.log('----------------------------------------');
    
    // Get historical data
    const gaps = await this.identifyHistoricalGaps();
    
    if (gaps.length === 0) {
      console.log('No gaps found in the specified period');
      return null;
    }
    
    console.log(`Found ${gaps.length} gaps to analyze`);
    
    // Simulate trades on each gap
    for (const gap of gaps) {
      const trade = await this.simulateTrade(gap);
      if (trade) {
        this.trades.push(trade);
        this.updateEquity(trade);
      }
    }
    
    // Calculate statistics
    const stats = this.calculateStatistics();
    
    // Generate report
    this.generateReport(stats);
    
    return {
      trades: this.trades,
      statistics: stats,
      gapAnalysis: this.gapDetector.analyzeGapStatistics(gaps),
      tradingRules: this.gapDetector.generateTradingRules(this.gapDetector.analyzeGapStatistics(gaps))
    };
  }

  async identifyHistoricalGaps() {
    const gaps = [];
    
    // Get date range
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const current = new Date(start);
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      
      // Skip weekends
      if (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() + 1);
        continue;
      }
      
      try {
        // Get options chain for this date
        const chain = await this.dataProvider.getOptionsChain(this.symbol, dateStr);
        
        // Focus on near-the-money puts
        const atmStrike = await this.findATMStrike(dateStr);
        const relevantStrikes = chain.filter(c => 
          c.type === 'put' && 
          Math.abs(c.strike - atmStrike) <= 5 &&
          c.volume > 100
        );
        
        for (const contract of relevantStrikes) {
          // Get minute data for the contract
          const data = await this.dataProvider.getHistoricalOptionsData(
            contract.symbol,
            dateStr,
            dateStr,
            '1Min'
          );
          
          if (data && data.length > 0) {
            const contractGaps = this.gapDetector.detectContractGaps([{
              timestamp: dateStr,
              open: data[0].o,
              high: Math.max(...data.map(d => d.h)),
              low: Math.min(...data.map(d => d.l)),
              close: data[data.length - 1].c,
              bars: data
            }]);
            
            gaps.push(...contractGaps.map(g => ({
              ...g,
              contract: contract.symbol,
              strike: contract.strike,
              expiry: contract.expiry
            })));
          }
        }
      } catch (error) {
        console.error(`Error processing date ${dateStr}:`, error.message);
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return gaps;
  }

  async findATMStrike(date) {
    // Get underlying price to determine ATM strike
    const underlyingData = await this.dataProvider.getHistoricalOptionsData(
      this.symbol,
      date,
      date,
      '1Day'
    );
    
    if (underlyingData && underlyingData.length > 0) {
      const price = underlyingData[0].c;
      return Math.round(price); // Round to nearest strike
    }
    
    return 500; // Default QQQ level
  }

  async simulateTrade(gap) {
    const trade = {
      date: gap.date,
      contract: gap.contract,
      strike: gap.strike,
      gapSize: gap.gapSize,
      gapDirection: gap.gapDirection,
      entry: gap.openPrice,
      exit: null,
      contracts: 0,
      pnl: 0,
      pnlPercent: 0,
      result: 'pending',
      exitReason: '',
      holdTime: 0
    };
    
    // Calculate position size
    const riskAmount = Math.min(this.maxRiskPerTrade, this.equity * this.positionSize);
    trade.contracts = Math.floor(riskAmount / (gap.openPrice * 100));
    
    if (trade.contracts === 0) {
      return null; // Skip if we can't afford any contracts
    }
    
    // Trade logic: fade the gap
    // If gap DOWN, we BUY puts (expecting fill up)
    // If gap UP, we BUY calls (expecting fill down)
    
    if (gap.filled) {
      // Gap filled - successful trade
      trade.exit = gap.fillPrice;
      trade.holdTime = gap.fillTime;
      trade.result = 'win';
      trade.exitReason = 'gap_filled';
      
      // Calculate P&L
      if (gap.gapDirection === 'DOWN') {
        // We bought calls, gap filled up
        trade.pnl = (trade.exit - trade.entry) * trade.contracts * 100;
      } else {
        // We bought puts, gap filled down
        trade.pnl = (trade.entry - trade.exit) * trade.contracts * 100;
      }
    } else {
      // Gap didn't fill - stop loss
      const stopLoss = gap.gapDirection === 'DOWN' 
        ? gap.openPrice * 0.95  // 5% stop loss
        : gap.openPrice * 1.05;
      
      trade.exit = stopLoss;
      trade.holdTime = 120; // Assume held for 2 hours
      trade.result = 'loss';
      trade.exitReason = 'stop_loss';
      
      // Calculate P&L
      if (gap.gapDirection === 'DOWN') {
        trade.pnl = (stopLoss - trade.entry) * trade.contracts * 100;
      } else {
        trade.pnl = (trade.entry - stopLoss) * trade.contracts * 100;
      }
    }
    
    trade.pnlPercent = (trade.pnl / (trade.entry * trade.contracts * 100)) * 100;
    
    return trade;
  }

  updateEquity(trade) {
    this.equity += trade.pnl;
    
    if (this.equity > this.peakEquity) {
      this.peakEquity = this.equity;
    }
    
    const currentDrawdown = ((this.peakEquity - this.equity) / this.peakEquity) * 100;
    if (currentDrawdown > this.drawdown) {
      this.drawdown = currentDrawdown;
    }
  }

  calculateStatistics() {
    const wins = this.trades.filter(t => t.result === 'win');
    const losses = this.trades.filter(t => t.result === 'loss');
    
    const totalPnL = this.trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgWin = wins.length > 0 
      ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length 
      : 0;
    const avgLoss = losses.length > 0 
      ? losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length 
      : 0;
    
    const winRate = this.trades.length > 0 
      ? (wins.length / this.trades.length) * 100 
      : 0;
    
    const profitFactor = Math.abs(avgLoss) > 0 
      ? avgWin / Math.abs(avgLoss) 
      : avgWin > 0 ? Infinity : 0;
    
    const avgHoldTime = this.trades.length > 0
      ? this.trades.reduce((sum, t) => sum + t.holdTime, 0) / this.trades.length
      : 0;
    
    // Best and worst trades
    const bestTrade = this.trades.reduce((best, t) => 
      t.pnl > (best?.pnl || -Infinity) ? t : best, null
    );
    
    const worstTrade = this.trades.reduce((worst, t) => 
      t.pnl < (worst?.pnl || Infinity) ? t : worst, null
    );
    
    // Gap size analysis
    const gapSizeWinRate = {};
    const sizeBuckets = ['0-2%', '2-3%', '3-5%', '>5%'];
    
    for (const bucket of sizeBuckets) {
      const [min, max] = bucket === '>5%' 
        ? [5, 100] 
        : bucket.split('-').map(s => parseFloat(s));
      
      const bucketTrades = this.trades.filter(t => 
        t.gapSize >= min && t.gapSize < max
      );
      
      if (bucketTrades.length > 0) {
        const bucketWins = bucketTrades.filter(t => t.result === 'win').length;
        gapSizeWinRate[bucket] = {
          trades: bucketTrades.length,
          winRate: (bucketWins / bucketTrades.length) * 100
        };
      }
    }
    
    return {
      totalTrades: this.trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      totalPnL,
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdown: this.drawdown,
      finalEquity: this.equity,
      returnPercent: ((this.equity - this.initialCapital) / this.initialCapital) * 100,
      avgHoldTime,
      bestTrade,
      worstTrade,
      gapSizeWinRate
    };
  }

  generateReport(stats) {
    console.log('\n========================================');
    console.log('QQQ GAP FILL STRATEGY - BACKTEST RESULTS');
    console.log('========================================');
    console.log(`Period: ${this.startDate} to ${this.endDate}`);
    console.log(`Total Trades: ${stats.totalTrades}`);
    console.log(`Wins: ${stats.wins} | Losses: ${stats.losses}`);
    console.log(`Win Rate: ${stats.winRate.toFixed(2)}%`);
    console.log('----------------------------------------');
    console.log(`Total P&L: $${stats.totalPnL.toFixed(2)}`);
    console.log(`Average Win: $${stats.avgWin.toFixed(2)}`);
    console.log(`Average Loss: $${stats.avgLoss.toFixed(2)}`);
    console.log(`Profit Factor: ${stats.profitFactor.toFixed(2)}`);
    console.log('----------------------------------------');
    console.log(`Initial Capital: $${this.initialCapital}`);
    console.log(`Final Equity: $${stats.finalEquity.toFixed(2)}`);
    console.log(`Return: ${stats.returnPercent.toFixed(2)}%`);
    console.log(`Max Drawdown: ${stats.maxDrawdown.toFixed(2)}%`);
    console.log('----------------------------------------');
    console.log(`Average Hold Time: ${stats.avgHoldTime.toFixed(0)} minutes`);
    
    if (stats.bestTrade) {
      console.log(`Best Trade: $${stats.bestTrade.pnl.toFixed(2)} on ${stats.bestTrade.date}`);
    }
    if (stats.worstTrade) {
      console.log(`Worst Trade: $${stats.worstTrade.pnl.toFixed(2)} on ${stats.worstTrade.date}`);
    }
    
    console.log('\nWIN RATE BY GAP SIZE:');
    for (const [size, data] of Object.entries(stats.gapSizeWinRate)) {
      console.log(`  ${size}: ${data.winRate.toFixed(1)}% (${data.trades} trades)`);
    }
    
    console.log('========================================\n');
  }
}

// Run backtest if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const backtester = new QQQGapBacktester({
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    initialCapital: 10000,
    positionSize: 0.1,
    maxRiskPerTrade: 100
  });
  
  backtester.run().then(results => {
    if (results && results.tradingRules) {
      console.log('\nGENERATED TRADING RULES:');
      console.log('------------------------');
      for (const rule of results.tradingRules) {
        console.log(`${rule.name}: ${rule.rule}`);
        console.log(`  Confidence: ${rule.confidence.toFixed(1)}%`);
      }
    }
  }).catch(error => {
    console.error('Backtest failed:', error);
  });
}