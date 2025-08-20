#!/bin/bash

echo "🔍 Testing ADA Market Character Analysis"
echo "========================================"
echo ""

# Test 1: Check if phemexPortfolioAgent exists
echo "1. Checking available agents..."
curl -s http://localhost:4111/api/agents | python3 -c "import sys, json; data = json.load(sys.stdin); print('Agents found:', ', '.join(data.keys()))"
echo ""

# Test 2: Try the agent through the API
echo "2. Testing market character analysis for ADA..."
echo ""

# Create a test request
curl -X POST http://localhost:4111/api/agent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "soneAgent",
    "messages": "Use the market character analysis tool to check ADAUSDT prices across all timeframes. Show me the exact prices for 15m, 1h, and 1d timeframes."
  }' 2>/dev/null | python3 -m json.tool

echo ""
echo "========================================"
echo "✅ Test complete!"
echo ""
echo "Expected: All timeframes should show ~$0.93"
echo "NOT: 1d=$0.69, 1h=$0.79, 15m=$0.90"