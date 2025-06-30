#!/bin/bash

# 🚀 ADA Webhook Monitor Startup Script
# 
# This script starts the dedicated ADA webhook monitoring server
# for real-time TradingView alerts and ADA trading signals.

echo "🚀 Starting ADA Webhook Monitor..."
echo "📊 Port: 8080"
echo "🔊 Voice: Enabled"
echo "📡 WebSocket: Enabled"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if required packages are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing required packages..."
    npm install express ws
fi

# Start the ADA webhook server
echo "🎯 Launching ADA Webhook Monitor..."
node ada-webhook-server.cjs

echo "🛑 ADA Webhook Monitor stopped."
