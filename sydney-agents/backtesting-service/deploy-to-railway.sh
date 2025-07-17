#!/bin/bash

# FreqTrade + VectorBT Backtesting Service
# Railway Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log "🚀 FREQTRADE + VECTORBT RAILWAY DEPLOYMENT"
log "=========================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    error "Railway CLI not found. Install with: npm install -g @railway/cli"
fi

# Check if we're in the right directory
if [ ! -f "app.py" ]; then
    error "app.py not found. Run this script from the backtesting-service directory"
fi

# Check if user is logged in to Railway
log "🔐 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    warning "Not logged in to Railway. Please login:"
    railway login
fi

success "Railway authentication verified"

# Create or connect to Railway project
log "📦 Setting up Railway project..."

# Check if railway.json exists
if [ ! -f "railway.json" ]; then
    warning "railway.json not found. Creating new project..."
    railway init
else
    log "Using existing Railway configuration"
fi

# Set environment variables
log "⚙️ Setting environment variables..."

railway variables set FLASK_ENV=production
railway variables set PYTHONPATH=/app
railway variables set LOG_LEVEL=INFO

success "Environment variables configured"

# Deploy to Railway
log "🚀 Deploying to Railway..."

railway up --detach

if [ $? -eq 0 ]; then
    success "Deployment initiated successfully!"
else
    error "Deployment failed"
fi

# Get deployment URL
log "🌐 Getting deployment URL..."
DEPLOYMENT_URL=$(railway domain)

if [ -n "$DEPLOYMENT_URL" ]; then
    success "Service deployed at: $DEPLOYMENT_URL"
    
    # Test health endpoint
    log "🏥 Testing health endpoint..."
    sleep 30  # Wait for deployment to be ready
    
    if curl -f "$DEPLOYMENT_URL/health" > /dev/null 2>&1; then
        success "Health check passed!"
    else
        warning "Health check failed - service may still be starting"
    fi
    
    # Display useful endpoints
    log ""
    log "📋 AVAILABLE ENDPOINTS:"
    log "   Health Check: $DEPLOYMENT_URL/health"
    log "   Strategies: $DEPLOYMENT_URL/strategies"
    log "   Backtest: $DEPLOYMENT_URL/backtest (POST)"
    log "   Fee Analysis: $DEPLOYMENT_URL/fee-analysis (POST)"
    
else
    warning "Could not retrieve deployment URL"
fi

# Show logs
log ""
log "📊 Recent deployment logs:"
railway logs --tail 20

log ""
success "🎉 Railway deployment completed!"
log ""
log "🔧 NEXT STEPS:"
log "   1. Test the service endpoints"
log "   2. Update frontend to use Railway URL"
log "   3. Monitor logs: railway logs"
log "   4. Scale if needed: railway scale"
log ""
log "💡 USEFUL COMMANDS:"
log "   • View logs: railway logs"
log "   • Check status: railway status"
log "   • Redeploy: railway up"
log "   • Open dashboard: railway open"
