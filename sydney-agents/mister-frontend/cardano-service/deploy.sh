#!/bin/bash
echo "🚀 Deploying Cardano Service to Railway..."

# Check if Railway CLI is logged in
if ! railway status > /dev/null 2>&1; then
    echo "❌ Railway CLI not logged in. Please run: railway login"
    exit 1
fi

# Initialize Railway project if not exists
if [ ! -f .railway.json ]; then
    echo "📝 Initializing Railway project..."
    railway init --name "cardano-vault-service"
fi

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "🔍 Check status with: railway status"
echo "📋 View logs with: railway logs"
echo "🌐 Your service will be available at: https://your-service-name.railway.app"