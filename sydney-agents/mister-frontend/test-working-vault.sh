#!/bin/bash

# Test script for the WORKING Cardano Vault Implementation
# This tests all endpoints of the standalone Cardano service

echo "🧪 Testing MRSTRIKE Working Vault Implementation"
echo "==============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base URL
API_URL="http://localhost:3001"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    
    echo -e "${BLUE}Testing: $description${NC}"
    echo "  Method: $method"
    echo "  Endpoint: $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" $API_URL$endpoint)
    else
        if [ -z "$data" ]; then
            response=$(curl -s -X $method -w "\n%{http_code}" $API_URL$endpoint)
        else
            response=$(curl -s -X $method -H "Content-Type: application/json" -d "$data" -w "\n%{http_code}" $API_URL$endpoint)
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "  ${GREEN}✅ Success (HTTP $http_code)${NC}"
        echo "  Response: $(echo $body | jq -c . 2>/dev/null || echo $body)"
        ((TESTS_PASSED++))
    else
        echo -e "  ${RED}❌ Failed (HTTP $http_code)${NC}"
        echo "  Response: $body"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Check if service is running
echo -e "${YELLOW}Checking if Cardano Service is running...${NC}"
if ! curl -s $API_URL/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Cardano Service is not running!${NC}"
    echo ""
    echo "Please start the service first with:"
    echo "  ./start-working-vault.sh"
    echo ""
    echo "Or manually with:"
    echo "  cd cardano-service && npm start"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ Service is running${NC}"
echo ""

# Run tests
echo "Starting API Tests..."
echo "===================="
echo ""

# Test 1: Health Check
test_endpoint "GET" "/health" "Health Check" ""

# Test 2: Script Address
test_endpoint "GET" "/script-address" "Get Script Address" ""

# Test 3: Generate Credentials
echo -e "${YELLOW}Generating test credentials...${NC}"
CREDS_RESPONSE=$(curl -s -X POST $API_URL/generate-credentials)
echo "Response: $(echo $CREDS_RESPONSE | jq -c .)"

if echo "$CREDS_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Credentials generated successfully${NC}"
    ((TESTS_PASSED++))
    
    # Extract seed for further tests
    SEED=$(echo $CREDS_RESPONSE | jq -r '.seed')
    ADDRESS=$(echo $CREDS_RESPONSE | jq -r '.address')
    
    echo "  Test Wallet Address: $(echo $ADDRESS | cut -c1-30)..."
    echo ""
    
    # Test 4: Lock Funds (will fail without testnet ADA)
    echo -e "${YELLOW}Testing Lock Funds (expected to fail without testnet ADA)...${NC}"
    LOCK_DATA="{\"seed\":\"$SEED\",\"amount\":\"1000000\"}"
    test_endpoint "POST" "/lock" "Lock Funds (1 ADA)" "$LOCK_DATA"
    
else
    echo -e "${RED}❌ Failed to generate credentials${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# Summary
echo "======================================="
echo "📊 Test Summary"
echo "======================================="
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All basic tests passed!${NC}"
    echo ""
    echo "Note: Lock/Unlock operations require:"
    echo "  1. Blockfrost API key in environment"
    echo "  2. Testnet ADA in the generated wallet"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Check the output above.${NC}"
fi
echo ""

# Show how to get testnet ADA
echo "💡 To fully test the vault:"
echo "   1. Set BLOCKFROST_TESTNET_PROJECT_ID in .env"
echo "   2. Get testnet ADA from: https://testnet.faucet.cardano.org/"
echo "   3. Send ADA to the generated test address"
echo "   4. Run this test again"
echo ""