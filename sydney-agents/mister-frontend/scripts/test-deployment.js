import hre from "hardhat";
const { ethers } = hre;

async function testDeployment() {
  console.log("🧪 Testing HyperEVM Smart Contract Deployment...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("🔍 Testing with account:", deployer.address);
  
  // Test deployment script
  try {
    const deploymentInfo = await import("./deploy.js").then(m => m.default());
    
    console.log("\n✅ Deployment script executed successfully");
    console.log("📄 Deployment Info:", JSON.stringify(deploymentInfo, null, 2));
    
    // Test contract interactions
    console.log("\n🔬 Testing Contract Interactions...");
    
    // Test L1Read
    const L1Read = await ethers.getContractAt("L1Read", deploymentInfo.contracts.L1Read);
    console.log("✅ L1Read contract loaded");
    
    // Test VaultFactory
    const VaultFactory = await ethers.getContractAt("VaultFactory", deploymentInfo.contracts.VaultFactory);
    const maxVaultsPerUser = await VaultFactory.maxVaultsPerUser();
    console.log("✅ VaultFactory - Max vaults per user:", maxVaultsPerUser.toString());
    
    // Test AIAgentVault
    const AIAgentVault = await ethers.getContractAt("AIAgentVault", deploymentInfo.contracts.AIAgentVault);
    const keeperBot = await AIAgentVault.keeperBot();
    const aiAgent = await AIAgentVault.aiAgent();
    console.log("✅ AIAgentVault - Keeper Bot:", keeperBot);
    console.log("✅ AIAgentVault - AI Agent:", aiAgent);
    
    console.log("\n🎉 All contract tests passed!");
    
    return true;
  } catch (error) {
    console.error("❌ Deployment test failed:", error);
    return false;
  }
}

// Execute test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDeployment()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((error) => {
      console.error("❌ Test execution failed:", error);
      process.exit(1);
    });
}

export default testDeployment;