#!/bin/bash

echo "🏦 Testing Enhanced Phemex Portfolio Agent via API..."
echo "🎯 Testing real-time market character analysis for your positions"
echo ""

# Test 1: Get current account positions
echo "📊 Test 1: Getting current account positions..."
curl -X POST http://localhost:4112/api/agent/phemexPortfolioAgent/run \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user", 
      "content": "Please analyze my current Phemex account positions and provide a summary of my portfolio status. Focus on my ADAUSDT, ETHUSDT, FETUSDT, and ATOMUSDT positions."
    }]
  }' | jq -r '.text' | head -50

echo ""
echo "✅ Position analysis completed"
echo ""

# Test 2: Real-time market character analysis
echo "📈 Test 2: Real-time market character analysis..."
curl -X POST http://localhost:4112/api/agent/phemexPortfolioAgent/run \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Analyze the real-time market character for my major positions (ADAUSDT, ETHUSDT, FETUSDT, ATOMUSDT) across multiple timeframes (15m, 1h, 1d). Identify any trend changes, reversal signals, or scaling opportunities based on current market conditions."
    }]
  }' | jq -r '.text' | head -50

echo ""
echo "✅ Market character analysis completed"
echo ""

# Test 3: Risk assessment and recommendations
echo "⚠️ Test 3: Risk assessment and portfolio recommendations..."
curl -X POST http://localhost:4112/api/agent/phemexPortfolioAgent/run \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Provide a comprehensive risk assessment of my portfolio. Focus on liquidation risks, optimal scaling opportunities, and any market character changes that suggest potential exit strategies. Remember this is a hedging strategy with intentionally negative positions."
    }]
  }' | jq -r '.text' | head -50

echo ""
echo "✅ Risk assessment completed"
echo ""

echo "🎉 Phemex Portfolio Agent test completed!"
echo "🔧 The agent now has access to:"
echo "   ✅ Real-time Phemex account data (USDM perps)"
echo "   ✅ Live crypto market data (Phemex + Kraken)"
echo "   ✅ Multi-timeframe technical analysis"
echo "   ✅ Market character change detection"
echo "   ✅ Professional portfolio management advice"
