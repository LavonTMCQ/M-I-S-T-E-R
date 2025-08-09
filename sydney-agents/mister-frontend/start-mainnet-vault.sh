#!/bin/bash

# 🚨 MAINNET VAULT - USES REAL ADA! 🚨
# This script starts the vault service in MAINNET mode

echo "🚨 STARTING MAINNET VAULT - REAL ADA WILL BE USED!"
echo "=================================================="
echo ""
echo "⚠️  WARNING: This will use REAL ADA on Cardano mainnet!"
echo "⚠️  Maximum transaction limit: 5 ADA (enforced by code)"
echo "⚠️  Make sure you understand the risks before proceeding"
echo ""
echo -n "Type 'I UNDERSTAND' to continue: "
read confirmation

if [ "$confirmation" != "I UNDERSTAND" ]; then
    echo "❌ Confirmation not received. Exiting for safety."
    exit 1
fi

echo ""
echo "🔴 Proceeding with MAINNET configuration..."
echo ""

# Check if mainnet env exists
if [ ! -f "cardano-service/.env.mainnet" ]; then
    echo "❌ Missing cardano-service/.env.mainnet file!"
    echo "Please create it with your BLOCKFROST_MAINNET_PROJECT_ID"
    exit 1
fi

# Copy mainnet env
cp cardano-service/.env.mainnet cardano-service/.env

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to start the Cardano service
start_cardano_service() {
    echo -e "${RED}🚨 Starting MAINNET Cardano Service (Port 3001)...${NC}"
    cd cardano-service
    
    if [ ! -d "node_modules" ]; then
        echo "Installing Cardano service dependencies..."
        npm install
    fi
    
    npm start &
    CARDANO_PID=$!
    echo -e "${RED}⚠️  MAINNET Cardano Service started with PID: $CARDANO_PID${NC}"
    cd ..
    sleep 3
}

# Function to start Next.js
start_nextjs() {
    echo -e "${YELLOW}🌐 Starting Next.js Frontend (Port 3000)...${NC}"
    
    if [ ! -d "node_modules" ]; then
        echo "Installing Next.js dependencies..."
        npm install
    fi
    
    npm run dev &
    NEXTJS_PID=$!
    echo -e "${GREEN}✅ Next.js started with PID: $NEXTJS_PID${NC}"
    sleep 5
}

# Function to test the services
test_services() {
    echo ""
    echo -e "${YELLOW}🧪 Testing MAINNET Services...${NC}"
    echo "------------------------------"
    
    echo -n "Testing MAINNET Cardano Service: "
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Healthy${NC}"
        curl -s http://localhost:3001/health | jq .
    else
        echo -e "${RED}❌ Not responding${NC}"
    fi
    
    echo ""
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down MAINNET services...${NC}"
    
    if [ ! -z "$CARDANO_PID" ]; then
        kill $CARDANO_PID 2>/dev/null
        echo "Stopped Cardano Service"
    fi
    
    if [ ! -z "$NEXTJS_PID" ]; then
        kill $NEXTJS_PID 2>/dev/null
        echo "Stopped Next.js"
    fi
    
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap cleanup EXIT INT TERM

# Main execution
echo "🔧 Setting up MAINNET Vault Environment..."
echo ""

# Kill existing processes
echo "Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 2

# Start services
start_cardano_service
start_nextjs
test_services

# Display access information
echo ""
echo "======================================="
echo -e "${RED}🚨 MAINNET VAULT IS READY - REAL ADA!${NC}"
echo "======================================="
echo ""
echo "📍 Access Points:"
echo "   • Frontend: http://localhost:3000/working-aiken-vault"
echo "   • MAINNET API: http://localhost:3001"
echo ""
echo "⚠️  SAFETY REMINDERS:"
echo "   • Maximum 5 ADA per transaction (enforced by code)"
echo "   • This uses REAL ADA on Cardano mainnet"
echo "   • Start with minimal amounts (1-2 ADA)"
echo "   • Verify script address before sending funds"
echo ""
echo "📝 Quick Test Commands:"
echo "   curl http://localhost:3001/health"
echo "   curl -X POST http://localhost:3001/generate-credentials"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep running
while true; do
    sleep 1
done