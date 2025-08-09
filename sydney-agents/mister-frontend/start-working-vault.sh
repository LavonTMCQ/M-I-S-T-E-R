#!/bin/bash

# MRSTRIKE Working Vault - Startup Script
# This is the ONLY working implementation for Cardano operations

echo "🚀 Starting MRSTRIKE Working Vault Implementation"
echo "================================================"
echo ""
echo "⚠️  IMPORTANT: This is the ONLY working Cardano implementation!"
echo "   All other vault implementations have been deprecated."
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to start the Cardano service
start_cardano_service() {
    echo -e "${YELLOW}📡 Starting Cardano Service (Port 3001)...${NC}"
    cd cardano-service
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing Cardano service dependencies..."
        npm install
    fi
    
    # Start the service
    npm start &
    CARDANO_PID=$!
    echo -e "${GREEN}✅ Cardano Service started with PID: $CARDANO_PID${NC}"
    cd ..
    sleep 3
}

# Function to start Next.js
start_nextjs() {
    echo -e "${YELLOW}🌐 Starting Next.js Frontend (Port 3000)...${NC}"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing Next.js dependencies..."
        npm install
    fi
    
    # Start Next.js
    npm run dev &
    NEXTJS_PID=$!
    echo -e "${GREEN}✅ Next.js started with PID: $NEXTJS_PID${NC}"
    sleep 5
}

# Function to test the services
test_services() {
    echo ""
    echo -e "${YELLOW}🧪 Testing Services...${NC}"
    echo "------------------------"
    
    # Test Cardano service health
    echo -n "Testing Cardano Service: "
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
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    
    if [ ! -z "$CARDANO_PID" ]; then
        kill $CARDANO_PID 2>/dev/null
        echo "Stopped Cardano Service"
    fi
    
    if [ ! -z "$NEXTJS_PID" ]; then
        kill $NEXTJS_PID 2>/dev/null
        echo "Stopped Next.js"
    fi
    
    # Also kill any remaining node processes on the ports
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up trap for cleanup on exit
trap cleanup EXIT INT TERM

# Main execution
echo "🔧 Setting up Working Vault Environment..."
echo ""

# Kill any existing processes on our ports
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
echo "========================================="
echo -e "${GREEN}✨ MRSTRIKE Working Vault is Ready!${NC}"
echo "========================================="
echo ""
echo "📍 Access Points:"
echo "   • Frontend: http://localhost:3000/working-aiken-vault"
echo "   • Cardano Service API: http://localhost:3001"
echo ""
echo "📝 Available API Endpoints:"
echo "   • GET  http://localhost:3001/health"
echo "   • POST http://localhost:3001/generate-credentials"
echo "   • GET  http://localhost:3001/script-address"
echo "   • POST http://localhost:3001/lock"
echo "   • POST http://localhost:3001/unlock"
echo ""
echo "⚡ Quick Test Commands:"
echo "   curl http://localhost:3001/health"
echo "   curl -X POST http://localhost:3001/generate-credentials"
echo ""
echo -e "${YELLOW}⚠️  Note: You need a Blockfrost API key in .env for full functionality${NC}"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep the script running
while true; do
    sleep 1
done