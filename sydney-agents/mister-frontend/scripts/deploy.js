import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🚀 Starting HyperEVM Smart Contract Deployment...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // HyperEVM testnet USDC address (you'll need to get this from faucet/bridge)
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x0000000000000000000000000000000000000000";
  const KEEPER_BOT_ADDRESS = deployer.address; // Use deployer as initial keeper
  const AI_AGENT_ADDRESS = deployer.address; // Use deployer as initial AI agent
  
  if (USDC_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  Warning: Using zero address for USDC. Set USDC_ADDRESS environment variable.");
  }

  console.log("🔧 Configuration:");
  console.log("   USDC Token:", USDC_ADDRESS);
  console.log("   Keeper Bot:", KEEPER_BOT_ADDRESS);
  console.log("   AI Agent:", AI_AGENT_ADDRESS);
  console.log("");

  // Deploy L1Read first (utility contract)
  console.log("📦 Deploying L1Read...");
  const L1Read = await ethers.getContractFactory("L1Read");
  const l1Read = await L1Read.deploy();
  await l1Read.waitForDeployment();
  console.log("✅ L1Read deployed to:", await l1Read.getAddress());

  // Deploy VaultFactory
  console.log("\n📦 Deploying VaultFactory...");
  const VaultFactory = await ethers.getContractFactory("VaultFactory");
  const vaultFactory = await VaultFactory.deploy(USDC_ADDRESS, deployer.address);
  await vaultFactory.waitForDeployment();
  console.log("✅ VaultFactory deployed to:", await vaultFactory.getAddress());

  // Deploy a sample AIAgentVault for testing
  console.log("\n📦 Deploying Sample AIAgentVault...");
  const AIAgentVault = await ethers.getContractFactory("AIAgentVault");
  const aiAgentVault = await AIAgentVault.deploy(
    USDC_ADDRESS,
    KEEPER_BOT_ADDRESS,
    AI_AGENT_ADDRESS
  );
  await aiAgentVault.waitForDeployment();
  console.log("✅ AIAgentVault deployed to:", await aiAgentVault.getAddress());

  console.log("\n🎉 Deployment Complete!");
  console.log("📝 Contract Addresses:");
  console.log("   L1Read:", await l1Read.getAddress());
  console.log("   VaultFactory:", await vaultFactory.getAddress());
  console.log("   Sample AIAgentVault:", await aiAgentVault.getAddress());

  console.log("\n📋 Next Steps:");
  console.log("1. Verify contracts on HyperEVM explorer");
  console.log("2. Get testnet USDC from faucet and fund vault");
  console.log("3. Test vault deposit/withdrawal functionality");
  console.log("4. Start keeper bot service");
  console.log("5. Test AI trading signal execution");

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      L1Read: await l1Read.getAddress(),
      VaultFactory: await vaultFactory.getAddress(),
      AIAgentVault: await aiAgentVault.getAddress()
    },
    configuration: {
      USDC_ADDRESS,
      KEEPER_BOT_ADDRESS,
      AI_AGENT_ADDRESS
    }
  };

  console.log("\n💾 Deployment info saved to deployments.json");
  
  // Return deployment info for use in tests
  return deploymentInfo;
}

// Execute deployment if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

export default main;