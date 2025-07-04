import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';
import { TokenLimiter } from '@mastra/memory/processors';

/**
 * Comprehensive Knowledge Store for Stock Backtesting System
 * 
 * This module implements a sophisticated knowledge store using Mastra's memory/RAG system
 * to store and retrieve:
 * - Historical stock data from Alpha Vantage
 * - Backtesting results and performance metrics
 * - Trading strategies and their parameters
 * - Market analysis and insights
 * 
 * Architecture:
 * - LibSQL for structured data storage (trades, results, metadata)
 * - LibSQL Vector for semantic search and strategy similarity
 * - FastEmbed for generating embeddings of strategies and market insights
 * - Memory processors for optimization and token management
 */

// Core data interfaces based on stockbacktestdesign.txt
export interface OHLVC {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestResult {
  id: string;
  strategyName: string;
  symbol: string;
  parameters: Record<string, any>;
  performance: {
    totalPL: number;
    hitRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
  };
  trades: TradeRecord[];
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalCapital: number;
  metadata: {
    dataSource: string;
    interval: string;
    marketHours: boolean;
    createdAt: Date;
    tags: string[];
  };
}

export interface TradeRecord {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: Date;
  pnl?: number;
  commission?: number;
  slippage?: number;
  reason: string; // Strategy signal reason
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  code: string; // Strategy implementation code
  category: 'day-trading' | 'swing-trading' | 'position-trading';
  tags: string[];
  performance: {
    avgHitRate: number;
    avgProfitFactor: number;
    backtestCount: number;
    lastUpdated: Date;
  };
  metadata: {
    author: string;
    version: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface MarketData {
  id: string;
  symbol: string;
  interval: string;
  data: OHLVC[];
  source: 'alpha-vantage' | 'csv' | 'manual';
  fetchedAt: Date;
  metadata: {
    month?: string;
    extendedHours: boolean;
    adjusted: boolean;
  };
}

// Knowledge Store Implementation
export class BacktestingKnowledgeStore {
  private memory: Memory;
  private isInitialized = false;

  constructor() {
    this.memory = new Memory({
      // Structured storage for backtesting data
      storage: new LibSQLStore({
        url: 'file:./backtesting-knowledge.db',
      }),

      // Vector storage for semantic search of strategies and insights
      vector: new LibSQLVector({
        connectionUrl: 'file:./backtesting-knowledge.db',
      }),

      // Embedding model for strategy and insight similarity
      embedder: fastembed,

      options: {
        // Keep extensive conversation history for backtesting context
        lastMessages: 50,

        // Semantic recall for finding similar strategies and results
        semanticRecall: {
          topK: 10,
          messageRange: {
            before: 5,
            after: 3,
          },
          scope: 'resource',
        },

        // Working memory template for backtesting context
        workingMemory: {
          enabled: true,
          template: `
# Backtesting Session Context

## Current Analysis
- **Active Symbol**: 
- **Strategy Focus**: 
- **Time Period**: 
- **Performance Target**: 

## Recent Results
- **Best Performing Strategy**: 
- **Hit Rate Threshold**: 60%
- **Profit Factor Target**: 1.5+
- **Max Drawdown Limit**: 10%

## Strategy Library
- **Day Trading Strategies**: 
- **Swing Trading Strategies**: 
- **Custom Strategies**: 

## Data Status
- **Available Symbols**: SPY, QQQ, [others]
- **Data Coverage**: [date ranges]
- **Last Updated**: 

## Performance Tracking
- **Strategies Tested**: 0
- **Profitable Strategies**: 0
- **Average Hit Rate**: 0%
- **Best Profit Factor**: 0
`,
        },

        threads: {
          generateTitle: true,
        },
      },

      processors: [
        new TokenLimiter(150000), // Higher limit for backtesting data
      ],
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize the memory system
      await this.memory.storage?.initialize?.();
      await this.memory.vector?.initialize?.();

      // Create indexes for efficient querying
      await this.createIndexes();

      this.isInitialized = true;
      console.log('✅ Backtesting Knowledge Store initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Backtesting Knowledge Store:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    console.log('📊 Creating database tables and indexes for optimal performance...');

    try {
      // Create the market_data table for storing OHLCV data
      await this.memory.vector?.client?.execute(`
        CREATE TABLE IF NOT EXISTS market_data (
          id TEXT PRIMARY KEY,
          symbol TEXT NOT NULL,
          interval TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          open REAL NOT NULL,
          high REAL NOT NULL,
          low REAL NOT NULL,
          close REAL NOT NULL,
          volume INTEGER NOT NULL,
          source TEXT NOT NULL,
          fetched_at TEXT NOT NULL,
          metadata TEXT,
          UNIQUE(symbol, interval, timestamp)
        )
      `);

      // Create indexes for efficient querying
      await this.memory.vector?.client?.execute(`
        CREATE INDEX IF NOT EXISTS idx_market_data_symbol_interval
        ON market_data(symbol, interval)
      `);

      await this.memory.vector?.client?.execute(`
        CREATE INDEX IF NOT EXISTS idx_market_data_timestamp
        ON market_data(timestamp)
      `);

      // Create backtest_results table
      await this.memory.vector?.client?.execute(`
        CREATE TABLE IF NOT EXISTS backtest_results (
          id TEXT PRIMARY KEY,
          strategy_name TEXT NOT NULL,
          symbol TEXT NOT NULL,
          parameters TEXT,
          performance TEXT NOT NULL,
          trades TEXT,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          initial_capital REAL NOT NULL,
          final_capital REAL NOT NULL,
          metadata TEXT,
          created_at TEXT NOT NULL
        )
      `);

      // Create strategies table
      await this.memory.vector?.client?.execute(`
        CREATE TABLE IF NOT EXISTS strategies (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          parameters TEXT,
          code TEXT,
          category TEXT,
          tags TEXT,
          performance TEXT,
          metadata TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Create market_data_summary table for efficient lookups
      await this.memory.vector?.client?.execute(`
        CREATE TABLE IF NOT EXISTS market_data_summary (
          id TEXT PRIMARY KEY,
          symbol TEXT NOT NULL,
          interval TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          data_points INTEGER NOT NULL,
          source TEXT NOT NULL,
          fetched_at TEXT NOT NULL,
          metadata TEXT,
          UNIQUE(symbol, interval, start_date, end_date)
        )
      `);

      // Create indexes for backtest results
      await this.memory.vector?.client?.execute(`
        CREATE INDEX IF NOT EXISTS idx_backtest_strategy_symbol
        ON backtest_results(strategy_name, symbol)
      `);

      await this.memory.vector?.client?.execute(`
        CREATE INDEX IF NOT EXISTS idx_backtest_dates
        ON backtest_results(start_date, end_date)
      `);

      // Create indexes for market_data_summary
      await this.memory.vector?.client?.execute(`
        CREATE INDEX IF NOT EXISTS idx_summary_symbol_interval
        ON market_data_summary(symbol, interval)
      `);

      await this.memory.vector?.client?.execute(`
        CREATE INDEX IF NOT EXISTS idx_summary_dates
        ON market_data_summary(start_date, end_date)
      `);

      // Create vector indexes for semantic search
      // FastEmbed typically uses 384 dimensions
      console.log('📊 Creating vector indexes for semantic search...');

      // Create vector indexes with error handling for existing indexes
      const vectorIndexes = [
        { name: 'market_data_summary', description: 'Market data summaries' },
        { name: 'strategies', description: 'Trading strategies' },
        { name: 'backtest_results', description: 'Backtest results' }
      ];

      for (const index of vectorIndexes) {
        try {
          await this.memory.vector?.createIndex({
            indexName: index.name,
            dimension: 384,
            metric: 'cosine'
          });
          console.log(`✅ Created vector index: ${index.name} (${index.description})`);
        } catch (error: any) {
          // Index might already exist, which is fine
          if (error.message?.includes('already exists') || error.message?.includes('Table not found')) {
            console.log(`📋 Vector index ${index.name} already exists or will be created on first use`);
          } else {
            console.warn(`⚠️ Warning creating vector index ${index.name}:`, error.message);
          }
        }
      }

      console.log('✅ Database tables, indexes, and vector indexes created successfully');
    } catch (error) {
      console.error('❌ Failed to create database tables and indexes:', error);
      throw error;
    }
  }

  // Market Data Management
  async storeMarketData(marketData: MarketData): Promise<void> {
    await this.ensureInitialized();

    try {
      // Store each OHLCV data point in the SQL table for efficient retrieval
      for (const dataPoint of marketData.data) {
        const pointId = `${marketData.symbol}_${marketData.interval}_${dataPoint.timestamp.getTime()}`;

        await this.memory.vector?.client?.execute({
          sql: `INSERT OR REPLACE INTO market_data
                (id, symbol, interval, timestamp, open, high, low, close, volume, source, fetched_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            pointId,
            marketData.symbol,
            marketData.interval,
            dataPoint.timestamp.toISOString(),
            dataPoint.open,
            dataPoint.high,
            dataPoint.low,
            dataPoint.close,
            dataPoint.volume,
            marketData.source,
            marketData.fetchedAt.toISOString(),
            JSON.stringify(marketData.metadata)
          ]
        });
      }

      // Store summary in market_data_summary table
      const summaryId = `${marketData.symbol}_${marketData.interval}_${marketData.data[0]?.timestamp.toISOString().split('T')[0]}_${marketData.data[marketData.data.length - 1]?.timestamp.toISOString().split('T')[0]}`;

      await this.memory.vector?.client?.execute({
        sql: `INSERT OR REPLACE INTO market_data_summary
              (id, symbol, interval, start_date, end_date, data_points, source, fetched_at, metadata)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          summaryId,
          marketData.symbol,
          marketData.interval,
          marketData.data[0]?.timestamp.toISOString(),
          marketData.data[marketData.data.length - 1]?.timestamp.toISOString(),
          marketData.data.length,
          marketData.source,
          marketData.fetchedAt.toISOString(),
          JSON.stringify(marketData.metadata)
        ]
      });

      // Also store in vector database for semantic search
      const dataId = `market_data_${marketData.symbol}_${marketData.interval}_${Date.now()}`;
      const content = `Market data for ${marketData.symbol} (${marketData.interval}) from ${marketData.source}. ` +
                     `Contains ${marketData.data.length} data points from ${marketData.data[0]?.timestamp} to ${marketData.data[marketData.data.length - 1]?.timestamp}. ` +
                     `Extended hours: ${marketData.metadata.extendedHours}, Adjusted: ${marketData.metadata.adjusted}`;

      const { embeddings } = await fastembed.doEmbed({ values: [content] });

      await this.memory.vector?.upsert({
        indexName: 'market_data_summary',
        vectors: [embeddings[0]],
        metadata: [{
          id: dataId,
          type: 'market_data_summary',
          symbol: marketData.symbol,
          interval: marketData.interval,
          source: marketData.source,
          dataPoints: marketData.data.length,
          startDate: marketData.data[0]?.timestamp.toISOString(),
          endDate: marketData.data[marketData.data.length - 1]?.timestamp.toISOString(),
          content,
          rawData: JSON.stringify(marketData)
        }],
        ids: [dataId]
      });

      console.log(`✅ Stored market data for ${marketData.symbol} (${marketData.data.length} points)`);
    } catch (error) {
      console.error('❌ Failed to store market data:', error);
      throw error;
    }
  }

  async getMarketData(symbol: string, interval: string, dateRange?: { start: Date; end: Date }): Promise<OHLVC[]> {
    await this.ensureInitialized();

    try {
      let sql = `SELECT * FROM market_data WHERE symbol = ? AND interval = ?`;
      let args: any[] = [symbol, interval];

      if (dateRange) {
        sql += ` AND timestamp >= ? AND timestamp <= ?`;
        args.push(dateRange.start.toISOString(), dateRange.end.toISOString());
      }

      sql += ` ORDER BY timestamp ASC`;

      const results = await this.memory.vector?.client?.execute({
        sql,
        args
      });

      if (!results?.rows) return [];

      return results.rows.map((row: any) => ({
        timestamp: new Date(row.timestamp),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume)
      }));
    } catch (error) {
      console.error('❌ Failed to retrieve market data:', error);
      return [];
    }
  }

  async hasMarketData(symbol: string, interval: string, dateRange?: { start: Date; end: Date }): Promise<boolean> {
    await this.ensureInitialized();

    try {
      // Check summary table first for efficiency
      let sql = `SELECT COUNT(*) as count FROM market_data_summary WHERE symbol = ? AND interval = ?`;
      let args: any[] = [symbol, interval];

      if (dateRange) {
        sql += ` AND start_date <= ? AND end_date >= ?`;
        args.push(dateRange.end.toISOString(), dateRange.start.toISOString());
      }

      const result = await this.memory.vector?.client?.execute({
        sql,
        args
      });

      return (result?.rows?.[0]?.count || 0) > 0;
    } catch (error) {
      console.error('❌ Failed to check market data availability:', error);
      return false;
    }
  }

  // Strategy Management
  async storeStrategy(strategy: Strategy): Promise<void> {
    await this.ensureInitialized();

    try {
      const strategyId = `strategy_${strategy.id}_${Date.now()}`;
      
      // Create searchable content for the strategy
      const content = `${strategy.name}: ${strategy.description}. ` +
                     `Category: ${strategy.category}. Tags: ${strategy.tags.join(', ')}. ` +
                     `Parameters: ${JSON.stringify(strategy.parameters)}. ` +
                     `Performance: ${strategy.performance.avgHitRate}% hit rate, ` +
                     `${strategy.performance.avgProfitFactor} profit factor, ` +
                     `${strategy.performance.backtestCount} backtests.`;

      const { embeddings } = await fastembed.doEmbed({ values: [content] });
      
      await this.memory.vector?.upsert({
        indexName: 'strategies',
        vectors: [embeddings[0]],
        metadata: [{
          id: strategyId,
          type: 'strategy',
          name: strategy.name,
          category: strategy.category,
          tags: strategy.tags.join(','),
          hitRate: strategy.performance.avgHitRate,
          profitFactor: strategy.performance.avgProfitFactor,
          content,
          rawData: JSON.stringify(strategy)
        }],
        ids: [strategyId]
      });

      console.log(`✅ Stored strategy: ${strategy.name}`);
    } catch (error) {
      console.error('❌ Failed to store strategy:', error);
      throw error;
    }
  }

  async findSimilarStrategies(query: string, category?: string, minHitRate?: number): Promise<Strategy[]> {
    await this.ensureInitialized();

    try {
      const { embeddings } = await fastembed.doEmbed({ values: [query] });

      const results = await this.memory.vector?.query({
        indexName: 'strategies',
        queryVector: embeddings[0],
        topK: 20,
        includeVector: false
      });

      if (!results) return [];

      return results
        .filter(result => {
          const metadata = result.metadata;
          if (category && metadata?.category !== category) return false;
          if (minHitRate && (metadata?.hitRate || 0) < minHitRate) return false;
          return true;
        })
        .map(result => JSON.parse(result.metadata?.rawData || '{}'))
        .slice(0, 10);
    } catch (error) {
      console.error('❌ Failed to find similar strategies:', error);
      return [];
    }
  }

  // Backtest Results Management
  async storeBacktestResult(result: BacktestResult): Promise<void> {
    await this.ensureInitialized();

    try {
      const resultId = `backtest_${result.id}_${Date.now()}`;
      
      // Create searchable content for the backtest result
      // Handle date conversion safely
      const startDateStr = result.startDate instanceof Date ? result.startDate.toDateString() : new Date(result.startDate).toDateString();
      const endDateStr = result.endDate instanceof Date ? result.endDate.toDateString() : new Date(result.endDate).toDateString();

      const content = `Backtest of ${result.strategyName} on ${result.symbol}. ` +
                     `Performance: ${result.performance.hitRate}% hit rate, ` +
                     `${result.performance.profitFactor} profit factor, ` +
                     `${result.performance.totalPL} total P/L, ` +
                     `${result.performance.maxDrawdown}% max drawdown. ` +
                     `${result.performance.totalTrades} trades from ${startDateStr} to ${endDateStr}.`;

      const { embeddings } = await fastembed.doEmbed({ values: [content] });
      
      await this.memory.vector?.upsert({
        indexName: 'backtest_results',
        vectors: [embeddings[0]],
        metadata: [{
          id: resultId,
          type: 'backtest_result',
          strategyName: result.strategyName,
          symbol: result.symbol,
          hitRate: result.performance.hitRate,
          profitFactor: result.performance.profitFactor,
          totalPL: result.performance.totalPL,
          maxDrawdown: result.performance.maxDrawdown,
          totalTrades: result.performance.totalTrades,
          startDate: result.startDate.toISOString(),
          endDate: result.endDate.toISOString(),
          content,
          rawData: JSON.stringify(result)
        }],
        ids: [resultId]
      });

      console.log(`✅ Stored backtest result: ${result.strategyName} on ${result.symbol} (${result.performance.hitRate}% hit rate)`);
    } catch (error) {
      console.error('❌ Failed to store backtest result:', error);
      throw error;
    }
  }

  async getStrategyResults(strategyName: string, symbol: string, limit: number = 10): Promise<BacktestResult[]> {
    await this.ensureInitialized();

    try {
      const query = `${strategyName} strategy results for ${symbol}`;
      const { embeddings } = await fastembed.doEmbed({ values: [query] });

      const searchResults = await this.memory.vector?.search({
        indexName: 'backtest_results',
        query: embeddings[0],
        limit: limit,
        threshold: 0.3
      });

      if (!searchResults || searchResults.length === 0) {
        console.log(`📋 No results found for ${strategyName} on ${symbol}`);
        return [];
      }

      const results: BacktestResult[] = [];
      for (const result of searchResults) {
        try {
          const parsed = JSON.parse(result.content);
          if (parsed.strategyName === strategyName && parsed.symbol === symbol) {
            results.push(parsed);
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse backtest result:', error);
        }
      }

      console.log(`📊 Found ${results.length} results for ${strategyName} on ${symbol}`);
      return results.sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime());

    } catch (error) {
      console.error('❌ Failed to get strategy results:', error);
      return [];
    }
  }

  async findProfitableStrategies(minHitRate: number = 60, minProfitFactor: number = 1.5): Promise<BacktestResult[]> {
    await this.ensureInitialized();

    try {
      const query = `Profitable trading strategies with high hit rate and profit factor`;
      const { embeddings } = await fastembed.doEmbed({ values: [query] });

      const results = await this.memory.vector?.query({
        indexName: 'backtest_results',
        queryVector: embeddings[0],
        topK: 50,
        includeVector: false
      });

      if (!results) return [];

      return results
        .filter(result => {
          const metadata = result.metadata;
          return (metadata?.hitRate || 0) >= minHitRate && 
                 (metadata?.profitFactor || 0) >= minProfitFactor;
        })
        .map(result => JSON.parse(result.metadata?.rawData || '{}'))
        .sort((a, b) => b.performance.profitFactor - a.performance.profitFactor)
        .slice(0, 20);
    } catch (error) {
      console.error('❌ Failed to find profitable strategies:', error);
      return [];
    }
  }

  // Utility Methods
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
      // Force table creation immediately after initialization
      await this.createIndexes();
    }
  }

  async getStorageStats(): Promise<{
    marketDataCount: number;
    strategiesCount: number;
    backtestResultsCount: number;
    totalSize: string;
  }> {
    await this.ensureInitialized();

    // This would query the actual database for statistics
    // Implementation depends on LibSQL capabilities
    return {
      marketDataCount: 0,
      strategiesCount: 0,
      backtestResultsCount: 0,
      totalSize: '0 MB'
    };
  }

  async cleanup(olderThan: Date): Promise<void> {
    await this.ensureInitialized();
    
    // Implementation for cleaning up old data
    console.log(`🧹 Cleaning up data older than ${olderThan.toDateString()}`);
  }
}

// Export singleton instance
export const backtestingKnowledgeStore = new BacktestingKnowledgeStore();