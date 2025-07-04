# CASH Agent - Financial Analysis AI

## Overview

CASH is a sophisticated financial analysis agent designed to provide comprehensive insights across both traditional markets and cryptocurrency. Built on the Mastra framework, CASH serves as a unified interface for financial analysis by leveraging two specialized agents: MRS (traditional markets) and MISTER (cryptocurrency).

## Core Capabilities

### 🏦 Traditional Markets (via MRS Agent)
- **Stock Analysis**: Detailed analysis of individual stocks (AAPL, TSLA, SPY, etc.)
- **Options Strategies**: Complex options analysis and strategy recommendations
- **ETF Analysis**: Exchange-traded fund performance and sector analysis
- **Market Analysis**: Broad market trends, economic indicators, and sentiment
- **Earnings Data**: Company earnings reports and financial statements

### ₿ Cryptocurrency Markets (via MISTER Agent)
- **Crypto Analysis**: Comprehensive cryptocurrency analysis (BTC, ETH, ADA, etc.)
- **DeFi Protocols**: Decentralized finance protocol analysis and insights
- **Cardano Ecosystem**: Specialized focus on Cardano blockchain and related tokens
- **Blockchain Analysis**: On-chain data analysis and network metrics
- **Token Research**: Deep-dive analysis of specific cryptocurrency projects

### 🧠 Advanced Features
- **Memory System**: Persistent financial knowledge base and conversation memory
- **Multi-Market Analysis**: Compare and correlate traditional and crypto markets
- **Portfolio Analysis**: Analyze mixed portfolios containing both asset classes
- **Risk Assessment**: Comprehensive risk evaluation across all asset types
- **Knowledge Management**: Store and retrieve financial research and insights

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CASH Agent                           │
│                 (Financial Coordinator)                     │
├─────────────────────────────────────────────────────────────┤
│  • Multi-market analysis                                   │
│  • Portfolio coordination                                  │
│  • Risk assessment                                         │
│  • Knowledge management                                    │
│  • Memory persistence                                      │
└─────────────────┬───────────────────────┬───────────────────┘
                  │                       │
        ┌─────────▼─────────┐   ┌─────────▼─────────┐
        │    MRS Agent      │   │   MISTER Agent    │
        │ (Traditional)     │   │ (Cryptocurrency)  │
        ├───────────────────┤   ├───────────────────┤
        │ • Stocks          │   │ • Bitcoin         │
        │ • Options         │   │ • Ethereum        │
        │ • ETFs            │   │ • Cardano (ADA)   │
        │ • Bonds           │   │ • DeFi Protocols  │
        │ • Commodities     │   │ • Token Analysis  │
        │ • Economic Data   │   │ • Blockchain Data │
        └───────────────────┘   └───────────────────┘
```

## Key Tools and Functions

### Agent Communication Tools
- **callMRSAgent**: Direct communication with MRS for traditional market analysis
- **callMISTERAgent**: Direct communication with MISTER for cryptocurrency analysis

### Analysis Tools
- **compareMarkets**: Compare traditional vs cryptocurrency markets
- **analyzePortfolio**: Analyze mixed portfolios across asset classes

### Knowledge Management
- **addFinancialKnowledge**: Store financial research and insights
- **searchFinancialKnowledge**: Retrieve relevant financial information

### Memory System
- **Advanced Memory**: Persistent conversation and financial context
- **User Profiles**: Track investment preferences and risk tolerance
- **Portfolio Tracking**: Monitor holdings and performance over time

## Usage Examples

### Basic Stock Analysis
```javascript
// Request stock analysis via CASH
"Can you analyze Apple (AAPL) stock? I'm looking for technical analysis and recent performance."
```

### Cryptocurrency Analysis
```javascript
// Request crypto analysis via CASH
"What's your analysis of Cardano (ADA)? Include recent developments and price outlook."
```

### Multi-Market Comparison
```javascript
// Compare traditional and crypto markets
"Compare Tesla (TSLA) stock performance with Bitcoin (BTC) over the last month."
```

### Portfolio Analysis
```javascript
// Analyze mixed portfolio
"Analyze my portfolio: AAPL, MSFT, SPY for stocks and BTC, ETH, ADA for crypto. What's the risk assessment?"
```

## API Access

### Mastra API Endpoint
```
POST http://localhost:4112/api/agents/cashAgent/generate
```

### Request Format
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Your financial analysis request"
    }
  ],
  "resourceId": "user-identifier",
  "threadId": "conversation-thread"
}
```

### Response Format
```json
{
  "text": "CASH agent response with financial analysis",
  "toolCalls": [],
  "toolResults": [],
  "finishReason": "stop",
  "usage": {
    "promptTokens": 1679,
    "completionTokens": 331,
    "totalTokens": 2010
  }
}
```

## Integration Details

### Local Agent Communication
- **MRS Agent**: `http://localhost:4111/api/agents/MRSAgent/generate`
- **MISTER Agent**: `http://localhost:4111/api/agents/MISTERAgent/generate`

### Memory Storage
- **Database**: LibSQL for conversation history
- **Vector Store**: LibSQL Vector for semantic search
- **Embeddings**: FastEmbed for local embedding generation

### Error Handling
- **Retry Logic**: Automatic retry with exponential backoff
- **Graceful Degradation**: Fallback responses when agents unavailable
- **Timeout Management**: Configurable timeouts for external calls

## Best Practices

### For Users
1. **Be Specific**: Provide clear symbols and analysis requirements
2. **Context Matters**: Include timeframes and specific goals
3. **Risk Awareness**: Always consider your risk tolerance
4. **Diversification**: Use CASH for multi-asset portfolio analysis

### For Developers
1. **Memory Usage**: Leverage the memory system for context
2. **Error Handling**: Implement proper error handling for agent calls
3. **Rate Limiting**: Respect API rate limits for external agents
4. **Logging**: Monitor agent performance and response times

## Limitations and Disclaimers

### Important Notes
- **Not Financial Advice**: CASH is an analysis tool, not a licensed financial advisor
- **Research Required**: Always conduct your own research before investing
- **Market Volatility**: Financial markets are inherently volatile and unpredictable
- **Data Accuracy**: Analysis is based on available data which may have delays

### Technical Limitations
- **Agent Availability**: Dependent on MRS and MISTER agent availability
- **Rate Limits**: Subject to rate limits from underlying data sources
- **Market Hours**: Some data may be limited during market closures
- **Network Dependency**: Requires network connectivity for agent communication

## Future Enhancements

### Planned Features
- **Real-time Alerts**: Market movement notifications
- **Advanced Charting**: Technical analysis with visual charts
- **Backtesting**: Historical strategy performance testing
- **Social Sentiment**: Integration with social media sentiment analysis
- **News Integration**: Real-time financial news analysis

### Potential Integrations
- **Trading Platforms**: Direct integration with brokerage APIs
- **Data Providers**: Enhanced data feeds for better analysis
- **Notification Systems**: Email/SMS alerts for portfolio changes
- **Mobile Interface**: Dedicated mobile application

---

**Created**: June 17, 2025  
**Version**: 1.0.0  
**Framework**: Mastra TypeScript Agent Framework  
**Dependencies**: MRS Agent, MISTER Agent, LibSQL, FastEmbed
