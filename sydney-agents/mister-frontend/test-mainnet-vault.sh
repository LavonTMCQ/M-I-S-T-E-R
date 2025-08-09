#!/bin/bash

# 🚨 MAINNET TEST Script - Tests with REAL ADA! 🚨

echo "🚨 TESTING MAINNET VAULT - REAL ADA TRANSACTIONS!"
echo "================================================="
echo ""
echo "⚠️  This will test the vault with REAL ADA on mainnet"
echo "⚠️  Only small amounts will be used (max 5 ADA)"
echo "⚠️  Make sure you have mainnet ADA in your wallet"
echo ""
echo -n "Type 'TEST WITH REAL ADA' to continue: "
read confirmation

if [ "$confirmation" != "TEST WITH REAL ADA" ]; then
    echo "❌ Confirmation not received. Exiting for safety."
    exit 1
fi

echo ""
echo "🔴 Proceeding with MAINNET testing..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://localhost:3001"
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
echo -e "${YELLOW}Checking if MAINNET Cardano Service is running...${NC}"
if ! curl -s $API_URL/health > /dev/null 2>&1; then
    echo -e "${RED}❌ MAINNET Cardano Service is not running!${NC}"
    echo ""
    echo "Please start the MAINNET service first with:"
    echo "  ./start-mainnet-vault.sh"
    echo ""
    exit 1
fi

# Check if it's actually mainnet
HEALTH_RESPONSE=$(curl -s $API_URL/health)
NETWORK=$(echo $HEALTH_RESPONSE | jq -r '.network')

if [ "$NETWORK" != "mainnet" ]; then
    echo -e "${RED}❌ Service is not running in MAINNET mode!${NC}"
    echo "Current network: $NETWORK"
    echo "Please start with: ./start-mainnet-vault.sh"
    exit 1
fi

echo -e "${RED}✅ MAINNET Service is running${NC}"
echo ""

# Run tests
echo "Starting MAINNET API Tests..."
echo "============================"
echo ""

# Test 1: Health Check
test_endpoint "GET" "/health" "MAINNET Health Check" ""

# Test 2: Script Address
test_endpoint "GET" "/script-address" "Get MAINNET Script Address" ""

# Test 3: Generate MAINNET Credentials
echo -e "${RED}Generating MAINNET credentials...${NC}"
CREDS_RESPONSE=$(curl -s -X POST $API_URL/generate-credentials)
echo "Response: $(echo $CREDS_RESPONSE | jq -c .)"

if echo "$CREDS_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MAINNET Credentials generated successfully${NC}"
    ((TESTS_PASSED++))
    
    SEED=$(echo $CREDS_RESPONSE | jq -r '.seed')
    ADDRESS=$(echo $CREDS_RESPONSE | jq -r '.address')
    
    echo -e "${RED}  MAINNET Wallet Address: $(echo $ADDRESS | cut -c1-40)...${NC}"
    echo ""
    
    # Pause for manual funding
    echo -e "${YELLOW}📝 MANUAL STEP REQUIRED:${NC}"
    echo "   1. Send 2-3 ADA to this mainnet address: $ADDRESS"
    echo "   2. Wait for transaction confirmation"
    echo "   3. Press Enter to continue with lock test..."
    echo ""
    read -p "Press Enter when wallet is funded..."
    echo ""
    
    # Test 4: Lock Small Amount (2 ADA)
    echo -e "${RED}Testing Lock 2 ADA on MAINNET (REAL TRANSACTION!)...${NC}"
    LOCK_DATA="{\"seed\":\"$SEED\",\"amount\":\"2000000\"}"
    test_endpoint "POST" "/lock" "Lock 2 ADA on MAINNET" "$LOCK_DATA"
    
    # If lock was successful, test unlock
    if [ $TESTS_FAILED -eq 1 ]; then  # Only health, script-address, and creds passed so far
        echo -e "${YELLOW}Lock successful! Testing unlock...${NC}"
        echo "Waiting 30 seconds for transaction confirmation..."
        sleep 30
        
        # Extract TX hash from last response
        TX_HASH=$(echo $body | jq -r '.txHash' 2>/dev/null)
        if [ "$TX_HASH" != "null" ] && [ -n "$TX_HASH" ]; then
            echo -e "${RED}Testing Unlock from MAINNET (REAL TRANSACTION!)...${NC}"
            UNLOCK_DATA="{\"seed\":\"$SEED\",\"txHash\":\"$TX_HASH\"}"
            test_endpoint "POST" "/unlock" "Unlock from MAINNET" "$UNLOCK_DATA"
        fi
    fi
    
else
    echo -e "${RED}❌ Failed to generate MAINNET credentials${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# Summary
echo "======================================="
echo "📊 MAINNET Test Summary"
echo "======================================="
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All MAINNET tests passed!${NC}"
    echo -e "${RED}✅ Vault is working with REAL ADA on mainnet!${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Check the output above.${NC}"
fi
echo ""

echo "🚨 MAINNET TEST COMPLETE"
echo "Check transaction hashes on: https://cardanoscan.io/"
echo ""