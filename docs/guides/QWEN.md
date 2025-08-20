# QWEN.md - Project Context for AI Assistant

This file provides essential context about the M-I-S-T-E-R project for AI assistants like Qwen Code.

## Project Overview

**M-I-S-T-E-R** is a comprehensive AI agent system built using the Mastra framework. Its flagship agent is **Sone**, an advanced personal assistant with capabilities in voice interaction, trading analysis, and financial data integration.

The system is designed for real-time market monitoring, automated trading insights, and intelligent personal assistance with persistent memory and browser automation.

## Key Technologies & Architecture

- **Framework**: Mastra (`@mastra/core`) with TypeScript (ES2022 modules)
- **Language**: Node.js (v20.9.0+)
- **Main Directory**: `sydney-agents/`
- **Dependencies**: 
  - Google AI SDK (`@ai-sdk/google`) for the Gemini 2.0 Flash model
  - Playwright for browser automation
  - LibSQL for storage (memory/file-based)
  - Express and WebSocket for real-time communication
- **Voice Services**: Google Text-to-Speech and Speech-to-Text via `@mastra/voice-google`
- **Memory System**: Persistent conversation and semantic recall (RAG) using `@mastra/memory` with LibSQL storage

## Core Components

### Agents (`sydney-agents/src/mastra/agents/`)
- **Sone Agent**: The primary personal assistant with voice, trading, and memory capabilities.
- **Weather Agent**: For weather-related queries.
- **Backtesting Agent**: For financial strategy backtesting.
- **Quant Agent**: For quantitative financial analysis.
- **Crypto Backtesting Agent**: For cryptocurrency strategy backtesting.
- **Phemex Portfolio Agent**: For interacting with the Phemex crypto exchange.

### Tools (`sydney-agents/src/mastra/tools/`)
- **Playwright Tools**: Browser automation for navigating URLs, clicking elements, filling forms, taking screenshots, and extracting data with persistent sessions.

### Workflows (`sydney-agents/src/mastra/workflows/`)
- Automated processes for tasks like weather updates, research, and daily briefings.

### Backtesting System (`sydney-agents/src/mastra/backtesting/`)
- A comprehensive engine for testing trading strategies with data management and performance analysis.

## Development & Running

### Setup
1. Prerequisites: Node.js 18+, npm/pnpm, Google Cloud account
2. Clone the repository.
3. Run `./setup.sh` (Linux/Mac) or `setup.bat` (Windows) for automated setup.
   - Alternatively, navigate to `sydney-agents/` and run `npm install`.
4. API keys for Google services are pre-configured in `sydney-agents/.env`.

### Key Commands
- **Development Server**: `npm run dev` (in `sydney-agents/`)
- **Build Project**: `npm run build`
- **Start Production**: `npm run start`
- **Quick Start Scripts** (from project root):
  - `./start.sh` / `start.bat`: Start development server
  - `./test-sone.sh` / `test-sone.bat`: Test Sone agent with voice
  - `./test-trading.sh` / `test-trading.bat`: Test trading monitor

### Testing
Specific functionalities can be tested with standalone scripts:
- `node test-sone-voice.js`
- `node test-trading-monitor.js`
- `node test-mrs-connection.js`
- `node test-enhanced-sone.js`
- `node test-phemex-portfolio-agent.js`

## Sone Agent Features

Sone is the central agent with several advanced features:
- **Voice Capabilities**: Google Text-to-Speech/Speech-to-Text for real-time audio interaction.
- **Trading Analysis**: Monitors TradingView charts, analyzes market conditions, and provides multi-timeframe insights.
- **Financial Integration**: Connects to external MRS (stock) and MISTER (crypto) agents for data.
- **Persistent Memory**: Maintains conversation history and uses RAG for semantic recall.
- **Browser Automation**: Uses Playwright with persistent sessions to interact with web services while maintaining logins.

## Project Initialization

The main entry point (`sydney-agents/src/mastra/index.ts`) initializes all subsystems including backtesting, quant analysis, crypto backtesting, and ORB monitoring on startup.