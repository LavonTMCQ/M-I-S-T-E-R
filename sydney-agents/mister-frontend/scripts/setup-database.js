#!/usr/bin/env node

/**
 * Database Setup CLI
 * 
 * Command-line tool for Railway PostgreSQL setup and testing
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Load environment variables first
loadEnvLocal();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(title) {
  console.log('\n' + colorize('='.repeat(60), 'cyan'));
  console.log(colorize(`🚀 ${title}`, 'bright'));
  console.log(colorize('='.repeat(60), 'cyan') + '\n');
}

function printStep(step, description) {
  console.log(colorize(`${step}: ${description}`, 'blue'));
}

function printSuccess(message) {
  console.log(colorize(`✅ ${message}`, 'green'));
}

function printError(message) {
  console.log(colorize(`❌ ${message}`, 'red'));
}

function printWarning(message) {
  console.log(colorize(`⚠️ ${message}`, 'yellow'));
}

async function runCommand(command, description) {
  try {
    console.log(colorize(`\n🔧 ${description}...`, 'yellow'));
    const output = execSync(command, { 
      encoding: 'utf8', 
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

async function checkEnvironment() {
  printStep('Step 1', 'Checking Environment Variables');
  
  const requiredVars = [
    'RAILWAY_POSTGRES_HOST',
    'RAILWAY_POSTGRES_PASSWORD'
  ];

  const missing = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    printError('Missing required environment variables:');
    missing.forEach(varName => {
      console.log(`  - ${varName}`);
    });
    console.log('\n💡 Add these to your .env.local file:');
    console.log('   RAILWAY_POSTGRES_HOST=your-db-host.railway.app');
    console.log('   RAILWAY_POSTGRES_PASSWORD=your-password');
    return false;
  }

  printSuccess('All environment variables configured');
  return true;
}

async function quickTest() {
  printHeader('Railway PostgreSQL Quick Connection Test');
  
  if (!(await checkEnvironment())) {
    process.exit(1);
  }

  const result = await runCommand(
    'npx tsx src/lib/database/test-railway-integration.ts quick',
    'Testing database connection'
  );

  if (result.success) {
    printSuccess('Quick connection test completed');
    console.log(result.output);
  } else {
    printError('Quick connection test failed');
    console.log(result.output || result.error);
    process.exit(1);
  }
}

async function runMigrations() {
  printHeader('Railway PostgreSQL Database Setup');
  
  if (!(await checkEnvironment())) {
    process.exit(1);
  }

  printStep('Step 2', 'Running Database Migrations');
  
  // Create a temporary migration runner
  const migrationScript = `
import { runAgentWalletMigrations } from './src/lib/database/migrations';
async function run() {
  try {
    await runAgentWalletMigrations();
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}
run();
  `;

  const fs = require('fs');
  const tempFile = path.join(__dirname, '..', 'temp-migration.mjs');
  
  try {
    fs.writeFileSync(tempFile, migrationScript);
    
    const result = await runCommand(
      'node temp-migration.mjs',
      'Executing database migrations'
    );

    // Clean up temp file
    fs.unlinkSync(tempFile);

    if (result.success) {
      printSuccess('Database migrations completed');
      console.log(result.output);
    } else {
      printError('Database migrations failed');
      console.log(result.error);
      process.exit(1);
    }
  } catch (error) {
    printError('Migration setup failed: ' + error.message);
    process.exit(1);
  }
}

async function fullTest() {
  printHeader('Railway PostgreSQL Full Integration Test');
  
  if (!(await checkEnvironment())) {
    process.exit(1);
  }

  printStep('Step 2', 'Running Full Integration Test');
  
  const result = await runCommand(
    'npx tsx src/lib/database/test-railway-integration.ts',
    'Running comprehensive tests'
  );

  if (result.success) {
    printSuccess('Full integration test completed');
    console.log(result.output);
  } else {
    printError('Integration test failed');
    console.log(result.output || result.error);
    process.exit(1);
  }
}

async function showHelp() {
  printHeader('Database Setup CLI - Help');
  
  console.log(colorize('Available commands:', 'bright'));
  console.log('');
  console.log(colorize('npm run db:quick', 'green') + '     - Quick connection test');
  console.log(colorize('npm run db:migrate', 'green') + '   - Run database migrations');
  console.log(colorize('npm run db:test', 'green') + '     - Full integration test');
  console.log(colorize('npm run db:help', 'green') + '     - Show this help');
  console.log('');
  console.log(colorize('Setup Requirements:', 'bright'));
  console.log('1. Create a PostgreSQL database on Railway');
  console.log('2. Add connection details to .env.local:');
  console.log('   RAILWAY_POSTGRES_HOST=your-db-host.railway.app');
  console.log('   RAILWAY_POSTGRES_PASSWORD=your-password');
  console.log('3. Run npm run db:migrate to set up tables');
  console.log('4. Run npm run db:test to verify everything works');
  console.log('');
}

// Main CLI handler
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'quick':
      await quickTest();
      break;
    case 'migrate':
      await runMigrations();
      break;
    case 'test':
      await fullTest();
      break;
    case 'help':
    case '--help':
    case '-h':
      await showHelp();
      break;
    default:
      printError('Unknown command: ' + (command || 'none'));
      await showHelp();
      process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  printError('CLI error: ' + error.message);
  process.exit(1);
});