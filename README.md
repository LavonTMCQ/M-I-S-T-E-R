# M-I-S-T-E-R - Sydney's AI Agent System

A comprehensive Mastra-based AI agent system featuring Sone, an advanced personal assistant with voice capabilities, trading analysis, and financial integration.

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Google Cloud account (for voice services)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/LavonTMCQ/M-I-S-T-E-R.git
cd M-I-S-T-E-R
```

2. **Install dependencies:**
```bash
cd sydney-agents
npm install
```

3. **Environment Setup:**
The `.env` file is already included with API keys for immediate functionality:
- `GOOGLE_GENERATIVE_AI_API_KEY` - For Gemini 2.0 Flash model
- `GOOGLE_API_KEY` - For Google Cloud Text-to-Speech and Speech-to-Text

4. **Start the development server:**
```bash
npm run dev
```

## 🤖 Agents

### Sone Agent
Advanced personal assistant with:
- **Voice Capabilities**: Google Text-to-Speech and Speech-to-Text
- **Trading Analysis**: Real-time market monitoring with screenshot analysis
- **Financial Integration**: Connects to MRS and MISTER agents for stock/crypto data
- **Memory System**: Comprehensive conversation and trading memory
- **Browser Tools**: Automated web interaction with Playwright

### Key Features
- Real-time TradingView chart analysis
- Multi-timeframe trading insights
- Voice streaming for immediate audio feedback
- Persistent browser sessions for authenticated services
- Advanced memory with RAG capabilities

## 🛠 Available Scripts

```bash
npm run dev          # Start Mastra development server
npm run build        # Build the project
npm run start        # Start production server
```

## 🧪 Test Files

The repository includes comprehensive test files:
- `test-sone-voice.js` - Voice capabilities testing
- `test-trading-monitor.js` - Trading analysis testing
- `test-mrs-connection.js` - Financial agent integration
- `test-enhanced-sone.js` - Complete agent functionality

## 📁 Project Structure

```
sydney-agents/
├── src/mastra/
│   ├── agents/          # Agent definitions
│   ├── tools/           # Custom tools (Playwright, etc.)
│   ├── workflows/       # Automated workflows
│   ├── utils/           # Utility functions
│   └── mcp/            # MCP server configuration
├── examples/           # Usage examples
├── test-*.js          # Test files
└── .env               # Environment variables (included)
```

## 🔧 Configuration

### API Keys (Already Configured)
- Google Generative AI API key for Gemini 2.0 Flash
- Google Cloud API key for voice services

### External Integrations
- **MRS Agent**: Stock/financial data at `https://misterexc6.ngrok.io/api/agents/MRSAgent/generate`
- **MISTER Agent**: Crypto data at `https://misterexc6.ngrok.io/api/agents/MISTERAgent/generate`

## 🎯 Usage

### Basic Agent Interaction
```javascript
// Test Sone agent with voice
node test-sone-voice.js

// Test trading monitoring
node test-trading-monitor.js

// Test financial integration
node test-mrs-connection.js
```

### Trading Commands
- "start trading" - Begin automated chart monitoring
- "analyze [symbol]" - Get detailed stock analysis
- Voice responses with real-time market insights

## 📚 Documentation

Comprehensive guides included:
- `ENHANCED_SONE_SUMMARY.md` - Complete agent overview
- `VOICE_STREAMING_GUIDE.md` - Voice implementation details
- `TRADING_SESSION_MEMORY_GUIDE.md` - Trading memory system
- `SONE_FINANCIAL_INTEGRATION.md` - Financial agent integration

## 🔒 Security Note

This repository includes API keys for immediate functionality. Ensure the repository remains private or rotate keys before making public.

## 🚀 Getting Started

1. Clone and install (see Quick Setup above)
2. Run `npm run dev` to start the server
3. Test with `node test-sone-voice.js`
4. Open browser tools for trading analysis
5. Say "start trading" to begin monitoring

## 📞 Support

For issues or questions, refer to the included documentation files or test the individual components using the provided test scripts.
