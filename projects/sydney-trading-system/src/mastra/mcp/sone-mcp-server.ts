import { MCPServer } from "@mastra/mcp";
import { soneAgent } from "../agents/sone-agent.js";
import { soneResearchWorkflow, soneMainResearchWorkflow } from "../workflows/sone-research-workflow.js";
import { 
  navigateToUrlTool,
  clickElementTool,
  fillFormTool,
  takeScreenshotTool,
  extractDataTool,
  waitForElementTool,
  closeBrowser
} from "../tools/playwright-tools.js";

// Create MCP Server with Sone's capabilities
export const soneMCPServer = new MCPServer({
  name: "sone-mcp-server",
  version: "1.0.0",
  description: "Sone AI Agent with advanced research workflows and web automation capabilities",
  
  // Expose Sone agent as MCP tool
  agents: {
    soneAgent,
  },
  
  // Expose research workflows as MCP tools
  workflows: {
    soneResearchWorkflow,
    soneMainResearchWorkflow,
  },
  
  // Expose Playwright tools for web automation
  tools: {
    navigateToUrlTool,
    clickElementTool,
    fillFormTool,
    takeScreenshotTool,
    extractDataTool,
    waitForElementTool,
  },
});

// Start the MCP server
export async function startSoneMCPServer() {
  try {
    await soneMCPServer.startStdio();
    console.log("🚀 Sone MCP Server started on stdio");
    console.log("📋 Available capabilities:");
    console.log("  🤖 Agents: soneAgent");
    console.log("  🔄 Workflows: soneResearchWorkflow, soneMainResearchWorkflow");
    console.log("  🛠️  Tools: navigateToUrl, clickElement, fillForm, takeScreenshot, extractData, waitForElement");
  } catch (error) {
    console.error("❌ Failed to start Sone MCP Server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log("\n🛑 Shutting down Sone MCP Server...");
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log("\n🛑 Shutting down Sone MCP Server...");
  await closeBrowser();
  process.exit(0);
});

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startSoneMCPServer();
}
