/**
 * Railway PostgreSQL Database Client
 * 
 * Production-ready PostgreSQL client for agent wallet system
 * Connects to Railway PostgreSQL service with connection pooling
 */

import { Pool, PoolClient, QueryResult } from 'pg';

export interface DatabaseClient {
  query: (text: string, params?: any[]) => Promise<QueryResult>;
  insert: (table: string, data: any) => Promise<any>;
  select: (table: string, conditions?: any) => Promise<any[]>;
  update: (table: string, data: any, conditions: any) => Promise<any>;
  delete: (table: string, conditions: any) => Promise<any>;
  getClient: () => Promise<PoolClient>;
  close: () => Promise<void>;
}

export class RailwayPostgreSQLClient implements DatabaseClient {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor(connectionConfig?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
  }) {
    const config = connectionConfig || {
      host: process.env.RAILWAY_POSTGRES_HOST || process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.RAILWAY_POSTGRES_PORT || process.env.POSTGRES_PORT || '5432'),
      database: process.env.RAILWAY_POSTGRES_DB || process.env.POSTGRES_DB || 'mrstrike_agents',
      user: process.env.RAILWAY_POSTGRES_USER || process.env.POSTGRES_USER || 'postgres',
      password: process.env.RAILWAY_POSTGRES_PASSWORD || process.env.POSTGRES_PASSWORD,
      ssl: process.env.NODE_ENV === 'production'
    };

    console.log('🗄️ Initializing Railway PostgreSQL connection...');
    console.log('📊 Config:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      ssl: config.ssl,
      hasPassword: !!config.password
    });

    this.pool = new Pool({
      ...config,
      // Connection pool settings
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
      maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('❌ Unexpected database pool error:', err);
    });

    this.pool.on('connect', () => {
      if (!this.isConnected) {
        console.log('✅ Railway PostgreSQL pool connected');
        this.isConnected = true;
      }
    });

    this.pool.on('remove', () => {
      console.log('🔄 Client removed from pool');
    });
  }

  /**
   * Execute raw SQL query
   */
  async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      console.log('🔍 Database Query:', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error('❌ Database Query Error:', {
        query: text.substring(0, 100),
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Insert data into table
   */
  async insert(table: string, data: any): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')}) 
      VALUES (${placeholders}) 
      RETURNING *
    `;
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  /**
   * Select data from table
   */
  async select(table: string, conditions?: any): Promise<any[]> {
    let query = `SELECT * FROM ${table}`;
    let values: any[] = [];

    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(' AND ');
      
      query += ` WHERE ${whereClause}`;
      values = Object.values(conditions);
    }

    const result = await this.query(query, values);
    return result.rows;
  }

  /**
   * Update data in table
   */
  async update(table: string, data: any, conditions: any): Promise<any> {
    const setClause = Object.keys(data)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const whereClause = Object.keys(conditions)
      .map((key, index) => `${key} = $${index + 1 + Object.keys(data).length}`)
      .join(' AND ');

    const query = `
      UPDATE ${table} 
      SET ${setClause}
      WHERE ${whereClause} 
      RETURNING *
    `;

    const values = [...Object.values(data), ...Object.values(conditions)];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete data from table
   */
  async delete(table: string, conditions: any): Promise<any> {
    const whereClause = Object.keys(conditions)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');

    const query = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;
    const values = Object.values(conditions);
    
    const result = await this.query(query, values);
    return result.rows;
  }

  /**
   * Get a client from the pool (for transactions)
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    console.log('🔒 Closing Railway PostgreSQL connection pool...');
    await this.pool.end();
    this.isConnected = false;
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{
    status: string;
    connected: boolean;
    poolSize: number;
    idleCount: number;
    waitingCount: number;
  }> {
    try {
      // Test query
      await this.query('SELECT 1 as health_check');
      
      return {
        status: 'healthy',
        connected: true,
        poolSize: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return {
        status: 'unhealthy',
        connected: false,
        poolSize: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };
    }
  }

  /**
   * Execute database schema setup
   */
  async setupSchema(): Promise<void> {
    console.log('🏗️ Setting up database schema...');
    
    try {
      // Enable UUID extension
      await this.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      
      console.log('✅ Database schema setup complete');
    } catch (error) {
      console.error('❌ Database schema setup failed:', error);
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Singleton instance
let dbInstance: RailwayPostgreSQLClient | null = null;

/**
 * Get or create Railway PostgreSQL client instance
 */
export function getRailwayDB(): RailwayPostgreSQLClient {
  if (!dbInstance) {
    dbInstance = new RailwayPostgreSQLClient();
  }
  return dbInstance;
}

/**
 * Initialize Railway PostgreSQL client with custom config
 */
export function createRailwayDB(config?: {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
}): RailwayPostgreSQLClient {
  return new RailwayPostgreSQLClient(config);
}

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const db = getRailwayDB();
    const health = await db.healthCheck();
    console.log('🔍 Database Connection Test:', health);
    return health.connected;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}