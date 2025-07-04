# CASH Agent Quick Start Guide

## 🚀 Getting Started with CASH

CASH is your intelligent financial analysis agent that combines traditional market expertise (MRS) with cryptocurrency insights (MISTER) to provide comprehensive financial analysis.

## ✅ Prerequisites

1. **Mastra Server Running**: Ensure the Mastra server is running on `http://localhost:4112`
2. **MRS & MISTER Agents**: Both agents should be available on `http://localhost:4111`
3. **Environment Setup**: All necessary API keys configured

## 🎯 Quick Test

Run this simple test to verify CASH is working:

```bash
# From the sydney-agents directory
node misterlabs/tests/test-cash-basic.js
```

Expected output:
```
💰 CASH Agent: ✅ Working
🎉 CASH agent is operational!
```

## 💬 Basic Usage Examples

### 1. Stock Analysis
```
"Analyze Apple (AAPL) stock. What's the current outlook?"
```

### 2. Cryptocurrency Analysis  
```
"Give me an analysis of Cardano (ADA). Include recent developments."
```

### 3. Market Comparison
```
"Compare Tesla (TSLA) with Bitcoin (BTC) performance this month."
```

### 4. Portfolio Analysis
```
"Analyze my portfolio: AAPL, MSFT for stocks and BTC, ETH for crypto."
```

## 🌐 Access Methods

### Mastra Playground (Recommended)
1. Open `http://localhost:4112` in your browser
2. Select "CASH" from the agent dropdown
3. Start chatting with your financial questions

### Direct API Calls
```bash
curl -X POST http://localhost:4112/api/agents/cashAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user", 
        "content": "Hello CASH! Analyze SPY ETF."
      }
    ],
    "resourceId": "my-user-id",
    "threadId": "my-conversation"
  }'
```

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:4112/api/agents/cashAgent/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: 'Analyze the current market sentiment for tech stocks'
      }
    ],
    resourceId: 'user-123',
    threadId: `conversation-${Date.now()}`
  })
});

const data = await response.json();
console.log(data.text);
```

## 🔧 Key Features

### Multi-Agent Coordination
- **MRS Agent**: Handles stocks, options, ETFs, traditional markets
- **MISTER Agent**: Handles crypto, DeFi, Cardano ecosystem
- **CASH**: Coordinates between both and provides unified analysis

### Memory System
- Remembers your preferences and portfolio context
- Builds a knowledge base of your financial interests
- Maintains conversation history for better context

### Advanced Analysis
- **Risk Assessment**: Evaluates investment risks across asset classes
- **Portfolio Optimization**: Suggests improvements to your holdings
- **Market Correlation**: Identifies relationships between different assets
- **Trend Analysis**: Spots emerging patterns and opportunities

## 📊 Sample Conversations

### Getting Market Overview
```
User: "What's the current market sentiment?"

CASH: "Let me check both traditional and crypto markets for you...

📈 **Traditional Markets (via MRS):**
- S&P 500 showing bullish momentum
- Tech sector leading gains
- Low volatility environment

₿ **Crypto Markets (via MISTER):**
- Bitcoin consolidating above key support
- Cardano ecosystem showing development activity
- DeFi protocols gaining traction

**Overall Sentiment**: Cautiously optimistic with opportunities in both sectors."
```

### Portfolio Analysis
```
User: "Analyze my portfolio: 40% AAPL, 30% BTC, 20% SPY, 10% ADA"

CASH: "Analyzing your mixed portfolio across traditional and crypto assets...

**Portfolio Breakdown:**
- Traditional: 60% (AAPL 40%, SPY 20%)
- Cryptocurrency: 40% (BTC 30%, ADA 10%)

**Risk Assessment:**
- Moderate to high risk due to crypto allocation
- Good diversification between growth (AAPL) and broad market (SPY)
- Crypto portion well-balanced between established (BTC) and emerging (ADA)

**Recommendations:**
- Consider adding some defensive positions
- Monitor correlation between AAPL and BTC during market stress
- ADA allocation appropriate for Cardano ecosystem exposure"
```

## 🛠️ Troubleshooting

### Common Issues

**CASH Agent Not Found**
```bash
# Check if server is running
curl http://localhost:4112/api/agents
# Look for "cashAgent" in the response
```

**MRS/MISTER Connectivity Issues**
```bash
# Test MRS agent
curl -X POST http://localhost:4111/api/agents/MRSAgent/generate \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Test"}],"resourceId":"test","threadId":"test"}'

# Test MISTER agent  
curl -X POST http://localhost:4111/api/agents/MISTERAgent/generate \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Test"}],"resourceId":"test","threadId":"test"}'
```

**Slow Response Times**
- MRS and MISTER agents may take time for complex analysis
- Use specific, focused questions for faster responses
- Consider breaking complex requests into smaller parts

### Getting Help

1. **Check Server Logs**: Look at the Mastra server console for error messages
2. **Test Individual Agents**: Verify MRS and MISTER are responding
3. **Review Documentation**: Check the full CASH_AGENT_OVERVIEW.md
4. **Run Test Scripts**: Use the provided test files to diagnose issues

## 🎯 Next Steps

1. **Explore Advanced Features**: Try portfolio analysis and market comparisons
2. **Build Knowledge Base**: Use CASH's memory system to store your research
3. **Integrate with Workflows**: Incorporate CASH into your investment research process
4. **Monitor Performance**: Track how CASH's insights perform over time

## 📚 Additional Resources

- **Full Documentation**: `misterlabs/docs/cash/CASH_AGENT_OVERVIEW.md`
- **Test Files**: `misterlabs/tests/test-cash-*.js`
- **MRS Documentation**: `misterlabs/docs/general/`
- **MISTER Capabilities**: `MISTER_AGENT_CAPABILITIES.md`

---

**Happy Trading with CASH! 💰📈₿**
