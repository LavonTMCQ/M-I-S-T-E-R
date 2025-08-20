#!/usr/bin/env node

/**
 * Standalone Sone MCP Server
 * 
 * This server exposes Sone's capabilities as MCP tools:
 * - Sone Agent for AI conversations
 * - Research workflows with human-in-the-loop
 * - Playwright web automation tools
 * - Financial analysis capabilities
 * 
 * Usage:
 * 1. Direct execution: node examples/sone-mcp-server-standalone.js
 * 2. MCP Client connection: Connect to stdio for tool access
 * 3. Integration: Use with Claude Desktop, Cursor, or other MCP clients
 */

import { startSoneMCPServer } from "../src/mastra/mcp/sone-mcp-server.js";

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🤖 SONE MCP SERVER 🤖                    ║
╠══════════════════════════════════════════════════════════════╣
║  Advanced AI Agent with Research & Automation Capabilities  ║
╚══════════════════════════════════════════════════════════════╝

🚀 Starting Sone MCP Server...

📋 Available Capabilities:
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AGENTS                                                   │
│   • soneAgent - Advanced AI with memory & financial tools  │
│                                                             │
│ 🔄 WORKFLOWS                                                │
│   • soneResearchWorkflow - Human-in-the-loop research      │
│   • soneMainResearchWorkflow - Complete research pipeline  │
│                                                             │
│ 🛠️  WEB AUTOMATION TOOLS                                    │
│   • navigateToUrl - Navigate to any webpage                │
│   • clickElement - Click elements by CSS selector          │
│   • fillForm - Fill out web forms automatically            │
│   • takeScreenshot - Capture webpage screenshots           │
│   • extractData - Extract structured data from pages       │
│   • waitForElement - Wait for elements to appear           │
│                                                             │
│ 💰 FINANCIAL INTEGRATION                                    │
│   • MRS Agent - Stock market & traditional finance         │
│   • MISTER Agent - Cryptocurrency & DeFi analysis          │
│                                                             │
│ 🧠 ADVANCED FEATURES                                        │
│   • Memory system with knowledge base                      │
│   • Voice capabilities (Google TTS/STT)                    │
│   • Evaluation and quality assurance                       │
│   • Cross-conversation context retention                   │
└─────────────────────────────────────────────────────────────┘

🔌 MCP Integration:
  • Protocol: Model Context Protocol (MCP)
  • Transport: stdio
  • Compatible with: Claude Desktop, Cursor, VS Code, etc.

💡 Usage Examples:
  • "Research Bitcoin price trends and create a report"
  • "Navigate to example.com and extract all links"
  • "Take a screenshot of the homepage"
  • "Analyze Tesla stock performance"
  • "Fill out a contact form on a website"

⚡ Starting server on stdio...
`);

// Start the MCP server
startSoneMCPServer();
