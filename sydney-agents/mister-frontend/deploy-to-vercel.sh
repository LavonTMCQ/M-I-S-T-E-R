#!/bin/bash

echo "🚀 Preparing to deploy MISTER Frontend to Vercel"
echo "================================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

echo ""
echo "📋 Environment Variables Required:"
echo "=================================="
echo "You'll need to set these in Vercel Dashboard or use CLI:"
echo ""
echo "# Railway Cardano Service"
echo "CARDANO_SERVICE_URL=https://friendly-reprieve-production.up.railway.app"
echo "NEXT_PUBLIC_CARDANO_SERVICE_URL=https://friendly-reprieve-production.up.railway.app"
echo ""
echo "# Other Services"
echo "NEXT_PUBLIC_API_URL=https://bridge-server-cjs-production.up.railway.app"
echo "NEXT_PUBLIC_MASTRA_API_URL=https://substantial-scarce-magazin.mastra.cloud"
echo "NEXT_PUBLIC_CNT_API_URL=https://cnt-trading-api-production.up.railway.app"
echo "NEXT_PUBLIC_STRIKE_API_URL=https://bridge-server-cjs-production.up.railway.app"
echo ""
echo "# Blockfrost"
echo "NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu"
echo "BLOCKFROST_PROJECT_ID=mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu"
echo ""
echo "# Railway Database (Get from Railway Dashboard)"
echo "RAILWAY_DB_HOST=maglev.proxy.rlwy.net"
echo "RAILWAY_DB_PORT=12076"
echo "RAILWAY_DB_NAME=railway"
echo "RAILWAY_DB_USER=postgres"
echo "RAILWAY_DB_PASSWORD=<YOUR_RAILWAY_DB_PASSWORD>"
echo ""
echo "=================================="

# Test build locally first
echo ""
echo "🔧 Testing production build locally..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ Build successful!"
echo ""
echo "📦 Deploying to Vercel..."
echo ""
echo "Options:"
echo "1. Deploy to production: vercel --prod"
echo "2. Deploy preview: vercel"
echo ""
read -p "Deploy to production? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    vercel --prod
else
    vercel
fi