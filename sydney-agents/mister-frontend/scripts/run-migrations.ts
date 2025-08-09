#!/usr/bin/env npx tsx

/**
 * Database Migration Runner
 * Executes Railway PostgreSQL database migrations
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { runAgentWalletMigrations } from '../src/lib/database/migrations';

async function main(): Promise<void> {
  console.log('🏗️ Running Railway PostgreSQL migrations...');
  
  try {
    await runAgentWalletMigrations();
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();