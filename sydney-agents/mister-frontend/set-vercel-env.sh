#!/bin/bash

echo "🔧 Setting Vercel Environment Variables..."
echo "=========================================="

# Set environment variables one by one
echo "Setting NEXT_PUBLIC_CARDANO_SERVICE_URL..."
echo "https://friendly-reprieve-production.up.railway.app" | vercel env add NEXT_PUBLIC_CARDANO_SERVICE_URL production

echo "Setting CARDANO_SERVICE_URL..."
echo "https://friendly-reprieve-production.up.railway.app" | vercel env add CARDANO_SERVICE_URL production

echo "Setting NEXT_PUBLIC_API_URL..."
echo "https://bridge-server-cjs-production.up.railway.app" | vercel env add NEXT_PUBLIC_API_URL production

echo "Setting NEXT_PUBLIC_MASTRA_API_URL..."
echo "https://substantial-scarce-magazin.mastra.cloud" | vercel env add NEXT_PUBLIC_MASTRA_API_URL production

echo "Setting NEXT_PUBLIC_BLOCKFROST_PROJECT_ID..."
echo "mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu" | vercel env add NEXT_PUBLIC_BLOCKFROST_PROJECT_ID production

echo "Setting BLOCKFROST_PROJECT_ID..."
echo "mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu" | vercel env add BLOCKFROST_PROJECT_ID production

echo "Setting RAILWAY_DB_HOST..."
echo "maglev.proxy.rlwy.net" | vercel env add RAILWAY_DB_HOST production

echo "Setting RAILWAY_DB_PORT..."
echo "12076" | vercel env add RAILWAY_DB_PORT production

echo "Setting RAILWAY_DB_NAME..."
echo "railway" | vercel env add RAILWAY_DB_NAME production

echo "Setting RAILWAY_DB_USER..."
echo "postgres" | vercel env add RAILWAY_DB_USER production

# For database password, we'll need to get it from .env.local
if [ -f ".env.local" ]; then
    DB_PASSWORD=$(grep "RAILWAY_DB_PASSWORD=" .env.local | cut -d'=' -f2)
    if [ ! -z "$DB_PASSWORD" ]; then
        echo "Setting RAILWAY_DB_PASSWORD..."
        echo "$DB_PASSWORD" | vercel env add RAILWAY_DB_PASSWORD production
    else
        echo "⚠️ RAILWAY_DB_PASSWORD not found in .env.local"
    fi
else
    echo "⚠️ .env.local file not found"
fi

echo "✅ Environment variables set!"
echo "🔄 Redeploying to apply changes..."
vercel --prod