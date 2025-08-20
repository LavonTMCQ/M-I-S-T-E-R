import { mastra } from "../src/mastra/index.js";

// Check if tools and workflows are properly registered
async function checkRegistration() {
  console.log("🔍 Checking Mastra Registration Status");
  console.log("=" .repeat(50));

  // Check agents
  console.log("\n🤖 AGENTS:");
  const agents = mastra.getAgents();
  Object.keys(agents).forEach(agentName => {
    console.log(`  ✅ ${agentName}`);
  });

  // Check workflows
  console.log("\n🔄 WORKFLOWS:");
  const workflows = mastra.getWorkflows();
  Object.keys(workflows).forEach(workflowName => {
    console.log(`  ✅ ${workflowName}`);
  });

  // Check tools
  console.log("\n🛠️  TOOLS:");
  const tools = mastra.getTools();
  Object.keys(tools).forEach(toolName => {
    console.log(`  ✅ ${toolName}`);
  });

  console.log("\n📊 SUMMARY:");
  console.log(`  Agents: ${Object.keys(agents).length}`);
  console.log(`  Workflows: ${Object.keys(workflows).length}`);
  console.log(`  Tools: ${Object.keys(tools).length}`);

  // Test specific registrations
  console.log("\n🎯 SPECIFIC CHECKS:");
  
  // Check Sone agent
  const soneAgent = mastra.getAgent("soneAgent");
  console.log(`  Sone Agent: ${soneAgent ? '✅ Found' : '❌ Missing'}`);

  // Check research workflows
  const researchWorkflow = mastra.getWorkflow("soneResearchWorkflow");
  console.log(`  Research Workflow: ${researchWorkflow ? '✅ Found' : '❌ Missing'}`);

  const mainResearchWorkflow = mastra.getWorkflow("soneMainResearchWorkflow");
  console.log(`  Main Research Workflow: ${mainResearchWorkflow ? '✅ Found' : '❌ Missing'}`);

  // Check Playwright tools
  const navigateTool = mastra.getTool("navigateToUrlTool");
  console.log(`  Navigate Tool: ${navigateTool ? '✅ Found' : '❌ Missing'}`);

  const screenshotTool = mastra.getTool("takeScreenshotTool");
  console.log(`  Screenshot Tool: ${screenshotTool ? '✅ Found' : '❌ Missing'}`);

  const extractTool = mastra.getTool("extractDataTool");
  console.log(`  Extract Data Tool: ${extractTool ? '✅ Found' : '❌ Missing'}`);

  console.log("\n🚀 Registration check complete!");
  
  if (soneAgent && researchWorkflow && navigateTool) {
    console.log("✅ All core components are properly registered!");
    console.log("🎯 You should see them in the playground at http://localhost:4112");
  } else {
    console.log("❌ Some components are missing. Check the imports and exports.");
  }
}

// Run the check
checkRegistration().catch(console.error);
