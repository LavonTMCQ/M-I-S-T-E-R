#!/bin/bash

# Agent Vault V2 Development Startup Script
# Ensures proper setup and runs the frontend in development mode

echo "🚀 Starting MISTER Frontend for Agent Vault V2 Testing"
echo "=================================================="
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Check environment variables
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "Please ensure .env.local exists with proper configuration"
    exit 1
fi
echo "✅ Environment configuration found"

# Display API endpoints
echo ""
echo "📡 Connected Services:"
echo "   Bridge Server: https://bridge-server-cjs-production.up.railway.app"
echo "   Mastra Cloud: https://substantial-scarce-magazin.mastra.cloud"
echo "   CNT Trading: https://cnt-trading-api-production.up.railway.app"
echo "   Blockfrost: Mainnet (configured)"
echo ""

# Display smart contract info
echo "📜 Agent Vault V2 Smart Contract:"
echo "   Address: addr1w8hksl7jnqst7e58ypcn4d6k68d6z0rw7hkuch5wad7d07c3zn2nj"
echo "   Script Hash: ef687fd29820bf668720713ab756d1dba13c6ef5edcc5e8eeb7cd7fb"
echo "   Network: Mainnet"
echo ""

# CIP compliance notice
echo "📋 Cardano CIP Compliance:"
echo "   ✅ CIP-30: dApp-Wallet Communication Bridge"
echo "   ✅ CIP-31: Reference Inputs Support"
echo "   ✅ CIP-32: Inline Datums Support"
echo "   ✅ CIP-40: Collateral Output Support"
echo ""

# Wallet support
echo "💳 Supported Wallets:"
echo "   • Vespr (Primary - Recommended)"
echo "   • Nami"
echo "   • Eternl"
echo "   • Flint"
echo "   • Typhon"
echo ""

# Start the development server
echo "🔧 Starting Next.js development server with Turbopack..."
echo "=================================================="
echo ""
echo "📌 Access the application at: http://localhost:3000"
echo ""
echo "🧪 Testing Pages:"
echo "   • Agent Vault V2: http://localhost:3000/agent-vault-v2"
echo "   • Trading Interface: http://localhost:3000/trading"
echo "   • Test Strike: http://localhost:3000/test-strike"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the development server
npm run dev